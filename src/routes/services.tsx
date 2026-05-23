import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Baby,
  Briefcase,
  Car,
  Clock,
  Home,
  IdCard,
  Receipt,
  ScrollText,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { govApi, type Workflow, type WorkflowCategory } from "@/services/govApiMock";
import { PageHeader } from "@/components/dashboard/page-header";

export const Route = createFileRoute("/services")({ component: ServicesPage });

const CATEGORY_META: Record<WorkflowCategory, { label: string; icon: LucideIcon }> = {
  auto: { label: "Auto", icon: Car },
  id: { label: "Acte de identitate", icon: IdCard },
  fiscal: { label: "Fiscal", icon: Receipt },
  civil: { label: "Civil", icon: ScrollText },
  family: { label: "Familie", icon: Baby },
  property: { label: "Proprietate", icon: Home },
  business: { label: "Antreprenoriat", icon: Briefcase },
};

const CATEGORY_ORDER: WorkflowCategory[] = [
  "auto",
  "id",
  "family",
  "property",
  "business",
  "fiscal",
  "civil",
];

function ServicesPage() {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [filter, setFilter] = useState<WorkflowCategory | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    govApi.listWorkflows().then(setWorkflows);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workflows.filter((w) => {
      if (filter !== "all" && w.category !== filter) return false;
      if (!q) return true;
      return (
        w.title.toLowerCase().includes(q) || w.summary.toLowerCase().includes(q) || w.id.includes(q)
      );
    });
  }, [workflows, filter, query]);

  const grouped = useMemo(() => {
    const map = new Map<WorkflowCategory, Workflow[]>();
    for (const w of filtered) {
      const arr = map.get(w.category) ?? [];
      arr.push(w);
      map.set(w.category, arr);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      items: map.get(c)!,
    }));
  }, [filtered]);

  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<WorkflowCategory, number>();
    for (const w of workflows) counts.set(w.category, (counts.get(w.category) ?? 0) + 1);
    return CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => ({
      category: c,
      count: counts.get(c)!,
    }));
  }, [workflows]);

  const openWorkflow = (id: string) => {
    navigate({ to: "/workflow/$id", params: { id } });
  };

  return (
    <AppShell>
      <PageHeader
        title="Servicii"
        description="Toate procedurile disponibile, organizate pe categorii."
      />

      <div className="mt-5 w-full space-y-5">
        <Card className="border-border/80 p-4 shadow-none">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută o procedură..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <CategoryChip
              active={filter === "all"}
              onClick={() => setFilter("all")}
              label={`Toate (${workflows.length})`}
            />
            {categoriesWithCounts.map(({ category, count }) => {
              const meta = CATEGORY_META[category];
              const Icon = meta.icon;
              return (
                <CategoryChip
                  key={category}
                  active={filter === category}
                  onClick={() => setFilter(category)}
                  label={`${meta.label} (${count})`}
                  icon={Icon}
                />
              );
            })}
          </div>
        </Card>

        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Niciun rezultat pentru „{query}”.
          </div>
        ) : null}
        {grouped.map((group) => {
          const meta = CATEGORY_META[group.category];
          const Icon = meta.icon;
          return (
            <section key={group.category}>
              <div className="mb-2 flex items-center gap-2">
                <Icon className="size-3.5 text-muted-foreground" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {meta.label}
                </h3>
              </div>
              <div className="space-y-2">
                {group.items.map((wf) => (
                  <WorkflowRow key={wf.id} workflow={wf} onClick={() => openWorkflow(wf.id)} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {label}
    </button>
  );
}

function WorkflowRow({ workflow, onClick }: { workflow: Workflow; onClick: () => void }) {
  const meta = CATEGORY_META[workflow.category];
  const Icon = meta.icon;
  const hours = workflow.totalMinutes >= 60 ? Math.round(workflow.totalMinutes / 60) : null;
  const timeLabel = hours ? `~${hours} h` : `~${workflow.totalMinutes} min`;
  return (
    <Card
      onClick={onClick}
      className="cursor-pointer border-border/80 p-3.5 shadow-none transition-colors hover:bg-muted/30"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 text-sm font-semibold tracking-tight">{workflow.title}</div>
          <p className="mb-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {workflow.summary}
          </p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {timeLabel}
            </span>
            <span>·</span>
            <span>{workflow.steps.length} pași</span>
            {workflow.dataSource ? (
              <>
                <span>·</span>
                <span
                  className="inline-flex items-center gap-1"
                  title={`Verificat la ${workflow.dataSource.authority}`}
                >
                  <ShieldCheck className="size-3 text-success" aria-hidden />
                  {workflow.dataSource.authority}
                </span>
              </>
            ) : null}
          </div>
        </div>
        <ArrowRight className="size-4 shrink-0 self-center text-muted-foreground" />
      </div>
    </Card>
  );
}
