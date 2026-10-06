import * as ImagePicker from "expo-image-picker";

import { updateMyIdentity } from "@repo/api-contract";

import { uploadLocalFile } from "@/upload-media";

/**
 * Open the system photo picker and upload the choice as a private photo.
 * Returns the new media id, or null when the user cancels. The system picker
 * needs no library permission, so none is asked for.
 */
export async function pickAndUploadPhoto(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [3, 4],
    quality: 0.8,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;
  const type =
    asset.mimeType === "image/jpg" ? "image/jpeg" : (asset.mimeType ?? "image/jpeg");
  return uploadLocalFile(asset.uri, type, "private");
}

/** The whole ordered list replaces the old one; the first is the main photo. */
export const savePhotoOrder = (mediaIds: string[]) =>
  updateMyIdentity({ photoMediaIds: mediaIds });
