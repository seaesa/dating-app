import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import MessageSquareText from "lucide-react-native/icons/message-square-text";
import * as React from "react";
import { Alert, KeyboardAvoidingView, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { logout, requestOtp, verifyOtp, type TokenPair } from "@repo/api-contract";
import { formatPhone } from "@repo/core";
import { useAuthStore } from "@repo/store";
import { Button, Icon, OtpInput, Text } from "@repo/ui";

import { requestCodeError, verifyCodeError } from "@/auth-errors";
import { DemoCodeNotice } from "@/components/demo-code-notice";
import { useSmsCode } from "@/sms-code";

const RESEND_SECONDS = 45;
const OTP_LENGTH = 6;

function useCountdown(seconds: number) {
  const [left, setLeft] = React.useState(seconds);
  React.useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);
  return { left, reset: () => setLeft(seconds), skip: () => setLeft(0) };
}

export default function OtpScreen() {
  const params = useLocalSearchParams<{
    phone: string;
    mode?: "signup" | "login";
    demoCode?: string;
  }>();
  const { phone, mode } = params;
  const [demoCode, setDemoCode] = React.useState(params.demoCode ?? null);
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const signIn = useAuthStore((s) => s.signIn);
  const countdown = useCountdown(RESEND_SECONDS);
  const [attempt, setAttempt] = React.useState(0);
  // Filling all the boxes submits the code, exactly as typing it would.
  useSmsCode(OTP_LENGTH, attempt, setCode);

  const enter = async (data: TokenPair) => {
    // isNewUser also covers an account that registered but never finished
    // onboarding, and is persisted: killing the app on the form must not look
    // like a finished registration on the next cold start.
    await signIn({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      onboardingPending: Boolean(data.isNewUser),
    });
    router.replace(data.isNewUser ? "/(onboarding)" : "/(app)/(tabs)");
  };

  const verify = useMutation({
    mutationFn: verifyOtp,
    onSuccess: (data) => {
      // Someone who chose "Đăng nhập" expects an account. Ask before starting
      // a new one, rather than dropping them into sign-up unannounced.
      if (mode === "login" && data.isNewUser) {
        Alert.alert(
          "Số này chưa có tài khoản",
          `Tạo tài khoản mới với số ${formatPhone(phone ?? "")}?`,
          [
            {
              text: "Đổi số",
              style: "cancel",
              onPress: () => {
                void logout(data.refreshToken).catch(() => undefined);
                router.back();
              },
            },
            { text: "Tạo tài khoản", onPress: () => void enter(data) },
          ],
        );
        return;
      }
      void enter(data);
    },
    onError: (failure) => {
      const { message, kind } = verifyCodeError(failure);
      setError(message);
      setCode("");
      // A burnt or expired code cannot be retyped: let them ask for a new one now.
      if (kind === "resend") countdown.skip();
    },
  });

  const resend = useMutation({
    mutationFn: requestOtp,
    onSuccess: (data) => {
      setCode("");
      setError(null);
      countdown.reset();
      setAttempt((value) => value + 1);
      setDemoCode(data.demoCode ?? null);
    },
    onError: (failure) => setError(requestCodeError(failure)),
  });

  const submit = (value: string) => {
    setError(null);
    verify.mutate({ phone: phone ?? "", code: value });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {demoCode ? (
        <DemoCodeNotice
          code={demoCode}
          onUse={(value) => {
            setDemoCode(null);
            setCode(value);
          }}
        />
      ) : null}
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1 justify-center gap-7 px-6"
      >
        <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-muted">
          <Icon as={MessageSquareText} size={26} className="text-primary" />
        </View>

        <View className="gap-2">
          <Text className="text-3xl font-black tracking-tight text-foreground">
            Nhập mã xác nhận
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Mã gồm {OTP_LENGTH} chữ số đã được gửi đến số điện thoại{" "}
            <Text className="text-base font-bold text-foreground">
              {formatPhone(phone ?? "")}
            </Text>
          </Text>
        </View>

        <OtpInput
          length={OTP_LENGTH}
          value={code}
          onChangeText={(next) => {
            setCode(next);
            if (error) setError(null);
          }}
          disabled={verify.isPending}
          onComplete={submit}
        />

        {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

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
          disabled={code.length !== OTP_LENGTH || verify.isPending}
          onPress={() => submit(code)}
          className="h-14 w-full rounded-full bg-primary"
        >
          <Text className="text-base font-bold text-primary-foreground">
            {verify.isPending ? "Đang xác nhận..." : "Tiếp tục"}
          </Text>
          {verify.isPending ? null : (
            <Icon as={ArrowRight} size={18} className="text-primary-foreground" />
          )}
        </Button>

        <Button
          variant="ghost"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(auth)/phone")
          }
        >
          <Text>Đổi số điện thoại</Text>
        </Button>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
