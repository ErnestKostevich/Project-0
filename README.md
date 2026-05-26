# Lumi — Anime AI Study Buddy

> A SFW kawaii AI character that lives on your desktop and keeps you focused.

Open-source desktop app (Tauri 2 + React + TypeScript + three.js) that combines a 3D VRM anime avatar, AI chat (OpenRouter — Claude / GPT / Gemini), TTS with lip-sync, and a Pomodoro coach. Targets Windows, macOS, Linux. Strictly SFW productivity coach — **not** a romance / girlfriend app.

**Version:** 0.0.1 (pre-MVP)

## Stack

- **Desktop shell**: Tauri 2 (Rust), transparent always-on-top frameless window
- **Frontend**: React 19 + TypeScript 5 + Vite 7
- **Character**: VRM 3D via `@pixiv/three-vrm` (default: CC0 Sendagaya_Shino model from madjin/vrm-samples; drop your own `.vrm` at `public/vrm/character.vrm` to override)
- **AI**: OpenRouter streaming chat completions, BYO-key (Claude 3.5 Sonnet default, GPT-4o-mini / Gemini Flash / Haiku selectable)
- **Voice**: Web Speech API (free tier), ElevenLabs Flash v2.5 planned for Pro
- **Storage**: localStorage (v0.0.1), SQLite via sqlx planned
- **Monetization**: NOWPayments (crypto checkout via static Payment Links, optional Cloudflare Worker for IPN → email license)
- **Tests**: Vitest + Testing Library + happy-dom
- **CI**: GitHub Actions matrix (Windows / macOS / Linux)
- **Distribution**: Direct download from landing page first, Steam in Q3

## Develop on Windows

Prereqs:
- Node 20+, pnpm 9+
- Rust stable (`rustup default stable`)
- Visual Studio Build Tools 2022 with the "Desktop development with C++" workload

> If your `C:\` is full, point Rust to another drive:
> ```
> setx RUSTUP_HOME "D:\rust\rustup"
> setx CARGO_HOME "D:\rust\cargo"
> ```
> restart your shell, then `rustup default stable`.

Run:

```bash
pnpm install
pnpm tauri dev           # desktop app
pnpm landing             # marketing page on http://localhost:4173
pnpm test                # unit tests (CI runs on push)
```

## Develop on macOS / Linux

```bash
# macOS
xcode-select --install
brew install rust pnpm

# Linux (Debian / Ubuntu)
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# then on either:
pnpm install
pnpm tauri dev
```

## Build production binaries

```bash
pnpm tauri build
# outputs: src-tauri/target/release/bundle/
#   Windows: *.msi + *.exe
#   macOS:   *.dmg + *.app
#   Linux:   *.AppImage + *.deb
```

GitHub Actions auto-builds for all three platforms on push to `main` and on `v*` tags. Artifacts are downloadable from the workflow run.

## Project layout

```
src/                       React + TS frontend
  components/              Character, VRMCharacter, FallbackCharacter, ChatPanel, SettingsModal, PomodoroBar, PomodoroInfoModal, SpeechBubble, AuraGlow, ParticleField, CharacterScene, Logo, icons/
  hooks/                   useChat, usePomodoro, useSettings, useTTS  (+ __tests__)
  lib/                     llm.ts, personality.ts, config.ts          (+ __tests__)
src-tauri/                 Rust + Tauri config
  src/                     main.rs, lib.rs
  capabilities/            default.json (window permissions)
  tauri.conf.json          window setup, bundle config
landing/                   Standalone marketing site (HTML / CSS / vanilla JS + three.js via CDN)
  serve.mjs                Tiny Node static server (works around pnpm + Node 24 quirks)
public/vrm/                Bundled VRM models (sample.vrm = Shino, optional character.vrm = user override)
public/live2d/             Legacy Live2D files (kept for future Cubism support)
scripts/                   dev.bat / dev.ps1 helpers
memory/                    Project context for Claude Code sessions
.github/workflows/         CI: build matrix for win/mac/linux
```

## Monetization (NOWPayments)

The app and landing page expect two NOWPayments Payment Links (one for the $7/mo Pro plan, one for the character DLC store). Set them up in [the NOWPayments dashboard](https://account.nowpayments.io/dashboard) under **Payment Links → Create**.

Replace placeholders in:
- `src/lib/config.ts` → `NOWPAYMENTS.proInvoiceId` and `NOWPAYMENTS.dlcInvoiceId`
- `landing/index.html` → two `<a data-checkout="...">` hrefs

For license-key delivery you'll need a tiny webhook server. Recommended: Cloudflare Worker that verifies the `x-nowpayments-sig` HMAC-SHA512 and emails a signed license via Resend. ~30 lines, $0/mo on free tier.

## Privacy

- API keys live in `localStorage` on the user's machine only.
- No telemetry, no analytics, no remote server (until license validation ships).
- Audio (Web Speech) and rendering happen entirely on-device.

## License

TBD before public release. Binary is closed-source; selected source files may be open-sourced post-launch.
