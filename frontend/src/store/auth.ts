import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthStore {
  token: string | null;
  facultyName: string | null;
  setAuth: (token: string, name: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      facultyName: null,
      setAuth: (token, name) => set({ token, facultyName: name }),
      logout: () => set({ token: null, facultyName: null }),
    }),
    { name: "bloom-auth" }
  )
);
