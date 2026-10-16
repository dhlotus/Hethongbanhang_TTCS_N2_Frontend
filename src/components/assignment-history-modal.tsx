import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  History,
  X,
  Search,
  ArrowRight,
  Calendar,
  User,
  Loader2,
  FileText,
} from 'lucide-react';
import { customersService, getStoredHistory } from '../services/customer.service';
import type { CustomerAssignmentHistory, SalesRepOption } from '../types/customer.types';

interface AssignmentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesReps?: SalesRepOption[];
}

/**
 * Modal hiển thị Bảng Lịch sử Chuyển giao & Phân công Địa bàn Đại lý (SN-35)
 * Tuân thủ chuẩn UI Loha Sales, Kebab-case, không dùng any, có tìm kiếm và bộ lọc NVKD
 */
export const AssignmentHistoryModal: React.FC<AssignmentHistoryModalProps> = ({
  isOpen,
  onClose,
  salesReps = [],
}) => {
  const [histories, setHistories] = useState<CustomerAssignmentHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFromRep, setSelectedFromRep] = useState<string>('ALL');
  const [selectedToRep, setSelectedToRep] = useState<string>('ALL');

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customersService.getAssignmentHistory({ limit: 100 });
      let combined = res.data || [];

      try {
        const local = getStoredHistory();
        if (local && local.length > 0) {
          const map = new Map<string, CustomerAssignmentHistory>();
          for (const item of combined) {
            map.set(item.id, item);
          }
          for (const item of local) {
            if (!map.has(item.id)) {
              map.set(item.id, item);
            }
          }
          combined = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
        }
      } catch {
        // ignore
      }

      setHistories(combined);
    } catch (err: unknown) {
      console.error('Lỗi khi tải lịch sử chuyển giao:', err);
      try {
        const local = getStoredHistory();
        setHistories(local || []);
      } catch {
        setHistories([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadHistory();
    }
  }, [isOpen, loadHistory]);

  const filteredHistories = useMemo(() => {
    return histories.filter((h) => {
      const matchSearch =
        !searchTerm.trim() ||
        h.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (h.transferBatchId && h.transferBatchId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (h.reason && h.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (h.performedByName && h.performedByName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchFrom =
        selectedFromRep === 'ALL' ||
        h.fromSalesRepId === selectedFromRep;

      const matchTo =
        selectedToRep === 'ALL' ||
        h.toSalesRepId === selectedToRep;

      return matchSearch && matchFrom && matchTo;
    });
  }, [histories, searchTerm, selectedFromRep, selectedToRep]);

  if (!isOpen) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Lịch sử Chuyển giao & Phân công Địa bàn
              </h2>
              <p className="text-xs text-slate-500">
                Toàn bộ dữ liệu bàn giao khách hàng đại lý và phân công NVKD phụ trách
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-white shrink-0 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã đại lý, tên, lý do, người tạo..."
                className="w-full pl-9.5 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>

            {/* Filter From Sales Rep */}
            <div className="relative">
              <select
                value={selectedFromRep}
                onChange={(e) => setSelectedFromRep(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
              >
                <option value="ALL">-- Tất cả người bàn giao --</option>
                {salesReps.map((rep) => (
                  <option key={`from-${rep.id}`} value={rep.id}>
                    Từ: {rep.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter To Sales Rep */}
            <div className="relative">
              <select
                value={selectedToRep}
                onChange={(e) => setSelectedToRep(e.target.value)}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 focus:bg-white transition-all"
              >
                <option value="ALL">-- Tất cả người tiếp nhận --</option>
                {salesReps.map((rep) => (
                  <option key={`to-${rep.id}`} value={rep.id}>
                    Đến: {rep.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm">Đang tải dữ liệu lịch sử...</p>
            </div>
          ) : filteredHistories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              <FileText className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-600">Chưa có bản ghi lịch sử nào</p>
              <p className="text-xs text-slate-400 mt-1">
                Các đợt phân công hoặc chuyển giao địa bàn sẽ được tự động ghi lại tại đây.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
                    <th className="py-3 px-4">Thời gian & Mã lô</th>
                    <th className="py-3 px-4">Đại lý</th>
                    <th className="py-3 px-4">Chuyển giao nhân sự</th>
                    <th className="py-3 px-4">Lý do & Ghi chú</th>
                    <th className="py-3 px-4">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistories.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Thời gian & Mã lô */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                        {item.transferBatchId && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {item.transferBatchId}
                          </span>
                        )}
                      </td>

                      {/* Đại lý */}
                      <td className="py-3 px-4 align-top">
                        <div className="font-semibold text-slate-800">{item.customerName}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.customerCode}
                          </span>
                          {item.region && (
                            <span className="text-[11px] text-slate-500">{item.region}</span>
                          )}
                        </div>
                      </td>

                      {/* Chuyển giao nhân sự */}
                      <td className="py-3 px-4 align-top">
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className={`px-2 py-0.5 rounded font-medium ${
                            item.fromSalesRepName ? 'bg-slate-100 text-slate-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {item.fromSalesRepName || 'Chưa gán'}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {item.toSalesRepName}
                          </span>
                        </div>
                      </td>

                      {/* Lý do & Ghi chú */}
                      <td className="py-3 px-4 align-top max-w-xs">
                        <p className="text-slate-800 font-medium text-xs line-clamp-2">
                          {item.reason}
                        </p>
                        {item.notes && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-1">
                            Ghi chú: {item.notes}
                          </p>
                        )}
                      </td>

                      {/* Người thực hiện */}
                      <td className="py-3 px-4 align-top whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.performedByName || 'Hệ thống'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 shrink-0">
          <span className="text-xs text-slate-500">
            Tổng cộng: <strong className="text-slate-800">{filteredHistories.length}</strong> bản ghi lịch sử
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
