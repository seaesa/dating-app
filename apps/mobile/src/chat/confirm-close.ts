import { Alert } from "react-native";

import type { CloseReason } from "@repo/api-contract";

const COPY: Record<
  CloseReason,
  { title: (peer: string) => string; body: (peer: string) => string; action: string }
> = {
  unmatch: {
    title: (peer) => `Hủy kết nối với ${peer}?`,
    body: () => "Cả hai sẽ không còn thấy cuộc trò chuyện và các thông tin đã mở.",
    action: "Hủy kết nối",
  },
  block: {
    title: (peer) => `Chặn ${peer}?`,
    body: () => "Cả hai sẽ không còn thấy cuộc trò chuyện và các thông tin đã mở.",
    action: "Chặn",
  },
};

/** Destructive, so it says what the person loses before doing it. */
export function confirmClose(
  peerName: string,
  reason: CloseReason,
  close: (reason: CloseReason) => Promise<void>,
  onClosed: () => void,
): void {
  const copy = COPY[reason];
  Alert.alert(copy.title(peerName), copy.body(peerName), [
    { text: "Hủy", style: "cancel" },
    {
      text: copy.action,
      style: "destructive",
      onPress: () =>
        void close(reason)
          .then(onClosed)
          .catch(() => Alert.alert("Chưa thực hiện được", "Thử lại sau ít phút nhé.")),
    },
  ]);
}
