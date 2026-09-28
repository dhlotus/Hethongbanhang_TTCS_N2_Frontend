import { FORGOT_PASSWORD_CONSTANTS } from "../constants/forgot-password-constants";
import type { ResetPasswordModel } from "../models/forgot-password-model";

export const validateEmailOnly = (email: string): string => {
    if (!email.trim()) {
        return FORGOT_PASSWORD_CONSTANTS.REQUIRED_EMAIL;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return FORGOT_PASSWORD_CONSTANTS.INVALID_EMAIL;
    }
    return "";
};

export const validateResetPasswordForm = (
    data: ResetPasswordModel
): Partial<Record<keyof ResetPasswordModel, string>> => {
    const errors: Partial<Record<keyof ResetPasswordModel, string>> = {};

    const emailErr = validateEmailOnly(data.email);
    if (emailErr) {
        errors.email = emailErr;
    }

    if (!data.otp.trim()) {
        errors.otp = FORGOT_PASSWORD_CONSTANTS.REQUIRED_OTP;
    } else if (!/^\d{6}$/.test(data.otp.trim())) {
        errors.otp = FORGOT_PASSWORD_CONSTANTS.INVALID_OTP;
    }

    if (!data.newPassword) {
        errors.newPassword = FORGOT_PASSWORD_CONSTANTS.REQUIRED_NEW_PASSWORD;
    } else if (data.newPassword.length < 6) {
        errors.newPassword = FORGOT_PASSWORD_CONSTANTS.MIN_PASSWORD_LENGTH;
    }

    if (!data.confirmPassword) {
        errors.confirmPassword = FORGOT_PASSWORD_CONSTANTS.REQUIRED_CONFIRM_PASSWORD;
    } else if (data.confirmPassword !== data.newPassword) {
        errors.confirmPassword = FORGOT_PASSWORD_CONSTANTS.PASSWORD_MISMATCH;
    }

    return errors;
};
