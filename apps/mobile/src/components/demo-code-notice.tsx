import MessageSquareText from "lucide-react-native/icons/message-square-text";
import * as React from "react";
import { Pressable, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_NAME } from "@repo/core";
import { Icon, Text } from "@repo/ui";

export interface DemoCodeNoticeProps {
  code: string;
  onUse: (code: string) => void;
}

/**
 * Stands in for the SMS on a demo server (SMS_PROVIDER=console), where the API
 * returns the code instead of sending it. Looks like the message would.
 */
export function DemoCodeNotice({ code, onUse }: DemoCodeNoticeProps) {
  // Absolute children ignore SafeAreaView's padding: offset below the status bar.
  const { top } = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={{ top: top + 8 }}
      className="absolute inset-x-3 z-10"
    >
      <Animated.View entering={FadeInUp} exiting={FadeOutUp}>
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Điền mã"
          onPress={() => onUse(code)}
          className="flex-row items-center gap-3 rounded-2xl border border-border/80 bg-card p-3.5 shadow-lg shadow-black/10 active:opacity-90"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-muted">
            <Icon as={MessageSquareText} size={20} className="text-primary" />
          </View>
          <View className="flex-1">
            <Text className="text-xs text-muted-foreground">Tin nhắn · bây giờ</Text>
            <Text className="text-sm text-foreground">
              Mã xác nhận {APP_NAME} của bạn là{" "}
              <Text className="text-sm font-bold text-foreground">{code}</Text>
            </Text>
          </View>
          <Text className="text-sm font-bold text-primary">Điền</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
