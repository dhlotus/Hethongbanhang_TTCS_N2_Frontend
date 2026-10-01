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

## 5. Tiến Độ & Nghiệm Thu Task SN-111: Auto Refresh Token, Logout & Session Timeout (100% AC Passed)
| Tiêu chí chấp nhận (AC) | Trạng thái | File đảm nhiệm | Chi tiết kỹ thuật |
| :--- | :---: | :--- | :--- |
| **AC 1: Cấu hình Request Interceptor** | ✅ Đạt | [`src/services/api.ts`](./src/services/api.ts), [`src/utils/token-storage.ts`](./src/utils/token-storage.ts) | Tự động lấy Access Token từ `tokenStorage` (`localStorage`) và gán vào header: `config.headers.Authorization = 'Bearer ${token}'`. |
| **AC 2: Response Interceptor bắt 401 & Hàng đợi chống lặp (Mutex Lock)** | ✅ Đạt | [`src/services/api.ts`](./src/services/api.ts) | Bắt lỗi 401 Unauthorized; quản lý cờ `isRefreshing` và hàng đợi `failedQueue` chống việc nhiều API đồng thời kích hoạt nhiều request refresh; gắn cờ `_retry` chống lặp vô tận. Bỏ qua refresh đối với các route auth (`/auth/login`, `/auth/refresh`, `/auth/logout`). |
| **AC 3: Gọi API /auth/refresh & Retry Request** | ✅ Đạt | [`src/services/api.ts`](./src/services/api.ts), [`src/services/auth.service.ts`](./src/services/auth.service.ts) | Gọi `POST /auth/refresh` bằng client độc lập `refreshClient`; khi thành công tự động cập nhật token mới vào storage, giải phóng hàng đợi và retry lại request ban đầu với header mới. |
| **AC 4: Chức năng Đăng xuất (Logout)** | ✅ Đạt | [`src/services/auth.service.ts`](./src/services/auth.service.ts), [`src/layouts/header.tsx`](./src/layouts/header.tsx), [`src/pages/role-module-page.tsx`](./src/pages/role-module-page.tsx) | Gọi API `POST /auth/logout` lên Backend với Bearer token và `{ refreshToken }`; dọn sạch `localStorage` thông qua `tokenStorage.clearAuthData()`; điều hướng an toàn về `/auth/login`. |
| **AC 5: Xử lý Session Hết hạn & Thông báo UI** | ✅ Đạt | [`src/utils/session-timeout.ts`](./src/utils/session-timeout.ts), [`src/pages/login-page.tsx`](./src/pages/login-page.tsx), [`src/components/toast.tsx`](./src/components/toast.tsx) | Khi Refresh Token hết hạn hoặc không hợp lệ: tự động dọn sạch storage, phát sự kiện và điều hướng về `/auth/login?expired=1`; hiển thị Toast thông báo màu Amber: *"Phiên làm việc đã hết hạn, vui lòng đăng nhập lại"*. |

---

## 6. Tiến Độ & Nghiệm Thu Tính Năng Đổi Mật Khẩu (Change Password Page)
| Tiêu chí chấp nhận (AC) | Trạng thái | File đảm nhiệm | Chi tiết kỹ thuật |
| :--- | :---: | :--- | :--- |
| **AC 1: Cấu trúc Giao diện & Form (UI/UX)** | ✅ Đạt | [`src/pages/change-password-page.tsx`](./src/pages/change-password-page.tsx) | Card Form hiện đại chuẩn UI Guidelines, bo góc mềm mại, hiển thị 3 trường (Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới) kèm icon ẩn/hiện mắt và thước đo độ mạnh mật khẩu realtime. |
| **AC 2: Validate phía Client (Zod + React Hook Form)** | ✅ Đạt | [`src/utils/validation.ts`](./src/utils/validation.ts) | Bắt buộc nhập mật khẩu hiện tại; mật khẩu mới tối thiểu 8 ký tự kèm chữ cái và chữ số; xác nhận mật khẩu mới khớp với mật khẩu mới qua `refine`; hiển thị thông báo lỗi màu đỏ ngay dưới từng input. |
| **AC 3: Gọi API POST /auth/change-password** | ✅ Đạt | [`src/services/auth.service.ts`](./src/services/auth.service.ts) | Gọi `POST /auth/change-password` với `{ currentPassword, newPassword }`, xử lý bắt lỗi từ Backend và hiển thị Toast lỗi màu đỏ khi sai mật khẩu hiện tại. |
| **AC 4: Dọn dẹp Token & Chuyển hướng sau khi thành công** | ✅ Đạt | [`src/pages/change-password-page.tsx`](./src/pages/change-password-page.tsx) | Hiển thị Toast thành công xanh mát: *"Đổi mật khẩu thành công! Vui lòng đăng nhập lại."*; xóa sạch `localStorage` qua `tokenStorage.clearAuthData()` và tự động điều hướng về `/auth/login` sau 1.8 giây. |
| **AC 5: Định tuyến bảo vệ (Protected Route)** | ✅ Đạt | [`src/routes/index.tsx`](./src/routes/index.tsx) | Cấu hình tuyến đường `/profile/change-password` và `/settings/security` nằm trong `ProtectedRoute` cho toàn bộ các vai trò trong hệ thống. |

---

## 7. Tiến Độ & Nghiệm Thu Epic/Task SN-7: Duy Trì Phiên Đăng Nhập & Đăng Xuất An Toàn Khi Mạng Chập Chờn (100% AC Passed)
| Tiêu chí chấp nhận (AC) | Trạng thái | File đảm nhiệm | Chi tiết kỹ thuật |
| :--- | :---: | :--- | :--- |
| **AC 1: Giữ phiên liền mạch & Auto Refresh Token** | ✅ Đạt | [`src/services/api.ts`](./src/services/api.ts), [`src/utils/token-storage.ts`](./src/utils/token-storage.ts) | Khi token hết hạn trong quá trình thao tác, hệ thống tự động refresh token ngầm và retry request cũ trong suốt mà không làm gián đoạn người dùng. Lỗi mạng (ERR_NETWORK / Timeout) không bị nhầm lẫn với 401, không làm rớt phiên. |
| **AC 2: Chống mất dữ liệu khi mạng chập chờn (Form Draft)** | ✅ Đạt | [`src/hooks/use-form-draft.ts`](./src/hooks/use-form-draft.ts) | Custom hook `useFormDraft` tự động lưu nháp cục bộ (Local Persistence với debounce 600ms) theo người dùng, hỗ trợ khôi phục dữ liệu form khi F5 hoặc rớt mạng giữa chừng; có hàm `clearDraft()` khi submit thành công. |
| **AC 3: Chỉ báo trạng thái kết nối mạng (Network Status)** | ✅ Đạt | [`src/hooks/use-network-status.ts`](./src/hooks/use-network-status.ts), [`src/components/network-status-indicator.tsx`](./src/components/network-status-indicator.tsx), [`src/routes/index.tsx`](./src/routes/index.tsx) | Component `NetworkStatusIndicator` hiển thị toàn cục: cảnh báo nổi tinh tế khi mất mạng (*"Mất kết nối Internet. Dữ liệu đang được lưu tạm cục bộ"*), và thông báo xanh tự động biến mất khi có mạng trở lại. |
| **AC 4: Đăng xuất an toàn tuyệt đối khi mạng lag (Resilient Logout)** | ✅ Đạt | [`src/services/auth.service.ts`](./src/services/auth.service.ts) | Tối ưu hàm `logout`: kiểm tra `navigator.onLine`, giới hạn `timeout: 3000` khi gọi `POST /auth/logout` lên máy chủ. Khối `finally` luôn luôn dọn sạch token ở Client và điều hướng về `/auth/login` ngay cả khi rớt mạng hoàn toàn. |

---

## 8. Kiểm Tra Chất Lượng Mã Nguồn
- `npm run build`: Thành công (**0 lỗi**).
- `npm run lint`: Thành công (**0 lỗi, 0 cảnh báo**).
