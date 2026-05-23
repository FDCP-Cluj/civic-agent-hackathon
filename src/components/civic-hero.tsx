import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight, Clock, Calendar, FolderLock, AlertTriangle } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  RENEWAL_WORKFLOW_FOR_DOC,
  useChatUi,
  useExpiringDocuments,
  useProfileCompleteness,
  useTasks,
} from "@/store";

type HeroState =
  | {
      kind: "task";
      title: string;
      subtitle: string;
      icon: typeof Clock;
      tone: "default" | "warning";
      primary: { label: string; href: string; params: { id: string } };
    }
  | {
      kind: "expiry";
      title: string;
      subtitle: string;
      icon: typeof AlertTriangle;
      tone: "warning";
      primary: { label: string; href: string; params: { id: string } };
    }
  | {
      kind: "profile";
      title: string;
      subtitle: string;
      icon: typeof FolderLock;
      tone: "default";
      primary: { label: string; href: string };
    }
  | {
      kind: "calendar";
      title: string;
      subtitle: string;
      icon: typeof Calendar;
      tone: "default";
      primary: { label: string; href: string; params: { id: string } };
    }
  | {
      kind: "welcome";
      title: string;
      subtitle: string;
      icon: typeof Sparkles;
      tone: "default";
      primary: { label: string; onClick: () => void };
    };

export function CivicHero() {
  const tasks = useTasks((s) => s.tasks);
  const expiring = useExpiringDocuments(60);
  const profileCompleteness = useProfileCompleteness();
  const openChat = useChatUi((s) => s.openChat);

  const state = useMemo<HeroState>(() => {
    // 1. Active task in progress
    const activeTask = tasks.find((t) => t.currentStep < t.totalSteps);
    if (activeTask) {
      return {
        kind: "task",
        title: `Continuă: ${activeTask.title}`,
        subtitle: `Ești la pasul ${activeTask.currentStep} din ${activeTask.totalSteps}. Mai ai puțin.`,
        icon: Clock,
        tone: "default",
        primary: {
          label: "Continuă procedura",
          href: "/workflow/$id",
          params: { id: activeTask.workflowId },
        },
      };
    }

    // 2. Document expiring soon
    const firstExpiring = expiring[0];
    if (firstExpiring) {
      const wfId = RENEWAL_WORKFLOW_FOR_DOC[firstExpiring.type];
      const daysText =
        firstExpiring.daysLeft <= 0
          ? "a expirat"
          : firstExpiring.daysLeft === 1
            ? "expiră mâine"
            : `expiră în ${firstExpiring.daysLeft} zile`;
      if (wfId) {
        return {
          kind: "expiry",
          title: `${firstExpiring.label} ${daysText}`,
          subtitle: `Pornește din timp procedura de reînnoire ca să eviți cozile la ghișeu.`,
          icon: AlertTriangle,
          tone: "warning",
          primary: { label: "Pornește reînnoirea", href: "/workflow/$id", params: { id: wfId } },
        };
      }
    }

    // 3. Incomplete profile (<50% fields filled)
    if (profileCompleteness < 0.5) {
      return {
        kind: "profile",
        title: "Completează seiful pentru autofill instant",
        subtitle:
          "Adaugă numele, CNP-ul și adresa în Seif — apoi orice formular se completează cu un click.",
        icon: FolderLock,
        tone: "default",
        primary: { label: "Deschide seiful", href: "/vault" },
      };
    }

    // 4. Tax season — Apr/May → ANAF Declarație Unică
    const month = new Date().getMonth(); // 0-indexed
    if (month === 3 || month === 4) {
      return {
        kind: "calendar",
        title: "Termen apropiat: Declarația Unică ANAF",
        subtitle:
          "Depunerea se face online prin SPV ANAF până pe 25 mai. Ghidul te conduce pas cu pas.",
        icon: Calendar,
        tone: "default",
        primary: {
          label: "Vezi ghidul ANAF",
          href: "/workflow/$id",
          params: { id: "anaf-declaration" },
        },
      };
    }

    // 5. Fallback welcome
    return {
      kind: "welcome",
      title: "Bine ai venit la ActeAI",
      subtitle:
        "Întreabă-mă orice despre birocrația din România — de la PFA până la pașaport, te ghidez pas cu pas.",
      icon: Sparkles,
      tone: "default",
      primary: {
        label: "Întreabă agentul",
        onClick: () => openChat(),
      },
    };
  }, [tasks, expiring, profileCompleteness, openChat]);

  const Icon = state.icon;
  const isWarning = state.tone === "warning";

  return (
    <Card
      role="region"
      aria-label="Următorul tău pas civic"
      className={cn(
        "relative overflow-hidden p-5 mb-5 shadow-card animate-[fade-in_0.35s_ease-out]",
        isWarning
          ? "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/30"
          : "bg-gradient-to-br from-primary/5 to-accent/40",
      )}
    >
      {/* Tricolor stripe on left edge */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-tricolor" aria-hidden />

      <div className="flex items-start gap-4 pl-2">
        <div
          className={cn(
            "size-11 rounded-xl flex items-center justify-center shrink-0",
            isWarning ? "bg-warning/15" : "bg-primary/10",
          )}
        >
          <Icon className={cn("size-5", isWarning ? "text-warning" : "text-primary")} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">
            Următorul tău pas
          </div>
          <h2 className="text-base font-semibold tracking-tight leading-snug mb-1.5">
            {state.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{state.subtitle}</p>
          <div className="flex flex-wrap items-center gap-3">
            {state.kind === "welcome" ? (
              <Button onClick={state.primary.onClick} size="sm">
                {state.primary.label}
                <ArrowRight className="size-4" />
              </Button>
            ) : "params" in state.primary ? (
              <Button asChild size="sm">
                <Link to={state.primary.href} params={state.primary.params}>
                  {state.primary.label}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to={state.primary.href}>
                  {state.primary.label}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            )}
            <button
              type="button"
              onClick={() => openChat()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
            >
              Vezi alte opțiuni →
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
