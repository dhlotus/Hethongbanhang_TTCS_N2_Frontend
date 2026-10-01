# BÁO CÁO TRẠNG THÁI DỰ ÁN (PROJECT STATE)

> **Dự án:** Hệ thống Quản lý Bán hàng & Kho Doanh nghiệp B2B (LOHA SALES)  
> **Cập nhật:** Sprint 1 - 01/10/2026  
> **Tài liệu tham chiếu:** [`UI_GUIDELINES.md`](./UI_GUIDELINES.md) | [`CODE_CONVENTION.md`](./CODE_CONVENTION.md)

---

## 1. Tech Stack & Quy chuẩn Kỹ thuật Đang Áp Dụng
- **Core:** React 19 + TypeScript + Vite.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`).
- **Form & Validation:** `react-hook-form` + `@hookform/resolvers/zod` + `zod`.
- **Icons:** `lucide-react`.
- **Quy tắc Code & Naming (Strict):**
  - Tên file & thư mục: 100% **kebab-case** (`login-page.tsx`, `auth.service.ts`, `input.tsx`, `validation.ts`, `auth.ts`).
  - Component: PascalCase, định kiểu tường minh, không sử dụng `any`.
  - Cấu trúc chuẩn Clean Architecture: `components/`, `pages/`, `services/`, `utils/`, `types/`, `layouts/`, `routes/`.
- **Triết lý Thiết kế (UI/UX):**
  - Giao diện sáng sủa (Light-mode), tinh tế, bo góc mềm (`rounded-xl` / `rounded-2xl`), đổ bóng mềm mại đa tầng.
  - Phối màu SaaS hiện đại (Primary Blue, Slate, Accent), tương phản chuẩn WCAG.
  - Mobile-First: Co giãn tự nhiên, chống tràn màn hình.
- **Quy chuẩn Git Branching:**
  - Nhánh chính: `main` (Production).
  - Nhánh phát triển trung tâm: `develop` (Tất cả feature branches nhánh ra và merge vào `develop`).

---

## 2. Tiến Độ & Nghiệm Thu Task SN-108: Màn Hình Đăng Nhập (100% AC Passed)
| Tiêu chí chấp nhận (AC) | Trạng thái | File đảm nhiệm | Chi tiết kỹ thuật |
| :--- | :---: | :--- | :--- |
| **AC 1: Dựng màn hình Login (Input: Username/Email, Password)** | ✅ Đạt | [`src/pages/login-page.tsx`](./src/pages/login-page.tsx), [`src/components/input.tsx`](./src/components/input.tsx) | Layout Split-screen cân xứng 50/50, đơn vị tương đối `82vh` vừa khít viewport, ô input chuẩn UI/UX kèm icon và toggle eye ẩn/hiện mật khẩu. |
| **AC 2: Bắt lỗi (validate) client-side** | ✅ Đạt | [`src/utils/validation.ts`](./src/utils/validation.ts) | Sử dụng Zod + React Hook Form; validate cả Email và Username (tối thiểu 3 ký tự); mật khẩu tối thiểu 6 ký tự; chặn submit khi chưa hợp lệ. |
| **AC 3: Gọi API POST /auth/login** | ✅ Đạt | [`src/services/auth.service.ts`](./src/services/auth.service.ts), [`src/services/api.ts`](./src/services/api.ts) | Tích hợp Axios gọi chuẩn endpoint `POST /auth/login` (prefix `/api` qua proxy), gửi `{ username, password }`. |
| **AC 4: Lưu trữ Token (access_token, refresh_token) an toàn** | ✅ Đạt | [`src/pages/login-page.tsx`](./src/pages/login-page.tsx), [`src/services/api.ts`](./src/services/api.ts) | Lưu `access_token` (và `auth_token`) cùng `refresh_token` vào `localStorage`, đính kèm tự động qua Axios request interceptor. |
| **AC 5: Điều hướng theo vai trò (getRedirectPathByRole)** | ✅ Đạt | [`src/utils/auth.ts`](./src/utils/auth.ts), [`src/routes/index.tsx`](./src/routes/index.tsx) | Hàm `getRedirectPathByRole` điều hướng chính xác về Dashboard tương ứng (Admin, Sales, Warehouse, Accountant, Customer). |
| **AC 6: Thông báo lỗi bảo mật & Khóa tài khoản 15 phút** | ✅ Đạt | [`src/services/auth.service.ts`](./src/services/auth.service.ts), [`src/components/toast.tsx`](./src/components/toast.tsx) | Bắt lỗi 401/400 trả về thông báo chung chống user enumeration; phát hiện và hiển thị cảnh báo khóa tài khoản 15 phút dạng Toast nổi. |

- **Kiểm tra chất lượng:**
  - `npm run build`: Thành công (**0 lỗi**).
  - `npm run lint`: Thành công (**0 lỗi, 0 cảnh báo**).

---

## 3. Danh Sách Tài Khoản Thử Nghiệm 7 Vai Trò (Mật khẩu: `123456`)
| STT | Vai trò | Email / Username | Tên hiển thị | Mã Role | URL Điều hướng sau Login |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Quản trị hệ thống** | `admin@loha.vn` / `admin` | Nguyễn Văn Admin | `ADMIN` | `/admin/dashboard` |
| 2 | **Nhân viên kinh doanh** | `sales@loha.vn` / `sales` | Trần Văn Nam | `SALES_REP` | `/sales/dashboard` |
| 3 | **Quản lý kinh doanh** | `salesmanager@loha.vn` | Lê Hoàng Trưởng Phòng | `SALES_MANAGER` | `/sales/dashboard` |
| 4 | **Thủ kho** | `warehouse@loha.vn` / `warehouse` | Phạm Hùng Kho | `WAREHOUSE_KEEPER` | `/warehouse/dashboard` |
| 5 | **Quản lý kho** | `warehousemanager@loha.vn` | Đỗ Quốc Bảo | `WAREHOUSE_MANAGER` | `/warehouse/dashboard` |
| 6 | **Kế toán** | `accountant@loha.vn` / `accountant` | Vũ Mai Hoa | `ACCOUNTANT` | `/accountant/dashboard` |
| 7 | **Đại lý B2B** | `dealer@loha.vn` / `customer` | Cửa Hàng Minh Khang | `CUSTOMER` | `/customer/portal` |

---

## 4. Kế Hoạch Triển Khai Tiếp Theo (Sprint 1)
- [ ] **Xây dựng khung Layout App & Sidebar Điều hướng Động (Dynamic Role-based Navigation Sidebar):**
  - **Khung Layout chuẩn (`DashboardLayout`):** Header, Sidebar, Main Content Area, Mobile Drawer.
  - **Sidebar phân quyền động theo 7 vai trò:** Tự động ẩn/hiện menu phù hợp cho từng vai trò người dùng.
  - **Tính năng UI Sidebar:** Hỗ trợ thu gọn/mở rộng (Collapsible), Active state indicator, Group menu accordion, và Responsive drawer trên mobile/tablet.
