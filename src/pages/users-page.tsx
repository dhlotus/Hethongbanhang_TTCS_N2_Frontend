import React, { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Edit2,
  CheckCircle2,
  AlertCircle,
  X,
  Warehouse,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  ShieldAlert,
  Shield,
  Info,
  Copy,
  Check,
  Sparkles,
  UserX,
} from "lucide-react";
import { usersService } from "../services/users.service";
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UserManagementItem,
  UserStatusType,
} from "../types/user";
import { USER_ROLES } from "../types/auth";
import { getStoredUser } from "../utils/navigation";

// Nhãn và màu sắc hiển thị cho 7 vai trò chuẩn
const ROLE_CONFIG: Record<
  string,
  { label: string; bgClass: string; textClass: string; ringClass: string }
> = {
  ADMIN: {
    label: "Quản trị hệ thống",
    bgClass: "bg-purple-50",
    textClass: "text-purple-700",
    ringClass: "ring-purple-700/20",
  },
  SALES_MANAGER: {
    label: "Quản lý kinh doanh",
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    ringClass: "ring-blue-700/20",
  },
  SALES_REP: {
    label: "Nhân viên kinh doanh",
    bgClass: "bg-sky-50",
    textClass: "text-sky-700",
    ringClass: "ring-sky-700/20",
  },
  WAREHOUSE_MANAGER: {
    label: "Quản lý kho",
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    ringClass: "ring-amber-700/20",
  },
  WAREHOUSE_KEEPER: {
    label: "Thủ kho",
    bgClass: "bg-orange-50",
    textClass: "text-orange-700",
    ringClass: "ring-orange-700/20",
  },
  ACCOUNTANT: {
    label: "Kế toán công nợ",
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-700",
    ringClass: "ring-emerald-700/20",
  },
  CUSTOMER: {
    label: "Đại lý B2B",
    bgClass: "bg-slate-100",
    textClass: "text-slate-700",
    ringClass: "ring-slate-700/20",
  },
};

const WAREHOUSE_OPTIONS = [
  "Kho Tổng Miền Nam - LOHA WH01",
  "Kho Trung Chuyển Miền Bắc - LOHA WH02",
  "Kho Vận Miền Trung - LOHA WH03",
  "Địa bàn TP. Hồ Chí Minh",
  "Địa bàn Hà Nội & Phía Bắc",
  "Địa bàn Miền Tây",
];

const LOCK_REASON_PRESETS = [
  "Tạm đình chỉ công tác để kiểm tra nội bộ",
  "Nghi vấn vi phạm chính sách bảo mật hệ thống",
  "Yêu cầu đình chỉ từ Ban Giám Đốc",
  "Nhân sự đã nghỉ việc / Chấm dứt hợp đồng",
];

interface ToastState {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
}

export const UsersPage: React.FC = () => {
  const currentAdmin = getStoredUser();

  // Danh sách và phân trang (Mặc định 20 dòng / trang theo chuẩn SN-13)
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Bộ lọc & Tìm kiếm mượt mà có Debounce (350ms)
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Toast thông báo nổi mượt mà (Fade in & Slide out)
  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const hideToast = useCallback(() => {
    setToastVisible(false);
    setTimeout(() => {
      setToast(null);
    }, 300);
  }, []);

  const showToast = useCallback(
    (
      type: "success" | "error" | "info" | "warning",
      title: string,
      message: string,
    ) => {
      setToast({
        id: Math.random().toString(),
        type,
        title,
        message,
      });
      requestAnimationFrame(() => {
        setTimeout(() => setToastVisible(true), 20);
      });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      hideToast();
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast, hideToast]);

  // Modal Tạo / Chỉnh sửa & Quản lý Lỗi Validate
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserManagementItem | null>(null);
  const [formData, setFormData] = useState<CreateUserPayload>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    role: USER_ROLES.SALES_REP,
    roles: [USER_ROLES.SALES_REP],
    assignedWarehouse: "",
    password: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const [submitting, setSubmitting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Kiểm tra tài khoản đang chỉnh sửa có phải chính Admin đang đăng nhập hay không
  const isEditingCurrentSelf = Boolean(
    editingUser &&
      currentAdmin &&
      (currentAdmin.id === editingUser.id ||
        currentAdmin.username?.toLowerCase() ===
          editingUser.username.toLowerCase() ||
        currentAdmin.email?.toLowerCase() ===
          editingUser.email.toLowerCase()),
  );

  // Thao tác chọn / bỏ chọn nhiều vai trò (Multi-role toggle)
  const handleToggleRole = (roleKey: string) => {
    const currentRoles =
      formData.roles && formData.roles.length > 0
        ? [...formData.roles]
        : formData.role
        ? [formData.role]
        : [];
    const isSelected = currentRoles.includes(roleKey);

    // Chặn tuyệt đối tự thu hồi quyền ADMIN của chính mình
    if (isSelected && isEditingCurrentSelf && roleKey === USER_ROLES.ADMIN) {
      showToast(
        "warning",
        "Quyền Quản trị được bảo vệ",
        "Bạn không thể tự thu hồi quyền Quản trị hệ thống (ADMIN) của chính mình.",
      );
      return;
    }

    let updatedRoles: string[];
    if (isSelected) {
      updatedRoles = currentRoles.filter((r) => r !== roleKey);
    } else {
      updatedRoles = [...currentRoles, roleKey];
    }

    setFormData((prev) => ({
      ...prev,
      roles: updatedRoles,
      role: updatedRoles[0] || "",
    }));

    clearFieldError("roles");
    clearFieldError("role");
  };

  // Modal Khóa / Mở khóa
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedUserForStatus, setSelectedUserForStatus] =
    useState<UserManagementItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<UserStatusType>("LOCKED");
  const [statusReason, setStatusReason] = useState("");
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Tải danh sách người dùng từ API thật
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await usersService.getUsers({
        page,
        limit,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });

      setUsers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      showToast(
        "error",
        "Lỗi tải dữ liệu",
        err.response?.data?.message || "Không thể tải danh sách người dùng từ máy chủ.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Sao chép mã cấp vào clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast("info", "Đã sao chép", `Đã sao chép mã "${code}" vào bộ nhớ tạm.`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Admin cấp mã đổi mật khẩu cho nhân sự
  const handleGenerateResetCode = async (userId: string) => {
    try {
      setGeneratingCode(true);
      const res = await usersService.generateResetCode(userId);

      // Cập nhật ngay trên modal đang mở
      setEditingUser((prev) =>
        prev && prev.id === userId ? { ...prev, resetCode: res.resetCode } : prev,
      );

      // Cập nhật lại trong danh sách
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, resetCode: res.resetCode } : u)),
      );

      showToast(
        "success",
        "Cấp mã thành công",
        `Đã tạo mã đổi mật khẩu "${res.resetCode}". Mã sẽ duy trì hiển thị đến khi nhân sự sử dụng.`,
      );
    } catch (err: any) {
      showToast(
        "error",
        "Lỗi cấp mã",
        err.response?.data?.message || "Không thể cấp mã đổi mật khẩu.",
      );
    } finally {
      setGeneratingCode(false);
    }
  };

  // Mở Modal tạo mới
  const handleOpenCreateModal = () => {
    setEditingUser(null);
    setFormErrors({});
    setFormData({
      fullName: "",
      username: "",
      email: "",
      phone: "",
      role: USER_ROLES.SALES_REP,
      roles: [USER_ROLES.SALES_REP],
      assignedWarehouse: "",
      password: "",
    });
    setModalOpen(true);
  };

  // Mở Modal chỉnh sửa
  const handleOpenEditModal = (user: UserManagementItem) => {
    setEditingUser(user);
    setFormErrors({});
    const initialRoles =
      user.roles && user.roles.length > 0
        ? (user.roles as string[])
        : [user.role as string];

    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone || "",
      role: (user.role as string) || initialRoles[0],
      roles: initialRoles,
      assignedWarehouse: user.assignedWarehouse || "",
      password: "",
    });
    setModalOpen(true);
  };

  // Hàm validate biểu mẫu phía Client (SN-13 & SN-14)
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Họ và tên
    if (!formData.fullName.trim()) {
      errs.fullName = "Họ và tên nhân sự không được để trống";
    } else if (formData.fullName.trim().length < 2) {
      errs.fullName = "Họ và tên phải có ít nhất 2 ký tự";
    }

    // 2. Tên đăng nhập (chỉ kiểm tra khi tạo mới)
    if (!editingUser) {
      if (!formData.username.trim()) {
        errs.username = "Tên đăng nhập không được để trống";
      } else if (formData.username.trim().length < 3) {
        errs.username = "Tên đăng nhập phải có ít nhất 3 ký tự";
      } else if (!/^[a-zA-Z0-9_.-]+$/.test(formData.username.trim())) {
        errs.username = "Tên đăng nhập chỉ chứa chữ cái, số, gạch dưới/ngang, không dấu";
      }
    }

    // 3. Email
    if (!formData.email.trim()) {
      errs.email = "Email công việc không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errs.email = "Định dạng email không hợp lệ (VD: nhanvien@loha.vn)";
    }

    // 4. Số điện thoại (chuẩn Việt Nam: 10 chữ số, đầu số 03, 05, 07, 08, 09 hoặc +84)
    if (formData.phone && formData.phone.trim()) {
      const cleanPhone = formData.phone.trim().replace(/[\s.-]+/g, "");
      const vnPhoneRegex = /^(0|\+84)(3[2-9]|5[6|8|9]|7[0|6-9]|8[1-9]|9[0-9])[0-9]{7}$/;
      if (!vnPhoneRegex.test(cleanPhone)) {
        errs.phone = "Số điện thoại không hợp lệ (chuẩn SĐT Việt Nam gồm 10 chữ số, ví dụ: 0912345678)";
      }
    }

    // 5. Đa vai trò hệ thống (SN-14)
    const selectedRoles =
      formData.roles && formData.roles.length > 0
        ? formData.roles
        : formData.role
        ? [formData.role]
        : [];
    if (selectedRoles.length === 0) {
      errs.roles = "Vui lòng chọn ít nhất 1 vai trò trong 7 vai trò hệ thống";
    }

    // Bảo mật Admin: Không thể tự bỏ vai trò ADMIN của chính mình
    if (isEditingCurrentSelf && editingUser) {
      const hadAdmin = (
        editingUser.roles && editingUser.roles.length > 0
          ? editingUser.roles
          : [editingUser.role]
      ).includes(USER_ROLES.ADMIN);

      if (hadAdmin && !selectedRoles.includes(USER_ROLES.ADMIN)) {
        errs.roles = "Không thể tự thu hồi quyền Quản trị hệ thống (ADMIN) của chính mình";
      }
    }

    // 6. Ràng buộc cứng Kho (Business Validation - SN-14)
    const requiresWarehouse = selectedRoles.some(
      (r) =>
        r === USER_ROLES.WAREHOUSE_KEEPER || r === USER_ROLES.WAREHOUSE_MANAGER,
    );
    if (
      requiresWarehouse &&
      (!formData.assignedWarehouse || !formData.assignedWarehouse.trim())
    ) {
      errs.assignedWarehouse =
        "Nhân sự thuộc vai trò Kho bắt buộc phải được gắn với ít nhất một kho phụ trách cụ thể";
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Gửi form Thêm / Sửa
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast(
        "warning",
        "Thông tin chưa hợp lệ",
        "Vui lòng kiểm tra và sửa lại các trường thông tin đang báo lỗi trên biểu mẫu.",
      );
      return;
    }

    try {
      setSubmitting(true);
      const selectedRoles =
        formData.roles && formData.roles.length > 0
          ? formData.roles
          : [formData.role];

      if (editingUser) {
        // Cập nhật người dùng (Đa vai trò & kho)
        const updatePayload: UpdateUserPayload = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone?.trim() || "",
          role: selectedRoles[0],
          roles: selectedRoles,
          assignedWarehouse: formData.assignedWarehouse?.trim() || "",
          password: formData.password ? formData.password.trim() : undefined,
        };

        const updated = await usersService.updateUser(editingUser.id, updatePayload);
        showToast(
          "success",
          "Cập nhật thành công",
          `Thông tin tài khoản "${updated.fullName}" đã được lưu thành công.`,
        );
      } else {
        // Tạo người dùng mới
        const res = await usersService.createUser({
          ...formData,
          fullName: formData.fullName.trim(),
          username: formData.username.trim(),
          email: formData.email.trim(),
          phone: formData.phone?.trim() || "",
          role: selectedRoles[0],
          roles: selectedRoles,
          assignedWarehouse: formData.assignedWarehouse?.trim() || "",
          password: formData.password ? formData.password.trim() : undefined,
        });

        const tempPassMsg = res.temporaryPassword
          ? `Mật khẩu khởi tạo: ${res.temporaryPassword}. Thư kích hoạt kèm hướng dẫn đã được gửi tới ${res.user.email}.`
          : `Thư kích hoạt tài khoản đã được gửi tới ${res.user.email}.`;

        showToast(
          "success",
          "Thêm nhân sự mới thành công",
          `Tài khoản "${res.user.fullName}" (${res.user.username}) đã được tạo. ${tempPassMsg}`,
        );
      }

      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      const serverMsg =
        err.response?.data?.message ||
        "Có lỗi xảy ra khi lưu thông tin người dùng.";

      // Nếu máy chủ báo trùng lặp tên đăng nhập hoặc email, highlight lỗi trực tiếp
      if (typeof serverMsg === "string") {
        if (serverMsg.includes("Tên đăng nhập")) {
          setFormErrors((prev) => ({
            ...prev,
            username: "Tên đăng nhập này đã được sử dụng trên hệ thống",
          }));
        }
        if (serverMsg.includes("email") || serverMsg.includes("Email")) {
          setFormErrors((prev) => ({
            ...prev,
            email: "Địa chỉ email này đã được sử dụng trên hệ thống",
          }));
        }
      }

      showToast("error", "Thao tác thất bại", serverMsg);
    } finally {
      setSubmitting(false);
    }
  };

  // Mở Modal Khóa / Mở khóa
  const handleOpenStatusModal = (
    user: UserManagementItem,
    status: UserStatusType,
  ) => {
    setSelectedUserForStatus(user);
    setTargetStatus(status);
    setStatusReason(
      status === "LOCKED"
        ? ""
        : `Mở khóa khôi phục quyền truy cập cho nhân sự ${user.fullName}`,
    );
    setStatusModalOpen(true);
  };

  // Gửi form Khóa / Mở khóa
  const handleSubmitStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForStatus) return;

    if (targetStatus === "LOCKED" && !statusReason.trim()) {
      showToast("warning", "Thiếu lý do khóa", "Vui lòng nhập lý do khóa tài khoản để lưu nhật ký kiểm toán.");
      return;
    }

    try {
      setStatusSubmitting(true);
      await usersService.updateUserStatus(selectedUserForStatus.id, {
        status: targetStatus,
        reason: statusReason.trim(),
      });

      if (targetStatus === "LOCKED") {
        showToast(
          "success",
          "Đã khóa tài khoản",
          `Tài khoản "${selectedUserForStatus.fullName}" đã bị khóa. Toàn bộ phiên làm việc của nhân sự đã bị chấm dứt ngay lập tức.`,
        );
      } else {
        showToast(
          "success",
          "Mở khóa thành công",
          `Tài khoản "${selectedUserForStatus.fullName}" đã được khôi phục quyền hoạt động.`,
        );
      }

      setStatusModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(
        "error",
        "Không thể cập nhật trạng thái",
        err.response?.data?.message || "Có lỗi xảy ra khi cập nhật trạng thái tài khoản.",
      );
    } finally {
      setStatusSubmitting(false);
    }
  };

  // Thống kê nhanh
  const activeCount = users.filter((u) => u.status === "ACTIVE").length;
  const lockedCount = users.filter((u) => u.status === "LOCKED").length;
  const codePendingCount = users.filter((u) => Boolean(u.resetCode)).length;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* ========================================================================= */}
      {/* 1. FLOATING TOAST NOTIFICATION (Trượt từ bên phải sang, luôn nổi trên cùng) */}
      {/* ========================================================================= */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[9999] flex items-start gap-3.5 w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white p-4.5 shadow-2xl border border-slate-200/90 ring-1 ring-slate-900/10 transition-all duration-300 ease-out transform ${
            toastVisible
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0 pointer-events-none"
          } ${
            toast.type === "success"
              ? "border-l-4 border-l-emerald-500"
              : toast.type === "error"
              ? "border-l-4 border-l-rose-500"
              : toast.type === "warning"
              ? "border-l-4 border-l-amber-500"
              : "border-l-4 border-l-indigo-500"
          }`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-600"
                : toast.type === "error"
                ? "bg-rose-50 text-rose-600"
                : toast.type === "warning"
                ? "bg-amber-50 text-amber-600"
                : "bg-indigo-50 text-indigo-600"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="h-5 w-5" />}
            {toast.type === "error" && <AlertCircle className="h-5 w-5" />}
            {toast.type === "warning" && <ShieldAlert className="h-5 w-5" />}
            {toast.type === "info" && <KeyRound className="h-5 w-5" />}
          </div>

          <div className="flex-1 pr-1">
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              {toast.title}
            </h4>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed font-normal">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={hideToast}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. STATS CARDS: THỐNG KÊ NHANH TỔNG QUAN                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-white p-4.5 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold">Tổng nhân sự</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900">{total}</div>
        </div>

        <div className="rounded-2xl bg-white p-4.5 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold">Đang hoạt động</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-700">{activeCount}</div>
        </div>

        <div className="rounded-2xl bg-white p-4.5 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold">Đang bị khóa</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <Lock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-rose-600">{lockedCount}</div>
        </div>

        <div className="rounded-2xl bg-white p-4.5 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold">Chờ đổi mật khẩu</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <KeyRound className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-indigo-600">{codePendingCount}</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TOOLBAR: TÌM KIẾM, BỘ LỌC & THAO TÁC HỆ THỐNG                          */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between rounded-2xl bg-white p-4 border border-slate-100 shadow-2xs">
        {/* Nhóm tìm kiếm và bộ lọc bên trái */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center flex-1">
          {/* Ô tìm kiếm có debounce mượt mà */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo họ tên, username, email, số điện thoại..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Bộ lọc vai trò */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-medium text-slate-700 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="">Tất cả vai trò (7)</option>
            {Object.keys(ROLE_CONFIG).map((roleKey) => (
              <option key={roleKey} value={roleKey}>
                {ROLE_CONFIG[roleKey].label}
              </option>
            ))}
          </select>

          {/* Bộ lọc trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-medium text-slate-700 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đang bị khóa</option>
          </select>
        </div>

        {/* Nhóm nút hành động bên phải */}
        <div className="flex items-center gap-2 shrink-0 justify-end">
          <button
            type="button"
            onClick={() => fetchUsers()}
            disabled={loading}
            title="Làm mới danh sách"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-purple-700 active:scale-[0.98] transition-all shadow-sm shadow-purple-600/20"
          >
            <UserPlus className="h-4 w-4" />
            <span>Thêm nhân sự mới</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. DATA TABLE: BẢNG DỮ LIỆU NGƯỜI DÙNG                                    */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[840px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3.5">Nhân sự</th>
                <th className="px-5 py-3.5">Tên đăng nhập / Email</th>
                <th className="px-5 py-3.5">Số điện thoại</th>
                <th className="px-5 py-3.5">Vai trò</th>
                <th className="px-5 py-3.5">Kho / Địa bàn phụ trách</th>
                <th className="px-5 py-3.5 text-center whitespace-nowrap min-w-[130px]">Trạng thái</th>
                <th className="px-5 py-3.5 text-center whitespace-nowrap min-w-[90px]">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <span>Đang tải danh sách nhân sự từ hệ thống...</span>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <span>Không tìm thấy tài khoản phù hợp với điều kiện lọc</span>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isCurrentSelf = Boolean(
                    currentAdmin &&
                      (currentAdmin.id === u.id ||
                        currentAdmin.username?.toLowerCase() ===
                          u.username.toLowerCase() ||
                        currentAdmin.email?.toLowerCase() === u.email.toLowerCase()),
                  );

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Họ và tên */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-50 font-bold text-purple-700 text-xs shadow-2xs">
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {isCurrentSelf && (
                                <span className="rounded-md bg-purple-100 px-1.5 py-0.2 text-[10px] font-bold text-purple-700">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: {u.id.substring(0, 16)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tên đăng nhập & Email */}
                      <td className="px-5 py-3.5">
                        <div className="font-mono font-bold text-slate-900">
                          {u.username}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span>{u.email}</span>
                        </div>

                        {/* Huy hiệu mã cấp đổi mật khẩu (nếu có và chưa đổi) */}
                        {u.resetCode && (
                          <div className="mt-1.5 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                              <KeyRound className="h-2.5 w-2.5" />
                              <span>Mã cấp: {u.resetCode}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(u.resetCode!)}
                              title="Sao chép mã cấp"
                              className="rounded p-0.5 text-indigo-400 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
                            >
                              {copiedCode === u.resetCode ? (
                                <Check className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Số điện thoại */}
                      <td className="px-5 py-3.5">
                        {u.phone ? (
                          <div className="flex items-center gap-1.5 font-mono text-slate-700">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{u.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">---</span>
                        )}
                      </td>

                      {/* Vai trò (Đa vai trò SN-14) */}
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[230px]">
                          {((u.roles && u.roles.length > 0 ? u.roles : [u.role]) as string[]).map(
                            (rKey) => {
                              const config = ROLE_CONFIG[rKey] || {
                                label: rKey,
                                bgClass: "bg-slate-100",
                                textClass: "text-slate-700",
                                ringClass: "ring-slate-700/10",
                              };
                              return (
                                <span
                                  key={rKey}
                                  className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${config.bgClass} ${config.textClass} ${config.ringClass}`}
                                >
                                  {config.label}
                                </span>
                              );
                            },
                          )}
                        </div>
                      </td>

                      {/* Kho / Địa bàn */}
                      <td className="px-5 py-3.5">
                        {u.assignedWarehouse ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <Warehouse className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[180px]">
                              {u.assignedWarehouse}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Chưa phân công</span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        {u.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 whitespace-nowrap">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="whitespace-nowrap">Hoạt động</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 cursor-help whitespace-nowrap"
                            title={u.lockReason || "Tài khoản bị khóa bởi Quản trị viên"}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                            <span className="whitespace-nowrap">Bị khóa</span>
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {/* Nút sửa thông tin */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(u)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                            title="Sửa thông tin & Cấp mã đổi mật khẩu"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>

                          {/* Nút Khóa / Mở khóa (Admin không thể tự khóa chính mình) */}
                          {isCurrentSelf ? (
                            <span
                              className="rounded-lg p-1.5 text-slate-300 cursor-not-allowed"
                              title="Bạn không thể tự khóa tài khoản của chính mình"
                            >
                              <Lock className="h-4 w-4" />
                            </span>
                          ) : u.status === "ACTIVE" ? (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(u, "LOCKED")}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Khóa tài khoản (Chấm dứt phiên làm việc ngay lập tức)"
                            >
                              <Lock className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenStatusModal(u, "ACTIVE")}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                              title="Mở khóa tài khoản"
                            >
                              <Unlock className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang (Mặc định 20 dòng / trang theo chuẩn SN-13) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/30">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              Hiển thị{" "}
              <strong>
                {total === 0 ? 0 : (page - 1) * limit + 1} - {Math.min(page * limit, total)}
              </strong>{" "}
              trong tổng số <strong>{total}</strong> nhân sự
            </div>

            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
              <span className="text-slate-400">Số dòng/trang:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng (Chuẩn)</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Trước</span>
            </button>

            {/* Các nút bấm số trang */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - page) <= 1,
                )
                .map((p, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsisBefore && (
                        <span className="px-1 text-slate-400 font-bold">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPage(p)}
                        className={`h-7 min-w-7 px-2 rounded-lg text-xs font-semibold transition-all ${
                          page === p
                            ? "bg-purple-600 text-white shadow-2xs shadow-purple-600/30"
                            : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs"
            >
              <span>Sau</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. MODAL THÊM / CẬP NHẬT NHÂN SỰ & CẤP MÃ ĐỔI MẬT KHẨU                    */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shadow-2xs">
                  {editingUser ? (
                    <Edit2 className="h-5 w-5" />
                  ) : (
                    <UserPlus className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingUser ? "Cập nhật Thông tin Nhân sự" : "Thêm mới Nhân sự"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingUser
                      ? `Mã tài khoản: ${editingUser.id}`
                      : "Điền đầy đủ thông tin để cấp tài khoản truy cập hệ thống"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body Form (Scrollable) */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 overflow-y-auto">
              {/* Họ tên & SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên nhân sự <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => {
                      setFormData({ ...formData, fullName: e.target.value });
                      clearFieldError("fullName");
                    }}
                    placeholder="VD: Nguyễn Văn An"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs transition-all ${
                      formErrors.fullName
                        ? "border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-rose-50/15"
                        : "border-slate-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    }`}
                  />
                  {formErrors.fullName && (
                    <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{formErrors.fullName}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại liên hệ (SĐT Việt Nam)
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      clearFieldError("phone");
                    }}
                    placeholder="VD: 0912345678"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs transition-all ${
                      formErrors.phone
                        ? "border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-rose-50/15"
                        : "border-slate-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    }`}
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{formErrors.phone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Tên đăng nhập & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên đăng nhập (Username) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(editingUser)}
                    value={formData.username}
                    onChange={(e) => {
                      setFormData({ ...formData, username: e.target.value });
                      clearFieldError("username");
                    }}
                    placeholder="VD: sales_an"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs disabled:bg-slate-100 disabled:text-slate-500 transition-all ${
                      formErrors.username
                        ? "border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-rose-50/15"
                        : "border-slate-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    }`}
                  />
                  {formErrors.username && (
                    <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{formErrors.username}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email công việc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      clearFieldError("email");
                    }}
                    placeholder="VD: an.nguyen@loha.vn"
                    className={`w-full rounded-xl border px-3.5 py-2 text-xs transition-all ${
                      formErrors.email
                        ? "border-rose-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 bg-rose-50/15"
                        : "border-slate-200 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    }`}
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{formErrors.email}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* PHÂN QUYỀN ĐA VAI TRÒ (Multi-role - SN-14) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Vai trò hệ thống (Đa vai trò) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Đã chọn:{" "}
                    <strong className="text-purple-700">
                      {formData.roles?.length || 0}
                    </strong>{" "}
                    vai trò
                  </span>
                </div>

                {/* Cảnh báo an toàn khi Admin sửa tài khoản chính mình */}
                {isEditingCurrentSelf && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-purple-200/80 bg-purple-50/70 p-3 text-xs text-purple-900 shadow-2xs">
                    <Shield className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Bảo vệ quyền Quản trị viên:</span> Bạn đang chỉnh sửa tài khoản Quản trị của chính mình. Quyền <strong>Quản trị hệ thống (ADMIN)</strong> được khóa cố định để đảm bảo bạn không bị mất quyền truy cập.
                    </div>
                  </div>
                )}

                {/* Danh sách 7 vai trò dạng checkbox/cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.keys(ROLE_CONFIG).map((roleKey) => {
                    const cfg = ROLE_CONFIG[roleKey];
                    const isSelected = (formData.roles || []).includes(roleKey);
                    const isAdminLocked = isEditingCurrentSelf && roleKey === USER_ROLES.ADMIN;

                    return (
                      <div
                        key={roleKey}
                        onClick={() => {
                          if (!isAdminLocked) handleToggleRole(roleKey);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isAdminLocked
                            ? "bg-purple-50/40 border-purple-200 cursor-not-allowed"
                            : isSelected
                            ? "bg-purple-50/60 border-purple-300 shadow-2xs"
                            : "bg-white border-slate-200 hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isAdminLocked}
                            onChange={() => {
                              if (!isAdminLocked) handleToggleRole(roleKey);
                            }}
                            className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500 border-slate-300 cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="truncate">
                            <span className="font-semibold text-slate-800">{cfg.label}</span>
                            <span className="text-[10px] font-mono text-slate-400 ml-1.5">
                              ({roleKey})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {isAdminLocked ? (
                            <span
                              title="Quyền quản trị của chính bạn được bảo vệ"
                              className="inline-flex items-center gap-1 rounded-md bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-700"
                            >
                              <Lock className="h-2.5 w-2.5" />
                              Khóa
                            </span>
                          ) : (
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${cfg.bgClass} ${cfg.textClass} ${cfg.ringClass}`}
                            >
                              {roleKey === USER_ROLES.WAREHOUSE_KEEPER || roleKey === USER_ROLES.WAREHOUSE_MANAGER
                                ? "Kho"
                                : "Nhóm"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {formErrors.roles && (
                  <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{formErrors.roles}</span>
                  </p>
                )}
              </div>

              {/* KHO HOẶC ĐỊA BÀN PHỤ TRÁCH (Ràng buộc động SN-14) */}
              <div>
                {(() => {
                  const hasWarehouseRole = (formData.roles || []).some(
                    (r) =>
                      r === USER_ROLES.WAREHOUSE_KEEPER ||
                      r === USER_ROLES.WAREHOUSE_MANAGER,
                  );

                  return (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Kho hoặc Địa bàn phụ trách{" "}
                          {hasWarehouseRole ? (
                            <span className="text-rose-500 font-bold">*</span>
                          ) : (
                            <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                          )}
                        </label>
                        {hasWarehouseRole && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Bắt buộc cho vai trò Kho
                          </span>
                        )}
                      </div>

                      <select
                        value={formData.assignedWarehouse}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            assignedWarehouse: e.target.value,
                          });
                          clearFieldError("assignedWarehouse");
                        }}
                        className={`w-full rounded-xl border bg-white px-3.5 py-2 text-xs focus:outline-none focus:ring-2 transition-all ${
                          formErrors.assignedWarehouse
                            ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/15"
                            : "border-slate-200 focus:border-purple-500 focus:ring-purple-500/20"
                        }`}
                      >
                        <option value="">-- Chưa chọn kho / địa bàn --</option>
                        {WAREHOUSE_OPTIONS.map((wh) => (
                          <option key={wh} value={wh}>
                            {wh}
                          </option>
                        ))}
                      </select>

                      {formErrors.assignedWarehouse ? (
                        <p className="mt-1 text-[11px] text-rose-500 flex items-center gap-1 font-medium">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                          <span>{formErrors.assignedWarehouse}</span>
                        </p>
                      ) : hasWarehouseRole ? (
                        <p className="mt-1 text-[11px] text-amber-700 flex items-center gap-1">
                          <Info className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Nhân sự thuộc vai trò Thủ kho / Quản lý kho bắt buộc phải gắn với kho phụ trách cụ thể.
                          </span>
                        </p>
                      ) : null}
                    </>
                  );
                })()}
              </div>

              {/* =============================================================== */}
              {/* KHU VỰC CẤP MÃ ĐĂNG NHẬP CHO NHÂN SỰ (Nếu đang chỉnh sửa)       */}
              {/* =============================================================== */}
              {editingUser ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-950">
                        Cấp mã đăng nhập tạm thời cho nhân sự
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={generatingCode}
                      onClick={() => handleGenerateResetCode(editingUser.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>{editingUser.resetCode ? "Cấp lại mã khác" : "Cấp mã đăng nhập"}</span>
                    </button>
                  </div>

                  {editingUser.resetCode ? (
                    <div className="rounded-lg bg-white p-3 border border-indigo-200 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            Mã đăng nhập tạm thời hiện tại (Chưa sử dụng):
                          </div>
                          <div className="font-mono text-base font-extrabold text-indigo-700 tracking-wider mt-0.5">
                            {editingUser.resetCode}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(editingUser.resetCode!)}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            {copiedCode === editingUser.resetCode ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Đã chép</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Sao chép mã</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-indigo-950/70 border-t border-indigo-50 pt-2 leading-relaxed">
                        💡 <strong>Hướng dẫn:</strong> Nhân sự chỉ cần nhập Tên đăng nhập bình thường và nhập mã này vào ô <strong>Mật khẩu</strong> tại trang Đăng nhập là vào được. Mã sẽ hiển thị tại đây cho đến khi nhân sự tự đổi mật khẩu mới.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                      Khi nhân sự không nhớ tài khoản/mật khẩu và không thể truy cập email, bấm nút <strong>"Cấp mã đăng nhập"</strong> ở trên để tạo mã (VD: LH-829401). Nhân sự nhập tên đăng nhập bình thường và nhập mã này vào ô Mật khẩu để đăng nhập trực tiếp. Mã sẽ hiển thị tại đây đến khi nhân sự tự đổi mật khẩu mới.
                    </p>
                  )}

                  {/* Hoặc tự nhập mật khẩu mới thủ công */}
                  <div className="pt-2 border-t border-indigo-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hoặc tự gán mật khẩu mới trực tiếp (Để trống nếu không đổi)
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Nhập mật khẩu mới (tối thiểu 8 ký tự)..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>
              ) : (
                /* Khi Tạo mới nhân sự */
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu khởi tạo (Để trống hệ thống sẽ tự động sinh mật khẩu tạm thời an toàn)
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Mặc định: Loha@2026 (nếu bỏ trống)"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              )}

              {/* Footer buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50 transition-all shadow-sm shadow-purple-600/20"
                >
                  {submitting
                    ? "Đang lưu..."
                    : editingUser
                    ? "Lưu cập nhật"
                    : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL KHÓA / MỞ KHÓA TÀI KHOẢN NHÂN SỰ                                */}
      {/* ========================================================================= */}
      {statusModalOpen && selectedUserForStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <button
              type="button"
              onClick={() => setStatusModalOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-2xs ${
                  targetStatus === "LOCKED"
                    ? "bg-rose-50 text-rose-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {targetStatus === "LOCKED" ? (
                  <UserX className="h-6 w-6" />
                ) : (
                  <Unlock className="h-6 w-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {targetStatus === "LOCKED"
                    ? "Xác nhận Khóa tài khoản"
                    : "Xác nhận Mở khóa tài khoản"}
                </h3>
                <p className="text-xs text-slate-500">
                  Nhân sự: <strong>{selectedUserForStatus.fullName}</strong> (
                  {selectedUserForStatus.username})
                </p>
              </div>
            </div>

            {targetStatus === "LOCKED" && (
              <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200/80 p-3.5 text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>Cảnh báo bảo mật hệ thống:</span>
                </div>
                <p className="leading-relaxed">
                  Khi khóa, toàn bộ phiên làm việc của nhân sự sẽ bị ngắt kết nối ngay lập tức. Mọi phiên đăng nhập hiện tại sẽ bị thu hồi và nhân viên sẽ bị out ra ngay lập tức.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmitStatus} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lý do {targetStatus === "LOCKED" ? "khóa" : "mở khóa"} tài khoản{" "}
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder={
                    targetStatus === "LOCKED"
                      ? "Nhập lý do cụ thể (Bắt buộc để lưu nhật ký kiểm toán)..."
                      : "Nhập ghi chú mở khóa..."
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Gợi ý lý do nhanh khi khóa */}
              {targetStatus === "LOCKED" && (
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block mb-1">
                    Gợi ý lý do phổ biến:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {LOCK_REASON_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset}
                        onClick={() => setStatusReason(preset)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={statusSubmitting}
                  className={`rounded-xl px-5 py-2 text-xs font-semibold text-white transition-all shadow-sm ${
                    targetStatus === "LOCKED"
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                      : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  } disabled:opacity-50`}
                >
                  {statusSubmitting
                    ? "Đang xử lý..."
                    : targetStatus === "LOCKED"
                    ? "Xác nhận Khóa tài khoản"
                    : "Xác nhận Mở khóa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
