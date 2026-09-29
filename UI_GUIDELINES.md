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