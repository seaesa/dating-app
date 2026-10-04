import * as React from "react";
import { ActivityIndicator, Image, Pressable, View } from "react-native";

import { cn } from "../lib/utils";

import { Text } from "./ui/text";

export interface ImageUploaderProps {
  imageUrl?: string | null;
  onPickImage: () => void;
  onRemoveImage?: () => void;
  isUploading?: boolean;
  subtitle?: string;
  className?: string;
}

export function ImageUploader({
  imageUrl,
  onPickImage,
  onRemoveImage,
  isUploading = false,
  subtitle = "Ảnh chân dung rõ mặt giúp nhận được nhiều tương tác hơn",
  className,
}: ImageUploaderProps) {
  return (
    <View className={cn("w-full items-center gap-3", className)}>
      <Pressable
        onPress={onPickImage}
        disabled={isUploading}
        className="relative h-32 w-32 items-center justify-center rounded-full active:opacity-90"
      >
        {/* Circle Border Container */}
        <View
          className={cn(
            "h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-dashed bg-secondary/60",
            imageUrl ? "border-primary" : "border-primary/40",
          )}
        >
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: "100%" }}
              className="h-full w-full rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="items-center justify-center gap-1">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary-muted">
                <Text className="text-xl">📷</Text>
              </View>
              <Text className="text-xs font-semibold text-muted-foreground">
                Thêm ảnh
              </Text>
            </View>
          )}

          {isUploading ? (
            <View className="absolute inset-0 items-center justify-center bg-black/40">
              <ActivityIndicator color="white" />
            </View>
          ) : null}
        </View>

        {/* Plus Badge at bottom-right */}
        <View className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary shadow-md">
          <Text className="text-lg font-bold leading-none text-primary-foreground">
            {imageUrl ? "✓" : "+"}
          </Text>
        </View>
      </Pressable>

      {imageUrl && onRemoveImage ? (
        <Pressable onPress={onRemoveImage} className="py-1">
          <Text className="text-xs font-semibold text-destructive">Xóa ảnh</Text>
        </Pressable>
      ) : null}

      {/* Subtitle */}
      {subtitle ? (
        <Text className="text-center text-xs text-muted-foreground">{subtitle}</Text>
      ) : null}
    </View>
  );
}
