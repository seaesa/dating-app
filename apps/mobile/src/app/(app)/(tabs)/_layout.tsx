import { useQuery } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import * as React from "react";
import { Platform } from "react-native";

import { unreadCountQuery } from "@repo/api-contract";

import { ChatIcon, HomeIcon, MatchesIcon, ProfileIcon } from "@/components/tab-icons";

export default function TabsLayout() {
  const { data: unread } = useQuery(unreadCountQuery());
  const badge = unread?.count ? (unread.count > 99 ? "99+" : unread.count) : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FF6F61",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "rgba(0, 0, 0, 0.06)",
          borderTopWidth: 1,
          height: Platform.select({ ios: 84, default: 64 }),
          paddingBottom: Platform.select({ ios: 24, default: 8 }),
          paddingTop: 6,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.04,
          shadowRadius: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color }) => <HomeIcon color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Ghép đôi",
          tabBarIcon: ({ color }) => <MatchesIcon color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarBadge: badge,
          // The badge sits in the 24dp icon box, so Android ellipsizes "99+"
          // unless it is given its own width.
          tabBarBadgeStyle: badge === "99+" ? { width: 34 } : undefined,
          tabBarIcon: ({ color }) => <ChatIcon color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Cá nhân",
          tabBarIcon: ({ color }) => <ProfileIcon color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
