import * as React from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { mainPhotoError } from "@repo/api-contract";
import { Button, StepProgress, Text } from "@repo/ui";

import { useOnboarding } from "./context";

export interface StepLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  canContinue: boolean;
  continueLabel?: string;
  onContinue: () => Promise<void>;
  /** Optional steps get a skip action at the top right. */
  skipLabel?: string;
  onSkip?: () => Promise<void>;
  /** A validation message from the step itself. */
  error?: string | null;
}

/** Header, progress, title and the continue button every step shares. */
export function StepLayout({
  title,
  subtitle,
  children,
  canContinue,
  continueLabel = "Tiếp tục",
  onContinue,
  skipLabel,
  onSkip,
  error,
}: StepLayoutProps) {
  const { back, index, total } = useOnboarding();
  const [busy, setBusy] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setSaveError(null);
    try {
      await action();
    } catch (e) {
      // Finishing sign-up is refused while the main photo fails its check.
      setSaveError(mainPhotoError(e) ?? "Không lưu được. Kiểm tra kết nối rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }

  const message = error ?? saveError;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="gap-3 px-6 pt-2">
        <View className="h-10 flex-row items-center justify-between">
          {back ? (
            <Pressable
              accessibilityLabel="Quay lại"
              onPress={back}
              className="-ml-2 h-10 w-10 items-center justify-center rounded-full active:bg-secondary"
            >
              <Text className="text-xl font-bold text-foreground">←</Text>
            </Pressable>
          ) : (
            <View />
          )}
          {skipLabel && onSkip ? (
            <Pressable disabled={busy} onPress={() => void run(onSkip)}>
              <Text className="text-sm font-bold text-muted-foreground">{skipLabel}</Text>
            </Pressable>
          ) : null}
        </View>
        <StepProgress step={index + 1} total={total} />
      </View>

      {/* Only the form avoids the keyboard; the button stays put underneath it.
          Scrolling or tapping outside a field closes the keyboard. */}
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ gap: 20, paddingTop: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-2">
            <Text className="text-3xl font-black tracking-tight text-foreground">
              {title}
            </Text>
            {subtitle ? (
              <Text className="text-base leading-6 text-muted-foreground">
                {subtitle}
              </Text>
            ) : null}
          </View>
          {children}
          {message ? <Text className="text-sm text-destructive">{message}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="px-6 pb-4 pt-2">
        <Button
          size="xl"
          disabled={!canContinue || busy}
          onPress={() => void run(onContinue)}
          className="h-14 w-full rounded-full bg-primary"
        >
          <Text className="text-base font-bold text-primary-foreground">
            {busy ? "Đang lưu..." : continueLabel}
          </Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
