import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as React from "react";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestOtp } from "@repo/api-contract";
import { Button, Input, Text } from "@repo/ui";

import { preparePhone } from "@/phone-form";

export default function PhoneScreen() {
  const { mode } = useLocalSearchParams<{ mode?: "signup" | "login" }>();
  const [raw, setRaw] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const login = mode === "login";

  const request = useMutation({
    mutationFn: requestOtp,
    onSuccess: (_data, variables) => {
      router.push({ pathname: "/(auth)/otp", params: { phone: variables.phone } });
    },
    onError: () => setError("Không gửi được mã. Thử lại sau ít phút."),
  });

  function submit() {
    const prepared = preparePhone(raw);
    if (!prepared.ok) {
      setError(prepared.message);
      return;
    }
    setError(null);
    request.mutate({ phone: prepared.e164 });
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1 px-6"
      >
        <Pressable
          accessibilityLabel="Quay lại"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(auth)/welcome")
          }
          className="-ml-2 mt-2 h-10 w-10 items-center justify-center rounded-full active:bg-secondary"
        >
          <Text className="text-xl font-bold text-foreground">←</Text>
        </Pressable>

        <View className="flex-1 gap-7 pt-6">
          <View className="gap-2">
            <Text className="text-3xl font-black tracking-tight text-foreground">
              {login ? "Chào mừng trở lại" : "Số điện thoại của bạn"}
            </Text>
            <Text className="text-base leading-6 text-muted-foreground">
              {login
                ? "Nhập số điện thoại bạn đã đăng ký, chúng tôi sẽ gửi mã đăng nhập."
                : "Chúng tôi gửi mã xác nhận qua tin nhắn. Số điện thoại không bao giờ hiện cho người khác."}
            </Text>
          </View>

          <View className="gap-3">
            <View className="h-14 flex-row items-center rounded-2xl border border-border bg-secondary/50 px-4">
              <Text className="text-base font-medium text-foreground">🇻🇳 +84</Text>
              <View className="mx-3 h-6 w-px bg-border" />
              <Input
                autoFocus
                placeholder="0912 345 678"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel"
                value={raw}
                onChangeText={(next) => {
                  setRaw(next);
                  if (error) setError(null);
                }}
                onSubmitEditing={submit}
                editable={!request.isPending}
                className="h-full flex-1 border-0 bg-transparent px-0 py-0 text-base font-medium shadow-none"
              />
            </View>
            {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
          </View>
        </View>

        <Button
          size="xl"
          disabled={request.isPending || raw.trim() === ""}
          onPress={submit}
          className="mb-4 h-14 w-full rounded-full bg-primary"
        >
          <Text className="text-base font-bold text-primary-foreground">
            {request.isPending ? "Đang gửi..." : "Gửi mã"}
          </Text>
        </Button>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
