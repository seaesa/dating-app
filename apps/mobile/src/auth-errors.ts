import type { ApiError } from "@repo/api-contract";

const NETWORK = "Không kết nối được. Kiểm tra mạng rồi thử lại.";

const asApiError = (error: unknown) => error as ApiError | null;

/** Each message says what to do next, not just that something failed. */
export function requestCodeError(error: unknown): string {
  const response = asApiError(error)?.response;
  if (!response) return NETWORK;
  if (response.status === 429) {
    const seconds = Number(response.headers["retry-after"]) || 600;
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Bạn đã yêu cầu mã quá nhiều lần. Thử lại sau ${minutes} phút.`;
  }
  if (response.status === 422) return "Số điện thoại không hợp lệ.";
  return "Chưa gửi được mã. Thử lại sau ít phút.";
}

export type CodeErrorKind = "retype" | "resend" | "other";

export function verifyCodeError(error: unknown): {
  message: string;
  kind: CodeErrorKind;
} {
  const response = asApiError(error)?.response;
  if (!response) return { message: NETWORK, kind: "other" };
  switch (response.data?.type) {
    case "/errors/otp-invalid":
      return { message: "Mã chưa đúng. Kiểm tra tin nhắn và nhập lại.", kind: "retype" };
    case "/errors/otp-expired":
      return { message: "Mã đã hết hạn. Gửi lại để nhận mã mới.", kind: "resend" };
    case "/errors/otp-locked":
      return {
        message: "Bạn đã nhập sai nhiều lần. Gửi lại để nhận mã mới.",
        kind: "resend",
      };
    default:
      return { message: "Chưa xác nhận được. Thử lại sau ít phút.", kind: "other" };
  }
}
