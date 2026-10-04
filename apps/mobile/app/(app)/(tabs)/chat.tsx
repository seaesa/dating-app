import * as React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "@repo/ui";

export default function ChatScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="h-14 w-full flex-row items-center justify-between border-b border-border/40 px-5">
        <Text className="text-xl font-bold text-foreground">Tin nhắn & Trò chuyện</Text>
      </View>
      <View className="flex-1 items-center justify-center gap-4 p-6">
        <View className="h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-4xl">💬</Text>
        </View>

        <Text className="text-xl font-bold text-foreground">Hộp thư trống</Text>
        <Text className="text-center text-sm text-muted-foreground">
          Khi cả hai bạn cùng thích nhau, cuộc trò chuyện ẩn danh sẽ bắt đầu tại đây.
        </Text>
      </View>
    </SafeAreaView>
  );
}
