import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../pages/login-page";
import { LogOut, User, CheckCircle2 } from "lucide-react";
import type { AuthUser } from "../types/auth";

// Component bảo vệ route hoặc trang chủ sau khi đăng nhập thành công
const HomePage: React.FC = () => {
  React.useEffect(() => {
    document.title = "Trang chủ | LOHA SALES";
  }, []);

  const token = localStorage.getItem("auth_token");
  const storedUser = localStorage.getItem("auth_user");
  const user: AuthUser | null = storedUser ? JSON.parse(storedUser) : null;

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-8 text-left">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">{user?.fullName || "Người dùng"}</h1>
            <p className="text-xs text-slate-500 font-mono">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500">Vai trò:</span>
            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md text-xs">
              {user?.roles?.join(", ") || "User"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-500">Trạng thái xác thực:</span>
            <span className="font-medium text-emerald-600 flex items-center gap-1 text-xs">
              <CheckCircle2 className="w-4 h-4" /> Đã đăng nhập
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full py-2.5 px-4 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 active:bg-red-100 font-medium text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
