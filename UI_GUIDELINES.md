# UI/UX DESIGN SYSTEM GUIDELINES

Mỗi khi bạn được yêu cầu thiết kế UI, viết code HTML/CSS, Tailwind hoặc dựng Component React, bạn BẮT BUỘC phải tuân thủ nghiêm ngặt triết lý thiết kế dưới đây. 

Mục tiêu cốt lõi: "Sáng sủa, sạch sẽ, hiện đại, dễ thao tác và mang hơi hướng mạng xã hội tinh tế."

1. VIBE TỔNG THỂ & MÀU SẮC (Look & Feel)
- Sáng và Sạch (Clean & Light): Luôn sử dụng nền tổng thể màu sáng (trắng hoặc xám cực nhạt/off-white) để làm nổi bật nội dung.
- Hơi hướng Social Media: Tránh thiết kế trông quá khô khan, "đóng hộp" như các phần mềm quản lý ERP truyền thống. Hãy làm cho nó thân thiện, hiện đại giống giao diện của X (Twitter), Facebook hoặc Notion nhưng ở mức độ tinh tế, tiết chế.
- Màu sắc chủ đạo (Primary Color) phải tươi sáng, dịu mắt (ví dụ: Xanh blue, xanh dương nhạt) và chỉ dùng để tạo điểm nhấn ở các Nút bấm chính (Call to action) hoặc Trạng thái quan trọng.

2. HÌNH KHỐI & KHÔNG GIAN (Shape & Spacing)
- Whitespace (Khoảng trắng): Sử dụng padding và margin thoáng đãng. Không nhồi nhét quá nhiều thông tin vào một khoảng hẹp.
- Card-based UI: Bao bọc các nhóm thông tin vào trong các "Thẻ" (Card).
- Bo góc (Rounded Corners): Luôn sử dụng bo góc mềm mại (ví dụ: `rounded-lg`, `rounded-xl` trong Tailwind) cho Button, Input, Modal và Card. Không dùng góc nhọn sắc cạnh.
- Đổ bóng (Box Shadow): Sử dụng shadow cực kỳ mỏng, nhẹ và mềm (soft shadow) ở các thẻ Card để tạo chiều sâu (3D) mà không làm nặng giao diện.

3. TYPOGRAPHY (Kiểu chữ & Khả năng đọc)
- Ưu tiên sự dễ nhìn tuyệt đối: Sử dụng font chữ không chân (Sans-serif) hiện đại như Inter, Roboto, hoặc hệ thống font mặc định (system-ui).
- Kích thước chữ phải đủ lớn, rõ ràng. Line-height (khoảng cách dòng) thoáng để dễ đọc.
- Phân cấp thông tin rõ ràng bằng độ đậm nhạt (Font-weight) và màu sắc (Chữ tiêu đề màu đen/xám đậm, chữ mô tả màu xám nhạt hơn). Tuyệt đối không dùng chữ xám quá mờ gây khó đọc.

4. TRẢI NGHIỆM THAO TÁC (UX & Interaction)
- Dễ thao tác (Touch-friendly): Các nút bấm (Button), ô nhập liệu (Input) phải to, rộng rãi, dễ bấm trên cả điện thoại.
- Phản hồi trực quan: Bắt buộc phải có hiệu ứng rõ ràng khi Hover (chuột lướt qua), Focus (đang nhập liệu) hoặc Active (đang bấm) để người dùng có cảm giác hệ thống đang phản hồi tức thì.

5. THÍCH NGHI ĐA THIẾT BỊ (Responsive Design)
- Luôn code theo tư duy Mobile-First (Ưu tiên thiết bị di động).
- Bố cục phải tự động co giãn, ẩn/hiện thông minh để trên màn hình điện thoại vuốt chạm dễ dàng như dùng App, còn trên Desktop thì dàn trang rộng rãi, tối ưu không gian hiển thị.

# ------------- bộ quy tắc UI/UX cho toàn hệ thống ------------------

## 1. Color System — Hệ thống màu sắc

### 1.1. Nguyên tắc thương hiệu

- **Logo là nguồn tham chiếu màu chuẩn của LOHA SALES.**
- Toàn bộ giao diện phải sử dụng hệ màu được xây dựng dựa trên màu thực tế của Logo.
- Màu thương hiệu chủ đạo của LOHA SALES là **Blue-Purple / Indigo Purple**.
- Không sử dụng hệ Tím-Magenta hoặc Lavender làm màu thương hiệu chính.
- Không để giao diện có sắc xanh hoặc tím khác biệt rõ rệt so với Logo.

> Nguyên tắc cốt lõi:
> **Logo → Brand Color → UI Components → Toàn bộ giao diện phải đồng nhất.**

### 1.2. Brand Color

**Primary Brand — Blue-Purple / Indigo Purple**

Đây là màu nhận diện chính của LOHA SALES.

Sử dụng cho:

- Primary Button
- Active Navigation
- Selected State
- Link quan trọng
- Focus State
- Icon chính
- Các điểm nhấn thương hiệu

Màu Primary phải giữ được đặc trưng **tím pha xanh / xanh tím đậm** giống Logo.

Không sử dụng màu tím thiên hồng/magenta làm Primary.

### 1.3. Brand Gradient

Logo sử dụng chuyển sắc giữa các vùng **Blue-Purple / Indigo / Purple**.

Gradient thương hiệu chỉ được sử dụng cho:

- Logo
- Khu vực nhận diện thương hiệu
- Hero hoặc điểm nhấn đặc biệt

Không sử dụng gradient đại trà cho:

- Button thông thường
- Input
- Table
- Badge
- Sidebar
- Card
- Toast

UI chức năng phải ưu tiên **màu Primary dạng solid** để đảm bảo sự rõ ràng và chuyên nghiệp.

### 1.4. Brand Color Variants

Màu Primary phải có các cấp độ được tạo từ **cùng một màu thương hiệu**, không tạo màu mới tùy ý:

- `Primary`
- `Primary Hover`
- `Primary Active`
- `Primary Light`
- `Primary Subtle`
- `Primary Disabled`

Các màu Light/Subtle được dùng làm background nhẹ cho:

- Active Menu
- Selected Row
- Selected Item
- Highlight
- Focus Background

Các biến thể nhẹ phải vẫn giữ được sắc **Blue-Purple/Indigo**, không chuyển thành Lavender hồng hoặc xanh Lavi thuần.

### 1.5. Semantic Colors

Semantic Color không phụ thuộc vào Brand Color:

- **Success — Green:** thao tác thành công.
- **Error / Danger — Red:** lỗi, thất bại, xóa hoặc hành động nguy hiểm.
- **Warning — Yellow/Orange:** cảnh báo.
- **Info — Blue:** thông tin.

Quy tắc:

- Không dùng Primary Purple để biểu thị Success.
- Không dùng Primary Purple để biểu thị Error.
- Không dùng Brand Color thay thế Semantic Color.
- Cùng một trạng thái phải luôn sử dụng cùng một màu trên toàn hệ thống.

### 1.6. Neutral Colors

Giao diện ưu tiên nền sáng và Neutral Colors:

- Background
- Surface
- Card
- Border
- Divider
- Text Primary
- Text Secondary
- Text Muted
- Text Disabled

Neutral Colors phải giúp màu thương hiệu nổi bật nhưng không làm giao diện quá sặc sỡ.

### 1.7. Quy tắc sử dụng màu

- Không tự ý chọn màu tại từng màn hình.
- Không hard-code màu nếu đã có Design Token tương ứng.
- Không sử dụng nhiều sắc tím khác nhau cho cùng một mục đích.
- Không sử dụng màu Lavender/Pastel Purple làm Primary.
- Không sử dụng màu xanh Lavi làm màu thương hiệu chính.
- Không dùng màu thương hiệu chỉ để trang trí.
- Primary Color phải luôn có cùng nhận diện thị giác với Logo.
- Hover/Active/Focus phải được tạo từ hệ màu Primary.
- Background của Active/Selected State có thể sử dụng phiên bản Primary Light/Subtle.
- Các màu trong giao diện phải tạo cảm giác rằng chúng thuộc **cùng một thương hiệu với Logo**.

### 1.8. Design Tokens

Màu phải được quản lý tập trung:

```css
/* Brand */
--color-primary: ...;
--color-primary-hover: ...;
--color-primary-active: ...;
--color-primary-light: ...;
--color-primary-subtle: ...;
--color-primary-disabled: ...;

/* Brand Gradient */
--color-brand-gradient: ...;

/* Semantic */
--color-success: ...;
--color-warning: ...;
--color-error: ...;
--color-info: ...;

/* Neutral */
--color-background: ...;
--color-surface: ...;
--color-border: ...;
--color-text-primary: ...;
--color-text-secondary: ...;
--color-text-muted: ...;
--color-text-disabled: ...;
1.9. Quy tắc quan trọng nhất

Không thiết kế màu giao diện độc lập với Logo.

Khi lựa chọn hoặc điều chỉnh một màu mới, phải kiểm tra:

Màu đó có cùng sắc độ và nhận diện với Logo không?

Nếu không → không sử dụng.

LOHA SALES phải tạo cảm giác:

Nhìn Logo và nhìn giao diện → người dùng nhận ra ngay đây là cùng một thương hiệu.


**Điểm mình đã sửa quan trọng nhất:** bỏ tư duy **“Tím + Xanh Lavi”** và chuyển thành **“Blue-Purple / Indigo Purple là màu thương hiệu duy nhất”**. Xanh/lavender chỉ là **biến thể phụ**, không được phép lấn át màu logo.

Như ảnh bạn gửi, màu menu **“Quản lý người dùng”** hiện đang hơi **tím hồng**, nên theo luật mới Agent sẽ phải kéo nó về gần **xanh-tím của logo** hơn.

## 2. Typography / Font chữ

### 2.1. Nguyên tắc chung

- Toàn bộ LOHA SALES phải sử dụng hệ thống Typography thống nhất.
- Chỉ sử dụng **font chữ đã được định nghĩa trong Design System**.
- Không tự ý thay đổi font giữa các màn hình hoặc component.
- Ưu tiên font có khả năng hiển thị tiếng Việt tốt, rõ ràng và dễ đọc trên màn hình.

### 2.2. Typography Hierarchy

Font chữ phải được phân cấp rõ ràng theo vai trò:

- **Display / Page Title:** tiêu đề lớn của trang.
- **Heading:** tiêu đề section/khu vực.
- **Body:** nội dung thông thường.
- **Label:** nhãn của input, form và thông tin phụ.
- **Caption / Helper:** thông tin phụ, mô tả ngắn.
- **Button:** chữ trên các nút thao tác.
- **Table:** dữ liệu trong bảng.
- **Navigation:** Sidebar, Header và các thành phần điều hướng.

Không tạo thêm cấp chữ mới nếu có cấp Typography tương đương.

### 2.3. Font Weight

Chỉ sử dụng các mức font-weight cần thiết:

- **Regular (400):** nội dung thông thường.
- **Medium (500):** label, navigation, button hoặc nội dung cần nhấn nhẹ.
- **Semibold (600):** heading, tiêu đề, thông tin quan trọng.
- **Bold (700):** chỉ sử dụng khi thực sự cần nhấn mạnh.

Không lạm dụng Bold để tạo sự nổi bật.

### 2.4. Font Size & Line Height

- Font size phải được định nghĩa theo Design Tokens.
- Không đặt font-size tùy ý trực tiếp trong từng component.
- Line-height phải phù hợp với từng cấp Typography.
- Nội dung dài phải ưu tiên khả năng đọc, không dùng font quá nhỏ để cố nhồi thông tin.

### 2.5. Màu chữ

- **Primary Text:** nội dung chính.
- **Secondary Text:** nội dung phụ.
- **Muted Text:** thông tin ít quan trọng.
- **Disabled Text:** thành phần không thể thao tác.

Không sử dụng màu thương hiệu Tím/Xanh Lavi cho text chỉ để trang trí.

### 2.6. Design Tokens

Typography phải được định nghĩa tập trung bằng Design Tokens/CSS Variables/Theme.

Ví dụ:

```css
--font-family: ...;

--font-size-xs: ...;
--font-size-sm: ...;
--font-size-md: ...;
--font-size-lg: ...;
--font-size-xl: ...;
--font-size-2xl: ...;

--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

--line-height-tight: ...;
--line-height-normal: ...;
--line-height-relaxed: ...;

## 3. Cỡ chữ & Cấp độ chữ

### 3.1. Nguyên tắc chung

- Toàn bộ hệ thống phải sử dụng một thang cỡ chữ thống nhất.
- Cỡ chữ phải thể hiện rõ **thứ bậc thông tin**.
- Không tự ý tạo cỡ chữ riêng cho từng màn hình/component.
- Ưu tiên khả năng đọc và sự cân đối thay vì sử dụng chữ quá lớn hoặc quá nhỏ.

### 3.2. Thang cỡ chữ

Sử dụng các cấp độ sau:

| Cấp độ | Cỡ chữ | Mục đích |
|---|---:|---|
| `xs` | 12px | Caption, thông tin phụ |
| `sm` | 14px | Label, helper text, metadata |
| `md` | 16px | Nội dung chính, input, table |
| `lg` | 18px | Nội dung cần nhấn mạnh |
| `xl` | 20px | Tiêu đề section |
| `2xl` | 24px | Tiêu đề trang |
| `3xl` | 30px | Tiêu đề lớn / Dashboard |

> Đây là thang chuẩn cơ sở. Nếu codebase hiện tại đã có Typography Token, ưu tiên chuẩn hóa về thang này thay vì tạo thêm nhiều cấp mới.

### 3.3. Cấp độ sử dụng

- **Page Title:** `2xl` hoặc `3xl`
- **Section Heading:** `xl`
- **Sub Heading:** `lg`
- **Body:** `md`
- **Label:** `sm`
- **Caption / Metadata:** `xs` hoặc `sm`
- **Button:** `sm` hoặc `md`
- **Input / Select:** `md`
- **Table:** `sm` hoặc `md`

### 3.4. Quy tắc phân cấp

- Tiêu đề cấp cao phải lớn hơn và nổi bật hơn tiêu đề cấp thấp.
- Nội dung chính phải dễ đọc hơn metadata/thông tin phụ.
- Không dùng `3xl` hoặc cỡ chữ lớn cho các nội dung thông thường.
- Không dùng `xs` cho nội dung người dùng cần đọc hoặc thao tác thường xuyên.
- Không dùng nhiều cấp độ chữ khác nhau trong cùng một khu vực nếu không có mục đích rõ ràng.

### 3.5. Design Tokens

Cỡ chữ phải được quản lý tập trung:

```css
--font-size-xs: 12px;
--font-size-sm: 14px;
--font-size-md: 16px;
--font-size-lg: 18px;
--font-size-xl: 20px;
--font-size-2xl: 24px;
--font-size-3xl: 30px;


## 4. Spacing — Hệ thống khoảng cách

### 4.1. Nguyên tắc chung

- Toàn bộ LOHA SALES phải sử dụng một hệ thống khoảng cách thống nhất.
- Không tự ý đặt margin/padding tùy ý cho từng component.
- Khoảng cách phải tạo ra thứ bậc rõ ràng giữa các thành phần.
- Các thành phần có quan hệ gần nhau phải có khoảng cách nhỏ hơn các nhóm nội dung độc lập.
- Ưu tiên giao diện thoáng, dễ đọc nhưng không để khoảng trống gây lãng phí diện tích.

### 4.2. Spacing Scale

Sử dụng hệ khoảng cách theo bội số của **4px**:

| Token | Giá trị | Sử dụng |
|---|---:|---|
| `space-1` | 4px | Khoảng cách rất nhỏ, icon/text |
| `space-2` | 8px | Thành phần liên quan trực tiếp |
| `space-3` | 12px | Nội dung trong component |
| `space-4` | 16px | Khoảng cách tiêu chuẩn |
| `space-5` | 20px | Khoảng cách giữa các thành phần |
| `space-6` | 24px | Khoảng cách giữa các nhóm |
| `space-8` | 32px | Khoảng cách section |
| `space-10` | 40px | Khoảng cách lớn |
| `space-12` | 48px | Khoảng cách giữa các khu vực lớn |
| `space-16` | 64px | Khoảng cách đặc biệt lớn |

Không tạo thêm giá trị spacing mới nếu có token phù hợp.

### 4.3. Quy tắc khoảng cách

**Trong component:**
- Icon ↔ Text: `4–8px`
- Label ↔ Input: `8px`
- Input ↔ Input: `16px`
- Nội dung trong Button: `8–12px`
- Nội dung trong Card: `16–24px`

**Giữa các nhóm:**
- Các thành phần cùng nhóm: `8–16px`
- Các nhóm nội dung: `24–32px`
- Các Section lớn: `32–48px`

**Layout:**
- Padding của khu vực chính phải được thống nhất.
- Sidebar, Header và Main Content phải sử dụng hệ spacing chung.
- Không để một màn hình có khoảng cách lớn/nhỏ bất thường so với các màn hình khác.

### 4.4. Quy tắc phân cấp

> **Khoảng cách nhỏ = có quan hệ gần.**  
> **Khoảng cách lớn = bắt đầu một nhóm/thông tin mới.**

Ví dụ:

```text
Tiêu đề
  ↓ 8px
Mô tả

  ↓ 24px

Section tiếp theo
````

Không sử dụng cùng một khoảng cách cho mọi thành phần.

### 4.5. Design Tokens

Spacing phải được quản lý tập trung:

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
```

### 4.6. Nguyên tắc cốt lõi

> **Spacing phải tạo ra cấu trúc, không phải khoảng trống ngẫu nhiên.**

Mọi khoảng cách trong LOHA SALES phải có lý do về **quan hệ, nhóm nội dung hoặc thứ bậc thông tin**.


## 5. Grid / Bố cục

### 5.1. Nguyên tắc chung

- Toàn bộ LOHA SALES phải sử dụng một hệ thống bố cục thống nhất.
- Bố cục phải rõ ràng, cân đối và ưu tiên nội dung chính.
- Không căn chỉnh từng màn hình theo cách riêng nếu không có lý do UX rõ ràng.
- Ưu tiên bố cục **đơn giản, thoáng, dễ quét thông tin**.
- Header, Sidebar và Main Content phải tuân theo cùng một hệ thống layout.

### 5.2. Cấu trúc Layout chính

LOHA SALES sử dụng cấu trúc:

```text
┌─────────────────────────────────────────────┐
│                    Header                   │
├──────────────┬──────────────────────────────┤
│              │                              │
│   Sidebar    │        Main Content          │
│              │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
````

* **Header:** khu vực điều hướng và thông tin hệ thống.
* **Sidebar:** điều hướng chính.
* **Main Content:** khu vực hiển thị nội dung/chức năng.
* Không để nội dung chính bị che bởi Header hoặc Sidebar.

### 5.3. Main Content

* Main Content phải có giới hạn chiều rộng hợp lý để tránh nội dung trải quá rộng.
* Nội dung phải được căn chỉnh theo một trục thẳng đứng nhất quán.
* Các Page Title, Filter, Table, Card và Section phải tuân theo cùng một vùng nội dung.
* Không để các component quan trọng sát mép màn hình.
* Khoảng cách hai bên phải sử dụng Spacing Token.

### 5.4. Grid

* Sử dụng Grid/Flexbox để xây dựng bố cục.
* Các cột phải có quy tắc rõ ràng và responsive.
* Không sử dụng các giá trị width/position tùy ý chỉ để ép giao diện khớp với một màn hình.
* Các thành phần cùng cấp nên được căn theo cùng một đường Grid.
* Khi thay đổi kích thước màn hình, bố cục phải tự điều chỉnh thay vì phá vỡ cấu trúc.

### 5.5. Responsive Layout

Bố cục phải thích ứng với:

* Desktop
* Laptop
* Tablet
* Mobile

Quy tắc:

* Desktop: Sidebar đầy đủ, nội dung sử dụng bố cục nhiều cột khi phù hợp.
* Tablet: giảm số cột và điều chỉnh khoảng cách.
* Mobile: ưu tiên bố cục một cột, Sidebar có thể chuyển thành dạng thu gọn/menu.
* Không để xuất hiện horizontal scroll không cần thiết.
* Không thu nhỏ nội dung đến mức khó đọc chỉ để giữ nguyên số cột.

### 5.6. Quy tắc phân cấp bố cục

Bố cục phải thể hiện rõ:

```text
Page
 ├── Page Header
 │    ├── Title
 │    └── Actions
 │
 ├── Filter / Search
 │
 ├── Main Content
 │    ├── Section
 │    └── Data / Components
 │
 └── Pagination / Additional Actions
```

Không đặt quá nhiều nhóm nội dung ngang hàng trong cùng một khu vực nếu chúng có mức độ ưu tiên khác nhau.

### 5.7. Nguyên tắc cốt lõi

> **Grid tạo ra sự nhất quán.
> Layout tạo ra thứ bậc.
> Responsive đảm bảo khả năng sử dụng.**

Mọi màn hình của LOHA SALES phải có cảm giác thuộc về **cùng một hệ thống**, thay vì mỗi màn hình có một cách bố cục riêng.


## 6. Border — Hệ thống đường viền

### 6.1. Nguyên tắc chung

- Border phải được sử dụng để **phân tách, định hướng và tạo cấu trúc**, không dùng để trang trí.
- Toàn bộ hệ thống phải sử dụng một quy tắc Border thống nhất.
- Không tự ý thay đổi màu, độ dày hoặc kiểu Border giữa các màn hình.
- Ưu tiên Border **mảnh, nhẹ và tinh tế**, phù hợp với phong cách SaaS hiện đại của LOHA SALES.

### 6.2. Border Width

Chỉ sử dụng các độ dày cần thiết:

- **1px:** Border tiêu chuẩn.
- **2px:** Focus, Active hoặc trạng thái cần nhấn mạnh.
- Không sử dụng Border quá dày cho các component thông thường.

### 6.3. Border Color

Border tiêu chuẩn phải sử dụng **Neutral Color**:

- Border mặc định → Neutral Border.
- Hover → Border đậm hơn nhẹ.
- Focus → Primary Brand Color.
- Error → Error Color.
- Disabled → Border Disabled.

Không sử dụng màu thương hiệu cho Border mặc định của mọi component.

### 6.4. Border Radius

Border Radius phải được chuẩn hóa:

- `sm`: Component nhỏ, Input, Button.
- `md`: Card, Dropdown, Modal.
- `lg`: Container hoặc khu vực lớn.
- Không tự ý sử dụng nhiều mức Radius khác nhau.

Các component cùng loại phải có Radius giống nhau trên toàn hệ thống.

### 6.5. Quy tắc sử dụng

**Input / Select:**
```text
Default → Neutral Border
Hover   → Neutral Border đậm hơn
Focus   → Primary Border
Error   → Error Border
Disabled → Disabled Border
````

**Card:**

* Có thể sử dụng Border 1px rất nhẹ.
* Không bắt buộc Border nếu Card đã được phân tách rõ bằng Background/Shadow.

**Table:**

* Border/Divider phải nhẹ.
* Không sử dụng đường viền quá đậm giữa mọi ô nếu không cần thiết.

**Modal / Dropdown:**

* Có thể sử dụng Border nhẹ để xác định ranh giới.
* Ưu tiên kết hợp Border với Shadow thay vì Border quá đậm.

### 6.6. Design Tokens

```css
--border-width-default: 1px;
--border-width-focus: 2px;

--color-border: ...;
--color-border-hover: ...;
--color-border-focus: var(--color-primary);
--color-border-error: var(--color-error);
--color-border-disabled: ...;

--radius-sm: ...;
--radius-md: ...;
--radius-lg: ...;
```

### 6.7. Nguyên tắc cốt lõi

> **Border phải giúp người dùng nhận biết cấu trúc và trạng thái, không làm giao diện nặng nề.**

Ưu tiên:

**Mỏng → Nhẹ → Đồng nhất → Có mục đích.**


## 7. Border Radius — Hệ thống độ bo góc

### 7.1. Nguyên tắc chung

- Toàn bộ LOHA SALES phải sử dụng hệ thống Border Radius thống nhất.
- Không tự ý đặt `border-radius` riêng cho từng component.
- Độ bo góc phải phù hợp với kích thước và vai trò của component.
- Ưu tiên phong cách **bo góc vừa phải, hiện đại và chuyên nghiệp**; không bo quá tròn toàn bộ giao diện.

### 7.2. Radius Scale

Sử dụng các mức Radius chuẩn:

| Token | Giá trị | Sử dụng |
|---|---:|---|
| `radius-sm` | 4px | Badge, trạng thái nhỏ |
| `radius-md` | 8px | Input, Button, Select |
| `radius-lg` | 12px | Card, Dropdown, Modal |
| `radius-xl` | 16px | Container hoặc khu vực lớn |
| `radius-full` | 9999px | Avatar, Pill, trạng thái dạng viên |

Không tạo thêm mức Radius mới nếu không có lý do UX rõ ràng.

### 7.3. Quy tắc theo Component

- **Button:** `radius-md`
- **Input / Select:** `radius-md`
- **Card:** `radius-lg`
- **Modal / Dialog:** `radius-lg`
- **Dropdown / Popover:** `radius-lg`
- **Badge / Tag:** `radius-sm` hoặc `radius-full`
- **Avatar:** `radius-full`
- **Toast:** `radius-md`
- **Table:** sử dụng Radius ở container, không bo từng ô.
- **Image:** sử dụng Radius phù hợp với container chứa ảnh.

### 7.4. Quy tắc nhất quán

- Các component cùng loại phải có cùng Border Radius.
- Không sử dụng nhiều kiểu bo góc khác nhau trong cùng một khu vực nếu không có mục đích.
- Không dùng `radius-full` cho Button, Card hoặc Container thông thường.
- Không bo góc quá lớn khiến component có cảm giác như giao diện mobile/game.
- Các component nằm trong cùng một nhóm phải có Radius và ngôn ngữ hình học tương đồng.

### 7.5. Design Tokens

```css
--radius-sm: 4px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 9999px;
````

### 7.6. Nguyên tắc cốt lõi

> **Kích thước và vai trò của component quyết định độ bo góc.**

LOHA SALES phải duy trì một ngôn ngữ hình học thống nhất:

**Bo vừa phải → Sạch → Hiện đại → Chuyên nghiệp → Không lạm dụng bo tròn.**


## 8. Shadow — Hệ thống đổ bóng

### 8.1. Nguyên tắc chung

- Shadow dùng để tạo **chiều sâu và phân cấp**, không dùng để trang trí.
- Ưu tiên Shadow nhẹ, mềm và tinh tế theo phong cách SaaS hiện đại.
- Không sử dụng Shadow đậm hoặc quá lớn cho các component thông thường.
- Không để mọi component đều có Shadow.

### 8.2. Shadow Scale

Chỉ sử dụng các cấp Shadow được định nghĩa:

| Token | Mức độ | Sử dụng |
|---|---|---|
| `shadow-sm` | Rất nhẹ | Card, Input, component nhỏ |
| `shadow-md` | Nhẹ | Dropdown, Popover |
| `shadow-lg` | Rõ hơn | Modal, Dialog |
| `shadow-xl` | Mạnh | Layer đặc biệt / Overlay |

### 8.3. Quy tắc theo Component

- **Card:** ưu tiên Border; chỉ dùng `shadow-sm` khi cần tạo phân lớp.
- **Button:** không dùng Shadow mặc định.
- **Input / Select:** không dùng Shadow mặc định; Focus sử dụng Primary Border/Focus Ring.
- **Dropdown / Popover:** `shadow-md`.
- **Modal / Dialog:** `shadow-lg`.
- **Toast:** Shadow nhẹ để tách khỏi nội dung phía sau.
- **Sidebar / Header:** chỉ sử dụng Shadow khi cần thể hiện sự tách lớp.
- **Overlay:** có thể sử dụng Shadow kết hợp với nền Overlay.

### 8.4. Trạng thái tương tác

- Không tạo Shadow quá mạnh khi Hover.
- Focus ưu tiên sử dụng **Primary Color + Focus Ring** thay vì Shadow đậm.
- Active/Pressed không được tạo cảm giác component đang nổi lên quá mức.
- Disabled không sử dụng Shadow nổi bật.

### 8.5. Design Tokens

```css
--shadow-sm: ...;
--shadow-md: ...;
--shadow-lg: ...;
--shadow-xl: ...;
````

Shadow phải được quản lý tập trung và tái sử dụng thông qua Design Tokens.

### 8.6. Nguyên tắc phân lớp

Shadow phải giúp người dùng hiểu thứ tự của các Layer:

```text
Page
  ↓
Card
  ↓
Dropdown / Popover
  ↓
Modal / Dialog
  ↓
Overlay / Critical Layer
```

Layer càng nổi trên giao diện → Shadow có thể càng rõ.

### 8.7. Nguyên tắc cốt lõi

> **Shadow dùng để thể hiện chiều sâu, không phải để làm component nổi bật một cách tùy tiện.**

LOHA SALES ưu tiên:

**Nhẹ → Mềm → Tinh tế → Có phân cấp → Không lạm dụng.**
 
## 9. Icon — Hệ thống biểu tượng

* Dùng **một Icon Library thống nhất** cho toàn hệ thống.
* Không tự ý trộn nhiều bộ icon có phong cách khác nhau.
* Icon phải cùng phong cách, cùng độ dày nét và kích thước tương ứng.

### Kích thước chuẩn

| Token     | Size | Sử dụng               |
| --------- | ---: | --------------------- |
| `icon-xs` | 14px | phụ, metadata         |
| `icon-sm` | 16px | Button, Input, Table  |
| `icon-md` | 20px | Navigation, Action    |
| `icon-lg` | 24px | Header, Section       |
| `icon-xl` | 32px | Empty State, đặc biệt |

### Quy tắc sử dụng

* Icon + Text: khoảng cách **4–8px**.
* Icon trong Button phải căn giữa theo chiều dọc.
* Icon Button phải có vùng click đủ lớn, tối thiểu khoảng **36–40px**.
* Icon có chức năng phải có ý nghĩa rõ ràng.
* Không dùng icon chỉ để trang trí nếu không cần thiết.
* Các hành động phổ biến phải dùng icon thống nhất:

  * Thêm → `Plus`
  * Sửa → `Edit`
  * Xóa → `Trash`
  * Tìm kiếm → `Search`
  * Lọc → `Filter`
  * Đóng → `X`
  * Xem → `Eye`
  * Khóa → `Lock`
  * Mở khóa → `Unlock`
  * Cài đặt → `Settings`
* Icon **Danger/Delete** dùng màu Error khi cần thể hiện hành động nguy hiểm.
* Icon trạng thái phải tuân theo **Semantic Color System**.
* Không đổi icon tùy ý giữa các màn hình cho cùng một chức năng.

### Nguyên tắc

> **Cùng một chức năng → cùng một icon → cùng một cách hiển thị trong toàn hệ thống.**

## 10. Button — Nút bấm

* Button phải có **phân cấp hành động rõ ràng**:

  * **Primary:** hành động chính → Thêm, Lưu, Xác nhận.
  * **Secondary:** hành động phụ → Hủy, Quay lại.
  * **Danger:** hành động nguy hiểm → Xóa, Khóa.
  * **Ghost / Icon:** hành động phụ hoặc thao tác trên từng dòng.
* Không biến mọi Button thành Primary.
* Button cùng loại phải có cùng kích thước, chiều cao, font, radius và khoảng cách.
* Chuẩn hóa các trạng thái:

  * Default
  * Hover
  * Active/Pressed
  * Focus
  * Disabled
  * Loading
* Loading phải khóa thao tác và thể hiện rõ đang xử lý.
* Nội dung Button phải ngắn, mô tả đúng hành động: `Lưu`, `Xóa`, `Thêm sản phẩm`.
* Icon nếu có phải đặt và căn chỉnh thống nhất.
* Không dùng màu chỉ để trang trí; màu phải phản ánh vai trò hành động.

---

## 11. Icon Button — Nút chỉ có Icon

* Dùng khi chức năng đã **quen thuộc và icon đủ rõ nghĩa**.
* Các thao tác phổ biến phải dùng icon thống nhất.
* Phải có `Tooltip` cho Icon Button khi ý nghĩa không rõ ngay.
* Kích thước vùng click tối thiểu khoảng **36–40px**.
* Icon luôn căn giữa.
* Chuẩn hóa trạng thái:

  * Default
  * Hover
  * Active
  * Focus
  * Disabled
* Action nguy hiểm như Xóa phải dùng **Danger/Error**.
* Không dùng Icon Button cho hành động quan trọng nếu người dùng dễ hiểu sai.

---

## 12. Input — Ô nhập liệu

* Mỗi Input phải có **Label rõ ràng**.
* Placeholder chỉ dùng để gợi ý, **không thay thế Label**.
* Chuẩn hóa:

  * Height
  * Padding
  * Font
  * Border
  * Radius
* Trạng thái bắt buộc có:

  * Default
  * Hover
  * Focus
  * Error
  * Disabled
  * Read-only nếu cần
* Focus dùng **Primary Border/Focus Ring**.
* Error dùng **Error Color** và thông báo lỗi ngắn, rõ nguyên nhân.
* Required field phải được thể hiện thống nhất.
* Không dùng quá nhiều kiểu Input khác nhau cho cùng một loại dữ liệu.

---

## 13. Textarea — Ô nhập nhiều dòng

* Tuân theo toàn bộ quy tắc của **Input**.
* Dùng cho nội dung dài: mô tả, ghi chú, nội dung chi tiết.
* Có chiều cao mặc định phù hợp.
* Cho phép Resize khi thực sự cần.
* Không để Textarea quá thấp khiến người dùng khó nhập nội dung.
* Nếu có giới hạn ký tự, hiển thị số ký tự đã nhập/tối đa.
* Error phải hiển thị rõ dưới hoặc gần Textarea.
* Không dùng Textarea cho dữ liệu ngắn có cấu trúc.

---

## 14. Select / Dropdown

* Dùng Select khi người dùng chọn **một hoặc một số giá trị có sẵn**.
* Giao diện phải thống nhất với Input.
* Có các trạng thái:

  * Default
  * Hover
  * Open
  * Focus
  * Disabled
  * Error
* Dropdown phải hiển thị rõ:

  * Giá trị đang chọn
  * Các lựa chọn
  * Trạng thái Selected
* Danh sách dài nên có Search.
* Không mở Dropdown ra ngoài viewport nếu có thể tránh.
* Option phải có vùng click đủ lớn.
* Không dùng Dropdown cho danh sách quá dài nếu Autocomplete phù hợp hơn.

---

## 15. Checkbox

* Dùng cho lựa chọn **độc lập hoặc nhiều lựa chọn đồng thời**.
* Checkbox phải có Label rõ ràng.
* Trạng thái:

  * Unchecked
  * Checked
  * Indeterminate
  * Disabled
  * Error nếu cần
* Có thể click cả Label để thay đổi trạng thái.
* Không dùng Checkbox cho lựa chọn chỉ có **một trong nhiều giá trị** → dùng Radio.
* Không dùng màu tùy ý; trạng thái Checked dùng Primary.

---

## 16. Radio

* Dùng khi người dùng chỉ được chọn **một giá trị trong một nhóm**.
* Các Radio cùng nhóm phải có cùng `name/group`.
* Phải có Label rõ ràng.
* Một nhóm nên có giá trị mặc định khi hợp lý.
* Trạng thái:

  * Unselected
  * Selected
  * Disabled
  * Error nếu cần
* Có thể click Label để chọn.
* Không dùng Radio cho danh sách quá dài; cân nhắc Select.

---

## 17. Switch / Toggle

* Dùng cho trạng thái **Bật / Tắt** có hiệu lực ngay hoặc có ý nghĩa rõ ràng.
* Không dùng Switch cho việc chọn dữ liệu hoặc lựa chọn nhiều mục.
* Phải thể hiện rõ:

  * ON
  * OFF
  * Disabled
* Label phải mô tả **trạng thái/chức năng**, không dùng câu mơ hồ.
* Nếu thay đổi có hậu quả lớn → yêu cầu Confirm thay vì đổi ngay.
* Chuyển trạng thái phải có phản hồi trực quan rõ ràng.
* Không lạm dụng Switch thay cho Checkbox.

---

## 18. Date Picker / Time Picker

* Dùng đúng mục đích:

  * Date Picker → ngày
  * Time Picker → giờ
  * DateTime Picker → ngày + giờ
* Format ngày/giờ phải thống nhất toàn hệ thống.
* Không để mỗi màn hình dùng một format khác nhau.
* Hỗ trợ nhập trực tiếp nếu phù hợp.
* Có trạng thái:

  * Default
  * Focus
  * Selected
  * Disabled
  * Error
* Không cho chọn ngày không hợp lệ theo nghiệp vụ.
* Khoảng ngày phải thể hiện rõ khi dùng Date Range.
* Calendar/Picker phải không bị che hoặc vượt khỏi viewport.

---

## 19. Search — Tìm kiếm

* Search phải có Icon Search và Placeholder rõ ràng.
* Placeholder nên mô tả nội dung có thể tìm: `Tìm sản phẩm...`.
* Search Input phải có trạng thái:

  * Default
  * Focus
  * Loading
  * Has Result
  * No Result
* Nếu tìm kiếm realtime → có debounce để tránh gọi API liên tục.
* Có nút Clear khi đã nhập dữ liệu.
* Kết quả tìm kiếm phải phản hồi nhanh và rõ ràng.
* Không dùng Search thay cho Filter nếu người dùng cần lọc theo điều kiện cụ thể.

---

## 20. Autocomplete — Tự động gợi ý

* Dùng khi người dùng **nhập và chọn một giá trị từ danh sách gợi ý**.
* Gợi ý phải xuất hiện gần Input.
* Có trạng thái:

  * Loading
  * Suggestions
  * No Result
  * Error
* Cho phép chọn bằng chuột và bàn phím.
* Highlight phần text khớp nếu phù hợp.
* Không hiển thị quá nhiều kết quả cùng lúc.
* Không tự động chọn giá trị nếu người dùng chưa xác nhận.
* Với dữ liệu lớn, ưu tiên tìm kiếm từ server thay vì tải toàn bộ dữ liệu.

---

## 21. Slider — Thanh kéo

* Chỉ dùng cho dữ liệu có **giá trị liên tục hoặc khoảng giá trị**.
* Phải hiển thị rõ:

  * Min
  * Max
  * Giá trị hiện tại
* Có thể cho phép nhập số trực tiếp khi cần độ chính xác cao.
* Slider phải có vùng kéo đủ lớn, dễ thao tác.
* Hỗ trợ Keyboard khi phù hợp.
* Không dùng Slider cho dữ liệu có ít lựa chọn cố định → dùng Select/Radio.
* Range Slider phải phân biệt rõ hai giá trị Min/Max.

---

## 22. Upload File / Ảnh

* Phải hiển thị rõ:

  * Loại file được phép
  * Dung lượng tối đa
  * Số lượng file tối đa nếu có
* Hỗ trợ:

  * Click để chọn file
  * Drag & Drop nếu phù hợp
* Hiển thị trạng thái:

  * Empty
  * Uploading
  * Success
  * Error
  * Disabled
* Trong lúc Upload phải có Progress/Loading.
* Upload lỗi phải nêu rõ nguyên nhân: sai định dạng, quá dung lượng...
* Ảnh phải có Preview trước khi xác nhận nếu phù hợp.
* Có nút Xóa/Thay thế file đã chọn.
* Không cho Upload file không đúng quy định.
* Không làm mất file đã chọn khi một file khác Upload thất bại.
* Khu vực Upload phải có vùng click và Drop Zone đủ lớn, dễ nhận biết.

## 23. Table — Bảng dữ liệu

* Dùng để hiển thị dữ liệu có cấu trúc, cần so sánh hoặc quản lý nhiều bản ghi.

* Header phải rõ ràng, tên cột ngắn gọn, dễ hiểu.

* Căn lề thống nhất: văn bản căn trái, số liệu căn phải, trạng thái và thao tác theo một quy tắc chung.

* Chiều rộng cột phù hợp nội dung; không để chữ tràn hoặc làm vỡ bố cục.

* Chuẩn hóa chiều cao dòng, padding, font, đường phân cách và màu nền.

* Hover dòng chỉ dùng để hỗ trợ theo dõi, không dùng màu quá nổi bật.

* Trạng thái dữ liệu sử dụng Badge theo Semantic Color System.

* Các thao tác trên dòng phải có vị trí và cách hiển thị nhất quán.

* Bảng cần có Loading, Empty State, Error State.

* Có Pagination khi dữ liệu nhiều; Search và Filter khi cần.

* Responsive phải có phương án phù hợp, không để bảng tràn màn hình ngoài ý muốn.

* Chỉ cho phép Sort ở các cột có ý nghĩa sắp xếp.

## 24. Card — Thẻ nội dung

* Dùng để nhóm các thông tin có liên quan thành một khối.

* Card cùng loại phải thống nhất về padding, radius, border, background và shadow.

* Thứ tự nội dung phải rõ ràng: tiêu đề → nội dung → thông tin phụ → hành động.

* Chỉ dùng Shadow khi cần phân biệt lớp; ưu tiên giao diện nhẹ, sạch.

* Không lồng quá nhiều Card khiến giao diện rối.

* Card có thể click phải thể hiện rõ khả năng tương tác.

* Không làm toàn bộ Card clickable nếu bên trong có nhiều hành động độc lập.

## 25. Badge / Tag — Nhãn trạng thái

* Badge dùng để thể hiện trạng thái, số lượng hoặc thông tin ngắn.

* Tag dùng để phân loại hoặc gắn nhãn dữ liệu.

* Màu sắc phải có ý nghĩa nhất quán:

  * Success: xanh lá.

  * Error/Danger: đỏ.

  * Warning: vàng/cam.

  * Info: xanh dương.

  * Neutral: xám.

* Không dùng màu chỉ để trang trí.

* Nội dung ngắn gọn, dễ hiểu; không nhồi nhiều chữ.

* Kích thước, padding, font và radius phải thống nhất.

* Cùng một trạng thái phải dùng cùng màu và cách gọi trên toàn hệ thống.

## 26. Avatar — Ảnh đại diện

* Ưu tiên ảnh thật; nếu không có ảnh, dùng chữ cái đại diện hoặc ảnh mặc định.

* Chuẩn hóa kích thước theo ngữ cảnh: Header, danh sách, bảng, trang hồ sơ.

* Avatar phải giữ tỷ lệ vuông và crop ảnh nhất quán.

* Nếu dùng chữ cái đại diện, căn giữa và đảm bảo dễ đọc.

* Không dùng màu ngẫu nhiên gây mất đồng bộ thương hiệu.

* Nếu Avatar có thể click, phải thể hiện khả năng tương tác và có trạng thái Focus phù hợp.

* Không dùng Avatar thay cho thông tin định danh quan trọng.

## 27. List — Danh sách

* Các mục trong cùng danh sách phải có cấu trúc và khoảng cách nhất quán.

* Thông tin quan trọng đặt trước; thông tin phụ đặt sau.

* Căn chỉnh icon, tiêu đề, mô tả và hành động thống nhất.

* Dùng Divider khi cần phân tách các mục.

* Hover chỉ áp dụng cho mục có tương tác.

* Nếu mục có thể click, phải thể hiện rõ khả năng tương tác.

* Danh sách dài cần có phân trang, cuộn hoặc cơ chế tải thêm phù hợp.

* Phải có Loading, Empty State và Error State khi lấy dữ liệu động.

## 28. Pagination — Phân trang

* Dùng khi dữ liệu được chia thành nhiều trang.

* Hiển thị rõ trang hiện tại và các thao tác Trang trước / Trang sau.

* Trang hiện tại phải được phân biệt rõ bằng Primary Color.

* Vô hiệu hóa nút khi không thể chuyển tiếp hoặc quay lại.

* Kích thước nút và khoảng cách phải thống nhất.

* Nếu phù hợp, hiển thị tổng số bản ghi và lựa chọn số dòng mỗi trang.

* Khi đổi trang, phải giữ Search/Filter hiện tại nếu không có lý do nghiệp vụ để đặt lại.

* Không hiển thị quá nhiều số trang gây rối giao diện.

* Với dữ liệu thay đổi, phải xử lý trường hợp trang hiện tại không còn bản ghi.

## 29. Tabs — Các tab nội dung

* Dùng để chuyển giữa các nhóm nội dung liên quan trong cùng một khu vực.

* Tên tab phải ngắn gọn, phân biệt rõ nội dung.

* Tab đang chọn phải có trạng thái Active rõ ràng, dùng Primary Color theo Design System.

* Chuẩn hóa kiểu tab, chiều cao, padding và khoảng cách.

* Không dùng Tabs thay cho điều hướng chính giữa các phân hệ lớn.

* Giữ trạng thái tab khi phù hợp với luồng công việc.

* Nội dung tab phải thay đổi đúng khi người dùng chuyển tab.

* Nếu có số lượng hoặc trạng thái kèm theo, hiển thị theo một quy tắc thống nhất.

## 30. Accordion — Nội dung thu gọn

* Dùng để thu gọn/mở rộng các nhóm nội dung có liên quan.

* Tiêu đề phải mô tả rõ nội dung bên trong.

* Icon mở/đóng phải thống nhất và thể hiện đúng trạng thái.

* Có vùng click đủ lớn, không chỉ giới hạn ở icon.

* Chuẩn hóa padding, khoảng cách và Divider.

* Nội dung mở rộng không được làm vỡ bố cục.

* Quy định rõ được mở nhiều mục cùng lúc hay chỉ một mục; áp dụng nhất quán theo từng nhóm.

* Không dùng Accordion cho nội dung cần người dùng nhìn thấy liên tục.

## 31. Tooltip — Chú thích khi rê chuột

* Dùng để giải thích ngắn cho Icon Button, biểu tượng hoặc thông tin khó hiểu.

* Nội dung ngắn gọn, đúng trọng tâm.

* Hiển thị khi Hover hoặc Focus bằng bàn phím.

* Đặt gần đối tượng, tránh bị che hoặc vượt khỏi viewport.

* Thời gian xuất hiện và biến mất phải nhất quán.

* Không đưa nội dung dài, biểu mẫu hoặc hành động phức tạp vào Tooltip.

* Không dùng Tooltip thay cho Label hoặc thông báo lỗi quan trọng.

* Trên thiết bị cảm ứng, không phụ thuộc hoàn toàn vào Hover.

## 32. Popover — Bảng thông tin nổi

* Dùng để hiển thị thông tin bổ sung hoặc thao tác nhỏ liên quan đến một đối tượng.

* Phân biệt rõ với Tooltip: Popover có thể chứa nội dung tương tác.

* Mở theo hành động rõ ràng như click hoặc nhấn nút.

* Đặt gần đối tượng kích hoạt, tự điều chỉnh khi gần mép màn hình.

* Có thể đóng bằng cách click ra ngoài hoặc nhấn `Esc` khi phù hợp.

* Chuẩn hóa background, border, radius, shadow và padding.

* Không để Popover che mất nội dung hoặc thao tác quan trọng.

* Nếu nội dung dài hoặc có nhiều bước, dùng Modal hoặc trang riêng thay vì Popover.

## 33. Toast / Notification — Thông báo nhanh

* Dùng để thông báo kết quả của một hành động mà không làm gián đoạn công việc.

* LOHA SALES chỉ dùng 2 màu chính:

  * Success: xanh lá.

  * Error: đỏ.

* Toast chỉ gồm Icon + Tiêu đề một dòng + Nút đóng (X), không có mô tả.

* Toast trượt vào từ bên phải, hiển thị bên dưới Header và không che Avatar Dropdown đang mở.

* Có thanh tiến trình mỏng ở cạnh dưới để thể hiện thời gian tự đóng.

* Người dùng có thể đóng Toast ngay bằng nút X.

* Nhiều Toast phải hiển thị đồng thời, Toast mới ở trên, Toast cũ dịch xuống dưới; không xếp hàng chờ.

* Mỗi Toast có bộ đếm thời gian độc lập. Khi một Toast biến mất, các Toast còn lại dịch chuyển mượt mà, không chồng lấn.

* Chuẩn hóa kích thước, khoảng cách, animation và vị trí trên toàn hệ thống.

## 34. Alert — Cảnh báo trong giao diện

* Dùng để hiển thị thông tin hoặc cảnh báo cần người dùng chú ý ngay trong nội dung trang.

* Các loại: Info, Success, Warning, Error.

* Màu sắc, icon và tiêu đề phải tương ứng với loại thông báo.

* Nội dung ngắn gọn, nêu rõ vấn đề và hướng xử lý nếu cần.

* Có thể có nút hành động hoặc nút đóng nếu phù hợp.

* Alert quan trọng không được tự biến mất khi người dùng chưa đọc.

* Chuẩn hóa padding, border, radius, icon và typography.

## 35. Modal / Dialog — Hộp thoại

* Dùng cho tác vụ cần tập trung hoặc tương tác mà không rời trang hiện tại.

* Cấu trúc chuẩn: Tiêu đề → Nội dung → Khu vực hành động.

* Chuẩn hóa chiều rộng, padding, radius, shadow và khoảng cách.

* Có nút đóng rõ ràng; hỗ trợ `Esc` và click bên ngoài khi phù hợp.

* Không tự đóng khi người dùng đang nhập dữ liệu chưa lưu.

* Khi mở Modal, nền phía sau phải được làm nổi bật vừa đủ và không thể thao tác ngoài Modal nếu đó là hộp thoại chặn.

* Hỗ trợ bàn phím, Focus và quản lý Focus đúng cách.

* Không lồng nhiều Modal nếu không thực sự cần thiết.

## 36. Confirm Dialog — Hộp thoại xác nhận

* Dùng trước hành động quan trọng, khó hoàn tác hoặc có nguy cơ mất dữ liệu.

* Nội dung phải nói rõ hành động nào sẽ xảy ra và đối tượng bị ảnh hưởng.

* Với hành động nguy hiểm như Xóa hoặc Khóa, dùng màu Danger/Error.

* Nút xác nhận phải mô tả hành động cụ thể: `Xóa sản phẩm`, `Khóa tài khoản`; tránh dùng `OK`.

* Nút Hủy phải dễ nhận biết và không nổi bật hơn nút xác nhận nguy hiểm.

* Không yêu cầu xác nhận cho mọi thao tác thông thường.

* Khi đang xử lý, khóa nút xác nhận để tránh gửi yêu cầu lặp.

* Chỉ đóng sau khi xử lý thành công hoặc khi người dùng chủ động Hủy.

## 37. Loading — Trạng thái đang tải

* Dùng để cho biết hệ thống đang xử lý hoặc tải dữ liệu.

* Tác vụ ngắn dùng Spinner; tác vụ dài nên có thông tin tiến trình nếu đo được.

* Loading phải xuất hiện đúng khu vực đang xử lý.

* Không hiển thị nhiều Spinner không cần thiết trên cùng một vùng.

* Khi đang gửi biểu mẫu, khóa thao tác gửi lặp và thể hiện trạng thái đang xử lý.

* Không dùng Loading vô thời hạn nếu có thể phát hiện lỗi hoặc timeout.

* Khi hoàn tất, hiển thị dữ liệu hoặc trạng thái kết quả tương ứng.

## 38. Skeleton Loading — Khung tải dữ liệu

* Dùng khi đã biết cấu trúc nội dung sẽ hiển thị nhưng dữ liệu chưa tải xong.

* Hình dạng Skeleton phải gần với bố cục dữ liệu thật.

* Ưu tiên Skeleton cho Table, Card, List và khu vực nội dung lớn.

* Dùng hiệu ứng chuyển động nhẹ, không gây mất tập trung.

* Giữ bố cục ổn định để hạn chế Layout Shift.

* Khi dữ liệu tải xong, thay Skeleton bằng nội dung thật.

* Nếu tải thất bại, hiển thị Error State thay vì giữ Skeleton mãi.

## 39. Progress Bar — Thanh tiến trình

* Dùng để thể hiện tiến độ của tác vụ đang diễn ra.

* Tiến trình xác định được phải hiển thị phần trăm hoặc giá trị thực tế.

* Tiến trình không xác định được dùng dạng chuyển động liên tục, không hiển thị phần trăm giả.

* Chuẩn hóa chiều cao, màu sắc, radius và animation.

* Success dùng xanh lá; Error dùng đỏ khi tác vụ thất bại.

* Với Upload hoặc xử lý dài, hiển thị thêm tên tác vụ nếu cần.

* Không để Progress Bar đứng yên khi tác vụ đã kết thúc.

## 40. Success State — Trạng thái thành công

* Dùng khi thao tác hoặc quá trình đã hoàn tất thành công.

* Thể hiện rõ kết quả bằng icon và nội dung ngắn gọn.

* Dùng màu Success theo Semantic Color System.

* Nếu cần bước tiếp theo, cung cấp hành động phù hợp.

* Với thao tác ngắn, ưu tiên Toast; với kết quả cần người dùng xem hoặc tiếp tục thao tác, dùng Success State trong nội dung trang.

* Chỉ hiển thị thành công sau khi hệ thống xác nhận thao tác đã thành công.

## 41. Error State — Trạng thái lỗi

* Dùng khi tải dữ liệu hoặc thực hiện thao tác thất bại.

* Nêu rõ điều gì đã xảy ra và hướng xử lý nếu xác định được.

* Dùng màu Error và icon nhất quán.

* Cung cấp nút Thử lại khi có thể thực hiện lại.

* Không chỉ hiển thị mã lỗi kỹ thuật cho người dùng thông thường.

* Không làm mất dữ liệu người dùng đã nhập khi có thể giữ lại an toàn.

* Phân biệt lỗi nhập liệu, lỗi nghiệp vụ, lỗi mạng và lỗi hệ thống khi cần.

* Chỉ hiển thị lỗi sau khi đã xác định thao tác thất bại; không báo lỗi giả do trạng thái trung gian.

## 42. Empty State — Trạng thái chưa có dữ liệu

* Dùng khi khu vực chưa có dữ liệu để hiển thị.

* Phân biệt:

  * Chưa có dữ liệu ban đầu.

  * Không có kết quả tìm kiếm.

  * Không có dữ liệu phù hợp bộ lọc.

* Hiển thị tiêu đề ngắn gọn, giải thích phù hợp và hành động tiếp theo nếu cần.

* Ví dụ: `Chưa có sản phẩm` → `Thêm sản phẩm`.

* Không hiển thị bảng trống mà không có hướng dẫn.

* Không nhầm Empty State với Loading hoặc Error State.

* Hình minh họa nếu có phải đơn giản, phù hợp thương hiệu và không lấn át nội dung.

# 5. 🧭 Điều hướng

## 44. Sidebar — Thanh điều hướng bên

* Hiển thị các phân hệ/chức năng chính theo vai trò và quyền truy cập của người dùng.

* Các mục phải có icon, tên gọi rõ ràng và thống nhất.

* Mục đang chọn phải có trạng thái Active dễ nhận biết, dùng Primary Color.

* Phân nhóm chức năng theo nghiệp vụ, không dồn tất cả vào một danh sách dài.

* Chuẩn hóa chiều rộng, padding, khoảng cách, icon và typography.

* Hỗ trợ thu gọn/mở rộng nếu phù hợp; khi thu gọn, icon phải có Tooltip.

* Sidebar phải giữ cấu trúc nhất quán giữa các trang.

* Không hiển thị chức năng người dùng không có quyền truy cập.

## 45. Header / Topbar — Thanh đầu trang

* Dùng chung cấu trúc trên toàn hệ thống.

* Có thể chứa Logo, tiêu đề/khu vực điều hướng, thông báo và Avatar người dùng tùy nhu cầu.

* Căn chỉnh các thành phần thống nhất, không để nội dung chồng lấn.

* Chuẩn hóa chiều cao, padding, icon, font và khoảng cách.

* Dropdown của Avatar phải hiển thị đúng vị trí, không bị Header hoặc thành phần khác che khuất.

* Toast phải hiển thị bên dưới Header và không che Dropdown đang mở.

* Khi cuộn trang, hành vi cố định của Header phải nhất quán.

* Không đưa quá nhiều chức năng vào Header gây rối.

## 46. Navigation Menu — Menu điều hướng

* Phân biệt rõ mục điều hướng chính, mục con và nhóm chức năng.

* Tên mục ngắn gọn, phản ánh đúng trang đích.

* Trạng thái Active phải thể hiện đúng trang hoặc nhóm đang truy cập.

* Các mục cùng cấp phải có cách hiển thị thống nhất.

* Hỗ trợ điều hướng bằng bàn phím và Focus State.

* Không tạo nhiều mục dẫn đến cùng một nơi nếu không có lý do nghiệp vụ.

* Chỉ hiển thị mục phù hợp với quyền người dùng.

## 47. Breadcrumb — Đường dẫn phân cấp

* Dùng để thể hiện vị trí hiện tại trong cấu trúc hệ thống.

* Hiển thị theo thứ tự từ cấp cao đến trang hiện tại.

* Các cấp trước có thể click để quay lại; cấp hiện tại không cần là liên kết.

* Tên từng cấp phải khớp với tên trang hoặc phân hệ.

* Dùng dấu phân cách và khoảng cách thống nhất.

* Không hiển thị Breadcrumb nếu cấu trúc trang quá đơn giản và không mang lại giá trị.

## 48. Dropdown Menu — Menu thả xuống

* Dùng để hiển thị nhóm hành động hoặc lựa chọn bổ sung từ một thành phần kích hoạt.

* Menu phải mở đúng vị trí, không bị che hoặc vượt khỏi viewport.

* Các mục phải có tên rõ ràng, icon nhất quán nếu có.

* Nhóm hành động nguy hiểm phải được phân biệt bằng màu Danger/Error.

* Hỗ trợ đóng khi click ra ngoài hoặc nhấn `Esc` khi phù hợp.

* Hỗ trợ điều hướng bằng bàn phím.

* Không nhồi quá nhiều mục; nhóm các hành động có liên quan.

* Không nhầm Dropdown Menu chứa hành động với Select dùng để chọn giá trị.

## 49. Context Menu — Menu ngữ cảnh

* Hiển thị các hành động liên quan trực tiếp đến đối tượng được chọn.

* Chỉ chứa hành động phù hợp với đối tượng và quyền của người dùng.

* Các mục như Sửa, Xóa, Sao chép phải có tên rõ ràng.

* Hành động nguy hiểm dùng màu Danger/Error.

* Menu phải nằm trong vùng nhìn thấy, không bị cắt khỏi viewport.

* Hỗ trợ bàn phím và đóng menu bằng `Esc`.

* Nếu hành động đã được hiển thị rõ ràng tại vị trí khác, chỉ thêm vào Context Menu khi thực sự hữu ích.

* Trên thiết bị không có chuột phải, phải có cách khác để truy cập các hành động cần thiết.

## 50. Pagination Navigation — Điều hướng phân trang

* Tuân thủ quy tắc Pagination tại mục 28.

* Nút Trang trước/Trang sau phải hoạt động đúng và có trạng thái Disabled khi không thể chuyển trang.

* Trang hiện tại phải được đánh dấu rõ ràng.

* Khi chuyển trang, giữ nguyên Search, Filter và cách sắp xếp nếu phù hợp.

* Không để người dùng chuyển đến trang không tồn tại khi dữ liệu thay đổi.

* Trên màn hình nhỏ, ưu tiên hiển thị trang hiện tại và các thao tác điều hướng thiết yếu.

# 6. 📝 Form & thao tác

## 51. Form Layout — Bố cục biểu mẫu

* Sắp xếp trường nhập theo thứ tự nghiệp vụ và trình tự người dùng dễ thực hiện.

* Các trường liên quan phải được nhóm thành từng phần rõ ràng.

* Căn chỉnh Label, Input, Select và thông báo lỗi thống nhất.

* Khoảng cách giữa các trường tuân theo Spacing System.

* Biểu mẫu dài nên chia nhóm hoặc chia bước khi thực sự cần.

* Nút hành động đặt ở vị trí dễ tìm và thống nhất giữa các Form tương tự.

* Responsive phải đảm bảo trường nhập không bị tràn hoặc quá hẹp.

* Không dùng quá nhiều cột khiến biểu mẫu khó đọc.

## 52. Label — Nhãn trường nhập

* Mỗi trường nhập phải có Label mô tả rõ dữ liệu cần nhập.

* Label đặt ở vị trí nhất quán, ưu tiên phía trên trường nhập.

* Font, kích thước, màu sắc và khoảng cách phải thống nhất.

* Không dùng Placeholder thay thế Label.

* Trường bắt buộc phải được đánh dấu theo Required Field System.

* Tên Label ngắn gọn, tránh thuật ngữ khó hiểu hoặc mơ hồ.

## 53. Placeholder — Nội dung gợi ý

* Dùng để đưa ra ví dụ hoặc hướng dẫn ngắn cho dữ liệu cần nhập.

* Không dùng Placeholder thay Label.

* Nội dung phải ngắn gọn, đúng ngữ cảnh.

* Ví dụ: `Nhập tên sản phẩm...`, `Nhập số điện thoại...`.

* Dùng màu Text Muted nhưng vẫn đảm bảo độ tương phản dễ đọc.

* Không đặt thông tin quan trọng duy nhất trong Placeholder vì nội dung biến mất khi nhập.

* Không dùng Placeholder cho nội dung mặc định nếu dữ liệu đó sẽ được lưu như giá trị thực.

## 54. Required Field — Trường bắt buộc

* Trường bắt buộc phải được đánh dấu thống nhất, ví dụ dấu `*`.

* Quy ước dấu `*` phải được giải thích rõ khi cần.

* Quy tắc bắt buộc phải khớp với validation phía giao diện và phía server.

* Không đánh dấu bắt buộc nếu nghiệp vụ cho phép bỏ trống.

* Khi thiếu dữ liệu, hiển thị lỗi gần trường tương ứng.

* Không chỉ dựa vào màu sắc để thể hiện trường bắt buộc.

## 55. Validation — Kiểm tra dữ liệu

* Kiểm tra dữ liệu theo quy tắc nghiệp vụ trước khi gửi và tại server.

* Kiểm tra đúng kiểu dữ liệu, định dạng, độ dài, giới hạn và tính hợp lệ.

* Ưu tiên hiển thị lỗi sau khi người dùng rời trường hoặc gửi Form; tránh báo lỗi liên tục khi chưa nhập xong.

* Khi dữ liệu sai, chỉ rõ trường cần sửa và cách sửa.

* Khi sửa đúng, cập nhật trạng thái lỗi phù hợp.

* Không xóa dữ liệu hợp lệ người dùng đã nhập chỉ vì có trường khác bị lỗi.

* Không coi validation phía Frontend là cơ chế bảo mật thay cho Backend.

## 56. Error Message — Thông báo lỗi

* Hiển thị gần trường hoặc thao tác gây ra lỗi.

* Nội dung phải ngắn gọn, dễ hiểu và nêu cách khắc phục nếu có thể.

* Dùng Error Color và icon theo quy chuẩn chung.

* Không chỉ hiển thị mã lỗi kỹ thuật hoặc thông báo chung chung như `Có lỗi xảy ra` nếu có thể giải thích cụ thể hơn.

* Không hiển thị đồng thời nhiều thông báo trùng lặp cho cùng một lỗi.

* Giữ dữ liệu người dùng đã nhập khi có thể.

* Lỗi quan trọng phải dễ nhận biết, không phụ thuộc riêng vào màu sắc.

## 57. Success Message — Thông báo thành công

* Chỉ hiển thị sau khi hệ thống xác nhận thao tác thành công.

* Nội dung ngắn gọn, nêu rõ kết quả: `Cập nhật sản phẩm thành công`.

* Dùng Success Color theo Semantic Color System.

* Với thao tác ngắn, dùng Toast; với quy trình dài hoặc kết quả cần hiển thị tại chỗ, dùng phản hồi phù hợp.

* Không hiển thị thông báo thành công trùng lặp.

* Không dùng thông báo thành công để thay thế việc cập nhật dữ liệu thực tế trên giao diện.

## 58. Disabled State — Trạng thái vô hiệu hóa

* Dùng khi thành phần tạm thời không thể tương tác.

* Phải có kiểu hiển thị Disabled thống nhất, dễ phân biệt với trạng thái bình thường.

* Không chỉ dùng màu sắc để thể hiện Disabled.

* Không cho phép thực hiện hành động khi thành phần đang Disabled.

* Chỉ vô hiệu hóa khi có lý do rõ ràng.

* Nếu lý do không thể thao tác không hiển nhiên, cung cấp hướng dẫn phù hợp.

* Phân biệt Disabled với Loading: Disabled là không thể tương tác; Loading là đang xử lý.

## 59. Read-only State — Trạng thái chỉ đọc

* Dùng khi người dùng được xem dữ liệu nhưng không được chỉnh sửa.

* Phải phân biệt rõ với trường nhập có thể chỉnh sửa và trường Disabled.

* Giá trị phải dễ đọc, có thể sao chép nếu phù hợp.

* Không hiển thị kiểu Read-only khiến dữ liệu trông như bị lỗi hoặc mất khả năng đọc.

* Không cho phép chỉnh sửa qua giao diện; Backend vẫn phải kiểm tra quyền cập nhật.

* Chỉ dùng khi nghiệp vụ yêu cầu xem dữ liệu nhưng không cho sửa.

## 60. Form Submit / Cancel — Gửi / Hủy biểu mẫu

* Nút Submit phải thể hiện rõ hành động: `Lưu`, `Tạo sản phẩm`, `Cập nhật`.

* Nút Cancel phải có kiểu Secondary và không nổi bật hơn hành động chính.

* Khi Submit, phải kiểm tra Validation và ngăn gửi lặp.

* Trong lúc xử lý, hiển thị Loading và khóa thao tác gửi lặp.

* Chỉ thông báo thành công khi server xác nhận thành công.

* Nếu Submit thất bại, giữ dữ liệu đã nhập và hiển thị lỗi phù hợp.

* Nếu Cancel có thể làm mất dữ liệu chưa lưu, yêu cầu xác nhận khi cần.

* Sau khi thành công, cập nhật giao diện hoặc điều hướng theo đúng luồng nghiệp vụ.

* Thống nhất vị trí và thứ tự nút trên các Form tương tự.
