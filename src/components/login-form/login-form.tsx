import * as React from "react";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { LOGIN_CONSTANTS } from "../../constants/login-constants";
import type { LoginModel } from "../../models/login-model";
import { validateLoginForm } from "../../utils/login-validator";
import { useAuth } from "../../context/auth-context";
import { getRedirectPathByRole } from "../../constants/roles";
import { STORAGE_KEYS, AUTH_EVENTS } from "../../constants/storage-keys";
import "./login-form.css";

const INITIAL_LOGIN_DATA: LoginModel = {
    email: "",
    password: "",
};

interface LoginFormProps {
    onForgotPassword?: () => void;
    onRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
    onForgotPassword,
    onRegister,
}) => {
    const [loginData, setLoginData] = useState<LoginModel>(INITIAL_LOGIN_DATA);
    const [errors, setErrors] = useState<Partial<LoginModel>>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string>("");

    const { login } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Bắt tín hiệu "Phiên đã hết hạn" từ 401 Interceptor qua sessionStorage hoặc query params
    useEffect(() => {
        const isExpiredParam = searchParams.get("expired") === "true";
        const storedExpiredMsg = sessionStorage.getItem(STORAGE_KEYS.SESSION_EXPIRED);

        if (isExpiredParam || storedExpiredMsg) {
            const message = storedExpiredMsg || "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.";
            setSessionExpiredMessage(message);

            // Xóa session storage để không hiện lại nếu người dùng refresh F5 bình thường
            sessionStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRED);

            // Dọn sạch tham số ?expired trên thanh địa chỉ URL
            if (isExpiredParam) {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete("expired");
                setSearchParams(newParams, { replace: true });
            }
        }

        // Lắng nghe sự kiện phát ra từ Axios 401 Interceptor
        const handleSessionExpiredEvent = (event: Event) => {
            const customEvent = event as CustomEvent<{ message?: string }>;
            setSessionExpiredMessage(
                customEvent.detail?.message || "Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.",
            );
        };

        window.addEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpiredEvent);
        return () => {
            window.removeEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpiredEvent);
        };
    }, [searchParams, setSearchParams]);

    const handleChange = (
        event: React.ChangeEvent<HTMLInputElement>,
    ): void => {
        const { name, value } = event.target;

        setLoginData((currentData) => ({
            ...currentData,
            [name]: value,
        }));

        setErrors((currentErrors) => ({
            ...currentErrors,
            [name]: "",
        }));

        if (errorMessage) {
            setErrorMessage("");
        }

        if (sessionExpiredMessage) {
            setSessionExpiredMessage("");
        }
    };

    const handleSelectDemoAccount = (username: string, pass = "123456") => {
        setLoginData({
            email: username,
            password: pass,
        });
        setErrors({});
        setErrorMessage("");
        setSessionExpiredMessage("");
    };

    const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        setErrorMessage("");

        const validationErrors = validateLoginForm(loginData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Thực hiện đăng nhập qua AuthContext (kết nối Backend hoặc fallback demo)
            const result = await login(loginData.email, loginData.password);

            // 2. [FE REDIRECT] Xác định đường dẫn trang chủ theo vai trò (Roles)
            const targetUrl = getRedirectPathByRole(result.user.roles);

            console.log(
                `[FE Redirect] Đăng nhập thành công với vai trò: [${result.user.roles.join(
                    ", ",
                )}] -> Chuyển hướng về: ${targetUrl}`,
            );

            // 3. Thực hiện chuyển hướng đến trang chủ của vai trò đó
            navigate(targetUrl, { replace: true });
        } catch (error: unknown) {
            const err = error as Error;
            setErrorMessage(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="login-form__header">
                <span className="login-form__kicker">XIN CHÀO 👋</span>
                <h1>Đăng nhập tài khoản</h1>
                <p>Nhập thông tin để tiếp tục vào hệ thống</p>
            </div>

            {/* Thông báo Phiên đã hết hạn (Bắt từ lỗi 401 Interceptor) */}
            {sessionExpiredMessage && (
                <div className="login-form__alert-warning" role="alert">
                    <span aria-hidden="true" style={{ fontSize: "1.3rem" }}>⚠️</span>
                    <div>
                        <strong style={{ display: "block", marginBottom: "2px" }}>Phiên đã hết hạn</strong>
                        <span>{sessionExpiredMessage}</span>
                    </div>
                </div>
            )}

            {/* Thông báo lỗi đăng nhập thất bại */}
            {errorMessage && (
                <div className="login-form__alert-error" role="alert">
                    <span aria-hidden="true">⚠️</span>
                    <span>{errorMessage}</span>
                </div>
            )}

            <div className="form-group">
                <label htmlFor="email">
                    {LOGIN_CONSTANTS.EMAIL_LABEL}
                </label>

                <input
                    id="email"
                    name="email"
                    type="text"
                    value={loginData.email}
                    placeholder={LOGIN_CONSTANTS.EMAIL_PLACEHOLDER}
                    onChange={handleChange}
                    autoComplete="username"
                    className={errors.email ? "input-error" : ""}
                    disabled={isSubmitting}
                />

                {errors.email && (
                    <span className="error-message">
                        {errors.email}
                    </span>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="password">
                    {LOGIN_CONSTANTS.PASSWORD_LABEL}
                </label>

                <div className="password-input">
                    <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={loginData.password}
                        placeholder={LOGIN_CONSTANTS.PASSWORD_PLACEHOLDER}
                        onChange={handleChange}
                        autoComplete="current-password"
                        className={errors.password ? "input-error" : ""}
                        disabled={isSubmitting}
                    />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                        disabled={isSubmitting}
                    >
                        {showPassword ? (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.8 10.8 0 0 1 12 4.9c5.2 0 8.7 5.1 9.5 7.1a15.8 15.8 0 0 1-2.8 4.3M6.2 6.2C3.9 7.7 2.7 10 2.5 12c.3 2.1 4 7.1 9.5 7.1 1 0 1.9-.2 2.7-.5" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M2.5 12S6 4.9 12 4.9 21.5 12 21.5 12 18 19.1 12 19.1 2.5 12 2.5 12Z" />
                                <circle cx="12" cy="12" r="2.8" />
                            </svg>
                        )}
                    </button>
                </div>

                {errors.password && (
                    <span className="error-message">
                        {errors.password}
                    </span>
                )}
            </div>

            <div className="login-form__options">
                <label className="remember-option">
                    <input type="checkbox" disabled={isSubmitting} />
                    <span>Ghi nhớ đăng nhập</span>
                </label>
                <button
                    type="button"
                    className="login-form__forgot-link"
                    onClick={(e) => {
                        e.preventDefault();
                        onForgotPassword?.();
                    }}
                    disabled={isSubmitting}
                >
                    Quên mật khẩu?
                </button>
            </div>

            <button
                className="login-form__submit"
                type="submit"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <span>Đang đăng nhập...</span>
                ) : (
                    <>
                        {LOGIN_CONSTANTS.SUBMIT_BUTTON}
                        <span aria-hidden="true">→</span>
                    </>
                )}
            </button>

            {/* Mục kiểm thử nhanh phân quyền theo vai trò */}
            <div className="login-form__demo-roles">
                <div className="login-form__demo-title">
                    <span>⚡ Chọn nhanh vai trò để test Redirect:</span>
                </div>
                <div className="demo-chips">
                    <button
                        type="button"
                        className="demo-chip-btn"
                        onClick={() => handleSelectDemoAccount("admin")}
                        title="Đăng nhập tài khoản Admin -> Toàn quyền"
                    >
                        👑 Admin
                    </button>
                    <button
                        type="button"
                        className="demo-chip-btn"
                        onClick={() => handleSelectDemoAccount("sales_manager")}
                        title="Đăng nhập Quản lý kinh doanh -> Xem được giá vốn & biên lợi nhuận"
                    >
                        👔 Quản lý Sale
                    </button>
                    <button
                        type="button"
                        className="demo-chip-btn"
                        onClick={() => handleSelectDemoAccount("sales")}
                        title="Đăng nhập Nhân viên Sale -> Không sửa được kho, không xem được giá vốn"
                    >
                        🛒 Nhân viên Sale
                    </button>
                    <button
                        type="button"
                        className="demo-chip-btn"
                        onClick={() => handleSelectDemoAccount("warehouse")}
                        title="Đăng nhập Thủ kho -> Sửa được kho, không xem được giá vốn"
                    >
                        📦 Thủ kho
                    </button>
                    <button
                        type="button"
                        className="demo-chip-btn"
                        onClick={() => handleSelectDemoAccount("accountant")}
                        title="Đăng nhập tài khoản Kế toán -> Chuyển về /accounting"
                    >
                        💰 Kế toán
                    </button>
                    <button
                        type="button"
                        className="demo-chip-btn"
                        onClick={() => handleSelectDemoAccount("customer")}
                        title="Đăng nhập tài khoản Khách hàng -> Chuyển về /customer"
                    >
                        👤 Khách hàng
                    </button>
                </div>
            </div>

            <p className="login-form__signup">
                Chưa có tài khoản?
                <button
                    type="button"
                    className="login-form__forgot-link"
                    style={{ marginLeft: 5 }}
                    onClick={(e) => {
                        e.preventDefault();
                        onRegister?.();
                    }}
                    disabled={isSubmitting}
                >
                    Đăng ký ngay
                </button>
            </p>
        </form>
    );
};