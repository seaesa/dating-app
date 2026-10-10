import Lightbulb from "lucide-react-native/icons/lightbulb";
import * as React from "react";
import { Pressable, View } from "react-native";

import type { ProfileOptionsRead, PublicProfileRead } from "@repo/api-contract";
import { Icon, Text } from "@repo/ui";

import { interestEntry } from "@/chat/catalog";
import { icebreakers, sharedInterests } from "@/chat/icebreakers";

export interface IntroCardProps {
  peer: PublicProfileRead;
  me?: PublicProfileRead;
  catalog: ProfileOptionsRead | undefined;
  showIcebreakers: boolean;
  onPick: (text: string) => void;
}

/**
 * Something to talk about: shared interests, and openers while the room is
 * empty. Who the person is already sits in the header, so it is not repeated.
 */
export function IntroCard({
  peer,
  me,
  catalog,
  showIcebreakers,
  onPick,
}: IntroCardProps) {
  const shared = sharedInterests(peer.interests, me?.interests);
  if (shared.length === 0 && !showIcebreakers) return null;
  return (
    <View className="gap-3 px-4 pb-2 pt-4">
      {shared.length > 0 ? (
        <Text className="text-sm text-muted-foreground">
          Sở thích chung:{" "}
          {shared.map((key) => interestEntry(catalog, key).label).join(" · ")}
        </Text>
      ) : null}
      {showIcebreakers ? (
        <View className="gap-2">
          <View className="flex-row items-center gap-1">
            <Icon as={Lightbulb} size={14} className="text-muted-foreground" />
            <Text className="text-xs font-semibold text-muted-foreground">
              Gợi ý mở đầu
            </Text>
          </View>
          {icebreakers(peer, me, catalog).map((text) => (
            <Pressable
              key={text}
              onPress={() => onPick(text)}
              className="rounded-2xl border border-border px-3 py-2 active:bg-secondary"
            >
              <Text className="text-sm text-foreground">{text}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
