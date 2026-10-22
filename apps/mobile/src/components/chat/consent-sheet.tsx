import * as React from "react";
import { View } from "react-native";

import type { RevealKind } from "@repo/api-contract";
import { Button, Text } from "@repo/ui";

import { BottomSheet } from "./bottom-sheet";

import { REVEAL_NOUNS } from "@/chat/reveal";

export type ConsentMode = "request" | "accept";

export interface ConsentSheetProps {
  visible: boolean;
  kind: RevealKind;
  mode: ConsentMode;
  peerName: string;
  busy: boolean;
  onConfirm: () => void;
  onDecline?: () => void;
  onClose: () => void;
}

/** Asks before a reveal is requested or accepted. */
export function ConsentSheet({
  visible,
  kind,
  mode,
  peerName,
  busy,
  onConfirm,
  onDecline,
  onClose,
}: ConsentSheetProps) {
  const noun = REVEAL_NOUNS[kind];
  const accepting = mode === "accept";
  return (
    <BottomSheet visible={visible} onClose={onClose} className="gap-4">
      <View className="gap-1">
        <Text className="text-xl font-bold text-foreground">
          {accepting
            ? `${peerName} muốn mở ${noun} với bạn`
            : `Mở ${noun} với ${peerName}?`}
        </Text>
        <Text className="text-xs text-muted-foreground leading-4">
          {accepting
            ? `Khi bạn đồng ý, hai bạn sẽ cùng thấy ${noun} của nhau.`
            : `Khi ${peerName} đồng ý, hai bạn sẽ cùng thấy ${noun} của nhau.`}
        </Text>
      </View>

      <View className="gap-2 pt-1">
        <Button
          size="default"
          disabled={busy}
          onPress={onConfirm}
          className="h-12 rounded-full bg-primary"
        >
          <Text className="text-sm font-bold text-primary-foreground">
            {accepting ? `Đồng ý mở ${noun}` : "Gửi yêu cầu"}
          </Text>
        </Button>
        {accepting && onDecline ? (
          <Button
            variant="ghost"
            disabled={busy}
            onPress={onDecline}
            className="h-10 rounded-full"
          >
            <Text className="text-sm text-muted-foreground">Từ chối</Text>
          </Button>
        ) : null}
      </View>
    </BottomSheet>
  );
}
