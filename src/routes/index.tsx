import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
  MapPin,
  CalendarDays,
  AlertTriangle,
  FolderLock,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  RENEWAL_WORKFLOW_FOR_DOC,
  useAuth,
  useChatUi,
  useExpiringDocuments,
  useProfileCompleteness,
  useTasks,
  useVault,
} from "@/store";
import { govApi } from "@/services/govApiMock";
import { isApiKeyConfigured } from "@/services/geminiChat";
import { isSupabaseConfigured } from "@/services/supabaseClient";
import { AllServicesDrawer } from "@/components/all-services-drawer";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";

export const Route = createFileRoute("/")({ component: Dashboard });

const QUICK = [
  {
    id: "car-registration-2nd-hand",
    label: "Înmatriculare auto",
    icon: Car,
  },
  {
    id: "renew-driver-license",
    label: "Reînnoire permis",
    icon: IdCard,
  },
  {
    id: "anaf-declaration",
    label: "Declarație ANAF",
    icon: Receipt,
  },
];

type DashboardAlert =
  | {
      tone: "warning";
      title: string;
      description: string;
      icon: typeof AlertTriangle;
      action: { label: string; to: "/workflow/$id"; params: { id: string } };
    }
  | {
      tone: "proactive";
      title: string;
      description: string;
      icon: typeof FolderLock | typeof CalendarDays;
      action:
        | { label: string; to: "/workflow/$id"; params: { id: string } }
        | { label: string; to: "/vault" };
    };

function Dashboard() {
  const navigate = useNavigate();
  const email = useAuth((s) => s.email);
  const tasks = useTasks((s) => s.tasks);
  const profile = useVault((s) => s.profile);
  const documents = useVault((s) => s.documents);
  const openChat = useChatUi((s) => s.openChat);
  const expiringDocuments = useExpiringDocuments(60);
  const profileCompleteness = useProfileCompleteness();
  const [query, setQuery] = useState("");
  const [thinking, setThinking] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  const aiEnabled = isApiKeyConfigured();
  const ragEnabled = isSupabaseConfigured();
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

  const alerts = useMemo<DashboardAlert[]>(() => {
    const items: DashboardAlert[] = [];

    for (const expiring of expiringDocuments.slice(0, 2)) {
      const renewWorkflowId = RENEWAL_WORKFLOW_FOR_DOC[expiring.type];
      if (!renewWorkflowId) continue;
      const expiryText =
        expiring.daysLeft <= 0
          ? "a expirat"
          : expiring.daysLeft === 1
            ? "expiră mâine"
            : `expiră în ${expiring.daysLeft} zile`;

      items.push({
        tone: "warning",
        title: `${expiring.label} ${expiryText}`,
        description: "Pornește reînnoirea din timp pentru a evita întârzieri administrative.",
        icon: AlertTriangle,
        action: {
          label: "Pornește reînnoirea",
          to: "/workflow/$id",
          params: { id: renewWorkflowId },
        },
      });
    }

    if (profileCompleteness < 0.75) {
      items.push({
        tone: "proactive",
        title: "Completează seiful pentru autofill",
        description: "Datele complete în seif reduc timpul pentru proceduri viitoare.",
        icon: FolderLock,
        action: { label: "Deschide seiful", to: "/vault" },
      });
    }

    const month = new Date().getMonth();
    if (month === 3 || month === 4) {
      items.push({
        tone: "proactive",
        title: "Sezon fiscal: Declarația Unică ANAF",
        description: "Pregătește din timp pașii pentru depunere.",
        icon: CalendarDays,
        action: {
          label: "Vezi ghidul ANAF",
          to: "/workflow/$id",
          params: { id: "anaf-declaration" },
        },
      });
    }

    return items.slice(0, 4);
  }, [expiringDocuments, profileCompleteness]);

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
      <PageHeader
        title={`${timeGreeting}, ${greet}`}
        description="Dashboard simplificat pentru proceduri, documente și asistență."
      >
        <Button variant="outline" size="sm" onClick={() => setServicesOpen(true)}>
          Vezi toate serviciile
        </Button>
      </PageHeader>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Statistici">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sarcini active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{tasks.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{documents.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Profil</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tracking-tight">{profile.fullName ? "OK" : "—"}</p>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-medium text-muted-foreground">Localitate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate text-lg font-semibold">{localitate ?? "Nesetată"}</p>
          </CardContent>
        </Card>
      </section>

      {alerts.length > 0 ? (
        <Card className="mt-4 border-border/80 shadow-none">
          <CardHeader className="pb-1">
            <CardTitle className="text-base">Alerte si sugestii</CardTitle>
            <CardDescription>Documente care expiră curând și pași recomandați.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.map((alert, idx) => (
              <div
                key={`${alert.title}-${idx}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <alert.icon
                      className={`size-4 ${alert.tone === "warning" ? "text-warning" : "text-primary"}`}
                    />
                    <p className="truncate text-sm font-medium">{alert.title}</p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alert.description}</p>
                </div>
                {"params" in alert.action ? (
                  <Button asChild size="sm" variant="outline">
                    <Link to={alert.action.to} params={alert.action.params}>
                      {alert.action.label}
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="sm" variant="outline">
                    <Link to={alert.action.to}>{alert.action.label}</Link>
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Întreabă agentul Civis
            </CardTitle>
            <CardDescription>
              {aiEnabled ? "Asistent AI activ" : "Asistent AI indisponibil"} ·{" "}
              {ragEnabled ? "RAG activ" : "fallback local"}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                className="h-11 w-full rounded-lg border border-input bg-background pl-9 pr-20 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={mic}
                className="absolute right-12 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                aria-label="Vorbește"
              >
                <Mic className="size-4" />
              </button>
              <button
                type="submit"
                disabled={thinking}
                className="absolute right-1.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md bg-primary text-primary-foreground disabled:opacity-50"
                aria-label="Caută"
              >
                <ArrowRight className="size-4" />
              </button>
            </form>
            {thinking ? (
              <p className="mt-2 text-xs text-muted-foreground">Construiesc planul tău…</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Proceduri populare</CardTitle>
            <CardDescription>Pornește rapid o procedură frecventă.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {QUICK.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.id}
                  to="/workflow/$id"
                  params={{ id: q.id }}
                  className="flex items-center justify-between rounded-lg border border-border/80 px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2">
                    <Icon className="size-4 text-primary" />
                    {q.label}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sarcini active</span>
              <Link to="/tasks" className="text-xs font-medium text-primary hover:underline">
                Vezi toate
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <Clock className="mx-auto mb-2 size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">
                  Nu ai nicio procedură în desfășurare.
                </p>
                <button
                  type="button"
                  onClick={() => setServicesOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Răsfoiește toate procedurile <ArrowRight className="size-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 3).map((t) => (
                  <Link
                    key={t.id}
                    to="/workflow/$id"
                    params={{ id: t.workflowId }}
                    className="block"
                  >
                    <div className="rounded-lg border border-border/80 p-3 hover:bg-muted/30">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="truncate pr-2 text-sm font-medium">{t.title}</div>
                        <div className="tabular-nums text-xs text-muted-foreground">
                          {t.currentStep}/{t.totalSteps}
                        </div>
                      </div>
                      <Progress value={t.progress} className="h-1.5" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Documente și scanare</CardTitle>
            <CardDescription>
              {documents.length > 0
                ? `${documents.length} documente în seif.`
                : "Nu ai încă documente în seif."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/vault">
                <MapPin className="size-4" />
                Deschide seiful
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full justify-start">
              <Link to="/scan">
                <ScanLine className="size-4" />
                Scanează un document
              </Link>
            </Button>
            <Button
              type="button"
              onClick={() => setServicesOpen(true)}
              variant="ghost"
              className="w-full justify-start"
            >
              <FileText className="size-4" />
              Toate procedurile
            </Button>
          </CardContent>
        </Card>
      </div>

      <AllServicesDrawer open={servicesOpen} onOpenChange={setServicesOpen} />
    </AppShell>
  );
}
