import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, FolderLock, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { formatStructuredAddress } from "@/lib/address";
import { useProfileCompleteness, useTasks, useVault } from "@/store";
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
  const { profile, updateProfile, updateAddressParts } = useVault();
  const docs = useVault((s) => s.documents);
  const tasks = useTasks((s) => s.tasks);
  const completeness = useProfileCompleteness();
  const completenessPct = Math.round(completeness * 100);
  const ragEnabled = isSupabaseConfigured();
  const formattedAddress = formatStructuredAddress(profile.addressParts);

  const checks: Record<string, FieldResult> = {
    fullName: validateFullName(profile.fullName),
    cnp: validateCnp(profile.cnp),
    address: validateAddress(formattedAddress || profile.address),
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
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <FolderLock className="size-4 text-primary" />
          Vault local · {ragEnabled ? "RAG activ" : "fallback local"}
        </div>
      </PageHeader>

      <div className="flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-3.5 py-2.5 mb-5 mt-5">
        <ShieldCheck className="size-4 text-success shrink-0" />
        <p className="text-sm">
          <span className="font-medium text-success">Zero GDPR.</span> ActeAI nu trimite niciun
          document către servere.
        </p>
      </div>

      <section
        className="mb-5 mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Statistici seif"
      >
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Sarcini active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{tasks.length}</p>
            <p className="text-xs text-muted-foreground">Proceduri în desfășurare</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-base font-medium text-muted-foreground">Documente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{docs.length}</p>
            <p className="text-xs text-muted-foreground">Fișiere în seif</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-base font-medium text-muted-foreground">Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{profile.fullName ? "OK" : "—"}</p>
            <p className="text-xs text-muted-foreground">{completenessPct}% complet</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-base font-medium text-muted-foreground">
              Localitate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-lg font-semibold">
              {profile.addressParts.locality || "Nesetată"}
            </p>
            <p className="text-xs text-muted-foreground">Domiciliu</p>
          </CardContent>
        </Card>
      </section>

      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <h2 className="text-sm font-semibold">Date personale (folosite la autofill)</h2>
          <span className="text-xs font-mono tabular-nums text-muted-foreground">
            {completenessPct}% complet
          </span>
        </div>
        <Progress value={completenessPct} className="h-1.5 mb-4" />

        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Identitate
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
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
            label="Nume (familie)"
            value={profile.lastName}
            onChange={(v) => updateProfile({ lastName: v })}
          />
          <Field
            label="Prenume"
            value={profile.firstName}
            onChange={(v) => updateProfile({ firstName: v })}
          />
          <Field
            label="Data nașterii"
            type="date"
            value={profile.birthDate}
            onChange={(v) => updateProfile({ birthDate: v })}
            check={checks.birthDate}
          />
          <Field
            label="Localitate naștere"
            value={profile.birthLocality}
            onChange={(v) => updateProfile({ birthLocality: v })}
          />
          <Field
            label="Județ naștere"
            value={profile.birthCounty}
            onChange={(v) => updateProfile({ birthCounty: v })}
          />
          <Field
            label="Cetățenie"
            value={profile.citizenship}
            onChange={(v) => updateProfile({ citizenship: v })}
          />
        </div>

        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Adresă domiciliu
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <Field
            label="Stradă"
            value={profile.addressParts.street}
            onChange={(v) => updateAddressParts({ street: v })}
            className="sm:col-span-2"
          />
          <Field
            label="Număr"
            value={profile.addressParts.streetNumber}
            onChange={(v) => updateAddressParts({ streetNumber: v })}
          />
          <Field
            label="Bloc"
            value={profile.addressParts.block}
            onChange={(v) => updateAddressParts({ block: v })}
          />
          <Field
            label="Scara"
            value={profile.addressParts.stair}
            onChange={(v) => updateAddressParts({ stair: v })}
          />
          <Field
            label="Etaj"
            value={profile.addressParts.floor}
            onChange={(v) => updateAddressParts({ floor: v })}
          />
          <Field
            label="Apartament"
            value={profile.addressParts.apartment}
            onChange={(v) => updateAddressParts({ apartment: v })}
          />
          <Field
            label="Localitate"
            value={profile.addressParts.locality}
            onChange={(v) => updateAddressParts({ locality: v })}
          />
          <Field
            label="Județ / sector"
            value={profile.addressParts.county || profile.addressParts.sector}
            onChange={(v) =>
              updateAddressParts(
                /^\d+$/.test(v.trim())
                  ? { sector: v.trim(), county: "" }
                  : { county: v, sector: "" },
              )
            }
            check={checks.address}
          />
          <Field
            label="Țară"
            value={profile.addressParts.country}
            onChange={(v) => updateAddressParts({ country: v })}
          />
        </div>

        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Act identitate & contact
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Tip act"
            value={profile.idCardType}
            onChange={(v) => updateProfile({ idCardType: v })}
          />
          <Field
            label="Serie CI"
            value={profile.idCardSeries}
            onChange={(v) => updateProfile({ idCardSeries: v })}
          />
          <Field
            label="Număr CI"
            value={profile.idCardNumber}
            onChange={(v) => updateProfile({ idCardNumber: v })}
            mono
          />
          <Field
            label="Emis de"
            value={profile.idCardIssuedBy}
            onChange={(v) => updateProfile({ idCardIssuedBy: v })}
          />
          <Field
            label="Data emiterii CI"
            type="date"
            value={profile.idCardIssueDate}
            onChange={(v) => updateProfile({ idCardIssueDate: v })}
          />
          <Field
            label="Valabil până la"
            type="date"
            value={profile.idCardExpiryDate}
            onChange={(v) => updateProfile({ idCardExpiryDate: v })}
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
        </div>

        {formattedAddress && (
          <p className="mt-3 text-xs text-muted-foreground">
            Rezumat adresă: {formattedAddress}
          </p>
        )}

        {allValid && (
          <div className="mt-3 flex items-center gap-1.5 text-sm text-success">
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
      <Label className="text-sm flex items-center justify-between gap-2">
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
      {invalid && check?.message && <p className="text-xs text-destructive">{check.message}</p>}
    </div>
  );
}
