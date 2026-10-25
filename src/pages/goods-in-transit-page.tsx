import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Truck,
  Plus,
  Search,
  X,
  Building2,
  Filter,
  RotateCcw,
  ChevronDown,
} from 'lucide-react';
import { deliveryTripsService } from '../services/delivery-trips.service';
import type {
  CreateDeliveryTripPayload,
  DeliveryTrip,
  GoodsInTransitStats,
  StopDeliveryStatus,
} from '../types/delivery-trip';
import { STANDARD_WAREHOUSES } from '../constants/warehouse.constants';
import { TripStatsCards } from '../components/delivery-trips/trip-stats-cards';
import { TripCard } from '../components/delivery-trips/trip-card';
import { TripDetailModal } from '../components/delivery-trips/trip-detail-modal';
import { TripReturnCheckinModal } from '../components/delivery-trips/trip-return-checkin-modal';
import { CreateTripModal } from '../components/delivery-trips/create-trip-modal';
import { showToast } from '../components/toast';
import { getFriendlyErrorMessage } from '../utils/error-handler';

type FilterTab = 'ALL' | 'IN_TRANSIT_ON_TIME' | 'OVERDUE' | 'COMPLETED';

/**
 * Màn hình Theo dõi Hàng đã xuất trên đường (SN-194 / SN-197)
 * Giao diện Clean Corporate SaaS chuẩn hệ thống LOHA SALES, gọn gàng, trang nhã, responsive
 */
export const GoodsInTransitPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Đọc query parameters ban đầu từ URL
  const urlSearch = searchParams.get('search') || '';
  const urlStatus = (searchParams.get('status') as FilterTab) || 'ALL';
  const urlWarehouse = searchParams.get('warehouse') || 'ALL';

  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [stats, setStats] = useState<GoodsInTransitStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Bộ lọc đồng bộ URL
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [activeTab, setActiveTab] = useState<FilterTab>(urlStatus);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(urlWarehouse);

  // Modals state
  const [selectedTripForDetail, setSelectedTripForDetail] = useState<DeliveryTrip | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedTripForCheckin, setSelectedTripForCheckin] = useState<DeliveryTrip | null>(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Đồng bộ searchParams từ URL (hỗ trợ nút Back/Forward)
  useEffect(() => {
    const s = searchParams.get('search') || '';
    const st = (searchParams.get('status') as FilterTab) || 'ALL';
    const wh = searchParams.get('warehouse') || 'ALL';

    setSearchTerm((prev) => (prev !== s ? s : prev));
    setSearchInput((prev) => (prev !== s ? s : prev));
    setActiveTab((prev) => (prev !== st ? st : prev));
    setSelectedWarehouseId((prev) => (prev !== wh ? wh : prev));
  }, [searchParams]);

  // Cập nhật Query Parameters trên URL
  const updateQueryParams = useCallback(
    (newParams: { search?: string; status?: FilterTab; warehouse?: string }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newParams.search !== undefined) {
            const val = newParams.search.trim();
            if (val) next.set('search', val);
            else next.delete('search');
          }
          if (newParams.status !== undefined) {
            if (newParams.status && newParams.status !== 'ALL') {
              next.set('status', newParams.status);
            } else {
              next.delete('status');
            }
          }
          if (newParams.warehouse !== undefined) {
            if (newParams.warehouse && newParams.warehouse !== 'ALL') {
              next.set('warehouse', newParams.warehouse);
            } else {
              next.delete('warehouse');
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Debounce tìm kiếm (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput.trim() !== searchTerm.trim()) {
        const nextVal = searchInput.trim();
        setSearchTerm(nextVal);
        updateQueryParams({ search: nextVal });
      }
    }, 350);
    return () => clearTimeout(handler);
  }, [searchInput, searchTerm, updateQueryParams]);

  const handleStatusChange = (newStatus: FilterTab) => {
    setActiveTab(newStatus);
    updateQueryParams({ status: newStatus });
  };

  const handleWarehouseChange = (newWarehouse: string) => {
    setSelectedWarehouseId(newWarehouse);
    updateQueryParams({ warehouse: newWarehouse });
  };

  // Tải dữ liệu từ API (gửi kèm params truy vấn backend)
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams: Record<string, string> = {};
      if (searchTerm.trim()) queryParams.search = searchTerm.trim();
      if (activeTab !== 'ALL') queryParams.status = activeTab;
      if (selectedWarehouseId !== 'ALL') queryParams.warehouseId = selectedWarehouseId;

      const [tripsData, statsData] = await Promise.all([
        deliveryTripsService.getTrips(queryParams),
        deliveryTripsService.getGoodsInTransitStats(
          selectedWarehouseId !== 'ALL' ? selectedWarehouseId : undefined,
        ),
      ]);

      const list = Array.isArray(tripsData) ? tripsData : [];
      setTrips(list);
      setStats(statsData);

      setSelectedTripForDetail((prev) =>
        prev ? list.find((t) => t.id === prev.id) || null : null,
      );
    } catch (err: unknown) {
      showToast('error', getFriendlyErrorMessage(err, 'Không thể tải dữ liệu chuyến đi giao hàng'));
    } finally {
      setLoading(false);
    }
  }, [searchTerm, activeTab, selectedWarehouseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Danh sách kho lưu trữ / kho xuất
  const availableWarehouses = useMemo(() => {
    const list: { id: string; name: string }[] = [];
    const seen = new Set<string>();

    trips.forEach((t) => {
      if (t.warehouseId && !seen.has(t.warehouseId)) {
        seen.add(t.warehouseId);
        list.push({ id: t.warehouseId, name: t.warehouseName || t.warehouseId });
      }
    });

    STANDARD_WAREHOUSES.forEach((wh) => {
      if (!seen.has(wh.id) && !seen.has(wh.code)) {
        seen.add(wh.id);
        list.push({ id: wh.id, name: wh.name });
      }
    });

    return list;
  }, [trips]);

  // Số lượng đếm cho từng trạng thái
  const counts = useMemo(() => {
    const overdue = trips.filter((t) => t.status === 'IN_TRANSIT' && t.isOverdue).length;
    const onTime = trips.filter((t) => t.status === 'IN_TRANSIT' && !t.isOverdue).length;
    const completed = trips.filter((t) => t.status === 'COMPLETED').length;
    return {
      all: trips.length,
      overdue,
      onTime,
      completed,
    };
  }, [trips]);

  // Bộ lọc danh sách chuyến đi (an toàn tuyệt đối, tránh lỗi toLowerCase trên null/undefined gây crash màn hình trắng)
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (!trip) return false;

      // 1. Lọc kho
      if (selectedWarehouseId !== 'ALL') {
        const targetWh = availableWarehouses.find((w) => w.id === selectedWarehouseId);
        const matchesId = trip.warehouseId === selectedWarehouseId;
        const matchesName =
          targetWh &&
          trip.warehouseName &&
          trip.warehouseName.toLowerCase() === targetWh.name.toLowerCase();
        if (!matchesId && !matchesName) {
          return false;
        }
      }

      // 2. Lọc trạng thái
      if (activeTab === 'OVERDUE') {
        if (!trip.isOverdue || trip.status !== 'IN_TRANSIT') return false;
      } else if (activeTab === 'IN_TRANSIT_ON_TIME') {
        if (trip.status !== 'IN_TRANSIT' || trip.isOverdue) return false;
      } else if (activeTab === 'COMPLETED') {
        if (trip.status !== 'COMPLETED') return false;
      }

      // 3. Lọc từ khóa tìm kiếm (bảo vệ an toàn 100% không bị null pointer)
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const code = (trip.tripCode || (trip as any).code || '').toLowerCase();
        const name = (trip.tripName || (trip as any).name || '').toLowerCase();
        const driver = (trip.driverName || '').toLowerCase();
        const vehicle = (trip.vehicleNumber || (trip as any).licensePlate || '').toLowerCase();
        const wh = (trip.warehouseName || '').toLowerCase();
        const route = (trip.routeArea || '').toLowerCase();

        const matchCode = code.includes(term);
        const matchName = name.includes(term);
        const matchDriver = driver.includes(term);
        const matchVehicle = vehicle.includes(term);
        const matchWh = wh.includes(term);
        const matchRoute = route.includes(term);

        const stops = Array.isArray(trip.stops) ? trip.stops : [];
        const matchStop = stops.some((s) => {
          if (!s) return false;
          const orderCode = (s.orderCode || '').toLowerCase();
          const customerName = (s.customerName || '').toLowerCase();
          const phone = (s.contactPhone || s.receiverPhone || '').toLowerCase();
          return orderCode.includes(term) || customerName.includes(term) || phone.includes(term);
        });

        if (!matchCode && !matchName && !matchDriver && !matchVehicle && !matchStop && !matchWh && !matchRoute) {
          return false;
        }
      }

      return true;
    });
  }, [trips, selectedWarehouseId, activeTab, searchTerm, availableWarehouses]);

  // Kiểm tra trạng thái đang có lọc & đặt lại
  const hasActiveFilter = Boolean(
    searchTerm.trim() || selectedWarehouseId !== 'ALL' || activeTab !== 'ALL',
  );

  const handleResetFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedWarehouseId('ALL');
    setActiveTab('ALL');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  // Cập nhật trạng thái điểm dừng
  const handleUpdateStopStatus = async (
    tripId: string,
    stopId: string,
    status: StopDeliveryStatus,
    failureReason?: string,
  ) => {
    try {
      const updatedTrip = await deliveryTripsService.updateStopStatus(tripId, stopId, {
        status,
        failureReason,
      });

      setTrips((prev) => prev.map((t) => (t.id === tripId ? updatedTrip : t)));
      setSelectedTripForDetail(updatedTrip);

      const newStats = await deliveryTripsService.getGoodsInTransitStats();
      setStats(newStats);

      if (status === 'DELIVERED') {
        showToast('success', 'Đã ghi nhận giao hàng thành công');
      } else {
        showToast(
          'warning',
          'Đã ghi nhận giao chưa thành công. Hàng vẫn thuộc trách nhiệm chuyến đi trên xe, không tự hồi về kho!',
        );
      }
    } catch (err: unknown) {
      showToast(
        'error',
        getFriendlyErrorMessage(err, 'Lỗi khi cập nhật kết quả điểm giao hàng'),
      );
    }
  };

  // Xác nhận đối soát xe về kho & nhập lại hàng chưa giao
  const handleConfirmReturnCheckin = async (
    tripId: string,
    confirmReturnAll: boolean,
    notes?: string,
  ) => {
    try {
      const updatedTrip = await deliveryTripsService.checkinTripReturn(tripId, {
        confirmReturnAllFailedGoods: confirmReturnAll,
        returnedNotes: notes,
      });

      setTrips((prev) => prev.map((t) => (t.id === tripId ? updatedTrip : t)));
      if (selectedTripForDetail?.id === tripId) {
        setSelectedTripForDetail(updatedTrip);
      }

      const newStats = await deliveryTripsService.getGoodsInTransitStats();
      setStats(newStats);

      showToast(
        'success',
        `Đã hoàn tất đối soát xe về kho và nhập lại hàng chưa giao cho chuyến ${updatedTrip.tripCode}`,
      );
    } catch (err: unknown) {
      showToast('error', getFriendlyErrorMessage(err, 'Lỗi khi đối soát xe về kho'));
      throw err;
    }
  };

  // Tạo chuyến đi mới
  const handleCreateTrip = async (payload: CreateDeliveryTripPayload) => {
    try {
      const newTrip = await deliveryTripsService.createTrip(payload);
      setTrips((prev) => [newTrip, ...prev]);

      const newStats = await deliveryTripsService.getGoodsInTransitStats();
      setStats(newStats);

      showToast('success', `Đã tạo thành công chuyến xe giao hàng ${newTrip.tripCode}`);
    } catch (err: unknown) {
      showToast('error', getFriendlyErrorMessage(err, 'Lỗi khi tạo chuyến đi giao hàng'));
      throw err;
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-4 p-4 sm:p-6 lg:p-8">
      {/* 1. THỐNG KÊ TỔNG QUAN (4 KPI CARDS ĐỒNG BỘ 100% GIAO DIỆN HỆ THỐNG, BỎ CHỮ NHỎ DƯỚI CHÂN) */}
      <TripStatsCards stats={stats} loading={loading} />

      {/* 2. KHUNG BỘ LỌC, TÌM KIẾM & NÚT LẬP CHUYẾN ĐI MỚI (NẰM CHUNG 1 HÀNG/NHÓM) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Ô tìm kiếm an toàn tuyệt đối */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã chuyến, biển số xe, tài xế, mã đơn, khách hàng..."
              className="w-full h-[38px] pl-9 pr-8 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  setSearchTerm('');
                  updateQueryParams({ search: '' });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Lọc theo Kho lưu trữ */}
          <div className="relative w-full sm:w-52">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedWarehouseId}
              onChange={(e) => handleWarehouseChange(e.target.value)}
              className="w-full h-[38px] pl-9 pr-7 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all appearance-none cursor-pointer truncate font-medium text-slate-700"
            >
              <option value="ALL">Tất cả kho lưu trữ</option>
              {availableWarehouses.map((wh) => (
                <option key={wh.id} value={wh.id}>
                  {wh.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Lọc theo Trạng thái vận chuyển dạng Select */}
          <div className="relative w-full sm:w-52">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={activeTab}
              onChange={(e) => handleStatusChange(e.target.value as FilterTab)}
              className="w-full h-[38px] pl-9 pr-7 text-xs bg-slate-50/50 hover:bg-white focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all appearance-none cursor-pointer truncate font-medium text-slate-700"
            >
              <option value="ALL">Tất cả trạng thái ({counts.all})</option>
              <option value="IN_TRANSIT_ON_TIME">Đúng giờ ({counts.onTime})</option>
              <option value="OVERDUE">Quá hạn ETA ({counts.overdue})</option>
              <option value="COMPLETED">Đã hoàn tất ({counts.completed})</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Nút Đặt lại bộ lọc (khi có lọc) */}
          {hasActiveFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 rounded-lg transition-all cursor-pointer shadow-xs shrink-0"
              title="Đặt lại toàn bộ bộ lọc về mặc định"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>
          )}

          {/* Nút LẬP CHUYẾN ĐI MỚI (chuyển xuống chung nhóm với tìm kiếm và bộ lọc) */}
          <button
            type="button"
            onClick={() => navigate('/inventory/issues/trips/create')}
            className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lập chuyến đi mới</span>
          </button>
        </div>
      </div>

      {/* 3. DANH SÁCH CHUYẾN XE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Truck className="w-4 h-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              Danh sách chuyến xe
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                {filteredTrips.length}
              </span>
            </h2>
          </div>
        </div>

        {/* Danh sách các chuyến đi dạng Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-64 rounded-xl bg-white border border-slate-200/90 p-5 animate-pulse space-y-3"
              >
                <div className="h-5 w-1/2 bg-slate-200 rounded" />
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
                <div className="h-16 bg-slate-50 rounded" />
                <div className="h-8 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto ring-1 ring-indigo-500/20">
              <Truck size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Không tìm thấy chuyến xe nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Không có chuyến xe nào khớp với điều kiện lọc hiện tại.
            </p>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 px-3.5 h-[34px] rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-xs"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onOpenDetails={(t) => {
                  setSelectedTripForDetail(t);
                  setIsDetailModalOpen(true);
                }}
                onOpenReturnCheckin={(t) => {
                  setSelectedTripForCheckin(t);
                  setIsCheckinModalOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal chi tiết điểm dừng */}
      <TripDetailModal
        trip={selectedTripForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTripForDetail(null);
        }}
        onUpdateStopStatus={handleUpdateStopStatus}
        onOpenReturnCheckin={(t) => {
          setIsDetailModalOpen(false);
          setSelectedTripForCheckin(t);
          setIsCheckinModalOpen(true);
        }}
      />

      {/* Modal đối soát xe về kho */}
      <TripReturnCheckinModal
        trip={selectedTripForCheckin}
        isOpen={isCheckinModalOpen}
        onClose={() => {
          setIsCheckinModalOpen(false);
          setSelectedTripForCheckin(null);
        }}
        onConfirmCheckin={handleConfirmReturnCheckin}
      />

      {/* Modal tạo chuyến đi */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTrip}
      />
    </main>
  );
};
