import { Navigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/store";
import { useEffect, useState } from "react";
import { isSupabaseAuthConfigured } from "@/services/supabaseAuth";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, pending2FA, restoreSupabaseSession } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (isSupabaseAuthConfigured()) {
      restoreSupabaseSession();
    }
    setHydrated(true);
  }, [restoreSupabaseSession]);
  if (!hydrated) return null;

  const isAuthRoute =
    path === "/login" || path === "/verify" || path.startsWith("/auth/eidkit");
  if (isAuthRoute) return <>{children}</>;
  if (pending2FA) return <Navigate to="/verify" />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
}
