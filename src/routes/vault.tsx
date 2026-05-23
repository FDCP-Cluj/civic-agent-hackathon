import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, FolderLock, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useProfileCompleteness, useVault } from "@/store";
import { VaultUploadCard } from "@/components/vault-upload-card";
import {
  validateAddress,
  validateBirthDate,
  validateCnp,
  validateEmail,
  validateFullName,
  validatePhone,
  type FieldResult,
} from "@/lib/profileValidation";
import { isSupabaseConfigured } from "@/services/supabaseClient";
import { PageHeader } from "@/components/dashboard/page-header";

export const Route = createFileRoute("/vault")({ component: Vault });

function Vault() {
  const { profile, updateProfile } = useVault();
  const docs = useVault((s) => s.documents);
  const completeness = useProfileCompleteness();
  const completenessPct = Math.round(completeness * 100);
  const ragEnabled = isSupabaseConfigured();

  const checks: Record<string, FieldResult> = {
    fullName: validateFullName(profile.fullName),
    cnp: validateCnp(profile.cnp),
    address: validateAddress(profile.address),
    phone: validatePhone(profile.phone),
    email: validateEmail(profile.email),
    birthDate: validateBirthDate(profile.birthDate),
  };

  const allValid = Object.values(checks).every((c) => c.status === "valid");

  return (
    <AppShell>
      <PageHeader
        title="Seiful meu local"
        description="Datele și actele tale rămân pe acest dispozitiv. Nu părăsesc niciodată browserul."
      >
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <FolderLock className="size-4 text-primary" />
          Vault local
        </div>
      </PageHeader>

      <div className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-3.5 py-2.5 mb-5 mt-5">
        <ShieldCheck className="size-4 text-success shrink-0" />
        <p className="text-xs">
          <span className="font-medium text-success">Zero GDPR.</span> Civis nu trimite niciun
          document către servere.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <Card className="p-3 text-center">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Profil</div>
          <div className="text-lg font-semibold">{completenessPct}%</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Documente
          </div>
          <div className="text-lg font-semibold">{docs.length}</div>
        </Card>
        <Card className="p-3 text-center">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">RAG</div>
          <div className="text-sm font-semibold">{ragEnabled ? "activ" : "fallback local"}</div>
        </Card>
      </div>

      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-sm font-semibold">Date personale (folosite la autofill)</h2>
          <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
            {completenessPct}% complet
          </span>
        </div>
        <Progress value={completenessPct} className="h-1.5 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Nume complet"
            value={profile.fullName}
            onChange={(v) => updateProfile({ fullName: v })}
            check={checks.fullName}
          />
          <Field
            label="CNP"
            value={profile.cnp}
            onChange={(v) => updateProfile({ cnp: v })}
            check={checks.cnp}
            mono
          />
          <Field
            label="Adresă"
            value={profile.address}
            onChange={(v) => updateProfile({ address: v })}
            check={checks.address}
            className="sm:col-span-2"
          />
          <Field
            label="Telefon"
            value={profile.phone}
            onChange={(v) => updateProfile({ phone: v })}
            check={checks.phone}
          />
          <Field
            label="Email"
            value={profile.email}
            onChange={(v) => updateProfile({ email: v })}
            check={checks.email}
          />
          <Field
            label="Data nașterii"
            type="date"
            value={profile.birthDate}
            onChange={(v) => updateProfile({ birthDate: v })}
            check={checks.birthDate}
          />
        </div>
        {allValid && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-success animate-[fade-in_0.3s_ease-out]">
            <CheckCircle2 className="size-3.5" /> Profil complet și validat — autofill activat.
          </div>
        )}
      </Card>

      <VaultUploadCard />
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  check,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  check?: FieldResult;
  mono?: boolean;
}) {
  const invalid = check?.status === "invalid";
  const valid = check?.status === "valid";
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs flex items-center justify-between gap-2">
        <span>{label}</span>
        {valid && (
          <span className="inline-flex items-center gap-1 text-success font-normal">
            <CheckCircle2 className="size-3" /> valid
          </span>
        )}
        {invalid && (
          <span className="inline-flex items-center gap-1 text-destructive font-normal">
            <AlertCircle className="size-3" /> verifică
          </span>
        )}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={`${mono ? "font-mono tabular-nums" : ""} ${
          invalid ? "border-destructive/60 focus-visible:ring-destructive/50" : ""
        }`}
      />
      {invalid && check?.message && <p className="text-[11px] text-destructive">{check.message}</p>}
    </div>
  );
}
