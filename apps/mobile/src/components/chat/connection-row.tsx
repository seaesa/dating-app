import * as React from "react";
import { Pressable, View } from "react-native";

import type { ConnectionSummaryRead } from "@repo/api-contract";
import { Text } from "@repo/ui";

import { PeerAvatar } from "./peer-avatar";
import { VerifiedName } from "./verified-name";

import { formatTime } from "@/chat/messages";
import { chipState, REVEAL_KINDS, REVEAL_NOUNS } from "@/chat/reveal";
import { previewText } from "@/chat/system-copy";

export interface ConnectionRowProps {
  item: ConnectionSummaryRead;
  myId: string;
  onPress: () => void;
}

export function ConnectionRow({ item, myId, onPress }: ConnectionRowProps) {
  const { profile, identity } = item.peer;
  const unread = item.unreadCount > 0;
  const incoming = REVEAL_KINDS.find(
    (kind) => chipState(item.reveals[kind], myId) === "incoming",
  );
  // "Your turn" only once the messages are read: before that the unread
  // count already says the same thing.
  const yourTurn = item.yourTurn && !unread;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Trò chuyện với ${profile.displayName}`}
      className="flex-row items-center gap-3 px-5 py-3 active:bg-secondary"
    >
      <PeerAvatar photoUrl={identity?.photoUrls?.[0]} gender={profile.gender} size={52} />
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center justify-between gap-2">
          <VerifiedName
            name={profile.displayName}
            age={profile.age}
            verified={profile.verified}
            isVip={profile.isVip}
            vipPlan={profile.vipPlan}
            className="text-base"
          />
          <Text className="text-xs text-muted-foreground">
            {formatTime(item.lastActivityAt)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text
            className={
              unread || incoming
                ? "flex-1 text-sm font-semibold text-foreground"
                : "flex-1 text-sm text-muted-foreground"
            }
            numberOfLines={1}
          >
            {incoming
              ? `${profile.displayName} muốn mở ${REVEAL_NOUNS[incoming]} với bạn`
              : previewText(item.lastMessage, myId, profile.displayName)}
          </Text>
          {unread ? (
            <View className="min-w-5 items-center rounded-full bg-primary px-1.5">
              <Text className="text-xs font-bold text-primary-foreground">
                {item.unreadCount > 99 ? "99+" : item.unreadCount}
              </Text>
            </View>
          ) : yourTurn ? (
            <Text className="text-xs font-semibold text-primary">Đến lượt bạn</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
