import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import Crown from "lucide-react-native/icons/crown";
import Flame from "lucide-react-native/icons/flame";
import Heart from "lucide-react-native/icons/heart";
import Lock from "lucide-react-native/icons/lock";
import MapPin from "lucide-react-native/icons/map-pin";
import MessageCircle from "lucide-react-native/icons/message-circle";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import Send from "lucide-react-native/icons/send";
import Sparkles from "lucide-react-native/icons/sparkles";
import Star from "lucide-react-native/icons/star";
import User from "lucide-react-native/icons/user";
import X from "lucide-react-native/icons/x";
import * as React from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  connectionsQuery,
  createInteraction,
  receivedInteractionsQuery,
  type ConnectionSummaryRead,
  type ReceivedInteractionRead,
} from "@repo/api-contract";
import { Button, Icon, SegmentedControl, Text } from "@repo/ui";

import { MatchCelebrationModal } from "@/components/matches/match-celebration-modal";
import { MembershipModal, VietQrPaymentModal } from "@/components/membership";
import { useMembership } from "@/hooks/use-membership";

type MatchesTab = "matches" | "likes";

export default function MatchesScreen() {
  const queryClient = useQueryClient();
  const { hasFeature } = useMembership();
  const canSeeWhoLikedYou = hasFeature("SEE_WHO_LIKED_YOU");

  const [activeTab, setActiveTab] = React.useState<MatchesTab>("matches");
  const [celebrationData, setCelebrationData] = React.useState<{
    name: string;
    connectionId?: string | null;
  } | null>(null);

  const [isMembershipModalVisible, setIsMembershipModalVisible] = React.useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = React.useState(false);
  const [selectedPlanCode, setSelectedPlanCode] = React.useState<string | null>(null);

  const handleSelectPlan = (planCode: string) => {
    setSelectedPlanCode(planCode);
    setIsMembershipModalVisible(false);
    setIsPaymentModalVisible(true);
  };

  // Queries
  const connectionsQueryData = useInfiniteQuery(connectionsQuery());
  const receivedQueryData = useQuery(receivedInteractionsQuery());

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = connectionsQueryData;

  const connections: ConnectionSummaryRead[] = React.useMemo(() => {
    return connectionsQueryData.data?.pages.flatMap((page) => page.items) ?? [];
  }, [connectionsQueryData.data]);

  // Tương hợp mới: chỉ những kết nối CHƯA có tin nhắn trao đổi, tối đa 15 người mới nhất
  const newMatches: ConnectionSummaryRead[] = React.useMemo(() => {
    return connections.filter((item) => !item.lastMessage).slice(0, 15);
  }, [connections]);

  // Đoạn trò chuyện: những kết nối ĐÃ có tin nhắn trao đổi
  const conversationsWithChat: ConnectionSummaryRead[] = React.useMemo(() => {
    return connections.filter((item) => Boolean(item.lastMessage));
  }, [connections]);

  const receivedLikes: ReceivedInteractionRead[] = React.useMemo(() => {
    return receivedQueryData.data ?? [];
  }, [receivedQueryData.data]);

  const isRefreshing =
    connectionsQueryData.isRefetching || receivedQueryData.isRefetching;

  const handleRefresh = () => {
    connectionsQueryData.refetch();
    receivedQueryData.refetch();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (activeTab !== "matches") return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;

    if (isCloseToBottom && hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
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
        const isFem = actor?.actor.profile.gender === "female";
        setCelebrationData({
          name: isFem ? "Bạn nữ" : "Bạn nam",
          connectionId: result.connectionId,
        });
      }
    },
  });

  const handlePass = (actorId: string) => {
    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined" && typeof window.confirm === "function"
          ? window.confirm(
              `Bỏ qua lời chào\nBạn có chắc chắn muốn bỏ qua người này? Người này sẽ không còn xuất hiện trong danh sách.`,
            )
          : true;
      if (ok) {
        interactMutation.mutate({
          targetId: actorId,
          action: "pass",
        });
      }
      return;
    }

    Alert.alert(
      "Bỏ qua lời chào",
      `Bạn có chắc chắn muốn bỏ qua người này? Người này sẽ không còn xuất hiện trong danh sách.`,
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
      icon: (selected: boolean) => (
        <Icon
          as={Heart}
          size={16}
          className={
            selected
              ? "text-primary-foreground fill-primary-foreground"
              : "text-muted-foreground"
          }
        />
      ),
    },
    {
      value: "likes" as const,
      label: `Thích bạn${receivedLikes.length > 0 ? ` (${receivedLikes.length})` : ""}`,
      icon: (selected: boolean) => (
        <Icon
          as={Flame}
          size={16}
          className={
            selected
              ? "text-primary-foreground fill-primary-foreground"
              : "text-amber-500 fill-amber-500/20"
          }
        />
      ),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Header */}
      <View className="h-14 w-full flex-row items-center justify-between border-b border-border/30 px-5">
        <View className="flex-row items-center gap-2.5">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Icon as={Heart} size={20} className="text-primary fill-primary" />
          </View>
          <Text className="text-2xl font-black tracking-tight text-foreground">
            Ghép đôi
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Làm mới danh sách"
          onPress={() => {
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }
            handleRefresh();
          }}
          className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:scale-95"
        >
          <Icon as={RotateCcw} size={16} className="text-foreground" />
        </Pressable>
      </View>

      {/* Tabs Switcher */}
      <View className="px-5 pt-3 pb-2">
        <SegmentedControl
          options={tabOptions}
          value={activeTab}
          onChange={(val) => {
            if (Platform.OS !== "web") {
              Haptics.selectionAsync().catch(() => {});
            }
            setActiveTab(val as MatchesTab);
          }}
          variant="solid"
        />
      </View>

      {/* Tab Content */}
      <ScrollView
        className="flex-1 px-4 pt-2"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
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
                <Icon as={Heart} size={36} className="text-primary fill-primary/20" />
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
            <View className="gap-4 pb-8">
              {/* New Matches Carousel - Chỉ hiển thị khi có người chưa chat (tối đa 15 người) */}
              {newMatches.length > 0 ? (
                <View className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm shadow-black/5">
                  <View className="flex-row items-center gap-1.5 pb-2.5 px-0.5">
                    <Icon
                      as={Sparkles}
                      size={15}
                      className="text-primary fill-primary/20"
                    />
                    <Text className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                      Tương hợp mới ({newMatches.length})
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      gap: 14,
                      paddingHorizontal: 2,
                      paddingVertical: 2,
                    }}
                  >
                    {newMatches.map((item) => {
                      const peer = item.peer;
                      const isFemale = peer.profile.gender === "female";
                      const matchTitle = `${isFemale ? "Nữ" : "Nam"}${peer.profile.age ? `, ${peer.profile.age}t` : ""}`;
                      return (
                        <Pressable
                          key={`bubble-${item.id}`}
                          accessibilityRole="button"
                          accessibilityLabel={`Nhắn tin với ${matchTitle}`}
                          onPress={() => {
                            if (Platform.OS !== "web") {
                              Haptics.selectionAsync().catch(() => {});
                            }
                            openChat(item.id);
                          }}
                          className="items-center gap-1.5 active:scale-95"
                        >
                          <View className="relative">
                            {/* Glowing border ring around avatar */}
                            <View className="h-16 w-16 items-center justify-center rounded-full border-2 border-primary bg-primary/10 p-0.5 shadow-sm shadow-primary/30">
                              <View
                                className={`h-full w-full items-center justify-center rounded-full ${
                                  isFemale ? "bg-rose-500/15" : "bg-blue-500/15"
                                }`}
                              >
                                <Icon
                                  as={User}
                                  size={28}
                                  className={isFemale ? "text-rose-500" : "text-blue-500"}
                                />
                              </View>
                            </View>
                            {/* Match indicator dot */}
                            <View className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-background bg-emerald-500" />
                          </View>
                          <Text
                            className="max-w-[70px] text-center text-xs font-bold text-foreground"
                            numberOfLines={1}
                          >
                            {matchTitle}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}

              {/* Conversations Section */}
              <View className="gap-2.5">
                <View className="flex-row items-center gap-1.5 px-1">
                  <Icon as={MessageCircle} size={15} className="text-muted-foreground" />
                  <Text className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                    Đoạn trò chuyện ({conversationsWithChat.length})
                  </Text>
                </View>

                {conversationsWithChat.length > 0 ? (
                  conversationsWithChat.map((item) => {
                    const peer = item.peer;
                    const isFemale = peer.profile.gender === "female";
                    const age = peer.profile.age;
                    const isRevealed = Boolean(
                      peer.identity?.photoUrls && peer.identity.photoUrls.length > 0,
                    );
                    const conversationTitle = isRevealed
                      ? peer.profile.displayName
                      : `${isFemale ? "Nữ" : "Nam"}${age ? `, ${age} tuổi` : ""}`;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => {
                          if (Platform.OS !== "web") {
                            Haptics.selectionAsync().catch(() => {});
                          }
                          openChat(item.id);
                        }}
                        className="flex-row items-center justify-between rounded-2xl border border-border/60 bg-card p-3.5 shadow-sm shadow-black/5 active:scale-[0.99] active:bg-secondary/40"
                      >
                        <View className="flex-1 flex-row items-center gap-3">
                          {/* Avatar */}
                          <View
                            className={`h-12 w-12 items-center justify-center rounded-full ${
                              isFemale ? "bg-rose-500/10" : "bg-blue-500/10"
                            }`}
                          >
                            <Icon
                              as={User}
                              size={22}
                              className={isFemale ? "text-rose-500" : "text-blue-500"}
                            />
                          </View>

                          {/* Info */}
                          <View className="flex-1 gap-0.5">
                            <Text className="text-base font-bold text-foreground">
                              {conversationTitle}
                            </Text>
                            <View className="flex-row items-center gap-1">
                              <Icon
                                as={MapPin}
                                size={11}
                                className="text-muted-foreground"
                              />
                              <Text className="text-xs text-muted-foreground">
                                {peer.profile.city || "Việt Nam"}
                              </Text>
                            </View>
                            {item.lastMessage ? (
                              <View className="flex-row items-center gap-1 mt-0.5">
                                <Icon
                                  as={MessageCircle}
                                  size={11}
                                  className="text-muted-foreground"
                                />
                                <Text
                                  className="text-xs text-foreground/80 line-clamp-1 flex-1"
                                  numberOfLines={1}
                                >
                                  {item.lastMessage.kind === "image"
                                    ? "Đã gửi một ảnh"
                                    : item.lastMessage.preview}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>

                        {/* Chat Action Button */}
                        <Button
                          size="sm"
                          onPress={() => openChat(item.id)}
                          className="h-9 flex-row items-center gap-1 rounded-full bg-primary px-3.5 shadow-sm shadow-primary/20 active:opacity-80 active:scale-95"
                        >
                          <Icon
                            as={MessageCircle}
                            size={14}
                            className="text-primary-foreground fill-primary-foreground"
                          />
                          <Text className="text-xs font-semibold text-primary-foreground">
                            Nhắn tin
                          </Text>
                        </Button>
                      </Pressable>
                    );
                  })
                ) : (
                  <View className="items-center justify-center rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-6 my-1 gap-1.5">
                    <Icon
                      as={MessageCircle}
                      size={24}
                      className="text-muted-foreground/60"
                    />
                    <Text className="text-xs font-semibold text-foreground">
                      Chưa có cuộc trò chuyện nào
                    </Text>
                    <Text className="text-center text-[11px] text-muted-foreground leading-4">
                      Hãy chạm vào đối phương ở danh sách tương hợp mới phía trên để bắt
                      đầu trò chuyện!
                    </Text>
                  </View>
                )}
              </View>

              {/* Infinite Scroll Loading Indicator */}
              {isFetchingNextPage ? (
                <View className="items-center py-3">
                  <ActivityIndicator size="small" color="hsl(var(--primary))" />
                  <Text className="mt-1.5 text-xs text-muted-foreground">
                    Đang tải thêm kết nối...
                  </Text>
                </View>
              ) : null}
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
        ) : !canSeeWhoLikedYou ? (
          /* PAYWALL GUARD VIEW */
          <View className="gap-4 pb-8 my-2">
            {/* Paywall Banner Card */}
            <View className="rounded-3xl border-2 border-primary/40 bg-card p-5 shadow-lg shadow-primary/10 gap-3.5">
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20">
                  <Icon as={Crown} className="text-amber-500" size={26} />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-black text-foreground">
                    {receivedLikes.length > 0
                      ? `Có ${receivedLikes.length} người đang thích bạn!`
                      : "Xem ai đang thích và gửi lời chào"}
                  </Text>
                  <Text className="text-xs text-muted-foreground leading-4 mt-0.5">
                    Nâng cấp gói Hội viên VIP để mở khóa xem ai đã thích bạn, xem ảnh và
                    kết đôi ngay.
                  </Text>
                </View>
              </View>

              <Button
                onPress={() => setIsMembershipModalVisible(true)}
                className="h-12 w-full flex-row items-center justify-center rounded-2xl bg-primary shadow-md shadow-primary/25 active:opacity-90 active:scale-95"
              >
                <View className="flex-row items-center gap-2">
                  <Icon
                    as={Crown}
                    className="text-primary-foreground fill-primary-foreground"
                    size={16}
                  />
                  <Text className="text-sm font-bold text-primary-foreground">
                    Mở khóa xem ai thích bạn ngay
                  </Text>
                </View>
              </Button>
            </View>

            {/* Locked Teaser Cards Preview */}
            <View className="gap-3 opacity-70">
              <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
                Danh sách đang bị ẩn (Nâng cấp VIP để mở)
              </Text>

              {[1, 2].map((idx) => (
                <View
                  key={idx}
                  className="rounded-2xl border border-dashed border-border/80 bg-secondary/20 p-4 gap-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
                      <Icon as={Lock} className="text-muted-foreground" size={20} />
                    </View>
                    <View className="flex-1 gap-1">
                      <View className="flex-row items-center gap-2">
                        <View className="h-4 w-28 rounded-md bg-secondary" />
                        <View className="h-4 w-16 rounded-md bg-primary/20" />
                      </View>
                      <View className="h-3 w-36 rounded-md bg-secondary/70" />
                    </View>
                  </View>
                  <View className="h-8 w-full rounded-xl bg-secondary/50" />
                </View>
              ))}
            </View>
          </View>
        ) : receivedLikes.length === 0 ? (
          <View className="items-center justify-center rounded-3xl border border-dashed border-border/80 bg-secondary/30 p-8 my-6">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-amber-500/10">
              <Icon as={Send} size={32} className="text-amber-500 fill-amber-500/20" />
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
              const admirerTitle = `${isFemale ? "Nữ" : "Nam"}${age ? `, ${age} tuổi` : ""}`;

              const badgeConfig =
                item.action === "star"
                  ? {
                      label: "Siêu thích bạn",
                      icon: Star,
                      bg: "bg-amber-500/15",
                      text: "text-amber-500",
                    }
                  : item.action === "like"
                    ? {
                        label: "Đã thích bạn",
                        icon: Heart,
                        bg: "bg-rose-500/15",
                        text: "text-rose-500",
                      }
                    : {
                        label: "Đã chào bạn",
                        icon: Send,
                        bg: "bg-primary/10",
                        text: "text-primary",
                      };

              return (
                <View
                  key={item.interactionId}
                  className="rounded-2xl border border-primary/20 bg-card p-4 shadow-sm shadow-black/5 gap-3"
                >
                  {/* Anonymous Card Body */}
                  <View className="gap-2.5">
                    <View className="flex-row items-center gap-3">
                      {/* Avatar */}
                      <View
                        className={`h-12 w-12 items-center justify-center rounded-full ${
                          isFemale ? "bg-rose-500/10" : "bg-blue-500/10"
                        }`}
                      >
                        <Icon
                          as={User}
                          size={22}
                          className={isFemale ? "text-rose-500" : "text-blue-500"}
                        />
                      </View>

                      <View className="flex-1 gap-0.5">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="text-base font-bold text-foreground">
                            {admirerTitle}
                          </Text>
                          <View
                            className={`flex-row items-center gap-1 rounded-md ${badgeConfig.bg} px-1.5 py-0.5`}
                          >
                            <Icon
                              as={badgeConfig.icon}
                              size={10}
                              className={`${badgeConfig.text} fill-current`}
                            />
                            <Text className={`text-[10px] font-bold ${badgeConfig.text}`}>
                              {badgeConfig.label}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-1">
                          <Icon as={MapPin} size={11} className="text-muted-foreground" />
                          <Text className="text-xs text-muted-foreground">
                            {actor.profile.city || "Việt Nam"}
                            {item.distanceKm !== undefined && item.distanceKm !== null
                              ? ` • Cách ${item.distanceKm} km`
                              : ""}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View className="flex-row items-center justify-end gap-2 pt-1 border-t border-border/20">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={interactMutation.isPending}
                      onPress={() => handlePass(actor.id)}
                      className="h-9 flex-row items-center gap-1 rounded-full px-4"
                    >
                      <Icon as={X} size={14} className="text-muted-foreground" />
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
                      className="h-9 flex-row items-center gap-1 rounded-full bg-primary px-4 shadow-sm shadow-primary/20"
                    >
                      <Icon
                        as={Heart}
                        size={14}
                        className="text-primary-foreground fill-primary-foreground"
                      />
                      <Text className="text-xs font-semibold text-primary-foreground">
                        Chào lại
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
      <MatchCelebrationModal
        visible={celebrationData !== null}
        partnerName={celebrationData?.name || "người ấy"}
        connectionId={celebrationData?.connectionId}
        onClose={() => setCelebrationData(null)}
      />

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
