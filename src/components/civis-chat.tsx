// Global chat drawer — opened from the FAB or any `useChatUi().openChat()` call.
// All chat behaviour (messages, streaming, persistence, composer) lives in the
// shared `<AgentChatPanel/>` so the dedicated `/chat` route can render the same
// experience without duplicating logic.

import { ExternalLink, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useChatUi } from "@/store";
import { AgentChatPanel } from "@/components/chat/agent-chat-panel";

export function ActeAIChat() {
  const navigate = useNavigate();
  const open = useChatUi((s) => s.open);
  const initialQuery = useChatUi((s) => s.initialQuery);
  const currentSessionId = useChatUi((s) => s.currentSessionId);
  const openChat = useChatUi((s) => s.openChat);
  const closeChat = useChatUi((s) => s.closeChat);
  const startNewSession = useChatUi((s) => s.startNewSession);

  const onOpenChange = (next: boolean) => {
    if (next) openChat();
    else closeChat();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[85vh] max-h-[85vh] focus-visible:outline-none">
        <DrawerHeader className="border-b border-border/60 text-left">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-tricolor-flag shadow-soft">
              <MessageCircle className="size-4 text-white drop-shadow" />
            </div>
            <div className="min-w-0 flex-1">
              <DrawerTitle className="text-base">Agentul ActeAI</DrawerTitle>
              <DrawerDescription className="text-xs">
                Întreabă orice despre birocrația din România.
              </DrawerDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              asChild
              title="Deschide istoricul complet"
            >
              <Link
                to="/chat"
                onClick={() => closeChat()}
              >
                <ExternalLink className="size-3.5" />
                Pagina chat
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => startNewSession()}
              title="Pornește o conversație nouă"
            >
              Chat nou
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                Închide
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <AgentChatPanel
          source="drawer"
          sessionFilter={currentSessionId}
          initialQuery={initialQuery}
          onWorkflowOpen={(id) => {
            closeChat();
            navigate({ to: "/workflow/$id", params: { id } });
          }}
        />
      </DrawerContent>
    </Drawer>
  );
}
