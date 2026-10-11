import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { router } from "expo-router";
import * as React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  connectionsQuery,
  createInteraction,
  receivedInteractionsQuery,
  type ConnectionSummaryRead,
  type ReceivedInteractionRead,
} from "@repo/api-contract";
import { Button, SegmentedControl, Text } from "@repo/ui";

import {
  ProfileDetailModal,
  type ProfileDetailData,
} from "../../../components/discovery/profile-detail-modal";

type MatchesTab = "matches" | "likes";

function mapReceivedInteractionToProfile(
  item: ReceivedInteractionRead,
): ProfileDetailData | null {
  const profile = item.actor.profile;
  if (!profile) return null;

  return {
    userId: item.actor.id,
    displayName: profile.displayName,
    age: profile.age,
    gender: profile.gender,
    city: profile.city || "Việt Nam",
    distanceKm: item.distanceKm,
    bio: profile.bio,
    verified: profile.verified,
    interests: profile.interests,
    attributes: profile.attributes,
    prompts: profile.prompts,
  };
}

export default function MatchesScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState<MatchesTab>("matches");
  const [celebrationData, setCelebrationData] = React.useState<{
    name: string;
    connectionId?: string | null;
  } | null>(null);
  const [selectedActor, setSelectedActor] =
    React.useState<ReceivedInteractionRead | null>(null);

  // Queries
  const connectionsQueryData = useInfiniteQuery(connectionsQuery());
  const receivedQueryData = useQuery(receivedInteractionsQuery());

  const connections: ConnectionSummaryRead[] = React.useMemo(() => {
    return connectionsQueryData.data?.pages.flatMap((page) => page.items) ?? [];
  }, [connectionsQueryData.data]);

  const receivedLikes: ReceivedInteractionRead[] = React.useMemo(() => {
    return receivedQueryData.data ?? [];
  }, [receivedQueryData.data]);

  const isRefreshing =
    connectionsQueryData.isRefetching || receivedQueryData.isRefetching;

  const handleRefresh = () => {
    connectionsQueryData.refetch();
    receivedQueryData.refetch();
  };

  // Mutation for Greet back or Pass
  const interactMutation = useMutation({
    mutationFn: createInteraction,
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["interactions", "received"] });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      queryClient.invalidateQueries({ queryKey: ["discovery"] });

      if (result.matched) {
        const actor = receivedLikes.find((r) => r.actor.id === vars.targetId);
        setCelebrationData({
          name: actor?.actor.profile.displayName || "người ấy",
          connectionId: result.connectionId,
        });
      }
    },
  });

  const handlePass = (actorId: string, displayName: string) => {
    Alert.alert(
      "Bỏ qua lời chào",
      `Bạn có chắc chắn muốn bỏ qua ${displayName}? Người này sẽ không còn xuất hiện trong danh sách.`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Bỏ qua",
          style: "destructive",
          onPress: () =>
            interactMutation.mutate({
              targetId: actorId,
              action: "pass",
            }),
        },
      ],
    );
  };

  const openChat = (connectionId: string) => {
    router.push({
      pathname: "/(app)/chat/[connectionId]",
      params: { connectionId },
    });
  };

  const tabOptions = [
    {
      value: "matches" as const,
      label: `Tương hợp${connections.length > 0 ? ` (${connections.length})` : ""}`,
      symbol: "💖",
    },
    {
      value: "likes" as const,
      label: `Thích bạn${receivedLikes.length > 0 ? ` (${receivedLikes.length})` : ""}`,
      symbol: "🔥",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="h-14 w-full flex-row items-center justify-between border-b border-border/30 px-5">
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl text-primary">💖</Text>
          <Text className="text-2xl font-black tracking-tight text-foreground">
            Ghép đôi
          </Text>
        </View>
        <Pressable
          onPress={handleRefresh}
          className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70"
        >
          <Text className="text-sm text-primary">↻</Text>
        </Pressable>
      </View>

      {/* Tabs Switcher */}
      <View className="px-5 pt-3 pb-2">
        <SegmentedControl
          options={tabOptions}
          value={activeTab}
          onChange={(val) => setActiveTab(val as MatchesTab)}
          variant="solid"
        />
      </View>

      {/* Tab Content */}
      <ScrollView
        className="flex-1 px-4 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="hsl(var(--primary))"
          />
        }
      >
        {activeTab === "matches" ? (
          /* TAB 1: TƯƠNG HỢP (MATCHES) */
          connectionsQueryData.isLoading ? (
            <View className="items-center py-16">
              <ActivityIndicator color="hsl(var(--primary))" />
              <Text className="mt-3 text-xs text-muted-foreground">
                Đang tải danh sách tương hợp...
              </Text>
            </View>
          ) : connections.length === 0 ? (
            <View className="items-center justify-center rounded-3xl border border-dashed border-border/80 bg-secondary/30 p-8 my-6">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Text className="text-3xl">💖</Text>
              </View>
              <Text className="mt-4 text-base font-bold text-foreground">
                Chưa có lượt tương hợp nào
              </Text>
              <Text className="mt-1 text-center text-xs text-muted-foreground leading-5">
                Hãy khám phá thêm hồ sơ trên Trang chủ và gửi lời chào để bắt đầu tìm kiếm
                một nửa phù hợp.
              </Text>
              <Button
                size="sm"
                onPress={() => router.push("/(app)/(tabs)")}
                className="mt-4 rounded-full px-5"
              >
                <Text className="text-xs font-semibold text-primary-foreground">
                  Khám phá hồ sơ ngay
                </Text>
              </Button>
            </View>
          ) : (
            <View className="gap-3 pb-8">
              {connections.map((item) => {
                const peer = item.peer;
                const isFemale = peer.profile.gender === "female";
                const age = peer.profile.age;

                return (
                  <View
                    key={item.id}
                    className="flex-row items-center justify-between rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm shadow-black/5"
                  >
                    <View className="flex-1 flex-row items-center gap-3">
                      {/* Avatar */}
                      <View
                        className={`h-12 w-12 items-center justify-center rounded-full ${
                          isFemale ? "bg-rose-500/10" : "bg-blue-500/10"
                        }`}
                      >
                        <Text className="text-xl">{isFemale ? "👩" : "👨"}</Text>
                      </View>

                      {/* Info */}
                      <View className="flex-1 gap-0.5">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-base font-bold text-foreground">
                            {peer.profile.displayName}
                          </Text>
                          {peer.profile.verified ? (
                            <View className="h-4 w-4 items-center justify-center rounded-full bg-sky-500">
                              <Text className="text-[9px] font-bold text-white">✓</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text className="text-xs text-muted-foreground">
                          {age ? `${age} tuổi • ` : ""}📍{" "}
                          {peer.profile.city || "Việt Nam"}
                        </Text>
                        {item.lastMessage ? (
                          <Text
                            className="mt-0.5 text-xs text-foreground/80 line-clamp-1"
                            numberOfLines={1}
                          >
                            💬 {item.lastMessage.preview}
                          </Text>
                        ) : (
                          <Text className="mt-0.5 text-[11px] font-medium text-emerald-600">
                            ✨ Mới ghép đôi thành công
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Chat Action Button */}
                    <Button
                      size="sm"
                      onPress={() => openChat(item.id)}
                      className="h-9 rounded-full bg-primary px-3.5 shadow-sm shadow-primary/20 active:opacity-80"
                    >
                      <Text className="text-xs font-semibold text-primary-foreground">
                        Nhắn tin 💬
                      </Text>
                    </Button>
                  </View>
                );
              })}
            </View>
          )
        ) : /* TAB 2: THÍCH BẠN (RECEIVED LIKES) */
        receivedQueryData.isLoading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="hsl(var(--primary))" />
            <Text className="mt-3 text-xs text-muted-foreground">
              Đang tải danh sách lời chào đến...
            </Text>
          </View>
        ) : receivedLikes.length === 0 ? (
          <View className="items-center justify-center rounded-3xl border border-dashed border-border/80 bg-secondary/30 p-8 my-6">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
              <Text className="text-3xl">💌</Text>
            </View>
            <Text className="mt-4 text-base font-bold text-foreground">
              Chưa có lời chào mới
            </Text>
            <Text className="mt-1 text-center text-xs text-muted-foreground leading-5">
              Khi có ai đó thích hoặc gửi lời chào đến bạn, họ sẽ xuất hiện tại đây để bạn
              có thể phản hồi!
            </Text>
          </View>
        ) : (
          <View className="gap-3 pb-8">
            {receivedLikes.map((item) => {
              const actor = item.actor;
              const isFemale = actor.profile.gender === "female";
              const age = actor.profile.age;

              const badgeConfig =
                item.action === "star"
                  ? {
                      label: "Siêu thích bạn ⭐",
                      bg: "bg-amber-500/15",
                      text: "text-amber-500",
                    }
                  : item.action === "like"
                    ? {
                        label: "Đã thích bạn 💖",
                        bg: "bg-rose-500/15",
                        text: "text-rose-500",
                      }
                    : {
                        label: "Đã chào bạn 💌",
                        bg: "bg-primary/10",
                        text: "text-primary",
                      };

              return (
                <View
                  key={item.interactionId}
                  className="rounded-2xl border border-primary/20 bg-card p-4 shadow-sm shadow-black/5 gap-3"
                >
                  {/* Clickable Card Body to Open Profile Detail */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Xem thông tin hồ sơ của ${actor.profile.displayName}`}
                    onPress={() => setSelectedActor(item)}
                    className="gap-2.5 active:opacity-75"
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

                      <View className="flex-1 gap-0.5">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="text-base font-bold text-foreground">
                            {actor.profile.displayName}
                          </Text>
                          <View className={`rounded-md ${badgeConfig.bg} px-1.5 py-0.5`}>
                            <Text className={`text-[10px] font-bold ${badgeConfig.text}`}>
                              {badgeConfig.label}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-xs text-muted-foreground">
                          {age ? `${age} tuổi • ` : ""}📍{" "}
                          {actor.profile.city || "Việt Nam"}
                          {item.distanceKm !== undefined && item.distanceKm !== null
                            ? ` • Cách ${item.distanceKm} km`
                            : ""}
                        </Text>
                      </View>
                    </View>

                    {actor.profile.bio ? (
                      <Text
                        className="rounded-xl bg-secondary/40 p-2.5 text-xs text-muted-foreground"
                        numberOfLines={2}
                      >
                        {`"${actor.profile.bio}"`}
                      </Text>
                    ) : null}
                  </Pressable>

                  {/* Action Buttons */}
                  <View className="flex-row items-center justify-end gap-2 pt-1 border-t border-border/20">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={interactMutation.isPending}
                      onPress={() => handlePass(actor.id, actor.profile.displayName)}
                      className="h-9 rounded-full px-4"
                    >
                      <Text className="text-xs font-semibold text-muted-foreground">
                        Bỏ qua
                      </Text>
                    </Button>

                    <Button
                      size="sm"
                      disabled={interactMutation.isPending}
                      onPress={() =>
                        interactMutation.mutate({
                          targetId: actor.id,
                          action: "greet",
                        })
                      }
                      className="h-9 rounded-full bg-primary px-4 shadow-sm shadow-primary/20"
                    >
                      <Text className="text-xs font-semibold text-primary-foreground">
                        Chào lại 💖
                      </Text>
                    </Button>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Celebration Modal on Mutual Match */}
      <Modal
        visible={celebrationData !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCelebrationData(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 p-6">
          <View className="w-full max-w-sm items-center rounded-3xl bg-card p-6 shadow-2xl">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-rose-500/15">
              <Text className="text-4xl">🎉</Text>
            </View>

            <Text className="mt-4 text-xl font-black text-foreground">
              Hai bạn đã tương hợp!
            </Text>

            <Text className="mt-2 text-center text-sm text-muted-foreground leading-5">
              Bạn và{" "}
              <Text className="font-bold text-primary">{celebrationData?.name}</Text> đều
              muốn kết nối với nhau. Bắt đầu cuộc trò chuyện ngay thôi!
            </Text>

            <View className="mt-6 w-full gap-2.5">
              {celebrationData?.connectionId ? (
                <Button
                  onPress={() => {
                    const connId = celebrationData.connectionId!;
                    setCelebrationData(null);
                    openChat(connId);
                  }}
                  className="h-12 w-full rounded-2xl bg-primary shadow-lg shadow-primary/25"
                >
                  <Text className="font-bold text-primary-foreground">
                    Nhắn tin ngay 💬
                  </Text>
                </Button>
              ) : null}

              <Button
                variant="outline"
                onPress={() => setCelebrationData(null)}
                className="h-11 w-full rounded-2xl"
              >
                <Text className="font-semibold text-muted-foreground">Để sau</Text>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Detail Modal for Admirer */}
      <ProfileDetailModal
        visible={selectedActor !== null}
        onClose={() => setSelectedActor(null)}
        profileData={
          selectedActor ? mapReceivedInteractionToProfile(selectedActor) : null
        }
        mode="admirer"
        onMatch={(connectionId) => {
          if (selectedActor) {
            setCelebrationData({
              name: selectedActor.actor.profile.displayName,
              connectionId,
            });
          }
        }}
        onActionComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["interactions", "received"] });
          queryClient.invalidateQueries({ queryKey: ["connections"] });
          queryClient.invalidateQueries({ queryKey: ["discovery"] });
          setSelectedActor(null);
        }}
      />
    </SafeAreaView>
  );
}
