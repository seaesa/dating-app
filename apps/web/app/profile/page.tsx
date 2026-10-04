"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { View } from "react-native";

import { meQuery } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";
import { Button, ProfileCard, Skeleton, Text } from "@repo/ui";

import { useRequireSession } from "../session-gate";

export default function ProfilePage() {
  const router = useRouter();
  const { hydrated, signedIn } = useRequireSession();
  const signOut = useAuthStore((s) => s.signOut);

  const { data, isPending, isError } = useQuery({
    ...meQuery(),
    enabled: signedIn,
  });

  return (
    <View className="mx-auto w-full max-w-lg flex-1 gap-6 p-6">
      <Text className="text-2xl font-bold text-foreground">Hồ sơ của bạn</Text>

      {!hydrated || isPending ? <Skeleton className="h-40 w-full rounded-lg" /> : null}

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
          void signOut().then(() => router.replace("/login"));
        }}
      >
        <Text>Đăng xuất</Text>
      </Button>
    </View>
  );
}
