import React, { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Edit2,
  ShieldCheck,
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

  // Danh sách và phân trang
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Bộ lọc
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Toast thông báo nổi (Thay thế hoàn toàn inline alerts làm vỡ giao diện)
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = (
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
  };

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(timer);
  }, [toast]);

  // Modal Tạo / Chỉnh sửa
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserManagementItem | null>(null);
  const [formData, setFormData] = useState<CreateUserPayload>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    role: USER_ROLES.SALES_REP,
    assignedWarehouse: "",
    password: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
  }, [page, limit, search, roleFilter, statusFilter]);

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
    setFormData({
      fullName: "",
      username: "",
      email: "",
      phone: "",
      role: USER_ROLES.SALES_REP,
      assignedWarehouse: "",
      password: "",
    });
    setModalOpen(true);
  };

  // Mở Modal chỉnh sửa
  const handleOpenEditModal = (user: UserManagementItem) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      assignedWarehouse: user.assignedWarehouse || "",
      password: "",
    });
    setModalOpen(true);
  };

  // Gửi form Thêm / Sửa
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      if (editingUser) {
        // Cập nhật người dùng
        const updatePayload: UpdateUserPayload = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          assignedWarehouse: formData.assignedWarehouse,
          password: formData.password ? formData.password : undefined,
        };

        const updated = await usersService.updateUser(editingUser.id, updatePayload);
        showToast(
          "success",
          "Cập nhật thành công",
          `Thông tin tài khoản "${updated.fullName}" đã được lưu thành công.`,
        );
      } else {
        // Tạo người dùng mới
        const res = await usersService.createUser(formData);
        const tempPassMsg = res.temporaryPassword
          ? ` (Mật khẩu khởi tạo: ${res.temporaryPassword})`
          : "";

        showToast(
          "success",
          "Thêm nhân sự thành công",
          `Tài khoản "${res.user.fullName}" đã được tạo thành công${tempPassMsg}.`,
        );
      }

      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      showToast(
        "error",
        "Thao tác thất bại",
        err.response?.data?.message || "Có lỗi xảy ra khi lưu thông tin người dùng.",
      );
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
      {/* 1. FLOATING TOAST NOTIFICATION (Thay thế inline alert, không làm vỡ form)  */}
      {/* ========================================================================= */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-start gap-3 max-w-md rounded-2xl bg-white p-4 shadow-xl border border-slate-100 ring-1 ring-slate-900/5 transition-all duration-200 animate-in slide-in-from-top-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
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

          <div className="flex-1 pr-2">
            <h4 className="text-xs font-bold text-slate-900 leading-tight">
              {toast.title}
            </h4>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              {toast.message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. HEADER BANNER & STATS CARDS                                            */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-700/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Phân hệ Quản trị & RBAC (SN-10)</span>
            </span>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/20">
              7 Vai trò Nghiệp vụ
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Quản lý Người dùng & Phân quyền Hệ thống
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
            Quản trị danh sách nhân sự, phân bổ quyền hạn, kiểm soát trạng thái
            và cấp mã khôi phục tài khoản toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => fetchUsers()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
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

      {/* Metric Stat Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Tổng nhân sự</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{total}</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Đang hoạt động</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-xl font-bold text-emerald-700">{activeCount}</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Đang bị khóa</span>
            <Lock className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-rose-600">{lockedCount}</div>
        </div>

        <div className="rounded-xl bg-white p-4 border border-slate-100 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-medium">Có mã cấp chưa đổi</span>
            <KeyRound className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-indigo-600">{codePendingCount}</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TOOLBAR: TÌM KIẾM NHANH & BỘ LỌC                                        */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between rounded-xl bg-white p-4 border border-slate-100 shadow-2xs">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo họ tên, username, email, số điện thoại..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-9 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Bộ lọc vai trò & trạng thái */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="">Tất cả vai trò (7)</option>
            {Object.keys(ROLE_CONFIG).map((roleKey) => (
              <option key={roleKey} value={roleKey}>
                {ROLE_CONFIG[roleKey].label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs font-medium text-slate-700 focus:bg-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đang bị khóa</option>
          </select>
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
                <th className="px-5 py-3.5 text-center">Trạng thái</th>
                <th className="px-5 py-3.5 text-center">Thao tác</th>
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
                  const roleConfig = ROLE_CONFIG[u.role] || {
                    label: u.role,
                    bgClass: "bg-slate-100",
                    textClass: "text-slate-700",
                    ringClass: "ring-slate-700/10",
                  };

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

                      {/* Vai trò */}
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${roleConfig.bgClass} ${roleConfig.textClass} ${roleConfig.ringClass}`}
                        >
                          {roleConfig.label}
                        </span>
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
                      <td className="px-5 py-3.5 text-center">
                        {u.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span>Hoạt động</span>
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20 cursor-help"
                            title={u.lockReason || "Tài khoản bị khóa bởi Quản trị viên"}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            <span>Bị khóa</span>
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

        {/* Phân trang */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 text-xs text-slate-500">
          <div>
            Trang <strong>{page}</strong> / <strong>{totalPages}</strong> (Tổng cộng{" "}
            <strong>{total}</strong> nhân sự)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Trước</span>
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
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
                    required
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    placeholder="VD: Nguyễn Văn An"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="VD: 0912345678"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
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
                    required
                    disabled={Boolean(editingUser)}
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="VD: sales_an"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs disabled:bg-slate-100 disabled:text-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email công việc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="VD: an.nguyen@loha.vn"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              {/* Vai trò hệ thống & Kho trực thuộc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vai trò hệ thống <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    {Object.keys(ROLE_CONFIG).map((roleKey) => (
                      <option key={roleKey} value={roleKey}>
                        {ROLE_CONFIG[roleKey].label} ({roleKey})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kho hoặc Địa bàn phụ trách
                  </label>
                  <select
                    value={formData.assignedWarehouse}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        assignedWarehouse: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  >
                    <option value="">Chưa phân công địa bàn / kho</option>
                    {WAREHOUSE_OPTIONS.map((wh) => (
                      <option key={wh} value={wh}>
                        {wh}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* =============================================================== */}
              {/* KHU VỰC CẤP MÃ ĐỔI MẬT KHẨU CHO NHÂN SỰ (Nếu đang chỉnh sửa)    */}
              {/* =============================================================== */}
              {editingUser ? (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-4 w-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-950">
                        Khôi phục & Cấp mã đổi mật khẩu cho nhân sự
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={generatingCode}
                      onClick={() => handleGenerateResetCode(editingUser.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-indigo-700 transition-colors shadow-2xs disabled:opacity-50"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>{editingUser.resetCode ? "Cấp lại mã khác" : "Cấp mã đổi mật khẩu"}</span>
                    </button>
                  </div>

                  {editingUser.resetCode ? (
                    <div className="rounded-lg bg-white p-3 border border-indigo-200 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Mã cấp đổi mật khẩu hiện tại (Chưa sử dụng):
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
                  ) : (
                    <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                      Khi nhân sự quên hoặc không thể đăng nhập, bấm nút <strong>"Cấp mã đổi mật khẩu"</strong> ở trên để tạo một mã xác thực (VD: LH-829401). Gửi mã này cho nhân sự để họ tự nhập tại màn hình đăng nhập. Mã sẽ tiếp tục hiển thị tại đây cho đến khi nhân sự đổi mật khẩu thành công.
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
