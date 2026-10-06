import * as React from "react";
import { Pressable, View } from "react-native";

import { cn } from "../lib/utils";

import { Text } from "./ui/text";

export interface NumberStepperProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (next: number) => void;
  disabled?: boolean;
  className?: string;
}

export function NumberStepper({
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  disabled = false,
  className,
}: NumberStepperProps) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const button =
    "h-11 w-11 items-center justify-center rounded-full bg-secondary active:bg-border";

  return (
    <View className={cn("flex-row items-center justify-between gap-3", className)}>
      <Pressable
        accessibilityLabel="Giảm"
        disabled={disabled || value <= min}
        onPress={() => onChange(clamp(value - step))}
        className={cn(button, (disabled || value <= min) && "opacity-40")}
      >
        <Text className="text-xl font-bold text-foreground">−</Text>
      </Pressable>
      <Text className="min-w-20 text-center text-xl font-bold text-foreground">
        {value}
        {unit ? ` ${unit}` : ""}
      </Text>
      <Pressable
        accessibilityLabel="Tăng"
        disabled={disabled || value >= max}
        onPress={() => onChange(clamp(value + step))}
        className={cn(button, (disabled || value >= max) && "opacity-40")}
      >
        <Text className="text-xl font-bold text-foreground">+</Text>
      </Pressable>
    </View>
  );
}
