import React from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import {
  ShieldAlert,
  ArrowLeft,
  Home,
  Lock,
  MapPin,
  HelpCircle,
  ShieldX,
} from "lucide-react";
import { getStoredUser, getRedirectPathByUser, getRedirectPathByRole } from "../utils/navigation";
import { getUserContext, ROLE_CONFIGS, normalizeRole } from "../utils/navigation-config";
import type { UserRoleType } from "../types/auth";

interface ForbiddenPageProps {
  allowedRoles?: string[];
  moduleName?: string;
  customMessage?: string;
}

/**
 * Trang thông báo lỗi 403 (Forbidden / Không đủ quyền hạn - SN-12):
 * - Hiển thị khi người dùng cố tình truy cập vào route vượt quá thẩm quyền của vai trò hiện tại
 * - Cung cấp ngữ cảnh rõ ràng: Phân hệ yêu cầu, Quyền hạn hiện tại của người dùng
 * - Cung cấp Call-to-Action rõ ràng: "Quay lại trang trước" và "Về trang chủ của bạn"
 * - Tuân thủ tuyệt đối chuẩn UI_GUIDELINES.md: Clean SaaS, bo góc mềm rounded-2xl, tone màu cảnh báo nhã nhặn (Amber/Slate)
 */
export const ForbiddenPage: React.FC<ForbiddenPageProps> = ({
  allowedRoles,
  moduleName,
  customMessage,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getStoredUser();
  const context = getUserContext(user);

  const role = user?.roles?.[0] || user?.role;
  const homePath = role ? getRedirectPathByRole(role) : getRedirectPathByUser(user);

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(homePath, { replace: true });
    }
  };

  // Chuyển đổi danh sách role yêu cầu sang tiếng Việt thân thiện
  const formattedAllowedRoles = allowedRoles && allowedRoles.length > 0
    ? allowedRoles.map((r) => {
        const normalized = normalizeRole(r) as UserRoleType;
        return ROLE_CONFIGS[normalized]?.shortLabel || r;
      }).join(", ")
    : "Quản trị viên hoặc vai trò chuyên trách";

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-3 sm:p-4 antialiased">
      <div className="w-full max-w-xl mx-auto text-center">
        {/* Card chứa nội dung thông báo lỗi 403 */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-200/70 bg-white p-6 sm:p-10 shadow-sm">
          {/* Vệt sáng trang trí màu Amber dịu mắt */}
          <div className="absolute -top-16 -right-16 h-44 w-44 rounded-full bg-amber-50/70 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 h-44 w-44 rounded-full bg-orange-50/50 blur-2xl pointer-events-none" />

          {/* 1. Badge mã trạng thái HTTP */}
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3.5 py-1 text-xs font-bold text-amber-800 ring-1 ring-inset ring-amber-600/20 mb-6">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
            <span>MÃ LỖI: 403 • TRUY CẬP BỊ TỪ CHỐI</span>
          </div>

          {/* 2. Biểu tượng minh họa trực quan */}
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-50 to-orange-50 text-amber-600 ring-8 ring-amber-50/60 shadow-2xs">
            <Lock className="h-9 w-9 text-amber-600" />
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white ring-2 ring-white">
              <ShieldX className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* 3. Tiêu đề & Thông điệp giải thích */}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-2">
            Truy cập bị từ chối / Không đủ quyền hạn
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
            {customMessage || (
              <>
                Tài khoản của bạn (<strong className="text-slate-700">{context.fullName}</strong>) hiện không có quyền thao tác trên phân hệ này.
                Vui lòng kiểm tra lại quyền hạn hoặc liên hệ Quản trị viên để được cấp quyền.
              </>
            )}
          </p>

          {/* 4. Khung thông tin đối soát ngữ cảnh */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 mb-6 text-left space-y-2.5 max-w-md mx-auto shadow-2xs">
            {/* Phân hệ cố gắng truy cập */}
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-slate-500 font-medium">Phân hệ yêu cầu:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[240px]">
                {moduleName || location.pathname}
              </span>
            </div>

            {/* Quyền hạn được phép */}
            <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Quyền hạn cần có:</span>
              <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md ring-1 ring-amber-600/15 truncate max-w-[240px]">
                {formattedAllowedRoles}
              </span>
            </div>

            {/* Vai trò hiện tại của người dùng */}
            <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-medium">Vai trò hiện tại:</span>
              <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${context.badgeClass}`}>
                {context.roleLabel}
              </span>
            </div>

            {/* Địa bàn / Kho trực thuộc */}
            <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-slate-100">
              <span className="text-slate-500 font-medium flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span>Kho / Địa bàn:</span>
              </span>
              <span className="font-medium text-slate-700 truncate max-w-[240px]" title={context.locationText}>
                {context.locationText}
              </span>
            </div>
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
              <span>Về trang chủ của bạn</span>
            </Link>
          </div>
        </div>

        {/* Dòng ghi chú liên hệ hỗ trợ */}
        <div className="mt-4 flex items-center justify-center gap-1 text-[11px] text-slate-400">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Cần hỗ trợ phân quyền? Hãy liên hệ Quản trị viên hệ thống qua admin@loha.vn</span>
        </div>
      </div>
    </div>
  );
};
