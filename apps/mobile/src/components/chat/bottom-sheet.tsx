import * as React from "react";
import { Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { cn } from "@repo/ui";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}

/** A sheet over a dimmed backdrop; tapping the backdrop closes it. */
export function BottomSheet({ visible, onClose, className, children }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-foreground/40"
        onPress={onClose}
        accessibilityLabel="Đóng"
      />
      <SafeAreaView
        edges={["bottom"]}
        className={cn("rounded-t-3xl bg-background px-5 pb-3 pt-5", className)}
      >
        {children}
      </SafeAreaView>
    </Modal>
  );
}
