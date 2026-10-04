import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { verifyOtp } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";
import { Button, OtpInput, Text } from "@repo/ui";

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = React.useState("");
  const signIn = useAuthStore((s) => s.signIn);

  const verify = useMutation({
    mutationFn: verifyOtp,
    onSuccess: async (data) => {
      // isNewUser comes from the API so the client needs no second request to
      // decide where a first-time user goes. It is persisted rather than acted on
      // once: killing the app on the onboarding form used to satisfy every guard
      // on the next cold start and strand the user on an empty profile.
      await signIn({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        onboardingPending: Boolean(data.isNewUser),
      });
      // Both layouts route off the same persisted flag, so this navigation and
      // the auth layout's redirect can no longer disagree.
      router.replace(data.isNewUser ? "/(onboarding)/profile" : "/(app)/profile");
    },
    // Clear the boxes: the API consumes a code on failure too, so the old one
    // can never work again.
    onError: () => setCode(""),
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center gap-8 p-6">
        <View className="gap-2">
          <Text className="text-2xl font-bold text-foreground">Nhập mã</Text>
          <Text className="text-base text-muted-foreground">Đã gửi tới {phone}</Text>
        </View>

        <OtpInput
          value={code}
          onChangeText={setCode}
          disabled={verify.isPending}
          onComplete={(value) => verify.mutate({ phone: phone ?? "", code: value })}
        />

        {verify.isError ? (
          <Text className="text-sm text-destructive">Mã không đúng hoặc đã hết hạn.</Text>
        ) : null}

        <Button variant="ghost" onPress={() => router.back()}>
          <Text>Đổi số điện thoại</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
