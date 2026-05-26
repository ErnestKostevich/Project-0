import { verifyIpnSignature, type IpnPayload } from "../lib/nowpayments.js";
import { issueLicense } from "../lib/license.js";
import { sendEmail, licenseEmailHtml } from "../lib/email.js";
import { kvSet } from "../lib/kv.js";

export const config = { runtime: "edge" };

/**
 * POST /api/webhook — NOWPayments IPN callback.
 * Verifies HMAC-SHA512 signature, on `finished` status issues a signed
 * license + emails it via Resend.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  const signingSecret = process.env.LICENSE_SIGNING_SECRET;
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.LICENSE_FROM_EMAIL || "licenses@lumi.app";

  if (!ipnSecret || !signingSecret) {
    return json({ error: "server not configured" }, 500);
  }

  const rawBody = await req.text();
  const sig = req.headers.get("x-nowpayments-sig");
  const ok = await verifyIpnSignature(rawBody, sig, ipnSecret);
  if (!ok) {
    console.warn("[/api/webhook] invalid signature");
    return json({ error: "invalid signature" }, 401);
  }

  const body = JSON.parse(rawBody) as IpnPayload;

  // Persist payment record (best-effort, ignore KV unavailability).
  await kvSet(
    `payment:${body.payment_id}`,
    JSON.stringify({ ...body, receivedAt: Date.now() }),
  );

  if (body.payment_status !== "finished") {
    return json({ ok: true, status: body.payment_status });
  }

  // Parse plan + email from order_id (`plan:...:email`).
  const parts = body.order_id.split(":");
  const plan = (parts[0] === "dlc" ? "dlc" : "pro") as "pro" | "dlc";
  const email = parts[parts.length - 1];
  const productId = plan === "dlc" ? parts[1] : undefined;

  const expiresAt =
    plan === "pro"
      ? Date.now() + 31 * 24 * 60 * 60 * 1000
      : Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;

  const licenseKey = await issueLicense(
    { email, plan, orderId: body.order_id, productId, issuedAt: Date.now(), expiresAt },
    signingSecret,
  );

  await kvSet(
    `license:${licenseKey}`,
    JSON.stringify({ email, plan, productId, expiresAt }),
  );
  await kvSet(`email:${email}`, licenseKey);

  if (resendKey && email && email !== "anon") {
    try {
      await sendEmail({
        apiKey: resendKey,
        from: fromEmail,
        to: email,
        subject: `Your Lumi ${plan === "pro" ? "Pro" : "character"} license`,
        html: licenseEmailHtml({ brand: "Lumi", licenseKey, plan, productId }),
      });
    } catch (e) {
      console.error("[/api/webhook] email failed:", e);
    }
  }

  return json({ ok: true });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
