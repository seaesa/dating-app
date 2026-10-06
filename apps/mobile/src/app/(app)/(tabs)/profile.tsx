import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as React from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { meQuery } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";
import { Button, ProfileCard, Skeleton, Text } from "@repo/ui";

export default function ProfileScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const { data, isPending, isError } = useQuery(meQuery());

  const profile = data?.profile;
  const photoUrl = data?.identity?.photoUrls[0] ?? null;
  const completionPercent = React.useMemo(() => {
    if (!profile) return 0;
    let score = 0;
    if (profile.displayName) score += 20;
    if (profile.age) score += 20;
    if (profile.city) score += 20;
    if (profile.gender) score += 15;
    if (photoUrl) score += 15;
    if (profile.bio) score += 10;
    return Math.min(100, score);
  }, [profile, photoUrl]);

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
        contentContainerStyle={{ paddingBottom: 36 }}
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
              {/* Profile Overview Card (Hero) with Gender */}
              <ProfileCard
                nickname={data.profile.displayName}
                age={data.profile.age}
                city={data.profile.city}
                gender={data.profile.gender}
                bio={data.profile.bio}
                interests={data.profile.interests}
                avatarUrl={photoUrl}
              />

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
                    : "💡 Cập nhật đầy đủ ảnh chân dung và lời giới thiệu để tăng 2x cơ hội kết đôi tương thích."}
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
                <View className="flex-row items-center justify-between pb-3 border-b border-border/40">
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

                <View className="pt-3 gap-2.5">
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
              <View className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm shadow-black/5">
                <Pressable
                  className="flex-row items-center justify-between p-4 border-b border-border/40 active:bg-secondary/60"
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
                  className="flex-row items-center justify-between p-4 border-b border-border/40 active:bg-secondary/60"
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
    </SafeAreaView>
  );
}
