import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import ChevronRight from "lucide-react-native/icons/chevron-right";
import Heart from "lucide-react-native/icons/heart";
import RotateCw from "lucide-react-native/icons/rotate-cw";
import Search from "lucide-react-native/icons/search";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import Sparkles from "lucide-react-native/icons/sparkles";
import User from "lucide-react-native/icons/user";
import X from "lucide-react-native/icons/x";
import Zap from "lucide-react-native/icons/zap";
import * as React from "react";
import { Pressable, RefreshControl, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createInteraction,
  discoveryCountQuery,
  discoveryFeedQuery,
  type DiscoveryCandidateRead,
} from "@repo/api-contract";
import { APP_NAME } from "@repo/core";
import { Button, Icon, Text } from "@repo/ui";

import {
  DiscoveryCardSkeleton,
  DiscoveryHeroCard,
} from "../../../components/discovery/discovery-hero-card";
import type { DiscoveryFilterState } from "../../../components/discovery/filter-modal";
import { DEFAULT_FILTERS, FilterModal } from "../../../components/discovery/filter-modal";
import {
  extractProfileDetail,
  type ProfileDetailData,
} from "../../../components/discovery/profile-detail-modal";
import { MatchCelebrationModal } from "../../../components/matches/match-celebration-modal";

import { useToast } from "@/hooks/use-toast";

export default function HomeFeedScreen() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [greeted, setGreeted] = React.useState<Record<string, boolean>>({});
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [celebrationData, setCelebrationData] = React.useState<{
    partnerName: string;
    partnerGender?: string | null;
    connectionId?: string | null;
  } | null>(null);
  const [activeFilters, setActiveFilters] =
    React.useState<DiscoveryFilterState>(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Convert filter state to API parameters
  const queryParams = React.useMemo(() => {
    return {
      genders:
        activeFilters.gender === "all"
          ? (["female", "male", "other"] as Array<"female" | "male" | "other">)
          : ([activeFilters.gender] as Array<"female" | "male" | "other">),
      age_min: activeFilters.ageMin,
      age_max: activeFilters.ageMax,
      max_distance_km:
        activeFilters.maxDistanceKm > 0 ? activeFilters.maxDistanceKm : undefined,
      cities: activeFilters.city ? [activeFilters.city] : undefined,
    };
  }, [activeFilters]);

  // TanStack Query for feed & count
  const {
    data: feedData,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery(discoveryFeedQuery(queryParams));

  const { data: countData } = useQuery(discoveryCountQuery(queryParams));

  // Mutation for Greet / Interaction
  const greetMutation = useMutation({
    mutationFn: createInteraction,
    onSuccess: (result, vars) => {
      setGreeted((prev) => ({ ...prev, [vars.targetId]: true }));
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      const partner = allProfiles.find((p) => p.userId === vars.targetId);
      const partnerGenderLabel =
        partner?.gender === "female"
          ? "Bạn nữ"
          : partner?.gender === "male"
            ? "Bạn nam"
            : "Bạn mới";
      const partnerTitle = `${partnerGenderLabel}${partner?.age ? ` (${partner.age}t)` : ""}`;

      if (result.matched) {
        setCelebrationData({
          partnerName: partnerTitle,
          partnerGender: partner?.gender,
          connectionId: result.connectionId,
        });
      } else {
        toast.success(`Đã gửi tín hiệu tới ${partnerTitle}!`);
      }
    },
  });

  // Extract profiles list strictly from real API items
  const allProfiles: ProfileDetailData[] = React.useMemo(() => {
    if (feedData?.items && feedData.items.length > 0) {
      return feedData.items
        .map((candidate: DiscoveryCandidateRead) => extractProfileDetail(candidate))
        .filter((p): p is ProfileDetailData => p !== null);
    }
    return [];
  }, [feedData]);

  const [dismissed, setDismissed] = React.useState<Record<string, boolean>>({});

  // Mutation for Pass / Ignore
  const passMutation = useMutation({
    mutationFn: createInteraction,
    onSuccess: (_result, vars) => {
      setDismissed((prev) => ({ ...prev, [vars.targetId]: true }));
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
    },
  });

  // Client-side search and dismiss filtering (City and Age)
  const filteredProfiles = React.useMemo(() => {
    const list = allProfiles.filter((p) => !dismissed[p.userId]);
    const query = searchQuery.trim().toLowerCase();
    if (!query) return list;

    return list.filter((p) => {
      const matchCity = p.city.toLowerCase().includes(query);
      const matchAge = p.age.toString() === query;
      return matchCity || matchAge;
    });
  }, [allProfiles, searchQuery, dismissed]);

  const candidateCount =
    countData?.count ?? feedData?.totalCount ?? filteredProfiles.length;

  function handleGreet(userId: string) {
    if (greeted[userId]) return;
    setGreeted((prev) => ({ ...prev, [userId]: true }));
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return;
    }
    greetMutation.mutate({
      targetId: userId,
      action: "greet",
    });
  }

  function handlePass(userId: string) {
    if (dismissed[userId]) return;
    setDismissed((prev) => ({ ...prev, [userId]: true }));
    if (!/^[0-9a-fA-F]{24}$/.test(userId)) {
      return;
    }
    passMutation.mutate({
      targetId: userId,
      action: "pass",
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Top Header */}
      <View className="h-14 w-full flex-row items-center justify-between border-b border-border/30 px-5">
        <View className="flex-row items-center gap-2">
          <Icon as={Heart} size={24} className="text-primary fill-primary" />
          <Text className="text-2xl font-black tracking-tight text-foreground">
            {APP_NAME}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => setIsFilterOpen(true)}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70"
            accessibilityLabel="Bộ lọc tìm kiếm"
          >
            <Icon as={SlidersHorizontal} size={18} className="text-muted-foreground" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Trang cá nhân"
            onPress={() => router.push("/(app)/(tabs)/profile")}
            hitSlop={8}
            className="relative active:scale-95 active:opacity-75"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary">
              <Icon as={User} size={18} className="text-muted-foreground" />
            </View>
            <View className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-3"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="hsl(var(--primary))"
          />
        }
      >
        {/* Sub Header: Khám phá & Trực tuyến */}
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-bold text-foreground">Khám phá</Text>
            <View className="flex-row items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5">
              <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <Text className="text-xs font-semibold text-emerald-600">Trực tuyến</Text>
            </View>
          </View>

          <Pressable
            onPress={() => refetch()}
            className="h-8 w-8 items-center justify-center rounded-lg bg-secondary/80 active:opacity-70"
            accessibilityLabel="Làm mới nhanh"
          >
            <Icon as={Zap} size={16} className="text-amber-500 fill-amber-500" />
          </Pressable>
        </View>

        {/* Banner: Gợi ý hôm nay */}
        <Pressable
          onPress={() => setIsFilterOpen(true)}
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-primary/25 bg-primary-muted/60 p-3.5 shadow-sm shadow-primary/10 active:opacity-90"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Icon as={Sparkles} size={20} className="text-primary" />
            </View>
            <View>
              <Text className="text-sm font-bold text-foreground">Gợi ý hôm nay</Text>
              <Text className="text-xs text-muted-foreground">
                Có <Text className="font-bold text-primary">{candidateCount} hồ sơ</Text>{" "}
                mới phù hợp với bạn
              </Text>
            </View>
          </View>
          <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
        </Pressable>

        {/* Search Input */}
        <View className="mb-4 h-12 flex-row items-center rounded-2xl border border-border/80 bg-secondary/50 px-4">
          <Icon as={Search} size={18} className="mr-2 text-muted-foreground" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm theo độ tuổi, thành phố hoặc quận huyện..."
            placeholderTextColor="hsl(var(--muted-foreground))"
            className="flex-1 text-sm text-foreground"
          />
          {searchQuery ? (
            <Pressable
              onPress={() => setSearchQuery("")}
              hitSlop={8}
              accessibilityLabel="Xóa tìm kiếm"
            >
              <Icon as={X} size={14} className="text-muted-foreground" />
            </Pressable>
          ) : null}
        </View>

        {/* Section Header */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            HỒ SƠ NỔI BẬT
          </Text>
          <Pressable
            onPress={() => refetch()}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Icon
              as={RotateCw}
              size={13}
              className={`text-primary ${isRefetching ? "animate-spin" : ""}`}
            />
            <Text className="text-xs font-semibold text-primary">
              {isRefetching ? "Đang tải..." : "Làm mới"}
            </Text>
          </Pressable>
        </View>

        {/* Loading Indicator with Bento Skeleton */}
        {isLoading ? (
          <View className="pb-6">
            <DiscoveryCardSkeleton />
            <DiscoveryCardSkeleton />
          </View>
        ) : filteredProfiles.length === 0 ? (
          /* Empty State */
          <View className="items-center justify-center rounded-3xl border border-dashed border-border/80 bg-secondary/30 p-8 my-4">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-secondary">
              <Icon as={Search} size={32} className="text-muted-foreground" />
            </View>
            <Text className="mt-3 text-base font-bold text-foreground">
              Chưa tìm thấy hồ sơ phù hợp
            </Text>
            <Text className="mt-1 text-center text-xs text-muted-foreground leading-5">
              Hãy thử nới lỏng bán kính khoảng cách, khoảng tuổi hoặc điều chỉnh lại bộ
              lọc tìm kiếm.
            </Text>
            <Button
              size="sm"
              onPress={() => setIsFilterOpen(true)}
              className="mt-4 rounded-full px-5"
            >
              <Text className="text-xs font-semibold text-primary-foreground">
                Điều chỉnh bộ lọc
              </Text>
            </Button>
          </View>
        ) : (
          /* Cards List: Hero Bento Cards */
          <View className="pb-6">
            {filteredProfiles.map((profile) => (
              <DiscoveryHeroCard
                key={profile.userId}
                profile={profile}
                onGreet={handleGreet}
                onPass={handlePass}
                isGreeted={greeted[profile.userId]}
                isGreetPending={greetMutation.isPending}
                isPassPending={passMutation.isPending}
              />
            ))}
          </View>
        )}

        {/* Footer */}
        <View className="items-center py-4 pb-8">
          <Text className="text-xs text-muted-foreground">
            • Bạn đã xem hết hồ sơ phù hợp lúc này •
          </Text>
        </View>
      </ScrollView>

      {/* Match Celebration Modal */}
      <MatchCelebrationModal
        visible={celebrationData !== null}
        partnerName={celebrationData?.partnerName || "người ấy"}
        partnerGender={celebrationData?.partnerGender}
        connectionId={celebrationData?.connectionId}
        onClose={() => setCelebrationData(null)}
      />

      {/* Filter Modal (Bottom Sheet - Ảnh 2) */}
      <FilterModal
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={activeFilters}
        onApply={(f) => setActiveFilters(f)}
      />
    </SafeAreaView>
  );
}
