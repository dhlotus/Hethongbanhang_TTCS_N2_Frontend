import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RotateCcw,
  Plus,
  Eye,
  Receipt,
  X,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { debtAdjustmentsService } from '../services/debt-adjustments.service';
import { Pagination } from '../components/pagination';
import { showToast } from '../components/toast';
import type {
  DebtAdjustmentVoucher,
  PendingReturnReceipt,
} from '../types/debt-adjustment';

const formatAgencyCode = (code?: string, id?: string): string => {
  const val = code || id || '';
  if (val.startsWith('cust-dl-')) return 'DL-' + val.replace('cust-dl-', '');
  if (val.startsWith('cust-')) return 'DL-' + val.replace('cust-', '');
  if (val.includes('55555555-0000-0000-0000-000000000001') || val === 'DL-MK-001') return 'DL-0001';
  if (val.includes('55555555-0000-0000-0000-000000000002') || val === 'DL-AB-002') return 'DL-0002';
  return val || 'DL-0001';
};

export const DebtAdjustmentsPage: React.FC = () => {
  // State danh sách chứng từ
  const [vouchers, setVouchers] = useState<DebtAdjustmentVoucher[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [summary, setSummary] = useState<{ totalAmount: number; totalVouchers: number }>({
    totalAmount: 0,
    totalVouchers: 0,
  });

  // State bộ lọc
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [agencyFilter, setAgencyFilter] = useState<string>('ALL');

  // State Modal Chi tiết bút toán
  const [selectedVoucher, setSelectedVoucher] = useState<DebtAdjustmentVoucher | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // State Modal Lập chứng từ mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [pendingReturns, setPendingReturns] = useState<PendingReturnReceipt[]>([]);
  const [loadingPending, setLoadingPending] = useState<boolean>(false);
  const [selectedReturn, setSelectedReturn] = useState<PendingReturnReceipt | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Tải danh sách chứng từ từ API
  const fetchVouchers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await debtAdjustmentsService.getDebtAdjustments({
        page,
        limit,
        search: searchTerm,
        agency_id: agencyFilter,
      });
      setVouchers(res.data || []);
      setTotal(res.total || 0);
      if (res.summary) {
        setSummary(res.summary);
      }
    } catch (err: any) {
      showToast('error', 'Lỗi tải chứng từ', err?.message || 'Không thể tải danh sách chứng từ');
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchTerm, agencyFilter]);

  // Tải danh sách phiếu trả chờ lập chứng từ
  const fetchPendingReturns = useCallback(async () => {
    try {
      setLoadingPending(true);
      const res = await debtAdjustmentsService.getPendingReturns();
      setPendingReturns(res || []);
    } catch {
      setPendingReturns([]);
    } finally {
      setLoadingPending(false);
    }
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  useEffect(() => {
    fetchPendingReturns();
  }, [fetchPendingReturns]);

  // Mở modal chi tiết
  const handleOpenDetail = async (voucher: DebtAdjustmentVoucher) => {
    try {
      setSelectedVoucher(voucher);
      setLoadingDetail(true);
      setIsDetailModalOpen(true);
      const fullDetail = await debtAdjustmentsService.getDebtAdjustmentById(voucher.id);
      if (fullDetail) {
        setSelectedVoucher(fullDetail);
      }
    } catch {
      setSelectedVoucher(voucher);
    } finally {
      setLoadingDetail(false);
    }
  };

  // Mở modal tạo mới
  const handleOpenCreateModal = () => {
    fetchPendingReturns();
    setSelectedReturn(null);
    setAdjustmentReason('');
    setIsCreateModalOpen(true);
  };

  // Chọn phiếu trả hàng để lập chứng từ
  const handleSelectReturn = (ret: PendingReturnReceipt) => {
    setSelectedReturn(ret);
    setAdjustmentReason(
      `Giảm trừ công nợ theo phiếu trả hàng ${ret.code} (Hóa đơn gốc: ${ret.originalInvoiceCode})`,
    );
  };

  // Submit lập chứng từ
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturn) {
      showToast('warning', 'Chưa chọn phiếu trả', 'Vui lòng chọn một phiếu trả hàng để lập chứng từ');
      return;
    }

    try {
      setSubmitting(true);
      const created = await debtAdjustmentsService.createDebtAdjustment({
        return_receipt_id: selectedReturn.id,
        agency_id: selectedReturn.agencyId,
        original_invoice_id: selectedReturn.originalInvoiceId,
        reason: adjustmentReason.trim() || undefined,
      });

      // Bắn event loha_debt_updated để trang chi tiết hồ sơ đại lý cập nhật ngay lập tức
      try {
        window.dispatchEvent(
          new CustomEvent('loha_debt_updated', {
            detail: {
              customerId: created.agencyId,
              customerCode: created.agencyCode,
              adjustmentAmount: created.adjustmentAmount,
            },
          })
        );
      } catch {}

      showToast(
        'success',
        'Lập chứng từ thành công',
        `Chứng từ ${created.code} đã được hạch toán giảm trừ ${created.adjustmentAmount.toLocaleString('vi-VN')} đ vào công nợ đại lý`,
      );

      setIsCreateModalOpen(false);
      setSelectedReturn(null);
      fetchVouchers();
      fetchPendingReturns();
    } catch (err: any) {
      showToast('error', 'Lập chứng từ thất bại', err?.response?.data?.message || err?.message || 'Có lỗi xảy ra');
    } finally {
      setSubmitting(false);
    }
  };

  // Danh sách đại lý duy nhất để lọc
  const uniqueAgencies = useMemo(() => {
    const map = new Map<string, string>();
    vouchers.forEach((v) => {
      if (v.agencyId && v.agencyName) {
        map.set(v.agencyId, v.agencyName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [vouchers]);

  return (
    <div className="space-y-5 w-full">
      {/* ── TIÊU ĐỀ TRANG ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900">
            Chứng từ điều chỉnh giảm trừ công nợ khi trả hàng
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              fetchVouchers();
              fetchPendingReturns();
            }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Lập chứng từ giảm trừ</span>
            {pendingReturns.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-white text-indigo-700 rounded-full font-bold">
                {pendingReturns.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── 3 THẺ THỐNG KÊ (KPI METRICS) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Thẻ 1: Tổng tiền giảm trừ lũy kế */}
        <div className="bg-gradient-to-br from-white to-emerald-50/40 p-4 rounded-2xl border border-emerald-100/80 shadow-xs relative overflow-hidden">
          <span className="text-xs font-semibold text-slate-600 block">Tổng tiền giảm trừ lũy kế</span>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-2 tracking-tight">
            {(summary.totalAmount || 0).toLocaleString('vi-VN')} <span className="text-sm font-medium">đ</span>
          </p>
        </div>

        {/* Thẻ 2: Tổng số chứng từ đã hạch toán */}
        <div className="bg-gradient-to-br from-white to-indigo-50/40 p-4 rounded-2xl border border-indigo-100/80 shadow-xs relative overflow-hidden">
          <span className="text-xs font-semibold text-slate-600 block">Chứng từ đã hạch toán</span>
          <p className="text-xl sm:text-2xl font-bold text-indigo-700 mt-2 tracking-tight">
            {summary.totalVouchers || total || 0} <span className="text-sm font-medium">chứng từ</span>
          </p>
        </div>

        {/* Thẻ 3: Phiếu trả chờ lập chứng từ */}
        <div className="bg-gradient-to-br from-white to-amber-50/40 p-4 rounded-2xl border border-amber-100/80 shadow-xs relative overflow-hidden">
          <span className="text-xs font-semibold text-slate-600 block">Phiếu trả đã duyệt chờ lập</span>
          <p className="text-xl sm:text-2xl font-bold text-amber-700 mt-2 tracking-tight">
            {pendingReturns.length} <span className="text-sm font-medium">phiếu trả</span>
          </p>
        </div>
      </div>

      {/* ── BỘ LỌC TÌM KIẾM ── */}
      <div className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo mã chứng từ (DC-CN-...), mã phiếu trả, mã HĐ, tên đại lý..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 focus:bg-white transition-all font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setPage(1);
              }}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {uniqueAgencies.length > 0 && (
            <select
              value={agencyFilter}
              onChange={(e) => {
                setAgencyFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 px-3 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 cursor-pointer shadow-2xs"
            >
              <option value="ALL">Tất cả đại lý</option>
              {uniqueAgencies.map((ag) => (
                <option key={ag.id} value={ag.id}>
                  {ag.name}
                </option>
              ))}
            </select>
          )}

          {(searchTerm || agencyFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setAgencyFilter('ALL');
                setPage(1);
              }}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Đặt lại bộ lọc"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH CHỨNG TỪ ── */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden w-full">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] table-auto border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="px-4 py-3.5">Mã chứng từ</th>
                <th className="px-4 py-3.5">Phiếu trả gốc</th>
                <th className="px-4 py-3.5">Mã đại lý</th>
                <th className="px-4 py-3.5">Hóa đơn gốc</th>
                <th className="px-4 py-3.5 text-right">Số tiền giảm trừ</th>
                <th className="px-4 py-3.5">Ngày hạch toán</th>
                <th className="px-4 py-3.5 text-center">Trạng thái</th>
                <th className="px-4 py-3.5 text-center">Chi tiết bút toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>Đang tải danh sách chứng từ điều chỉnh...</span>
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">Chưa có chứng từ điều chỉnh giảm trừ công nợ nào</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Chứng từ sẽ tự động sinh khi Kho duyệt phiếu trả hàng hoặc bạn có thể bấm &quot;Lập chứng từ giảm trừ&quot;
                    </p>
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. Mã chứng từ */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200/80 text-xs inline-flex items-center">
                        {v.code}
                      </span>
                    </td>

                    {/* 2. Mã phiếu trả gốc */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 text-xs inline-flex items-center">
                        {v.returnReceiptCode || v.returnReceiptId}
                      </span>
                    </td>

                    {/* 3. Mã đại lý */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 text-xs inline-flex items-center">
                        {formatAgencyCode(v.agencyCode, v.agencyId)}
                      </span>
                    </td>

                    {/* 4. Hóa đơn gốc */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/80 text-xs inline-flex items-center">
                        {v.originalInvoiceCode || v.originalInvoiceId}
                      </span>
                    </td>

                    {/* 5. Số tiền giảm trừ */}
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-700">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-emerald-500 font-normal">-</span>
                        <span>{v.adjustmentAmount.toLocaleString('vi-VN')} đ</span>
                      </div>
                      <span className="text-[10px] font-normal text-slate-400">Giá bán gốc</span>
                    </td>

                    {/* 6. Ngày hạch toán */}
                    <td className="px-4 py-3.5 text-slate-600">
                      <div>{new Date(v.createdAt).toLocaleDateString('vi-VN')}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(v.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* 7. Trạng thái */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <CheckCircle2 className="w-3 h-3" />
                        Đã hạch toán
                      </span>
                    </td>

                    {/* 8. Thao tác */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(v)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer"
                        title="Xem chi tiết bút toán hạch toán"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        {total > limit && (
          <div className="p-3 border-t border-slate-100 flex justify-end">
            <Pagination
              currentPage={page}
              totalItems={total}
              pageSize={limit}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* ── MODAL 1: CHI TIẾT BÚT TOÁN HẠCH TOÁN GIẢM TRỪ CÔNG NỢ ── */}
      {isDetailModalOpen && selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Header Modal */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/10 text-emerald-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold">Chứng từ điều chỉnh giảm trừ công nợ</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                      POSTED
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    Mã chứng từ: {selectedVoucher.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung Modal */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {loadingDetail ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  <span>Đang tải thông tin bút toán chi tiết...</span>
                </div>
              ) : (
                <>
                  {/* Khối 1: Thông tin tham chiếu 3 bên */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70">
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500">Mã đại lý thụ hưởng:</span>
                      <p className="font-bold text-slate-900 font-mono mt-0.5">{formatAgencyCode(selectedVoucher.agencyCode, selectedVoucher.agencyId)}</p>
                      {selectedVoucher.agencyName && selectedVoucher.agencyName !== 'Đại lý' && (
                        <p className="text-[11px] text-slate-500">{selectedVoucher.agencyName}</p>
                      )}
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-500">Phiếu trả hàng gốc:</span>
                      <p className="font-bold font-mono text-indigo-700 mt-0.5">
                        {selectedVoucher.returnReceiptCode || selectedVoucher.returnReceiptId}
                      </p>
                      <p className="text-[10px] text-slate-400">Trạng thái kho: ĐÃ DUYỆT</p>
                    </div>

                    <div>
                      <span className="text-[11px] font-semibold text-slate-500">Hóa đơn gốc liên quan:</span>
                      <p className="font-bold font-mono text-slate-900 mt-0.5">
                        {selectedVoucher.originalInvoiceCode || selectedVoucher.originalInvoiceId}
                      </p>
                      <p className="text-[10px] text-slate-400">Bảo toàn nội dung gốc</p>
                    </div>
                  </div>

                  {/* Khối 2: Thông tin hạch toán */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-700">Lý do điều chỉnh:</span>
                      <p className="text-slate-800 bg-white p-2 rounded-lg border border-slate-200 mt-1 italic">
                        &quot;{selectedVoucher.reason}&quot;
                      </p>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Ngày lập chứng từ:</span>
                        <span className="font-semibold text-slate-800">
                          {new Date(selectedVoucher.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <div className="flex flex-wrap sm:flex-nowrap justify-between items-center gap-2 py-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Người lập:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedVoucher.slipCreatorDisplayName || selectedVoucher.slipCreatorName || 'Phạm Minh Tuấn (tuan_pham)'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Hạch toán:</span>
                          <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {selectedVoucher.accountantDisplayName || selectedVoucher.accountantName || 'Vũ Mai Hoa (accountant)'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Quy tắc đơn giá:</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                          Chuẩn theo giá bán hóa đơn gốc
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Khối 3: Bảng chi tiết sản phẩm & đơn giá bán gốc */}
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs mb-2 flex items-center justify-between">
                      <span>Chi tiết các mặt hàng trả & Đối chiếu đơn giá gốc:</span>
                      <span className="text-[11px] font-normal text-slate-500">
                        ({selectedVoucher.items?.length || 0} sản phẩm)
                      </span>
                    </h4>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100/80 text-[11px] font-semibold text-slate-600">
                          <tr>
                            <th className="p-2.5">STT</th>
                            <th className="p-2.5">SKU / Tên sản phẩm</th>
                            <th className="p-2.5 text-center">ĐVT</th>
                            <th className="p-2.5 text-center">SL Trả</th>
                            <th className="p-2.5 text-right text-emerald-700">Đơn giá gốc</th>
                            <th className="p-2.5 text-right font-bold">Thành tiền giảm</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedVoucher.items && selectedVoucher.items.length > 0 ? (
                            selectedVoucher.items.map((it, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-2.5 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                <td className="p-2.5">
                                  <div className="font-semibold text-slate-900">{it.productName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{it.productSku}</div>
                                </td>
                                <td className="p-2.5 text-center text-slate-600">{it.unit || 'Lon'}</td>
                                <td className="p-2.5 text-center font-bold text-slate-800">{it.quantity}</td>
                                <td className="p-2.5 text-right font-mono text-emerald-700 font-semibold">
                                  {it.originalUnitPrice.toLocaleString('vi-VN')} đ
                                </td>
                                <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                  {it.lineTotal.toLocaleString('vi-VN')} đ
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="p-4 text-center text-slate-400">
                                Không có chi tiết sản phẩm
                              </td>
                            </tr>
                          )}
                        </tbody>
                        <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                          <tr>
                            <td colSpan={5} className="p-3 text-right uppercase text-[11px] text-slate-600">
                              Tổng cộng tiền giảm trừ công nợ:
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-700 text-sm">
                              {Number(selectedVoucher.adjustmentAmount || 0).toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Khối 4: Bút toán hạch toán vào Sổ cái công nợ */}
                  <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/70 space-y-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-700" />
                      <span className="font-bold text-indigo-900 text-xs">
                        Bút toán Sổ cái công nợ (customer_debt_ledger)
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-700">
                      <div>
                        <span className="text-slate-500">Loại giao dịch:</span>
                        <p className="font-semibold text-indigo-800">Giảm trừ nợ trả hàng</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Mã tham chiếu:</span>
                        <p className="font-mono font-bold text-slate-800">{selectedVoucher.code}</p>
                      </div>
                      <div>
                        <span className="text-slate-500">Phát sinh giảm nợ (Có TK):</span>
                        <p className="font-bold text-emerald-700">
                          + {Number(selectedVoucher.adjustmentAmount || 0).toLocaleString('vi-VN')} đ
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                      ✓ Đã tự động cập nhật giảm dư nợ hiện tại (current_debt) và giải phóng hạn mức công nợ khả dụng của đại lý.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Chứng từ được hạch toán an toàn qua Database Transaction
              </span>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: LẬP CHỨNG TỪ GIẢM TRỪ CÔNG NỢ MỚI ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 bg-indigo-600 text-white flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold">Lập chứng từ điều chỉnh giảm trừ công nợ</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-indigo-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCreate} className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
              {/* Bước 1: Chọn phiếu trả hàng đã duyệt */}
              <div>
                <label className="block font-bold text-slate-900 mb-1.5">
                  1. Chọn Phiếu trả hàng đã được Kho duyệt:
                </label>
                {loadingPending ? (
                  <div className="py-4 text-center text-slate-400">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-500" />
                    <span>Đang tìm các phiếu trả hàng đủ điều kiện...</span>
                  </div>
                ) : pendingReturns.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      Hiện không có phiếu trả hàng nào ở trạng thái đã duyệt mà chưa lập chứng từ.
                      Tất cả các phiếu trả hàng đã được hệ thống hạch toán tự động!
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                    {pendingReturns.map((ret) => (
                      <div
                        key={ret.id}
                        onClick={() => handleSelectReturn(ret)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                          selectedReturn?.id === ret.id
                            ? 'bg-indigo-50/90 border-indigo-500 shadow-xs ring-1 ring-indigo-500/30'
                            : 'bg-white border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-indigo-700">{ret.code}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              HĐ: {ret.originalInvoiceCode}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-700 font-medium mt-0.5 font-mono">
                            Mã đại lý : {formatAgencyCode(ret.agencyCode, ret.agencyId)}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-bold text-emerald-700 font-mono text-sm">
                            {ret.totalRefundAmount.toLocaleString('vi-VN')} đ
                          </span>
                          <div className="text-[10px] text-slate-400">
                            {ret.approvedAt ? new Date(ret.approvedAt).toLocaleDateString('vi-VN') : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bước 2: Hiển thị preview số tiền giảm trừ theo đơn giá bán gốc */}
              {selectedReturn && (
                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 text-xs">
                      Đối soát đơn giá gốc & Số tiền giảm trừ:
                    </span>
                    <span className="font-mono font-bold text-emerald-700 text-sm">
                      {selectedReturn.totalRefundAmount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5">
                    <p>• <span className="font-mono">Mã đại lý : <strong>{formatAgencyCode(selectedReturn.agencyCode, selectedReturn.agencyId)}</strong></span></p>
                    <p>• Hóa đơn gốc: <strong>{selectedReturn.originalInvoiceCode}</strong></p>
                    <p>• Số lượng sản phẩm hoàn trả: <strong>{selectedReturn.items?.length || 0} mặt hàng</strong></p>
                  </div>
                </div>
              )}

              {/* Bước 3: Nhập lý do điều chỉnh */}
              <div>
                <label className="block font-bold text-slate-900 mb-1">
                  2. Lý do điều chỉnh giảm trừ công nợ:
                </label>
                <textarea
                  rows={2}
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Nhập lý do hạch toán chứng từ..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all font-medium"
                />
              </div>

              {/* Footer Form */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  disabled={!selectedReturn || submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang hạch toán...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận & Hạch toán giảm nợ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
