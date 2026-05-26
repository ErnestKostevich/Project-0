/**
 * Streaming chat client supporting multiple LLM providers.
 *
 * Currently shipped providers:
 *   - openrouter (default — multi-model routing: Claude / GPT / Gemini / Mistral / etc.)
 *   - mistral    (native Mistral La Plateforme API — EU-hosted, no middleman fees)
 *
 * Both providers use OpenAI-compatible /chat/completions SSE format, so the
 * underlying fetch + parsing code is identical — only the endpoint and key
 * change per provider.
 *
 * Adding more providers later (native Anthropic / OpenAI / DeepSeek):
 *   1. Append entry to PROVIDERS below with endpoint + keyUrl + models
 *   2. Add corresponding *Key field in useSettings → DEFAULTS
 *   3. (Anthropic specifically needs different headers + body format → branch
 *      streamChat on `apiFormat: 'anthropic'`)
 */

export type Provider = "openrouter" | "mistral";

export interface ProviderConfig {
  id: Provider;
  label: string;
  endpoint: string;
  keyUrl: string;
  keyHint: string;
  defaultModel: string;
  models: { id: string; label: string; note?: string }[];
}

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  openrouter: {
    id: "openrouter",
    label: "OpenRouter — Claude / GPT / Gemini / Mistral / more",
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    keyUrl: "https://openrouter.ai/keys",
    keyHint: "Starts with sk-or-v1-…",
    defaultModel: "anthropic/claude-3.5-sonnet",
    models: [
      { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", note: "Best writing quality" },
      { id: "openai/gpt-4o-mini", label: "GPT-4o mini", note: "Cheapest, still good" },
      { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash", note: "Fast and cheap" },
      { id: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
      { id: "mistralai/mistral-large-2411", label: "Mistral Large (via OR)" },
      { id: "mistralai/mistral-small-2503", label: "Mistral Small (via OR)" },
    ],
  },
  mistral: {
    id: "mistral",
    label: "Mistral — native EU API",
    endpoint: "https://api.mistral.ai/v1/chat/completions",
    keyUrl: "https://console.mistral.ai/api-keys",
    keyHint: "From console.mistral.ai → API Keys",
    defaultModel: "mistral-large-latest",
    models: [
      { id: "mistral-large-latest", label: "Mistral Large", note: "Strongest reasoning" },
      { id: "mistral-medium-latest", label: "Mistral Medium", note: "Balanced cost/quality" },
      { id: "mistral-small-latest", label: "Mistral Small", note: "Fast + cheap" },
      { id: "ministral-8b-latest", label: "Ministral 8B", note: "Tiny, very cheap" },
      { id: "ministral-3b-latest", label: "Ministral 3B", note: "Smallest, edge-friendly" },
      { id: "pixtral-large-latest", label: "Pixtral Large", note: "Vision-capable" },
    ],
  },
};

// Back-compat for existing imports (kept identical to OpenRouter models).
export const RECOMMENDED_MODELS = PROVIDERS.openrouter.models;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamOptions {
  /** Which provider to call. Determines endpoint + auth. */
  provider: Provider;
  /** Provider-specific API key. */
  apiKey: string;
  /** Model id valid for the chosen provider. */
  model: string;
  messages: ChatMessage[];
  systemPrompt: string;
  onDelta: (delta: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
  signal?: AbortSignal;
  maxTokens?: number;
  temperature?: number;
}

export async function streamChat(opts: StreamOptions): Promise<void> {
  const {
    provider,
    apiKey,
    model,
    messages,
    systemPrompt,
    onDelta,
    onDone,
    onError,
    signal,
    maxTokens = 500,
    temperature = 0.7,
  } = opts;

  const cfg = PROVIDERS[provider];
  if (!cfg) {
    onError(new Error(`Unknown provider: ${provider}`));
    return;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  // OpenRouter wants attribution headers for analytics + free-tier preferential routing.
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://lumi-bloom0.vercel.app";
    headers["X-Title"] = "Lumi";
  }

  try {
    const response = await fetch(cfg.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
        max_tokens: maxTokens,
        temperature,
      }),
      signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "<unreadable>");
      throw new Error(`${cfg.label} ${response.status}: ${text.slice(0, 300)}`);
    }
    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          onDone();
          return;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length) onDelta(delta);
        } catch {
          /* malformed chunk — skip */
        }
      }
    }
    onDone();
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    onError(e instanceof Error ? e : new Error(String(e)));
  }
}
