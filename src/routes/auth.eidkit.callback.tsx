import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  emailFromEidKitSub,
  exchangeEidKitCode,
  parseEidKitIdToken,
  profileFromEidKitClaims,
  validateEidKitCallback,
} from "@/services/eidkitAuth";
import { useAuth, useVault } from "@/store";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/eidkit/callback")({
  component: EidKitCallback,
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
    error: typeof search.error === "string" ? search.error : undefined,
    error_description:
      typeof search.error_description === "string" ? search.error_description : undefined,
  }),
});

function EidKitCallback() {
  const navigate = useNavigate();
  const { code, state, error, error_description } = Route.useSearch();
  const completeEidKitLogin = useAuth((s) => s.completeEidKitLogin);
  const updateProfile = useVault((s) => s.updateProfile);
  const [message, setMessage] = useState("Verificăm identitatea din buletinul electronic…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (error) {
        toast.error("Autentificare EidKit anulată.", {
          description: error_description ?? error,
        });
        navigate({ to: "/login" });
        return;
      }

      if (!code) {
        toast.error("Lipsește codul de autorizare EidKit.");
        navigate({ to: "/login" });
        return;
      }

      try {
        const idToken = await exchangeEidKitCode(code);
        const payload = parseEidKitIdToken(idToken);
        validateEidKitCallback(state ?? null, payload);

        if (!payload.sub) throw new Error("Token fără identificator sub.");

        const profilePatch = profileFromEidKitClaims(payload);
        updateProfile(profilePatch);
        completeEidKitLogin({
          sub: payload.sub,
          email: emailFromEidKitSub(payload.sub),
        });

        if (cancelled) return;

        toast.success("Autentificat cu buletinul electronic", {
          description: profilePatch.fullName
            ? `Profil preluat: ${profilePatch.fullName}. Datele rămân doar în seiful local.`
            : "Datele verificate de MAI au fost salvate local în seif.",
        });
        navigate({ to: "/" });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Eroare necunoscută.";
        setMessage(msg);
        toast.error("Autentificare EidKit eșuată", { description: msg });
        setTimeout(() => navigate({ to: "/login" }), 2500);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [code, state, error, error_description, completeEidKitLogin, updateProfile, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-2 bg-tricolor" aria-hidden />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <div className="size-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
            <Loader2 className="size-7 text-primary animate-spin" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Autentificare cu CEI</h1>
          <p className="text-sm text-muted-foreground mt-2">{message}</p>
          <div className="mt-6 flex items-start gap-2 text-xs text-muted-foreground justify-center">
            <ShieldCheck className="size-4 text-success shrink-0 mt-0.5" />
            <span>Datele din cip sunt verificate criptografic de MAI via EidKit.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
