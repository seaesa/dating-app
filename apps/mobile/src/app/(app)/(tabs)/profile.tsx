import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { meQuery, profileOptionsQuery } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";
import { Button, ProfileCard, Skeleton, Text } from "@repo/ui";

import { attributeEntry } from "@/chat/catalog";
import {
  MembershipCard,
  MembershipModal,
  VietQrPaymentModal,
} from "@/components/membership";

export default function ProfileScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const { data, isPending, isError } = useQuery(meQuery());
  const { data: optionsData } = useQuery(profileOptionsQuery());

  const [isMembershipModalVisible, setIsMembershipModalVisible] = React.useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = React.useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = React.useState<string | null>(null);

  const handleSelectPlan = (planCode: string) => {
    setSelectedPlanCode(planCode);
    setIsMembershipModalVisible(false);
    setIsPaymentModalVisible(true);
  };

  const profile = data?.profile;
  const photoUrl = data?.identity?.photoUrls[0] ?? null;

  // Extract all photos for the photo gallery
  const photoList = React.useMemo(() => {
    if (data?.account?.photos && data.account.photos.length > 0) {
      return data.account.photos.map((p) => ({ key: p.mediaId, uri: p.url }));
    }
    if (data?.identity?.photoUrls && data.identity.photoUrls.length > 0) {
      return data.identity.photoUrls.map((url, idx) => ({
        key: `url-${idx}`,
        uri: url,
      }));
    }
    return [];
  }, [data?.account?.photos, data?.identity?.photoUrls]);

  const interestMap = React.useMemo(() => {
    const map = new Map<string, { label: string; icon?: string | null }>();
    if (optionsData?.interestGroups) {
      for (const group of optionsData.interestGroups) {
        for (const opt of group.options) {
          map.set(opt.value, { label: opt.label, icon: opt.icon });
        }
      }
    }
    return map;
  }, [optionsData]);

  const formattedInterests = React.useMemo(() => {
    if (!profile?.interests) return [];
    return profile.interests.map((key) => {
      const match = interestMap.get(key);
      return {
        key,
        label: match?.label ?? key,
        icon: match?.icon ?? null,
      };
    });
  }, [profile?.interests, interestMap]);

  // Lifestyle and profile attributes badges
  const lifestyleBadges = React.useMemo(() => {
    if (!profile?.attributes) return [];
    const attrs = profile.attributes;
    const result: Array<{
      key: string;
      icon: string;
      label: string;
      title: string;
    }> = [];

    const order: Array<keyof typeof attrs> = [
      "intent",
      "heightCm",
      "education",
      "industry",
      "hometown",
      "exercise",
      "drinking",
      "smoking",
      "pets",
      "diet",
      "zodiac",
      "loveLanguage",
      "mbti",
      "hasChildren",
      "wantsChildren",
    ];

    for (const key of order) {
      const val = attrs[key];
      const entry = attributeEntry(
        optionsData,
        key,
        val as string | number | null | undefined,
      );
      if (entry) {
        result.push({
          key,
          icon: entry.icon ?? "✨",
          label: entry.label,
          title: entry.title,
        });
      }
    }

    return result;
  }, [profile?.attributes, optionsData]);

  // Profile completion percent calculation
  const completionPercent = React.useMemo(() => {
    if (!profile) return 0;
    let score = 0;
    // Basic details: 40% (10% each)
    if (profile.displayName) score += 10;
    if (profile.age) score += 10;
    if (profile.city) score += 10;
    if (profile.gender) score += 10;

    // Photos: 20% (10% for >= 1 photo, +10% for >= 3 photos)
    const photoCount = photoList.length;
    if (photoCount >= 1) score += 10;
    if (photoCount >= 3) score += 10;

    // Bio: 15%
    if (profile.bio?.trim()) score += 15;

    // Education, industry, intent: 15% (5% each)
    if (profile.attributes?.education) score += 5;
    if (profile.attributes?.industry) score += 5;
    if (profile.attributes?.intent) score += 5;

    // Lifestyle habit: 10%
    const hasHabit = Boolean(
      profile.attributes?.smoking ||
      profile.attributes?.drinking ||
      profile.attributes?.exercise ||
      profile.attributes?.pets,
    );
    if (hasHabit) score += 10;

    return Math.min(100, score);
  }, [profile, photoList.length]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="h-14 w-full flex-row items-center justify-between border-b border-border/30 px-5">
        <View>
          <Text className="text-2xl font-black tracking-tight text-foreground">
            Hồ sơ của tôi
          </Text>
        </View>
        <View className="flex-row items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
          <Text className="text-xs">🛡️</Text>
          <Text className="text-xs font-bold text-primary">100% Ẩn danh</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-5">
          {isPending ? (
            <View className="gap-4">
              <Skeleton className="h-48 w-full rounded-3xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </View>
          ) : null}

          {isError ? (
            <View className="rounded-2xl bg-destructive/10 p-4">
              <Text className="text-center text-sm font-medium text-destructive">
                Không tải được thông tin hồ sơ. Vui lòng thử lại.
              </Text>
            </View>
          ) : null}

          {data ? (
            <>
              {/* Profile Overview Card (Hero) */}
              <ProfileCard
                nickname={data.profile.displayName}
                age={data.profile.age}
                city={data.profile.city}
                gender={data.profile.gender}
                bio={data.profile.bio}
                interests={formattedInterests}
                avatarUrl={photoUrl}
              />

              {/* Membership Status & Upgrade Card */}
              <MembershipCard onUpgrade={() => setIsMembershipModalVisible(true)} />

              {/* Action Button: Chỉnh sửa hồ sơ */}
              <Button
                size="xl"
                onPress={() => router.push("/(app)/edit-profile")}
                className="h-12 w-full flex-row items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25 active:opacity-90"
              >
                <Text className="text-base font-bold text-primary-foreground">
                  ✏️ Chỉnh sửa hồ sơ
                </Text>
              </Button>

              {/* Photo Gallery (Up to 6 photos preview) */}
              <View className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm shadow-black/5">
                <View className="flex-row items-center justify-between pb-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base">📸</Text>
                    <Text className="text-sm font-bold text-foreground">
                      Bộ sưu tập ảnh ({photoList.length}/6)
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push("/(app)/edit-profile")}
                    hitSlop={8}
                    className="flex-row items-center gap-1 active:opacity-70"
                  >
                    <Text className="text-xs font-bold text-primary">Quản lý ảnh</Text>
                    <Text className="text-xs text-primary">→</Text>
                  </Pressable>
                </View>

                {photoList.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {photoList.map((photo, index) => (
                      <View
                        key={photo.key || `photo-${index}`}
                        className="relative h-28 w-20 overflow-hidden rounded-xl border border-border/70 bg-secondary"
                      >
                        <Image
                          source={{ uri: photo.uri }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                        {index === 0 ? (
                          <View className="absolute bottom-1 left-1 rounded-md bg-primary/90 px-1.5 py-0.5">
                            <Text className="text-[9px] font-bold text-primary-foreground">
                              Ảnh chính
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    ))}
                    {photoList.length < 6 ? (
                      <Pressable
                        onPress={() => router.push("/(app)/edit-profile")}
                        className="h-28 w-20 items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 active:bg-secondary/50"
                      >
                        <Text className="text-xl font-bold text-primary">+</Text>
                        <Text className="pt-0.5 text-[10px] font-semibold text-primary">
                          Thêm ảnh
                        </Text>
                      </Pressable>
                    ) : null}
                  </ScrollView>
                ) : (
                  <Pressable
                    onPress={() => router.push("/(app)/edit-profile")}
                    className="h-24 w-full items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 active:bg-secondary/50"
                  >
                    <Text className="text-sm font-bold text-primary">
                      + Tải ảnh chân dung
                    </Text>
                    <Text className="pt-1 text-xs text-muted-foreground">
                      Thêm tối đa 6 bức ảnh để hồ sơ nổi bật hơn
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Section: Thông tin cá nhân & Lối sống */}
              <View className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm shadow-black/5">
                <View className="flex-row items-center justify-between pb-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base">🌿</Text>
                    <Text className="text-sm font-bold text-foreground">
                      Thông tin cá nhân & Lối sống
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => router.push("/(app)/edit-profile")}
                    hitSlop={8}
                    className="flex-row items-center gap-1 active:opacity-70"
                  >
                    <Text className="text-xs font-bold text-primary">Cập nhật</Text>
                    <Text className="text-xs text-primary">→</Text>
                  </Pressable>
                </View>

                {lifestyleBadges.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2 pt-1">
                    {lifestyleBadges.map((item) => (
                      <View
                        key={item.key}
                        className="flex-row items-center gap-2 rounded-xl border border-border/70 bg-secondary/50 px-3 py-2"
                      >
                        <Text className="text-base">{item.icon}</Text>
                        <View>
                          <Text className="text-[10px] font-semibold text-muted-foreground">
                            {item.title}
                          </Text>
                          <Text className="text-xs font-bold text-foreground">
                            {item.label}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Pressable
                    onPress={() => router.push("/(app)/edit-profile")}
                    className="items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 p-4 active:bg-secondary/50"
                  >
                    <Text className="text-sm font-bold text-primary">
                      + Thêm học vấn, nghề nghiệp & lối sống
                    </Text>
                    <Text className="pt-1 text-center text-xs text-muted-foreground">
                      Giúp bạn tăng độ tin cậy và tìm được người có cùng lối sống
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Profile Completion Tracker */}
              <View className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm shadow-black/5">
                <View className="flex-row items-center justify-between pb-2">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base">🚀</Text>
                    <Text className="text-sm font-bold text-foreground">
                      Mức độ hoàn thiện hồ sơ
                    </Text>
                  </View>
                  <Text className="text-sm font-black text-primary">
                    {completionPercent}%
                  </Text>
                </View>

                {/* Progress bar */}
                <View className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                  <View
                    style={{ width: `${completionPercent}%` }}
                    className="h-full rounded-full bg-primary"
                  />
                </View>

                <Text className="pt-2.5 text-xs leading-4 text-muted-foreground">
                  {completionPercent >= 100
                    ? "✨ Hồ sơ của bạn đã hoàn hảo để tìm kiếm đối tượng tương thích!"
                    : "💡 Cập nhật đầy đủ ảnh chân dung, nghề nghiệp và lối sống để tăng 2x cơ hội kết đôi tương thích."}
                </Text>
              </View>

              {/* Dating Highlights / 3 Quick Stats */}
              <View className="flex-row gap-2.5">
                <View className="flex-1 items-center justify-center rounded-2xl border border-border/70 bg-card p-3 shadow-sm shadow-black/5">
                  <Text className="text-xl">🛡️</Text>
                  <Text className="pt-1 text-[11px] font-bold text-muted-foreground">
                    BẢO MẬT
                  </Text>
                  <Text className="text-xs font-bold text-foreground">Ẩn danh</Text>
                </View>

                <View className="flex-1 items-center justify-center rounded-2xl border border-border/70 bg-card p-3 shadow-sm shadow-black/5">
                  <Text className="text-xl">💬</Text>
                  <Text className="pt-1 text-[11px] font-bold text-muted-foreground">
                    TRÒ CHUYỆN
                  </Text>
                  <Text className="text-xs font-bold text-foreground">Sẵn sàng</Text>
                </View>

                <View className="flex-1 items-center justify-center rounded-2xl border border-border/70 bg-card p-3 shadow-sm shadow-black/5">
                  <Text className="text-xl">🔥</Text>
                  <Text className="pt-1 text-[11px] font-bold text-muted-foreground">
                    GHÉP ĐÔI
                  </Text>
                  <Text className="text-xs font-bold text-foreground">Đang mở</Text>
                </View>
              </View>

              {/* Private Identity (Rule Zero - Danh tính bí mật) */}
              <View className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm shadow-black/5">
                <View className="flex-row items-center justify-between border-b border-border/40 pb-3">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-base">🔒</Text>
                    <Text className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Danh tính riêng tư
                    </Text>
                  </View>
                  <View className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5">
                    <Text className="text-[11px] font-bold text-primary">
                      Chỉ bạn thấy
                    </Text>
                  </View>
                </View>

                <View className="gap-2.5 pt-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground">Tên thật:</Text>
                    <Text className="text-sm font-bold text-foreground">
                      {data.identity?.realName ?? "Chưa thiết lập"}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground">Số điện thoại:</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      {data.phone
                        ? data.phone.replace(/(\+?\d{3,4})\d{3}(\d{3})/, "$1***$2")
                        : "Chưa liên kết"}
                    </Text>
                  </View>
                </View>

                <View className="mt-3.5 rounded-xl bg-secondary/70 p-3">
                  <Text className="text-[11px] leading-4 text-muted-foreground">
                    🛡️{" "}
                    <Text className="font-bold text-foreground">
                      Nguyên tắc Rule Zero:
                    </Text>{" "}
                    Tên thật, số điện thoại và ảnh chân dung sẽ luôn được mã hóa an toàn.
                    Chỉ khi cả hai người cùng đồng ý mở danh tính trong cuộc trò chuyện,
                    thông tin mới được tiết lộ.
                  </Text>
                </View>
              </View>

              {/* Settings / Preferences Shortcuts */}
              <View className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm shadow-black/5">
                <Pressable
                  className="flex-row items-center justify-between border-b border-border/40 p-4 active:bg-secondary/60"
                  onPress={() => router.push("/(app)/edit-profile")}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-base">⚙️</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      Tùy chọn ghép đôi & đối tượng
                    </Text>
                  </View>
                  <Text className="text-sm text-muted-foreground">→</Text>
                </Pressable>

                <Pressable
                  className="flex-row items-center justify-between border-b border-border/40 p-4 active:bg-secondary/60"
                  onPress={() => {}}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-base">🔔</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      Thông báo & Tin nhắn
                    </Text>
                  </View>
                  <Text className="text-sm text-muted-foreground">→</Text>
                </Pressable>

                <Pressable
                  className="flex-row items-center justify-between p-4 active:bg-secondary/60"
                  onPress={() => {}}
                >
                  <View className="flex-row items-center gap-3">
                    <Text className="text-base">❓</Text>
                    <Text className="text-sm font-semibold text-foreground">
                      Trung tâm hỗ trợ & An toàn
                    </Text>
                  </View>
                  <Text className="text-sm text-muted-foreground">→</Text>
                </Pressable>
              </View>

              {/* Sign out */}
              <View className="pt-2">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-2xl border-destructive/30 bg-destructive/5 active:bg-destructive/10"
                  onPress={() => {
                    void signOut().then(() => router.replace("/(auth)/phone"));
                  }}
                >
                  <Text className="text-sm font-bold text-destructive">Đăng xuất</Text>
                </Button>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Membership Pricing Modal */}
      <MembershipModal
        visible={isMembershipModalVisible}
        onClose={() => setIsMembershipModalVisible(false)}
        onSelectPlan={handleSelectPlan}
      />

      {/* VietQR Payment Modal */}
      <VietQrPaymentModal
        visible={isPaymentModalVisible}
        planCode={selectedPlanCode}
        onClose={() => {
          setIsPaymentModalVisible(false);
          setSelectedPlanCode(null);
        }}
      />
    </SafeAreaView>
  );
}
