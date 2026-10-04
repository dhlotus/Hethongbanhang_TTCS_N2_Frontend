import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Power,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Phone,
  Mail,
  MapPin,
  FileText,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { Button } from "../components/button";
import { Toast, type ToastType } from "../components/toast";
import { SupplierFormModal } from "../components/supplier-form-modal";
import { suppliersService } from "../services/suppliers.service";
import type {
  Supplier,
  SupplierStatus,
  CreateSupplierPayload,
} from "../types/supplier";
import { getStoredUser } from "../utils/navigation";

export const SuppliersPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // Search & Filter
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<SupplierStatus | "ALL">("ALL");

  // Toast
  const [toast, setToast] = useState<{
    type: ToastType;
    title?: string;
    message: string;
  } | null>(null);

  // Modals
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // User Permissions
  const user = getStoredUser();
  const userRoles = user?.roles || [];
  const canManageSuppliers =
    userRoles.includes("ADMIN") ||
    userRoles.includes("WAREHOUSE_MANAGER") ||
    userRoles.includes("WAREHOUSE_KEEPER") ||
    userRoles.includes("WAREHOUSE") ||
    userRoles.includes("WH_MANAGER") ||
    userRoles.includes("SALES_MANAGER");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch Suppliers
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await suppliersService.getSuppliers({
        page,
        limit,
        search: searchTerm,
        status: selectedStatus,
      });
      setSuppliers(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setToast({
        type: "error",
        title: "Lỗi tải dữ liệu",
        message: "Không thể kết nối đến máy chủ. Đang sử dụng dữ liệu offline.",
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, selectedStatus]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Metrics
  const metrics = useMemo(() => {
    const active = suppliers.filter((s) => s.status === "ACTIVE").length;
    const inactive = suppliers.filter((s) => s.status === "INACTIVE").length;
    const withReceipts = suppliers.filter(
      (s) => s.hasReceipts || s.has_receipts
    ).length;
    return {
      total,
      active,
      inactive,
      withReceipts,
    };
  }, [suppliers, total]);

  // Create / Update Supplier
  const handleFormSubmit = async (payload: CreateSupplierPayload) => {
    try {
      if (editingSupplier) {
        await suppliersService.updateSupplier(editingSupplier.id, payload);
        setToast({
          type: "success",
          title: "Cập nhật thành công",
          message: `Đã cập nhật thông tin nhà cung cấp ${payload.name}`,
        });
      } else {
        await suppliersService.createSupplier(payload);
        setToast({
          type: "success",
          title: "Thêm mới thành công",
          message: `Đã thêm mới nhà cung cấp ${payload.name}`,
        });
      }
      setEditingSupplier(null);
      fetchSuppliers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
      setToast({
        type: "error",
        title: "Thao tác thất bại",
        message: msg,
      });
      throw err;
    }
  };

  // Toggle Status
  const handleToggleStatus = async (supplier: Supplier) => {
    const newStatus: SupplierStatus =
      supplier.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await suppliersService.toggleSupplierStatus(supplier.id, newStatus);
      setToast({
        type: "success",
        title: "Đổi trạng thái",
        message: `Đã chuyển đối tác '${supplier.name}' sang ${
          newStatus === "ACTIVE" ? "Đang giao dịch" : "Ngừng giao dịch"
        }`,
      });
      fetchSuppliers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
      setToast({
        type: "error",
        title: "Lỗi chuyển trạng thái",
        message: msg,
      });
    }
  };

  // Delete flow
  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!supplierToDelete) return;

    setIsDeleting(true);
    try {
      const res = await suppliersService.deleteSupplier(supplierToDelete.id);
      setToast({
        type: "success",
        title: "Xóa thành công",
        message:
          res.message ||
          `Đã xóa nhà cung cấp ${supplierToDelete.name} thành công.`,
      });
      setDeleteModalOpen(false);
      setSupplierToDelete(null);
      fetchSuppliers();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Không thể xóa nhà cung cấp do vi phạm ràng buộc dữ liệu";
      setToast({
        type: "error",
        title: "Chặn thao tác xóa",
        message: msg,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Convert to Inactive instead of delete when constrained
  const handleSwitchToInactive = async () => {
    if (!supplierToDelete) return;
    try {
      await suppliersService.toggleSupplierStatus(
        supplierToDelete.id,
        "INACTIVE"
      );
      setToast({
        type: "success",
        title: "Đã chuyển sang Inactive",
        message: `Nhà cung cấp '${supplierToDelete.name}' đã được chuyển sang trạng thái Ngừng hoạt động.`,
      });
      setDeleteModalOpen(false);
      setSupplierToDelete(null);
      fetchSuppliers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
      setToast({
        type: "error",
        title: "Thao tác thất bại",
        message: msg,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      {/* 1. Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50 shadow-2xs">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">
              Quản lý Nhà cung cấp (Suppliers)
            </h1>
            <p className="text-xs text-slate-500">
              Danh mục đối tác cung ứng hàng hóa, quản lý hợp đồng công nợ & phiếu nhập kho
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchSuppliers}
            disabled={loading}
            className="px-3 py-2 text-xs font-semibold rounded-xl cursor-pointer"
          >
            <RefreshCw
              className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin text-blue-500" : ""}`}
            />
            Làm mới
          </Button>

          {canManageSuppliers && (
            <Button
              variant="primary"
              onClick={() => {
                setEditingSupplier(null);
                setFormModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl cursor-pointer shadow-xs hover:shadow-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Thêm nhà cung cấp
            </Button>
          )}
        </div>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tổng đối tác</p>
            <p className="text-lg font-bold text-slate-800">{total}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Đang giao dịch</p>
            <p className="text-lg font-bold text-emerald-600">{metrics.active}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600">
            <Power className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Ngừng hoạt động</p>
            <p className="text-lg font-bold text-slate-600">{metrics.inactive}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Đã nhập kho</p>
            <p className="text-lg font-bold text-indigo-600">{metrics.withReceipts}</p>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo Mã, Tên, MST, SĐT, Email..."
            className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as SupplierStatus | "ALL");
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all bg-white font-medium text-slate-700"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang giao dịch (ACTIVE)</option>
            <option value="INACTIVE">Ngừng hoạt động (INACTIVE)</option>
          </select>
        </div>
      </div>

      {/* 4. Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Mã NCC</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Tên nhà cung cấp / Doanh nghiệp</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Người liên hệ & SĐT</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Địa chỉ</th>
                <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Điều khoản TT</th>
                <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Phiếu nhập kho</th>
                <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Trạng thái</th>
                {canManageSuppliers && (
                  <th className="px-4 py-3 font-semibold text-center whitespace-nowrap w-24">
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={canManageSuppliers ? 8 : 7} className="py-14 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span className="font-medium text-xs">Đang tải danh sách nhà cung cấp...</span>
                  </td>
                </tr>
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={canManageSuppliers ? 8 : 7} className="py-14 text-center text-slate-400">
                    <Building2 className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600 text-sm">Không tìm thấy nhà cung cấp nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh lại bộ lọc trạng thái.
                    </p>
                  </td>
                </tr>
              ) : (
                suppliers.map((supplier) => {
                  const hasReceipts = Boolean(
                    supplier.hasReceipts ?? supplier.has_receipts
                  );
                  const isActive = supplier.status === "ACTIVE";

                  return (
                    <tr
                      key={supplier.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Mã NCC */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold text-xs border border-blue-100/60">
                          {supplier.code}
                        </span>
                      </td>

                      {/* Tên NCC & MST */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-800">{supplier.name}</div>
                        {(supplier.taxCode || supplier.tax_code) && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                            <FileText className="h-3 w-3" />
                            <span>MST: {supplier.taxCode || supplier.tax_code}</span>
                          </div>
                        )}
                      </td>

                      {/* Liên hệ */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-slate-700">
                          {supplier.contactName || supplier.contact_name || "—"}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                          {supplier.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {supplier.phone}
                            </span>
                          )}
                          {supplier.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-slate-400" />
                              {supplier.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Địa chỉ */}
                      <td className="px-4 py-3 max-w-xs truncate text-slate-600">
                        {supplier.address ? (
                          <div className="flex items-center gap-1" title={supplier.address}>
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{supplier.address}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Điều khoản TT */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold">
                          {supplier.paymentTerms || supplier.payment_terms || "NET_30"}
                        </span>
                      </td>

                      {/* Ràng buộc Phiếu nhập */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {hasReceipts ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100/60"
                            title="Nhà cung cấp đã có giao dịch nhập kho trong hệ thống (khóa xóa vật lý)"
                          >
                            <Receipt className="h-3 w-3 text-indigo-500" />
                            Đã có phiếu nhập
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 text-[11px] font-medium border border-slate-100">
                            Chưa phát sinh
                          </span>
                        )}
                      </td>

                      {/* Trạng thái & Toggle */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                                : "bg-slate-100 text-slate-600 border border-slate-200/50"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isActive ? "bg-emerald-500" : "bg-slate-400"
                              }`}
                            />
                            {isActive ? "Đang giao dịch" : "Ngừng giao dịch"}
                          </span>

                          {canManageSuppliers && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(supplier)}
                              title={
                                isActive
                                  ? "Chuyển sang Ngừng giao dịch"
                                  : "Kích hoạt lại giao dịch"
                              }
                              className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                isActive
                                  ? "text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Thao tác */}
                      {canManageSuppliers && (
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSupplier(supplier);
                                setFormModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              title="Chỉnh sửa thông tin"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteClick(supplier)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa nhà cung cấp"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
            <span>Hiển thị mỗi trang:</span>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>Tổng cộng: {total} nhà cung cấp</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700">
              Trang {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Modal Thêm / Sửa Nhà cung cấp */}
      <SupplierFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingSupplier(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingSupplier}
      />

      {/* 6. Modal Xác nhận xóa hoặc Cảnh báo ràng buộc */}
      {deleteModalOpen && supplierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {Boolean(
              supplierToDelete.hasReceipts ?? supplierToDelete.has_receipts
            ) ? (
              // Case A: Đã có phiếu nhập -> KHÔNG CHO PHÉP XÓA VẬT LÝ, gợi ý chuyển sang Inactive
              <div>
                <div className="p-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-2xs">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Không thể xóa nhà cung cấp này!
                  </h3>
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-left text-xs text-amber-800 space-y-1.5">
                    <p className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                      Vi phạm ràng buộc dữ liệu (Import Receipt Constraint):
                    </p>
                    <p>
                      Nhà cung cấp <strong>{supplierToDelete.name}</strong> ({supplierToDelete.code}) đã từng phát sinh chứng từ trong <strong>Phiếu nhập kho</strong>.
                    </p>
                    <p className="text-[11px] text-amber-700">
                      Quy tắc hệ thống ngăn chặn xóa vĩnh viễn nhằm đảm bảo tính toàn vẹn của thẻ kho và lịch sử giao dịch kế toán.
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Bạn có muốn chuyển trạng thái của đối tác sang <strong>Ngừng hoạt động (Inactive)</strong> để không thể chọn khi lập phiếu nhập mới?
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setSupplierToDelete(null);
                    }}
                    className="py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Đóng lại
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleSwitchToInactive}
                    className="py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer bg-amber-600 hover:bg-amber-700 border-amber-600 text-white"
                  >
                    Chuyển sang Inactive
                  </Button>
                </div>
              </div>
            ) : (
              // Case B: Chưa có phiếu nhập -> Cho phép xóa
              <div>
                <div className="p-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Xác nhận xóa nhà cung cấp?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bạn có chắc chắn muốn xóa đối tác <strong>{supplierToDelete.name}</strong> ({supplierToDelete.code}) không? Thao tác này sẽ gỡ bỏ hoàn toàn khỏi danh mục.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setSupplierToDelete(null);
                    }}
                    disabled={isDeleting}
                    className="py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Hủy bỏ
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleConfirmDelete}
                    isLoading={isDeleting}
                    loadingText="Đang xóa..."
                    className="py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer bg-rose-600 hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500/25"
                  >
                    Xác nhận xóa
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
