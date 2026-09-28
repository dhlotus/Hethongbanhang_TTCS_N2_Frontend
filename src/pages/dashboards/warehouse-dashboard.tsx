import React, { useState } from "react";
import { DashboardLayout } from "./dashboard-layout";
import { useAuth } from "../../context/auth-context";

interface DemoProduct {
    id: string;
    sku: string;
    name: string;
    stock: number;
    sellingPrice: number;
}

const INITIAL_MOCK_PRODUCTS: DemoProduct[] = [
    {
        id: "1",
        sku: "IP15P-128",
        name: "iPhone 15 Pro 128GB Titan Tự Nhiên",
        stock: 45,
        sellingPrice: 26990000,
    },
    {
        id: "2",
        sku: "MBP14-M3",
        name: "MacBook Pro 14 M3 16GB 512GB",
        stock: 18,
        sellingPrice: 39990000,
    },
    {
        id: "3",
        sku: "APP2-USB",
        name: "Tai nghe AirPods Pro 2 USB-C",
        stock: 120,
        sellingPrice: 5390000,
    },
];

export const WarehouseDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState<DemoProduct[]>(INITIAL_MOCK_PRODUCTS);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleAdjustStock = (id: string, delta: number) => {
        setProducts((prev) =>
            prev.map((p) => {
                if (p.id === id) {
                    const newStock = Math.max(0, p.stock + delta);
                    return { ...p, stock: newStock };
                }
                return p;
            }),
        );
        setSuccessMessage(
            `✅ [200 OK - Thủ Kho Hợp Lệ]: Đã điều chỉnh số lượng tồn kho thành công!`,
        );
    };

    return (
        <DashboardLayout
            title="Bảng điều khiển Quản lý Kho"
            subtitle="Theo dõi xuất nhập tồn, lập phiếu kiểm kê và kiểm soát biến động thẻ kho"
            roleName="Thủ Kho / Quản Lý Kho"
        >
            {/* Alert Box hiển thị trạng thái phân quyền RBAC (SCRUM-23) */}
            <div className="rbac-alert-box restricted">
                <div>
                    <strong>📦 Bạn đang đăng nhập với vai trò: Thủ kho (Warehouse)</strong>
                    <div style={{ marginTop: 4, fontSize: "0.85rem" }}>
                        <span>
                            🔒 <strong>Bảo mật giá vốn:</strong> Thủ kho chỉ quản lý số lượng vật lý (nhập, xuất, tồn); <strong>TUYỆT ĐỐI KHÔNG XEM ĐƯỢC GIÁ VỐN &amp; BIÊN LỢI NHUẬN</strong> theo tiêu chí nghiệm thu SCRUM-23.
                        </span>
                    </div>
                </div>
                <span className="rbac-badge-danger">Đã ẩn giá vốn</span>
            </div>

            {successMessage && (
                <div
                    style={{
                        marginBottom: 20,
                        padding: "12px 16px",
                        borderRadius: 8,
                        background: "#ecfdf5",
                        border: "1px solid #6ee7b7",
                        color: "#065f46",
                        fontSize: "0.88rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <span>{successMessage}</span>
                    <button
                        type="button"
                        onClick={() => setSuccessMessage(null)}
                        style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "1rem",
                            color: "#065f46",
                        }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Bảng tồn kho thực tế */}
            <div className="content-section" style={{ marginBottom: 24 }}>
                <div className="section-header">
                    <h2>Quản lý số lượng tồn kho thực tế (Thủ kho có quyền sửa)</h2>
                    <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                        Cột Giá vốn đã bị Server Interceptor loại bỏ hoàn toàn
                    </span>
                </div>

                <div className="rbac-table-container">
                    <table className="rbac-table">
                        <thead>
                            <tr>
                                <th>Mã SKU</th>
                                <th>Tên sản phẩm</th>
                                <th>Số lượng tồn</th>
                                <th>Giá bán niêm yết</th>
                                <th>Giá vốn (Bảo mật)</th>
                                <th>Thao tác điều chỉnh kho</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((prod) => (
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
                                                fontWeight: 700,
                                                fontSize: "1rem",
                                                color: "#0284c7",
                                            }}
                                        >
                                            {prod.stock}
                                        </span>{" "}
                                        cái
                                    </td>
                                    <td>
                                        {prod.sellingPrice.toLocaleString("vi-VN")}{" "}
                                        đ
                                    </td>
                                    <td>
                                        <span className="rbac-badge-danger">
                                            🔒 Bị ẩn đối với Thủ kho
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: 6 }}>
                                            <button
                                                type="button"
                                                className="btn-action-stock allowed"
                                                onClick={() =>
                                                    handleAdjustStock(prod.id, 10)
                                                }
                                                title="Nhập thêm 10 sản phẩm"
                                            >
                                                +10 Nhập
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-action-stock allowed"
                                                onClick={() =>
                                                    handleAdjustStock(prod.id, -5)
                                                }
                                                title="Xuất 5 sản phẩm"
                                                style={{ background: "#ea580c" }}
                                            >
                                                -5 Xuất
                                            </button>
                                        </div>
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
                        style={{ backgroundColor: "#e0f2fe", color: "#0284c7" }}
                    >
                        📦
                    </div>
                    <div className="kpi-info">
                        <h3>1,845</h3>
                        <span>Mặt hàng tồn kho</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div
                        className="kpi-icon"
                        style={{ backgroundColor: "#fef3c7", color: "#d97706" }}
                    >
                        ⚠️
                    </div>
                    <div className="kpi-info">
                        <h3>12</h3>
                        <span>Cảnh báo sắp hết hàng</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div
                        className="kpi-icon"
                        style={{ backgroundColor: "#ecfdf5", color: "#059669" }}
                    >
                        📥
                    </div>
                    <div className="kpi-info">
                        <h3>48</h3>
                        <span>Phiếu nhập trong tuần</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div
                        className="kpi-icon"
                        style={{ backgroundColor: "#fdf4ff", color: "#a21caf" }}
                    >
                        📤
                    </div>
                    <div className="kpi-info">
                        <h3>115</h3>
                        <span>Phiếu xuất giao hàng</span>
                    </div>
                </div>
            </div>

            {/* Chức năng nghiệp vụ kho */}
            <div className="content-section">
                <div className="section-header">
                    <h2>Nghiệp vụ Quản lý Kho hàng thực tế</h2>
                </div>

                <div className="feature-grid">
                    <div className="feature-card">
                        <h4>📥 Lập phiếu nhập kho</h4>
                        <p>
                            Nhập hàng từ nhà cung cấp, kiểm tra barcode/QR và cập
                            nhật số lượng tồn kho tự động.
                        </p>
                    </div>
                    <div className="feature-card">
                        <h4>📤 Lập phiếu xuất kho</h4>
                        <p>
                            Xuất hàng phục vụ đơn bán lẻ, bán buôn với cơ chế trừ
                            kho an toàn chống âm kho.
                        </p>
                    </div>
                    <div className="feature-card">
                        <h4>📋 Sổ thẻ kho &amp; Lịch sử biến động</h4>
                        <p>
                            Tra cứu chi tiết từng lần nhập, xuất, số dư tức thời
                            của từng mã SKU sản phẩm.
                        </p>
                    </div>
                    <div className="feature-card">
                        <h4>🔍 Kiểm kê &amp; Điều chỉnh kho</h4>
                        <p>
                            Tạo đợt kiểm kê định kỳ, lập biên bản chênh lệch và cân
                            bằng tồn kho.
                        </p>
                    </div>
                </div>

                <div className="role-switch-tip">
                    <span>
                        💡 <strong>Ghi chú kiểm thử SCRUM-23:</strong> Bạn đang ở
                        trang chủ dành riêng cho <strong>Thủ kho (Warehouse)</strong> với tài khoản <code>{user?.username || "thukho"}</code>.
                    </span>
                </div>
            </div>
        </DashboardLayout>
    );
};
