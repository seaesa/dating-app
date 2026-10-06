import * as React from "react";
import { View } from "react-native";

import { updateMyProfile } from "@repo/api-contract";
import { Text } from "@repo/ui";

import { useOnboarding } from "../context";
import { StepLayout } from "../step-layout";

import { AttributeField } from "@/components/attribute-field";
import { TextField } from "@/components/text-field";

export function InterestsStep() {
  const { me, options, accept, next } = useOnboarding();
  const [interests, setInterests] = React.useState<string[]>(me.profile.interests);
  const [bio, setBio] = React.useState(me.profile.bio);

  return (
    <StepLayout
      title="Bạn thích gì?"
      canContinue={interests.length > 0 || bio.trim() !== ""}
      continueLabel="Hoàn tất"
      onContinue={async () => {
        accept(await updateMyProfile({ interests, bio: bio.trim() }));
        await next();
      }}
      skipLabel="Để sau"
      onSkip={next}
    >
      <Text className="text-sm font-semibold text-primary">
        Đã chọn {interests.length}/{options.maxInterests}
      </Text>
      <AttributeField
        attributeKey="interests"
        options={options}
        values={interests}
        onChange={setInterests}
      />
      <View className="gap-2.5">
        <Text className="text-base font-bold text-foreground">
          ✍️ Giới thiệu bản thân
        </Text>
        <TextField
          value={bio}
          onChangeText={setBio}
          placeholder="Một câu để người khác bắt chuyện"
          multiline
          maxLength={500}
          textAlignVertical="top"
          className="h-28 py-3"
        />
      </View>
    </StepLayout>
  );
}
