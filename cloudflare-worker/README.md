# Lumi Pay Worker

Cloudflare Worker that handles the **server-side** of Lumi's NOWPayments integration:

- `/checkout` — creates a NOWPayments invoice on demand, 302-redirects the user to the hosted crypto checkout page
- `/webhook` — verifies the IPN signature (HMAC-SHA512), issues a signed license key on `finished` status, emails it via Resend
- `/verify-license` — desktop app calls this with the user's license to confirm it's still valid

Stateless except for a KV namespace storing payment records and issued licenses. Free tier of Cloudflare Workers (100K req/day) is plenty for early stage.

## One-time deploy

```bash
cd cloudflare-worker
pnpm install

# create the KV namespace and copy the printed id into wrangler.toml
wrangler kv:namespace create LICENSES

# generate a 64-char hex secret for license signing
openssl rand -hex 32   # copy the output

# put all secrets (interactive prompts, NEVER echoed)
wrangler secret put NOWPAYMENTS_API_KEY     # paste from NOWPayments dashboard
wrangler secret put NOWPAYMENTS_IPN_SECRET  # paste from NOWPayments dashboard
wrangler secret put LICENSE_SIGNING_SECRET  # paste the openssl output
wrangler secret put RESEND_API_KEY          # paste from resend.com/api-keys

# deploy
wrangler deploy
# outputs: https://lumi-pay.<your-account>.workers.dev
```

Then in the NOWPayments dashboard:
**Settings → Payments → Instant payment notifications → Webhook URL** = `https://lumi-pay.<your-account>.workers.dev/webhook`

And in the Lumi project root:
```bash
# .env.local
VITE_PAY_WORKER_URL=https://lumi-pay.<your-account>.workers.dev
```

## Local dev

```bash
wrangler dev   # localhost:8787
curl http://localhost:8787/health
```

For local IPN testing use `wrangler tail` to stream logs and ngrok / cloudflared tunnel to expose `/webhook` to NOWPayments.

## Security notes

- Secrets are stored encrypted by Cloudflare and never appear in `wrangler.toml`, the bundle, or logs.
- License keys are HMAC-SHA256 signed — the app calls `/verify-license` on launch + periodically; a tampered key fails the constant-time signature comparison.
- The IPN handler returns 401 on a bad signature so attackers can't forge "payment finished" events.
- Migrating to Ed25519 (asymmetric) would let the desktop app verify license keys offline by embedding only the public key — recommended once we have ~100 customers.

## Testing the flow end-to-end (real money)

1. Hit `/checkout?plan=pro&email=test@yourdomain.com` from a browser
2. Pay $7 in crypto on the NOWPayments page (testnet support is coming, for now use small mainnet amounts)
3. Wait for confirmations (~10 min for BTC, ~1 min for SOL/USDT)
4. Resend should email you the license key
5. Open Lumi → ⚙ Settings → paste license

## Files

```
src/index.ts        Main router (checkout / webhook / verify-license / health)
src/nowpayments.ts  Invoice creation + IPN signature verification
src/license.ts      HMAC-signed license tokens
src/email.ts        Resend wrapper + license email HTML
wrangler.toml       Worker config (KV binding, vars)
```
