import { Image } from "expo-image";
import * as React from "react";
import { View } from "react-native";

import type { RevealKind } from "@repo/api-contract";
import { Button, Text } from "@repo/ui";

import { BottomSheet } from "./bottom-sheet";

import { maskPhone } from "@/chat/phone";
import { REVEAL_NOUNS } from "@/chat/reveal";

export type ConsentMode = "request" | "accept";

export interface ConsentSheetProps {
  visible: boolean;
  kind: RevealKind;
  mode: ConsentMode;
  peerName: string;
  myPhotoUrls: string[];
  myPhone: string | null | undefined;
  busy: boolean;
  onConfirm: () => void;
  onDecline?: () => void;
  onClose: () => void;
}

/** Shows exactly what of mine the other person will see before I agree. */
export function ConsentSheet({
  visible,
  kind,
  mode,
  peerName,
  myPhotoUrls,
  myPhone,
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
        <Text className="text-base text-muted-foreground">
          {accepting
            ? `Khi bạn đồng ý, hai bạn sẽ cùng thấy ${noun} của nhau.`
            : `Khi ${peerName} đồng ý, hai bạn sẽ cùng thấy ${noun} của nhau.`}
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-sm font-semibold text-foreground">
          {kind === "photos"
            ? "Ảnh của bạn sẽ được chia sẻ:"
            : "Số của bạn sẽ được chia sẻ:"}
        </Text>
        {kind === "photos" ? (
          <View className="flex-row gap-2">
            {myPhotoUrls.slice(0, 4).map((url) => (
              <Image
                key={url}
                source={{ uri: url }}
                style={{ width: 56, height: 56, borderRadius: 12 }}
                contentFit="cover"
              />
            ))}
          </View>
        ) : (
          <Text className="text-base font-bold text-foreground">
            {myPhone ? maskPhone(myPhone) : "—"}
          </Text>
        )}
      </View>

      <Button
        size="xl"
        disabled={busy}
        onPress={onConfirm}
        className="h-14 rounded-full bg-primary"
      >
        <Text className="text-base font-bold text-primary-foreground">
          {accepting ? `Đồng ý mở ${noun}` : "Gửi yêu cầu"}
        </Text>
      </Button>
      {accepting && onDecline ? (
        <Button variant="ghost" disabled={busy} onPress={onDecline}>
          <Text>Từ chối</Text>
        </Button>
      ) : null}
    </BottomSheet>
  );
}
