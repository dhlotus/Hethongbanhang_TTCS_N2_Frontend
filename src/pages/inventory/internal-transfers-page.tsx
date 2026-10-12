import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeftRight,
  Plus,
  RefreshCw,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Building2,
  Calendar,
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
import { TransferKpiHeader } from '../../components/inventory/transfer-kpi-header';
import { TransferFilters } from '../../components/inventory/transfer-filters';
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
      <TransferKpiHeader
        stats={stats}
        selectedStatus={selectedStatus}
        onSelectStatus={setSelectedStatus}
      />

      {/* 3. BỘ LỌC VÀ TÌM KIẾM */}
      <TransferFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        fromWarehouseFilter={fromWarehouseFilter}
        onFromWarehouseChange={setFromWarehouseFilter}
        toWarehouseFilter={toWarehouseFilter}
        onToWarehouseChange={setToWarehouseFilter}
        warehouses={warehouses}
      />

      {/* 4. BẢNG DANH SÁCH PHIẾU CHUYỂN KHO */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
            <span>Đang tải danh sách phiếu chuyển kho...</span>
          </div>
        ) : filteredTransfers.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <div className="text-xs font-semibold text-slate-700">
              Không tìm thấy phiếu chuyển kho nào
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Thử thay đổi bộ lọc tìm kiếm hoặc tạo phiếu chuyển kho mới
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[150px]">Mã phiếu</th>
                  <th className="py-3 px-4 min-w-[240px]">Tuyến chuyển kho</th>
                  <th className="py-3 px-4 w-32 text-center">Trạng thái</th>
                  <th className="py-3 px-4 min-w-[180px]">Mặt hàng & Số lượng</th>
                  <th className="py-3 px-4 w-40">Thời gian xuất</th>
                  <th className="py-3 px-4 w-40">Người tạo</th>
                  <th className="py-3 px-4 w-28 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransfers.map((transfer) => {
                  const itemCount = transfer.items.length;
                  const totalUnits = transfer.items.reduce((s, i) => s + i.transferQuantity, 0);

                  return (
                    <tr
                      key={transfer.id}
                      onClick={() => handleOpenDetail(transfer)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      {/* Mã phiếu */}
                      <td className="py-3 px-4 font-mono font-bold text-[var(--color-primary)]">
                        <div className="flex items-center gap-1.5">
                          <span>{transfer.code}</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyCode(transfer.code, e)}
                            title="Sao chép mã"
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded transition-opacity"
                          >
                            {copiedCode === transfer.code ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Tuyến chuyển kho */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{transfer.fromWarehouseName}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="text-[var(--color-primary)] truncate max-w-[130px]">
                            {transfer.toWarehouseName}
                          </span>
                        </div>
                        {transfer.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[280px]">
                            {transfer.notes}
                          </div>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(transfer.status)}
                      </td>

                      {/* Mặt hàng & Số lượng */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {itemCount} mặt hàng ({totalUnits} ĐV)
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                          {transfer.items.map((i) => `${i.productName} (${i.transferQuantity} ${i.unit})`).join(', ')}
                        </div>
                      </td>

                      {/* Thời gian */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            {transfer.transferredAt
                              ? new Date(transfer.transferredAt).toLocaleDateString('vi-VN')
                              : new Date(transfer.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {transfer.transferredAt
                            ? new Date(transfer.transferredAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : new Date(transfer.createdAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                        </div>
                      </td>

                      {/* Người tạo */}
                      <td className="py-3 px-4 text-slate-600">
                        <div className="font-medium text-slate-700">
                          {transfer.createdByName || 'Thủ kho'}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {transfer.receivedByName ? `Nhận: ${transfer.receivedByName}` : 'Chưa nhận'}
                        </div>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {transfer.status === 'IN_TRANSIT' && (
                            <button
                              type="button"
                              onClick={(e) => handleOpenConfirm(transfer, e)}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                              title="Xác nhận nhận hàng tại kho đến"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Nhận hàng
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(transfer)}
                            className="p-1.5 text-slate-400 hover:text-[var(--color-primary)] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
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

      {/* MODAL TẠO PHIẾU CHUYỂN KHO */}
      <CreateTransferModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(newTransfer) => {
          setTransfers((prev) => [newTransfer, ...prev]);
        }}
      />

      {/* MODAL XÁC NHẬN NHẬN HÀNG */}
      <ConfirmTransferReceiptModal
        isOpen={confirmModalOpen}
        transfer={selectedTransfer}
        onClose={() => {
          setConfirmModalOpen(false);
          setSelectedTransfer(null);
        }}
        onSuccess={(updatedTransfer) => {
          setTransfers((prev) =>
            prev.map((t) => (t.id === updatedTransfer.id ? updatedTransfer : t)),
          );
        }}
      />

      {/* MODAL CHI TIẾT PHIẾU CHUYỂN KHO */}
      <TransferDetailModal
        isOpen={detailModalOpen}
        transfer={selectedTransfer}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTransfer(null);
        }}
        onConfirmReceipt={(transferToConfirm) => {
          setDetailModalOpen(false);
          setSelectedTransfer(transferToConfirm);
          setConfirmModalOpen(true);
        }}
      />
    </div>
  );
};
