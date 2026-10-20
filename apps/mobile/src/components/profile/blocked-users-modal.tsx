import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ShieldAlert from "lucide-react-native/icons/shield-alert";
import UserX from "lucide-react-native/icons/user-x";
import X from "lucide-react-native/icons/x";
import * as React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { blockedUsersQuery, unblockUser, type BlockedUserRead } from "@repo/api-contract";
import { Avatar, AvatarFallback, Button, Icon, Text } from "@repo/ui";

export interface BlockedUsersModalProps {
  visible: boolean;
  onClose: () => void;
}

export function BlockedUsersModal({ visible, onClose }: BlockedUsersModalProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const { data: blockedList, isLoading } = useQuery({
    ...blockedUsersQuery(),
    enabled: visible,
  });

  const unblockMutation = useMutation({
    mutationFn: unblockUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["interactions", "blocked"] });
      void queryClient.invalidateQueries({ queryKey: ["discovery"] });
      void queryClient.invalidateQueries({ queryKey: ["interactions", "received"] });
    },
    onError: () => {
      Alert.alert("Lỗi", "Chưa thể bỏ chặn lúc này. Vui lòng thử lại sau.");
    },
  });

  const handleUnblock = (item: BlockedUserRead) => {
    const name = item.target?.profile?.displayName ?? "người này";
    const promptMessage = `Bạn và ${name} sẽ có thể nhìn thấy hồ sơ của nhau lại trên ứng dụng.`;

    if (Platform.OS === "web") {
      const ok =
        typeof window !== "undefined" && typeof window.confirm === "function"
          ? window.confirm(`Bỏ chặn ${name}?\n${promptMessage}`)
          : true;
      if (ok) {
        unblockMutation.mutate(item.targetId);
      }
      return;
    }

    Alert.alert(`Bỏ chặn ${name}?`, promptMessage, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Bỏ chặn",
        style: "default",
        onPress: () => unblockMutation.mutate(item.targetId),
      },
    ]);
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      return "";
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 bg-background"
        style={{
          paddingTop: Platform.select({ ios: insets.top, default: 16 }),
          paddingBottom: insets.bottom,
        }}
      >
        {/* Header */}
        <View className="h-14 w-full flex-row items-center justify-between border-b border-border/40 px-5">
          <View className="flex-row items-center gap-2.5">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
              <Icon as={UserX} size={18} className="text-destructive" />
            </View>
            <Text className="text-lg font-bold text-foreground">Danh sách đã chặn</Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={8}
            className="h-8 w-8 items-center justify-center rounded-full bg-secondary active:opacity-70"
          >
            <Icon as={X} size={18} className="text-muted-foreground" />
          </Pressable>
        </View>

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
          </View>
        ) : !blockedList || blockedList.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-4 px-8">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-secondary/80">
              <Icon as={ShieldAlert} size={38} className="text-muted-foreground" />
            </View>
            <Text className="text-lg font-bold text-foreground">Chưa chặn ai</Text>
            <Text className="text-center text-sm leading-relaxed text-muted-foreground">
              Khi bạn chặn một người dùng, họ sẽ xuất hiện tại đây. Bạn có thể mở chặn lại
              bất cứ khi nào bạn muốn.
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-5"
            contentContainerClassName="py-4 gap-3"
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-1 rounded-xl bg-secondary/50 p-3">
              <Text className="text-xs text-muted-foreground">
                🛡️ Người bị chặn sẽ không thể xem hồ sơ, gửi tương tác hoặc nhắn tin với
                bạn. Bấm &quot;Bỏ chặn&quot; để cho phép kết nối lại.
              </Text>
            </View>

            {blockedList.map((item) => {
              const displayName =
                item.target?.profile?.displayName ?? "Người dùng ẩn danh";
              const age = item.target?.profile?.age;
              const city = item.target?.profile?.city;
              const dateStr = formatDate(item.blockedAt);

              return (
                <View
                  key={item.interactionId}
                  className="flex-row items-center justify-between rounded-2xl border border-border/60 bg-card p-3.5 shadow-xs"
                >
                  <View className="flex-1 flex-row items-center gap-3 pr-2">
                    {/* Avatar silhouette */}
                    <Avatar
                      alt={displayName}
                      className="h-12 w-12 border border-border/50"
                    >
                      <AvatarFallback className="bg-primary/10">
                        <Text className="text-base font-bold text-primary">
                          {displayName.slice(0, 2).toUpperCase()}
                        </Text>
                      </AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <View className="flex-1">
                      <Text
                        className="text-sm font-bold text-foreground"
                        numberOfLines={1}
                      >
                        {displayName}
                      </Text>
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {[age ? `${age} tuổi` : null, city].filter(Boolean).join(" • ") ||
                          "Hồ sơ ẩn danh"}
                      </Text>
                      {dateStr ? (
                        <Text className="mt-0.5 text-[11px] text-muted-foreground/80">
                          Đã chặn ngày {dateStr}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Unblock Action */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={unblockMutation.isPending}
                    className="h-9 rounded-xl border-border/80 px-3 active:bg-secondary"
                    onPress={() => handleUnblock(item)}
                  >
                    <Text className="text-xs font-semibold text-foreground">Bỏ chặn</Text>
                  </Button>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
