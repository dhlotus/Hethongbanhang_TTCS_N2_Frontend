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
