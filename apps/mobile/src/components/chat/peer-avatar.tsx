import { Image } from "expo-image";
import Mars from "lucide-react-native/icons/mars";
import UserRound from "lucide-react-native/icons/user-round";
import Venus from "lucide-react-native/icons/venus";
import * as React from "react";
import { View } from "react-native";

import { Icon } from "@repo/ui";

export interface PeerAvatarProps {
  photoUrl?: string | null;
  gender?: "male" | "female" | "other" | null;
  size?: number;
}

const GENDER_ICON = { male: Mars, female: Venus, other: UserRound } as const;

/** A revealed photo, or the gender the person shows publicly: never a stand-in face. */
export function PeerAvatar({ photoUrl, gender, size = 48 }: PeerAvatarProps) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={style}
        contentFit="cover"
        transition={150}
      />
    );
  }
  return (
    <View style={style} className="items-center justify-center bg-primary-muted">
      <Icon
        as={GENDER_ICON[gender ?? "other"]}
        size={size * 0.45}
        className="text-primary"
      />
    </View>
  );
}
