import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
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
  Printer,
  ChevronDown,
} from 'lucide-react';
import { showToast } from '../../components/toast';
import { internalTransfersService } from '../../services/internal-transfers.service';
import { warehouseService } from '../../services/warehouse.service';
import { CreateTransferModal } from '../../components/inventory/create-transfer-modal';
import { ConfirmTransferReceiptModal } from '../../components/inventory/confirm-transfer-receipt-modal';
import { TransferDetailModal } from '../../components/inventory/transfer-detail-modal';
import { TransferPrintModal } from '../../components/inventory/transfer-print-modal';
import { TransferFilters } from '../../components/inventory/transfer-filters';
import type {
  InternalTransfer,
  TransferStatus,
} from '../../types/internal-transfer.types';
import type { Warehouse } from '../../types/warehouse.types';

export const InternalTransfersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Đọc giá trị ban đầu từ URL Query Parameters
  const initialSearch = (searchParams.get('search') || searchParams.get('q') || '').trim();
  const initialStatus = (() => {
    const s = searchParams.get('status')?.toUpperCase();
    if (s === 'ALL') return 'ALL';
    if (s && ['DRAFT', 'IN_TRANSIT', 'COMPLETED', 'PARTIALLY_RECEIVED', 'CANCELLED'].includes(s)) {
      return s as TransferStatus;
    }
    // Độ ưu tiên luôn để đang vận chuyển (IN_TRANSIT) khi mở trang
    return 'IN_TRANSIT';
  })();
  const initialFrom = searchParams.get('from') || searchParams.get('fromWarehouseId') || 'ALL';
  const initialTo = searchParams.get('to') || searchParams.get('toWarehouseId') || 'ALL';
  const initialAction = searchParams.get('action') || '';

  const [transfers, setTransfers] = useState<InternalTransfer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
  const [selectedStatus, setSelectedStatus] = useState<TransferStatus | 'ALL'>(initialStatus);
  const [fromWarehouseFilter, setFromWarehouseFilter] = useState<string>(initialFrom);
  const [toWarehouseFilter, setToWarehouseFilter] = useState<string>(initialTo);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(initialAction === 'create');
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [printModalOpen, setPrintModalOpen] = useState<boolean>(false);
  const [selectedTransfer, setSelectedTransfer] = useState<InternalTransfer | null>(null);
  const [printTransfer, setPrintTransfer] = useState<InternalTransfer | null>(null);

  // Cập nhật query parameters an toàn lên URL mà không reload lại toàn bộ trang
  const updateUrlParams = useCallback(
    (updates: {
      status?: string;
      from?: string;
      to?: string;
      search?: string;
      code?: string | null;
      action?: string | null;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);

          if (updates.status !== undefined) {
            if (updates.status && updates.status !== 'ALL') {
              next.set('status', updates.status);
            } else {
              next.delete('status');
            }
          }

          if (updates.from !== undefined) {
            if (updates.from && updates.from !== 'ALL') {
              next.set('from', updates.from);
            } else {
              next.delete('from');
              next.delete('fromWarehouseId');
            }
          }

          if (updates.to !== undefined) {
            if (updates.to && updates.to !== 'ALL') {
              next.set('to', updates.to);
            } else {
              next.delete('to');
              next.delete('toWarehouseId');
            }
          }

          if (updates.search !== undefined) {
            const val = updates.search.trim();
            if (val) {
              next.set('search', val);
            } else {
              next.delete('search');
              next.delete('q');
            }
          }

          if (updates.code !== undefined) {
            if (updates.code) {
              next.set('code', updates.code);
            } else {
              next.delete('code');
              next.delete('id');
            }
          }

          if (updates.action !== undefined) {
            if (updates.action) {
              next.set('action', updates.action);
            } else {
              next.delete('action');
            }
          }

          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Debounce đồng bộ từ khóa tìm kiếm lên URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentParam = searchParams.get('search') || searchParams.get('q') || '';
      if (searchTerm.trim() !== currentParam.trim()) {
        updateUrlParams({ search: searchTerm });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, updateUrlParams]);

  // Lắng nghe thay đổi từ URL params khi người dùng Back/Forward
  useEffect(() => {
    const urlSearch = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const urlStatusRaw = searchParams.get('status')?.toUpperCase();
    const urlStatus = urlStatusRaw === 'ALL'
      ? 'ALL'
      : (urlStatusRaw && ['DRAFT', 'IN_TRANSIT', 'COMPLETED', 'PARTIALLY_RECEIVED', 'CANCELLED'].includes(urlStatusRaw))
        ? (urlStatusRaw as TransferStatus)
        : 'IN_TRANSIT'; // Độ ưu tiên luôn là Đang vận chuyển
    const urlFrom = searchParams.get('from') || searchParams.get('fromWarehouseId') || 'ALL';
    const urlTo = searchParams.get('to') || searchParams.get('toWarehouseId') || 'ALL';
    const urlAction = searchParams.get('action') || '';

    setSearchTerm((prev) => (prev.trim() !== urlSearch ? urlSearch : prev));
    setSelectedStatus(urlStatus);
    setFromWarehouseFilter(urlFrom);
    setToWarehouseFilter(urlTo);
    if (urlAction === 'create') {
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  // Tự động mở modal chi tiết phiếu nếu có param code/id trên URL (Deep Linking)
  useEffect(() => {
    const codeParam = searchParams.get('code') || searchParams.get('id');
    if (codeParam && transfers.length > 0 && !selectedTransfer && !detailModalOpen) {
      const found = transfers.find(
        (t) =>
          t.code.toLowerCase() === codeParam.toLowerCase() ||
          t.id.toLowerCase() === codeParam.toLowerCase(),
      );
      if (found) {
        setSelectedTransfer(found);
        setDetailModalOpen(true);
      }
    }
  }, [transfers, searchParams, selectedTransfer, detailModalOpen]);

  // Copy code feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Dropdown menu Thao tác
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    top: number;
    right: number;
    isDropUp: boolean;
  } | null>(null);

  // Đóng dropdown khi click ngoài, scroll hoặc nhấn Escape
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (
        !(e.target as HTMLElement).closest('.transfer-action-dropdown-container') &&
        !(e.target as HTMLElement).closest('.transfer-action-portal-menu')
      ) {
        setOpenActionMenuId(null);
        setActionMenuAnchor(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenActionMenuId(null);
        setActionMenuAnchor(null);
      }
    };
    const handleScrollOrResize = () => {
      setOpenActionMenuId(null);
      setActionMenuAnchor(null);
    };

    document.addEventListener('click', handleDocClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('click', handleDocClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

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

  // Lọc dữ liệu hiển thị (kèm ưu tiên các đơn Đang vận chuyển lên đầu danh sách)
  const filteredTransfers = useMemo(() => {
    const list = transfers.filter((t) => {
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

    // Độ ưu tiên: các phiếu IN_TRANSIT (Đang vận chuyển) luôn được ưu tiên nổi lên đầu danh sách
    return [...list].sort((a, b) => {
      if (a.status === 'IN_TRANSIT' && b.status !== 'IN_TRANSIT') return -1;
      if (b.status === 'IN_TRANSIT' && a.status !== 'IN_TRANSIT') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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

  // Mở modal xem chi tiết kèm cập nhật query param
  const handleOpenDetail = (transfer: InternalTransfer) => {
    setSelectedTransfer(transfer);
    setDetailModalOpen(true);
    updateUrlParams({ code: transfer.code });
  };

  // Đóng modal chi tiết kèm xóa param code
  const handleCloseDetail = () => {
    setDetailModalOpen(false);
    setSelectedTransfer(null);
    updateUrlParams({ code: null });
  };

  // Mở modal tạo phiếu kèm cập nhật param action
  const handleOpenCreate = () => {
    setCreateModalOpen(true);
    updateUrlParams({ action: 'create' });
  };

  // Đóng modal tạo phiếu kèm xóa param action
  const handleCloseCreate = () => {
    setCreateModalOpen(false);
    updateUrlParams({ action: null });
  };

  const getStatusBadge = (status: TransferStatus) => {
    switch (status) {
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 cursor-default select-none pointer-events-none">
            <Truck className="w-3 h-3 text-amber-600 animate-pulse" />
            Đang vận chuyển
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default select-none pointer-events-none">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Đã nhận đủ
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 cursor-default select-none pointer-events-none">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            Nhận chênh lệch
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 cursor-default select-none pointer-events-none">
            <Clock className="w-3 h-3 text-slate-500" />
            Bản nháp
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200 cursor-default select-none pointer-events-none">
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
            onClick={handleOpenCreate}
            className="px-4 py-2 text-xs font-bold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded-lg shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Lập Phiếu Chuyển Kho
          </button>
        </div>
      </div>

      {/* 2. BỘ LỌC VÀ TÌM KIẾM */}
      <TransferFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedStatus={selectedStatus}
        onStatusChange={(status) => {
          setSelectedStatus(status);
          updateUrlParams({ status });
        }}
        fromWarehouseFilter={fromWarehouseFilter}
        onFromWarehouseChange={(from) => {
          setFromWarehouseFilter(from);
          updateUrlParams({ from });
        }}
        toWarehouseFilter={toWarehouseFilter}
        onToWarehouseChange={(to) => {
          setToWarehouseFilter(to);
          updateUrlParams({ to });
        }}
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
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 min-w-[150px]">Mã phiếu</th>
                  <th className="py-3 px-4 min-w-[240px]">Tuyến chuyển kho</th>
                  <th className="py-3 px-4 w-32 text-center">Trạng thái</th>
                  <th className="py-3 px-4 w-28 text-center">Mặt hàng</th>
                  <th className="py-3 px-4 w-44">Thời gian</th>
                  <th className="py-3 px-4 w-32 text-right sticky right-0 bg-slate-50/95 backdrop-blur-xs shadow-[-4px_0_8px_rgba(0,0,0,0.04)] z-10">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredTransfers.map((transfer) => {
                  const itemCount = transfer.items.length;

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

                      {/* Trạng thái - Chỉ xem không được click */}
                      <td
                        className="py-3 px-4 text-center cursor-default select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {getStatusBadge(transfer.status)}
                      </td>

                      {/* Mặt hàng */}
                      <td className="py-3 px-4 font-semibold text-slate-800 text-center">
                        {itemCount}
                      </td>

                      {/* Thời gian - chỉ xem không được ấn vào */}
                      <td
                        className="py-3 px-4 text-slate-600 cursor-default select-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {transfer.transferredAt
                              ? new Date(transfer.transferredAt).toLocaleDateString('vi-VN')
                              : new Date(transfer.createdAt).toLocaleDateString('vi-VN')}{' '}
                            {transfer.transferredAt
                              ? new Date(transfer.transferredAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : new Date(transfer.createdAt).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                          </span>
                        </div>
                      </td>

                      {/* Thao tác (Gộp chung thành 1 nút Dropdown menu) */}
                      <td className="py-3 px-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.04)] z-10 whitespace-nowrap">
                        <div className="relative inline-flex items-center justify-end transfer-action-dropdown-container">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openActionMenuId === transfer.id) {
                                setOpenActionMenuId(null);
                                setActionMenuAnchor(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const spaceBelow = window.innerHeight - rect.bottom;
                                const shouldDropUp = spaceBelow < 200 && rect.top > 200;
                                setActionMenuAnchor({
                                  top: shouldDropUp ? rect.top - 4 : rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                  isDropUp: shouldDropUp,
                                });
                                setOpenActionMenuId(transfer.id);
                              }
                            }}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none whitespace-nowrap shrink-0 ${
                              openActionMenuId === transfer.id
                                ? 'bg-[var(--color-primary-light)] border-[var(--color-primary)] text-[var(--color-primary)] shadow-xs ring-2 ring-[var(--color-primary)]/10'
                                : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)] hover:border-slate-300'
                            }`}
                            title="Thao tác"
                          >
                            <span className="whitespace-nowrap">Thao tác</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                                openActionMenuId === transfer.id ? 'rotate-180 text-[var(--color-primary)]' : ''
                              }`}
                            />
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

      {/* Dropdown Menu Portal Thao tác */}
      {openActionMenuId && actionMenuAnchor && typeof document !== 'undefined' && (() => {
        const transfer = transfers.find((t) => t.id === openActionMenuId);
        if (!transfer) return null;
        return createPortal(
          <div
            className="transfer-action-portal-menu fixed w-48 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-[9999] animate-in fade-in zoom-in-95 text-left divide-y divide-slate-100"
            style={{
              top: actionMenuAnchor.isDropUp ? undefined : `${actionMenuAnchor.top}px`,
              bottom: actionMenuAnchor.isDropUp
                ? `${window.innerHeight - actionMenuAnchor.top}px`
                : undefined,
              right: `${actionMenuAnchor.right}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              {/* 1. Xem chi tiết */}
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setActionMenuAnchor(null);
                  handleOpenDetail(transfer);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-400" />
                <span>Xem chi tiết</span>
              </button>

              {/* 2. In phiếu */}
              <button
                type="button"
                onClick={() => {
                  setOpenActionMenuId(null);
                  setActionMenuAnchor(null);
                  setPrintTransfer(transfer);
                  setPrintModalOpen(true);
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-400" />
                <span>In phiếu xuất kho</span>
              </button>
            </div>

            {/* 3. Nhận hàng (nếu đang trên đường) */}
            {transfer.status === 'IN_TRANSIT' && (
              <div className="py-1">
                <button
                  type="button"
                  onClick={(e) => {
                    setOpenActionMenuId(null);
                    setActionMenuAnchor(null);
                    handleOpenConfirm(transfer, e);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-emerald-700 hover:bg-emerald-50 font-semibold flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Xác nhận nhận hàng</span>
                </button>
              </div>
            )}
          </div>,
          document.body,
        );
      })()}

      {/* MODAL TẠO PHIẾU CHUYỂN KHO */}
      <CreateTransferModal
        isOpen={createModalOpen}
        onClose={handleCloseCreate}
        onSuccess={(newTransfer) => {
          setTransfers((prev) => [newTransfer, ...prev]);
          handleCloseCreate();
          // Tự động mở cửa sổ in phiếu điều chuyển theo chuẩn A4 ngay sau khi tạo
          setPrintTransfer(newTransfer);
          setPrintModalOpen(true);
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
        onClose={handleCloseDetail}
        onConfirmReceipt={(transferToConfirm) => {
          handleCloseDetail();
          setSelectedTransfer(transferToConfirm);
          setConfirmModalOpen(true);
        }}
      />

      {/* MODAL IN PHIẾU XUẤT ĐIỀU CHUYỂN A4 (SN-181) */}
      <TransferPrintModal
        isOpen={printModalOpen}
        transfer={printTransfer}
        warehouses={warehouses}
        onClose={() => {
          setPrintModalOpen(false);
          setPrintTransfer(null);
        }}
      />
    </div>
  );
};
