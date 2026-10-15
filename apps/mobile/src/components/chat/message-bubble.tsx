import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import CircleAlert from "lucide-react-native/icons/circle-alert";
import Clock from "lucide-react-native/icons/clock";
import EyeOff from "lucide-react-native/icons/eye-off";
import ImageOff from "lucide-react-native/icons/image-off";
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
  /** A peer's image before the pair opened photos: blurred until tapped. */
  blurred: boolean;
  onRetry: (message: ChatMessage) => void;
  onOpenImage: (url: string) => void;
}

const IMAGE_WIDTH = 240;

function ImageContent({
  message,
  blurred,
  onOpen,
}: {
  message: ChatMessage;
  blurred: boolean;
  onOpen: (url: string) => void;
}) {
  const [tapped, setTapped] = React.useState(false);
  const shown = !blurred || tapped;
  const image = message.image;
  if (!image) {
    return (
      <View className="h-24 w-48 items-center justify-center gap-1 rounded-2xl bg-secondary">
        <Icon as={ImageOff} size={20} className="text-muted-foreground" />
        <Text className="text-xs text-muted-foreground">Ảnh không còn</Text>
      </View>
    );
  }
  // Very tall or wide photos are cropped, not stretched across the screen.
  const ratio = Math.min(Math.max(image.height / image.width, 0.6), 1.5);
  return (
    <Pressable
      onPress={() => (shown ? onOpen(image.url) : setTapped(true))}
      disabled={message.localStatus !== undefined}
      accessibilityLabel={shown ? "Xem ảnh" : "Chạm để xem ảnh"}
      className="overflow-hidden rounded-2xl bg-secondary"
    >
      <Image
        source={{ uri: image.url }}
        style={{ width: IMAGE_WIDTH, height: IMAGE_WIDTH * ratio }}
        contentFit="cover"
        blurRadius={shown ? 0 : 40}
        // A chat photo may show a face: never written to disk.
        cachePolicy="memory"
        transition={150}
      />
      {shown ? null : (
        <View className="absolute inset-0 items-center justify-center gap-1">
          <Icon as={EyeOff} size={22} className="text-primary-foreground" />
          <Text className="text-sm font-semibold text-primary-foreground">
            Chạm để xem
          </Text>
        </View>
      )}
    </Pressable>
  );
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
  blurred,
  onRetry,
  onOpenImage,
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
      {message.kind === "image" ? (
        <Pressable
          onPress={failed ? () => onRetry(message) : undefined}
          disabled={!failed}
          className={cn(message.localStatus === "sending" && "opacity-60")}
        >
          {/* Keyed: FlashList recycles rows, and "tapped" must not carry over. */}
          <ImageContent
            key={message.clientId ?? message.id}
            message={message}
            blurred={blurred}
            onOpen={onOpenImage}
          />
        </Pressable>
      ) : (
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
      )}
      {showMeta ? <Meta message={message} mine={mine} seen={seen} /> : null}
    </View>
  );
}
