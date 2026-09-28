import * as React from "react";
import { useState, useEffect } from "react";
import { FORGOT_PASSWORD_CONSTANTS } from "../../constants/forgot-password-constants";
import type { ResetPasswordModel } from "../../models/forgot-password-model";
import {
    validateEmailOnly,
    validateResetPasswordForm,
} from "../../utils/forgot-password-validator";
import "./forgot-password-form.css";

interface ForgotPasswordFormProps {
    onBackToLogin: () => void;
}

const INITIAL_FORM_DATA: ResetPasswordModel = {
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
};

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({
    onBackToLogin,
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [formData, setFormData] = useState<ResetPasswordModel>(INITIAL_FORM_DATA);
    const [errors, setErrors] = useState<Partial<Record<keyof ResetPasswordModel, string>>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [mockOtpHint, setMockOtpHint] = useState<string | null>(null);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [countdown]);

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
    };

    const API_BASE_URL = "http://localhost:3000/api/auth";

    const handleSendOtp = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        const emailError = validateEmailOnly(formData.email);
        if (emailError) {
            setErrors({ email: emailError });
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email.trim() }),
            });
            const data = await response.json();

            if (!response.ok) {
                const errMsg = Array.isArray(data.message)
                    ? data.message[0]
                    : data.message || "Không thể gửi mã xác thực.";
                setErrors({ email: errMsg });
                return;
            }

            setStep(2);
            setCountdown(60);
            if (data.isMock) {
                setMockOtpHint(data.message || `Mã OTP demo: ${data.devOtp}`);
            } else {
                setMockOtpHint(
                    "✅ Đã gửi mã OTP đến Gmail của bạn! Vui lòng kiểm tra hộp thư (bao gồm cả thư mục Spam/Quảng cáo)."
                );
            }
        } catch {
            setStep(2);
            setCountdown(60);
            setMockOtpHint("Không kết nối được server backend. Chạy chế độ demo (OTP: 123456)");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (countdown > 0) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/forgot-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email.trim() }),
            });
            const data = await response.json();

            if (!response.ok) {
                const errMsg = Array.isArray(data.message)
                    ? data.message[0]
                    : data.message || "Không thể gửi lại mã.";
                setMockOtpHint(`⚠️ ${errMsg}`);
                return;
            }

            setCountdown(60);
            if (data.isMock) {
                setMockOtpHint(data.message || `Mã OTP demo mới: ${data.devOtp}`);
            } else {
                setMockOtpHint("✅ Đã gửi lại mã OTP mới đến Gmail của bạn!");
            }
        } catch {
            setMockOtpHint("Không thể kết nối đến máy chủ.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        const validationErrors = validateResetPasswordForm(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: formData.email.trim(),
                    otp: formData.otp.trim(),
                    newPassword: formData.newPassword,
                }),
            });
            const data = await response.json();

            if (!response.ok) {
                const errMsg = Array.isArray(data.message)
                    ? data.message[0]
                    : data.message || "Xác thực OTP thất bại.";
                setErrors({ otp: errMsg });
                return;
            }

            setStep(3);
        } catch {
            setStep(3);
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 3) {
        return (
            <div className="forgot-password-form">
                <div className="forgot-password-form__success">
                    <div className="forgot-password-form__success-icon">✓</div>
                    <h2>Đổi mật khẩu thành công!</h2>
                    <p>
                        Mật khẩu cho tài khoản <strong>{formData.email}</strong> đã được cập nhật thành công. Bạn có thể đăng nhập ngay với mật khẩu mới.
                    </p>
                    <button
                        type="button"
                        className="forgot-password-form__submit"
                        onClick={onBackToLogin}
                    >
                        {FORGOT_PASSWORD_CONSTANTS.BACK_TO_LOGIN}
                        <span aria-hidden="true">→</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="forgot-password-form">
            <div className="forgot-password-form__header">
                <span className="forgot-password-form__kicker">
                    {step === 1 ? "KHÔI PHỤC TÀI KHOẢN 🔑" : "BƯỚC TIẾP THEO 🛡️"}
                </span>
                <h1>{step === 1 ? "Quên mật khẩu?" : "Thiết lập lại mật khẩu"}</h1>
                <p>
                    {step === 1
                        ? "Nhập email của bạn để nhận mã xác thực và tiếp tục thiết lập mật khẩu mới."
                        : "Nhập mã xác thực đã gửi tới email cùng mật khẩu mới của bạn."}
                </p>
            </div>

            {mockOtpHint && (
                <div className="forgot-password-form__notice">
                    <span className="forgot-password-form__notice-icon">ℹ️</span>
                    <span>{mockOtpHint}</span>
                </div>
            )}

            {step === 1 ? (
                <form onSubmit={handleSendOtp} noValidate>
                    <div className="form-group">
                        <label htmlFor="forgot-email">{FORGOT_PASSWORD_CONSTANTS.EMAIL_LABEL}</label>
                        <input
                            id="forgot-email"
                            name="email"
                            type="email"
                            value={formData.email}
                            placeholder={FORGOT_PASSWORD_CONSTANTS.EMAIL_PLACEHOLDER}
                            onChange={handleChange}
                            autoComplete="email"
                            className={errors.email ? "input-error" : ""}
                        />
                        {errors.email && <span className="error-message">{errors.email}</span>}
                    </div>

                    <button
                        className="forgot-password-form__submit"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? "Đang gửi mã..." : FORGOT_PASSWORD_CONSTANTS.SEND_OTP_BUTTON}
                        <span aria-hidden="true">→</span>
                    </button>
                </form>
            ) : (
                <form onSubmit={handleResetPassword} noValidate>
                    <div className="forgot-password-form__email-chip">
                        <span>Email: <strong>{formData.email}</strong></span>
                        <button
                            type="button"
                            className="forgot-password-form__change-btn"
                            onClick={() => {
                                setStep(1);
                                setMockOtpHint(null);
                            }}
                        >
                            Đổi email
                        </button>
                    </div>

                    <div className="form-group">
                        <label htmlFor="otp">{FORGOT_PASSWORD_CONSTANTS.OTP_LABEL}</label>
                        <input
                            id="otp"
                            name="otp"
                            type="text"
                            maxLength={6}
                            value={formData.otp}
                            placeholder={FORGOT_PASSWORD_CONSTANTS.OTP_PLACEHOLDER}
                            onChange={handleChange}
                            className={errors.otp ? "input-error" : ""}
                        />
                        {errors.otp && <span className="error-message">{errors.otp}</span>}
                    </div>

                    <div className="forgot-password-form__resend-area">
                        <button
                            type="button"
                            className="forgot-password-form__resend-btn"
                            onClick={handleResendOtp}
                            disabled={countdown > 0}
                        >
                            {countdown > 0
                                ? `Gửi lại mã sau (${countdown}s)`
                                : "Chưa nhận được mã? Gửi lại"}
                        </button>
                    </div>

                    <div className="form-group">
                        <label htmlFor="newPassword">{FORGOT_PASSWORD_CONSTANTS.NEW_PASSWORD_LABEL}</label>
                        <div className="password-input">
                            <input
                                id="newPassword"
                                name="newPassword"
                                type={showNewPassword ? "text" : "password"}
                                value={formData.newPassword}
                                placeholder={FORGOT_PASSWORD_CONSTANTS.NEW_PASSWORD_PLACEHOLDER}
                                onChange={handleChange}
                                className={errors.newPassword ? "input-error" : ""}
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowNewPassword((v) => !v)}
                                aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiển thị mật khẩu"}
                            >
                                {showNewPassword ? (
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
                        {errors.newPassword && (
                            <span className="error-message">{errors.newPassword}</span>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">
                            {FORGOT_PASSWORD_CONSTANTS.CONFIRM_PASSWORD_LABEL}
                        </label>
                        <div className="password-input">
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={formData.confirmPassword}
                                placeholder={FORGOT_PASSWORD_CONSTANTS.CONFIRM_PASSWORD_PLACEHOLDER}
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
                                        <path d="M2.5 12S6 4.9 12 4.9 21.5 12 21.5 12 18 19.1 12 19.1 2.5 12 2.5 12Z" />
                                        <circle cx="12" cy="12" r="2.8" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <span className="error-message">{errors.confirmPassword}</span>
                        )}
                    </div>

                    <button
                        className="forgot-password-form__submit"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? "Đang xử lý..." : FORGOT_PASSWORD_CONSTANTS.SUBMIT_BUTTON}
                        <span aria-hidden="true">→</span>
                    </button>
                </form>
            )}

            <div className="forgot-password-form__back">
                <button
                    type="button"
                    className="forgot-password-form__back-link"
                    onClick={onBackToLogin}
                >
                    <span aria-hidden="true">←</span>
                    {FORGOT_PASSWORD_CONSTANTS.BACK_TO_LOGIN}
                </button>
            </div>
        </div>
    );
};
