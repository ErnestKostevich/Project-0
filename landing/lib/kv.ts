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

const url = (path: string) => `${process.env.KV_REST_API_URL}${path}`;
const authHeader = () => ({ Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` });

export async function kvGet(key: string): Promise<string | null> {
  if (!process.env.KV_REST_API_URL) return null;
  const r = await fetch(url(`/get/${encodeURIComponent(key)}`), { headers: authHeader() });
  if (!r.ok) return null;
  const j = (await r.json()) as { result: string | null };
  return j.result;
}

export async function kvSet(key: string, value: string): Promise<void> {
  if (!process.env.KV_REST_API_URL) return;
  await fetch(url(`/set/${encodeURIComponent(key)}`), {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "text/plain" },
    body: value,
  });
}

export async function kvSetEx(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (!process.env.KV_REST_API_URL) return;
  await fetch(url(`/setex/${encodeURIComponent(key)}/${ttlSeconds}`), {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "text/plain" },
    body: value,
  });
}
