import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
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
 * Màn hình Theo dõi Hàng đã xuất nhưng chưa giao dịch xong (SN-194 / SN-197)
 * Dành cho Quản lý kho (Warehouse Manager)
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

      // Cập nhật selectedTrip nếu modal đang mở
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
      // 1. Lọc theo kho
      if (selectedWarehouseId !== 'ALL' && trip.warehouseId !== selectedWarehouseId) {
        return false;
      }

      // 2. Lọc theo tab trạng thái
      if (activeTab === 'OVERDUE') {
        if (!trip.isOverdue || trip.status !== 'IN_TRANSIT') return false;
      } else if (activeTab === 'IN_TRANSIT_ON_TIME') {
        if (trip.status !== 'IN_TRANSIT' || trip.isOverdue) return false;
      } else if (activeTab === 'COMPLETED') {
        if (trip.status !== 'COMPLETED') return false;
      }

      // 3. Lọc theo từ khóa tìm kiếm
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

      // Cập nhật state
      setTrips((prev) => prev.map((t) => (t.id === tripId ? updatedTrip : t)));
      setSelectedTripForDetail(updatedTrip);

      // Cập nhật lại stats
      const newStats = await deliveryTripsService.getGoodsInTransitStats();
      setStats(newStats);

      if (status === 'DELIVERED') {
        showToast('success', 'Đã ghi nhận giao hàng thành công cho điểm này');
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

      // Tải lại thống kê
      const newStats = await deliveryTripsService.getGoodsInTransitStats();
      setStats(newStats);

      showToast(
        'success',
        `Đã hoàn tất đối soát xe về kho và nhập lại hàng chưa giao thành công cho chuyến ${updatedTrip.tripCode}`,
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
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ================================================================= */}
        {/* HEADER KHỐI ĐIỀU HÀNH KHO VẬN (SN-194 / SN-197)                   */}
        {/* ================================================================= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                SN-194 / SN-197
              </span>
              <span className="text-xs text-slate-500 font-medium">Quản lý Kho vận & Điều phối</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2.5">
              <Truck className="h-7 w-7 text-indigo-600 shrink-0" />
              <span>Theo dõi hàng đã xuất trên đường</span>
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              Kiểm soát giá trị tiền hàng đang luân chuyển trên các chuyến xe, giám sát các điểm đã giao và còn lại, đồng thời cảnh báo các chuyến vượt quá thời gian dự kiến (ETA).
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Lập chuyến đi mới</span>
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* BANNER CẢNH BÁO TIẾN ĐỘ QUÁ HẠN (NẾU CÓ CHUYẾN OVERDUE)          */}
        {/* ================================================================= */}
        {counts.overdue > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6 text-white animate-bounce" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base">
                  CẢNH BÁO TIẾN ĐỘ: Phát hiện {counts.overdue} chuyến xe giao hàng quá thời gian dự kiến!
                </h3>
                <p className="text-xs text-rose-100 mt-0.5">
                  Các chuyến xe này đã vượt mốc ETA cam kết. Quản lý kho cần kiểm tra định vị và liên hệ tài xế gấp để xử lý sự cố trên đường.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('OVERDUE')}
              className="self-start sm:self-center px-3.5 py-1.5 rounded-lg bg-white text-rose-700 text-xs font-bold hover:bg-rose-50 shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              Xem chuyến quá hạn ngay
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* THẺ THỐNG KÊ KPI TIỀN HÀNG TRÊN ĐƯỜNG                             */}
        {/* ================================================================= */}
        <TripStatsCards stats={stats} loading={loading} />

        {/* ================================================================= */}
        {/* BỘ LỌC, TAB VÀ THANH TÌM KIẾM                                     */}
        {/* ================================================================= */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Tabs trạng thái */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả chuyến ({counts.all})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('IN_TRANSIT_ON_TIME')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'IN_TRANSIT_ON_TIME'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đang chạy đúng giờ ({counts.onTime})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('OVERDUE')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'OVERDUE'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : counts.overdue > 0
                    ? 'text-rose-600 hover:bg-rose-50 font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Quá thời gian dự kiến ({counts.overdue})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === 'COMPLETED'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đã hoàn tất ({counts.completed})
              </button>
            </div>

            {/* Tìm kiếm & Chọn kho */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Mã chuyến, biển số, tài xế, đại lý..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="py-1.5 px-3 rounded-xl border border-slate-300 text-xs bg-white text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                <option value="ALL">Tất cả kho xuất</option>
                <option value="wh-001">Kho Tổng Miền Bắc - LOHA WH01</option>
                <option value="wh-002">Kho Tổng Miền Nam - LOHA WH02</option>
              </select>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* DANH SÁCH CÁC CHUYẾN ĐI (GRID CARDS)                              */}
        {/* ================================================================= */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-80 rounded-2xl bg-white border border-slate-200 p-5 animate-pulse space-y-4"
              >
                <div className="h-6 w-1/2 bg-slate-200 rounded" />
                <div className="h-4 w-3/4 bg-slate-100 rounded" />
                <div className="h-20 bg-slate-50 rounded" />
                <div className="h-10 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Truck className="h-7 w-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Không tìm thấy chuyến đi nào</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Không có chuyến xe nào khớp với điều kiện lọc hiện tại. Hãy thử thay đổi bộ lọc hoặc tạo chuyến đi mới.
            </p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('ALL');
                setSearchTerm('');
                setSelectedWarehouseId('ALL');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

        {/* ================================================================= */}
        {/* MODAL CHI TIẾT & CẬP NHẬT KẾT QUẢ ĐIỂM DỪNG                       */}
        {/* ================================================================= */}
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

        {/* ================================================================= */}
        {/* MODAL ĐỐI SOÁT XE VỀ KHO & NHẬP LẠI HÀNG CHƯA GIAO                */}
        {/* ================================================================= */}
        <TripReturnCheckinModal
          trip={selectedTripForCheckin}
          isOpen={isCheckinModalOpen}
          onClose={() => {
            setIsCheckinModalOpen(false);
            setSelectedTripForCheckin(null);
          }}
          onConfirmCheckin={handleConfirmReturnCheckin}
        />

        {/* ================================================================= */}
        {/* MODAL TẠO CHUYẾN ĐI GIAO HÀNG MỚI                                 */}
        {/* ================================================================= */}
        <CreateTripModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateTrip}
        />
      </div>
    </div>
  );
};
