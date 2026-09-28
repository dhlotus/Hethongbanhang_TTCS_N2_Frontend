import React from "react";
import { DashboardLayout } from "./dashboard-layout";

export const AdminDashboardPage: React.FC = () => {
    return (
        <DashboardLayout
            title="Bảng điều khiển Quản trị viên"
            subtitle="Toàn quyền quản lý tài khoản, phân quyền RBAC và giám sát hoạt động toàn bộ hệ thống"
            roleName="Administrator"
        >
            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#e0e7ff", color: "#4338ca" }}>👥</div>
                    <div className="kpi-info">
                        <h3>128</h3>
                        <span>Người dùng hệ thống</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>🛡️</div>
                    <div className="kpi-info">
                        <h3>7</h3>
                        <span>Vai trò (Roles) phân quyền</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>⚡</div>
                    <div className="kpi-info">
                        <h3>99.98%</h3>
                        <span>Uptime hệ thống</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>📜</div>
                    <div className="kpi-info">
                        <h3>1,420</h3>
                        <span>Nhật ký truy vết (Audit logs)</span>
                    </div>
                </div>
            </div>

            {/* Chức năng quản trị */}
            <div className="content-section">
                <div className="section-header">
                    <h2>Trung tâm nghiệp vụ Quản trị hệ thống</h2>
                </div>

                <div className="feature-grid">
                    <div className="feature-card">
                        <h4>👤 Quản lý người dùng</h4>
                        <p>Thêm mới, kích hoạt, vô hiệu hóa tài khoản nhân sự và phân bổ theo chi nhánh.</p>
                    </div>
                    <div className="feature-card">
                        <h4>🔐 Ma trận phân quyền (RBAC)</h4>
                        <p>Thiết lập quyền truy cập chi tiết cho Admin, Thủ kho, Kế toán, Sales và Khách hàng.</p>
                    </div>
                    <div className="feature-card">
                        <h4>⚙️ Cấu hình hệ thống</h4>
                        <p>Cấu hình JWT Token, thời gian khóa đăng nhập tạm thời, SMTP gửi mã OTP Gmail.</p>
                    </div>
                    <div className="feature-card">
                        <h4>📊 Báo cáo tổng thể</h4>
                        <p>Tổng hợp biểu đồ doanh số toàn công ty, biến động hàng tồn kho và chi phí vận hành.</p>
                    </div>
                </div>

                <div className="role-switch-tip">
                    <span>💡 <strong>Ghi chú kiểm thử:</strong> Bạn đang ở trang chủ dành riêng cho <strong>Quản trị viên (Admin)</strong> với đường dẫn <code>/admin</code>.</span>
                </div>
            </div>
        </DashboardLayout>
    );
};
