import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { Alert, Modal, Pressable, ScrollView, Share, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createInteraction,
  type DiscoveryCandidateRead,
  type InteractionAction,
  type ProfileAttributes,
  type ProfilePrompt,
  type UserRead,
} from "@repo/api-contract";
import { Avatar, AvatarFallback, Badge, DEFAULT_INTEREST_LABELS, Text } from "@repo/ui";

export interface ProfileDetailData {
  userId: string;
  displayName: string;
  age: number;
  gender?: "male" | "female" | "other" | null;
  city: string;
  distanceKm?: number | null;
  bio?: string | null;
  verified?: boolean;
  interests?: string[];
  attributes?: ProfileAttributes | null;
  prompts?: ProfilePrompt[] | null;
}

export function extractProfileDetail(
  source: DiscoveryCandidateRead | UserRead,
): ProfileDetailData | null {
  if (!source) return null;

  // Check if it's DiscoveryCandidateRead
  if ("user" in source && source.user) {
    const candidate = source as DiscoveryCandidateRead;
    const profile = candidate.user.profile;
    if (!profile) return null;

    return {
      userId: candidate.user.id,
      displayName: profile.displayName,
      age: profile.age,
      gender: profile.gender,
      city: profile.city,
      distanceKm: candidate.distanceKm,
      bio: profile.bio,
      verified: profile.verified,
      interests: profile.interests,
      attributes: profile.attributes,
      prompts: profile.prompts,
    };
  }

  // It's UserRead
  const user = source as UserRead;
  const profile = user.profile;
  if (!profile) return null;

  return {
    userId: user.id,
    displayName: profile.displayName,
    age: profile.age,
    gender: profile.gender,
    city: profile.city,
    bio: profile.bio,
    verified: profile.verified,
    interests: profile.interests,
    attributes: profile.attributes,
    prompts: profile.prompts,
  };
}

const GENDER_LABELS: Record<string, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
};

const INTENT_LABELS: Record<string, string> = {
  serious_relationship: "Tìm kiếm mối quan hệ nghiêm túc",
  marriage: "Hướng tới hôn nhân",
  dating: "Hẹn hò tìm hiểu",
  casual: "Trò chuyện, kết bạn",
  friendship: "Tìm bạn cùng sở thích",
};

export interface ProfileDetailContentProps {
  data: ProfileDetailData;
  onClose?: () => void;
  onActionComplete?: (action: InteractionAction) => void;
}

export function ProfileDetailContent({
  data,
  onClose,
  onActionComplete,
}: ProfileDetailContentProps) {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const interactionMutation = useMutation({
    mutationFn: createInteraction,
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      onActionComplete?.(variables.action);
      if (result.matched) {
        Alert.alert("Chúc mừng! 🎉", "Hai bạn đã gửi tín hiệu cho nhau!");
      }
      onClose?.();
    },
    onError: (error) => {
      Alert.alert("Lỗi", "Không thể gửi tương tác. Vui lòng thử lại sau.");
      console.error("Interaction failed:", error);
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  const genderText = data.gender ? (GENDER_LABELS[data.gender] ?? "Khác") : "Nữ";
  const intentText = data.attributes?.intent
    ? (INTENT_LABELS[data.attributes.intent] ?? data.attributes.intent)
    : "Tìm kiếm mối quan hệ nghiêm túc";
  const educationText = data.attributes?.education ?? "Đại học Kiến Trúc TP.HCM";
  const occupationText = data.attributes?.industry ?? "Thiết kế đồ họa";

  const firstPrompt = data.prompts && data.prompts.length > 0 ? data.prompts[0] : null;

  async function handleShare() {
    try {
      await Share.share({
        message: `Khám phá hồ sơ ẩn danh của ${data.displayName} trên Terdin Date!`,
      });
    } catch {
      // Ignore share errors
    }
  }

  function handleAction(action: "pass" | "like" | "star") {
    if (!data.userId || isSubmitting) return;
    setIsSubmitting(true);

    // If userId is not a valid 24-character hex BSON ObjectId (e.g. mock profile)
    if (!/^[0-9a-fA-F]{24}$/.test(data.userId)) {
      setTimeout(() => {
        setIsSubmitting(false);
        onActionComplete?.(action);
        if (action === "like" || action === "star") {
          Alert.alert("Thành công! 🎉", "Đã gửi tín hiệu kết nối!");
        }
        onClose?.();
      }, 250);
      return;
    }

    interactionMutation.mutate({
      targetId: data.userId,
      action,
    });
  }

  function handleReportOrBlock() {
    if (!data.userId) return;
    Alert.alert(
      "Báo cáo hoặc Chặn",
      `Bạn muốn thực hiện thao tác nào với ${data.displayName}?`,
      [
        {
          text: "Báo cáo hồ sơ",
          style: "destructive",
          onPress: () => {
            interactionMutation.mutate({
              targetId: data.userId,
              action: "report",
            });
            Alert.alert("Đã ghi nhận", "Cảm ơn bạn đã phản hồi.");
          },
        },
        {
          text: "Chặn người này",
          style: "destructive",
          onPress: () => {
            interactionMutation.mutate({
              targetId: data.userId,
              action: "block",
            });
            Alert.alert("Đã chặn", `Bạn sẽ không còn thấy ${data.displayName} nữa.`);
          },
        },
        { text: "Hủy", style: "cancel" },
      ],
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Top Header */}
      <View className="h-14 w-full flex-row items-center justify-between border-b border-border/30 px-5">
        {/* Active status pill */}
        <View className="flex-row items-center gap-1.5 rounded-full border border-border/70 bg-secondary/80 px-3 py-1">
          <View className="h-2 w-2 rounded-full bg-emerald-500" />
          <Text className="text-xs font-semibold text-emerald-600">Đang hoạt động</Text>
        </View>

        {/* Action buttons: Share & Close */}
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={handleShare}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70"
          >
            <Text className="text-base text-foreground">🔗</Text>
          </Pressable>

          {onClose ? (
            <Pressable
              onPress={onClose}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70"
            >
              <Text className="text-sm font-bold text-muted-foreground">✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        className="flex-1 px-5"
        contentContainerClassName="pt-6 pb-28 gap-6"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section: Avatar Silhouette & Identity */}
        <View className="items-center gap-3">
          {/* Avatar with Verified Badge */}
          <View className="relative">
            <View className="h-28 w-28 items-center justify-center rounded-full border-4 border-card bg-primary-muted shadow-sm shadow-black/10">
              <Avatar alt={data.displayName} className="h-24 w-24">
                <AvatarFallback className="bg-primary/10">
                  <Text className="text-3xl font-black text-primary">
                    {data.displayName.slice(0, 2).toUpperCase()}
                  </Text>
                </AvatarFallback>
              </Avatar>
            </View>

            {/* Verified fire badge at bottom right */}
            <View className="absolute bottom-0 right-0 h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary shadow-xs">
              <Text className="text-xs font-black text-primary-foreground">🔥</Text>
            </View>
          </View>

          {/* Display Name + Age + Verified Tick */}
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl font-black tracking-tight text-foreground">
              {data.displayName} {data.age}
            </Text>
            {data.verified ? (
              <View className="h-5 w-5 items-center justify-center rounded-full bg-sky-500">
                <Text className="text-[11px] font-bold text-white">✓</Text>
              </View>
            ) : null}
          </View>

          {/* Subtitle: Gender • Age • City */}
          <Text className="text-sm font-medium text-muted-foreground">
            {genderText} • {data.age} tuổi • {data.city}
          </Text>

          {/* Distance Badge */}
          {data.distanceKm !== undefined && data.distanceKm !== null ? (
            <View className="flex-row items-center gap-1.5 rounded-full border border-border/80 bg-secondary/80 px-3.5 py-1">
              <Text className="text-xs">🧭</Text>
              <Text className="text-xs font-semibold text-foreground">
                Cách bạn {Math.round(data.distanceKm)} km
              </Text>
            </View>
          ) : null}
        </View>

        {/* Basic Info (3 Cards) */}
        <View className="gap-2.5">
          {/* Occupation */}
          <View className="flex-row items-center gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-3.5">
            <Text className="text-lg">🎨</Text>
            <Text className="text-sm font-semibold text-foreground">
              {occupationText}
            </Text>
          </View>

          {/* Education */}
          <View className="flex-row items-center gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-3.5">
            <Text className="text-lg">🎓</Text>
            <Text className="text-sm font-semibold text-foreground">{educationText}</Text>
          </View>

          {/* Relationship Intent */}
          <View className="flex-row items-center gap-3 rounded-2xl border border-border/60 bg-secondary/40 p-3.5">
            <Text className="text-lg">🤍</Text>
            <Text className="text-sm font-semibold text-foreground">{intentText}</Text>
          </View>
        </View>

        {/* Bio Quote Card */}
        {data.bio ? (
          <View className="rounded-3xl border border-border/60 bg-secondary/30 p-5 gap-2.5">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl font-black text-primary">❝</Text>
              <Text className="text-sm font-bold text-foreground">Giới thiệu</Text>
            </View>
            <Text className="text-sm leading-6 text-foreground/90 italic">
              {`"${data.bio}"`}
            </Text>
          </View>
        ) : null}

        {/* Interests Section */}
        {data.interests && data.interests.length > 0 ? (
          <View className="gap-2.5">
            <Text className="text-base font-bold text-foreground">Sở thích</Text>
            <View className="flex-row flex-wrap gap-2">
              {data.interests.map((key) => {
                const fallback = DEFAULT_INTEREST_LABELS[key];
                const label = fallback?.label ?? key.replace(/_/g, " ");
                const icon = fallback?.icon ?? "✨";

                return (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="flex-row items-center gap-1.5 rounded-xl border border-border/70 bg-card px-3.5 py-2 shadow-xs"
                  >
                    <Text className="text-xs">{icon}</Text>
                    <Text className="text-xs font-semibold text-foreground">{label}</Text>
                  </Badge>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Icebreaker Prompt Card */}
        {firstPrompt ? (
          <View className="rounded-3xl border border-border/60 bg-secondary/50 p-5 gap-2.5">
            <Text className="text-xs font-medium text-muted-foreground">
              {firstPrompt.question}
            </Text>
            <Text className="text-base font-bold leading-snug text-foreground">
              {`"${firstPrompt.answer}"`}
            </Text>
          </View>
        ) : (
          <View className="rounded-3xl border border-border/60 bg-secondary/50 p-5 gap-2.5">
            <Text className="text-xs font-medium text-muted-foreground">
              Món quà hoàn hảo cho ngày chủ nhật?...
            </Text>
            <Text className="text-base font-bold leading-snug text-foreground">
              {
                "...một ly latte nóng, một cuốn sách hay và một buổi sáng không có chuông báo thức."
              }
            </Text>
          </View>
        )}

        {/* Report or Block */}
        <Pressable
          onPress={handleReportOrBlock}
          className="items-center py-2 active:opacity-70"
        >
          <Text className="text-xs font-semibold text-muted-foreground underline">
            ⚑ Báo cáo hoặc chặn {data.displayName}
          </Text>
        </Pressable>
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <SafeAreaView
        edges={["bottom"]}
        className="absolute bottom-0 left-0 right-0 border-t border-border/40 bg-card/95 px-5 py-3 shadow-lg"
      >
        <View className="flex-row items-center gap-3.5">
          {/* Pass Button (✕) */}
          <Pressable
            disabled={isSubmitting}
            onPress={() => handleAction("pass")}
            className="h-14 w-14 items-center justify-center rounded-full border border-border/80 bg-background shadow-xs active:scale-95"
          >
            <Text className="text-xl font-bold text-muted-foreground">✕</Text>
          </Pressable>

          {/* Connect Button (♡ Gửi yêu cầu kết nối) */}
          <Pressable
            disabled={isSubmitting}
            onPress={() => handleAction("like")}
            className="h-14 flex-1 flex-row items-center justify-center gap-2 rounded-full bg-primary shadow-md shadow-primary/25 active:opacity-90"
          >
            <Text className="text-lg text-primary-foreground">♡</Text>
            <Text className="text-base font-bold text-primary-foreground">
              Gửi yêu cầu kết nối
            </Text>
          </Pressable>

          {/* Star / Superlike Button (⭐) */}
          <Pressable
            disabled={isSubmitting}
            onPress={() => handleAction("star")}
            className="h-14 w-14 items-center justify-center rounded-full border border-amber-300/60 bg-amber-500/10 shadow-xs active:scale-95"
          >
            <Text className="text-xl">⭐</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

export interface ProfileDetailModalProps {
  visible: boolean;
  onClose: () => void;
  candidate?: DiscoveryCandidateRead | UserRead | null;
  profileData?: ProfileDetailData | null;
  onActionComplete?: (action: InteractionAction) => void;
}

export function ProfileDetailModal({
  visible,
  onClose,
  candidate,
  profileData: explicitData,
  onActionComplete,
}: ProfileDetailModalProps) {
  const data: ProfileDetailData | null = React.useMemo(() => {
    if (explicitData) return explicitData;
    if (candidate) return extractProfileDetail(candidate);
    return null;
  }, [candidate, explicitData]);

  if (!visible || !data) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <ProfileDetailContent
          data={data}
          onClose={onClose}
          onActionComplete={onActionComplete}
        />
      </SafeAreaView>
    </Modal>
  );
}
