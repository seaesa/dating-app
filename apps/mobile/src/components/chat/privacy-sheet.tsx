import Check from "lucide-react-native/icons/check";
import Images from "lucide-react-native/icons/images";
import * as React from "react";
import { View } from "react-native";

import type { RevealKind, RevealsRead } from "@repo/api-contract";
import { Button, Icon, Text } from "@repo/ui";

import { BottomSheet } from "./bottom-sheet";

import { chipState, REVEAL_KINDS } from "@/chat/reveal";

const ROW = {
  photos: { icon: Images, label: "Ảnh" },
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
        <Text className="text-xl font-bold text-foreground">Mở ảnh</Text>
        <Text className="text-sm text-muted-foreground">
          Chỉ mở khi cả hai đồng ý, và hai bạn cùng thấy của nhau.
        </Text>
      </View>
      {REVEAL_KINDS.map((kind) => {
        const state = chipState(reveals[kind], myId);
        return (
          <View key={kind} className="min-h-12 flex-row items-center gap-3">
            <Icon as={ROW[kind].icon} size={20} className="text-muted-foreground" />
            <Text className="flex-1 text-base text-foreground">{ROW[kind].label}</Text>
            {state === "granted" ? (
              <View className="flex-row items-center gap-1">
                <Icon as={Check} size={16} className="text-success" />
                <Text className="text-sm font-semibold text-success">Đã mở</Text>
              </View>
            ) : state === "outgoing" ? (
              <Text className="text-sm text-muted-foreground">Đang chờ {peerName}</Text>
            ) : (
              <Button
                size="sm"
                variant={state === "incoming" ? "default" : "outline"}
                onPress={() => onPick(kind)}
                className="rounded-full"
              >
                <Text>{state === "incoming" ? "Xem yêu cầu" : "Yêu cầu"}</Text>
              </Button>
            )}
          </View>
        );
      })}
    </BottomSheet>
  );
}
