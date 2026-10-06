import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import * as React from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestOtp, verifyOtp } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";
import { Button, OtpInput, StatusBanner, Text } from "@repo/ui";

const RESEND_SECONDS = 45;
const OTP_LENGTH = 6;

function useCountdown(seconds: number) {
  const [left, setLeft] = React.useState(seconds);
  React.useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return { left, reset: () => setLeft(seconds) };
}

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = React.useState("");
  const signIn = useAuthStore((s) => s.signIn);
  const countdown = useCountdown(RESEND_SECONDS);

  const verify = useMutation({
    mutationFn: verifyOtp,
    onSuccess: async (data) => {
      // isNewUser also covers an account that registered but never finished
      // onboarding, and is persisted: killing the app on the form must not look
      // like a finished registration on the next cold start.
      await signIn({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        onboardingPending: Boolean(data.isNewUser),
      });
      router.replace(data.isNewUser ? "/(onboarding)" : "/(app)/(tabs)/profile");
    },
    // Clear the boxes: the API consumes a code on failure too, so the old one
    // can never work again.
    onError: () => setCode(""),
  });

  const resend = useMutation({
    mutationFn: requestOtp,
    onSuccess: () => {
      setCode("");
      countdown.reset();
    },
  });

  const complete = code.length === OTP_LENGTH;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center gap-7 px-6">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-muted">
          <Text className="text-2xl">💬</Text>
        </View>

        <View className="gap-2">
          <Text className="text-3xl font-black tracking-tight text-foreground">
            Nhập mã xác nhận
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Mã gồm {OTP_LENGTH} chữ số đã được gửi đến số điện thoại{" "}
            <Text className="text-base font-bold text-foreground">{phone}</Text>
          </Text>
        </View>

        <OtpInput
          length={OTP_LENGTH}
          value={code}
          onChangeText={setCode}
          disabled={verify.isPending}
          onComplete={(value) => verify.mutate({ phone: phone ?? "", code: value })}
        />

        {verify.isError ? (
          <Text className="text-sm text-destructive">Mã không đúng hoặc đã hết hạn.</Text>
        ) : null}

        <View className="flex-row items-center justify-center gap-1">
          <Text className="text-sm text-muted-foreground">Bạn chưa nhận được mã?</Text>
          {countdown.left > 0 ? (
            <Text className="text-sm font-bold text-foreground">
              Gửi lại sau {countdown.left}s
            </Text>
          ) : (
            <Pressable
              disabled={resend.isPending}
              onPress={() => resend.mutate({ phone: phone ?? "" })}
            >
              <Text className="text-sm font-bold text-primary">Gửi lại mã</Text>
            </Pressable>
          )}
        </View>

        <Button
          size="xl"
          disabled={!complete || verify.isPending}
          onPress={() => verify.mutate({ phone: phone ?? "", code })}
          className="h-14 w-full rounded-full bg-primary"
        >
          <Text className="text-base font-bold text-primary-foreground">
            {verify.isPending ? "Đang xác nhận..." : "Tiếp tục →"}
          </Text>
        </Button>

        <StatusBanner tone="info">
          Không bao giờ chia sẻ mã OTP với bất kỳ ai để bảo vệ tài khoản.
        </StatusBanner>

        <Button
          variant="ghost"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(auth)/phone")
          }
        >
          <Text>Đổi số điện thoại</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
