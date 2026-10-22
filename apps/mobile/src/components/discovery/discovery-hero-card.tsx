import * as Haptics from "expo-haptics";
import Check from "lucide-react-native/icons/check";
import Heart from "lucide-react-native/icons/heart";
import MapPin from "lucide-react-native/icons/map-pin";
import User from "lucide-react-native/icons/user";
import X from "lucide-react-native/icons/x";
import * as React from "react";
import { Platform, Pressable, View } from "react-native";

import { Button, Icon, Skeleton, Text, cn } from "@repo/ui";

import type { ProfileDetailData } from "./profile-detail-modal";

export interface DiscoveryHeroCardProps {
  profile: ProfileDetailData;
  onPressCard?: (profile: ProfileDetailData) => void;
  onGreet?: (userId: string) => void;
  onPass?: (userId: string) => void;
  isGreeted?: boolean;
  isPassPending?: boolean;
  isGreetPending?: boolean;
}

export function DiscoveryHeroCard({
  profile,
  onGreet,
  onPass,
  isGreeted = false,
  isPassPending = false,
  isGreetPending = false,
}: DiscoveryHeroCardProps) {
  const isFemale = profile.gender === "female";
  const isMale = profile.gender === "male";
  const genderLabel = isFemale ? "Nữ" : isMale ? "Nam" : "Khác";
  const ageLabel = profile.age ? `${profile.age} tuổi` : "";
  const personaTitle = `${genderLabel}${ageLabel ? `, ${ageLabel}` : ""}`;

  return (
    <View className="mb-2.5 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm shadow-black/5">
      {/* Compact Anonymous Info Row */}
      <View
        className={cn(
          "flex-row items-center gap-3 px-3.5 py-3",
          isFemale ? "bg-rose-500/5" : "bg-blue-500/5",
        )}
      >
        {/* Compact Avatar (No Online Dot) */}
        <View
          className={cn(
            "h-12 w-12 items-center justify-center rounded-xl border border-border/40 shadow-sm",
            isFemale ? "bg-rose-500/10" : "bg-blue-500/10",
          )}
        >
          <Icon
            as={User}
            size={24}
            className={isFemale ? "text-rose-500" : "text-blue-500"}
          />
        </View>

        {/* Compact Info: Title & Location */}
        <View className="flex-1 justify-center gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text className="text-base font-bold tracking-tight text-foreground">
              {personaTitle}
            </Text>
            <View
              className={cn(
                "rounded px-1.5 py-0.5",
                isFemale ? "bg-rose-500/15" : "bg-blue-500/15",
              )}
            >
              <Text
                className={cn(
                  "text-[10px] font-bold uppercase",
                  isFemale ? "text-rose-600" : "text-blue-600",
                )}
              >
                {genderLabel}
              </Text>
            </View>
          </View>

          {/* Location & Distance */}
          <View className="flex-row items-center gap-1">
            <Icon as={MapPin} size={12} className="text-muted-foreground" />
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {profile.city || "Việt Nam"}
              {profile.distanceKm !== undefined && profile.distanceKm !== null
                ? ` • Cách ${profile.distanceKm < 1 ? "< 1" : Math.round(profile.distanceKm)} km`
                : ""}
            </Text>
          </View>
        </View>
      </View>

      {/* Compact Footer: Action Buttons */}
      <View className="flex-row items-center justify-between border-t border-border/30 px-3.5 py-2.5 gap-2.5 bg-card">
        {/* Pass Button */}
        <Pressable
          disabled={isGreeted || isPassPending}
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
            onPass?.(profile.userId);
          }}
          hitSlop={6}
          accessibilityLabel="Bỏ qua hồ sơ"
          className="h-10 w-10 items-center justify-center rounded-full border border-border/80 bg-secondary active:scale-90 active:opacity-60"
        >
          <Icon as={X} size={17} className="text-muted-foreground" />
        </Pressable>

        {/* Greet Button */}
        <Button
          size="sm"
          disabled={isGreeted || isGreetPending}
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            }
            onGreet?.(profile.userId);
          }}
          className={cn(
            "h-10 flex-1 flex-row items-center justify-center gap-1.5 rounded-full shadow-sm active:scale-95",
            isGreeted ? "bg-secondary" : "bg-primary shadow-primary/20",
          )}
        >
          {isGreeted ? (
            <>
              <Icon as={Check} size={15} className="text-muted-foreground" />
              <Text className="text-xs font-semibold text-muted-foreground">
                Đã gửi tín hiệu
              </Text>
            </>
          ) : (
            <>
              <Icon
                as={Heart}
                size={15}
                className="text-primary-foreground fill-primary-foreground"
              />
              <Text className="text-xs font-semibold text-primary-foreground">
                Gửi lời chào
              </Text>
            </>
          )}
        </Button>
      </View>
    </View>
  );
}

export function DiscoveryCardSkeleton() {
  return (
    <View className="mb-2.5 overflow-hidden rounded-2xl border border-border/60 bg-card p-3.5 gap-2.5 shadow-sm shadow-black/5">
      <View className="flex-row items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <View className="flex-1 gap-1.5">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-3 w-36 rounded-md" />
        </View>
      </View>
      <View className="flex-row items-center justify-between pt-1 border-t border-border/20 gap-2.5">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-full" />
      </View>
    </View>
  );
}
