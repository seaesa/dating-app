---
trigger: model_decision
description: Apply when writing, building, refactoring, or fixing code in Terdin Date monorepo.
---

# Code Rules — Terdin Date

> Quy tắc bắt buộc khi viết hoặc sửa code trong monorepo Terdin Date.

---

## 📱 Phân Luồng Module & Agent Phụ Trách

| Khu vực tác động               | Tech Stack                                          | Agent Phụ Trách                            | Trọng tâm cần nhớ                                                                                        |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| **`apps/api/**`**              | Python 3.13, FastAPI, Beanie, Redis, S3             | `backend-specialist`                       | **Rule Zero**: `project_user()`, cấm serialize `User`. Chạy `pnpm contract` sau khi đổi schema.          |
| **`apps/web/**`**              | Next.js 16 App Router, react-native-web, NativeWind | `frontend-specialist`                      | Chạy dev/build với `--webpack`. Không Babel. Auth guard qua `useRequireSession`.                         |
| **`apps/mobile/**`**           | Expo SDK 57, RN 0.86, expo-router, NativeWind       | `mobile-developer`                         | Cài native module bằng `pnpm exec expo install`. Route `index` & initialRouteName rõ ràng.               |
| **`packages/ui/**`**           | React Native primitives shared                      | `frontend-specialist` / `mobile-developer` | Props-only. Không import api/store. NativeWind tokens. Copy tiếng Việt. `asChild` dùng `../../lib/slot`. |
| **`packages/api-contract/**`** | OpenAPI TS client & types                           | `backend-specialist` / `orchestrator`      | Hàm gọi API đặt ở `src/api.ts`. Cấm sửa thủ công `src/generated/`.                                       |

---

## 🛑 SOCRATIC GATE: Xác Định Rõ Ràng Trước Khi Code

Khi tiếp nhận yêu cầu mới:

1. **Kiểm tra Rule Zero:** Tính năng có đụng đến dữ liệu riêng tư (`PrivateIdentity`: tên thật, ảnh thật, SĐT, định vị) không? Có cơ chế Mutual Reveal bảo vệ không?
2. **Kiểm tra Tác động Giao tiếp:** Thay đổi endpoint API có làm lệch contract không? Đã lên kế hoạch chạy `pnpm contract` chưa?
3. **Không hỏi lại Tech Stack:** Stack đã cố định 100% (FastAPI + Beanie + Next.js + Expo). Chỉ hỏi về **Business Logic / User Flow / Edge-cases** nếu chưa rõ.

---

## 🏁 Workflow Triển Khai Thay Đổi

### Khi thêm/sửa Endpoint Backend:

1. Sửa code trong `apps/api/src/app/modules/<domain>/`.
2. Chạy `pnpm contract` tại root để sinh lại types.
3. Cập nhật hàm gọi API trong `packages/api-contract/src/api.ts` (và thêm hook nếu cần).
4. Xác minh không serialize `User` mà dùng `project_user()`.

### Khi thêm Giao diện (Screen/Component):

1. Xây dựng component tại `packages/ui` (Props-only, dùng token từ `theme.css`).
2. Tích hợp query hook từ `@repo/api-contract` tại route của `apps/web` hoặc `apps/mobile`.
3. Kiểm tra hiển thị responsive và copy Tiếng Việt.

---

## 🏁 Verification Gate (Kiểm Tra Trước Khi Hoàn Tất)

Không thêm test files. Xác minh bằng:

1. `pnpm lint && pnpm typecheck` (chạy qua Turborepo toàn bộ monorepo).
2. Kiểm tra schema: `pnpm contract`.
3. Build check: `pnpm --filter=web build` hoặc kiểm tra terminal dev không có lỗi cú pháp.
