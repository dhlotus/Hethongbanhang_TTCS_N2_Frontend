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
 
