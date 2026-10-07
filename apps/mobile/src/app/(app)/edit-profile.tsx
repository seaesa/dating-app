import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  meQuery,
  updateMyIdentity,
  updateMyProfile,
} from "@repo/api-contract";
import { formatBirthDate } from "@repo/core";
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

export default function EditProfileScreen() {
  const queryClient = useQueryClient();
  const { data: meData } = useQuery(meQuery());

  const hasInitialized = React.useRef(false);
  const [nickname, setNickname] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [gender, setGender] = React.useState<"male" | "female" | "other" | null>(
    "female",
  );
  const [city, setCity] = React.useState("");
  const [hometown, setHometown] = React.useState("");

  const [avatarUri, setAvatarUri] = React.useState<string | null>(null);
  const [avatarMediaId, setAvatarMediaId] = React.useState<string | null | undefined>(
    undefined,
  );
  const [isAvatarRemoved, setIsAvatarRemoved] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Populate from existing profile only on initial load
  React.useEffect(() => {
    if (meData?.profile && !hasInitialized.current) {
      hasInitialized.current = true;
      setNickname(meData.profile.displayName);
      setCity(meData.profile.city || "");
      setHometown(meData.profile.attributes?.hometown || "");
      if (meData.identity?.photoUrls[0]) {
        setAvatarUri(meData.identity.photoUrls[0]);
      }
      if (meData.profile.gender) {
        setGender(meData.profile.gender);
      }
      setDateOfBirth(formatBirthDate(meData.account?.dateOfBirth ?? ""));
    }
  }, [meData]);

  const update = useMutation({
    mutationFn: async (body: {
      displayName: string;
      city: string;
      hometown?: string;
      gender: "male" | "female" | "other" | null;
      photoMediaIds?: string[];
    }) => {
      if (body.photoMediaIds)
        await updateMyIdentity({ photoMediaIds: body.photoMediaIds });
      return updateMyProfile({
        displayName: body.displayName,
        city: body.city,
        gender: body.gender,
        attributes: {
          ...meData?.profile.attributes,
          hometown: body.hometown?.trim() || null,
        },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      router.back();
    },
    onError: () => setError("Không cập nhật được hồ sơ. Thử lại sau."),
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
        setIsAvatarRemoved(false);
        setError(null);

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
            kind: "private",
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
              console.error("PUT to S3 failed:", uploadRes.status, uploadRes.body);
              throw new Error(
                `Tải ảnh lên máy chủ thất bại (mã lỗi ${uploadRes.status})`,
              );
            }
          }

          await confirmUpload(uploadData.mediaId);
          setAvatarMediaId(uploadData.mediaId);
        } catch (uploadErr) {
          console.warn("S3 upload skipped or failed:", uploadErr);
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
      setError("Không thể chọn ảnh.");
    }
  }

  function handleSave() {
    if (!nickname.trim()) {
      setError("Vui lòng nhập họ và tên hoặc biệt danh");
      return;
    }

    if (!city.trim()) {
      setError("Vui lòng chọn khu vực");
      return;
    }

    // The avatar here is the main photo; the rest of the photos stay as they are.
    const photoIds = meData?.account?.photos.map((p) => p.mediaId) ?? [];
    let photoMediaIds: string[] | undefined;
    if (isAvatarRemoved) {
      if (photoIds.length <= 1) {
        setError("Cần ít nhất 1 ảnh");
        return;
      }
      photoMediaIds = photoIds.slice(1);
    } else if (avatarMediaId) {
      photoMediaIds = [avatarMediaId, ...photoIds.slice(1)];
    }

    setError(null);
    update.mutate({
      displayName: nickname.trim(),
      city,
      hometown,
      gender,
      photoMediaIds,
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Top Header */}
        <View className="h-14 w-full flex-row items-center justify-between border-b border-border/40 px-4">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-secondary"
          >
            <Text className="text-xl font-bold text-foreground">←</Text>
          </Pressable>
          <Text className="text-base font-bold text-foreground">Chỉnh sửa hồ sơ</Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1 px-5 pt-3"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar Upload */}
          <View className="my-3 items-center">
            <ImageUploader
              imageUrl={avatarUri}
              isUploading={isUploading}
              onPickImage={handlePickAvatar}
              onRemoveImage={() => {
                setAvatarUri(null);
                setAvatarMediaId(null);
                setIsAvatarRemoved(true);
              }}
              subtitle="Cập nhật ảnh chân dung của bạn"
            />
          </View>

          {/* Form Fields */}
          <View className="gap-4">
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

            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Label nativeID="dateOfBirth">
                  <Text className="text-sm font-bold text-foreground">Ngày sinh</Text>
                </Label>
                <Text className="text-xs font-medium text-muted-foreground">
                  Không thể thay đổi
                </Text>
              </View>
              <DatePickerInput value={dateOfBirth} onChange={setDateOfBirth} disabled />
            </View>

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

            <View className="gap-1.5">
              <Label nativeID="city">
                <Text className="text-sm font-bold text-foreground">
                  Khu vực sinh sống
                </Text>
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

            <View className="gap-1.5">
              <Label nativeID="hometown">
                <Text className="text-sm font-bold text-foreground">Quê quán</Text>
              </Label>
              <SelectPicker
                value={hometown}
                onChange={(val) => {
                  setHometown(val);
                  if (error) setError(null);
                }}
                placeholder="Chọn quê quán của bạn"
              />
            </View>
          </View>

          {error ? (
            <View className="mt-4 rounded-xl bg-destructive/10 p-3">
              <Text className="text-center text-sm font-medium text-destructive">
                {error}
              </Text>
            </View>
          ) : null}

          <View className="mt-7">
            <Button
              size="xl"
              disabled={update.isPending || isUploading}
              onPress={handleSave}
              className="h-12 w-full flex-row items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25"
            >
              <Text className="text-base font-bold text-primary-foreground">
                {update.isPending ? "Đang lưu..." : "Lưu thay đổi"}
              </Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
