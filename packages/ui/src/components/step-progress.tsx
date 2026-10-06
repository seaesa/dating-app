import * as React from "react";
import { View } from "react-native";

import { cn } from "../lib/utils";

import { Text } from "./ui/text";

export interface StepProgressProps {
  /** 1-based current step. */
  step: number;
  total: number;
  className?: string;
}

export function StepProgress({ step, total, className }: StepProgressProps) {
  return (
    <View className={cn("gap-1.5", className)}>
      <View className="flex-row gap-1.5">
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full",
              index < step ? "bg-primary" : "bg-secondary",
            )}
          />
        ))}
      </View>
      <Text className="self-end text-[11px] font-bold uppercase text-muted-foreground">
        Bước {step}/{total}
      </Text>
    </View>
  );
}
