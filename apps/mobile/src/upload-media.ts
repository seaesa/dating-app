import * as FileSystem from "expo-file-system/legacy";

import { confirmUpload, createUploadUrl } from "@repo/api-contract";

/** Upload a local file through the presigned flow and return its media id. */
export async function uploadLocalFile(
  uri: string,
  contentType: string,
  kind: "public" | "private",
): Promise<string> {
  const info = await FileSystem.getInfoAsync(uri);
  const size =
    info.exists && typeof info.size === "number" && info.size > 0 ? info.size : 1;

  const target = await createUploadUrl({ kind, contentType, size });
  const response = await FileSystem.uploadAsync(target.uploadUrl, uri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": contentType },
  });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Tải ảnh lên thất bại (mã lỗi ${response.status})`);
  }
  await confirmUpload(target.mediaId);
  return target.mediaId;
}
