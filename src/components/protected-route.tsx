import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { getStoredUser } from "../utils/navigation";
import { tokenStorage } from "../utils/token-storage";
import { ForbiddenPage } from "../pages/forbidden-page";

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
  const token = tokenStorage.getAccessToken();
  const user = getStoredUser();

  // 1. Kiểm tra Token đăng nhập
  if (!token) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // 2. Kiểm tra phân quyền theo vai trò (nếu có khai báo allowedRoles)
  if (allowedRoles && allowedRoles.length > 0 && user?.roles) {
    const userRoles = (user.roles || (user.role ? [user.role] : [])).map((r) =>
      r.trim().toUpperCase(),
    );

    if (!userRoles.includes("ADMIN")) {
      const hasPermission = allowedRoles.some((allowed) =>
        userRoles.includes(allowed.trim().toUpperCase()),
      );

      if (!hasPermission) {
        return <ForbiddenPage allowedRoles={allowedRoles} />;
      }
    }
  }

  return children ? <>{children}</> : <Outlet />;
};
