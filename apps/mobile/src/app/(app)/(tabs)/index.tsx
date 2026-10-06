import * as React from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Text } from "@repo/ui";

const MOCK_PROFILES = [
  {
    id: "1",
    name: "Mai Chi",
    gender: "female",
    age: 24,
    location: "Quận 1, TP.HCM",
  },
  {
    id: "2",
    name: "Quốc Bảo",
    gender: "male",
    age: 27,
    location: "Bình Thạnh, TP.HCM",
  },
  {
    id: "3",
    name: "Thùy Dương",
    gender: "female",
    age: 25,
    location: "Quận 3, TP.HCM",
  },
  {
    id: "4",
    name: "Minh Hoàng",
    gender: "male",
    age: 29,
    location: "Quận 7, TP.HCM",
  },
  {
    id: "5",
    name: "Ngọc Trâm",
    gender: "female",
    age: 23,
    location: "Phú Nhuận, TP.HCM",
  },
];

export default function HomeFeedScreen() {
  const [greeted, setGreeted] = React.useState<Record<string, boolean>>({});

  function handleGreet(id: string) {
    setGreeted((prev) => ({ ...prev, [id]: true }));
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      {/* Top Header */}
      <View className="h-14 w-full flex-row items-center justify-between border-b border-border/30 px-5">
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl text-primary">🔥</Text>
          <Text className="text-2xl font-black tracking-tight text-foreground">Amor</Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <Text className="text-base text-muted-foreground">⚙️</Text>
          </Pressable>
          <View className="relative">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-secondary">
              <Text className="text-sm">👤</Text>
            </View>
            <View className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-3" showsVerticalScrollIndicator={false}>
        {/* Sub Header: Khám phá & Trực tuyến */}
        <View className="mb-3 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg font-bold text-foreground">Khám phá</Text>
            <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 border border-emerald-500/20">
              <View className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <Text className="text-xs font-semibold text-emerald-600">Trực tuyến</Text>
            </View>
          </View>

          <Pressable className="h-8 w-8 items-center justify-center rounded-lg bg-secondary/80">
            <Text className="text-sm">⚡</Text>
          </Pressable>
        </View>

        {/* Banner: Gợi ý hôm nay */}
        <View className="mb-3.5 flex-row items-center justify-between rounded-2xl border border-primary/25 bg-primary-muted/60 p-3.5 shadow-sm shadow-primary/10">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Text className="text-lg">✨</Text>
            </View>
            <View>
              <Text className="text-sm font-bold text-foreground">Gợi ý hôm nay</Text>
              <Text className="text-xs text-muted-foreground">
                Có <Text className="font-bold text-primary">15 hồ sơ</Text> mới phù hợp
                với bạn
              </Text>
            </View>
          </View>
          <Text className="text-lg font-bold text-muted-foreground">›</Text>
        </View>

        {/* Search Input */}
        <View className="mb-4 h-12 flex-row items-center rounded-2xl border border-border/80 bg-secondary/50 px-4">
          <Text className="mr-2 text-base text-muted-foreground">🔍</Text>
          <TextInput
            placeholder="Tìm theo độ tuổi, quận hoặc sở thích..."
            placeholderTextColor="hsl(var(--muted-foreground))"
            className="flex-1 text-sm text-foreground"
          />
        </View>

        {/* Section Header */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            HỒ SƠ NỔI BẬT
          </Text>
          <Pressable className="flex-row items-center gap-1">
            <Text className="text-xs font-semibold text-primary">Làm mới ↻</Text>
          </Pressable>
        </View>

        {/* Cards List */}
        <View className="gap-2.5 pb-6">
          {MOCK_PROFILES.map((profile) => {
            const isFemale = profile.gender === "female";
            const isGreeted = greeted[profile.id];

            return (
              <View
                key={profile.id}
                className="flex-row items-center justify-between rounded-2xl border border-border/60 bg-card p-3 shadow-sm shadow-black/5"
              >
                <View className="flex-row items-center gap-3">
                  {/* Avatar */}
                  <View
                    className={`h-12 w-12 items-center justify-center rounded-full ${
                      isFemale ? "bg-rose-500/10" : "bg-blue-500/10"
                    }`}
                  >
                    <Text className="text-xl">{isFemale ? "👩" : "👨"}</Text>
                  </View>

                  {/* Info */}
                  <View className="gap-0.5">
                    <View className="flex-row items-center gap-1.5">
                      <View
                        className={`rounded-md px-1.5 py-0.5 ${
                          isFemale ? "bg-rose-500/15" : "bg-blue-500/15"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            isFemale ? "text-rose-600" : "text-blue-600"
                          }`}
                        >
                          {isFemale ? "Nữ" : "Nam"}
                        </Text>
                      </View>
                      <Text className="text-base font-bold text-foreground">
                        {profile.name}
                      </Text>
                    </View>

                    <Text className="text-xs text-muted-foreground">
                      {profile.age} tuổi • 📍 {profile.location}
                    </Text>
                  </View>
                </View>

                {/* Greet Button */}
                <Button
                  size="sm"
                  onPress={() => handleGreet(profile.id)}
                  className={`h-9 rounded-full px-3.5 ${
                    isGreeted ? "bg-secondary" : "bg-primary"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isGreeted ? "text-muted-foreground" : "text-primary-foreground"
                    }`}
                  >
                    {isGreeted ? "✓ Đã chào" : "💌 Chào"}
                  </Text>
                </Button>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View className="items-center py-4 pb-8">
          <Text className="text-xs text-muted-foreground">
            • Bạn đã xem hết hồ sơ phù hợp lúc này •
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
