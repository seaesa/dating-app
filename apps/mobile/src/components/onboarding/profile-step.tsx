import * as React from "react";
import { View } from "react-native";

import { updateMyProfile, updateMySensitive } from "@repo/api-contract";
import type { ProfileAttributes, SensitiveAttributes } from "@repo/api-contract";
import { SelectPicker, Text } from "@repo/ui";

import { useOnboarding } from "./context";
import { StepLayout } from "./step-layout";

import { AttributeField } from "@/components/attribute-field";

/** A catalog key and where its answer is stored. */
export type ProfileStepField =
  | { key: string; field: keyof ProfileAttributes }
  | { key: "height" }
  | { key: "hometown" }
  | { key: "religion" };

/** An optional step of self-declared details; any answer lets it continue. */
export function ProfileStep({
  title,
  fields,
}: {
  title: string;
  fields: ProfileStepField[];
}) {
  const { me, options, accept, next } = useOnboarding();
  const [attributes, setAttributes] = React.useState<ProfileAttributes>(
    me.profile.attributes,
  );
  const [sensitive, setSensitive] = React.useState<SensitiveAttributes>(
    me.account?.sensitive ?? {},
  );
  const set = (patch: Partial<ProfileAttributes>) =>
    setAttributes((a) => ({ ...a, ...patch }));

  const answered = fields.some((f) => {
    if (f.key === "height") return attributes.heightCm != null;
    if (f.key === "hometown") return Boolean(attributes.hometown?.trim());
    if (f.key === "religion") return sensitive.religion != null;
    return "field" in f && attributes[f.field] != null;
  });

  return (
    <StepLayout
      title={title}
      canContinue={answered}
      onContinue={async () => {
        if (fields.some((f) => f.key === "religion")) {
          await updateMySensitive(sensitive);
        }
        accept(
          await updateMyProfile({
            attributes: { ...attributes, hometown: attributes.hometown?.trim() || null },
          }),
        );
        await next();
      }}
      skipLabel="Bỏ qua"
      onSkip={next}
    >
      {fields.map((f) => {
        if (f.key === "height") {
          return (
            <AttributeField
              key="height"
              attributeKey="height"
              options={options}
              values={[]}
              onChange={() => undefined}
              height={attributes.heightCm ?? null}
              onHeightChange={(heightCm) => set({ heightCm })}
            />
          );
        }
        if (f.key === "hometown") {
          return (
            <View key="hometown" className="gap-2.5">
              <Text className="text-sm font-bold text-foreground">🏡 Quê quán</Text>
              <SelectPicker
                value={attributes.hometown ?? ""}
                onChange={(hometown) => set({ hometown })}
                placeholder="Chọn quê quán của bạn"
              />
            </View>
          );
        }
        if (f.key === "religion") {
          return (
            <AttributeField
              key="religion"
              attributeKey="religion"
              options={options}
              multiple={false}
              values={sensitive.religion ? [sensitive.religion] : []}
              onChange={(picked) =>
                setSensitive((s) => ({ ...s, religion: picked[0] ?? null }))
              }
            />
          );
        }
        if (!("field" in f)) return null;
        const value = attributes[f.field];
        return (
          <AttributeField
            key={f.key}
            attributeKey={f.key}
            options={options}
            multiple={false}
            values={typeof value === "string" ? [value] : []}
            onChange={(picked) => set({ [f.field]: picked[0] ?? null })}
          />
        );
      })}
    </StepLayout>
  );
}
