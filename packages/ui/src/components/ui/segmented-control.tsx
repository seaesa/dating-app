import * as React from "react";
import { Pressable, View } from "react-native";

import { cn } from "../../lib/utils";

import { Text } from "./text";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  symbol?: string;
  icon?: React.ReactNode | ((selected: boolean) => React.ReactNode);
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "solid";
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  disabled = false,
  variant = "default",
}: SegmentedControlProps<T>) {
  return (
    <View className={cn("w-full flex-row items-center gap-2.5", className)}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const isSolid = variant === "solid";

        return (
          <Pressable
            key={option.value}
            disabled={disabled}
            onPress={() => onChange(option.value)}
            style={
              isSolid && isSelected
                ? {
                    shadowColor: "#FF6F61",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 4,
                    elevation: 3,
                  }
                : undefined
            }
            className={cn(
              "flex-1 flex-row items-center justify-center gap-2 rounded-2xl px-2 py-3.5 border",
              isSolid
                ? isSelected
                  ? "border-primary bg-primary"
                  : "border-border bg-card active:bg-secondary"
                : isSelected
                  ? "border-2 border-primary bg-primary-muted"
                  : "border-border bg-secondary/50 active:bg-secondary",
              disabled && "opacity-50",
            )}
          >
            {option.symbol ? (
              <Text
                className={cn(
                  "text-base font-bold",
                  isSolid
                    ? isSelected
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                    : isSelected
                      ? "text-primary"
                      : "text-muted-foreground",
                )}
              >
                {option.symbol}
              </Text>
            ) : option.icon ? (
              <View className="items-center justify-center">
                {typeof option.icon === "function"
                  ? option.icon(isSelected)
                  : option.icon}
              </View>
            ) : null}
            <Text
              className={cn(
                "text-sm font-bold",
                isSolid
                  ? isSelected
                    ? "text-primary-foreground"
                    : "text-foreground"
                  : isSelected
                    ? "text-primary font-semibold"
                    : "text-muted-foreground font-semibold",
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
