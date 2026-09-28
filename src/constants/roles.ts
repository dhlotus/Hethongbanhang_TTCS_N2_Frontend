export const UserRole = {
    ADMIN: "Admin",
    WAREHOUSE: "Warehouse",
    WH_MANAGER: "WH Manager",
    ACCOUNTANT: "Accountant",
    SALES_REP: "Sales Rep",
    SALES_MANAGER: "Sales Manager",
    CUSTOMER: "Customer",
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

/**
 * Đường dẫn trang chủ tương ứng cho từng vai trò
 */
export const ROLE_HOME_PATHS: Record<string, string> = {
    [UserRole.ADMIN]: "/admin",
    [UserRole.WH_MANAGER]: "/warehouse",
    [UserRole.WAREHOUSE]: "/warehouse",
    [UserRole.ACCOUNTANT]: "/accounting",
    [UserRole.SALES_MANAGER]: "/sales",
    [UserRole.SALES_REP]: "/sales",
    [UserRole.CUSTOMER]: "/customer",
};

/**
 * Tên hiển thị tiếng Việt cho các vai trò
 */
export const ROLE_LABELS: Record<string, string> = {
    [UserRole.ADMIN]: "Quản trị viên (Admin)",
    [UserRole.WH_MANAGER]: "Quản lý kho (WH Manager)",
    [UserRole.WAREHOUSE]: "Thủ kho (Warehouse)",
    [UserRole.ACCOUNTANT]: "Kế toán (Accountant)",
    [UserRole.SALES_MANAGER]: "Quản lý kinh doanh (Sales Manager)",
    [UserRole.SALES_REP]: "Nhân viên bán hàng (Sales Rep)",
    [UserRole.CUSTOMER]: "Khách hàng (Customer)",
};

/**
 * Xác định route trang chủ theo độ ưu tiên của các vai trò mà tài khoản sở hữu
 */
export const getRedirectPathByRole = (roles?: string[] | string): string => {
    if (!roles) return "/login";
    const roleList = Array.isArray(roles) ? roles : [roles];

    // Độ ưu tiên điều hướng:
    if (roleList.includes(UserRole.ADMIN)) {
        return ROLE_HOME_PATHS[UserRole.ADMIN];
    }
    if (roleList.includes(UserRole.WH_MANAGER) || roleList.includes(UserRole.WAREHOUSE)) {
        return ROLE_HOME_PATHS[UserRole.WAREHOUSE];
    }
    if (roleList.includes(UserRole.ACCOUNTANT)) {
        return ROLE_HOME_PATHS[UserRole.ACCOUNTANT];
    }
    if (roleList.includes(UserRole.SALES_MANAGER) || roleList.includes(UserRole.SALES_REP)) {
        return ROLE_HOME_PATHS[UserRole.SALES_REP];
    }
    if (roleList.includes(UserRole.CUSTOMER)) {
        return ROLE_HOME_PATHS[UserRole.CUSTOMER];
    }

    return "/customer";
};
