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
  CheckCircle2
} from "lucide-react";
import { showToast } from "../components/toast";
import { ModalLayout } from "../components/modal-layout";
import { Pagination } from "../components/pagination";
import { inventoryReceiptsService } from "../services/inventory-receipts.service";
import type { GoodsReceipt, GoodsReceiptStatus } from "../types/inventory-receipt";
import { ConfirmDeleteModal } from "../components/confirm-delete-modal";

export const InventoryReceiptsPage: React.FC = () => {
  const navigate = useNavigate();
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<GoodsReceiptStatus | "ALL">("ALL");

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [receiptToConfirm, setReceiptToConfirm] = useState<GoodsReceipt | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<GoodsReceipt | null>(null);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inventoryReceiptsService.findAll({
        page,
        limit,
        search: searchTerm || undefined,
        status: selectedStatus !== "ALL" ? selectedStatus : undefined,
      });
      setReceipts(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (error: any) {
      showToast("error", error.response?.data?.message || "Lỗi khi tải danh sách phiếu nhập");
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
      await inventoryReceiptsService.confirm(receiptToConfirm.id);
      showToast("success", "Xác nhận phiếu nhập kho thành công");
      setConfirmModalOpen(false);
      fetchReceipts();
    } catch (error: any) {
      showToast("error", error.response?.data?.message || "Lỗi khi xác nhận");
    }
  };

  const handleDeleteReceipt = async () => {
    if (!receiptToDelete) return;
    try {
      await inventoryReceiptsService.remove(receiptToDelete.id);
      showToast("success", "Xóa phiếu nhập thành công");
      setDeleteModalOpen(false);
      fetchReceipts();
    } catch (error: any) {
      showToast("error", error.response?.data?.message || "Lỗi khi xóa");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-brand-500" />
            Nhập kho từ Nhà cung cấp
          </h1>
          <p className="text-slate-500 mt-1">Quản lý các phiếu nhập kho hàng hóa</p>
        </div>
        <button
          onClick={() => navigate("/inventory/receipts/create")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm px-4 py-2.5 inline-flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Tạo phiếu nhập mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-soft border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <form onSubmit={handleSearch} className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, số chứng từ..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as GoodsReceiptStatus | "ALL");
                setPage(1);
              }}
              className="px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 min-w-[160px]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Nháp</option>
              <option value="CONFIRMED">Đã xác nhận</option>
            </select>
            <button
              onClick={fetchReceipts}
              className="p-2.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors border border-transparent hover:border-brand-200"
              title="Làm mới"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 font-semibold text-slate-600">Mã phiếu</th>
                <th className="p-4 font-semibold text-slate-600">Ngày nhập</th>
                <th className="p-4 font-semibold text-slate-600">Kho / NCC</th>
                <th className="p-4 font-semibold text-slate-600">Chứng từ gốc</th>
                <th className="p-4 font-semibold text-slate-600">Tổng tiền</th>
                <th className="p-4 font-semibold text-slate-600">Trạng thái</th>
                <th className="p-4 font-semibold text-slate-600 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">Đang tải dữ liệu...</td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">Không tìm thấy phiếu nhập nào</td>
                </tr>
              ) : (
                receipts.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-semibold text-brand-700">{r.code}</div>
                    </td>
                    <td className="p-4 text-slate-600">
                      {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{r.warehouseName}</div>
                      <div className="text-sm text-slate-500">{r.supplierName || '---'}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-700">
                        <FileText className="w-4 h-4 text-slate-400" />
                        {r.referenceDocument || '---'}
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-800">
                      {Number(r.totalCost).toLocaleString("vi-VN")} đ
                    </td>
                    <td className="p-4">
                      {r.status === 'CONFIRMED' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đã xác nhận
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Bản nháp
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={() => {
                                setReceiptToConfirm(r);
                                setConfirmModalOpen(true);
                              }}
                              className="w-9 h-9 flex items-center justify-center text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                              title="Xác nhận & Nhập kho"
                            >
                              <CheckCircle2 className="w-4.5 h-4.5" />
                            </button>
                            <button
                              onClick={() => {
                                setReceiptToDelete(r);
                                setDeleteModalOpen(true);
                              }}
                              className="w-9 h-9 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Xóa phiếu nháp"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </>
                        )}
                        {r.status === 'CONFIRMED' && (
                          <button
                            className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>
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

      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteReceipt}
        title="Xóa phiếu nhập"
        message={`Bạn có chắc chắn muốn xóa phiếu nhập "${receiptToDelete?.code}"? Không thể khôi phục sau khi xóa.`}
      />

      <ModalLayout
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Xác nhận phiếu nhập kho"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            Xác nhận phiếu nhập {receiptToConfirm?.code}?
          </h3>
          <p className="text-slate-600 text-sm">
            Hàng hóa sẽ được <strong>cộng trực tiếp vào tồn kho</strong>. Bạn sẽ <strong>không thể sửa hoặc xóa</strong> phiếu này sau khi đã xác nhận.
          </p>
          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => setConfirmModalOpen(false)}
              className="btn-secondary"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleConfirmReceipt}
              className="btn-primary"
            >
              Đồng ý xác nhận
            </button>
          </div>
        </div>
      </ModalLayout>
    </div>
  );
};
