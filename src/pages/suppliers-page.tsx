import React, { useEffect, useState, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  Power,
  Trash2,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Receipt,
  AlertCircle,
  ShieldAlert,
  Eye,
} from "lucide-react";
import { Toast, type ToastType } from "../components/toast";
import { SuppliersTableSkeleton } from "../components/skeletons";
import { SupplierFormModal } from "../components/supplier-form-modal";
import { SupplierDetailModal } from "../components/supplier-detail-modal";
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

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState<Supplier | null>(null);
  const [returnToDetailSupplier, setReturnToDetailSupplier] = useState<Supplier | null>(null);

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
      let updatedSupplier: Supplier | null = null;
      if (editingSupplier) {
        updatedSupplier = await suppliersService.updateSupplier(editingSupplier.id, payload);
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

      // Nếu mở từ popup chi tiết, chuẩn bị dữ liệu mới nhất để khi modal đóng thì hiển thị lại popup chi tiết
      if (returnToDetailSupplier) {
        const fresh: Supplier = updatedSupplier || {
          ...returnToDetailSupplier,
          ...payload,
          taxCode: payload.taxCode,
          contactName: payload.contactName,
          paymentTerms: payload.paymentTerms,
        };
        setReturnToDetailSupplier(fresh);
      }
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

  const handleViewDetail = (supplier: Supplier) => {
    setSelectedSupplierForDetail(supplier);
    setDetailModalOpen(true);
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

      {/* 1. Stat Cards */}
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

      {/* 2. Search & Actions Bar - Gom các nút thao tác xuống chung thanh tìm kiếm */}
      <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Vùng tìm kiếm */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo Mã, Tên, MST, SĐT, Email..."
            className="w-full pl-9.5 pr-8 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-slate-400"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Bộ lọc trạng thái & Các nút thao tác (Làm mới, Thêm nhà cung cấp) */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as SupplierStatus | "ALL");
              setPage(1);
            }}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all bg-white font-medium text-slate-700 cursor-pointer shadow-2xs"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang giao dịch (ACTIVE)</option>
            <option value="INACTIVE">Ngừng hoạt động (INACTIVE)</option>
          </select>

          <button
            type="button"
            onClick={fetchSuppliers}
            disabled={loading}
            title="Làm mới danh sách"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 text-slate-500 ${loading ? "animate-spin text-blue-500" : ""}`}
            />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {canManageSuppliers && (
            <button
              type="button"
              onClick={() => {
                setEditingSupplier(null);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/20 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Thêm nhà cung cấp</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Table - Responsive & Tối ưu hiển thị */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap w-28">Mã NCC</th>
                <th className="px-4 py-3.5 font-semibold">Tên nhà cung cấp / Doanh nghiệp</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap">Người đại diện</th>
                <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Phiếu nhập kho</th>
                <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap">Trạng thái</th>
                <th className="px-4 py-3.5 font-semibold text-center whitespace-nowrap w-24">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <SuppliersTableSkeleton count={6} />
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
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
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(supplier)}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-100/60 transition-colors cursor-pointer"
                          title="Bấm để xem chi tiết đối tác"
                        >
                          {supplier.code}
                        </button>
                      </td>

                      {/* Tên NCC (Chỉ tên, không kèm MST) */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(supplier)}
                          className="text-left font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer line-clamp-1"
                          title="Bấm để xem chi tiết đối tác"
                        >
                          {supplier.name}
                        </button>
                      </td>

                      {/* Người đại diện (Chỉ tên, không kèm SĐT/Email) */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-slate-700 font-medium">
                          {supplier.contactName || supplier.contact_name || "—"}
                        </span>
                      </td>

                      {/* Ràng buộc Phiếu nhập */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
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

                      {/* Trạng thái & Nút Toggle */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
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
                                  ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                  : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              }`}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Thao tác (Xem chi tiết, Xóa - Cây bút sửa nằm trong modal chi tiết) */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewDetail(supplier)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Xem chi tiết nhà cung cấp"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>

                          {canManageSuppliers && (
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(supplier)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Xóa nhà cung cấp"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* 4. Modal Thêm / Sửa Nhà cung cấp */}
      <SupplierFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingSupplier(null);
          if (returnToDetailSupplier) {
            setSelectedSupplierForDetail(returnToDetailSupplier);
            setDetailModalOpen(true);
            setReturnToDetailSupplier(null);
          }
        }}
        onSubmit={handleFormSubmit}
        initialData={editingSupplier}
      />

      {/* 5. Modal Xem chi tiết Nhà cung cấp */}
      <SupplierDetailModal
        isOpen={detailModalOpen}
        supplier={selectedSupplierForDetail}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedSupplierForDetail(null);
        }}
        onEdit={(supplier) => {
          setReturnToDetailSupplier(supplier);
          setEditingSupplier(supplier);
          setDetailModalOpen(false);
          setFormModalOpen(true);
        }}
        canEdit={canManageSuppliers}
      />

      {/* 6. Modal Xác nhận xóa hoặc Cảnh báo ràng buộc */}
      {deleteModalOpen &&
        supplierToDelete &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-[2px] transition-all animate-modal-backdrop-in"
            onClick={() => {
              if (!isDeleting) {
                setDeleteModalOpen(false);
                setSupplierToDelete(null);
              }
            }}
          >
            <div
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-modal-in"
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
                    <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-left text-xs text-amber-800 space-y-1.5">
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
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteModalOpen(false);
                        setSupplierToDelete(null);
                      }}
                      className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    >
                      Đóng lại
                    </button>
                    <button
                      type="button"
                      onClick={handleSwitchToInactive}
                      className="py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs"
                    >
                      Chuyển sang Inactive
                    </button>
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
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteModalOpen(false);
                        setSupplierToDelete(null);
                      }}
                      disabled={isDeleting}
                      className="py-2 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      className="py-2 px-4 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
