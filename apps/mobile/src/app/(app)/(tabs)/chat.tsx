import { FlashList } from "@shopify/flash-list";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import MessageCircle from "lucide-react-native/icons/message-circle";
import * as React from "react";
import { ActivityIndicator, RefreshControl, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  connectionsQuery,
  meQuery,
  type ConnectionSummaryRead,
} from "@repo/api-contract";
import { Icon, Text } from "@repo/ui";

import { ConnectionRow } from "@/components/chat/connection-row";
import { NewConnections } from "@/components/chat/new-connections";

const isFresh = (item: ConnectionSummaryRead) =>
  !item.lastMessage || item.lastMessage.event === "connected";

export default function ChatScreen() {
  const { data: me } = useQuery(meQuery());
  const list = useInfiniteQuery(connectionsQuery());
  const items = React.useMemo(
    () => list.data?.pages.flatMap((page) => page.items) ?? [],
    [list.data],
  );
  const fresh = items.filter(isFresh);
  const threads = items.filter((item) => !isFresh(item));
  const open = (item: ConnectionSummaryRead) =>
    router.push({
      pathname: "/(app)/chat/[connectionId]",
      params: { connectionId: item.id },
    });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="h-14 w-full flex-row items-center border-b border-border/40 px-5">
        <Text className="text-xl font-bold text-foreground">Tin nhắn</Text>
      </View>
      {list.isLoading || !me ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-4 p-6">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-primary/10">
            <Icon as={MessageCircle} size={40} className="text-primary" />
          </View>
          <Text className="text-xl font-bold text-foreground">Hộp thư trống</Text>
          <Text className="text-center text-sm text-muted-foreground">
            Khi cả hai bạn cùng thích nhau, cuộc trò chuyện ẩn danh sẽ bắt đầu tại đây.
          </Text>
        </View>
      ) : (
        <FlashList
          data={threads}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={<NewConnections items={fresh} onPress={open} />}
          renderItem={({ item }) => (
            <ConnectionRow item={item} myId={me.id} onPress={() => open(item)} />
          )}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching}
              onRefresh={() => void list.refetch()}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
