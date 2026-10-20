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
  onViewPerks?: () => void;
}

export function MembershipCard({ onUpgrade, onViewPerks }: MembershipCardProps) {
  const { isVip, isFreeMode, currentPlan, formattedExpiry, daysRemaining } =
    useMembership();

  if (isVip) {
    return (
      <View className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4 shadow-sm shadow-amber-500/10 gap-3">
        {/* Top Info & Action Row */}
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
            <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
              <Icon as={Crown} className="text-amber-500" size={20} />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <Text className="text-sm font-black text-foreground" numberOfLines={1}>
                  Hội viên VIP
                </Text>
                <View className="rounded-md bg-amber-500 px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-white">VIP</Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                {currentPlan?.name ?? "Gói VIP"} • Còn {daysRemaining ?? 0} ngày
              </Text>
            </View>
          </View>

          <Button
            size="sm"
            variant="outline"
            onPress={onUpgrade}
            className="h-8 shrink-0 rounded-full border-amber-500/60 bg-amber-500/20 px-3 active:opacity-70"
          >
            <Text className="text-xs font-bold text-amber-500">Gia hạn</Text>
          </Button>
        </View>

        {/* Bottom Details & Perks Link */}
        <View className="flex-row items-center justify-between pt-2 border-t border-amber-500/20 gap-2">
          <Text
            className="text-[11px] text-muted-foreground flex-1 min-w-0"
            numberOfLines={1}
          >
            Hạn dùng: {formattedExpiry || "Đang kích hoạt"}
          </Text>

          {onViewPerks ? (
            <Pressable
              onPress={onViewPerks}
              hitSlop={8}
              className="flex-row items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 active:opacity-70 shrink-0"
            >
              <Icon as={Zap} className="text-amber-500" size={12} />
              <Text className="text-[11px] font-bold text-amber-500">
                Xem đặc quyền →
              </Text>
            </Pressable>
          ) : (
            <View className="flex-row items-center gap-1 shrink-0">
              <Icon as={Zap} className="text-amber-500" size={12} />
              <Text className="text-[11px] font-semibold text-amber-500">
                Đặc quyền kích hoạt
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (isFreeMode) {
    return (
      <View className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 shadow-sm gap-2.5">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
            <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
              <Icon as={Gift} className="text-emerald-500" size={20} />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-center gap-1.5 flex-wrap">
                <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                  Trải nghiệm Miễn phí
                </Text>
                <View className="rounded-md bg-emerald-500 px-1.5 py-0.5">
                  <Text className="text-[10px] font-bold text-white">FREE</Text>
                </View>
              </View>
              <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
                Đang mở toàn bộ đặc quyền VIP
              </Text>
            </View>
          </View>

          {onViewPerks ? (
            <Pressable
              onPress={onViewPerks}
              hitSlop={8}
              className="rounded-full bg-emerald-500/20 px-2.5 py-1 active:opacity-70 shrink-0"
            >
              <Text className="text-xs font-bold text-emerald-500">Xem đặc quyền</Text>
            </Pressable>
          ) : null}
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
      className="rounded-2xl border border-primary/40 bg-primary/10 p-4 shadow-sm shadow-primary/10 active:opacity-90 gap-2.5"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2.5 flex-1 min-w-0">
          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20">
            <Icon as={Sparkles} className="text-primary" size={20} />
          </View>
          <View className="flex-1 min-w-0">
            <Text className="text-sm font-black text-foreground" numberOfLines={1}>
              Nâng cấp Terdin Date VIP 👑
            </Text>
            <Text
              className="text-xs text-muted-foreground leading-4 mt-0.5"
              numberOfLines={1}
            >
              Xem ai thích bạn, thả tim không giới hạn
            </Text>
          </View>
        </View>

        <View className="rounded-full bg-primary px-3 py-1.5 shadow-sm shadow-primary/20 shrink-0">
          <Text className="text-xs font-bold text-primary-foreground">Nâng cấp</Text>
        </View>
      </View>

      {onViewPerks ? (
        <View className="flex-row items-center justify-end pt-1 border-t border-primary/15">
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onViewPerks();
            }}
            hitSlop={6}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Text className="text-[11px] font-semibold text-primary">
              Tìm hiểu đặc quyền VIP →
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Pressable>
  );
}
