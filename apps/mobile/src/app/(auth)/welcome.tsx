import { router } from "expo-router";
import * as React from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Text } from "@repo/ui";

import { openPrivacy, openTerms } from "@/legal";

// The product's promise comes first: it is why the app later asks for a real
// name and real photos, and why nobody will see them.
const SLIDES = [
  {
    icon: "🎭",
    title: "Hẹn hò, nhưng riêng tư",
    body: "Người khác chỉ thấy tên, tuổi và khu vực của bạn. Ảnh và liên lạc luôn được ẩn.",
  },
  {
    icon: "🤝",
    title: "Hai bên đồng ý mới mở",
    body: "Ảnh, Zalo, số điện thoại chỉ mở khi cả hai cùng đồng ý, và mở cho cả hai cùng lúc.",
  },
  {
    icon: "💞",
    title: "Gợi ý theo độ hợp nhau",
    body: "Chúng tôi gợi ý những người hợp với bạn, kèm mức tương thích cho cả hai cùng biết.",
  },
];

export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const [page, setPage] = React.useState(0);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="items-center pt-6">
        <View className="flex-row items-center gap-2">
          <View className="h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <Text className="text-base">❤️</Text>
          </View>
          <Text className="text-2xl font-black tracking-tight text-foreground">
            Terdin
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setPage(Math.round(e.nativeEvent.contentOffset.x / width))
        }
        className="flex-1"
      >
        {SLIDES.map((slide) => (
          <View
            key={slide.title}
            style={{ width }}
            className="items-center justify-center gap-5 px-8"
          >
            <View className="h-32 w-32 items-center justify-center rounded-full bg-primary-muted">
              <Text className="text-6xl">{slide.icon}</Text>
            </View>
            <Text className="text-center text-3xl font-black tracking-tight text-foreground">
              {slide.title}
            </Text>
            <Text className="text-center text-base leading-6 text-muted-foreground">
              {slide.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row justify-center gap-1.5 pb-6">
        {SLIDES.map((slide, index) => (
          <View
            key={slide.title}
            className={
              index === page
                ? "h-2 w-6 rounded-full bg-primary"
                : "h-2 w-2 rounded-full bg-border"
            }
          />
        ))}
      </View>

      <View className="gap-3 px-6 pb-4">
        <Button
          size="xl"
          className="h-14 rounded-full bg-primary"
          onPress={() =>
            router.push({ pathname: "/(auth)/phone", params: { mode: "signup" } })
          }
        >
          <Text className="text-base font-bold text-primary-foreground">
            Tạo tài khoản
          </Text>
        </Button>
        <Button
          size="xl"
          variant="outline"
          className="h-14 rounded-full"
          onPress={() =>
            router.push({ pathname: "/(auth)/phone", params: { mode: "login" } })
          }
        >
          <Text className="text-base font-bold text-foreground">Tôi đã có tài khoản</Text>
        </Button>
        <Text className="pt-1 text-center text-xs leading-5 text-muted-foreground">
          Tiếp tục nghĩa là bạn đồng ý với{" "}
          <Text className="text-xs font-bold text-primary" onPress={openTerms}>
            Điều khoản
          </Text>{" "}
          và{" "}
          <Text className="text-xs font-bold text-primary" onPress={openPrivacy}>
            Chính sách bảo mật
          </Text>
          .
        </Text>
      </View>
    </SafeAreaView>
  );
}
