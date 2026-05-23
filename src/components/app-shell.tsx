import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Accessibility, LogOut } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useAuth, useChatUi } from "@/store";
import { cn } from "@/lib/utils";
import { AccessibilityClassSync, AccessibilityMenu } from "@/components/accessibility-menu";
import { isApiKeyConfigured } from "@/services/aiConfig";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const ActeAIChat = lazy(() =>
  import("@/components/civis-chat").then((module) => ({ default: module.ActeAIChat })),
);

type AppShellProps = {
  children: React.ReactNode;
  showOfficialFooter?: boolean;
};

export function AppShell({ children, showOfficialFooter = false }: AppShellProps) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const openChat = useChatUi((s) => s.openChat);
  const chatOpen = useChatUi((s) => s.open);
  const aiEnabled = isApiKeyConfigured();
  const email = useAuth((s) => s.email);
  const logout = useAuth((s) => s.logout);
  const [a11yOpen, setA11yOpen] = useState(false);
  const mobileNav = [
    { to: "/", label: "Acasă" },
    { to: "/services", label: "Servicii" },
    { to: "/vault", label: "Seif" },
    { to: "/tasks", label: "Sarcini" },
    { to: "/scan", label: "Scanare" },
    { to: "/chat", label: "Chat" },
    { to: "/settings", label: "Setări" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      {/* Keeps senior-mode / high-contrast / dyslexic-font classes in sync with the store */}
      <AccessibilityClassSync />

      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full min-w-0 flex-1 bg-background">
          <div className="hidden shrink-0 md:sticky md:top-0 md:block md:h-svh">
            <AppSidebar />
          </div>

          <SidebarInset className="flex min-w-0 flex-1 flex-col">
            {/* Mobile header */}
            <header className="flex items-center justify-between border-b border-border/80 bg-card/60 px-4 py-3 backdrop-blur md:hidden">
              <Link to="/" className="inline-flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
                  <ShieldCheck className="size-4 text-primary" />
                </div>
                <div className="text-sm font-semibold">ActeAI</div>
              </Link>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setA11yOpen(true)}
                  aria-label="Setări de accesibilitate"
                  className="size-8 hover:bg-accent/50"
                >
                  <Accessibility className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    logout();
                    navigate({ to: "/login" });
                  }}
                  aria-label="Deconectare"
                  className="size-8 hover:bg-accent/50"
                >
                  <LogOut className="size-4" />
                </Button>
              </div>
            </header>

            {/* Mobile nav pills */}
            <nav className="flex gap-2 overflow-x-auto border-b border-border/80 px-4 py-2 md:hidden">
              {mobileNav.map((item) => {
                const active =
                  item.to === "/"
                    ? path === "/" || path.startsWith("/workflow/")
                    : path.startsWith(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Desktop top bar */}
            <div className="hidden items-center justify-between border-b border-border/80 bg-sidebar px-6 py-3 md:flex">
              <div className="text-sm text-muted-foreground">
                {email ? `Conectat ca ${email}` : "Cont conectat"}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setA11yOpen(true)}
                  aria-label="Setări de accesibilitate"
                  className="gap-1.5 hover:bg-accent/50"
                >
                  <Accessibility className="size-3.5" /> Accesibilitate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logout();
                    navigate({ to: "/login" });
                  }}
                  className="gap-1.5 hover:bg-accent/50"
                >
                  <LogOut className="size-3.5" />
                  Deconectare
                </Button>
              </div>
            </div>

            <main
              className={cn(
                "w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto animate-[fade-in_0.3s_ease-out]",
                showOfficialFooter ? "pb-20" : "",
              )}
            >
              <div className="mx-auto flex w-full min-w-0 flex-col px-4 py-4 md:px-6 md:py-6 xl:px-8">
                <div className="mx-auto w-full min-w-0">{children}</div>
                {showOfficialFooter && (
                  <div
                    role="contentinfo"
                    aria-label="Informații pilot ActeAI"
                    className="mt-6 text-center text-[10px] leading-relaxed text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/85 px-2.5 py-1 backdrop-blur">
                      <ShieldCheck className="size-3 text-success" aria-hidden />
                      Pilot ActeAI · Inițiativă civică independentă · GDPR · Hostat în România ·
                      v0.4.0
                    </span>
                  </div>
                )}
              </div>
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>

      {/* Global chat drawer — mounted once, opens from anywhere via useChatUi() */}
      {aiEnabled && !chatOpen && (
        <button
          onClick={() => openChat()}
          aria-label="Întreabă agentul ActeAI"
          className="fixed bottom-4 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-none transition-transform hover:scale-105 active:scale-95"
        >
          <Sparkles className="size-6" />
        </button>
      )}
      <Suspense fallback={null}>
        <ActeAIChat />
      </Suspense>

      {/* Global accessibility menu — opens from the header A button */}
      <AccessibilityMenu open={a11yOpen} onOpenChange={setA11yOpen} />
    </div>
  );
}
