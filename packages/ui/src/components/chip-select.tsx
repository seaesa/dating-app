import * as React from "react";
import { Pressable, View } from "react-native";

import { cn } from "../lib/utils";

import { Text } from "./ui/text";

export interface ChipOption {
  value: string;
  label: string;
  /** An emoji shown before the label. */
  icon?: string | null;
}

export interface ChipSelectProps {
  options: ChipOption[];
  value: string[];
  onChange: (next: string[]) => void;
  /** Several chips at once; otherwise tapping another chip replaces the choice. */
  multiple?: boolean;
  max?: number;
  disabled?: boolean;
  className?: string;
}

/** Tapping a selected chip clears it, so every field can be skipped. */
export function ChipSelect({
  options,
  value,
  onChange,
  multiple = false,
  max,
  disabled = false,
  className,
}: ChipSelectProps) {
  const full = multiple && max !== undefined && value.length >= max;

  function toggle(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((item) => item !== option));
    } else if (!multiple) {
      onChange([option]);
    } else if (!full) {
      onChange([...value, option]);
    }
  }

  return (
    <View className={cn("flex-row flex-wrap gap-2", className)}>
      {options.map((option) => {
        const selected = value.includes(option.value);
        const locked = disabled || (!selected && full);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected, disabled: locked }}
            disabled={locked}
            onPress={() => toggle(option.value)}
            className={cn(
              "flex-row items-center gap-1.5 rounded-full border px-3.5 py-2",
              selected
                ? "border-primary bg-primary-muted"
                : "border-border bg-secondary/50 active:bg-secondary",
              locked && "opacity-50",
            )}
          >
            {option.icon ? <Text className="text-base">{option.icon}</Text> : null}
            <Text
              className={cn(
                "text-sm font-semibold",
                selected ? "text-primary" : "text-foreground",
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
