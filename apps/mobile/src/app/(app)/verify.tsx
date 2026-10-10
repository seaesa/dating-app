import { router } from "expo-router";
import * as React from "react";
import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { APP_NAME } from "@repo/core";
import { Button, StatusBanner, Text } from "@repo/ui";

import { FaceCapture } from "@/components/face-capture";
import { openPrivacy } from "@/legal";
import { useFaceVerification } from "@/use-face-verification";
import { failureMessage } from "@/verification-copy";

export default function VerifyScreen() {
  const {
    phase,
    challenge,
    error,
    cameraBlocked,
    verification,
    start,
    send,
    cancelCamera,
  } = useFaceVerification();
  const status = verification?.status;
  const attemptsLeft = verification?.attemptsLeft ?? 0;

  const close = () =>
    router.canGoBack() ? router.back() : router.replace("/(app)/(tabs)/profile");

  // Switched off on the server: nothing to start until it comes back.
  if (verification && !verification.available) {
    return (
      <SafeAreaView className="flex-1 justify-center gap-6 bg-background px-6">
        <Text className="text-center text-2xl font-black text-foreground">
          Xác thực khuôn mặt đang tạm dừng
        </Text>
        <Button size="xl" className="h-14 rounded-full bg-primary" onPress={close}>
          <Text className="text-base font-bold text-primary-foreground">Đóng</Text>
        </Button>
      </SafeAreaView>
    );
  }

  if (phase === "camera" && challenge) {
    return (
      <SafeAreaView className="flex-1 bg-background px-4 pb-4">
        <Pressable onPress={() => cancelCamera()} className="h-12 justify-center">
          <Text className="text-base font-semibold text-muted-foreground">Hủy</Text>
        </Pressable>
        <FaceCapture
          actions={challenge.actions}
          onDone={(uris) => void send(uris)}
          onError={() => cancelCamera("Camera gặp sự cố. Thử lại nhé.")}
        />
      </SafeAreaView>
    );
  }

  if (phase === "sending" || phase === "waiting" || status === "pending") {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-background px-8">
        <ActivityIndicator size="large" />
        <Text className="text-center text-xl font-bold text-foreground">
          Đang kiểm tra...
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          Thường mất vài giây. Ảnh sẽ bị xóa ngay sau khi xử lý.
        </Text>
      </SafeAreaView>
    );
  }

  if (status === "verified") {
    return (
      <SafeAreaView className="flex-1 justify-center gap-6 bg-background px-6">
        <View className="h-24 w-24 items-center justify-center self-center rounded-full bg-success">
          <Text className="text-5xl font-black text-success-foreground">✓</Text>
        </View>
        <Text className="text-center text-3xl font-black tracking-tight text-foreground">
          Bạn đã được xác thực
        </Text>
        <Text className="text-center text-base leading-6 text-muted-foreground">
          Hồ sơ của bạn có huy hiệu Đã xác thực. Nếu đổi ảnh chính, bạn sẽ cần xác thực
          lại.
        </Text>
        <Button size="xl" className="h-14 rounded-full bg-primary" onPress={close}>
          <Text className="text-base font-bold text-primary-foreground">Xong</Text>
        </Button>
      </SafeAreaView>
    );
  }

  const failed = status === "rejected";

  return (
    <SafeAreaView className="flex-1 bg-background px-6">
      <Pressable
        onPress={close}
        className="-ml-2 mt-2 h-10 w-10 items-center justify-center"
      >
        <Text className="text-xl font-bold text-foreground">✕</Text>
      </Pressable>

      <View className="flex-1 justify-center gap-6">
        <View className="h-24 w-24 items-center justify-center self-center rounded-full bg-primary-muted">
          <Text className="text-5xl">🛡️</Text>
        </View>
        <View className="gap-2">
          <Text className="text-center text-3xl font-black tracking-tight text-foreground">
            {failed ? "Thử lại nhé" : "Xác thực khuôn mặt"}
          </Text>
          <Text className="text-center text-base leading-6 text-muted-foreground">
            {failed
              ? failureMessage(verification?.failureReason)
              : "Nhận huy hiệu Đã xác thực để mọi người tin bạn là người thật. Chỉ mất khoảng 30 giây."}
          </Text>
        </View>

        {!failed ? (
          <View className="gap-3">
            {[
              ["📸", "Chụp 3 ảnh theo hướng dẫn"],
              ["🔍", "So khớp với ảnh chính của bạn"],
              ["🗑️", "Ảnh selfie bị xóa ngay sau khi xử lý"],
            ].map(([icon, text]) => (
              <View key={text} className="flex-row items-center gap-3">
                <Text className="text-lg">{icon}</Text>
                <Text className="flex-1 text-base text-foreground">{text}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {cameraBlocked ? (
          <StatusBanner tone="warning">
            {APP_NAME} cần quyền camera để xác thực.{" "}
            <Text
              className="text-sm font-bold text-primary"
              onPress={() => void Linking.openSettings()}
            >
              Mở Cài đặt
            </Text>
          </StatusBanner>
        ) : null}
        {error ? <StatusBanner tone="error">{error}</StatusBanner> : null}
      </View>

      <View className="gap-3 pb-4">
        {failed && verification?.failureReason === "reference_no_face" ? (
          <Button
            size="xl"
            className="h-14 rounded-full bg-primary"
            onPress={() => router.replace("/(app)/edit-profile")}
          >
            <Text className="text-base font-bold text-primary-foreground">
              Đổi ảnh chính
            </Text>
          </Button>
        ) : attemptsLeft > 0 ? (
          <Button
            size="xl"
            className="h-14 rounded-full bg-primary"
            onPress={() => void start()}
          >
            <Text className="text-base font-bold text-primary-foreground">
              {failed ? `Thử lại (còn ${attemptsLeft} lượt)` : "Bắt đầu"}
            </Text>
          </Button>
        ) : (
          <StatusBanner tone="info">
            Bạn đã hết lượt hôm nay. Hãy thử lại vào ngày mai.
          </StatusBanner>
        )}
        <Text className="text-center text-xs leading-5 text-muted-foreground">
          Bằng việc nhấn Bắt đầu, bạn đồng ý cho {APP_NAME} xử lý dữ liệu khuôn mặt để xác
          thực tài khoản.{" "}
          <Text className="text-xs font-bold text-primary" onPress={openPrivacy}>
            Chính sách bảo mật
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}
