import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProviderConfig } from "../types";

const DEFAULT_LEARNING_STYLE =
  "Actively learning something new, slow down and go chunk by chunk. Build the mental model before moving to the next piece. Invite him to explain things back, the Feynman technique works, and catching a misunderstanding early is worth more than speed. Don't move on until the current concept is actually solid. Adapt to his pace; assume he has ADHD and learns better in short focused bursts than long marathon sessions.";

type Provider = ProviderConfig["provider"];

interface SettingsStore {
  provider: Provider;
  // Per-provider API key storage: keys never overwrite each other
  apiKeys: Record<Provider, string>;
  baseUrl: string;
  model: string;
  customStyle: ProviderConfig["customStyle"];
  learningStyle: string;
  setProvider: (p: Provider) => void;
  setApiKey: (k: string) => void;    // sets key for the current provider
  setModel: (m: string) => void;
  setBaseUrl: (u: string) => void;
  setCustomStyle: (s: ProviderConfig["customStyle"]) => void;
  setLearningStyle: (s: string) => void;
  resetLearningStyle: () => void;
  // Convenience getter: returns key for active provider
  getApiKey: () => string;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      provider: "ollama",
      apiKeys: { openai: "", anthropic: "", ollama: "", custom: "" },
      baseUrl: "",
      model: "",
      customStyle: "openai" as ProviderConfig["customStyle"],
      learningStyle: DEFAULT_LEARNING_STYLE,

      setProvider: (p) => set({ provider: p }),
      setApiKey: (k) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, [state.provider]: k },
        })),
      setModel: (m) => set({ model: m }),
      setBaseUrl: (u) => set({ baseUrl: u }),
      setCustomStyle: (s) => set({ customStyle: s }),
      setLearningStyle: (s) => set({ learningStyle: s }),
      resetLearningStyle: () => set({ learningStyle: DEFAULT_LEARNING_STYLE }),
      getApiKey: () => get().apiKeys[get().provider] ?? "",
    }),
    { name: "bloom-settings" }
  )
);

export { DEFAULT_LEARNING_STYLE };
