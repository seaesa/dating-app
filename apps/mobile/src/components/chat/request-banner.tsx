import LockKeyhole from "lucide-react-native/icons/lock-keyhole";
import * as React from "react";
import { View } from "react-native";

import type { RevealKind } from "@repo/api-contract";
import { Button, Icon, Text } from "@repo/ui";

import { REVEAL_NOUNS } from "@/chat/reveal";

export interface RequestBannerProps {
  kind: RevealKind;
  peerName: string;
  onDecline: () => void;
  onReview: () => void;
}

/** A request waiting on me sits right above the input, where I am already looking. */
export function RequestBanner({
  kind,
  peerName,
  onDecline,
  onReview,
}: RequestBannerProps) {
  return (
    <View className="mx-3 mb-2 flex-row items-center gap-3 rounded-2xl bg-primary-muted px-4 py-3">
      <Icon as={LockKeyhole} size={20} className="text-primary" />
      <Text className="flex-1 text-sm font-semibold text-foreground">
        {peerName} muốn mở {REVEAL_NOUNS[kind]} với bạn
      </Text>
      <Button size="sm" variant="ghost" onPress={onDecline} className="rounded-full">
        <Text>Từ chối</Text>
      </Button>
      <Button size="sm" onPress={onReview} className="rounded-full">
        <Text>Xem</Text>
      </Button>
    </View>
  );
}
