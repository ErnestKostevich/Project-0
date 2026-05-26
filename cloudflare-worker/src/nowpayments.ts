/**
 * NOWPayments client + IPN signature verification.
 * Docs:
 *   https://documenter.getpostman.com/view/7907941/2s93JusNJt
 *   https://nowpayments.zendesk.com/hc/en-us/articles/21395546303389
 */

const API_BASE = "https://api.nowpayments.io/v1";

export interface CreateInvoiceArgs {
  apiKey: string;
  priceAmount: number;
  priceCurrency: string; // e.g. "usd"
  orderId: string;
  orderDescription: string;
  ipnCallbackUrl: string;
  successUrl?: string;
  cancelUrl?: string;
}

export interface NowInvoice {
  id: string;
  order_id: string;
  invoice_url: string;
  price_amount: string;
  price_currency: string;
  created_at: string;
}

export async function createInvoice(args: CreateInvoiceArgs): Promise<NowInvoice> {
  const r = await fetch(`${API_BASE}/invoice`, {
    method: "POST",
    headers: {
      "x-api-key": args.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      price_amount: args.priceAmount,
      price_currency: args.priceCurrency,
      order_id: args.orderId,
      order_description: args.orderDescription,
      ipn_callback_url: args.ipnCallbackUrl,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
    }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "<unreadable>");
    throw new Error(`NOWPayments createInvoice ${r.status}: ${text.slice(0, 300)}`);
  }
  return r.json();
}

/**
 * Verify the `x-nowpayments-sig` IPN signature.
 * Per NOWPayments docs: HMAC-SHA512 of the request body re-serialised with
 * recursively sorted keys, using JSON output (no escaped slashes).
 */
export async function verifyIpnSignature(
  rawBody: string,
  signature: string | null,
  ipnSecret: string,
): Promise<boolean> {
  if (!signature) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }
  const sorted = stableStringify(parsed);
  const expected = await hmacSha512Hex(ipnSecret, sorted);
  return constantTimeEqual(expected, signature.trim().toLowerCase());
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const pairs = keys.map(
    (k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`,
  );
  return `{${pairs.join(",")}}`;
}

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface IpnPayload {
  payment_id: number;
  payment_status: string; // "waiting" | "confirming" | "confirmed" | "sending" | "partially_paid" | "finished" | "failed" | "refunded" | "expired"
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  ipn_callback_url?: string;
  created_at: string;
  updated_at: string;
  outcome_amount?: number;
  outcome_currency?: string;
}
