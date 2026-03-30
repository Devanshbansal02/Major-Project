export interface Note {
  notes_id: number;
  subjectId: number;
  link: string;
  notesname: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  color: string;
  noteCount: number;
}

export interface ProviderConfig {
  provider: "openai" | "anthropic" | "ollama" | "custom";
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface TriviaQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
