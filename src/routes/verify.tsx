import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Smartphone, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useAuth } from "@/store";
import { DEMO_EMAIL, maybeSeedDemoVault } from "@/lib/demoSeed";
import { toast } from "sonner";
import { isSupabaseAuthConfigured, verifyEmailOtp } from "@/services/supabaseAuth";

export const Route = createFileRoute("/verify")({ component: Verify });

function Verify() {
  const navigate = useNavigate();
  const { email, verify2FA } = useAuth();
  const [code, setCode] = useState("");
  const supabaseEnabled = isSupabaseAuthConfigured();
  const isDemo = (email ?? "").trim().toLowerCase() === DEMO_EMAIL.toLowerCase();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return;
    if (supabaseEnabled && !isDemo) {
      if (!email) {
        toast.error("Lipsește email-ul pentru verificare OTP.");
        return;
      }
      const { data, error } = await verifyEmailOtp(email, code);
      if (error || !data) {
        toast.error("Cod OTP invalid sau expirat.", { description: error ?? undefined });
        return;
      }
      verify2FA(data);
    } else {
      verify2FA();
    }
    if (maybeSeedDemoVault(email)) {
      toast.success("Cont demo activat", {
        description: "Profil și 5 acte mock încărcate în seif pentru autofill.",
      });
    }
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="h-1.5 bg-tricolor" />
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="size-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
              <Smartphone className="size-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Verificare în 2 pași</h1>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-sm">
              Am trimis un cod la{" "}
              <span className="font-medium text-foreground">{email ?? "telefonul tău"}</span>.
              Introdu codul de 6 cifre pentru a continua.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="bg-card border border-border rounded-2xl p-6 shadow-card space-y-5"
          >
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="size-12 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground text-center">
              {supabaseEnabled && !isDemo
                ? "Introdu codul primit pe email (Supabase OTP)."
                : "Demo hackathon: orice cod din 6 cifre funcționează."}
            </div>

            <Button type="submit" disabled={code.length !== 6} className="w-full h-11">
              Verifică și intră
            </Button>

            <div className="flex items-start gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
              <ShieldCheck className="size-4 text-success shrink-0 mt-0.5" />
              <span>Sesiunea este criptată și expiră automat după inactivitate.</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
