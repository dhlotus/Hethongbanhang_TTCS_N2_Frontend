import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { LoginPage } from "../pages/login-page";
import { LogOut, User, CheckCircle2, Shield, Compass } from "lucide-react";
import type { AuthUser } from "../types/auth";
import { getRedirectPathByRole, ROLE_ROUTES } from "../utils/auth";

// Component hiển thị Dashboard mẫu tương ứng sau khi đăng nhập thành công
const DashboardView: React.FC<{ defaultTitle?: string }> = ({ defaultTitle = "Trang chủ" }) => {
  const location = useLocation();

  React.useEffect(() => {
    document.title = `${defaultTitle} | LOHA SALES`;
  }, [defaultTitle]);

  const token =
    localStorage.getItem("access_token") || localStorage.getItem("auth_token");
  const storedUser = localStorage.getItem("auth_user");
  const user: AuthUser | null = storedUser ? JSON.parse(storedUser) : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center antialiased">
      <div className="max-w-lg w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-[0_10px_35px_rgba(0,0,0,0.04)] p-6 sm:p-8 text-left">
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg shadow-2xs">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{user?.fullName || "Người dùng"}</h1>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-slate-400" />
              Tuyến đường (Route):
            </span>
            <span className="font-mono text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-md">
              {location.pathname}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-slate-400" />
              Vai trò hệ thống:
            </span>
            <span className="font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-md text-xs">
              {user?.roles?.join(", ") || "User"}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Trạng thái xác thực:
            </span>
            <span className="font-medium text-emerald-600 text-xs">
              Đã đăng nhập (Tokens lưu an toàn)
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 rounded-xl border border-red-200 bg-white text-red-600 hover:bg-red-50 active:bg-red-100 font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

// Component điều hướng thông minh ở root '/'
const RootRedirect: React.FC = () => {
  const token =
    localStorage.getItem("access_token") || localStorage.getItem("auth_token");
  const storedUser = localStorage.getItem("auth_user");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let targetPath = "/";
  if (storedUser) {
    try {
      const user: AuthUser = JSON.parse(storedUser);
      targetPath = getRedirectPathByRole(user.roles);
    } catch {
      targetPath = "/";
    }
  }

  if (targetPath && targetPath !== "/") {
    return <Navigate to={targetPath} replace />;
  }

  return <DashboardView defaultTitle="Trang chủ" />;
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RootRedirect />} />
        
        {/* Các tuyến đường Dashboard tương ứng theo vai trò (Role Routes) */}
        <Route
          path={ROLE_ROUTES.ADMIN}
          element={<DashboardView defaultTitle="Quản trị Hệ thống" />}
        />
        <Route
          path={ROLE_ROUTES.SALES_REP}
          element={<DashboardView defaultTitle="Kinh doanh B2B" />}
        />
        <Route
          path={ROLE_ROUTES.WAREHOUSE_KEEPER}
          element={<DashboardView defaultTitle="Quản lý Kho & Tồn kho" />}
        />
        <Route
          path={ROLE_ROUTES.ACCOUNTANT}
          element={<DashboardView defaultTitle="Kế toán & Công nợ" />}
        />
        <Route
          path={ROLE_ROUTES.CUSTOMER}
          element={<DashboardView defaultTitle="Cổng Đại lý B2B" />}
        />

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
