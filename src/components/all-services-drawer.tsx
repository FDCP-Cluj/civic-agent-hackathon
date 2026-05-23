import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Car,
  IdCard,
  Receipt,
  ScrollText,
  Baby,
  Home,
  Briefcase,
  Clock,
  Search,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { govApi, type Workflow, type WorkflowCategory } from "@/services/govApiMock";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CATEGORY_META: Record<WorkflowCategory, { label: string; icon: LucideIcon; tint: string }> = {
  auto: { label: "Auto", icon: Car, tint: "from-blue-500/15 to-blue-500/5" },
  id: { label: "Acte de identitate", icon: IdCard, tint: "from-amber-500/15 to-amber-500/5" },
  fiscal: { label: "Fiscal", icon: Receipt, tint: "from-emerald-500/15 to-emerald-500/5" },
  civil: { label: "Civil", icon: ScrollText, tint: "from-slate-500/15 to-slate-500/5" },
  family: { label: "Familie", icon: Baby, tint: "from-pink-500/15 to-pink-500/5" },
  property: { label: "Proprietate", icon: Home, tint: "from-teal-500/15 to-teal-500/5" },
  business: {
    label: "Antreprenoriat",
    icon: Briefcase,
    tint: "from-violet-500/15 to-violet-500/5",
  },
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

export function AllServicesDrawer({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [filter, setFilter] = useState<WorkflowCategory | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) return;
    govApi.listWorkflows().then(setWorkflows);
  }, [open]);

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

  const openWorkflow = (id: string) => {
    onOpenChange(false);
    navigate({ to: "/workflow/$id", params: { id } });
  };

  const categoriesWithCounts = useMemo(() => {
    const counts = new Map<WorkflowCategory, number>();
    for (const w of workflows) counts.set(w.category, (counts.get(w.category) ?? 0) + 1);
    return CATEGORY_ORDER.filter((c) => counts.has(c)).map((c) => ({
      category: c,
      count: counts.get(c)!,
    }));
  }, [workflows]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[88vh] max-h-[88vh] focus-visible:outline-none">
        <DrawerHeader className="border-b border-border/60 text-left">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-xl bg-accent flex items-center justify-center shrink-0">
              <ScrollText className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-base">Toate procedurile</DrawerTitle>
              <DrawerDescription className="text-xs">
                {workflows.length} ghiduri pas-cu-pas, organizate pe categorii.
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                Închide
              </Button>
            </DrawerClose>
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută o procedură…"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Category chips */}
          <div className="-mx-4 mt-3 overflow-x-auto">
            <div className="flex gap-2 px-4 pb-1 min-w-max">
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
          </div>
        </DrawerHeader>

        <ScrollArea className="flex-1">
          <div className="px-4 py-4 space-y-5 max-w-2xl mx-auto">
            {filtered.length === 0 && (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Niciun rezultat pentru „{query}”.
              </div>
            )}
            {grouped.map((group) => {
              const meta = CATEGORY_META[group.category];
              const Icon = meta.icon;
              return (
                <section key={group.category} className="animate-[fade-in_0.3s_ease-out]">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="size-3.5 text-muted-foreground" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

/* ---------- Subcomponents ---------- */

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
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-accent/40",
      )}
    >
      {Icon && <Icon className="size-3.5" />}
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
      className={cn(
        "p-3.5 cursor-pointer hover:shadow-card hover:border-primary/40 transition-all",
        "bg-gradient-to-br",
        meta.tint,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-card border border-border flex items-center justify-center shrink-0">
          <Icon className="size-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold tracking-tight mb-0.5">{workflow.title}</div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
            {workflow.summary}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" /> {timeLabel}
            </span>
            <span>·</span>
            <span>{workflow.steps.length} pași</span>
            {workflow.dataSource && (
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
            )}
          </div>
        </div>
        <ArrowRight className="size-4 text-muted-foreground self-center shrink-0" />
      </div>
    </Card>
  );
}
