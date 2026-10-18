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



### [Sprint 4] - [SN-43]: Giao Diện Gợi Ý Mặt Hàng Khi Gõ Đơn & Thêm Nhanh Đơn Gần Nhất (1-Click Reorder)
- **Thời gian hoàn thành:** 2026-10-09
- **Mã Jira / Task:** SN-43 (Parent Story: SN-39 / S4-04 - Sprint 4)
- **Tiêu đề:** "Là Nhân viên kinh doanh, tôi muốn xem lịch sử mua hàng của đại lý ngay khi gõ đơn, để gợi ý đúng mặt hàng khách vẫn lấy đều thay vì phải hỏi lại."
- **Tiêu chí chấp nhận (AC) đã đạt 100%:**
  1. **AC1 - Gợi ý mặt hàng thường mua trong 3 tháng:**
     - Ngay khi Sales Rep chọn đại lý, tự động tải danh sách mặt hàng đại lý thường lấy trong 3 tháng qua.
     - Hiển thị đầy đủ thông tin: Tên sản phẩm, SKU, badge "SL bình quân: X (Đơn vị)", số lần đã mua, ngày mua gần nhất và số lượng lần cuối.
     - Ô chỉnh nhanh số lượng gợi ý (khởi tạo mặc định bằng số lượng bình quân) kèm nút to "+ Thêm vào đơn" hoặc badge "✓ Đã có trong đơn" nếu hàng đã nằm trong đơn.
  2. **AC2 - Thêm nhanh cả nhóm hàng đã mua lần trước (1-Click Reorder):**
     - Hiển thị banner/card đơn hàng thành công gần nhất: Mã đơn, ngày mua, tổng tiền và số lượng mặt hàng.
     - Nút hành động nhanh "⚡ Thêm nhanh nhóm hàng lần trước": 1 chạm tự động đổ toàn bộ danh sách mặt hàng và số lượng của đơn cũ vào bảng đơn hàng đang gõ dở, áp dụng chiết khấu tự động theo chính sách hiện hành (calculateDiscount) kèm toast thông báo rõ ràng.
  3. **AC3 - Tương thích phân quyền & Trải nghiệm thực địa (UI_GUIDELINES.md):**
     - Hiển thị thông báo thân thiện nếu không có quyền phụ trách đại lý (403 Forbidden).
     - Phân tách rõ ràng trạng thái Đang tải (Skeleton), Trống (Empty state: "Đại lý chưa có lịch sử mua hàng trong 3 tháng qua").
     - Tối ưu Mobile/Tablet với nút bấm to >= 44px, bo góc mềm mại, hệ màu Indigo-Purple đồng nhất với thương hiệu LOHA SALES.
- **Danh sách file tạo mới / thay đổi:**
  - `src/types/order-suggestion.types.ts` (Tạo mới: SuggestedProductItem, LatestOrderItem, LatestOrderSummary, CustomerPurchaseHistoryResponse khớp 100% với Backend).
  - `src/services/order-suggestions.service.ts` (Tạo mới: orderSuggestionsService gọi API tập trung qua apiClient kèm fallback demo an toàn).
  - `src/components/order-suggestions-panel.tsx` (Tạo mới: Component widget hiển thị lịch sử gợi ý 3 tháng và nút 1-click reorder).
  - `src/pages/orders-page.tsx` (Cập nhật: Tích hợp OrderSuggestionsPanel vào Bước 2 tạo đơn hàng, các handler handleAddSuggestedItem và handleReorderPreviousOrder).
- **Trạng thái kiểm thử:**
  - Frontend ESLint: `npx eslint` -> 0 lỗi, 0 warnings.
  - Frontend Build: `npm run build` (`tsc -b && vite build`) -> 0 lỗi, build production hoàn tất trong 2.35s.

### [Sprint 5] - [SN-180]: Giao Diện Quản Lý Sổ Tồn Kho 3 Cột, Giữ Chỗ Tồn Kho & Nhả Tồn Khi Duyệt/Hủy Đơn
- **Thời gian hoàn thành:** 2026-10-10
- **Mã Jira / Task:** SN-180 (Parent Story: SN-229 / S5-06 - Sprint 5)
- **Tiêu đề:** "Là Nhân viên kinh doanh, tôi muốn có tồn được giữ chỗ ngay khi đơn được duyệt, để chắc chắn hàng đã chốt cho khách của mình không bị người khác bán mất."
- **Tiêu chí chấp nhận (AC) đã đạt 100%:**
  1. **AC1 - Đơn duyệt giữ chỗ tồn kho 24 giờ:**
     - Nút "Duyệt đơn" dành riêng cho Sales Manager và Admin trên cả màn hình danh sách, card mobile và chi tiết đơn hàng.
     - Khi bấm duyệt, hiển thị Modal xác nhận cảnh báo giữ chỗ: Toàn bộ sản phẩm được giữ chỗ an toàn trong 24 giờ, tồn khả dụng giảm tương ứng để không ai bán mất.
     - Badge trạng thái trực quan: Đã duyệt (Đang giữ chỗ) kèm hiển thị thời hạn giữ chỗ 24h.
  2. **AC2 - Tự động nhả tồn khi hủy đơn:**
     - Nút "Hủy đơn" trên bảng và modal chi tiết với form bắt buộc nhập lý do hủy.
     - Cảnh báo rõ ràng: Toàn bộ số lượng tồn kho đang giữ chỗ cho đơn này được TỰ ĐỘNG HOÀN LẠI vào kho khả dụng ngay lập tức.
     - Trong modal chi tiết, hiển thị lý do hủy và xác nhận đã nhả tồn giữ chỗ đầy đủ.
  3. **AC3 - Sổ Tồn kho 3 Cột (UI_GUIDELINES.md):**
     - Xây dựng trang StockListPage tại route /inventory/stock.
     - 3 thẻ Metric Card tổng hợp: Tồn thực tế (Physical - xám/xanh), Đang giữ chỗ (Reserved - cam/amber), Tồn khả dụng (Available - xanh ngọc).
     - Bảng sổ tồn kho hiển thị rõ ràng 3 cột theo chuẩn công thức: Tồn khả dụng = Tồn thực tế - Đang giữ chỗ.
     - Click vào số lượng giữ chỗ mở Modal chi tiết xem danh sách các đơn hàng và số lượng đang giữ chỗ (ACTIVE).
- **Danh sách file tạo mới / thay đổi (Frontend):**
  - src/types/inventory.types.ts: Tạo mới các interface StockItem, StockReservation, ApproveOrderResponse, CancelOrderPayload.
  - src/types/order.ts: Bổ sung các trường cancelReason, approverId, approvedAt, reservedUntil vào interface Order.
  - src/services/inventory.service.ts: Bổ sung method getStocks() và getReservations().
  - src/services/orders.service.ts: Bổ sung method approveOrder(orderId) và cancelOrder(orderId, reason).
  - src/pages/inventory/stock-list-page.tsx: Tạo mới trang Sổ tồn kho 3 cột, 3 metric cards, bộ lọc và modal xem chi tiết đơn giữ chỗ.
  - src/routes/index.tsx: Cấu hình route /inventory/stock trỏ về StockListPage phân quyền cho Admin, Sales Manager, Sales Rep, Warehouse.
  - src/pages/orders-page.tsx: Cập nhật OrderStatusBadge hỗ trợ Đã duyệt (Đang giữ chỗ) kèm thời hạn; thêm nút và modal Duyệt đơn & Giữ chỗ 24h; thêm nút và modal Hủy đơn bắt buộc lý do kèm nhả tồn.
- **Trạng thái kiểm thử:**
  - Frontend Build: 
pm run build (	sc -b && vite build) -> 0 lỗi, compile thành công 100%.

---

### [Sprint 4] - [SN-49 & SN-42]: Portal Đặt Hàng Đại Lý 2 Bước, Bảng Chiết Khấu & Đơn Vị Tính, Đồng Bộ Đơn Hàng & Duyệt Real-Time Toàn Hệ Thống
- **Thời gian hoàn thành:** 2026-10-10
- **Mã Jira / Subtask:** SN-49 & SN-42
- **Tiêu chí hoàn thành (AC) đã đạt 100%:**
  1. **Luồng 2 (Số lượng & Chiết khấu) kiểm soát chặt chẽ:** Tab 2 trên Stepper bị khóa, chỉ được mở và chạy khi người dùng bấm nút *"Tiếp tục: Bảng giỏ hàng & Chiết khấu"* ở Bước 1 và đã hoàn thành xác thực (có hàng trong giỏ, có địa chỉ nhận hàng chi tiết và ngày giao hàng).
  2. **Bảng Chính Sách & Chiết Khấu Áp Dụng (Luồng 2):** Xây dựng bảng chiết khấu chi tiết lấy trực tiếp từ bảng giá hiệu lực (`effectivePriceList`) và chính sách phân cấp của đại lý (`AGENT_LEVEL_1`, `AGENT_LEVEL_2`, `RETAIL`). Hiển thị chi tiết từng mặt hàng: Giá niêm yết, % Chiết khấu, Giá sau CK, Số lượng, Đơn vị tính và Số tiền tiết kiệm được.
  3. **Đơn vị tính sau sản phẩm:** Hiển thị rõ ràng đơn vị tính (Lon, Hộp, Chai, Thùng...) ngay sau tên sản phẩm (ví dụ: `(Chai)`) và cạnh ô nhập số lượng trong giỏ hàng và danh mục hàng.
  4. **Đồng bộ Đơn hàng & Duyệt Real-Time toàn hệ thống:**
     - Khi bấm *"Xác nhận gửi đơn hàng"*: Gọi API `POST /api/orders`, lưu vào DB và bộ nhớ, phát sự kiện `loha_orders_updated`, `loha_inventory_updated`, đồng bộ ngay lập tức vào tab "Đơn hàng của tôi", trừ tồn kho và cập nhật công nợ.
     - Phía Quản trị (`OrdersPage`): Lắng nghe `loha_orders_updated` tự động cập nhật danh sách đơn hàng real-time không cần F5. Quản trị viên/Quản lý duyệt đơn (`decideOrder`), trạng thái đơn hàng (`APPROVED`) và công nợ được phát sóng đồng bộ tức thì sang Cổng Portal của Đại lý theo thời gian thực.
  5. **Kết nối Bảng Chính Sách Chiết Khấu Dùng Chung vào Portal Đặt Hàng:**
     - Tích hợp trực tiếp danh sách chính sách chiết khấu theo sản lượng (`DISC-VOL-01`, `DP-205133`...) từ module dùng chung hệ thống vào Luồng 2 của Portal.
     - Tự động nhận diện nấc số lượng đặt mua (`quantity`), tính toán chính xác % chiết khấu sản lượng đạt được, đơn giá sau giảm và số tiền tiết kiệm.
     - Hiển thị trực quan cấu hình các nấc chiết khấu (Q_min ~ Q_max, % giảm), highlight nấc hiện tại đang đạt và gợi ý số lượng cần mua thêm để nâng lên nấc chiết khấu cao hơn.
  6. **Đồng Bộ Linh Hoạt Mức Chiết Khấu Theo Đúng Nấc Số Lượng Thực Tế (SN-28 & SN-49):**
      - Loại bỏ mức chiết khấu cứng 15% khi sản phẩm thuộc chính sách chiết khấu sản lượng của hệ thống.
      - Khi mua 1 món: % Chiết khấu = 0% (Chưa đạt nấc), giá bán bằng giá niêm yết (520.000 đ), tiết kiệm 0 đ, hiển thị thông báo gợi ý nấc tiếp theo: "Mua thêm +9 món để nhận 2%".
      - Khi mua từ 10 - 49 món: % Chiết khấu tự động nhảy thành 2%, giá bán = 509.600 đ, tiết kiệm +104.000 đ.
      - Khi mua từ 50 - 99 món: % Chiết khấu nhảy thành 5%, giá bán = 494.000 đ, tiết kiệm +1.300.000 đ.
      - Khi mua từ 100 - 2000 món: % Chiết khấu nhảy thành 10%, giá bán = 468.000 đ.
      - Khi mua từ 2001+ món: % Chiết khấu nhảy thành 25%, giá bán = 390.000 đ.
      - Tất cả các vị trí hiển thị (Badge trên thẻ giỏ hàng, bảng kê chiết khấu, thanh thông báo quyền lợi và tổng tiền thanh toán) đồng bộ tức thì theo thời gian thực khi gõ số lượng vào ô input.
- **Danh sách file thay đổi:**
  - `src/services/discount-policies.service.ts`: Khởi tạo `DEFAULT_DISCOUNT_POLICIES`, hoàn thiện hàm `getApplicablePolicyInfo` trả về chính xác `nextTier` và `quantityNeededForNext` khi số lượng chưa đạt nấc tối thiểu.
  - `src/pages/agency-portal-page.tsx`: Xây dựng hàm `getItemEffectiveDiscount`, đồng bộ hóa % chiết khấu và giá bán theo nấc sản lượng thực tế trong toàn bộ giỏ hàng, bảng chi tiết chiết khấu, tổng kết tiền và payload gửi lên server.
  - `src/services/orders.service.ts`: Cập nhật `createOrder`, `decideOrder`, `cancelOrder` phát sóng sự kiện `loha_orders_updated` và `loha_inventory_updated` theo thời gian thực.
  - `src/pages/orders-page.tsx`: Lắng nghe sự kiện `loha_orders_updated` và `storage` để tự động làm mới danh sách đơn hàng cho Quản trị viên/NVKD theo thời gian thực.
- **Trạng thái kiểm thử:**
  - ✅ Unit Test Logic Nấc Chiết Khấu: Kiểm thử 9 trường hợp số lượng (1, 9, 10, 49, 50, 99, 100, 2000, 2001) vượt qua 100% (`test_discount_tiers.ts`).
  - ✅ TypeScript & Build Production: `npm run build` (`tsc -b && vite build`) hoàn thành thành công 100% (0 lỗi, 0 warnings), toàn bộ type-safe, không dùng `any`, Controlled Components cho toàn bộ ô input.
  - ✅ Backend TypeScript: `npx tsc --noEmit` đạt 0 lỗi.
  - ✅ Dev Server Vite: HMR hoạt động trơn tru không còn bất kỳ lỗi transform JSX nào.

---

### [Sprint 7] - [SN-209]: In & Tải PDF Phiếu Thu Tiền Cho Khoản Đã Ghi Nhận (Kế Toán Công Nợ)
- **Thời gian hoàn thành:** 2026-10-15
- **Mã Jira / Subtask:** SN-209 (Parent Story: SN-201 / S7-09 - Sprint 7)
- **Tiêu đề:** "Là Kế toán công nợ, tôi muốn in phiếu thu cho mỗi khoản đã ghi nhận, để đại lý có chứng từ ngay tại chỗ khi đưa tiền."
- **Ràng buộc:** Hoàn thành đúng và đủ 2 yêu cầu trong Description (không tự ý thêm luồng tạo/phê duyệt).
  1. Hiển thị đủ 5 trường thông tin: Mã duy nhất, thông tin đại lý, số tiền, hình thức, người thu.
  2. Cung cấp khả năng In (Print trực tiếp) hoặc Tải PDF (Download PDF).
- **Danh sách file tạo mới / thay đổi (Frontend):**
  - `src/types/receipt.ts` (Tạo mới: Types & Interfaces chuẩn cho Receipt, ReceiptPrintData, PaymentMethod, ReceiptStatus)
  - `src/services/receipts.service.ts` (Tạo mới: Service gọi API `GET /receipts`, `GET /receipts/:id/print` và `GET /receipts/:id/pdf` tải blob)
  - `src/components/receipt-print-template.tsx` (Tạo mới: Component Modal in phiếu thu chuẩn nhận diện thương hiệu LOHA GOLD, tuân thủ `UI_GUIDELINES.md`, hiển thị sắc nét 5 trường thông tin, tích hợp Hidden Iframe In ấn độc lập A4/A5 và nút Tải PDF)
  - `src/pages/invoices-page.tsx` (Cập nhật: Bổ sung Tab "Phiếu thu tiền & Đối trừ (SN-209)", hiển thị danh sách phiếu thu đã ghi nhận, tích hợp các nút bấm In phiếu và Tải PDF trực tiếp)
- **Chi tiết kỹ thuật & UX:**
  - **Đảm bảo 100% 5 trường thông tin bắt buộc:**
    1. Mã duy nhất: `receiptCode` (`PT2610-0001`, `PT2610-0002`...) font-mono bold, kèm Barcode code39.
    2. Thông tin đại lý: Tên đại lý, Mã đại lý, Số điện thoại liên hệ, Địa chỉ giao dịch.
    3. Số tiền thu: Số tiền định dạng VND font-extrabold màu xanh lục `emerald-700` kèm dòng chữ tiếng Việt in nghiêng trang trọng.
    4. Hình thức thu: Tiền mặt, Chuyển khoản ngân hàng... kèm badge icon trực quan.
    5. Người thu tiền: Họ tên nhân viên kế toán lập phiếu kèm badge chức vụ "Kế toán công nợ".
  - **Tích hợp 2 nút hành động:**
    - **In phiếu:** Sử dụng engine Hidden Iframe chuyên dụng (loại bỏ hoàn toàn các phần tử UI thừa, background hay thanh cuộn), chuẩn hóa `@page { size: A4 portrait; margin: 10mm 12mm 10mm 12mm; }`.
    - **Tải PDF:** Kết nối endpoint Backend `GET /api/receipts/:id/pdf` tải file PDF trực tiếp về máy tính (`phieu-thu-[code].pdf`).
  - **Tuân thủ UI_GUIDELINES.md:** Bo góc `rounded-xl` cho modal, `rounded-lg` cho nút bấm, font-mono cho mã số, màu chủ đạo `indigo-600`, không dùng `any`, thụt lề 2 spaces, trailing commas.
- **Trạng thái kiểm thử:**
  - ✅ ESLint: `npx eslint src/types/receipt.ts src/services/receipts.service.ts src/components/receipt-print-template.tsx src/pages/invoices-page.tsx` -> 0 lỗi, 0 warnings.
  - ✅ Frontend Build: `npm run build` (`tsc -b && vite build`) -> 0 lỗi, compile thành công 100%.

---

### [Sprint 5] - [SN-188]: Trang Con Tạo Phiếu Xuất Kho, Gợi Ý Lô FEFO & Popup Đổi Lô Kèm Lý Do Ghi Đè
- **Thời gian hoàn thành:** 2026-10-17
- **Mã Jira / Task:** SN-188 (Sprint 5 - Soạn hàng & Xuất kho FEFO)
- **Tiêu đề:** "Giao diện trang con Tạo phiếu xuất kho & Chi tiết phiếu xuất, hiển thị lô gợi ý FEFO, popup đổi lô bắt buộc lý do ghi đè, và router chuẩn theo UI_GUIDELINES.md"
- **Danh sách file thay đổi:**
  - `src/services/shipments.service.ts`: Cập nhật hàm `getBatchesBySku` xử lý response đa dạng, `createFefoShipment`, `suggestFefo` và bổ sung fallback cho `getShipmentById`.
  - `src/pages/create-shipment-page.tsx`: Tối giản giao diện trang tạo phiếu: loại bỏ hoàn toàn khối sub-header trùng lặp và banner FEFO; vào thẳng Khu vực 1 (Thông tin chung đơn hàng & vận chuyển) và Khu vực 2 (Bảng sản phẩm & phân bổ lô FEFO); toàn bộ nút hành động tập trung ở chân trang cố định.
  - `src/pages/shipments-page.tsx`: Điều hướng nút `[+ Tạo Phiếu Lẻ]` và click mã phiếu / nút `[Chi tiết]` trực tiếp sang trang con `/inventory/shipments/create` và `/inventory/shipments/:id` (không dùng modal inline nhỏ).
  - `src/routes/index.tsx`: Đăng ký toàn bộ các route chuẩn: `/inventory/shipments/create`, `/inventory/shipments/:id`, `/app/inventory/shipments/create`, `/app/inventory/shipments/:id`.
  - `src/layouts/header.tsx`: Bổ sung cấu hình breadcrumbs cho phân hệ Soạn hàng & Xuất kho (`getPageHeaderInfo`), đưa breadcrumb phân cấp `Soạn hàng & Xuất kho > Tạo phiếu xuất kho` lên Header cố định và loại bỏ chữ mặc định "Hệ thống LOHA SALES".
- **Trạng thái kiểm thử:**
  - Frontend Build: `npm run build` (`tsc -b && vite build`) -> 0 lỗi, compile thành công 100%.

---

### [Sprint 5] - [SN-188-FIX]: Sửa Lỗi Nghiệp Vụ Dropdown 'Chọn Đơn Hàng Cần Xuất Kho'
- **Thời gian hoàn thành:** 2026-10-17
- **Mã Jira / Task:** SN-188-FIX (Nghiệp vụ Xuất kho ERP)
- **Vấn đề đã khắc phục:** Khắc phục lỗi dropdown hiển thị tất cả các trạng thái đơn hàng (cho phép chọn cả đơn CANCELLED, DRAFT, PENDING).
- **Danh sách file thay đổi:**
  - `src/types/order.ts`: Bổ sung `forShipment?: boolean | string` vào `OrderQueryParams`.
  - `src/services/orders.service.ts`: Thêm method `getOrdersForShipment(params)` kết nối `/orders/for-shipment`, bổ sung xử lý fallback lọc chặt chẽ chuẩn ERP.
  - `src/pages/create-shipment-page.tsx`:
    - Gọi API `ordersService.getOrdersForShipment({ limit: 100 })`.
    - Thiết lập bộ lọc an toàn 2 lớp tại client: Chỉ nhận các đơn có trạng thái `APPROVED`, `READY_TO_SHIP`, `PROCESSING`; loại trừ triệt để `CANCELLED`, `DRAFT`, `PENDING*`.
    - Bổ sung xác thực kiểm tra trạng thái trong `handleSelectOrder` chặn chọn đơn chưa duyệt hoặc đã hủy.
    - Cập nhật text option rõ ràng: `-- Chọn đơn hàng cần xuất kho (Đã duyệt) --` và hiển thị nhãn `[Mã đơn] Tên KH - Số lượng SP (Đã duyệt)`.
  - `src/components/create-shipment-modal.tsx`: Đồng bộ gọi `getOrdersForShipment` và lọc bỏ các đơn không hợp lệ.
- **Trạng thái kiểm thử:**
  - Frontend Build: `npm run build` (`tsc -b && vite build`) -> 0 lỗi, compile thành công 100%.

---

### [Sprint 5] - [SN-188-RBAC]: Quản Lý Đơn Hàng Phát Sinh Theo Gán Đại Lý Cho Kho (Chuẩn Nghiệp Vụ Thủ Kho Miền Bắc)
- **Thời gian hoàn thành:** 2026-10-17
- **Mã Jira / Task:** SN-188-RBAC (Quản lý đơn hàng phát sinh theo cấu hình Gán đại lý cho kho)
- **Bản chất nghiệp vụ:**
  - Thủ kho đăng nhập tài khoản Hoàng Minh Tuấn (Thủ kho Miền Bắc - `KHO-MB-01`).
  - Trong phân hệ "Gán đại lý cho kho" (`app_agency_default_warehouses`), Kho Miền Bắc được gán các đại lý (Minh Khang, Toàn Cầu, Hoàng Gia, An Phát, Phương Đông, Bảo Châu...). Khi tạo đơn cho các đại lý này thì hàng trừ ở Kho Miền Bắc.
  - Do đó, Thủ kho Miền Bắc chỉ quản lý các đơn hàng phát sinh từ Kho Miền Bắc (đơn hàng của các đại lý được gán cho kho Miền Bắc hoặc đơn có `warehouseId` chỉ định Kho Miền Bắc).
  - Tuyệt đối KHÔNG lọc theo chuỗi vùng miền địa chỉ (khu vực hay tỉnh thành), mà lọc trực tiếp theo bảng cấu hình Gán đại lý cho kho (`agencyDefaults` / `app_agency_default_warehouses`).
- **Danh sách file thay đổi:**
  - `src/types/order.ts`: Bổ sung `warehouseId?: string` vào `OrderQueryParams`.
  - `src/services/orders.service.ts`: Truyền `warehouseId` trong `getOrders`, cập nhật fallback lọc đơn hàng theo kho.
  - `src/pages/create-shipment-page.tsx`:
    - Tải bảng phân công đại lý cho kho qua `warehouseService.getAgencyDefaults()`.
    - Tự động nhận diện tài khoản nhân viên kho và gán đúng kho phụ trách (Thủ kho Hoàng Minh Tuấn cố định vào Kho Miền Bắc).
    - Khóa trường chọn kho đối với nhân viên kho để tránh xuất nhầm kho khác.
    - Bộ lọc dropdown "Chọn Đơn hàng cần xuất kho": Lọc chuẩn 100% theo các đại lý được gán cho kho trong `agencyDefaults` (`filteredOrdersForWarehouse`). Đơn hàng của các đại lý gán cho Kho Miền Bắc (Minh Khang, Toàn Cầu, Hoàng Gia, An Phát, Phương Đông, Bảo Châu...) được hiển thị; các đơn hàng của đại lý gán cho Kho Miền Trung (Đà Nẵng `cust-dl-dn-001`,...) hay Kho Miền Nam bị loại bỏ hoàn toàn.
- **Trạng thái kiểm thử:**
  - Frontend Build: `npm run build` (`tsc -b && vite build`) -> 0 lỗi, compile thành công 100%.
  - Backend Build: `npm run build` (`nest build`) -> 0 lỗi, compile thành công 100%.

---

### [Sprint 5] - [SN-188-NOTIF]: Thông Báo Cá Nhân Tức Thì Cho Thủ Kho Khi Tạo Phiếu Xuất Kho
- **Thời gian hoàn thành:** 2026-10-17
- **Mã Jira / Task:** SN-188-NOTIF (Personal Notification for Shipment Creation)
- **Nghiệp vụ:**
  - Sau khi thủ kho xác nhận tạo phiếu xuất kho thành công, ngoài việc hệ thống gửi thông báo cho Quản lý kho, hệ thống **tự động lưu và phát thông báo cá nhân cho chính tài khoản thủ kho tạo phiếu** lên chuông thông báo Header.
  - Thông báo hiển thị rõ ràng: *"Bạn đã tạo thành công phiếu xuất kho [Mã phiếu] cho đơn hàng [Mã đơn]. Hàng hóa đã được phân bổ và trừ tồn theo chuẩn FEFO."*
  - Bấm vào thông báo sẽ mở ngay màn hình chi tiết phiếu xuất kho để kiểm tra lại bất cứ lúc nào.
- **Danh sách file thay đổi:**
  - `HTBH_Backend/src/modules/shipments/shipments.service.ts`: Truyền thông tin người tạo (`creatorId`, `creatorName`, `creatorUsername`) sang notification service.
  - `HTBH_Backend/src/modules/notifications/notifications.service.ts`: Gửi thông báo cá nhân cho chính người tạo phiếu xuất trong `notifyShipmentFefoCreated` và `notifyShipmentBatchOverridden`.
  - `HTBH_Frontend/src/pages/create-shipment-page.tsx`: Bắn sự kiện `loha_shipment_created` khi tạo phiếu thành công.
  - `HTBH_Frontend/src/components/notification-bell.tsx`: Lắng nghe sự kiện `loha_shipment_created`, lưu thông báo cá nhân vào danh sách thông báo và LocalStorage, hiển thị icon `PackageCheck` màu xanh ngọc/tím.
- **Trạng thái kiểm thử:**
  - Frontend Build: `npm run build` (`tsc -b && vite build`) -> 0 lỗi, compile thành công 100%.
  - Backend Build: `npm run build` (`nest build`) -> 0 lỗi, compile thành công 100%.

---

### [Sprint 6/7] - [SN-200]: Giao Diện Phát Hành Hoá Đơn Bán Hàng Từ Phiếu Thực Giao & In/Xuất PDF (Kế Toán Công Nợ)
- **Thời gian hoàn thành:** 2026-10-18
- **Mã Jira / Task:** SN-200 (Parent Story: SN-201 / Phân hệ Hóa đơn & Thu nợ)
- **Tiêu đề:** "Là Kế toán công nợ, tôi muốn phát hành hoá đơn bán hàng từ phiếu đã giao, để xuất hoá đơn đúng số hàng thực giao thay vì số hàng đặt."
- **5 Ràng buộc nghiệp vụ hoàn thành 100%:**
  1. **Tính tiền theo số lượng thực giao:** Bảng preview và dữ liệu hóa đơn tính thành tiền dựa trên `deliveredQuantity` từ các phiếu giao hàng đã ký nhận, loại bỏ số lượng đặt ban đầu.
  2. **Số hóa đơn liên tục không trùng và không nhảy cóc:** BE sử dụng cơ chế PostgreSQL Sequence Atomic Upsert + In-memory Mutex Locking. Dãy số hiển thị trên FE luôn tăng tuần tự dạng `HD{YY}{MM}-0001`, `HD{YY}{MM}-0002`...
  3. **Gộp nhiều phiếu giao cùng đại lý:** Modal hỗ trợ Kế toán chọn 1 Đại lý, tự động lọc các phiếu giao đã hoàn tất (`DELIVERED`) chưa xuất hóa đơn, cho phép tick chọn một hoặc nhiều phiếu để gộp chung vào 1 hóa đơn bán hàng.
  4. **Không sửa và không xóa:** Danh sách hóa đơn (cả Desktop Table và Mobile Card) **tuyệt đối không hiển thị nút Sửa hoặc Xóa**. Backend khóa cứng bằng mã lỗi `MethodNotAllowedException` khi gọi PUT/PATCH/DELETE.
  5. **In hoặc xuất PDF:** Trang bị nút "In" (gọi `window.print()` qua bản in HTML chuẩn VAT) và nút "Tải PDF" (gọi API tải trực tiếp file `.pdf` chất lượng cao xuất từ PDFKit).
- **Danh sách file thay đổi & tạo mới:**
  - `src/services/invoices.service.ts`: Khai báo Interface `UnbilledDeliverySlipItem`, `UnbilledDeliverySlip`, `IssueInvoicePayload`; triển khai API tập trung `getUnbilledDeliveries` và `issueInvoice`.
  - `src/components/issue-invoice-modal.tsx`: Component Modal phát hành hóa đơn theo quy chuẩn `UI_GUIDELINES.md` (`rounded-xl`, màu chủ đạo `indigo-600`, không dùng gradient đại trà, responsive).
  - `src/pages/invoices-page.tsx`: Bổ sung nút CTA "Phát hành hóa đơn", tích hợp `IssueInvoiceModal`, bổ sung nút "In" và "Tải PDF" trên từng dòng hóa đơn và mobile card view.
  - `src/hooks/use-debt-report.ts`: Chuẩn hóa kiểu `debounceTimerRef` sang `ReturnType<typeof setTimeout>`.
- **Trạng thái kiểm thử:**
  - Frontend Build: `npm run build` (`tsc -b && vite build`) -> 0 lỗi, compile thành công 100%.

