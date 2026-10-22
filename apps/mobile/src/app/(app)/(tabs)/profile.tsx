import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { router } from "expo-router";
import Camera from "lucide-react-native/icons/camera";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Compass from "lucide-react-native/icons/compass";
import Crown from "lucide-react-native/icons/crown";
import Flame from "lucide-react-native/icons/flame";
import Gem from "lucide-react-native/icons/gem";
import Lock from "lucide-react-native/icons/lock";
import LogOut from "lucide-react-native/icons/log-out";
import MapPin from "lucide-react-native/icons/map-pin";
import MessageCircle from "lucide-react-native/icons/message-circle";
import Pencil from "lucide-react-native/icons/pencil";
import Plus from "lucide-react-native/icons/plus";
import Shield from "lucide-react-native/icons/shield";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import TrendingUp from "lucide-react-native/icons/trending-up";
import User from "lucide-react-native/icons/user";
import UserX from "lucide-react-native/icons/user-x";
import * as React from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { meQuery, profileOptionsQuery } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";
import { Button, Icon, Skeleton, Text } from "@repo/ui";

import { attributeEntry } from "@/chat/catalog";
import {
  MembershipCard,
  MembershipModal,
  VietQrPaymentModal,
  VipPerksModal,
} from "@/components/membership";
import { BlockedUsersModal } from "@/components/profile/blocked-users-modal";
import { useMembership } from "@/hooks/use-membership";

export default function ProfileScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const { isVip, currentPlan } = useMembership();
  const { data, isPending, isError } = useQuery(meQuery());
  const { data: optionsData } = useQuery(profileOptionsQuery());

  const [isMembershipModalVisible, setIsMembershipModalVisible] = React.useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = React.useState(false);
  const [isPerksModalVisible, setIsPerksModalVisible] = React.useState(false);
  const [isBlockedModalVisible, setIsBlockedModalVisible] = React.useState(false);
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
        <Text className="text-2xl font-black tracking-tight text-foreground">
          Hồ sơ của tôi
        </Text>
        <View className="flex-row items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1">
          <Icon as={ShieldCheck} size={14} className="text-primary" />
          <Text className="text-xs font-bold text-primary">100% Ẩn danh</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{
          paddingBottom: Platform.select({ web: 120, default: 80 }),
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-4">
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
              {/* Bento Hero Persona Card */}
              <View className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm shadow-black/5 gap-4">
                <View className="flex-row items-center gap-4">
                  {/* Persona Avatar */}
                  <View className="relative">
                    <View className="rounded-full border-2 border-primary/30 p-1 shadow-sm shadow-primary/20">
                      <View className="h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                        {photoUrl ? (
                          <Image
                            source={{ uri: photoUrl }}
                            style={{ width: "100%", height: "100%" }}
                            contentFit="cover"
                          />
                        ) : (
                          <Icon
                            as={User}
                            size={36}
                            className={
                              data.profile.gender === "female"
                                ? "text-rose-500"
                                : "text-blue-500"
                            }
                          />
                        )}
                      </View>
                    </View>
                    <View className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-card bg-emerald-500" />
                  </View>

                  {/* Persona Info */}
                  <View className="flex-1 justify-center gap-1.5">
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <Text className="text-2xl font-black tracking-tight text-foreground">
                        {data.profile.displayName}
                      </Text>
                      {data.profile.isVip || isVip ? (
                        currentPlan?.code === "vip_pro" ||
                        data.profile.vipPlan === "99k" ? (
                          <View className="flex-row items-center gap-1 rounded-full bg-violet-600 px-2.5 py-0.5 shadow-sm shadow-violet-600/30">
                            <Icon as={Gem} size={10} className="text-white fill-white" />
                            <Text className="text-[10px] font-black tracking-wider text-white">
                              VIP PRO
                            </Text>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 shadow-sm shadow-amber-500/25">
                            <Icon
                              as={Crown}
                              size={10}
                              className="text-white fill-white"
                            />
                            <Text className="text-[10px] font-black tracking-wider text-white">
                              VIP
                            </Text>
                          </View>
                        )
                      ) : null}
                    </View>

                    {/* Badges for Gender, Age, City */}
                    <View className="flex-row flex-wrap items-center gap-1.5">
                      <View className="flex-row items-center rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5">
                        <Text className="text-xs font-bold text-primary">
                          {data.profile.gender === "female"
                            ? "♀ Nữ"
                            : data.profile.gender === "male"
                              ? "♂ Nam"
                              : "⚥ Khác"}
                        </Text>
                      </View>

                      <View className="flex-row items-center rounded-full border border-border/80 bg-secondary/80 px-2.5 py-0.5">
                        <Text className="text-xs font-medium text-foreground">
                          {data.profile.age} tuổi
                        </Text>
                      </View>

                      <View className="flex-row items-center gap-1 rounded-full border border-border/80 bg-secondary/80 px-2.5 py-0.5">
                        <Icon as={MapPin} size={11} className="text-muted-foreground" />
                        <Text className="text-xs font-medium text-muted-foreground">
                          {data.profile.city || "Việt Nam"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Bio */}
                {data.profile.bio ? (
                  <View className="rounded-2xl border border-border/40 bg-secondary/30 p-3.5">
                    <Text className="pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Giới thiệu
                    </Text>
                    <Text className="text-sm leading-5 text-foreground">
                      {data.profile.bio}
                    </Text>
                  </View>
                ) : null}

                {/* Interests Badges */}
                {formattedInterests.length > 0 ? (
                  <View className="gap-1.5">
                    <Text className="pb-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Sở thích ({formattedInterests.length})
                    </Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {formattedInterests.map((interest) => (
                        <View
                          key={interest.key}
                          className="flex-row items-center gap-1 rounded-xl border border-border/70 bg-secondary/60 px-2.5 py-1"
                        >
                          {interest.icon ? (
                            <Text className="text-xs">{interest.icon}</Text>
                          ) : null}
                          <Text className="text-xs font-semibold text-foreground">
                            {interest.label}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                {/* Edit Profile CTA Button */}
                <Button
                  size="lg"
                  onPress={() => router.push("/(app)/edit-profile")}
                  className="h-11 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-sm shadow-primary/20 active:opacity-90 active:scale-95"
                >
                  <Icon as={Pencil} size={15} className="text-primary-foreground" />
                  <Text className="text-sm font-bold text-primary-foreground">
                    Chỉnh sửa hồ sơ
                  </Text>
                </Button>
              </View>

              {/* Bento Tile 1: VIP Membership */}
              <MembershipCard
                onUpgrade={() => setIsMembershipModalVisible(true)}
                onViewPerks={() => setIsPerksModalVisible(true)}
              />

              {/* Bento Tile 2: Profile Completion Tracker */}
              <View className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm shadow-black/5 gap-2.5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                      <Icon as={TrendingUp} size={16} className="text-primary" />
                    </View>
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

                <Text className="text-xs leading-4 text-muted-foreground">
                  {completionPercent >= 100
                    ? "Hồ sơ của bạn đã đạt mức hoàn hảo để kết nối tương thích!"
                    : "Cập nhật đầy đủ ảnh chân dung, nghề nghiệp và lối sống để tăng 2x cơ hội kết đôi tương thích."}
                </Text>
              </View>

              {/* Bento Tile 3: 3 Quick Highlights */}
              <View className="flex-row gap-2.5">
                <View className="flex-1 items-center justify-center rounded-2xl border border-border/70 bg-card p-3 shadow-sm shadow-black/5 gap-1">
                  <Icon as={Shield} size={20} className="text-primary" />
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    BẢO MẬT
                  </Text>
                  <Text className="text-xs font-bold text-foreground">Ẩn danh</Text>
                </View>

                <View className="flex-1 items-center justify-center rounded-2xl border border-border/70 bg-card p-3 shadow-sm shadow-black/5 gap-1">
                  <Icon as={MessageCircle} size={20} className="text-sky-500" />
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    TRÒ CHUYỆN
                  </Text>
                  <Text className="text-xs font-bold text-foreground">Sẵn sàng</Text>
                </View>

                <View className="flex-1 items-center justify-center rounded-2xl border border-border/70 bg-card p-3 shadow-sm shadow-black/5 gap-1">
                  <Icon as={Flame} size={20} className="text-amber-500" />
                  <Text className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    GHÉP ĐÔI
                  </Text>
                  <Text className="text-xs font-bold text-foreground">Đang mở</Text>
                </View>
              </View>

              {/* Bento Tile 4: Privacy Vault (Rule Zero) */}
              <View className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm shadow-black/5 gap-3.5">
                <View className="flex-row items-center justify-between border-b border-border/30 pb-3">
                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                      <Icon as={Lock} size={16} className="text-primary" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-foreground">
                        Két danh tính riêng tư
                      </Text>
                      <Text className="text-[10px] text-muted-foreground">
                        Bảo vệ nghiêm ngặt bởi Rule Zero
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5">
                    <Icon as={ShieldCheck} size={11} className="text-primary" />
                    <Text className="text-[11px] font-bold text-primary">
                      Chỉ bạn thấy
                    </Text>
                  </View>
                </View>

                <View className="gap-2.5">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-muted-foreground">Họ và tên:</Text>
                    <Text className="text-sm font-bold text-foreground">
                      {data.identity?.realName ||
                        data.profile.displayName ||
                        "Chưa thiết lập"}
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

                {/* Photo Gallery inside Vault */}
                <View className="pt-1">
                  <View className="flex-row items-center justify-between pb-2">
                    <View className="flex-row items-center gap-1.5">
                      <Icon as={Camera} size={14} className="text-muted-foreground" />
                      <Text className="text-xs font-bold text-foreground">
                        Bộ sưu tập ảnh ({photoList.length}/6)
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => router.push("/(app)/edit-profile")}
                      hitSlop={8}
                      className="flex-row items-center gap-1 active:opacity-70"
                    >
                      <Text className="text-xs font-bold text-primary">Quản lý ảnh</Text>
                      <Icon as={ChevronRight} size={13} className="text-primary" />
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
                          <Icon as={Plus} size={20} className="text-primary" />
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
                      <View className="flex-row items-center gap-1.5">
                        <Icon as={Plus} size={16} className="text-primary" />
                        <Text className="text-sm font-bold text-primary">
                          Tải ảnh chân dung
                        </Text>
                      </View>
                      <Text className="pt-1 text-xs text-muted-foreground">
                        Thêm tối đa 6 bức ảnh để hồ sơ nổi bật hơn
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Rule Zero Explainer Banner */}
                <View className="rounded-2xl bg-secondary/70 p-3 flex-row items-start gap-2.5">
                  <Icon as={ShieldCheck} size={16} className="text-primary mt-0.5" />
                  <Text className="flex-1 text-[11px] leading-4 text-muted-foreground">
                    <Text className="font-bold text-foreground">Bảo mật Rule Zero:</Text>{" "}
                    Họ và tên, số điện thoại và ảnh chân dung sẽ luôn được lưu trữ an
                    toàn. Chỉ khi cả hai người cùng đồng ý mở danh tính trong cuộc trò
                    chuyện, thông tin mới được tiết lộ cho đối phương.
                  </Text>
                </View>
              </View>

              {/* Bento Tile 5: Thông tin cá nhân & Lối sống */}
              <View className="rounded-3xl border border-border/60 bg-card p-4 shadow-sm shadow-black/5 gap-3">
                <View className="flex-row items-center justify-between border-b border-border/30 pb-2.5">
                  <View className="flex-row items-center gap-2">
                    <View className="h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                      <Icon as={Compass} size={16} className="text-primary" />
                    </View>
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
                    <Icon as={ChevronRight} size={13} className="text-primary" />
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
                    <View className="flex-row items-center gap-1.5">
                      <Icon as={Plus} size={16} className="text-primary" />
                      <Text className="text-sm font-bold text-primary">
                        Thêm học vấn, nghề nghiệp & lối sống
                      </Text>
                    </View>
                    <Text className="pt-1 text-center text-xs text-muted-foreground">
                      Giúp bạn tăng độ tin cậy và tìm được người có cùng lối sống
                    </Text>
                  </Pressable>
                )}
              </View>

              {/* Bento Tile 6: Settings & Privacy Options */}
              <View className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-sm shadow-black/5">
                <Pressable
                  onPress={() => setIsBlockedModalVisible(true)}
                  className="flex-row items-center justify-between p-4 active:bg-secondary/60"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
                      <Icon as={UserX} size={18} className="text-destructive" />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-foreground">
                        Danh sách đã chặn
                      </Text>
                      <Text className="text-xs text-muted-foreground">
                        Quản lý và mở chặn người dùng
                      </Text>
                    </View>
                  </View>
                  <Icon
                    as={ChevronRight}
                    size={18}
                    className="text-muted-foreground/60"
                  />
                </Pressable>
              </View>

              {/* Sign out */}
              <View className="pt-1">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 w-full flex-row items-center justify-center gap-2 rounded-2xl border-destructive/30 bg-destructive/5 active:bg-destructive/10 active:scale-95"
                  onPress={() => {
                    void signOut().then(() => router.replace("/(auth)/phone"));
                  }}
                >
                  <Icon as={LogOut} size={16} className="text-destructive" />
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

      {/* VIP Perks Modal */}
      <VipPerksModal
        visible={isPerksModalVisible}
        onClose={() => setIsPerksModalVisible(false)}
        onUpgrade={() => setIsMembershipModalVisible(true)}
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

      {/* Blocked Users Modal */}
      <BlockedUsersModal
        visible={isBlockedModalVisible}
        onClose={() => setIsBlockedModalVisible(false)}
      />
    </SafeAreaView>
  );
}
