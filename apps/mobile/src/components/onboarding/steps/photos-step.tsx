import * as React from "react";

import { mainPhotoError, MIN_PHOTOS } from "@repo/api-contract";

import { useOnboarding } from "../context";
import { StepLayout } from "../step-layout";

import { PhotoGrid } from "@/components/photo-grid";
import { pickAndUploadPhoto, savePhotoOrder } from "@/photos";

export function PhotosStep() {
  const { me, accept, next } = useOnboarding();
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const photos = me.account?.photos ?? [];
  const ids = photos.map((p) => p.mediaId);

  async function add() {
    setUploading(true);
    setError(null);
    try {
      const mediaId = await pickAndUploadPhoto();
      if (mediaId) accept(await savePhotoOrder([...ids, mediaId]));
    } catch (e) {
      setError(mainPhotoError(e) ?? "Không tải được ảnh lên. Thử lại nhé.");
    } finally {
      setUploading(false);
    }
  }

  async function remove(mediaId: string) {
    setError(null);
    try {
      accept(await savePhotoOrder(ids.filter((id) => id !== mediaId)));
    } catch (e) {
      // Removing the main photo makes the next one main, which may not pass.
      setError(mainPhotoError(e) ?? "Không xóa được ảnh. Thử lại nhé.");
    }
  }

  return (
    <StepLayout
      title="Thêm ảnh của bạn"
      subtitle={`Ít nhất ${MIN_PHOTOS} ảnh. Ảnh đầu tiên là ảnh chính, cần thấy rõ mặt bạn.`}
      canContinue={photos.length >= MIN_PHOTOS && !uploading}
      onContinue={next}
      error={error}
    >
      <PhotoGrid
        photos={photos.map((p) => ({ key: p.mediaId, uri: p.url }))}
        uploading={uploading}
        onAdd={() => void add()}
        onRemove={(mediaId) => void remove(mediaId)}
      />
    </StepLayout>
  );
}
