# Coding Standards & Quality Gates — Terdin Date

Quy chuẩn lập trình và kiểm soát chất lượng bắt buộc cho dự án Terdin Date.

---

## 1. Tôn Chỉ Tuyệt Đối: Rule Zero — The Private Identity

Mọi thay đổi mã nguồn phải tuyệt đối tuân thủ nguyên tắc bảo mật danh tính:

1. **Dữ liệu riêng tư (`PrivateIdentity`):** Tên thật, ảnh thật, mạng xã hội, vị trí chính xác và số điện thoại TUYỆT ĐỐI KHÔNG được gửi cho bất kỳ ai ngoài chính chủ, cho đến khi có Mutual Reveal (cả hai bên cùng đồng ý mở danh tính).
2. **Backend Gate:** Mọi response API chứa thông tin người dùng BẮT BUỘC phải qua `project_user()` (`apps/api/src/app/modules/users/visibility.py`). CẤM TUYỆT ĐỐI serialize trực tiếp model `User`.
3. **Frontend Gate:** Chỉ màn hình Profile của chính chủ mới đọc trường `identity`. Mọi màn hình công khai khác chỉ render `profile`.
4. **Cache Invalidation:** Xóa toàn bộ TanStack Query cache khi session thay đổi (`onSessionChange` trong `@repo/store`).

---

## 2. Quality Gates (Tiêu chí Chất lượng)

Dự án **KHÔNG DÙNG TEST TỰ ĐỘNG** (_"No tests. Do not add test files, test runners or test dependencies"_). Mọi mã nguồn trước khi commit/merge phải thỏa mãn các tiêu chí sau:

1. **Linting & Formatting:**
   - 0 lỗi/cảnh báo linter nghiêm trọng: `pnpm lint` (ESLint 9 + Ruff).
   - Định dạng code chuẩn qua Prettier và Ruff: `pnpm format`.
2. **Type Checking:**
   - Typecheck 100% qua TypeScript và Mypy: `pnpm typecheck`.
   - Không lạm dụng `any`, khai báo types tường minh.
3. **API Contract Verification:**
   - Khi sửa schema/endpoint tại `apps/api/src/app/modules/<domain>/`: BẮT BUỘC chạy `pnpm contract` để tái sinh types.
   - Thêm/cập nhật hàm gọi API trong `packages/api-contract/src/api.ts`.
   - CẤM sửa thủ công trong `packages/api-contract/src/generated/`.
4. **App Build & Bundling Verification:**
   - Web: `pnpm --filter=web build` thành công.
   - Mobile: `pnpm --filter=mobile typecheck` và `pnpm exec expo export --platform all` không lỗi cú pháp Metro.

---

## 3. Quy tắc Viết Mã nguồn (Clean Code Principles)

- **Surgical Changes:** Chỉ sửa những phần liên quan trực tiếp tới yêu cầu. Không tự ý refactor code ngoài phạm vi.
- **Simplicity First:** Viết code tối giản giải quyết vấn đề, không over-engineer hay tự tạo abstraction cho mục đích sử dụng 1 lần.
- **No Hardcoded Secrets:** Cấm lưu giữ API key, secret, password trong mã nguồn. Dùng biến môi trường (Environment Variables).
- **No Bare Axios / Fetch:** Các app client (`web`, `mobile`) tuyệt đối không dùng `fetch`/`axios` trực tiếp; gọi các hàm trong `@repo/api-contract`.
- **Styling:** Dùng NativeWind token classes (`bg-primary`, `text-foreground`). Không dùng mã màu cứng (`#fff`, `rgb()`, `hsl()`); token màu phải nằm ở `packages/tailwind-config/theme.css`.
- **Ngôn ngữ Giao diện (UI Copy):** Toàn bộ copy hiển thị trên UI là **Tiếng Việt**.

---

## 4. Ma trận Kiểm tra Quality Gates (CI / Pre-commit)

| Quality Gate           | Tiêu chí Kiểm tra                                      | Hành động khi Fail       |
| ---------------------- | ------------------------------------------------------ | ------------------------ |
| **1. Rule Zero Audit** | Kiểm tra không serialize `User`, dùng `project_user()` | Chặn commit lập tức      |
| **2. Format & Lint**   | `pnpm lint` (ESLint + Ruff)                            | Chặn commit              |
| **3. Type Check**      | `pnpm typecheck` (tsc + mypy)                          | Chặn commit              |
| **4. Contract Drift**  | Kiểm tra drift giữa API schema & `api-contract`        | Chạy lại `pnpm contract` |
| **5. Build Check**     | `pnpm --filter=web build`                              | Chặn MR                  |
