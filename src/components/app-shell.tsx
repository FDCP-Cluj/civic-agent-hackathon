import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  FolderLock,
  ListChecks,
  Settings,
  ShieldCheck,
  Sparkles,
  Accessibility,
} from "lucide-react";
import { useState } from "react";
import { useChatUi } from "@/store";
import { cn } from "@/lib/utils";
import { CivisChat } from "@/components/civis-chat";
import { AccessibilityClassSync, AccessibilityMenu } from "@/components/accessibility-menu";
import { isApiKeyConfigured } from "@/services/geminiChat";

const NAV = [
  { to: "/", label: "Acasă", icon: Home },
  { to: "/vault", label: "Seif", icon: FolderLock },
  { to: "/tasks", label: "Sarcini", icon: ListChecks },
  { to: "/settings", label: "Setări", icon: Settings },
] as const;

type AppShellProps = {
  children: React.ReactNode;
  /** Show the bottom pilot footer (currently only on the dashboard). */
  showOfficialFooter?: boolean;
};

export function AppShell({ children, showOfficialFooter = false }: AppShellProps) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const openChat = useChatUi((s) => s.openChat);
  const chatOpen = useChatUi((s) => s.open);
  const aiEnabled = isApiKeyConfigured();
  const [a11yOpen, setA11yOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Keeps senior-mode / high-contrast / dyslexic-font classes in sync with the store */}
      <AccessibilityClassSync />

      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/75 border-b border-border/60">
        <div className="mx-auto max-w-2xl flex items-center justify-between px-4 h-14">
          <Link
            to="/"
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <div className="size-8 rounded-xl bg-gradient-hero flex items-center justify-center shadow-soft">
              <ShieldCheck className="size-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Civis</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Agent civic AI
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setA11yOpen(true)}
              aria-label="Setări de accesibilitate"
              className="inline-flex items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
            >
              <Accessibility className="size-4" aria-hidden />
            </button>
            <div className="h-1.5 w-12 rounded-full bg-tricolor opacity-80" aria-hidden />
          </div>
        </div>
      </header>

      {/* Content — pb leaves room for bottom nav (~72px) + safe-area; extra room when pilot footer is visible */}
      <main
        className={cn(
          "flex-1 mx-auto w-full max-w-2xl px-4 pt-4 animate-[fade-in_0.3s_ease-out]",
          showOfficialFooter
            ? "pb-[calc(7.5rem+env(safe-area-inset-bottom))]"
            : "pb-[calc(6rem+env(safe-area-inset-bottom))]",
        )}
      >
        {children}
      </main>

      {/* Floating "Ask Civis" button — available on every authed page when AI is enabled */}
      {aiEnabled && !chatOpen && (
        <button
          onClick={() => openChat()}
          aria-label="Întreabă agentul Civis"
          className="group fixed right-4 z-40 size-14 rounded-full bg-gradient-hero text-primary-foreground shadow-card flex items-center justify-center hover:scale-105 active:scale-95 transition-transform animate-[fade-in_0.4s_ease-out]"
          style={{ bottom: "calc(5.5rem + env(safe-area-inset-bottom))" }}
        >
          <span
            className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-40 group-hover:opacity-0 transition-opacity"
            aria-hidden
          />
          <Sparkles className="size-6 relative" />
        </button>
      )}

      {/* Bottom nav — glassmorphism */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 border-t border-border/60 bg-card/70 backdrop-blur-xl supports-[backdrop-filter]:bg-card/60"
        style={{ boxShadow: "0 -8px 24px -12px oklch(0 0 0 / 0.08)" }}
      >
        <div className="mx-auto max-w-2xl grid grid-cols-4">
          {NAV.map((item) => {
            const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" />}
                <Icon
                  className={cn("size-5 transition-transform", active && "stroke-[2.4] scale-110")}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />
      </nav>

      {/* Global chat drawer — mounted once, opens from anywhere via useChatUi() */}
      <CivisChat />

      {/* Global accessibility menu — opens from the header A button */}
      <AccessibilityMenu open={a11yOpen} onOpenChange={setA11yOpen} />

      {/* Official pilot footer — rendered only on pages that opt in */}
      {showOfficialFooter && (
        <div
          role="contentinfo"
          aria-label="Informații pilot Civis"
          className="fixed left-0 right-0 z-20 px-4 pointer-events-none"
          style={{ bottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-2xl text-center text-[10px] text-muted-foreground leading-relaxed pointer-events-auto">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/85 backdrop-blur border border-border/60">
              <ShieldCheck className="size-3 text-success" aria-hidden />
              Pilot Civis · Inițiativă civică independentă · GDPR · Hostat în România · v0.4.0
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
