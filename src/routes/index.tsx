import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { LoginPage } from "../pages/login-page";
import { ForgotPasswordPage } from "../pages/forgot-password-page";
import { ResetPasswordPage } from "../pages/reset-password-page";
import { ChangePasswordPage } from "../pages/change-password-page";
import { RoleModulePage } from "../pages/role-module-page";
import { ProductsPage } from "../pages/products-page";
import { UsersPage } from "../pages/users-page";
import { ProtectedRoute } from "../components/protected-route";
import { NetworkStatusIndicator } from "../components/network-status-indicator";
import { AdminLayout } from "../layouts/admin-layout";
import { getRedirectPathByUser, getStoredUser } from "../utils/navigation";
import { tokenStorage } from "../utils/token-storage";
/**
 * Layout bọc ngoài cho các phân hệ chức năng độc lập (Sales, Kho, Kế toán, Đại lý)
 */
const GeneralRoleLayout: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 sm:p-6 lg:p-8 overflow-y-auto">
      <div className="mx-auto max-w-7xl">
        <Outlet />
      </div>
    </div>
  );
};

/**
 * Component xử lý điều hướng thông minh tại root ('/'):
 * - Nếu chưa đăng nhập: chuyển hướng về trang /login
 * - Nếu đã đăng nhập: tự động chuyển hướng về route tương ứng với vai trò của user
 */
const RootRedirect: React.FC = () => {
  const token = tokenStorage.getAccessToken();
  const user = getStoredUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getRedirectPathByUser(user)} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      {/* Chỉ báo trạng thái kết nối mạng & bảo vệ bản nháp toàn cục */}
      <NetworkStatusIndicator />

      <Routes>
        {/* ================================================================= */}
        {/* 1. Tuyến đường công khai (Public Routes)                           */}
        {/* Hỗ trợ cả /login và /auth/login                                   */}
        {/* ================================================================= */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        {/* ================================================================= */}
        {/* 2. Tuyến đường được bảo vệ (Protected Routes)                      */}
        {/* ================================================================= */}
        <Route element={<ProtectedRoute />}>
          {/* Phân hệ Quản trị hệ thống sử dụng khung AdminLayout chuẩn */}
          <Route element={<AdminLayout />}>
            {/* 1. Quản lý người dùng & Phân quyền (SN-10) */}
            <Route path="/system/users" element={<UsersPage />} />

            {/* 2. Nhật ký hệ thống */}
            <Route
              path="/system/audit-logs"
              element={
                <RoleModulePage
                  title="Nhật ký hệ thống (Audit Logs)"
                  subtitle="Giám sát lịch sử đăng nhập, thay đổi dữ liệu và cảnh báo an toàn"
                  requiredRole="ADMIN"
                />
              }
            />

            {/* 3. Danh mục sản phẩm (SN-10: Bảo mật dữ liệu nhạy cảm & Phân quyền) */}
            <Route path="/catalog/products" element={<ProductsPage />} />

            {/* 4. Bảng giá & Chiết khấu */}
            <Route
              path="/catalog/pricing"
              element={
                <RoleModulePage
                  title="Bảng giá & Chiết khấu"
                  subtitle="Cấu hình ma trận giá theo nhóm đại lý, chiết khấu số lượng và khuyến mãi"
                  requiredRole="ADMIN"
                />
              }
            />

            {/* 5. Tổng quan hệ thống */}
            <Route
              path="/dashboard"
              element={
                <RoleModulePage
                  title="Bảng Điều khiển Tổng quan (Dashboard)"
                  subtitle="Chỉ số hoạt động tổng thể doanh nghiệp, biểu đồ doanh thu và vận hành"
                  requiredRole="ADMIN / MANAGER"
                />
              }
            />
          </Route>

          {/* Phân hệ dành cho các vai trò nghiệp vụ (Sales, Kho, Kế toán, Đại lý) */}
          <Route element={<GeneralRoleLayout />}>
            {/* Phân hệ 3: Nhân viên kinh doanh (Sales Rep) */}
            <Route
              path="/sales/orders"
              element={
                <RoleModulePage
                  title="Quản lý Đơn hàng Bán buôn"
                  subtitle="Phân hệ Kinh doanh theo dõi đơn hàng, áp giá và kiểm tra tồn khả dụng"
                  requiredRole="SALES_REP"
                />
              }
            />

            {/* Phân hệ 4: Thủ kho (Warehouse Keeper) */}
            <Route
              path="/inventory/stock"
              element={
                <RoleModulePage
                  title="Quản lý Tồn kho & Nhập xuất"
                  subtitle="Phân hệ Thủ kho kiểm soát vị trí, lô hạn chuẩn FEFO và phiếu xuất kho"
                  requiredRole="WAREHOUSE_KEEPER"
                />
              }
            />

            {/* Phân hệ 5: Kế toán (Accountant) */}
            <Route
              path="/accounting/invoices"
              element={
                <RoleModulePage
                  title="Quản lý Hóa đơn & Công nợ"
                  subtitle="Phân hệ Kế toán theo dõi công nợ, đối chiếu chứng từ và thanh toán"
                  requiredRole="ACCOUNTANT"
                />
              }
            />

            {/* Phân hệ 6: Đại lý / Khách hàng B2B (Customer Portal) */}
            <Route
              path="/portal/orders"
              element={
                <RoleModulePage
                  title="Cổng Đặt hàng Đại lý B2B"
                  subtitle="Phân hệ Đại lý theo dõi hạn mức tín dụng, bảng giá và đặt hàng trực tuyến"
                  requiredRole="CUSTOMER"
                />
              }
            />
          </Route>

          {/* Phân hệ Cài đặt bảo mật & Đổi mật khẩu cá nhân (Mọi vai trò đăng nhập đều có quyền) */}
          <Route path="/profile/change-password" element={<ChangePasswordPage />} />
          <Route path="/settings/security" element={<ChangePasswordPage />} />

          {/* Alias routes tương thích ngược */}
          <Route path="/admin/dashboard" element={<Navigate to="/system/users" replace />} />
          <Route path="/sales/dashboard" element={<Navigate to="/sales/orders" replace />} />
          <Route path="/warehouse/dashboard" element={<Navigate to="/inventory/stock" replace />} />
          <Route path="/accountant/dashboard" element={<Navigate to="/accounting/invoices" replace />} />
          <Route path="/customer/portal" element={<Navigate to="/portal/orders" replace />} />
        </Route>

        {/* ================================================================= */}
        {/* 3. Điều hướng gốc & Fallback                                     */}
        {/* ================================================================= */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
