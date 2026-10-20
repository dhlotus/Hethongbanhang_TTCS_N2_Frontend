import React, { useEffect, useState, useCallback } from 'react';
import {
  Target,
  Users,
  MapPin,
  Lock,
  Unlock,
  Clock,
  History,
  Edit3,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { salesTargetsService } from '../services/sales-targets.service';
import type {
  SalesTargetItem,
  SalesTargetsResponse,
  AdjustmentLogItem,
  SalesTargetType,
} from '../services/sales-targets.service';
import { getStoredUser } from '../utils/navigation';

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

export const SalesTargetsPage: React.FC = () => {
  const user = getStoredUser();
  const roles = user?.roles || [];
  const isManager = roles.some(
    (r: string) => r === 'ADMIN' || r === 'SALES_MANAGER' || r === 'BUSINESS_MANAGER',
  );

  // Kỳ tháng hiện tại YYYY-MM
  const now = new Date();
  const currentPeriodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [period, setPeriod] = useState<string>(currentPeriodStr);
  const [targetTypeFilter, setTargetTypeFilter] = useState<'ALL' | 'EMPLOYEE' | 'REGION'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [data, setData] = useState<SalesTargetsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Modal Đặt / Sửa chỉ tiêu
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingTarget, setEditingTarget] = useState<SalesTargetItem | null>(null);
  const [inputAmount, setInputAmount] = useState<number>(0);
  const [inputNote, setInputNote] = useState<string>('');
  const [inputReason, setInputReason] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Modal Tạo mới chỉ tiêu (chỉ dành cho Quản lý)
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [newPeriod, setNewPeriod] = useState<string>(currentPeriodStr);
  const [newTargetType, setNewTargetType] = useState<SalesTargetType>('EMPLOYEE');
  const [newTargetId, setNewTargetId] = useState<string>('');
  const [newTargetName, setNewTargetName] = useState<string>('');
  const [newTargetAmount, setNewTargetAmount] = useState<number>(0);
  const [newTargetNote, setNewTargetNote] = useState<string>('');

  // Modal Lịch sử điều chỉnh (Audit logs)
  const [logModalOpen, setLogModalOpen] = useState<boolean>(false);
  const [selectedTargetLogs, setSelectedTargetLogs] = useState<AdjustmentLogItem[]>([]);
  const [selectedTargetForLogs, setSelectedTargetForLogs] = useState<SalesTargetItem | null>(null);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Danh sách nhân viên & khu vực gợi ý khi tạo mới
  const employeeOptions = [
    { id: 'usr-sale-01', name: 'Trần Văn Long' },
    { id: 'usr-sales-002', name: 'Phạm Minh Hùng' },
    { id: 'usr-sale-02', name: 'Lê Thị Hoa' },
    { id: 'usr-sale-03', name: 'Phạm Minh Tuấn' },
  ];

  const regionOptions = [
    { id: 'Miền Nam', name: 'Khu vực Miền Nam' },
    { id: 'Miền Bắc', name: 'Khu vực Miền Bắc' },
    { id: 'Miền Trung', name: 'Khu vực Miền Trung' },
    { id: 'Miền Tây', name: 'Khu vực Miền Tây' },
  ];

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await salesTargetsService.getSalesTargets({
        period,
        targetType: targetTypeFilter !== 'ALL' ? targetTypeFilter : undefined,
        search: searchTerm.trim() || undefined,
      });
      setData(res);
      setLastUpdated(res.lastUpdated || new Date().toISOString());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tải chỉ tiêu doanh số';
      showToast('error', msg);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [period, targetTypeFilter, searchTerm]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Đồng bộ tiến độ ngay lập tức theo sự kiện và polling dự phòng (SN-215)
  useEffect(() => {
    // 1. Polling dự phòng 10 giây một lần (cho các thiết bị/trình duyệt khác nhau)
    const interval = setInterval(() => {
      loadData(false);
    }, 10000);

    // 2. Tự động đồng bộ khi quay lại tab trình duyệt
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        loadData(false);
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    // 3. Đồng bộ ngay lập tức trong cùng tab khi phát sinh giao dịch hoặc duyệt đơn
    const onSyncEvent = () => {
      loadData(false);
    };
    window.addEventListener('loha_orders_updated', onSyncEvent);
    window.addEventListener('loha_sales_target_sync', onSyncEvent);

    // 4. Đồng bộ ngay lập tức giữa hai phiên / hai tab khác nhau qua Storage Event
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'loha_orders_updated_sync' || e.key === 'loha_sales_target_sync') {
        loadData(false);
      }
    };
    window.addEventListener('storage', onStorage);

    // 5. Đồng bộ cực nhanh qua BroadcastChannel giữa các tab (<5ms latency)
    let broadcast: BroadcastChannel | null = null;
    try {
      broadcast = new BroadcastChannel('loha_sales_sync');
      broadcast.onmessage = () => {
        loadData(false);
      };
    } catch {}

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('loha_orders_updated', onSyncEvent);
      window.removeEventListener('loha_sales_target_sync', onSyncEvent);
      window.removeEventListener('storage', onStorage);
      if (broadcast) {
        broadcast.close();
      }
    };
  }, [loadData]);

  // Mở modal sửa chỉ tiêu
  const handleOpenEdit = (item: SalesTargetItem) => {
    setEditingTarget(item);
    setInputAmount(item.targetAmount);
    setInputNote(item.note || '');
    setInputReason('');
    setEditModalOpen(true);
  };

  // Xác nhận lưu cập nhật
  const handleSaveUpdate = async () => {
    if (!editingTarget) return;

    if (inputAmount < 0) {
      showToast('error', 'Mức chỉ tiêu không được âm');
      return;
    }

    if (editingTarget.isLocked && (!inputReason || inputReason.trim().length < 5)) {
      showToast('error', 'Kỳ chỉ tiêu đã kết thúc và bị khóa. Bắt buộc nhập lý do điều chỉnh tối thiểu 5 ký tự!');
      return;
    }

    try {
      setSaving(true);
      await salesTargetsService.updateSalesTarget(editingTarget.id, {
        targetAmount: Number(inputAmount),
        note: inputNote.trim(),
        reason: inputReason.trim() || undefined,
      });
      showToast('success', 'Đã cập nhật chỉ tiêu doanh số thành công');
      setEditModalOpen(false);
      loadData(false);

      // Phát sự kiện đồng bộ ngay lập tức tới tất cả các tab khác
      try {
        localStorage.setItem('loha_sales_target_sync', Date.now().toString());
        window.dispatchEvent(new CustomEvent('loha_sales_target_sync'));
        const ch = new BroadcastChannel('loha_sales_sync');
        ch.postMessage({ type: 'TARGET_UPDATED' });
        ch.close();
      } catch {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi cập nhật chỉ tiêu';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setNewPeriod(period);
    setNewTargetType('EMPLOYEE');
    setNewTargetId(employeeOptions[0].id);
    setNewTargetName(employeeOptions[0].name);
    setNewTargetAmount(100000000);
    setNewTargetNote('');
    setCreateModalOpen(true);
  };

  // Xác nhận tạo mới
  const handleSaveCreate = async () => {
    if (!newTargetId || !newTargetName) {
      showToast('error', 'Vui lòng chọn đối tượng giao chỉ tiêu');
      return;
    }
    if (newTargetAmount <= 0) {
      showToast('error', 'Vui lòng nhập mức chỉ tiêu lớn hơn 0');
      return;
    }

    try {
      setSaving(true);
      await salesTargetsService.createSalesTarget({
        period: newPeriod,
        targetType: newTargetType,
        targetId: newTargetId,
        targetName: newTargetName,
        targetAmount: Number(newTargetAmount),
        note: newTargetNote.trim() || undefined,
      });
      showToast('success', 'Đã đặt chỉ tiêu mới thành công');
      setCreateModalOpen(false);
      loadData(false);

      // Phát sự kiện đồng bộ ngay lập tức tới tất cả các tab khác
      try {
        localStorage.setItem('loha_sales_target_sync', Date.now().toString());
        window.dispatchEvent(new CustomEvent('loha_sales_target_sync'));
        const ch = new BroadcastChannel('loha_sales_sync');
        ch.postMessage({ type: 'TARGET_CREATED' });
        ch.close();
      } catch {}
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi tạo chỉ tiêu';
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  // Mở modal xem lịch sử nhật ký điều chỉnh
  const handleOpenLogs = async (item: SalesTargetItem) => {
    setSelectedTargetForLogs(item);
    setLogModalOpen(true);
    setLoadingLogs(true);
    try {
      const logs = await salesTargetsService.getAdjustmentLogs(item.id);
      setSelectedTargetLogs(logs);
    } catch {
      setSelectedTargetLogs([]);
    } finally {
      setLoadingLogs(false);
    }
  };

  const summary = data?.summary;
  const items = data?.items || [];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* ── HEADER & TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Target className="h-6 w-6 text-indigo-600 shrink-0" />
            <span>Chỉ tiêu doanh số & Tiến độ thực tế</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isManager
              ? 'Thiết lập mục tiêu kinh doanh theo tháng cho từng nhân viên và khu vực thị trường'
              : 'Theo dõi tiến độ đạt mục tiêu doanh số cá nhân theo thời gian thực'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Badge Trạng thái kỳ */}
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              summary?.isPeriodLocked
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            {summary?.isPeriodLocked ? (
              <>
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span>Kỳ đã khóa (chỉnh sửa cần lý do)</span>
              </>
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5 text-emerald-600" />
                <span>Kỳ đang diễn ra</span>
              </>
            )}
          </div>

          {/* Nút đặt chỉ tiêu mới (Chỉ quản lý) */}
          {isManager && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3.5 py-2 text-xs sm:text-sm font-semibold shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Giao chỉ tiêu mới</span>
            </button>
          )}

          {/* Nút Refresh */}
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
            title="Làm mới số liệu"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* ── BỘ LỌC THÁNG & PHẠM VI (Quản lý) ── */}
      {isManager && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Lọc kỳ tháng */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Kỳ tháng:</span>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="text-xs sm:text-sm rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Phân loại phạm vi (Tất cả / Nhân viên / Khu vực) */}
            <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg p-1 bg-slate-50">
              {(
                [
                  { key: 'ALL', label: 'Tất cả' },
                  { key: 'EMPLOYEE', label: 'Cá nhân nhân viên' },
                  { key: 'REGION', label: 'Khu vực thị trường' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTargetTypeFilter(tab.key)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                    targetTypeFilter === tab.key
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Ô tìm kiếm tên đối tượng */}
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm nhân viên hoặc khu vực..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── THẺ TỔNG HỢP TIẾN ĐỘ KHÔNG CỘNG TRÙNG (SN-215) ── */}
      {isManager && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cụm 1: Chỉ tiêu Cá nhân Nhân viên */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tổng hợp Chỉ tiêu Nhân viên</h3>
                  <p className="text-xs text-slate-500">Phạm vi: Toàn bộ nhân viên kinh doanh</p>
                </div>
              </div>
              {summary.employeeCompletionRate !== null && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    summary.employeeCompletionRate >= 100
                      ? 'bg-emerald-100 text-emerald-800'
                      : summary.employeeCompletionRate >= 80
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Đạt {summary.employeeCompletionRate}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <div className="text-xs text-slate-500">Mục tiêu giao:</div>
                <div className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                  {formatCurrency(summary.totalEmployeeTarget)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Doanh số thực tế:</div>
                <div className="text-base sm:text-lg font-bold text-blue-700 tabular-nums">
                  {formatCurrency(summary.totalEmployeeActual)}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (summary.employeeCompletionRate || 0) >= 100
                    ? 'bg-emerald-500'
                    : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(summary.employeeCompletionRate || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* Cụm 2: Chỉ tiêu Khu vực Thị trường */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Tổng hợp Chỉ tiêu Khu vực</h3>
                  <p className="text-xs text-slate-500">Phạm vi: Phân bổ theo 4 cụm địa bàn</p>
                </div>
              </div>
              {summary.regionCompletionRate !== null && (
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    summary.regionCompletionRate >= 100
                      ? 'bg-emerald-100 text-emerald-800'
                      : summary.regionCompletionRate >= 80
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Đạt {summary.regionCompletionRate}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <div className="text-xs text-slate-500">Mục tiêu giao:</div>
                <div className="text-base sm:text-lg font-bold text-slate-900 tabular-nums">
                  {formatCurrency(summary.totalRegionTarget)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Doanh số thực tế:</div>
                <div className="text-base sm:text-lg font-bold text-emerald-700 tabular-nums">
                  {formatCurrency(summary.totalRegionActual)}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (summary.regionCompletionRate || 0) >= 100
                    ? 'bg-emerald-500'
                    : 'bg-emerald-600'
                }`}
                style={{ width: `${Math.min(summary.regionCompletionRate || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── DANH SÁCH CHỈ TIÊU & TIẾN ĐỘ ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
            <span>Chi tiết tiến độ từng đối tượng</span>
            <span className="text-xs font-normal text-slate-400">({items.length} bản ghi)</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Đồng bộ: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString('vi-VN') : '—'}</span>
          </div>
        </div>

        {items.length > 0 ? (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold">
                    <th className="py-3 px-4">Đối tượng</th>
                    <th className="py-3 px-4">Phạm vi</th>
                    <th className="py-3 px-4 text-right">Chỉ tiêu (VNĐ)</th>
                    <th className="py-3 px-4 text-right">Doanh số thực tế</th>
                    <th className="py-3 px-4 text-center">Tỷ lệ hoàn thành</th>
                    <th className="py-3 px-4 text-right">Chênh lệch</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    {isManager && <th className="py-3 px-4 text-center">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => {
                    const hasTarget = item.targetAmount > 0;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            {item.targetType === 'EMPLOYEE' ? (
                              <Users className="h-4 w-4 text-blue-500 shrink-0" />
                            ) : (
                              <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                            )}
                            <div>
                              <div>{item.targetName}</div>
                              {item.note && <div className="text-[11px] text-slate-400 font-normal">{item.note}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${
                              item.targetType === 'EMPLOYEE'
                                ? 'bg-blue-50 text-blue-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {item.targetType === 'EMPLOYEE' ? 'Cá nhân' : 'Khu vực'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 tabular-nums">
                          {hasTarget ? (
                            formatCurrency(item.targetAmount)
                          ) : (
                            <span className="text-slate-400 font-normal">Chưa giao</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-indigo-700 tabular-nums">
                          {formatCurrency(item.actualAmount)}
                          <div className="text-[11px] text-slate-400 font-normal">{item.ordersCount} đơn hàng</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {hasTarget && item.completionRate !== null ? (
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${
                                  item.completionRate >= 100
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.completionRate >= 80
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {item.completionRate}%
                              </span>
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    item.completionRate >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${Math.min(item.completionRate, 100)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold tabular-nums">
                          {hasTarget ? (
                            item.isExceeded ? (
                              <span className="text-emerald-600">
                                +{formatCurrency(item.shortageOrExcess)} (Vượt)
                              </span>
                            ) : (
                              <span className="text-rose-600">
                                -{formatCurrency(Math.abs(item.shortageOrExcess))} (Thiếu)
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {item.isLocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Lock className="h-3 w-3" />
                              <span>Đã khóa</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Unlock className="h-3 w-3" />
                              <span>Mở</span>
                            </span>
                          )}
                        </td>
                        {isManager && (
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
                                title="Chỉnh sửa chỉ tiêu"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>Sửa</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenLogs(item)}
                                className="text-slate-500 hover:text-slate-700 font-semibold inline-flex items-center gap-1"
                                title="Xem lịch sử điều chỉnh"
                              >
                                <History className="h-3.5 w-3.5" />
                                <span>Nhật ký</span>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View (Tối ưu màn hình hẹp 320px - 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {items.map((item) => {
                const hasTarget = item.targetAmount > 0;
                return (
                  <div key={item.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {item.targetType === 'EMPLOYEE' ? (
                          <Users className="h-4 w-4 text-blue-500 shrink-0" />
                        ) : (
                          <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                        )}
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{item.targetName}</div>
                          <div className="text-[11px] text-slate-400">
                            {item.targetType === 'EMPLOYEE' ? 'Chỉ tiêu Cá nhân' : 'Chỉ tiêu Khu vực'}
                            {item.note && ` • ${item.note}`}
                          </div>
                        </div>
                      </div>

                      {item.isLocked ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 shrink-0">
                          <Lock className="h-3 w-3" />
                          <span>Đã khóa</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 shrink-0">
                          <Unlock className="h-3 w-3" />
                          <span>Mở</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs">
                      <div>
                        <div className="text-slate-400 text-[11px]">Mục tiêu giao:</div>
                        <div className="font-bold text-slate-900 tabular-nums">
                          {hasTarget ? formatCurrency(item.targetAmount) : 'Chưa giao'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[11px]">Doanh số thực hiện:</div>
                        <div className="font-bold text-indigo-700 tabular-nums">
                          {formatCurrency(item.actualAmount)}
                        </div>
                      </div>
                    </div>

                    {/* Progress & Chênh lệch */}
                    {hasTarget && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">Tỷ lệ hoàn thành:</span>
                          <span
                            className={`font-bold ${
                              (item.completionRate || 0) >= 100
                                ? 'text-emerald-600'
                                : 'text-blue-600'
                            }`}
                          >
                            {item.completionRate}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              (item.completionRate || 0) >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(item.completionRate || 0, 100)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-slate-400">{item.ordersCount} đơn phát sinh</span>
                          {item.isExceeded ? (
                            <span className="text-emerald-600 font-semibold">
                              Vượt {formatCurrency(item.shortageOrExcess)}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-semibold">
                              Còn thiếu {formatCurrency(Math.abs(item.shortageOrExcess))}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {isManager && (
                      <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleOpenLogs(item)}
                          className="text-slate-500 hover:text-slate-700 text-xs font-semibold flex items-center gap-1 py-1"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>Nhật ký</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold flex items-center gap-1 py-1"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Chỉnh sửa</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-sm text-slate-500">
            Không tìm thấy bản ghi chỉ tiêu nào phù hợp với điều kiện lọc.
          </div>
        )}
      </div>

      {/* ── MODAL SỬA CHỈ TIÊU (Bắt buộc lý do nếu kỳ đã khóa - SN-215) ── */}
      {editModalOpen && editingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                Điều chỉnh chỉ tiêu doanh số
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thông tin đối tượng */}
            <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs">
              <div>
                <span className="text-slate-500">Kỳ áp dụng:</span>{' '}
                <span className="font-semibold text-slate-900">{editingTarget.period}</span>
              </div>
              <div>
                <span className="text-slate-500">Đối tượng:</span>{' '}
                <span className="font-semibold text-slate-900">{editingTarget.targetName}</span>
              </div>
              <div>
                <span className="text-slate-500">Mức chỉ tiêu hiện tại:</span>{' '}
                <span className="font-bold text-indigo-700">{formatCurrency(editingTarget.targetAmount)}</span>
              </div>
              {editingTarget.isLocked && (
                <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>Kỳ này đã kết thúc và bị khóa. Thao tác điều chỉnh bắt buộc phải nhập lý do giải trình.</span>
                </div>
              )}
            </div>

            {/* Form sửa */}
            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mức chỉ tiêu mới (VNĐ) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000000"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={inputNote}
                  onChange={(e) => setInputNote(e.target.value)}
                  placeholder="Ghi chú kế hoạch kinh doanh..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Ô nhập lý do bắt buộc khi kỳ bị khóa */}
              {editingTarget.isLocked && (
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">
                    Lý do điều chỉnh (Bắt buộc) *
                  </label>
                  <textarea
                    rows={3}
                    value={inputReason}
                    onChange={(e) => setInputReason(e.target.value)}
                    placeholder="Nhập lý do thay đổi chỉ tiêu đã khóa (VD: Điều chỉnh theo Quyết định số...)"
                    className="w-full rounded-lg border border-amber-300 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveUpdate}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
              >
                {saving ? 'Đang lưu...' : 'Lưu điều chỉnh'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TẠO MỚI CHỈ TIÊU (SN-215) ── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                Giao chỉ tiêu doanh số mới
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Kỳ áp dụng (Tháng) *</label>
                <input
                  type="month"
                  value={newPeriod}
                  onChange={(e) => setNewPeriod(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phạm vi chỉ tiêu *</label>
                <select
                  value={newTargetType}
                  onChange={(e) => {
                    const t = e.target.value as SalesTargetType;
                    setNewTargetType(t);
                    if (t === 'EMPLOYEE') {
                      setNewTargetId(employeeOptions[0].id);
                      setNewTargetName(employeeOptions[0].name);
                    } else {
                      setNewTargetId(regionOptions[0].id);
                      setNewTargetName(regionOptions[0].name);
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                >
                  <option value="EMPLOYEE">Cá nhân nhân viên kinh doanh</option>
                  <option value="REGION">Khu vực thị trường</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  {newTargetType === 'EMPLOYEE' ? 'Chọn nhân viên *' : 'Chọn khu vực *'}
                </label>
                {newTargetType === 'EMPLOYEE' ? (
                  <select
                    value={newTargetId}
                    onChange={(e) => {
                      const emp = employeeOptions.find((o) => o.id === e.target.value);
                      if (emp) {
                        setNewTargetId(emp.id);
                        setNewTargetName(emp.name);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    {employeeOptions.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={newTargetId}
                    onChange={(e) => {
                      const reg = regionOptions.find((o) => o.id === e.target.value);
                      if (reg) {
                        setNewTargetId(reg.id);
                        setNewTargetName(reg.name);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                  >
                    {regionOptions.map((reg) => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mức chỉ tiêu (VNĐ) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000000"
                  value={newTargetAmount}
                  onChange={(e) => setNewTargetAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={newTargetNote}
                  onChange={(e) => setNewTargetNote(e.target.value)}
                  placeholder="Ghi chú mục tiêu..."
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveCreate}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors"
              >
                {saving ? 'Đang lưu...' : 'Tạo chỉ tiêu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DRAWER / MODAL XEM NHẬT KÝ ĐIỀU CHỈNH (SN-215) ── */}
      {logModalOpen && selectedTargetForLogs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Lịch sử điều chỉnh chỉ tiêu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500">
              Đối tượng: <span className="font-semibold text-slate-900">{selectedTargetForLogs.targetName}</span> • Kỳ:{' '}
              <span className="font-semibold text-slate-900">{selectedTargetForLogs.period}</span>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
              {loadingLogs ? (
                <div className="text-center py-6 text-xs text-slate-400">Đang tải nhật ký...</div>
              ) : selectedTargetLogs.length > 0 ? (
                selectedTargetLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{log.adjustedByName}</span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.adjustedAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-700">
                      <span className="line-through text-slate-400">{formatCurrency(log.oldAmount)}</span>
                      <span>→</span>
                      <span className="font-bold text-indigo-700">{formatCurrency(log.newAmount)}</span>
                    </div>
                    <div className="text-slate-600 bg-white p-2 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700">Lý do:</span> {log.reason}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  Chưa có lịch sử điều chỉnh nào được ghi nhận cho chỉ tiêu này.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setLogModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
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
