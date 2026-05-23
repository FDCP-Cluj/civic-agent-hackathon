import { ExternalLink, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SubmissionInfo } from "@/services/forms/types";

type Props = {
  submission: SubmissionInfo;
  compact?: boolean;
};

export function SubmissionStrip({ submission, compact }: Props) {
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-border/80 bg-muted/30 px-3 py-2"
          : "rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-3"
      }
    >
      <div className="flex items-center gap-2 text-xs font-medium text-foreground mb-1.5">
        <MapPin className="size-3.5 text-primary shrink-0" />
        Unde se depune: {submission.institution}
      </div>
      <div className="flex flex-wrap gap-2">
        {submission.channels.map((ch) => (
          <a
            key={ch.url}
            href={ch.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {ch.label}
            <ExternalLink className="size-3" />
          </a>
        ))}
      </div>
      {!compact && submission.channels.some((c) => c.requires?.length) && (
        <div className="flex flex-wrap gap-1 mt-2">
          {submission.channels
            .flatMap((c) => c.requires ?? [])
            .map((req) => (
              <Badge key={req} variant="secondary" className="text-[10px] font-normal">
                {req.replace(/_/g, " ")}
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}
