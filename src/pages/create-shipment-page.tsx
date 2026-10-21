import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import {
  Package,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  User,
  Phone,
  MapPin,
  RefreshCw,
  X,
  FileText,
  ShieldAlert,
  Printer,
} from 'lucide-react';
import { shipmentsService } from '../services/shipments.service';
import type { BatchItem, CreateShipmentPayload, Shipment } from '../services/shipments.service';
import { ordersService } from '../services/orders.service';
import { warehouseService } from '../services/warehouse.service';
import type { Order, OrderLine } from '../types/order';
import type { AgencyWarehouseAssignment, Warehouse } from '../types/warehouse.types';
import { showToast } from '../components/toast';
import { tokenStorage } from '../utils/token-storage';

interface ShipmentProductRow {
  productId: string;
  skuCode: string;
  productName: string;
  unit: string;
  quantityRequested: number;
  // SN-195 Giao hàng thiếu
  orderedQuantity?: number;
  shippedQuantity?: number;
  remainingQuantity?: number;
  isShortDelivery?: boolean;
  shortDeliveryReason?: string;
  // Thông tin lô
  selectedBatchNo: string;
  fefoSuggestedBatchNo: string;
  expiryDate: string;
  manufacturingDate?: string;
  availableQuantity: number;
  isOverridden: boolean;
  overrideReason: string;
  isLoadingBatch?: boolean;
}

export const CreateShipmentPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isDetailMode = Boolean(id && id !== 'create');
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isIssuesContext = location.pathname.includes('/issues');
  const backListUrl = isIssuesContext ? '/inventory/issues' : '/inventory/shipments';
  const getDetailUrl = (resId: string) => isIssuesContext ? `/inventory/issues/shipments/${resId}` : `/inventory/shipments/${resId}`;
  const preselectedOrderId = searchParams.get('orderId') || searchParams.get('orderCode') || '';

  // Dữ liệu chi tiết phiếu khi ở chế độ view
  const [currentShipment, setCurrentShipment] = useState<Shipment | null>(null);

  // Danh mục dữ liệu
  const [orders, setOrders] = useState<Order[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [agencyDefaults, setAgencyDefaults] = useState<AgencyWarehouseAssignment[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Danh sách các orderId/orderCode đã được tạo phiếu xuất kho (để loại trừ không cho tạo trùng lặp)
  const [shippedOrderKeys, setShippedOrderKeys] = useState<Set<string>>(new Set());

  // Form Thông tin chung
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [receiverName, setReceiverName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [carrierName, setCarrierName] = useState<string>('Đội xe nội bộ LOHA');
  const [trackingNumber, setTrackingNumber] = useState<string>('');

  // Bảng sản phẩm xuất kho
  const [items, setItems] = useState<ShipmentProductRow[]>([]);

  // Modal Đổi Lô (SN-188 Override Modal)
  const [modalOpen, setModalOpen] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  const [modalBatches, setModalBatches] = useState<BatchItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [tempSelectedBatchNo, setTempSelectedBatchNo] = useState<string>('');
  const [tempOverrideReason, setTempOverrideReason] = useState<string>('');
  const [overrideError, setOverrideError] = useState<string | null>(null);

  // State submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Phân quyền nhân viên kho (Thủ kho / Quản lý kho)
  const currentUser = tokenStorage.getUser();
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const isWarehouseStaff = userRoles.some((r) =>
    ['WAREHOUSE_MANAGER', 'WAREHOUSE_KEEPER', 'WAREHOUSE', 'WH_MANAGER'].includes(String(r).toUpperCase())
  ) && !userRoles.includes('ADMIN') && !userRoles.includes('SALES_MANAGER');

  // Khởi tạo dữ liệu
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoadingInitial(true);
        const [ordersRes, whsRes, agencyDefaultsRes, shipmentsRes] = await Promise.all([
          ordersService.getOrdersForShipment({ limit: 100 }),
          warehouseService.getWarehouses(),
          warehouseService.getAgencyDefaults().catch(() => []),
          shipmentsService.getShipments().catch(() => []),
        ]);

        if (!mounted) return;

        // Tập hợp các đơn hàng đã có phiếu xuất kho đang hoạt động
        const shippedKeys = new Set<string>();
        if (Array.isArray(shipmentsRes)) {
          shipmentsRes.forEach((s: Shipment) => {
            if (s.status !== 'CANCELLED') {
              if (s.orderId) shippedKeys.add(String(s.orderId).trim().toUpperCase());
              if (s.orderCode) shippedKeys.add(String(s.orderCode).trim().toUpperCase());
            }
          });
        }
        setShippedOrderKeys(shippedKeys);

        if (agencyDefaultsRes && Array.isArray(agencyDefaultsRes)) {
          setAgencyDefaults(agencyDefaultsRes);
        }

        if (ordersRes?.data) {
          // Chuẩn ERP xuất kho: Chỉ hiển thị các đơn hàng đã được duyệt (APPROVED, READY_TO_SHIP)
          // Tuyệt đối loại bỏ đơn CANCELLED, DRAFT, PENDING* hoặc đơn ĐÃ CÓ PHIẾU XUẤT KHO
          const VALID_STATUSES = new Set(['APPROVED', 'READY_TO_SHIP']);
          const FORBIDDEN_STATUSES = new Set([
            'CANCELLED',
            'DRAFT',
            'PENDING',
            'PENDING_APPROVAL',
            'PENDING_INVENTORY_APPROVAL',
            'REJECTED',
            'RETURNED_FOR_UPDATE',
            'RETURNED',
            'CLOSED',
            'COMPLETED',
            'DISPATCHED',
            'PACKED',
            'SHIPPED',
            'DELIVERED',
            'PROCESSING',
          ]);
          const validOrders = ordersRes.data.filter((ord) => {
            const st = String(ord.status || '').toUpperCase().trim();
            const idKey = String(ord.id || '').trim().toUpperCase();
            const codeKey = String(ord.orderCode || '').trim().toUpperCase();

            // Nếu đơn hàng đã có phiếu xuất kho đang hoạt động -> Không hiển thị
            if (shippedKeys.has(idKey) || (codeKey && shippedKeys.has(codeKey))) {
              return false;
            }

            return VALID_STATUSES.has(st) && !FORBIDDEN_STATUSES.has(st);
          });
          setOrders(validOrders);
        }
        if (whsRes) {
          setWarehouses(whsRes);
          // Tự động gán kho theo tài khoản nhân viên kho
          let initialWhId = '';
          if (isWarehouseStaff) {
            const myWh = whsRes.find((w: Warehouse) => {
              if (currentUser?.warehouseId && (w.id === currentUser.warehouseId || w.code === currentUser.warehouseId)) return true;
              if (currentUser?.assignedWarehouseId && w.id === currentUser.assignedWarehouseId) return true;
              if (currentUser?.warehouseCode && w.code?.toUpperCase() === currentUser.warehouseCode?.toUpperCase()) return true;
              if (currentUser?.assignedWarehouse && w.name?.toLowerCase().includes(currentUser.assignedWarehouse.toLowerCase())) return true;
              const uName = (currentUser?.username || '').toLowerCase();
              const fName = (currentUser?.fullName || '').toLowerCase();
              if ((uName === 'thukho' || fName.includes('tuấn') || uName.includes('tuấn')) && (w.code?.includes('MB') || w.name?.toLowerCase().includes('bắc') || w.name?.toLowerCase().includes('hà nội'))) {
                return true;
              }
              if ((uName === 'warehouse' || fName.includes('hùng') || uName.includes('hùng')) && (w.code?.includes('MN') || w.name?.toLowerCase().includes('nam'))) {
                return true;
              }
              return false;
            });
            initialWhId = myWh?.id || whsRes[0]?.id || '';
          } else {
            initialWhId = whsRes[0]?.id || '';
          }

          if (initialWhId && !warehouseId) {
            setWarehouseId(initialWhId);
          }
        }

        // Nếu đang ở chế độ xem chi tiết phiếu xuất (SN-188 Deep Link / Audit)
        if (isDetailMode && id) {
          try {
            const sh = await shipmentsService.getShipmentById(id);
            if (sh && mounted) {
              setCurrentShipment(sh);
              setSelectedOrderId(sh.orderId || sh.orderCode || '');
              setCustomerName(sh.customerName || '');
              setReceiverName(sh.receiverName || '');
              setPhone(sh.phone || '');
              setDeliveryAddress(sh.deliveryAddress || '');
              setCarrierName(sh.carrierName || 'Tự vận chuyển');
              setTrackingNumber(sh.trackingNumber || '');
              if (sh.warehouseId) setWarehouseId(sh.warehouseId);

              if (sh.lines && Array.isArray(sh.lines) && sh.lines.length > 0) {
                setItems(
                  sh.lines.map((l: any) => {
                    const matchedItem: any = Array.isArray(sh.items)
                      ? sh.items.find(
                          (it: any) =>
                            (it.sku_code || it.skuCode || it.productId) === (l.productSku || l.productId)
                        )
                      : null;
                    const ordQty = Number(l.orderedQuantity ?? l.shippedQuantity ?? 1);
                    const shpQty = Number(l.shippedQuantity ?? 0);
                    const remQty = Number(
                      l.remainingQuantity ?? Math.max(0, ordQty - shpQty)
                    );
                    const isShort = Boolean(
                      l.isShortDelivery || remQty > 0 || sh.hasShortDelivery
                    );

                    return {
                      productId: l.productId || l.productSku || '',
                      skuCode: l.productSku || l.productId || '',
                      productName: l.productName || l.productSku || 'Sản phẩm',
                      unit: l.unitName || 'Hộp',
                      quantityRequested: Number(l.shippedQuantity ?? l.orderedQuantity ?? 1),
                      orderedQuantity: ordQty,
                      shippedQuantity: shpQty,
                      remainingQuantity: remQty,
                      isShortDelivery: isShort,
                      shortDeliveryReason: l.shortDeliveryReason || '',
                      selectedBatchNo:
                        matchedItem?.selected_batch_no ||
                        matchedItem?.selectedBatchNo ||
                        'LÔ-TIÊU-CHUẨN',
                      fefoSuggestedBatchNo:
                        matchedItem?.fefo_suggested_batch_no ||
                        matchedItem?.fefoSuggestedBatchNo ||
                        matchedItem?.selected_batch_no ||
                        'LÔ-TIÊU-CHUẨN',
                      expiryDate: matchedItem?.expiry_date || matchedItem?.expiryDate || '',
                      manufacturingDate:
                        matchedItem?.manufacturing_date || matchedItem?.manufacturingDate || '',
                      availableQuantity: Number(l.shippedQuantity ?? l.orderedQuantity ?? 1),
                      isOverridden: Boolean(matchedItem?.is_overridden ?? matchedItem?.isOverridden),
                      overrideReason:
                        matchedItem?.override_reason ||
                        matchedItem?.overrideReason ||
                        l.shortDeliveryReason ||
                        '',
                      isLoadingBatch: false,
                    };
                  })
                );
              } else if (sh.items && Array.isArray(sh.items) && sh.items.length > 0) {
                setItems(
                  sh.items.map((it: any) => {
                    const ordQty = Number(
                      it.ordered_quantity || it.orderedQuantity || it.quantity_requested || it.quantity || 1
                    );
                    const shpQty = Number(
                      it.shipped_quantity || it.shippedQuantity || it.quantity_requested || it.quantity || 1
                    );
                    const remQty = Number(it.remaining_quantity || it.remainingQuantity || 0);

                    return {
                      productId: it.sku_code || it.skuCode || '',
                      skuCode: it.sku_code || it.skuCode || '',
                      productName: it.product_name || it.productName || it.sku_code || 'Sản phẩm',
                      unit: it.unit || 'Hộp',
                      quantityRequested: Number(it.quantity_requested || it.quantity || 1),
                      orderedQuantity: ordQty,
                      shippedQuantity: shpQty,
                      remainingQuantity: remQty,
                      isShortDelivery: Boolean(
                        it.is_short_delivery || it.isShortDelivery || remQty > 0
                      ),
                      shortDeliveryReason: it.short_delivery_reason || it.shortDeliveryReason || '',
                      selectedBatchNo: it.selected_batch_no || it.selectedBatchNo || 'CHƯA_CÓ_LÔ',
                      fefoSuggestedBatchNo:
                        it.fefo_suggested_batch_no ||
                        it.fefoSuggestedBatchNo ||
                        it.selected_batch_no ||
                        '',
                      expiryDate: it.expiry_date || it.expiryDate || '',
                      manufacturingDate: it.manufacturing_date || it.manufacturingDate || '',
                      availableQuantity: Number(it.quantity_requested || it.quantity || 1),
                      isOverridden: Boolean(it.is_overridden ?? it.isOverridden),
                      overrideReason: it.override_reason || it.overrideReason || '',
                      isLoadingBatch: false,
                    };
                  })
                );
              }
            }
          } catch (detailErr) {
            console.error('Lỗi tải chi tiết phiếu xuất kho:', detailErr);
            showToast('error', 'Không tìm thấy phiếu', 'Không thể tải thông tin phiếu xuất kho này');
          }
        } else {
          // Tự sinh mã vận đơn
          const year = new Date().getFullYear();
          const rand = Math.floor(100000 + Math.random() * 900000);
          setTrackingNumber(`TRK-${year}-${rand}`);

          // Nếu có preselectedOrderId từ query param
          if (preselectedOrderId && ordersRes?.data) {
            const matched = ordersRes.data.find(
              (o) => o.id === preselectedOrderId || o.orderCode === preselectedOrderId
            );
            if (matched) {
              handleSelectOrder(matched, whsRes?.[0]?.id || '');
            }
          }
        }
      } catch (err) {
        console.error('Lỗi tải dữ liệu ban đầu:', err);
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [preselectedOrderId]);

  // Xử lý chọn đơn hàng
  const handleSelectOrder = async (order: Order, defaultWhId?: string) => {
    // Ràng buộc nghiệp vụ ERP: Chỉ cho phép xuất kho đơn đã duyệt (APPROVED, READY_TO_SHIP, PROCESSING)
    const st = String(order.status || '').toUpperCase().trim();
    if (st === 'CANCELLED' || st === 'DRAFT' || st.startsWith('PENDING') || st === 'REJECTED') {
      showToast(
        'error',
        'Đơn hàng không hợp lệ để xuất kho',
        `Đơn hàng [${order.orderCode}] đang ở trạng thái "${order.status}". Nghiệp vụ ERP chỉ cho phép xuất kho đối với đơn hàng ĐÃ DUYỆT (APPROVED).`
      );
      return;
    }

    setSelectedOrderId(order.id || '');
    setSelectedOrder(order);
    setCustomerName(order.customerName || '');

    const rName =
      order.deliveryPoint?.receiverName ||
      order.deliveryPoint?.contactPerson ||
      order.customerName ||
      '';
    setReceiverName(rName);

    const rPhone =
      order.deliveryPoint?.phone ||
      (order as any).phone ||
      (order as any).customerPhone ||
      '';
    const digitsOnly = String(rPhone).replace(/\D/g, '');
    setPhone(digitsOnly.slice(0, 10));
    setPhoneError(null);

    const rAddress =
      order.deliveryPoint?.address ||
      (order as any).deliveryAddress ||
      (order as any).address ||
      '';
    setDeliveryAddress(rAddress);

    const whId = (order as any).warehouseId || defaultWhId || warehouseId;
    if (whId) setWarehouseId(whId);

    // Chuẩn bị danh sách sản phẩm từ lines
    const rawLines: OrderLine[] = order.lines || (order as any).items || [];
    if (rawLines.length > 0) {
      const initialRows: ShipmentProductRow[] = rawLines.map((line) => ({
        productId: line.productId || (line as any).product_id || '',
        skuCode: line.productSku || (line as any).sku || (line as any).sku_code || '',
        productName: line.productName || (line as any).product_name || 'Sản phẩm',
        unit: line.unit || 'Đơn vị',
        quantityRequested: Number(line.quantity || (line as any).quantity_requested || 1),
        selectedBatchNo: '',
        fefoSuggestedBatchNo: '',
        expiryDate: '',
        availableQuantity: 0,
        isOverridden: false,
        overrideReason: '',
        isLoadingBatch: true,
      }));

      setItems(initialRows);

      // Tự động gọi gợi ý FEFO cho từng sản phẩm
      fetchFefoSuggestions(initialRows, whId);
    } else {
      setItems([]);
    }
  };

  // Helper format ngày hiển thị an toàn tuyệt đối, tránh lỗi Invalid Date
  const formatDisplayDate = (val: any): string => {
    if (!val) return '';
    try {
      if (val instanceof Date) {
        return isNaN(val.getTime()) ? '' : val.toLocaleDateString('vi-VN');
      }
      const s = String(val).trim();
      if (!s) return '';
      const parts = s.split('T')[0].split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const dt = new Date(y, m, d);
        if (!isNaN(dt.getTime())) return dt.toLocaleDateString('vi-VN');
      }
      const dt = new Date(s);
      return isNaN(dt.getTime()) ? s : dt.toLocaleDateString('vi-VN');
    } catch {
      return '';
    }
  };

  // Helper lấy timestamp ngày hết hạn để sort FEFO chuẩn xác
  const getBatchExpiryTime = (b: any): number => {
    const exp = b?.expiryDate || b?.expiry_date;
    if (!exp) return Infinity;
    try {
      if (exp instanceof Date) return isNaN(exp.getTime()) ? Infinity : exp.getTime();
      const s = String(exp).trim().split('T')[0];
      const parts = s.split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).getTime() || Infinity;
      }
      const dt = new Date(s);
      return isNaN(dt.getTime()) ? Infinity : dt.getTime();
    } catch {
      return Infinity;
    }
  };

  // Hàm gọi gợi ý FEFO cho danh sách sản phẩm
  const fetchFefoSuggestions = async (rows: ShipmentProductRow[], whId: string) => {
    const updatedRows = [...rows];

    await Promise.all(
      updatedRows.map(async (row, idx) => {
        try {
          const res = await shipmentsService.suggestFefo({
            skuCode: row.skuCode,
            quantity: row.quantityRequested,
            warehouseId: whId,
          });

          if (res?.suggestedBatch) {
            const b = res.suggestedBatch;
            updatedRows[idx] = {
              ...updatedRows[idx],
              selectedBatchNo: b.batchNumber || b.batchNo || (b as any).batch_number || '',
              fefoSuggestedBatchNo: b.batchNumber || b.batchNo || (b as any).batch_number || '',
              expiryDate: b.expiryDate || (b as any).expiry_date || '',
              manufacturingDate: b.manufacturingDate || (b as any).mfgDate || (b as any).mfg_date || '',
              availableQuantity: b.availableQuantity ?? b.quantity ?? (b as any).available_quantity ?? 0,
              isOverridden: false,
              overrideReason: '',
              isLoadingBatch: false,
            };
          } else {
            // Không tìm thấy lô phù hợp
            updatedRows[idx] = {
              ...updatedRows[idx],
              selectedBatchNo: 'CHƯA_CÓ_LÔ',
              fefoSuggestedBatchNo: '',
              expiryDate: '',
              availableQuantity: 0,
              isOverridden: false,
              overrideReason: '',
              isLoadingBatch: false,
            };
          }
        } catch (err) {
          console.error(`Lỗi lấy FEFO cho SKU ${row.skuCode}:`, err);
          updatedRows[idx] = {
            ...updatedRows[idx],
            isLoadingBatch: false,
          };
        }
      })
    );

    setItems([...updatedRows]);
  };

  // Khi người dùng đổi Kho xuất hàng
  const handleWarehouseChange = (newWhId: string) => {
    setWarehouseId(newWhId);
    // Reset đơn hàng đang chọn để tránh mang đơn của kho cũ sang kho mới
    setSelectedOrderId('');
    setSelectedOrder(null);
    setCustomerName('');
    setReceiverName('');
    setPhone('');
    setDeliveryAddress('');
    setItems([]);
  };

  // Lọc danh sách đơn hàng hợp lệ theo đúng Kho xuất hàng đang chọn:
  // NGHIỆP VỤ: Đơn hàng phát sinh từ Kho nào do đại lý được gán cho kho đó quyết định.
  // Thủ kho Miền Bắc chỉ quản lý các đơn hàng của các đại lý được gán cho kho Miền Bắc
  // trong phần "Gán đại lý cho kho" (app_agency_default_warehouses).
  const targetWarehouse = warehouses.find((w) => w.id === warehouseId);
  const currentWhId = String(targetWarehouse?.id || warehouseId || '').toLowerCase().trim();
  const currentWhCode = (targetWarehouse?.code || '').toUpperCase().trim();

  const filteredOrdersForWarehouse = orders.filter((ord) => {
    // 0. Đơn hàng đã được lập phiếu xuất kho -> Tuyệt đối không hiển thị để tạo trùng lặp
    const ordIdKey = String(ord.id || '').trim().toUpperCase();
    const ordCodeKey = String(ord.orderCode || '').trim().toUpperCase();
    if (shippedOrderKeys.has(ordIdKey) || (ordCodeKey && shippedOrderKeys.has(ordCodeKey))) {
      return false;
    }

    // 1. Phải là đơn hàng đã được duyệt cho phép xuất kho (APPROVED / READY_TO_SHIP)
    const st = String(ord.status || '').toUpperCase().trim();
    if (st !== 'APPROVED' && st !== 'READY_TO_SHIP') return false;

    // 2. Nếu đơn hàng có chỉ định trực tiếp warehouseId hoặc warehouseCode
    const ordWhId = (ord as any).warehouseId ? String((ord as any).warehouseId).toLowerCase().trim() : '';
    const ordWhCode = (ord as any).warehouseCode ? String((ord as any).warehouseCode).toUpperCase().trim() : '';

    if (ordWhId) {
      return ordWhId === currentWhId;
    }
    if (ordWhCode && currentWhCode) {
      return ordWhCode === currentWhCode;
    }

    // 3. Khớp theo Gán đại lý cho kho (Agency Warehouse Assignment)
    const cId = String(ord.customerId || '').toLowerCase().trim();
    const cCode = String(ord.customerCode || '').toLowerCase().trim();

    // Tìm trong bảng gán đại lý đã tải từ hệ thống
    const assignment = agencyDefaults.find((a) => {
      const aKey = String(a.agencyId || '').toLowerCase().trim();
      return aKey === cId || aKey === cCode;
    });

    if (assignment) {
      const assignedWhId = String(assignment.warehouseId || '').toLowerCase().trim();
      // Nếu đại lý này được gán cho kho hiện tại -> Hợp lệ
      // Nếu đại lý này được gán cho kho khác -> Loại bỏ
      return assignedWhId === currentWhId;
    }

    // 4. Fallback mặc định theo cấu hình hệ thống nếu chưa có dữ liệu gán động:
    // Kho Miền Bắc (KHO-MB-01): Các đại lý được gán mặc định gồm Minh Khang, Toàn Cầu, Hoàng Gia, An Phát, Phương Đông, Bảo Châu
    const mbDefaultAgencies = new Set([
      'cust-dl-0001',
      'cust-dl-0002',
      'cust-dl-0003',
      'cust-dl-0004',
      'cust-dl-0005',
      'cust-dl-0006',
      'cust-008',
      'dl-0001',
      'dl-0002',
      'dl-0003',
      'dl-0004',
      'dl-0005',
      'dl-0006',
    ]);
    const mtDefaultAgencies = new Set([
      'cust-dl-dn-001',
      'cust-dl-hn-001',
      'cust-dl-hn-002',
      'cust-dl-hn-003',
      'dl-dn-001',
    ]);

    if (currentWhId === '11111111-0000-0000-0000-000000000002' || currentWhCode === 'KHO-MB-01') {
      if (mtDefaultAgencies.has(cId) || mtDefaultAgencies.has(cCode)) return false;
      return mbDefaultAgencies.has(cId) || mbDefaultAgencies.has(cCode);
    }

    if (currentWhId === '11111111-0000-0000-0000-000000000004' || currentWhCode === 'KHO-MT-01') {
      if (mbDefaultAgencies.has(cId) || mbDefaultAgencies.has(cCode)) return false;
      return mtDefaultAgencies.has(cId) || mtDefaultAgencies.has(cCode);
    }

    return true;
  });

  // Mở modal Đổi Lô (Override Modal)
  const handleOpenBatchModal = async (index: number) => {
    const item = items[index];
    setActiveItemIndex(index);
    setTempSelectedBatchNo(item.selectedBatchNo);
    setTempOverrideReason(item.overrideReason || '');
    setOverrideError(null);
    setModalOpen(true);
    setLoadingBatches(true);

    try {
      const batches = await shipmentsService.getBatchesBySku({
        skuCode: item.skuCode,
        warehouseId: warehouseId,
      });

      // Sắp xếp theo chuẩn FEFO: ExpiryDate tăng dần (hạn gần nhất xếp trước)
      const sorted = (batches || []).sort((a, b) => {
        const tA = getBatchExpiryTime(a);
        const tB = getBatchExpiryTime(b);
        if (tA !== tB) return tA - tB;
        return 0;
      });

      setModalBatches(sorted);
    } catch (err) {
      console.error('Lỗi lấy danh sách lô:', err);
      showToast('error', 'Không thể tải danh sách lô của sản phẩm này');
    } finally {
      setLoadingBatches(false);
    }
  };

  // Xác nhận đổi lô trong Modal
  const handleConfirmBatchOverride = () => {
    if (activeItemIndex === null) return;
    const currentItem = items[activeItemIndex];

    const chosenBatch = modalBatches.find((b) => {
      const bNum = b.batchNumber || (b as any).batch_number || b.batchNo || (b as any).batch_no || '';
      return bNum === tempSelectedBatchNo;
    });

    if (!chosenBatch) {
      setOverrideError('Vui lòng chọn một lô hàng hợp lệ');
      return;
    }

    const bAvail = chosenBatch.availableQuantity ?? (chosenBatch as any).available_quantity ?? chosenBatch.quantity ?? 0;
    const bNum = chosenBatch.batchNumber || (chosenBatch as any).batch_number || chosenBatch.batchNo || (chosenBatch as any).batch_no || '';

    // Kiểm tra tồn khả dụng
    if (bAvail < currentItem.quantityRequested) {
      setOverrideError(
        `Lô ${bNum} chỉ còn ${bAvail} tồn, không đủ xuất ${currentItem.quantityRequested}`
      );
      return;
    }

    const fefoBatchNo = currentItem.fefoSuggestedBatchNo;
    const isOverride = fefoBatchNo ? tempSelectedBatchNo !== fefoBatchNo : false;

    // SN-188 BẮT BUỘC nhập lý do nếu chọn lô khác FEFO
    if (isOverride && (!tempOverrideReason || !tempOverrideReason.trim())) {
      setOverrideError('Bắt buộc phải nhập lý do khi chọn lô khác với chuẩn FEFO gợi ý!');
      return;
    }

    const updated = [...items];
    updated[activeItemIndex] = {
      ...updated[activeItemIndex],
      selectedBatchNo: bNum,
      expiryDate: chosenBatch.expiryDate || (chosenBatch as any).expiry_date || '',
      manufacturingDate: chosenBatch.manufacturingDate || (chosenBatch as any).mfgDate || (chosenBatch as any).mfg_date || '',
      availableQuantity: bAvail,
      isOverridden: isOverride,
      overrideReason: isOverride ? tempOverrideReason.trim() : '',
    };

    setItems(updated);
    setModalOpen(false);

    if (isOverride) {
      showToast(
        'warning' as any,
        'Đã đổi lô xuất kho (Ghi đè FEFO)',
        `Đã lưu lý do ghi đè: "${tempOverrideReason.trim()}". Hệ thống sẽ gửi cảnh báo đến Quản lý kho.`
      );
    } else {
      showToast('success', 'Đã cập nhật lô theo chuẩn FEFO');
    }
  };

  // Xử lý thay đổi số điện thoại (Chuẩn Việt Nam 10 số)
  const handlePhoneChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '');

    // Khi nhập thừa (> 10 số): hiển thị thông báo ngay lập tức
    if (digitsOnly.length > 10) {
      setPhone(digitsOnly.slice(0, 10));
      setPhoneError('Số điện thoại không được vượt quá 10 chữ số');
      return;
    }

    setPhone(digitsOnly);

    // Khi đang nhập thiếu (<= 10 số): nhập thiếu thì chưa báo
    if (phoneError) {
      if (digitsOnly.length > 0 && digitsOnly[0] !== '0') {
        setPhoneError('Số điện thoại phải bắt đầu bằng số 0');
      } else {
        setPhoneError(null);
      }
    }
  };

  // Khi thoát input (onBlur): nếu thiếu thì báo
  const handlePhoneBlur = () => {
    if (!phone || phone.trim() === '') {
      setPhoneError('Vui lòng nhập số điện thoại liên hệ');
      return;
    }
    if (phone.length < 10) {
      setPhoneError(`Số điện thoại chưa đủ 10 chữ số (hiện có ${phone.length}/10 số)`);
      return;
    }
    if (phone[0] !== '0') {
      setPhoneError('Số điện thoại chuẩn Việt Nam phải bắt đầu bằng số 0');
      return;
    }
    setPhoneError(null);
  };

  // Xác nhận tạo phiếu xuất kho & Trừ tồn
  const handleSubmitShipment = async () => {
    if (!selectedOrderId) {
      showToast('error', 'Vui lòng chọn Đơn hàng cần xuất kho');
      return;
    }
    const idKey = String(selectedOrderId || '').trim().toUpperCase();
    const codeKey = String(selectedOrder?.orderCode || '').trim().toUpperCase();
    if (shippedOrderKeys.has(idKey) || (codeKey && shippedOrderKeys.has(codeKey))) {
      showToast(
        'error',
        'Đơn hàng đã được tạo phiếu xuất kho',
        `Đơn hàng "${selectedOrder?.orderCode || selectedOrderId}" đã có phiếu xuất kho trong hệ thống, không thể tạo thêm lần nữa!`
      );
      return;
    }
    if (!warehouseId) {
      showToast('error', 'Vui lòng chọn Kho xuất hàng');
      return;
    }
    if (items.length === 0) {
      showToast('error', 'Đơn hàng không có sản phẩm nào để xuất kho');
      return;
    }

    // Ràng buộc số điện thoại chuẩn Việt Nam 10 số
    if (!phone || phone.length !== 10 || phone[0] !== '0') {
      setPhoneError('Số điện thoại phải gồm đúng 10 chữ số chuẩn Việt Nam (VD: 0988123456)');
      showToast('error', 'Số điện thoại không hợp lệ', 'Vui lòng kiểm tra lại số điện thoại (10 chữ số bắt đầu bằng số 0)');
      return;
    }

    // Kiểm tra từng dòng
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.selectedBatchNo || it.selectedBatchNo === 'CHƯA_CÓ_LÔ') {
        showToast('error', `Sản phẩm "${it.skuCode}" chưa được chọn lô xuất kho`);
        return;
      }
      if (it.isOverridden && (!it.overrideReason || !it.overrideReason.trim())) {
        showToast(
          'error',
          `Sản phẩm "${it.skuCode}" bị đổi lô nhưng chưa có lý do ghi đè. Vui lòng bổ sung!`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: CreateShipmentPayload = {
        order_id: selectedOrder?.orderCode || selectedOrderId,
        warehouse_id: warehouseId,
        customer_name: customerName,
        receiver_name: receiverName,
        phone: phone,
        delivery_address: deliveryAddress,
        shipping_carrier: carrierName,
        items: items.map((it) => ({
          sku_code: it.skuCode,
          product_name: it.productName,
          quantity_requested: it.quantityRequested,
          selected_batch_no: it.selectedBatchNo,
          fefo_suggested_batch_no: it.fefoSuggestedBatchNo,
          is_overridden: it.isOverridden,
          override_reason: it.isOverridden ? it.overrideReason : null,
        })),
      };

      const res = await shipmentsService.createFefoShipment(payload);

      // Bắn sự kiện thông báo cá nhân cho chính Thủ kho vừa tạo phiếu
      try {
        window.dispatchEvent(
          new CustomEvent('loha_shipment_created', {
            detail: {
              id: res.id,
              orderCode: selectedOrder?.orderCode || selectedOrderId,
              orderId: selectedOrderId,
              customerName: customerName,
              warehouseName: targetWarehouse?.name || 'Kho',
              totalItems: items.length,
            },
          })
        );
      } catch (evtErr) {
        console.error('Lỗi dispatch event shipment created:', evtErr);
      }

      showToast(
        'success',
        'Tạo phiếu xuất kho thành công',
        `Mã phiếu: ${res.id}. Hàng đã được trừ tồn kho theo lô chỉ định.`
      );

      // Cập nhật trạng thái để loại trừ đơn hàng này ngay lập tức
      setShippedOrderKeys((prev) => {
        const next = new Set(prev);
        if (idKey) next.add(idKey);
        if (codeKey) next.add(codeKey);
        return next;
      });
      setOrders((prev) => prev.filter((o) => {
        const oId = String(o.id || '').trim().toUpperCase();
        const oCode = String(o.orderCode || '').trim().toUpperCase();
        return oId !== idKey && oCode !== codeKey;
      }));

      // Chuyển hướng tới trang chi tiết phiếu xuất kho
      navigate(getDetailUrl(res.id));
    } catch (err: any) {
      console.error('Lỗi tạo phiếu xuất kho:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể tạo phiếu xuất kho';
      showToast('error', 'Tạo phiếu thất bại', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* ========================================================================= */}
      {/* NỘI DUNG CHÍNH                                                            */}
      {/* ========================================================================= */}
      {loadingInitial ? (
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-700">Đang tải dữ liệu phân bổ lô hàng...</p>
          <p className="text-xs text-slate-400 mt-1">Đang kiểm tra tồn kho và hạn dùng theo chuẩn FEFO</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* ======================================================================= */}
        {/* KHU VỰC 1: THÔNG TIN CHUNG PHIẾU XUẤT                                    */}
        {/* ======================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Thông tin chung đơn hàng & Vận chuyển
              </h2>
            </div>
            {isDetailMode && currentShipment?.status && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Trạng thái: {currentShipment.status}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Chọn đơn hàng */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Chọn Đơn hàng cần xuất kho <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isDetailMode}
                value={selectedOrderId}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    setSelectedOrderId('');
                    setSelectedOrder(null);
                    setCustomerName('');
                    setReceiverName('');
                    setPhone('');
                    setDeliveryAddress('');
                    setItems([]);
                    return;
                  }
                  const o = filteredOrdersForWarehouse.find((ord) => ord.id === val);
                  if (o) handleSelectOrder(o);
                }}
                className={`w-full h-[38px] px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors font-medium text-slate-800 ${
                  isDetailMode ? 'opacity-80 bg-slate-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="">
                  {selectedOrderId
                    ? `[Đơn hàng: ${selectedOrderId}]`
                    : filteredOrdersForWarehouse.length === 0
                    ? `-- Hiện không có đơn hàng nào chờ xuất kho tại ${targetWarehouse?.name || 'kho này'} --`
                    : `-- Chọn đơn hàng cần xuất kho (${targetWarehouse?.name || 'Đã duyệt'}) --`}
                </option>
                {filteredOrdersForWarehouse.map((ord) => (
                  <option key={ord.id} value={ord.id}>
                    [{ord.orderCode}] {ord.customerName} - {ord.lines?.length || 0} SP (Đã duyệt)
                  </option>
                ))}
              </select>
            </div>

            {/* Kho xuất hàng */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Kho xuất hàng <span className="text-rose-500">*</span></span>
                {isWarehouseStaff && (
                  <span className="text-[10px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Kho được phân công
                  </span>
                )}
              </label>
              <select
                disabled={isDetailMode || isWarehouseStaff}
                value={warehouseId}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                className={`w-full h-[38px] px-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors font-medium text-slate-800 ${
                  isDetailMode || isWarehouseStaff ? 'opacity-90 bg-slate-50 cursor-not-allowed' : ''
                }`}
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    [{wh.code}] {wh.name} {isWarehouseStaff && wh.id === warehouseId ? ' (Kho của bạn)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Tên khách hàng / đại lý */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Đại lý / Khách hàng
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={isDetailMode}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Tên đại lý"
                  className={`w-full h-[38px] pl-9 pr-3 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium ${
                    isDetailMode ? 'cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>

            {/* Người nhận */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Người nhận hàng
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={isDetailMode}
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder="Tên người nhận"
                  className={`w-full h-[38px] pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                    isDetailMode ? 'cursor-not-allowed bg-slate-50' : ''
                  }`}
                />
              </div>
            </div>

            {/* Số điện thoại */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Số điện thoại liên hệ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${phoneError ? 'text-rose-500' : 'text-slate-400'}`} />
                <input
                  type="tel"
                  disabled={isDetailMode}
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onBlur={handlePhoneBlur}
                  placeholder="0988xxxxxx (10 số)"
                  className={`w-full h-[38px] pl-9 pr-3 text-xs bg-white border rounded-lg focus:outline-none transition-colors ${
                    phoneError
                      ? 'border-rose-300 ring-2 ring-rose-500/20 focus:border-rose-500'
                      : 'border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                  } ${isDetailMode ? 'cursor-not-allowed bg-slate-50' : ''}`}
                />
              </div>
              {phoneError && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{phoneError}</span>
                </p>
              )}
            </div>

            {/* Đơn vị vận chuyển */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Đơn vị vận chuyển
              </label>
              <div className="relative">
                <Truck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={isDetailMode}
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                  placeholder="Đội xe nội bộ LOHA"
                  className={`w-full h-[38px] pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                    isDetailMode ? 'cursor-not-allowed bg-slate-50' : ''
                  }`}
                />
              </div>
            </div>

            {/* Địa chỉ giao hàng */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Địa chỉ giao hàng chi tiết
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  disabled={isDetailMode}
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="Địa chỉ giao hàng"
                  className={`w-full h-[38px] pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 ${
                    isDetailMode ? 'cursor-not-allowed bg-slate-50' : ''
                  }`}
                />
              </div>
            </div>

            {/* Mã vận đơn */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mã vận đơn (Tracking)
              </label>
              <input
                type="text"
                disabled={isDetailMode}
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="TRK-2026-..."
                className={`w-full h-[38px] px-3 text-xs bg-slate-50/50 font-mono border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-slate-700 ${
                  isDetailMode ? 'cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>
        </div>


        {/* ======================================================================= */}
        {/* KHU VỰC 2: BẢNG CHI TIẾT SẢN PHẨM & PHÂN BỔ LÔ FEFO                      */}
        {/* ======================================================================= */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>2. Bảng phân bổ lô xuất kho theo nguyên tắc FEFO</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Hệ thống tự động đề xuất lô cận date nhất; thủ kho có thể bấm "Đổi lô" nếu có yêu cầu đặc thù
              </p>
            </div>

            {!isDetailMode && items.length > 0 && (
              <button
                type="button"
                onClick={() => fetchFefoSuggestions(items, warehouseId)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Làm mới gợi ý FEFO</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">STT</th>
                  <th className="py-3 px-4 min-w-[220px]">Sản phẩm & Mã SKU</th>
                  {isDetailMode ? (
                    <>
                      <th className="py-3 px-3 text-center w-24">SL Đặt</th>
                      <th className="py-3 px-3 text-center w-24 text-indigo-700 bg-indigo-50/50">Thực xuất</th>
                      <th className="py-3 px-3 text-center w-28 text-amber-800 bg-amber-50/60">Nợ hàng</th>
                      <th className="py-3 px-4 min-w-[180px]">Lý do giao thiếu</th>
                    </>
                  ) : (
                    <th className="py-3 px-4 text-center w-28">Số lượng</th>
                  )}
                  <th className="py-3 px-4 min-w-[200px]">Lô hàng & Hạn dùng FEFO</th>
                  <th className="py-3 px-4 min-w-[150px] text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right w-24">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={isDetailMode ? 9 : 6} className="text-center py-12 text-slate-400">
                      <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p>Vui lòng chọn Đơn hàng ở trên để nạp danh sách sản phẩm cần xuất kho</p>
                    </td>
                  </tr>
                ) : (
                  items.map((row, idx) => {
                    const isFefoStandard = !row.isOverridden && row.selectedBatchNo && row.selectedBatchNo !== 'CHƯA_CÓ_LÔ';
                    const isOverridden = row.isOverridden;

                    return (
                      <tr key={`${row.skuCode}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                        {/* STT */}
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Sản phẩm */}
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900 text-sm">{row.productName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded text-[11px] font-semibold">
                              {row.skuCode}
                            </span>
                            <span className="text-slate-400 text-[11px]">ĐVT: {row.unit}</span>
                          </div>
                        </td>

                        {isDetailMode ? (
                          <>
                            {/* SL Đặt */}
                            <td className="py-3.5 px-3 text-center font-semibold text-slate-700">
                              <span className="text-xs">
                                {(row.orderedQuantity ?? row.quantityRequested).toLocaleString('vi-VN')} {row.unit}
                              </span>
                            </td>

                            {/* Thực xuất */}
                            <td className="py-3.5 px-3 text-center bg-indigo-50/20">
                              <span className="inline-block px-2.5 py-1 text-xs font-bold text-indigo-800 bg-indigo-100/70 border border-indigo-200/60 rounded-md">
                                {(row.shippedQuantity ?? row.quantityRequested).toLocaleString('vi-VN')} {row.unit}
                              </span>
                            </td>

                            {/* Nợ hàng (Còn thiếu) */}
                            <td className="py-3.5 px-3 text-center bg-amber-50/20">
                              {(row.remainingQuantity || 0) > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                                  <span>Thiếu {row.remainingQuantity?.toLocaleString('vi-VN')} {row.unit}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Đủ 100%</span>
                                </span>
                              )}
                            </td>

                            {/* Lý do giao thiếu */}
                            <td className="py-3.5 px-4">
                              {(row.remainingQuantity || 0) > 0 ? (
                                <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5 flex items-start gap-1">
                                  <span className="font-medium">{row.shortDeliveryReason || 'Kho tạm hết hàng, nợ đợt sau'}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-xs">-</span>
                              )}
                            </td>
                          </>
                        ) : (
                          /* Số lượng khi tạo mới */
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-block px-2.5 py-1 text-sm font-bold text-slate-800 bg-slate-100 rounded-md">
                              {row.quantityRequested.toLocaleString('vi-VN')}
                            </span>
                          </td>
                        )}

                        {/* Lô xuất kho & HSD */}
                        <td className="py-3.5 px-4">
                          {row.isLoadingBatch ? (
                            <div className="flex items-center gap-1.5 text-indigo-600">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang quét lô FEFO...</span>
                            </div>
                          ) : row.selectedBatchNo && row.selectedBatchNo !== 'CHƯA_CÓ_LÔ' ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                                  {row.selectedBatchNo}
                                </span>
                                {row.expiryDate && (
                                  <span className="text-slate-500 text-xs flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    HSD: {formatDisplayDate(row.expiryDate)}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400">
                                Tồn khả dụng của lô: <strong className="text-slate-700">{row.availableQuantity}</strong>
                              </p>
                              {/* Ghi chú lý do ghi đè nếu có */}
                              {isOverridden && row.overrideReason && (
                                <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-1.5 mt-1 flex items-start gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                                  <span>
                                    <strong>Lý do đổi lô:</strong> {row.overrideReason}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-rose-600 font-semibold flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" />
                              Không tìm thấy lô còn tồn tại kho này
                            </span>
                          )}
                        </td>

                        {/* Trạng thái phân bổ */}
                        <td className="py-3.5 px-4 text-center">
                          {row.isLoadingBatch ? (
                            <span className="text-slate-400">Đang kiểm tra...</span>
                          ) : isFefoStandard ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Chuẩn FEFO
                            </span>
                          ) : isOverridden ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              Đã đổi lô (Ghi đè)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              Thiếu tồn lô
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-4 text-right">
                          {isDetailMode ? (
                            <span className="text-slate-400 text-xs">-</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenBatchModal(idx)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                              title="Chọn lô hàng khác theo yêu cầu thủ công"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>Đổi lô</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* NÚT HÀNH ĐỘNG DƯỚI CÙNG                                                  */}
        {/* ======================================================================= */}
        <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs flex-wrap gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-3.5 flex-wrap">
            <div>
              <strong className="text-slate-800 text-sm">{items.length}</strong> sản phẩm
            </div>
            {isDetailMode ? (
              <>
                <div className="h-4 w-px bg-slate-200" />
                <div>
                  Tổng đặt:{' '}
                  <strong className="text-slate-800 text-sm">
                    {items
                      .reduce((acc, cur) => acc + (cur.orderedQuantity ?? cur.quantityRequested), 0)
                      .toLocaleString('vi-VN')}
                  </strong>
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div>
                  Thực xuất:{' '}
                  <strong className="text-indigo-700 text-sm">
                    {items
                      .reduce((acc, cur) => acc + (cur.shippedQuantity ?? cur.quantityRequested), 0)
                      .toLocaleString('vi-VN')}
                  </strong>
                </div>
                {items.some((it) => (it.remainingQuantity || 0) > 0) && (
                  <>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="text-amber-800 font-semibold">
                      Còn nợ:{' '}
                      <strong className="text-amber-900 text-sm bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                        {items
                          .reduce((acc, cur) => acc + (cur.remainingQuantity || 0), 0)
                          .toLocaleString('vi-VN')}
                      </strong>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <span>|</span>
                <span>
                  Tổng số lượng:{' '}
                  <strong className="text-slate-800 text-sm">
                    {items.reduce((acc, cur) => acc + cur.quantityRequested, 0).toLocaleString('vi-VN')}
                  </strong>
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isDetailMode ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate(backListUrl)}
                  className="h-[38px] px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Quay lại danh sách
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-1.5 h-[38px] px-5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In phiếu xuất kho</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => navigate(backListUrl)}
                  className="h-[38px] px-5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>

                <button
                  type="button"
                  onClick={handleSubmitShipment}
                  disabled={isSubmitting || items.length === 0}
                  className="inline-flex items-center justify-center gap-2 h-[38px] px-6 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý xuất kho...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP / MODAL ĐỔI LÔ XUẤT KHO (SN-188 OVERRIDE MODAL)                     */}
      {/* ========================================================================= */}
      {modalOpen && activeItemIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Chọn Lô Xuất Kho Thủ Công & Kiểm Soát FEFO</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sản phẩm: <strong>{items[activeItemIndex]?.productName}</strong> ({items[activeItemIndex]?.skuCode}) - Yêu cầu:{' '}
                  <strong>{items[activeItemIndex]?.quantityRequested}</strong> {items[activeItemIndex]?.unit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nội dung Modal */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {loadingBatches ? (
                <div className="text-center py-8 text-slate-500 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs">Đang tải danh sách các lô hàng tại kho...</p>
                </div>
              ) : modalBatches.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs">Không tìm thấy lô hàng khả dụng nào của SKU này tại kho</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Danh sách các lô hàng (Sắp xếp theo hạn sử dụng tăng dần - FEFO):
                  </label>

                  <div className="space-y-2">
                    {modalBatches.map((b, bIdx) => {
                      const bNo = b.batchNumber || (b as any).batch_number || b.batchNo || (b as any).batch_no || '';
                      const isSelected = tempSelectedBatchNo === bNo;
                      const avail = b.availableQuantity ?? (b as any).available_quantity ?? b.quantity ?? 0;
                      const isEnough = avail >= items[activeItemIndex].quantityRequested;
                      const isFefoTop = (items[activeItemIndex]?.fefoSuggestedBatchNo && bNo === items[activeItemIndex].fefoSuggestedBatchNo) || bIdx === 0 || b.isFefoRecommended;
                      const expDisplay = formatDisplayDate(b.expiryDate || (b as any).expiry_date);
                      const mfgDisplay = formatDisplayDate(b.manufacturingDate || (b as any).mfgDate || (b as any).mfg_date);

                      return (
                        <div
                          key={bNo || bIdx}
                          onClick={() => {
                            if (isEnough) {
                              setTempSelectedBatchNo(bNo);
                              setOverrideError(null);
                            }
                          }}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                              : isEnough
                              ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                              : 'border-slate-200 bg-slate-50/80 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="batchSelection"
                              checked={isSelected}
                              disabled={!isEnough}
                              onChange={() => {
                                setTempSelectedBatchNo(bNo);
                                setOverrideError(null);
                              }}
                              className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {bNo}
                                </span>
                                {isFefoTop && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Gợi ý FEFO (Cận date nhất)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                                <span>
                                  HSD:{' '}
                                  <strong className="text-slate-700">
                                    {expDisplay || 'Không có thông tin'}
                                  </strong>
                                </span>
                                {mfgDisplay && (
                                  <span>
                                    NSX: {mfgDisplay}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span
                              className={`text-xs font-bold ${
                                isEnough ? 'text-slate-800' : 'text-rose-600'
                              }`}
                            >
                              Tồn: {avail}
                            </span>
                            {!isEnough && (
                              <p className="text-[10px] text-rose-500 font-medium">Không đủ xuất</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* KHỐI CẢNH BÁO GHI ĐÈ & BẮT BUỘC NHẬP LÝ DO (SN-188 CORE LOGIC) */}
              {items[activeItemIndex]?.fefoSuggestedBatchNo &&
                tempSelectedBatchNo !== items[activeItemIndex]?.fefoSuggestedBatchNo && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-start gap-2.5 text-amber-900 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">⚠️ Cảnh báo ghi đè quy tắc FEFO!</p>
                        <p className="mt-0.5 text-amber-800">
                          Bạn đang chọn lô <strong>{tempSelectedBatchNo}</strong> khác với lô gợi ý cận date nhất của hệ thống (
                          <strong>{items[activeItemIndex].fefoSuggestedBatchNo}</strong>). Thao tác này sẽ gửi thông báo cảnh báo trực tiếp đến Quản lý kho và Quản trị hệ thống.
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Lý do thay đổi lô xuất kho <span className="text-rose-500">* (Bắt buộc)</span>
                      </label>
                      <textarea
                        value={tempOverrideReason}
                        onChange={(e) => {
                          setTempOverrideReason(e.target.value);
                          if (overrideError) setOverrideError(null);
                        }}
                        placeholder="Ví dụ: Đại lý yêu cầu date xa trên 6 tháng theo hợp đồng; hoặc lô cũ bị bẩn bao bì cần kiểm tra..."
                        rows={3}
                        className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                )}

              {/* Thông báo lỗi validation */}
              {overrideError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{overrideError}</span>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2.5 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-[38px] px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleConfirmBatchOverride}
                className="inline-flex items-center justify-center gap-1.5 h-[38px] px-5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Xác nhận chọn lô này</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CreateShipmentPage;
