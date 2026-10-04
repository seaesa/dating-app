import * as React from "react";
import { Platform, TextInput, View } from "react-native";

import { cn } from "../../lib/utils";

import { Text } from "./text";

export interface DatePickerInputProps {
  value: string; // "DD/MM/YYYY" or "DD / MM / YYYY"
  onChange: (dateStr: string, birthYear: number | null, isAdult: boolean) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
}

const MIN_AGE = 18;
const MAX_AGE = 100;

export function DatePickerInput({
  value,
  onChange,
  error,
  disabled = false,
  className,
}: DatePickerInputProps) {
  // Format user input as DD / MM / YYYY
  function handleTextChange(raw: string) {
    // Keep only numbers
    const cleaned = raw.replace(/\D/g, "").slice(0, 8);
    let formatted = "";
    if (cleaned.length > 0) {
      formatted = cleaned.slice(0, 2);
    }
    if (cleaned.length >= 3) {
      formatted += " / " + cleaned.slice(2, 4);
    }
    if (cleaned.length >= 5) {
      formatted += " / " + cleaned.slice(4, 8);
    }

    let birthYear: number | null = null;
    let isAdult = false;

    if (cleaned.length === 8) {
      const day = parseInt(cleaned.slice(0, 2), 10);
      const month = parseInt(cleaned.slice(2, 4), 10);
      const year = parseInt(cleaned.slice(4, 8), 10);
      const now = new Date();
      const currentYear = now.getFullYear();

      if (
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31 &&
        year >= currentYear - MAX_AGE &&
        year <= currentYear
      ) {
        birthYear = year;
        const birthDate = new Date(year, month - 1, day);
        let age = now.getFullYear() - birthDate.getFullYear();
        const m = now.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
          age--;
        }
        isAdult = age >= MIN_AGE;
      }
    }

    onChange(formatted, birthYear, isAdult);
  }

  return (
    <View className={cn("w-full gap-1.5", className)}>
      <View
        className={cn(
          "h-14 w-full flex-row items-center justify-between rounded-2xl border bg-secondary/50 px-4",
          error
            ? "border-destructive"
            : "border-border focus-within:border-primary focus-within:bg-background",
          disabled && "opacity-50",
        )}
      >
        <TextInput
          editable={!disabled}
          value={value}
          onChangeText={handleTextChange}
          placeholder="DD / MM / YYYY"
          placeholderTextColor="hsl(var(--muted-foreground))"
          keyboardType="number-pad"
          maxLength={14}
          className={cn(
            "flex-1 text-base font-medium text-foreground",
            Platform.select({ web: "outline-none" }),
          )}
        />
        <View className="items-center justify-center pl-2">
          <Text className="text-xl">📅</Text>
        </View>
      </View>
      {error ? (
        <Text className="px-1 text-xs font-medium text-destructive">{error}</Text>
      ) : null}
    </View>
  );
}
