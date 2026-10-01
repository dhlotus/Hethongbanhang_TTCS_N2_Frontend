# BÁO CÁO TRẠNG THÁI DỰ ÁN (PROJECT STATE)

> **Dự án:** Hệ thống Quản lý Bán hàng & Kho Doanh nghiệp B2B (LOHA SALES)  
> **Cập nhật:** Sprint 1 - 29/09/2026  
> **Tài liệu tham chiếu:** [`UI_GUIDELINES.md`](./UI_GUIDELINES.md) | [`CODE_CONVENTION.md`](./CODE_CONVENTION.md)

---

## 1. Tech Stack & Quy chuẩn Kỹ thuật Đang Áp Dụng
- **Core:** React 19 + TypeScript + Vite.
- **Styling:** Tailwind CSS v4 (`@tailwindcss/vite`).
- **Form & Validation:** `react-hook-form` + `@hookform/resolvers/zod` + `zod`.
- **Icons:** `lucide-react`.
- **Quy tắc Code & Naming (Strict):**
  - Tên file & thư mục: 100% **kebab-case** (`login-page.tsx`, `auth.service.ts`, `input.tsx`, `validation.ts`).
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

## 2. Các Hạng Mục Đã Hoàn Thành
- [x] **Dọn dẹp & Kiến trúc mã nguồn:** Tổ chức thư mục chuẩn bên trong `src/`, xóa sạch code rác cũ.
- [x] **Bộ UI Components dùng chung:**
  - `Input` (`src/components/input.tsx`): Hỗ trợ icon, toggle ẩn/hiện password, validate real-time.
  - `Button` (`src/components/button.tsx`): Trạng thái loading spinner, chặn click đúp, micro-interactions.
  - `Alert` (`src/components/alert.tsx`): Khối thông báo cảnh báo.
  - `Toast` (`src/components/toast.tsx`): Thông báo nổi góc màn hình (Floating Toast), tự đóng sau 4s, giữ form cố định không bị đẩy lệch layout.
- [x] **Trang Đăng nhập hoàn chỉnh (`/login` - `src/pages/login-page.tsx`):**
  - **Thông báo lỗi qua Toast:** Khi đăng nhập sai hoặc bị tạm khóa, thông báo xuất hiện dưới dạng Toast nổi phía trên bên phải màn hình, tuyệt đối không chèn vào trong form gây biến dạng layout.
  - **Layout Dual-Panel Cân Xứng Tuyệt Đối (Equal 50/50 Split & Relative Viewport Units):**
    - Desktop (`>= lg`): Sử dụng đơn vị tương đối **`lg:h-[82vh] lg:max-h-[560px]`**, loại bỏ hoàn toàn các thông số cố định pixel cứng (`min-h-[540px]`). Chiều cao khung thẻ luôn co dãn tỉ lệ thuận với màn hình (luôn chiếm 82% chiều cao màn hình, chừa 18% cho lề trên dưới), đảm bảo **vừa khít 100% viewport** trên mọi độ phân giải. Poster bên trái và Form bên phải luôn bằng nhau tuyệt đối cả rộng lẫn cao.
    - Mobile / Tablet (`< lg`): Tự động ẩn cột poster, form căn giữa (`w-full max-w-md`) với lề thoáng đãng, hỗ trợ cuộn mượt mà khi màn hình thấp hoặc bàn phím ảo bật lên.
    - Chống tràn ngang và dọc (`overflow-hidden`).
  - **Dịch vụ Xác thực (`src/services/auth.service.ts`):** Giả lập đăng nhập chuẩn 7 vai trò, mã hóa lỗi chung 401 chống user enumeration, xử lý khóa tạm 15 phút khi nhập sai nhiều lần.
  - **Danh sách 7 Tài khoản Test (Mật khẩu chung: `123456`):**
    | STT | Vai trò | Email đăng nhập | Tên hiển thị mẫu | Mã Role |
    | :---: | :--- | :--- | :--- | :--- |
    | 1 | **Quản trị hệ thống** | `admin@loha.vn` | Nguyễn Văn Admin | `ADMIN` |
    | 2 | **Nhân viên kinh doanh** | `sales@loha.vn` | Trần Văn Nam | `SALES_REP` |
    | 3 | **Quản lý kinh doanh** | `salesmanager@loha.vn` | Lê Hoàng Trưởng Phòng | `SALES_MANAGER` |
    | 4 | **Thủ kho** | `warehouse@loha.vn` | Phạm Hùng Kho | `WAREHOUSE_KEEPER` |
    | 5 | **Quản lý kho** | `warehousemanager@loha.vn` | Đỗ Quốc Bảo | `WAREHOUSE_MANAGER` |
    | 6 | **Kế toán** | `accountant@loha.vn` | Vũ Mai Hoa | `ACCOUNTANT` |
    | 7 | **Đại lý B2B** | `dealer@loha.vn` | Cửa Hàng Minh Khang | `CUSTOMER` |
- [x] **Xử lý Điều hướng theo Vai trò & Route Protection (Role-based Navigation & Protected Routes):**
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
  - **Tích hợp vào `LoginPage` (`src/pages/login-page.tsx`):**
    - Đăng nhập thành công $\rightarrow$ Lưu `auth_token` và `auth_user` vào `localStorage` $\rightarrow$ Dùng `useNavigate` điều hướng ngay lập tức về trang phân hệ theo role.
    - Tự động phát hiện nếu người dùng đã đăng nhập từ trước, nếu truy cập lại `/login` hoặc `/auth/login` sẽ tự động chuyển hướng về trang tương ứng.
  - **Bộ bảo vệ Route `ProtectedRoute` (`src/components/protected-route.tsx`):**
    - Kiểm tra token trong `localStorage`. Nếu chưa đăng nhập, tự động đá về `/auth/login` (kèm `location state` để hỗ trợ quay lại trang trước đó sau khi login).
    - Hỗ trợ kiểm tra phân quyền `allowedRoles`. Nếu vai trò không nằm trong danh sách cho phép, tự động redirect về trang chủ của vai trò đó mà không gây crash màn hình.
  - **Trang Phân hệ Mẫu & Router (`src/pages/role-module-page.tsx`, `src/routes/index.tsx`):**
    - Xây dựng trang giao diện phân hệ trực quan chuẩn [`UI_GUIDELINES.md`](./UI_GUIDELINES.md) với thông tin User, Role badge, Current URL, nút Đăng xuất an toàn.
    - Cấu hình toàn bộ các tuyến đường public (`/login`, `/auth/login`) và protected (`/dashboard`, `/system/users`, `/sales/orders`, `/inventory/stock`, `/accounting/invoices`, `/portal/orders`).
- [x] **Kiểm tra chất lượng:**
  - `npm run build`: Thành công (**0 lỗi**).
  - `npm run lint`: Thành công (**0 lỗi, 0 cảnh báo**).

---

## 3. Kế Hoạch Triển Khai Tiếp Theo (Sprint 1)
- [ ] **Xây dựng khung Layout App & Sidebar Điều hướng Động (Dynamic Role-based Navigation Sidebar):**
  - **Khung Layout chuẩn (`DashboardLayout`):** Header, Sidebar, Main Content Area, Mobile Drawer.
  - **Sidebar phân quyền động theo 7 vai trò:**
    1. Đại lý / Khách hàng B2B
    2. Nhân viên kinh doanh (Sales Rep)
    3. Quản lý kinh doanh (Sales Manager)
    4. Thủ kho (Warehouse Keeper)
    5. Quản lý kho (Warehouse Manager)
    6. Kế toán (Accountant)
    7. Quản trị hệ thống (Admin)
  - **Tính năng UI Sidebar:** Hỗ trợ thu gọn/mở rộng (Collapsible), Active state indicator, Group menu accordion, và Responsive drawer trên mobile/tablet.
