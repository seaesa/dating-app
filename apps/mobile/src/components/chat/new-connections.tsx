import * as React from "react";
import { Pressable, ScrollView, View } from "react-native";

import type { ConnectionSummaryRead } from "@repo/api-contract";
import { Text } from "@repo/ui";

import { PeerAvatar } from "./peer-avatar";

export interface NewConnectionsProps {
  items: ConnectionSummaryRead[];
  onPress: (item: ConnectionSummaryRead) => void;
}

/** Rooms nobody has written in yet, like Tinder's "New matches" row. */
export function NewConnections({ items, onPress }: NewConnectionsProps) {
  if (items.length === 0) return null;
  return (
    <View className="gap-2 py-3">
      <Text className="px-5 text-sm font-bold text-muted-foreground">Kết nối mới</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-4 px-5"
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onPress(item)}
            accessibilityLabel={`Bắt đầu trò chuyện với ${item.peer.profile.displayName}`}
            className="w-16 items-center gap-1"
          >
            <PeerAvatar
              photoUrl={item.peer.identity?.photoUrls?.[0]}
              gender={item.peer.profile.gender}
              size={60}
            />
            <Text className="text-xs font-medium text-foreground" numberOfLines={1}>
              {item.peer.profile.displayName}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
