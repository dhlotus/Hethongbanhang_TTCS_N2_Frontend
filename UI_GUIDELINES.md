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

### 1.1. Nguyên tắc chung

- Toàn bộ giao diện LOHA SALES phải sử dụng một hệ thống màu thống nhất.
- Tone màu thương hiệu chính: **Tím + Xanh Lavi (Lavender/Blue)** theo hướng hiện đại, sạch, chuyên nghiệp và phù hợp phần mềm SaaS.
- Không sử dụng màu tùy ý tại từng màn hình/component.
- Mọi màu được sử dụng trong UI phải thuộc một trong các nhóm màu đã được định nghĩa bên dưới.
- Không dùng màu chỉ để trang trí; màu phải có mục đích về thương hiệu, trạng thái hoặc phân cấp thông tin.
- Ưu tiên nền sáng, bề mặt trắng/sáng và màu thương hiệu làm điểm nhấn, tránh giao diện quá sặc sỡ.

### 1.2. Màu thương hiệu

**Primary — Tím**
- Là màu thương hiệu chính.
- Dùng cho: Primary Button, Link, Active Navigation, Focus, Selected State và các điểm nhấn chính.

**Secondary — Xanh Lavi**
- Là màu hỗ trợ cho màu Tím.
- Dùng cho: Secondary Highlight, Background Accent, Selected/Active nhẹ và các khu vực cần tạo sự phân biệt nhưng không cạnh tranh với Primary.

> Tím là màu nhận diện chính. Xanh Lavi là màu hỗ trợ, không được sử dụng để thay thế Primary một cách tùy tiện.

### 1.3. Semantic Colors

Chỉ sử dụng màu semantic khi truyền đạt trạng thái:

- **Success — Xanh lá:** thao tác thành công, trạng thái tốt.
- **Error/Danger — Đỏ:** lỗi, thất bại, hành động nguy hiểm/xóa.
- **Warning — Vàng/Cam:** cảnh báo, cần chú ý.
- **Info — Xanh dương:** thông tin hoặc trạng thái trung lập cần chú ý.

Semantic color phải được sử dụng nhất quán trên toàn hệ thống.

### 1.4. Neutral Colors

Neutral Colors dùng cho phần lớn giao diện:

- Background
- Surface/Card
- Border/Divider
- Text Primary
- Text Secondary
- Placeholder
- Disabled

Không dùng Tím hoặc Xanh Lavi cho toàn bộ text, border hoặc background chỉ để tạo màu sắc.

### 1.5. Quy tắc sử dụng màu

- Không tạo thêm màu mới nếu đã có màu tương đương trong Design System.
- Không thay đổi màu của cùng một component giữa các màn hình nếu không có lý do về trạng thái.
- Hover, Active, Focus, Disabled phải sử dụng các biến thể được định nghĩa từ màu gốc.
- Text phải đảm bảo đủ độ tương phản với background.
- Không dùng nhiều màu nổi bật cạnh nhau nếu chúng không có ý nghĩa rõ ràng.
- Một component chỉ nên có **một màu hành động chính** tại một thời điểm.
- Màu trạng thái không được dùng thay cho màu thương hiệu.

### 1.6. Design Tokens

Màu sắc phải được định nghĩa tập trung bằng Design Tokens/CSS Variables/Theme.

Ví dụ:

```css
--color-primary: ...;
--color-primary-hover: ...;
--color-secondary: ...;
--color-secondary-hover: ...;

--color-success: ...;
--color-warning: ...;
--color-error: ...;
--color-info: ...;

--color-background: ...;
--color-surface: ...;
--color-border: ...;

--color-text-primary: ...;
--color-text-secondary: ...;
--color-text-muted: ...;
--color-text-disabled: ...;

