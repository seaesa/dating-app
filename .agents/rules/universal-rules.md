# Universal Rules (TIER 0) — Terdin Date

> Quy tắc phổ quát luôn kích hoạt cho mọi request trong dự án Terdin Date.

---

## 1. Rule Zero — Private Identity Protection

Tôn chỉ cao nhất của ứng dụng: `PrivateIdentity` (tên thật, ảnh thật, socials, vị trí chính xác) và số điện thoại không bao giờ được gửi cho bất kỳ ai ngoài chính chủ cho đến khi có Mutual Reveal. Mọi phản hồi API chứa user phải đi qua `project_user()`.

---

## 2. Ngôn Ngữ Giao Tiếp

1. **Phản hồi bằng ngôn ngữ của người dùng (Tiếng Việt).**
2. **Code, tên biến, comment và commit message viết bằng Tiếng Anh chuẩn.**
3. **Copy giao diện (UI text) hiển thị cho người dùng là Tiếng Việt.**

---

## 3. Clean Code & Chất Lượng Mã Nguồn

- **Surgical Changes:** Chỉ sửa đúng những dòng code cần thiết để giải quyết vấn đề. Không tự ý refactor các file không liên quan.
- **Simplicity First:** Ưu tiên giải pháp ngắn gọn, trực diện, không tạo abstraction thừa thãi.
- **No Tests:** Không tự ý thêm file test, test runner hay test dependency. Kiểm tra độ tin cậy bằng: `pnpm lint`, `pnpm typecheck`, `pnpm contract`, và chạy ứng dụng thực tế.
- **No Hardcoded Secrets:** Tuyệt đối không hardcode bí mật, API key, token trong code. Sử dụng `.env`.
