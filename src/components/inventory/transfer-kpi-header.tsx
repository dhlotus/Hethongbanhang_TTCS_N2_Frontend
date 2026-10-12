import React from 'react';
import {
  Layers,
  Truck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { TransferStatus } from '../../types/internal-transfer.types';

interface TransferKpiHeaderProps {
  stats: {
    total: number;
    inTransit: number;
    completed: number;
    partial: number;
  };
  selectedStatus: TransferStatus | 'ALL';
  onSelectStatus: (status: TransferStatus | 'ALL') => void;
}

/**
 * Component hiển thị 4 thẻ thống kê KPI chuyển kho nội bộ (SN-181)
 */
export const TransferKpiHeader: React.FC<TransferKpiHeaderProps> = ({
  stats,
  selectedStatus,
  onSelectStatus,
}) => {
  return (
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
        onClick={() => onSelectStatus(selectedStatus === 'IN_TRANSIT' ? 'ALL' : 'IN_TRANSIT')}
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
        onClick={() => onSelectStatus(selectedStatus === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
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
          onSelectStatus(selectedStatus === 'PARTIALLY_RECEIVED' ? 'ALL' : 'PARTIALLY_RECEIVED')
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
  );
};
