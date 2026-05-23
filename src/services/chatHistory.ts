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
  /**
   * Logical conversation id. Messages without a sessionId are treated as
   * legacy and grouped by time-gap when displayed in the history list.
   */
  sessionId?: string;
  workflowCta?: ChatWorkflowCta;
  sources?: GroundingSource[];
};

export const CHAT_STORAGE_KEY = "civis-chat-history";
export const CHAT_HISTORY_EVENT = "civis-chat-history-updated";
export const MAX_PERSISTED_MESSAGES = 200;

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
        sessionId: typeof msg.sessionId === "string" ? msg.sessionId : undefined,
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

/* ---------- Conversation grouping ---------- */

export type ChatConversation = {
  id: string;
  /** True when this conversation was synthesized from legacy (un-tagged) messages. */
  isLegacy: boolean;
  title: string;
  preview: string;
  startedAt?: string;
  updatedAt?: string;
  messages: PersistedChatMessage[];
};

const SESSION_TIME_GAP_MS = 30 * 60 * 1000;

/**
 * Groups stored messages into conversations:
 *   - explicit sessionId → one bucket per id
 *   - legacy messages (no sessionId) → split when time gap > 30 min
 *
 * The synthetic bucket ids (`__legacy_N`) are stable for the lifetime of the
 * stored messages, so the UI can route to a specific legacy bucket and the
 * panel can load it back. Add new sessionId-tagged messages to bring stuff
 * out of legacy buckets organically.
 */
export function buildConversations(messages: PersistedChatMessage[]): ChatConversation[] {
  if (messages.length === 0) return [];

  const groups = new Map<string, { messages: PersistedChatMessage[]; isLegacy: boolean }>();
  const legacy: PersistedChatMessage[] = [];

  for (const msg of messages) {
    if (msg.sessionId) {
      const existing = groups.get(msg.sessionId);
      if (existing) existing.messages.push(msg);
      else groups.set(msg.sessionId, { messages: [msg], isLegacy: false });
    } else {
      legacy.push(msg);
    }
  }

  if (legacy.length > 0) {
    let bucketIndex = 0;
    let bucket: PersistedChatMessage[] = [];
    let lastTime = 0;
    const finalize = () => {
      if (bucket.length === 0) return;
      groups.set(`__legacy_${bucketIndex}`, { messages: bucket, isLegacy: true });
      bucketIndex += 1;
      bucket = [];
    };
    for (const msg of legacy) {
      const t = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
      const gap = lastTime > 0 ? t - lastTime : 0;
      if (bucket.length > 0 && (gap > SESSION_TIME_GAP_MS || gap < 0)) finalize();
      bucket.push(msg);
      lastTime = t;
    }
    finalize();
  }

  return Array.from(groups.entries()).map(([id, { messages: msgs, isLegacy }]) => {
    const first = msgs[0];
    const last = msgs[msgs.length - 1];
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
    return {
      id,
      isLegacy,
      title: titleFrom(lastUser?.text ?? first.text),
      preview: trimText((lastAssistant ?? first).text, 110),
      startedAt: first.createdAt,
      updatedAt: last.createdAt,
      messages: msgs,
    };
  });
}

/** Returns just the messages for one conversation id, including legacy buckets. */
export function loadMessagesForConversation(
  id: string | null | undefined,
): PersistedChatMessage[] {
  const all = loadChatHistory();
  if (!id) return all;
  if (id.startsWith("__legacy_")) {
    const conv = buildConversations(all).find((c) => c.id === id);
    return conv?.messages ?? [];
  }
  return all.filter((m) => m.sessionId === id);
}

function titleFrom(text: string): string {
  const trimmed = trimText(text.replace(/\s+/g, " "), 64);
  return trimmed || "Conversație";
}

function trimText(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}
