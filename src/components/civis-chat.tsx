import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Globe,
  ExternalLink,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  clearChatHistory,
  getChatHistoryEventSource,
  loadChatHistory,
  notifyChatHistoryChanged,
  saveChatHistory,
  type ChatWorkflowCta,
  type PersistedChatMessage,
} from "@/services/chatHistory";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { lookupCompanyByCui, type AnafLookupResult } from "@/services/anaf";
import { findCaen } from "@/services/caen";
import { suggestCaenWithRag, type RagCaenSuggestion } from "@/services/rag";

type AnafCard = {
  cui: string;
  state: "loading" | "done";
  result?: AnafLookupResult;
};

type CaenCard = {
  activitate: string;
  state: "loading" | "done";
  result?: RagCaenSuggestion;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
  streaming?: boolean;
  workflowCta?: ChatWorkflowCta;
  sources?: GroundingSource[];
  anaf?: AnafCard;
  caen?: CaenCard;
};

function loadPersistedMessages(): Message[] {
  return loadChatHistory().map((p) => ({
    id: p.id,
    role: p.role,
    text: p.text,
    createdAt: p.createdAt,
    workflowCta: p.workflowCta,
    sources: p.sources,
  }));
}

export function CivisChat() {
  const navigate = useNavigate();
  const profile = useVault((s) => s.profile);
  const open = useChatUi((s) => s.open);
  const initialQuery = useChatUi((s) => s.initialQuery);
  const openChat = useChatUi((s) => s.openChat);
  const closeChat = useChatUi((s) => s.closeChat);
  const onOpenChange = (next: boolean) => {
    if (next) openChat();
    else closeChat();
  };

  const apiKeyOk = useMemo(() => isApiKeyConfigured(), []);

  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const sessionRef = useRef<ChatSession | null>(null);
  const sessionKeyRef = useRef<string>("");

  const [messages, setMessages] = useState<Message[]>(() => loadPersistedMessages());
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  // Persist conversation history (text + lightweight metadata only — we
  // strip live function-call results like the ANAF lookup card to avoid
  // showing stale data on reload).
  useEffect(() => {
    try {
      const slim = messages
        .filter((m) => !m.streaming)
        .map(
          (m): PersistedChatMessage => ({
            id: m.id,
            role: m.role,
            text: m.text,
            createdAt: m.createdAt,
            workflowCta: m.workflowCta,
            sources: m.sources,
          }),
        );
      saveChatHistory(slim);
      notifyChatHistoryChanged("drawer");
    } catch {
      // Quota or privacy-mode failure — silent.
    }
  }, [messages]);

  useEffect(() => {
    const onHistoryChanged = (event: Event) => {
      if (getChatHistoryEventSource(event) === "drawer") return;
      const next = loadPersistedMessages();
      setMessages(next);
      if (next.length === 0) {
        sessionRef.current = null;
        sessionKeyRef.current = "";
      }
    };
    window.addEventListener(CHAT_HISTORY_EVENT, onHistoryChanged);
    return () => window.removeEventListener(CHAT_HISTORY_EVENT, onHistoryChanged);
  }, []);

  const clearChat = () => {
    setMessages([]);
    try {
      clearChatHistory();
      notifyChatHistoryChanged("drawer");
    } catch {
      // ignore
    }
    // Force a fresh session next send so the model doesn't reuse history.
    sessionRef.current = null;
    sessionKeyRef.current = "";
  };

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const consumedInitialRef = useRef<string | null>(null);

  // Re-key the session whenever the profile content meaningfully changes,
  // so vault edits propagate to the system prompt on the next chat open.
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
    [
      workflows.length,
      profile.fullName,
      profile.cnp,
      profile.address,
      profile.email,
      profile.phone,
    ],
  );

  useEffect(() => {
    govApi.listWorkflows().then(setWorkflows);
  }, []);

  // Session-level fallback flag: once a grounded request fails with a tool-
  // compatibility error, we disable Google Search for the rest of this session.
  const groundingDisabledRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (!apiKeyOk) return;
    if (workflows.length === 0) return;
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
  }, [open, apiKeyOk, profile, workflows, sessionKey]);

  useEffect(() => {
    if (!open) {
      consumedInitialRef.current = null;
    }
  }, [open]);

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

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        text: trimmed,
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
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        text: "",
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

      // Inner streaming routine, factored out so we can retry without grounding.
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
            // Fire the real ANAF lookup; render the result asynchronously
            // (we don't block the streaming text, the card animates in).
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
                console.warn("[civis] RAG CAEN suggestion failed, fallback remains local", err);
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
          // First-attempt failure: if Google Search grounding was enabled and
          // the error hints at tool incompatibility (common on free tier
          // when combining search + function calling), disable grounding and
          // retry once with a fresh session.
          const msg = err instanceof Error ? err.message : String(err);
          const looksLikeToolIncompat =
            !groundingDisabledRef.current &&
            /tool|search|400|invalid|unsupported|combination/i.test(msg);
          if (!looksLikeToolIncompat) throw err;

          console.warn(
            "[civis] Gemini rejected googleSearch + functionDeclarations combo; retrying without grounding. Original error:",
            err,
          );
          groundingDisabledRef.current = true;
          try {
            sessionRef.current = createChatSession(profile, workflows, {
              withGoogleSearch: false,
            });
            sessionKeyRef.current = sessionKey;
          } catch (recreateErr) {
            console.error("[civis] session recreate failed", recreateErr);
            throw err;
          }
          // Reset assistant bubble text and retry the same user message.
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
              workflowCta:
                msg.workflowCta ??
                (fallbackWf ? { id: fallbackWf.id, title: fallbackWf.title } : undefined),
            };
          }),
        );
      } catch (err) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        console.error("[civis] chat failed", err);
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
    [busy, apiKeyOk, profile, workflows, sessionKey],
  );

  useEffect(() => {
    if (!open) return;
    if (!initialQuery) return;
    if (consumedInitialRef.current === initialQuery) return;
    consumedInitialRef.current = initialQuery;
    // Defer one tick so the session ref settles after createChatSession effect.
    const handle = setTimeout(() => send(initialQuery), 50);
    return () => clearTimeout(handle);
  }, [open, initialQuery, send]);

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

  const openWorkflow = (id: string) => {
    onOpenChange(false);
    navigate({ to: "/workflow/$id", params: { id } });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] max-h-[85vh] focus-visible:outline-none">
        <DrawerHeader className="border-b border-border/60 text-left">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-gradient-hero flex items-center justify-center shadow-soft">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-base">Agentul Civis</DrawerTitle>
              <DrawerDescription className="text-xs">
                Întreabă orice despre birocrația din România.
              </DrawerDescription>
            </div>
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                aria-label="Șterge conversația"
                title="Șterge conversația"
              >
                <Trash2 className="size-4" />
              </Button>
            )}
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                Închide
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        {!apiKeyOk ? (
          <ApiKeyMissingState />
        ) : (
          <>
            <ScrollArea className="flex-1 px-4 py-4">
              <div ref={scrollRef} className="space-y-3 max-w-2xl mx-auto">
                {messages.length === 0 && <ChatEmptyState onPick={send} />}
                {messages.map((m) => (
                  <MessageBubble key={m.id} message={m} onOpenWorkflow={openWorkflow} />
                ))}
              </div>
            </ScrollArea>

            <div className="border-t border-border/60 bg-card/60 backdrop-blur-xl p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="max-w-2xl mx-auto"
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
                    className="min-h-[44px] max-h-32 resize-none pr-24 leading-relaxed"
                    disabled={busy}
                  />
                  <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
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
                          <MicOff className="size-4 text-destructive animate-pulse" />
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
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}

/* ---------- Subcomponents ---------- */

function MessageBubble({
  message,
  onOpenWorkflow,
}: {
  message: Message;
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
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed break-words shadow-soft",
            isUser
              ? "bg-primary text-primary-foreground rounded-br-md whitespace-pre-wrap"
              : "bg-card border border-border rounded-bl-md",
          )}
        >
          {message.text ? (
            <FormattedText text={message.text} />
          ) : message.streaming ? (
            <ThinkingDots />
          ) : (
            <span className="text-muted-foreground italic">(răspuns gol)</span>
          )}
          {message.streaming && message.text && (
            <span className="inline-block w-1 h-4 ml-0.5 align-text-bottom bg-current opacity-60 animate-pulse" />
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <SourcesStrip sources={message.sources} />
        )}

        {message.anaf && <AnafResultCard anaf={message.anaf} />}
        {message.caen && <CaenSuggestionCard caen={message.caen} />}

        {message.workflowCta && (
          <Card className="p-3 border-primary/30 bg-gradient-to-br from-card to-accent/30 animate-[fade-in_0.4s_ease-out]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-3.5 text-primary" />
              <span className="text-[11px] uppercase tracking-wider font-semibold text-primary">
                Ghid pas-cu-pas
              </span>
            </div>
            <div className="text-sm font-semibold mb-1">{message.workflowCta.title}</div>
            {message.workflowCta.reason && (
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                {message.workflowCta.reason}
              </p>
            )}
            <Button
              size="sm"
              className="w-full"
              onClick={() => onOpenWorkflow(message.workflowCta!.id)}
            >
              Deschide Ghidul Pas-cu-Pas
              <ArrowRight className="size-4" />
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function SourcesStrip({ sources }: { sources: GroundingSource[] }) {
  // Official Romanian-government domain hints — show a verified marker for these.
  const officialPattern =
    /\.(gov|mai|guv)\.ro$|^anaf\.ro$|^drpciv\.ro$|^onrc\.ro$|^ancpi\.ro$|^epasapoarte\.ro$|^ghiseul\.ro$|^politiaromana\.ro$|^mmuncii\.ro$|^mdlpa\.ro$/i;
  const isOfficial = (d: string) => officialPattern.test(d);

  return (
    <div className="rounded-xl border border-border bg-card/50 p-2.5 animate-[fade-in_0.4s_ease-out]">
      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
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
                "inline-flex items-center gap-1 max-w-full rounded-md border px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                official
                  ? "border-success/30 bg-success/5 text-success hover:bg-success/10"
                  : "border-border bg-background text-muted-foreground hover:bg-accent/40",
              )}
            >
              {official && <ShieldCheck className="size-3 shrink-0" aria-hidden />}
              <span className="truncate max-w-[140px]">{s.domain}</span>
              <ExternalLink className="size-2.5 shrink-0 opacity-60" aria-hidden />
            </a>
          );
        })}
        {sources.length > 6 && (
          <span className="inline-flex items-center text-[11px] text-muted-foreground px-1">
            +{sources.length - 6} surse
          </span>
        )}
      </div>
    </div>
  );
}

function FormattedText({ text }: { text: string }) {
  // GFM-flavored markdown via react-markdown. Tailwind classes shape the
  // typography so the bubble keeps its tight, readable look. External
  // links get target="_blank" automatically.
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
          ul: (props) => <ul {...props} className="list-disc pl-5 my-1.5 space-y-0.5" />,
          ol: (props) => <ol {...props} className="list-decimal pl-5 my-1.5 space-y-0.5" />,
          p: (props) => <p {...props} className="my-1.5 first:mt-0 last:mb-0" />,
          strong: (props) => <strong {...props} className="font-semibold" />,
          code: (props) => (
            <code {...props} className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono" />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

function AnafResultCard({ anaf }: { anaf: AnafCard }) {
  if (anaf.state === "loading") {
    return (
      <Card className="p-3 border-primary/30 bg-card animate-[fade-in_0.3s_ease-out]">
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
      <Card className="p-3 border-warning/30 bg-warning/5 animate-[fade-in_0.3s_ease-out]">
        <div className="flex items-start gap-2">
          <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-warning uppercase tracking-wider">
              ANAF · CUI {anaf.cui}
            </div>
            <p className="text-sm mt-1 leading-relaxed">{reason}</p>
          </div>
        </div>
      </Card>
    );
  }
  const c = anaf.result.company;
  return (
    <Card className="p-3 border-success/30 bg-success/5 animate-[fade-in_0.3s_ease-out]">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="size-4 text-success" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-success">
          ANAF · înregistrat oficial
        </span>
        <a
          href={`https://www.anaf.ro/inforegcom/faces/index.xhtml?cui=${encodeURIComponent(c.cui)}`}
          target="_blank"
          rel="noreferrer"
          className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1"
        >
          Vezi pe ANAF <ExternalLink className="size-3" />
        </a>
      </div>
      <div className="flex items-start gap-2">
        <Building2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        <div className="min-w-0">
          <div className="text-sm font-semibold break-words">{c.denumire || "(fără denumire)"}</div>
          <div className="text-xs text-muted-foreground break-words">{c.adresa}</div>
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
  const source = caen.result?.source ?? "local_fallback";
  const citations = caen.result?.citations ?? [];
  const searchUrl = `https://www.caen.ro/?s=${encodeURIComponent(caen.activitate)}`;

  if (caen.state === "loading") {
    return (
      <Card className="p-3 border-primary/30 bg-card animate-[fade-in_0.3s_ease-out]">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary">
          <Loader2 className="size-3.5 animate-spin" />
          Caut sugestii CAEN prin baza de cunoștințe…
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 border-primary/30 bg-card animate-[fade-in_0.3s_ease-out]">
      <div className="flex items-center gap-2 mb-1.5">
        <Sparkles className="size-3.5 text-primary" />
        <span className="text-[11px] uppercase tracking-wider font-semibold text-primary">
          CAEN · sugestii
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
          {source === "supabase_rag" ? "RAG" : "fallback local"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
        Pentru: <em>{caen.activitate}</em>
      </p>

      {matches.length === 0 ? (
        <p className="text-xs text-muted-foreground mb-2">
          Nu am găsit coduri în nomenclatorul local. Deschide căutarea oficială.
        </p>
      ) : (
        <ul className="space-y-1.5 mb-3">
          {matches.map((m) => (
            <li
              key={m.code}
              className="rounded-md border border-border bg-background/60 px-2.5 py-1.5"
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono tabular-nums text-xs font-semibold text-primary">
                  {m.code}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  match {m.score}
                </span>
              </div>
              <div className="text-[11px] text-foreground leading-snug">{m.title}</div>
              {"evidence" in m && typeof (m as { evidence?: string }).evidence === "string" && (
                <div className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
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
      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" />
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
    <div className="py-6 flex flex-col items-center text-center animate-[fade-in_0.4s_ease-out]">
      <div className="size-14 rounded-2xl bg-accent flex items-center justify-center mb-3">
        <Sparkles className="size-6 text-primary" />
      </div>
      <h3 className="text-base font-semibold mb-1">Cu ce te ajut astăzi?</h3>
      <p className="text-xs text-muted-foreground max-w-xs mb-4 leading-relaxed">
        Vorbește natural — te ghidez prin orice procedură birocratică românească.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left text-xs rounded-xl border border-border bg-card hover:bg-accent/40 transition-colors px-3 py-2.5 leading-relaxed"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ApiKeyMissingState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="size-14 rounded-2xl bg-warning/15 flex items-center justify-center mb-4">
        <KeyRound className="size-6 text-warning" />
      </div>
      <h3 className="text-base font-semibold mb-1.5">Cheie API Gemini lipsă</h3>
      <p className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-4">
        Adaugă <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_GEMINI_API_KEY</code>{" "}
        în fișierul <code className="text-xs bg-muted px-1.5 py-0.5 rounded">.env</code> și
        repornește serverul de dezvoltare.
      </p>
      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-primary font-medium hover:underline"
      >
        Obține o cheie din Google AI Studio →
      </a>
    </div>
  );
}
