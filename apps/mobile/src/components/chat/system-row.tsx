import * as React from "react";
import { View } from "react-native";

import { Text } from "@repo/ui";

import type { ChatMessage } from "@/chat/messages";
import { systemText } from "@/chat/system-copy";

export interface SystemRowProps {
  message: ChatMessage;
  myId: string;
  peerName: string;
}

export function SystemRow({ message, myId, peerName }: SystemRowProps) {
  return (
    <View className="my-2 items-center px-6">
      <Text className="text-center text-xs text-muted-foreground">
        {systemText(message, myId, peerName)}
      </Text>
    </View>
  );
}
