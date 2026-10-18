import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { deliveryTripsService } from '../services/delivery-trips.service';
import type {
  CreateDeliveryTripPayload,
  DeliveryTrip,
  GoodsInTransitStats,
  StopDeliveryStatus,
} from '../types/delivery-trip';
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
 * Giao diện Clean Corporate SaaS chuẩn hệ thống LOHA SALES, gọn gàng, trang nhã, không màu mè
 */
export const GoodsInTransitPage: React.FC = () => {
  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [stats, setStats] = useState<GoodsInTransitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('ALL');

  // Modals state
  const [selectedTripForDetail, setSelectedTripForDetail] = useState<DeliveryTrip | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [selectedTripForCheckin, setSelectedTripForCheckin] = useState<DeliveryTrip | null>(null);
  const [isCheckinModalOpen, setIsCheckinModalOpen] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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
        showToast('success', 'Đã cập nhật trạng thái các chuyến xe giao hàng mới nhất');
      }
    } catch (err: unknown) {
      showToast('error', getFriendlyErrorMessage(err, 'Không thể tải dữ liệu chuyến đi giao hàng'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Bộ lọc danh sách chuyến đi
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (selectedWarehouseId !== 'ALL' && trip.warehouseId !== selectedWarehouseId) {
        return false;
      }

      if (activeTab === 'OVERDUE') {
        if (!trip.isOverdue || trip.status !== 'IN_TRANSIT') return false;
      } else if (activeTab === 'IN_TRANSIT_ON_TIME') {
        if (trip.status !== 'IN_TRANSIT' || trip.isOverdue) return false;
      } else if (activeTab === 'COMPLETED') {
        if (trip.status !== 'COMPLETED') return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const matchCode = trip.tripCode.toLowerCase().includes(term);
        const matchName = trip.tripName.toLowerCase().includes(term);
        const matchDriver = trip.driverName.toLowerCase().includes(term);
        const matchVehicle = trip.vehicleNumber.toLowerCase().includes(term);
        const matchStop = trip.stops.some(
          (s) =>
            s.orderCode.toLowerCase().includes(term) ||
            s.customerName.toLowerCase().includes(term),
        );

        if (!matchCode && !matchName && !matchDriver && !matchVehicle && !matchStop) {
          return false;
        }
      }

      return true;
    });
  }, [trips, selectedWarehouseId, activeTab, searchTerm]);

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
    <main className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
      {/* 1. PAGE HEADER (CHUẨN THIẾT KẾ QUẢN LÝ KHO) */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Theo dõi hàng đã xuất trên đường
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi tiền hàng luân chuyển, giám sát điểm đã giao và đối soát chuyến đi giao hàng.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin text-[#371cdb]' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#371cdb] hover:bg-[#2d14b8] px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            <span>Lập chuyến đi mới</span>
          </button>
        </div>
      </header>

      {/* 2. THỐNG KÊ TỔNG QUAN (KPI SUMMARY) */}
      <TripStatsCards stats={stats} loading={loading} />

      {/* 3. DANH SÁCH CHUYẾN XE (CONTAINER CHUẨN QUẢN LÝ KHO) */}
      <section className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* THANH TÌM KIẾM & BỘ LỌC TRẠNG THÁI */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff2fe] text-[#371cdb]">
              <Truck size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Danh sách chuyến xe
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {filteredTrips.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Giám sát lộ trình, tiến độ giao điểm dừng và đối soát hàng chưa giao về kho
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Thanh tìm kiếm */}
            <div className="relative min-w-[260px] lg:min-w-[320px]">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo mã chuyến, biển số, tài xế..."
                className="w-full h-10.5 pl-10 pr-8 rounded-xl text-xs sm:text-sm bg-slate-50/80 border border-slate-200 text-slate-900 placeholder-slate-400 transition-all outline-none focus:bg-white focus:ring-4 focus:ring-[#371cdb]/10 focus:border-[#371cdb]"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Select kho xuất phát */}
            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="h-10.5 px-3 rounded-xl border border-slate-200 text-xs sm:text-sm bg-slate-50/80 text-slate-700 outline-none focus:bg-white focus:border-[#371cdb]"
            >
              <option value="ALL">Tất cả kho xuất</option>
              <option value="wh-001">Kho Tổng Miền Bắc - LOHA WH01</option>
              <option value="wh-002">Kho Tổng Miền Nam - LOHA WH02</option>
            </select>

            {/* Bộ lọc trạng thái dạng Pills */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`rounded-lg px-3 py-2 font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'ALL'
                    ? 'bg-[#371cdb] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Tất cả ({counts.all})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('IN_TRANSIT_ON_TIME')}
                className={`rounded-lg px-3 py-2 font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'IN_TRANSIT_ON_TIME'
                    ? 'bg-[#371cdb] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Đúng giờ ({counts.onTime})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('OVERDUE')}
                className={`rounded-lg px-3 py-2 font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'OVERDUE'
                    ? 'bg-[#371cdb] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Quá hạn ({counts.overdue})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('COMPLETED')}
                className={`rounded-lg px-3 py-2 font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'COMPLETED'
                    ? 'bg-[#371cdb] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Đã hoàn tất ({counts.completed})
              </button>
            </div>
          </div>
        </div>

        {/* Danh sách các chuyến đi dạng Grid */}
        <div className="p-4 sm:p-5 bg-slate-50/50">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-72 rounded-2xl bg-white border border-slate-200/90 p-5 animate-pulse space-y-3"
                >
                  <div className="h-5 w-1/2 bg-slate-200 rounded" />
                  <div className="h-4 w-3/4 bg-slate-100 rounded" />
                  <div className="h-16 bg-slate-50 rounded" />
                  <div className="h-8 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : filteredTrips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#eff2fe] text-[#371cdb] flex items-center justify-center mx-auto ring-1 ring-[#371cdb]/20">
                <Truck size={24} />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Không tìm thấy chuyến đi nào</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Không có chuyến xe nào khớp với điều kiện lọc hiện tại.
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('ALL');
                  setSearchTerm('');
                  setSelectedWarehouseId('ALL');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
              >
                Đặt lại bộ lọc
              </button>
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
        </div>
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
