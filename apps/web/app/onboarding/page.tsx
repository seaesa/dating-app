"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { View } from "react-native";

import { parseProfileForm, updateMyProfileMutation } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";
import { Button, Input, Label, Text } from "@repo/ui";

import { useRequireSession } from "../session-gate";

const FIELDS = [
  { key: "nickname", label: "Biệt danh", mode: "text" },
  { key: "birthYear", label: "Năm sinh", mode: "numeric" },
  { key: "city", label: "Thành phố", mode: "text" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export default function OnboardingPage() {
  const router = useRouter();
  // requireOnboarded: false — this IS the onboarding form, so a pending profile
  // must not redirect here from here. Without any guard, a signed-out visitor
  // used to fill the whole form and lose it to a 401.
  useRequireSession({ requireOnboarded: false });
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const [values, setValues] = React.useState<Record<FieldKey, string>>({
    nickname: "",
    birthYear: "",
    city: "",
  });
  const [error, setError] = React.useState<string | null>(null);

  const update = useMutation({
    ...updateMyProfileMutation(),
    onSuccess: async () => {
      await completeOnboarding();
      router.replace("/profile");
    },
    onError: () => setError("Không lưu được. Thử lại."),
  });

  function submit() {
    // Shared with mobile and derived from the generated contract schema, so the
    // form cannot accept a value the API will refuse.
    const parsed = parseProfileForm(values);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    update.mutate({ body: parsed.body });
  }

  return (
    <View className="mx-auto w-full max-w-sm flex-1 justify-center gap-6 p-6">
      <View className="gap-2">
        <Text className="text-2xl font-bold text-foreground">Tạo hồ sơ</Text>
        <Text className="text-base text-muted-foreground">
          Đây là những gì người khác thấy. Tên thật và ảnh thật chỉ hiện khi cả hai cùng
          đồng ý.
        </Text>
      </View>

      {FIELDS.map((field) => (
        <View key={field.key} className="gap-2">
          <Label nativeID={field.key}>
            <Text>{field.label}</Text>
          </Label>
          <Input
            aria-labelledby={field.key}
            inputMode={field.mode}
            value={values[field.key]}
            onChangeText={(next) => setValues((prev) => ({ ...prev, [field.key]: next }))}
          />
        </View>
      ))}

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      <Button disabled={update.isPending} onPress={submit}>
        <Text>{update.isPending ? "Đang lưu..." : "Hoàn tất"}</Text>
      </Button>
    </View>
  );
}
