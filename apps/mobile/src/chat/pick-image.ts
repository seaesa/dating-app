import * as ImagePicker from "expo-image-picker";

import type { LocalImage } from "./messages";

/** Open the system photo picker for one chat image; null when cancelled. */
export async function pickChatImage(): Promise<LocalImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const contentType =
    asset.mimeType === "image/jpg" ? "image/jpeg" : (asset.mimeType ?? "image/jpeg");
  return { uri: asset.uri, contentType, width: asset.width, height: asset.height };
}
