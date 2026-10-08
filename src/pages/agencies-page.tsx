import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Building2,
  Store,
  MapPin,
  Phone,
  Eye,
  X,
  CreditCard,
} from 'lucide-react';
import { DEMO_CUSTOMERS } from '../services/orders.service';
import type { CustomerOption } from '../types/order';

const formatCurrency = (val?: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

const GROUP_TABS = [
  { key: 'ALL', label: 'Tất cả Đại lý' },
  { key: 'AGENT_LEVEL_1', label: 'Đại lý Cấp 1' },
  { key: 'AGENT_LEVEL_2', label: 'Đại lý Cấp 2' },
  { key: 'RETAIL', label: 'Bán lẻ Niêm yết' },
];

export const AgenciesPage: React.FC = () => {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<CustomerOption | null>(null);

  // Lọc dữ liệu đại lý
  const filteredAgencies = useMemo(() => {
    return DEMO_CUSTOMERS.filter((item) => {
      const matchGroup = selectedGroup === 'ALL' || item.group === selectedGroup;
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        Boolean(item.phone && item.phone.includes(q)) ||
        Boolean(item.address && item.address.toLowerCase().includes(q));
      return matchGroup && matchSearch;
    });
  }, [selectedGroup, searchTerm]);

  // Thống kê metrics
  const metrics = useMemo(() => {
    const total = DEMO_CUSTOMERS.length;
    const level1 = DEMO_CUSTOMERS.filter((c) => c.group === 'AGENT_LEVEL_1').length;
    const level2 = DEMO_CUSTOMERS.filter((c) => c.group === 'AGENT_LEVEL_2').length;
    const retail = DEMO_CUSTOMERS.filter((c) => c.group === 'RETAIL').length;
    return { total, level1, level2, retail };
  }, []);

  const renderGroupBadge = (group: string) => {
    switch (group) {
      case 'AGENT_LEVEL_1':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-700/20">
            Đại lý Cấp 1
          </span>
        );
      case 'AGENT_LEVEL_2':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-700/20">
            Đại lý Cấp 2
          </span>
        );
      case 'RETAIL':
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-700/20">
            Bán lẻ Niêm yết
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Metrics: 4 Thẻ chỉ số tổng quan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/10 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {metrics.total}
            </div>
            <div className="text-xs font-medium text-slate-500">Tổng số đại lý</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/10 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-indigo-700 tracking-tight">
              {metrics.level1}
            </div>
            <div className="text-xs font-medium text-slate-500">Đại lý Cấp 1</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-500/10 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-sky-700 tracking-tight">
              {metrics.level2}
            </div>
            <div className="text-xs font-medium text-slate-500">Đại lý Cấp 2</div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/10 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-emerald-700 tracking-tight">
              {metrics.retail}
            </div>
            <div className="text-xs font-medium text-slate-500">Bán lẻ Niêm yết</div>
          </div>
        </div>
      </div>

      {/* 2. Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-4">
        {/* Tabs Nhóm Đại Lý */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 text-xs">
          {GROUP_TABS.map((tab) => {
            const isActive = selectedGroup === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setSelectedGroup(tab.key)}
                className={`px-3.5 py-2 rounded-xl font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Ô Tìm kiếm */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã, tên đại lý, số điện thoại hoặc địa chỉ..."
            className="w-full pl-9.5 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Bảng Dữ liệu Đại Lý */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div
          className="overflow-auto max-h-[calc(100vh-270px)] [scrollbar-width:thin] [scrollbar-color:#E5E7EB_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#E5E7EB] hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}
        >
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead>
              <tr className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="sticky top-0 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-12 text-center">
                  STT
                </th>
                <th className="sticky top-0 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-28">
                  Mã đại lý
                </th>
                <th className="sticky top-0 bg-slate-50 border-b border-slate-200/80 py-3 px-4 min-w-[240px]">
                  Tên đại lý
                </th>
                <th className="sticky top-0 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-36">
                  Cấp đại lý
                </th>
                <th className="sticky top-0 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-32">
                  Số điện thoại
                </th>
                <th className="sticky top-0 bg-slate-50 border-b border-slate-200/80 py-3 px-4 min-w-[220px]">
                  Địa chỉ
                </th>
                <th className="sticky top-0 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-36 text-right">
                  Hạn mức tín dụng
                </th>
                <th className="sticky top-0 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-36 text-right">
                  Công nợ hiện tại
                </th>
                <th className="sticky top-0 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-28 text-center">
                  Trạng thái
                </th>
                <th className="sticky top-0 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-20 text-center">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredAgencies.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Không tìm thấy đại lý nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredAgencies.map((agency, idx) => (
                  <tr
                    key={agency.id}
                    className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                    onClick={() => setSelectedAgency(agency)}
                  >
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {agency.code}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {agency.name}
                    </td>
                    <td className="py-3 px-4">{renderGroupBadge(agency.group)}</td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {agency.phone}
                    </td>
                    <td className="py-3 px-4 text-slate-600 truncate max-w-xs" title={agency.address}>
                      {agency.address}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {formatCurrency(agency.creditLimit)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-amber-700">
                      {formatCurrency(agency.currentDebt)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Đang hoạt động
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedAgency(agency)}
                        className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Xem chi tiết đại lý"
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

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/60 text-xs text-slate-500 flex items-center justify-between">
          <span>
            Hiển thị <strong>{filteredAgencies.length}</strong> trên tổng số <strong>{DEMO_CUSTOMERS.length}</strong> đại lý
          </span>
        </div>
      </div>

      {/* 4. Modal Xem Chi Tiết Đại Lý */}
      {selectedAgency && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-500/10">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chi tiết Đại lý</h3>
                  <p className="text-xs text-slate-500">{selectedAgency.code}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgency(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-medium block mb-0.5">Tên doanh nghiệp / Đại lý</label>
                <p className="text-sm font-bold text-slate-900">{selectedAgency.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="text-slate-400 font-medium block mb-0.5">Cấp đại lý</label>
                  <div>{renderGroupBadge(selectedAgency.group)}</div>
                </div>
                <div>
                  <label className="text-slate-400 font-medium block mb-0.5">Số điện thoại</label>
                  <p className="font-semibold text-slate-800 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {selectedAgency.phone}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <label className="text-slate-400 font-medium block mb-0.5">Địa chỉ trụ sở</label>
                <p className="text-slate-700 font-medium flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  {selectedAgency.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <label className="text-slate-400 font-medium block mb-0.5">Hạn mức tín dụng</label>
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-1">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    {formatCurrency(selectedAgency.creditLimit)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80">
                  <label className="text-amber-800 font-medium block mb-0.5">Công nợ hiện tại</label>
                  <p className="text-sm font-bold text-amber-900">
                    {formatCurrency(selectedAgency.currentDebt)}
                  </p>
                </div>
              </div>

              {selectedAgency.deliveryPoints && selectedAgency.deliveryPoints.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="text-slate-400 font-medium block mb-1.5">
                    Điểm giao hàng ({selectedAgency.deliveryPoints.length})
                  </label>
                  <div className="space-y-2">
                    {selectedAgency.deliveryPoints.map((dp) => (
                      <div
                        key={dp.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">{dp.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                            Mặc định
                          </span>
                        </div>
                        <p className="text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          {dp.address}
                        </p>
                        <p className="text-slate-500">
                          Người nhận: <strong>{dp.contactPerson}</strong> • SĐT: {dp.phone}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                type="button"
                onClick={() => setSelectedAgency(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
