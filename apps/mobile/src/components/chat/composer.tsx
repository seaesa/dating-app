import SendHorizontal from "lucide-react-native/icons/send-horizontal";
import * as React from "react";
import { Pressable, TextInput, View } from "react-native";

import { cn, Icon, Text } from "@repo/ui";

const MAX = 1000;
const WARN_AT = 900;

export interface ComposerProps {
  value: string;
  onChange: (text: string) => void;
  onSend: () => void;
}

export function Composer({ value, onChange, onSend }: ComposerProps) {
  const input = React.useRef<TextInput>(null);
  const empty = value.trim().length === 0;
  const send = () => {
    onSend();
    // Clear the native field too: on iOS a pending autocorrection is applied
    // after the state reset and would put the sent text straight back.
    input.current?.clear();
  };
  return (
    <View className="flex-row items-end gap-2 border-t border-border/40 bg-background px-3 py-2">
      <View className="flex-1 rounded-3xl bg-secondary px-4 py-2">
        <TextInput
          ref={input}
          value={value}
          onChangeText={onChange}
          placeholder="Nhập tin nhắn..."
          multiline
          maxLength={MAX}
          className="max-h-28 text-base text-foreground placeholder:text-muted-foreground"
          accessibilityLabel="Nội dung tin nhắn"
        />
        {value.length > WARN_AT ? (
          <Text className="self-end text-xs text-muted-foreground">
            {value.length}/{MAX}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={send}
        disabled={empty}
        accessibilityLabel="Gửi"
        className={cn(
          "h-11 w-11 items-center justify-center rounded-full bg-primary",
          empty && "opacity-40",
        )}
      >
        <Icon as={SendHorizontal} size={20} className="text-primary-foreground" />
      </Pressable>
    </View>
  );
}
