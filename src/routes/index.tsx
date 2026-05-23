import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search,
  Mic,
  Car,
  IdCard,
  Receipt,
  FileText,
  Sparkles,
  ArrowRight,
  Clock,
  ScanLine,
  LayoutGrid,
  MapPin,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth, useChatUi, useTasks, useVault } from "@/store";
import { govApi } from "@/services/govApiMock";
import { isApiKeyConfigured } from "@/services/geminiChat";
import { AllServicesDrawer } from "@/components/all-services-drawer";
import { CivicHero } from "@/components/civic-hero";
import { ServiceHealthStrip } from "@/components/service-health-strip";
import { CivicCalendar } from "@/components/civic-calendar";
import { ProfileCompleteness } from "@/components/profile-completeness";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { toast } from "sonner";

export const Route = createFileRoute("/")({ component: Dashboard });

const QUICK = [
  {
    id: "car-registration-2nd-hand",
    label: "Înmatriculare auto",
    icon: Car,
    tint: "from-blue-500/15 to-blue-500/5",
  },
  {
    id: "renew-driver-license",
    label: "Reînnoire permis",
    icon: IdCard,
    tint: "from-amber-500/15 to-amber-500/5",
  },
  {
    id: "anaf-declaration",
    label: "Declarație ANAF",
    icon: Receipt,
    tint: "from-emerald-500/15 to-emerald-500/5",
  },
];

function Dashboard() {
  const navigate = useNavigate();
  const email = useAuth((s) => s.email);
  const tasks = useTasks((s) => s.tasks);
  const profile = useVault((s) => s.profile);
  const openChat = useChatUi((s) => s.openChat);
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const aiEnabled = isApiKeyConfigured();
  const greet = profile.fullName
    ? profile.fullName.split(" ")[0]
    : (email?.split("@")[0] ?? "prieten");

  // Contextual greeting based on local time of day
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 5
      ? "Noapte bună"
      : hour < 12
        ? "Bună dimineața"
        : hour < 18
          ? "Bună ziua"
          : "Bună seara";

  // Best-effort "localitate" extraction: take the last comma-separated chunk of address
  const localitate = profile.address
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .pop();

  const ask = async (q: string) => {
    if (!q.trim()) return;
    if (aiEnabled) {
      openChat(q);
      return;
    }
    setThinking(true);
    const wf = await govApi.resolveQuery(q);
    setThinking(false);
    if (wf) navigate({ to: "/workflow/$id", params: { id: wf.id } });
  };

  const { isSupported: micSupported, start: micStart } = useSpeechRecognition({
    onResult: (text) => {
      setQuery(text);
      ask(text);
    },
    onError: (msg) => toast.error(msg),
  });

  const mic = () => {
    if (!micSupported) {
      toast("Recunoașterea vocală nu este disponibilă pe acest browser.");
      return;
    }
    micStart();
    toast("Vorbește acum…");
  };

  return (
    <AppShell showOfficialFooter>
      {/* Greeting */}
      <div className="mb-5">
        <p className="text-sm text-muted-foreground">{timeGreeting},</p>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold tracking-tight capitalize">{greet} 👋</h1>
          {localitate && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-full"
              title="Localitate detectată din datele tale din seif"
            >
              <MapPin className="size-3" aria-hidden /> {localitate}
            </span>
          )}
        </div>
      </div>

      {/* Civic hero — context-aware "next step" */}
      <CivicHero />

      {/* AI search */}
      <Card className="p-4 shadow-card border-border bg-gradient-to-br from-card to-accent/30">
        <div className="flex items-center gap-2 mb-3">
          <div className="size-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div className="text-sm font-medium flex-1">Întreabă agentul Civis</div>
          {aiEnabled && (
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-success font-semibold">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 rounded-full bg-success animate-ping opacity-70" />
                <span className="relative inline-flex size-1.5 rounded-full bg-success" />
              </span>
              Online
            </div>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(query);
          }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: vreau să-mi fac PFA sau să-mi schimb buletinul"
            className="w-full h-12 pl-9 pr-20 rounded-xl bg-background border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={mic}
            className="absolute right-12 top-1/2 -translate-y-1/2 size-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground"
            aria-label="Vorbește"
          >
            <Mic className="size-4" />
          </button>
          <button
            type="submit"
            disabled={thinking}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
            aria-label="Caută"
          >
            <ArrowRight className="size-4" />
          </button>
        </form>
        {thinking && (
          <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            Construiesc planul tău…
          </div>
        )}
      </Card>

      {/* Service health strip — real-time state of the public-service network */}
      <ServiceHealthStrip />

      {/* Vault completeness donut — only renders when 0 < pct < 100 */}
      <ProfileCompleteness />

      {/* Quick actions */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Proceduri populare
          </h2>
          <button
            type="button"
            onClick={() => setServicesOpen(true)}
            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
          >
            <LayoutGrid className="size-3" /> Vezi toate
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {QUICK.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.id}
                to="/workflow/$id"
                params={{ id: q.id }}
                className={`group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${q.tint} p-3.5 hover:shadow-card transition-all`}
              >
                <Icon className="size-5 text-primary mb-6" />
                <div className="text-[13px] font-medium leading-tight">{q.label}</div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Civic calendar — upcoming national deadlines */}
      <CivicCalendar />

      {/* Active tasks */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sarcini active
          </h2>
          <Link to="/tasks" className="text-xs text-primary font-medium">
            Vezi toate
          </Link>
        </div>
        {tasks.length === 0 ? (
          <Card className="p-5 text-center border-dashed">
            <Clock className="size-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Nu ai nicio procedură în desfășurare.
            </p>
            <button
              type="button"
              onClick={() => setServicesOpen(true)}
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Răsfoiește toate procedurile <ArrowRight className="size-3" />
            </button>
          </Card>
        ) : (
          <div className="space-y-2">
            {tasks.slice(0, 3).map((t) => (
              <Link key={t.id} to="/workflow/$id" params={{ id: t.workflowId }} className="block">
                <Card className="p-4 hover:shadow-card transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium truncate pr-2">{t.title}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {t.currentStep}/{t.totalSteps}
                    </div>
                  </div>
                  <Progress value={t.progress} className="h-1.5" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Document scanner CTA */}
      <Card className="mt-6 p-4 border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-accent flex items-center justify-center">
            <ScanLine className="size-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium">Nu înțelegi un document?</div>
            <div className="text-xs text-muted-foreground">
              Scanează-l și îți explic în cuvinte simple.
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/scan">
              <FileText className="size-4" />
              Scanează
            </Link>
          </Button>
        </div>
      </Card>

      <AllServicesDrawer open={servicesOpen} onOpenChange={setServicesOpen} />
    </AppShell>
  );
}
