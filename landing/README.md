# Lumi landing + payment API

Static marketing site (`index.html` + `styles.css` + `sample.vrm`) plus serverless API for NOWPayments integration. Deploys as a single Vercel project.

## Endpoints (Vercel Edge Functions)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/` | Marketing site |
| `GET` | `/api/health` | Liveness ping |
| `GET` | `/api/checkout?plan=pro\|dlc&product=<id>&email=<addr>` | Creates NOWPayments invoice → 302 redirects to hosted crypto checkout |
| `POST` | `/api/webhook` | NOWPayments IPN callback. Verifies HMAC-SHA512, on `finished` issues license + Resend email |
| `GET` | `/api/verify-license?key=...` | Desktop app calls to check Pro/DLC license validity |

## Deploy (first time)

```bash
cd D:\Project0\landing
vercel link               # connect to your Vercel account, pick "Other" for framework
vercel deploy --prod      # actual deploy
```

You'll get URLs like:
- Production: `https://lumi.vercel.app` (or `https://<project-name>-<hash>.vercel.app`)
- Each preview deploy: unique URL

### Configure environment (one-time in Vercel dashboard)

Project → Settings → Environment Variables — add:

| Name | Value | Where to get |
|---|---|---|
| `NOWPAYMENTS_API_KEY` | your API key | dashboard.nowpayments.io → Settings → Payments → API keys |
| `NOWPAYMENTS_IPN_SECRET` | your IPN secret | dashboard → Settings → Payments → IPN |
| `LICENSE_SIGNING_SECRET` | random 64-char hex | run `openssl rand -hex 32` |
| `RESEND_API_KEY` | Resend key | resend.com → API Keys |
| `LICENSE_FROM_EMAIL` | `licenses@yourdomain.com` | After verifying domain in Resend |

### Add KV storage (one-time)

Vercel dashboard → Storage → Create Database → KV → name `lumi-kv` → connect to project. Vercel auto-injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`.

### Set webhook URL in NOWPayments

NOWPayments dashboard → Settings → Payments → Instant payment notifications → Webhook URL =
```
https://<your-vercel-url>/api/webhook
```

## Local dev

```bash
cd D:\Project0\landing
node serve.mjs            # static frontend on :4173
```

Local API routes need `vercel dev` (not the bare static server) — it runs functions locally:
```bash
vercel dev
```

## Files

```
index.html         Marketing page (hero with live 3D VRM, features, pricing, FAQ)
styles.css         Visual identity (pink/cream glassmorphism)
sample.vrm         Bundled CC0 anime VRM (15MB, Sendagaya_Shino)
serve.mjs          Dev-only Node static server
api/               Vercel Edge Functions
  health.ts        Liveness check
  checkout.ts      Creates NOWPayments invoice, 302 redirect
  webhook.ts       IPN handler with HMAC-SHA512 verify + license issuance
  verify-license.ts License validation for the desktop app
lib/               Shared logic
  nowpayments.ts   API client + signature verification
  license.ts       HMAC-SHA256 license tokens
  email.ts         Resend wrapper + HTML template
  kv.ts            Vercel KV REST client
vercel.json        Runtime config + caching headers
package.json       Minimal TS deps for type checking
tsconfig.json      ES2022 + Edge runtime types
```
