import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ShieldCheck, Sparkles, Accessibility, LogOut } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import { useAuth, useChatUi } from "@/store";
import { cn } from "@/lib/utils";
import { AccessibilityClassSync, AccessibilityMenu } from "@/components/accessibility-menu";
import { isApiKeyConfigured } from "@/services/aiConfig";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

const CivisChat = lazy(() =>
  import("@/components/civis-chat").then((module) => ({ default: module.CivisChat })),
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
        <div className="flex min-h-screen bg-background">
          <div className="hidden md:block">
            <AppSidebar />
          </div>

          <SidebarInset className="flex min-w-0 flex-1 flex-col">
            {/* Mobile header */}
            <header className="flex items-center justify-between border-b border-border/80 bg-card/60 px-4 py-3 backdrop-blur md:hidden">
              <Link to="/" className="inline-flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10">
                  <ShieldCheck className="size-4 text-primary" />
                </div>
                <div className="text-sm font-semibold">Civis</div>
              </Link>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setA11yOpen(true)}
                  aria-label="Setări de accesibilitate"
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                >
                  <Accessibility className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate({ to: "/login" });
                  }}
                  aria-label="Deconectare"
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                >
                  <LogOut className="size-4" />
                </button>
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
            <div className="hidden items-center justify-between border-b border-border/80 px-6 py-3 md:flex">
              <div className="text-sm text-muted-foreground">
                {email ? `Conectat ca ${email}` : "Cont conectat"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setA11yOpen(true)}
                  aria-label="Setări de accesibilitate"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                >
                  <Accessibility className="size-3.5" /> Accesibilitate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate({ to: "/login" });
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                >
                  <LogOut className="size-3.5" />
                  Deconectare
                </button>
              </div>
            </div>

            <main
              className={cn(
                "mx-auto w-full flex-1 overflow-auto p-4 md:max-w-6xl md:p-8 animate-[fade-in_0.3s_ease-out]",
                showOfficialFooter ? "pb-20" : "",
              )}
            >
              {children}
              {showOfficialFooter && (
                <div
                  role="contentinfo"
                  aria-label="Informații pilot Civis"
                  className="mt-6 text-center text-[10px] text-muted-foreground leading-relaxed"
                >
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/85 backdrop-blur border border-border/60">
                    <ShieldCheck className="size-3 text-success" aria-hidden />
                    Pilot Civis · Inițiativă civică independentă · GDPR · Hostat în România · v0.4.0
                  </span>
                </div>
              )}
            </main>
          </SidebarInset>
        </div>
      </SidebarProvider>

      {/* Global chat drawer — mounted once, opens from anywhere via useChatUi() */}
      {aiEnabled && !chatOpen && (
        <button
          onClick={() => openChat()}
          aria-label="Întreabă agentul Civis"
          className="fixed bottom-4 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-none transition-transform hover:scale-105 active:scale-95"
        >
          <Sparkles className="size-6" />
        </button>
      )}
      <Suspense fallback={null}>
        <CivisChat />
      </Suspense>

      {/* Global accessibility menu — opens from the header A button */}
      <AccessibilityMenu open={a11yOpen} onOpenChange={setA11yOpen} />
    </div>
  );
}
