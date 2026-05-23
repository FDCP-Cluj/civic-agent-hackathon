import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: "default" | "primary" | "muted";
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "default",
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-border/80 bg-card px-6 py-10 text-center shadow-none",
        className,
      )}
    >
      <div
        className={cn(
          "mb-4 flex size-14 items-center justify-center rounded-xl",
          tone === "primary" ? "bg-primary/10" : "bg-accent/50",
        )}
      >
        <Icon className="size-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold tracking-tight mb-1.5">{title}</h3>
      <p className="mb-5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
