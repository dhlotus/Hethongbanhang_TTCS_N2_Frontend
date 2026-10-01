import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "../pages/login-page";
import { ForgotPasswordPage } from "../pages/forgot-password-page";
import { ResetPasswordPage } from "../pages/reset-password-page";
import { ChangePasswordPage } from "../pages/change-password-page";
import { RoleModulePage } from "../pages/role-module-page";
import { ProductsPage } from "../pages/products-page";
import { UsersPage } from "../pages/users-page";
import { NotFoundPage } from "../pages/not-found-page";
import { ForbiddenPage } from "../pages/forbidden-page";
import { ProtectedRoute } from "../components/protected-route";
import { RoleGuard } from "../components/role-guard";
import { NetworkStatusIndicator } from "../components/network-status-indicator";
import { AdminLayout } from "../layouts/admin-layout";
import { getRedirectPathByUser, getStoredUser } from "../utils/navigation";
import { tokenStorage } from "../utils/token-storage";

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
        {/* ================================================================= */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

        {/* ================================================================= */}
        {/* 2. Tuyến đường được bảo vệ (Protected Routes)                      */}
        {/* TẤT CẢ phân hệ đều sử dụng khung giao diện chuẩn AdminLayout        */}
        {/* để Sidebar động và Header Context Bar hiển thị đồng nhất          */}
        {/* ================================================================= */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ 1: ĐẠI LÝ / KHÁCH HÀNG B2B (CUSTOMER)                 */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={["CUSTOMER"]}
                  moduleName="Cổng Dịch vụ & Đặt hàng Đại lý B2B"
                />
              }
            >
              <Route
                path="/portal/orders"
                element={
                  <RoleModulePage
                    title="Cổng Đặt hàng Đại lý"
                    subtitle="Tìm kiếm sản phẩm, đặt hàng sỉ theo chính sách giá đại lý và kiểm tra hạn mức"
                    requiredRole="Đại lý B2B"
                  />
                }
              />
              <Route
                path="/portal/tracking"
                element={
                  <RoleModulePage
                    title="Theo dõi Đơn hàng & Giao hàng"
                    subtitle="Tra cứu lộ trình vận chuyển, tình trạng đóng gói xuất kho và biên bản bàn giao"
                    requiredRole="Đại lý B2B"
                  />
                }
              />
              <Route
                path="/portal/debt"
                element={
                  <RoleModulePage
                    title="Sổ công nợ của tôi"
                    subtitle="Đối chiếu công nợ phát sinh, lịch sử thanh toán và thời hạn tín dụng mua buôn"
                    requiredRole="Đại lý B2B"
                  />
                }
              />
              <Route
                path="/portal/profile"
                element={
                  <RoleModulePage
                    title="Hồ sơ & Điểm giao hàng"
                    subtitle="Thông tin doanh nghiệp đại lý, người đại diện nhận hàng và kho bãi nhận hàng"
                    requiredRole="Đại lý B2B"
                  />
                }
              />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ 2: KINH DOANH & BÁN HÀNG                              */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={["SALES_REP", "SALES_MANAGER", "ACCOUNTANT"]}
                  moduleName="Quản lý Đại lý & Hạn mức Tín dụng"
                />
              }
            >
              <Route
                path="/sales/customers"
                element={
                  <RoleModulePage
                    title="Quản lý Đại lý & Hạn mức"
                    subtitle="Danh sách khách hàng đại lý, phân nhóm tín dụng, công nợ và địa bàn phân công"
                    requiredRole="Nhân viên kinh doanh / Quản lý"
                  />
                }
              />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={["SALES_REP", "SALES_MANAGER"]}
                  moduleName="Quản lý Đơn hàng Bán buôn"
                />
              }
            >
              <Route
                path="/sales/orders"
                element={
                  <RoleModulePage
                    title="Tạo & Quản lý Đơn hàng"
                    subtitle="Lập đơn hàng bán buôn, kiểm tra tồn khả dụng, áp chính sách chiết khấu và theo dõi xử lý"
                    requiredRole="Kinh doanh & Vận hành"
                  />
                }
              />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ 3: QUẢN LÝ KINH DOANH (SALES_MANAGER)                 */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={["SALES_MANAGER"]}
                  moduleName="Quản lý & Điều hành Kinh doanh"
                />
              }
            >
              <Route
                path="/sales/approvals"
                element={
                  <RoleModulePage
                    title="Phê duyệt Đơn hàng (Duyệt đơn)"
                    subtitle="Xét duyệt các đơn hàng vượt hạn mức công nợ, chiết khấu đặc biệt hoặc dưới giá sàn"
                    requiredRole="Quản lý kinh doanh"
                  />
                }
              />
              <Route
                path="/reports/sales"
                element={
                  <RoleModulePage
                    title="Báo cáo Doanh số Bán buôn"
                    subtitle="Phân tích tăng trưởng doanh số theo nhân viên thị trường, nhóm đại lý và sản phẩm chủ lực"
                    requiredRole="Quản lý kinh doanh"
                  />
                }
              />
              <Route
                path="/dashboard"
                element={
                  <RoleModulePage
                    title="Dashboard Điều hành Doanh nghiệp"
                    subtitle="Bảng chỉ số vận hành tổng thể: Doanh thu, Đơn hàng chờ xuất, Tồn kho cảnh báo và Công nợ"
                    requiredRole="Ban Quản lý & Điều hành"
                  />
                }
              />
              <Route
                path="/catalog/pricing"
                element={
                  <RoleModulePage
                    title="Bảng giá & Chiết khấu B2B"
                    subtitle="Cấu hình ma trận bảng giá theo cấp đại lý (Cấp 1, Cấp 2), chiết khấu bậc thang và khuyến mãi"
                    requiredRole="Quản lý kinh doanh & Admin"
                  />
                }
              />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ 4 & 5: KHO VẬN (WAREHOUSE_KEEPER & WAREHOUSE_MANAGER) */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={["SALES_REP", "WAREHOUSE_KEEPER", "WAREHOUSE_MANAGER"]}
                  moduleName="Tra cứu Tồn kho Khả dụng"
                />
              }
            >
              <Route
                path="/inventory/stock"
                element={
                  <RoleModulePage
                    title="Sổ Tồn kho Tổng hợp & Lô hàng"
                    subtitle="Theo dõi số lượng tồn thực tế, tồn khả dụng, cảnh báo chạm mức tối thiểu và tra cứu kho"
                    requiredRole="Kho vận & Quản trị"
                  />
                }
              />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={["WAREHOUSE_KEEPER", "WAREHOUSE_MANAGER"]}
                  moduleName="Quản lý Nhập Xuất Kho & Kiểm kê"
                />
              }
            >
              <Route
                path="/inventory/receipts"
                element={
                  <RoleModulePage
                    title="Nhập kho Hàng hóa & Nhà cung cấp"
                    subtitle="Tạo và quản lý phiếu nhập kho, kiểm tra quy cách đóng gói và nhập thông tin số lô HSD"
                    requiredRole="Nhân viên kho / Quản lý kho"
                  />
                }
              />
              <Route
                path="/inventory/issues"
                element={
                  <RoleModulePage
                    title="Soạn hàng & Xuất kho Giao hàng"
                    subtitle="Soạn hàng xuất kho chuẩn theo nguyên tắc FEFO (Hạn gần xuất trước) và in phiếu xuất kho"
                    requiredRole="Nhân viên kho / Quản lý kho"
                  />
                }
              />
              <Route
                path="/inventory/audits"
                element={
                  <RoleModulePage
                    title="Kiểm kê Kho hàng"
                    subtitle="Lập biên bản kiểm kê định kỳ, đối chiếu số liệu thực tế so với sổ sách phần mềm"
                    requiredRole="Thủ kho / Quản lý kho"
                  />
                }
              />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={["WAREHOUSE_KEEPER"]}
                  moduleName="Điều chuyển Kho Nội bộ"
                />
              }
            >
              <Route
                path="/inventory/transfers"
                element={
                  <RoleModulePage
                    title="Chuyển kho Nội bộ"
                    subtitle="Điều chuyển hàng hóa giữa các kho chi nhánh, kho trung chuyển và xác nhận nhận hàng"
                    requiredRole="Thủ kho"
                  />
                }
              />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={["WAREHOUSE_MANAGER"]}
                  moduleName="Quản trị Kho Vận & Hạn dùng (FEFO)"
                />
              }
            >
              <Route
                path="/inventory/adjustments"
                element={
                  <RoleModulePage
                    title="Phiếu Điều chỉnh Tồn kho"
                    subtitle="Xử lý chênh lệch kiểm kê thừa thiếu, xuất hủy hàng hỏng vỡ theo phê duyệt"
                    requiredRole="Quản lý kho"
                  />
                }
              />
              <Route
                path="/inventory/batches"
                element={
                  <RoleModulePage
                    title="Quản lý Lô & Hạn sử dụng (FEFO)"
                    subtitle="Giám sát vòng đời lô hàng, cảnh báo cận hạn sử dụng để kích hoạt xả hàng khuyến mãi"
                    requiredRole="Quản lý kho"
                  />
                }
              />
              <Route
                path="/reports/inventory"
                element={
                  <RoleModulePage
                    title="Báo cáo Kho hàng & Tồn luân chuyển"
                    subtitle="Báo cáo xuất nhập tồn chi tiết, phân tích tốc độ luân chuyển hàng tồn kho (Inventory Turnover)"
                    requiredRole="Quản lý kho"
                  />
                }
              />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ 6: KẾ TOÁN CÔNG NỢ (ACCOUNTANT)                        */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={["ACCOUNTANT"]}
                  moduleName="Nghiệp vụ Hóa đơn & Thu chi Kế toán"
                />
              }
            >
              <Route
                path="/accounting/invoices"
                element={
                  <RoleModulePage
                    title="Quản lý Hóa đơn Bán hàng"
                    subtitle="Phát hành hóa đơn tài chính, đối chiếu đơn giao thành công và quản lý chứng từ"
                    requiredRole="Kế toán công nợ"
                  />
                }
              />
              <Route
                path="/accounting/payments"
                element={
                  <RoleModulePage
                    title="Phiếu thu & Đối trừ Công nợ"
                    subtitle="Ghi nhận tiền về tài khoản ngân hàng, tiền mặt và cấn trừ cho từng hóa đơn bán hàng"
                    requiredRole="Kế toán công nợ"
                  />
                }
              />
              <Route
                path="/accounting/returns"
                element={
                  <RoleModulePage
                    title="Xử lý Phiếu Trả hàng"
                    subtitle="Tiếp nhận hàng hoàn trả từ đại lý, xuất hóa đơn điều chỉnh giảm và giảm trừ công nợ"
                    requiredRole="Kế toán công nợ"
                  />
                }
              />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={["ACCOUNTANT", "SALES_REP"]}
                  moduleName="Theo dõi Sổ Công nợ & Tuổi nợ"
                />
              }
            >
              <Route
                path="/accounting/debt"
                element={
                  <RoleModulePage
                    title="Sổ Chi tiết Công nợ & Tuổi nợ"
                    subtitle="Báo cáo công nợ phải thu, phân loại tuổi nợ quá hạn (Aging Schedule) và tính lãi phạt"
                    requiredRole="Kế toán công nợ / Kinh doanh"
                  />
                }
              />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ 7: QUẢN TRỊ HỆ THỐNG (CHỈ ADMIN)                      */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={["ADMIN"]}
                  moduleName="Quản trị Hệ thống & Người dùng"
                />
              }
            >
              {/* 1. Quản lý người dùng & Phân quyền (SN-10) */}
              <Route path="/system/users" element={<UsersPage />} />

              {/* 2. Nhật ký hệ thống */}
              <Route
                path="/system/audit-logs"
                element={
                  <RoleModulePage
                    title="Nhật ký hệ thống (Audit Logs)"
                    subtitle="Giám sát lịch sử đăng nhập, thay đổi dữ liệu, thao tác quản trị và cảnh báo an toàn"
                    requiredRole="Quản trị hệ thống"
                  />
                }
              />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ MỞ CHO MỌI NHÂN SỰ ĐÃ ĐĂNG NHẬP                       */}
            {/* ------------------------------------------------------------- */}
            {/* Danh mục sản phẩm (giá vốn tự động ẩn trên server theo SN-10) */}
            <Route path="/catalog/products" element={<ProductsPage />} />

            {/* Cài đặt bảo mật & Đổi mật khẩu cá nhân */}
            <Route path="/profile/change-password" element={<ChangePasswordPage />} />
            <Route path="/settings/security" element={<ChangePasswordPage />} />

            {/* Các trang lỗi chuẩn khi đã đăng nhập */}
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />

            {/* Bắt mọi route không tồn tại bên trong ứng dụng -> Trang 404 chuẩn */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Alias routes tương thích ngược */}
          <Route path="/admin/dashboard" element={<Navigate to="/system/users" replace />} />
          <Route path="/sales/dashboard" element={<Navigate to="/sales/orders" replace />} />
          <Route path="/warehouse/dashboard" element={<Navigate to="/inventory/stock" replace />} />
          <Route path="/accountant/dashboard" element={<Navigate to="/accounting/invoices" replace />} />
          <Route path="/customer/portal" element={<Navigate to="/portal/orders" replace />} />
        </Route>

        {/* ================================================================= */}
        {/* 3. Điều hướng gốc & Fallback toàn cục                             */}
        {/* ================================================================= */}
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/404" element={<NotFoundPage standalone />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<NotFoundPage standalone />} />
      </Routes>
    </BrowserRouter>
  );
};
