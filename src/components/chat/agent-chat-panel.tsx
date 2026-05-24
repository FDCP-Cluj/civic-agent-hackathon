// Shared chat panel — used by both the global drawer (`civis-chat.tsx`) and
// the full-page chat route (`/chat`). Owns its own messages state, streaming
// session, and composer; persistence + history grouping is delegated to
// `services/chatHistory.ts` and `store/chatUi.ts`.
//
// Each instance reads/writes the same localStorage key, so reopening the
// drawer after sending from the page (or vice versa) shows the same history.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  Mic,
  MicOff,
  Send,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useChatUi, useVault } from "@/store";
import {
  createChatSession,
  extractWorkflowIdFromText,
  streamChatMessage,
  type ChatSession,
  type GroundingSource,
} from "@/services/geminiChat";
import { isApiKeyConfigured } from "@/services/aiConfig";
import { govApi, type Workflow } from "@/services/govApiMock";
import {
  CHAT_HISTORY_EVENT,
  getChatHistoryEventSource,
  loadChatHistory,
  loadMessagesForConversation,
  notifyChatHistoryChanged,
  saveChatHistory,
  type ChatHistorySource,
  type ChatWorkflowCta,
  type PersistedChatMessage,
} from "@/services/chatHistory";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { lookupCompanyByCui, type AnafLookupResult } from "@/services/anaf";
import { findCaen } from "@/services/caen";
import { suggestCaenWithRag, type RagCaenSuggestion } from "@/services/rag";

type AnafCard = { cui: string; state: "loading" | "done"; result?: AnafLookupResult };
type CaenCard = { activitate: string; state: "loading" | "done"; result?: RagCaenSuggestion };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  sessionId?: string;
  createdAt?: string;
  streaming?: boolean;
  workflowCta?: ChatWorkflowCta;
  sources?: GroundingSource[];
  anaf?: AnafCard;
  caen?: CaenCard;
};

type AgentChatPanelProps = {
  /** Identifies who we are in the cross-tab event so we don't reload our own writes. */
  source: ChatHistorySource;
  /** Filter to a specific session — when provided, only those messages render. */
  sessionFilter?: string | null;
  /** Optional seed query to send once on mount (drawer uses this for FAB intents). */
  initialQuery?: string | null;
  /** Called when the user picks a workflow CTA (drawer closes itself; page just navigates). */
  onWorkflowOpen?: (id: string) => void;
  /** Wraps the messages area; lets the drawer constrain height differently from the page. */
  containerClassName?: string;
  /** Wraps the entire panel root. */
  className?: string;
  /** Called after `initialQuery` has been consumed so the parent can clear it. */
  onInitialQueryConsumed?: () => void;
};

function loadMessagesForSession(filter: string | null | undefined): ChatMessage[] {
  const filtered = filter ? loadMessagesForConversation(filter) : loadChatHistory();
  return filtered.map((p) => ({
    id: p.id,
    role: p.role,
    text: p.text,
    createdAt: p.createdAt,
    sessionId: p.sessionId,
    workflowCta: p.workflowCta,
    sources: p.sources,
  }));
}

export function AgentChatPanel({
  source,
  sessionFilter,
  initialQuery,
  onWorkflowOpen,
  containerClassName,
  className,
  onInitialQueryConsumed,
}: AgentChatPanelProps) {
  const navigate = useNavigate();
  const profile = useVault((s) => s.profile);
  const currentSessionId = useChatUi((s) => s.currentSessionId);
  const apiKeyOk = useMemo(() => isApiKeyConfigured(), []);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const sessionRef = useRef<ChatSession | null>(null);
  const sessionKeyRef = useRef<string>("");
  const groundingDisabledRef = useRef(false);
  const consumedInitialRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    loadMessagesForSession(sessionFilter ?? null),
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // When `messages` was just hydrated from localStorage (initial mount, session
  // switch, or external write from the other panel), we must NOT write it back —
  // doing so would re-broadcast the change and ping-pong with the other panel
  // forever. Flip this on before such a setMessages call; the persistence
  // effect consumes the flag and resets it.
  const skipNextSaveRef = useRef(true);

  // Persist messages — but merge our session into the global list so other
  // sessions stay intact.
  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    try {
      const slim: PersistedChatMessage[] = messages
        .filter((m) => !m.streaming)
        .map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          createdAt: m.createdAt,
          sessionId: m.sessionId,
          workflowCta: m.workflowCta,
          sources: m.sources,
        }));

      const all = loadChatHistory();
      const ourSessionIds = new Set(slim.map((s) => s.sessionId).filter(Boolean) as string[]);
      const others = sessionFilter
        ? all.filter((m) => m.sessionId !== sessionFilter)
        : all.filter((m) => !ourSessionIds.has(m.sessionId ?? ""));
      saveChatHistory([...others, ...slim]);
      notifyChatHistoryChanged(source);
    } catch {
      // localStorage may be full or restricted — silent fallback.
    }
  }, [messages, sessionFilter, source]);

  // Reload from storage when another instance writes (drawer ↔ page).
  useEffect(() => {
    const onChanged = (event: Event) => {
      if (getChatHistoryEventSource(event) === source) return;
      skipNextSaveRef.current = true;
      setMessages(loadMessagesForSession(sessionFilter ?? null));
    };
    window.addEventListener(CHAT_HISTORY_EVENT, onChanged);
    return () => window.removeEventListener(CHAT_HISTORY_EVENT, onChanged);
  }, [sessionFilter, source]);

  // Switch sessions: reload visible messages and reset the live stream.
  useEffect(() => {
    skipNextSaveRef.current = true;
    setMessages(loadMessagesForSession(sessionFilter ?? null));
    sessionRef.current = null;
    sessionKeyRef.current = "";
  }, [sessionFilter]);

  useEffect(() => {
    govApi.listWorkflows().then(setWorkflows);
  }, []);

  // Re-key the chat session whenever profile content changes meaningfully
  // so vault edits propagate to the system prompt on the next send.
  const sessionKey = useMemo(
    () =>
      [
        workflows.length,
        profile.fullName,
        profile.cnp,
        profile.address,
        profile.email,
        profile.phone,
      ].join("|"),
    [workflows.length, profile],
  );

  useEffect(() => {
    if (!apiKeyOk || workflows.length === 0) return;
    if (sessionRef.current && sessionKeyRef.current === sessionKey) return;
    try {
      sessionRef.current = createChatSession(profile, workflows, {
        withGoogleSearch: !groundingDisabledRef.current,
      });
      sessionKeyRef.current = sessionKey;
    } catch (err) {
      console.error(err);
      toast.error("Nu am putut iniția sesiunea de chat.");
    }
  }, [apiKeyOk, profile, workflows, sessionKey]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy) return;
      if (!apiKeyOk) {
        toast.error("Setează cheia API Gemini în .env.local pentru a folosi chatul.");
        return;
      }
      if (!sessionRef.current) {
        try {
          sessionRef.current = createChatSession(profile, workflows, {
            withGoogleSearch: !groundingDisabledRef.current,
          });
        } catch {
          toast.error("Nu am putut iniția sesiunea de chat.");
          return;
        }
      }

      const sessionId = sessionFilter ?? currentSessionId;
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmed,
        sessionId,
        createdAt: new Date().toISOString(),
      };
      const assistantId = crypto.randomUUID();
      const predictedWorkflowId = extractWorkflowIdFromText(
        trimmed,
        workflows.map((w) => w.id),
      );
      const predictedWorkflow = predictedWorkflowId
        ? workflows.find((w) => w.id === predictedWorkflowId)
        : null;
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        text: "",
        sessionId,
        createdAt: new Date().toISOString(),
        streaming: true,
        workflowCta: predictedWorkflow
          ? {
              id: predictedWorkflow.id,
              title: predictedWorkflow.title,
              reason: "Am găsit ghidul potrivit pentru situația ta.",
            }
          : undefined,
      };
      setMessages((m) => [...m, userMsg, assistantMsg]);
      setInput("");
      setBusy(true);

      const runStream = async () => {
        for await (const evt of streamChatMessage(sessionRef.current!, trimmed)) {
          if (evt.type === "text") {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId ? { ...msg, text: msg.text + evt.value } : msg,
              ),
            );
          } else if (evt.type === "function_call" && evt.name === "open_workflow") {
            const wf = workflows.find((w) => w.id === evt.args.id);
            if (!wf) continue;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? {
                      ...msg,
                      workflowCta: { id: wf.id, title: wf.title, reason: evt.args.reason },
                    }
                  : msg,
              ),
            );
          } else if (evt.type === "function_call" && evt.name === "list_workflows") {
            const summary = workflows.map((w) => `• ${w.title}`).join("\n");
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, text: msg.text + (msg.text ? "\n\n" : "") + summary }
                  : msg,
              ),
            );
          } else if (evt.type === "function_call" && evt.name === "verify_cui") {
            const cui = evt.args.cui;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId ? { ...msg, anaf: { cui, state: "loading" } } : msg,
              ),
            );
            lookupCompanyByCui(cui).then((result) => {
              setMessages((m) =>
                m.map((msg) =>
                  msg.id === assistantId ? { ...msg, anaf: { cui, state: "done", result } } : msg,
                ),
              );
            });
          } else if (evt.type === "function_call" && evt.name === "find_caen") {
            const activitate = evt.args.activitate;
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId ? { ...msg, caen: { activitate, state: "loading" } } : msg,
              ),
            );
            suggestCaenWithRag(activitate)
              .then((result) => {
                setMessages((m) =>
                  m.map((msg) =>
                    msg.id === assistantId
                      ? { ...msg, caen: { activitate, state: "done", result } }
                      : msg,
                  ),
                );
              })
              .catch((err) => {
                console.warn("[acteai] RAG CAEN suggestion failed", err);
                setMessages((m) =>
                  m.map((msg) =>
                    msg.id === assistantId
                      ? {
                          ...msg,
                          caen: {
                            activitate,
                            state: "done",
                            result: {
                              source: "local_fallback",
                              matches: [],
                              citations: [],
                              degraded: true,
                            },
                          },
                        }
                      : msg,
                  ),
                );
              });
          } else if (evt.type === "sources") {
            setMessages((m) =>
              m.map((msg) => {
                if (msg.id !== assistantId) return msg;
                const existing = msg.sources ?? [];
                const seen = new Set(existing.map((s) => s.uri));
                const merged = [...existing, ...evt.sources.filter((s) => !seen.has(s.uri))];
                return { ...msg, sources: merged };
              }),
            );
          }
        }
      };

      try {
        try {
          await runStream();
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          const looksLikeToolIncompat =
            !groundingDisabledRef.current &&
            /tool|search|400|invalid|unsupported|combination/i.test(msg);
          if (!looksLikeToolIncompat) throw err;

          console.warn(
            "[acteai] Gemini rejected googleSearch + functionDeclarations combo; retrying without grounding.",
            err,
          );
          groundingDisabledRef.current = true;
          try {
            sessionRef.current = createChatSession(profile, workflows, {
              withGoogleSearch: false,
            });
            sessionKeyRef.current = sessionKey;
          } catch (recreateErr) {
            console.error("[acteai] session recreate failed", recreateErr);
            throw err;
          }
          setMessages((m) =>
            m.map((mm) =>
              mm.id === assistantId ? { ...mm, text: "", streaming: true, sources: undefined } : mm,
            ),
          );
          toast.info("Căutarea web e dezactivată pe această cheie API. Continui fără surse live.");
          await runStream();
        }

        setMessages((m) =>
          m.map((msg) => {
            if (msg.id !== assistantId) return msg;
            const fallbackId = msg.workflowCta
              ? null
              : extractWorkflowIdFromText(
                  msg.text,
                  workflows.map((w) => w.id),
                );
            const fallbackWf = fallbackId ? workflows.find((w) => w.id === fallbackId) : null;
            return {
              ...msg,
              streaming: false,
              text:
                msg.text.trim().length > 0
                  ? msg.text
                  : "Am analizat cererea ta. Vezi rezultatul/actiunile sugerate mai jos.",
              workflowCta:
                msg.workflowCta ??
                (fallbackWf ? { id: fallbackWf.id, title: fallbackWf.title } : undefined),
            };
          }),
        );
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        console.error("[acteai] chat failed", err);
        toast.error(`Gemini: ${truncate(rawMsg, 140)}`);
        setMessages((m) =>
          m.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  streaming: false,
                  text:
                    (msg.text ? msg.text + "\n\n" : "") +
                    `Ne pare rău, conexiunea cu Gemini a eșuat.\n\n_Detalii tehnice:_ ${truncate(
                      rawMsg,
                      220,
                    )}`,
                }
              : msg,
          ),
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, apiKeyOk, profile, workflows, sessionKey, currentSessionId, sessionFilter],
  );

  // Consume initial query exactly once per value.
  useEffect(() => {
    if (!initialQuery) {
      consumedInitialRef.current = null;
      return;
    }
    if (busy) return;
    if (consumedInitialRef.current === initialQuery) return;
    const handle = setTimeout(() => {
      consumedInitialRef.current = initialQuery;
      send(initialQuery);
      onInitialQueryConsumed?.();
    }, 50);
    return () => clearTimeout(handle);
  }, [initialQuery, busy, send, onInitialQueryConsumed]);

  const {
    isListening,
    isSupported: micSupported,
    start: micStart,
    stop: micStop,
  } = useSpeechRecognition({
    onResult: (text) => {
      setInput((prev) => (prev ? `${prev} ${text}` : text));
    },
    onError: (msg) => toast.error(msg),
  });

  const handleWorkflowOpen = (id: string) => {
    if (onWorkflowOpen) onWorkflowOpen(id);
    else navigate({ to: "/workflow/$id", params: { id } });
  };

  if (!apiKeyOk) {
    return <ApiKeyMissingState className={className} />;
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <ScrollArea className={cn("flex-1 px-4 py-4", containerClassName)}>
        <div ref={scrollRef} className="mx-auto max-w-2xl space-y-3">
          {messages.length === 0 && <ChatEmptyState onPick={send} />}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} onOpenWorkflow={handleWorkflowOpen} />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t border-border/60 bg-card/60 p-3 backdrop-blur-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="mx-auto max-w-2xl"
        >
          <div className="relative flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Scrie aici… ex: am pierdut buletinul"
              rows={1}
              className="max-h-32 min-h-[44px] resize-none pr-24 leading-relaxed"
              disabled={busy}
            />
            <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
              {micSupported && (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  onClick={isListening ? micStop : micStart}
                  aria-label={isListening ? "Oprește microfonul" : "Vorbește"}
                  disabled={busy}
                >
                  {isListening ? (
                    <MicOff className="size-4 animate-pulse text-destructive" />
                  ) : (
                    <Mic className="size-4" />
                  )}
                </Button>
              )}
              <Button
                type="submit"
                size="icon"
                className="size-8"
                disabled={busy || !input.trim()}
                aria-label="Trimite"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="size-3 text-success" />
            Datele tale rămân pe acest dispozitiv. Nu trimitem documente.
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function MessageBubble({
  message,
  onOpenWorkflow,
}: {
  message: ChatMessage;
  onOpenWorkflow: (id: string) => void;
}) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn(
        "flex animate-[fade-in_0.25s_ease-out]",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      <div className={cn("max-w-[85%] space-y-2", isUser ? "items-end" : "items-start")}>
        <div className="mb-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
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
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-soft break-words",
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground whitespace-pre-wrap"
              : "rounded-bl-md border border-border bg-card",
          )}
        >
          {message.text ? (
            <FormattedText text={message.text} />
          ) : message.streaming ? (
            <ThinkingDots />
          ) : (
            <span className="italic text-muted-foreground">(răspuns gol)</span>
          )}
          {message.streaming && message.text && (
            <span className="ml-0.5 inline-block h-4 w-1 animate-pulse bg-current align-text-bottom opacity-60" />
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <SourcesStrip sources={message.sources} />
        )}

        {message.anaf && <AnafResultCard anaf={message.anaf} />}
        {message.caen && <CaenSuggestionCard caen={message.caen} />}

        {message.workflowCta && (
          <Card className="animate-[fade-in_0.4s_ease-out] border-primary/30 bg-gradient-to-br from-card to-accent/30 p-3">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Ghid pas-cu-pas
              </span>
            </div>
            <div className="mb-1 text-sm font-semibold">{message.workflowCta.title}</div>
            {message.workflowCta.reason && (
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                {message.workflowCta.reason}
              </p>
            )}
            <Button
              size="sm"
              className="w-full"
              onClick={() => onOpenWorkflow(message.workflowCta!.id)}
            >
              Deschide ghidul pas-cu-pas
              <ArrowRight className="size-4" />
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  return (
    <div className="prose-civis text-sm leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            />
          ),
          ul: (props) => <ul {...props} className="my-1.5 list-disc space-y-0.5 pl-5" />,
          ol: (props) => <ol {...props} className="my-1.5 list-decimal space-y-0.5 pl-5" />,
          p: (props) => <p {...props} className="my-1.5 first:mt-0 last:mb-0" />,
          strong: (props) => <strong {...props} className="font-semibold" />,
          code: (props) => (
            <code {...props} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]" />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function SourcesStrip({ sources }: { sources: GroundingSource[] }) {
  const officialPattern =
    /\.(gov|mai|guv)\.ro$|^anaf\.ro$|^drpciv\.ro$|^onrc\.ro$|^ancpi\.ro$|^epasapoarte\.ro$|^ghiseul\.ro$|^politiaromana\.ro$|^mmuncii\.ro$|^mdlpa\.ro$/i;
  const isOfficial = (d: string) => officialPattern.test(d);

  return (
    <div className="animate-[fade-in_0.4s_ease-out] rounded-xl border border-border bg-card/50 p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Globe className="size-3" aria-hidden /> Surse web verificate
      </div>
      <div className="flex flex-wrap gap-1.5">
        {sources.slice(0, 6).map((s) => {
          const official = isOfficial(s.domain);
          return (
            <a
              key={s.uri}
              href={s.uri}
              target="_blank"
              rel="noreferrer"
              title={s.title}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                official
                  ? "border-success/30 bg-success/5 text-success hover:bg-success/10"
                  : "border-border bg-background text-muted-foreground hover:bg-accent/40",
              )}
            >
              {official && <ShieldCheck className="size-3 shrink-0" aria-hidden />}
              <span className="max-w-[140px] truncate">{s.domain}</span>
              <ExternalLink className="size-2.5 shrink-0 opacity-60" aria-hidden />
            </a>
          );
        })}
        {sources.length > 6 && (
          <span className="inline-flex items-center px-1 text-[11px] text-muted-foreground">
            +{sources.length - 6} surse
          </span>
        )}
      </div>
    </div>
  );
}

function AnafResultCard({ anaf }: { anaf: AnafCard }) {
  if (anaf.state === "loading") {
    return (
      <Card className="animate-[fade-in_0.3s_ease-out] border-primary/30 bg-card p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Loader2 className="size-3.5 animate-spin" />
          Interoghez ANAF pentru CUI {anaf.cui}…
        </div>
      </Card>
    );
  }
  if (!anaf.result || !anaf.result.ok) {
    const reason = anaf.result?.message ?? "Eroare necunoscută.";
    return (
      <Card className="animate-[fade-in_0.3s_ease-out] border-warning/30 bg-warning/5 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-warning">
              ANAF · CUI {anaf.cui}
            </div>
            <p className="mt-1 text-sm leading-relaxed">{reason}</p>
          </div>
        </div>
      </Card>
    );
  }
  const c = anaf.result.company;
  return (
    <Card className="animate-[fade-in_0.3s_ease-out] border-success/30 bg-success/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <CheckCircle2 className="size-4 text-success" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-success">
          ANAF · înregistrat oficial
        </span>
        <a
          href={`https://www.anaf.ro/inforegcom/faces/index.xhtml?cui=${encodeURIComponent(c.cui)}`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          Vezi pe ANAF <ExternalLink className="size-3" />
        </a>
      </div>
      <div className="flex items-start gap-2">
        <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="break-words text-sm font-semibold">{c.denumire || "(fără denumire)"}</div>
          <div className="break-words text-xs text-muted-foreground">{c.adresa}</div>
        </div>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-muted-foreground">CUI</dt>
        <dd className="font-mono tabular-nums">{c.cui}</dd>
        <dt className="text-muted-foreground">TVA</dt>
        <dd>
          {c.status_tva === "platitor_tva"
            ? "Plătitor TVA"
            : c.status_tva === "neplatitor_tva"
              ? "Neplătitor TVA"
              : "Necunoscut"}
        </dd>
        {c.data_inregistrare && (
          <>
            <dt className="text-muted-foreground">Înregistrat</dt>
            <dd>{c.data_inregistrare}</dd>
          </>
        )}
        {c.judet && (
          <>
            <dt className="text-muted-foreground">Județ</dt>
            <dd>{c.judet}</dd>
          </>
        )}
      </dl>
    </Card>
  );
}

function CaenSuggestionCard({ caen }: { caen: CaenCard }) {
  const fallbackMatches = findCaen(caen.activitate, 5);
  const matches = caen.result?.matches ?? fallbackMatches;
  const sourceLabel = caen.result?.source ?? "local_fallback";
  const citations = caen.result?.citations ?? [];
  const searchUrl = `https://www.caen.ro/?s=${encodeURIComponent(caen.activitate)}`;

  if (caen.state === "loading") {
    return (
      <Card className="animate-[fade-in_0.3s_ease-out] border-primary/30 bg-card p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Loader2 className="size-3.5 animate-spin" />
          Caut sugestii CAEN prin baza de cunoștințe…
        </div>
      </Card>
    );
  }

  return (
    <Card className="animate-[fade-in_0.3s_ease-out] border-primary/30 bg-card p-3">
      <div className="mb-1.5 flex items-center gap-2">
        <Sparkles className="size-3.5 text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
          CAEN · sugestii
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          {sourceLabel === "supabase_rag" ? "RAG" : "fallback local"}
        </span>
      </div>
      <p className="mb-2 text-xs leading-relaxed text-muted-foreground">
        Pentru: <em>{caen.activitate}</em>
      </p>

      {matches.length === 0 ? (
        <p className="mb-2 text-xs text-muted-foreground">
          Nu am găsit coduri în nomenclatorul local. Deschide căutarea oficială.
        </p>
      ) : (
        <ul className="mb-3 space-y-1.5">
          {matches.map((m) => (
            <li
              key={m.code}
              className="rounded-md border border-border bg-background/60 px-2.5 py-1.5"
            >
              <div className="mb-0.5 flex items-center gap-2">
                <span className="font-mono text-xs font-semibold tabular-nums text-primary">
                  {m.code}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  match {m.score}
                </span>
              </div>
              <div className="text-[11px] leading-snug text-foreground">{m.title}</div>
              {"evidence" in m && typeof (m as { evidence?: string }).evidence === "string" && (
                <div className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">
                  {(m as { evidence?: string }).evidence}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {citations.length > 0 && (
        <div className="mb-3 space-y-1">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Surse RAG
          </div>
          {citations.slice(0, 3).map((c) => (
            <a
              key={`${c.source}-${c.url ?? c.title}`}
              href={c.url ?? "#"}
              target={c.url ? "_blank" : undefined}
              rel={c.url ? "noreferrer" : undefined}
              className="block rounded-md border border-border bg-background/60 px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent/40"
            >
              <span className="font-medium text-foreground">{c.title}</span> · {c.source}
            </a>
          ))}
        </div>
      )}

      <Button size="sm" variant="outline" asChild className="w-full">
        <a href={searchUrl} target="_blank" rel="noreferrer">
          Verifică pe nomenclatorul oficial
          <ExternalLink className="size-3.5" />
        </a>
      </Button>
    </Card>
  );
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1">
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
      <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
    </span>
  );
}

function ChatEmptyState({ onPick }: { onPick: (q: string) => void }) {
  const suggestions = [
    "Vreau să-mi fac PFA. Pe unde încep?",
    "Cum îmi schimb buletinul după ce m-am mutat?",
    "Am nevoie de cazier judiciar — cum îl iau cel mai rapid?",
    "Ce acte trebuie pentru certificatul de naștere al copilului?",
    "Cât costă autorizația de construire pentru o casă?",
    "Cum se face intabularea unei proprietăți?",
  ];
  return (
    <div className="flex animate-[fade-in_0.4s_ease-out] flex-col items-center py-6 text-center">
      <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-accent">
        <Sparkles className="size-6 text-primary" />
      </div>
      <h3 className="mb-1 text-base font-semibold">Cu ce te ajut astăzi?</h3>
      <p className="mb-4 max-w-xs text-xs leading-relaxed text-muted-foreground">
        Vorbește natural — te ghidez prin orice procedură birocratică românească.
      </p>
      <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-left text-xs leading-relaxed transition-colors hover:bg-accent/40"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ApiKeyMissingState({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center justify-center px-6 py-10 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-warning/15">
        <KeyRound className="size-6 text-warning" />
      </div>
      <h3 className="mb-1.5 text-base font-semibold">Cheie API Gemini lipsă</h3>
      <p className="mb-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
        Adaugă <code className="rounded bg-muted px-1.5 py-0.5 text-xs">VITE_GEMINI_API_KEY</code>{" "}
        în fișierul <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env</code> și
        repornește serverul de dezvoltare.
      </p>
      <Link
        to="/settings"
        className="text-xs font-medium text-primary hover:underline"
      >
        Vezi setările →
      </Link>
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
