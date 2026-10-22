import { useQuery } from "@tanstack/react-query";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Heart from "lucide-react-native/icons/heart";
import MessageCircle from "lucide-react-native/icons/message-circle";
import Sparkles from "lucide-react-native/icons/sparkles";
import User from "lucide-react-native/icons/user";
import X from "lucide-react-native/icons/x";
import * as React from "react";
import { Modal, Platform, Pressable, View } from "react-native";

import { meQuery } from "@repo/api-contract";
import { Button, Icon, Text } from "@repo/ui";

export interface MatchCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  partnerName: string;
  partnerGender?: string | null;
  connectionId?: string | null;
}

export function MatchCelebrationModal({
  visible,
  onClose,
  partnerName,
  partnerGender,
  connectionId,
}: MatchCelebrationModalProps) {
  const router = useRouter();
  const { data: me } = useQuery(meQuery());

  const myName = me?.profile?.displayName || "Bạn";
  const myGender = me?.profile?.gender || "male";
  const isFemalePartner = partnerGender === "female";
  const isFemaleMe = myGender === "female";

  React.useEffect(() => {
    if (visible && Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [visible]);

  const handleOpenChat = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onClose();
    if (connectionId) {
      router.push({
        pathname: "/(app)/chat/[connectionId]",
        params: { connectionId },
      });
    } else {
      router.push("/(app)/(tabs)/matches");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/90 p-6">
        {/* Close Button top-right */}
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityLabel="Đóng modal tương hợp"
          className="absolute top-12 right-6 h-10 w-10 items-center justify-center rounded-full bg-white/10 active:opacity-70 z-50"
        >
          <Icon as={X} size={20} className="text-white" />
        </Pressable>

        {/* Celebration Container */}
        <View className="w-full max-w-sm items-center rounded-3xl border border-white/10 bg-slate-950/95 p-6 shadow-2xl">
          {/* Glowing Top Pill Badge */}
          <View className="flex-row items-center gap-1.5 rounded-full border border-primary/40 bg-primary/20 px-3.5 py-1">
            <Icon as={Sparkles} size={14} className="text-primary" />
            <Text className="text-xs font-black tracking-widest text-primary uppercase">
              Tương hợp mới
            </Text>
          </View>

          {/* Interlocking Avatar Duo */}
          <View className="my-6 h-28 w-44 items-center justify-center">
            <View className="relative flex-row items-center justify-center">
              {/* Left Circle: Me */}
              <View
                className={`h-22 w-22 items-center justify-center rounded-full border-4 border-slate-950 shadow-xl ${
                  isFemaleMe ? "bg-rose-500/25" : "bg-blue-500/25"
                }`}
              >
                <Icon
                  as={User}
                  size={38}
                  className={isFemaleMe ? "text-rose-400" : "text-blue-400"}
                />
              </View>

              {/* Right Circle: Partner */}
              <View
                className={`-ml-6 h-22 w-22 items-center justify-center rounded-full border-4 border-slate-950 shadow-xl ${
                  isFemalePartner ? "bg-rose-500/25" : "bg-blue-500/25"
                }`}
              >
                <Icon
                  as={User}
                  size={38}
                  className={isFemalePartner ? "text-rose-400" : "text-blue-400"}
                />
              </View>

              {/* Heart Badge at Intersection */}
              <View className="absolute top-6.5 left-15 h-9 w-9 items-center justify-center rounded-full border-2 border-slate-950 bg-primary shadow-lg shadow-primary/50">
                <Icon
                  as={Heart}
                  size={18}
                  className="text-primary-foreground fill-primary-foreground"
                />
              </View>
            </View>

            {/* Names beneath avatars */}
            <View className="mt-2 w-full flex-row items-center justify-between px-2">
              <Text
                className="max-w-[80px] text-center text-xs font-bold text-white/90"
                numberOfLines={1}
              >
                {myName}
              </Text>
              <Text
                className="max-w-[80px] text-center text-xs font-bold text-primary"
                numberOfLines={1}
              >
                {partnerName}
              </Text>
            </View>
          </View>

          {/* Title and Congratulation text */}
          <Text className="text-center text-2xl font-black tracking-tight text-white">
            Hai bạn đã ghép đôi!
          </Text>

          <Text className="mt-2.5 text-center text-sm leading-relaxed text-white/70">
            Bạn và <Text className="font-extrabold text-primary">{partnerName}</Text> đều
            đã gửi tín hiệu cho nhau. Hãy mở đầu câu chuyện ngay lúc này!
          </Text>

          {/* Action CTAs */}
          <View className="mt-7 w-full gap-3">
            <Button
              onPress={handleOpenChat}
              className="h-13 w-full flex-row items-center justify-center gap-2 rounded-2xl bg-primary shadow-lg shadow-primary/30 active:opacity-90"
            >
              <Icon as={MessageCircle} size={18} className="text-primary-foreground" />
              <Text className="text-base font-extrabold text-primary-foreground">
                Nhắn tin ngay
              </Text>
            </Button>

            <Button
              variant="outline"
              onPress={onClose}
              className="h-12 w-full rounded-2xl border-white/20 bg-white/5 active:bg-white/10"
            >
              <Text className="text-sm font-semibold text-white/80">
                Tiếp tục khám phá
              </Text>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
