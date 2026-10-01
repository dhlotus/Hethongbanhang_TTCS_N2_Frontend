import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { getRedirectPathByUser, getStoredUser } from "../utils/navigation";

interface ProtectedRouteProps {
  children?: React.ReactNode;
  allowedRoles?: string[];
}

/**
 * Component Bảo vệ Route (Protected Route):
 * 1. Kiểm tra Authentication: Nếu chưa có token, tự động chuyển hướng về /auth/login.
 * 2. Kiểm tra Authorization (Phân quyền): Nếu có yêu cầu role cụ thể mà user không có quyền, chuyển hướng về route mặc định của user.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const location = useLocation();
  const token = localStorage.getItem("auth_token");
  const user = getStoredUser();

  // 1. Kiểm tra Token đăng nhập
  if (!token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 3. Kiểm tra phân quyền theo vai trò (nếu có khai báo allowedRoles)
  if (allowedRoles && allowedRoles.length > 0 && user?.roles) {
    const userRolesLower = user.roles.map((r) => r.toLowerCase());
    const hasPermission = allowedRoles.some((allowed) =>
      userRolesLower.includes(allowed.toLowerCase()),
    );

    if (!hasPermission) {
      // Điều hướng về trang tương ứng với vai trò của user nếu cố tình truy cập trang không có quyền
      const fallbackPath = getRedirectPathByUser(user);
      return <Navigate to={fallbackPath} replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
