import { Image } from "expo-image";
import * as React from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { cn, Text } from "@repo/ui";

export interface PhotoGridItem {
  key: string;
  uri: string;
}

export interface PhotoGridProps {
  photos: PhotoGridItem[];
  max?: number;
  uploading?: boolean;
  onAdd: () => void;
  onRemove: (key: string) => void;
  className?: string;
}

/** Up to `max` portrait slots; the first photo is the main one. */
export function PhotoGrid({
  photos,
  max = 6,
  uploading = false,
  onAdd,
  onRemove,
  className,
}: PhotoGridProps) {
  const slots = Array.from({ length: max }, (_, index) => photos[index] ?? null);

  return (
    <View className={cn("flex-row flex-wrap gap-2.5", className)}>
      {slots.map((photo, index) => {
        const isNext = index === photos.length;
        return (
          <View
            key={photo?.key ?? `empty-${index}`}
            style={{ width: "31.5%", aspectRatio: 3 / 4 }}
          >
            {photo ? (
              <View className="h-full w-full overflow-hidden rounded-2xl bg-secondary">
                <Image
                  // Presigned URLs change on every fetch; key the cache on the
                  // media id so the same photo is not downloaded again.
                  source={{ uri: photo.uri, cacheKey: photo.key }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={150}
                />
                {index === 0 ? (
                  <View className="absolute bottom-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-primary-foreground">
                      Ảnh chính
                    </Text>
                  </View>
                ) : null}
                <Pressable
                  accessibilityLabel="Xóa ảnh"
                  onPress={() => onRemove(photo.key)}
                  className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-background"
                >
                  <Text className="text-sm font-bold text-foreground">✕</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityLabel="Thêm ảnh"
                disabled={!isNext || uploading}
                onPress={onAdd}
                className={cn(
                  "h-full w-full items-center justify-center rounded-2xl border-2 border-dashed",
                  isNext
                    ? "border-primary/50 bg-primary-muted"
                    : "border-border bg-secondary/40",
                )}
              >
                {isNext && uploading ? (
                  <ActivityIndicator />
                ) : (
                  <Text
                    className={cn(
                      "text-2xl font-bold",
                      isNext ? "text-primary" : "text-muted-foreground/40",
                    )}
                  >
                    +
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        );
      })}
    </View>
  );
}
