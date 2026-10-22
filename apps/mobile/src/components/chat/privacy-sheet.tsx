import Check from "lucide-react-native/icons/check";
import Images from "lucide-react-native/icons/images";
import * as React from "react";
import { View } from "react-native";

import type { RevealKind, RevealsRead } from "@repo/api-contract";
import { Button, Icon, Text } from "@repo/ui";

import { BottomSheet } from "./bottom-sheet";

import { chipState, REVEAL_KINDS } from "@/chat/reveal";

const ROW = {
  photos: { icon: Images, label: "Ảnh & thông tin cá nhân" },
} as const;

export interface PrivacySheetProps {
  visible: boolean;
  reveals: RevealsRead;
  myId: string;
  peerName: string;
  onPick: (kind: RevealKind) => void;
  onClose: () => void;
}

/**
 * Where a person chooses, deliberately, to ask for more. Kept in the header
 * rather than beside the send button: revealing is rare and cannot be taken
 * back, so it should never be one stray tap away.
 */
export function PrivacySheet({
  visible,
  reveals,
  myId,
  peerName,
  onPick,
  onClose,
}: PrivacySheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} className="gap-4">
      <View className="gap-1">
        <Text className="text-xl font-bold text-foreground">Mở ảnh & thông tin</Text>
        <Text className="text-xs text-muted-foreground leading-4">
          Chỉ mở khi cả hai đồng ý, và hai bạn cùng thấy của nhau.
        </Text>
      </View>
      <View className="gap-2.5">
        {REVEAL_KINDS.map((kind) => {
          const state = chipState(reveals[kind], myId);
          return (
            <View
              key={kind}
              className="flex-row items-center justify-between rounded-2xl border border-border/70 bg-secondary/35 p-3.5 gap-3"
            >
              <View className="flex-1 flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon as={ROW[kind].icon} size={20} className="text-primary" />
                </View>
                <Text className="flex-1 text-sm font-semibold text-foreground">
                  {ROW[kind].label}
                </Text>
              </View>
              {state === "granted" ? (
                <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1">
                  <Icon as={Check} size={14} className="text-emerald-600" />
                  <Text className="text-xs font-semibold text-emerald-600">Đã mở</Text>
                </View>
              ) : state === "outgoing" ? (
                <Text className="text-xs text-muted-foreground">Đang chờ {peerName}</Text>
              ) : (
                <Button
                  size="sm"
                  variant={state === "incoming" ? "default" : "outline"}
                  onPress={() => onPick(kind)}
                  className="h-9 rounded-full px-4"
                >
                  <Text className="text-xs font-semibold">
                    {state === "incoming" ? "Xem yêu cầu" : "Yêu cầu"}
                  </Text>
                </Button>
              )}
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
}
