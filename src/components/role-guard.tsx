import React from "react";
import { Outlet } from "react-router-dom";
import { getStoredUser } from "../utils/navigation";
import { ForbiddenPage } from "../pages/forbidden-page";

interface RoleGuardProps {
  allowedRoles: string[];
  moduleName?: string;
  children?: React.ReactNode;
}

/**
 * Component kiểm soát phân quyền cấp Route (Role-based Route Guard - SN-12):
 * - Đọc vai trò của người dùng hiện tại từ localStorage
 * - ADMIN luôn sở hữu toàn quyền truy cập (Full access)
 * - Nếu người dùng không thuộc danh sách allowedRoles, lập tức hiển thị màn hình 403 Forbidden chuẩn UI
 * - Tuyệt đối không để xảy ra màn hình trắng hoặc chuyển hướng mù quáng
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  allowedRoles,
  moduleName,
  children,
}) => {
  const user = getStoredUser();

  if (!user) {
    return <ForbiddenPage allowedRoles={allowedRoles} moduleName={moduleName} />;
  }

  const userRoles = (user.roles || (user.role ? [user.role] : [])).map((r) =>
    r.trim().toUpperCase(),
  );

  // 1. Quản trị viên (ADMIN) luôn sở hữu toàn quyền truy cập
  if (userRoles.includes("ADMIN")) {
    return children ? <>{children}</> : <Outlet />;
  }

  // 2. Đối chiếu vai trò của người dùng với danh sách vai trò cho phép
  const isAuthorized = allowedRoles.some((allowed) =>
    userRoles.includes(allowed.trim().toUpperCase()),
  );

  // 3. Nếu không có quyền, render trang 403 Forbidden kèm ngữ cảnh chi tiết
  if (!isAuthorized) {
    return (
      <ForbiddenPage
        allowedRoles={allowedRoles}
        moduleName={moduleName}
      />
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
