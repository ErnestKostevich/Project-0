import { createInvoice } from "../lib/nowpayments.js";

export const config = { runtime: "edge" };

/**
 * GET /api/checkout?plan=pro|dlc&product=<id>&email=<addr>
 *   → creates a NOWPayments invoice via API
 *   → 302 redirects browser to the hosted crypto checkout page
 */
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const plan = url.searchParams.get("plan") ?? "pro";
  const product = url.searchParams.get("product") ?? "";
  const email = url.searchParams.get("email") ?? "";

  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    return json({ error: "NOWPAYMENTS_API_KEY not configured" }, 500);
  }

  let amount: number;
  let description: string;
  let orderId: string;

  if (plan === "pro") {
    amount = 7;
    description = "Lumi Pro — 1 month";
    orderId = `pro:${Date.now()}:${email || "anon"}`;
  } else if (plan === "dlc") {
    amount = 9;
    description = `Lumi character — ${product || "default"}`;
    orderId = `dlc:${product}:${Date.now()}:${email || "anon"}`;
  } else {
    return json({ error: "unknown plan" }, 400);
  }

  const origin = `${url.protocol}//${url.host}`;

  try {
    const inv = await createInvoice({
      apiKey,
      priceAmount: amount,
      priceCurrency: "usd",
      orderId,
      orderDescription: description,
      ipnCallbackUrl: `${origin}/api/webhook`,
      successUrl: `${origin}/?paid=1`,
      cancelUrl: `${origin}/?cancelled=1`,
    });
    return new Response(null, {
      status: 302,
      headers: { Location: inv.invoice_url },
    });
  } catch (e) {
    console.error("[/api/checkout]", e);
    return json({ error: (e as Error).message }, 500);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
