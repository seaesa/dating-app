import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import ArrowLeft from "lucide-react-native/icons/arrow-left";
import EyeOff from "lucide-react-native/icons/eye-off";
import LockKeyhole from "lucide-react-native/icons/lock-keyhole";
import * as React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RevealKind } from "@repo/api-contract";
import { Button, cn, Icon, Text } from "@repo/ui";

import { attributeEntry, interestEntry, useCatalog } from "@/chat/catalog";
import { confirmClose } from "@/chat/confirm-close";
import { sharedInterests } from "@/chat/icebreakers";
import { chipState, type ChipState } from "@/chat/reveal";
import { useChatRoom } from "@/chat/use-chat-room";
import { ConsentSheet } from "@/components/chat/consent-sheet";
import { PeerAvatar } from "@/components/chat/peer-avatar";
import { VerifiedName } from "@/components/chat/verified-name";

const GENDER = { male: "Nam", female: "Nữ", other: "Khác" } as const;
const ATTRIBUTES = [
  "intent",
  "industry",
  "education",
  "heightCm",
  "hometown",
  "exercise",
  "drinking",
  "smoking",
  "pets",
  "diet",
  "zodiac",
  "loveLanguage",
  "mbti",
] as const;

const retryLater = () => Alert.alert("Chưa thực hiện được", "Thử lại sau ít phút nhé.");

const STATE_LABEL: Record<ChipState, string> = {
  none: "Chưa mở",
  incoming: "Đang chờ bạn",
  outgoing: "Đã gửi yêu cầu",
  granted: "Đã mở",
};
const ACTION: Record<RevealKind, Record<"none" | "incoming" | "outgoing", string>> = {
  photos: {
    none: "Yêu cầu mở ảnh & thông tin",
    incoming: "Xem yêu cầu mở ảnh & thông tin",
    outgoing: "Đang chờ đồng ý",
  },
};

export default function PartnerProfileScreen() {
  const { connectionId } = useLocalSearchParams<{ connectionId: string }>();
  const room = useChatRoom(connectionId);
  const catalog = useCatalog();
  const { width } = useWindowDimensions();
  const [consentKind, setConsentKind] = React.useState<RevealKind | null>(null);
  const [page, setPage] = React.useState(0);

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({
        pathname: "/(app)/chat/[connectionId]",
        params: { connectionId },
      });
    }
  };

  if (room.ended || room.missing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text className="text-center text-lg font-bold text-foreground">
          Cuộc trò chuyện đã kết thúc
        </Text>
        <Button onPress={goBack} className="rounded-full px-6">
          <Text className="font-semibold text-primary-foreground">Quay lại</Text>
        </Button>
      </SafeAreaView>
    );
  }
  if (!room.connection || !room.me) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const { connection, me } = room;
  const { profile, identity } = connection.peer;
  const photos = identity?.photoUrls ?? [];
  const shared = new Set(sharedInterests(profile.interests, me.profile.interests));
  const photoState = chipState(connection.reveals.photos, me.id);
  const onReveal = (kind: RevealKind, state: ChipState) => {
    if (state === "none" || state === "incoming") setConsentKind(kind);
  };
  const run = (action: () => Promise<unknown>) => {
    action()
      .then(() => setConsentKind(null))
      .catch(retryLater);
  };
  const consentMode = (kind: RevealKind) =>
    chipState(connection.reveals[kind], me.id) === "incoming" ? "accept" : "request";
  const close = (reason: "unmatch" | "block") =>
    confirmClose(profile.displayName, reason, room.close, () =>
      router.dismissTo("/(app)/(tabs)/chat"),
    );
  const photoAction = photoState === "granted" ? null : ACTION.photos[photoState];

  const isRevealed = photoState === "granted";
  const anonymousName = `${GENDER[profile.gender ?? "other"]}, ${profile.age ?? ""} tuổi`;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="h-14 flex-row items-center px-2">
        <Pressable
          onPress={goBack}
          accessibilityLabel="Quay lại"
          className="h-11 w-11 items-center justify-center"
        >
          <Icon as={ArrowLeft} size={22} />
        </Pressable>
      </View>
      <ScrollView contentContainerClassName="pb-10">
        {photos.length > 0 ? (
          <View>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) =>
                setPage(Math.round(event.nativeEvent.contentOffset.x / width))
              }
            >
              {photos.map((url) => (
                <Image
                  key={url}
                  source={{ uri: url }}
                  style={{ width, height: width * 1.1 }}
                  contentFit="cover"
                  transition={150}
                />
              ))}
            </ScrollView>
            {photos.length > 1 ? (
              <View className="absolute bottom-3 w-full flex-row justify-center gap-1.5">
                {photos.map((url, index) => (
                  <View
                    key={url}
                    className={cn(
                      "h-2 rounded-full",
                      index === page ? "w-5 bg-background" : "w-2 bg-background/50",
                    )}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : (
          <View className="mx-5 items-center gap-3 rounded-3xl bg-secondary py-10">
            <PeerAvatar gender={profile.gender} size={96} />
            <View className="flex-row items-center gap-1.5">
              <Icon as={EyeOff} size={16} className="text-muted-foreground" />
              <Text className="text-sm text-muted-foreground">
                Ảnh & thông tin đang ẩn
              </Text>
            </View>
            {photoAction ? (
              <Button
                size="sm"
                variant={photoState === "outgoing" ? "ghost" : "default"}
                disabled={photoState === "outgoing"}
                onPress={() => onReveal("photos", photoState)}
                className="rounded-full"
              >
                <Text>{photoAction}</Text>
              </Button>
            ) : null}
          </View>
        )}

        <View className="gap-1 px-5 pt-5">
          {isRevealed ? (
            <VerifiedName
              name={profile.displayName}
              age={profile.age}
              verified={profile.verified}
              className="text-3xl font-black"
              iconSize={24}
            />
          ) : (
            <Text className="text-3xl font-black text-foreground">{anonymousName}</Text>
          )}
          <Text className="text-base text-muted-foreground">
            {profile.city || "Việt Nam"}
          </Text>
        </View>

        <View className="mx-5 mt-5 gap-2 rounded-2xl border border-border p-4">
          <Text className="text-sm font-bold text-foreground">Thông tin đã mở</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted-foreground">Ảnh & thông tin cá nhân</Text>
            <Text className="text-sm font-semibold text-foreground">
              {STATE_LABEL[photoState]}
            </Text>
          </View>
        </View>

        {isRevealed ? (
          <View className="gap-4 px-5 pt-6">
            <Text className="text-lg font-bold text-foreground">
              Về {profile.displayName}
            </Text>
            {ATTRIBUTES.map((key) => {
              const entry = attributeEntry(catalog, key, profile.attributes[key]);
              if (!entry) return null;
              return (
                <View key={key} className="flex-row items-center gap-3">
                  <Text className="w-7 text-center text-lg">{entry.icon ?? ""}</Text>
                  <View className="flex-1">
                    <Text className="text-xs text-muted-foreground">{entry.title}</Text>
                    <Text className="text-base font-semibold text-foreground">
                      {entry.label}
                    </Text>
                  </View>
                </View>
              );
            })}
            {profile.bio ? (
              <Text className="text-base leading-6 text-foreground">{profile.bio}</Text>
            ) : null}
            {profile.interests.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {profile.interests.map((key) => {
                  const entry = interestEntry(catalog, key);
                  const common = shared.has(key);
                  return (
                    <View
                      key={key}
                      className={cn(
                        "rounded-full px-3 py-1",
                        common ? "bg-primary-muted" : "bg-secondary",
                      )}
                    >
                      <Text
                        className={cn(
                          "text-sm",
                          common ? "font-semibold text-primary" : "text-foreground",
                        )}
                      >
                        {entry.icon ? `${entry.icon} ` : ""}
                        {entry.label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            ) : null}
            {(profile.prompts ?? []).map((prompt) => (
              <View key={prompt.promptId} className="gap-1 rounded-2xl bg-secondary p-4">
                <Text className="text-xs text-muted-foreground">{prompt.question}</Text>
                <Text className="text-base text-foreground">{prompt.answer}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View className="mx-5 mt-6 items-center justify-center rounded-3xl border border-dashed border-border/80 bg-secondary/30 p-6 gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Icon as={LockKeyhole} size={26} className="text-primary" />
            </View>
            <Text className="text-base font-bold text-foreground text-center">
              Thông tin cá nhân & sở thích đang ẩn
            </Text>
            <Text className="text-center text-xs text-muted-foreground leading-5">
              Để bảo vệ quyền riêng tư theo yêu cầu, tên thật, bio, sở thích và thông tin
              chi tiết chỉ được tiết lộ khi cả hai bạn cùng đồng ý mở khóa.
            </Text>
            {photoAction ? (
              <Button
                size="sm"
                variant={photoState === "outgoing" ? "ghost" : "default"}
                disabled={photoState === "outgoing"}
                onPress={() => onReveal("photos", photoState)}
                className="mt-2 rounded-full px-5"
              >
                <Text className="text-xs font-semibold">{photoAction}</Text>
              </Button>
            ) : null}
          </View>
        )}

        <View className="px-5 pt-8">
          <Button size="xl" onPress={goBack} className="h-14 rounded-full bg-primary">
            <Text className="text-base font-bold text-primary-foreground">
              Quay lại trò chuyện
            </Text>
          </Button>
        </View>

        <View className="flex-row items-center justify-center gap-6 pt-4">
          <Pressable onPress={() => close("unmatch")} className="min-h-11 justify-center">
            <Text className="text-sm font-semibold text-muted-foreground">
              Hủy kết nối
            </Text>
          </Pressable>
          <Pressable onPress={() => close("block")} className="min-h-11 justify-center">
            <Text className="text-sm font-semibold text-destructive">Chặn</Text>
          </Pressable>
        </View>
      </ScrollView>

      {consentKind ? (
        <ConsentSheet
          visible
          kind={consentKind}
          mode={consentMode(consentKind)}
          peerName={isRevealed ? profile.displayName : anonymousName}
          busy={room.reveal.pending}
          onConfirm={() =>
            run(() =>
              consentMode(consentKind) === "accept"
                ? room.reveal.accept(consentKind)
                : room.reveal.request(consentKind),
            )
          }
          onDecline={() => run(() => room.reveal.decline(consentKind))}
          onClose={() => setConsentKind(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}
