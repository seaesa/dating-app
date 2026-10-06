import { useQuery } from "@tanstack/react-query";
import { Redirect } from "expo-router";
import * as React from "react";
import { ActivityIndicator, View } from "react-native";

import { meQuery, profileOptionsQuery } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";
import { Button, Text } from "@repo/ui";

import { OnboardingFlow } from "@/components/onboarding/flow";

export default function OnboardingScreen() {
  const completeLocally = useAuthStore((s) => s.completeOnboarding);
  const onboardingPending = useAuthStore((s) => s.onboardingPending);
  const me = useQuery(meQuery());
  const options = useQuery(profileOptionsQuery());
  const active = me.data?.status === "active";

  // Finished on another device: clear the local flag instead of asking again.
  React.useEffect(() => {
    if (active) void completeLocally();
  }, [active, completeLocally]);

  if (me.isError || options.isError) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text className="text-center text-base text-muted-foreground">
          Không tải được dữ liệu. Kiểm tra kết nối rồi thử lại.
        </Text>
        <Button
          onPress={() => {
            void me.refetch();
            void options.refetch();
          }}
        >
          <Text>Thử lại</Text>
        </Button>
      </View>
    );
  }
  // Wait for the flag to clear: (app) sends a pending session straight back here.
  if (!me.data || !options.data || (active && onboardingPending)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }
  if (active) return <Redirect href="/(app)/(tabs)/profile" />;

  return <OnboardingFlow initialMe={me.data} options={options.data} />;
}
