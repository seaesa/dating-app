import * as React from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cn } from "@repo/ui";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}

/** A sheet over a dimmed backdrop; tapping the backdrop closes it. */
export function BottomSheet({ visible, onClose, className, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "web" ? 36 : 24);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-foreground/40"
        onPress={onClose}
        accessibilityLabel="Đóng"
      />
      <View
        style={{ paddingBottom: bottomPadding }}
        className={cn(
          "w-full max-w-lg self-center rounded-t-3xl bg-background px-5 pt-3 shadow-2xl",
          className,
        )}
      >
        {/* Grab indicator pill */}
        <View className="mb-2 h-1 w-10 self-center rounded-full bg-muted-foreground/30" />
        {children}
      </View>
    </Modal>
  );
}
