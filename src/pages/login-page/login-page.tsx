import { useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { LoginForm } from "../../components/login-form/login-form";
import { ForgotPasswordForm } from "../../components/forgot-password-form/forgot-password-form";
import { RegisterForm } from "../../components/register-form/register-form";
import { useAuth } from "../../context/auth-context";
import "./login-page.css";

export const LoginPage = () => {
    const { isAuthenticated, getHomeUrl } = useAuth();
    const [searchParams] = useSearchParams();
    const isSessionExpired = searchParams.get("expired") === "true";
    const [currentView, setCurrentView] = useState<"login" | "forgot-password" | "register">("login");

    // Nếu đã đăng nhập thành công trước đó (và không phải do phiên hết hạn 401) thì tự động chuyển về trang chủ
    if (isAuthenticated && !isSessionExpired) {
        return <Navigate to={getHomeUrl()} replace />;
    }

    return (
        <main className="login-page">
            <div className="login-page__glow login-page__glow--top" />
            <div className="login-page__glow login-page__glow--bottom" />
            <section className="login-page__intro" aria-label="Giới thiệu">
                <div className="brand-mark" aria-hidden="true"><span>✦</span></div>
                <p className="eyebrow">
                    {currentView === "login" && "NỀN TẢNG QUẢN LÝ BÁN HÀNG"}
                    {currentView === "forgot-password" && "BẢO MẬT & TÀI KHOẢN"}
                    {currentView === "register" && "THÀNH VIÊN MỚI 🚀"}
                </p>
                <h1>
                    {currentView === "login" && <>Chào mừng bạn<br />trở lại.</>}
                    {currentView === "forgot-password" && <>Khôi phục lại<br />mật khẩu.</>}
                    {currentView === "register" && <>Bắt đầu hành trình<br />kinh doanh.</>}
                </h1>
                <p className="login-page__description">
                    {currentView === "login" &&
                        "Quản lý cửa hàng, theo dõi doanh thu và phát triển công việc kinh doanh hiệu quả hơn mỗi ngày."}
                    {currentView === "forgot-password" &&
                        "Đừng lo lắng, chúng tôi sẽ hỗ trợ bạn lấy lại quyền truy cập tài khoản một cách an toàn và nhanh chóng."}
                    {currentView === "register" &&
                        "Đăng ký tài khoản ngay hôm nay để trải nghiệm hệ thống quản lý bán hàng và kho hiện đại, tối ưu nhất."}
                </p>
                <div className="login-page__stats" aria-label="Thống kê">
                    <div><strong>24/7</strong><span>Hỗ trợ liên tục</span></div>
                    <div><strong>+2k</strong><span>Cửa hàng tin dùng</span></div>
                </div>
            </section>

            {currentView === "login" && (
                <LoginForm
                    onForgotPassword={() => setCurrentView("forgot-password")}
                    onRegister={() => setCurrentView("register")}
                />
            )}
            {currentView === "forgot-password" && (
                <ForgotPasswordForm onBackToLogin={() => setCurrentView("login")} />
            )}
            {currentView === "register" && (
                <RegisterForm onBackToLogin={() => setCurrentView("login")} />
            )}
        </main>
    );
};