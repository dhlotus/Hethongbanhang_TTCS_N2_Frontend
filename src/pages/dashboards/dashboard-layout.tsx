import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { ROLE_LABELS } from "../../constants/roles";
import { triggerMock401Error } from "../../services/api-client";
import "./dashboard-layout.css";

interface DashboardLayoutProps {
    title: string;
    subtitle: string;
    roleName: string;
    roleColor?: string;
    children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
    title,
    subtitle,
    roleName,
    children,
}) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate("/login", { replace: true });
    };

    const firstChar = user?.fullName ? user.fullName.charAt(0).toUpperCase() : "U";
    const primaryRole = user?.roles?.[0] || roleName;
    const roleDisplay = ROLE_LABELS[primaryRole] || primaryRole;

    return (
        <div className="dashboard-container">
            {/* Top Navigation */}
            <header className="dashboard-nav">
                <div className="dashboard-brand">
                    <div className="dashboard-logo-icon">📦</div>
                    <div className="dashboard-brand-text">
                        <h2>HỆ THỐNG QUẢN LÝ BÁN HÀNG & KHO</h2>
                        <span>Đồ Án Thực Tập Cơ Sở</span>
                    </div>
                </div>

                <div className="dashboard-user-area">
                    <div className="user-profile-badge">
                        <div className="user-avatar">{firstChar}</div>
                        <div className="user-meta">
                            <span className="user-name">{user?.fullName || user?.username || "Người dùng"}</span>
                            <span className="user-role-tag">{roleDisplay}</span>
                        </div>
                    </div>

                    <button
                        className="btn-test-401"
                        onClick={() => triggerMock401Error()}
                        title="Kiểm thử Interceptor bắt lỗi 401 khi token hết hạn"
                        type="button"
                    >
                        <span>🧪 Test lỗi 401</span>
                    </button>

                    <button
                        className="btn-logout"
                        onClick={handleLogout}
                        title="Đăng xuất khỏi hệ thống"
                        type="button"
                    >
                        <span>Đăng xuất</span>
                        <span aria-hidden="true">🚪</span>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="dashboard-main">
                <div className="dashboard-hero">
                    <div>
                        <h1>{title}</h1>
                        <p>{subtitle}</p>
                    </div>
                    <div className="hero-role-pill">
                        <span>🛡️</span>
                        <span>{roleName}</span>
                    </div>
                </div>

                {children}
            </main>
        </div>
    );
};
