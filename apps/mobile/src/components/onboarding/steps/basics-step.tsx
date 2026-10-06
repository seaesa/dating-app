import * as React from "react";
import { Alert, View } from "react-native";

import {
  birthDateError,
  displayNameError,
  updateMyIdentity,
  updateMyProfile,
} from "@repo/api-contract";
import type { Gender } from "@repo/api-contract";
import { ageOn, formatBirthDate, toIsoDate } from "@repo/core";
import { DatePickerInput, SegmentedControl, Text } from "@repo/ui";

import { useOnboarding } from "../context";
import { StepLayout } from "../step-layout";

import { TextField } from "@/components/text-field";

// Same control and order as the edit-profile screen.
const GENDERS: { value: Gender; label: string; symbol: string }[] = [
  { value: "male", label: "Nam", symbol: "♂" },
  { value: "female", label: "Nữ", symbol: "♀" },
  { value: "other", label: "Khác", symbol: "⚥" },
];

/** Resolves true when the user confirms the age, false when they want to edit. */
function confirmAge(age: number): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(`Bạn ${age} tuổi?`, "Ngày sinh không thể thay đổi sau này.", [
      { text: "Sửa lại", style: "cancel", onPress: () => resolve(false) },
      { text: "Đúng vậy", onPress: () => resolve(true) },
    ]),
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold text-foreground">{label}</Text>
      {children}
    </View>
  );
}

export function BasicsStep() {
  const { me, accept, next } = useOnboarding();
  const savedBirthday = me.account?.dateOfBirth ?? null;
  const [name, setName] = React.useState(me.profile.displayName);
  const [birthday, setBirthday] = React.useState("");
  const [gender, setGender] = React.useState<Gender | null>(me.profile.gender ?? null);
  const [error, setError] = React.useState<string | null>(null);

  const ready =
    displayNameError(name) === null &&
    (savedBirthday !== null || toIsoDate(birthday) !== null) &&
    gender !== null;

  return (
    <StepLayout
      title="Giới thiệu về bạn"
      canContinue={ready}
      error={error}
      onContinue={async () => {
        if (!savedBirthday) {
          const problem = birthDateError(birthday);
          setError(problem);
          const iso = toIsoDate(birthday);
          if (problem || !iso) return;
          // Confirmed once, because it cannot change later.
          if (!(await confirmAge(ageOn(iso)))) return;
          await updateMyIdentity({ dateOfBirth: iso });
        }
        accept(await updateMyProfile({ displayName: name.trim(), gender }));
        await next();
      }}
    >
      <Field label="Tên">
        <TextField
          value={name}
          onChangeText={setName}
          placeholder="Tên hoặc biệt danh"
          autoComplete="given-name"
          maxLength={32}
        />
      </Field>
      <Field label="Ngày sinh">
        {savedBirthday ? (
          // Locked once saved: shown read-only in the same field style.
          <TextField value={formatBirthDate(savedBirthday)} editable={false} />
        ) : (
          <DatePickerInput value={birthday} onChange={setBirthday} />
        )}
      </Field>
      <Field label="Giới tính">
        <SegmentedControl options={GENDERS} value={gender} onChange={setGender} />
      </Field>
    </StepLayout>
  );
}
