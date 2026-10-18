import Crown from "lucide-react-native/icons/crown";
import Gift from "lucide-react-native/icons/gift";
import Sparkles from "lucide-react-native/icons/sparkles";
import Zap from "lucide-react-native/icons/zap";
import * as React from "react";
import { Pressable, View } from "react-native";

import { Button, Icon, Text } from "@repo/ui";

import { useMembership } from "@/hooks/use-membership";

export interface MembershipCardProps {
  onUpgrade: () => void;
}

export function MembershipCard({ onUpgrade }: MembershipCardProps) {
  const { isVip, isFreeMode, currentPlan, formattedExpiry, daysRemaining } =
    useMembership();

  if (isVip) {
    return (
      <View className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4 shadow-sm shadow-amber-500/10 gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20">
              <Icon as={Crown} className="text-amber-500" size={20} />
            </View>
            <View>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-sm font-black text-foreground">
                  Hội viên Terdin Date VIP
                </Text>
                <View className="rounded-md bg-amber-500 px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-white">VIP</Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground">
                {currentPlan?.name ?? "Gói VIP"} • Còn {daysRemaining ?? 0} ngày
              </Text>
            </View>
          </View>

          <Button
            size="sm"
            variant="outline"
            onPress={onUpgrade}
            className="h-8 rounded-full border-amber-500/50 bg-amber-500/10 px-3 active:opacity-70"
          >
            <Text className="text-xs font-bold text-amber-500">Gia hạn thêm</Text>
          </Button>
        </View>

        <View className="flex-row items-center justify-between pt-1 border-t border-amber-500/20">
          <Text className="text-[11px] text-muted-foreground">
            Thời hạn sử dụng: {formattedExpiry ?? "Đang kích hoạt"}
          </Text>
          <View className="flex-row items-center gap-1">
            <Icon as={Zap} className="text-amber-500" size={12} />
            <Text className="text-[11px] font-semibold text-amber-500">
              Đặc quyền kích hoạt
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (isFreeMode) {
    return (
      <View className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 shadow-sm gap-2">
        <View className="flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20">
            <Icon as={Gift} className="text-emerald-500" size={20} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-sm font-bold text-foreground">
                Chế độ Trải nghiệm Miễn phí
              </Text>
              <View className="rounded-md bg-emerald-500 px-1.5 py-0.5">
                <Text className="text-[10px] font-bold text-white">FREE</Text>
              </View>
            </View>
            <Text className="text-xs text-muted-foreground">
              Hệ thống đang mở miễn phí toàn bộ đặc quyền VIP cho tất cả thành viên!
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Regular user
  return (
    <Pressable
      onPress={onUpgrade}
      accessibilityRole="button"
      accessibilityLabel="Nâng cấp Terdin Date VIP"
      className="rounded-2xl border border-primary/40 bg-primary/10 p-4 shadow-sm shadow-primary/10 active:opacity-90 gap-3"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2.5 flex-1 pr-2">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
            <Icon as={Sparkles} className="text-primary" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-black text-foreground">
              Nâng cấp Terdin Date VIP 👑
            </Text>
            <Text className="text-xs text-muted-foreground leading-4">
              Xem ai đã thích bạn, quẹt và gửi lời chào không giới hạn
            </Text>
          </View>
        </View>

        <View className="rounded-full bg-primary px-3.5 py-2 shadow-sm shadow-primary/20">
          <Text className="text-xs font-bold text-primary-foreground">Nâng cấp ngay</Text>
        </View>
      </View>
    </Pressable>
  );
}
