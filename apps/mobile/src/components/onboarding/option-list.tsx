import * as React from "react";
import { Pressable, View } from "react-native";

import { cn, Text } from "@repo/ui";

export interface ListOption {
  value: string;
  label: string;
  icon?: string | null;
}

/** One full-width row per choice, for single-answer steps. */
export function OptionList({
  options,
  value,
  onChange,
}: {
  options: ListOption[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <View className="gap-3">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            className={cn(
              "h-14 flex-row items-center gap-3 rounded-2xl px-5",
              selected
                ? "border-2 border-primary bg-primary-muted"
                : "border border-border bg-secondary/50",
            )}
          >
            {option.icon ? <Text className="text-xl">{option.icon}</Text> : null}
            <Text
              className={cn(
                "flex-1 text-base",
                selected ? "font-bold text-primary" : "font-semibold text-foreground",
              )}
            >
              {option.label}
            </Text>
            {selected ? (
              <Text className="text-base font-bold text-primary">✓</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
