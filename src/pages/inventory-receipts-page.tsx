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
  Lock,
  SlidersHorizontal,
  Building2,
  AlertCircle,
  X
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

  // Modal xác nhận nhập kho
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [receiptToConfirm, setReceiptToConfirm] = useState<GoodsReceipt | null>(null);

  // Modal xóa phiếu nháp
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [receiptToDelete, setReceiptToDelete] = useState<GoodsReceipt | null>(null);

  // Modal xem chi tiết phiếu nhập
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<GoodsReceipt | null>(null);

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
      showToast("success", `Xác nhận phiếu nhập kho ${receiptToConfirm.code} thành công! Tồn kho đã được cộng.`);
      setConfirmModalOpen(false);
      fetchReceipts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Lỗi khi xác nhận phiếu nhập");
    }
  };

  const handleDeleteReceipt = async () => {
    if (!receiptToDelete) return;
    try {
      await inventoryReceiptsService.remove(receiptToDelete.id);
      showToast("success", "Xóa phiếu nhập nháp thành công");
      setDeleteModalOpen(false);
      fetchReceipts();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Lỗi khi xóa phiếu");
    }
  };

  const handleOpenDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      setDetailModalOpen(true);
      const data = await inventoryReceiptsService.findOne(id);
      setSelectedReceipt(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Không thể tải chi tiết phiếu nhập");
      setDetailModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleNavigateToAdjustment = (receipt: GoodsReceipt) => {
    navigate(`/inventory/adjustments?referenceCode=${encodeURIComponent(receipt.code)}&warehouseId=${encodeURIComponent(receipt.warehouseId)}`);
  };

  return (
    <div className="w-full space-y-6">
      {/* Tiêu đề & Nút tạo mới */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#371cdb]" />
            Nhập kho từ Nhà cung cấp
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Ghi nhận hàng về đúng lô và số lượng ngay khi xe dỡ hàng tại kho (SN-178)
          </p>
        </div>
        <button
          onClick={() => navigate("/inventory/receipts/create")}
          className="bg-[#371cdb] hover:bg-[#2d14b8] text-white font-medium rounded-xl shadow-xs px-4 py-2.5 inline-flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Lập phiếu nhập mới
        </button>
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <form onSubmit={handleSearch} className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Tìm theo mã phiếu, số chứng từ, NCC..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#371cdb] focus:ring-2 focus:ring-[#371cdb]/20 text-sm transition-all"
            />
            <Search className="absolute left-3 top-2.5 text-slate-400 w-4.5 h-4.5" />
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value as GoodsReceiptStatus | "ALL");
                setPage(1);
              }}
              className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-[#371cdb] text-sm min-w-[160px]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Phiếu nháp</option>
              <option value="CONFIRMED">Đã xác nhận</option>
            </select>
            <button
              onClick={fetchReceipts}
              className="p-2 text-slate-500 hover:text-[#371cdb] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Làm mới danh sách"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bảng danh sách phiếu nhập */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs text-slate-600">
                <th className="p-4 font-semibold">Mã phiếu</th>
                <th className="p-4 font-semibold">Ngày nhập</th>
                <th className="p-4 font-semibold">Kho nhập / NCC</th>
                <th className="p-4 font-semibold">Chứng từ gốc</th>
                <th className="p-4 font-semibold">Tổng tiền</th>
                <th className="p-4 font-semibold">Trạng thái</th>
                <th className="p-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#371cdb] mx-auto mb-2" />
                    Đang tải danh sách phiếu nhập...
                  </td>
                </tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    Không tìm thấy phiếu nhập nào phù hợp.
                  </td>
                </tr>
              ) : (
                receipts.map((r) => {
                  const isConfirmed = r.status === 'CONFIRMED';
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors text-sm">
                      <td className="p-4">
                        <button
                          onClick={() => handleOpenDetail(r.id)}
                          className="font-semibold text-[#371cdb] hover:underline cursor-pointer font-mono"
                        >
                          {r.code}
                        </button>
                      </td>
                      <td className="p-4 text-slate-600 text-xs">
                        {r.receivedAt 
                          ? new Date(r.receivedAt).toLocaleDateString("vi-VN") 
                          : new Date(r.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-800 text-xs flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {r.warehouseName || 'Kho Tổng Miền Nam'}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {r.supplierName || '---'}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 text-slate-700 text-xs font-mono">
                          <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {r.referenceDocument || '---'}
                        </div>
                      </td>
                      <td className="p-4 font-mono font-medium text-slate-800">
                        {Number(r.totalCost).toLocaleString("vi-VN")} đ
                      </td>
                      <td className="p-4">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Lock className="w-3 h-3 text-emerald-600" />
                            Đã xác nhận
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Bản nháp
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Xem chi tiết */}
                          <button
                            onClick={() => handleOpenDetail(r.id)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết phiếu nhập"
                          >
                            <Eye className="w-4.5 h-4.5" />
                          </button>

                          {/* Phiếu nháp: Xác nhận & Xóa */}
                          {!isConfirmed && (
                            <>
                              <button
                                onClick={() => {
                                  setReceiptToConfirm(r);
                                  setConfirmModalOpen(true);
                                }}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Xác nhận & Ghi sổ tồn kho"
                              >
                                <CheckCircle2 className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setReceiptToDelete(r);
                                  setDeleteModalOpen(true);
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa phiếu nháp"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </button>
                            </>
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

      {/* Modal xác nhận xóa phiếu nháp */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteReceipt}
        title="Xóa phiếu nhập nháp"
        message={`Bạn có chắc chắn muốn xóa phiếu nhập "${receiptToDelete?.code}"? Phiếu nháp chưa ghi sổ và có thể xóa an toàn.`}
      />

      {/* Modal xác nhận ghi sổ nhập kho */}
      <ModalLayout
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Xác nhận phiếu nhập kho (SN-178)"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            Xác nhận phiếu nhập {receiptToConfirm?.code}?
          </h3>
          <p className="text-slate-600 text-sm">
            Sau khi xác nhận, toàn bộ hàng hóa sẽ được <strong>cộng trực tiếp vào tồn kho</strong> và <strong>ghi sổ thẻ kho</strong>.
          </p>
          <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 text-left">
            <strong>Lưu ý:</strong> Phiếu đã xác nhận <strong>không thể chỉnh sửa hoặc xóa</strong>. Mọi điều chỉnh sau này phải lập qua phiếu điều chỉnh.
          </div>
          <div className="flex justify-center gap-3 pt-3">
            <button
              onClick={() => setConfirmModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleConfirmReceipt}
              className="bg-[#371cdb] hover:bg-[#2d14b8] text-white rounded-xl px-5 py-2 text-sm font-semibold transition-colors shadow-xs cursor-pointer"
            >
              Đồng ý xác nhận
            </button>
          </div>
        </div>
      </ModalLayout>

      {/* Modal xem chi tiết phiếu nhập kho */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#eff2fe] text-[#371cdb] flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    Chi tiết phiếu nhập: {selectedReceipt?.code}
                    {selectedReceipt?.status === 'CONFIRMED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Lock className="w-3 h-3 text-emerald-600" /> Đã xác nhận (Đã ghi sổ)
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        Bản nháp
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Mã chứng từ lưu kho phân hệ Quản lý Kho bãi LOHA SALES
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung chi tiết */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {detailLoading ? (
                <div className="p-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#371cdb] mx-auto mb-2" />
                  Đang tải chi tiết phiếu...
                </div>
              ) : selectedReceipt ? (
                <>
                  {/* Băng thông báo theo trạng thái */}
                  {selectedReceipt.status === 'CONFIRMED' ? (
                    <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
                      <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Phiếu đã xác nhận:</strong> Không thể chỉnh sửa hoặc xóa. Để điều chỉnh số lượng tồn kho do thừa/thiếu, vui lòng lập <em>Phiếu điều chỉnh</em>.
                      </span>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center gap-2 text-xs text-amber-800">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Phiếu này hiện ở trạng thái <strong>Nháp</strong>. Hàng hóa chưa được cộng vào tồn kho thực tế.
                      </span>
                    </div>
                  )}

                  {/* Thông tin chung */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Kho nhập hàng:</span>
                      <strong className="text-slate-800">{selectedReceipt.warehouseName || 'Kho Tổng Miền Nam'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Nhà cung cấp:</span>
                      <strong className="text-slate-800">{selectedReceipt.supplierName || '---'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Số chứng từ gốc:</span>
                      <strong className="text-slate-800 font-mono">{selectedReceipt.referenceDocument || '---'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Ngày nhập kho:</span>
                      <strong className="text-slate-800">
                        {selectedReceipt.receivedAt 
                          ? new Date(selectedReceipt.receivedAt).toLocaleDateString("vi-VN") 
                          : new Date(selectedReceipt.createdAt).toLocaleDateString("vi-VN")}
                      </strong>
                    </div>
                  </div>

                  {/* Bảng chi tiết mặt hàng */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex justify-between items-center">
                      <span>Danh sách hàng hóa nhập kho ({selectedReceipt.items?.length || 0} SKU)</span>
                      <span className="text-[#371cdb]">
                        Tổng tiền: {Number(selectedReceipt.totalCost).toLocaleString("vi-VN")} đ
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-600">
                            <th className="p-2.5 w-10 text-center">STT</th>
                            <th className="p-2.5">Mã SKU / Tên SP</th>
                            <th className="p-2.5 text-center">ĐVT nhập</th>
                            <th className="p-2.5 text-right">SL kiện</th>
                            <th className="p-2.5 text-right">Quy đổi cơ sở</th>
                            <th className="p-2.5 text-right">Đơn giá</th>
                            <th className="p-2.5 text-right">Thành tiền</th>
                            <th className="p-2.5 min-w-[150px]">Lô / Hạn dùng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReceipt.items?.map((item, idx) => (
                            <tr key={item.id || idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                              <td className="p-2.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                              <td className="p-2.5">
                                <div className="font-semibold text-slate-800">{item.productName || item.productCode || item.productId}</div>
                                <div className="text-[11px] text-slate-500 font-mono">{item.productCode}</div>
                              </td>
                              <td className="p-2.5 text-center font-medium">
                                {item.unitName || item.unitId}
                                {Number(item.conversionFactor) > 1 && (
                                  <span className="text-[10px] text-slate-400 block">(x{item.conversionFactor})</span>
                                )}
                              </td>
                              <td className="p-2.5 text-right font-mono font-medium">{Number(item.packageQuantity).toLocaleString("vi-VN")}</td>
                              <td className="p-2.5 text-right font-mono text-[#371cdb] font-semibold">
                                {Number(item.baseQuantity).toLocaleString("vi-VN")}
                              </td>
                              <td className="p-2.5 text-right font-mono text-slate-600">
                                {Number(item.unitCost).toLocaleString("vi-VN")} đ
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                {Number(item.totalCost).toLocaleString("vi-VN")} đ
                              </td>
                              <td className="p-2.5">
                                {item.batchNumber ? (
                                  <div>
                                    <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                                      Lô: {item.batchNumber}
                                    </span>
                                    <div className="text-[10px] text-slate-500 mt-1">
                                      {item.mfgDate && `NSX: ${new Date(item.mfgDate).toLocaleDateString("vi-VN")} · `}
                                      {item.expiryDate && `HSD: ${new Date(item.expiryDate).toLocaleDateString("vi-VN")}`}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">Không quản lý lô</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Ghi chú */}
                  {selectedReceipt.notes && (
                    <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <strong>Ghi chú:</strong> {selectedReceipt.notes}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-xs text-slate-500">
                Người lập: {selectedReceipt?.createdByName || 'Nhân viên kho'}
              </span>
              <div className="flex items-center gap-2">
                {selectedReceipt?.status === 'DRAFT' && (
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      setReceiptToConfirm(selectedReceipt);
                      setConfirmModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#371cdb] hover:bg-[#2d14b8] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    Xác nhận nhập kho
                  </button>
                )}
                {selectedReceipt?.status === 'CONFIRMED' && (
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      handleNavigateToAdjustment(selectedReceipt);
                    }}
                    className="px-4 py-2 bg-[#371cdb] hover:bg-[#2d14b8] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Lập phiếu điều chỉnh
                  </button>
                )}
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
