/**
 * Lumi payment worker.
 *
 * Endpoints:
 *   GET  /checkout?plan=pro            → creates NOWPayments invoice, 302 redirect
 *   GET  /checkout?plan=dlc&product=X  → DLC invoice with order_id=dlc:X
 *   POST /webhook                      → NOWPayments IPN, verifies HMAC-SHA512, emails license on `finished`
 *   GET  /verify-license?key=...       → returns { valid, plan, expiresAt } if signed by us
 *   GET  /health                       → liveness
 *
 * Deploy:
 *   cd cloudflare-worker
 *   pnpm install
 *   wrangler kv:namespace create LICENSES        # copy id to wrangler.toml
 *   wrangler secret put NOWPAYMENTS_API_KEY
 *   wrangler secret put NOWPAYMENTS_IPN_SECRET
 *   wrangler secret put LICENSE_SIGNING_SECRET   # `openssl rand -hex 32`
 *   wrangler secret put RESEND_API_KEY
 *   wrangler deploy
 */

import { createInvoice, verifyIpnSignature, type IpnPayload } from "./nowpayments";
import { issueLicense, verifyLicense } from "./license";
import { sendEmail, licenseEmailHtml } from "./email";

export interface Env {
  // Secrets (set via `wrangler secret put`)
  NOWPAYMENTS_API_KEY: string;
  NOWPAYMENTS_IPN_SECRET: string;
  LICENSE_SIGNING_SECRET: string;
  RESEND_API_KEY: string;
  // Vars
  LICENSE_FROM_EMAIL: string;
  APP_NAME: string;
  // KV
  LICENSES: KVNamespace;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-nowpayments-sig",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "");

    try {
      if (path === "/health") return json({ ok: true, app: env.APP_NAME });
      if (path === "/checkout") return await handleCheckout(url, env);
      if (path === "/webhook" && req.method === "POST") return await handleWebhook(req, env, ctx);
      if (path === "/verify-license") return await handleVerifyLicense(url, env);
      return json({ error: "not found" }, 404);
    } catch (e) {
      console.error("[worker] unhandled:", e);
      return json({ error: (e as Error).message }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

// ---------- Handlers ----------

async function handleCheckout(url: URL, env: Env): Promise<Response> {
  const plan = url.searchParams.get("plan") ?? "pro";
  const product = url.searchParams.get("product") ?? "";
  const email = url.searchParams.get("email") ?? "";

  let amount: number;
  let description: string;
  let orderId: string;

  if (plan === "pro") {
    amount = 7;
    description = "Lumi Pro — 1 month";
    orderId = `pro:${Date.now()}:${email || "anon"}`;
  } else if (plan === "dlc") {
    amount = 9; // simple default; real per-DLC pricing comes from KV/DB
    description = `Lumi character — ${product}`;
    orderId = `dlc:${product}:${Date.now()}:${email || "anon"}`;
  } else {
    return json({ error: "unknown plan" }, 400);
  }

  const inv = await createInvoice({
    apiKey: env.NOWPAYMENTS_API_KEY,
    priceAmount: amount,
    priceCurrency: "usd",
    orderId,
    orderDescription: description,
    ipnCallbackUrl: `${url.origin}/webhook`,
    successUrl: `${url.origin}/checkout/success`,
    cancelUrl: `${url.origin}/checkout/cancel`,
  });

  // 302 to NOWPayments hosted page.
  return new Response(null, {
    status: 302,
    headers: { Location: inv.invoice_url, ...CORS },
  });
}

async function handleWebhook(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const rawBody = await req.text();
  const sig = req.headers.get("x-nowpayments-sig");
  const ok = await verifyIpnSignature(rawBody, sig, env.NOWPAYMENTS_IPN_SECRET);
  if (!ok) {
    console.warn("[webhook] invalid signature");
    return json({ error: "invalid signature" }, 401);
  }

  const body = JSON.parse(rawBody) as IpnPayload;

  // Persist payment status (last-write-wins).
  await env.LICENSES.put(
    `payment:${body.payment_id}`,
    JSON.stringify({ ...body, receivedAt: Date.now() }),
  );

  if (body.payment_status !== "finished") {
    // Acknowledge — NOWPayments retries on non-2xx.
    return json({ ok: true, status: body.payment_status });
  }

  // Parse plan + email from order_id format `plan:...:email`
  const parts = body.order_id.split(":");
  const plan = parts[0] as "pro" | "dlc";
  const email = parts[parts.length - 1];
  const productId = plan === "dlc" ? parts[1] : undefined;

  const expiresAt =
    plan === "pro" ? Date.now() + 31 * 24 * 60 * 60 * 1000 : Date.now() + 100 * 365 * 24 * 60 * 60 * 1000;

  const licenseKey = await issueLicense(
    { email, plan, orderId: body.order_id, productId, issuedAt: Date.now(), expiresAt },
    env.LICENSE_SIGNING_SECRET,
  );

  await env.LICENSES.put(`license:${licenseKey}`, JSON.stringify({ email, plan, productId, expiresAt }));
  await env.LICENSES.put(`email:${email}`, licenseKey); // lookup-by-email

  // Send the license email — don't block the webhook response.
  ctx.waitUntil(
    sendEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.LICENSE_FROM_EMAIL,
      to: email,
      subject: `Your ${env.APP_NAME} ${plan === "pro" ? "Pro" : "character"} license`,
      html: licenseEmailHtml({ brand: env.APP_NAME, licenseKey, plan, productId }),
    }).catch((e) => console.error("[email] failed", e)),
  );

  return json({ ok: true });
}

async function handleVerifyLicense(url: URL, env: Env): Promise<Response> {
  const key = url.searchParams.get("key");
  if (!key) return json({ valid: false, reason: "missing key" }, 400);

  const payload = await verifyLicense(key, env.LICENSE_SIGNING_SECRET);
  if (!payload) return json({ valid: false, reason: "signature or expiry" });

  return json({
    valid: true,
    plan: payload.plan,
    productId: payload.productId,
    expiresAt: payload.expiresAt,
    email: payload.email,
  });
}
