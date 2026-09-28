import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/auth-context";
import { ProtectedRoute } from "./components/protected-route/protected-route";
import { LoginPage } from "./pages/login-page/login-page";
import { AdminDashboardPage } from "./pages/dashboards/admin-dashboard";
import { WarehouseDashboardPage } from "./pages/dashboards/warehouse-dashboard";
import { AccountantDashboardPage } from "./pages/dashboards/accountant-dashboard";
import { SalesDashboardPage } from "./pages/dashboards/sales-dashboard";
import { CustomerDashboardPage } from "./pages/dashboards/customer-dashboard";
import { UnauthorizedPage } from "./pages/unauthorized/unauthorized-page";
import { UserRole } from "./constants/roles";
import "./App.css";

/**
 * Điều hướng thông minh ở root ("/"):
 * - Nếu đã đăng nhập: Chuyển về đúng trang chủ của vai trò (Roles)
 * - Nếu chưa đăng nhập: Chuyển về trang đăng nhập ("/login")
 */
const RootRedirect: React.FC = () => {
    const { isAuthenticated, isLoading, getHomeUrl } = useAuth();

    if (isLoading) {
        return null;
    }

    if (isAuthenticated) {
        return <Navigate to={getHomeUrl()} replace />;
    }

    return <Navigate to="/login" replace />;
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Đường dẫn mặc định */}
                    <Route path="/" element={<RootRedirect />} />

                    {/* Trang đăng nhập & xác thực */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* 1. Trang chủ Quản trị viên (Admin) */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                                <AdminDashboardPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* 2. Trang chủ Quản lý kho / Thủ kho (Warehouse) */}
                    <Route
                        path="/warehouse"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    UserRole.WAREHOUSE,
                                    UserRole.WH_MANAGER,
                                    UserRole.ADMIN,
                                ]}
                            >
                                <WarehouseDashboardPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* 3. Trang chủ Kế toán (Accountant) */}
                    <Route
                        path="/accounting"
                        element={
                            <ProtectedRoute
                                allowedRoles={[UserRole.ACCOUNTANT, UserRole.ADMIN]}
                            >
                                <AccountantDashboardPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* 4. Trang chủ Bán hàng (Sales Rep / Sales Manager) */}
                    <Route
                        path="/sales"
                        element={
                            <ProtectedRoute
                                allowedRoles={[
                                    UserRole.SALES_REP,
                                    UserRole.SALES_MANAGER,
                                    UserRole.ADMIN,
                                ]}
                            >
                                <SalesDashboardPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* 5. Trang chủ Khách hàng (Customer) */}
                    <Route
                        path="/customer"
                        element={
                            <ProtectedRoute
                                allowedRoles={[UserRole.CUSTOMER, UserRole.ADMIN]}
                            >
                                <CustomerDashboardPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* Trang 403 - Không đủ quyền hạn truy cập */}
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />

                    {/* Bắt tất cả các đường dẫn không tồn tại */}
                    <Route path="*" element={<RootRedirect />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;