"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { View } from "react-native";

import { requestOtpMutation, verifyOtpMutation } from "@repo/api-contract";
import { toE164 } from "@repo/core";
import { useAuthStore } from "@repo/store";
import { Button, Input, OtpInput, Text } from "@repo/ui";

import { homeFor, useRedirectWhenSignedIn } from "../session-gate";

export default function LoginPage() {
  const router = useRouter();
  // A returning user must never be shown this form: their refresh token is
  // already in storage, and re-running the OTP flow for nothing is worse than
  // any amount of loading state.
  useRedirectWhenSignedIn();
  const signIn = useAuthStore((s) => s.signIn);
  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const request = useMutation({
    ...requestOtpMutation(),
    onSuccess: (_d, variables) => setSentTo(variables.body?.phone ?? null),
    onError: () => setError("Không gửi được mã. Thử lại sau."),
  });

  const verify = useMutation({
    ...verifyOtpMutation(),
    onSuccess: async (data) => {
      await signIn({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        // Persisted, so killing the tab on the onboarding form does not look
        // like a finished registration on the next visit.
        onboardingPending: Boolean(data.isNewUser),
      });
      router.replace(homeFor(Boolean(data.isNewUser)));
    },
    onError: () => {
      setError("Mã không đúng hoặc đã hết hạn.");
      // The API consumes a code even when it is wrong, so the old one can
      // never work again.
      setCode("");
    },
  });

  function sendCode() {
    // The generated Zod schema checks length only, so validity is checked here
    // too — otherwise the user waits for a 422 to learn the number is wrong.
    const e164 = toE164(phone, "VN");
    if (!e164) {
      setError("Số điện thoại không hợp lệ");
      return;
    }
    setError(null);
    request.mutate({ body: { phone: e164 } });
  }

  return (
    <View className="mx-auto w-full max-w-sm flex-1 justify-center gap-6 p-6">
      <Text className="text-3xl font-bold text-foreground">Terdin</Text>

      {sentTo === null ? (
        <>
          <Input
            placeholder="0912 345 678"
            value={phone}
            onChangeText={setPhone}
            inputMode="tel"
            editable={!request.isPending}
          />
          <Button disabled={request.isPending} onPress={sendCode}>
            <Text>{request.isPending ? "Đang gửi..." : "Tiếp tục"}</Text>
          </Button>
        </>
      ) : (
        <>
          <Text className="text-base text-muted-foreground">Đã gửi mã tới {sentTo}</Text>
          <OtpInput
            value={code}
            onChangeText={setCode}
            disabled={verify.isPending}
            onComplete={(value) =>
              verify.mutate({ body: { phone: sentTo, code: value } })
            }
          />
          <Button variant="ghost" onPress={() => setSentTo(null)}>
            <Text>Đổi số điện thoại</Text>
          </Button>
        </>
      )}

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
    </View>
  );
}
