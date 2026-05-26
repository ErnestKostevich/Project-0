// Per-test polyfills & jest-dom matchers.
import "@testing-library/jest-dom/vitest";

// Stub the Tauri window API for tests that mount components reaching for it.
// happy-dom doesn't ship a real WebView; everything Tauri-side is a no-op.
import { vi } from "vitest";

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    close: vi.fn(),
    minimize: vi.fn(),
    setSize: vi.fn(),
    setAlwaysOnTop: vi.fn(),
  }),
}));
