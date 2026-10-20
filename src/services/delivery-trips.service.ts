import { apiClient } from './api';
import { ordersService, getStoredDemoOrders, syncDemoOrderStatus, saveStoredDemoOrders } from './orders.service';
import type { Order } from '../types/order';
import type {
  CreateDeliveryTripPayload,
  DeliveryTrip,
  DeliveryTripStatus,
  DeliveryStop,
  GoodsInTransitStats,
  QueryDeliveryTripsParams,
  TripCheckinReturnPayload,
  UpdateStopStatusPayload,
  UpdateDeliveryTripPayload,
  AssignDriverPayload,
  DeliveryTripStop,
} from '../types/delivery-trip';
import { matchesSearchTerm } from '../utils/vietnamese';

export interface TripManifestResponse {
  trip: DeliveryTrip;
  stops: DeliveryTripStop[];
  printedAt: string;
}

const STORAGE_KEY = 'loha_delivery_trips';

/**
 * Đọc danh sách các chuyến đi tự tạo từ localStorage
 */
function getStoredTrips(): DeliveryTrip[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as DeliveryTrip[];
    }
  } catch {
    // Bỏ qua lỗi parse
  }
  return [];
}

/**
 * Lưu danh sách chuyến đi vào localStorage
 */
function saveStoredTrips(trips: DeliveryTrip[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
    window.dispatchEvent(new CustomEvent('loha_shipments_updated'));
  } catch {
    // Bỏ qua lỗi storage
  }
}

/**
 * Chuyển một Đơn hàng đang xuất phát trên đường (DISPATCHED / SHIPPED) thành một Chuyến xe DeliveryTrip
 */
function buildTripFromOrder(order: Order, index = 1): DeliveryTrip {
  const tripCode = `TRIP-${order.orderCode?.replace(/^DH/, '') || String(10400 + index)}`;
  const driverName = (order as any).driverName || 'Nguyễn Văn Thắng';
  const driverPhone = (order as any).driverPhone || '0988123456';
  const vehicleNumber = (order as any).licensePlate || (order as any).vehicleNumber || '29H-868.99';
  const carrierName = (order as any).carrierName || 'LOHA Fleet Logistics';
  const departureDate = (order as any).shippedAt || (order as any).dispatchedAt || order.createdAt || new Date().toISOString();
  
  // Tính ETA: mặc định sau giờ xuất phát 3-4 giờ
  const depTime = new Date(departureDate).getTime();
  const estimatedCompletionTime = new Date(depTime + 4 * 3600 * 1000).toISOString();
  const isOverdue = Date.now() > new Date(estimatedCompletionTime).getTime();

  const stop: DeliveryStop = {
    id: `stop-${order.id || order.orderCode}-1`,
    tripId: tripCode,
    stopOrder: 1,
    orderId: order.id,
    orderCode: order.orderCode || order.id || '',
    customerId: order.customerId,
    customerName: order.customerName || '',
    receiverName: order.deliveryPoint?.receiverName || order.customerName || '',
    receiverPhone: order.deliveryPoint?.phone || (order as any).phone || '0901234561',
    deliveryAddress: order.deliveryPoint?.address || '123 Nguyễn Trọng Tuyển, P.8, Q.Phú Nhuận, TP.HCM',
    orderAmount: order.grandTotal,
    codAmount: order.grandTotal,
    packageCount: (order.lines || []).reduce((sum, l) => sum + (l.quantity || 1), 0),
    status: order.status === 'DELIVERED' ? 'DELIVERED' : 'PENDING',
    items: (order.lines || []).map((l, i) => ({
      productId: l.productId || `prod-${i}`,
      sku: l.productSku || 'SKU',
      productName: l.productName || 'Sản phẩm dinh dưỡng Loha',
      quantity: l.quantity,
      unit: l.unit || 'Thùng',
      unitPrice: l.unitPrice,
      totalPrice: l.lineTotal,
    })),
  };

  const isDelivered = order.status === 'DELIVERED';

  return {
    id: `trip-auto-${order.id || order.orderCode}`,
    tripCode,
    code: tripCode,
    tripName: `Tuyến giao đơn ${order.orderCode} - ${order.customerName}`,
    name: `Tuyến giao đơn ${order.orderCode} - ${order.customerName}`,
    routeArea: order.region || 'TP. Hồ Chí Minh - Phú Nhuận',
    warehouseId: (order as any).warehouseId || 'wh-002',
    warehouseName: order.deliveryPoint?.name || 'Kho Tổng Miền Nam - LOHA WH02',
    driverName,
    driverPhone,
    vehicleNumber,
    licensePlate: vehicleNumber,
    vehicleType: 'Xe tải 2.5T Thaco',
    carrierName,
    status: isDelivered ? 'COMPLETED' : 'IN_TRANSIT',
    departedAt: departureDate,
    departureDate,
    estimatedCompletionTime,
    stops: [stop],
    totalStops: 1,
    stopsCount: 1,
    deliveredStops: isDelivered ? 1 : 0,
    remainingStops: isDelivered ? 0 : 1,
    failedStops: 0,
    totalGoodsValue: order.grandTotal || 0,
    deliveredGoodsValue: isDelivered ? (order.grandTotal || 0) : 0,
    inTransitGoodsValue: isDelivered ? 0 : (order.grandTotal || 0),
    retainedGoodsValue: 0,
    isOverdue: isDelivered ? false : isOverdue,
    overdueMinutes: isOverdue ? Math.round((Date.now() - new Date(estimatedCompletionTime).getTime()) / 60000) : 0,
    totalCodAmount: order.grandTotal || 0,
    createdAt: departureDate,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Service Quản lý Chuyến đi Giao hàng, Phân tuyến & Theo dõi Hàng trên đường (SN-194 / SN-196 / SN-197)
 * Tích hợp chặt chẽ với dữ liệu bên Theo dõi đơn hàng & Giao vận (SN-170 / SN-199)
 */
export const deliveryTripsService = {
  /**
   * Lấy danh sách chuyến đi giao hàng (lấy từ các đơn hàng xuất phát trên đường + các chuyến tự lập)
   */
  async getTrips(
    params?: QueryDeliveryTripsParams | { routeArea?: string; status?: DeliveryTripStatus; search?: string },
  ): Promise<DeliveryTrip[]> {
    // 1. Thử lấy danh sách chuyến từ backend API nếu có kết nối
    let apiTrips: DeliveryTrip[] = [];
    try {
      const endpoint = params && 'routeArea' in params ? '/shipments/trips' : '/shipments/trips';
      const res = await apiClient.get<DeliveryTrip[]>(endpoint, { params });
      if (Array.isArray(res.data) && res.data.length > 0) {
        apiTrips = res.data;
      }
    } catch {
      // Backend không có endpoint hoặc lỗi mạng -> tiếp tục dùng tích hợp đơn hàng
    }

    // 2. Lấy các chuyến tự lập từ localStorage
    const storedTrips = getStoredTrips();

    // 3. Lấy dữ liệu bên "Theo dõi đơn hàng" để biết các đơn hàng đã xuất phát trên đường
    const allDemoOrders = getStoredDemoOrders();
    let backendOrders: Order[] = [];
    try {
      const resOrders = await ordersService.getOrders({ limit: 100 });
      if (resOrders?.data) {
        backendOrders = resOrders.data;
      }
    } catch {
      // Dùng allDemoOrders
    }

    // Gộp tất cả đơn hàng, ưu tiên trạng thái cập nhật mới nhất từ Quản lý đơn hàng
    const orderMap = new Map<string, Order>();
    allDemoOrders.forEach((o) => {
      if (o.orderCode) orderMap.set(o.orderCode.toUpperCase(), o);
      if (o.id) orderMap.set(o.id.toUpperCase(), o);
    });
    backendOrders.forEach((o) => {
      if (o.orderCode) orderMap.set(o.orderCode.toUpperCase(), o);
      if (o.id) orderMap.set(o.id.toUpperCase(), o);
    });
    const allOrders = Array.from(new Set(orderMap.values()));

    // Các đơn hàng đã xuất phát trên đường: trạng thái DISPATCHED (Đã xuất kho) hoặc SHIPPED (Đang giao xe)
    const inTransitOrders = allOrders.filter(
      (o) => o.status === 'DISPATCHED' || o.status === 'SHIPPED',
    );

    // Chuẩn hóa và làm sạch stops trong các chuyến đã có (storedTrips và apiTrips)
    const rawTrips = [...storedTrips, ...apiTrips];
    const cleanedTrips: DeliveryTrip[] = [];
    const seenTripCodes = new Set<string>();

    for (const trip of rawTrips) {
      const codeKey = trip.tripCode || (trip as any).code;
      if (!codeKey || seenTripCodes.has(codeKey)) continue;

      // Lọc stops: CHỈ GIỮ LẠI các điểm giao có đơn hàng thực tế tồn tại trong Quản lý đơn hàng
      const validStops: DeliveryStop[] = [];
      for (const s of trip.stops || []) {
        const code = (s.orderCode || s.orderId || '').toUpperCase();
        const ord = orderMap.get(code);
        if (ord) {
          const isDelivered = ord.status === 'DELIVERED' || s.status === 'DELIVERED';
          const isFailed = ord.status === 'CANCELLED' || s.status === 'FAILED';
          validStops.push({
            ...s,
            orderId: ord.id || s.orderId,
            orderCode: ord.orderCode || s.orderCode,
            customerId: ord.customerId || s.customerId,
            customerName: ord.customerName || s.customerName,
            receiverName: ord.deliveryPoint?.receiverName || s.receiverName || ord.customerName,
            receiverPhone: ord.deliveryPoint?.phone || s.receiverPhone || (ord as any).phone || '0901234561',
            deliveryAddress: ord.deliveryPoint?.address || s.deliveryAddress,
            orderAmount: ord.grandTotal || s.orderAmount,
            codAmount: ord.grandTotal || s.codAmount,
            status: isDelivered ? 'DELIVERED' : isFailed ? 'FAILED' : (s.status || 'PENDING'),
          });
        }
      }

      // Chỉ giữ chuyến nếu có ít nhất 1 điểm dừng thực tế trong Quản lý đơn hàng
      if (validStops.length > 0) {
        seenTripCodes.add(codeKey);
        cleanedTrips.push({
          ...trip,
          stops: validStops,
        });
      }
    }

    // Tập hợp các mã đơn đã nằm trong các chuyến đã lập
    const assignedOrderCodes = new Set<string>();
    cleanedTrips.forEach((t) => {
      t.stops.forEach((s) => {
        if (s.orderCode) assignedOrderCodes.add(s.orderCode.toUpperCase());
        if (s.orderId) assignedOrderCodes.add(s.orderId.toUpperCase());
      });
    });

    // Tạo chuyến tự động cho các đơn xuất phát trên đường mà chưa gom vào chuyến nào
    const orderTrips: DeliveryTrip[] = [];
    inTransitOrders.forEach((o, idx) => {
      const codeUpper = (o.orderCode || o.id || '').toUpperCase();
      if (!assignedOrderCodes.has(codeUpper)) {
        orderTrips.push(buildTripFromOrder(o, idx + 1));
      }
    });

    // Hợp nhất toàn bộ danh sách chuyến
    let combinedTrips: DeliveryTrip[] = [...cleanedTrips, ...orderTrips];

    // Chuẩn hóa, tính toán và bảo đảm estimatedCompletionTime luôn hợp lệ
    combinedTrips = combinedTrips.map((trip) => {
      const stops = trip.stops || [];
      const deliveredStops = stops.filter((s) => s.status === 'DELIVERED').length;
      const failedStops = stops.filter((s) => s.status === 'FAILED').length;
      const remainingStops = stops.filter((s) => s.status === 'PENDING').length;
      
      const totalGoodsValue = stops.reduce(
        (sum, s) => sum + (s.orderAmount || s.codAmount || 0),
        0,
      );
      const deliveredGoodsValue = stops
        .filter((s) => s.status === 'DELIVERED')
        .reduce((sum, s) => sum + (s.orderAmount || s.codAmount || 0), 0);
      // Kiểm tra nếu chuyến xe đã hoàn tất hoặc đã được Quản lý kho xác nhận về kho
      const isReturnedOrCompleted = trip.status === 'COMPLETED' || Boolean(trip.returnedToWarehouse);

      // Hàng giữ trên xe chỉ tính khi chuyến xe ĐANG DI CHUYỂN TRÊN ĐƯỜNG và CHƯA VỀ KHO
      const retainedGoodsValue = isReturnedOrCompleted
        ? 0
        : stops
            .filter((s) => s.status === 'FAILED')
            .reduce((sum, s) => sum + (s.orderAmount || s.codAmount || 0), 0);

      const inTransitGoodsValue = isReturnedOrCompleted
        ? 0
        : stops
            .filter((s) => s.status === 'PENDING')
            .reduce((sum, s) => sum + (s.orderAmount || s.codAmount || 0), 0);

      // Đảm bảo estimatedCompletionTime luôn là chuỗi thời gian hợp lệ (không bao giờ ra NaN)
      const depDate = trip.departureDate || trip.departedAt || new Date().toISOString();
      let estTime = trip.estimatedCompletionTime;
      if (!estTime || isNaN(new Date(estTime).getTime())) {
        const depTimestamp = new Date(depDate).getTime();
        estTime = new Date((!isNaN(depTimestamp) ? depTimestamp : Date.now()) + 4 * 3600 * 1000).toISOString();
      }

      // Xác định trạng thái chuyến: giữ nguyên COMPLETED nếu đã đối soát về kho hoặc toàn bộ điểm giao DELIVERED
      const allDelivered = stops.length > 0 && stops.every((s) => s.status === 'DELIVERED');
      const tripStatus: DeliveryTripStatus = isReturnedOrCompleted || allDelivered
        ? 'COMPLETED'
        : trip.status === 'DRAFT'
        ? 'DRAFT'
        : 'IN_TRANSIT';

      const isOverdue =
        tripStatus === 'IN_TRANSIT' &&
        Date.now() > new Date(estTime).getTime();

      const overdueMinutes = isOverdue
        ? Math.round((Date.now() - new Date(estTime).getTime()) / 60000)
        : 0;

      return {
        ...trip,
        status: tripStatus,
        returnedToWarehouse: Boolean(trip.returnedToWarehouse) || (trip.status === 'COMPLETED' && failedStops > 0),
        departureDate: depDate,
        estimatedCompletionTime: estTime,
        stops,
        totalStops: stops.length,
        stopsCount: stops.length,
        deliveredStops,
        failedStops,
        remainingStops: isReturnedOrCompleted ? 0 : remainingStops,
        totalGoodsValue,
        deliveredGoodsValue,
        retainedGoodsValue,
        inTransitGoodsValue,
        isOverdue,
        overdueMinutes,
      };
    });

    // 4. Lọc theo tham số
    if (params) {
      if ('routeArea' in params && params.routeArea && params.routeArea !== 'ALL') {
        const qArea = params.routeArea.trim();
        combinedTrips = combinedTrips.filter((t) =>
          matchesSearchTerm(t.routeArea, qArea),
        );
      }
      if ('status' in params && params.status && (params.status as string) !== 'ALL') {
        combinedTrips = combinedTrips.filter((t) => t.status === params.status);
      }
      if ('search' in params && params.search && params.search.trim()) {
        const q = params.search.trim();
        combinedTrips = combinedTrips.filter(
          (t) =>
            matchesSearchTerm(t.tripCode, q) ||
            matchesSearchTerm(t.tripName, q) ||
            matchesSearchTerm((t as any).code, q) ||
            matchesSearchTerm((t as any).name, q) ||
            matchesSearchTerm(t.driverName, q) ||
            matchesSearchTerm(t.driverPhone, q) ||
            matchesSearchTerm(t.vehicleNumber, q) ||
            matchesSearchTerm((t as any).licensePlate, q) ||
            matchesSearchTerm(t.carrierName, q) ||
            matchesSearchTerm(t.warehouseName, q) ||
            (t.stops || []).some(
              (s) =>
                matchesSearchTerm(s.orderCode, q) ||
                matchesSearchTerm(s.customerName, q) ||
                matchesSearchTerm(s.receiverName, q) ||
                matchesSearchTerm(s.receiverPhone, q) ||
                matchesSearchTerm(s.deliveryAddress, q),
            ),
        );
      }
    }

    return combinedTrips;
  },

  /**
   * Lấy thống kê tiền hàng đang nằm trên đường & cảnh báo (SN-194 / SN-197)
   */
  async getGoodsInTransitStats(warehouseId?: string): Promise<GoodsInTransitStats> {
    const trips = await this.getTrips();
    const filtered =
      warehouseId && warehouseId !== 'ALL'
        ? trips.filter((t) => t.warehouseId === warehouseId)
        : trips;

    let totalGoodsValueInTransit = 0;
    let activeTripsCount = 0;
    let overdueTripsCount = 0;
    let totalRemainingStops = 0;
    let totalRetainedUndeliveredValue = 0;
    let completedTripsToday = 0;

    const todayStr = new Date().toISOString().slice(0, 10);

    for (const trip of filtered) {
      if (trip.status === 'IN_TRANSIT' && !trip.returnedToWarehouse) {
        activeTripsCount++;
        totalGoodsValueInTransit += trip.inTransitGoodsValue;
        totalRemainingStops += trip.remainingStops;
        totalRetainedUndeliveredValue += trip.retainedGoodsValue;
        if (trip.isOverdue) {
          overdueTripsCount++;
        }
      } else if (trip.status === 'COMPLETED' || trip.returnedToWarehouse) {
        if (trip.completedAt?.startsWith(todayStr) || trip.updatedAt?.startsWith(todayStr)) {
          completedTripsToday++;
        }
      }
    }

    return {
      totalGoodsValueInTransit,
      activeTripsCount,
      overdueTripsCount,
      totalRemainingStops,
      totalRetainedUndeliveredValue,
      completedTripsToday,
    };
  },

  /**
   * Lấy chi tiết một chuyến đi
   */
  async getTripById(id: string): Promise<DeliveryTrip> {
    const trips = await this.getTrips();
    const found = trips.find((t) => t.id === id || t.tripCode === id);
    if (!found) {
      throw new Error(`Không tìm thấy chuyến đi ${id}`);
    }
    return found;
  },

  /**
   * Tạo chuyến đi giao hàng mới gom các đơn hàng từ "Theo dõi đơn hàng"
   */
  async createTrip(payload: CreateDeliveryTripPayload): Promise<DeliveryTrip> {
    const allOrders = getStoredDemoOrders();
    const orderCodes = payload.orderIds || [];

    // Tìm các đơn hàng được chọn
    const selectedOrders = allOrders.filter((o) =>
      orderCodes.some(
        (c) => c.toUpperCase() === o.orderCode?.toUpperCase() || c.toUpperCase() === o.id?.toUpperCase(),
      ),
    );

    // Tạo danh sách điểm giao (Stops) từ các đơn hàng thực tế
    const stops: DeliveryStop[] = selectedOrders.map((ord, idx) => ({
      id: `stop-${ord.orderCode || ord.id}-${idx + 1}`,
      tripId: payload.tripCode || `TRIP-${Date.now()}`,
      stopOrder: idx + 1,
      orderId: ord.id,
      orderCode: ord.orderCode || ord.id || '',
      customerId: ord.customerId,
      customerName: ord.customerName || '',
      receiverName: ord.deliveryPoint?.receiverName || ord.customerName || '',
      receiverPhone: ord.deliveryPoint?.phone || '0901234561',
      deliveryAddress: ord.deliveryPoint?.address || 'Điểm giao đại lý',
      orderAmount: ord.grandTotal,
      codAmount: ord.grandTotal,
      packageCount: (ord.lines || []).reduce((sum, l) => sum + (l.quantity || 1), 0),
      status: 'PENDING',
      items: (ord.lines || []).map((l, lIdx) => ({
        productId: l.productId || `prod-${lIdx}`,
        sku: l.productSku || 'SKU',
        productName: l.productName || 'Sản phẩm',
        quantity: l.quantity,
        unit: l.unit || 'Thùng',
        unitPrice: l.unitPrice,
        totalPrice: l.lineTotal,
      })),
    }));

    const totalGoodsValue = stops.reduce((sum, s) => sum + (s.orderAmount || 0), 0);
    const startImmediately = payload.startImmediately ?? true;
    const now = new Date().toISOString();
    const tripCode =
      payload.tripCode ||
      `TRIP-${new Date().toISOString().slice(2, 4)}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;

    const newTrip: DeliveryTrip = {
      id: `trip-${Date.now()}`,
      tripCode,
      code: tripCode,
      tripName: payload.tripName || payload.name || `Tuyến giao hàng ${tripCode}`,
      name: payload.tripName || payload.name || `Tuyến giao hàng ${tripCode}`,
      routeArea: payload.routeArea || 'Nội thành TP. Hồ Chí Minh',
      warehouseId: payload.warehouseId || 'wh-001',
      warehouseName: payload.warehouseName || 'Kho Tổng Miền Bắc - LOHA WH01',
      driverName: payload.driverName || 'Nguyễn Văn Nam',
      driverPhone: payload.driverPhone || '0988123456',
      vehicleNumber: payload.vehicleNumber || '29C-123.45',
      licensePlate: payload.vehicleNumber || '29C-123.45',
      carrierName: payload.carrierName || 'Đội xe nội bộ LOHA',
      vehicleType: payload.vehicleType || 'Xe tải 2.5T',
      status: startImmediately ? 'IN_TRANSIT' : 'DRAFT',
      departedAt: startImmediately ? now : undefined,
      departureDate: now,
      estimatedCompletionTime: payload.estimatedCompletionTime || new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
      stops,
      totalStops: stops.length,
      stopsCount: stops.length,
      deliveredStops: 0,
      remainingStops: stops.length,
      failedStops: 0,
      totalGoodsValue,
      deliveredGoodsValue: 0,
      inTransitGoodsValue: startImmediately ? totalGoodsValue : 0,
      retainedGoodsValue: 0,
      isOverdue: false,
      overdueMinutes: 0,
      totalCodAmount: totalGoodsValue,
      notes: payload.notes || payload.note,
      createdAt: now,
      updatedAt: now,
    };

    // Nếu "Xuất phát ngay", cập nhật trạng thái đơn hàng bên "Theo dõi đơn hàng" sang SHIPPED (Đang giao xe)
    if (startImmediately) {
      selectedOrders.forEach((o) => {
        (o as any).status = 'SHIPPED';
        (o as any).shippedAt = now;
        (o as any).driverName = newTrip.driverName;
        (o as any).driverPhone = newTrip.driverPhone;
        (o as any).licensePlate = newTrip.vehicleNumber;
        (o as any).carrierName = newTrip.carrierName;
        (o as any).tripCode = newTrip.tripCode;
        (o as any).estimatedDeliveryWindow = '09:00 - 11:30, Hôm nay';
      });

      // Lưu lại danh sách đơn hàng cập nhật
      try {
        localStorage.setItem('loha_demo_orders', JSON.stringify(allOrders));
        window.dispatchEvent(new CustomEvent('loha_orders_updated'));
      } catch {}
    }

    // Lưu chuyến mới
    const stored = getStoredTrips();
    saveStoredTrips([newTrip, ...stored]);

    return newTrip;
  },

  /**
   * Bắt đầu chuyến đi giao hàng (Xuất phát trên đường)
   */
  async startTrip(id: string): Promise<DeliveryTrip> {
    const stored = getStoredTrips();
    const trip = stored.find((t) => t.id === id || t.tripCode === id);
    if (!trip) {
      throw new Error(`Không tìm thấy chuyến đi ${id}`);
    }

    trip.status = 'IN_TRANSIT';
    trip.departedAt = new Date().toISOString();
    trip.updatedAt = new Date().toISOString();
    trip.inTransitGoodsValue = trip.totalGoodsValue - trip.deliveredGoodsValue - trip.retainedGoodsValue;

    // Cập nhật trạng thái các đơn hàng con sang SHIPPED
    const allOrders = getStoredDemoOrders();
    trip.stops.forEach((s) => {
      const o = allOrders.find(
        (item) => item.orderCode === s.orderCode || item.id === s.orderId,
      );
      if (o && o.status !== 'DELIVERED') {
        (o as any).status = 'SHIPPED';
        (o as any).shippedAt = trip.departedAt;
        (o as any).driverName = trip.driverName;
        (o as any).driverPhone = trip.driverPhone;
        (o as any).licensePlate = trip.vehicleNumber;
        (o as any).carrierName = trip.carrierName;
      }
    });

    try {
      localStorage.setItem('loha_demo_orders', JSON.stringify(allOrders));
      window.dispatchEvent(new CustomEvent('loha_orders_updated'));
    } catch {}

    saveStoredTrips(stored);
    return trip;
  },

  /**
   * Cập nhật trạng thái một điểm giao hàng trên chuyến (SN-194 / SN-197)
   * - DELIVERED: Giao thành công (đồng bộ sang Theo dõi đơn hàng là DELIVERED)
   * - FAILED: Giao thất bại kèm lý do (Hàng vẫn giữ trên xe, KHÔNG tự về kho)
   */
  async updateStopStatus(
    tripId: string,
    stopId: string,
    payload: UpdateStopStatusPayload,
  ): Promise<DeliveryTrip> {
    const allTrips = await this.getTrips();
    let trip = allTrips.find((t) => t.id === tripId || t.tripCode === tripId);
    if (!trip) {
      throw new Error(`Không tìm thấy chuyến ${tripId}`);
    }

    const stop = trip.stops.find((s) => s.id === stopId);
    if (!stop) {
      throw new Error(`Không tìm thấy điểm giao ${stopId}`);
    }

    stop.status = payload.status;
    const now = new Date().toISOString();

    if (payload.status === 'DELIVERED') {
      stop.deliveredAt = now;
      stop.failureReason = undefined;

      // Đồng bộ đơn hàng tương ứng sang DELIVERED (Giao xong) bên "Quản lý đơn hàng"
      const targetCode = stop.orderCode || stop.orderId;
      if (targetCode) {
        syncDemoOrderStatus(targetCode, 'DELIVERED');
      }
      try {
        window.dispatchEvent(new CustomEvent('loha_shipments_updated'));
      } catch {}
    } else if (payload.status === 'FAILED') {
      stop.failureReason = payload.failureReason;
      stop.failedAt = now;
    }

    // Tính lại tiến độ chuyến
    const deliveredCount = trip.stops.filter((s) => s.status === 'DELIVERED').length;
    const failedCount = trip.stops.filter((s) => s.status === 'FAILED').length;
    trip.deliveredStops = deliveredCount;
    trip.failedStops = failedCount;
    trip.remainingStops = trip.totalStops - deliveredCount - failedCount;

    trip.deliveredGoodsValue = trip.stops
      .filter((s) => s.status === 'DELIVERED')
      .reduce((sum, s) => sum + (s.orderAmount || s.codAmount || 0), 0);
    trip.retainedGoodsValue = trip.stops
      .filter((s) => s.status === 'FAILED')
      .reduce((sum, s) => sum + (s.orderAmount || s.codAmount || 0), 0);
    trip.inTransitGoodsValue = trip.stops
      .filter((s) => s.status === 'PENDING')
      .reduce((sum, s) => sum + (s.orderAmount || s.codAmount || 0), 0);

    trip.updatedAt = now;

    // Lưu lại vào storedTrips
    const stored = getStoredTrips().filter((t) => t.id !== trip!.id && t.tripCode !== trip!.tripCode);
    saveStoredTrips([trip, ...stored]);

    return trip;
  },

  /**
   * Quản lý kho xác nhận xe về kho & kiểm đếm đối soát hàng chưa giao nhập lại kho (SN-194 / SN-197)
   */
  async checkinTripReturn(
    id: string,
    payload: TripCheckinReturnPayload,
  ): Promise<DeliveryTrip> {
    // 1. Thử gọi API backend nếu có
    try {
      await apiClient.post(`/delivery-trips/${id}/return-checkin`, payload);
    } catch {
      // Tiếp tục cập nhật local
    }

    const allTrips = await this.getTrips();
    const trip = allTrips.find((t) => t.id === id || t.tripCode === id);
    if (!trip) {
      throw new Error(`Không tìm thấy chuyến đi ${id}`);
    }

    const now = new Date().toISOString();
    trip.status = 'COMPLETED';
    trip.completedAt = now;
    trip.returnedToWarehouse = true;
    trip.returnedAt = now;
    trip.returnedNotes = payload.returnedNotes;
    trip.inTransitGoodsValue = 0;
    trip.retainedGoodsValue = 0; // Hàng giữ trên xe đã kiểm đếm và hoàn nhập kho, chuyển về 0
    trip.remainingStops = 0;
    trip.isOverdue = false;
    trip.overdueMinutes = 0;
    trip.updatedAt = now;

    // Đánh dấu các stop FAILED là đã về kho
    (trip.stops || []).forEach((s) => {
      if (s.status === 'FAILED') {
        (s as any).returnedToWarehouse = true;
        (s as any).returnedAt = now;
      }
    });

    // Đồng bộ đơn hàng tương ứng trong storage
    try {
      const allOrders = getStoredDemoOrders();
      let hasOrderChange = false;
      trip.stops.forEach((s) => {
        const o = allOrders.find(
          (item) => item.orderCode === s.orderCode || item.id === s.orderId,
        );
        if (o && s.status === 'FAILED') {
          (o as any).returnedToWarehouse = true;
          (o as any).returnedAt = now;
          (o as any).deliveryFailureReason = s.failureReason || payload.returnedNotes;
          hasOrderChange = true;
        }
      });
      if (hasOrderChange) {
        saveStoredDemoOrders(allOrders);
        window.dispatchEvent(new CustomEvent('loha_orders_updated'));
      }
    } catch {}

    const stored = getStoredTrips().filter((t) => t.id !== trip.id && t.tripCode !== trip.tripCode);
    saveStoredTrips([trip, ...stored]);

    return trip;
  },

  /**
   * Cập nhật thông tin chuyến giao hàng (SN-196)
   */
  async updateTrip(id: string, payload: UpdateDeliveryTripPayload): Promise<DeliveryTrip> {
    const allTrips = await this.getTrips();
    const trip = allTrips.find((t) => t.id === id || t.tripCode === id);
    if (!trip) {
      throw new Error(`Không tìm thấy chuyến đi ${id}`);
    }

    if (payload.tripName || payload.name) trip.tripName = (payload.tripName || payload.name)!;
    if (payload.routeArea) trip.routeArea = payload.routeArea;
    if (payload.driverName) trip.driverName = payload.driverName;
    if (payload.driverPhone) trip.driverPhone = payload.driverPhone;
    if (payload.vehicleNumber) {
      trip.vehicleNumber = payload.vehicleNumber;
      trip.licensePlate = payload.vehicleNumber;
    }
    if (payload.status) trip.status = payload.status;
    trip.updatedAt = new Date().toISOString();

    // Đồng bộ thông tin tài xế mới sang danh sách đơn hàng tương ứng
    if (payload.driverName || payload.driverPhone || payload.vehicleNumber) {
      try {
        const allOrders = getStoredDemoOrders();
        let hasOrderChange = false;
        trip.stops.forEach((s) => {
          const ord = allOrders.find(
            (o) => (o.orderCode && o.orderCode === s.orderCode) || o.id === s.orderId,
          );
          if (ord) {
            if (payload.driverName) (ord as any).driverName = payload.driverName;
            if (payload.driverPhone) (ord as any).driverPhone = payload.driverPhone;
            if (payload.vehicleNumber) (ord as any).licensePlate = payload.vehicleNumber;
            hasOrderChange = true;
          }
        });
        if (hasOrderChange) {
          saveStoredDemoOrders(allOrders);
          window.dispatchEvent(new CustomEvent('loha_orders_updated'));
        }
      } catch {}
    }

    const stored = getStoredTrips().filter((t) => t.id !== trip.id && t.tripCode !== trip.tripCode);
    saveStoredTrips([trip, ...stored]);

    // Đồng bộ lên backend nếu có kết nối
    try {
      await apiClient.patch(`/delivery-trips/${trip.id}/driver`, {
        driverName: trip.driverName,
        driverPhone: trip.driverPhone,
        vehicleNumber: trip.vehicleNumber,
      });
    } catch {}

    return trip;
  },

  /**
   * Cập nhật thông tin tài xế & số điện thoại
   */
  async updateDriver(
    id: string,
    driverInfo: { driverName?: string; driverPhone?: string; vehicleNumber?: string },
  ): Promise<DeliveryTrip> {
    return this.updateTrip(id, driverInfo);
  },

  /**
   * Gán tài xế và phương tiện cho chuyến (SN-196 AC 2)
   */
  async assignDriver(id: string, payload: AssignDriverPayload): Promise<DeliveryTrip> {
    const trip = await this.updateTrip(id, {
      driverName: payload.driverName,
      driverPhone: payload.driverPhone,
      vehicleNumber: payload.vehicleNumber,
      vehicleType: payload.vehicleType,
      status: 'ASSIGNED',
    });
    return trip;
  },

  /**
   * Xuất phát chuyến giao hàng (SN-196)
   */
  async dispatchTrip(id: string): Promise<DeliveryTrip> {
    return this.startTrip(id);
  },

  /**
   * Hoàn thành chuyến giao hàng (SN-196)
   */
  async completeTrip(id: string): Promise<DeliveryTrip> {
    return this.checkinTripReturn(id, {
      confirmReturnAllFailedGoods: true,
      returnedNotes: 'Hoàn tất chuyến giao hàng thành công',
    });
  },

  /**
   * Hủy chuyến giao hàng (SN-196)
   */
  async cancelTrip(id: string, reason?: string): Promise<DeliveryTrip> {
    const allTrips = await this.getTrips();
    const trip = allTrips.find((t) => t.id === id || t.tripCode === id);
    if (!trip) {
      throw new Error(`Không tìm thấy chuyến đi ${id}`);
    }

    trip.status = 'CANCELLED';
    trip.notes = reason ? `Lý do hủy: ${reason}` : trip.notes;
    trip.updatedAt = new Date().toISOString();

    const stored = getStoredTrips().filter((t) => t.id !== trip.id && t.tripCode !== trip.tripCode);
    saveStoredTrips([trip, ...stored]);

    return trip;
  },

  /**
   * Xóa chuyến giao hàng (SN-196)
   */
  async deleteTrip(id: string): Promise<{ success: boolean; message: string }> {
    const stored = getStoredTrips().filter((t) => t.id !== id && t.tripCode !== id);
    saveStoredTrips(stored);
    return { success: true, message: `Đã xóa chuyến giao hàng ${id}` };
  },

  /**
   * Lấy dữ liệu in ấn bảng kê lộ trình điểm giao (SN-196 AC 3)
   */
  async getTripManifest(id: string): Promise<TripManifestResponse> {
    const trip = await this.getTripById(id);
    return {
      trip,
      stops: trip.stops,
      printedAt: new Date().toISOString(),
    };
  },
};
