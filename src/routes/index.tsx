import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from '../pages/login-page';
import { ForgotPasswordPage } from '../pages/forgot-password-page';
import { ResetPasswordPage } from '../pages/reset-password-page';
import { ChangePasswordPage } from '../pages/change-password-page';
import { InvoicesPage } from '../pages/invoices-page';
import { CreateInvoicePage } from '../pages/create-invoice-page';
import { InvoiceDetailPage } from '../pages/invoice-detail-page';
import { ReceiptsPage } from '../pages/receipts-page';
import { ProductsPage } from '../pages/products-page';
import { ProductEditPage } from '../pages/product-edit-page';
import { ProductEditPricePage } from '../pages/product-edit-price-page';
import { PriceListsPage } from '../pages/price-lists-page';
import { SuppliersPage } from '../pages/suppliers-page';
import { CategoriesPage } from '../pages/categories-page';
import { UsersPage } from '../pages/users-page';
import { AuditLogsPage } from '../pages/audit-logs-page';
import { ProfilePage } from '../pages/profile-page';
import { OrdersPage } from '../pages/orders-page';
import { CreateOrderPage } from '../pages/create-order-page';
import { OrderApprovalsPage } from '../pages/order-approvals-page';
import { StockListPage } from '../pages/inventory/stock-list-page';
import { CreditLimitPage } from '../pages/credit-limit/credit-limit-page';
import { DebtReportPage } from '../pages/debt-report';
import { CustomersPage } from '../pages/customers-page';
import { CustomerDetailPage } from '../pages/customer-detail-page';
import { InventoryStockPage } from '../pages/inventory-stock-page';
import { InventoryAuditsPage } from '../pages/inventory-audits-page';
import { InventoryReceiptsPage } from '../pages/inventory-receipts-page';
import { CreateInventoryReceiptPage } from '../pages/create-inventory-receipt-page';
import { PortalOrdersPage } from '../pages/portal-orders-page';
import { ShipmentsPage } from '../pages/shipments-page';
import { CreateShipmentPage } from '../pages/create-shipment-page';
import { ReturnsPage } from '../pages/returns-page';
import { DashboardPage } from '../pages/dashboard-page';
import { AgencyPortalPage } from '../pages/agency-portal-page';
import { PortalOrderConfirmPage } from '../pages/portal-order-confirm-page';
import { PortalDebtPage } from '../pages/portal-debt-page';
import { NotFoundPage } from '../pages/not-found-page';
import { ForbiddenPage } from '../pages/forbidden-page';
import { ProtectedRoute } from '../components/protected-route';
import { RoleGuard } from '../components/role-guard';
import { NetworkStatusIndicator } from '../components/network-status-indicator';
import { AdminLayout } from '../layouts/admin-layout';
import { getRedirectPathByUser, getStoredUser } from '../utils/navigation';
import { tokenStorage } from '../utils/token-storage';
import { RoleModulePage } from '../pages/role-module-page';
import { WarehousesPage } from '../pages/warehouses-page';
import { InternalTransfersPage } from '../pages/inventory/internal-transfers-page';
import { OrderPickingPage } from '../pages/order-picking-page';
import { CreatePickingSheetPage } from '../pages/create-picking-sheet-page';
import { InventoryBatchesPage } from '../pages/inventory-batches-page';
import { GoodsInTransitPage } from '../pages/goods-in-transit-page';
import { StockCardPage } from '../pages/inventory/stock-card-page';
import { RouteCollectionsPage } from '../pages/route-collections-page';
import { CreateRouteCollectionPage } from '../pages/create-route-collection-page';
import { DebtReconciliationsPage } from '../pages/debt-reconciliations-page';
import { CreateDebtReconciliationPage } from '../pages/create-debt-reconciliation-page';

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
              element={<RoleGuard allowedRoles={['ADMIN', 'WAREHOUSE_MANAGER']} moduleName="Quản lý kho & vị trí lưu trữ" />}
            >
              <Route path="/inventory/warehouses" element={<WarehousesPage />} />
            </Route>

            {/* SN-170 & SN-174: Cổng Theo dõi vận chuyển & Danh sách đơn Đại lý */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    'CUSTOMER',
                    'ADMIN',
                    'SALES_REP',
                    'SALES_MANAGER',
                    'WAREHOUSE_STAFF',
                    'WAREHOUSE_MANAGER',
                    'ACCOUNTANT',
                  ]}
                  moduleName="Theo dõi đơn hàng & Giao vận"
                />
              }
            >
              <Route path="/portal/tracking" element={<PortalOrdersPage />} />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={['CUSTOMER', 'ADMIN', 'SALES_REP', 'SALES_MANAGER']}
                  moduleName="Cổng Dịch vụ & Đặt hàng Đại lý B2B"
                />
              }
            >
              <Route path="/portal" element={<AgencyPortalPage />} />
              <Route path="/portal/orders" element={<AgencyPortalPage />} />
              <Route path="/portal/orders/confirm" element={<PortalOrderConfirmPage />} />
              <Route path="/portal/orders/create" element={<Navigate to="/portal/orders/confirm" replace />} />
              <Route path="/portal/debt" element={<PortalDebtPage />} />
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
                  allowedRoles={['SALES_REP', 'SALES_MANAGER', 'ACCOUNTANT', 'ADMIN']}
                  moduleName="Quản lý đại lý"
                />
              }
            >
              <Route path="/sales/customers" element={<CustomersPage />} />
              <Route path="/sales/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />
              <Route path="/customers" element={<Navigate to="/sales/customers" replace />} />
              <Route path="/sales/credit-limit" element={<CreditLimitPage />} />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    'ADMIN',
                    'SALES_REP',
                    'SALES_MANAGER',
                    'ACCOUNTANT',
                    'WAREHOUSE_KEEPER',
                    'WAREHOUSE_MANAGER',
                  ]}
                  moduleName="Quản lý Đơn hàng"
                />
              }
            >
              {/* SN-38 & SN-39: Tạo & Quản lý Đơn hàng Bán buôn (đã implement) */}
              <Route path="/sales/orders" element={<OrdersPage />} />
              <Route path="/sales/orders/create" element={<CreateOrderPage />} />
              <Route path="/sales/orders/edit/:id" element={<CreateOrderPage />} />
              <Route path="/system/orders" element={<Navigate to="/sales/orders" replace />} />
              <Route path="/orders" element={<Navigate to="/sales/orders" replace />} />
              <Route path="/orders/create" element={<Navigate to="/sales/orders/create" replace />} />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ 3: QUẢN LÝ KINH DOANH (SALES_MANAGER)                 */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={['SALES_MANAGER', 'ADMIN']}
                  moduleName="Quản lý & Điều hành Kinh doanh"
                />
              }
            >
              <Route
                path="/sales/approvals"
                element={<OrderApprovalsPage />}
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
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ QUẢN LÝ BẢNG GIÁ & CHIẾT KHẤU B2B (SN-27)              */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={['ADMIN', 'SALES_MANAGER', 'SALES_REP']}
                  moduleName="Quản lý Bảng giá & Chiết khấu B2B"
                />
              }
            >
              <Route path="/catalog/pricing" element={<PriceListsPage />} />
              <Route path="/pricing" element={<PriceListsPage />} />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ 4 & 5: KHO VẬN (WAREHOUSE_KEEPER & WAREHOUSE_MANAGER) */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    'ADMIN',
                    'SALES_REP',
                    'SALES_MANAGER',
                    'WAREHOUSE_KEEPER',
                    'WAREHOUSE_MANAGER',
                    'ACCOUNTANT',
                  ]}
                  moduleName="Tra cứu Tồn kho Khả dụng"
                />
              }
            >
              <Route path="/inventory/stock" element={<InventoryStockPage />} />
              <Route path="/inventory/stock-list" element={<StockListPage />} />
              <Route path="/inventory/stocks" element={<StockListPage />} />
              <Route path="/inventory/stock-card" element={<StockCardPage />} />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ QUẢN LÝ NHÀ CUNG CẤP (SN-25)                          */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    'ADMIN',
                    'WAREHOUSE_MANAGER',
                    'WAREHOUSE_KEEPER',
                    'SALES_MANAGER',
                    'ACCOUNTANT',
                  ]}
                  moduleName="Quản lý Nhà cung cấp"
                />
              }
            >
              <Route path="/inventory/suppliers" element={<SuppliersPage />} />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={['WAREHOUSE_KEEPER', 'WAREHOUSE_MANAGER', 'ADMIN']}
                  moduleName="Quản lý Nhập Xuất Kho & Kiểm kê"
                />
              }
            >
              <Route
                path="/inventory/receipts"
                element={<InventoryReceiptsPage />}
              />
              <Route
                path="/inventory/receipts/create"
                element={<CreateInventoryReceiptPage />}
              />
              <Route
                path="/inventory/issues"
                element={<ShipmentsPage />}
              />
              <Route
                path="/inventory/issues/create"
                element={<CreateShipmentPage />}
              />
              <Route
                path="/inventory/issues/shipments/create"
                element={<CreateShipmentPage />}
              />
              <Route
                path="/inventory/issues/shipments/:id"
                element={<CreateShipmentPage />}
              />
              <Route
                path="/inventory/issues/:id"
                element={<CreateShipmentPage />}
              />
              <Route
                path="/issues/shipments/create"
                element={<CreateShipmentPage />}
              />
              <Route
                path="/issues/shipments/:id"
                element={<CreateShipmentPage />}
              />
              <Route
                path="/issues"
                element={<Navigate to="/inventory/issues" replace />}
              />
              {/* SN-188: Route chuẩn phân hệ Soạn hàng & Xuất kho */}
              <Route
                path="/inventory/shipments"
                element={<ShipmentsPage />}
              />
              <Route
                path="/inventory/shipments/create"
                element={<CreateShipmentPage />}
              />
              <Route
                path="/inventory/shipments/:id"
                element={<CreateShipmentPage />}
              />
              <Route
                path="/app/inventory/shipments"
                element={<ShipmentsPage />}
              />
              <Route
                path="/app/inventory/shipments/create"
                element={<CreateShipmentPage />}
              />
              <Route
                path="/app/inventory/shipments/:id"
                element={<CreateShipmentPage />}
              />
              <Route
                path="/inventory/audits"
                element={<InventoryAuditsPage />}
              />
              {/* Route chuyên biệt cho Đơn hàng chuẩn bị xuất thuộc phân hệ Kho vận (SN-180) */}
              <Route path="/warehouse/orders" element={<OrdersPage />} />
              {/* Route phiếu soạn hàng theo vị trí & đường đi trong kho (Wave Picking) */}
              <Route path="/inventory/picking" element={<OrderPickingPage />} />
              <Route path="/inventory/picking/create" element={<CreatePickingSheetPage />} />
              <Route path="/warehouse/picking" element={<OrderPickingPage />} />
              <Route path="/warehouse/picking/create" element={<CreatePickingSheetPage />} />
              {/* Route Quản lý Lô & Gợi ý xuất FEFO (SN-187) */}
              <Route path="/warehouse/batches" element={<InventoryBatchesPage />} />
              {/* Route Theo dõi hàng đã xuất trên đường & Chuyến đi (SN-194 / SN-197) */}
              <Route path="/warehouse/goods-in-transit" element={<GoodsInTransitPage />} />
              <Route path="/inventory/goods-in-transit" element={<GoodsInTransitPage />} />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={['WAREHOUSE_KEEPER', 'WAREHOUSE_MANAGER', 'WH_MANAGER', 'ADMIN']}
                  moduleName="Điều chuyển Kho Nội bộ"
                />
              }
            >
              <Route
                path="/inventory/transfers"
                element={<InternalTransfersPage />}
              />
              <Route
                path="/inventory/internal-transfers"
                element={<InternalTransfersPage />}
              />
            </Route>

            {/* Quản lý Lô & Hạn sử dụng (FEFO - SN-184) cho Nhân viên kho & Quản lý kho */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    'WAREHOUSE_KEEPER',
                    'WAREHOUSE_STAFF',
                    'WAREHOUSE_MANAGER',
                    'WH_MANAGER',
                    'ADMIN',
                  ]}
                  moduleName="Quản lý Lô & Hạn sử dụng (FEFO)"
                />
              }
            >
              <Route path="/inventory/batches" element={<InventoryBatchesPage />} />
              <Route path="/warehouse/batches" element={<InventoryBatchesPage />} />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={['WAREHOUSE_MANAGER', 'WH_MANAGER', 'ADMIN']}
                  moduleName="Quản trị Kho Vận & Hạn dùng (FEFO)"
                />
              }
            >
              <Route
                path="/inventory/adjustments"
                element={<InventoryAuditsPage />}
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
                  allowedRoles={[
                    'ADMIN',
                    'ACCOUNTANT',
                    'ACCOUNTANT_DEBT',
                    'SALES_MANAGER',
                    'BUSINESS_MANAGER',
                  ]}
                  moduleName="Nghiệp vụ Hóa đơn & Thu chi Kế toán"
                />
              }
            >
              <Route
                path="/accounting/invoices"
                element={<InvoicesPage />}
              />
              <Route
                path="/accounting/invoices/create"
                element={<CreateInvoicePage />}
              />
              <Route
                path="/accounting/invoices/:id"
                element={<InvoiceDetailPage />}
              />
              <Route
                path="/invoices/create"
                element={<Navigate to="/accounting/invoices/create" replace />}
              />
              <Route
                path="/invoices/:id"
                element={<InvoiceDetailPage />}
              />
              <Route
                path="/invoices"
                element={<Navigate to="/accounting/invoices" replace />}
              />
              <Route
                path="/accounting/payments"
                element={<ReceiptsPage />}
              />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    'ADMIN',
                    'ACCOUNTANT',
                    'ACCOUNTANT_DEBT',
                    'SALES_MANAGER',
                    'BUSINESS_MANAGER',
                    'WAREHOUSE_MANAGER',
                    'WH_MANAGER',
                    'WAREHOUSE_KEEPER',
                  ]}
                  moduleName="Xử lý Đổi trả & Hàng hoàn"
                />
              }
            >
              <Route
                path="/accounting/returns"
                element={<ReturnsPage />}
              />
            </Route>

            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    'ADMIN',
                    'ACCOUNTANT',
                    'ACCOUNTANT_DEBT',
                    'SALES_REP',
                    'SALES_MANAGER',
                    'BUSINESS_MANAGER',
                  ]}
                  moduleName="Theo dõi Sổ Công nợ & Tuổi nợ"
                />
              }
            >
              <Route
                path="/accounting/debt"
                element={<DebtReportPage />}
              />
              <Route
                path="/reports/debt"
                element={<DebtReportPage />}
              />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ ĐỐI CHIẾU CÔNG NỢ ĐỊNH KỲ (SN-206)                    */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    'ADMIN',
                    'ACCOUNTANT',
                    'ACCOUNTANT_DEBT',
                    'SALES_MANAGER',
                    'BUSINESS_MANAGER',
                  ]}
                  moduleName="Đối chiếu công nợ định kỳ"
                />
              }
            >
              <Route
                path="/accounting/debt-reconciliations"
                element={<DebtReconciliationsPage />}
              />
              <Route
                path="/accounting/debt-reconciliations/create"
                element={<CreateDebtReconciliationPage />}
              />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ THU TIỀN TUYẾN & ĐỐI CHIẾU (SN-205)                   */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    'ADMIN',
                    'SALES_REP',
                    'ACCOUNTANT',
                    'ACCOUNTANT_DEBT',
                    'SALES_MANAGER',
                    'BUSINESS_MANAGER',
                  ]}
                  moduleName="Quản lý ngân sách"
                />
              }
            >
              <Route
                path="/route-collections"
                element={<RouteCollectionsPage />}
              />
              <Route
                path="/route-collections/create"
                element={<CreateRouteCollectionPage />}
              />
              <Route
                path="/app/route-collections"
                element={<RouteCollectionsPage />}
              />
              <Route
                path="/app/route-collections/create"
                element={<CreateRouteCollectionPage />}
              />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ 7: QUẢN TRỊ HỆ THỐNG (ADMIN & QUẢN LÝ KD)             */}
            {/* ------------------------------------------------------------- */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={['ADMIN', 'SALES_MANAGER', 'BUSINESS_MANAGER']}
                  moduleName="Quản trị Hệ thống & Người dùng"
                />
              }
            >
              {/* 1. Quản lý người dùng & Phân quyền (SN-10: Admin F, Sales Manager R) */}
              <Route path="/system/users" element={<UsersPage />} />
              <Route path="/users" element={<UsersPage />} />

              {/* 2. Nhật ký hệ thống (Audit Logs - Task SN-142 / SN-19: Admin F, Sales Manager R) */}
              <Route path="/system/audit-logs" element={<AuditLogsPage />} />
              <Route path="/audit-logs" element={<AuditLogsPage />} />
            </Route>

            {/* ------------------------------------------------------------- */}
            {/* PHÂN HỆ MỞ CHO MỌI NHÂN SỰ ĐÃ ĐĂNG NHẬP                       */}
            {/* ------------------------------------------------------------- */}
            {/* Dashboard Điều hành Doanh nghiệp (Chặn Customer) */}
            <Route
              element={
                <RoleGuard
                  allowedRoles={[
                    'ADMIN',
                    'SALES_MANAGER',
                    'BUSINESS_MANAGER',
                    'SALES_REP',
                    'ACCOUNTANT',
                    'ACCOUNTANT_DEBT',
                    'WAREHOUSE_MANAGER',
                    'WH_MANAGER',
                    'WAREHOUSE',
                    'WAREHOUSE_KEEPER',
                  ]}
                  moduleName="Dashboard Tổng quan Điều hành"
                />
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            {/* Danh mục sản phẩm (giá vốn tự động ẩn trên server theo SN-10) */}
            <Route path="/catalog/products" element={<ProductsPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/catalog/products/:id/edit" element={<ProductEditPage />} />
            <Route path="/catalog/products/edit/:id" element={<ProductEditPage />} />
            <Route path="/products/:id/edit" element={<ProductEditPage />} />
            <Route path="/products/edit/:id" element={<ProductEditPage />} />
            <Route path="/catalog/products/edit-price/:id" element={<ProductEditPricePage />} />
            <Route path="/products/edit-price/:id" element={<ProductEditPricePage />} />
            {/* Quản lý Cây nhóm hàng đa cấp (Tree Structure - SN-150 / SN-22) */}
            <Route path="/catalog/categories" element={<CategoriesPage />} />

            {/* Cài đặt bảo mật & Đổi mật khẩu cá nhân */}
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/change-password" element={<ChangePasswordPage />} />
            <Route path="/settings/security" element={<ChangePasswordPage />} />

            {/* Các trang lỗi chuẩn khi đã đăng nhập */}
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/404" element={<NotFoundPage />} />

            {/* Bắt mọi route không tồn tại bên trong ứng dụng -> Trang 404 chuẩn */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Alias routes tương thích ngược */}
          <Route path="/admin/dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/sales/dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route path="/warehouse/dashboard" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/accountant/dashboard"
            element={<Navigate to="/dashboard" replace />}
          />
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
