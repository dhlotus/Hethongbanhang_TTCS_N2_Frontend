import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Check,
  ChevronDown,
  Edit3,
  Eye,
  Layers,
  MapPin,
  Plus,
  Search,
  Trash2,
  User,
  Warehouse as WarehouseIcon,
  X,
  CheckCircle2,
} from 'lucide-react';
import { ModalLayout } from '../components/modal-layout';
import { Pagination } from '../components/pagination';
import { showToast } from '../components/toast';
import { getFriendlyErrorMessage } from '../utils/error-handler';
import { customerService } from '../services/customer.service';
import { warehouseService } from '../services/warehouse.service';
import { getStoredUser } from '../utils/navigation';
import type { Customer } from '../types/customer.types';
import type { Warehouse, WarehouseLocation, WarehouseManager } from '../types/warehouse.types';

const SELECTED_WAREHOUSE_STORAGE_KEY = 'warehouse-management:selected-warehouse';

// Ràng buộc số điện thoại Việt Nam (10 số, bắt đầu bằng 02, 03, 05, 07, 08, 09)
const VIETNAM_PHONE_REGEX = /^(0[235789])[0-9]{8}$/;

function sanitizePhoneNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

function handlePhoneKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
  if (
    e.key === 'Backspace' ||
    e.key === 'Tab' ||
    e.key === 'Enter' ||
    e.key === 'Delete' ||
    e.key === 'ArrowLeft' ||
    e.key === 'ArrowRight' ||
    e.key === 'ArrowUp' ||
    e.key === 'ArrowDown' ||
    e.ctrlKey ||
    e.metaKey
  ) {
    return;
  }
  if (!/^\d$/.test(e.key)) {
    e.preventDefault();
  }
}

function getWarehouseEditForm(warehouse: Warehouse) {
  return {
    name: warehouse.name,
    address: warehouse.address,
    phone: sanitizePhoneNumber(warehouse.phone || ''),
    managerId: warehouse.managerId || '',
    status: warehouse.status,
  };
}

function normalizeVietnamese(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd');
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'QL';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0];
  const last = parts[parts.length - 1][0];
  return (first + last).toUpperCase();
}

interface SearchableManagerSelectProps {
  managers: WarehouseManager[];
  value: string;
  onChange: (managerId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  currentWarehouseId?: string;
}

function SearchableManagerSelect({
  managers,
  value,
  onChange,
  placeholder = 'Chọn người phụ trách...',
  disabled = false,
  currentWarehouseId,
}: SearchableManagerSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedManager = useMemo(
    () => managers.find((m) => m.id === value),
    [managers, value]
  );

  const filteredManagers = useMemo(() => {
    if (!keyword.trim()) return managers;
    const q = normalizeVietnamese(keyword.trim());
    return managers.filter((m) => normalizeVietnamese(m.name).includes(q));
  }, [managers, keyword]);

  const updateMenuPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownHeight = 280;
    const fitsBelow = rect.bottom + dropdownHeight <= window.innerHeight;
    setMenuPosition({
      top: fitsBelow ? rect.bottom + 4 : Math.max(10, rect.top - dropdownHeight - 4),
      left: rect.left,
      width: rect.width,
    });
  }, []);

  // Đóng khi click ngoài hoặc bấm phím Escape
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !(target as HTMLElement).closest('.manager-select-portal-menu')
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updateMenuPosition();
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      window.addEventListener('resize', updateMenuPosition);
      window.addEventListener('scroll', updateMenuPosition, true);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateMenuPosition);
        window.removeEventListener('scroll', updateMenuPosition, true);
      };
    } else {
      setKeyword('');
    }
  }, [isOpen, updateMenuPosition]);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            updateMenuPosition();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full h-[38px] px-3 rounded-lg border text-xs flex items-center justify-between gap-2 transition-all bg-white text-left ${
          isOpen
            ? 'border-indigo-500 ring-1 ring-indigo-500'
            : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {selectedManager ? (
            <>
              <div className="w-6 h-6 rounded-full bg-[#eff2fe] text-[#371cdb] flex items-center justify-center text-[10px] font-bold shrink-0">
                {getInitials(selectedManager.name)}
              </div>
              <span className="truncate text-slate-800 font-medium">
                {selectedManager.name}
                <span className="text-slate-400 font-normal text-xs ml-1">
                  ({selectedManager.roleName || 'Thủ kho'})
                </span>
              </span>
            </>
          ) : (
            <>
              <User size={16} className="text-slate-400 shrink-0" />
              <span className="text-slate-400 truncate">{placeholder}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 text-slate-400">
          {selectedManager && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 hover:text-slate-600 rounded hover:bg-slate-100 cursor-pointer"
              title="Bỏ chọn"
            >
              <X size={14} />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#371cdb]' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu Portal */}
      {isOpen && menuPosition && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            width: `${menuPosition.width}px`,
          }}
          className="manager-select-portal-menu bg-white rounded-xl shadow-2xl border border-slate-200 z-[10005] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ô tìm kiếm sticky ở đầu */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/80">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm kiếm nhân viên kho..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredManagers.length > 0) {
                      onChange(filteredManagers[0].id);
                      setIsOpen(false);
                    }
                  }
                }}
                className="w-full h-8 pl-8 pr-7 bg-white rounded-md border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#371cdb] focus:ring-2 focus:ring-[#371cdb]/10"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => setKeyword('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Danh sách người phụ trách */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5 overscroll-contain">
            {/* Tùy chọn để trống */}
            <button
              type="button"
              onClick={() => {
                onChange('');
                setIsOpen(false);
              }}
              className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors text-left cursor-pointer ${
                value === ''
                  ? 'bg-[#eff2fe] text-[#371cdb] font-medium'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px]">
                  —
                </div>
                <span>Chưa phân công (để trống)</span>
              </div>
              {value === '' && <Check size={14} className="text-[#371cdb]" />}
            </button>

            {filteredManagers.length > 0 ? (
              filteredManagers.map((manager) => {
                const isSelected = manager.id === value;
                const isAssignedHere =
                  currentWarehouseId && manager.assignedWarehouseId === currentWarehouseId;

                return (
                  <button
                    key={manager.id}
                    type="button"
                    onClick={() => {
                      onChange(manager.id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#eff2fe] text-[#371cdb] font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isSelected
                            ? 'bg-[#371cdb] text-white'
                            : 'bg-[#eff2fe] text-[#371cdb]'
                        }`}
                      >
                        {getInitials(manager.name)}
                      </div>
                      <div className="flex flex-col min-w-0 text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate font-medium text-slate-800">{manager.name}</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            ({manager.roleName || 'Thủ kho'})
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-0.5 truncate">
                          {isAssignedHere
                            ? 'Đang hoạt động ở kho này'
                            : manager.assignedWarehouseName
                            ? `Đang hoạt động ở ${manager.assignedWarehouseName}`
                            : 'Chưa phân công kho'}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={14} className="text-[#371cdb] shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-5 px-3 text-center text-xs text-slate-400">
                <p>Không tìm thấy nhân viên kho nào</p>
                {keyword && (
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    với từ khóa "{keyword}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer nhỏ thông tin số lượng */}
          <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Tổng số: {managers.length} nhân viên kho</span>
            {keyword && <span>Tìm thấy: {filteredManagers.length}</span>}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function WarehousesPage(): React.ReactElement {
  const user = getStoredUser();
  const userRoles = useMemo(() => user?.roles || [], [user]);
  const isAdmin = userRoles.includes('ADMIN');
  const isManager =
    userRoles.includes('WAREHOUSE_MANAGER') || userRoles.includes('WH_MANAGER') || isAdmin;
  const isKeeper =
    !isManager &&
    (userRoles.includes('WAREHOUSE_KEEPER') ||
      userRoles.includes('WAREHOUSE') ||
      userRoles.includes('WH_KEEPER'));

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedId, setSelectedId] = useState(
    () => sessionStorage.getItem(SELECTED_WAREHOUSE_STORAGE_KEY) || ''
  );
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [managers, setManagers] = useState<WarehouseManager[]>([]);
  const [agencies, setAgencies] = useState<Customer[]>([]);
  const [agencyDefaults, setAgencyDefaults] = useState<Record<string, string>>({});

  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.max(1, Number(searchParams.get('limit')) || 10);
  const searchParam = searchParams.get('search') || '';
  const statusParam = (searchParams.get('status') as 'ALL' | 'ACTIVE' | 'INACTIVE') || 'ALL';

  // Local state for debounced search input
  const [searchInput, setSearchInput] = useState(searchParam);
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParam) {
        const next = new URLSearchParams(searchParams);
        if (searchInput.trim()) next.set('search', searchInput.trim());
        else next.delete('search');
        next.set('page', '1');
        setSearchParams(next, { replace: true });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput, searchParam, searchParams, setSearchParams]);

  const updateFilter = useCallback(
    (updates: { search?: string; status?: string; page?: number; limit?: number }) => {
      const next = new URLSearchParams(searchParams);
      if (updates.search !== undefined) {
        if (updates.search.trim()) next.set('search', updates.search.trim());
        else next.delete('search');
      }
      if (updates.status !== undefined) {
        if (updates.status && updates.status !== 'ALL') next.set('status', updates.status);
        else next.delete('status');
      }
      if (updates.page !== undefined) {
        next.set('page', String(updates.page));
      }
      if (updates.limit !== undefined) {
        next.set('limit', String(updates.limit));
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  // Table data state from backend
  const [tableWarehouses, setTableWarehouses] = useState<Warehouse[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingTable, setIsLoadingTable] = useState(false);

  // Modals state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isAssignAgencyModalOpen, setIsAssignAgencyModalOpen] = useState(false);

  // Forms state
  const [warehouseForm, setWarehouseForm] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    managerId: '',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    phone: '',
    managerId: '',
    status: 'ACTIVE' as Warehouse['status'],
  });

  const [locationForm, setLocationForm] = useState({
    code: '',
    zone: '',
    aisle: '',
    rack: '',
    shelf: '',
  });

  // Assign agency modal state
  const [selectedAgenciesToAssign, setSelectedAgenciesToAssign] = useState<string[]>([]);
  const [agencySearchQuery, setAgencySearchQuery] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');

  const [busy, setBusy] = useState(false);

  // Load backend paginated table data
  const loadTableWarehouses = useCallback(async () => {
    setIsLoadingTable(true);
    try {
      const res = await warehouseService.getWarehouses({
        search: searchParam || undefined,
        status: statusParam !== 'ALL' ? statusParam : undefined,
        page,
        limit,
      });
      if (Array.isArray(res)) {
        setTableWarehouses(res);
        setTotalItems(res.length);
        setTotalPages(Math.max(1, Math.ceil(res.length / limit)));
      } else if (res && Array.isArray(res.data)) {
        setTableWarehouses(res.data);
        setTotalItems(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
      }
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể tải danh sách kho'));
    } finally {
      setIsLoadingTable(false);
    }
  }, [searchParam, statusParam, page, limit]);

  useEffect(() => {
    void loadTableWarehouses();
  }, [loadTableWarehouses]);

  // Load all initial data (for KPIs, assignments, managers)
  const reload = useCallback(async (): Promise<void> => {
    try {
      const [rows, agencyRows, assignments, managerRows] = await Promise.all([
        warehouseService.getWarehouses(),
        customerService.getCustomers({ limit: 100 }).then((result) => result.data).catch(() => []),
        warehouseService.getAgencyDefaults().catch(() => []),
        warehouseService.getManagers().catch(() => []),
      ]);
      setWarehouses(rows);
      setAgencies(agencyRows);
      setManagers(managerRows);
      setAgencyDefaults(
        Object.fromEntries(assignments.map((item) => [item.agencyId, item.warehouseId]))
      );

      const savedSelectedId = sessionStorage.getItem(SELECTED_WAREHOUSE_STORAGE_KEY);
      if (savedSelectedId && (rows as Warehouse[]).some((r: Warehouse) => r.id === savedSelectedId)) {
        const selected = (rows as Warehouse[]).find((r: Warehouse) => r.id === savedSelectedId);
        if (selected) setEditForm(getWarehouseEditForm(selected));
      }
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể tải danh sách kho'));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);

  useEffect(() => {
    if (selectedId) sessionStorage.setItem(SELECTED_WAREHOUSE_STORAGE_KEY, selectedId);
    else sessionStorage.removeItem(SELECTED_WAREHOUSE_STORAGE_KEY);
  }, [selectedId]);

  // Load locations when selected warehouse changes
  useEffect(() => {
    if (!selectedId) {
      setLocations([]);
      return;
    }
    warehouseService
      .getLocations(selectedId)
      .then(setLocations)
      .catch((error: unknown) => {
        showToast('error', getFriendlyErrorMessage(error, 'Không thể tải vị trí kho'));
      });
  }, [selectedId]);

  const selectedWarehouse = useMemo(
    () => warehouses.find((w) => w.id === selectedId),
    [warehouses, selectedId]
  );

  const selectWarehouse = (warehouseId: string): void => {
    sessionStorage.setItem(SELECTED_WAREHOUSE_STORAGE_KEY, warehouseId);
    if (selectedId !== warehouseId) {
      setSelectedId(warehouseId);
      setLocations([]);
    }
    const selected = warehouses.find((warehouse) => warehouse.id === warehouseId);
    if (selected) setEditForm(getWarehouseEditForm(selected));
  };

  const handleOpenWarehouseDetail = (warehouse: Warehouse): void => {
    selectWarehouse(warehouse.id);
    setIsDetailModalOpen(true);
  };

  // Open Location Modal for a specific warehouse
  const handleOpenLocationModal = (warehouse: Warehouse): void => {
    selectWarehouse(warehouse.id);
    setLocationSearchQuery('');
    setLocationForm({
      code: '',
      zone: '',
      aisle: '',
      rack: '',
      shelf: '',
    });
    warehouseService
      .getLocations(warehouse.id)
      .then(setLocations)
      .catch(() => {});
    setIsLocationModalOpen(true);
  };

  // Open Assign Agency Modal for a specific warehouse
  const handleOpenAssignAgencyModal = (warehouse: Warehouse): void => {
    selectWarehouse(warehouse.id);
    setSelectedAgenciesToAssign([]);
    setAgencySearchQuery('');
    setIsAssignAgencyModalOpen(true);
  };

  // Open Edit Modal for a specific warehouse
  const handleOpenEditModal = (warehouse: Warehouse): void => {
    selectWarehouse(warehouse.id);
    setEditForm(getWarehouseEditForm(warehouse));
    setIsEditModalOpen(true);
  };

  // Danh sách kho hiển thị theo phân quyền người dùng:
  // - Thủ kho (isKeeper): Giới hạn chỉ hiển thị đúng 1 kho mình phụ trách (1-1)
  // - Quản lý kho / Admin: Hiển thị toàn bộ các kho trên hệ thống
  const visibleWarehouses = useMemo(() => {
    if (isKeeper) {
      if (warehouses.length <= 1) return warehouses;
      const keeperWhId = user?.warehouseId || (user as any)?.assignedWarehouseId;
      const matched = warehouses.filter(
        (w) =>
          (keeperWhId && w.id === keeperWhId) ||
          (user?.id && w.managerId === user.id)
      );
      if (matched.length > 0) return matched;
      if (keeperWhId) {
        const byId = warehouses.filter((w) => w.id === keeperWhId);
        if (byId.length > 0) return byId;
      }
      return warehouses.slice(0, 1);
    }
    return warehouses;
  }, [warehouses, isKeeper, user]);

  const paginatedWarehouses = tableWarehouses;

  // Agencies assigned to the currently selected warehouse
  const assignedAgencies = useMemo(
    () => (selectedId ? agencies.filter((agency) => agencyDefaults[agency.id] === selectedId) : []),
    [agencies, agencyDefaults, selectedId]
  );

  // Agencies for the Assign Modal (filtered by search)
  const selectableAgencies = useMemo(() => {
    const query = normalizeVietnamese(agencySearchQuery.trim());
    return agencies.filter((agency) => {
      if (!query) return true;
      return (
        normalizeVietnamese(agency.name || '').includes(query) ||
        normalizeVietnamese(agency.code || '').includes(query) ||
        (agency.phone && agency.phone.includes(query)) ||
        (agency.address && normalizeVietnamese(agency.address).includes(query))
      );
    });
  }, [agencies, agencySearchQuery]);

  // Locations filtered by search query
  const filteredLocations = useMemo(() => {
    const query = normalizeVietnamese(locationSearchQuery.trim());
    if (!query) return locations;
    return locations.filter((loc) => {
      const code = normalizeVietnamese(loc.code || '');
      const zone = normalizeVietnamese(loc.zone || '');
      const aisle = normalizeVietnamese(loc.aisle || '');
      const rack = normalizeVietnamese(loc.rack || '');
      const shelf = normalizeVietnamese(loc.shelf || '');
      const bin = normalizeVietnamese(loc.bin || '');
      return (
        code.includes(query) ||
        zone.includes(query) ||
        aisle.includes(query) ||
        rack.includes(query) ||
        shelf.includes(query) ||
        bin.includes(query)
      );
    });
  }, [locations, locationSearchQuery]);

  // KPI summary statistics for dashboard top cards
  const activeCount = useMemo(
    () => visibleWarehouses.filter((w) => w.status === 'ACTIVE').length,
    [visibleWarehouses]
  );
  const inactiveCount = useMemo(
    () => visibleWarehouses.filter((w) => w.status === 'INACTIVE').length,
    [visibleWarehouses]
  );
  const totalLocations = useMemo(
    () => visibleWarehouses.reduce((sum, w) => sum + (w.locationCount || 0), 0),
    [visibleWarehouses]
  );
  const totalAssignedAgencies = useMemo(() => {
    const visibleIds = new Set(visibleWarehouses.map((w) => w.id));
    return Object.values(agencyDefaults).filter((whId) => visibleIds.has(whId)).length;
  }, [visibleWarehouses, agencyDefaults]);

  // CREATE WAREHOUSE
  const handleCreateWarehouse = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const cleanPhone = sanitizePhoneNumber(warehouseForm.phone);
    if (cleanPhone && !VIETNAM_PHONE_REGEX.test(cleanPhone)) {
      showToast(
        'error',
        'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm đúng 10 chữ số (bắt đầu bằng 02, 03, 05, 07, 08, 09).'
      );
      return;
    }
    setBusy(true);
    try {
      const created = await warehouseService.createWarehouse({
        ...warehouseForm,
        phone: cleanPhone || undefined,
        managerId: warehouseForm.managerId || undefined,
      });
      setWarehouseForm({ code: '', name: '', address: '', phone: '', managerId: '' });
      setIsCreateModalOpen(false);
      selectWarehouse(created.id);
      await reload();
      await loadTableWarehouses();
      showToast('success', 'Đã tạo kho hàng mới thành công');
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể tạo kho hàng'));
    } finally {
      setBusy(false);
    }
  };

  // UPDATE WAREHOUSE
  const handleUpdateWarehouse = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const targetId = selectedId || selectedWarehouse?.id;
    if (!targetId) {
      showToast('error', 'Chưa chọn kho hàng cần cập nhật');
      return;
    }
    const cleanPhone = sanitizePhoneNumber(editForm.phone);
    if (cleanPhone && !VIETNAM_PHONE_REGEX.test(cleanPhone)) {
      showToast(
        'error',
        'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam gồm đúng 10 chữ số (bắt đầu bằng 02, 03, 05, 07, 08, 09).'
      );
      return;
    }
    setBusy(true);
    try {
      await warehouseService.updateWarehouse(targetId, {
        name: editForm.name,
        address: editForm.address,
        phone: cleanPhone || undefined,
        managerId: editForm.managerId || undefined,
        status: editForm.status,
      });
      setIsEditModalOpen(false);
      await reload();
      await loadTableWarehouses();
      try {
        const updatedLocations = await warehouseService.getLocations(targetId);
        setLocations(updatedLocations);
      } catch {
        // ignore
      }
      showToast('success', 'Đã cập nhật thông tin kho hàng');
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể cập nhật kho hàng'));
    } finally {
      setBusy(false);
    }
  };

  // CREATE LOCATION
  const handleCreateLocation = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    try {
      await warehouseService.createLocation(selectedId, locationForm);
      setLocationForm({ code: '', zone: '', aisle: '', rack: '', shelf: '' });
      const updatedLocations = await warehouseService.getLocations(selectedId);
      setLocations(updatedLocations);
      setWarehouses((prev) =>
        prev.map((w) => (w.id === selectedId ? { ...w, locationCount: updatedLocations.length } : w))
      );
      showToast('success', 'Đã thêm vị trí lưu kho thành công');
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể thêm vị trí'));
    } finally {
      setBusy(false);
    }
  };

  // ASSIGN AGENCY (Kho 1-n Đại lý)
  const handleAssignAgency = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (selectedAgenciesToAssign.length === 0 || !selectedId) return;
    setBusy(true);
    try {
      await warehouseService.assignAgencies(selectedId, selectedAgenciesToAssign);
      setAgencyDefaults((current) => {
        const next = { ...current };
        selectedAgenciesToAssign.forEach((targetAgencyId) => {
          next[targetAgencyId] = selectedId;
        });
        return next;
      });
      setIsAssignAgencyModalOpen(false);
      const count = selectedAgenciesToAssign.length;
      setSelectedAgenciesToAssign([]);
      showToast('success', `Đã gán thành công ${count} đại lý vào kho ${selectedWarehouse?.name || ''}`);
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể gán kho cho đại lý'));
    } finally {
      setBusy(false);
    }
  };

  // UNASSIGN AGENCY
  const handleUnassignAgency = async (agency: Customer): Promise<void> => {
    try {
      await warehouseService.setAgencyDefaultWarehouse(agency.id, null);
      setAgencyDefaults((current) => {
        const next = { ...current };
        delete next[agency.id];
        return next;
      });
      showToast('success', `Đã hủy gán kho cho đại lý ${agency.name}`);
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể hủy gán kho'));
    }
  };

  // Quản lý dropdown Thao tác (Hình 2)
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<{
    top: number;
    right: number;
    isDropUp: boolean;
  } | null>(null);

  // Quản lý modal xác nhận xóa kho vĩnh viễn khỏi hệ thống & CSDL
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
  const [deleteEligibility, setDeleteEligibility] = useState<{
    canDelete: boolean;
    hasPositiveStock: boolean;
    totalOnHand: number;
    totalAllocated: number;
    hasZeroStockProducts: boolean;
    productRecordCount: number;
    isEmpty: boolean;
    warehouseName: string;
    warehouseCode: string;
    message: string;
  } | null>(null);
  const [isCheckingDelete, setIsCheckingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Mở modal xóa kho kèm kiểm tra điều kiện ràng buộc
  const handleOpenDeleteModal = async (warehouse: Warehouse): Promise<void> => {
    setWarehouseToDelete(warehouse);
    setDeleteModalOpen(true);
    setIsCheckingDelete(true);
    setDeleteEligibility(null);
    try {
      const res = await warehouseService.checkDeleteEligibility(warehouse.id);
      setDeleteEligibility(res);
    } catch {
      // fallback
    } finally {
      setIsCheckingDelete(false);
    }
  };

  // Đóng dropdown thao tác khi click ra ngoài, cuộn trang hoặc nhấn ESC
  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (
        !(e.target as HTMLElement).closest('.warehouse-action-dropdown-container') &&
        !(e.target as HTMLElement).closest('.warehouse-action-portal-menu')
      ) {
        setOpenActionMenuId(null);
        setActionMenuAnchor(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenActionMenuId(null);
        setActionMenuAnchor(null);
      }
    };
    const handleScrollOrResize = () => {
      setOpenActionMenuId(null);
      setActionMenuAnchor(null);
    };

    document.addEventListener('click', handleDocClick);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('click', handleDocClick);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // XÓA KHO VĨNH VIỄN KHỎI HỆ THỐNG & CSDL
  const handleConfirmDelete = async (): Promise<void> => {
    if (!warehouseToDelete) return;
    setIsDeleting(true);
    try {
      const confirmZeroStock = deleteEligibility?.hasZeroStockProducts || false;
      await warehouseService.deleteWarehouse(warehouseToDelete.id, confirmZeroStock);
      showToast(
        'success',
        `Đã xóa kho hàng "${warehouseToDelete.name}" (${warehouseToDelete.code}) và toàn bộ dữ liệu liên quan khỏi hệ thống`
      );

      // Nếu đang chọn kho bị xóa thì bỏ chọn
      if (selectedId === warehouseToDelete.id) {
        setSelectedId('');
        sessionStorage.removeItem(SELECTED_WAREHOUSE_STORAGE_KEY);
      }

      setDeleteModalOpen(false);
      setWarehouseToDelete(null);
      setDeleteEligibility(null);

      // Tải lại dữ liệu hệ thống
      await reload();
      await loadTableWarehouses();
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể xóa kho hàng'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* 1. THỐNG KÊ TỔNG QUAN (KPI SUMMARY) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">Tổng số kho hàng</span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{visibleWarehouses.length}</div>
            <span className="text-[11px] text-slate-400 block">
              {isKeeper ? 'Kho được phân công' : 'Kho trên toàn hệ thống'}
            </span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <WarehouseIcon size={20} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">Đang hoạt động</span>
            <div className="text-2xl font-bold text-emerald-600 tracking-tight">{activeCount}</div>
            <span className="text-[11px] text-slate-400 block">Sẵn sàng xuất / nhập</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">Vị trí lưu kho</span>
            <div className="text-2xl font-bold text-indigo-600 tracking-tight">{totalLocations}</div>
            <span className="text-[11px] text-slate-400 block">Khu / Dãy / Kệ / Tầng</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Layers size={20} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-500 block">Đại lý đã liên kết</span>
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{totalAssignedAgencies}</div>
            <span className="text-[11px] text-slate-400 block">Đã phân bổ kho phục vụ</span>
          </div>
          <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
        </div>
      </section>

      {/* 2. BỘ LỌC TÌM KIẾM (FILTER CARD) */}
      <section className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã kho, tên kho, địa chỉ, số điện thoại..."
              className="w-full h-[38px] pl-9 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateFilter({ search: undefined, page: 1 });
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Select trạng thái */}
          <div className="sm:w-56">
            <select
              value={statusParam}
              onChange={(e) => updateFilter({ status: e.target.value, page: 1 })}
              className="w-full h-[38px] px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái ({visibleWarehouses.length})</option>
              <option value="ACTIVE">Đang hoạt động ({activeCount})</option>
              <option value="INACTIVE">Ngưng hoạt động ({inactiveCount})</option>
            </select>
          </div>

          {/* Nút Tạo kho mới */}
          {(isAdmin || isManager) && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
            >
              <Plus size={15} /> Tạo kho mới
            </button>
          )}
        </div>
      </section>

      {/* 4. BẢNG DANH SÁCH KHO HÀNG */}
      <section className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="w-full overflow-hidden">
          <table className="table-fixed w-full text-left text-xs text-slate-600 divide-y divide-slate-100">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/80">
                <th className="w-[16%] px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Mã kho
                </th>
                <th className="w-[32%] px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Tên kho
                </th>
                <th className="w-[26%] px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Thủ kho phụ trách
                </th>
                <th className="w-[14%] px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="w-[12%] px-4 py-3 text-right pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoadingTable ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                      <span>Đang tải danh sách kho...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedWarehouses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <WarehouseIcon className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Không tìm thấy kho hàng nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchParam || statusParam !== 'ALL'
                        ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bộ lọc trạng thái'
                        : 'Chưa có kho hàng nào được khai báo trong hệ thống.'}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedWarehouses.map((item) => {
                  const manager = managers.find((m) => m.id === item.managerId);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Mã kho */}
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                        <span className="rounded bg-slate-100 px-2 py-0.5 border border-slate-200">
                          {item.code}
                        </span>
                      </td>

                      {/* Tên kho */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 text-xs truncate" title={item.name}>
                          {item.name}
                        </div>
                        {item.address && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5" title={item.address}>
                            {item.address}
                          </div>
                        )}
                      </td>

                      {/* Người phụ trách */}
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-700 truncate">
                          {manager?.name ? (
                            <span>
                              <span className="font-medium text-slate-800">{manager.name}</span>
                              {(manager.roleName || manager.roleCode) && (
                                <span className="text-slate-400 text-[11px] ml-1">
                                  ({manager.roleName || manager.roleCode})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400">Chưa phân công</span>
                          )}
                        </div>
                      </td>

                      {/* Trạng thái: Dấu chấm xanh (active), xám (inactive) */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <span
                            className={`inline-block h-2.5 w-2.5 rounded-full ${
                              item.status === 'ACTIVE'
                                ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                                : 'bg-slate-300'
                            }`}
                            title={item.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                          />
                        </div>
                      </td>

                      {/* Thao tác: Nút bấm Dropdown chuẩn */}
                      <td className="px-4 py-3 text-right pr-4 whitespace-nowrap">
                        <div className="warehouse-action-dropdown-container inline-block">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (openActionMenuId === item.id) {
                                setOpenActionMenuId(null);
                                setActionMenuAnchor(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const isDropUp = window.innerHeight - rect.bottom < 180;
                                setActionMenuAnchor({
                                  top: isDropUp ? rect.top : rect.bottom + 4,
                                  right: window.innerWidth - rect.right,
                                  isDropUp,
                                });
                                setOpenActionMenuId(item.id);
                              }
                            }}
                            className={`inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer shadow-2xs select-none whitespace-nowrap ${
                              openActionMenuId === item.id
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600'
                            }`}
                            title="Thao tác"
                          >
                            <span>Thao tác</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                                openActionMenuId === item.id ? 'rotate-180 text-indigo-600' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dropdown Menu Portal Thao tác */}
        {openActionMenuId && actionMenuAnchor && typeof document !== 'undefined' && (() => {
          const warehouse = visibleWarehouses.find((item) => item.id === openActionMenuId);
          if (!warehouse) return null;

          return createPortal(
            <div
              className="warehouse-action-portal-menu fixed w-52 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-[9999] animate-in fade-in zoom-in-95 text-left divide-y divide-slate-100"
              style={{
                top: actionMenuAnchor.isDropUp ? undefined : `${actionMenuAnchor.top}px`,
                bottom: actionMenuAnchor.isDropUp ? `${window.innerHeight - actionMenuAnchor.top}px` : undefined,
                right: `${actionMenuAnchor.right}px`,
              }}
            >
              <div className="py-1">
                {/* 1. Xem chi tiết kho */}
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuId(null);
                    setActionMenuAnchor(null);
                    handleOpenWarehouseDetail(warehouse);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-slate-400" />
                  <span>Xem chi tiết kho</span>
                </button>

                {/* 2. Quản lý vị trí lưu trữ */}
                <button
                  type="button"
                  onClick={() => {
                    setOpenActionMenuId(null);
                    setActionMenuAnchor(null);
                    handleOpenLocationModal(warehouse);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>Quản lý vị trí lưu trữ</span>
                </button>

                {/* 3. Gán đại lý phục vụ (Chỉ Admin và Quản lý kho) */}
                {(isAdmin || isManager) && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenActionMenuId(null);
                      setActionMenuAnchor(null);
                      handleOpenAssignAgencyModal(warehouse);
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <span>Gán đại lý phục vụ</span>
                  </button>
                )}
              </div>
            </div>,
            document.body
          );
        })()}

        {/* Phân trang chuẩn hệ thống */}
        {totalItems > 0 && (
          <div className="border-t border-slate-100 bg-white px-4 py-3">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50]}
              itemLabel="kho hàng"
              showRecordRange={false}
              showFirstLast={false}
              onPageChange={(newPage) => updateFilter({ page: newPage })}
              onPageSizeChange={(newSize) => updateFilter({ limit: newSize, page: 1 })}
            />
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* POPUP CHI TIẾT KHO HÀNG (CHỈ HIỆN: MÃ, TÊN, ĐỊA CHỈ, NGƯỜI PHỤ TRÁCH, TRẠNG THÁI) */}
      {/* ========================================================================= */}
      <ModalLayout
        isOpen={isDetailModalOpen && !!selectedWarehouse}
        onClose={() => setIsDetailModalOpen(false)}
        title="Chi tiết kho hàng"
        subtitle={`Mã kho: ${selectedWarehouse?.code || ''}`}
        icon={<WarehouseIcon size={22} className="text-[#371cdb]" />}
        maxWidth="max-w-lg"
        bodyClassName="p-5 sm:p-6 space-y-4 bg-slate-50/60"
        footer={
          <div className="flex items-center justify-between w-full">
            {(isAdmin || isManager) ? (
              <button
                type="button"
                onClick={() => {
                  if (selectedWarehouse) {
                    const target = selectedWarehouse;
                    setIsDetailModalOpen(false);
                    void handleOpenDeleteModal(target);
                  }
                }}
                className="inline-flex items-center gap-1.5 h-[38px] px-3.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 size={14} /> Xóa kho
              </button>
            ) : <div />}
            {(isAdmin || isManager) && (
              <button
                type="button"
                onClick={() => {
                  if (selectedWarehouse) {
                    setIsDetailModalOpen(false);
                    handleOpenEditModal(selectedWarehouse);
                  }
                }}
                className="inline-flex items-center gap-1.5 h-[38px] px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Edit3 size={14} /> Sửa thông tin
              </button>
            )}
          </div>
        }
      >
        {selectedWarehouse && (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
            <div className="divide-y divide-slate-100">
              {/* Tên kho */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3.5">
                <span className="text-xs font-medium text-slate-500">Tên kho</span>
                <span className="text-sm font-bold text-slate-900 text-left sm:text-right">
                  {selectedWarehouse.name}
                </span>
              </div>

              {/* Mã kho */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-3.5">
                <span className="text-xs font-medium text-slate-500">Mã kho</span>
                <span className="inline-flex items-center self-start sm:self-auto rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-800">
                  {selectedWarehouse.code}
                </span>
              </div>

              {/* Địa chỉ */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1 py-3.5">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1 shrink-0">
                  <MapPin size={13} className="text-slate-400" />
                  Địa chỉ
                </span>
                <span className="text-xs sm:text-sm font-medium text-slate-800 text-left sm:text-right max-w-sm">
                  {selectedWarehouse.address || 'Chưa cập nhật'}
                </span>
              </div>

              {/* Người phụ trách */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 py-3.5">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1 shrink-0">
                  <User size={13} className="text-slate-400" />
                  Người phụ trách
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-800 text-left sm:text-right">
                  {managers.find((m) => m.id === selectedWarehouse.managerId)?.name || 'Chưa phân công'}
                </span>
              </div>

              {/* Trạng thái */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-3.5">
                <span className="text-xs font-medium text-slate-500">Trạng thái</span>
                <span
                  className={`inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full px-3 py-1 text-xs font-semibold ${
                    selectedWarehouse.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      selectedWarehouse.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  {selectedWarehouse.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                </span>
              </div>
            </div>
          </div>
        )}
      </ModalLayout>

      {/* ========================================================================= */}
      {/* POPUP 1: KHAI BÁO KHO MỚI                                                 */}
      {/* ========================================================================= */}
      <ModalLayout
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Khai báo kho mới"
        subtitle="Thêm kho hàng mới vào hệ thống quản lý chuỗi cung ứng"
        icon={<WarehouseIcon size={20} className="text-[#371cdb]" />}
        maxWidth="max-w-3xl"
        bodyAs="form"
        onFormSubmit={(e) => void handleCreateWarehouse(e)}
        footer={
          <div className="flex items-center justify-end gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              onClick={(e) => void handleCreateWarehouse(e)}
              className="inline-flex items-center gap-1.5 h-[38px] px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus size={15} /> Tạo kho
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mã kho <span className="text-rose-500">*</span>
              </label>
              <input
                required
                placeholder="VD: KHO-MB-02"
                value={warehouseForm.code}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tên kho <span className="text-rose-500">*</span>
              </label>
              <input
                required
                placeholder="VD: Kho Phân Phối Hà Nội"
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Địa chỉ kho <span className="text-rose-500">*</span>
            </label>
            <input
              required
              placeholder="VD: Lô CN-05 KCN Ninh Hiệp, Gia Lâm, Hà Nội"
              value={warehouseForm.address}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
              className="w-full h-[38px] px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Số điện thoại liên hệ
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="VD: 0912345678"
                value={warehouseForm.phone}
                onKeyDown={handlePhoneKeyDown}
                onChange={(e) =>
                  setWarehouseForm({
                    ...warehouseForm,
                    phone: sanitizePhoneNumber(e.target.value),
                  })
                }
                className="w-full h-[38px] px-3 rounded-lg border border-slate-200 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
              />
              {warehouseForm.phone && warehouseForm.phone.length > 0 && !VIETNAM_PHONE_REGEX.test(warehouseForm.phone) && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">
                  {warehouseForm.phone.length < 10
                    ? `Cần nhập đủ 10 chữ số (hiện tại: ${warehouseForm.phone.length}/10 số)`
                    : 'Đầu số không hợp lệ. Số ĐT Việt Nam bắt đầu bằng 02, 03, 05, 07, 08, 09'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Thủ kho phụ trách
              </label>
              <SearchableManagerSelect
                managers={managers}
                value={warehouseForm.managerId}
                onChange={(managerId) =>
                  setWarehouseForm({ ...warehouseForm, managerId })
                }
                placeholder="Chọn người phụ trách..."
              />
            </div>
          </div>
        </div>
      </ModalLayout>

      {/* ========================================================================= */}
      {/* POPUP 2: SỬA THÔNG TIN KHO                                                */}
      {/* ========================================================================= */}
      <ModalLayout
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh sửa thông tin kho"
        subtitle={selectedWarehouse ? `${selectedWarehouse.code} · ${selectedWarehouse.name}` : ''}
        icon={<Edit3 size={20} className="text-indigo-600" />}
        maxWidth="max-w-2xl"
        bodyAs="form"
        onFormSubmit={(e) => void handleUpdateWarehouse(e)}
        footer={
          <div className="flex items-center justify-end w-full">
            <button
              type="submit"
              disabled={busy}
              onClick={(e) => void handleUpdateWarehouse(e)}
              className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check size={15} /> Lưu thay đổi
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mã kho (Cố định)
              </label>
              <input
                disabled
                value={selectedWarehouse?.code || ''}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 font-mono text-xs cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tên kho <span className="text-rose-500">*</span>
              </label>
              <input
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full h-[38px] px-3 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Địa chỉ kho <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="w-full h-[38px] px-3 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Số điện thoại
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={10}
                placeholder="VD: 0912345678"
                value={editForm.phone}
                onKeyDown={handlePhoneKeyDown}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    phone: sanitizePhoneNumber(e.target.value),
                  })
                }
                className="w-full h-[38px] px-3 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
              />
              {editForm.phone && editForm.phone.length > 0 && !VIETNAM_PHONE_REGEX.test(editForm.phone) && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">
                  {editForm.phone.length < 10
                    ? `Cần nhập đủ 10 chữ số (hiện tại: ${editForm.phone.length}/10 số)`
                    : 'Đầu số không hợp lệ. Số ĐT Việt Nam bắt đầu bằng 02, 03, 05, 07, 08, 09'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Thủ kho phụ trách
              </label>
              <SearchableManagerSelect
                managers={managers}
                value={editForm.managerId}
                onChange={(managerId) =>
                  setEditForm({ ...editForm, managerId })
                }
                placeholder="Chọn người phụ trách..."
                currentWarehouseId={selectedWarehouse?.id}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Trạng thái
              </label>
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value as Warehouse['status'] })
                }
                className="w-full h-[38px] px-3 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white cursor-pointer"
              >
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Ngưng hoạt động</option>
              </select>
            </div>
          </div>
        </div>
      </ModalLayout>

      {/* ========================================================================= */}
      {/* POPUP 3: QUẢN LÝ & LƯU VỊ TRÍ LƯU TRỮ                                     */}
      {/* ========================================================================= */}
      <ModalLayout
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        title={`Vị trí lưu trữ — ${selectedWarehouse?.name || ''}`}
        subtitle={`Mã kho: ${selectedWarehouse?.code || ''} · ${locations.length} vị trí đã khai báo`}
        icon={<MapPin size={20} className="text-[#371cdb]" />}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          {/* Form thêm vị trí mới */}
          <form
            onSubmit={(e) => void handleCreateLocation(e)}
            className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-3"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Plus size={14} className="text-[#371cdb]" />
              Khai báo vị trí mới
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mã vị trí <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  placeholder="VD: A1-01-02"
                  value={locationForm.code}
                  onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-[#371cdb] focus:ring-2 focus:ring-[#371cdb]/10"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Khu (Zone)</label>
                <input
                  placeholder="VD: Khu A"
                  value={locationForm.zone}
                  onChange={(e) => setLocationForm({ ...locationForm, zone: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-[#371cdb] focus:ring-2 focus:ring-[#371cdb]/10"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Dãy (Aisle)</label>
                <input
                  placeholder="VD: Dãy 1"
                  value={locationForm.aisle}
                  onChange={(e) => setLocationForm({ ...locationForm, aisle: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-[#371cdb] focus:ring-2 focus:ring-[#371cdb]/10"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Kệ (Rack)</label>
                <input
                  placeholder="VD: Kệ 01"
                  value={locationForm.rack}
                  onChange={(e) => setLocationForm({ ...locationForm, rack: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-[#371cdb] focus:ring-2 focus:ring-[#371cdb]/10"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tầng (Shelf)</label>
                <input
                  placeholder="VD: Tầng 2"
                  value={locationForm.shelf}
                  onChange={(e) => setLocationForm({ ...locationForm, shelf: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs outline-none focus:border-[#371cdb] focus:ring-2 focus:ring-[#371cdb]/10"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full h-9 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#371cdb] hover:bg-[#2d14b8] text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus size={14} /> Thêm vị trí
                </button>
              </div>
            </div>
          </form>

          {/* Danh sách vị trí hiện có */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <span>Danh sách vị trí ({locations.length})</span>
                {locationSearchQuery && (
                  <span className="text-[11px] font-normal normal-case text-slate-400">
                    (Khớp {filteredLocations.length})
                  </span>
                )}
              </h3>

              {/* Ô tìm kiếm vị trí */}
              {locations.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Tìm mã vị trí, khu, kệ, tầng..."
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-7 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-[#371cdb] focus:ring-2 focus:ring-[#371cdb]/10 transition-all"
                  />
                  {locationSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLocationSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      title="Xóa tìm kiếm"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {locations.length ? (
              filteredLocations.length ? (
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border rounded-xl border-slate-200">
                  {filteredLocations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between p-3 text-xs hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-slate-900 font-mono mr-2">
                          {loc.code}
                        </span>
                        <span className="text-slate-500">
                          {[
                            loc.zone && `Khu: ${loc.zone}`,
                            loc.aisle && `Dãy: ${loc.aisle}`,
                            loc.rack && `Kệ: ${loc.rack}`,
                            loc.shelf && `Tầng: ${loc.shelf}`,
                            loc.bin && `Ngăn: ${loc.bin}`,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 shrink-0">
                        Sẵn sàng
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500">
                  <Search className="mx-auto h-6 w-6 text-slate-300 mb-1.5" />
                  <p className="font-semibold text-slate-700">
                    Không tìm thấy vị trí phù hợp
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Không có vị trí nào khớp với từ khóa "{locationSearchQuery}"
                  </p>
                </div>
              )
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                Chưa có vị trí nào được khai báo cho kho này.
              </div>
            )}
          </div>
        </div>
      </ModalLayout>

      {/* ========================================================================= */}
      {/* POPUP 4: THÊM ĐẠI LÝ VÀO KHO MẶC ĐỊNH (CHỈ CHỌN 1 ĐẠI LÝ, DISABLE ĐẠI LÝ ĐÃ GÁN) */}
      {/* ========================================================================= */}
      <ModalLayout
        isOpen={isAssignAgencyModalOpen}
        onClose={() => setIsAssignAgencyModalOpen(false)}
        title={`Gán đại lý cho ${selectedWarehouse?.name || ''}`}
        subtitle="Chỉ định các đại lý phục vụ bởi kho này (1 kho phục vụ nhiều đại lý)"
        icon={<Building2 size={20} className="text-[#371cdb]" />}
        maxWidth="max-w-2xl"
        bodyAs="form"
        onFormSubmit={(e) => void handleAssignAgency(e)}
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-slate-500 font-medium truncate max-w-[280px]">
              {selectedAgenciesToAssign.length > 0 ? (
                <span>
                  Đang chọn:{' '}
                  <strong className="text-[#371cdb] font-bold">
                    {selectedAgenciesToAssign.length} đại lý
                  </strong>
                </span>
              ) : (
                <span>Chưa chọn đại lý nào</span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsAssignAgencyModalOpen(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={busy || selectedAgenciesToAssign.length === 0}
                onClick={(e) => void handleAssignAgency(e)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#371cdb] hover:bg-[#2d14b8] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check size={16} /> Xác nhận gán ({selectedAgenciesToAssign.length}) đại lý
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Thông tin các đại lý đang được gán cho kho này */}
          <div className="rounded-xl bg-blue-50/70 border border-blue-200/80 p-3 text-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-800 flex items-center gap-2">
                <Building2 size={16} className="text-[#371cdb]" />
                Đại lý đang phục vụ bởi kho này ({assignedAgencies.length} đại lý):
              </span>
            </div>
            {assignedAgencies.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {assignedAgencies.map((agency) => (
                  <div
                    key={agency.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white border border-blue-100 shadow-2xs"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-800 truncate">
                        {agency.name}{' '}
                        <span className="font-mono text-slate-500 font-normal">({agency.code})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {agency.address || agency.phone || 'Chưa có thông tin địa chỉ'}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleUnassignAgency(agency)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 font-semibold text-[11px] transition-colors cursor-pointer shrink-0"
                      title="Hủy gán đại lý khỏi kho này"
                    >
                      <Trash2 size={12} /> Hủy gán
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic text-[11px]">Chưa có đại lý nào được gán cho kho này.</p>
            )}
          </div>

          {/* Ô tìm kiếm đại lý */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={agencySearchQuery}
              onChange={(e) => setAgencySearchQuery(e.target.value)}
              placeholder="Tìm đại lý theo mã, tên, số điện thoại, địa chỉ..."
              className="w-full h-10 pl-9 pr-8 rounded-lg border border-slate-200 text-sm outline-none focus:border-[#371cdb] focus:ring-4 focus:ring-[#371cdb]/10"
            />
            {agencySearchQuery && (
              <button
                type="button"
                onClick={() => setAgencySearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Hướng dẫn chọn đại lý */}
          {(() => {
            const unassignedAgencies = selectableAgencies.filter((a) => !agencyDefaults[a.id]);
            const availableCount = unassignedAgencies.length;
            const allSelected = availableCount > 0 && unassignedAgencies.every((a) => selectedAgenciesToAssign.includes(a.id));

            return (
              <div className="flex items-center justify-between px-1 text-xs text-slate-600">
                <span>
                  Danh sách đại lý ({availableCount} đại lý chưa gán kho có thể chọn):
                </span>
                <div className="flex items-center gap-3">
                  {availableCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (allSelected) {
                          setSelectedAgenciesToAssign((prev) =>
                            prev.filter((id) => !unassignedAgencies.some((a) => a.id === id))
                          );
                        } else {
                          const unassignedIds = unassignedAgencies.map((a) => a.id);
                          setSelectedAgenciesToAssign((prev) => Array.from(new Set([...prev, ...unassignedIds])));
                        }
                      }}
                      className="text-[#371cdb] hover:underline font-semibold cursor-pointer"
                    >
                      {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </button>
                  )}
                  {selectedAgenciesToAssign.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedAgenciesToAssign([])}
                      className="text-rose-600 hover:underline font-semibold cursor-pointer"
                    >
                      Xóa lựa chọn ({selectedAgenciesToAssign.length})
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Danh sách đại lý */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 border rounded-xl border-slate-200">
            {selectableAgencies.length ? (
              selectableAgencies.map((agency) => {
                const currentWarehouseId = agencyDefaults[agency.id];
                const currentWh = warehouses.find((w) => w.id === currentWarehouseId);
                const isAlreadyThisWarehouse = currentWarehouseId === selectedId;
                const isAssignedToOtherWarehouse = Boolean(
                  currentWarehouseId && currentWarehouseId !== selectedId
                );
                const isUnassignable = isAlreadyThisWarehouse || isAssignedToOtherWarehouse;
                const isSelected = selectedAgenciesToAssign.includes(agency.id);

                return (
                  <div
                    key={agency.id}
                    onClick={() => {
                      if (isUnassignable) return;
                      setSelectedAgenciesToAssign((prev) =>
                        prev.includes(agency.id)
                          ? prev.filter((id) => id !== agency.id)
                          : [...prev, agency.id]
                      );
                    }}
                    className={`flex items-center justify-between p-3 text-xs transition-colors ${
                      isUnassignable
                        ? 'bg-slate-50/80 opacity-60 cursor-not-allowed select-none'
                        : isSelected
                        ? 'bg-[#eff2fe] text-[#371cdb] cursor-pointer ring-1 ring-inset ring-[#371cdb]/30'
                        : 'hover:bg-slate-50 text-slate-700 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <input
                        type="checkbox"
                        disabled={isUnassignable}
                        checked={isSelected}
                        onChange={() => {
                          if (isUnassignable) return;
                          setSelectedAgenciesToAssign((prev) =>
                            prev.includes(agency.id)
                              ? prev.filter((id) => id !== agency.id)
                              : [...prev, agency.id]
                          );
                        }}
                        className={`w-4 h-4 rounded text-[#371cdb] focus:ring-[#371cdb] ${
                          isUnassignable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                          <span>{agency.name}</span>
                          <span className="font-normal text-slate-500 font-mono text-[11px]">
                            ({agency.code})
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {agency.address || agency.phone || 'Chưa có thông tin địa chỉ'}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {isAlreadyThisWarehouse ? (
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            Đang gán kho này
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleUnassignAgency(agency);
                            }}
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-medium text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                            title="Hủy gán đại lý này"
                          >
                            <Trash2 size={11} /> Hủy gán
                          </button>
                        </div>
                      ) : currentWh ? (
                        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                          Đang gán: {currentWh.code} · Không thể chọn
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200">
                          Chưa gán kho
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                <Search className="mx-auto h-6 w-6 text-slate-300 mb-1.5" />
                <p className="font-semibold text-slate-600">Không tìm thấy đại lý nào phù hợp</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Thử tìm kiếm với từ khóa khác hoặc xóa ô tìm kiếm
                </p>
              </div>
            )}
          </div>

          {/* Tóm tắt xác nhận chọn đại lý */}
          {selectedAgenciesToAssign.length > 0 && (
            <div className="rounded-xl bg-blue-50/80 p-3.5 text-xs text-blue-900 border border-blue-200/70">
              <p className="font-semibold flex items-center gap-1.5">
                <Check size={14} className="text-[#371cdb]" />
                Xác nhận gán đại lý:
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                {selectedAgenciesToAssign.map((id) => {
                  const ag = agencies.find((a) => a.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 bg-white border border-blue-200 px-2 py-0.5 rounded text-[11px] font-medium text-blue-800"
                    >
                      {ag?.name || id}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAgenciesToAssign((prev) => prev.filter((i) => i !== id));
                        }}
                        className="text-slate-400 hover:text-rose-600 p-0.5 cursor-pointer"
                        title="Bỏ đại lý này"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
              </div>
              <p className="mt-1.5 text-blue-700 text-[11px]">
                Đại lý trên sẽ được chỉ định lấy hàng và xuất kho từ{' '}
                <strong>{selectedWarehouse?.name}</strong> cho các đơn hàng tiếp theo.
              </p>
            </div>
          )}
        </div>
      </ModalLayout>

      {/* ========================================================================= */}
      {/* MODAL XÁC NHẬN XÓA KHO VĨNH VIỄN KHỎI HỆ THỐNG & CƠ SỞ DỮ LIỆU            */}
      {/* ========================================================================= */}
      {deleteModalOpen && warehouseToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header cảnh báo */}
            <div className="p-6 pb-4 flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                deleteEligibility?.hasPositiveStock
                  ? 'bg-rose-50 border-rose-200 text-rose-600'
                  : deleteEligibility?.hasZeroStockProducts
                  ? 'bg-amber-50 border-amber-200 text-amber-600'
                  : 'bg-rose-50 border-rose-100 text-rose-600'
              }`}>
                <Trash2 size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  {deleteEligibility?.hasPositiveStock
                    ? 'Không thể xóa kho hàng'
                    : deleteEligibility?.hasZeroStockProducts
                    ? 'Xác nhận xóa kho và danh mục'
                    : 'Xác nhận xóa kho hàng'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {deleteEligibility?.hasPositiveStock
                    ? 'Hệ thống đã phát hiện kho này vẫn còn hàng tồn kho.'
                    : 'Xóa thông tin kho và dữ liệu liên quan khỏi cơ sở dữ liệu.'}
                </p>
              </div>
            </div>

            {/* Thông tin kho cần xóa */}
            <div className="px-6 py-3 bg-slate-50/80 border-y border-slate-100 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã kho:</span>
                <span className="font-mono font-bold text-slate-800">{warehouseToDelete.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tên kho:</span>
                <span className="font-semibold text-slate-800">{warehouseToDelete.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Địa chỉ:</span>
                <span className="text-slate-700 truncate max-w-[220px]">{warehouseToDelete.address}</span>
              </div>
            </div>

            {/* Chi tiết điều kiện xóa */}
            <div className="p-6 pt-4 space-y-4">
              {isCheckingDelete ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                  <span>Đang kiểm tra dữ liệu tồn kho...</span>
                </div>
              ) : deleteEligibility?.hasPositiveStock ? (
                /* TH1: Kho còn tồn kho > 0 -> Tuyệt đối không cho xóa */
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-rose-900">
                    ❌ Không được phép xóa kho này!
                  </p>
                  <p className="text-[11px] leading-relaxed text-rose-700">
                    Kho hàng hiện đang có sản phẩm tồn kho (<strong>Tồn thực tế: {deleteEligibility.totalOnHand}</strong>, <strong>Tạm giữ: {deleteEligibility.totalAllocated}</strong>).
                  </p>
                  <p className="text-[11px] leading-relaxed text-rose-600">
                    Theo quy định, kho còn hàng tồn tuyệt đối không được phép xóa. Vui lòng xuất kho hoặc điều chuyển toàn bộ tồn kho về 0 trước khi xóa.
                  </p>
                </div>
              ) : deleteEligibility?.hasZeroStockProducts ? (
                /* TH2: Kho có sản phẩm nhưng tồn = 0 (như kho Thái Nguyên) -> Cần xác nhận xóa sạch DB */
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5 text-amber-900">
                    ⚠️ Kho có sản phẩm nhưng đã hết hàng (Tồn kho = 0)
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-700">
                    Kho đang chứa <strong>{deleteEligibility.productRecordCount} sản phẩm</strong> trong danh mục nhưng toàn bộ số lượng tồn kho đều bằng 0.
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-800 font-medium">
                    Nếu bạn xác nhận xóa, kho và toàn bộ các bản ghi danh mục sản phẩm của kho này sẽ được xóa vĩnh viễn khỏi database.
                  </p>
                </div>
              ) : (
                /* TH3: Kho ma không có dữ liệu */
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-slate-800">
                    ℹ️ Kho trống không có dữ liệu (Kho ma)
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-600">
                    Kho hàng này hoàn toàn trống, không có hàng hóa hoặc lịch sử giao dịch. Bạn có thể an tâm xóa kho khỏi hệ thống.
                  </p>
                </div>
              )}

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setWarehouseToDelete(null);
                    setDeleteEligibility(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleteEligibility?.hasPositiveStock ? 'Đóng' : 'Hủy bỏ'}
                </button>

                {/* Nếu kho còn hàng > 0 thì KHÔNG hiển thị nút xóa */}
                {!deleteEligibility?.hasPositiveStock && !isCheckingDelete && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void handleConfirmDelete()}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Đang xóa...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        <span>
                          {deleteEligibility?.hasZeroStockProducts
                            ? 'Xác nhận xóa kho khỏi database'
                            : 'Xóa kho vĩnh viễn'}
                        </span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

