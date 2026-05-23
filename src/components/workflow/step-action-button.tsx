// Dispatcher for the agentic per-step actions defined in `govApiMock.ts`.
// One action → one button. Each kind has its own click handler.
//
// Ported in spirit from civic-agent-buian `src/components/flow/StepActionButton.tsx`,
// but adapted for the local-only stack:
//   - `find_institution`  →  opens Google Maps with a `?q=` query (no API key)
//   - `online_banks`      →  shows a popover with a curated static list
//   - `caen_suggest`      →  routes to the chat with a seed prompt
//   - `explain_step`      →  routes to the chat with a seed prompt + local info[] fallback
//   - `prefill_pdf`       →  triggers client-side PDF generation (TODO: wire to pdf-lib in step 5/6)
//   - `deep_link`         →  resolves via resolveDeepLink(workflowId, stepKey)
//   - `open_url`          →  unchanged

import { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CreditCard,
  ExternalLink,
  FileDown,
  HelpCircle,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { resolveDeepLink } from "@/services/deepLinks";
import { ONLINE_BANKS } from "@/services/onlineBanks";
import { buildMapsSearchUrl, localityFromAddress } from "@/services/findInstitution";
import { useChatUi, useVault } from "@/store";
import type { StepAction } from "@/services/govApiMock";
import { toast } from "sonner";
import { downloadPdf, generateAntecontractPdf } from "@/services/pdf/antecontract";
import { generateDeclaratiePfaPdf } from "@/services/pdf/declaratiePfa";

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
      const city = localityFromAddress(profile.address);
      const url = buildMapsSearchUrl({ institutionType: action.institutionType, city });
      return (
        <ActionLink href={url} icon={MapPin}>
          {action.label}
        </ActionLink>
      );
    }

    case "online_banks":
      return <OnlineBanksPopover label={action.label ?? "Bănci cu deschidere online"} />;

    case "caen_suggest":
      return (
        <Button
          size="sm"
          variant="default"
          onClick={() =>
            openChat(
              "Sugerează-mi un cod CAEN potrivit pentru activitatea mea. Te rog întreabă-mă mai întâi ce fac.",
            )
          }
        >
          <Sparkles className="size-3.5" /> {action.label ?? "Sugerează CAEN cu AI"}
        </Button>
      );

    case "explain_step":
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => openChat(`Explică-mi pasul: ${stepTitle}. Context: ${action.topic}.`)}
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
                const bytes = await generateDeclaratiePfaPdf({
                  profile,
                  descriereActivitate: undefined,
                  codCaen: undefined,
                });
                downloadPdf(bytes, `civis-declaratie-pfa-draft.pdf`);
                toast.success("Declarație PFA draft generată.", {
                  description: "Completează manual codul CAEN și activitatea înainte de depunere.",
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
