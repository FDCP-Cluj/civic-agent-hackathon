import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ChevronRight, Inbox, ListChecks, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useTasks } from "@/store";
import type { ActiveTask } from "@/store";
import { EmptyState } from "@/components/empty-state";
import { govApi, type Workflow } from "@/services/govApiMock";
import { PageHeader } from "@/components/dashboard/page-header";

export const Route = createFileRoute("/tasks")({ component: Tasks });

function Tasks() {
  const tasks = useTasks((s) => s.tasks);
  const remove = useTasks((s) => s.remove);
  const toggleStep = useTasks((s) => s.toggleStep);

  // Pull each task's workflow definition once so we can render the step
  // titles next to checkboxes. govApi is in-memory, so this is cheap.
  const [workflows, setWorkflows] = useState<Record<string, Workflow>>({});
  useEffect(() => {
    let cancelled = false;
    Promise.all(tasks.map((t) => govApi.getWorkflow(t.workflowId))).then((results) => {
      if (cancelled) return;
      const map: Record<string, Workflow> = {};
      results.forEach((w, idx) => {
        if (w) map[tasks[idx].workflowId] = w;
      });
      setWorkflows(map);
    });
    return () => {
      cancelled = true;
    };
  }, [tasks]);

  return (
    <AppShell>
      <PageHeader
        title="Sarcini active"
        description="Toate procedurile pe care le ai în desfășurare. Marchează pașii direct de aici sau deschide ghidul complet."
      >
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <ListChecks className="size-4 text-primary" />
          Workflow tracker
        </div>
      </PageHeader>

      <div className="mt-5">
        {tasks.length === 0 ? (
          <EmptyState
            icon={Inbox}
            tone="primary"
            title="Nicio sarcină activă"
            description="Cere agentului Civis să te ghideze printr-o procedură — îți construiește pașii instant."
            action={
              <Button asChild>
                <Link to="/">Pornește prima procedură</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {tasks.map((t, i) => (
              <TaskCard
                key={t.id}
                task={t}
                workflow={workflows[t.workflowId]}
                animationDelay={`${i * 60}ms`}
                onRemove={() => remove(t.id)}
                onToggleStep={(stepOrder) => toggleStep(t.id, stepOrder)}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function TaskCard({
  task,
  workflow,
  animationDelay,
  onRemove,
  onToggleStep,
}: {
  task: ActiveTask;
  workflow: Workflow | undefined;
  animationDelay: string;
  onRemove: () => void;
  onToggleStep: (stepOrder: number) => void;
}) {
  const completed = new Set(task.completedSteps ?? []);
  const done = task.progress >= 100;

  return (
    <Card
      className={`p-4 animate-[fade-in_0.3s_ease-out] ${
        done ? "border-success/30 bg-success/5" : ""
      }`}
      style={{ animationDelay, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium break-words">{task.title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Pornit pe {new Date(task.startedAt).toLocaleDateString("ro-RO")}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onRemove}
          aria-label={`Șterge sarcina ${task.title}`}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <Progress value={task.progress} className="flex-1 h-2" />
        <span className="text-xs tabular-nums text-muted-foreground">
          {completed.size}/{task.totalSteps}
        </span>
      </div>

      {workflow && (
        <ul className="space-y-1.5 mt-3 mb-3">
          {workflow.steps.map((s) => {
            const isDone = completed.has(s.order);
            return (
              <li key={s.order}>
                <button
                  type="button"
                  onClick={() => onToggleStep(s.order)}
                  aria-pressed={isDone}
                  className="w-full text-left rounded-md px-2 py-1.5 -mx-2 hover:bg-accent/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-start gap-2"
                >
                  {isDone ? (
                    <CheckCircle2 className="size-4 text-success shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-xs leading-snug break-words ${
                      isDone ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    <span className="font-mono tabular-nums text-[10px] text-muted-foreground mr-1.5">
                      {s.order}.
                    </span>
                    {s.title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Button asChild size="sm" variant="outline" className="w-full">
        <Link to="/workflow/$id" params={{ id: task.workflowId }}>
          Deschide ghidul complet
          <ChevronRight className="size-4" />
        </Link>
      </Button>
    </Card>
  );
}
