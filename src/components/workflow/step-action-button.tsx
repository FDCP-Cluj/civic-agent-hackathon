// Dispatcher for the agentic per-step actions defined in `govApiMock.ts`.
// One action → one button. Each kind has its own click handler.
//
// Ported in spirit from civic-agent-buian `src/components/flow/StepActionButton.tsx`,
// but adapted for the local-only stack:
//   - `find_institution`  →  opens Google Maps with a `?q=` query (no API key)
//   - `online_banks`      →  shows a popover with a curated static list
//   - `caen_suggest`      →  opens a CAEN suggestion modal and persists selection
//   - `explain_step`      →  routes to the chat with a seed prompt + local info[] fallback
//   - `prefill_pdf`       →  triggers client-side PDF generation (TODO: wire to pdf-lib in step 5/6)
//   - `deep_link`         →  resolves via resolveDeepLink(workflowId, stepKey)
//   - `open_url`          →  unchanged

import { useState } from "react";
import {
  ArrowUpRight,
  Loader2,
  Building2,
  CreditCard,
  ExternalLink,
  FileDown,
  HelpCircle,
  MapPin,
  Phone,
  Sparkles,
  Star,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resolveDeepLink } from "@/services/deepLinks";
import { ONLINE_BANKS } from "@/services/onlineBanks";
import { findInstitution, localityFromAddress } from "@/services/findInstitution";
import { useChatUi, usePfaDossier, useVault } from "@/store";
import type { StepAction } from "@/services/govApiMock";
import { toast } from "sonner";
import { explainStepWithRag } from "@/services/rag";
import { tipizatulBrowseUrl, tipizatulProcedureUrl } from "@/services/tipizatul";
import { CaenSuggestDialog } from "@/components/pfa/caen-suggest-dialog";

type Props = {
  action: StepAction;
  workflowId: string;
  stepKey: string | undefined;
  stepTitle: string;
  stepInfo?: string[];
};

export function StepActionButton({ action, workflowId, stepKey, stepTitle, stepInfo }: Props) {
  const openChat = useChatUi((s) => s.openChat);
  const profile = useVault((s) => s.profile);
  const profileLocality = localityFromAddress(profile.address);
  const updateDossier = usePfaDossier((s) => s.updateDossier);
  const dossierActivity = usePfaDossier((s) => s.activitateDescriere);
  const dossierCaen = usePfaDossier((s) => s.codCaenPrincipal);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [caenOpen, setCaenOpen] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesCityOverride, setPlacesCityOverride] = useState("");
  const [placesData, setPlacesData] = useState<Awaited<ReturnType<typeof findInstitution>> | null>(
    null,
  );

  async function runInstitutionLookup(args: {
    institutionType: string;
    city?: string;
    lat?: number;
    lng?: number;
  }) {
    setPlacesLoading(true);
    try {
      const result = await findInstitution(args);
      setPlacesData(result);
      setPlacesOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Nu am putut încărca locațiile. Încearcă din nou.");
    } finally {
      setPlacesLoading(false);
    }
  }

  function fallbackToProfileLookup(institutionType: string, reason: "unavailable" | "denied") {
    if (profileLocality) {
      toast.info(
        reason === "denied"
          ? "Permisiunea de locație a fost refuzată. Folosesc orașul din profil."
          : "Geolocația nu este disponibilă pe acest browser. Folosesc orașul din profil.",
      );
      runInstitutionLookup({
        institutionType,
        city: profileLocality,
      });
      return;
    }

    toast.info(
      reason === "denied"
        ? "Permisiunea de locație a fost refuzată și nu am găsit oraș în profil. Folosește căutarea manuală."
        : "Geolocația nu este disponibilă și nu am găsit oraș în profil. Folosește căutarea manuală.",
    );
    runInstitutionLookup({ institutionType });
  }

  function searchNearby(institutionType: string) {
    if (!("geolocation" in navigator)) {
      fallbackToProfileLookup(institutionType, "unavailable");
      return;
    }

    const loadingToast = toast.loading("Se obține locația ta...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        toast.dismiss(loadingToast);
        runInstitutionLookup({
          institutionType,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        toast.dismiss(loadingToast);
        fallbackToProfileLookup(institutionType, "denied");
      },
      { timeout: 8000, maximumAge: 300000 },
    );
  }

  switch (action.kind) {
    case "open_url":
      return (
        <ActionLink href={action.url} icon={ExternalLink}>
          {action.label}
        </ActionLink>
      );

    case "deep_link": {
      const link = resolveDeepLink(workflowId, stepKey);
      if (!link) {
        return (
          <Button
            size="sm"
            variant="outline"
            disabled
            title="Link oficial nedisponibil pentru acest pas"
          >
            <ExternalLink className="size-3.5" /> {action.label}
          </Button>
        );
      }
      return (
        <ActionLink href={link.url} icon={ArrowUpRight}>
          {action.label}
        </ActionLink>
      );
    }

    case "find_institution": {
      return (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => searchNearby(action.institutionType)}
              disabled={placesLoading}
            >
              {placesLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <MapPin className="size-3.5" />
              )}{" "}
              {action.label} (lângă mine)
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (!profileLocality) {
                  toast.info("Orașul nu există în profil. Folosește câmpul de căutare manuală.");
                }
                runInstitutionLookup({
                  institutionType: action.institutionType,
                  city: profileLocality,
                });
              }}
              disabled={placesLoading}
            >
              Folosește orașul din profil
            </Button>
          </div>

          <Dialog open={placesOpen} onOpenChange={setPlacesOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Instituții recomandate</DialogTitle>
                <DialogDescription>
                  {placesData?.source === "google_maps"
                    ? `Rezultate Google Maps pentru „${placesData.query}”.`
                    : "Fallback activ: deschide căutarea direct în Google Maps."}
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-end gap-2 pb-2">
                <div className="flex-1">
                  <Label className="text-xs">Caută în alt oraș</Label>
                  <Input
                    value={placesCityOverride}
                    onChange={(e) => setPlacesCityOverride(e.target.value)}
                    placeholder="ex: Cluj-Napoca"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={placesLoading || placesCityOverride.trim().length < 2}
                  onClick={() =>
                    runInstitutionLookup({
                      institutionType: action.institutionType,
                      city: placesCityOverride.trim(),
                    })
                  }
                >
                  Caută
                </Button>
              </div>

              <div className="max-h-[60vh] space-y-2 overflow-y-auto">
                {placesData?.results.map((result, idx) => (
                  <div key={`${result.mapsUrl}-${idx}`} className="rounded-md border p-3">
                    <div className="font-medium">{result.name}</div>
                    {result.address ? (
                      <div className="text-xs text-muted-foreground">{result.address}</div>
                    ) : null}
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                      {typeof result.rating === "number" ? (
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3" />
                          {result.rating.toFixed(1)}
                        </span>
                      ) : null}
                      {result.openNow !== null ? (
                        <span>{result.openNow ? "Deschis acum" : "Închis acum"}</span>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <a href={result.mapsUrl} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline">
                          <MapPin className="size-3.5" /> Deschide în Maps
                        </Button>
                      </a>
                      {result.phone ? (
                        <a href={`tel:${result.phone}`}>
                          <Button size="sm" variant="ghost">
                            <Phone className="size-3.5" /> {result.phone}
                          </Button>
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      );
    }

    case "online_banks":
      return <OnlineBanksPopover label={action.label ?? "Bănci cu deschidere online"} />;

    case "caen_suggest":
      return (
        <>
          <Button size="sm" variant="default" onClick={() => setCaenOpen(true)}>
            <Sparkles className="size-3.5" /> {action.label ?? "Sugerează CAEN cu AI"}
          </Button>
          <CaenSuggestDialog
            open={caenOpen}
            onOpenChange={setCaenOpen}
            initialActivity={dossierActivity}
            onSelect={(selection) => {
              updateDossier({
                codCaenPrincipal: selection.code,
                // For legal forms we persist the official CAEN class title.
                activitateDescriere: selection.title,
              });
              toast.success(`CAEN ${selection.code} salvat în dosar.`, {
                description: selection.title,
              });
            }}
          />
        </>
      );

    case "explain_step":
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            const basePrompt = `Explică-mi pasul: ${stepTitle}. Context: ${action.topic}.`;
            try {
              const rag = await explainStepWithRag(action.topic, stepInfo);
              const ragBlock =
                rag.bullets.length > 0
                  ? `\n\nContext RAG (${rag.source}):\n${rag.bullets.map((b) => `- ${b}`).join("\n")}`
                  : "";
              const refs =
                rag.citations.length > 0
                  ? `\n\nSurse candidate:\n${rag.citations
                      .map((c) => `- ${c.title} (${c.url ?? c.source})`)
                      .join("\n")}`
                  : "";
              openChat(`${basePrompt}${ragBlock}${refs}`);
            } catch (err) {
              console.warn("[workflow] explain_step fallback without RAG", err);
              openChat(basePrompt);
            }
          }}
        >
          <HelpCircle className="size-3.5" /> {action.label ?? "Explică pas cu pas"}
        </Button>
      );

    case "prefill_pdf":
      return (
        <Button
          size="sm"
          variant="default"
          onClick={async () => {
            try {
              if (action.template === "antecontract") {
                const { downloadPdf, generateAntecontractPdf } =
                  await import("@/services/pdf/antecontract");
                const bytes = await generateAntecontractPdf({
                  vanzator: profile,
                  cumparator: {},
                  imobil: { adresa: "[completeaza la notar]" },
                  pret: "[pret]",
                });
                downloadPdf(bytes, `civis-antecontract-draft.pdf`);
                toast.success("Antecontract draft generat.", {
                  description: "Verifică-l la notar înainte de semnare.",
                });
                return;
              }
              if (action.template === "declaratie_pfa") {
                const [{ generateDeclaratiePfaPdf }, { downloadPdf }] = await Promise.all([
                  import("@/services/pdf/declaratiePfa"),
                  import("@/services/pdf/antecontract"),
                ]);
                const bytes = await generateDeclaratiePfaPdf({
                  profile,
                  descriereActivitate: dossierActivity || undefined,
                  codCaen: dossierCaen || undefined,
                });
                downloadPdf(bytes, `civis-declaratie-pfa-draft.pdf`);
                toast.success("Declarație PFA draft generată.", {
                  description:
                    dossierCaen && dossierActivity
                      ? "Am folosit CAEN-ul salvat în dosar."
                      : "Completează manual codul CAEN și activitatea înainte de depunere.",
                });
                return;
              }
              toast.info(`Template "${action.template}" nu este încă disponibil.`, {
                description: stepInfo?.[0],
              });
            } catch (err) {
              console.error(err);
              toast.error("Nu am putut genera PDF-ul. Încearcă din nou.");
            }
          }}
        >
          <FileDown className="size-3.5" /> {action.label}
        </Button>
      );

    case "tipizatul":
      return (
        <ActionLink
          href={
            action.procedureId ? tipizatulProcedureUrl(action.procedureId) : tipizatulBrowseUrl()
          }
          icon={FileText}
        >
          {action.label}
        </ActionLink>
      );
  }
}

function ActionLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: typeof ExternalLink;
  children: React.ReactNode;
}) {
  return (
    <Button size="sm" variant="outline" asChild>
      <a href={href} target="_blank" rel="noopener noreferrer">
        <Icon className="size-3.5" /> {children}
      </a>
    </Button>
  );
}

function OnlineBanksPopover({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline">
          <CreditCard className="size-3.5" /> {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Bănci PFA / IMM
        </div>
        <ul className="space-y-2">
          {ONLINE_BANKS.map((bank) => (
            <li key={bank.name}>
              <a
                href={bank.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-md p-2 -mx-2 hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-muted-foreground" />
                    {bank.name}
                  </span>
                  {bank.fullyOnline ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-success bg-success/10 rounded px-1.5 py-0.5">
                      100% online
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                      hibrid
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{bank.note}</p>
              </a>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
