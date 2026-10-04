import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import * as React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { requestOtp } from "@repo/api-contract";
import { Button, Input, Text } from "@repo/ui";

import { preparePhone } from "../../src/phone-form";

export default function PhoneScreen() {
  const [raw, setRaw] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const request = useMutation({
    mutationFn: requestOtp,
    onSuccess: (_data, variables) => {
      router.push({
        pathname: "/(auth)/otp",
        params: { phone: variables.phone },
      });
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
      <View className="flex-1 justify-center gap-8 p-6">
        <View className="gap-2">
          <Text className="text-3xl font-bold text-foreground">Terdin</Text>
          <Text className="text-base text-muted-foreground">
            Nhập số điện thoại để nhận mã xác thực.
          </Text>
        </View>

        <View className="gap-4">
          <Input
            placeholder="0912 345 678"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            value={raw}
            onChangeText={setRaw}
            editable={!request.isPending}
          />

          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

          <Button disabled={request.isPending} onPress={submit}>
            <Text>{request.isPending ? "Đang gửi..." : "Tiếp tục"}</Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
