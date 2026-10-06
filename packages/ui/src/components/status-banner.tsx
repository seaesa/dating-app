import * as React from "react";
import { View } from "react-native";

import { cn } from "../lib/utils";

import { Text } from "./ui/text";

type Tone = "info" | "success" | "warning" | "error";

const TONE: Record<Tone, { box: string; text: string; icon: string }> = {
  info: { box: "bg-secondary", text: "text-foreground", icon: "🛡️" },
  success: { box: "bg-success/10", text: "text-foreground", icon: "✅" },
  warning: { box: "bg-primary-muted", text: "text-foreground", icon: "⏳" },
  error: { box: "bg-destructive/10", text: "text-destructive", icon: "⚠️" },
};

export interface StatusBannerProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

export function StatusBanner({ tone = "info", children, className }: StatusBannerProps) {
  const style = TONE[tone];
  return (
    <View
      className={cn("flex-row items-start gap-3 rounded-2xl p-3.5", style.box, className)}
    >
      <Text className="text-base">{style.icon}</Text>
      <Text className={cn("flex-1 text-sm leading-5", style.text)}>{children}</Text>
    </View>
  );
}
