import { useEffect, useState } from "react";
import { ExternalLink, Activity, RefreshCw } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ServiceHealth, ServiceStatus } from "@/services/govApiMock";
import { probeServiceHealth } from "@/services/serviceHealth";

const STATUS_META: Record<
  ServiceStatus,
  { label: string; dotClass: string; ringClass: string; chipClass: string }
> = {
  operational: {
    label: "Operațional",
    dotClass: "bg-success",
    ringClass: "ring-success/30",
    chipClass: "border-success/20 bg-success/5",
  },
  degraded: {
    label: "Funcționare degradată",
    dotClass: "bg-warning",
    ringClass: "ring-warning/30",
    chipClass: "border-warning/30 bg-warning/5",
  },
  outage: {
    label: "Întrerupere",
    dotClass: "bg-destructive",
    ringClass: "ring-destructive/30",
    chipClass: "border-destructive/30 bg-destructive/5",
  },
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "acum câteva secunde";
  if (min === 1) return "acum 1 minut";
  if (min < 60) return `acum ${min} minute`;
  const hours = Math.floor(min / 60);
  if (hours === 1) return "acum 1 oră";
  if (hours < 24) return `acum ${hours} ore`;
  return new Date(iso).toLocaleString("ro-RO");
}

export function ServiceHealthStrip() {
  const [items, setItems] = useState<ServiceHealth[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    const next = await probeServiceHealth();
    setItems(next);
    setRefreshing(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <section
      role="region"
      aria-label="Starea serviciilor publice"
      className="mt-4 animate-[fade-in_0.3s_ease-out]"
    >
      <div className="flex items-center gap-2 mb-2">
        <Activity className="size-3.5 text-muted-foreground" aria-hidden />
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Starea serviciilor publice
        </h3>
        <span className="text-[10px] text-muted-foreground/70">· verificare live</span>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          aria-label="Reverifică starea portalurilor"
          className="ml-auto inline-flex items-center justify-center size-6 rounded text-muted-foreground hover:text-foreground hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <RefreshCw className={cn("size-3", refreshing && "animate-spin")} aria-hidden />
        </button>
      </div>

      <div className="-mx-4 overflow-x-auto">
        <div className="flex gap-2 px-4 pb-1 min-w-max">
          {items === null
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-36 rounded-full" />
              ))
            : items.map((s) => <ServiceChip key={s.service} health={s} />)}
        </div>
      </div>
    </section>
  );
}

function ServiceChip({ health }: { health: ServiceHealth }) {
  const meta = STATUS_META[health.status];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${health.service}: ${meta.label}. Apasă pentru detalii.`}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap min-h-[36px]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "hover:bg-accent/40 transition-colors",
            meta.chipClass,
          )}
        >
          <span className="relative flex size-2">
            <span
              className={cn("absolute inset-0 rounded-full opacity-60 animate-ping", meta.dotClass)}
              aria-hidden
            />
            <span className={cn("relative size-2 rounded-full", meta.dotClass)} aria-hidden />
          </span>
          <span>{health.service}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 text-sm" align="start">
        <div className="flex items-center gap-2 mb-2">
          <span className={cn("size-2 rounded-full", meta.dotClass)} aria-hidden />
          <span className="font-semibold">{health.service}</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
            {meta.label}
          </span>
        </div>
        {health.note && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{health.note}</p>
        )}
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border pt-2">
          <span className="font-mono">verificat {formatRelative(health.lastChecked)}</span>
          <a
            href={health.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
          >
            Site oficial <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      </PopoverContent>
    </Popover>
  );
}
