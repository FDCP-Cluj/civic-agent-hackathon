import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  ExternalLink,
  History,
  MessageCircle,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useChatUi } from "@/store";
import {
  CHAT_HISTORY_EVENT,
  clearChatHistory,
  loadChatHistory,
  notifyChatHistoryChanged,
  type PersistedChatMessage,
} from "@/services/chatHistory";
import { isApiKeyConfigured } from "@/services/aiConfig";

export const Route = createFileRoute("/chat")({ component: ChatPage });

type ChatTurn = {
  id: string;
  title: string;
  preview: string;
  startedAt?: string;
  messages: PersistedChatMessage[];
};

const STARTER_PROMPTS = [
  "Vreau să-mi preschimb permisul străin în România.",
  "Cum iau cazierul judiciar cel mai rapid?",
  "Ce acte îmi trebuie pentru certificat de naștere?",
  "Vreau să pregătesc actele pentru căsătorie civilă.",
  "Cum obțin alocația de stat pentru copil?",
  "Care sunt pașii pentru autorizația de construire?",
] as const;

function ChatPage() {
  const openChat = useChatUi((s) => s.openChat);
  const [history, setHistory] = useState<PersistedChatMessage[]>(() => loadChatHistory());

  useEffect(() => {
    const sync = () => setHistory(loadChatHistory());
    window.addEventListener(CHAT_HISTORY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHAT_HISTORY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const turns = useMemo(() => buildTurns(history), [history]);
  const newestTurns = useMemo(() => [...turns].reverse(), [turns]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedTurn =
    turns.find((turn) => turn.id === selectedId) ??
    (turns.length > 0 ? turns[turns.length - 1] : null);

  useEffect(() => {
    if (turns.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !turns.some((turn) => turn.id === selectedId)) {
      setSelectedId(turns[turns.length - 1].id);
    }
  }, [selectedId, turns]);

  const clearAll = () => {
    clearChatHistory();
    setHistory([]);
    notifyChatHistoryChanged("page");
  };

  const aiEnabled = isApiKeyConfigured();

  return (
    <AppShell>
      <PageHeader
        title="Chat ActeAI"
        description="Conversațiile salvate pe acest dispozitiv, cu sursele și ghidurile recomandate."
      >
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Button size="sm" variant="outline" onClick={clearAll}>
              <Trash2 className="size-4" />
              Șterge
            </Button>
          )}
          <Button size="sm" onClick={() => openChat()}>
            <Plus className="size-4" />
            Chat nou
          </Button>
        </div>
      </PageHeader>

      {!aiEnabled && (
        <div className="mt-5 rounded-lg border border-warning/30 bg-warning/10 px-3.5 py-3 text-sm text-warning">
          Cheia Gemini nu este configurată. Istoricul rămâne vizibil, dar chatul live este oprit.
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <History className="size-4 text-primary" />
              Istoric
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{turns.length}</span>
          </div>
          <ScrollArea className="h-[420px]">
            {newestTurns.length === 0 ? (
              <div className="flex h-[420px] flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="mb-3 size-9 text-muted-foreground" />
                <p className="text-sm font-medium">Nu există conversații salvate</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Pornește un chat și istoricul apare aici automat.
                </p>
              </div>
            ) : (
              <div className="p-2">
                {newestTurns.map((turn) => (
                  <button
                    key={turn.id}
                    type="button"
                    onClick={() => setSelectedId(turn.id)}
                    className={cn(
                      "mb-1 w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      selectedTurn?.id === turn.id
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent hover:border-border hover:bg-accent/45",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 text-sm font-medium">{turn.title}</span>
                      {turn.startedAt && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatShortDate(turn.startedAt)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      {turn.preview}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card className="overflow-hidden p-0">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="line-clamp-1 text-sm font-semibold">
                  {selectedTurn?.title ?? "Conversație nouă"}
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {selectedTurn
                    ? `${selectedTurn.messages.length} mesaje salvate local`
                    : "Întrebările rapide deschid agentul ActeAI"}
                </div>
              </div>
              <Button size="sm" onClick={() => openChat()}>
                <Sparkles className="size-4" />
                Continuă chatul
              </Button>
            </div>

            <ScrollArea className="h-[520px]">
              {selectedTurn ? (
                <div className="space-y-3 p-4">
                  {selectedTurn.messages.map((message) => (
                    <HistoryMessage key={message.id} message={message} />
                  ))}
                </div>
              ) : (
                <div className="grid h-[520px] place-items-center p-6 text-center">
                  <div>
                    <Sparkles className="mx-auto mb-3 size-10 text-primary" />
                    <p className="text-sm font-medium">Alege o întrebare rapidă</p>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
                      Chatul folosește ghidurile locale și poate atașa surse oficiale când cheia API
                      permite căutare web.
                    </p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </Card>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {STARTER_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => openChat(prompt)}
                className="rounded-lg border border-border bg-card px-3 py-2.5 text-left text-xs leading-snug transition-colors hover:bg-accent/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function HistoryMessage({ message }: { message: PersistedChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[86%] space-y-2", isUser ? "text-right" : "text-left")}>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {isUser ? (
            <>
              <span className="ml-auto">Tu</span>
              <User className="size-3" />
            </>
          ) : (
            <>
              <Bot className="size-3" />
              <span>ActeAI</span>
            </>
          )}
        </div>
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-soft whitespace-pre-wrap",
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border border-border bg-card",
          )}
        >
          {message.text || "(răspuns gol)"}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="rounded-lg border border-border bg-card/70 p-2">
            <div className="mb-1.5 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="size-3 text-success" />
              Surse
            </div>
            <div className="flex flex-wrap gap-1.5">
              {message.sources.slice(0, 8).map((source) => (
                <a
                  key={source.uri}
                  href={source.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/45"
                  title={source.title}
                >
                  <span className="max-w-[160px] truncate">{source.domain}</span>
                  <ExternalLink className="size-2.5 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {!isUser && message.workflowCta && (
          <Card className="border-primary/30 bg-primary/5 p-3 text-left">
            <div className="mb-1 text-xs font-semibold text-primary">
              {message.workflowCta.title}
            </div>
            {message.workflowCta.reason && (
              <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
                {message.workflowCta.reason}
              </p>
            )}
            <Button asChild size="sm" variant="outline" className="w-full">
              <Link to="/workflow/$id" params={{ id: message.workflowCta.id }}>
                Deschide ghidul
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

function buildTurns(messages: PersistedChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  let current: ChatTurn | null = null;

  for (const message of messages) {
    if (message.role === "user" || !current) {
      current = {
        id: message.id,
        title: titleFrom(message.text),
        preview: "",
        startedAt: message.createdAt,
        messages: [message],
      };
      turns.push(current);
      continue;
    }

    current.messages.push(message);
  }

  return turns.map((turn) => {
    const assistant = turn.messages.find((message) => message.role === "assistant");
    return {
      ...turn,
      preview: assistant?.text ? trimText(assistant.text, 110) : trimText(turn.title, 110),
    };
  });
}

function titleFrom(text: string): string {
  const trimmed = trimText(text.replace(/\s+/g, " "), 64);
  return trimmed || "Conversație";
}

function trimText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" });
}
