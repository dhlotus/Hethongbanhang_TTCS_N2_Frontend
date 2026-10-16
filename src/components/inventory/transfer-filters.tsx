import React from 'react';
import { Search } from 'lucide-react';
import type { TransferStatus } from '../../types/internal-transfer.types';
import type { Warehouse } from '../../types/warehouse.types';

interface TransferFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedStatus: TransferStatus | 'ALL';
  onStatusChange: (status: TransferStatus | 'ALL') => void;
  fromWarehouseFilter: string;
  onFromWarehouseChange: (whId: string) => void;
  toWarehouseFilter: string;
  onToWarehouseChange: (whId: string) => void;
  warehouses: Warehouse[];
}

/**
 * Component bộ lọc và tìm kiếm danh sách chuyển kho nội bộ (SN-181)
 */
export const TransferFilters: React.FC<TransferFiltersProps> = ({
  searchTerm,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  fromWarehouseFilter,
  onFromWarehouseChange,
  toWarehouseFilter,
  onToWarehouseChange,
  warehouses,
}) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Ô tìm kiếm */}
        <div className="md:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo mã phiếu, kho xuất, kho nhập, mã SKU..."
            className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Lọc trạng thái */}
        <div className="md:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value as TransferStatus | 'ALL')}
            className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-all"
          >
            <option value="IN_TRANSIT">Đang vận chuyển (IN_TRANSIT)</option>
            <option value="ALL">Tất cả trạng thái</option>
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
            onChange={(e) => onFromWarehouseChange(e.target.value)}
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
            onChange={(e) => onToWarehouseChange(e.target.value)}
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
  );
};
