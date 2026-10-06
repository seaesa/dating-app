import * as React from "react";
import { Pressable, View } from "react-native";

import type { ProfileOptionsRead } from "@repo/api-contract";
import { ChipSelect, NumberStepper, Text } from "@repo/ui";

export interface AttributeFieldProps {
  attributeKey: string;
  options: ProfileOptionsRead;
  values: string[];
  onChange: (values: string[]) => void;
  /** Height only. */
  height?: number | null;
  onHeightChange?: (height: number | null) => void;
  /** Several values allowed, as on a preference row. */
  multiple?: boolean;
}

/** One catalog attribute as chips; height as a stepper the user can clear. */
export function AttributeField({
  attributeKey,
  options,
  values,
  onChange,
  height,
  onHeightChange,
  multiple,
}: AttributeFieldProps) {
  if (attributeKey === "height") {
    return (
      <View className="gap-2">
        <Text className="text-sm font-bold text-foreground">📏 Chiều cao</Text>
        {height != null ? (
          <View className="gap-1">
            <NumberStepper
              value={height}
              min={options.heightMin}
              max={options.heightMax}
              unit="cm"
              onChange={(n) => onHeightChange?.(n)}
            />
            <Pressable
              onPress={() => onHeightChange?.(null)}
              className="self-center py-1"
            >
              <Text className="text-xs font-semibold text-muted-foreground">Xóa</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => onHeightChange?.(165)}
            className="h-11 items-center justify-center rounded-xl border border-dashed border-border"
          >
            <Text className="text-sm font-semibold text-primary">+ Thêm chiều cao</Text>
          </Pressable>
        )}
      </View>
    );
  }

  if (attributeKey === "interests") {
    return (
      <View className="gap-4">
        {options.interestGroups.map((group) => (
          <View key={group.label} className="gap-2.5">
            <Text className="text-base font-bold text-foreground">
              {group.icon ? `${group.icon} ` : ""}
              {group.label}
            </Text>
            <ChipSelect
              options={group.options}
              value={values}
              multiple
              max={options.maxInterests}
              onChange={onChange}
            />
          </View>
        ))}
      </View>
    );
  }

  const attribute = options.attributes.find((a) => a.key === attributeKey);
  if (!attribute) return null;
  return (
    <View className="gap-2.5">
      <Text className="text-sm font-bold text-foreground">
        {attribute.icon ? `${attribute.icon} ` : ""}
        {attribute.label}
      </Text>
      <ChipSelect
        options={attribute.options}
        value={values}
        multiple={multiple ?? attribute.multi}
        onChange={onChange}
      />
    </View>
  );
}
