export const config = { runtime: "edge" };

export default async function handler(_req: Request): Promise<Response> {
  return new Response(
    JSON.stringify({ ok: true, app: "Lumi", env: process.env.VERCEL_ENV || "local" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}
