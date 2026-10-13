import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  Search,
  Package,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
} from "lucide-react";
import { showToast } from "../components/toast";
import { Pagination } from "../components/pagination";
import { goodsReceiptService } from "../services/goods-receipt.service";
import type { GoodsReceipt, GoodsReceiptStatus } from "../types/inventory-receipt";

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const err = error as {
      response?: { data?: { message?: string | string[] } };
      message?: string;
    };
    if (err.response?.data?.message) {
      if (Array.isArray(err.response.data.message)) {
        return err.response.data.message.join(", ");
      }
      return String(err.response.data.message);
    }
    if (err.message) return err.message;
  }
  return fallback;
};

export const InventoryReceiptsPage: React.FC = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [searchInput, setSearchInput] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<GoodsReceiptStatus | "ALL">("ALL");

  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [receiptToConfirm, setReceiptToConfirm] = useState<GoodsReceipt | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [receiptToDelete, setReceiptToDelete] = useState<GoodsReceipt | null>(null);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await goodsReceiptService.getReceipts({
        page,
        limit,
        search: searchTerm || undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
      });
      setReceipts(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (error: unknown) {
      showToast("error", getErrorMessage(error, "Lỗi khi tải danh sách phiếu nhập"));
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, selectedStatus]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1);
  };

  const handleConfirmReceipt = async () => {
    if (!receiptToConfirm) return;
    try {
      setActionLoading(true);
      await goodsReceiptService.confirmReceipt(receiptToConfirm.id);
      showToast("success", "Xác nhận nhập kho thành công! Đã cộng tồn kho.");
      setConfirmModalOpen(false);
      await fetchReceipts();
    } catch (error: unknown) {
      showToast("error", getErrorMessage(error, "Lỗi khi xác nhận phiếu nhập"));
    } finally {
      setActionLoading(false);
      setConfirmModalOpen(false);
    }
  };

  const handleDeleteReceipt = async () => {
    if (!receiptToDelete) return;
    try {
      setActionLoading(true);
      await goodsReceiptService.deleteReceipt(receiptToDelete.id);
      showToast("success", "Xóa phiếu nhập kho thành công");
      setDeleteModalOpen(false);
      await fetchReceipts();
    } catch (error: unknown) {
      showToast("error", getErrorMessage(error, "Lỗi khi xóa phiếu nhập"));
    } finally {
      setActionLoading(false);
      setDeleteModalOpen(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-500" />
            Nhập kho từ Nhà cung cấp
          </h1>
          <p className="text-slate-500 mt-1">
            Quản lý các phiếu nhập hàng hóa từ nhà cung cấp (Draft / Confirmed)
          </p>
        </div>
        <button
          onClick={() => navigate("/inventory/receipts/create")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm px-4 py-2.5 inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Tạo phiếu nhập mới
        </button>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="bg-white rounded-xl shadow-soft border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <form onSubmit={handleSearch} className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, số chứng từ..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-sm"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as GoodsReceiptStatus | "ALL");
                setPage(1);
              }}
              className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-brand-500 min-w-[160px] text-sm"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="CONFIRMED">Đã xác nhận</option>
            </select>
            <button
              onClick={fetchReceipts}
              className="p-2 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-colors border border-transparent hover:border-brand-200 cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Bảng danh sách phiếu nhập kho */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <th className="p-4 text-left">Mã phiếu</th>
                <th className="p-4 text-left">Ngày nhập</th>
                <th className="p-4 text-left">Kho / NCC</th>
                <th className="p-4 text-left">Chứng từ gốc</th>
                <th className="p-4 text-right font-mono">Tổng tiền</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-500" />
                    Đang tải danh sách phiếu nhập...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Không tìm thấy phiếu nhập nào phù hợp
                  </td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="p-4 text-left">
                      <div className="font-semibold text-brand-700">{r.code}</div>
                    </td>
                    <td className="p-4 text-left text-slate-600">
                      {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="p-4 text-left">
                      <div className="font-medium text-slate-800">{r.warehouseName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{r.supplierName || "---"}</div>
                    </td>
                    <td className="p-4 text-left">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <FileText className="w-3.5 h-3.5 text-slate-400" />
                        <span>{r.referenceDocument || "---"}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono font-medium text-slate-800 whitespace-nowrap">
                      {Number(r.totalCost).toLocaleString("vi-VN")} đ
                    </td>
                    <td className="p-4 text-center">
                      {r.status === "CONFIRMED" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đã xác nhận
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Bản nháp
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {r.status === "DRAFT" && (
                          <>
                            <button
                              onClick={() => {
                                setReceiptToConfirm(r);
                                setConfirmModalOpen(true);
                              }}
                              className="w-8 h-8 flex items-center justify-center text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                              title="Xác nhận & Nhập kho"
                            >
                              <CheckCircle2 className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => {
                                setReceiptToDelete(r);
                                setDeleteModalOpen(true);
                              }}
                              className="w-8 h-8 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa phiếu nháp"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </>
                        )}
                        {r.status === "CONFIRMED" && (
                          <span
                            className="text-xs text-slate-400 italic px-2 py-1 bg-slate-50 rounded-lg border border-slate-200"
                            title="Phiếu đã xác nhận được khóa không thể sửa/xóa"
                          >
                            Đã khóa
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          pageSize={limit}
          itemLabel="phiếu nhập"
          onPageChange={setPage}
          onPageSizeChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      </div>

      {/* Modal Xóa phiếu nháp - Render có điều kiện, loại bỏ triệt để lỗi kẹt backdrop */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150"
            onClick={() => !actionLoading && setDeleteModalOpen(false)}
          />

          {/* Dialog Box */}
          <div className="relative w-full max-w-md rounded-xl bg-white border border-slate-200/80 shadow-xl overflow-hidden z-10 p-6 space-y-4 transition-all duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-rose-100 text-rose-600">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  Xóa phiếu nhập kho
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Bạn có chắc chắn muốn xóa phiếu nhập <strong>{receiptToDelete?.code}</strong>? Không thể khôi phục sau khi xóa.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteReceipt}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang xóa...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Xác nhận xóa
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận nhập kho - Render có điều kiện, loại bỏ triệt để lỗi kẹt backdrop */}
      {confirmModalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150"
            onClick={() => !actionLoading && setConfirmModalOpen(false)}
          />

          {/* Dialog Box */}
          <div className="relative w-full max-w-md rounded-xl bg-white border border-slate-200/80 shadow-xl overflow-hidden z-10 p-6 space-y-4 transition-all duration-150">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  Xác nhận phiếu nhập {receiptToConfirm?.code}?
                </h3>
                <div className="mt-2 text-sm text-slate-600 leading-relaxed space-y-2">
                  <p className="font-medium text-slate-800">
                    Phiếu sau khi xác nhận sẽ chính thức <strong>cộng tồn kho thực tế</strong> và <strong>không thể chỉnh sửa hoặc xóa</strong>.
                  </p>
                  <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    Bạn có chắc chắn muốn xác nhận phiếu nhập này không?
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmReceipt}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Đồng ý xác nhận
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
