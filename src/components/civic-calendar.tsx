import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ArrowRight, ExternalLink } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { govApi, type CivicCalendarEntry } from "@/services/govApiMock";

function formatRoDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function relativeRo(days: number): string {
  if (days < 0) return "expirat";
  if (days === 0) return "astăzi";
  if (days === 1) return "mâine";
  if (days < 30) return `în ${days} zile`;
  const months = Math.round(days / 30);
  if (months === 1) return "într-o lună";
  return `în ${months} luni`;
}

export function CivicCalendar() {
  const [entries, setEntries] = useState<CivicCalendarEntry[] | null>(null);

  useEffect(() => {
    govApi.getUpcomingDeadlines(3).then(setEntries);
  }, []);

  return (
    <section
      role="region"
      aria-label="Calendar civic"
      className="mt-6 animate-[fade-in_0.3s_ease-out]"
    >
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Calendar civic
        </h2>
      </div>

      <div className="-mx-4 overflow-x-auto">
        <div className="flex gap-3 px-4 pb-1 min-w-max">
          {entries === null
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-64 rounded-2xl" />
              ))
            : entries.map((e) => <CalendarCard key={e.id} entry={e} />)}
        </div>
      </div>
    </section>
  );
}

function CalendarCard({ entry }: { entry: CivicCalendarEntry }) {
  const days = daysUntil(entry.deadline);
  const urgent = days <= 14;

  return (
    <Card
      className={cn(
        "w-64 shrink-0 p-4 transition-all hover:shadow-card",
        urgent ? "border-warning/40 bg-gradient-to-br from-warning/5 to-warning/0" : "",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <Badge
          variant={urgent ? "destructive" : "secondary"}
          className="text-[10px] uppercase tracking-wider"
        >
          {relativeRo(days)}
        </Badge>
        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
          {entry.institution}
        </span>
      </div>
      <h3 className="text-sm font-semibold leading-snug mb-1.5 line-clamp-2">{entry.title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">
        {entry.description}
      </p>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
        <span className="font-mono tabular-nums">{formatRoDate(entry.deadline)}</span>
      </div>
      <div className="flex items-center gap-2">
        {entry.relatedWorkflowId ? (
          <Link
            to="/workflow/$id"
            params={{ id: entry.relatedWorkflowId }}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
          >
            Pornește <ArrowRight className="size-3" aria-hidden />
          </Link>
        ) : (
          <a
            href={entry.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
          >
            Detalii <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </div>
    </Card>
  );
}
