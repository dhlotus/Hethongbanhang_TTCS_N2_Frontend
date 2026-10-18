import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck,
  Plus,
  RefreshCw,
  Search,
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
    <div className="space-y-3.5 pb-12">
      {/* ================================================================= */}
      {/* 1. HEADER CHUẨN LOHA SALES                                        */}
      {/* ================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
            <span>Quản lý Kho vận</span>
            <span>/</span>
            <span className="text-slate-800 font-medium">Hàng xuất trên đường</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-indigo-600 shrink-0" />
            <span>Theo dõi hàng đã xuất trên đường</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi tiền hàng luân chuyển, giám sát điểm đã giao và cảnh báo chuyến đi quá thời gian dự kiến (ETA).
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lập chuyến đi mới</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. THẺ THỐNG KÊ KPI TIỀN HÀNG TRÊN ĐƯỜNG                          */}
      {/* ================================================================= */}
      <TripStatsCards stats={stats} loading={loading} />

      {/* ================================================================= */}
      {/* 4. BỘ LỌC VÀ THANH TÌM KIẾM CHUẨN LOHA SALES                      */}
      {/* ================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-3.5 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Tabs bộ lọc */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Tất cả ({counts.all})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('IN_TRANSIT_ON_TIME')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'IN_TRANSIT_ON_TIME'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Đang chạy đúng giờ ({counts.onTime})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('OVERDUE')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'OVERDUE'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>Quá hạn dự kiến</span>
              <span
                className={`ml-1 px-1.5 py-0.2 rounded text-3xs font-semibold ${
                  activeTab === 'OVERDUE'
                    ? 'bg-rose-500 text-white'
                    : counts.overdue > 0
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {counts.overdue}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('COMPLETED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'COMPLETED'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              Đã hoàn tất ({counts.completed})
            </button>
          </div>

          {/* Ô tìm kiếm & Chọn kho */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Mã chuyến, biển số, tài xế..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none bg-slate-50/60 hover:bg-white focus:bg-white"
              />
            </div>

            <select
              value={selectedWarehouseId}
              onChange={(e) => setSelectedWarehouseId(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            >
              <option value="ALL">Tất cả kho xuất</option>
              <option value="wh-001">Kho Tổng Miền Bắc - LOHA WH01</option>
              <option value="wh-002">Kho Tổng Miền Nam - LOHA WH02</option>
            </select>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 5. DANH SÁCH CÁC CHUYẾN ĐI (GRID CARDS)                           */}
      {/* ================================================================= */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-72 rounded-xl bg-white border border-slate-200 p-4 animate-pulse space-y-3"
            >
              <div className="h-5 w-1/2 bg-slate-200 rounded" />
              <div className="h-4 w-3/4 bg-slate-100 rounded" />
              <div className="h-16 bg-slate-50 rounded" />
              <div className="h-8 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-2.5">
          <div className="w-11 h-11 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Truck className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 text-sm">Không tìm thấy chuyến đi nào</h3>
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
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>
  );
};
