import { create } from "zustand";

// Ephemeral chat drawer state. Intentionally NOT persisted — reopening the
// app should not auto-open the chat sheet, and there's no need to survive
// reloads. Any page can call openChat() with an optional seed query.

type ChatUiState = {
  open: boolean;
  initialQuery: string | null;
  openChat: (query?: string) => void;
  closeChat: () => void;
};

export const useChatUi = create<ChatUiState>((set) => ({
  open: false,
  initialQuery: null,
  openChat: (query) => set({ open: true, initialQuery: query ?? null }),
  closeChat: () => set({ open: false, initialQuery: null }),
}));
