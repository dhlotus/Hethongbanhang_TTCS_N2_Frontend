import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  MapPin,
  Package,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { getStoredUser } from "../utils/navigation";
import { getUserContext } from "../utils/navigation-config";

interface RoleModulePageProps {
  title: string;
  subtitle: string;
  requiredRole: string;
}

/**
 * Trang hiển thị giao diện phân hệ nghiệp vụ (Card-based UI chuẩn UI_GUIDELINES.md):
 * - Tự động đồng bộ với Role và Ngữ cảnh của người dùng đăng nhập
 * - Hiển thị trạng thái phân quyền, địa bàn/kho trực thuộc
 * - Khung chức năng sạch sẽ, hiện đại, sẵn sàng cho các bảng dữ liệu chuyên sâu
 */
export const RoleModulePage: React.FC<RoleModulePageProps> = ({
  title,
  subtitle,
  requiredRole,
}) => {
  const location = useLocation();
  const user = getStoredUser();
  const context = getUserContext(user);

  return (
    <div className="space-y-6">
      {/* =================================================================== */}
      {/* 1. Header Banner của Phân hệ                                        */}
      {/* =================================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-blue-50/60 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${context.badgeClass}`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{context.roleLabel}</span>
              </span>

              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                <MapPin className="h-3 w-3 text-slate-400" />
                <span>{context.locationText}</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <Link
              to="/catalog/products"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition-colors"
            >
              <Package className="h-4 w-4 text-slate-400" />
              <span>Tra cứu Sản phẩm</span>
            </Link>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 2. Grid Cards thông tin tổng quan & ngữ cảnh phân hệ                 */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Người dùng & Quyền hạn */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Shield className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">Tài khoản xác thực</p>
              <p className="text-sm font-bold text-slate-800 truncate">
                {context.fullName}
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Vai trò hệ thống</span>
            <span className="font-semibold text-slate-700">{context.role}</span>
          </div>
        </div>

        {/* Card 2: Trạng thái kết nối & Kho / Địa bàn */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">Trạng thái kết nối</p>
              <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span>Hoạt động bình thường</span>
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Phạm vi công tác</span>
            <span className="font-semibold text-slate-700 truncate max-w-[170px]" title={context.locationText}>
              {context.locationText}
            </span>
          </div>
        </div>

        {/* Card 3: Phân hệ & Kiến trúc Dynamic Navigation */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-400">Cơ chế điều hướng</p>
              <p className="text-sm font-bold text-slate-800">Dynamic Navigation (SN-11)</p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Thẩm quyền cho phép</span>
            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              {requiredRole}
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 3. Vùng nội dung trống sẵn sàng cho nghiệp vụ (Placeholder)         */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 sm:p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs">
          <TrendingUp className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-800">
          Phân hệ {title}
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
          Giao diện và điều hướng phân quyền đã được thiết lập thành công theo tiêu chuẩn LOHA SALES.
          Dữ liệu và các biểu mẫu tương tác chi tiết của phân hệ này đã sẵn sàng kết nối.
        </p>
        <div className="mt-5 flex justify-center flex-wrap gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
            <span>Đường dẫn truy cập:</span>
            <code className="font-mono font-bold text-blue-600">{location.pathname}</code>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
      </div>
    </div>
  );
};
