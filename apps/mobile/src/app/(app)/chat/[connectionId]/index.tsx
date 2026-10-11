import { FlashList, type FlashListRef } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import MessageCircleOff from "lucide-react-native/icons/message-circle-off";
import * as React from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { RevealKind } from "@repo/api-contract";
import { Button, Icon, Text } from "@repo/ui";

import { useCatalog } from "@/chat/catalog";
import { confirmClose } from "@/chat/confirm-close";
import type { ChatRow } from "@/chat/messages";
import { chipState, REVEAL_KINDS } from "@/chat/reveal";
import { useChatRoom } from "@/chat/use-chat-room";
import { ChatHeader } from "@/components/chat/chat-header";
import { Composer } from "@/components/chat/composer";
import { ConsentSheet } from "@/components/chat/consent-sheet";
import { IntroCard } from "@/components/chat/intro-card";
import { MessageBubble } from "@/components/chat/message-bubble";
import { OptionsSheet } from "@/components/chat/options-sheet";
import { PrivacySheet } from "@/components/chat/privacy-sheet";
import { RequestBanner } from "@/components/chat/request-banner";
import { SystemRow } from "@/components/chat/system-row";

function Ended({ title }: { title: string }) {
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(tabs)/chat");
    }
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <Icon as={MessageCircleOff} size={40} className="text-muted-foreground" />
      <Text className="text-center text-lg font-bold text-foreground">{title}</Text>
      <Button onPress={goBack} className="rounded-full px-6">
        <Text className="font-semibold text-primary-foreground">Quay lại</Text>
      </Button>
    </SafeAreaView>
  );
}

const retryLater = () => Alert.alert("Chưa thực hiện được", "Thử lại sau ít phút nhé.");

export default function ChatRoomScreen() {
  const { connectionId } = useLocalSearchParams<{ connectionId: string }>();
  const room = useChatRoom(connectionId);
  const catalog = useCatalog();
  const [draft, setDraft] = React.useState("");
  const [privacyOpen, setPrivacyOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [consentKind, setConsentKind] = React.useState<RevealKind | null>(null);
  const list = React.useRef<FlashListRef<ChatRow>>(null);

  // The keyboard shrinks the list from the bottom; keep the newest message in
  // view, as chat apps do, instead of the one at the top.
  React.useEffect(() => {
    const subscription = Keyboard.addListener("keyboardDidShow", () =>
      list.current?.scrollToEnd({ animated: true }),
    );
    return () => subscription.remove();
  }, []);

  if (room.ended) return <Ended title="Cuộc trò chuyện đã kết thúc" />;
  if (room.missing) return <Ended title="Không tìm thấy cuộc trò chuyện" />;
  if (room.loading || !room.connection || !room.me) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  const { connection, me } = room;
  const peerName = connection.peer.profile.displayName;
  const incoming = REVEAL_KINDS.find(
    (kind) => chipState(connection.reveals[kind], me.id) === "incoming",
  );
  // While a request waits on me the banner says it; the same line in the
  // timeline would only repeat it. It shows again, as history, once answered.
  const rows = room.rows.filter(
    (row) =>
      row.type !== "message" ||
      row.message.event !== "reveal_requested" ||
      row.message.revealKind !== incoming ||
      row.message.actorId === me.id,
  );
  const openProfile = () =>
    router.push({
      pathname: "/(app)/chat/[connectionId]/profile",
      params: { connectionId },
    });
  const send = () => {
    room.sendText(draft);
    setDraft("");
  };
  const run = (action: () => Promise<unknown>) => {
    action()
      .then(() => setConsentKind(null))
      .catch(retryLater);
  };
  const consentMode = (kind: RevealKind) =>
    chipState(connection.reveals[kind], me.id) === "incoming" ? "accept" : "request";
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(app)/(tabs)/chat");
    }
  };
  const closeRoom = (reason: "unmatch" | "block") =>
    confirmClose(peerName, reason, room.close, goBack);

  const renderRow = ({ item }: { item: ChatRow }) => {
    if (item.type === "day") {
      return (
        <View className="my-3 self-center rounded-full bg-secondary px-3 py-1">
          <Text className="text-xs font-semibold text-muted-foreground">
            {item.label}
          </Text>
        </View>
      );
    }
    if (item.message.kind === "system") {
      return <SystemRow message={item.message} myId={me.id} peerName={peerName} />;
    }
    return (
      <MessageBubble
        message={item.message}
        mine={item.mine}
        startsGroup={item.startsGroup}
        endsGroup={item.endsGroup}
        seen={item.seen}
        onRetry={room.retry}
      />
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
      <ChatHeader
        peer={connection.peer}
        pendingRequest={incoming !== undefined}
        onBack={goBack}
        onOpenProfile={openProfile}
        onOpenPrivacy={() => setPrivacyOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
      />
      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <FlashList
          ref={list}
          data={rows}
          keyExtractor={(row) => row.key}
          getItemType={(row) => (row.type === "day" ? "day" : row.message.kind)}
          renderItem={renderRow}
          ListHeaderComponent={
            room.hasOlder ? null : (
              <IntroCard
                peer={connection.peer.profile}
                me={me.profile}
                catalog={catalog}
                showIcebreakers={!room.hasText}
                onPick={setDraft}
              />
            )
          }
          onStartReached={room.loadOlder}
          onStartReachedThreshold={0.2}
          maintainVisibleContentPosition={{
            startRenderingFromBottom: true,
            autoscrollToBottomThreshold: 0.2,
          }}
        />
        {incoming ? (
          <RequestBanner
            kind={incoming}
            peerName={peerName}
            onDecline={() => run(() => room.reveal.decline(incoming))}
            onReview={() => setConsentKind(incoming)}
          />
        ) : null}
        <Composer value={draft} onChange={setDraft} onSend={send} />
      </KeyboardAvoidingView>

      <PrivacySheet
        visible={privacyOpen}
        reveals={connection.reveals}
        myId={me.id}
        peerName={peerName}
        onPick={(kind) => {
          setPrivacyOpen(false);
          setConsentKind(kind);
        }}
        onClose={() => setPrivacyOpen(false)}
      />
      {consentKind ? (
        <ConsentSheet
          visible
          kind={consentKind}
          mode={consentMode(consentKind)}
          peerName={peerName}
          myPhotoUrls={me.identity?.photoUrls ?? []}
          myPhone={me.phone}
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
      <OptionsSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        options={[
          { label: "Xem hồ sơ", onPress: openProfile },
          {
            label: "Hủy kết nối",
            destructive: true,
            onPress: () => closeRoom("unmatch"),
          },
          { label: "Chặn", destructive: true, onPress: () => closeRoom("block") },
        ]}
      />
    </SafeAreaView>
  );
}
