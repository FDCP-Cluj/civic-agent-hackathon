import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, FileDown, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useVault } from "@/store";
import { generateDeclaratiePfaPdf } from "@/services/pdf/declaratiePfa";
import { downloadPdf } from "@/services/pdf/antecontract";
import { suggestCaenWithRag } from "@/services/rag";
import { toast } from "sonner";

export const Route = createFileRoute("/workflow/$id/pfa")({
  component: PfaWizardPage,
});

function PfaWizardPage() {
  const { id } = Route.useParams();
  const profile = useVault((s) => s.profile);
  const [activity, setActivity] = useState("");
  const [caenCode, setCaenCode] = useState("");
  const [ragLoading, setRagLoading] = useState(false);
  const [ragSource, setRagSource] = useState<"supabase_rag" | "local_fallback" | null>(null);
  const [suggestions, setSuggestions] = useState<
    Array<{ code: string; title: string; score: number }>
  >([]);

  const steps = useMemo(
    () => [
      "Alege codul CAEN principal și confirmă activitatea.",
      "Verifică sediul profesional și documentele suport.",
      "Generează declarația pe propria răspundere precompletată.",
      "Depune dosarul la ONRC și urmărește statusul.",
    ],
    [],
  );

  if (id !== "pfa-registration") {
    return (
      <AppShell>
        <Card className="p-5">
          <p className="text-sm">Acest wizard este disponibil doar pentru fluxul PFA.</p>
          <Button asChild className="mt-3">
            <Link to="/workflow/$id" params={{ id }}>
              Înapoi la workflow
            </Link>
          </Button>
        </Card>
      </AppShell>
    );
  }

  const handleSuggest = async () => {
    if (!activity.trim()) {
      toast.info("Descrie activitatea pentru a sugera coduri CAEN.");
      return;
    }
    setRagLoading(true);
    const res = await suggestCaenWithRag(activity);
    setSuggestions(res.matches.map((m) => ({ code: m.code, title: m.title, score: m.score })));
    setRagSource(res.source);
    if (!caenCode && res.matches[0]?.code) setCaenCode(res.matches[0].code);
    setRagLoading(false);
  };

  const handleGeneratePdf = async () => {
    const bytes = await generateDeclaratiePfaPdf({
      profile,
      codCaen: caenCode || undefined,
      descriereActivitate: activity || undefined,
      sediuProfesional: profile.address || undefined,
      doarAdresaAdministrativa: false,
    });
    downloadPdf(bytes, "civis-declaratie-pfa-wizard.pdf");
    toast.success("Declarația PFA a fost generată.");
  };

  return (
    <AppShell>
      <Link
        to="/workflow/$id"
        params={{ id: "pfa-registration" }}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="size-4" /> Înapoi
      </Link>

      <Card className="p-5 mb-4 bg-gradient-to-br from-card to-accent/40">
        <div className="text-sm uppercase tracking-wider text-primary font-semibold mb-2">
          Wizard PFA (feature-rich)
        </div>
        <h1 className="text-xl font-semibold">Înființare PFA — ghid asistat</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Flux bazat pe varianta detaliată din `civic-agent-buian`, adaptat în UI-ul curent.
        </p>
      </Card>

      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Descrie activitatea ta</Label>
            <Input
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="Ex: dezvoltare software web pentru companii mici"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Cod CAEN principal</Label>
            <Input
              value={caenCode}
              onChange={(e) => setCaenCode(e.target.value)}
              placeholder="6201"
              className="font-mono"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleSuggest} disabled={ragLoading} className="w-full">
              <Sparkles className="size-4" />
              {ragLoading ? "Caut..." : "Sugerează CAEN (RAG)"}
            </Button>
          </div>
        </div>

        {ragSource && (
          <div className="mt-3 text-sm text-muted-foreground">
            Sursă sugestii:{" "}
            <strong>{ragSource === "supabase_rag" ? "RAG Supabase" : "fallback local"}</strong>
          </div>
        )}

        {suggestions.length > 0 && (
          <ul className="mt-3 space-y-2">
            {suggestions.slice(0, 5).map((s) => (
              <li key={s.code} className="rounded-lg border border-border p-2">
                <div className="text-sm font-mono text-primary">{s.code}</div>
                <div className="text-sm">{s.title}</div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4 mb-4">
        <div className="text-sm font-semibold mb-2">Checklist ghidat</div>
        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s} className="flex items-center gap-2.5 text-sm">
              <CheckCircle2 className="size-4 text-success shrink-0" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Button onClick={handleGeneratePdf} className="w-full">
        <FileDown className="size-4" /> Generează declarație PFA
      </Button>
    </AppShell>
  );
}
