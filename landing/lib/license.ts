/**
 * HMAC-SHA256 signed license tokens. Same format on CF Worker / Vercel Edge.
 */

export interface LicensePayload {
  email: string;
  plan: "pro" | "dlc";
  orderId: string;
  issuedAt: number;
  expiresAt: number;
  productId?: string;
}

export async function issueLicense(
  payload: LicensePayload,
  signingSecret: string,
): Promise<string> {
  const json = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(new TextEncoder().encode(json));
  const sig = await hmacSha256(signingSecret, payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifyLicense(
  token: string,
  signingSecret: string,
): Promise<LicensePayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = await hmacSha256(signingSecret, payloadB64);
  if (!constantTimeEqual(expected, sig)) return null;
  try {
    const json = new TextDecoder().decode(b64urlDecode(payloadB64));
    const parsed = JSON.parse(json) as LicensePayload;
    if (typeof parsed.expiresAt !== "number") return null;
    if (parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function hmacSha256(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return b64urlEncode(new Uint8Array(sig));
}

function b64urlEncode(buf: Uint8Array): string {
  let s = "";
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(b64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
