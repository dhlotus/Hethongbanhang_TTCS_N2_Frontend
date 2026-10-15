import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowRightLeft,
  AlertTriangle,
  MapPin,
  Loader2,
  Building,
} from 'lucide-react';
import { customersService } from '../services/customers.service';
import { toast } from './toast';
import type { Customer, SalesRepOption, BulkTransferResult } from '../types/customer';

interface BulkTransferTerritoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  allCustomers: Customer[];
  salesReps: SalesRepOption[];
  preselectedFromRepId?: string;
  onSuccess: (result: BulkTransferResult) => void;
}

/**
 * Modal Chuyển giao Địa bàn Hàng loạt khi Nhân viên Nghỉ việc (SN-35)
 * - Cho phép chọn nhân sự chuyển giao và nhân sự tiếp nhận
 * - Danh sách đại lý tự động lọc theo nhân sự chuyển giao với checkbox chọn linh hoạt
 * - Bắt buộc nhập lý do chuyển giao để ghi vết lịch sử
 * - Phản hồi và lưu lịch sử bàn giao chi tiết
 */
export const BulkTransferTerritoryModal: React.FC<BulkTransferTerritoryModalProps> = ({
  isOpen,
  onClose,
  allCustomers,
  salesReps,
  preselectedFromRepId,
  onSuccess,
}) => {
  const [fromSalesRepId, setFromSalesRepId] = useState<string>('');
  const [toSalesRepId, setToSalesRepId] = useState<string>('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [assignedCustomers, setAssignedCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);

  // Khởi tạo nhân sự ban đầu
  useEffect(() => {
    if (isOpen) {
      const initialFrom = preselectedFromRepId || (salesReps.length > 0 ? salesReps[0].id : '');
      setFromSalesRepId(initialFrom);
      // Gợi ý nhân sự tiếp nhận khác với nhân sự chuyển giao
      const initialTo = salesReps.find((r) => r.id !== initialFrom)?.id || '';
      setToSalesRepId(initialTo);
      setReason('');
      setNotes('');
      setErrorMessage(null);
    }
  }, [isOpen, preselectedFromRepId, salesReps]);

  // Tải toàn bộ danh sách đại lý của nhân sự chuyển giao (không bị giới hạn phân trang 10 dòng)
  useEffect(() => {
    let isMounted = true;
    if (!fromSalesRepId) {
      setAssignedCustomers([]);
      return;
    }

    const fetchAssigned = async () => {
      try {
        setLoadingCustomers(true);
        const res = await customersService.getCustomers({
          salesRepId: fromSalesRepId,
          limit: 100,
        });
        if (isMounted) {
          if (res.data && res.data.length > 0) {
            setAssignedCustomers(res.data);
          } else {
            const fallback = allCustomers.filter((c) => c.salesRepId === fromSalesRepId);
            setAssignedCustomers(fallback);
          }
        }
      } catch (err: unknown) {
        console.error('Lỗi khi tải danh sách đại lý của nhân viên:', err);
        if (isMounted) {
          const fallback = allCustomers.filter((c) => c.salesRepId === fromSalesRepId);
          setAssignedCustomers(fallback);
        }
      } finally {
        if (isMounted) {
          setLoadingCustomers(false);
        }
      }
    };

    if (isOpen) {
      void fetchAssigned();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, fromSalesRepId, allCustomers]);

  // Mặc định chọn tất cả đại lý của nhân sự chuyển giao khi danh sách đại lý thay đổi
  useEffect(() => {
    setSelectedCustomerIds(assignedCustomers.map((c) => c.id));
  }, [assignedCustomers]);

  if (!isOpen) return null;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCustomerIds(assignedCustomers.map((c) => c.id));
    } else {
      setSelectedCustomerIds([]);
    }
  };

  const handleToggleCustomer = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromSalesRepId) {
      setErrorMessage('Vui lòng chọn nhân viên kinh doanh chuyển giao');
      return;
    }
    if (!toSalesRepId) {
      setErrorMessage('Vui lòng chọn nhân viên kinh doanh tiếp nhận');
      return;
    }
    if (fromSalesRepId === toSalesRepId) {
      setErrorMessage('Nhân viên chuyển giao và nhân viên tiếp nhận không được trùng nhau');
      return;
    }
    if (selectedCustomerIds.length === 0) {
      setErrorMessage('Vui lòng tích chọn ít nhất một đại lý cần chuyển giao');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('Bắt buộc phải nhập lý do chuyển giao địa bàn');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const result = await customersService.bulkTransferTerritory({
        fromSalesRepId,
        toSalesRepId,
        customerIds: selectedCustomerIds,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });

      const toName = result.toSalesRep.fullName || result.toSalesRep.name || 'nhân sự tiếp nhận';
      toast.success(
        `Đã chuyển giao thành công ${result.transferredCount} đại lý cho ${toName}!`,
      );
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi chuyển giao địa bàn';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fromRep = salesReps.find((r) => r.id === fromSalesRepId);
  const toRep = salesReps.find((r) => r.id === toSalesRepId);
  const isAllSelected =
    assignedCustomers.length > 0 && selectedCustomerIds.length === assignedCustomers.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Chuyển Giao Địa Bàn Hàng Loạt (SN-35)
              </h3>
              <p className="text-xs text-slate-500">
                Bàn giao quyền quản lý đại lý khi nhân sự nghỉ việc hoặc điều chuyển khu vực
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Modal Body Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Khối Lựa chọn 2 Nhân sự Chuyển giao & Tiếp nhận */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70">
            {/* Nhân sự chuyển giao */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Nhân viên chuyển giao <span className="text-rose-500">*</span>
              </label>
              <select
                value={fromSalesRepId}
                onChange={(e) => {
                  const newFrom = e.target.value;
                  setFromSalesRepId(newFrom);
                  if (toSalesRepId === newFrom) {
                    const nextTo = salesReps.find((r) => r.id !== newFrom)?.id || '';
                    setToSalesRepId(nextTo);
                  }
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                required
              >
                <option value="">-- Chọn nhân viên chuyển giao --</option>
                {salesReps.map((rep) => (
                  <option key={rep.id} value={rep.id}>
                    {rep.fullName} ({rep.assignedCustomerCount !== undefined ? `${rep.assignedCustomerCount} đại lý` : rep.email})
                  </option>
                ))}
              </select>
              {fromRep && (
                <div className="mt-1.5 text-xs text-slate-500 flex items-center justify-between">
                  <span>Đang phụ trách:</span>
                  <span className="font-semibold text-indigo-600">
                    {loadingCustomers ? 'Đang tải...' : `${assignedCustomers.length} đại lý`}
                  </span>
                </div>
              )}
            </div>

            {/* Nhân sự tiếp nhận */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Nhân viên tiếp nhận <span className="text-rose-500">*</span>
              </label>
              <select
                value={toSalesRepId}
                onChange={(e) => setToSalesRepId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
                required
              >
                <option value="">-- Chọn nhân viên tiếp nhận --</option>
                {salesReps
                  .filter((rep) => rep.id !== fromSalesRepId)
                  .map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.fullName} ({rep.assignedCustomerCount !== undefined ? `${rep.assignedCustomerCount} đại lý` : rep.email})
                    </option>
                  ))}
              </select>
              {toRep && (
                <div className="mt-1.5 text-xs text-slate-500 flex items-center justify-between">
                  <span>Số điện thoại:</span>
                  <span className="font-semibold text-slate-700">
                    {toRep.phone || 'Chưa cập nhật'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Danh sách đại lý cần chuyển giao */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                <span>Danh sách đại lý bàn giao</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-2xs bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {selectedCustomerIds.length} / {assignedCustomers.length}
                </span>
              </label>
              {!loadingCustomers && assignedCustomers.length > 0 && (
                <label className="flex items-center gap-1.5 text-xs text-indigo-600 cursor-pointer font-medium hover:underline">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Chọn tất cả</span>
                </label>
              )}
            </div>

            {loadingCustomers ? (
              <div className="p-8 flex flex-col items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                <span>Đang tải danh sách đại lý của nhân viên kinh doanh...</span>
              </div>
            ) : assignedCustomers.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs">
                Nhân viên này hiện chưa được phân công phụ trách đại lý nào.
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white shadow-2xs">
                {assignedCustomers.map((cust) => {
                  const isChecked = selectedCustomerIds.includes(cust.id);
                  return (
                    <div
                      key={cust.id}
                      onClick={() => handleToggleCustomer(cust.id)}
                      className={`flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isChecked ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleCustomer(cust.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-800 truncate">
                              {cust.name}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.2 text-2xs font-medium rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                              {cust.code}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-2xs text-slate-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {cust.region}
                            </span>
                            <span>SĐT: {cust.phone}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 text-xs">
                        <div className="text-2xs text-slate-400">Dư nợ hiện tại</div>
                        <div className="font-semibold text-slate-700">
                          {new Intl.NumberFormat('vi-VN', {
                            style: 'currency',
                            currency: 'VND',
                          }).format(cust.currentDebt)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Lý do chuyển giao (Bắt buộc) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Lý do chuyển giao địa bàn <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ví dụ: Nhân sự Trần Văn Nam nghỉ việc theo quyết định số 45/QĐ-NS..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              required
            />
            <p className="mt-1 text-2xs text-slate-400">
              Lý do này sẽ được ghi nhận vào Sổ Lịch sử chuyển giao địa bàn để phục vụ kiểm toán nội bộ.
            </p>
          </div>

          {/* Ghi chú bàn giao */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Ghi chú công việc / Biên bản bàn giao đính kèm
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Đã bàn giao danh bạ khách hàng, biên bản đối soát công nợ và lịch thăm đại lý tuần..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors resize-none"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              Chuyển giao: <strong className="text-indigo-600">{selectedCustomerIds.length}</strong> đại lý
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:outline-none transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting || selectedCustomerIds.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang chuyển giao...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Xác nhận chuyển giao ({selectedCustomerIds.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
