# Persistent Project Memory — Terdin Date

Bản lưu trữ tri thức dự án và các quy chuẩn kỹ thuật bất biến của Terdin Date.

---

## 1. Bản Đồ Monorepo & Kiến Trúc Dự Án

- **Cấu trúc Monorepo:** Quản lý bằng `pnpm` workspaces (v12) và `Turborepo`.
- **Apps:**
  - `apps/api`: Python 3.13, FastAPI trên `uv`, Beanie ODM (MongoDB), Redis, S3 (SeaweedFS/MinIO).
  - `apps/web`: Next.js 16 App Router, `react-native-web`, NativeWind 4, Webpack (`--webpack`).
  - `apps/mobile`: Expo SDK 57, React Native 0.86 (New Architecture), `expo-router`, NativeWind 4.
- **Packages:**
  - `@repo/ui`: Thư viện component React Native dùng chung cho Web và Mobile. Props-only.
  - `@repo/api-contract`: Generated TypeScript types từ OpenAPI + Axios API client.
  - `@repo/store`: Zustand session store + `expo-secure-store` (mobile) / `localStorage` (web).
  - `@repo/core`: Tiện ích TypeScript thuần túy (e164 phone formatting, age, env).
  - `@repo/tailwind-config`: Nơi duy nhất chứa design tokens (`theme.css`).

---

## 2. Tôn Chỉ Sinh Tử: Rule Zero (Private Identity)

- **Nguyên tắc:** Dữ liệu danh tính thực (`PrivateIdentity`: tên thật, ảnh thật, socials, vị trí GPS chính xác, số điện thoại) của người dùng **TUYỆT ĐỐI KHÔNG** được tiết lộ cho bất kỳ ai cho đến khi có Mutual Reveal (cả hai bên cùng đồng ý mở danh tính).
- **Backend Gate:** Mọi response API chứa user BẮT BUỘC phải qua `project_user()` (`apps/api/src/app/modules/users/visibility.py`). Cấm serialize trực tiếp model `User`.
- **Frontend Gate:** Chỉ màn hình Profile của chính chủ mới đọc `identity`. Mọi màn hình khác chỉ đọc `profile`.
- **Cache Policy:** Xóa sạch TanStack Query cache khi đổi session (`onSessionChange` trong `@repo/store`).

---

## 3. Môi Trường & Ports Kết Nối

| Dịch vụ                 | Port    | Host Binding      | Ghi chú                                                               |
| ----------------------- | ------- | ----------------- | --------------------------------------------------------------------- |
| **FastAPI Backend**     | `8000`  | `0.0.0.0`         | Swagger UI tại `/docs`. Cần `0.0.0.0` để điện thoại truy cập qua LAN. |
| **Next.js Web**         | `3000`  | `localhost`       | Chạy dev với cờ `--webpack`.                                          |
| **Expo Metro (Mobile)** | `8081`  | `localhost` / LAN | App di động dùng biến `EXPO_PUBLIC_API_URL=http://<LAN_IP>:8000`.     |
| **MongoDB (Docker)**    | `27017` | `localhost`       | Chạy dưới dạng Replica set (`rs0`) để hỗ trợ Beanie/Transactions.     |
| **Redis (Docker)**      | `6379`  | `localhost`       | Cache, OTP TTL (5 phút), Sliding-window rate limiting.                |
| **S3 Storage (Docker)** | `8333`  | `localhost`       | SeaweedFS / MinIO lưu trữ ảnh đại diện và ảnh riêng tư.               |

---

## 4. Các Lệnh Điều Hành Chính

```bash
pnpm install                  # Cài đặt dependencies toàn bộ workspace
pnpm services:up              # Khởi động Docker containers (MongoDB replica set, Redis, S3)
pnpm dev                      # Chạy đồng thời api, web, mobile
pnpm contract                 # Tái sinh API types sau khi sửa schema backend
pnpm lint && pnpm typecheck   # Kiểm tra lint (ESLint + Ruff) và kiểu dữ liệu (tsc + mypy)
pnpm format                   # Format code bằng Prettier và Ruff
```

---

## 5. Quy Chuẩn Kỹ Thuật (Coding Conventions)

1. **Không dùng Test tự động (_No tests_):** Không thêm file `*.test.*`, test runners hay test dependencies.
2. **Quy trình sửa API:** Sửa `apps/api/src/app/modules/<domain>/` -> Chạy `pnpm contract` -> Cập nhật hàm trong `packages/api-contract/src/api.ts`. Cấm sửa file trong `src/generated/`.
3. **Thư viện Native Mobile:** Luôn cài bằng `pnpm exec expo install <pkg>`, không dùng bare `pnpm add`.
4. **Design Tokens:** Dùng NativeWind class (`bg-primary`, `text-foreground`). Không dùng mã màu cứng.
5. **Ngôn ngữ:** Giao diện Tiếng Việt; Code, comment, commit message Tiếng Anh.
