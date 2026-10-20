import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Plus,
  Trash2,
  Save,
  Building2,
  FileText,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Truck,
  Calendar,
} from "lucide-react";
import { showToast } from "../components/toast";
import { ConfirmDialog } from "../components/confirm-dialog";
import { Autocomplete, type AutocompleteItem } from "../components/autocomplete";
import { suppliersService } from "../services/suppliers.service";
import { productsService } from "../services/products.service";
import { warehouseService } from "../services/warehouse.service";
import { inventoryReceiptsService } from "../services/inventory-receipts.service";
import { inventoryBatchesService } from "../services/inventory-batches.service";
import {
  normalizeProductIdToUuid,
  normalizeWarehouseIdToUuid,
  normalizeSupplierIdToUuid,
  generateReferenceDocCode,
  generateRandomBatchCode,
} from "../utils/uuid-utils";
import type { Supplier } from "../types/supplier";
import type { Product } from "../types/products";
import type { Warehouse } from "../types/warehouse.types";

interface ReceiptItemForm {
  id: string;
  productId: string;
  unitId: string;
  unitName: string;
  packageQuantity: number;
  conversionFactor: number;
  unitCost: number;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  notes: string;
  product?: Product;
}

const getTodayString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getMinReceiptDateString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
};

const createInitialItem = (_seq = 1, dateStr?: string): ReceiptItemForm => {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    productId: "",
    unitId: "",
    unitName: "",
    packageQuantity: 1,
    conversionFactor: 1,
    unitCost: 0,
    batchNumber: generateRandomBatchCode(dateStr),
    mfgDate: "",
    expiryDate: "",
    notes: "",
  };
};

const DEFAULT_INITIAL_WAREHOUSES: Warehouse[] = [
  {
    id: "11111111-0000-0000-0000-000000000001",
    code: "KHO-MN-01",
    name: "Kho Miền Nam (TP. Hồ Chí Minh)",
    status: "ACTIVE",
  } as Warehouse,
  {
    id: "11111111-0000-0000-0000-000000000002",
    code: "KHO-MB-01",
    name: "Kho Miền Bắc (Hà Nội)",
    status: "ACTIVE",
  } as Warehouse,
  {
    id: "11111111-0000-0000-0000-000000000003",
    code: "KHO-WEST-01",
    name: "Kho Miền Tây (Cần Thơ)",
    status: "ACTIVE",
  } as Warehouse,
  {
    id: "11111111-0000-0000-0000-000000000004",
    code: "KHO-MT-01",
    name: "Kho Miền Trung (Đà Nẵng)",
    status: "ACTIVE",
  } as Warehouse,
];

const DEFAULT_INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: "22222222-0000-0000-0000-000000000001",
    code: "NCC-BEV-01",
    name: "Công ty Cổ phần Nước giải khát LOHA Quốc Tế",
    status: "ACTIVE",
  } as Supplier,
  {
    id: "22222222-0000-0000-0000-000000000002",
    code: "NCC-AQUA-02",
    name: "Công ty TNHH Khai Thác Khoáng Tinh Khiết Aqua Life",
    status: "ACTIVE",
  } as Supplier,
  {
    id: "22222222-0000-0000-0000-000000000003",
    code: "NCC-DAIRY-03",
    name: "Công ty Cổ phần Sữa & Dinh Dưỡng Quốc Tế NutriPlus",
    status: "ACTIVE",
  } as Supplier,
  {
    id: "22222222-0000-0000-0000-000000000004",
    code: "NCC-PACK-04",
    name: "Nhà máy Bao Bì & Đóng Gói Tân Tiến Phát",
    status: "ACTIVE",
  } as Supplier,
  {
    id: "22222222-0000-0000-0000-000000000005",
    code: "NCC-OLD-05",
    name: "Hợp tác xã Nông Sản Hữu Cơ Sạch Thảo Mộc Xanh",
    status: "ACTIVE",
  } as Supplier,
];

const DEFAULT_INITIAL_PRODUCTS: Product[] = [
  {
    id: "33333333-0000-0000-0000-000000000001",
    sku: "LH-MILK-900G",
    name: "Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g",
    baseUnit: "Lon",
    isBatchManaged: true,
    costPrice: 480000,
    units: [
      { id: "u1", unitName: "Lon", conversionRate: 1, isBaseUnit: true },
      { id: "u2", unitName: "Thùng", conversionRate: 24, isBaseUnit: false },
    ],
  } as Product,
  {
    id: "33333333-0000-0000-0000-000000000002",
    sku: "LH-NUT-180ML",
    name: "Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml",
    baseUnit: "Hộp",
    isBatchManaged: true,
    costPrice: 15000,
    units: [
      { id: "u3", unitName: "Hộp", conversionRate: 1, isBaseUnit: true },
      { id: "u4", unitName: "Thùng", conversionRate: 24, isBaseUnit: false },
    ],
  } as Product,
  {
    id: "33333333-0000-0000-0000-000000000003",
    sku: "LH-NEST-70ML",
    name: "Nước Yến Sào Chưng Đường Phèn Loha 70ml",
    baseUnit: "Hũ",
    isBatchManaged: true,
    costPrice: 42000,
    units: [
      { id: "u5", unitName: "Hũ", conversionRate: 1, isBaseUnit: true },
      { id: "u6", unitName: "Lốc", conversionRate: 6, isBaseUnit: false },
    ],
  } as Product,
];

/**
 * Màn hình Lập phiếu nhập mới (SN-178)
 * - Khối 1: Header Section 100% width dạng responsive grid 4 cột
 * - Khối 2: Bảng chi tiết mặt hàng 100% width với nút "+ Thêm dòng hàng" ở header card
 * - Khối 3: Cố định Bottom Action Bar (Sticky Footer) với tóm tắt và hành động
 * - Hỗ trợ resetForm toàn diện khi mount/unmount hoặc bấm Hủy bỏ
 */
export const CreateInventoryReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [activeErrorKey, setActiveErrorKey] = useState<string | null>(null);

  const [warehouses, setWarehouses] = useState<Warehouse[]>(DEFAULT_INITIAL_WAREHOUSES);
  const [warehouseId, setWarehouseId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>(DEFAULT_INITIAL_SUPPLIERS);
  const [products, setProducts] = useState<Product[]>(DEFAULT_INITIAL_PRODUCTS);

  const [supplierId, setSupplierId] = useState("");
  const supplierSelectRef = useRef<HTMLSelectElement>(null);
  const [receiptDate, setReceiptDate] = useState<string>(getTodayString);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ReceiptItemForm[]>([]);

  const todayString = useMemo(() => getTodayString(), []);
  const minReceiptDateString = useMemo(() => getMinReceiptDateString(), []);

  const receiptDateError = useMemo(() => {
    if (!receiptDate || !receiptDate.trim()) {
      return activeErrorKey === "receiptDate" ? "Vui lòng chọn ngày nhập kho." : "";
    }
    if (receiptDate > todayString) {
      return "Ngày nhập kho không được lớn hơn ngày hiện tại.";
    }
    if (receiptDate < minReceiptDateString) {
      return "Ngày nhập kho không được chọn ngày của tháng trước (chỉ trong tháng hiện tại).";
    }
    return "";
  }, [receiptDate, todayString, minReceiptDateString, activeErrorKey]);

  /**
   * Reset form về trạng thái ban đầu sạch sẽ (SN-178)
   */
  const resetForm = useCallback(() => {
    setWarehouseId("");
    setSupplierId("");
    setReceiptDate(getTodayString());
    setNotes("");
    setActiveErrorKey(null);
    setItems([]);
  }, []);

  /**
   * Reset form khi component mount và dọn sạch state khi unmount
   */
  useEffect(() => {
    resetForm();
    return () => {
      resetForm();
    };
  }, [resetForm]);

  const productOptions: AutocompleteItem[] = useMemo(() => {
    return products.map((p) => {
      const baseUnit = p.units?.find((u) => u.isBaseUnit)?.unitName || p.baseUnit || "";
      const isBatch = p.isBatchManaged !== false;
      return {
        id: p.id,
        label: `${p.sku} - ${p.name}`,
        sublabel: `Mã: ${p.sku} · ĐVT: ${baseUnit} · Tồn: ${p.stockQuantity ?? 0}${isBatch ? " · [Quản lý Lô/HSD]" : ""}`,
        data: p,
      };
    });
  }, [products]);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        const [supRes, prodRes, whRes] = await Promise.allSettled([
          suppliersService.getSuppliers({ limit: 100 }),
          productsService.getProducts({ limit: 500, status: "ACTIVE" }),
          warehouseService.getWarehouses(),
        ]);

        if (!isMounted) return;

        if (supRes.status === "fulfilled" && supRes.value?.data && supRes.value.data.length > 0) {
          setSuppliers(supRes.value.data);
        }
        if (prodRes.status === "fulfilled" && prodRes.value?.data && prodRes.value.data.length > 0) {
          setProducts(prodRes.value.data);
        }
        if (whRes.status === "fulfilled" && whRes.value && whRes.value.length > 0) {
          setWarehouses(whRes.value);
        }
      } catch {
        // Tải ngầm trong nền, không chặn giao diện và không báo lỗi
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleGenerateBatch = useCallback(
    async (index: number, product?: Product) => {
      try {
        const res = await inventoryBatchesService.generateBatchNumber({
          productId: product?.uuid || product?.id,
          sku: product?.sku,
          date: receiptDate,
        });
        if (res?.batchNumber) {
          setItems((prev) => {
            const next = [...prev];
            if (next[index]) {
              next[index] = { ...next[index], batchNumber: res.batchNumber };
            }
            return next;
          });
          return;
        }
      } catch {
        // Fallback tự sinh ngẫu nhiên nếu không gọi được API
      }
      const fallbackBatch = generateRandomBatchCode(receiptDate);
      setItems((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { ...next[index], batchNumber: fallbackBatch };
        }
        return next;
      });
    },
    [receiptDate],
  );

  const handleAddItem = async () => {
    const newIdx = items.length;
    const newItem = createInitialItem(newIdx + 1, receiptDate);
    try {
      const res = await inventoryBatchesService.generateBatchNumber({
        date: receiptDate,
      });
      if (res?.batchNumber) {
        const existingBatches = new Set(items.map((it) => it.batchNumber));
        if (existingBatches.has(res.batchNumber)) {
          newItem.batchNumber = generateRandomBatchCode(receiptDate);
        } else {
          newItem.batchNumber = res.batchNumber;
        }
      }
    } catch {
      newItem.batchNumber = generateRandomBatchCode(receiptDate);
    }
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (activeErrorKey?.startsWith(`item-${index}-`)) {
      setActiveErrorKey(null);
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCancel = () => {
    resetForm();
    navigate("/inventory/receipts");
  };

  const handleItemChange = (index: number, field: keyof ReceiptItemForm, value: string | number) => {
    if (activeErrorKey?.startsWith(`item-${index}-`)) {
      setActiveErrorKey(null);
    }
    const newItems = [...items];
    const item = newItems[index];

    if (field === "productId") {
      const prod = products.find((p) => p.id === value || p.uuid === value);
      item.productId = prod?.uuid || (value as string);
      item.product = prod;
      if (prod && prod.units && prod.units.length > 0) {
        const baseUnit = prod.units.find((u) => u.isBaseUnit) || prod.units[0];
        item.unitId = baseUnit.id || baseUnit.unitName;
        item.unitName = baseUnit.unitName;
        item.conversionFactor = Number(baseUnit.conversionRate) || 1;
      } else {
        item.unitId = prod?.baseUnit || "Đơn vị";
        item.unitName = prod?.baseUnit || "Đơn vị";
        item.conversionFactor = 1;
      }
      if (prod?.costPrice) {
        item.unitCost = prod.costPrice * item.conversionFactor;
      }
      if (!item.batchNumber) {
        handleGenerateBatch(index, prod);
      }
    } else if (field === "unitId") {
      item.unitId = value as string;
      const u = item.product?.units?.find((u) => u.id === value || u.unitName === value);
      if (u) {
        item.unitName = u.unitName;
        item.conversionFactor = Number(u.conversionRate) || 1;
        if (item.product?.costPrice) {
          item.unitCost = item.product.costPrice * item.conversionFactor;
        }
      } else {
        item.unitName = value as string;
        item.conversionFactor = 1;
      }
    } else if (field === "packageQuantity" || field === "unitCost") {
      Object.assign(item, { [field]: Number(value) });
    } else if (field !== "product" && field !== "id") {
      Object.assign(item, { [field]: value as string });
    }

    setItems(newItems);
  };

  const focusAndScrollElement = (elementId: string): boolean => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus();
      setTimeout(() => {
        el.focus();
      }, 50);
      return true;
    }
    return false;
  };

  const validateCommonFields = (isConfirming: boolean): boolean => {
    if (!warehouseId) {
      setActiveErrorKey("warehouse");
      focusAndScrollElement("warehouse-select");
      return false;
    }
    if (!supplierId) {
      setActiveErrorKey("supplier");
      supplierSelectRef.current?.focus();
      supplierSelectRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    if (!receiptDate || !receiptDate.trim() || receiptDate > todayString || receiptDate < minReceiptDateString) {
      setActiveErrorKey("receiptDate");
      focusAndScrollElement("receipt-date-input");
      return false;
    }
    if (items.length === 0) {
      setActiveErrorKey(null);
      showToast("warning", "Vui lòng thêm ít nhất 1 mặt hàng vào phiếu nhập");
      return false;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        setActiveErrorKey(`item-${i}-product`);
        focusAndScrollElement(`product-input-${i}`);
        return false;
      }
      if (!it.unitId) {
        setActiveErrorKey(`item-${i}-unit`);
        focusAndScrollElement(`unit-select-${i}`);
        return false;
      }
      if (!it.packageQuantity || it.packageQuantity <= 0) {
        setActiveErrorKey(`item-${i}-qty`);
        focusAndScrollElement(`qty-input-${i}`);
        return false;
      }

      const isBatch = Boolean(it.product && it.product.isBatchManaged !== false);
      const isBatchRequired = Boolean(it.productId && (isBatch || it.expiryDate?.trim() || it.mfgDate?.trim()));

      if (isConfirming && isBatchRequired) {
        if (!it.batchNumber?.trim()) {
          it.batchNumber = generateRandomBatchCode(receiptDate);
        }
        const isMissingMfg = !it.mfgDate?.trim();
        if (isMissingMfg) {
          setActiveErrorKey(`item-${i}-mfg`);
          focusAndScrollElement(`mfg-input-${i}`);
          return false;
        }
      }

      if (it.mfgDate && receiptDate && it.mfgDate > receiptDate) {
        setActiveErrorKey(`item-${i}-mfg-future`);
        focusAndScrollElement(`mfg-input-${i}`);
        return false;
      }

      if (isConfirming && isBatchRequired) {
        const isMissingExpiry = !it.expiryDate?.trim();
        if (isMissingExpiry) {
          setActiveErrorKey(`item-${i}-expiry`);
          focusAndScrollElement(`expiry-input-${i}`);
          return false;
        }
      }

      if (it.mfgDate && it.expiryDate && it.mfgDate >= it.expiryDate) {
        setActiveErrorKey(`item-${i}-expiry-order`);
        focusAndScrollElement(`expiry-input-${i}`);
        return false;
      }

      if (!it.unitCost || it.unitCost <= 0) {
        setActiveErrorKey(`item-${i}-cost`);
        focusAndScrollElement(`cost-input-${i}`);
        return false;
      }
    }

    setActiveErrorKey(null);
    return true;
  };

  const submitReceipt = async (status: "DRAFT" | "CONFIRMED") => {
    try {
      setSubmitting(true);
      const autoRefDoc = generateReferenceDocCode(receiptDate);
      const selectedSupplier = suppliers.find((s) => s.id === supplierId || s.code === supplierId);
      const selectedWarehouse = warehouses.find((w) => w.id === warehouseId || w.code === warehouseId);

      const res = await inventoryReceiptsService.create({
        warehouseId: normalizeWarehouseIdToUuid(warehouseId),
        warehouseName: selectedWarehouse?.name,
        supplierId: normalizeSupplierIdToUuid(supplierId),
        supplierName: selectedSupplier?.name,
        referenceDocument: autoRefDoc,
        receiptDate: receiptDate || undefined,
        notes: notes?.trim() || undefined,
        items: items.map((i) => ({
          productId: normalizeProductIdToUuid(i.productId, i.product?.sku, i.product?.uuid),
          unitId: (i.unitName && i.unitId.startsWith("unit-")) ? i.unitName : i.unitId,
          unitName: i.unitName || i.unitId,
          packageQuantity: Number(i.packageQuantity),
          conversionFactor: Number(i.conversionFactor),
          unitCost: Number(i.unitCost),
          batchNumber: i.batchNumber?.trim() || undefined,
          mfgDate: i.mfgDate || undefined,
          expiryDate: i.expiryDate || undefined,
          notes: i.notes?.trim() || undefined,
        })),
      });

      if (status === "CONFIRMED" && res.id) {
        await inventoryReceiptsService.confirm(res.id);
      }

      showToast(
        "success",
        status === "CONFIRMED"
          ? "Xác nhận và nhập kho thành công! Tồn kho đã được cộng."
          : "Đã lưu phiếu nhập nháp thành công (chưa cộng tồn kho)",
      );
      resetForm();
      navigate("/inventory/receipts");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string | string[] } }; message?: string };
      const rawMsg = err.response?.data?.message || err.message;
      const displayMsg = Array.isArray(rawMsg) ? rawMsg.join(", ") : rawMsg || "Lỗi khi tạo phiếu nhập kho";
      showToast("error", displayMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const hasMfgAfterReceiptDateError = useMemo(() => {
    return items.some((item) => Boolean(item.mfgDate && receiptDate && item.mfgDate > receiptDate));
  }, [items, receiptDate]);

  const hasExpiryBeforeMfgError = useMemo(() => {
    return items.some((item) => Boolean(item.mfgDate && item.expiryDate && item.mfgDate >= item.expiryDate));
  }, [items]);

  const hasDateError = Boolean(receiptDateError) || hasMfgAfterReceiptDateError || hasExpiryBeforeMfgError;

  const handleSaveDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateCommonFields(false)) return;
    await submitReceipt("DRAFT");
  };

  const handleConfirmReceipt = () => {
    if (!validateCommonFields(true)) return;
    setIsConfirmDialogOpen(true);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.packageQuantity || 0) * (item.unitCost || 0), 0);
  const totalBaseQuantity = items.reduce(
    (sum, item) => sum + (item.packageQuantity || 0) * (item.conversionFactor || 1),
    0,
  );



  return (
    <form
      onSubmit={handleSaveDraft}
      autoComplete="off"
      className="flex flex-col h-[calc(100vh-5rem)] sm:h-[calc(100vh-5.5rem)] max-h-[calc(100vh-5rem)] sm:max-h-[calc(100vh-5.5rem)] overflow-hidden gap-3"
    >
      {/* 1. Card Thông tin phiếu nhập (Cố định - KHÔNG cuộn) */}
      <div className="shrink-0 bg-white rounded-2xl shadow-xs border border-slate-200 p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
        <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2 text-sm sm:text-base">
          <FileText className="w-4 h-4 text-indigo-600" />
          Thông tin phiếu nhập
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Cột 1: Kho nhập hàng */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Kho nhập hàng
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                id="warehouse-select"
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  if (activeErrorKey === "warehouse") {
                    setActiveErrorKey(null);
                  }
                }}
                className={`w-full pl-9 pr-3 py-1.5 bg-white border ${
                  activeErrorKey === "warehouse" && !warehouseId
                    ? "border-rose-500 ring-1 ring-rose-200 focus:border-rose-500 focus:ring-rose-200"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                } rounded-xl focus:outline-none focus:ring-2 text-xs font-medium text-slate-800 transition-all truncate`}
              >
                <option value="">-- Chọn kho nhập hàng --</option>
                {warehouses.map((w) => {
                  const cleanName = w.name
                    .replace(/\s*\(WH01\)/gi, '')
                    .replace(/\s*-\s*LOHA\s+WH01/gi, ' - LOHA')
                    .replace(/\s+WH01/gi, '')
                    .trim();
                  const code = w.code || (w.id.includes('0001') ? 'WH01' : '');
                  const displayLabel =
                    code && !cleanName.includes(`(${code})`)
                      ? `${cleanName} (${code})`
                      : cleanName;
                  return (
                    <option key={w.id} value={w.id}>
                      {displayLabel}
                    </option>
                  );
                })}
              </select>
            </div>
            {activeErrorKey === "warehouse" && !warehouseId && (
              <p className="text-[10px] text-rose-600 font-medium mt-1 flex items-center gap-1 leading-tight">
                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                <span>Vui lòng chọn kho nhập hàng</span>
              </p>
            )}
          </div>

          {/* Cột 2: Nhà cung cấp */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nhà cung cấp
            </label>
            <div className="relative">
              <Truck className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                ref={supplierSelectRef}
                value={supplierId}
                onChange={(e) => {
                  setSupplierId(e.target.value);
                  if (activeErrorKey === "supplier") {
                    setActiveErrorKey(null);
                  }
                }}
                className={`w-full pl-9 pr-3 py-1.5 bg-white border ${
                  activeErrorKey === "supplier" && !supplierId
                    ? "border-rose-500 ring-1 ring-rose-200 focus:border-rose-500 focus:ring-rose-200"
                    : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                } rounded-xl focus:outline-none focus:ring-2 text-xs font-medium text-slate-800 transition-all truncate`}
              >
                <option value="">-- Chọn nhà cung cấp --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            {activeErrorKey === "supplier" && !supplierId && (
              <p className="text-[10px] text-rose-600 font-medium mt-1 flex items-center gap-1 leading-tight">
                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                <span>Vui lòng chọn nhà cung cấp</span>
              </p>
            )}
          </div>

          {/* Cột 3: Số chứng từ gốc */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Số chứng từ gốc
            </label>
            <input
              type="text"
              placeholder="SỐ CHỨNG TỪ TỰ SINH"
              readOnly
              disabled
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-500 cursor-not-allowed select-none transition-all uppercase placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Cột 4: Ngày nhập kho */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Ngày nhập kho
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="receipt-date-input"
                type="date"
                value={receiptDate}
                min={minReceiptDateString}
                max={todayString}
                onChange={(e) => {
                  setReceiptDate(e.target.value);
                  if (activeErrorKey === "receiptDate") {
                    setActiveErrorKey(null);
                  }
                }}
                className={`w-full pl-9 pr-3 py-1.5 bg-white border ${
                  receiptDateError
                    ? "border-rose-500 ring-1 ring-rose-200 focus:border-rose-500"
                    : "border-slate-300 focus:border-indigo-600"
                } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs text-slate-800 transition-all font-mono`}
              />
            </div>
            {receiptDateError && (
              <p className="text-[10px] text-rose-600 font-medium mt-1 flex items-center gap-1 leading-tight">
                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                <span>{receiptDateError}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 2. Card Chi tiết mặt hàng (flex-1 flex flex-col min-h-0) */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Header của Card: Cố định bên trong Card */}
        <div className="shrink-0 p-3 sm:px-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              Chi tiết mặt hàng
            </h3>
          </div>

          {/* Cụm góc trên bên phải: Nút + Thêm mặt hàng nằm cạnh badge Mặt hàng đã chọn */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-indigo-600 hover:text-indigo-600 transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-600" /> Thêm mặt hàng
            </button>
            <div className="text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs font-medium whitespace-nowrap">
              Mặt hàng đã chọn: <strong className="text-slate-900">{items.filter((i) => !!i.productId).length}</strong> / {items.length}
            </div>
          </div>
        </div>

        {/* Thân Card: Empty State HOẶC Bảng cuộn dọc (vùng duy nhất cuộn dọc trong card) */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2.5 shadow-2xs">
              <Package className="w-6 h-6 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-700 text-sm">Chưa có mặt hàng nào</p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Bấm &quot;+ Thêm mặt hàng&quot; ở góc trên bên phải để bắt đầu chọn sản phẩm.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full min-w-[54rem] text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[3.5%]" />
                <col className="w-[22.5%]" />
                <col className="w-[12%]" />
                <col className="w-[9.5%]" />
                <col className="w-[14%]" />
                <col className="w-[20%]" />
                <col className="w-[13%]" />
                <col className="w-[5.5%]" />
              </colgroup>
              <thead className="sticky top-0 bg-slate-50 z-10 shadow-2xs border-b border-slate-200 text-xs">
                <tr>
                  <th className="p-2.5 font-semibold text-slate-600 text-center bg-slate-50">#</th>
                  <th className="p-2.5 font-semibold text-slate-600 text-left bg-slate-50">
                    Sản phẩm & SKU
                  </th>
                  <th className="p-2.5 font-semibold text-slate-600 text-left bg-slate-50">
                    ĐVT & Quy đổi
                  </th>
                  <th className="p-2.5 font-semibold text-slate-600 text-center bg-slate-50 whitespace-nowrap">
                    Số lượng
                  </th>
                  <th className="p-2.5 font-semibold text-slate-600 text-center bg-slate-50 whitespace-nowrap">
                    Số lô
                  </th>
                  <th className="p-2.5 font-semibold text-slate-600 text-left bg-slate-50 whitespace-nowrap">
                    NSX & HSD
                  </th>
                  <th className="p-2.5 font-semibold text-slate-600 text-right bg-slate-50 whitespace-nowrap">
                    Đơn giá nhập
                  </th>
                  <th className="p-2.5 font-semibold text-slate-600 text-center bg-slate-50 whitespace-nowrap">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => {
                  const baseUnitName =
                    item.product?.units?.find((u) => u.isBaseUnit)?.unitName ||
                    item.product?.baseUnit ||
                    "Đơn vị";
                  const isProductMissing = activeErrorKey === `item-${idx}-product` && !item.productId;
                  const isQtyInvalid = activeErrorKey === `item-${idx}-qty` && (!item.packageQuantity || item.packageQuantity <= 0);
                  const isCostInvalid = activeErrorKey === `item-${idx}-cost` && (!item.unitCost || item.unitCost <= 0);
                  const isMfgMissing = activeErrorKey === `item-${idx}-mfg` && !item.mfgDate?.trim();
                  const isMfgAfterReceipt = activeErrorKey === `item-${idx}-mfg-future` || Boolean(item.mfgDate && receiptDate && item.mfgDate > receiptDate);
                  const isExpiryMissing = activeErrorKey === `item-${idx}-expiry` && !item.expiryDate?.trim();
                  const isExpiryBeforeMfg = activeErrorKey === `item-${idx}-expiry-order` || Boolean(item.mfgDate && item.expiryDate && item.mfgDate >= item.expiryDate);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Cột 0: STT */}
                      <td className="p-2 text-center text-slate-400 font-mono text-xs align-top pt-3">
                        {idx + 1}
                      </td>

                      {/* Cột 1: Sản phẩm & SKU */}
                      <td className="p-2 text-left align-top">
                        <Autocomplete
                          id={`product-input-${idx}`}
                          size="sm"
                          placeholder="Chọn sản phẩm & SKU"
                          value={item.product ? `${item.product.sku} - ${item.product.name}` : ""}
                          items={productOptions}
                          error={isProductMissing ? "Chọn sản phẩm" : undefined}
                          onSelect={(opt) => handleItemChange(idx, "productId", String(opt.id))}
                          className="w-full"
                        />
                      </td>

                      {/* Cột 2: ĐVT & Quy đổi */}
                      <td className="p-2 text-left align-top">
                        <select
                          id={`unit-select-${idx}`}
                          value={item.unitId}
                          onChange={(e) => handleItemChange(idx, "unitId", e.target.value)}
                          className="w-full h-8.5 px-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs font-medium text-slate-800 transition-all disabled:bg-slate-50 disabled:text-slate-400 truncate cursor-pointer"
                          disabled={!item.product}
                          title={
                            item.product && item.conversionFactor > 1
                              ? `1 ${item.unitName || item.unitId} = ${item.conversionFactor} ${baseUnitName}`
                              : undefined
                          }
                        >
                          {item.product?.units && item.product.units.length > 0 ? (
                            item.product.units.map((u, uIdx) => (
                              <option key={u.id || `${u.unitName}-${uIdx}`} value={u.id || u.unitName}>
                                {u.unitName} (x{u.conversionRate})
                              </option>
                            ))
                          ) : (
                            <option value={item.product?.baseUnit || "Đơn vị"}>
                              {item.product?.baseUnit || "Đơn vị"} (x1)
                            </option>
                          )}
                        </select>
                      </td>

                      {/* Cột 3: Số lượng nhập */}
                      <td className="p-2 text-center align-top">
                        <input
                          id={`qty-input-${idx}`}
                          type="number"
                          min="0.01"
                          step="any"
                          value={item.packageQuantity || ""}
                          onChange={(e) =>
                            handleItemChange(idx, "packageQuantity", parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          title={
                            item.conversionFactor > 1
                              ? `Quy đổi: ${((item.packageQuantity || 0) * item.conversionFactor).toLocaleString("vi-VN")} ${baseUnitName}`
                              : undefined
                          }
                          className={`w-full h-8.5 px-2 bg-white border ${
                            isQtyInvalid
                              ? "border-rose-500 ring-1 ring-rose-200 focus:border-rose-500 focus:ring-rose-200"
                              : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                          } rounded-lg focus:outline-none focus:ring-2 text-xs text-center font-mono font-medium text-slate-900 transition-all`}
                        />
                        {isQtyInvalid && (
                          <p className="mt-1 text-[10px] text-rose-600 flex items-center justify-center gap-1 font-medium leading-tight">
                            <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>SL phải &gt; 0</span>
                          </p>
                        )}
                      </td>

                      {/* Cột 4: Số lô (Tự sinh - Không sửa được như số chứng từ) */}
                      <td className="p-2 text-center align-top">
                        <input
                          id={`batch-input-${idx}`}
                          type="text"
                          value={item.batchNumber}
                          placeholder="SỐ LÔ TỰ SINH"
                          readOnly
                          disabled
                          title="Số lô tự sinh theo hệ thống (không thể chỉnh sửa)"
                          className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-600 font-mono font-semibold text-center cursor-not-allowed select-none transition-all uppercase placeholder:text-slate-400"
                        />
                      </td>

                      {/* Cột 5: NSX & HSD */}
                      <td className="p-2 text-left align-top">
                        <div className="flex flex-col gap-1.5 w-full">
                          {/* Hàng 1: NSX */}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-slate-500 shrink-0 w-8">
                                NSX:
                              </span>
                              <input
                                id={`mfg-input-${idx}`}
                                type="date"
                                value={item.mfgDate}
                                max={receiptDate || todayString}
                                onChange={(e) => handleItemChange(idx, "mfgDate", e.target.value)}
                                title="Ngày sản xuất (NSX)"
                                className={`w-full h-7 px-2 bg-white border ${
                                  isMfgMissing || isMfgAfterReceipt
                                    ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-200 focus:border-rose-500"
                                    : "border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/20"
                                } rounded-md text-xs text-slate-800 focus:outline-none transition-all font-mono`}
                              />
                            </div>
                            {/* Cảnh báo lỗi NSX nằm trực tiếp dưới ô input NSX */}
                            {isMfgAfterReceipt && (
                              <p className="mt-1 pl-[2.375rem] text-[10px] text-rose-600 flex items-center gap-1 font-medium leading-tight">
                                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>NSX không được sau ngày nhập</span>
                              </p>
                            )}
                            {isMfgMissing && (
                              <p className="mt-1 pl-[2.375rem] text-[10px] text-rose-600 flex items-center gap-1 font-medium leading-tight">
                                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>Vui lòng chọn NSX</span>
                              </p>
                            )}
                          </div>

                          {/* Hàng 2: HSD */}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-slate-500 shrink-0 w-8">
                                HSD:
                              </span>
                              <input
                                id={`expiry-input-${idx}`}
                                type="date"
                                value={item.expiryDate}
                                min={item.mfgDate || undefined}
                                onChange={(e) => handleItemChange(idx, "expiryDate", e.target.value)}
                                title="Hạn sử dụng (HSD)"
                                className={`w-full h-7 px-2 bg-white border ${
                                  isExpiryMissing || isExpiryBeforeMfg
                                    ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-200 focus:border-rose-500"
                                    : "border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/20"
                                } rounded-md text-xs text-slate-800 focus:outline-none transition-all font-mono`}
                              />
                            </div>
                            {/* Cảnh báo lỗi HSD nằm trực tiếp dưới ô input HSD */}
                            {isExpiryMissing && (
                              <p className="mt-1 pl-[2.375rem] text-[10px] text-rose-600 flex items-center gap-1 font-medium leading-tight">
                                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>Vui lòng chọn HSD</span>
                              </p>
                            )}
                            {!isExpiryMissing && isExpiryBeforeMfg && (
                              <p className="mt-1 pl-[2.375rem] text-[10px] text-rose-600 flex items-center gap-1 font-medium leading-tight">
                                <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>HSD phải sau NSX</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cột 6: Đơn giá nhập */}
                      <td className="p-2 text-right align-top">
                        <div className="relative w-full flex items-center">
                          <input
                            id={`cost-input-${idx}`}
                            type="text"
                            inputMode="numeric"
                            value={Number(item.unitCost || 0).toLocaleString("vi-VN")}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => {
                              const cleanValue = e.target.value.replace(/\D/g, "");
                              const finalPrice = cleanValue === "" ? 0 : parseInt(cleanValue, 10);
                              handleItemChange(idx, "unitCost", finalPrice);
                            }}
                            placeholder="0"
                            className={`w-full h-8.5 pl-2.5 pr-7 bg-white border ${
                              isCostInvalid
                                ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-200 focus:border-rose-500 focus:ring-rose-200"
                                : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-500/20"
                            } rounded-lg text-xs text-right font-mono focus:outline-none focus:ring-2 text-slate-900 transition-all font-medium`}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-mono font-semibold text-slate-400 pointer-events-none select-none">
                            đ
                          </span>
                        </div>
                        {isCostInvalid && (
                          <p className="mt-1 text-[10px] text-rose-600 flex items-center justify-end gap-1 font-medium leading-tight">
                            <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                            <span>Đơn giá phải &gt; 0</span>
                          </p>
                        )}
                      </td>

                      {/* Cột 7: Thao tác */}
                      <td className="p-2 text-center align-top pt-2">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center"
                          title="Xóa dòng hàng này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Thanh Action Footer (Cố định ở chân trang) */}
      <div className="shrink-0">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200 shadow-sm rounded-2xl px-4 py-2.5 sm:px-6 sm:py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Phía bên trái: Tóm tắt nhanh */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-7 text-sm w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-slate-500 whitespace-nowrap">
                Tổng lượng quy đổi:
              </span>
              <div className="flex items-baseline gap-1">
                <span className="font-bold text-slate-900 font-mono text-sm sm:text-base whitespace-nowrap">
                  {totalBaseQuantity.toLocaleString("vi-VN")}
                </span>
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
                  ĐVT cơ sở
                </span>
              </div>
            </div>

            <div className="h-4.5 w-px bg-slate-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-medium text-slate-500 whitespace-nowrap">
                Tổng tiền:
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base sm:text-lg font-bold text-indigo-600 font-mono tracking-tight whitespace-nowrap">
                  {totalAmount.toLocaleString("vi-VN")}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-indigo-600 font-sans">
                  đ
                </span>
              </div>
            </div>
          </div>

          {/* Phía bên phải: Các nút hành động chính */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <div className="relative group">
              <button
                type="button"
                disabled={submitting || hasDateError}
                onClick={handleSaveDraft}
                className="px-3.5 py-1.5 sm:px-4 sm:py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl flex items-center text-xs sm:text-sm font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={hasDateError ? "Vui lòng sửa các lỗi về Ngày nhập kho, NSX và HSD" : undefined}
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 mr-1.5 animate-spin text-slate-500" />
                ) : (
                  <Save className="w-4 h-4 mr-1.5 text-slate-500" />
                )}
                Lưu phiếu nháp
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                <div className="bg-slate-900 text-white text-xs py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md">
                  {hasDateError ? "Vui lòng sửa các lỗi về Ngày nhập kho, NSX và HSD" : "Không ảnh hưởng tồn kho"}
                </div>
                <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
              </div>
            </div>
            <div className="relative group">
              <button
                type="button"
                disabled={submitting || hasDateError}
                onClick={handleConfirmReceipt}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-1.5 sm:px-5 sm:py-2 shadow-xs hover:shadow-md transition-all text-xs sm:text-sm font-semibold flex items-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title={hasDateError ? "Vui lòng sửa các lỗi về Ngày nhập kho, NSX và HSD" : undefined}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Xác nhận nhập kho
              </button>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-end pointer-events-none z-30">
                <div className="bg-slate-900 text-white text-xs py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md">
                  {hasDateError ? "Vui lòng sửa các lỗi về Ngày nhập kho, NSX và HSD" : "Ghi thẻ kho và cộng tồn khả dụng"}
                </div>
                <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 mr-6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog xác nhận nhập kho chính thức */}
      {isConfirmDialogOpen && (
        <ConfirmDialog
          isOpen={isConfirmDialogOpen}
          onCancel={() => setIsConfirmDialogOpen(false)}
          onConfirm={async () => {
            setIsConfirmDialogOpen(false);
            await submitReceipt("CONFIRMED");
          }}
          title="Xác nhận nhập kho chính thức"
          message={
            <div className="space-y-3 text-left">
              <p className="text-slate-700 text-sm">
                Bạn đang chuẩn bị xác nhận phiếu nhập kho gồm <strong>{items.length} mặt hàng</strong> (tổng{" "}
                <strong>{totalBaseQuantity.toLocaleString("vi-VN")} ĐVT cơ sở</strong>).
              </p>
              <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-1">
                <p className="font-semibold flex items-center gap-1 text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Lưu ý quan trọng:
                </p>
                <p>
                  • Phiếu sau khi xác nhận sẽ <strong>cộng trực tiếp tồn kho thực tế</strong> và ghi sổ giao dịch thẻ kho.
                </p>
                <p>
                  • Phiếu đã xác nhận <strong>không thể chỉnh sửa hoặc xóa</strong>. Mọi sai sót sau này chỉ có thể xử lý
                  bằng cách lập <em>Phiếu điều chỉnh kiểm kê</em>.
                </p>
              </div>
            </div>
          }
          confirmText="Đồng ý xác nhận & ghi sổ"
          cancelText="Kiểm tra lại"
          type="primary"
          isLoading={submitting}
        />
      )}
    </form>
  );
};
