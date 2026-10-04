"use client";

import { useQuery } from "@tanstack/react-query";

import { userQuery } from "@repo/api-contract";
import { ProfileCard, Skeleton, Text } from "@repo/ui";

export function PublicProfile({ userId }: { userId: string }) {
  const { data, isPending, isError } = useQuery(userQuery(userId));

  if (isPending) return <Skeleton className="h-40 w-full rounded-lg" />;
  if (isError || !data) {
    return <Text className="text-destructive">Không tìm thấy hồ sơ.</Text>;
  }

  // Only persona fields are passed. The API already withholds the private tier,
  // and passing only these means an API regression still cannot put a private
  // field on screen — there is nowhere for it to go.
  return (
    <ProfileCard
      nickname={data.profile.nickname}
      age={data.profile.age}
      city={data.profile.city}
      gender={data.profile.gender}
      bio={data.profile.bio}
      interests={data.profile.interests}
      avatarUrl={data.profile.avatarUrl}
    />
  );
}
