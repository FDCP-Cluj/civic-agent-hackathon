import type { GroundingSource } from "@/services/geminiChat";

export type ChatWorkflowCta = {
  id: string;
  title: string;
  reason?: string;
};

export type PersistedChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
  workflowCta?: ChatWorkflowCta;
  sources?: GroundingSource[];
};

export const CHAT_STORAGE_KEY = "civis-chat-history";
export const CHAT_HISTORY_EVENT = "civis-chat-history-updated";
export const MAX_PERSISTED_MESSAGES = 60;

export type ChatHistorySource = "drawer" | "page";

export function loadChatHistory(): PersistedChatMessage[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(-MAX_PERSISTED_MESSAGES).map((p) => {
      const msg = p as Partial<PersistedChatMessage>;
      return {
        id: msg.id ?? crypto.randomUUID(),
        role: msg.role === "user" ? "user" : "assistant",
        text: String(msg.text ?? ""),
        createdAt: typeof msg.createdAt === "string" ? msg.createdAt : undefined,
        workflowCta: msg.workflowCta,
        sources: msg.sources,
      };
    });
  } catch {
    return [];
  }
}

export function saveChatHistory(messages: PersistedChatMessage[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_PERSISTED_MESSAGES)));
}

export function clearChatHistory(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(CHAT_STORAGE_KEY);
}

export function notifyChatHistoryChanged(source: ChatHistorySource): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHAT_HISTORY_EVENT, { detail: { source } }));
}

export function getChatHistoryEventSource(event: Event): ChatHistorySource | undefined {
  if (!(event instanceof CustomEvent)) return undefined;
  const source = (event.detail as { source?: unknown } | undefined)?.source;
  return source === "drawer" || source === "page" ? source : undefined;
}
