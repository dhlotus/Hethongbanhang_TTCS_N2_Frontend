import * as React from "react";
import { useState } from "react";
import { REGISTER_CONSTANTS } from "../../constants/register-constants";
import type { RegisterModel } from "../../models/register-model";
import { validateRegisterForm } from "../../utils/register-validator";
import "./register-form.css";

interface RegisterFormProps {
    onBackToLogin: () => void;
}

const INITIAL_DATA: RegisterModel = {
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ onBackToLogin }) => {
    const [formData, setFormData] = useState<RegisterModel>(INITIAL_DATA);
    const [errors, setErrors] = useState<Partial<Record<keyof RegisterModel, string>>>({});
    const [serverError, setServerError] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const API_URL = "http://localhost:3000/api/auth/register";

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        setErrors((prev) => ({
            ...prev,
            [name]: "",
        }));
        setServerError(null);
    };

    const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
        event.preventDefault();
        setServerError(null);

        const validationErrors = validateRegisterForm(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (!response.ok) {
                const message = Array.isArray(data.message)
                    ? data.message[0]
                    : data.message || "Đăng ký không thành công. Vui lòng thử lại.";
                setServerError(message);
                return;
            }

            setIsSuccess(true);
        } catch {
            setServerError("Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối.");
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="register-form">
                <div className="register-form__success">
                    <div className="register-form__success-icon">✓</div>
                    <h2>Đăng ký thành công!</h2>
                    <p>
                        Tài khoản <strong>{formData.username}</strong> ({formData.email}) đã được tạo thành công. Bạn có thể đăng nhập để trải nghiệm hệ thống ngay bây giờ.
                    </p>
                    <button
                        type="button"
                        className="register-form__submit"
                        onClick={onBackToLogin}
                    >
                        {REGISTER_CONSTANTS.LOGIN_LINK}
                        <span aria-hidden="true">→</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form className="register-form" onSubmit={handleSubmit} noValidate>
            <div className="register-form__header">
                <span className="register-form__kicker">TẠO TÀI KHOẢN MỚI ✦</span>
                <h1>Đăng ký tài khoản</h1>
                <p>Nhập thông tin bên dưới để bắt đầu sử dụng hệ thống</p>
            </div>

            {serverError && (
                <div className="register-form__alert" role="alert">
                    <span>⚠️</span>
                    <span>{serverError}</span>
                </div>
            )}

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="reg-fullName">{REGISTER_CONSTANTS.FULL_NAME_LABEL}</label>
                    <input
                        id="reg-fullName"
                        name="fullName"
                        type="text"
                        value={formData.fullName}
                        placeholder={REGISTER_CONSTANTS.FULL_NAME_PLACEHOLDER}
                        onChange={handleChange}
                        className={errors.fullName ? "input-error" : ""}
                    />
                    {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="reg-username">{REGISTER_CONSTANTS.USERNAME_LABEL}</label>
                    <input
                        id="reg-username"
                        name="username"
                        type="text"
                        value={formData.username}
                        placeholder={REGISTER_CONSTANTS.USERNAME_PLACEHOLDER}
                        onChange={handleChange}
                        className={errors.username ? "input-error" : ""}
                    />
                    {errors.username && <span className="error-message">{errors.username}</span>}
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="reg-email">{REGISTER_CONSTANTS.EMAIL_LABEL}</label>
                <input
                    id="reg-email"
                    name="email"
                    type="email"
                    value={formData.email}
                    placeholder={REGISTER_CONSTANTS.EMAIL_PLACEHOLDER}
                    onChange={handleChange}
                    autoComplete="email"
                    className={errors.email ? "input-error" : ""}
                />
                {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="reg-password">{REGISTER_CONSTANTS.PASSWORD_LABEL}</label>
                <div className="password-input">
                    <input
                        id="reg-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        placeholder={REGISTER_CONSTANTS.PASSWORD_PLACEHOLDER}
                        onChange={handleChange}
                        className={errors.password ? "input-error" : ""}
                    />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
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
                {errors.password && <span className="error-message">{errors.password}</span>}
            </div>

            <div className="form-group">
                <label htmlFor="reg-confirmPassword">
                    {REGISTER_CONSTANTS.CONFIRM_PASSWORD_LABEL}
                </label>
                <div className="password-input">
                    <input
                        id="reg-confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        placeholder={REGISTER_CONSTANTS.CONFIRM_PASSWORD_PLACEHOLDER}
                        onChange={handleChange}
                        className={errors.confirmPassword ? "input-error" : ""}
                    />
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                    >
                        {showConfirmPassword ? (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A10.8 10.8 0 0 1 12 4.9c5.2 0 8.7 5.1 9.5 7.1a15.8 15.8 0 0 1-2.8 4.3M6.2 6.2C3.9 7.7 2.7 10 2.5 12c.3 2.1 4 7.1 9.5 7.1 1 0 1.9-.2 2.7-.5" />
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M2.5 12S6 4.9 12 4.9 21.5 12 21.5 12 21.5 12 18 19.1 12 19.1 2.5 12 2.5 12Z" />
                                <circle cx="12" cy="12" r="2.8" />
                            </svg>
                        )}
                    </button>
                </div>
                {errors.confirmPassword && (
                    <span className="error-message">{errors.confirmPassword}</span>
                )}
            </div>

            <button className="register-form__submit" type="submit" disabled={isLoading}>
                {isLoading ? "Đang xử lý..." : REGISTER_CONSTANTS.SUBMIT_BUTTON}
                <span aria-hidden="true">→</span>
            </button>

            <p className="register-form__login-link">
                {REGISTER_CONSTANTS.HAVE_ACCOUNT}
                <button
                    type="button"
                    className="register-form__login-btn"
                    onClick={onBackToLogin}
                >
                    {REGISTER_CONSTANTS.LOGIN_LINK}
                </button>
            </p>
        </form>
    );
};
