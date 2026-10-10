import BadgeCheck from "lucide-react-native/icons/badge-check";
import * as React from "react";
import { View } from "react-native";

import { cn, Icon, Text } from "@repo/ui";

export interface VerifiedNameProps {
  name: string;
  age: number;
  verified?: boolean;
  className?: string;
  iconSize?: number;
}

/** "Mai Chi, 26" with the verified badge the profile has earned, if any. */
export function VerifiedName({
  name,
  age,
  verified,
  className,
  iconSize = 16,
}: VerifiedNameProps) {
  return (
    <View className="flex-shrink flex-row items-center gap-1">
      <Text className={cn("font-bold text-foreground", className)} numberOfLines={1}>
        {name}, {age}
      </Text>
      {verified ? (
        <Icon
          as={BadgeCheck}
          size={iconSize}
          className="text-success"
          accessibilityLabel="Đã xác thực"
        />
      ) : null}
    </View>
  );
}
