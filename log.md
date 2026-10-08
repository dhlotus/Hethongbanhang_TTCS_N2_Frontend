# NHẬT KÝ PHÁT TRIỂN HỆ THỐNG BÁN HÀNG & KHO - FRONTEND (LOG.MD)

> **Dự Án:** Hệ Thống Quản Lý Bán Hàng & Kho Doanh Nghiệp B2B (LOHA SALES)  
> **Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Axios  
> **Tài liệu tham chiếu:** [`UI_GUIDELINES.md`](./UI_GUIDELINES.md) | [`CODE_CONVENTION.md`](./CODE_CONVENTION.md)  
> **Múi giờ chuẩn:** `Asia/Ho_Chi_Minh` (UTC+7) | **Ngôn ngữ:** 100% Tiếng Việt  

---

## 1. NGUYÊN TẮC VẬN HÀNH & QUY TRÌNH CODE
1. **Quy chuẩn Code Convention:**
   - File & Thư mục: `kebab-case` 100% (ví dụ: `customers-page.tsx`, `customer.service.ts`, `customer.types.ts`).
   - Biến & Hàm: `camelCase` (bắt đầu bằng động từ: `searchCustomers`, `getCustomers`).
   - Component & Type/Interface: `PascalCase`.
   - Hằng số & Enum: `UPPER_SNAKE_CASE`. Tuyệt đối không dùng Magic Numbers/Strings.
   - Type Safety: TUYỆT ĐỐI CẤM dùng kiểu `any`. Đồng bộ Interface/Type giữa BE và FE.
   - Định dạng: Thụt lề 2 spaces, bắt buộc có Trailing Comma.
   - Phân tầng Frontend: Tách biệt UI và Logic trong `src/` (`/components`, `/pages`, `/services` dùng Axios tập trung, `/types`, `/hooks`, `/utils`). Tuyệt đối không gọi axios trực tiếp trong UI component, bắt buộc có try-catch báo Toast/Alert.

2. **Triết lý Thiết kế Giao diện (`UI_GUIDELINES.md`):**
   - Màu thương hiệu chính: Blue-Purple / Indigo Purple (`--color-primary: #371cdb`).
   - Thiết kế Mobile-First: Thao tác chạm nhanh nhạy (Touch targets >= 40-44px), khoảng cách 4px-grid, tối ưu cho nhân viên kinh doanh sử dụng điện thoại ngoài đường thực địa.

---

## 2. LỊCH SỬ THỰC HIỆN CÁC USER STORIES & SPRINT

### [Sprint 3] - [SN-37]: Tìm kiếm và Lọc Danh sách Đại lý theo Tuyến Bán hàng
- **Thời gian hoàn thành:** 2026-10-08
- **Mã Jira / Subtask:** SN-37 (Epic EP-03 / S3-08)
- **Tiêu đề:** "Là Nhân viên kinh doanh, tôi muốn tìm kiếm và lọc danh sách đại lý, để tìm nhanh khách trong tuyến khi đang đứng ngoài đường."
- **Tiêu chí chấp nhận (AC) đã đạt 100%:**
  1. Lọc linh hoạt theo: Khu vực (`region`), nhóm khách hàng (`customerGroup`), người phụ trách (`salesRepId`), trạng thái (`status`).
  2. Tìm kiếm nhanh (Full-text/Partial search) theo: Mã đại lý (`code`), tên đại lý (`name`), số điện thoại (`phone`).
  3. Trải nghiệm người dùng: Thao tác cực nhanh, nhạy, thân thiện trên thiết bị di động (nhân viên đứng ngoài đường thị trường tra cứu).
- **Danh sách file tạo mới / thay đổi:**
  - `src/types/customer.types.ts` (Tạo mới: Customer, CustomerStatus enum, CustomerFilterParams, PaginatedCustomersResponse)
  - `src/types/customer.ts` (Cập nhật: Re-export đồng bộ với customer.types.ts)
  - `src/services/customer.service.ts` (Tạo mới: getCustomers hỗ trợ lọc đa tiêu chí, phân trang và fallback offline/demo)
  - `src/services/customers.service.ts` (Cập nhật: Re-export customerService và customersService)
  - `src/hooks/use-customers.ts` (Tạo mới: Custom hook quản lý state, debounce 300ms tìm kiếm chống spam request, phân trang)
  - `src/pages/customers-page.tsx` (Tạo mới: Màn hình tra cứu đại lý tối ưu di động với Card View, nút gọi điện thoại nhanh `tel:`, bộ lọc filter chips nhanh, Skeleton loading, Table View cho Desktop, tích hợp DeliveryPointModal)
  - `src/routes/index.tsx` (Cập nhật: Tích hợp CustomersPage vào route `/sales/customers` và alias `/customers`)
  - `src/services/orders.service.ts` (Cập nhật: Hỗ trợ response đại lý phân trang chuẩn PaginatedCustomersResponse)
- **Chi tiết kỹ thuật & UX:**
  - **Debounce Search 300ms:** Giảm tải request cho server khi nhân viên kinh doanh gõ tìm kiếm trên mạng 4G ngoài đường.
  - **Quick Filter Chips:** Các chip bấm nhanh chọn Trạng thái (Đang hoạt động, Tạm khóa nợ, Ngừng KD), Khu vực (Miền Bắc, Miền Trung, Miền Nam), Nhóm đại lý (Cấp 1, Cấp 2, Khách lẻ).
  - **Card View Mobile (< 768px):** Hiển thị rõ mã đại lý, tên, địa chỉ, thanh tỷ lệ nợ / hạn mức cảnh báo màu khi nợ cao, nút gọi nhanh `tel:` trực tiếp kết nối đại lý, nút mở nhanh modal Điểm giao hàng và nút Lên đơn hàng.
  - **Table View Desktop (>= 768px):** Bảng hiển thị đầy đủ thông tin chi tiết, thao tác thuận tiện cho quản lý văn phòng.
- **Trạng thái kiểm thử:**
  - ✅ ESLint: `npx eslint src/types/customer.types.ts src/services/customer.service.ts src/hooks/use-customers.ts src/pages/customers-page.tsx` -> 0 lỗi, 0 warnings.
  - ✅ Build Production: `npm run build` (`tsc -b && vite build`) -> 0 lỗi, build hoàn tất.
