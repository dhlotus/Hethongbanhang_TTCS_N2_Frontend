import React, { useState } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Receipt,
  FileSpreadsheet,
  Calendar,
} from 'lucide-react';

/**
 * Trang Hóa đơn & Công nợ:
 * Đảm bảo đầy đủ khung Bộ lọc, Tiêu đề bảng và Empty State chuẩn UI/UX cho mọi vai trò (kể cả Admin khi chưa có dữ liệu)
 */
export const InvoicesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 400);
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang & Nút chức năng */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Quản Lý Hóa Đơn & Công Nợ
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi danh sách hóa đơn bán hàng, kỳ hạn thanh toán và đối soát công nợ đại lý
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* Thanh bộ lọc (Filter Toolbar) */}
      <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Tìm kiếm */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo số hóa đơn, tên đại lý hoặc mã khách hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:border-[var(--color-primary)] bg-slate-50/50"
          />
        </div>

        {/* Lọc trạng thái */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
            <Filter className="h-3.5 w-3.5" />
            <span>Trạng thái:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="UNPAID">Chưa thanh toán</option>
            <option value="PARTIAL">Thanh toán một phần</option>
            <option value="PAID">Đã thanh toán đủ</option>
            <option value="OVERDUE">Quá hạn nợ</option>
          </select>
        </div>

        {/* Lọc thời gian */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
            <Calendar className="h-3.5 w-3.5" />
            <span>Kỳ hạn:</span>
          </div>
          <select
            defaultValue="ALL_TIME"
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20"
          >
            <option value="ALL_TIME">Toàn bộ thời gian</option>
            <option value="THIS_MONTH">Tháng này</option>
            <option value="LAST_MONTH">Tháng trước</option>
            <option value="THIS_QUARTER">Quý này</option>
          </select>
        </div>
      </div>

      {/* Bảng dữ liệu bảo toàn khung & Empty State */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Số hóa đơn</th>
                <th className="py-3 px-4">Đại lý / Khách hàng</th>
                <th className="py-3 px-4">Ngày phát hành</th>
                <th className="py-3 px-4">Hạn thanh toán</th>
                <th className="py-3 px-4 text-right">Tổng tiền</th>
                <th className="py-3 px-4 text-right">Đã thanh toán</th>
                <th className="py-3 px-4 text-right">Còn nợ</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {/* Giữ nguyên khung bảng, hiển thị Empty State bên trong */}
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                      <Receipt className="h-7 w-7 text-slate-400" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">
                      Chưa có hóa đơn nào
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Hiện tại hệ thống chưa ghi nhận hóa đơn bán hàng hoặc chứng từ công nợ nào
                      phù hợp với điều kiện tìm kiếm.
                    </p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
