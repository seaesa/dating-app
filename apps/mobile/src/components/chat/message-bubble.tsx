import * as Clipboard from "expo-clipboard";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Clock from "lucide-react-native/icons/clock";
import * as React from "react";
import { Alert, Pressable, View } from "react-native";

import { cn, Icon, Text } from "@repo/ui";

import { formatTime, type ChatMessage } from "@/chat/messages";

export interface MessageBubbleProps {
  message: ChatMessage;
  mine: boolean;
  startsGroup: boolean;
  endsGroup: boolean;
  seen: boolean;
  onRetry: (message: ChatMessage) => void;
}

function Meta({
  message,
  mine,
  seen,
}: {
  message: ChatMessage;
  mine: boolean;
  seen: boolean;
}) {
  if (message.localStatus === "failed") {
    return (
      <View className="mt-0.5 flex-row items-center gap-1">
        <Icon as={CircleAlert} size={12} className="text-destructive" />
        <Text className="text-xs text-destructive">Chưa gửi được · Chạm để gửi lại</Text>
      </View>
    );
  }
  if (message.localStatus === "sending") {
    return <Icon as={Clock} size={12} className="mt-0.5 text-muted-foreground" />;
  }
  return (
    <Text className="mt-0.5 text-xs text-muted-foreground">
      {formatTime(message.createdAt)}
      {mine && seen ? " · Đã xem" : ""}
    </Text>
  );
}

export function MessageBubble({
  message,
  mine,
  startsGroup,
  endsGroup,
  seen,
  onRetry,
}: MessageBubbleProps) {
  const failed = message.localStatus === "failed";
  const showMeta = endsGroup || seen || message.localStatus !== undefined;
  const copy = () =>
    Alert.alert("Tin nhắn", undefined, [
      {
        text: "Sao chép",
        onPress: () => void Clipboard.setStringAsync(message.body ?? ""),
      },
      { text: "Hủy", style: "cancel" },
    ]);
  return (
    <View
      className={cn(
        "px-4",
        startsGroup ? "mt-3" : "mt-0.5",
        mine ? "items-end" : "items-start",
      )}
    >
      <Pressable
        onLongPress={copy}
        onPress={failed ? () => onRetry(message) : undefined}
        accessibilityHint={failed ? "Chạm để gửi lại" : undefined}
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          mine ? "bg-primary" : "bg-secondary",
          message.localStatus === "sending" && "opacity-60",
        )}
      >
        <Text
          className={
            mine ? "text-base text-primary-foreground" : "text-base text-foreground"
          }
        >
          {message.body}
        </Text>
      </Pressable>
      {showMeta ? <Meta message={message} mine={mine} seen={seen} /> : null}
    </View>
  );
}
