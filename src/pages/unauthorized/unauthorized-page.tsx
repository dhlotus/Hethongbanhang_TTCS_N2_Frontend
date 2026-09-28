import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";

export const UnauthorizedPage: React.FC = () => {
    const { getHomeUrl, logout } = useAuth();
    const navigate = useNavigate();

    const handleBackHome = () => {
        navigate(getHomeUrl(), { replace: true });
    };

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f8fafc",
                fontFamily: "system-ui, sans-serif",
                padding: "20px",
            }}
        >
            <div
                style={{
                    maxWidth: "500px",
                    width: "100%",
                    background: "#ffffff",
                    borderRadius: "16px",
                    padding: "40px 32px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)",
                    textAlign: "center",
                    border: "1px solid #fee2e2",
                }}
            >
                <div style={{ fontSize: "3.5rem", marginBottom: "12px" }}>🚫</div>
                <h1 style={{ fontSize: "1.75rem", color: "#991b1b", margin: "0 0 10px 0" }}>
                    Không có quyền truy cập (403)
                </h1>
                <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "28px" }}>
                    Tài khoản của bạn không được phân quyền để truy cập vào khu vực này. Vui lòng quay về trang chủ theo vai trò của bạn hoặc đăng nhập bằng tài khoản khác có đủ thẩm quyền.
                </p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                    <button
                        onClick={handleBackHome}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "#4f46e5",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Quay lại trang của bạn
                    </button>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: "#f1f5f9",
                            color: "#334155",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            fontWeight: 600,
                            cursor: "pointer",
                        }}
                    >
                        Đổi tài khoản
                    </button>
                </div>
            </div>
        </div>
    );
};
