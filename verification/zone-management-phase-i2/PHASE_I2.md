# Phase I-2 — Quản lý khu vực

Đã kiểm tra ngày 2026-10-03 với frontend localhost:5173 và backend localhost:8386. Giữ nguyên base URL từ `.env.development`, shared axios và cơ chế xác thực hiện có. Không sửa backend.

## Hợp đồng backend đã đọc

Nguồn: `ZoneController`, `ZoneRequest`, `ZoneResponse`, `ZoneService`, `TreeController`, `TreeResponse`, `SensorReadingController`.

- POST `/api/zones` → 201. Body: `{farmId, code, name, area, soilType, variety, plantingDate}`. `plantingDate` có thể null; backend dùng ngày hiện tại khi tạo cây.
- GET `/api/zones`, GET `/api/zones/by-code/{code}`. PUT `/api/zones/{id}` dùng **id số**, không dùng code.
- `ZoneResponse`: `{id, farmId, farmName, code, name, area, soilType, representativeTreeId, growthStage}`. Không trả variety/plantingDate.
- Form sửa đọc GET `/api/trees/{representativeTreeId}` để điền giống/ngày trồng. Danh sách ghép GET `/api/trees` với danh sách zones, không gọi từng cây một.
- PUT zone **đã hỗ trợ** sửa variety và plantingDate của cây đại diện bằng cùng request. Không cần PUT tree riêng. Ngày trồng null khi sửa giữ nguyên ngày cũ; growthStage luôn giữ nguyên.
- POST zone tự tạo 1 cây và 3 cảm biến TEMPERATURE/HUMIDITY/SOIL_MOISTURE trong transaction của backend.

## Giao diện và cấu trúc

- Ba route `/settings/zones`, `/settings/zones/new`, `/settings/zones/:code/edit` nằm trong RequireRole ADMIN, bên trong RequireAuth.
- Navigation “Quản lý khu vực” chỉ hiện ADMIN. Nhãn mobile rút gọn “Khu vực” để vừa 5 mục.
- Danh sách hiển thị code/name/stage/variety, nút sửa và tạo mới; cho phép xem tất cả nông trại hoặc lọc nông trại ở client.
- Form dùng React Hook Form: bắt buộc tên/mã/diện tích/loại đất/giống, diện tích dương, mã không trùng, ngày trồng optional. Không có control sửa growth stage.
- Mã giữ nguyên hoa/thường. Helper giải thích mã phải khớp firmware zoneId chính xác. Khi sửa có nhắc cập nhật firmware nếu đổi mã.
- Tạo mới chọn nông trại rõ ràng; sửa giữ nguyên liên kết nông trại. Sau lưu chuyển đến Zone Detail với farmId thật. Refresh overview và giữ farmId trong link Dashboard → Zone Detail/Alerts.
- Types trong `types/`, API trong `api/`, fetch/save trong `hooks/`; components không gọi axios. Dùng chung dictionary giai đoạn, theme/design tokens, i18n hiện có.

## Bằng chứng live từ thao tác UI

1. Tạo “Khu kiểm thử I-2”, code `UI-I2-20261003`, farmId 3, area 100, đất phù sa, giống Ri6, ngày trồng để trống. POST thực tế trả **201**.
2. Zone id **6**, cây đại diện id **5**; ngày tự sinh **2026-10-03**, giai đoạn KIEN_THIET_CO_BAN. GET sensors trả đúng **3** hàng: id 10 TEMPERATURE, 11 HUMIDITY, 12 SOIL_MOISTURE. Xem `provisioning.json`, `network-create.json`, `created-detail-375.jpg`, `created-detail-1440.jpg`.
3. Form sửa gửi PUT `/api/zones/6`, trả **200**. Đổi giống sang **Monthong**, ngày **2026-09-15**. GET tree 5 và form mở lại xác nhận lưu thành công; giai đoạn không đổi. Xem `network-edit.json`, `edit-proof.json`, `edited-detail.jpg`.
4. GET overview farmId 3 trả 200, Dashboard hiển thị zone mới, Monthong, đúng ngày trồng, ba metric **NO_SIGNAL**, mục tiêu từ backend. Xem `dashboard-proof.json`, `dashboard-after-create.jpg`.
5. OWNER đăng nhập thật thử cả ba route quản lý: đều về `/`, không hiện menu quản lý. Thông báo “Bạn không có quyền truy cập trang này” đã xuất hiện. Xem `owner-role-proof.json`, `owner-denied.jpg`.
6. Form tạo trống không gửi POST; form sửa đổi code thành ZONE-01 bị báo trùng, không gửi PUT. Xem `create-validation.jpg`, `duplicate-code-proof.json`.

Khu kiểm thử **được giữ lại trong DB local**, không tự xoá. Chưa có thiết bị gửi dữ liệu cho code này. Latest-reading endpoint hiện trả 404 khi chưa có reading; hook Zone Detail hiện có xử lý thành trạng thái không dữ liệu. Đây không phải thiếu Tree/Sensor hoặc lỗi CORS.

Network observer chỉ lưu cờ `bearerPresent`, request/response nghiệp vụ; không lưu access token, refresh cookie hay mật khẩu. `live.html` dùng HTTP thật. `states.html`/`states.ts` là entry kiểm tra tách biệt, không import trong production; chỉ mô phỏng loading/error/empty/save error. Không dùng dữ liệu mô phỏng để chứng minh auto-provisioning.

## Kiểm tra kỹ thuật và trạng thái

- POST CORS preflight: 200, origin localhost:5173, credentials được phép.
- `npm run build`: thành công (TypeScript strict + Vite).
- `npm run lint`: thành công, 5 cảnh báo có sẵn ở useAlerts/useOverview/OverviewContext; không có cảnh báo mới ở phần quản lý khu vực.
- Console danh sách/form với farmId hợp lệ: không có lỗi CORS, asset 404 hoặc lỗi runtime.
- Loading, lỗi tải + thử lại thành công, danh sách rỗng, chưa có nông trại, lỗi lưu giữ bản nháp: đã kiểm tra bằng fixture tách biệt, ảnh `state-*.jpg`.
- 768px: document/body width đều 768, main bắt đầu sau mobile header ở y=136; không tràn ngang.
- ADMIN overview vẫn yêu cầu farmId theo Auth-B3. Danh sách toàn cục không giả định “chỉ có một vườn”; chọn nông trại để header/weather có dữ liệu scoped.

## 12 ảnh bắt buộc

| Màn hình | 375 sáng | 375 tối | 1440 sáng | 1440 tối |
|---|---|---|---|---|
| Danh sách | [Ảnh](list-375-light.jpg) | [Ảnh](list-375-dark.jpg) | [Ảnh](list-1440-light.jpg) | [Ảnh](list-1440-dark.jpg) |
| Tạo mới, trước POST | [Ảnh](create-375-light.jpg) | [Ảnh](create-375-dark.jpg) | [Ảnh](create-1440-light.jpg) | [Ảnh](create-1440-dark.jpg) |
| Sửa, dữ liệu đọc lại sau PUT | [Ảnh](edit-375-light.jpg) | [Ảnh](edit-375-dark.jpg) | [Ảnh](edit-1440-light.jpg) | [Ảnh](edit-1440-dark.jpg) |
