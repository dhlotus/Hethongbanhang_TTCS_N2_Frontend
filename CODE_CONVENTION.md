TÀI LIỆU QUY CHUẨN CODE CONVENTION 
1. Quy tắc đặt tên
Biến & Hàm: Dùng camelCase. Tên hàm phải bắt đầu bằng động từ hành động.
Ví dụ: getUserData, calculateTotal, isLocked.
Class, UI Component, DTO & Entity: Dùng PascalCase. Danh từ số ít.
Ví dụ (React): UserProfile, LoginForm.
Ví dụ (NestJS): UserController, CreateUserDto, ProductEntity.
Hằng số & Enum: Dùng UPPER_SNAKE_CASE.
Ví dụ: MAX_LOGIN_ATTEMPTS, API_BASE_URL.
Tên File & Thư mục: BẮT BUỘC dùng kebab-case (chữ thường, gạch ngang) cho toàn bộ dự án để tránh lỗi không đồng bộ giữa Windows và Linux/Mac.
Ví dụ (React): user-profile.tsx, use-auth.ts.
Ví dụ (NestJS): auth.controller.ts, inventory.service.ts.
2. Cấu trúc thư mục (Tách biệt 2 Repo)
A. REPO FRONTEND (React + TypeScript)
Mã nguồn đặt trong src/, phân tách rõ ràng UI và Logic:
/components: Chứa UI dùng chung (nhận Props, không gọi API). VD: button/, modal/.
/pages: Chứa các màn hình hoàn chỉnh, gắn liền với React Router. VD: login-page/.
/services: Chứa các file gọi API (dùng Axios). Tuyệt đối không viết fetch/axios trực tiếp trong Component.
/types: Định nghĩa Interface/Type cho dữ liệu (để đồng bộ với Backend).
/hooks: Chứa các custom hooks. VD: use-auth.ts.
/utils: Chứa hàm tiện ích xử lý chuỗi, ngày tháng, tính toán.
B. REPO BACKEND (NestJS)
Tuân thủ kiến trúc Feature-Module của NestJS 
/modules: Chia theo từng nghiệp vụ (VD: /auth, /users, /inventory). Mỗi thư mục nghiệp vụ phải chứa đủ:
*.controller.ts: Chỉ nhận Request và trả Response (Không viết logic ở đây).
*.service.ts: Chứa toàn bộ logic xử lý, tính toán, gọi CSDL.
/dto & /entities: Cấu trúc dữ liệu đầu vào và cấu trúc bảng CSDL.
*.module.ts: Đóng gói nghiệp vụ.
/common: Chứa các thành phần dùng chung toàn hệ thống (Guards, Interceptors, Filters, Decorators).
/config: Chứa file load biến môi trường (.env).
3. Quy chuẩn viết code (TypeScript Core)
Luật Type Safety (Kiểu dữ liệu): Dùng TypeScript thì tuyệt đối cấm dùng kiểu any. Mọi biến, tham số, dữ liệu trả về đều phải được định nghĩa Interface, Type hoặc DTO rõ ràng.
Một hàm - Một việc: Hàm không quá 30 - 50 dòng. Nếu quá dài, bắt buộc tách thành các hàm helper nhỏ hơn.
Nguyên tắc DRY: Không copy-paste code. Đoạn logic nào lặp lại lần thứ 2 thì xem xét, lặp lại lần thứ 3 thì bắt buộc đưa vào thư mục /utils hoặc shared service.
Không "Magic Numbers/Strings": Tuyệt đối không gõ trực tiếp số/chuỗi trạng thái rải rác.
Sai: if (status === 2)
Đúng: if (status === OrderStatus.SHIPPED) (Khai báo enum OrderStatus).
Xử lý ngoại lệ (Error Handling):
Backend: Không dùng try-catch tràn lan ở Controller. Hãy để Exception Filter của NestJS lo. Chỉ dùng try-catch trong Service khi cần bắt lỗi DB hoặc API bên thứ 3.
Frontend: Mọi lời gọi API phải có try-catch để hiển thị thông báo lỗi (Toast/Alert) cho người dùng, không để ứng dụng bị crash trắng màn hình.
4. Quy tắc định dạng (Formatting)
Tự động hóa 100%: Bắt buộc cài đặt Prettier và ESLint trong VS Code. Bật tính năng "Format on Save" (Lưu là tự động căn dòng).
Thụt lề: Dùng 2 spaces.
Dấu phẩy cuối (Trailing Comma): Bắt buộc thêm dấu phẩy ở phần tử cuối cùng của mảng/object để dễ xem lịch sử thay đổi (diff) trên Git.
5. Quy tắc Comment
Code tự giải thích: Đặt tên biến/hàm rõ nghĩa để đọc như tiếng Anh, hạn chế tối đa việc phải comment.
Chỉ comment "TẠI SAO": Không giải thích đoạn code đang làm gì (vì đọc code là hiểu), chỉ comment giải thích tại sao phải viết như vậy (ví dụ: "Phải dùng vòng lặp này vì API bên thứ 3 trả về data bị lỗi...").
JSDoc cho hàm dùng chung: Các hàm ở /utils hoặc Core Service bắt buộc comment theo chuẩn JSDoc /** ... */ phía trên hàm để mô tả tham số (Params) và dữ liệu trả về (Returns).
6. Quy tắc làm việc với Git (MỚI THÊM)
Quy tắc tạo nhánh (Branch): loại-nhánh/ticket-id-mô-tả-ngắn.
Ví dụ: feat/SCRUM-18-dang-nhap hoặc fix/SCRUM-20-loi-hien-thi-bang.
Quy tắc Commit Message: Sử dụng Conventional Commits.
feat: thêm chức năng ABC
fix: sửa lỗi XYZ
chore: cập nhật thư viện, dọn code

