import { LOGIN_CONSTANTS } from "../constants/login-constants";
import type { LoginModel } from "../models/login-model";

export const validateLoginForm = (
    loginData: LoginModel,
): Partial<LoginModel> => {
    const errors: Partial<LoginModel> = {};

    if (!loginData.email.trim()) {
        errors.email = LOGIN_CONSTANTS.REQUIRED_EMAIL;
    } else if (!isValidEmail(loginData.email)) {
        errors.email = LOGIN_CONSTANTS.INVALID_EMAIL;
    }

    if (!loginData.password.trim()) {
        errors.password = LOGIN_CONSTANTS.REQUIRED_PASSWORD;
    }

    return errors;
};

const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};