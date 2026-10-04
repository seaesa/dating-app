import * as React from "react";
import { View } from "react-native";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Text } from "./ui/text";

export interface ProfileCardProps {
  nickname: string;
  age: number;
  city: string;
  gender?: "male" | "female" | "other" | null;
  bio?: string | null;
  interests?: string[];
  avatarUrl?: string | null;
}

const GENDER_CONFIG = {
  male: { label: "Nam", symbol: "♂" },
  female: { label: "Nữ", symbol: "♀" },
  other: { label: "Khác", symbol: "⚥" },
};

/**
 * The public persona.
 *
 * Takes primitives rather than a UserRead, so it stays independent of the
 * API's shape and renders from a fixture. It also means a private field cannot
 * reach this component even if the API regressed — there is nowhere to put it.
 */
export function ProfileCard({
  nickname,
  age,
  city,
  gender,
  bio,
  interests = [],
  avatarUrl,
}: ProfileCardProps) {
  const genderInfo = gender ? GENDER_CONFIG[gender] : null;

  return (
    <Card className="w-full overflow-hidden rounded-3xl border-border/60 bg-card shadow-sm shadow-black/5">
      <CardContent className="gap-4 p-5">
        <View className="flex-row items-center gap-4">
          <View className="relative">
            <View className="rounded-full border-2 border-primary/25 p-0.5">
              <Avatar alt={`${nickname}'s avatar`} className="h-20 w-20">
                {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
                <AvatarFallback className="bg-primary/10">
                  <Text className="text-xl font-bold text-primary">
                    {nickname.slice(0, 2).toUpperCase()}
                  </Text>
                </AvatarFallback>
              </Avatar>
            </View>
            {/* Active online status badge */}
            <View className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-card bg-emerald-500" />
          </View>

          <View className="flex-1 justify-center gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-2xl font-black tracking-tight text-foreground">
                {nickname}
              </Text>
              <Text className="text-sm">✨</Text>
            </View>

            {/* Badges for Gender, Age, City */}
            <View className="flex-row flex-wrap items-center gap-1.5">
              {genderInfo ? (
                <View className="flex-row items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5">
                  <Text className="text-xs font-bold text-primary">
                    {genderInfo.symbol}
                  </Text>
                  <Text className="text-xs font-bold text-primary">
                    {genderInfo.label}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row items-center rounded-full border border-border/80 bg-secondary/80 px-2.5 py-0.5">
                <Text className="text-xs font-medium text-foreground">{age} tuổi</Text>
              </View>

              <View className="flex-row items-center rounded-full border border-border/80 bg-secondary/80 px-2.5 py-0.5">
                <Text className="text-xs font-medium text-muted-foreground">
                  📍 {city}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {bio ? (
          <View className="rounded-2xl border border-border/40 bg-secondary/30 p-3.5">
            <Text className="pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Giới thiệu
            </Text>
            <Text className="text-sm leading-5 text-foreground">{bio}</Text>
          </View>
        ) : null}

        {interests.length > 0 ? (
          <View className="gap-1.5">
            <Text className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Sở thích
            </Text>
            <View className="flex-row flex-wrap gap-1.5">
              {interests.map((interest) => (
                <Badge
                  key={interest}
                  variant="secondary"
                  className="rounded-xl border border-border/60 bg-secondary px-3 py-1"
                >
                  <Text className="text-xs font-medium text-secondary-foreground">
                    {interest}
                  </Text>
                </Badge>
              ))}
            </View>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}
