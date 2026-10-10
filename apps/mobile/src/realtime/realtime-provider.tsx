import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { AppState } from "react-native";

import { getMe, http, meQuery } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";

import { dispatch } from "./bus";
import { RealtimeSocket, socketUrl } from "./socket";

/**
 * Keeps one socket open while signed in and in the foreground. In the
 * background the socket closes and push takes over. It only transports:
 * features handle their own events through `useRealtimeEvent`.
 */
export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  // Signed in or not, not the token itself: the refresh token rotates on the
  // first API call after a cold start, which would reopen the socket.
  const signedIn = useAuthStore((s) => s.refreshToken !== null);

  React.useEffect(() => {
    if (!signedIn) return;
    const socket = new RealtimeSocket({
      url: socketUrl(http.defaults.baseURL ?? ""),
      // After a cold start only the refresh token is in memory; any API call
      // refreshes the access token through the axios interceptor.
      getToken: async () => {
        await queryClient.ensureQueryData(meQuery());
        if (!useAuthStore.getState().accessToken) await getMe();
        return useAuthStore.getState().accessToken;
      },
      onEvent: dispatch,
      // Whatever happened while disconnected: refetch what is on screen.
      onOpen: () => void queryClient.invalidateQueries({ queryKey: ["connections"] }),
      onAuthExpired: async () => {
        await getMe();
      },
    });
    if (AppState.currentState === "active") socket.start();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") socket.start();
      else if (state === "background") socket.stop();
    });
    return () => {
      subscription.remove();
      socket.stop();
    };
  }, [signedIn, queryClient]);

  return <>{children}</>;
}
