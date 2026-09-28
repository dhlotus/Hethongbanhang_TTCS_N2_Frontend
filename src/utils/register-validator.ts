import { REGISTER_CONSTANTS } from "../constants/register-constants";
import type { RegisterModel } from "../models/register-model";

export const validateRegisterForm = (
    data: RegisterModel
): Partial<Record<keyof RegisterModel, string>> => {
    const errors: Partial<Record<keyof RegisterModel, string>> = {};

    if (!data.fullName.trim()) {
        errors.fullName = REGISTER_CONSTANTS.REQUIRED_FULL_NAME;
    } else if (data.fullName.trim().length < 2) {
        errors.fullName = REGISTER_CONSTANTS.MIN_FULL_NAME;
    }

    if (!data.username.trim()) {
        errors.username = REGISTER_CONSTANTS.REQUIRED_USERNAME;
    } else if (data.username.trim().length < 3) {
        errors.username = REGISTER_CONSTANTS.MIN_USERNAME;
    } else if (!/^[a-zA-Z0-9_.-]+$/.test(data.username.trim())) {
        errors.username = REGISTER_CONSTANTS.INVALID_USERNAME;
    }

    if (!data.email.trim()) {
        errors.email = REGISTER_CONSTANTS.REQUIRED_EMAIL;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
        errors.email = REGISTER_CONSTANTS.INVALID_EMAIL;
    }

    if (!data.password) {
        errors.password = REGISTER_CONSTANTS.REQUIRED_PASSWORD;
    } else if (data.password.length < 6) {
        errors.password = REGISTER_CONSTANTS.MIN_PASSWORD;
    }

    if (!data.confirmPassword) {
        errors.confirmPassword = REGISTER_CONSTANTS.REQUIRED_CONFIRM_PASSWORD;
    } else if (data.confirmPassword !== data.password) {
        errors.confirmPassword = REGISTER_CONSTANTS.PASSWORD_MISMATCH;
    }

    return errors;
};
