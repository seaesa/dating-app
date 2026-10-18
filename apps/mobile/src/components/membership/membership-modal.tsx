import Check from "lucide-react-native/icons/check";
import Crown from "lucide-react-native/icons/crown";
import Sparkles from "lucide-react-native/icons/sparkles";
import X from "lucide-react-native/icons/x";
import Zap from "lucide-react-native/icons/zap";
import * as React from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { MembershipPlanRead } from "@repo/api-contract";
import { Button, Icon, Text } from "@repo/ui";

import { useMembership } from "@/hooks/use-membership";

export interface MembershipModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectPlan: (planCode: string) => void;
}

const FALLBACK_PLANS: MembershipPlanRead[] = [
  {
    code: "49k",
    name: "Gói VIP Cơ Bản",
    price: 49000,
    original_price: 99000,
    duration_days: 30,
    features: ["SEE_WHO_LIKED_YOU", "UNLIMITED_LIKES", "REWIND_LAST_PASS", "VIP_BADGE"],
    is_active: true,
    is_popular: false,
    sort_order: 1,
  },
  {
    code: "99k",
    name: "Gói VIP Toàn Diện",
    price: 99000,
    original_price: 199000,
    duration_days: 90,
    features: [
      "SEE_WHO_LIKED_YOU",
      "UNLIMITED_LIKES",
      "REWIND_LAST_PASS",
      "VIP_BADGE",
      "DAILY_SUPER_LIKES",
      "PROFILE_BOOST",
      "ADVANCED_FILTERS",
      "FAST_TRACK_REVEAL",
    ],
    is_active: true,
    is_popular: true,
    sort_order: 2,
  },
];

function formatVND(amount: number): string {
  return `${amount.toLocaleString("vi-VN")} đ`;
}

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  isPremiumOnly?: boolean;
}

const HIGHLIGHT_FEATURES: FeatureItem[] = [
  {
    icon: "👀",
    title: "Xem ai đã thích bạn",
    description: "Biết ngay ai đã thả tim để kết đôi tức thì",
  },
  {
    icon: "💖",
    title: "Thả tim không giới hạn",
    description: "Quẹt và gửi lời chào thỏa thích mỗi ngày",
  },
  {
    icon: "⏪",
    title: "Quay lại lượt bỏ qua",
    description: "Lấy lại cơ hội với người bạn vô tình lướt qua",
  },
  {
    icon: "👑",
    title: "Huy hiệu VIP độc quyền",
    description: "Tăng 200% độ uy tín và lượt phản hồi tin nhắn",
  },
  {
    icon: "⚡",
    title: "5 Siêu thích (Super Likes)/ngày",
    description: "Gửi thông báo nổi bật trực tiếp đến đối phương",
    isPremiumOnly: true,
  },
  {
    icon: "🚀",
    title: "Đẩy hồ sơ lên Top (Boost)",
    description: "Tăng gấp 3 lần lượt hiển thị hồ sơ trong khu vực",
    isPremiumOnly: true,
  },
];

export function MembershipModal({
  visible,
  onClose,
  onSelectPlan,
}: MembershipModalProps) {
  const insets = useSafeAreaInsets();
  const { plans: serverPlans } = useMembership();

  const plans = serverPlans && serverPlans.length > 0 ? serverPlans : FALLBACK_PLANS;

  // Default selection is 99k (popular) if exists, else first plan
  const [selectedCode, setSelectedCode] = React.useState<string>("99k");

  React.useEffect(() => {
    if (plans.length > 0 && !plans.some((p) => p.code === selectedCode)) {
      const popular = plans.find((p) => p.is_popular);
      setSelectedCode(popular ? popular.code : plans[0].code);
    }
  }, [plans, selectedCode]);

  const selectedPlan = plans.find((p) => p.code === selectedCode) ?? plans[0];
  const isSelectedTierPremium = selectedCode === "99k";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityLabel="Đóng bảng giá"
        />

        <View
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          className="max-h-[90%] rounded-t-[32px] border-t border-border/30 bg-card p-6 shadow-2xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3">
            <View className="flex-row items-center gap-2.5">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15">
                <Icon as={Crown} className="text-amber-500" size={22} />
              </View>
              <View>
                <Text className="text-lg font-black text-foreground">
                  Nâng cấp Terdin Date VIP
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Mở khóa toàn bộ đặc quyền kết đôi đỉnh cao
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Đóng modal"
              className="h-8 w-8 items-center justify-center rounded-full bg-secondary/60 active:opacity-70"
            >
              <Icon as={X} className="text-muted-foreground" size={18} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="flex-grow-0 pt-2">
            {/* Package Selector Cards */}
            <View className="gap-3 pb-4">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Chọn gói hội viên phù hợp
              </Text>

              <View className="flex-row gap-3">
                {plans.map((plan) => {
                  const isSelected = plan.code === selectedCode;
                  const discountPercent =
                    plan.original_price && plan.original_price > plan.price
                      ? Math.round(
                          ((plan.original_price - plan.price) / plan.original_price) *
                            100,
                        )
                      : null;

                  return (
                    <Pressable
                      key={plan.code}
                      onPress={() => setSelectedCode(plan.code)}
                      accessibilityRole="button"
                      accessibilityLabel={`Chọn gói ${plan.name} giá ${plan.price} đồng`}
                      className={`relative flex-1 rounded-2xl p-3.5 active:opacity-90 ${
                        isSelected
                          ? "border-2 border-primary bg-primary/10 shadow-sm shadow-primary/20"
                          : "border border-border/60 bg-secondary/25"
                      }`}
                    >
                      {/* Popular / Discount Badge */}
                      {plan.is_popular ? (
                        <View className="absolute -top-2.5 right-2 rounded-full bg-amber-500 px-2 py-0.5 shadow-sm">
                          <Text className="text-[10px] font-bold text-white">
                            {discountPercent
                              ? `🔥 TIẾT KIỆM ${discountPercent}%`
                              : "🔥 PHỔ BIẾN NHẤT"}
                          </Text>
                        </View>
                      ) : null}

                      <View className="gap-1 pt-1">
                        <Text
                          className={`text-sm font-bold ${
                            isSelected ? "text-primary" : "text-foreground"
                          }`}
                        >
                          {plan.name}
                        </Text>

                        <Text className="text-xs text-muted-foreground">
                          {plan.duration_days} ngày sử dụng
                        </Text>

                        <View className="pt-2">
                          <Text className="text-lg font-black text-foreground">
                            {formatVND(plan.price)}
                          </Text>
                          {plan.original_price ? (
                            <Text className="text-[11px] text-muted-foreground line-through">
                              {formatVND(plan.original_price)}
                            </Text>
                          ) : null}
                        </View>

                        {/* Selected Radio Indicator */}
                        <View className="mt-2 flex-row items-center gap-1.5">
                          <View
                            className={`h-4 w-4 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-primary bg-primary"
                                : "border-muted-foreground/40"
                            }`}
                          >
                            {isSelected ? (
                              <Icon as={Check} className="text-white" size={10} />
                            ) : null}
                          </View>
                          <Text
                            className={`text-xs ${
                              isSelected
                                ? "font-bold text-primary"
                                : "text-muted-foreground"
                            }`}
                          >
                            {isSelected ? "Đang chọn" : "Nhấn để chọn"}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Features Checklist */}
            <View className="rounded-2xl border border-border/40 bg-secondary/15 p-4 gap-3 my-2">
              <View className="flex-row items-center gap-2">
                <Icon as={Sparkles} className="text-amber-500" size={16} />
                <Text className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Quyền lợi đặc quyền hội viên
                </Text>
              </View>

              <View className="gap-2.5 pt-1">
                {HIGHLIGHT_FEATURES.map((feature, idx) => {
                  const isAvailableInSelected =
                    !feature.isPremiumOnly || isSelectedTierPremium;

                  return (
                    <View
                      key={idx}
                      className={`flex-row items-start gap-3 ${
                        isAvailableInSelected ? "opacity-100" : "opacity-40"
                      }`}
                    >
                      <Text className="text-base">{feature.icon}</Text>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text
                            className={`text-sm font-semibold ${
                              isAvailableInSelected
                                ? "text-foreground"
                                : "text-muted-foreground line-through"
                            }`}
                          >
                            {feature.title}
                          </Text>
                          {feature.isPremiumOnly && !isSelectedTierPremium ? (
                            <View className="rounded-md bg-secondary/60 px-1.5 py-0.5">
                              <Text className="text-[10px] font-bold text-muted-foreground">
                                Gói 99k
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-xs text-muted-foreground">
                          {feature.description}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Guarantee note */}
            <View className="flex-row items-center justify-center gap-1.5 py-3">
              <Icon as={Zap} className="text-primary" size={14} />
              <Text className="text-xs text-muted-foreground text-center">
                Kích hoạt tự động qua VietQR trong vài giây
              </Text>
            </View>
          </ScrollView>

          {/* Sticky Bottom CTA Button */}
          <View className="pt-2">
            <Button
              onPress={() => onSelectPlan(selectedPlan.code)}
              className="h-13 w-full rounded-full bg-primary shadow-md shadow-primary/25"
            >
              <Text className="text-base font-bold text-primary-foreground">
                {`Nâng cấp ngay • ${formatVND(selectedPlan.price)}`}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
