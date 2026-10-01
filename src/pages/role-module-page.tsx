import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Layers,
  ArrowRight,
  LogOut,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { authService } from "../services/auth.service";

interface RoleModulePageProps {
  title: string;
  subtitle: string;
  requiredRole: string;
}

/**
 * Trang hiển thị giao diện phân hệ theo vai trò (Card-based UI chuẩn UI_GUIDELINES.md):
 * - Dùng để hiển thị nội dung mẫu cho các route của từng phân hệ
 * - Hiển thị thông tin phiên đăng nhập, vai trò, đường dẫn hiện tại
 */
export const RoleModulePage: React.FC<RoleModulePageProps> = ({
  title,
  subtitle,
  requiredRole,
}) => {
  const navigate = useNavigate();
  const user = getStoredUser();

  const handleLogout = async () => {
    await authService.logout();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner của Phân hệ */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
        <div className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-blue-50/70 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span>Phân hệ Vai trò: {requiredRole}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="text-sm text-slate-500 max-w-2xl">{subtitle}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-all focus:outline-none"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Grid Cards thông tin tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Người dùng đăng nhập */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Tài khoản xác thực</p>
              <p className="text-sm font-bold text-slate-800">
                {user?.fullName || "Chưa xác định"}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Email</span>
            <span className="font-medium text-slate-700">{user?.email}</span>
          </div>
        </div>

        {/* Card 2: Trạng thái Module */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Trạng thái phân hệ</p>
              <p className="text-sm font-bold text-slate-800">Khung xương hoàn tất</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Quyền hạn</span>
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
              {user?.roles?.join(", ") || requiredRole}
            </span>
          </div>
        </div>

        {/* Card 3: Kiến trúc Layout */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Layout Đang Sử Dụng</p>
              <p className="text-sm font-bold text-slate-800">AdminLayout v1.0</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Responsive</span>
            <span className="text-slate-700 font-medium">Sidebar + Header + Outlet</span>
          </div>
        </div>
      </div>

      {/* 3. Vùng nội dung trống sẵn sàng cho nghiệp vụ (Placeholder) */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <Layers className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-slate-800">
          Vùng nội dung nghiệp vụ ({title})
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          Giao diện khung xương đã được thiết lập thành công. Các bảng dữ liệu (Data Table),
          bộ lọc và chức năng quản trị sẽ được đưa vào đây ở các bước tiếp theo.
        </p>
        <div className="mt-5 flex justify-center">
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            <span>Đường dẫn URL:</span>
            <code className="font-mono text-blue-600">{window.location.pathname}</code>
            <ArrowRight className="h-3 w-3 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
