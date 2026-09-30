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
  - `Alert` (`src/components/alert.tsx`): Hiển thị thông báo lỗi và cảnh báo tạm khóa tài khoản.
- [x] **Trang Đăng nhập hoàn chỉnh (`/login` - `src/pages/login-page.tsx`):**
  - **Layout Split-Screen & Zero-Scrollbar (Khớp 100% màn hình):**
    - Desktop (`>= lg`): Thiết lập `h-screen max-h-screen overflow-hidden` vừa khít khung nhìn, chấm dứt hoàn toàn hiện tượng thanh cuộn / thanh kéo dọc trên mọi màn hình laptop.
    - Cột Trái: Sử dụng Poster minh họa 3D isometric hiện đại, tone màu pastel dịu mắt về kho vận & phân phối B2B (`src/assets/login-poster.jpg`), loại bỏ toàn bộ khối chữ thừa thãi.
    - Cột Phải: Form đăng nhập chuẩn production (chỉ gồm `Email`, `Mật khẩu`, `Ghi nhớ đăng nhập`, `Quên mật khẩu?` và nút `Đăng nhập`), loại bỏ hoàn toàn các nút/thành phần test demo, căn giữa thoáng đãng và sang trọng.
    - Mobile (`< lg`): Tự động ẩn cột poster, form co dãn linh hoạt, hỗ trợ cuộn êm ái khi bàn phím ảo xuất hiện.
  - **Dịch vụ Xác thực (`src/services/auth.service.ts`):** Giả lập đăng nhập, mã hóa lỗi chung 401 chống user enumeration, xử lý khóa tạm 15 phút khi nhập sai nhiều lần.
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
