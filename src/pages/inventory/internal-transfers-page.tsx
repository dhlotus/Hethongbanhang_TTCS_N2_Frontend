import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Search,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Check,
  Copy,
  FileText,
} from 'lucide-react';
import { showToast } from '../../components/toast';
import { internalTransfersService } from '../../services/internal-transfers.service';
import { warehouseService } from '../../services/warehouse.service';
import { CreateTransferModal } from '../../components/inventory/create-transfer-modal';
import { ConfirmTransferReceiptModal } from '../../components/inventory/confirm-transfer-receipt-modal';
import { TransferDetailModal } from '../../components/inventory/transfer-detail-modal';
import type {
  InternalTransfer,
  TransferStatus,
} from '../../types/internal-transfer.types';
import type { Warehouse } from '../../types/warehouse.types';

export const InternalTransfersPage: React.FC = () => {
  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<TransferStatus | 'ALL'>('ALL');
  const [fromWarehouseFilter, setFromWarehouseFilter] = useState<string>('ALL');
  const [toWarehouseFilter, setToWarehouseFilter] = useState<string>('ALL');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [selectedTransfer, setSelectedTransfer] = useState<InternalTransfer | null>(null);

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    let mounted = true;
    const loadInitialData = async () => {
      try {
        const [whList, transferList] = await Promise.all([
          warehouseService.getWarehouses(),
          internalTransfersService.getTransfers(),
        ]);
        if (!mounted) return;
        setWarehouses(whList);
        setTransfers(transferList);
      } catch {
        showToast('error', 'Không thể tải danh sách phiếu chuyển kho');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadInitialData();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      const data = await internalTransfersService.getTransfers();
      setTransfers(data);
    } catch {
      showToast('error', 'Không thể làm mới danh sách phiếu chuyển kho');
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Thống kê KPIs
  const stats = useMemo(() => {
    const total = transfers.length;
    const inTransit = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
    const completed = transfers.filter((t) => t.status === 'COMPLETED').length;
    const partial = transfers.filter((t) => t.status === 'PARTIALLY_RECEIVED').length;
    return { total, inTransit, completed, partial };
  }, [transfers]);

  // Lọc dữ liệu hiển thị
  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (selectedStatus !== 'ALL' && t.status !== selectedStatus) return false;
      if (fromWarehouseFilter !== 'ALL' && t.fromWarehouseId !== fromWarehouseFilter) return false;
      if (toWarehouseFilter !== 'ALL' && t.toWarehouseId !== toWarehouseFilter) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const matchCode = t.code.toLowerCase().includes(q);
        const matchFrom = t.fromWarehouseName.toLowerCase().includes(q);
        const matchTo = t.toWarehouseName.toLowerCase().includes(q);
        const matchItems = t.items.some(
          (i) => i.sku.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q),
        );
        return matchCode || matchFrom || matchTo || matchItems;
      }

      return true;
    });
  }, [transfers, selectedStatus, fromWarehouseFilter, toWarehouseFilter, searchTerm]);

  // Copy mã phiếu
  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast('success', `Đã sao chép mã phiếu: ${code}`);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Mở modal xác nhận nhận hàng
  const handleOpenConfirm = (transfer: InternalTransfer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTransfer(transfer);
    setConfirmModalOpen(true);
  };

  // Mở modal xem chi tiết
  const handleOpenDetail = (transfer: InternalTransfer) => {
    setSelectedTransfer(transfer);
    setDetailModalOpen(true);
  };

  const getStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Truck className="w-3 h-3 text-amber-600 animate-pulse" />
            Đang trên đường
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã nhận đủ
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Nhận chênh lệch
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3 h-3 text-slate-500" />
            Bản nháp
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
            Đã hủy
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* 1. TIÊU ĐỀ TRANG & NÚT TẠO PHIẾU */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[var(--color-primary-light)] text-[var(--color-primary)] rounded-lg">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Chuyển Kho Nội Bộ
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Điều chuyển hàng hóa từ kho thừa sang kho thiếu — Theo dõi hàng đang trên đường và xác nhận nhận đủ
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Lập Phiếu Chuyển Kho
          </button>
        </div>
      </div>

      {/* 2. CÁC THẺ THỐNG KÊ (STAT CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Tổng số phiếu */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Tổng số phiếu
          </div>
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-400" />
            Toàn hệ thống phân phối
          </div>
        </div>

        {/* Đang trên đường */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'IN_TRANSIT' ? 'ALL' : 'IN_TRANSIT')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'IN_TRANSIT'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-300/50 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-amber-300 hover:bg-amber-50/20 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Đang trên đường</span>
            <Truck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{stats.inTransit}</div>
          <div className="text-[11px] text-amber-600/90 mt-1 font-medium">
            Kho đi đã trừ, chưa cộng kho đến
          </div>
        </div>

        {/* Đã nhận đủ */}
        <div
          onClick={() => setSelectedStatus(selectedStatus === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'COMPLETED'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-300/50 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Đã nhận đủ 100%</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{stats.completed}</div>
          <div className="text-[11px] text-emerald-600/90 mt-1 font-medium">
            Số liệu 2 đầu đã đồng bộ hoàn tất
          </div>
        </div>

        {/* Nhận có chênh lệch */}
        <div
          onClick={() =>
            setSelectedStatus(selectedStatus === 'PARTIALLY_RECEIVED' ? 'ALL' : 'PARTIALLY_RECEIVED')
          }
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'PARTIALLY_RECEIVED'
              ? 'bg-rose-50/70 border-rose-300 ring-2 ring-rose-300/50 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-rose-300 hover:bg-rose-50/20 shadow-2xs'
          }`}
        >
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Nhận chênh lệch</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-700">{stats.partial}</div>
          <div className="text-[11px] text-rose-600/90 mt-1 font-medium">
            Bắt buộc có lý do giải trình
          </div>
        </div>
      </div>

      {/* 3. BỘ LỌC VÀ TÌM KIẾM */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Ô tìm kiếm */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã phiếu, kho xuất, kho nhập, mã SKU..."
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Lọc trạng thái */}
          <div className="md:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as TransferStatus | 'ALL')}
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="IN_TRANSIT">Đang trên đường (IN_TRANSIT)</option>
              <option value="COMPLETED">Đã nhận đủ (COMPLETED)</option>
              <option value="PARTIALLY_RECEIVED">Nhận chênh lệch (PARTIALLY_RECEIVED)</option>
              <option value="DRAFT">Bản nháp (DRAFT)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
          </div>

          {/* Lọc Kho xuất */}
          <div className="md:col-span-2">
            <select
              value={fromWarehouseFilter}
              onChange={(e) => setFromWarehouseFilter(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all text-slate-700"
            >
              <option value="ALL">Từ: Tất cả kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lọc Kho nhận */}
          <div className="md:col-span-2">
            <select
              value={toWarehouseFilter}
              onChange={(e) => setToWarehouseFilter(e.target.value)}
              className="w-full text-xs font-medium px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all text-slate-700"
            >
              <option value="ALL">Đến: Tất cả kho</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. BẢNG DANH SÁCH PHIẾU CHUYỂN KHO */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-[var(--color-primary)]" />
            <div className="text-xs font-semibold text-slate-600">
              Đang tải danh sách phiếu chuyển kho...
            </div>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
            <div className="text-sm font-bold text-slate-700 mb-1">
              Không tìm thấy phiếu chuyển kho nào
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {searchTerm || selectedStatus !== 'ALL' || fromWarehouseFilter !== 'ALL' || toWarehouseFilter !== 'ALL'
                ? 'Không có kết quả phù hợp với tiêu chí lọc hiện tại. Hãy thử thay đổi bộ lọc.'
                : 'Hiện chưa có phiếu chuyển kho nào trong hệ thống. Hãy lập phiếu điều chuyển đầu tiên!'}
            </p>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-[var(--color-primary)] rounded-lg shadow-sm cursor-pointer"
            >
              + Lập phiếu chuyển kho ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[150px]">Mã phiếu</th>
                  <th className="py-3 px-4 min-w-[260px]">Tuyến điều chuyển</th>
                  <th className="py-3 px-4 text-center w-28">Mặt hàng</th>
                  <th className="py-3 px-4 text-center w-36">Trạng thái</th>
                  <th className="py-3 px-4 min-w-[150px]">Thời gian & Người lập</th>
                  <th className="py-3 px-4 text-right min-w-[160px]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransfers.map((t) => {
                  const totalTransferQty = t.items.reduce(
                    (sum, i) => sum + i.transferQuantity,
                    0,
                  );
                  const isCopied = copiedCode === t.code;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => handleOpenDetail(t)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Mã phiếu */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[var(--color-primary)]">{t.code}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyCode(t.code, e)}
                            className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Sao chép mã phiếu"
                          >
                            {isCopied ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        {t.notes && (
                          <div className="text-[11px] text-slate-400 font-sans font-normal truncate max-w-[180px] mt-0.5">
                            {t.notes}
                          </div>
                        )}
                      </td>

                      {/* Tuyến chuyển */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{t.fromWarehouseName}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <div className="flex items-center gap-1 text-[var(--color-primary)] font-bold">
                            <Building2 className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
                            <span className="truncate max-w-[120px]">{t.toWarehouseName}</span>
                          </div>
                        </div>
                      </td>

                      {/* Mặt hàng & số lượng */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-slate-800">
                          {t.items.length} mặt hàng
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Tổng: {totalTransferQty} đơn vị
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        {getStatusBadge(t.status)}
                      </td>

                      {/* Thời gian & Người lập */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{new Date(t.createdAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Bởi: {t.createdByName || 'Thủ kho'}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {/* Nút Nhận hàng kho đến */}
                          {t.status === 'IN_TRANSIT' && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenConfirm(t, e)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-md shadow-2xs transition-all inline-flex items-center gap-1 cursor-pointer active:scale-95"
                              title="Xác nhận nhận hàng tại kho đến"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Nhận hàng
                            </button>
                          )}

                          {/* Nút Xem chi tiết */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(t)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Xem chi tiết phiếu"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. CÁC MODALS NGHIỆP VỤ */}
      {createModalOpen && (
        <CreateTransferModal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleRefresh}
        />
      )}

      {confirmModalOpen && selectedTransfer && (
        <ConfirmTransferReceiptModal
          key={selectedTransfer.id}
          isOpen={confirmModalOpen}
          transfer={selectedTransfer}
          onClose={() => {
            setConfirmModalOpen(false);
            setSelectedTransfer(null);
          }}
          onSuccess={handleRefresh}
        />
      )}

      {detailModalOpen && (
        <TransferDetailModal
          isOpen={detailModalOpen}
          transfer={selectedTransfer}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedTransfer(null);
          }}
          onConfirmReceipt={(t) => {
            setDetailModalOpen(false);
            handleOpenConfirm(t);
          }}
        />
      )}
    </div>
  );
};
