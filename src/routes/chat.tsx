import { createFileRoute } from "@tanstack/react-router";
import { History, MessageCircle, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/dashboard/page-header";
import { AgentChatPanel } from "@/components/chat/agent-chat-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useChatUi } from "@/store";
import {
  CHAT_HISTORY_EVENT,
  buildConversations,
  clearChatHistory,
  loadChatHistory,
  notifyChatHistoryChanged,
  type PersistedChatMessage,
} from "@/services/chatHistory";
import { isApiKeyConfigured } from "@/services/aiConfig";

export const Route = createFileRoute("/chat")({ component: ChatPage });

function ChatPage() {
  const currentSessionId = useChatUi((s) => s.currentSessionId);
  const setSessionId = useChatUi((s) => s.setSessionId);
  const startNewSession = useChatUi((s) => s.startNewSession);

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

  const conversations = useMemo(() => buildConversations(history), [history]);
  const newest = useMemo(
    () =>
      [...conversations].sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.startedAt ?? 0).getTime() -
          new Date(a.updatedAt ?? a.startedAt ?? 0).getTime(),
      ),
    [conversations],
  );

  const aiEnabled = isApiKeyConfigured();

  const startNew = () => {
    startNewSession();
  };

  const clearAll = () => {
    clearChatHistory();
    setHistory([]);
    notifyChatHistoryChanged("page");
    startNewSession();
  };

  const activeConversation = conversations.find((c) => c.id === currentSessionId);
  const activeTitle = activeConversation?.title ?? "Conversație nouă";
  const activeCount = activeConversation?.messages.length ?? 0;

  return (
    <AppShell>
      <PageHeader
        title="Chat ActeAI"
        description="Conversațiile tale rămân pe acest dispozitiv. Schimbă între ele din panoul din stânga."
      >
        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <Button size="sm" variant="outline" onClick={clearAll}>
              <Trash2 className="size-4" />
              Șterge tot
            </Button>
          )}
          <Button size="sm" onClick={startNew}>
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
              Conversații
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{newest.length}</span>
          </div>
          <ScrollArea className="h-[640px]">
            {newest.length === 0 ? (
              <div className="flex h-[640px] flex-col items-center justify-center px-6 text-center">
                <MessageCircle className="mb-3 size-9 text-muted-foreground" />
                <p className="text-sm font-medium">Nu există conversații salvate</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Pune o întrebare în dreapta și apare aici automat.
                </p>
              </div>
            ) : (
              <div className="p-2">
                {newest.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSessionId(conv.id)}
                    className={cn(
                      "mb-1 w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      currentSessionId === conv.id
                        ? "border-primary/40 bg-primary/10"
                        : "border-transparent hover:border-border hover:bg-accent/45",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="line-clamp-1 text-sm font-medium">{conv.title}</span>
                      {conv.updatedAt && (
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {formatShortDate(conv.updatedAt)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">
                      {conv.preview}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {conv.messages.length}{" "}
                      {conv.messages.length === 1 ? "mesaj" : "mesaje"}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        <Card className="flex h-[700px] min-w-0 flex-col overflow-hidden p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <div className="line-clamp-1 text-sm font-semibold">{activeTitle}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {activeCount > 0
                  ? `${activeCount} ${activeCount === 1 ? "mesaj" : "mesaje"} salvate local`
                  : "Începe conversația scriind mai jos."}
              </div>
            </div>
          </div>

          <AgentChatPanel
            key={currentSessionId}
            source="page"
            sessionFilter={currentSessionId}
            containerClassName="px-4 py-4"
          />
        </Card>
      </div>
    </AppShell>
  );
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" });
}
