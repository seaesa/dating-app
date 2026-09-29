import { View } from "react-native";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Text } from "./ui/text";

export interface ProfileCardProps {
  nickname: string;
  age: number;
  city: string;
  bio: string;
  interests: string[];
  avatarUrl?: string | null;
}

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
  bio,
  interests,
  avatarUrl,
}: ProfileCardProps) {
  return (
    <Card className="w-full">
      <CardContent className="gap-4 p-4">
        <View className="flex-row items-center gap-3">
          <Avatar alt={`${nickname}'s avatar`} className="h-16 w-16">
            {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
            <AvatarFallback>
              <Text>{nickname.slice(0, 2).toUpperCase()}</Text>
            </AvatarFallback>
          </Avatar>
          <View className="flex-1">
            <Text className="text-xl font-semibold text-foreground">{nickname}</Text>
            <Text className="text-sm text-muted-foreground">
              {age} · {city}
            </Text>
          </View>
        </View>

        {bio ? <Text className="text-base text-foreground">{bio}</Text> : null}

        {interests.length > 0 ? (
          <View className="flex-row flex-wrap gap-2">
            {interests.map((interest) => (
              <Badge key={interest} variant="secondary">
                <Text>{interest}</Text>
              </Badge>
            ))}
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}
