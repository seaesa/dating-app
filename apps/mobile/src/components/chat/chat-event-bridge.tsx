import { useChatEvents } from "@/chat/use-chat-events";

/** Mounted once inside the signed-in layout; renders nothing. */
export function ChatEventBridge() {
  useChatEvents();
  return null;
}
