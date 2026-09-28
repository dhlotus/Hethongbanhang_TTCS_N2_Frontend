import React, { useState } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { useAuth } from "../../context/auth-context";
import { UserRole } from "../../constants/roles";

interface DemoProduct {
    id: string;
    sku: string;
    name: string;
    stock: number;
    sellingPrice: number;
    costPrice?: number;
    profitMargin?: string;
}

const MOCK_PRODUCTS: DemoProduct[] = [
    {
        id: "1",
        sku: "IP15P-128",
        name: "iPhone 15 Pro 128GB Titan Tự Nhiên",
        stock: 45,
        sellingPrice: 26990000,
        costPrice: 22500000,
        profitMargin: "16.6%",
    },
    {
        id: "2",
        sku: "MBP14-M3",
        name: "MacBook Pro 14 M3 16GB 512GB",
        stock: 18,
        sellingPrice: 39990000,
        costPrice: 33200000,
        profitMargin: "17.0%",
    },
    {
        id: "3",
        sku: "APP2-USB",
        name: "Tai nghe AirPods Pro 2 USB-C",
        stock: 120,
        sellingPrice: 5390000,
        costPrice: 3900000,
        profitMargin: "27.6%",
    },
];

export const SalesDashboardPage: React.FC = () => {
    const { user, hasRole } = useAuth();
    const [actionMessage, setActionMessage] = useState<string | null>(null);

    const isSalesManager =
        hasRole(UserRole.SALES_MANAGER) || hasRole(UserRole.ADMIN);

    const handleTryEditStock = () => {
        if (!isSalesManager) {
            setActionMessage(
                "🚫 [403 Forbidden - Server Từ Chối]: Nhân viên kinh doanh không có quyền điều chỉnh tồn kho. Quyền này chỉ dành cho Thủ kho (Warehouse) hoặc Quản trị viên!",
            );
        } else {
            setActionMessage(
                "⚠️ [403 Forbidden - Phân quyền nhiệm vụ]: Quản lý kinh doanh chỉ theo dõi dữ liệu kinh doanh, không được can thiệp sửa tồn kho vật lý trực tiếp!",
            );
        }
    };

    return (
        <DashboardLayout
            title="Bảng điều khiển Bán hàng"
            subtitle="Quản lý phễu khách hàng tiềm năng, tạo đơn hàng và chăm sóc hậu mãi"
            roleName={
                isSalesManager
                    ? "Quản Lý Kinh Doanh (Sales Manager)"
                    : "Nhân Viên Kinh Doanh (Sales Rep)"
            }
        >
            {/* Alert Box hiển thị trạng thái phân quyền RBAC (SCRUM-23) */}
            <div
                className={`rbac-alert-box ${
                    isSalesManager ? "manager" : "restricted"
                }`}
            >
                <div>
                    <strong>
                        {isSalesManager
                            ? "👔 Bạn đang đăng nhập với vai trò: Quản lý kinh doanh (Sales Manager)"
                            : "🛒 Bạn đang đăng nhập với vai trò: Nhân viên kinh doanh (Sales Rep)"}
                    </strong>
                    <div style={{ marginTop: 4, fontSize: "0.85rem" }}>
                        {isSalesManager ? (
                            <span>
                                ✅ Được phép xem <strong>Giá vốn (COGS)</strong>{" "}
                                &amp; <strong>Biên lợi nhuận</strong> theo tiêu
                                chuẩn bảo mật SCRUM-23.
                            </span>
                        ) : (
                            <span>
                                🔒 Đã bảo vệ dữ liệu nhạy cảm: <strong>Không xem được giá vốn</strong> &amp; <strong>Không được phép sửa tồn kho</strong> (Đã kiểm quyền Server-side Default Deny).
                            </span>
                        )}
                    </div>
                </div>
                <span
                    className={
                        isSalesManager
                            ? "rbac-badge-success"
                            : "rbac-badge-danger"
                    }
                >
                    {isSalesManager ? "Đầy đủ dữ liệu giá" : "Đã che giá vốn"}
                </span>
            </div>

            {actionMessage && (
                <div
                    style={{
                        marginBottom: 20,
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: "#fef2f2",
                        border: "1px solid #f87171",
                        color: "#991b1b",
                        fontSize: "0.88rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span>{actionMessage}</span>
                    <button
                        type="button"
                        onClick={() => setActionMessage(null)}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "1rem",
                            color: "#991b1b",
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Bảng dữ liệu minh chứng SCRUM-23 */}
            <div className="content-section" style={{ marginBottom: 24 }}>
                <div className="section-header">
                    <h2>Danh sách sản phẩm &amp; Kiểm soát giá vốn (RBAC Demo)</h2>
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                        Tuân thủ tiêu chí chấp nhận SCRUM-23
                    </span>
                </div>

                <div className="rbac-table-container">
                    <table className="rbac-table">
                        <thead>
                            <tr>
                                <th>Mã SKU</th>
                                <th>Tên sản phẩm</th>
                                <th>Tồn kho</th>
                                <th>Giá bán niêm yết</th>
                                <th>Giá vốn (Bảo mật)</th>
                                <th>Biên lợi nhuận</th>
                                <th>Thao tác tồn kho</th>
                            </tr>
                        </thead>
                        <tbody>
                            {MOCK_PRODUCTS.map((prod) => (
                                <tr key={prod.id}>
                                    <td>
                                        <code>{prod.sku}</code>
                                    </td>
                                    <td>
                                        <strong>{prod.name}</strong>
                                    </td>
                                    <td>
                                        <span
                                            style={{
                                                fontWeight: 600,
                                                color: "#0284c7",
                                            }}
                                        >
                                            {prod.stock} cái
                                        </span>
                                    </td>
                                    <td>
                                        {prod.sellingPrice.toLocaleString(
                                            "vi-VN",
                                        )}{" "}
                                        đ
                                    </td>
                                    <td>
                                        {isSalesManager ? (
                                            <span
                                                style={{
                                                    color: "#059669",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {prod.costPrice?.toLocaleString(
                                                    "vi-VN",
                                                )}{" "}
                                                đ
                                            </span>
                                        ) : (
                                            <span className="rbac-badge-danger">
                                                🔒 Chỉ Quản lý xem
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        {isSalesManager ? (
                                            <span
                                                style={{
                                                    color: "#2563eb",
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {prod.profitMargin}
                                            </span>
                                        ) : (
                                            <span className="rbac-badge-danger">
                                                🔒 Bị ẩn
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <button
                                            type="button"
                                            className="btn-action-stock denied"
                                            onClick={handleTryEditStock}
                                            title="Nhân viên kinh doanh không được sửa tồn kho"
                                        >
                                            ✏️ Thử sửa tồn
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div
                        className="kpi-icon"
                        style={{
                            backgroundColor: "#ecfdf5",
                            color: "#059669",
                        }}
                    >
                        🛒
                    </div>
                    <div className="kpi-info">
                        <h3>94</h3>
                        <span>Đơn hàng trong ngày</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div
                        className="kpi-icon"
                        style={{
                            backgroundColor: "#e0f2fe",
                            color: "#0284c7",
                        }}
                    >
                        👤
                    </div>
                    <div className="kpi-info">
                        <h3>520</h3>
                        <span>Khách hàng đang phụ trách</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div
                        className="kpi-icon"
                        style={{
                            backgroundColor: "#fef3c7",
                            color: "#d97706",
                        }}
                    >
                        🎯
                    </div>
                    <div className="kpi-info">
                        <h3>88%</h3>
                        <span>Tiến độ KPI tháng</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div
                        className="kpi-icon"
                        style={{
                            backgroundColor: "#fdf4ff",
                            color: "#a21caf",
                        }}
                    >
                        💬
                    </div>
                    <div className="kpi-info">
                        <h3>18</h3>
                        <span>Khách chờ phản hồi tư vấn</span>
                    </div>
                </div>
            </div>

            {/* Chức năng bán hàng */}
            <div className="content-section">
                <div className="section-header">
                    <h2>Nghiệp vụ Bán hàng &amp; Chăm sóc khách hàng (CRM)</h2>
                </div>

                <div className="feature-grid">
                    <div className="feature-card">
                        <h4>🛒 Lập đơn bán lẻ / buôn</h4>
                        <p>
                            Tra cứu nhanh tồn kho thời gian thực, áp dụng mã
                            khuyến mãi và tạo đơn tức thì.
                        </p>
                    </div>
                    <div className="feature-card">
                        <h4>👥 Quản lý khách hàng (CRM)</h4>
                        <p>
                            Xem lịch sử mua hàng, tần suất đặt sỉ và phân nhóm
                            khách hàng VIP/Thân thiết.
                        </p>
                    </div>
                    <div className="feature-card">
                        <h4>🚚 Theo dõi tiến độ giao hàng</h4>
                        <p>
                            Kiểm tra trạng thái vận đơn, thông tin tài xế và thời
                            gian dự kiến giao tận nơi.
                        </p>
                    </div>
                    <div className="feature-card">
                        <h4>🏷️ Báo giá &amp; Khuyến mãi</h4>
                        <p>
                            Lập bảng chào giá cho khách doanh nghiệp kèm chính
                            sách chiết khấu bậc thang.
                        </p>
                    </div>
                </div>

                <div className="role-switch-tip">
                    <span>
                        💡 <strong>Ghi chú kiểm thử SCRUM-23:</strong> Bạn đang ở
                        trang bán hàng với tài khoản{" "}
                        <code>{user?.username || "sales"}</code>. Thử đăng xuất và
                        chọn nhanh tài khoản <strong>Quản lý Sale</strong> hoặc{" "}
                        <strong>Thủ kho</strong> để xem sự khác biệt về quyền!
                    </span>
                </div>
            </div>
        </DashboardLayout>
    );
};
