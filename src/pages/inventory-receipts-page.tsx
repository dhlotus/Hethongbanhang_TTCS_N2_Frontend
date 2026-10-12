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

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleViewDetail = async (receipt: GoodsReceipt) => {
    setSelectedReceipt(receipt);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const fullData = await inventoryReceiptsService.findOne(receipt.id);
      setSelectedReceipt(fullData);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Lỗi khi tải chi tiết phiếu nhập");
    } finally {
      setDetailLoading(false);
    }
  };

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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Lỗi khi tải danh sách phiếu nhập");
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
      fetchReceipts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } }; message?: string };
      const rawMsg = err.response?.data?.message || err.message || "Lỗi khi xác nhận";
      const msg = Array.isArray(rawMsg) ? rawMsg.join(", ") : rawMsg;
      showToast("error", msg);
    } finally {
      setConfirmModalOpen(false);
      setReceiptToConfirm(null);
    }
  };

  const handleDeleteReceipt = async () => {
    if (!receiptToDelete) return;
    try {
      await inventoryReceiptsService.remove(receiptToDelete.id);
      showToast("success", "Xóa phiếu nhập thành công");
      fetchReceipts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } }; message?: string };
      const rawMsg = err.response?.data?.message || err.message || "Lỗi khi xóa";
      const msg = Array.isArray(rawMsg) ? rawMsg.join(", ") : rawMsg;
      showToast("error", msg);
    } finally {
      setDeleteModalOpen(false);
      setReceiptToDelete(null);
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
                      <button
                        type="button"
                        onClick={() => handleViewDetail(r)}
                        className="font-semibold text-brand-700 hover:text-brand-800 hover:underline text-left cursor-pointer"
                        title="Xem chi tiết"
                      >
                        {r.code}
                      </button>
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
                        <button
                          type="button"
                          onClick={() => handleViewDetail(r)}
                          className="w-9 h-9 flex items-center justify-center text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </button>
                        {r.status === 'DRAFT' && (
                          <>
                            <button
                              type="button"
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
                              type="button"
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

      {deleteModalOpen && (
        <ConfirmDeleteModal
          isOpen={deleteModalOpen}
          onCancel={() => {
            setDeleteModalOpen(false);
            setReceiptToDelete(null);
          }}
          onConfirm={handleDeleteReceipt}
          title="Xóa phiếu nhập"
          message={`Bạn có chắc chắn muốn xóa phiếu nhập "${receiptToDelete?.code}"? Không thể khôi phục sau khi xóa.`}
        />
      )}

      {confirmModalOpen && (
        <ModalLayout
          isOpen={confirmModalOpen}
          onClose={() => {
            setConfirmModalOpen(false);
            setReceiptToConfirm(null);
          }}
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
                onClick={() => {
                  setConfirmModalOpen(false);
                  setReceiptToConfirm(null);
                }}
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
      )}

      {/* Modal Xem chi tiết phiếu nhập */}
      {detailModalOpen && (
        <ModalLayout
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedReceipt(null);
          }}
        title={`Chi tiết phiếu nhập: ${selectedReceipt?.code || ''}`}
        subtitle={selectedReceipt?.createdAt ? `Ngày lập: ${new Date(selectedReceipt.createdAt).toLocaleDateString('vi-VN')}` : undefined}
        maxWidth="max-w-4xl"
        badge={
          selectedReceipt?.status === 'CONFIRMED' ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Đã xác nhận
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Bản nháp
            </span>
          )
        }
        footer={
          <button
            type="button"
            onClick={() => setDetailModalOpen(false)}
            className="btn-secondary"
          >
            Đóng
          </button>
        }
      >
        {detailLoading ? (
          <div className="py-12 text-center text-slate-500">Đang tải chi tiết...</div>
        ) : selectedReceipt ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
              <div>
                <span className="text-slate-500 block text-xs">Kho nhập hàng:</span>
                <span className="font-medium text-slate-800">{selectedReceipt.warehouseName || 'Kho Tổng Miền Nam - LOHA WH01'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Nhà cung cấp:</span>
                <span className="font-medium text-slate-800">{selectedReceipt.supplierName || '---'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Số chứng từ gốc:</span>
                <span className="font-medium text-slate-800">{selectedReceipt.referenceDocument || '---'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Ngày nhập:</span>
                <span className="font-medium text-slate-800">
                  {selectedReceipt.receivedAt ? new Date(selectedReceipt.receivedAt).toLocaleDateString('vi-VN') : '---'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Người lập:</span>
                <span className="font-medium text-slate-800">{selectedReceipt.createdByName || '---'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Tổng tiền:</span>
                <span className="font-bold text-brand-600 text-base">{Number(selectedReceipt.totalCost).toLocaleString('vi-VN')} đ</span>
              </div>
              {selectedReceipt.notes && (
                <div className="sm:col-span-2 md:col-span-3">
                  <span className="text-slate-500 block text-xs">Ghi chú:</span>
                  <span className="text-slate-700">{selectedReceipt.notes}</span>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-slate-800 mb-2">Danh sách mặt hàng</h4>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3 text-center w-10">STT</th>
                      <th className="p-3">Sản phẩm</th>
                      <th className="p-3 text-center">ĐVT</th>
                      <th className="p-3 text-right">Số lượng</th>
                      <th className="p-3 text-right">Đơn giá</th>
                      <th className="p-3 text-right">Thành tiền</th>
                      <th className="p-3">Số lô / HSD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(!selectedReceipt.items || selectedReceipt.items.length === 0) ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-slate-400">Không có thông tin chi tiết mặt hàng</td>
                      </tr>
                    ) : (
                      selectedReceipt.items.map((item, idx) => (
                        <tr key={item.id || idx} className="hover:bg-slate-50/50">
                          <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-medium text-slate-800">{item.productName || item.productId}</div>
                            {item.productCode && <div className="text-slate-400 text-[11px] font-mono">{item.productCode}</div>}
                          </td>
                          <td className="p-3 text-center">{item.unitName || '---'}</td>
                          <td className="p-3 text-right font-mono font-medium">
                            {item.packageQuantity}
                            {item.conversionFactor > 1 && (
                              <div className="text-[11px] text-slate-400 font-normal">
                                (= {item.baseQuantity} đvt cơ sở)
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono">{Number(item.unitCost).toLocaleString('vi-VN')} đ</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-800">{Number(item.totalCost).toLocaleString('vi-VN')} đ</td>
                          <td className="p-3">
                            {item.batchNumber ? (
                              <div>
                                <span className="font-medium text-slate-700 font-mono">{item.batchNumber}</span>
                                {item.expiryDate && (
                                  <div className="text-slate-400 text-[11px]">HSD: {new Date(item.expiryDate).toLocaleDateString('vi-VN')}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400">---</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </ModalLayout>
      )}
    </div>
  );
};
