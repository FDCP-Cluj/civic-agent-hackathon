import { createFileRoute, Link, Outlet, useRouterState, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowLeft, CheckCircle2, FileDown, FileText, Sparkles, Wand2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/dashboard/page-header";
import { SubmissionStrip } from "@/components/pfa/submission-strip";
import { useVault, usePfaDossier } from "@/store";
import { suggestCaenWithRag } from "@/services/rag";
import { PFA_DOSSIER_CARDS, loadPfaTemplate, type PfaDossierCardDef } from "@/services/forms";
import { toast } from "sonner";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { generateCererePfaPdf } from "@/services/pdf/cererePfa";
import { downloadPdf } from "@/services/pdf/antecontract";
import { generateDeclaratiePfaPdf } from "@/services/pdf/declaratiePfa";

type Search = { autofill?: string };

export const Route = createFileRoute("/workflow/$id/pfa")({
  component: PfaDossierHubPage,
  validateSearch: (s: Record<string, unknown>): Search => ({
    autofill: s.autofill === "1" || s.autofill === "true" ? "1" : undefined,
  }),
});

function cardStatusLabel(status: string | undefined): string {
  if (status === "gata") return "Gata";
  if (status === "draft") return "Draft";
  return "Necompletat";
}

function PfaDossierHubPage() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFormRoute = /\/pfa\/form\//.test(pathname);
  const { autofill } = useSearch({ from: "/workflow/$id/pfa" });
  const profile = useVault((s) => s.profile);
  const documents = useVault((s) => s.documents);
  const dossier = usePfaDossier();
  const updateDossier = usePfaDossier((s) => s.updateDossier);
  const setCardMode = usePfaDossier((s) => s.setCardMode);
  const setCardStatus = usePfaDossier((s) => s.setCardStatus);
  const syncFromProfile = usePfaDossier((s) => s.syncFromProfile);

  const [activity, setActivity] = useState(dossier.activitateDescriere);
  const [caenCode, setCaenCode] = useState(dossier.codCaenPrincipal);
  const [ragLoading, setRagLoading] = useState(false);

  useEffect(() => {
    if (id === "pfa-registration") syncFromProfile(profile);
  }, [id, profile.fullName, profile.address, syncFromProfile]);

  useEffect(() => {
    if (autofill === "1" && profile.fullName && profile.cnp) {
      toast.info("Deschide un formular PDF și verifică datele completate automat.");
    }
  }, [autofill, profile.fullName, profile.cnp]);

  if (isFormRoute) return <Outlet />;

  if (id !== "pfa-registration") {
    return (
      <AppShell>
        <Card className="p-5">
          <p className="text-sm">Dosarul PFA este disponibil doar pentru înregistrare PFA.</p>
          <Button asChild className="mt-3">
            <Link to="/workflow/$id" params={{ id }}>
              Înapoi
            </Link>
          </Button>
        </Card>
      </AppShell>
    );
  }

  const handleSuggest = async () => {
    if (!activity.trim()) {
      toast.info("Descrie activitatea pentru CAEN.");
      return;
    }
    setRagLoading(true);
    const res = await suggestCaenWithRag(activity);
    const code = res.matches[0]?.code ?? "";
    if (code) {
      setCaenCode(code);
      updateDossier({
        codCaenPrincipal: code,
        activitateDescriere: activity,
      });
    }
    setRagLoading(false);
  };

  const saveDossierMeta = () => {
    updateDossier({
      codCaenPrincipal: caenCode,
      activitateDescriere: activity,
      denumirePfa: dossier.denumirePfa || `${profile.fullName.trim()} PFA`,
      sediuProfesional: dossier.sediuProfesional || profile.address,
    });
    toast.success("Date dosar salvate.");
  };

  const handleGeneratedCerere = async () => {
    if (!profile.fullName || !profile.cnp) {
      toast.error("Completează seiful (nume, CNP) mai întâi.");
      return;
    }
    saveDossierMeta();
    const bytes = await generateCererePfaPdf({ profile, dossier });
    downloadPdf(bytes, "acteai-cerere-inregistrare-pfa-draft.pdf");
    setCardStatus("cerere-inregistrare", "gata");
    toast.success("Cerere draft descărcată.");
  };

  const handleDeclaratieFallback = async () => {
    const bytes = await generateDeclaratiePfaPdf({
      profile,
      codCaen: caenCode || dossier.codCaenPrincipal,
      descriereActivitate: activity,
      sediuProfesional: dossier.sediuProfesional || profile.address,
    });
    downloadPdf(bytes, "acteai-declaratie-pfa-draft.pdf");
    toast.success("Declarație draft (generator ActeAI) descărcată.");
  };

  return (
    <AppShell>
      <PageHeader
        title="Dosar PFA — completare în aplicație"
        description="Formulare PDF, atașamente și instrucțiuni de depunere. Totul rămâne pe dispozitivul tău."
      >
        <Button asChild variant="outline" size="sm">
          <Link to="/workflow/$id" params={{ id: "pfa-registration" }}>
            <ArrowLeft className="size-4" />
            Ghid PFA
          </Link>
        </Button>
      </PageHeader>

      <Card className="mt-4 p-4 mb-4 border-border/80">
        <h2 className="text-sm font-semibold mb-3">Date dosar (din seif + activitate)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Activitate</Label>
            <Input value={activity} onChange={(e) => setActivity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>CAEN principal</Label>
            <Input
              value={caenCode}
              onChange={(e) => setCaenCode(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Denumire PFA</Label>
            <Input
              value={dossier.denumirePfa}
              onChange={(e) => updateDossier({ denumirePfa: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Sediu profesional</Label>
            <Input
              value={dossier.sediuProfesional || profile.address}
              onChange={(e) => updateDossier({ sediuProfesional: e.target.value })}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Button size="sm" variant="outline" onClick={handleSuggest} disabled={ragLoading}>
            <Sparkles className="size-4" />
            Sugerează CAEN
          </Button>
          <Button size="sm" onClick={saveDossierMeta}>
            Salvează în dosar
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {PFA_DOSSIER_CARDS.map((card) => (
          <DossierCard
            key={card.id}
            card={card}
            status={dossier.cardStatus[card.id]}
            mode={dossier.cardModes[card.id] ?? "autofill"}
            autofillQuery={autofill === "1" ? "1" : undefined}
            onModeChange={(m) => setCardMode(card.id, m)}
            onGeneratedCerere={handleGeneratedCerere}
            onDeclaratieFallback={
              card.id === "declaratie-propria-raspundere" ? handleDeclaratieFallback : undefined
            }
            hasCi={documents.some((d) => d.type === "id_card")}
          />
        ))}
      </div>
    </AppShell>
  );
}

function DossierCard({
  card,
  status,
  mode,
  autofillQuery,
  onModeChange,
  onGeneratedCerere,
  onDeclaratieFallback,
  hasCi,
}: {
  card: PfaDossierCardDef;
  status?: string;
  mode: "autofill" | "manual";
  autofillQuery?: string;
  onModeChange: (m: "autofill" | "manual") => void;
  onGeneratedCerere: () => void;
  onDeclaratieFallback?: () => void;
  hasCi: boolean;
}) {
  const template = card.templateId ? loadPfaTemplate(card.templateId) : undefined;
  const visibleCount = template?.fields.filter((f) => !f.hidden).length ?? 0;

  return (
    <Card className="p-4 border-border/80">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="font-semibold text-sm">{card.title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{card.description}</p>
        </div>
        <Badge variant={status === "gata" ? "default" : "secondary"}>
          {cardStatusLabel(status)}
        </Badge>
      </div>

      <SubmissionStrip submission={card.submission} compact />

      {card.kind === "acroform" && card.templateId && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Wand2 className="size-3.5" />
            <span>Autocompletare</span>
            <Switch
              checked={mode === "autofill"}
              onCheckedChange={(c) => onModeChange(c ? "autofill" : "manual")}
            />
          </div>
          <span className="text-xs text-muted-foreground">{visibleCount} câmpuri PDF</span>
          <Button asChild size="sm">
            <Link
              to="/workflow/$id/pfa/form/$formId"
              params={{ id: "pfa-registration", formId: card.templateId }}
              search={mode === "autofill" || autofillQuery ? { autofill: "1" } : {}}
            >
              <FileText className="size-4" />
              {mode === "autofill" ? "Completează automat" : "Completează manual"}
            </Link>
          </Button>
          {onDeclaratieFallback && (
            <Button size="sm" variant="ghost" onClick={onDeclaratieFallback}>
              Draft text simplu (nu e formularul ONRC)
            </Button>
          )}
        </div>
      )}

      {card.kind === "generated_pdf" && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">
            PDF-ul oficial de pe eDirect nu are câmpuri editabile. Generăm un draft structurat.
          </p>
          <Button size="sm" onClick={onGeneratedCerere}>
            <FileDown className="size-4" />
            Generează cerere draft PDF
          </Button>
        </div>
      )}

      {card.kind === "attach" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/vault">Încarcă în seif</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/scan">Scanează document</Link>
          </Button>
          {card.attachType === "ci" && hasCi && (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="size-3 text-success" />
              CI în seif
            </Badge>
          )}
        </div>
      )}

      {card.kind === "checklist" && (
        <ul className="mt-3 text-sm space-y-1.5 list-disc pl-5 text-muted-foreground">
          <li>Specimen la notar (~80–150 RON) sau gratuit la ghișeul ONRC</li>
          <li>Necesar la depunerea dosarului fizic sau pentru arhivă</li>
        </ul>
      )}
    </Card>
  );
}
