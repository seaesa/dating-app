import BadgeCheck from "lucide-react-native/icons/badge-check";
import * as React from "react";
import { View } from "react-native";

import { cn, Icon, Text } from "@repo/ui";

export interface VerifiedNameProps {
  name: string;
  age: number;
  verified?: boolean;
  isVip?: boolean;
  vipPlan?: string | null;
  className?: string;
  iconSize?: number;
}

/** "Mai Chi, 26" with the verified and VIP badge the profile has earned, if any. */
export function VerifiedName({
  name,
  age,
  verified,
  isVip,
  vipPlan,
  className,
  iconSize = 16,
}: VerifiedNameProps) {
  return (
    <View className="flex-shrink flex-row items-center gap-1.5 flex-wrap">
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
      {isVip ? (
        vipPlan === "99k" ? (
          <View className="flex-row items-center gap-0.5 rounded-full bg-violet-600 px-1.5 py-0.5 shadow-sm shadow-violet-600/30">
            <Text className="text-[9px]">💎</Text>
            <Text className="text-[9px] font-black tracking-wider text-white">
              VIP PRO
            </Text>
          </View>
        ) : (
          <View className="flex-row items-center gap-0.5 rounded-full bg-amber-500 px-1.5 py-0.5 shadow-sm shadow-amber-500/25">
            <Text className="text-[9px]">👑</Text>
            <Text className="text-[9px] font-black tracking-wider text-white">VIP</Text>
          </View>
        )
      ) : null}
    </View>
  );
}
