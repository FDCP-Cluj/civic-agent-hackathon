import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  isAccessTokenFresh,
  persistSupabaseSession,
  readStoredSupabaseSession,
  type SupabaseSession,
} from "@/services/supabaseAuth";

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
  authProvider: "mock" | "supabase";
  supabaseAccessToken: string | null;
  login: (email: string) => void;
  verify2FA: (session?: SupabaseSession) => void;
  restoreSupabaseSession: () => boolean;
  logout: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      email: null,
      isAuthenticated: false,
      pending2FA: false,
      authProvider: "mock",
      supabaseAccessToken: null,
      login: (email) => set({ email, pending2FA: true, isAuthenticated: false }),
      verify2FA: (session) => {
        if (session) {
          persistSupabaseSession(session);
          set({
            pending2FA: false,
            isAuthenticated: true,
            authProvider: "supabase",
            supabaseAccessToken: session.access_token,
          });
          return;
        }
        set({
          pending2FA: false,
          isAuthenticated: true,
          authProvider: "mock",
          supabaseAccessToken: null,
        });
      },
      restoreSupabaseSession: () => {
        const session = readStoredSupabaseSession();
        if (!session?.access_token || !isAccessTokenFresh(session.access_token)) {
          persistSupabaseSession(null);
          return false;
        }
        set({
          isAuthenticated: true,
          pending2FA: false,
          authProvider: "supabase",
          supabaseAccessToken: session.access_token,
        });
        return true;
      },
      logout: () => {
        persistSupabaseSession(null);
        set({
          email: null,
          pending2FA: false,
          isAuthenticated: false,
          authProvider: "mock",
          supabaseAccessToken: null,
        });
      },
    }),
    { name: "civis-auth", storage: createJSONStorage(() => localStorage) },
  ),
);
