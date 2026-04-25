import type { ProviderConfig, TriviaQuestion } from "../types";

export const BASE_URL = "http://localhost:8000";

// ---------------------------------------------------------------------------
// Student: subjects + notes
// ---------------------------------------------------------------------------

export interface SubjectInfo {
  id: number;
  name: string;
  code: string;
  color: string;
  faculty_name: string;
  note_count: number;
}

export interface NoteInfo {
  id: number;
  original_name: string;
  file_type: string;
  class_date: string;
  uploaded_at: string;
  is_embedded: boolean | number;
}

export async function getSubjects(): Promise<SubjectInfo[]> {
  const r = await fetch(`${BASE_URL}/api/notes/subjects`);
  if (!r.ok) return [];
  return r.json();
}

export async function getNotes(subjectId: number): Promise<NoteInfo[]> {
  const r = await fetch(`${BASE_URL}/api/notes/subjects/${subjectId}`);
  if (!r.ok) throw new Error(`Failed to fetch notes: ${r.status}`);
  return r.json();
}

export async function triggerIngest(
  noteIds: number[],
  mode: "all" | "last_class" | "custom" = "custom"
): Promise<{ status: string; count: number }> {
  const r = await fetch(`${BASE_URL}/api/notes/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note_ids: noteIds, mode }),
  });
  if (!r.ok) throw new Error("Ingest failed");
  return r.json();
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export async function getModels(
  provider: string,
  apiKey: string,
  baseUrl?: string,
  customStyle?: string
): Promise<string[]> {
  const params = new URLSearchParams({ provider, api_key: apiKey });
  if (baseUrl) params.set("base_url", baseUrl);
  if (customStyle) params.set("custom_style", customStyle);
  const r = await fetch(`${BASE_URL}/api/providers/models?${params}`);
  if (!r.ok) return [];
  return r.json();
}

// ---------------------------------------------------------------------------
// Trivia
// ---------------------------------------------------------------------------

export async function getTriviaQuestions(
  subjectId: number,
  providerConfig: ProviderConfig,
  noteIds: number[] = []
): Promise<TriviaQuestion[]> {
  const r = await fetch(`${BASE_URL}/api/chat/trivia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject_id: subjectId,
      note_ids: noteIds,
      provider_config: {
        provider: providerConfig.provider,
        api_key: providerConfig.apiKey,
        base_url: providerConfig.baseUrl,
        model: providerConfig.model,
        custom_style: providerConfig.customStyle,
      },
    }),
  });
  if (!r.ok) throw new Error("Failed to generate trivia");
  const data = await r.json();
  return data.questions ?? [];
}

// ---------------------------------------------------------------------------
// SSE streaming chat
// ---------------------------------------------------------------------------

export async function* streamChat(
  endpoint: string,
  body: object
): AsyncGenerator<string> {
  const r = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok || !r.body) throw new Error("Stream request failed");

  const reader = r.body.getReader();
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
