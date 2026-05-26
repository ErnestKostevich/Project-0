/**
 * Vercel KV via REST API. No client lib needed — plain fetch works in Edge.
 *
 * Setup (one-time, in Vercel dashboard):
 *   Storage → Create Database → KV → name "lumi-kv" → connect to project
 * Vercel auto-injects KV_REST_API_URL + KV_REST_API_TOKEN as env vars.
 *
 * Free tier: 30K commands/month, 256MB storage — plenty for indie-scale
 * license issuance.
 */

// Vercel deprecated native KV — it now redirects to Upstash via Marketplace.
// Both env-var families end up serving the same Upstash Redis REST endpoint,
// so we accept either name set (legacy KV_* or new UPSTASH_REDIS_REST_*).
function baseUrl(): string | undefined {
  return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
}
function token(): string | undefined {
  return process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
}
const authHeader = () => ({ Authorization: `Bearer ${token()}` });

export async function kvGet(key: string): Promise<string | null> {
  const u = baseUrl();
  if (!u || !token()) return null;
  const r = await fetch(`${u}/get/${encodeURIComponent(key)}`, { headers: authHeader() });
  if (!r.ok) return null;
  const j = (await r.json()) as { result: string | null };
  return j.result;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const u = baseUrl();
  if (!u || !token()) return;
  await fetch(`${u}/set/${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "text/plain" },
    body: value,
  });
}

export async function kvSetEx(key: string, value: string, ttlSeconds: number): Promise<void> {
  const u = baseUrl();
  if (!u || !token()) return;
  await fetch(`${u}/setex/${encodeURIComponent(key)}/${ttlSeconds}`, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "text/plain" },
    body: value,
  });
}
