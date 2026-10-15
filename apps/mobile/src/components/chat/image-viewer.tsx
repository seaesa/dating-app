import { Image } from "expo-image";
import X from "lucide-react-native/icons/x";
import * as React from "react";
import { Modal, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@repo/ui";

export interface ImageViewerProps {
  url: string | null;
  onClose: () => void;
}

/** One chat photo, full screen. */
export function ImageViewer({ url, onClose }: ImageViewerProps) {
  return (
    <Modal
      visible={url !== null}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        {url ? (
          <Image
            source={{ uri: url }}
            style={{ flex: 1 }}
            contentFit="contain"
            cachePolicy="memory"
          />
        ) : null}
        <SafeAreaView edges={["top"]} className="absolute right-0 top-0 px-2">
          <Pressable
            onPress={onClose}
            accessibilityLabel="Đóng"
            className="h-11 w-11 items-center justify-center"
          >
            <Icon as={X} size={26} className="text-primary-foreground" />
          </Pressable>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
