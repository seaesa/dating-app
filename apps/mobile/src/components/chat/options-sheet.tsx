import * as React from "react";
import { Pressable, View } from "react-native";

import { Text } from "@repo/ui";

import { BottomSheet } from "./bottom-sheet";

export interface SheetOption {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

export interface OptionsSheetProps {
  visible: boolean;
  options: SheetOption[];
  onClose: () => void;
}

export function OptionsSheet({ visible, options, onClose }: OptionsSheetProps) {
  return (
    <BottomSheet visible={visible} onClose={onClose} className="px-4 pt-3">
      {options.map((option) => (
        <Pressable
          key={option.label}
          onPress={() => {
            onClose();
            option.onPress();
          }}
          className="min-h-12 justify-center rounded-xl px-2 active:bg-secondary"
        >
          <Text
            className={
              option.destructive
                ? "text-base font-semibold text-destructive"
                : "text-base text-foreground"
            }
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
      <View className="my-1 h-px bg-border" />
      <Pressable onPress={onClose} className="min-h-12 items-center justify-center">
        <Text className="text-base font-semibold text-foreground">Hủy</Text>
      </Pressable>
    </BottomSheet>
  );
}
