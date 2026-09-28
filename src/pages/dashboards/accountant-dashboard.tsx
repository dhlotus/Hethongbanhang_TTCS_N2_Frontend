import React from "react";
import { DashboardLayout } from "./dashboard-layout";

export const AccountantDashboardPage: React.FC = () => {
    return (
        <DashboardLayout
            title="Bảng điều khiển Kế toán"
            subtitle="Kiểm soát thu chi, theo dõi công nợ khách hàng - đối tác và phát hành hóa đơn"
            roleName="Kế Toán Viên (Accountant)"
        >
            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#ecfdf5", color: "#059669" }}>💰</div>
                    <div className="kpi-info">
                        <h3>1.240.000.000 đ</h3>
                        <span>Doanh thu tháng này</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>📑</div>
                    <div className="kpi-info">
                        <h3>85.400.000 đ</h3>
                        <span>Công nợ phải thu</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}>🏢</div>
                    <div className="kpi-info">
                        <h3>42.000.000 đ</h3>
                        <span>Công nợ nhà cung cấp</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ backgroundColor: "#e0e7ff", color: "#4338ca" }}>🧾</div>
                    <div className="kpi-info">
                        <h3>248</h3>
                        <span>Hóa đơn GTGT đã xuất</span>
                    </div>
                </div>
            </div>

            {/* Chức năng kế toán */}
            <div className="content-section">
                <div className="section-header">
                    <h2>Nghiệp vụ Tài chính - Kế toán</h2>
                </div>

                <div className="feature-grid">
                    <div className="feature-card">
                        <h4>💵 Quản lý phiếu thu / chi</h4>
                        <p>Lập phiếu thu tiền bán hàng, phiếu chi tiền mua hàng và chi phí vận hành cửa hàng.</p>
                    </div>
                    <div className="feature-card">
                        <h4>📊 Sổ cái & Đối soát công nợ</h4>
                        <p>Theo dõi hạn mức tín dụng công nợ từng đối tác, gửi email nhắc nợ tự động.</p>
                    </div>
                    <div className="feature-card">
                        <h4>🧾 Hóa đơn điện tử</h4>
                        <p>Tra cứu và đối soát mã hóa đơn điện tử liên kết đơn bán hàng.</p>
                    </div>
                    <div className="feature-card">
                        <h4>📈 Báo cáo lãi lỗ (P&L)</h4>
                        <p>Xem chi tiết giá vốn hàng bán (COGS), lợi nhuận gộp và biên lợi nhuận ròng.</p>
                    </div>
                </div>

                <div className="role-switch-tip">
                    <span>💡 <strong>Ghi chú kiểm thử:</strong> Bạn đang ở trang chủ dành riêng cho <strong>Kế toán (Accountant)</strong> với đường dẫn <code>/accounting</code>.</span>
                </div>
            </div>
        </DashboardLayout>
    );
};
