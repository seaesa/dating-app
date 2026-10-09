import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  createInteraction,
  discoveryCountQuery,
  discoveryFeedQuery,
  type DiscoveryCandidateRead,
} from "@repo/api-contract";
import { Button, Text } from "@repo/ui";

import type { DiscoveryFilterState } from "../../../components/discovery/filter-modal";
import { DEFAULT_FILTERS, FilterModal } from "../../../components/discovery/filter-modal";
import {
  extractProfileDetail,
  type ProfileDetailData,
  ProfileDetailModal,
} from "../../../components/discovery/profile-detail-modal";

const FALLBACK_PROFILES: ProfileDetailData[] = [
  {
    userId: "6ac7bdbf0f0c3ab4cdfbbb4a",
    displayName: "Mai Chi",
    gender: "female",
    age: 26,
    city: "Quận 1, TP.HCM",
    distanceKm: 3,
    verified: true,
    bio: "Yêu thích những buổi chiều cà phê một mình và đọc sách. Tìm kiếm một người có thể cùng chia sẻ những câu chuyện không đầu không cuối và cùng nhau khám phá những quán ăn ngon ở Sài Gòn.",
    interests: ["cafe", "backpacking", "books", "indie", "movies"],
    attributes: {
      industry: "Thiết kế đồ họa",
      education: "ĐH Kiến Trúc TP.HCM",
      intent: "serious",
    },
    prompts: [
      {
        promptId: "p1",
        question: "Món quà hoàn hảo cho ngày chủ nhật?...",
        answer:
          "...một ly latte nóng, một cuốn sách hay và một buổi sáng không có chuông báo thức.",
      },
    ],
  },
  {
    userId: "6ac7bdbf0f0c3ab4cdfbbb4b",
    displayName: "Thùy Dương",
    gender: "female",
    age: 25,
    city: "Quận 3, TP.HCM",
    distanceKm: 2,
    verified: true,
    bio: "Yêu hoa, yêu mèo và thích nấu ăn tại nhà. Hướng nội nhưng nói nhiều với người quen.",
    interests: ["cooking", "pet_lover", "yoga", "baking", "gardening"],
    attributes: {
      industry: "Marketing",
      education: "ĐH Kinh Tế TP.HCM",
      intent: "serious",
    },
  },
  {
    userId: "6ac7bdbf0f0c3ab4cdfbbb4c",
    displayName: "Ngọc Trâm",
    gender: "female",
    age: 23,
    city: "Phú Nhuận, TP.HCM",
    distanceKm: 4,
    verified: true,
    bio: "Thích nghe nhạc Indie, đi xem kịch và sưu tập gốm sứ.",
    interests: ["indie", "theatre", "cafe", "painting"],
    attributes: {
      industry: "Giáo dục",
      education: "ĐH Sư Phạm TP.HCM",
      intent: "serious",
    },
  },
  {
    userId: "6ac7bdbf0f0c3ab4cdfbbb4d",
    displayName: "Minh Thư",
    gender: "female",
    age: 27,
    city: "Bình Thạnh, TP.HCM",
    distanceKm: 5,
    verified: true,
    bio: "Thích chạy bộ buổi sáng, nghe podcast và cuối tuần đi du lịch dã ngoại.",
    interests: ["running", "podcast", "cafe", "camping"],
    attributes: {
      industry: "Tài chính",
      education: "ĐH Ngoại Thương",
      intent: "serious",
    },
  },
  {
    userId: "6ac7bdcaaaa379c93715d8fa",
    displayName: "Phương Anh",
    gender: "female",
    age: 24,
    city: "Quận 7, TP.HCM",
    distanceKm: 6,
    verified: false,
    bio: "Yêu thích nhiếp ảnh, thích khám phá các quán cafe mới lạ và mê mèo.",
    interests: ["photography", "cafe", "pet_lover", "backpacking"],
    attributes: {
      industry: "Truyền thông",
      education: "ĐH KHXH&NV",
      intent: "casual",
    },
  },
  {
    userId: "6ac7bdcaaaa379c93715d8fb",
    displayName: "Đức Huy",
    gender: "male",
    age: 27,
    city: "Hải Châu, Đà Nẵng",
    distanceKm: 2,
    verified: true,
    bio: "Kỹ sư kiến trúc thích chụp ảnh film và đi du lịch bụi. Thích tìm một người bạn trò chuyện chân thành.",
    interests: ["photography", "cafe", "backpacking", "movies", "indie"],
    attributes: {
      industry: "Thiết kế đồ họa",
      education: "ĐH Bách Khoa",
      intent: "serious",
    },
  },
  {
    userId: "6ac7bdcaaaa379c93715d8fc",
    displayName: "Hoàng Nam",
    gender: "male",
    age: 25,
    city: "Sơn Trà, Đà Nẵng",
    distanceKm: 3,
    verified: true,
    bio: "Lập trình viên mê thể thao, chạy bộ bờ biển và nghe podcast công nghệ.",
    interests: ["running", "podcast", "cafe", "gaming"],
    attributes: {
      industry: "Công nghệ thông tin",
      education: "ĐH FPT",
      intent: "casual",
    },
  },
];

export default function HomeFeedScreen() {
  const queryClient = useQueryClient();
  const [greeted, setGreeted] = React.useState<Record<string, boolean>>({});
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [selectedProfile, setSelectedProfile] = React.useState<ProfileDetailData | null>(
    null,
  );
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
      max_distance_km: activeFilters.maxDistanceKm,
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
    onSuccess: (_result, vars) => {
      setGreeted((prev) => ({ ...prev, [vars.targetId]: true }));
      queryClient.invalidateQueries({ queryKey: ["discovery"] });
    },
  });

  // Extract profiles list from API items or fallback
  const allProfiles: ProfileDetailData[] = React.useMemo(() => {
    if (feedData?.items && feedData.items.length > 0) {
      return feedData.items
        .map((candidate: DiscoveryCandidateRead) => extractProfileDetail(candidate))
        .filter((p): p is ProfileDetailData => p !== null);
    }

    // Fallback filter matching active filters
    return FALLBACK_PROFILES.filter((p) => {
      if (activeFilters.gender !== "all" && p.gender !== activeFilters.gender) {
        return false;
      }
      if (p.age < activeFilters.ageMin || p.age > activeFilters.ageMax) {
        return false;
      }
      if (
        p.distanceKm !== undefined &&
        p.distanceKm !== null &&
        p.distanceKm > activeFilters.maxDistanceKm
      ) {
        return false;
      }
      return true;
    });
  }, [feedData, activeFilters]);

  // Client-side search filtering
  const filteredProfiles = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allProfiles;

    return allProfiles.filter((p) => {
      const matchName = p.displayName.toLowerCase().includes(query);
      const matchCity = p.city.toLowerCase().includes(query);
      const matchInterests =
        p.interests?.some((i) => i.toLowerCase().includes(query)) ?? false;
      return matchName || matchCity || matchInterests;
    });
  }, [allProfiles, searchQuery]);

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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Top Header */}
      <View className="h-14 w-full flex-row items-center justify-between border-b border-border/30 px-5">
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl text-primary">❤️</Text>
          <Text className="text-2xl font-black tracking-tight text-foreground">Amor</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => setIsFilterOpen(true)}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70"
          >
            <Text className="text-base text-muted-foreground">🎛️</Text>
          </Pressable>
          <View className="relative">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary">
              <Text className="text-sm">👤</Text>
            </View>
            <View className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
          </View>
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
          >
            <Text className="text-sm">⚡</Text>
          </Pressable>
        </View>

        {/* Banner: Gợi ý hôm nay */}
        <Pressable
          onPress={() => setIsFilterOpen(true)}
          className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-primary/25 bg-primary-muted/60 p-3.5 shadow-sm shadow-primary/10 active:opacity-90"
        >
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Text className="text-lg">✨</Text>
            </View>
            <View>
              <Text className="text-sm font-bold text-foreground">Gợi ý hôm nay</Text>
              <Text className="text-xs text-muted-foreground">
                Có <Text className="font-bold text-primary">{candidateCount} hồ sơ</Text>{" "}
                mới phù hợp với bạn
              </Text>
            </View>
          </View>
          <Text className="text-lg font-bold text-muted-foreground">›</Text>
        </Pressable>

        {/* Search Input */}
        <View className="mb-4 h-12 flex-row items-center rounded-2xl border border-border/80 bg-secondary/50 px-4">
          <Text className="mr-2 text-base text-muted-foreground">🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Tìm theo độ tuổi, quận hoặc sở thích..."
            placeholderTextColor="hsl(var(--muted-foreground))"
            className="flex-1 text-sm text-foreground"
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Text className="text-xs text-muted-foreground">✕</Text>
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
            <Text className="text-xs font-semibold text-primary">
              {isRefetching ? "Đang tải..." : "Làm mới ↻"}
            </Text>
          </Pressable>
        </View>

        {/* Loading Indicator */}
        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="small" color="hsl(var(--primary))" />
            <Text className="mt-3 text-xs text-muted-foreground">
              Đang tìm kiếm hồ sơ phù hợp...
            </Text>
          </View>
        ) : filteredProfiles.length === 0 ? (
          /* Empty State */
          <View className="items-center justify-center rounded-3xl border border-dashed border-border/80 bg-secondary/30 p-8 my-4">
            <Text className="text-4xl">🔍</Text>
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
          /* Cards List */
          <View className="gap-2.5 pb-6">
            {filteredProfiles.map((profile) => {
              const isFemale = profile.gender === "female";
              const isGreeted = greeted[profile.userId];

              return (
                <Pressable
                  key={profile.userId}
                  onPress={() => setSelectedProfile(profile)}
                  className="flex-row items-center justify-between rounded-2xl border border-border/60 bg-card p-3 shadow-sm shadow-black/5 active:opacity-80"
                >
                  <View className="flex-row items-center gap-3">
                    {/* Avatar */}
                    <View
                      className={`h-12 w-12 items-center justify-center rounded-full ${
                        isFemale ? "bg-rose-500/10" : "bg-blue-500/10"
                      }`}
                    >
                      <Text className="text-xl">{isFemale ? "👩" : "👨"}</Text>
                    </View>

                    {/* Info */}
                    <View className="gap-0.5">
                      <View className="flex-row items-center gap-1.5">
                        <View
                          className={`rounded-md px-1.5 py-0.5 ${
                            isFemale ? "bg-rose-500/15" : "bg-blue-500/15"
                          }`}
                        >
                          <Text
                            className={`text-[10px] font-bold ${
                              isFemale ? "text-rose-600" : "text-blue-600"
                            }`}
                          >
                            {isFemale ? "Nữ" : "Nam"}
                          </Text>
                        </View>
                        <Text className="text-base font-bold text-foreground">
                          {profile.displayName}
                        </Text>
                        {profile.verified ? (
                          <View className="h-4 w-4 items-center justify-center rounded-full bg-sky-500">
                            <Text className="text-[9px] font-bold text-white">✓</Text>
                          </View>
                        ) : null}
                      </View>

                      <Text className="text-xs text-muted-foreground">
                        {profile.age} tuổi • 📍 {profile.city}
                      </Text>
                    </View>
                  </View>

                  {/* Greet Button */}
                  <Button
                    size="sm"
                    disabled={isGreeted || greetMutation.isPending}
                    onPress={() => handleGreet(profile.userId)}
                    className={`h-9 rounded-full px-3.5 ${
                      isGreeted ? "bg-secondary" : "bg-primary"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isGreeted ? "text-muted-foreground" : "text-primary-foreground"
                      }`}
                    >
                      {isGreeted ? "✓ Đã chào" : "💌 Chào"}
                    </Text>
                  </Button>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Footer */}
        <View className="items-center py-4 pb-8">
          <Text className="text-xs text-muted-foreground">
            • Bạn đã xem hết hồ sơ phù hợp lúc này •
          </Text>
        </View>
      </ScrollView>

      {/* Profile Detail Modal (Ảnh 3) */}
      <ProfileDetailModal
        visible={!!selectedProfile}
        profileData={selectedProfile}
        onClose={() => setSelectedProfile(null)}
        onActionComplete={(_action) => {
          if (selectedProfile) {
            setGreeted((prev) => ({ ...prev, [selectedProfile.userId]: true }));
          }
          setSelectedProfile(null);
        }}
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
