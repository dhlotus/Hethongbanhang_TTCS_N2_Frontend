/**
 * Service Quản lý Phiếu Soạn Hàng (Wave / Batch Picking) theo đường đi tối ưu trong kho.
 * Tuân thủ quy chuẩn CODE_CONVENTION.docx:
 * - Tên hàm camelCase bắt đầu bằng động từ hành động.
 * - Tuyệt đối không dùng kiểu any, định nghĩa Interface rõ ràng.
 * - Nguyên tắc một hàm một việc, chia nhỏ các hàm helper dưới 30-50 dòng.
 * - Xử lý try-catch và lưu trữ bền vững (Local Persistence).
 */

import { ordersService } from './orders.service';
import type { Order } from '../types/order';
import type {
  CreatePickingSheetPayload,
  OrderAllocationItem,
  PickingItemStatus,
  PickingLineItem,
  PickingSheet,
  PickingSheetStatus,
  UpdatePickingLineItemPayload,
  WarehouseLocationDetail,
} from '../types/order-picking.types';

const STORAGE_KEY = 'loha_warehouse_order_picking_sheets';

/**
 * Tính toán vị trí kệ và chỉ số đường đi S-Shape (Snake Routing) cho từng SKU hàng hóa
 * Giúp nhân viên kho đi 1 chiều liên tục từ đầu dãy đến cuối dãy thay vì chạy tới lui
 */
const calculateLocationForSku = (sku: string, category?: string): WarehouseLocationDetail => {
  const normalizedSku = (sku || 'SKU-001').toUpperCase();
  let charCodeSum = 0;
  for (let i = 0; i < normalizedSku.length; i++) {
    charCodeSum += normalizedSku.charCodeAt(i);
  }

  // Phân bổ khu vực theo nhóm ngành hàng
  let zone = 'A'; // Khu vực Sữa & Đồ uống khô
  if (category?.toLowerCase().includes('lạnh') || category?.toLowerCase().includes('tiệt trùng')) {
    zone = 'B'; // Khu vực kho mát
  } else if (category?.toLowerCase().includes('bánh') || category?.toLowerCase().includes('gói')) {
    zone = 'C'; // Khu vực thực phẩm đóng gói
  }

  // Dãy hàng 01 đến 06
  const aisleNum = (charCodeSum % 6) + 1;
  const aisle = String(aisleNum).padStart(2, '0');

  // Kệ R01 đến R08
  const rackNum = ((charCodeSum * 3) % 8) + 1;
  const rack = `R${String(rackNum).padStart(2, '0')}`;

  // Tầng 1 đến 4 (Tầng thấp nhặt hàng nặng, tầng cao hàng nhẹ)
  const shelfNum = (charCodeSum % 4) + 1;
  const shelf = `T${shelfNum}`;

  // Ô / Ngăn B01 đến B06
  const binNum = ((charCodeSum * 7) % 6) + 1;
  const bin = `B${String(binNum).padStart(2, '0')}`;

  const formattedCode = `${zone}-${aisle}-${rack}-${shelf}-${bin}`;

  // Chỉ số sắp xếp lộ trình S-Shape:
  // Dãy lẻ (1, 3, 5): đi từ Kệ 1 -> Kệ 8
  // Dãy chẵn (2, 4, 6): đi ngược từ Kệ 8 -> Kệ 1 để quay đầu liên tục
  const isReverseAisle = aisleNum % 2 === 0;
  const effectiveRackScore = isReverseAisle ? 10 - rackNum : rackNum;
  const zoneScore = zone.charCodeAt(0) * 100000;
  const aisleScore = aisleNum * 10000;
  const rackScore = effectiveRackScore * 1000;
  const shelfScore = shelfNum * 100;
  const binScore = binNum;
  const sortIndex = zoneScore + aisleScore + rackScore + shelfScore + binScore;

  return {
    zone,
    aisle,
    rack,
    shelf,
    bin,
    formattedCode,
    sortIndex,
  };
};

/**
 * Đọc danh sách phiếu soạn hàng từ bộ nhớ cục bộ
 */
const getStoredSheets = (): PickingSheet[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getInitialDemoSheets();
    const parsed = JSON.parse(raw) as PickingSheet[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getInitialDemoSheets();
  } catch {
    return getInitialDemoSheets();
  }
};

/**
 * Lưu danh sách phiếu soạn hàng vào bộ nhớ cục bộ
 */
const saveStoredSheets = (sheets: PickingSheet[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
  } catch (err) {
    console.error('Không thể lưu phiếu soạn hàng vào bộ nhớ:', err);
  }
};

/**
 * Dữ liệu mẫu ban đầu trực quan để phục vụ kiểm thử ngay lập tức
 */
const getInitialDemoSheets = (): PickingSheet[] => {
  const demoItems: PickingLineItem[] = [
    {
      id: 'pick-item-01',
      productId: 'prod-milk-001',
      productSku: 'MILK-VNM-100',
      productName: 'Sữa Tươi Tiệt Trùng Vinamilk 100% Có Đường (Thùng 48 hộp 180ml)',
      category: 'Sữa & Đồ uống',
      unit: 'Thùng',
      baseUnit: 'Hộp',
      conversionRate: 48,
      location: {
        zone: 'A',
        aisle: '01',
        rack: 'R01',
        shelf: 'T1',
        bin: 'B01',
        formattedCode: 'A-01-R01-T1-B01',
        sortIndex: 6511101,
      },
      stepNumber: 1,
      totalRequiredQuantity: 25,
      totalPickedQuantity: 25,
      status: 'PICKED',
      orders: [
        {
          orderId: 'dh-demo-01',
          orderCode: 'DH2610-88123',
          customerId: 'cust-01',
          customerName: 'Công Ty TNHH Thương Mại Minh Khang',
          requiredQuantity: 15,
          pickedQuantity: 15,
          unit: 'Thùng',
        },
        {
          orderId: 'dh-demo-02',
          orderCode: 'DH2610-88124',
          customerId: 'cust-02',
          customerName: 'Đại Lý Bách Hóa Tân Phú',
          requiredQuantity: 10,
          pickedQuantity: 10,
          unit: 'Thùng',
        },
      ],
      completedAt: '2026-10-16T14:10:00.000Z',
    },
    {
      id: 'pick-item-02',
      productId: 'prod-milk-002',
      productSku: 'MILK-TH-TRUE',
      productName: 'Sữa Tươi TH True Milk Ít Đường (Thùng 48 hộp 180ml)',
      category: 'Sữa & Đồ uống',
      unit: 'Thùng',
      baseUnit: 'Hộp',
      conversionRate: 48,
      location: {
        zone: 'A',
        aisle: '01',
        rack: 'R02',
        shelf: 'T2',
        bin: 'B03',
        formattedCode: 'A-01-R02-T2-B03',
        sortIndex: 6512203,
      },
      stepNumber: 2,
      totalRequiredQuantity: 12,
      totalPickedQuantity: 10,
      status: 'SHORT_PICKED',
      shortPickReasonCode: 'DAMAGED_GOODS',
      shortPickReason: '2 thùng bị móp méo góc bao bì do va chạm kệ tầng trên',
      orders: [
        {
          orderId: 'dh-demo-01',
          orderCode: 'DH2610-88123',
          customerId: 'cust-01',
          customerName: 'Công Ty TNHH Thương Mại Minh Khang',
          requiredQuantity: 12,
          pickedQuantity: 10,
          unit: 'Thùng',
        },
      ],
      completedAt: '2026-10-16T14:15:00.000Z',
    },
    {
      id: 'pick-item-03',
      productId: 'prod-coca-001',
      productSku: 'BEV-COCA-CAN',
      productName: 'Nước Giải Khát Coca-Cola Vị Nguyên Bản (Khay 24 lon 320ml)',
      category: 'Nước giải khát',
      unit: 'Khay',
      baseUnit: 'Lon',
      conversionRate: 24,
      location: {
        zone: 'A',
        aisle: '02',
        rack: 'R04',
        shelf: 'T1',
        bin: 'B02',
        formattedCode: 'A-02-R04-T1-B02',
        sortIndex: 6526102,
      },
      stepNumber: 3,
      totalRequiredQuantity: 30,
      totalPickedQuantity: 0,
      status: 'PENDING',
      orders: [
        {
          orderId: 'dh-demo-02',
          orderCode: 'DH2610-88124',
          customerId: 'cust-02',
          customerName: 'Đại Lý Bách Hóa Tân Phú',
          requiredQuantity: 30,
          pickedQuantity: 0,
          unit: 'Khay',
        },
      ],
    },
  ];

  return [
    {
      id: 'psh-demo-001',
      sheetCode: 'PSH-20261016-001',
      warehouseId: '11111111-0000-0000-0000-000000000001',
      warehouseCode: 'KHO-MN-01',
      warehouseName: 'Kho Miền Nam (TP. Hồ Chí Minh)',
      sourceOrderIds: ['dh-demo-01', 'dh-demo-02'],
      sourceOrderCodes: ['DH2610-88123', 'DH2610-88124'],
      orderCount: 2,
      status: 'IN_PROGRESS',
      pickerName: 'Nguyễn Văn Kho',
      createdAt: '2026-10-16T14:00:00.000Z',
      updatedAt: '2026-10-16T14:15:00.000Z',
      items: demoItems,
      totalLines: 3,
      pickedLines: 2,
      totalRequiredQuantity: 67,
      totalPickedQuantity: 35,
      note: 'Gộp 2 đơn giao buổi chiều khu vực Quận Phú Nhuận & Tân Phú',
    },
  ];
};

/**
 * Phân bổ số lượng đã nhặt thực tế vào từng đơn hàng thành phần theo tỷ lệ tuần tự
 */
const allocateQuantityAcrossOrders = (
  orders: OrderAllocationItem[],
  totalPicked: number,
): OrderAllocationItem[] => {
  let remaining = totalPicked;
  return orders.map((ord) => {
    const allocated = Math.min(ord.requiredQuantity, remaining);
    remaining = Math.max(0, remaining - allocated);
    return {
      ...ord,
      pickedQuantity: allocated,
    };
  });
};

/**
 * Tính toán lại trạng thái chung của toàn phiếu soạn hàng
 */
const recalculateSheetSummary = (sheet: PickingSheet): PickingSheet => {
  const totalLines = sheet.items.length;
  const pickedLines = sheet.items.filter((it) => it.status !== 'PENDING').length;
  const totalRequiredQuantity = sheet.items.reduce((sum, it) => sum + it.totalRequiredQuantity, 0);
  const totalPickedQuantity = sheet.items.reduce((sum, it) => sum + it.totalPickedQuantity, 0);

  let status: PickingSheetStatus = 'IN_PROGRESS';
  if (pickedLines === totalLines && totalLines > 0) {
    const hasShortPick = sheet.items.some((it) => it.status === 'SHORT_PICKED');
    status = hasShortPick ? 'PARTIALLY_COMPLETED' : 'COMPLETED';
  }

  return {
    ...sheet,
    totalLines,
    pickedLines,
    totalRequiredQuantity,
    totalPickedQuantity,
    status,
    updatedAt: new Date().toISOString(),
    completedAt: status === 'COMPLETED' || status === 'PARTIALLY_COMPLETED' ? new Date().toISOString() : undefined,
  };
};

export const orderPickingService = {
  /**
   * Lấy toàn bộ danh sách phiếu soạn hàng
   */
  async getPickingSheets(): Promise<PickingSheet[]> {
    return getStoredSheets();
  },

  /**
   * Lấy chi tiết 1 phiếu soạn hàng theo ID
   */
  async getPickingSheetById(id: string): Promise<PickingSheet | null> {
    const list = getStoredSheets();
    return list.find((s) => s.id === id || s.sheetCode === id) || null;
  },

  /**
   * Lấy danh sách các đơn hàng đủ điều kiện để soạn hàng
   * Bao gồm các đơn có trạng thái APPROVED, PROCESSING hoặc PENDING
   */
  async getEligibleOrdersForPicking(): Promise<Order[]> {
    try {
      const response = await ordersService.getOrders({ limit: 100 });
      const orders: Order[] = Array.isArray(response) ? response : response?.data || [];
      return orders.filter(
        (o: Order) =>
          o.status === 'APPROVED' ||
          o.status === 'PROCESSING' ||
          o.status === 'PENDING',
      );
    } catch {
      return [];
    }
  },

  /**
   * Tạo phiếu soạn hàng mới từ 1 hoặc nhiều đơn hàng (Gộp đơn - Wave Picking)
   * Tự động gom dòng hàng cùng SKU và sắp xếp tuần tự theo đường đi trong kho
   */
  async createPickingSheet(payload: CreatePickingSheetPayload): Promise<PickingSheet> {
    if (!payload.selectedOrderIds || payload.selectedOrderIds.length === 0) {
      throw new Error('Vui lòng chọn ít nhất một đơn hàng để tạo phiếu soạn');
    }

    const allOrders = await this.getEligibleOrdersForPicking();
    const selectedOrders = allOrders.filter((o) =>
      payload.selectedOrderIds.includes(o.id || o.orderCode || ''),
    );

    if (selectedOrders.length === 0) {
      throw new Error('Không tìm thấy thông tin các đơn hàng đã chọn');
    }

    // Map gom các dòng hàng theo SKU và Đơn vị tính
    const itemMap = new Map<
      string,
      {
        productId: string;
        productSku: string;
        productName: string;
        category?: string;
        unit: string;
        baseUnit: string;
        conversionRate: number;
        totalQuantity: number;
        orders: OrderAllocationItem[];
      }
    >();

    for (const order of selectedOrders) {
      const orderId = order.id || order.orderCode || 'ORD';
      const orderCode = order.orderCode || order.id || 'ORD';
      const customerId = order.customerId || '';
      const customerName = order.customerName || 'Đại lý';

      for (const line of order.lines || []) {
        const skuKey = `${(line.productSku || line.productId).toUpperCase()}_${(line.unit || 'Đơn vị').toUpperCase()}`;
        const existing = itemMap.get(skuKey);

        const allocation: OrderAllocationItem = {
          orderId,
          orderCode,
          customerId,
          customerName,
          requiredQuantity: line.quantity,
          pickedQuantity: 0,
          unit: line.unit || 'Đơn vị',
        };

        if (existing) {
          existing.totalQuantity += line.quantity;
          existing.orders.push(allocation);
        } else {
          itemMap.set(skuKey, {
            productId: line.productId || line.productSku,
            productSku: line.productSku,
            productName: line.productName,
            category: line.category,
            unit: line.unit,
            baseUnit: line.baseUnit || line.unit,
            conversionRate: line.conversionRate || 1,
            totalQuantity: line.quantity,
            orders: [allocation],
          });
        }
      }
    }

    if (itemMap.size === 0) {
      throw new Error('Các đơn hàng đã chọn không có mặt hàng nào để soạn');
    }

    // Chuyển Map thành mảng và gán vị trí lưu kho
    const rawItems: Array<{
      productId: string;
      productSku: string;
      productName: string;
      category?: string;
      unit: string;
      baseUnit: string;
      conversionRate: number;
      location: WarehouseLocationDetail;
      totalRequiredQuantity: number;
      orders: OrderAllocationItem[];
    }> = [];

    for (const entry of itemMap.values()) {
      const location = calculateLocationForSku(entry.productSku, entry.category);
      rawItems.push({
        productId: entry.productId,
        productSku: entry.productSku,
        productName: entry.productName,
        category: entry.category,
        unit: entry.unit,
        baseUnit: entry.baseUnit,
        conversionRate: entry.conversionRate,
        location,
        totalRequiredQuantity: entry.totalQuantity,
        orders: entry.orders,
      });
    }

    // Sắp xếp các dòng hàng theo đường đi tối ưu S-Shape (sortIndex tăng dần)
    rawItems.sort((a, b) => a.location.sortIndex - b.location.sortIndex);

    // Gán số thứ tự bước nhặt (Step 1, Step 2, ...)
    const items: PickingLineItem[] = rawItems.map((item, index) => ({
      id: `pick-line-${Date.now()}-${index + 1}`,
      productId: item.productId,
      productSku: item.productSku,
      productName: item.productName,
      category: item.category,
      unit: item.unit,
      baseUnit: item.baseUnit,
      conversionRate: item.conversionRate,
      location: item.location,
      stepNumber: index + 1,
      totalRequiredQuantity: item.totalRequiredQuantity,
      totalPickedQuantity: 0,
      status: 'PENDING',
      orders: item.orders,
    }));

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const sheetCode = `PSH-${dateStr}-${randNum}`;

    const newSheet: PickingSheet = {
      id: `psh-${Date.now()}`,
      sheetCode,
      warehouseId: payload.warehouseId || '11111111-0000-0000-0000-000000000001',
      warehouseCode: payload.warehouseCode || 'KHO-MN-01',
      warehouseName: payload.warehouseName || 'Kho Miền Nam (TP. Hồ Chí Minh)',
      sourceOrderIds: selectedOrders.map((o) => o.id || o.orderCode || ''),
      sourceOrderCodes: selectedOrders.map((o) => o.orderCode || o.id || ''),
      orderCount: selectedOrders.length,
      status: 'IN_PROGRESS',
      pickerName: payload.pickerName || 'Thủ kho phụ trách',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      items,
      totalLines: items.length,
      pickedLines: 0,
      totalRequiredQuantity: items.reduce((s, it) => s + it.totalRequiredQuantity, 0),
      totalPickedQuantity: 0,
      note: payload.note || `Gộp ${selectedOrders.length} đơn hàng đã duyệt để soạn theo lối đi`,
    };

    const currentSheets = getStoredSheets();
    saveStoredSheets([newSheet, ...currentSheets]);

    return newSheet;
  },

  /**
   * Cập nhật số lượng thực soạn của 1 dòng hàng
   * Bắt buộc có lý do nếu soạn thiếu (pickedQuantity < requiredQuantity)
   */
  async updateLineItem(
    sheetId: string,
    itemId: string,
    payload: UpdatePickingLineItemPayload,
  ): Promise<PickingSheet> {
    const list = getStoredSheets();
    const sheetIndex = list.findIndex((s) => s.id === sheetId);
    if (sheetIndex === -1) {
      throw new Error(`Không tìm thấy phiếu soạn hàng với ID: ${sheetId}`);
    }

    const targetSheet = list[sheetIndex];
    const itemIndex = targetSheet.items.findIndex((it) => it.id === itemId);
    if (itemIndex === -1) {
      throw new Error(`Không tìm thấy dòng hàng với ID: ${itemId}`);
    }

    const currentItem = targetSheet.items[itemIndex];
    const validQty = Math.max(0, Number(payload.pickedQuantity) || 0);

    // Kiểm tra quy tắc nghiệp vụ: Soạn thiếu bắt buộc nhập lý do
    if (validQty < currentItem.totalRequiredQuantity) {
      if (!payload.shortPickReason || !payload.shortPickReason.trim()) {
        throw new Error('Soạn thiếu bắt buộc phải nhập lý do giải trình');
      }
    }

    let nextStatus: PickingItemStatus = 'PENDING';
    if (validQty >= currentItem.totalRequiredQuantity) {
      nextStatus = 'PICKED';
    } else if (validQty < currentItem.totalRequiredQuantity && payload.shortPickReason?.trim()) {
      nextStatus = 'SHORT_PICKED';
    }

    // Phân bổ số lượng nhặt cho từng đơn hàng thành phần
    const updatedOrders = allocateQuantityAcrossOrders(currentItem.orders, validQty);

    const updatedItem: PickingLineItem = {
      ...currentItem,
      totalPickedQuantity: validQty,
      status: nextStatus,
      shortPickReason: validQty < currentItem.totalRequiredQuantity ? payload.shortPickReason?.trim() : undefined,
      shortPickReasonCode: validQty < currentItem.totalRequiredQuantity ? payload.shortPickReasonCode : undefined,
      notes: payload.notes?.trim() || undefined,
      orders: updatedOrders,
      completedAt: nextStatus !== 'PENDING' ? new Date().toISOString() : undefined,
    };

    targetSheet.items[itemIndex] = updatedItem;
    const finalSheet = recalculateSheetSummary(targetSheet);

    list[sheetIndex] = finalSheet;
    saveStoredSheets(list);

    return finalSheet;
  },

  /**
   * Thao tác nhanh 1-chạm: Đánh dấu đã soạn đủ toàn bộ số lượng yêu cầu của dòng hàng
   */
  async quickPickAllItem(sheetId: string, itemId: string): Promise<PickingSheet> {
    const list = getStoredSheets();
    const sheet = list.find((s) => s.id === sheetId);
    if (!sheet) throw new Error('Không tìm thấy phiếu soạn');

    const item = sheet.items.find((it) => it.id === itemId);
    if (!item) throw new Error('Không tìm thấy dòng hàng');

    return this.updateLineItem(sheetId, itemId, {
      pickedQuantity: item.totalRequiredQuantity,
    });
  },

  /**
   * Hoàn tất phiếu soạn hàng
   * Kiểm tra tất cả các dòng soạn thiếu phải có đầy đủ lý do
   */
  async completePickingSheet(sheetId: string): Promise<PickingSheet> {
    const list = getStoredSheets();
    const sheetIndex = list.findIndex((s) => s.id === sheetId);
    if (sheetIndex === -1) throw new Error('Không tìm thấy phiếu soạn');

    const targetSheet = list[sheetIndex];

    // Kiểm tra dòng chưa soạn
    const pendingItems = targetSheet.items.filter((it) => it.status === 'PENDING');
    if (pendingItems.length > 0) {
      throw new Error(`Còn ${pendingItems.length} mặt hàng chưa được kiểm đếm hoặc đánh dấu`);
    }

    // Kiểm tra dòng thiếu chưa có lý do
    const missingReasonItems = targetSheet.items.filter(
      (it) => it.totalPickedQuantity < it.totalRequiredQuantity && !it.shortPickReason?.trim(),
    );
    if (missingReasonItems.length > 0) {
      throw new Error('Tất cả các dòng soạn thiếu bắt buộc phải có lý do giải trình');
    }

    const finalizedSheet = recalculateSheetSummary(targetSheet);
    list[sheetIndex] = finalizedSheet;
    saveStoredSheets(list);

    return finalizedSheet;
  },

  /**
   * Xóa một phiếu soạn hàng
   */
  async deletePickingSheet(sheetId: string): Promise<void> {
    const list = getStoredSheets();
    const filtered = list.filter((s) => s.id !== sheetId);
    saveStoredSheets(filtered);
  },
};
