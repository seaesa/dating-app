/** What to tell the user after a failed face check, keyed by the API's reason. */
const REASONS: Record<string, string> = {
  spoof:
    "Có vẻ đây không phải khuôn mặt thật trước camera. Hãy chụp trực tiếp, không dùng ảnh hay màn hình.",
  no_face: "Không thấy rõ khuôn mặt. Hãy chụp ở nơi đủ sáng và giữ mặt trong khung.",
  face_count: "Trong khung có nhiều hơn một người. Hãy chụp một mình.",
  no_landmarks: "Không thấy rõ khuôn mặt. Hãy chụp ở nơi đủ sáng và giữ mặt trong khung.",
  wrong_pose: "Chưa đúng tư thế. Hãy làm theo hướng dẫn và giữ yên một chút.",
  mismatch:
    "Khuôn mặt chưa khớp với ảnh chính. Ảnh chính cần là ảnh rõ mặt của chính bạn.",
  inconsistent:
    "Khuôn mặt chưa khớp với ảnh chính. Ảnh chính cần là ảnh rõ mặt của chính bạn.",
  reference_no_face: "Ảnh chính của bạn chưa thấy rõ mặt. Hãy đổi ảnh chính rồi thử lại.",
};

export function failureMessage(reason: string | null | undefined): string {
  return (reason && REASONS[reason]) || "Có lỗi khi xử lý. Bạn thử lại nhé.";
}
