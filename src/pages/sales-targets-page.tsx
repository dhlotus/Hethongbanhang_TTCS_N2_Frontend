import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Target,
  Users,
  MapPin,
  Edit3,
  Plus,
  Search,
  ShieldAlert,
  X,
  Eye,
  RefreshCw,
  ScrollText,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { Pagination } from '../components/pagination';
import { salesTargetsService } from '../services/sales-targets.service';
import type {
  SalesTargetItem,
  SalesTargetsResponse,
  SalesTargetType,
} from '../services/sales-targets.service';
import { usersService } from '../services/users.service';
import { getStoredUser } from '../utils/navigation';

const formatCurrency = (val: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

const numberToWordsVN = (num: number): string => {
  if (!num || num <= 0) return '';
  if (num >= 1_000_000_000) {
    const val = num / 1_000_000_000;
    return `${Number.isInteger(val) ? val : val.toFixed(1)} tỷ đồng`;
  }
  if (num >= 1_000_000) {
    const val = num / 1_000_000;
    return `${Number.isInteger(val) ? val : val.toFixed(1)} triệu đồng`;
  }
  if (num >= 1_000) {
    const val = num / 1_000;
    return `${Number.isInteger(val) ? val : val.toFixed(0)} nghìn đồng`;
  }
  return `${num.toLocaleString('vi-VN')} đồng`;
};

export const SalesTargetsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = getStoredUser();
  const roles = user?.roles || [];
  const isManager = roles.some(
    (r: string) => r === 'ADMIN' || r === 'SALES_MANAGER' || r === 'BUSINESS_MANAGER',
  );

  // Kỳ tháng mặc định YYYY-MM
  const now = new Date();
  const defaultPeriodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1. Khôi phục trạng thái từ URL Query Parameters
  const initialTab = searchParams.get('tab') === 'create' && isManager ? 'create' : 'list';
  const initialPeriod = searchParams.get('period') || defaultPeriodStr;
  const rawType = searchParams.get('type') || searchParams.get('targetType') || 'ALL';
  const initialType: 'ALL' | 'EMPLOYEE' | 'REGION' =
    rawType === 'EMPLOYEE' || rawType === 'REGION' ? rawType : 'ALL';
  const initialSearch = (searchParams.get('search') || searchParams.get('q') || '').trim();
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const initialLimit = Math.max(5, Math.min(100, parseInt(searchParams.get('limit') || '10', 10) || 10));

  // Quản lý Tab: 'list' (Tiến độ chỉ tiêu) | 'create' (Giao chỉ tiêu mới dạng tab)
  const [activeTab, setActiveTab] = useState<'list' | 'create'>(initialTab);

  const [period, setPeriod] = useState<string>(initialPeriod);
  const [targetTypeFilter, setTargetTypeFilter] = useState<'ALL' | 'EMPLOYEE' | 'REGION'>(initialType);
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch);
  const [page, setPage] = useState<number>(initialPage);
  const [limit, setLimit] = useState<number>(initialLimit);

  const [data, setData] = useState<SalesTargetsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Dropdown Thao tác dạng portal (Nhóm lại thành 1 nút, không vỡ layout)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number } | null>(null);

  // Modal Sửa chỉ tiêu
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingTarget, setEditingTarget] = useState<SalesTargetItem | null>(null);
  const [inputAmount, setInputAmount] = useState<number>(0);
  const [inputNote, setInputNote] = useState<string>('');
  const [inputReason, setInputReason] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Form Giao chỉ tiêu mới dạng Tab
  const [newPeriod, setNewPeriod] = useState<string>(defaultPeriodStr);
  const [newTargetType, setNewTargetType] = useState<SalesTargetType>('EMPLOYEE');
  const [newTargetId, setNewTargetId] = useState<string>('');
  const [newTargetName, setNewTargetName] = useState<string>('');
  const [newTargetAmount, setNewTargetAmount] = useState<number>(100000000);
  const [newTargetNote, setNewTargetNote] = useState<string>('');

  // Danh sách nhân viên kinh doanh thực từ API
  const [employeeOptions, setEmployeeOptions] = useState<{ id: string; name: string }[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);

  // Danh sách khu vực cố định theo chuẩn hệ thống
  const regionOptions = [
    { id: 'Miền Nam', name: 'Khu vực Miền Nam' },
    { id: 'Miền Bắc', name: 'Khu vực Miền Bắc' },
    { id: 'Miền Trung', name: 'Khu vực Miền Trung' },
    { id: 'Miền Tây', name: 'Khu vực Miền Tây' },
  ];

  // Hàm cập nhật URL Search Parameters mượt mà
  const updateUrlParams = useCallback(
    (params: {
      tab?: 'list' | 'create';
      period?: string;
      type?: 'ALL' | 'EMPLOYEE' | 'REGION';
      search?: string;
      page?: number;
      limit?: number;
    }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (params.tab !== undefined) {
            if (params.tab === 'create') {
              next.set('tab', 'create');
            } else {
              next.delete('tab');
            }
          }
          if (params.period !== undefined) {
            next.set('period', params.period);
          }
          if (params.type !== undefined) {
            if (params.type === 'ALL') {
              next.delete('type');
              next.delete('targetType');
            } else {
              next.set('type', params.type);
            }
          }
          if (params.search !== undefined) {
            if (params.search.trim()) {
              next.set('search', params.search.trim());
            } else {
              next.delete('search');
              next.delete('q');
            }
          }
          if (params.page !== undefined) {
            if (params.page <= 1) {
              next.delete('page');
            } else {
              next.set('page', String(params.page));
            }
          }
          if (params.limit !== undefined) {
            if (params.limit === 10) {
              next.delete('limit');
            } else {
              next.set('limit', String(params.limit));
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Đóng dropdown thao tác khi click ra ngoài hoặc cuộn trang
  useEffect(() => {
    const handleCloseDropdown = () => {
      setOpenDropdownId(null);
      setDropdownCoords(null);
    };

    window.addEventListener('click', handleCloseDropdown);
    window.addEventListener('scroll', handleCloseDropdown, true);
    window.addEventListener('resize', handleCloseDropdown);

    return () => {
      window.removeEventListener('click', handleCloseDropdown);
      window.removeEventListener('scroll', handleCloseDropdown, true);
      window.removeEventListener('resize', handleCloseDropdown);
    };
  }, []);

  // Fetch danh sách nhân viên kinh doanh cho form
  useEffect(() => {
    if (!isManager) return;
    setLoadingEmployees(true);
    usersService
      .getUsers({ role: 'SALES_REP', limit: 200, status: 'ACTIVE' })
      .then((res) => {
        const list = (res.data || []).map((u: any) => ({
          id: u.id,
          name: u.fullName || u.username || u.email || u.id,
        }));
        if (list.length > 0) {
          setEmployeeOptions(list);
          if (!newTargetId) {
            setNewTargetId(list[0].id);
            setNewTargetName(list[0].name);
          }
        } else {
          const fallback = [
            { id: 'usr-sale-01', name: 'Trần Văn Long' },
            { id: 'usr-sales-002', name: 'Phạm Minh Hùng' },
            { id: 'usr-sale-02', name: 'Lê Thị Hoa' },
            { id: 'usr-sale-03', name: 'Phạm Minh Tuấn' },
          ];
          setEmployeeOptions(fallback);
          if (!newTargetId) {
            setNewTargetId(fallback[0].id);
            setNewTargetName(fallback[0].name);
          }
        }
      })
      .catch(() => {
        const fallback = [
          { id: 'usr-sale-01', name: 'Trần Văn Long' },
          { id: 'usr-sales-002', name: 'Phạm Minh Hùng' },
          { id: 'usr-sale-02', name: 'Lê Thị Hoa' },
          { id: 'usr-sale-03', name: 'Phạm Minh Tuấn' },
        ];
        setEmployeeOptions(fallback);
        if (!newTargetId) {
          setNewTargetId(fallback[0].id);
          setNewTargetName(fallback[0].name);
        }
      })
      .finally(() => setLoadingEmployees(false));
  }, [isManager]);

  // Tải dữ liệu từ Backend thật kèm phân trang và tìm kiếm
  const loadData = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        const res = await salesTargetsService.getSalesTargets({
          period,
          targetType: targetTypeFilter !== 'ALL' ? targetTypeFilter : undefined,
          search: searchTerm.trim() || undefined,
          page,
          limit,
        });
        setData(res);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi tải chỉ tiêu doanh số';
        showToast('error', msg);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [period, targetTypeFilter, searchTerm, page, limit],
  );

  // Debounce gọi backend khi gõ ô tìm kiếm
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      updateUrlParams({ search: val, page: 1 });
    }, 350);
  };

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Đồng bộ thời gian thực theo sự kiện phát sinh giao dịch
  useEffect(() => {
    const onSyncEvent = () => loadData(false);
    window.addEventListener('loha_orders_updated', onSyncEvent);
    window.addEventListener('loha_sales_target_sync', onSyncEvent);

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'loha_orders_updated_sync' || e.key === 'loha_sales_target_sync') {
        loadData(false);
      }
    };
    window.addEventListener('storage', onStorage);

    let broadcast: BroadcastChannel | null = null;
    try {
      broadcast = new BroadcastChannel('loha_sales_sync');
      broadcast.onmessage = () => loadData(false);
    } catch {}

    return () => {
      window.removeEventListener('loha_orders_updated', onSyncEvent);
      window.removeEventListener('loha_sales_target_sync', onSyncEvent);
      window.removeEventListener('storage', onStorage);
      if (broadcast) broadcast.close();
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [loadData]);

  // Bật/tắt dropdown thao tác tại từng dòng (Đảm bảo toạ độ an toàn, không tràn khỏi màn hình)
  const handleToggleDropdown = (e: React.MouseEvent, item: SalesTargetItem) => {
    e.stopPropagation();
    if (openDropdownId === item.id) {
      setOpenDropdownId(null);
      setDropdownCoords(null);
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const menuWidth = 148;
      const menuHeight = 88;

      // Đảm bảo không bị tràn mép phải màn hình
      let left = rect.right - menuWidth;
      if (left + menuWidth > window.innerWidth - 12) {
        left = window.innerWidth - menuWidth - 12;
      }
      if (left < 12) {
        left = 12;
      }

      // Đảm bảo không bị tràn đáy màn hình
      let top = rect.bottom + 4;
      if (top + menuHeight > window.innerHeight - 8) {
        top = Math.max(8, rect.top - menuHeight - 4);
      }

      setOpenDropdownId(item.id);
      setDropdownCoords({ top, left });
    }
  };

  // Mở modal sửa chỉ tiêu
  const handleOpenEdit = (item: SalesTargetItem) => {
    setEditingTarget(item);
    setInputAmount(item.targetAmount);
    setInputNote(item.note || '');
    setInputReason('');
    setEditModalOpen(true);
  };

  // Xác nhận lưu cập nhật chỉ tiêu
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

  // Chuyển sang Tab Giao chỉ tiêu mới
  const handleGoToCreateTab = () => {
    setNewPeriod(period);
    setNewTargetType('EMPLOYEE');
    if (employeeOptions.length > 0) {
      setNewTargetId(employeeOptions[0].id);
      setNewTargetName(employeeOptions[0].name);
    }
    setNewTargetAmount(100000000);
    setNewTargetNote('');
    setActiveTab('create');
    updateUrlParams({ tab: 'create' });
  };

  // Xác nhận giao chỉ tiêu mới từ Tab
  const handleSaveCreateTab = async () => {
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
      setActiveTab('list');
      updateUrlParams({ tab: 'list' });
      loadData(false);

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

  const summary = data?.summary;
  const items = data?.items || [];
  const total = data?.total || items.length;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4 sm:space-y-5 w-full">
      {/* ── THANH TAB CHUYỂN ĐỔI KÈM HIỆU ỨNG MƯỢT MÀ ── */}
      <div className="pb-1 border-b border-slate-200/80">
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/60 shadow-2xs">
          <button
            type="button"
            onClick={() => {
              setActiveTab('list');
              updateUrlParams({ tab: 'list' });
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out cursor-pointer select-none ${
              activeTab === 'list'
                ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5 -translate-y-0.5'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <Target className={`h-4 w-4 transition-transform duration-300 ${activeTab === 'list' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`} />
            <span>Tiến độ chỉ tiêu</span>
          </button>

          {isManager && (
            <button
              type="button"
              onClick={handleGoToCreateTab}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ease-out cursor-pointer select-none ${
                activeTab === 'create'
                  ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-900/5 -translate-y-0.5'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Plus className={`h-4 w-4 transition-transform duration-300 ${activeTab === 'create' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`} />
              <span>Giao chỉ tiêu mới</span>
            </button>
          )}
        </div>
      </div>

      {/* ── NỘI DUNG TAB KÈM ANIMATION CHUYỂN ĐỔI MƯỢT MÀ ── */}
      {activeTab === 'create' ? (
        <div
          key="tab-create"
          className="animate-in fade-in-0 zoom-in-99 slide-in-from-bottom-2 duration-200 ease-out w-full"
        >
          {/* Form Giao chỉ tiêu mới full width đồng bộ với tab Tiến độ chỉ tiêu */}
          <div className="w-full py-2">
            <div className="w-full bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              {/* Header card gọn gàng */}
              <div className="px-6 py-4.5 border-b border-slate-100 flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Giao chỉ tiêu mới</h2>
                  <p className="text-xs text-slate-500">Kỳ tháng {newPeriod}</p>
                </div>
              </div>

              {/* Form body */}
              <div className="p-6 space-y-4 text-xs sm:text-sm">
                {/* Hàng 1: Kỳ áp dụng & Phạm vi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Kỳ áp dụng <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="month"
                      value={newPeriod}
                      onChange={(e) => setNewPeriod(e.target.value)}
                      className="w-full h-10.5 rounded-lg border border-slate-200 px-3 font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Phạm vi <span className="text-rose-500">*</span>
                    </label>
                    <div className="h-10.5 p-1 bg-slate-100 rounded-lg flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNewTargetType('EMPLOYEE');
                          if (employeeOptions.length > 0) {
                            setNewTargetId(employeeOptions[0].id);
                            setNewTargetName(employeeOptions[0].name);
                          }
                        }}
                        className={`flex-1 h-full rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          newTargetType === 'EMPLOYEE'
                            ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Users className="h-3.5 w-3.5 text-blue-600" />
                        <span>Cá nhân</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewTargetType('REGION');
                          if (regionOptions.length > 0) {
                            setNewTargetId(regionOptions[0].id);
                            setNewTargetName(regionOptions[0].name);
                          }
                        }}
                        className={`flex-1 h-full rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          newTargetType === 'REGION'
                            ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Khu vực</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Hàng 2: Chọn đối tượng & Mức chỉ tiêu (2 cột trên desktop) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      {newTargetType === 'EMPLOYEE' ? 'Nhân viên kinh doanh' : 'Khu vực thị trường'}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={newTargetId}
                      onChange={(e) => {
                        if (newTargetType === 'EMPLOYEE') {
                          const emp = employeeOptions.find((o) => o.id === e.target.value);
                          if (emp) {
                            setNewTargetId(emp.id);
                            setNewTargetName(emp.name);
                          }
                        } else {
                          const reg = regionOptions.find((o) => o.id === e.target.value);
                          if (reg) {
                            setNewTargetId(reg.id);
                            setNewTargetName(reg.name);
                          }
                        }
                      }}
                      disabled={newTargetType === 'EMPLOYEE' && loadingEmployees}
                      className="w-full h-10.5 rounded-lg border border-slate-200 bg-white px-3 font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-2xs transition-all disabled:bg-slate-50"
                    >
                      {newTargetType === 'EMPLOYEE' ? (
                        <>
                          <option value="">
                            {loadingEmployees ? 'Đang tải danh sách...' : '-- Chọn nhân viên --'}
                          </option>
                          {employeeOptions.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.name}
                            </option>
                          ))}
                        </>
                      ) : (
                        regionOptions.map((reg) => (
                          <option key={reg.id} value={reg.id}>
                            {reg.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Mức chỉ tiêu */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-slate-700">
                        Mức chỉ tiêu (VNĐ) <span className="text-rose-500">*</span>
                      </label>
                      {newTargetAmount > 0 && (
                        <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {numberToWordsVN(newTargetAmount)}
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={
                          newTargetAmount > 0
                            ? newTargetAmount.toLocaleString('vi-VN')
                            : newTargetAmount === 0
                            ? '0'
                            : ''
                        }
                        onChange={(e) => {
                          const cleanDigits = e.target.value.replace(/\D/g, '');
                          setNewTargetAmount(cleanDigits ? Number(cleanDigits) : 0);
                        }}
                        placeholder="0"
                        className="w-full h-10.5 rounded-lg border border-slate-200 pl-3.5 pr-12 text-base font-bold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs tabular-nums"
                      />
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        VNĐ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hàng 3: Ghi chú */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Ghi chú</label>
                  <textarea
                    rows={2}
                    value={newTargetNote}
                    onChange={(e) => setNewTargetNote(e.target.value)}
                    placeholder="Nhập ghi chú kế hoạch..."
                    className="w-full rounded-lg border border-slate-200 p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs resize-none"
                  />
                </div>
              </div>

              {/* Footer hành động */}
              <div className="bg-slate-50/70 px-6 py-3.5 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    updateUrlParams({ tab: 'list' });
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors shadow-2xs"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveCreateTab}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white text-xs sm:text-sm font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Giao chỉ tiêu</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* 2. KHI Ở TAB "TIẾN ĐỘ CHỈ TIÊU" (DANH SÁCH & BẢNG SỐ LIỆU)               */
        /* ========================================================================= */
        <div
          key="tab-list"
          className="animate-in fade-in-0 zoom-in-99 slide-in-from-bottom-3 duration-300 ease-out space-y-4 sm:space-y-5 w-full"
        >

          {/* ── BỘ LỌC ĐỒNG BỘ QUERY PARAMETER: TÌM KIẾM BÊN TRÁI + SELECT PHẠM VI + KỲ THÁNG ── */}
          {isManager && (
            <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                {/* 1. Ô tìm kiếm nằm BÊN TRÁI */}
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm nhân viên hoặc khu vực..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200/80 bg-white focus:border-indigo-500 focus:outline-none placeholder:text-slate-400"
                  />
                </div>

                {/* 2. Select chọn phạm vi (Cá nhân / Khu vực) tiết kiệm diện tích */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={targetTypeFilter}
                    onChange={(e) => {
                      const val = e.target.value as 'ALL' | 'EMPLOYEE' | 'REGION';
                      setTargetTypeFilter(val);
                      setPage(1);
                      updateUrlParams({ type: val, page: 1 });
                    }}
                    className="h-9 px-3 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả phạm vi</option>
                    <option value="EMPLOYEE">Cá nhân nhân viên</option>
                    <option value="REGION">Khu vực thị trường</option>
                  </select>
                </div>

                {/* 3. Lọc kỳ tháng */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold text-slate-500 shrink-0">Kỳ tháng:</span>
                  <input
                    type="month"
                    value={period}
                    onChange={(e) => {
                      setPeriod(e.target.value);
                      setPage(1);
                      updateUrlParams({ period: e.target.value, page: 1 });
                    }}
                    className="h-9 text-xs sm:text-sm rounded-lg border border-slate-200 px-2.5 py-1.5 font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none bg-white cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── 2 THẺ TỔNG HỢP GỌN GÀNG, BỎ WRAP TEXT BÊN DƯỚI ĐỂ TRÁNH VỠ GIAO DIỆN ── */}
          {isManager && summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* Card 1: Tổng hợp Chỉ tiêu Nhân viên */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                      <Users className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 whitespace-nowrap">Chỉ tiêu Cá nhân Nhân viên</h3>
                  </div>
                  {summary.employeeCompletionRate !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${
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

                {/* Dãy số liệu 1 dòng gọn gàng, không wrap text thừa */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div className="min-w-0">
                    <span className="text-xs text-slate-500 whitespace-nowrap block">Mục tiêu giao:</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900 tabular-nums whitespace-nowrap truncate block">
                      {formatCurrency(summary.totalEmployeeTarget)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-slate-500 whitespace-nowrap block">Thực tế đạt:</span>
                    <span className="text-base sm:text-lg font-bold text-blue-700 tabular-nums whitespace-nowrap truncate block">
                      {formatCurrency(summary.totalEmployeeActual)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (summary.employeeCompletionRate || 0) >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${Math.min(summary.employeeCompletionRate || 0, 100)}%` }}
                  />
                </div>
              </div>

              {/* Card 2: Tổng hợp Chỉ tiêu Khu vực */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 whitespace-nowrap">Chỉ tiêu Khu vực Thị trường</h3>
                  </div>
                  {summary.regionCompletionRate !== null && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap ${
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

                {/* Dãy số liệu 1 dòng gọn gàng, không wrap text thừa */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                  <div className="min-w-0">
                    <span className="text-xs text-slate-500 whitespace-nowrap block">Mục tiêu giao:</span>
                    <span className="text-base sm:text-lg font-bold text-slate-900 tabular-nums whitespace-nowrap truncate block">
                      {formatCurrency(summary.totalRegionTarget)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs text-slate-500 whitespace-nowrap block">Thực tế đạt:</span>
                    <span className="text-base sm:text-lg font-bold text-emerald-700 tabular-nums whitespace-nowrap truncate block">
                      {formatCurrency(summary.totalRegionActual)}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      (summary.regionCompletionRate || 0) >= 100 ? 'bg-emerald-500' : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(summary.regionCompletionRate || 0, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── BẢNG DỮ LIỆU ĐỒNG NHẤT STYLE NHẬT KÝ HỆ THỐNG - NÚT THAO TÁC GỌN GÀNG KHÔNG VỠ ── */}
          <div className="w-full space-y-3">
            {/* 1. Bảng Desktop (>= 640px) */}
            <div className="hidden sm:block rounded-xl bg-white border border-slate-200/80 shadow-xs overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full min-w-[780px] table-fixed border-collapse">
                  <colgroup>
                    <col className="w-[24%]" />
                    <col className="w-[12%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[11%]" />
                    <col className="w-[17%]" />
                  </colgroup>
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3.5 text-left whitespace-nowrap">Đối tượng</th>
                      <th className="px-3 py-3.5 text-center whitespace-nowrap">Phạm vi</th>
                      <th className="px-4 py-3.5 text-right whitespace-nowrap">Chỉ tiêu (VNĐ)</th>
                      <th className="px-4 py-3.5 text-right whitespace-nowrap">Thực hiện (VNĐ)</th>
                      <th className="px-3 py-3.5 text-center whitespace-nowrap">% Đạt</th>
                      <th className="px-4 py-3.5 text-center whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-slate-400">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[var(--color-primary)]" />
                          <span className="font-medium text-sm text-slate-600">Đang tải chỉ tiêu doanh số...</span>
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-14 text-center text-slate-400">
                          <ScrollText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                          <p className="text-sm text-slate-400 font-normal">Không tìm thấy bản ghi chỉ tiêu nào</p>
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => {
                        const hasTarget = item.targetAmount > 0;
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                            {/* Cột 1: Đối tượng */}
                            <td className="px-4 py-3.5 text-left whitespace-nowrap">
                              <div className="flex items-center gap-2.5">
                                {item.targetType === 'EMPLOYEE' ? (
                                  <Users className="h-4 w-4 text-blue-600 shrink-0" />
                                ) : (
                                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                                )}
                                <span className="font-semibold text-slate-900 truncate" title={item.targetName}>
                                  {item.targetName}
                                </span>
                              </div>
                            </td>

                            {/* Cột 2: Phạm vi */}
                            <td className="px-3 py-3.5 text-center whitespace-nowrap">
                              <span
                                className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  item.targetType === 'EMPLOYEE'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                }`}
                              >
                                {item.targetType === 'EMPLOYEE' ? 'Cá nhân' : 'Khu vực'}
                              </span>
                            </td>

                            {/* Cột 3: Chỉ tiêu (VNĐ) */}
                            <td className="px-4 py-3.5 text-right whitespace-nowrap font-bold text-slate-900 tabular-nums">
                              {hasTarget ? (
                                formatCurrency(item.targetAmount)
                              ) : (
                                <span className="text-slate-400 font-normal">Chưa giao</span>
                              )}
                            </td>

                            {/* Cột 4: Thực hiện (VNĐ) */}
                            <td className="px-4 py-3.5 text-right whitespace-nowrap font-bold text-indigo-700 tabular-nums">
                              {formatCurrency(item.actualAmount)}
                            </td>

                            {/* Cột 5: % Đạt */}
                            <td className="px-3 py-3.5 text-center whitespace-nowrap">
                              {hasTarget && item.completionRate !== null ? (
                                <span
                                  className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums ${
                                    item.completionRate >= 100
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                      : item.completionRate >= 80
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                                      : 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                  }`}
                                >
                                  {item.completionRate}%
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs">—</span>
                              )}
                            </td>

                            {/* Cột 6: Thao tác (Nhóm thành 1 nút Thao tác duy nhất, rộng rãi không bị tràn) */}
                            <td className="px-4 py-3.5 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => handleToggleDropdown(e, item)}
                                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-indigo-600 text-xs font-semibold shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                              >
                                <span>Thao tác</span>
                                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Phân trang Backend gắn chân bảng desktop */}
              {total > 0 && (
                <Pagination
                  variant="default"
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={limit}
                  pageSizeOptions={[10, 20, 50]}
                  itemLabel="chỉ tiêu"
                  showRecordRange={false}
                  showFirstLast={false}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    updateUrlParams({ page: newPage });
                  }}
                  onPageSizeChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                    updateUrlParams({ limit: newLimit, page: 1 });
                  }}
                />
              )}
            </div>

            {/* 2. Giao diện Thẻ Mobile (< 640px) */}
            <div className="sm:hidden space-y-2.5 w-full">
              {loading ? (
                <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-center text-slate-400">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[var(--color-primary)]" />
                  <span className="font-medium text-xs">Đang tải chỉ tiêu...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="rounded-xl bg-white border border-slate-200/80 p-8 text-center text-slate-400">
                  <ScrollText className="h-7 w-7 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs text-slate-400 font-normal">Không tìm thấy bản ghi nào</p>
                </div>
              ) : (
                items.map((item) => {
                  const hasTarget = item.targetAmount > 0;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl bg-white border border-slate-200/80 p-3.5 shadow-xs space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.targetType === 'EMPLOYEE' ? (
                            <Users className="h-4 w-4 text-blue-600 shrink-0" />
                          ) : (
                            <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                          )}
                          <span className="font-bold text-slate-900 text-sm truncate">{item.targetName}</span>
                        </div>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 ${
                            item.targetType === 'EMPLOYEE'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {item.targetType === 'EMPLOYEE' ? 'Cá nhân' : 'Khu vực'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg text-xs">
                        <div>
                          <div className="text-slate-400 text-[11px]">Chỉ tiêu giao:</div>
                          <div className="font-bold text-slate-900 tabular-nums">
                            {hasTarget ? formatCurrency(item.targetAmount) : 'Chưa giao'}
                          </div>
                        </div>
                        <div>
                          <div className="text-slate-400 text-[11px]">Thực tế đạt:</div>
                          <div className="font-bold text-indigo-700 tabular-nums">
                            {formatCurrency(item.actualAmount)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Tiến độ:</span>
                          {hasTarget && item.completionRate !== null ? (
                            <span className="font-bold text-indigo-700">{item.completionRate}%</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to={`/sales/targets/${item.id}`}
                            className="text-xs font-semibold text-[var(--color-primary)] hover:underline inline-flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            <span>Chi tiết</span>
                          </Link>
                          {isManager && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(item)}
                              className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="h-3 w-3" />
                              <span>Sửa</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Phân trang Backend mobile */}
              {total > 0 && (
                <Pagination
                  variant="default"
                  currentPage={page}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={limit}
                  pageSizeOptions={[10, 20, 50]}
                  itemLabel="chỉ tiêu"
                  showRecordRange={false}
                  showFirstLast={false}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    updateUrlParams({ page: newPage });
                  }}
                  onPageSizeChange={(newLimit) => {
                    setLimit(newLimit);
                    setPage(1);
                    updateUrlParams({ limit: newLimit, page: 1 });
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MENU THAO TÁC PORTAL (KHÔNG BỊ OVERFLOW CỦA BẢNG CHE KHUẤT)           */}
      {/* ========================================================================= */}
      {openDropdownId && dropdownCoords && createPortal(
        <div
          style={{ top: `${dropdownCoords.top}px`, left: `${dropdownCoords.left}px` }}
          className="fixed z-[9999] w-[148px] rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 animate-in fade-in-0 zoom-in-95 duration-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Link
            to={`/sales/targets/${openDropdownId}`}
            onClick={() => setOpenDropdownId(null)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
          >
            <Eye className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600" />
            <span>Xem chi tiết</span>
          </Link>
          {isManager && (
            <button
              type="button"
              onClick={() => {
                const target = items.find((t) => t.id === openDropdownId);
                setOpenDropdownId(null);
                if (target) handleOpenEdit(target);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors cursor-pointer text-left"
            >
              <Edit3 className="h-3.5 w-3.5 text-slate-400" />
              <span>Chỉnh sửa</span>
            </button>
          )}
        </div>,
        document.body,
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL SỬA CHỈ TIÊU (Bắt buộc lý do nếu kỳ đã khóa)                     */}
      {/* ========================================================================= */}
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
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

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

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mức chỉ tiêu mới (VNĐ) *</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={inputAmount > 0 ? inputAmount.toLocaleString('vi-VN') : (inputAmount === 0 ? '0' : '')}
                    onChange={(e) => {
                      const cleanDigits = e.target.value.replace(/\D/g, '');
                      setInputAmount(cleanDigits ? Number(cleanDigits) : 0);
                    }}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-900 focus:border-indigo-500 focus:outline-none pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    VNĐ
                  </span>
                </div>
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

              {editingTarget.isLocked && (
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">
                    Lý do điều chỉnh (Bắt buộc) *
                  </label>
                  <textarea
                    rows={3}
                    value={inputReason}
                    onChange={(e) => setInputReason(e.target.value)}
                    placeholder="Nhập lý do thay đổi chỉ tiêu đã khóa..."
                    className="w-full rounded-lg border border-amber-300 px-3 py-2 text-xs sm:text-sm focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveUpdate}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {saving ? 'Đang lưu...' : 'Lưu điều chỉnh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
