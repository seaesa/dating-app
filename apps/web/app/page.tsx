"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { View } from "react-native";

import { Skeleton } from "@repo/ui";

import { useRedirectWhenSignedIn } from "./session-gate";

export default function RootPage() {
  // A marketing landing page belongs here eventually. Until then the root only
  // routes — on the client, because where a visitor belongs depends on a refresh
  // token in localStorage. A server-side redirect could not read it, so it sent
  // a signed-in user back to the login form on every visit.
  const router = useRouter();
  const { hydrated, signedIn } = useRedirectWhenSignedIn();

  React.useEffect(() => {
    if (hydrated && !signedIn) router.replace("/login");
  }, [hydrated, signedIn, router]);

  return (
    <View className="mx-auto w-full max-w-sm flex-1 justify-center gap-4 p-6">
      <Skeleton className="h-8 w-32 rounded-md" />
      <Skeleton className="h-12 w-full rounded-md" />
    </View>
  );
}
