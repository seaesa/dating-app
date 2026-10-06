import * as React from "react";
import { Pressable, TextInput, View } from "react-native";

import { shouldReportComplete } from "../lib/otp";
import { cn } from "../lib/utils";

import { Text } from "./ui/text";

export interface OtpInputProps {
  length?: number;
  value: string;
  onChangeText: (value: string) => void;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
  disabled?: boolean;
}

/**
 * A row of boxes over one hidden input.
 *
 * One real input rather than N: N inputs need focus juggling that fights
 * autofill, and on iOS the SMS autofill suggestion targets a single field.
 */
export function OtpInput({
  length = 6,
  value,
  onChangeText,
  onComplete,
  autoFocus = true,
  disabled = false,
}: OtpInputProps) {
  const inputRef = React.useRef<TextInput>(null);
  const completed = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (shouldReportComplete(value, length, completed.current)) {
      completed.current = value;
      onComplete?.(value);
    }
    if (value.length < length) {
      completed.current = null;
    }
  }, [value, length, onComplete]);

  const digits = React.useMemo(
    () => Array.from({ length }, (_, i) => value[i] ?? ""),
    [value, length],
  );

  return (
    <Pressable onPress={() => inputRef.current?.focus()}>
      <View className="flex-row gap-3">
        {digits.map((digit, index) => (
          <View
            key={index}
            className={cn(
              "h-16 flex-1 items-center justify-center rounded-2xl bg-secondary",
              index === value.length && "border-2 border-primary bg-primary-muted",
            )}
          >
            <Text className="text-2xl font-bold text-foreground">{digit}</Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(next) => onChangeText(next.replace(/\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={length}
        autoFocus={autoFocus}
        editable={!disabled}
        className="absolute h-full w-full opacity-0"
      />
    </Pressable>
  );
}
