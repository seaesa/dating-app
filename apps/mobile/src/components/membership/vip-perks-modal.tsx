import Check from "lucide-react-native/icons/check";
import Crown from "lucide-react-native/icons/crown";
import Lock from "lucide-react-native/icons/lock";
import Sparkles from "lucide-react-native/icons/sparkles";
import X from "lucide-react-native/icons/x";
import * as React from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Icon, Text } from "@repo/ui";

import { useMembership } from "@/hooks/use-membership";

export interface VipPerksModalProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

interface VipPerkDefinition {
  code: string;
  emoji: string;
  title: string;
  description: string;
  tier: "basic" | "full";
}

const ALL_VIP_PERKS: VipPerkDefinition[] = [
  {
    code: "SEE_WHO_LIKED_YOU",
    emoji: "👀",
    title: "Xem ai đã thích bạn",
    description:
      "Nhìn thấy ngay danh sách những ai đã thả tim để kết đôi tức thì không cần chờ đợi.",
    tier: "basic",
  },
  {
    code: "UNLIMITED_LIKES",
    emoji: "💖",
    title: "Thả tim không giới hạn",
    description:
      "Thoải mái quẹt và gửi lời chào đến mọi hồ sơ phù hợp mỗi ngày không bị chặn số lượng.",
    tier: "basic",
  },
  {
    code: "VIP_BADGE",
    emoji: "👑",
    title: "Huy hiệu VIP Hoàng Gia",
    description:
      "Vương miện vàng uy tín nổi bật trên hồ sơ, tăng lượt phản hồi tin nhắn.",
    tier: "basic",
  },
  {
    code: "DIAMOND_BADGE",
    emoji: "💎",
    title: "Huy hiệu VIP Kim Cương (VIP PRO)",
    description:
      "Biểu tượng kim cương tím độc quyền dành riêng cho thành viên VIP 99k nổi bật nhất.",
    tier: "full",
  },
  {
    code: "PROFILE_BOOST",
    emoji: "🚀",
    title: "Tự động Đẩy hồ sơ lên Top (Boost)",
    description:
      "Ưu tiên hiển thị trên trang Khám phá (+30 điểm xếp hạng), tiếp cận nhiều người hơn.",
    tier: "full",
  },
];

export function VipPerksModal({ visible, onClose, onUpgrade }: VipPerksModalProps) {
  const insets = useSafeAreaInsets();
  const { isVip, isFreeMode, currentPlan, formattedExpiry, daysRemaining, hasFeature } =
    useMembership();

  const isBasicPlan = isVip && currentPlan?.code === "49k";

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable
          className="flex-1"
          onPress={onClose}
          accessibilityLabel="Đóng bảng đặc quyền"
        />

        <View
          style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          className="max-h-[88%] rounded-t-[32px] border-t border-border/30 bg-card p-6 shadow-2xl"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-border/30">
            <View className="flex-row items-center gap-2.5 flex-1 pr-2">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15">
                <Icon as={Crown} className="text-amber-500" size={22} />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-black text-foreground">
                  Đặc quyền Hội viên
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {isVip
                    ? `${currentPlan?.name ?? "Gói VIP"} • Còn ${daysRemaining ?? 0} ngày`
                    : isFreeMode
                      ? "Đang trải nghiệm miễn phí toàn bộ đặc quyền"
                      : "Nâng cấp VIP để mở khóa các đặc quyền cao cấp"}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={12}
              className="h-8 w-8 items-center justify-center rounded-full bg-secondary active:opacity-70"
            >
              <Icon as={X} className="text-foreground" size={16} />
            </Pressable>
          </View>

          {/* Current Status Banner */}
          {isVip ? (
            <View className="my-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                    {currentPlan?.name ?? "Gói VIP"}
                  </Text>
                  <View className="rounded-md bg-amber-500 px-1.5 py-0.5">
                    <Text className="text-[10px] font-bold text-white">ACTIVE</Text>
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Hạn sử dụng đến: {formattedExpiry || "Vĩnh viễn"}
                </Text>
              </View>

              <Button
                size="sm"
                variant="outline"
                onPress={() => {
                  onClose();
                  onUpgrade();
                }}
                className="h-8 rounded-full border-amber-500/60 bg-amber-500/20 px-3 active:opacity-70"
              >
                <Text className="text-xs font-bold text-amber-500">
                  {isBasicPlan ? "Lên VIP 99k" : "Gia hạn"}
                </Text>
              </Button>
            </View>
          ) : isFreeMode ? (
            <View className="my-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 flex-row items-center gap-2.5">
              <Icon as={Sparkles} className="text-emerald-500" size={18} />
              <View className="flex-1">
                <Text className="text-xs font-bold text-emerald-500 uppercase tracking-wider">
                  Chế độ trải nghiệm tự do
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Tất cả các đặc quyền dưới đây đang được mở khóa dùng thử cho tài khoản
                  của bạn.
                </Text>
              </View>
            </View>
          ) : (
            <View className="my-3 rounded-2xl border border-primary/40 bg-primary/10 p-3.5 flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text className="text-xs font-bold text-primary uppercase tracking-wider">
                  Tài khoản thường (Free)
                </Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Nâng cấp để kết đôi không giới hạn và xem ai đã thích bạn.
                </Text>
              </View>
              <Button
                size="sm"
                onPress={() => {
                  onClose();
                  onUpgrade();
                }}
                className="h-8 rounded-full bg-primary px-3 shadow-sm shadow-primary/25"
              >
                <Text className="text-xs font-bold text-primary-foreground">
                  Nâng cấp
                </Text>
              </Button>
            </View>
          )}

          {/* Perks List */}
          <ScrollView className="flex-1 my-1" showsVerticalScrollIndicator={false}>
            <View className="gap-2.5 pb-2">
              {ALL_VIP_PERKS.map((perk) => {
                const isUnlocked = hasFeature(perk.code);

                return (
                  <View
                    key={perk.code}
                    className={`flex-row items-start justify-between rounded-2xl border p-3.5 ${
                      isUnlocked
                        ? "border-border/60 bg-secondary/30"
                        : "border-border/30 bg-muted/20 opacity-70"
                    }`}
                  >
                    <View className="flex-row items-start gap-3 flex-1 pr-2">
                      <Text className="text-xl pt-0.5">{perk.emoji}</Text>
                      <View className="flex-1">
                        <Text
                          className={`text-sm font-bold ${
                            isUnlocked ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {perk.title}
                        </Text>
                        <Text className="text-xs text-muted-foreground leading-4 mt-0.5">
                          {perk.description}
                        </Text>
                      </View>
                    </View>

                    <View className="shrink-0 pt-0.5">
                      {isUnlocked ? (
                        <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5">
                          <Icon as={Check} className="text-emerald-500" size={12} />
                          <Text className="text-[10px] font-bold text-emerald-500">
                            Đã mở
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                          <Icon as={Lock} className="text-muted-foreground" size={11} />
                          <Text className="text-[10px] font-semibold text-muted-foreground">
                            Gói 99k
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View className="pt-3 border-t border-border/30 gap-2">
            <Button
              size="lg"
              onPress={() => {
                onClose();
                onUpgrade();
              }}
              className="h-12 w-full flex-row items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25 active:opacity-90"
            >
              <Text className="text-sm font-bold text-primary-foreground">
                {isBasicPlan
                  ? "⚡ Nâng cấp lên Gói VIP Toàn Diện (99k)"
                  : isVip
                    ? "🔄 Gia hạn thêm thời hạn VIP"
                    : "👑 Nâng cấp Gói VIP ngay"}
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
