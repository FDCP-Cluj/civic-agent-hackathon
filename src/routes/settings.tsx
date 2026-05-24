import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Accessibility,
  Contrast,
  Download,
  Eye,
  ExternalLink,
  FolderLock,
  Info,
  KeyRound,
  Languages,
  LogOut,
  MessageSquare,
  Nfc,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Type,
  Upload,
  User,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { emptyStructuredAddress } from "@/lib/address";
import {
  useAccessibility,
  useAuth,
  useChatUi,
  useProfileCompleteness,
  useSettings,
  useVault,
  type AppLanguage,
  type VaultDocument,
  type VaultProfile,
} from "@/store";
import { govApi } from "@/services/govApiMock";
import { seedCeiDemoVault } from "@/lib/demoSeed";
import {
  CHAT_HISTORY_EVENT,
  clearChatHistory,
  loadChatHistory,
  notifyChatHistoryChanged,
} from "@/services/chatHistory";

const APP_VERSION = "v0.4.0";
const REPO_URL = "https://github.com/FDCP-Cluj/civic-agent-hackathon";

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  ro: "Română",
  en: "English",
  hu: "Magyar",
};

const PROVIDER_LABELS: Record<"mock" | "supabase" | "eidkit", string> = {
  mock: "Cont demo (mock)",
  supabase: "Supabase OTP",
  eidkit: "EidKit · CEI",
};

export const Route = createFileRoute("/settings")({ component: Settings });

function Settings() {
  return (
    <AppShell>
      <PageHeader
        title="Setări"
        description="Personalizează contul, accesibilitatea și serviciile conectate. Toate datele rămân pe acest dispozitiv."
      />

      <div className="mt-6 space-y-6">
        <AccountSection />
        <AccessibilitySection />
        <LanguageSection />
        <LocalDataSection />
        <ChatHistorySection />
        <PrivacySection />
        <AboutSection />
        <DangerSection />
      </div>
    </AppShell>
  );
}

/* ---------- Section primitives ---------- */

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Eye;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent">
          <Icon className="size-4 text-primary" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function ToggleRow({
  icon: Icon,
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  icon: typeof Eye;
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 py-1",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent">
        <Icon className="size-4 text-primary" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{title}</div>
          <Switch
            checked={checked}
            onCheckedChange={onChange}
            disabled={disabled}
            aria-label={title}
          />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

/* ---------- 1. Cont (Account) ---------- */

function AccountSection() {
  const navigate = useNavigate();
  const { email, authProvider, logout } = useAuth();
  const completeness = useProfileCompleteness();
  const completenessPct = Math.round(completeness * 100);

  return (
    <Section icon={User} title="Cont" description="Provider de autentificare și profil local.">
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            {authProvider === "eidkit" ? (
              <Nfc className="size-5 text-primary" />
            ) : authProvider === "supabase" ? (
              <KeyRound className="size-5 text-primary" />
            ) : (
              <User className="size-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="truncate text-sm font-medium">{email ?? "Cont local"}</div>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                {PROVIDER_LABELS[authProvider]}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Sesiunea este locală. Token-ul nu este sincronizat între dispozitive.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 p-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="text-xs font-medium">Profil seif</div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {completenessPct}%
            </span>
          </div>
          <Progress value={completenessPct} className="h-1.5" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/vault">
                <FolderLock className="size-3.5" />
                Deschide seiful
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                logout();
                navigate({ to: "/login" });
              }}
            >
              Schimbă cont
            </Button>
          </div>
        </div>
      </Card>
    </Section>
  );
}

/* ---------- 2. Accesibilitate ---------- */

function AccessibilitySection() {
  const { seniorMode, toggleSenior } = useSettings();
  const {
    highContrast,
    setHighContrast,
    dyslexicFont,
    setDyslexicFont,
    readAloud,
    setReadAloud,
    setLanguage,
  } = useAccessibility();
  const hasSpeech = typeof window !== "undefined" && "speechSynthesis" in window;

  const reset = () => {
    if (seniorMode) toggleSenior();
    setHighContrast(false);
    setDyslexicFont(false);
    setReadAloud(false);
    setLanguage("ro");
    toast.success("Setările de accesibilitate au fost resetate.");
  };

  return (
    <Section
      icon={Accessibility}
      title="Accesibilitate"
      description="Toate setările se salvează automat și se aplică imediat."
    >
      <Card className="p-4 space-y-1">
        <ToggleRow
          icon={Eye}
          title="Mod Senior"
          description="Text mai mare, contrast crescut, butoane mai vizibile."
          checked={seniorMode}
          onChange={toggleSenior}
        />
        <ToggleRow
          icon={Contrast}
          title="Contrast Înalt"
          description="Palete WCAG AAA (≥7:1) — text negru pe alb, butoane intens colorate."
          checked={highContrast}
          onChange={setHighContrast}
        />
        <ToggleRow
          icon={Type}
          title="Font pentru dislexie"
          description="Atkinson Hyperlegible — font optimizat pentru lectură."
          checked={dyslexicFont}
          onChange={setDyslexicFont}
        />
        <ToggleRow
          icon={Volume2}
          title="Citește cu voce tare"
          description={
            hasSpeech
              ? "Atinge orice paragraf pentru a-l asculta în limba română."
              : "Nu este disponibilă pe acest browser."
          }
          checked={readAloud && hasSpeech}
          disabled={!hasSpeech}
          onChange={setReadAloud}
        />
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw className="size-3.5" />
            Resetează la implicit
          </Button>
        </div>
      </Card>
    </Section>
  );
}

/* ---------- 3. Limbă ---------- */

function LanguageSection() {
  const language = useAccessibility((s) => s.language);
  const setLanguage = useAccessibility((s) => s.setLanguage);

  return (
    <Section
      icon={Languages}
      title="Limbă"
      description="Limba interfeței. Conținutul ghidurilor rămâne în română."
    >
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Limba aplicației</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Engleza și maghiara sunt parțiale — fallback automat în română.
            </p>
          </div>
          <Select value={language} onValueChange={(v) => setLanguage(v as AppLanguage)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(LANGUAGE_LABELS) as AppLanguage[]).map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>
    </Section>
  );
}

/* ---------- 4. Date locale ---------- */

type VaultExport = {
  schema: "civis-vault";
  version: 1;
  exportedAt: string;
  profile: VaultProfile;
  documents: VaultDocument[];
};

function isVaultExport(value: unknown): value is VaultExport {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<VaultExport>;
  return (
    v.schema === "civis-vault" &&
    typeof v.profile === "object" &&
    Array.isArray(v.documents)
  );
}

function LocalDataSection() {
  const documents = useVault((s) => s.documents);
  const profile = useVault((s) => s.profile);
  const completeness = useProfileCompleteness();
  const completenessPct = Math.round(completeness * 100);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImport, setPendingImport] = useState<VaultExport | null>(null);

  const exportVault = () => {
    const payload: VaultExport = {
      schema: "civis-vault",
      version: 1,
      exportedAt: new Date().toISOString(),
      profile,
      documents,
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `civis-vault-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Seif exportat ca JSON.");
    } catch (err) {
      console.error(err);
      toast.error("Nu am putut exporta seiful.");
    }
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!isVaultExport(parsed)) {
        toast.error("Fișier invalid.", {
          description: "Aștept un export Civis (schema: civis-vault).",
        });
        return;
      }
      setPendingImport(parsed);
    } catch (err) {
      console.error(err);
      toast.error("Nu am putut citi fișierul JSON.");
    }
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    useVault.setState({
      profile: pendingImport.profile,
      documents: pendingImport.documents,
    });
    toast.success("Seif înlocuit cu importul.");
    setPendingImport(null);
  };

  const wipeVault = () => {
    const empty: VaultProfile = {
      fullName: "",
      firstName: "",
      lastName: "",
      cnp: "",
      address: "",
      addressParts: emptyStructuredAddress(),
      phone: "",
      email: "",
      birthDate: "",
      birthLocality: "",
      birthCounty: "",
      birthCountry: "România",
      citizenship: "Română",
      orctOffice: "",
      idCardType: "CI",
      idCardSeries: "",
      idCardNumber: "",
      idCardIssuedBy: "",
      idCardIssueDate: "",
      idCardExpiryDate: "",
    };
    useVault.setState({ profile: empty, documents: [] });
    toast.success("Seif gol. Profilul și documentele au fost șterse.");
  };

  const reseedDemo = () => {
    seedCeiDemoVault();
    toast.success("Date demo reîncărcate (Andrei Popescu + 5 acte).");
  };

  return (
    <Section
      icon={FolderLock}
      title="Date locale"
      description="Profilul și actele tale rămân pe acest dispozitiv. Le poți exporta, importa sau șterge oricând."
    >
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat label="Documente" value={String(documents.length)} />
          <Stat label="Profil completat" value={`${completenessPct}%`} />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" onClick={exportVault}>
            <Download className="size-4" />
            Exportă seif (JSON)
          </Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="size-4" />
            Importă seif
          </Button>
          <Button variant="outline" onClick={reseedDemo}>
            <RefreshCw className="size-4" />
            Reîncarcă date demo
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="border-destructive/30 text-destructive hover:bg-destructive/5"
              >
                <Trash2 className="size-4" />
                Șterge tot seiful
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Ștergi tot seiful?</AlertDialogTitle>
                <AlertDialogDescription>
                  Acțiunea elimină profilul, CNP-ul și toate cele {documents.length}{" "}
                  {documents.length === 1 ? "document" : "documente"} din browserul acestui
                  dispozitiv. Nu se poate anula.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Renunță</AlertDialogCancel>
                <AlertDialogAction
                  onClick={wipeVault}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  Șterge definitiv
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void onImportFile(f);
          }}
        />
      </Card>

      <AlertDialog
        open={pendingImport !== null}
        onOpenChange={(open) => {
          if (!open) setPendingImport(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Înlocuiești seiful curent?</AlertDialogTitle>
            <AlertDialogDescription>
              Importul conține {pendingImport?.documents.length ?? 0}{" "}
              {pendingImport?.documents.length === 1 ? "document" : "documente"} și un profil
              pentru <strong>{pendingImport?.profile.fullName || "(fără nume)"}</strong>. Datele
              actuale vor fi suprascrise.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Renunță</AlertDialogCancel>
            <AlertDialogAction onClick={confirmImport}>Înlocuiește seiful</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold">{value}</div>
    </div>
  );
}

/* ---------- 5. Istoric chat ---------- */

function ChatHistorySection() {
  const startNewSession = useChatUi((s) => s.startNewSession);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(loadChatHistory().length);
    sync();
    window.addEventListener(CHAT_HISTORY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHAT_HISTORY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const clearAll = () => {
    clearChatHistory();
    notifyChatHistoryChanged("page");
    setCount(0);
    toast.success("Istoricul de chat a fost șters.");
  };

  const newChat = () => {
    startNewSession();
    toast.success("Conversație nouă pornită.");
  };

  return (
    <Section
      icon={MessageSquare}
      title="Istoric chat"
      description="Conversațiile cu agentul ActeAI. Stocate doar în acest browser."
    >
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">
              {count} {count === 1 ? "mesaj" : "mesaje"} salvate
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Conversațiile mai vechi se elimină automat când istoricul devine prea mare.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/chat">
                <MessageSquare className="size-3.5" />
                Deschide chat
              </Link>
            </Button>
            <Button size="sm" variant="outline" onClick={newChat}>
              <RefreshCw className="size-3.5" />
              Pornește conversație nouă
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={count === 0}
                  className="border-destructive/30 text-destructive hover:bg-destructive/5 disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                  Șterge tot istoricul
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ștergi tot istoricul de chat?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Toate conversațiile cu agentul ActeAI vor fi eliminate din acest browser. Nu se
                    poate anula.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Renunță</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearAll}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Șterge definitiv
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </Card>
    </Section>
  );
}

/* ---------- 6. Confidențialitate ---------- */

function PrivacySection() {
  return (
    <Section
      icon={ShieldCheck}
      title="Confidențialitate"
      description="Cum gestionează ActeAI datele tale."
    >
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-success/10">
            <ShieldCheck className="size-5 text-success" />
          </div>
          <div className="min-w-0 flex-1 text-sm leading-relaxed">
            <p>
              Toate datele rămân pe acest dispozitiv. ActeAI nu trimite documente către servere.
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-primary/60" />
                <span>
                  Asistentul AI vede doar profilul tău cu CNP-ul mascat. Pozele și actele nu
                  părăsesc browserul.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-primary/60" />
                <span>
                  Scanarea actelor rulează local pe dispozitivul tău. Niciun upload pe server.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="mt-1 size-1 shrink-0 rounded-full bg-primary/60" />
                <span>
                  Poți exporta sau șterge oricând tot seiful și istoricul chat din secțiunile de
                  mai sus.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </Section>
  );
}

/* ---------- 7. Despre ---------- */

function AboutSection() {
  const [verified, setVerified] = useState<{ min: string; max: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    govApi
      .listWorkflows()
      .then((workflows) => {
        if (cancelled) return;
        const stamps = workflows
          .map((w) => w.dataSource?.verifiedAt)
          .filter((s): s is string => Boolean(s))
          .sort();
        if (stamps.length === 0) return;
        setVerified({ min: stamps[0], max: stamps[stamps.length - 1] });
      })
      .catch(() => {
        /* silent */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Section icon={Info} title="Despre" description="Informații despre versiunea curentă.">
      <Card className="p-4">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Versiune</dt>
            <dd className="font-mono tabular-nums">{APP_VERSION}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Cod sursă</dt>
            <dd>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                GitHub <ExternalLink className="size-3" />
              </a>
            </dd>
          </div>
          <div className="col-span-full flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">Date verificate</dt>
            <dd className="text-xs">
              {verified
                ? verified.min === verified.max
                  ? formatShortDate(verified.min)
                  : `${formatShortDate(verified.min)} – ${formatShortDate(verified.max)}`
                : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Pilot ActeAI · inițiativă civică independentă · hostat în România.
        </div>
      </Card>
    </Section>
  );
}

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" });
}

/* ---------- 8. Acțiuni periculoase ---------- */

function DangerSection() {
  const navigate = useNavigate();
  const logout = useAuth((s) => s.logout);

  return (
    <Section
      icon={LogOut}
      title="Acțiuni periculoase"
      description="Vor invalida sesiunea curentă."
    >
      <Card className="p-4">
        <Button
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/5"
          onClick={() => {
            logout();
            navigate({ to: "/login" });
          }}
        >
          <LogOut className="size-4" /> Deconectare
        </Button>
      </Card>
    </Section>
  );
}
