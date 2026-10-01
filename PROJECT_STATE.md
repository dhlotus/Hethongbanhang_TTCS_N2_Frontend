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
  - Tên file & thư mục: 100% **kebab-case** (`login-page.tsx`, `auth.service.ts`, `input.tsx`, `validation.ts`, `navigation.ts`, `admin-layout.tsx`).
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
| **AC 5: Điều hướng theo vai trò (getRedirectPathByUser)** | ✅ Đạt | [`src/utils/navigation.ts`](./src/utils/navigation.ts), [`src/routes/index.tsx`](./src/routes/index.tsx) | Hàm `getRedirectPathByUser` điều hướng chính xác về Module/Dashboard tương ứng (Admin, Sales, Warehouse, Accountant, Customer). |
| **AC 6: Thông báo lỗi bảo mật & Khóa tài khoản 15 phút** | ✅ Đạt | [`src/services/auth.service.ts`](./src/services/auth.service.ts), [`src/components/toast.tsx`](./src/components/toast.tsx) | Bắt lỗi 401/400 trả về thông báo chung chống user enumeration; phát hiện và hiển thị cảnh báo khóa tài khoản 15 phút dạng Toast nổi. |

---

## 3. Kiến Trúc Điều Hướng & Bảo Vệ Tuyến Đường (Role-based Navigation & Protected Routes)
- **Hàm điều hướng trung tâm (`src/utils/navigation.ts`):**
  - `getRedirectPathByRole(role?: string): string`: Chuẩn hóa mapping role sang URL tương ứng:
    - `admin` / `ADMIN` $\rightarrow$ `/system/users`
    - `sales` / `SALES_REP` $\rightarrow$ `/sales/orders`
    - `manager` / `SALES_MANAGER` / `WAREHOUSE_MANAGER` $\rightarrow$ `/dashboard`
    - `warehouse` / `WAREHOUSE_KEEPER` $\rightarrow$ `/inventory/stock`
    - `accountant` / `ACCOUNTANT` $\rightarrow$ `/accounting/invoices`
    - `customer` / `dealer` / `CUSTOMER` $\rightarrow$ `/portal/orders`
    - Fallback $\rightarrow$ `/dashboard`
  - `getRedirectPathByUser(user)` & `getStoredUser()`: Hỗ trợ truy xuất trạng thái xác thực an toàn từ `localStorage`.
- **Bộ bảo vệ Route `ProtectedRoute` (`src/components/protected-route.tsx`):**
  - Kiểm tra token trong `localStorage`. Nếu chưa đăng nhập, tự động đá về `/login` hoặc `/auth/login` (kèm `location state` để hỗ trợ quay lại trang trước đó sau khi login).
  - Hỗ trợ kiểm tra phân quyền `allowedRoles`. Nếu vai trò không nằm trong danh sách cho phép, tự động redirect về trang chủ của vai trò đó mà không gây crash màn hình.
- **Khung Layout Chuẩn & Trang Phân hệ (`src/layouts/admin-layout.tsx`, `src/pages/role-module-page.tsx`, `src/routes/index.tsx`):**
  - Xây dựng khung Sidebar, Header, Mobile Drawer với các mục menu quản trị hệ thống.
  - Cấu hình toàn bộ các tuyến đường public (`/login`, `/auth/login`) và protected (`/dashboard`, `/system/users`, `/sales/orders`, `/inventory/stock`, `/accounting/invoices`, `/portal/orders`).

---

## 4. Danh Sách Tài Khoản Thử Nghiệm 7 Vai Trò (Mật khẩu: `123456`)
| STT | Vai trò | Email đăng nhập (Tiếng Việt) | Tên hiển thị | Mã Role | URL Điều hướng sau Login |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 1 | **Quản trị hệ thống** | `quantrihethong@loha.vn` | Nguyễn Văn Admin | `ADMIN` | `/system/users` |
| 2 | **Nhân viên kinh doanh** | `nhanvienkinhdoanh@loha.vn` | Trần Văn Nam | `SALES_REP` | `/sales/orders` |
| 3 | **Quản lý kinh doanh** | `quanlykinhdoanh@loha.vn` | Lê Hoàng Trưởng Phòng | `SALES_MANAGER` | `/dashboard` |
| 4 | **Thủ kho** | `thukho@loha.vn` | Phạm Hùng Kho | `WAREHOUSE_KEEPER` | `/inventory/stock` |
| 5 | **Quản lý kho** | `quanlykho@loha.vn` | Đỗ Quốc Bảo | `WAREHOUSE_MANAGER` | `/dashboard` |
| 6 | **Kế toán công nợ** | `ketoan@loha.vn` | Vũ Mai Hoa | `ACCOUNTANT` | `/accounting/invoices` |
| 7 | **Đại lý / Khách hàng B2B** | `daily@loha.vn` | Cửa Hàng Minh Khang | `CUSTOMER` | `/portal/orders` |


---

## 5. Kiểm Tra Chất Lượng Mã Nguồn
- `npm run build`: Thành công (**0 lỗi**).
- `npm run lint`: Thành công (**0 lỗi, 0 cảnh báo**).
