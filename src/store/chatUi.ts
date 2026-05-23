import { create } from "zustand";

// Ephemeral chat drawer state. Intentionally NOT persisted — reopening the
// app should not auto-open the chat sheet, and there's no need to survive
// reloads. Any page can call openChat() with an optional seed query.

type ChatUiState = {
  open: boolean;
  initialQuery: string | null;
  /**
   * Active conversation id. New sessions are minted here so both the drawer
   * and the dedicated chat page tag persisted messages with the same id and
   * group correctly in the history list.
   */
  currentSessionId: string;
  openChat: (query?: string) => void;
  closeChat: () => void;
  startNewSession: () => string;
  setSessionId: (id: string) => void;
};

function newSessionId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useChatUi = create<ChatUiState>((set) => ({
  open: false,
  initialQuery: null,
  currentSessionId: newSessionId(),
  openChat: (query) => set({ open: true, initialQuery: query ?? null }),
  closeChat: () => set({ open: false, initialQuery: null }),
  startNewSession: () => {
    const id = newSessionId();
    set({ currentSessionId: id });
    return id;
  },
  setSessionId: (id) => set({ currentSessionId: id }),
}));
