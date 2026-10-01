import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../pages/login-page";
import { RoleModulePage } from "../pages/role-module-page";
import { ProtectedRoute } from "../components/protected-route";
import { AdminLayout } from "../layouts/admin-layout";
import { getRedirectPathByUser, getStoredUser } from "../utils/navigation";

/**
 * Component xử lý điều hướng thông minh tại root ('/'):
 * - Nếu chưa đăng nhập: đá về trang /auth/login
 * - Nếu đã đăng nhập: tự động chuyển hướng về route tương ứng với vai trò của user
 */
const RootRedirect: React.FC = () => {
  const token = localStorage.getItem("auth_token");
  const user = getStoredUser();

  if (!token) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Navigate to={getRedirectPathByUser(user)} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================================================================= */}
        {/* 1. Tuyến đường công khai (Public Routes)                           */}
        {/* Hỗ trợ cả /login và /auth/login theo đúng yêu cầu                 */}
        {/* ================================================================= */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/login" element={<LoginPage />} />

        {/* ================================================================= */}
        {/* 2. Tuyến đường được bảo vệ (Protected Routes)                      */}
        {/* ================================================================= */}
        <Route element={<ProtectedRoute />}>
          {/* Phân hệ Quản trị hệ thống sử dụng khung AdminLayout chuẩn */}
          <Route element={<AdminLayout />}>
            {/* 1. Quản lý người dùng */}
            <Route
              path="/system/users"
              element={
                <RoleModulePage
                  title="Quản lý Người dùng & Phân quyền"
                  subtitle="Quản trị danh sách người dùng, cấp phát vai trò và trạng thái tài khoản"
                  requiredRole="ADMIN"
                />
              }
            />

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

            {/* 3. Danh mục sản phẩm */}
            <Route
              path="/catalog/products"
              element={
                <RoleModulePage
                  title="Danh mục sản phẩm"
                  subtitle="Quản lý danh sách hàng hóa, quy cách đóng gói và mã phân loại SKU"
                  requiredRole="ADMIN"
                />
              }
            />

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

        {/* ================================================================= */}
        {/* 3. Điều hướng gốc & Fallback                                     */}
        {/* ================================================================= */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
