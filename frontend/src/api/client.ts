import type { Note, ProviderConfig, TriviaQuestion } from "../types";

const BASE_URL = "http://localhost:8000";

export async function getNotes(subjectId?: number): Promise<Note[]> {
  const url = subjectId
    ? `${BASE_URL}/api/notes/${subjectId}`
    : `${BASE_URL}/api/notes`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch notes: ${res.status}`);
  return res.json();
}

export async function getModels(
  provider: string,
  apiKey: string,
  baseUrl?: string,
  customStyle?: string
): Promise<string[]> {
  const params = new URLSearchParams({ provider, api_key: apiKey });
  if (baseUrl) params.set("base_url", baseUrl);
  if (customStyle) params.set("custom_style", customStyle);
  const res = await fetch(`${BASE_URL}/api/providers/models?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getTriviaQuestions(
  subjectId: number,
  providerConfig: ProviderConfig
): Promise<TriviaQuestion[]> {
  const res = await fetch(`${BASE_URL}/api/chat/trivia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject_id: subjectId,
      provider_config: {
        provider: providerConfig.provider,
        api_key: providerConfig.apiKey,
        base_url: providerConfig.baseUrl,
        model: providerConfig.model,
        custom_style: providerConfig.customStyle,
      },
    }),
  });
  if (!res.ok) throw new Error("Failed to generate trivia");
  const data = await res.json();
  return data.questions ?? [];
}

export async function triggerIngest(): Promise<{ status: string }> {
  const res = await fetch(`${BASE_URL}/api/notes/ingest`, { method: "POST" });
  if (!res.ok) throw new Error("Ingest failed");
  return res.json();
}

export async function* streamChat(
  endpoint: string,
  body: object
): AsyncGenerator<string> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) throw new Error("Stream request failed");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.type === "token" && parsed.content) {
            yield parsed.content as string;
          }
        } catch {
          // skip malformed lines
        }
      }
    }
  }
}
