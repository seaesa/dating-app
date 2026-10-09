import * as React from "react";
import { View } from "react-native";

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Text } from "./ui/text";

export interface ProfileCardInterest {
  key: string;
  label: string;
  icon?: string | null;
}

export interface ProfileCardProps {
  nickname: string;
  age: number;
  city: string;
  gender?: "male" | "female" | "other" | null;
  bio?: string | null;
  interests?: Array<string | ProfileCardInterest>;
  avatarUrl?: string | null;
}

const GENDER_CONFIG = {
  male: { label: "Nam", symbol: "♂" },
  female: { label: "Nữ", symbol: "♀" },
  other: { label: "Khác", symbol: "⚥" },
};

export const DEFAULT_INTEREST_LABELS: Record<string, { label: string; icon?: string }> = {
  cafe: { label: "Cà phê", icon: "☕" },
  milk_tea: { label: "Trà sữa", icon: "🧋" },
  street_food: { label: "Ẩm thực đường phố", icon: "🍢" },
  cooking: { label: "Nấu ăn", icon: "🍳" },
  baking: { label: "Làm bánh", icon: "🧁" },
  bbq: { label: "Đồ nướng", icon: "🥩" },
  spicy: { label: "Ăn cay", icon: "🌶️" },
  wine: { label: "Rượu vang", icon: "🍷" },
  craft_beer: { label: "Bia thủ công", icon: "🍺" },
  brunch: { label: "Brunch", icon: "🥞" },
  backpacking: { label: "Du lịch bụi", icon: "🎒" },
  beach: { label: "Biển", icon: "🏖️" },
  trekking: { label: "Trekking", icon: "🥾" },
  camping: { label: "Cắm trại", icon: "⛺" },
  road_trip: { label: "Phượt", icon: "🏍️" },
  city_break: { label: "Khám phá thành phố", icon: "🏙️" },
  photography: { label: "Nhiếp ảnh", icon: "📷" },
  resort: { label: "Nghỉ dưỡng", icon: "🏝️" },
  abroad: { label: "Du lịch nước ngoài", icon: "🌍" },
  local_culture: { label: "Văn hóa địa phương", icon: "🏯" },
  pop: { label: "Nhạc pop", icon: "🎤" },
  indie: { label: "Indie", icon: "🎧" },
  rock: { label: "Rock", icon: "🎸" },
  edm: { label: "EDM", icon: "🎛️" },
  kpop: { label: "K-pop", icon: "💜" },
  guitar: { label: "Guitar", icon: "🎸" },
  singing: { label: "Ca hát", icon: "🎙️" },
  painting: { label: "Vẽ", icon: "🎨" },
  museum: { label: "Bảo tàng & triển lãm", icon: "🖼️" },
  theatre: { label: "Sân khấu", icon: "🎭" },
  gym: { label: "Gym", icon: "🏋️" },
  yoga: { label: "Yoga", icon: "🧘" },
  running: { label: "Chạy bộ", icon: "🏃" },
  swimming: { label: "Bơi lội", icon: "🏊" },
  cycling: { label: "Đạp xe", icon: "🚴" },
  badminton: { label: "Cầu lông", icon: "🏸" },
  football: { label: "Bóng đá", icon: "⚽" },
  tennis: { label: "Tennis", icon: "🎾" },
  golf: { label: "Golf", icon: "⛳" },
  martial_arts: { label: "Võ thuật", icon: "🥋" },
  movies: { label: "Phim ảnh", icon: "🎬" },
  books: { label: "Đọc sách", icon: "📚" },
  gaming: { label: "Chơi game", icon: "🎮" },
  anime: { label: "Anime", icon: "🍥" },
  comics: { label: "Truyện tranh", icon: "📖" },
  karaoke: { label: "Karaoke", icon: "🎤" },
  board_games: { label: "Board game", icon: "🎲" },
  podcast: { label: "Podcast", icon: "🎧" },
  standup: { label: "Hài độc thoại", icon: "😂" },
  series: { label: "Phim bộ", icon: "📺" },
  pet_lover: { label: "Yêu thú cưng", icon: "🐾" },
  gardening: { label: "Làm vườn", icon: "🌱" },
  fashion: { label: "Thời trang", icon: "👗" },
  diy: { label: "Thủ công", icon: "🧵" },
  volunteering: { label: "Tình nguyện", icon: "🤝" },
  investing: { label: "Đầu tư", icon: "📈" },
  learn_language: { label: "Học ngoại ngữ", icon: "🗣️" },
  tech: { label: "Công nghệ", icon: "💻" },
  startup: { label: "Khởi nghiệp", icon: "🚀" },
  meditation: { label: "Thiền", icon: "🕯️" },
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
              {interests.map((interest) => {
                const isObj = typeof interest === "object" && interest !== null;
                const key = isObj ? interest.key : interest;
                const fallback = DEFAULT_INTEREST_LABELS[key];
                const label = isObj
                  ? interest.label
                  : (fallback?.label ?? key.replace(/_/g, " "));
                const icon = isObj ? (interest.icon ?? fallback?.icon) : fallback?.icon;

                return (
                  <Badge
                    key={key}
                    variant="secondary"
                    className="flex-row items-center gap-1.5 rounded-xl border border-border/60 bg-secondary px-3 py-1"
                  >
                    {icon ? <Text className="text-xs">{icon}</Text> : null}
                    <Text className="text-xs font-medium text-secondary-foreground">
                      {label}
                    </Text>
                  </Badge>
                );
              })}
            </View>
          </View>
        ) : null}
      </CardContent>
    </Card>
  );
}
