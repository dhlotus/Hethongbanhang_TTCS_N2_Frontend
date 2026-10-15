import React, { useState, useEffect } from 'react';
import {
  X,
  ArrowRightLeft,
  AlertTriangle,
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
                Chuyển giao địa bàn hàng loạt
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
                Từ nhân viên <span className="text-rose-500">*</span>
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
            </div>

            {/* Nhân sự tiếp nhận */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                Đến nhân viên <span className="text-rose-500">*</span>
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
            </div>
          </div>

          {/* Danh sách đại lý cần chuyển giao (Cấu trúc Bảng phẳng Table/Header Layout) */}
          <div>
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
              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                {/* Table Header Bar */}
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                      title="Chọn tất cả"
                    />
                    <span className="uppercase tracking-wider text-2xs font-bold text-slate-600">
                      Danh sách đại lý ({assignedCustomers.length})
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full text-2xs bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                      {selectedCustomerIds.length}/{assignedCustomers.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(!isAllSelected)}
                      className="text-2xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline ml-1"
                    >
                      {isAllSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
                    </button>
                  </div>
                  <div className="shrink-0 text-right uppercase tracking-wider text-2xs font-bold text-slate-600 min-w-[120px]">
                    Công nợ
                  </div>
                </div>

                {/* Table Body */}
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
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
                        {/* Bên trái: [Checkbox] Tên Đại lý (Mã) • Miền Nam */}
                        <div className="flex items-center gap-2.5 min-w-0 pr-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleCustomer(cust.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                          />
                          <div className="text-xs text-slate-800 truncate">
                            <span className="font-semibold">{cust.name}</span>
                            <span className="text-slate-500 ml-1.5">({cust.code})</span>
                            {cust.region && (
                              <span className="text-slate-400 ml-1.5">• {cust.region}</span>
                            )}
                          </div>
                        </div>

                        {/* Bên phải: Số tiền nợ in đậm (đỏ nhẹ nếu nợ), thẳng hàng cột Công nợ */}
                        <div className="shrink-0 text-right min-w-[120px]">
                          <span
                            className={`text-xs font-semibold ${
                              cust.currentDebt > 0 ? 'text-rose-600' : 'text-slate-700'
                            }`}
                          >
                            {new Intl.NumberFormat('vi-VN', {
                              style: 'currency',
                              currency: 'VND',
                            }).format(cust.currentDebt)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Lý do & Ghi chú bàn giao (Bắt buộc) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Lý do & Ghi chú bàn giao <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do chuyển giao (Ví dụ: Nhân viên nghỉ việc, điều chuyển phụ trách địa bàn...)"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors resize-none"
              required
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
