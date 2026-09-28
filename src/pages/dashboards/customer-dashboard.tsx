import React from "react";
import { DashboardLayout } from "./dashboard-layout";

export const CustomerDashboardPage: React.FC = () => {
    return (
        <DashboardLayout
            title="Cổng thông tin Khách hàng"
            subtitle="Theo dõi đơn hàng, địa chỉ giao hàng và điểm thưởng thành viên"
            roleName="Khách Hàng (Customer)"
        >
            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#e0f2fe", color: "#0284c7" }}>🛍️</div>
                    <div className="kpi-info">
                        <h3>8</h3>
                        <span>Đơn hàng đã đặt</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>🚚</div>
                    <div className="kpi-info">
                        <h3>1</h3>
                        <span>Đang trên đường giao</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#fdf4ff", color: "#a21caf" }}>⭐</div>
                    <div className="kpi-info">
                        <h3>450</h3>
                        <span>Điểm thưởng tích lũy</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>🎫</div>
                    <div className="kpi-info">
                        <h3>3</h3>
                        <span>Mã giảm giá khả dụng</span>
                    </div>
                </div>
            </div>

            {/* Chức năng khách hàng */}
            <div className="content-section">
                <div className="section-header">
                    <h2>Khu vực cá nhân của Khách hàng</h2>
                </div>

                <div className="feature-grid">
                    <div className="feature-card">
                        <h4>📦 Lịch sử & Trạng thái đơn hàng</h4>
                        <p>Xem lại chi tiết các sản phẩm đã mua, hóa đơn và lộ trình vận chuyển theo thời gian thực.</p>
                    </div>
                    <div className="feature-card">
                        <h4>🛍️ Mua sắm sản phẩm mới</h4>
                        <p>Khám phá các chương trình trợ giá, hàng mới nhập kho với giá ưu đãi thành viên.</p>
                    </div>
                    <div className="feature-card">
                        <h4>📍 Sổ địa chỉ nhận hàng</h4>
                        <p>Quản lý danh sách địa chỉ nhận hàng tại nhà riêng, văn phòng thuận tiện khi thanh toán.</p>
                    </div>
                    <div className="feature-card">
                        <h4>🎁 Đổi quà & Voucher tích điểm</h4>
                        <p>Sử dụng điểm tích lũy mua hàng để quy đổi phiếu giảm giá trực tiếp vào đơn sau.</p>
                    </div>
                </div>

                <div className="role-switch-tip">
                    <span>💡 <strong>Ghi chú kiểm thử:</strong> Bạn đang ở trang chủ dành riêng cho <strong>Khách hàng (Customer)</strong> với đường dẫn <code>/customer</code>.</span>
                </div>
            </div>
        </DashboardLayout>
    );
};
