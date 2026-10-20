import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck,
  RefreshCw,
  Search,
  X,
  Building2,
  RotateCcw,
  ChevronDown,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { deliveryTripsService } from '../services/delivery-trips.service';
import type {
  DeliveryTrip,
  GoodsInTransitStats,
  StopDeliveryStatus,
} from '../types/delivery-trip';
import { STANDARD_WAREHOUSES } from '../constants/warehouse.constants';
import { TripStatsCards } from '../components/delivery-trips/trip-stats-cards';
import { TripCard } from '../components/delivery-trips/trip-card';
import { TripTableView } from '../components/delivery-trips/trip-table-view';
import { TripDetailModal } from '../components/delivery-trips/trip-detail-modal';
import { TripReturnCheckinModal } from '../components/delivery-trips/trip-return-checkin-modal';
import { showToast } from '../components/toast';
import { getFriendlyErrorMessage } from '../utils/error-handler';
import { matchesSearchTerm } from '../utils/vietnamese';

type FilterTab = 'ALL' | 'IN_TRANSIT_ON_TIME' | 'OVERDUE' | 'COMPLETED';
type ViewMode = 'GRID' | 'TABLE';

/**
 * Màn hình Theo dõi Hàng đã xuất trên đường (SN-194 / SN-197)
 * Giao diện nhỏ gọn, dễ nhìn, thanh thoát chuẩn Quản lý kho (WMS)
 */
export const GoodsInTransitPage: React.FC = () => {
  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [stats, setStats] = useState<GoodsInTransitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('GRID');

  // Modals state
  const [selectedTripForDetail, setSelectedTripForDetail] = useState<DeliveryTrip | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedTripForCheckin, setSelectedTripForCheckin] = useState<DeliveryTrip | null>(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

  // Tải dữ liệu từ API
  const fetchData = useCallback(async (showNotification = false) => {
    try {
      setLoading(true);
      const [tripsData, statsData] = await Promise.all([
        deliveryTripsService.getTrips(),
        deliveryTripsService.getGoodsInTransitStats(),
      ]);

      setTrips(tripsData);
      setStats(statsData);

      setSelectedTripForDetail((prev) =>
        prev ? tripsData.find((t) => t.id === prev.id) || null : null,
      );

      if (showNotification) {
        showToast('success', 'Đã cập nhật dữ liệu các chuyến xe giao hàng mới nhất');
      }
    } catch (err: unknown) {
      showToast('error', getFriendlyErrorMessage(err, 'Không thể tải dữ liệu chuyến đi giao hàng'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const handleDataUpdate = () => {
      fetchData();
    };

    window.addEventListener('loha_orders_updated', handleDataUpdate);
    window.addEventListener('loha_shipments_updated', handleDataUpdate);
    return () => {
      window.removeEventListener('loha_orders_updated', handleDataUpdate);
      window.removeEventListener('loha_shipments_updated', handleDataUpdate);
    };
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

  // Bộ lọc danh sách chuyến đi
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (selectedWarehouseId !== 'ALL') {
        const targetWh = availableWarehouses.find((w) => w.id === selectedWarehouseId);
        const matchesId = trip.warehouseId === selectedWarehouseId;
        const matchesName =
          Boolean(targetWh && trip.warehouseName && targetWh.name && trip.warehouseName.toLowerCase() === targetWh.name.toLowerCase());
        if (!matchesId && !matchesName) {
          return false;
        }
      }

      if (activeTab === 'OVERDUE') {
        if (!trip.isOverdue || trip.status !== 'IN_TRANSIT') return false;
      } else if (activeTab === 'IN_TRANSIT_ON_TIME') {
        if (trip.status !== 'IN_TRANSIT' || trip.isOverdue) return false;
      } else if (activeTab === 'COMPLETED') {
        if (trip.status !== 'COMPLETED') return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.trim();
        const tripCode = trip.tripCode || (trip as any).code || '';
        const tripName = trip.tripName || (trip as any).name || '';
        const plate = trip.vehicleNumber || (trip as any).licensePlate || '';

        const matchTrip =
          matchesSearchTerm(tripCode, term) ||
          matchesSearchTerm(tripName, term) ||
          matchesSearchTerm(trip.driverName, term) ||
          matchesSearchTerm(trip.driverPhone, term) ||
          matchesSearchTerm(plate, term) ||
          matchesSearchTerm(trip.warehouseName, term) ||
          matchesSearchTerm(trip.routeArea, term) ||
          matchesSearchTerm(trip.carrierName, term);

        const matchStop = (trip.stops || []).some(
          (s) =>
            matchesSearchTerm(s.orderCode, term) ||
            matchesSearchTerm(s.customerName, term) ||
            matchesSearchTerm(s.receiverName, term) ||
            matchesSearchTerm(s.receiverPhone, term) ||
            matchesSearchTerm(s.deliveryAddress, term),
        );

        if (!matchTrip && !matchStop) {
          return false;
        }
      }

      return true;
    });
  }, [trips, selectedWarehouseId, activeTab, searchTerm, availableWarehouses]);

  // Số lượng đếm cho từng Tab
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

  // Kiểm tra trạng thái đang có lọc & đặt lại
  const hasActiveFilter = Boolean(
    searchTerm.trim() || selectedWarehouseId !== 'ALL' || activeTab !== 'ALL',
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedWarehouseId('ALL');
    setActiveTab('ALL');
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
          'Đã ghi nhận giao chưa thành công. Hàng vẫn thuộc trách nhiệm chuyến xe, không tự hồi về kho!',
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

      setTrips((prev) => prev.map((t) => (t.id === tripId || t.tripCode === tripId ? updatedTrip : t)));
      if (selectedTripForDetail?.id === tripId || selectedTripForDetail?.tripCode === tripId) {
        setSelectedTripForDetail(updatedTrip);
      }

      const newStats = await deliveryTripsService.getGoodsInTransitStats(selectedWarehouseId);
      setStats(newStats);
      await fetchData();

      showToast(
        'success',
        `Đã hoàn tất đối soát xe về kho và nhập lại hàng chưa giao cho chuyến ${updatedTrip.tripCode}`,
      );
    } catch (err: unknown) {
      showToast('error', getFriendlyErrorMessage(err, 'Lỗi khi đối soát xe về kho'));
      throw err;
    }
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-3.5 p-3.5 sm:p-5 lg:p-6">
      {/* 1. PAGE HEADER (GỌN GÀNG, NHỎ NHẮN) */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Theo dõi hàng đã xuất trên đường
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiền hàng luân chuyển, giám sát điểm đã giao và đối soát chuyến đi giao hàng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-[#371cdb]' : ''} />
            <span>Làm mới</span>
          </button>
        </div>
      </header>

      {/* 2. THỐNG KÊ TỔNG QUAN (COMPACT KPI CARDS) */}
      <TripStatsCards
        stats={stats}
        loading={loading}
        onRefresh={() => fetchData(true)}
        isRefreshing={loading}
      />

      {/* 3. THANH CÔNG CỤ TÍCH HỢP: TÌM KIẾM, BỘ LỌC & CHẾ ĐỘ XEM (SIÊU GỌN) */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-2.5 sm:p-3 shadow-2xs space-y-2.5">
        {/* Hàng 1: Tabs trạng thái & Chuyển đổi Thẻ / Bảng */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Tabs nhanh trạng thái */}
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`h-7 px-2.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-[#371cdb] text-white shadow-2xs font-semibold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Tất cả ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('IN_TRANSIT_ON_TIME')}
              className={`h-7 px-2.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'IN_TRANSIT_ON_TIME'
                  ? 'bg-[#371cdb] text-white shadow-2xs font-semibold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              Đúng giờ ({counts.onTime})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('OVERDUE')}
              className={`h-7 px-2.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'OVERDUE'
                  ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
              }`}
            >
              Quá hạn ({counts.overdue})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('COMPLETED')}
              className={`h-7 px-2.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                activeTab === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                  : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              Hoàn tất ({counts.completed})
            </button>
          </div>

          {/* Toggle chế độ xem: Thẻ gọn vs Bảng */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                viewMode === 'GRID'
                  ? 'bg-white text-[#371cdb] shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem dạng thẻ nhỏ gọn"
            >
              <LayoutGrid size={13} />
              <span>Dạng thẻ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-white text-[#371cdb] shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Xem dạng bảng danh sách tiện quản lý"
            >
              <TableIcon size={13} />
              <span>Dạng bảng</span>
            </button>
          </div>
        </div>

        {/* Hàng 2: Ô tìm kiếm + Lọc kho + Đặt lại + Số lượng */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-1 items-center gap-2">
            {/* Ô tìm kiếm */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã chuyến, xe, tài xế, mã đơn..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-[#371cdb]/30 focus:border-[#371cdb] transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Lọc theo Kho hàng */}
            <div className="relative w-44 sm:w-52 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full pl-8 pr-6 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1.5 focus:ring-[#371cdb]/30 focus:border-[#371cdb] transition-all appearance-none cursor-pointer truncate"
              >
                <option value="ALL">Tất cả kho xuất</option>
                {availableWarehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Nút Đặt lại bộ lọc */}
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-all cursor-pointer shadow-2xs shrink-0"
                title="Đặt lại toàn bộ bộ lọc"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Đặt lại</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500 whitespace-nowrap text-right">
            Hiển thị <span className="font-bold text-slate-800">{filteredTrips.length}</span> chuyến xe
          </div>
        </div>
      </div>

      {/* 4. DANH SÁCH CHUYẾN XE (THẺ NHỎ GỌN HOẶC BẢNG) */}
      <section className="space-y-3">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-48 rounded-xl bg-white border border-slate-200/90 p-4 animate-pulse space-y-2.5"
              >
                <div className="h-4 w-1/2 bg-slate-200 rounded" />
                <div className="h-3 w-3/4 bg-slate-100 rounded" />
                <div className="h-10 bg-slate-50 rounded" />
                <div className="h-6 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-2.5">
            <div className="w-10 h-10 rounded-lg bg-[#eff2fe] text-[#371cdb] flex items-center justify-center mx-auto ring-1 ring-[#371cdb]/20">
              <Truck size={20} />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">Không tìm thấy chuyến xe nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Không có chuyến xe nào khớp với điều kiện lọc hiện tại.
            </p>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw size={12} />
                <span>Đặt lại bộ lọc</span>
              </button>
            )}
          </div>
        ) : viewMode === 'GRID' ? (
          /* Chế độ THẺ GỌN (Compact Card Grid) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
        ) : (
          /* Chế độ BẢNG (Compact Table View) */
          <TripTableView
            trips={filteredTrips}
            onOpenDetails={(t) => {
              setSelectedTripForDetail(t);
              setIsDetailModalOpen(true);
            }}
            onOpenReturnCheckin={(t) => {
              setSelectedTripForCheckin(t);
              setIsCheckinModalOpen(true);
            }}
          />
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
    </main>
  );
};
