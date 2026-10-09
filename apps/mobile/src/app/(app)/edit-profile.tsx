import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  meQuery,
  profileOptionsQuery,
  updateMyProfile,
  type ProfileAttributes,
} from "@repo/api-contract";
import { formatBirthDate } from "@repo/core";
import {
  Button,
  ChipSelect,
  DatePickerInput,
  Input,
  Label,
  NumberStepper,
  SegmentedControl,
  SelectPicker,
  Text,
} from "@repo/ui";

import { PhotoGrid } from "@/components/photo-grid";
import { pickAndUploadPhoto, savePhotoOrder } from "@/photos";

const GENDER_OPTIONS = [
  { value: "male" as const, label: "Nam", symbol: "♂" },
  { value: "female" as const, label: "Nữ", symbol: "♀" },
  { value: "other" as const, label: "Khác", symbol: "⚥" },
];

export default function EditProfileScreen() {
  const queryClient = useQueryClient();
  const { data: meData } = useQuery(meQuery());
  const { data: optionsData } = useQuery(profileOptionsQuery());

  const hasInitialized = React.useRef(false);
  const [nickname, setNickname] = React.useState("");
  const [dateOfBirth, setDateOfBirth] = React.useState("");
  const [gender, setGender] = React.useState<"male" | "female" | "other" | null>(
    "female",
  );
  const [city, setCity] = React.useState("");
  const [hometown, setHometown] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [heightCm, setHeightCm] = React.useState<number | null>(null);

  // Lifestyle and profile attributes
  const [intent, setIntent] = React.useState<string | null>(null);
  const [education, setEducation] = React.useState<string | null>(null);
  const [industry, setIndustry] = React.useState<string | null>(null);
  const [smoking, setSmoking] = React.useState<string | null>(null);
  const [drinking, setDrinking] = React.useState<string | null>(null);
  const [exercise, setExercise] = React.useState<string | null>(null);
  const [pets, setPets] = React.useState<string | null>(null);

  const [isUploadingPhoto, setIsUploadingPhoto] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const photos = meData?.account?.photos ?? [];
  const photoIds = photos.map((p) => p.mediaId);

  // Populate from existing profile on initial load
  React.useEffect(() => {
    if (meData?.profile && !hasInitialized.current) {
      hasInitialized.current = true;
      setNickname(meData.profile.displayName || "");
      setCity(meData.profile.city || "");
      setBio(meData.profile.bio || "");
      if (meData.profile.gender) {
        setGender(meData.profile.gender);
      }
      setDateOfBirth(formatBirthDate(meData.account?.dateOfBirth ?? ""));

      const attrs = meData.profile.attributes;
      if (attrs) {
        setHometown(attrs.hometown || "");
        setHeightCm(attrs.heightCm ?? null);
        setIntent(attrs.intent ?? null);
        setEducation(attrs.education ?? null);
        setIndustry(attrs.industry ?? null);
        setSmoking(attrs.smoking ?? null);
        setDrinking(attrs.drinking ?? null);
        setExercise(attrs.exercise ?? null);
        setPets(attrs.pets ?? null);
      }
    }
  }, [meData]);

  const update = useMutation({
    mutationFn: async (body: {
      displayName: string;
      city: string;
      gender: "male" | "female" | "other" | null;
      bio: string;
      attributes: ProfileAttributes;
    }) => {
      return updateMyProfile({
        displayName: body.displayName,
        city: body.city,
        gender: body.gender,
        bio: body.bio,
        attributes: body.attributes,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      router.back();
    },
    onError: () => setError("Không cập nhật được hồ sơ. Thử lại sau."),
  });

  async function handleAddPhoto() {
    if (photos.length >= 6) {
      setError("Bạn chỉ có thể tải lên tối đa 6 ảnh.");
      return;
    }
    setIsUploadingPhoto(true);
    setError(null);
    try {
      const mediaId = await pickAndUploadPhoto();
      if (mediaId) {
        await savePhotoOrder([...photoIds, mediaId]);
        await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      }
    } catch (err) {
      console.error("Lỗi tải ảnh:", err);
      setError("Không thể tải ảnh lên máy chủ. Vui lòng thử lại.");
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto(mediaId: string) {
    if (photoIds.length <= 1) {
      setError("Hồ sơ cần ít nhất 1 ảnh đại diện.");
      return;
    }
    setError(null);
    try {
      await savePhotoOrder(photoIds.filter((id) => id !== mediaId));
      await queryClient.invalidateQueries({ queryKey: ["users", "me"] });
    } catch (err) {
      console.error("Lỗi xóa ảnh:", err);
      setError("Không thể xóa ảnh. Vui lòng thử lại.");
    }
  }

  function handleSave() {
    if (!nickname.trim()) {
      setError("Vui lòng nhập họ và tên hoặc biệt danh");
      return;
    }

    if (!city.trim()) {
      setError("Vui lòng chọn khu vực sinh sống");
      return;
    }

    setError(null);
    update.mutate({
      displayName: nickname.trim(),
      city: city.trim(),
      gender,
      bio: bio.trim(),
      attributes: {
        ...meData?.profile.attributes,
        hometown: hometown.trim() || null,
        heightCm: heightCm ?? null,
        intent: intent || null,
        education: education || null,
        industry: industry || null,
        smoking: smoking || null,
        drinking: drinking || null,
        exercise: exercise || null,
        pets: pets || null,
      },
    });
  }

  // Options extracted from catalog
  const intentOptions =
    optionsData?.attributes.find((a) => a.key === "intent")?.options ?? [];
  const educationOptions =
    optionsData?.attributes.find((a) => a.key === "education")?.options ?? [];
  const industryOptions =
    optionsData?.attributes.find((a) => a.key === "industry")?.options ?? [];
  const smokingOptions =
    optionsData?.attributes.find((a) => a.key === "smoking")?.options ?? [];
  const drinkingOptions =
    optionsData?.attributes.find((a) => a.key === "drinking")?.options ?? [];
  const exerciseOptions =
    optionsData?.attributes.find((a) => a.key === "exercise")?.options ?? [];
  const petsOptions =
    optionsData?.attributes.find((a) => a.key === "pets")?.options ?? [];

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
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Photos (Up to 6) */}
          <View className="my-3 gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-bold text-foreground">
                Ảnh của bạn ({photos.length}/6)
              </Text>
              <Text className="text-xs font-semibold text-primary">
                Ảnh đầu tiên là ảnh đại diện
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground">
              Thêm tối đa 6 bức ảnh chân dung rõ mặt để tăng cơ hội tìm thấy người phù
              hợp.
            </Text>

            <View className="pt-2">
              <PhotoGrid
                photos={photos.map((p) => ({ key: p.mediaId, uri: p.url }))}
                uploading={isUploadingPhoto}
                onAdd={handleAddPhoto}
                onRemove={handleRemovePhoto}
              />
            </View>
          </View>

          {/* Section: Bio / Giới thiệu */}
          <View className="mt-4 gap-2 rounded-3xl border border-border/70 bg-card p-4 shadow-sm shadow-black/5">
            <View className="flex-row items-center justify-between">
              <Label nativeID="bio">
                <Text className="text-sm font-bold text-foreground">
                  ✍️ Lời giới thiệu (Bio)
                </Text>
              </Label>
              <Text className="text-xs font-medium text-muted-foreground">
                {bio.length}/500
              </Text>
            </View>
            <Input
              aria-labelledby="bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Chia sẻ về sở thích, gu âm nhạc hoặc điều bạn tìm kiếm ở đối phương..."
              multiline
              numberOfLines={4}
              maxLength={500}
              className="min-h-[96px] rounded-2xl border-border/80 bg-secondary/40 p-3 text-base leading-5"
            />
          </View>

          {/* Section: Thông tin cơ bản */}
          <View className="mt-5 gap-4 rounded-3xl border border-border/70 bg-card p-4 shadow-sm shadow-black/5">
            <Text className="text-base font-bold text-foreground">
              👤 Thông tin cơ bản
            </Text>

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

            {/* Chiều cao */}
            <View className="gap-1.5">
              <View className="flex-row items-center justify-between">
                <Label nativeID="height">
                  <Text className="text-sm font-bold text-foreground">📏 Chiều cao</Text>
                </Label>
                {heightCm != null ? (
                  <Pressable onPress={() => setHeightCm(null)} hitSlop={8}>
                    <Text className="text-xs font-semibold text-muted-foreground">
                      Xóa
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              {heightCm != null ? (
                <View className="pt-1">
                  <NumberStepper
                    value={heightCm}
                    min={optionsData?.heightMin ?? 140}
                    max={optionsData?.heightMax ?? 220}
                    unit="cm"
                    onChange={setHeightCm}
                  />
                </View>
              ) : (
                <Pressable
                  onPress={() => setHeightCm(165)}
                  className="h-12 items-center justify-center rounded-2xl border border-dashed border-border bg-secondary/30 active:bg-secondary/50"
                >
                  <Text className="text-sm font-semibold text-primary">
                    + Thêm chiều cao
                  </Text>
                </Pressable>
              )}
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

          {/* Section: Mục đích hẹn hò */}
          <View className="mt-5 gap-3 rounded-3xl border border-border/70 bg-card p-4 shadow-sm shadow-black/5">
            <View>
              <Text className="text-base font-bold text-foreground">
                🎯 Bạn đang tìm kiếm
              </Text>
              <Text className="text-xs text-muted-foreground">
                Mục đích kết nối giúp gợi ý người cùng chí hướng
              </Text>
            </View>
            <ChipSelect
              options={intentOptions}
              value={intent ? [intent] : []}
              onChange={(picked) => setIntent(picked[0] ?? null)}
            />
          </View>

          {/* Section: Học vấn & Công việc */}
          <View className="mt-5 gap-4 rounded-3xl border border-border/70 bg-card p-4 shadow-sm shadow-black/5">
            <Text className="text-base font-bold text-foreground">
              🎓 Học vấn & Nghề nghiệp
            </Text>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Học vấn</Text>
              <ChipSelect
                options={educationOptions}
                value={education ? [education] : []}
                onChange={(picked) => setEducation(picked[0] ?? null)}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">Ngành nghề</Text>
              <ChipSelect
                options={industryOptions}
                value={industry ? [industry] : []}
                onChange={(picked) => setIndustry(picked[0] ?? null)}
              />
            </View>
          </View>

          {/* Section: Lối sống & Thói quen */}
          <View className="mt-5 gap-4 rounded-3xl border border-border/70 bg-card p-4 shadow-sm shadow-black/5">
            <View>
              <Text className="text-base font-bold text-foreground">
                🌿 Lối sống & Thói quen
              </Text>
              <Text className="text-xs text-muted-foreground">
                Tìm người có nhịp sống tương thích với bạn
              </Text>
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                🏃 Tập thể thao
              </Text>
              <ChipSelect
                options={exerciseOptions}
                value={exercise ? [exercise] : []}
                onChange={(picked) => setExercise(picked[0] ?? null)}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">
                🍷 Uống rượu bia
              </Text>
              <ChipSelect
                options={drinkingOptions}
                value={drinking ? [drinking] : []}
                onChange={(picked) => setDrinking(picked[0] ?? null)}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">🚬 Hút thuốc</Text>
              <ChipSelect
                options={smokingOptions}
                value={smoking ? [smoking] : []}
                onChange={(picked) => setSmoking(picked[0] ?? null)}
              />
            </View>

            <View className="gap-2">
              <Text className="text-sm font-semibold text-foreground">🐾 Thú cưng</Text>
              <ChipSelect
                options={petsOptions}
                value={pets ? [pets] : []}
                onChange={(picked) => setPets(picked[0] ?? null)}
              />
            </View>
          </View>

          {error ? (
            <View className="mt-4 rounded-2xl bg-destructive/10 p-3.5">
              <Text className="text-center text-sm font-medium text-destructive">
                {error}
              </Text>
            </View>
          ) : null}

          {/* Nút lưu */}
          <View className="mt-7">
            <Button
              size="xl"
              disabled={update.isPending || isUploadingPhoto}
              onPress={handleSave}
              className="h-12 w-full flex-row items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25 active:opacity-90"
            >
              <Text className="text-base font-bold text-primary-foreground">
                {update.isPending ? "Đang lưu thay đổi..." : "Lưu thay đổi"}
              </Text>
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
