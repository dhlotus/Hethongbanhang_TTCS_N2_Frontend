export interface ForgotPasswordStep1Model {
    email: string;
}

export interface ResetPasswordModel {
    email: string;
    otp: string;
    newPassword: string;
    confirmPassword: string;
}
