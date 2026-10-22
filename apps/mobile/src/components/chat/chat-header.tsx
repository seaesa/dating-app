import ArrowLeft from "lucide-react-native/icons/arrow-left";
import Ellipsis from "lucide-react-native/icons/ellipsis";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import * as React from "react";
import { Pressable, View } from "react-native";

import type { UserRead } from "@repo/api-contract";
import { Icon, Text } from "@repo/ui";

import { PeerAvatar } from "./peer-avatar";
import { VerifiedName } from "./verified-name";

const GENDER = { male: "Nam", female: "Nữ", other: "Khác" } as const;

export interface ChatHeaderProps {
  peer: UserRead;
  /** A request is waiting on me: the privacy button carries a dot. */
  pendingRequest: boolean;
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenPrivacy: () => void;
  onOpenMenu: () => void;
}

export function ChatHeader({
  peer,
  pendingRequest,
  onBack,
  onOpenProfile,
  onOpenPrivacy,
  onOpenMenu,
}: ChatHeaderProps) {
  const { profile, identity } = peer;
  const isRevealed = Boolean(identity?.photoUrls && identity.photoUrls.length > 0);
  const anonymousName = `${GENDER[profile.gender ?? "other"]}, ${profile.age ?? ""} tuổi`;
  const headerTitle = isRevealed ? profile.displayName : anonymousName;

  return (
    <View className="h-16 flex-row items-center gap-1 border-b border-border/40 px-2">
      <Pressable
        onPress={onBack}
        accessibilityLabel="Quay lại"
        hitSlop={8}
        className="h-11 w-11 items-center justify-center"
      >
        <Icon as={ArrowLeft} size={22} />
      </Pressable>
      <Pressable
        onPress={onOpenProfile}
        accessibilityLabel={`Xem hồ sơ của ${headerTitle}`}
        className="flex-1 flex-row items-center gap-3"
      >
        <PeerAvatar
          photoUrl={identity?.photoUrls?.[0]}
          gender={profile.gender}
          size={40}
        />
        <View className="flex-1">
          {isRevealed ? (
            <VerifiedName
              name={profile.displayName}
              age={profile.age}
              verified={profile.verified}
              isVip={profile.isVip}
              vipPlan={profile.vipPlan}
              className="text-base"
            />
          ) : (
            <Text className="text-base font-bold text-foreground" numberOfLines={1}>
              {anonymousName}
            </Text>
          )}
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {profile.city || "Việt Nam"}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={onOpenPrivacy}
        accessibilityLabel="Ảnh và thông tin cá nhân"
        hitSlop={8}
        className="h-11 w-11 items-center justify-center"
      >
        <Icon as={ShieldCheck} size={22} />
        {pendingRequest ? (
          <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-primary" />
        ) : null}
      </Pressable>
      <Pressable
        onPress={onOpenMenu}
        accessibilityLabel="Tùy chọn"
        hitSlop={8}
        className="h-11 w-11 items-center justify-center"
      >
        <Icon as={Ellipsis} size={22} />
      </Pressable>
    </View>
  );
}
