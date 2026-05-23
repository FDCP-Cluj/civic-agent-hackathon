import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Mail, Lock, ArrowRight, Sparkles, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/store";
import { DEMO_EMAIL, seedCeiDemoVault } from "@/lib/demoSeed";
import { toast } from "sonner";
import { isSupabaseAuthConfigured, sendOtpToEmail } from "@/services/supabaseAuth";
import { isEidKitConfigured, runDemoEidKitLogin, startEidKitLogin } from "@/services/eidkitAuth";
import { tipizatulBrowseUrl } from "@/services/tipizatul";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const completeEidKitLogin = useAuth((s) => s.completeEidKitLogin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const eidkitEnabled = isEidKitConfigured();

  useEffect(() => {
    document.documentElement.classList.add("login-overscroll-flag");
    document.body.classList.add("login-overscroll-flag");
    return () => {
      document.documentElement.classList.remove("login-overscroll-flag");
      document.body.classList.remove("login-overscroll-flag");
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    const isDemo = email.trim().toLowerCase() === DEMO_EMAIL.toLowerCase();
    if (isSupabaseAuthConfigured() && !isDemo) {
      const { error } = await sendOtpToEmail(email);
      if (error) {
        toast.error("Nu am putut trimite codul OTP.", { description: error });
        return;
      }
      toast.success("Cod OTP trimis pe email.");
    } else if (isDemo) {
      toast.info("Cont demo local activ: confirmarea pe email este dezactivată.");
    }
    login(email);
    navigate({ to: "/verify" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative h-1.5 bg-tricolor before:absolute before:inset-x-0 before:bottom-full before:h-[100vh] before:bg-tricolor" />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="flex w-full flex-col items-center">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
              <ShieldCheck className="size-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Bine ai venit la ActeAI</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Agentul tău AI pentru ANAF, DRPCIV, Poliție și instituțiile statului.
            </p>
          </div>

          <div className="w-full rounded-2xl border border-border bg-card p-6 shadow-none">
            <div className="flex gap-1 p-1 bg-muted rounded-lg mb-5">
              {(["login", "signup"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
                    mode === m ? "bg-card text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {m === "login" ? "Autentificare" : "Cont nou"}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="nume@email.ro"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Parolă</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11">
                {mode === "login" ? "Continuă" : "Creează cont"}
                <ArrowRight className="size-4" />
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">sau</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 gap-2"
              onClick={() => {
                if (eidkitEnabled) {
                  try {
                    startEidKitLogin();
                  } catch (err) {
                    toast.error(
                      err instanceof Error ? err.message : "Nu am putut porni loginul CEI.",
                    );
                  }
                  return;
                }
                const { sub, email: ceiEmail } = runDemoEidKitLogin();
                seedCeiDemoVault();
                completeEidKitLogin({ sub, email: ceiEmail });
                toast.success("Demo CEI activat", {
                  description:
                    "Profil preluat din simulare (Andrei Popescu). Pentru NFC real, adaugă credențialele EidKit în .env.",
                });
                navigate({ to: "/" });
              }}
            >
              <Nfc className="size-4" />
              Autentificare cu buletinul electronic
              {!eidkitEnabled ? (
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  demo
                </span>
              ) : null}
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground text-center leading-relaxed">
              Via{" "}
              <a
                href="https://eidkit.ro/sso"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                EidKit
              </a>
              — atingi cardul NFC, introdu CAN + PIN. Date verificate de MAI, fără parolă.
              {!eidkitEnabled ? (
                <>
                  {" "}
                  Fără credențiale în <span className="font-mono">.env</span>, folosim simulare
                  locală.
                </>
              ) : null}
            </p>

            <Button asChild variant="ghost" size="sm" className="mt-3 w-full text-xs">
              <a href={tipizatulBrowseUrl()} target="_blank" rel="noreferrer">
                Formulare oficiale pe Tipizatul.eu →
              </a>
            </Button>

            <button
              type="button"
              onClick={() => {
                setEmail(DEMO_EMAIL);
                setPassword("demo1234");
              }}
              className="mt-4 w-full rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-left text-xs text-foreground/80 hover:bg-primary/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-start gap-2">
                <Sparkles className="size-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <span className="font-medium text-foreground">Cont demo:</span> apasă aici pentru
                  a folosi <span className="font-mono">{DEMO_EMAIL}</span> — încarcă un profil
                  românesc complet și 5 acte mock pentru a testa autofill-ul.
                </span>
              </div>
            </button>

            <div className="mt-5 pt-5 border-t border-border">
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-success shrink-0 mt-0.5" />
                <span>
                  Documentele tale rămân doar pe acest dispozitiv. ActeAI nu stochează acte personale
                  pe serverele sale.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
