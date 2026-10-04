import { useMutation } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  confirmUpload,
  createUploadUrl,
  parseProfileForm,
  updateMyProfile,
} from "@repo/api-contract";
import { useAuthStore } from "@repo/store";
import {
  Button,
  DatePickerInput,
  ImageUploader,
  Input,
  Label,
  SegmentedControl,
  SelectPicker,
  Text,
} from "@repo/ui";

const GENDER_OPTIONS = [
  { value: "male" as const, label: "Nam", symbol: "♂" },
  { value: "female" as const, label: "Nữ", symbol: "♀" },
  { value: "other" as const, label: "Khác", symbol: "⚥" },
];

export default function OnboardingProfileScreen() {
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  const [nickname, setNickname] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [birthYear, setBirthYear] = React.useState<number | null>(null);
  const [isAdult, setIsAdult] = React.useState(false);
  const [gender, setGender] = React.useState<"male" | "female" | "other" | null>(
    "female",
  );
  const [city, setCity] = React.useState("");

  const [avatarUri, setAvatarUri] = React.useState<string | null>(null);
  const [avatarMediaId, setAvatarMediaId] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const update = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: async () => {
      await completeOnboarding();
      router.replace("/(app)/(tabs)/profile");
    },
    onError: () => setError("Không lưu được hồ sơ. Vui lòng thử lại sau."),
  });

  async function handlePickAvatar() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Vui lòng cấp quyền truy cập thư viện ảnh.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setAvatarUri(asset.uri);
        setError(null);

        // Upload to S3 if media service is available
        try {
          setIsUploading(true);
          const rawType = asset.mimeType || "image/jpeg";
          const contentType = rawType === "image/jpg" ? "image/jpeg" : rawType;

          let fileSize = Math.max(1, Math.round(asset.fileSize || 1024));
          try {
            const fileInfo = await FileSystem.getInfoAsync(asset.uri);
            if (
              fileInfo.exists &&
              typeof fileInfo.size === "number" &&
              fileInfo.size > 0
            ) {
              fileSize = fileInfo.size;
            }
          } catch {
            // fallback to asset.fileSize
          }

          const uploadData = await createUploadUrl({
            kind: "public",
            contentType,
            size: fileSize,
          });

          if (Platform.OS === "web") {
            const response = await fetch(asset.uri);
            const blob = await response.blob();
            const uploadRes = await fetch(uploadData.uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": contentType },
              body: blob,
            });
            if (!uploadRes.ok) {
              throw new Error(
                `Tải ảnh lên máy chủ thất bại (mã lỗi ${uploadRes.status})`,
              );
            }
          } else {
            const uploadRes = await FileSystem.uploadAsync(
              uploadData.uploadUrl,
              asset.uri,
              {
                httpMethod: "PUT",
                uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
                headers: {
                  "Content-Type": contentType,
                },
              },
            );

            if (uploadRes.status < 200 || uploadRes.status >= 300) {
              console.error(
                "PUT to S3 failed in onboarding:",
                uploadRes.status,
                uploadRes.body,
              );
              throw new Error(
                `Tải ảnh lên máy chủ thất bại (mã lỗi ${uploadRes.status})`,
              );
            }
          }

          await confirmUpload(uploadData.mediaId);
          setAvatarMediaId(uploadData.mediaId);
        } catch (uploadErr) {
          console.warn("S3 presigned upload skipped or failed:", uploadErr);
          const msg =
            uploadErr instanceof Error
              ? uploadErr.message
              : "Không thể tải ảnh lên máy chủ lưu trữ.";
          setError(msg);
        } finally {
          setIsUploading(false);
        }
      }
    } catch (e) {
      console.error("Lỗi chọn ảnh:", e);
      setError("Không thể chọn ảnh từ thiết bị.");
    }
  }

  function handleSubmit() {
    if (!nickname.trim()) {
      setError("Vui lòng nhập họ và tên hoặc biệt danh");
      return;
    }

    if (!birthYear) {
      setError("Vui lòng nhập đầy đủ ngày sinh (DD / MM / YYYY)");
      return;
    }

    if (!isAdult) {
      setError("Bạn phải từ 18 tuổi trở lên để tham gia");
      return;
    }

    if (!city.trim()) {
      setError("Vui lòng chọn khu vực / thành phố của bạn");
      return;
    }

    const parsed = parseProfileForm({
      nickname,
      birthYear: String(birthYear),
      city,
      gender,
      avatarMediaId,
    });

    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    setError(null);
    update.mutate(parsed.body);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Top App Header */}
        <View className="h-14 w-full flex-row items-center justify-between border-b border-border/30 px-4">
          <Pressable
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace("/(auth)/phone");
            }}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-secondary"
          >
            <Text className="text-xl font-bold text-foreground">←</Text>
          </Pressable>

          {/* Badge Center */}
          <View className="flex-row items-center gap-1.5 rounded-full bg-primary/10 px-3.5 py-1.5 border border-primary/20">
            <Text className="text-sm">❤️</Text>
            <Text className="text-xs font-bold text-primary">Name And Birthday</Text>
          </View>

          {/* Profile Icon Right */}
          <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Text className="text-sm">👤</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-5 pt-3"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Main Title */}
          <View className="items-center gap-1 py-2">
            <Text className="text-2xl font-black text-foreground">Tạo hồ sơ của bạn</Text>
            <Text className="text-sm text-muted-foreground">
              Hãy cho mọi người biết bạn là ai
            </Text>
          </View>

          {/* Avatar Upload */}
          <View className="my-3 items-center">
            <ImageUploader
              imageUrl={avatarUri}
              isUploading={isUploading}
              onPickImage={handlePickAvatar}
              onRemoveImage={() => {
                setAvatarUri(null);
                setAvatarMediaId(null);
              }}
              subtitle="Ảnh chân dung rõ mặt giúp nhận được nhiều tương tác hơn"
            />
          </View>

          {/* Form Fields */}
          <View className="gap-4">
            {/* Field 1: Họ và tên */}
            <View className="gap-1.5">
              <Label nativeID="nickname">
                <Text className="text-sm font-bold text-foreground">Họ và tên</Text>
              </Label>
              <Input
                aria-labelledby="nickname"
                value={nickname}
                onChangeText={setNickname}
                placeholder="Ví dụ: Minh Anh"
                className="h-12 rounded-2xl border-border/80 bg-secondary/50 px-4 text-base font-medium"
              />
            </View>

            {/* Field 2: Ngày sinh */}
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Label nativeID="dateOfBirth">
                  <Text className="text-sm font-bold text-foreground">Ngày sinh</Text>
                </Label>
                <Text className="text-xs font-medium text-muted-foreground">
                  Từ 18 tuổi trở lên
                </Text>
              </View>
              <DatePickerInput
                value={dateOfBirth}
                onChange={(formatted, year, adult) => {
                  setDateOfBirth(formatted);
                  setBirthYear(year);
                  setIsAdult(adult);
                  if (error) setError(null);
                }}
              />
            </View>

            {/* Field 3: Giới tính */}
            <View className="gap-1.5">
              <Label nativeID="gender">
                <Text className="text-sm font-bold text-foreground">Giới tính</Text>
              </Label>
              <SegmentedControl
                options={GENDER_OPTIONS}
                value={gender}
                onChange={(val) => {
                  setGender(val);
                  if (error) setError(null);
                }}
              />
            </View>

            {/* Field 4: Khu vực */}
            <View className="gap-1.5">
              <Label nativeID="city">
                <Text className="text-sm font-bold text-foreground">Khu vực</Text>
              </Label>
              <SelectPicker
                value={city}
                onChange={(val) => {
                  setCity(val);
                  if (error) setError(null);
                }}
                placeholder="Chọn thành phố của bạn"
              />
            </View>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="mt-4 rounded-xl bg-destructive/10 p-3">
              <Text className="text-center text-sm font-medium text-destructive">
                {error}
              </Text>
            </View>
          ) : null}

          {/* Submit Button (Figma 358 Fill x 48) */}
          <View className="mt-7">
            <Button
              size="xl"
              disabled={update.isPending || isUploading}
              onPress={handleSubmit}
              className="h-12 w-full flex-row items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30"
            >
              <Text className="text-base font-bold text-primary-foreground">
                {update.isPending ? "Đang lưu..." : "Hoàn tất →"}
              </Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
