import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getMeOptions } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";
import { Button, ProfileCard, Skeleton, Text } from "@repo/ui";

export default function ProfileScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const { data, isPending, isError } = useQuery(getMeOptions());

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 gap-6 p-6">
        <Text className="text-2xl font-bold text-foreground">Hồ sơ của bạn</Text>

        {isPending ? <Skeleton className="h-40 w-full rounded-lg" /> : null}
        {isError ? (
          <Text className="text-sm text-destructive">Không tải được hồ sơ.</Text>
        ) : null}

        {data ? (
          <>
            <ProfileCard
              nickname={data.profile.nickname}
              age={data.profile.age}
              city={data.profile.city}
              bio={data.profile.bio}
              interests={data.profile.interests}
              avatarUrl={data.profile.avatarUrl}
            />
            <View className="rounded-lg border border-border p-4">
              <Text className="text-sm text-muted-foreground">
                Danh tính riêng tư — chỉ bạn thấy
              </Text>
              <Text className="text-base text-foreground">
                {data.identity?.realName ?? "Chưa đặt"}
              </Text>
            </View>
          </>
        ) : null}

        <Button
          variant="outline"
          onPress={() => {
            void signOut().then(() => router.replace("/(auth)/phone"));
          }}
        >
          <Text>Đăng xuất</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
