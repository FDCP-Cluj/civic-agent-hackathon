import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  FolderLock,
  ListChecks,
  ScanLine,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Acasă", icon: Home },
  { to: "/vault", label: "Seif", icon: FolderLock },
  { to: "/tasks", label: "Sarcini", icon: ListChecks },
  { to: "/scan", label: "Scanare", icon: ScanLine },
  { to: "/settings", label: "Setări", icon: Settings },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4">
      <div className="mb-5 rounded-xl border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-gradient-hero flex items-center justify-center shadow-soft">
            <ShieldCheck className="size-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">Civis</div>
            <div className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/70">
              Agent civic AI
            </div>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1" aria-label="Navigare principală">
        {NAV_ITEMS.map((item) => {
          const active =
            item.to === "/"
              ? path === "/" || path.startsWith("/workflow/")
              : path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl border border-sidebar-border/70 bg-sidebar-accent/35 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-sidebar-foreground">
          <Sparkles className="size-4 text-primary" />
          Obiectiv nou
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/75">
          Folosește chatul Civis pentru a porni rapid o procedură.
        </p>
      </div>
    </aside>
  );
}
