import { CameraView } from "expo-camera";
import * as React from "react";
import { Pressable, View } from "react-native";

import { Text } from "@repo/ui";

export type CaptureAction = "look_straight" | "turn_left" | "turn_right";

const INSTRUCTION: Record<CaptureAction, { title: string; hint: string }> = {
  look_straight: {
    title: "Nhìn thẳng vào camera",
    hint: "Giữ mặt trong khung rồi bấm chụp",
  },
  turn_left: {
    title: "Quay đầu sang trái",
    hint: "Quay rõ một góc, giữ yên rồi bấm chụp",
  },
  turn_right: {
    title: "Quay đầu sang phải",
    hint: "Quay rõ một góc, giữ yên rồi bấm chụp",
  },
};

export interface FaceCaptureProps {
  actions: CaptureAction[];
  onDone: (fileUris: string[]) => void;
  onError: () => void;
}

/**
 * One shot per pose, taken by the user. The server checks each pose, so a
 * wrong one comes back as a clear "chưa đúng tư thế" rather than a guess here.
 * Automatic capture is planned once a face detector that builds for the iOS
 * Simulator is in place.
 */
export function FaceCapture({ actions, onDone, onError }: FaceCaptureProps) {
  const camera = React.useRef<CameraView>(null);
  const [shots, setShots] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const action = actions[shots.length];

  async function capture() {
    if (!camera.current || busy || !action) return;
    setBusy(true);
    try {
      // JPEG at modest quality: the server cannot decode HEIC, and a face
      // needs no more detail than this.
      const photo = await camera.current.takePictureAsync({
        quality: 0.7,
        imageType: "jpg",
      });
      const next = [...shots, photo.uri];
      setShots(next);
      if (next.length === actions.length) onDone(next);
    } catch {
      onError();
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 gap-5">
      <View className="flex-1 overflow-hidden rounded-3xl bg-secondary">
        <CameraView ref={camera} style={{ flex: 1 }} facing="front" />
        <View
          pointerEvents="none"
          className="absolute inset-0 items-center justify-center"
        >
          <View
            className="border-4 border-primary"
            style={{ width: 240, height: 320, borderRadius: 160 }}
          />
        </View>
      </View>

      <View className="items-center gap-2">
        <Text className="text-center text-2xl font-black text-foreground">
          {action ? INSTRUCTION[action].title : "Đang gửi..."}
        </Text>
        <Text className="text-center text-sm text-muted-foreground">
          {action ? INSTRUCTION[action].hint : "Vui lòng đợi"}
        </Text>
        <View className="flex-row gap-1.5 pt-1">
          {actions.map((a, i) => (
            <View
              key={a}
              className={
                i < shots.length
                  ? "h-2 w-8 rounded-full bg-success"
                  : i === shots.length
                    ? "h-2 w-8 rounded-full bg-primary"
                    : "h-2 w-8 rounded-full bg-border"
              }
            />
          ))}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Chụp"
        disabled={!action || busy}
        onPress={() => void capture()}
        className="h-20 w-20 items-center justify-center self-center rounded-full border-4 border-primary active:opacity-80"
      >
        <View
          className={
            busy
              ? "h-14 w-14 rounded-full bg-primary/50"
              : "h-14 w-14 rounded-full bg-primary"
          }
        />
      </Pressable>
    </View>
  );
}
