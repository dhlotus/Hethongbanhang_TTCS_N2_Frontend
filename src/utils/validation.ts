import { z } from "zod";

/**
 * Schema validate dữ liệu đầu vào màn hình Đăng nhập (SN-108)
 * - Username/Email: Không được để trống, đúng định dạng email hoặc username tối thiểu 3 ký tự
 * - Password: Không được để trống, tối thiểu 6 ký tự
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên đăng nhập hoặc email")
    .refine(
      (val) => {
        if (val.includes("@")) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
        }
        return val.length >= 3 && !/\s/.test(val);
      },
      {
        message: "Email không đúng định dạng hoặc tên đăng nhập tối thiểu 3 ký tự (không chứa khoảng trắng)",
      },
    ),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu")
    .min(6, "Mật khẩu phải có tối thiểu 6 ký tự"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Schema validate dữ liệu Form Đổi mật khẩu (Change Password)
 * - currentPassword: Bắt buộc nhập
 * - newPassword: Bắt buộc nhập, tối thiểu 8 ký tự, phải chứa cả chữ cái và chữ số
 * - confirmPassword: Phải trùng khớp với newPassword
 */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu mới")
      .min(8, "Mật khẩu mới phải có tối thiểu 8 ký tự")
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d)/,
        "Mật khẩu mới phải bao gồm cả chữ cái và chữ số",
      ),
    confirmPassword: z
      .string()
      .min(1, "Vui lòng xác nhận lại mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không trùng khớp với mật khẩu mới",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "Mật khẩu mới không được trùng với mật khẩu hiện tại",
    path: ["newPassword"],
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

/**
 * Schema validate dữ liệu Form Quên mật khẩu (SN-8)
 * - email: Bắt buộc nhập, đúng định dạng email
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập địa chỉ email của bạn")
    .email("Địa chỉ email không đúng định dạng (ví dụ: loha@example.vn)"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Schema validate dữ liệu Form Đặt lại mật khẩu (SN-8)
 * - newPassword: Tối thiểu 8 ký tự, phải chứa cả chữ cái và chữ số
 * - confirmPassword: Phải trùng khớp với newPassword
 */
export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu mới")
      .min(8, "Mật khẩu mới phải có tối thiểu 8 ký tự")
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d)/,
        "Mật khẩu mới phải bao gồm cả chữ cái và chữ số",
      ),
    confirmPassword: z
      .string()
      .min(1, "Vui lòng xác nhận lại mật khẩu mới"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu xác nhận không trùng khớp với mật khẩu mới",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;
