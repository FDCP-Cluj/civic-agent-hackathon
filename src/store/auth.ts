import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Mock auth slice.
//
// We deliberately do NOT persist a token — there is no token. The "session"
// is purely a flag flipped by the mock 2FA gate in /verify. This keeps the
// app honest about its zero-GDPR, local-only stance: a real auth server is a
// drop-in replacement at this seam.
type AuthState = {
  email: string | null;
  isAuthenticated: boolean;
  pending2FA: boolean;
  login: (email: string) => void;
  verify2FA: () => void;
  logout: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      email: null,
      isAuthenticated: false,
      pending2FA: false,
      login: (email) => set({ email, pending2FA: true, isAuthenticated: false }),
      verify2FA: () => set({ pending2FA: false, isAuthenticated: true }),
      logout: () => set({ email: null, pending2FA: false, isAuthenticated: false }),
    }),
    { name: "civis-auth", storage: createJSONStorage(() => localStorage) },
  ),
);
