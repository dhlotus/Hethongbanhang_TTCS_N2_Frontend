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

---

### [Sprint 4] - [SN-48]: Sao Chép Đơn Hàng Cũ Thành Đơn Mới (Clone Order)
- **Thời gian hoàn thành:** 2026-10-09
- **Mã Jira / Subtask:** SN-48 (Epic EP-04 / S4-01)
- **Tiêu đề:** "Là Nhân viên kinh doanh, tôi muốn sao chép một đơn cũ thành đơn mới, để tạo đơn định kỳ cho khách quen trong vài giây."
- **Tiêu chí chấp nhận (AC) đã đạt 100%:**
  1. **Sao chép toàn bộ dòng hàng:** Giữ nguyên danh mục sản phẩm, đơn vị tính (`unit`, `baseUnit`, `conversionRate`), số lượng (`quantity`), khách hàng và điểm giao hàng từ đơn gốc.
  2. **Tái áp giá & chiết khấu hiện hành:** Giá và chiết khấu được áp lại theo bảng giá / chính sách chiết khấu hiện hành của đại lý tại thời điểm sao chép, KHÔNG kế thừa đơn giá và % chiết khấu cũ.
  3. **Trạng thái Nháp:** Bản sao luôn bắt đầu ở trạng thái Nháp (`DRAFT`), có mã đơn mới duy nhất (`DH...`).
  4. **Thao tác nhanh 1 chạm:** Tích hợp nút "Sao chép" (Icon Copy) trên cả Bảng đơn hàng (Desktop), Card đơn hàng (Mobile), và Modal xem chi tiết đơn (`viewOrder`), giúp NVKD tạo đơn định kỳ cho khách quen trong vài giây.
- **Danh sách file tạo mới / thay đổi:**
  - `src/services/orders.service.ts`: Bổ sung hàm `cloneOrder(orderId)` xử lý sao chép cho cả Backend API (`POST /orders/:id/clone`) và local demo storage.
  - `src/pages/orders-page.tsx`: Tích hợp action Sao chép đơn hàng trên Bảng Desktop, Card Mobile và Footer Modal chi tiết đơn hàng, kèm Toast thông báo trạng thái rõ ràng.
- **Trạng thái kiểm thử:**
  - ✅ Build Production: `npm run build` (`tsc -b && vite build`) -> 0 lỗi, build hoàn tất.

---

### [Sprint 4] - [SN-47]: In & Xuất PDF Đơn Hàng Kèm Mã Vạch Tra Cứu Kho Nhanh
- **Thời gian hoàn thành:** 2026-10-09
- **Mã Jira / Subtask:** SN-47 (Epic EP-04 / S4-02)
- **Tiêu đề:** "Là Nhân viên kinh doanh, tôi muốn in hoặc xuất PDF đơn hàng, để đưa đại lý xem lại đơn ngay tại chỗ để xác nhận trước khi rời đi."
- **Tiêu chí chấp nhận (AC) đã đạt 100%:**
  1. **Mẫu in hoàn chỉnh:** Đầy đủ thông tin đại lý (tên, mã, phân cấp, SĐT), điểm giao hàng (người nhận, địa chỉ, ghi chú đường), thời gian (ngày đặt, ngày hẹn giao, NVKD phụ trách), chi tiết dòng hàng (STT, SKU, tên hàng, ĐVT, số lượng, giá niêm yết, chiết khấu %, đơn giá sau CK, thành tiền), tổng tiền hàng, tổng chiết khấu, tổng thanh toán và số tiền viết bằng chữ.
  2. **Mã vạch tra cứu nhanh:** Tích hợp vector SVG barcode chuẩn Code 39 sắc nét, quét được tức thì bằng máy quét mã vạch (Barcode Scanner) tại kho.
  3. **Chữ ký xác nhận 3 bên:** Đại diện đại lý / khách hàng xác nhận tại chỗ, Nhân viên kinh doanh lập đơn, Thủ kho nhận đơn / xuất hàng.
  4. **In ấn & Xuất PDF tiện lợi:** Nút "In đơn hàng" và "Xuất PDF" chuẩn khổ giấy A4 qua CSS `@media print`, ẩn toàn bộ UI thừa, hỗ trợ xem trước trên điện thoại (Mobile-First) để NVKD đưa đại lý xem tại chỗ.
- **Danh sách file tạo mới / thay đổi:**
  - `src/components/barcode-svg.tsx`: Component tạo mã vạch Vector SVG chuẩn công nghiệp cho kho quét nhanh.
  - `src/utils/number-to-words.ts`: Tiện ích chuyển đổi tổng tiền thành chuỗi chữ Tiếng Việt chuẩn hóa kế toán B2B.
  - `src/components/order-print-modal.tsx`: Modal xem trước mẫu in phiếu đơn hàng chuẩn A4, hỗ trợ in trực tiếp và lưu PDF.
  - `src/types/order.ts`: Bổ sung `receiverName` và `roadNote` vào interface `DeliveryPoint`.
  - `src/pages/orders-page.tsx`: Tích hợp nút mở modal In / Xuất PDF trên Bảng Desktop, Card Mobile và Modal chi tiết đơn.
- **Trạng thái kiểm thử:**
  - ✅ Build Production: `npm run build` (`tsc -b && vite build`) -> 0 lỗi, build hoàn tất.



### [Sprint 4] - [SN-43]: Giao Di?n G?i � M?t H�ng Khi G� �on & Th�m Nhanh �on G?n Nh?t (1-Click Reorder)
- **Th?i gian ho�n th�nh:** 2026-10-09
- **M� Jira / Task:** SN-43 (Parent Story: SN-39 / S4-04 - Sprint 4)
- **Ti�u d?:** "L� Nh�n vi�n kinh doanh, t�i mu?n xem l?ch s? mua h�ng c?a d?i l� ngay khi g� don, d? g?i � d�ng m?t h�ng kh�ch v?n l?y d?u thay v� ph?i h?i l?i."
- **Ti�u ch� ch?p nh?n (AC) d� d?t 100%:**
  1. **AC1 - G?i � m?t h�ng thu?ng mua trong 3 th�ng:**
     - Ngay khi Sales Rep ch?n d?i l�, t? d?ng t?i danh s�ch m?t h�ng d?i l� thu?ng l?y trong 3 th�ng qua.
     - Hi?n th? d?y d? th�ng tin: T�n s?n ph?m, SKU, badge "SL b�nh qu�n: X (�on v?)", s? l?n d� mua, ng�y mua g?n nh?t v� s? lu?ng l?n cu?i.
     - � ch?nh nhanh s? lu?ng g?i � (kh?i t?o m?c d?nh b?ng s? lu?ng b�nh qu�n) k�m n�t to "+ Th�m v�o don" ho?c badge "? �� c� trong don" n?u h�ng d� n?m trong don.
  2. **AC2 - Th�m nhanh c? nh�m h�ng d� mua l?n tru?c (1-Click Reorder):**
     - Hi?n th? banner/card don h�ng th�nh c�ng g?n nh?t: M� don, ng�y mua, t?ng ti?n v� s? lu?ng m?t h�ng.
     - N�t h�nh d?ng nhanh "? Th�m nhanh nh�m h�ng l?n tru?c": 1 ch?m t? d?ng d? to�n b? danh s�ch m?t h�ng v� s? lu?ng c?a don cu v�o b?ng don h�ng dang g� d?, �p d?ng chi?t kh?u t? d?ng theo ch�nh s�ch hi?n h�nh (calculateDiscount) k�m toast th�ng b�o r� r�ng.
  3. **AC3 - Tuong th�ch ph�n quy?n & Tr?i nghi?m th?c d?a (UI_GUIDELINES.md):**
     - Hi?n th? th�ng b�o th�n thi?n n?u kh�ng c� quy?n ph? tr�ch d?i l� (403 Forbidden).
     - Ph�n t�ch r� r�ng tr?ng th�i �ang t?i (Skeleton), Tr?ng (Empty state: "�?i l� chua c� l?ch s? mua h�ng trong 3 th�ng qua").
     - T?i uu Mobile/Tablet v?i n�t b?m to >= 44px, bo g�c m?m m?i, h? m�u Indigo-Purple d?ng nh?t v?i thuong hi?u LOHA SALES.
- **Danh s�ch file t?o m?i / thay d?i:**
  - src/types/order-suggestion.types.ts (T?o m?i: SuggestedProductItem, LatestOrderItem, LatestOrderSummary, CustomerPurchaseHistoryResponse kh?p 100% v?i Backend).
  - src/services/order-suggestions.service.ts (T?o m?i: orderSuggestionsService g?i API t?p trung qua piClient k�m fallback demo an to�n).
  - src/components/order-suggestions-panel.tsx (T?o m?i: Component widget hi?n th? l?ch s? g?i � 3 th�ng v� n�t 1-click reorder).
  - src/pages/orders-page.tsx (C?p nh?t: T�ch h?p OrderSuggestionsPanel v�o Bu?c 2 t?o don h�ng, c�c handler handleAddSuggestedItem v� handleReorderPreviousOrder).
- **Tr?ng th�i ki?m th?:**
  - Frontend ESLint: 
px eslint -> 0 l?i, 0 warnings.
  - Frontend Build: 
pm run build (	sc -b && vite build) -> 0 l?i, build production ho�n t?t trong 2.35s.
