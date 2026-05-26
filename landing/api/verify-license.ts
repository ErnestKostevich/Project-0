import { verifyLicense } from "../lib/license.js";

export const config = { runtime: "edge" };

/**
 * GET /api/verify-license?key=...
 *   → { valid, plan?, productId?, expiresAt?, email? }
 *
 * The desktop app calls this on launch and ~every 24h to confirm the user's
 * Pro subscription is still valid (or DLC unlock).
 */
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return json({ valid: false, reason: "missing key" }, 400);

  const secret = process.env.LICENSE_SIGNING_SECRET;
  if (!secret) return json({ valid: false, reason: "server not configured" }, 500);

  const payload = await verifyLicense(key, secret);
  if (!payload) return json({ valid: false, reason: "signature or expiry" });

  return json({
    valid: true,
    plan: payload.plan,
    productId: payload.productId,
    expiresAt: payload.expiresAt,
    email: payload.email,
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
