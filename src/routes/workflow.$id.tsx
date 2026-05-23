import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Circle,
  Clock,
  Coins,
  Download,
  ExternalLink,
  FileText,
  Info,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { govApi, type Workflow, type WorkflowStep } from "@/services/govApiMock";
import { useTasks } from "@/store";
import { toast } from "sonner";
import { MagicAutofillButton } from "@/components/magic-autofill-button";
import { StepActionButton } from "@/components/workflow/step-action-button";
import { PageHeader } from "@/components/dashboard/page-header";

export const Route = createFileRoute("/workflow/$id")({ component: WorkflowPage });

function WorkflowPage() {
  const { id } = Route.useParams();
  const [wf, setWf] = useState<Workflow | null>(null);
  const tasks = useTasks((s) => s.tasks);
  const startTask = useTasks((s) => s.startTask);
  const toggleStep = useTasks((s) => s.toggleStep);
  const existing = tasks.find((t) => t.workflowId === id);
  const completedSet = new Set(existing?.completedSteps ?? []);

  useEffect(() => {
    govApi.getWorkflow(id).then((w) => setWf(w ?? null));
  }, [id]);

  if (!wf) {
    return (
      <AppShell>
        <div className="py-20 text-center text-sm text-muted-foreground">Se încarcă…</div>
      </AppShell>
    );
  }

  const ensureTask = () => {
    if (existing) return existing;
    const fresh = {
      id: wf.id,
      workflowId: wf.id,
      title: wf.title,
      progress: 0,
      currentStep: 1,
      totalSteps: wf.steps.length,
      startedAt: new Date().toISOString(),
      completedSteps: [],
    };
    startTask(fresh);
    toast.success("Procedură pornită.", { description: "O găsești în „Sarcini”." });
    return fresh;
  };

  const handleToggleStep = (stepOrder: number) => {
    const task = ensureTask();
    toggleStep(task.id, stepOrder);
  };

  const downloadChecklist = () => {
    const lines = [
      `CIVIS — ${wf.title}`,
      `Generat: ${new Date().toLocaleString("ro-RO")}`,
      `Total estimat: ${wf.totalMinutes} min`,
      "",
      ...wf.steps.flatMap((s) => [
        `─────────────────────────────`,
        `PAS ${s.order}: ${s.title}`,
        `Instituție: ${s.institution}`,
        `Locație: ${s.location}`,
        `Timp: ~${s.estimatedMinutes} min${s.fee ? ` · Taxă: ${s.fee}` : ""}`,
        `Documente:`,
        ...s.documents.map((d) => `  [ ] ${d}`),
        ...(s.info && s.info.length ? ["Detalii:", ...s.info.map((b) => `  • ${b}`)] : []),
        "",
      ]),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `civis-${wf.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Checklist descărcat — funcționează și fără internet.");
  };

  const completionPct = existing?.progress ?? 0;
  const completedCount = existing?.completedSteps?.length ?? 0;

  return (
    <AppShell>
      <PageHeader title={wf.title} description={wf.summary}>
        <Button asChild variant="outline" size="sm">
          <Link to="/">
            <ArrowLeft className="size-4" />
            Înapoi
          </Link>
        </Button>
      </PageHeader>

      {/* Hero */}
      <Card className="mb-5 mt-4 border-border/80 p-5 shadow-none">
        <div className="flex flex-wrap gap-2 mt-4">
          <Badge variant="secondary" className="gap-1">
            <Clock className="size-3" /> ~{Math.round(wf.totalMinutes / 60)} h total
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Building2 className="size-3" /> {wf.steps.length} pași
          </Badge>
          {existing && (
            <Badge variant="default" className="gap-1">
              {completedCount}/{wf.steps.length} finalizate
            </Badge>
          )}
        </div>

        {existing && (
          <div className="mt-4">
            <Progress value={completionPct} className="h-2" />
            <div className="mt-1.5 flex items-center justify-between text-sm text-muted-foreground">
              <span>Progres</span>
              <span className="font-mono tabular-nums">{completionPct}%</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          {existing ? (
            <Button asChild variant="outline" className="flex-1">
              <Link to="/tasks">Vezi în „Sarcini”</Link>
            </Button>
          ) : (
            <Button onClick={ensureTask} className="flex-1">
              Pornește procedura
            </Button>
          )}
          <Button variant="outline" onClick={downloadChecklist} className="sm:w-auto">
            <Download className="size-4" /> Checklist offline
          </Button>
        </div>

        {wf.id === "pfa-registration" && (
          <div className="mt-2">
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link to="/workflow/$id/pfa" params={{ id: wf.id } as never}>
                Wizard PFA dedicat
              </Link>
            </Button>
          </div>
        )}
        {wf.id === "property-sale" && (
          <div className="mt-2">
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link to="/workflow/$id/antecontract" params={{ id: wf.id } as never}>
                Formular antecontract
              </Link>
            </Button>
          </div>
        )}

        {wf.dataSource && (
          <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <ShieldCheck className="size-3 text-success shrink-0" aria-hidden />
            <span>
              Verificat la sursa oficială{" "}
              <strong className="font-semibold text-foreground">{wf.dataSource.authority}</strong>
              {" · "}actualizat {new Date(wf.dataSource.verifiedAt).toLocaleDateString("ro-RO")}
            </span>
            <a
              href={wf.dataSource.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
            >
              Sursă <ExternalLink className="size-3" aria-hidden />
            </a>
          </div>
        )}
      </Card>

      {/* Steps */}
      <div className="relative">
        <div className="absolute left-3 top-4 bottom-4 w-px bg-border" aria-hidden />
        <div className="space-y-3">
          {wf.steps.map((s) => (
            <StepCard
              key={s.order}
              workflowId={wf.id}
              step={s}
              completed={completedSet.has(s.order)}
              onToggleComplete={() => handleToggleStep(s.order)}
            />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function StepCard({
  workflowId,
  step,
  completed,
  onToggleComplete,
}: {
  workflowId: string;
  step: WorkflowStep;
  completed: boolean;
  onToggleComplete: () => void;
}) {
  const modeLabel =
    step.mode === "online"
      ? "online"
      : step.mode === "in_person"
        ? "la ghișeu"
        : step.mode === "hybrid"
          ? "hibrid"
          : null;

  return (
    <Card
      className={`relative border-border/80 p-4 shadow-none transition-colors ${
        completed ? "border-success/30 bg-success/5" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggleComplete}
          aria-label={
            completed
              ? `Marchează pasul ${step.order} ca neterminat`
              : `Marchează pasul ${step.order} ca finalizat`
          }
          aria-pressed={completed}
          className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        >
          {completed ? (
            <CheckCircle2 className="size-6 text-success bg-card rounded-full" />
          ) : (
            <div className="flex size-6 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
              {step.order}
            </div>
          )}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
            <div
              className={`text-sm font-semibold break-words ${
                completed ? "line-through text-muted-foreground" : ""
              }`}
            >
              {step.title}
            </div>
            <Badge variant="outline" className="text-xs uppercase tracking-wider shrink-0">
              {step.institution}
            </Badge>
            {modeLabel && (
              <Badge variant="secondary" className="text-xs uppercase tracking-wider shrink-0">
                {modeLabel}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground break-words">{step.description}</p>

          <div className="mt-3 space-y-2 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className="rounded-md border border-border/70 bg-background/40 px-2 py-1.5">
                <span className="text-muted-foreground">Unde:</span> {step.location}
              </div>
              <div className="rounded-md border border-border/70 bg-background/40 px-2 py-1.5">
                <span className="text-muted-foreground">Durată:</span> ~{step.estimatedMinutes} min
              </div>
              <div className="rounded-md border border-border/70 bg-background/40 px-2 py-1.5">
                <span className="text-muted-foreground">Cost:</span> {step.fee ?? "Variabil"}
              </div>
            </div>
            <a
              href={step.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-primary hover:underline break-words"
            >
              <MapPin className="size-3.5 shrink-0" />
              <span className="break-words">{step.location}</span>
              <ExternalLink className="size-3 shrink-0" />
            </a>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" /> ~{step.estimatedMinutes} min
              </span>
              {step.fee && (
                <span className="inline-flex items-center gap-1">
                  <Coins className="size-3.5" /> {step.fee}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-muted/60 p-3">
            <div className="text-sm uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
              <FileText className="size-3" /> Documente necesare
            </div>
            <ul className="space-y-1">
              {step.documents.map((d) => (
                <li key={d} className="text-sm flex items-center gap-2 break-words">
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  <span className="min-w-0 break-words">{d}</span>
                </li>
              ))}
            </ul>
          </div>

          {step.info && step.info.length > 0 && (
            <Accordion type="single" collapsible className="mt-3">
              <AccordionItem value="info" className="border-border rounded-lg border bg-card/60">
                <AccordionTrigger className="px-3 py-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
                  <span className="inline-flex items-center gap-1.5">
                    <Info className="size-3" /> Ce e bine să știi ({step.info.length})
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <ul className="space-y-1.5">
                    {step.info.map((b, idx) => (
                      <li key={idx} className="text-sm flex items-center gap-2 leading-relaxed">
                        <span className="size-1 rounded-full bg-primary/60 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {step.actions && step.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {step.actions.map((action, idx) => (
                <StepActionButton
                  key={idx}
                  action={action}
                  workflowId={workflowId}
                  stepKey={step.key}
                  stepTitle={step.title}
                  stepInfo={step.info}
                />
              ))}
            </div>
          )}

          {!completed && step.order === 1 && (
            <div className="mt-3">
              <MagicAutofillButton />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
