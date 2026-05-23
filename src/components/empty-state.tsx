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
        "rounded-2xl border border-dashed border-border bg-gradient-to-b from-accent/20 to-transparent",
        "px-6 py-10 flex flex-col items-center text-center animate-[fade-in_0.4s_ease-out]",
        className,
      )}
    >
      <div
        className={cn(
          "relative size-16 rounded-2xl flex items-center justify-center mb-4",
          tone === "primary" ? "bg-primary/10" : "bg-accent",
        )}
      >
        <div className="absolute inset-0 rounded-2xl bg-primary/5 animate-ping opacity-50" />
        <Icon className="size-7 text-primary relative" />
      </div>
      <h3 className="text-base font-semibold tracking-tight mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}
