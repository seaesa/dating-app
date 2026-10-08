import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { userQuery } from "@repo/api-contract";
import { Button, Text } from "@repo/ui";

import {
  extractProfileDetail,
  ProfileDetailContent,
} from "../../components/discovery/profile-detail-modal";

export default function ProfileDetailScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const { data: user, isLoading, error } = useQuery(userQuery(userId ?? ""));

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="hsl(var(--primary))" />
        <Text className="mt-4 text-sm text-muted-foreground">Đang tải hồ sơ...</Text>
      </SafeAreaView>
    );
  }

  if (error || !user || !user.profile) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-4xl">⚠️</Text>
        <Text className="mt-3 text-lg font-bold text-foreground">
          Không tìm thấy hồ sơ
        </Text>
        <Text className="mt-1 text-center text-sm text-muted-foreground">
          Hồ sơ này không tồn tại hoặc đã bị ẩn.
        </Text>
        <Button onPress={() => router.back()} className="mt-6 rounded-full px-6">
          <Text className="font-semibold text-primary-foreground">Quay lại</Text>
        </Button>
      </SafeAreaView>
    );
  }

  const profileData = extractProfileDetail(user);

  if (!profileData) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-sm text-muted-foreground">
          Không thể hiển thị thông tin hồ sơ.
        </Text>
        <Button onPress={() => router.back()} className="mt-4 rounded-full px-6">
          <Text className="font-semibold text-primary-foreground">Quay lại</Text>
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <ProfileDetailContent
        data={profileData}
        onClose={() => router.back()}
        onActionComplete={() => router.back()}
      />
    </SafeAreaView>
  );
}
