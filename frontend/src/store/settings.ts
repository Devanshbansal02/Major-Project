import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProviderConfig } from "../types";

const DEFAULT_LEARNING_STYLE =
  "Actively learning something new, slow down and go chunk by chunk. Build the mental model before moving to the next piece. Invite him to explain things back, the Feynman technique works, and catching a misunderstanding early is worth more than speed. Don't move on until the current concept is actually solid. Adapt to his pace; assume he has ADHD and learns better in short focused bursts than long marathon sessions.";

interface SettingsStore {
  provider: ProviderConfig["provider"];
  apiKey: string;
  baseUrl: string;
  model: string;
  learningStyle: string;
  setProvider: (p: ProviderConfig["provider"]) => void;
  setApiKey: (k: string) => void;
  setModel: (m: string) => void;
  setBaseUrl: (u: string) => void;
  setLearningStyle: (s: string) => void;
  resetLearningStyle: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      provider: "ollama",
      apiKey: "",
      baseUrl: "",
      model: "",
      learningStyle: DEFAULT_LEARNING_STYLE,
      setProvider: (p) => set({ provider: p }),
      setApiKey: (k) => set({ apiKey: k }),
      setModel: (m) => set({ model: m }),
      setBaseUrl: (u) => set({ baseUrl: u }),
      setLearningStyle: (s) => set({ learningStyle: s }),
      resetLearningStyle: () => set({ learningStyle: DEFAULT_LEARNING_STYLE }),
    }),
    { name: "bloom-settings" }
  )
);

export { DEFAULT_LEARNING_STYLE };
