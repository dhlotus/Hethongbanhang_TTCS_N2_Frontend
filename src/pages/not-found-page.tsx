import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  FileQuestion,
  Home,
  ArrowLeft,
  Compass,
  Layers,
  Search,
} from "lucide-react";
import { getStoredUser, getRedirectPathByUser, getRedirectPathByRole } from "../utils/navigation";
import { tokenStorage } from "../utils/token-storage";

interface NotFoundPageProps {
  standalone?: boolean;
}

/**
 * Trang thông báo lỗi 404 (Not Found - SN-12):
 * - Hiển thị thân thiện khi người dùng truy cập nhầm đường dẫn hoặc liên kết bị hỏng
 * - Tự động thích ứng: Hiển thị bên trong layout ứng dụng hoặc toàn màn hình nếu truy cập ngoài
 * - Cung cấp Call-to-Action rõ ràng: "Quay lại trang chủ" (về đúng trang chủ theo Role) và "Quay lại trang trước"
 * - Tuân thủ tuyệt đối chuẩn UI_GUIDELINES.md: Clean SaaS, bo góc mềm rounded-2xl, soft shadow
 */
export const NotFoundPage: React.FC<NotFoundPageProps> = ({ standalone = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = tokenStorage.getAccessToken();
  const user = getStoredUser();

  // Xác định đường dẫn trang chủ tối ưu: nếu đã đăng nhập thì về theo Role thông qua getRedirectPathByRole, nếu chưa thì về /login
  const role = user?.roles?.[0] || user?.role;
  const homePath = token ? (role ? getRedirectPathByRole(role) : getRedirectPathByUser(user)) : "/login";

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(homePath, { replace: true });
    }
  };

  const content = (
    <div className="w-full max-w-lg mx-auto py-8 sm:py-12 px-4 text-center">
      {/* Card chứa nội dung thông báo lỗi */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-sm">
        {/* Vệt sáng gradient trang trí mờ nhẹ */}
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-blue-50/70 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-indigo-50/60 blur-2xl pointer-events-none" />

        {/* 1. Badge mã trạng thái HTTP */}
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-200/80 mb-6">
          <Compass className="h-3.5 w-3.5 text-blue-600 animate-spin-slow" />
          <span>MÃ LỖI: 404 • KHÔNG TÌM THẤY TRANG</span>
        </div>

        {/* 2. Biểu tượng minh họa trực quan */}
        <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 text-blue-600 ring-8 ring-blue-50/50 shadow-2xs">
          <FileQuestion className="h-10 w-10 text-blue-600" />
        </div>

        {/* 3. Tiêu đề & Thông điệp giải thích */}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2">
          Không tìm thấy trang
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
          Địa chỉ liên kết bạn đang tìm kiếm không tồn tại, đã bị di dời hoặc bạn đã nhập sai đường dẫn.
          Vui lòng kiểm tra lại URL hoặc quay về trang làm việc.
        </p>

        {/* 4. Thông tin đường dẫn đã truy cập */}
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 mb-6 flex items-center justify-center gap-2 text-xs text-slate-600 max-w-sm mx-auto">
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-400">Đường dẫn:</span>
          <code className="font-mono font-semibold text-blue-600 truncate max-w-[220px]">
            {location.pathname}
          </code>
        </div>

        {/* 5. Nhóm nút hành động gợi ý (Call-to-Action) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {/* Nút 1: Quay lại trang trước */}
          <button
            type="button"
            onClick={handleGoBack}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 active:scale-[0.98] transition-all focus:outline-none cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            <span>Quay lại trang trước</span>
          </button>

          {/* Nút 2: Về trang chủ theo vai trò */}
          <Link
            to={homePath}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition-all focus:outline-none cursor-pointer"
          >
            <Home className="h-4 w-4" />
            <span>{token ? "Về trang chủ của bạn" : "Đăng nhập hệ thống"}</span>
          </Link>
        </div>
      </div>

      {/* Dòng ghi chú chân trang */}
      <p className="mt-6 text-[11px] text-slate-400">
        Hệ thống Quản lý Bán hàng & Kho B2B • LOHA SALES
      </p>
    </div>
  );

  // Nếu hiển thị chế độ độc lập (Standalone) khi người dùng chưa đăng nhập
  if (standalone || !token) {
    return (
      <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 antialiased p-4">
        {/* Header thương hiệu tối giản */}
        <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <span className="text-base font-bold text-slate-900 tracking-tight">
              LOHA SALES
            </span>
          </Link>

          <Link
            to="/login"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
          >
            Đăng nhập
          </Link>
        </header>

        {/* Nội dung trung tâm */}
        <main className="flex-1 flex items-center justify-center">{content}</main>

        <footer className="text-center text-[11px] text-slate-400 py-3">
          © 2026 LOHA SALES. Tất cả các quyền được bảo lưu.
        </footer>
      </div>
    );
  }

  // Mặc định: Hiển thị tự nhiên bên trong khung Layout chính
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      {content}
    </div>
  );
};
