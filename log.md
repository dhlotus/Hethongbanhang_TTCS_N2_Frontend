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

---

### [Sprint 3] - [SN-38 / SN-39]: Lên Đơn Hàng B2B Cho Đại Lý & Đồng Bộ Hai Chiều Quản Lý Đại Lý
- **Thời gian hoàn thành:** 2026-10-08
- **Mã Jira / Subtask:** SN-38 & SN-39 (Epic EP-03 / S3-09 & S3-10)
- **Tiêu đề:** "Là Nhân viên kinh doanh, tôi muốn lên đơn hàng cho đại lý ngay tại điểm bán, để chốt đơn nhanh và đại lý ký nhận ngay."
- **Tiêu chí chấp nhận (AC) đã đạt 100%:**
  1. **Chọn Đại lý & Điểm giao hàng & Ngày giao:** 
     - Lọc/tìm đại lý nhanh, tự động nạp danh sách các điểm giao hàng đã khai báo của đại lý đó (SN-31 & SN-32).
     - Cho phép chọn ngày giao mong muốn (`deliveryDate`), tự gán địa chỉ giao hàng mặc định hoặc chọn điểm giao khác.
  2. **Thêm Đại lý Mới Nhanh Trực Tiếp Trong Form Tạo Đơn:**
     - Modal "Thêm Đại Lý Mới Nhanh" (Tên, SĐT, Địa chỉ, Hạn mức tín dụng).
     - Lưu thành công là tự động chọn ngay vào đơn hàng, thiết lập luôn điểm giao hàng đầu tiên.
  3. **Đồng Bộ Dữ Liệu Hai Chiều Hoàn Hảo Với Quản Lý Đại Lý (`/sales/customers`):**
     - Đại lý tạo mới tại trang Đơn hàng lập tức nhảy qua Quản lý đại lý (danh sách hiển thị ngay tại đầu bảng, số lượng đại lý và chỉ số nợ cập nhật ngay lập tức nhờ cơ chế `loha_customers_updated` CustomEvent + `loha_customers_data` Storage).
     - Bấm nút **"Lên đơn"** tại bất kỳ dòng đại lý nào trong Quản lý đại lý lập tức chuyển sang trang Đơn hàng (`/sales/orders?customerId=...`), tự động mở Modal Tạo đơn và chọn sẵn đúng đại lý đó cùng địa chỉ giao hàng.
  4. **Thêm Sản Phẩm & Tính Tiền Realtime:**
     - Tìm kiếm sản phẩm theo SKU / Tên với debounce 400ms.
     - Chọn đơn vị tính (Thùng, Lốc, Lon...), nhập số lượng tự do không bị giật số (Quantity Input helper).
     - Tự động áp dụng chính sách chiết khấu hệ thống (SN-28 / `discountPoliciesService`).
     - Hiển thị theo thời gian thực: Tổng tiền hàng (`totals.subtotal`), Chiết khấu (`totals.totalDiscount`), Tổng phải thu (`totals.grandTotal`).
  5. **Lưu Nháp Đơn Hàng (SN-38):**
     - Nút "Lưu nháp" chuyên dụng lưu đơn hàng ở trạng thái `DRAFT` vào hệ thống.
     - Tự động lưu nháp cục bộ (`new-order-modal`), mở lại modal có banner hỏi khôi phục bản nháp đang gõ dở.
  6. **Tối Ưu Trải Nghiệm Di Động 360px:**
     - Giao diện đáp ứng mượt mà trên màn hình nhỏ từ 360px chiều rộng (`scrollWidth = 360px`, không tràn ngang).
     - Nút bấm và vùng chạm >= 44px, nút Lưu nháp và Tiếp theo bố trí thuận tay ngón cái.
- **Danh sách file thay đổi & hoàn thiện:**
  - `src/types/customer.types.ts`: Bổ sung `salesRepId`, `salesRepName` vào `CreateCustomerPayload`.
  - `src/types/order.ts`: Bổ sung `isDefault?: boolean` cho `DeliveryPoint` và `status?: OrderStatus` cho `CreateOrderPayload`.
  - `src/services/customer.service.ts`: Xây dựng tầng lưu trữ tập trung `loha_customers_data`, phát sự kiện `loha_customers_updated`, hỗ trợ offline CRUD điểm giao hàng.
  - `src/services/orders.service.ts`: Đồng bộ `getCustomers()` và `createOrder()` với dữ liệu đại lý tập trung từ `customerService`, xử lý đơn hàng nháp `DRAFT`.
  - `src/pages/customers-page.tsx`: Lắng nghe sự kiện đồng bộ thời gian thực `loha_customers_updated`, tích hợp nút "Lên đơn" điều hướng thông minh.
  - `src/pages/orders-page.tsx`: Modal tạo đơn 2 bước, modal thêm nhanh đại lý, tính tiền realtime, nút Lưu nháp, xử lý URL query param `customerId`.
- **Trạng thái kiểm thử:**
  - ✅ Build Production: `npm run build` (`tsc -b && vite build`) -> 0 lỗi, 100% type-safe, không dùng `any`.
  - ✅ Kiểm thử tự động trên trình duyệt thật (Chrome/Edge Headless qua CDP): Toàn bộ 13 bước (từ tạo nhanh đại lý -> kiểm tra Storage -> kiểm tra nhảy dữ liệu sang Quản lý đại lý -> bấm "Lên đơn" -> thêm sản phẩm -> kiểm tra tính tiền -> lưu nháp -> kiểm tra responsive 360px) đều vượt qua xuất sắc.

