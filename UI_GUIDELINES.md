# UI/UX DESIGN SYSTEM GUIDELINES — LOHA SALES

Tài liệu này là **bộ quy chuẩn thiết kế và lập trình giao diện duy nhất** cho toàn bộ hệ thống phần mềm **LOHA SALES**. Mọi thành viên khi thiết kế UI, viết code HTML/Tailwind CSS hoặc dựng React Component **BẮT BUỘC** phải tuân thủ nghiêm ngặt để đảm bảo 100% tính đồng nhất thị giác và trải nghiệm người dùng (UX).

> **Mục tiêu cốt lõi:** *"Sáng sủa, sạch sẽ, hiện đại, dễ thao tác và mang hơi hướng B2B SaaS tinh tế (Notion, X, Linear)."*

---

## I. TRIẾT LÝ THIẾT KẾ & VIBE TỔNG THỂ

1. **Sáng và Sạch (Clean & Light):** Luôn dùng nền sáng (trắng `bg-white` hoặc xám cực nhạt `bg-slate-50`). Tránh thiết kế "đóng hộp", khô khan, nặng nề như phần mềm quản lý ERP truyền thống.
2. **Không gian thoáng (Whitespace & Card-based):** Gom nhóm dữ liệu liên quan vào các Thẻ (Card), khoảng đệm (padding) thoáng đãng `16–24px` (`p-4 sm:p-5`), không nhồi nhét thông tin dày đặc.
3. **Nhận diện thương hiệu (Brand Identity):**
   - **Logo LOHA SALES là nguồn tham chiếu màu chuẩn:** Màu thương hiệu chủ đạo duy nhất là **Blue-Purple / Indigo Purple** (`indigo-600` / `#4F46E5`).
   - **CẤM:** Không sử dụng màu tím thiên hồng/magenta hoặc xanh Lavi thuần làm màu thương hiệu chính.
   - **Brand Gradient:** Chỉ được sử dụng cho Logo, khu vực nhận diện thương hiệu hoặc Hero Banner đặc biệt. **CẤM dùng gradient đại trà** cho Button, Input, Table, Card, Toast hay Badge. Giao diện chức năng phải ưu tiên màu Solid để rõ ràng, chuyên nghiệp.
4. **Trải nghiệm thao tác (Touch-friendly & Responsive):** Nút bấm, ô nhập to rõ, dễ bấm trên cả điện thoại (Touch target tối thiểu `36–40px`). Phản hồi trực quan tức thì khi Hover, Focus, Active hoặc Loading.

---

## II. HỆ THỐNG DESIGN TOKENS NỀN TẢNG (FOUNDATIONS)

### 1. Bảng màu chuẩn (Color System)

- **Primary Brand (Blue-Purple / Indigo Purple):**
  - `Primary`: `indigo-600` (`#4F46E5`) — Nút chính (CTA), link quan trọng, menu active, focus ring, icon điểm nhấn.
  - `Primary Hover`: `indigo-700` (`#4338CA`).
  - `Primary Active`: `indigo-800` (`#3730A3`).
  - `Primary Light / Subtle`: `indigo-50` — Nền selected item, hover menu, viền `indigo-200` / `indigo-300`.
- **Semantic Colors (Màu ngữ nghĩa — Bắt buộc cố định toàn hệ thống):**
  - `Success` (Green/Emerald): `emerald-600`, nền `emerald-50`, viền `emerald-200`, chữ `emerald-800` — Thao tác thành công, đơn đã duyệt, tồn kho khả dụng.
  - `Warning` (Amber/Yellow): `amber-600`, nền `amber-50`, viền `amber-200`, chữ `amber-800` — Cảnh báo công nợ, giao thiếu hàng, đơn chờ duyệt.
  - `Danger / Error` (Red/Rose): `rose-600`, nền `rose-50`, viền `rose-200`, chữ `rose-800` — Thất bại, hủy đơn, từ chối, khóa đại lý, hết hàng trong kho.
  - `Info` (Sky/Blue): `sky-600`, nền `sky-50`, viền `sky-200`, chữ `sky-800` — Hướng dẫn, thông tin phụ trợ.
  *(Quy tắc: Tuyệt đối không dùng màu tím thương hiệu thay thế cho Semantic Colors).*
- **Neutral Colors (Slate Scale — Tối ưu độ tương phản):**
  - Nền trang (Page background): `bg-slate-50/60` hoặc `bg-slate-100/50`.
  - Nền khối (Surface / Card): `bg-white`.
  - Đường viền (Border / Divider): `border-slate-200` hoặc `border-slate-200/90`.
  - Chữ tiêu đề & Số liệu quan trọng: `text-slate-900`.
  - Chữ nội dung chính: `text-slate-800`.
  - Chữ phụ & Nhãn mô tả: `text-slate-600` / `text-slate-500`.
  - Chữ mờ / Placeholder: `text-slate-400`.

### 2. Typography & Kiểu chữ

- **Font Family:** Sử dụng font Sans-serif hiện đại: Inter, Roboto hoặc system-ui. Khả năng hiển thị tiếng Việt rõ ràng, dấu thanh chuẩn xác.
- **Font Monospace:** Bắt buộc dùng `font-mono font-semibold` cho tất cả các loại Mã định danh (Mã đơn hàng `DH-...`, Mã SKU sản phẩm `SP-...`, Mã đại lý `DL-...`).
- **Thang cỡ chữ chuẩn (Type Scale):**
  - `text-2xl` (24px) / `text-xl` (20px): Tiêu đề trang (`h1`), Chỉ số KPI tổng quan lớn.
  - `text-base` (16px) font-bold: Tiêu đề khối section (`h2`/`h3`), Card Header, Modal Title.
  - `text-sm` (14px): Dữ liệu bảng chính, giá trị tiền tệ nổi bật, menu điều hướng chính.
  - `text-xs` (12px): Nhãn trường nhập liệu (Label), nút bấm, nội dung input, mô tả phụ, text bảng phụ.
  - `text-[11px]` - `text-[10px]`: Metadata, ngày giờ phụ, ghi chú chân trang, sub-badges.
- **Font Weight:** Chỉ sử dụng 4 mức:
  - `Regular` (400): Nội dung văn bản thông thường.
  - `Medium` (500): Nhãn form (Label), dropdown option, navigation.
  - `Semibold` (600): Nút bấm (Button), badge trạng thái, tiêu đề phụ.
  - `Bold` (700) / `Extrabold` (800): Tiêu đề lớn, tổng tiền phải thu.

### 3. Chuẩn hóa Bo góc (Border Radius) & Đổ bóng (Shadow) — [QUY TẮC CỐT LÕI]

Nhằm đảm bảo giao diện phần mềm B2B SaaS chuyên nghiệp, hiện đại, sắc sảo và đồng bộ tuyệt đối:

1. **Containers & Thẻ Card lớn (`rounded-xl` — 12px cap):**
   - Áp dụng cho: Khối thẻ KPI, Thẻ Card nội dung, Hộp thoại Modal Dialog, Popover, Khung bao bọc Bảng (Table wrapper), Khung chứa Bộ lọc (Filter box).
   - **CẤM:** Không sử dụng bo góc quá lớn (`rounded-2xl` 16px, `rounded-3xl` 24px) cho các container/card trong hệ thống quản trị vì gây cảm giác méo mó, trẻ con hóa cấu trúc B2B và lãng phí diện tích hiển thị.
2. **Các điều khiển tương tác - Interactive Controls (`rounded-lg` — 8px):**
   - Áp dụng cho: Nút bấm (Buttons), Ô nhập liệu (Inputs), Dropdown Selects, Date Pickers, Action Menus, Toggle switches, Tooltips.
   - Thống nhất toàn bộ control có cùng bán kính cong 8px để đạt tính hài hòa thị giác.
3. **Tags, Mini Badges & Trạng thái (`rounded-full` hoặc `rounded-md` — 6px):**
   - Áp dụng `rounded-full` cho các viên thuốc trạng thái (Status pills) và chấm chỉ báo (Status dots). Áp dụng `rounded-md` cho badge phụ trợ bên trong bảng.
4. **Đổ bóng (Box Shadow):**
   - Sử dụng soft shadow cực nhẹ: `shadow-xs`, `shadow-2xs` cho button/input; `shadow-xs` hoặc `shadow-sm` cho card; `shadow-xl` / `shadow-2xl` cho Modal Dialog. Tuyệt đối không dùng shadow đen đậm thô kệch.

---

## III. BỘ CODE MẪU TAILWIND CHUẨN (COPY-PASTE CHEAT SHEET)

Mọi thành viên trong dự án **chỉ cần copy chính xác các chuỗi class này** khi dựng component để đảm bảo 100% không bị lệch kiểu dáng:

### 1. Nút bấm (Buttons)
```tsx
// Nút hành động chính (Primary CTA)
<button className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
  <Plus className="w-3.5 h-3.5 shrink-0" />
  <span>Tạo Đơn hàng</span>
</button>

// Nút thứ cấp / Outline (Secondary)
<button className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs cursor-pointer">
  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
  <span>Làm mới</span>
</button>

// Nút nguy hiểm / Xóa / Hủy (Danger)
<button className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-all cursor-pointer">
  <Trash2 className="w-3.5 h-3.5 shrink-0" />
  <span>Hủy đơn</span>
</button>

// Nút Icon nhỏ (Icon Button)
<button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" title="Xem chi tiết">
  <Eye className="w-4 h-4" />
</button>
```

### 2. Ô nhập liệu & Dropdown (Inputs & Selects)
```tsx
// Ô Text Input chuẩn (Chiều cao cố định 38px)
<div className="space-y-1.5">
  <label className="text-xs font-bold text-slate-700 flex items-center gap-1 h-5">
    <span>Tên đại lý</span>
    <span className="text-rose-500">*</span>
  </label>
  <input
    type="text"
    placeholder="Nhập tên đại lý..."
    className="w-full h-[38px] px-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400"
  />
</div>

// Dropdown Select chuẩn
<select className="w-full h-[38px] px-3 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs">
  <option value="ALL">Tất cả trạng thái</option>
</select>
```

### 3. Thẻ chứa nội dung (Card Container)
```tsx
<div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
  {/* Header của Card */}
  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
    <div className="flex items-center gap-2.5">
      <Package className="w-5 h-5 text-indigo-600" />
      <h3 className="text-base font-bold text-slate-900">Danh sách sản phẩm</h3>
    </div>
  </div>
  {/* Nội dung bên trong Card */}
</div>
```

### 4. Bảng dữ liệu (Data Table Wrapper & Rows)
```tsx
<div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-xs">
  <div className="overflow-x-auto">
    <table className="w-full text-sm divide-y divide-slate-100">
      <thead>
        <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          <th className="px-4 py-3 text-left w-[18%]">Mã đơn</th>
          <th className="px-4 py-3 text-left w-[32%]">Đại lý</th>
          <th className="px-4 py-3 text-left w-[14%]">Ngày giao</th>
          <th className="px-4 py-3 text-right w-[16%]">Tổng phải thu</th>
          <th className="px-4 py-3 text-center w-[10%]">Trạng thái</th>
          <th className="px-4 py-3 text-right w-[10%] min-w-[105px]">Thao tác</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100/90 font-medium">
        <tr className="hover:bg-indigo-50/25 transition-colors group">
          {/* Cột mã đơn */}
          <td className="px-4 py-3.5 whitespace-nowrap">
            <span className="font-mono text-xs font-semibold text-indigo-700 bg-indigo-50/80 px-2.5 py-1 rounded-md border border-indigo-200/60">
              DH-2026-001
            </span>
          </td>
          {/* Cột tiền tệ (chống rớt dòng, font số đẹp) */}
          <td className="px-4 py-3.5 text-right whitespace-nowrap">
            <span className="font-bold text-slate-900 tabular-nums text-sm">
              {formatCurrency(totalAmount)}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
  {/* Gắn liền Pagination ở chân bảng */}
</div>
```

---

## IV. QUY CHUẨN KHUNG GIAO DIỆN CHUNG (SHELL LAYOUT)

1. **Breadcrumb phân cấp (Header Navigation):**
   - Bắt buộc hiển thị ở Header khi vào các trang con: `Quản lý đơn hàng > Tạo đơn hàng mới`.
   - Trang cha dùng màu `text-slate-500 hover:text-indigo-600 font-medium`, dấu ngăn cách `ChevronRight` hoặc `/` màu `text-slate-300`, trang hiện tại dùng `text-slate-900 font-bold`.
2. **Sidebar Menu:**
   - Chiều rộng chuẩn `w-64` (256px), nền trắng `bg-white border-r border-slate-200`.
   - Menu Active: `bg-indigo-50 text-indigo-700 font-semibold border-r-2 border-indigo-600`.
   - Menu Hover: `hover:bg-slate-50 hover:text-indigo-600 text-slate-600`.
3. **Thanh Header / Topbar:**
   - Chiều cao cố định `h-14 sm:h-16`, nền `bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6`.
4. **Page Wrapper (Khoảng đệm nội dung chính):**
   - Padding tiêu chuẩn: `p-4 sm:p-6 space-y-6`.

---

## V. QUY CHUẨN NGHIỆP VỤ B2B ĐẶC THÙ CỦA LOHA SALES

Mọi module liên quan đến Bán buôn / Đại lý phải tuân thủ đúng các định dạng nghiệp vụ sau:

### 1. Phân cấp Đại lý (Customer Group Badges)
```tsx
// Đại lý Cấp 1
<span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-[10px] px-2 py-0.5 rounded-full">
  Đại lý Cấp 1
</span>

// Đại lý Cấp 2
<span className="bg-sky-100 text-sky-800 border border-sky-300 font-semibold text-[10px] px-2 py-0.5 rounded-full">
  Đại lý Cấp 2
</span>

// Khách Bán buôn
<span className="bg-indigo-100 text-indigo-800 border border-indigo-300 font-semibold text-[10px] px-2 py-0.5 rounded-full">
  Bán buôn
</span>
```

### 2. Kiểm soát Hạn mức Công nợ (Credit Limit Warning)
- **Hợp lệ (Dư nợ trong hạn):** Dư nợ màu `text-slate-900`, Khả dụng màu `text-emerald-700 font-bold`. Badge: `bg-emerald-100 text-emerald-800` ("Hợp lệ").
- **Vượt hạn mức (Cần duyệt vượt hạn mức):** Nền `bg-amber-50 border border-amber-300 text-amber-900`. Nút gửi đơn đổi thành màu Amber `bg-amber-600 hover:bg-amber-700` ("Gửi Duyệt Hạn Mức").
- **Quá hạn / Khóa nợ:** Nền `bg-rose-50 border border-rose-300 text-rose-900`. Khóa hoàn toàn nút đặt hàng với trạng thái `disabled`.

### 3. Cảnh báo Tồn kho khả dụng (Available Stock in Cart)
- Khi `số lượng đặt > tồn kho khả dụng`:
  - Dòng sản phẩm trong giỏ hàng đổi sang màu nền `bg-rose-50/60`.
  - Hiển thị dòng cảnh báo: `<span className="text-rose-600 font-semibold text-[10px]">Vượt tồn khả dụng (Còn lại {avail} {unit})</span>`.
  - Cung cấp nút điều chỉnh nhanh: `<button className="text-indigo-600 font-bold hover:underline">Đặt {maxOrderQty} {unit}</button>`.

---

## VI. DANH SÁCH COMPONENT DÙNG CHUNG BẮT BUỘC (SHARED REGISTRY)

Tuyệt đối **CẤM tự viết lại** các thành phần đã được chuẩn hóa trong thư mục `src/components/`:

| Component | Đường dẫn file | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Pagination** | `src/components/pagination.tsx` | Bắt buộc dùng cho toàn bộ các bảng dữ liệu và danh sách sản phẩm. |
| **DateInput** | `src/components/date-input.tsx` | Bắt buộc dùng cho mọi ô nhập ngày tháng chuẩn `dd/mm/yyyy`. |
| **Toast** | `src/components/toast.tsx` | Gọi `showToast('success' \| 'error' \| 'info', msg)`. **CẤM** dùng `alert()`. |
| **formatCurrency** | Helper dùng chung | Định dạng tiền tệ VND: `formatCurrency(val)` (ví dụ `150.000 ₫`). |
| **formatDate** | Helper dùng chung | Định dạng ngày tháng hiển thị: `formatDate(dateStr)` (ví dụ `15/10/2026`). |

---

## VII. QUY TẮC BẢNG DỮ LIỆU & PHÂN TRANG (DATA TABLES UX)

1. **Tránh thanh cuộn ngang (No Horizontal Scroll):**
   - Tuyệt đối không hardcode `min-w-[1000px]` hay `min-w-[1200px]` gây thanh cuộn ngang thô kệch trên màn hình laptop tiêu chuẩn.
   - Thiết lập bảng dạng fluid responsive (`w-full`), phân bổ tỷ lệ % hợp lý cho các cột chính.
2. **Tối ưu hóa số lượng cột (Tối đa 5–6 cột trên danh sách chính):**
   - Chỉ hiển thị các thông tin cốt lõi nhất: Mã đơn, Đại lý/Khách hàng, Ngày giao, Tổng tiền, Trạng thái, Thao tác.
   - Các thông tin chi tiết (NVKD, Khu vực, lịch sử, điểm giao, ghi chú...) đưa vào Drawer hoặc Modal "Xem chi tiết".
3. **Chống gãy chữ (Text Wrapping Prevention):**
   - Các nút thao tác, cột ngày và chỉ số tiền tệ luôn có `whitespace-nowrap shrink-0` để không bao giờ bị rớt dòng cụt chữ.
4. **Thanh phân trang gắn liền chân bảng:**
   - Component `Pagination` bắt buộc gắn liền đáy card bảng, không để trôi nổi tách rời.

---

## VIII. BẢNG KIỂM TRA CODE REVIEW (PR CHECKLIST — DO'S & DON'TS)

Mỗi khi tạo Pull Request hoặc Review code giao diện, kiểm tra ngay bảng này:

| TIÊU CHÍ | ĐẠT CHUẨN (DO ✅) | LỖI PHẢI SỬA (DON'T ❌) |
| :--- | :--- | :--- |
| **Màu thương hiệu** | Dùng `indigo-600` làm điểm nhấn duy nhất | Không dùng màu tím hồng, tím sen, magenta hoặc xanh lavi |
| **Bo góc Card/Modal** | Bo góc tối đa `rounded-xl` (12px cap) | **CẤM** dùng `rounded-2xl` hoặc `rounded-3xl` |
| **Bo góc Controls** | Toàn bộ Button, Input, Select dùng `rounded-lg` (8px) | Không dùng nút bo tròn viên thuốc hoặc bo góc nhọn |
| **Chiều cao Input/Nút** | Chiều cao cố định chuẩn `h-[38px]` trên cùng hàng | Không để ô ngày 36px lệch với ô tìm kiếm 40px |
| **Bảng dữ liệu** | Tràn màn hình `w-full`, tối đa 5–6 cột chính | **CẤM** hardcode `min-w-[1000px]` tạo thanh cuộn ngang |
| **Cột Thao tác** | Có `whitespace-nowrap shrink-0` | Không để chữ "Thao tác" bị rớt thành 2 dòng |
| **Thông báo** | Dùng `showToast('success' \| 'error', ...)` | **CẤM** dùng `window.alert()` hoặc `window.confirm()` |
| **Xóa / Hủy dữ liệu** | Bắt buộc có Modal xác nhận kèm lý do | Không xóa ngay khi người dùng bấm click |
| **Tiêu đề & Nút** | Trực diện: `Tạo Đơn hàng`, `Lưu nháp`, `Duyệt` | Không dùng từ ngữ chung chung: `Xử lý`, `Submit`, `OK` |

---

> ### TÓM TẮT 4 QUY TẮC BẤT DI BẤT DỊCH CỦA LOHA SALES:
> 1. **Màu thương hiệu:** Blue-Purple / Indigo Purple (`indigo-600`) đồng nhất với Logo. Cấm tím hồng/magenta.
> 2. **Container / Card lớn:** Tối đa **`rounded-xl` (12px)** — CẤM dùng `rounded-2xl`.
> 3. **Điều khiển tương tác (Button, Input, Select, Date):** Đồng bộ **`rounded-lg` (8px)** và chiều cao **`h-[38px]`**.
> 4. **Bảng dữ liệu:** Fluid **`w-full`**, không cuộn ngang, tối đa 5–6 cột, chống gãy chữ.
