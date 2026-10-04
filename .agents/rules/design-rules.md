---
trigger: glob
globs: "**/*.{tsx,jsx,css},**/packages/ui/**,**/apps/web/**,**/apps/mobile/**"
---

# Design & UI Rules — Terdin Date

> Quy chuẩn thiết kế giao diện đa nền tảng (Web & Mobile Expo) cho Terdin Date.

---

## 🎨 1. Nguồn Chân Lý Của Design Tokens (Single Source of Truth)

Toàn bộ màu sắc, typography, spacing và radius đã được định nghĩa tại:
👉 `packages/tailwind-config/theme.css`

1. **Tuyệt đối không dùng mã màu cứng:** Cấm `#fff`, `#000`, `rgb()`, `hsl()`. Luôn dùng NativeWind token classes:
   - Nền: `bg-background`, `bg-card`, `bg-primary`, `bg-muted`
   - Chữ: `text-foreground`, `text-muted-foreground`, `text-primary-foreground`
   - Viền: `border-border`, `border-input`
   - Trạng thái: `text-destructive`, `bg-destructive`
2. **Nếu cần thêm màu mới:** Thêm token biến CSS vào `packages/tailwind-config/theme.css`, không khai báo tùy tiện trong component.

---

## 📱 2. Kiến Trúc `@repo/ui` Cross-Platform

1. **Props Only:** Component trong `@repo/ui` chỉ nhận plain props (`nickname`, `avatarUrl`, `onPress`), TUYỆT ĐỐI KHÔNG import `@repo/api-contract` hay `@repo/store`.
2. **React Native Primitives:** Dùng `View`, `Text`, `Pressable` thay vì thẻ HTML (`div`, `span`, `button`) để đảm bảo cả Web (qua `react-native-web`) và Mobile (Native) đều render được.
3. **`asChild` Slot:** Bắt buộc import `Slot` từ `../../lib/slot`, CẤM dùng `@rn-primitives/slot` (gây lỗi webpack trên Next.js).
4. **Copy Tiếng Việt:** Toàn bộ text mặc định trong UI component phải là **Tiếng Việt**.

---

## ✨ 3. Thẩm Mỹ & Trải Nghiệm Ứng Dụng Hẹn Hò

1. **Trải nghiệm riêng tư:** Tôn vinh tính ẩn danh — avatar mờ/placeholder phong cách cho đến khi Mutual Reveal.
2. **Micro-interactions:** Hiệu ứng hover (trên Web) và active opacity / haptics (trên Mobile) tinh tế, mượt mà.
3. **Responsive Web:** Chiều rộng chuẩn của cột trang trên Web: `mx-auto w-full max-w-lg`.
