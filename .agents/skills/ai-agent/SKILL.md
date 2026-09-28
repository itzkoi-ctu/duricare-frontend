# DuriCare Frontend — Skill 

Đây là quy ước bắt buộc cho MỌI task xây dựng frontend của dự án DuriCare.
Agent phải đọc và tuân thủ file này trước khi code bất kỳ màn hình nào.

## Stack (cố định, không đổi)
- Vite + React + TypeScript (strict mode, không dùng `any`)
- Tailwind CSS (utility classes trong JSX, không CSS file riêng)
- React Router
- Axios (KHÔNG dùng React Query/SWR)
- React Hook Form (cho mọi form nhập liệu)

## Cấu trúc thư mục (bắt buộc, mọi phase phải theo đúng)
```
src/
  api/          - 1 file .ts per resource
  types/        - interface/enum cho mọi API response
  hooks/        - custom hook chứa toàn bộ logic fetch dữ liệu
  components/   - component thuần trình bày, không gọi axios bên trong
    layout/     - Shell, Sidebar, MobileNav, ThemeToggle, ErrorBoundary
  pages/        - 1 page = 1 route
  routes/       - AppRoutes.tsx
  styles/       - index.css (chỉ chứa @tailwind + CSS variables theme)
```

---

## 1. RESPONSIVE — 3 mốc màn hình bắt buộc test, không chỉ desktop

| Mốc | Breakpoint Tailwind | Bố cục |
|---|---|---|
| Mobile | mặc định (< 640px) | 1 cột, điều hướng dạng bottom nav hoặc hamburger menu |
| Tablet | `md:` (≥ 768px) | 2 cột cho grid card |
| Desktop | `lg:` (≥ 1024px) | Sidebar cố định bên trái, nội dung nhiều cột |

**Quy tắc bắt buộc:** viết Tailwind theo **mobile-first** — class mặc định
áp dụng cho mobile, dùng tiền tố `md:`/`lg:` để mở rộng cho màn lớn hơn.
Không viết ngược lại (desktop trước rồi thu nhỏ).

Ví dụ đúng cho grid Dashboard:
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

**Verify bắt buộc mỗi phase:** chụp ảnh màn hình ở CẢ 2 kích thước —
375px (mobile, dùng DevTools responsive mode) và 1440px (desktop) — không
chỉ chụp 1 kích thước rồi coi là xong.

---

## 2. DARK / LIGHT THEME — dùng CSS variables, không hard-code màu trong component

### `src/styles/index.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-navy: #1F3864;
  --color-blue: #2E5395;
  --color-teal: #3F7D53;
  --color-amber: #B08D57;
  --color-coral: #B04A3F;
  --color-gray: #8C8C8C;
  --color-bg: #FFFFFF;
  --color-surface: #F7F9FC;
  --color-text: #1A1A1A;
  --color-border: #E2E8F0;
}

.dark {
  --color-navy: #7FA0D6;
  --color-blue: #8FB0DE;
  --color-teal: #6FBF8B;
  --color-amber: #D4B483;
  --color-coral: #E08677;
  --color-gray: #A8A8A8;
  --color-bg: #0F172A;
  --color-surface: #1E293B;
  --color-text: #E5E7EB;
  --color-border: #334155;
}
```
Màu ở dark mode được đẩy sáng hơn bản gốc (không dùng y hệt màu light mode)
để đảm bảo độ tương phản đủ đọc trên nền tối — đây là lý do có 2 bộ giá trị
riêng, không phải chỉ đổi background.

### `tailwind.config.js` — bắt buộc bật `darkMode: 'class'`
```js
export default {
  darkMode: 'class',   // KHONG dung 'media' - can nguoi dung tu chon duoc
  theme: {
    extend: {
      colors: {
        navy: 'var(--color-navy)',
        blue: 'var(--color-blue)',
        teal: 'var(--color-teal)',
        amber: 'var(--color-amber)',
        coral: 'var(--color-coral)',
        gray: 'var(--color-gray)',
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        text: 'var(--color-text)',
        border: 'var(--color-border)',
      },
    },
  },
};
```
Component dùng `bg-surface text-text border-border` v.v. — KHÔNG dùng
`bg-white` hay `text-black` hard-code, vì sẽ không đổi được khi bật dark.

### `ThemeToggle` component + persist lựa chọn
- Đọc `localStorage.getItem('theme')` lúc khởi động; nếu chưa có, dùng
  `window.matchMedia('(prefers-color-scheme: dark)')` làm mặc định.
- Toggle thêm/bớt class `dark` trên thẻ `<html>`.
- Lưu lại lựa chọn vào `localStorage` mỗi lần đổi — đây là ứng dụng thật
  chạy trên trình duyệt của người dùng, không phải artifact preview, nên
  dùng `localStorage` bình thường là đúng, không có giới hạn nào ở đây.

---

## 3. PRODUCTION READINESS

### Tách biến môi trường dev/production
```
.env.development   VITE_API_BASE_URL=http://localhost:6767/api
.env.production    VITE_API_BASE_URL=https://<domain-backend-that>/api
```
`.env.production` dùng domain backend thật (VPS) khi đã deploy — KHÔNG
dùng localhost. File `.env.production` không commit giá trị thật lên Git
nếu domain còn thay đổi; khai báo biến này trực tiếp trong Vercel Dashboard
(Project Settings → Environment Variables) là cách chuẩn khi deploy Vercel.

### Deploy lên Vercel (đã chốt dùng Vercel cho FE)
- Vercel tự nhận diện Vite, không cần `vercel.json` cho build thông thường.
- **Bắt buộc thêm** `vercel.json` cho SPA routing (nếu không, F5 ở route
  `/zones/zoneA` sẽ ra lỗi 404 vì Vercel tìm file tĩnh không tồn tại):
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
- Sau khi deploy, cập nhật CORS ở Spring Boot backend để cho phép đúng
  domain Vercel (`https://<ten-du-an>.vercel.app` và domain preview dạng
  `https://<ten-du-an>-git-*.vercel.app` nếu dùng preview deployments).

### Error Boundary — bắt buộc có ở gốc app
Bọc `<AppRoutes />` trong 1 React Error Boundary — nếu 1 component lỗi
render (ví dụ dữ liệu API trả về sai định dạng), toàn app không được
trắng trang, phải hiện thông báo lỗi + nút "Tải lại trang".

### Lazy loading route — tránh bundle 1 file khổng lồ
```jsx
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
```
Bọc `<Suspense fallback={<LoadingState />}>` quanh `<Routes>`.

### Trang 404
Route `*` → trang "Không tìm thấy", có nút quay về Dashboard — bắt buộc có
trước khi coi Frontend là "production-ready", vì SPA rất dễ gặp URL sai.

### Favicon + tiêu đề trang
Đặt `<title>DuriCare</title>` và 1 favicon đơn giản (emoji 🌳 dùng tạm qua
`<link rel="icon" href="data:image/svg+xml,...">` là đủ, không cần thiết
kế logo riêng ở giai đoạn đồ án).

---

## 3 trạng thái BẮT BUỘC xử lý trên mọi màn hình có fetch dữ liệu
1. Loading — skeleton/spinner, không màn hình trắng
2. Error — thông báo lỗi + nút Retry
3. Empty — có kết quả nhưng rỗng — không hiển thị như lỗi

## Checklist verify SAU MỖI PHASE (đầy đủ, không rút gọn)
1. Chạy `npm run dev`, mở đúng route vừa xây
2. Chụp ảnh ở 375px (mobile) VÀ 1440px (desktop)
3. Bật dark mode, chụp lại ảnh — xác nhận chữ vẫn đọc được, không có
   nền trắng sót lại (hard-code màu quên đổi)
4. Test cả 3 trạng thái loading/error/empty
5. Kiểm tra Console không có lỗi CORS/404/TypeScript