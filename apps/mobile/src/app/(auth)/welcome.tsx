import { router } from "expo-router";
import Handshake from "lucide-react-native/icons/handshake";
import Heart from "lucide-react-native/icons/heart";
import MessageCircleHeart from "lucide-react-native/icons/message-circle-heart";
import VenetianMask from "lucide-react-native/icons/venetian-mask";
import * as React from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { APP_NAME } from "@repo/core";
import { Button, Icon, Text } from "@repo/ui";

import { openPrivacy, openTerms } from "@/legal";

// The product's promise comes first: it is why the app later asks for a real
// name and real photos, and why nobody will see them.
const SLIDES = [
  {
    icon: VenetianMask,
    title: "Hẹn hò, nhưng riêng tư",
    body: "Để ai đó rung động vì cách bạn trò chuyện, trước cả khi nhìn thấy gương mặt bạn.",
  },
  {
    icon: Handshake,
    title: "Hai bên đồng ý mới mở",
    body: "Mỗi bí mật chỉ hé lộ khi cả hai cùng sẵn sàng. Không ai đi trước, không ai bị bỏ lại.",
  },
  {
    icon: MessageCircleHeart,
    title: "Gợi ý theo độ hợp nhau",
    body: "Ai đó ngoài kia đang hợp với bạn hơn bạn nghĩ. Có khi chỉ cách một lời chào.",
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
            <Icon
              as={Heart}
              size={20}
              className="text-primary-foreground"
              fill="currentColor"
            />
          </View>
          <Text className="text-2xl font-black tracking-tight text-foreground">
            {APP_NAME}
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
              <Icon as={slide.icon} size={56} className="text-primary" />
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
