import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  Building2,
  FileText,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { showToast } from "../components/toast";
import { CurrencyInput } from "../components/currency-input";
import { Autocomplete, type AutocompleteItem } from "../components/autocomplete";
import { suppliersService } from "../services/suppliers.service";
import { productsService } from "../services/products.service";
import { goodsReceiptService } from "../services/goods-receipt.service";
import { warehouseService } from "../services/warehouse.service";
import type { Supplier } from "../types/supplier";
import type { Product } from "../types/products";
import type { Warehouse } from "../types/warehouse.types";

const DEFAULT_WAREHOUSE_UUID = '11111111-0000-4000-8000-000000000001';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isValidUuid = (value?: string): boolean => Boolean(value && UUID_REGEX.test(value.trim()));

// Bảng ánh xạ UUID chuẩn hệ thống cho Nhà cung cấp (EP-02 / SN-25 / SN-178)
export const KNOWN_SUPPLIER_UUID_MAP: Record<string, string> = {
  'NCC-BEV-01': '22222222-0000-0000-0000-000000000001',
  'NCC-AQUA-02': '22222222-0000-0000-0000-000000000002',
  'NCC-DAIRY-03': '22222222-0000-0000-0000-000000000003',
  'NCC-PACK-04': '22222222-0000-0000-0000-000000000004',
  'NCC-OLD-05': '22222222-0000-0000-0000-000000000005',
};

export const resolveSupplierUuid = (idOrCode?: string): string => {
  if (!idOrCode) return '';
  const trimmed = idOrCode.trim();
  if (isValidUuid(trimmed)) return trimmed;
  return KNOWN_SUPPLIER_UUID_MAP[trimmed] || '';
};

// Bảng ánh xạ UUID chuẩn hệ thống cho Sản phẩm / SKU (EP-02 / SN-138 / SN-178)
export const KNOWN_PRODUCT_UUID_MAP: Record<string, string> = {
  'prod-001': '33333333-0000-0000-0000-000000000001',
  'LH-MILK-900G': '33333333-0000-0000-0000-000000000001',
  'LH-MILK-POWDER-900G': '33333333-0000-0000-0000-000000000001',
  'LOHA-COLA-330': '33333333-0000-0000-0000-000000000001',
  'prod-002': '33333333-0000-0000-0000-000000000002',
  'LH-NUT-180ML': '33333333-0000-0000-0000-000000000002',
  'LOHA-ORANGE-330': '33333333-0000-0000-0000-000000000002',
  'prod-003': '33333333-0000-0000-0000-000000000003',
  'LH-NEST-70ML': '33333333-0000-0000-0000-000000000003',
  'LOHA-PURE-500': '33333333-0000-0000-0000-000000000003',
  'prod-004': '33333333-0000-0000-0000-000000000004',
  'LH-CEREAL-500G': '33333333-0000-0000-0000-000000000004',
  'LOHA-TEA-455': '33333333-0000-0000-0000-000000000004',
  'prod-005': '33333333-0000-0000-0000-000000000005',
  'LH-WATER-500ML': '33333333-0000-0000-0000-000000000005',
  'prod-006': '33333333-0000-0000-0000-000000000006',
  'LH-COLLAGEN-50ML': '33333333-0000-0000-0000-000000000006',
  'prod-007': '33333333-0000-0000-0000-000000000007',
  'LH-TEA-240ML': '33333333-0000-0000-0000-000000000007',
  'LH-TEA-350ML': '33333333-0000-0000-0000-000000000007',
  'prod-008': '33333333-0000-0000-0000-000000000008',
  'LH-MILK-NUT-900G': '33333333-0000-0000-0000-000000000008',
  'prod-009': '33333333-0000-0000-0000-000000000009',
  'LH-NEST-PREM-100G': '33333333-0000-0000-0000-000000000009',
  'prod-010': '33333333-0000-0000-0000-000000000010',
  'LH-NUTS-MIX-250G': '33333333-0000-0000-0000-000000000010',
  'prod-011': '33333333-0000-0000-0000-000000000011',
  'LH-OLD-COFFEE-CAN': '33333333-0000-0000-0000-000000000011',
};

export const resolveProductUuid = (idOrSku?: string): string => {
  if (!idOrSku) return '';
  const trimmed = idOrSku.trim();
  if (isValidUuid(trimmed)) return trimmed;
  return KNOWN_PRODUCT_UUID_MAP[trimmed] || '';
};

export interface GoodsReceiptFormState {
  warehouseId: string;
  supplierId: string;
  referenceDocument: string;
  receiptDate: string;
  notes: string;
}

export interface ReceiptItemForm {
  productId: string;
  unitId: string;
  packageQuantity: number;
  conversionFactor: number;
  unitCost: number;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  notes: string;
  product?: Product;
}

const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const err = error as { response?: { data?: { message?: string | string[] } }; message?: string };
    if (err.response?.data?.message) {
      if (Array.isArray(err.response.data.message)) {
        return err.response.data.message.join(', ');
      }
      return String(err.response.data.message);
    }
    if (err.message) return err.message;
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
};

export const CreateInventoryReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>(DEFAULT_WAREHOUSE_UUID);
  const [warehouseDisplayName, setWarehouseDisplayName] = useState<string>("Kho Tổng Miền Nam - LOHA WH01");

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplierId, setSupplierId] = useState<string>("");
  const [referenceDocument, setReferenceDocument] = useState<string>("");
  const [receiptDate, setReceiptDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState<string>("");

  const [items, setItems] = useState<ReceiptItemForm[]>([]);

  const productOptions: AutocompleteItem[] = useMemo(() => {
    return products.map((p) => {
      const baseUnit = p.units?.find((u) => u.isBaseUnit)?.unitName || p.baseUnit || "";
      const validId = resolveProductUuid(p.id) || p.id;
      return {
        id: validId,
        label: `${p.name} (${p.sku})`,
        sublabel: `Mã: ${p.sku} · ĐVT: ${baseUnit} · Tồn: ${p.stockQuantity ?? 0}`,
        data: { ...p, id: validId },
      };
    });
  }, [products]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [supRes, prodRes, whList] = await Promise.all([
          suppliersService.getSuppliers({ limit: 100, status: 'ACTIVE' }),
          productsService.getProducts({ limit: 500, status: 'ACTIVE' }),
          warehouseService.getWarehouses(),
        ]);

        // Đảm bảo NCC có id là UUID chuẩn từ API /api/suppliers
        const activeSuppliers = (supRes.data || [])
          .filter((s) => s.status === 'ACTIVE')
          .map((s) => {
            const uuid = resolveSupplierUuid(s.id) || resolveSupplierUuid(s.code) || s.id;
            return {
              ...s,
              id: uuid,
            };
          });
        setSuppliers(activeSuppliers);

        // Đảm bảo sản phẩm có id là UUID chuẩn từ API /api/products
        const activeProducts = (prodRes.data || [])
          .filter((p) => !p.status || p.status === 'ACTIVE')
          .map((p) => {
            const uuid = resolveProductUuid(p.id) || resolveProductUuid(p.sku) || p.id;
            return {
              ...p,
              id: uuid,
            };
          });
        setProducts(activeProducts);

        if (Array.isArray(whList) && whList.length > 0) {
          setWarehouses(whList);
          const defaultWh =
            whList.find(
              (w) => w.code === 'WH01' || w.id === DEFAULT_WAREHOUSE_UUID
            ) || whList[0];
          setWarehouseId(defaultWh.id);
          setWarehouseDisplayName(
            defaultWh.name
              ? `${defaultWh.name} - LOHA ${defaultWh.code}`
              : "Kho Tổng Miền Nam - LOHA WH01"
          );
        }
      } catch (error: unknown) {
        showToast("error", getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        productId: "",
        unitId: "",
        packageQuantity: 1,
        conversionFactor: 1,
        unitCost: 0,
        batchNumber: "",
        mfgDate: "",
        expiryDate: "",
        notes: "",
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof ReceiptItemForm,
    value: string | number
  ) => {
    setItems((prev) => {
      const newItems = [...prev];
      const item = { ...newItems[index] };

      if (field === "productId") {
        const selectedVal = String(value);
        const prod = products.find(
          (p) => p.id === selectedVal || p.sku === selectedVal
        );
        const resolvedId = prod?.id
          ? resolveProductUuid(prod.id) || prod.id
          : resolveProductUuid(selectedVal) || selectedVal;

        item.productId = resolvedId;
        item.product = prod ? { ...prod, id: resolvedId } : undefined;
        if (prod && prod.units && prod.units.length > 0) {
          const baseUnit = prod.units.find((u) => u.isBaseUnit) || prod.units[0];
          item.unitId = baseUnit.id || "";
          item.conversionFactor = baseUnit.conversionRate || 1;
        } else {
          item.unitId = "";
          item.conversionFactor = 1;
        }
      } else if (field === "unitId") {
        item.unitId = String(value);
        const u = item.product?.units?.find((unit) => unit.id === value);
        if (u) {
          item.conversionFactor = u.conversionRate || 1;
        }
      } else if (
        field === "packageQuantity" ||
        field === "unitCost" ||
        field === "conversionFactor"
      ) {
        const numVal = typeof value === "number" ? value : parseFloat(value as string) || 0;
        item[field] = numVal;
      } else if (field !== "product") {
        (item[field] as string) = String(value);
      }

      newItems[index] = item;
      return newItems;
    });
  };

  const validateItems = (): boolean => {
    if (items.length === 0) {
      showToast("warning", "Phiếu nhập phải có ít nhất 1 mặt hàng");
      return false;
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.productId) {
        showToast("warning", `Dòng ${i + 1}: Chưa chọn sản phẩm`);
        return false;
      }
      const prodUuid = resolveProductUuid(item.productId) || item.productId;
      if (!isValidUuid(prodUuid)) {
        showToast("warning", `Dòng ${i + 1}: Mã sản phẩm không đúng định dạng UUID hợp lệ`);
        return false;
      }
      if (!item.unitId) {
        showToast("warning", `Dòng ${i + 1}: Chưa chọn đơn vị tính`);
        return false;
      }
      if (item.packageQuantity <= 0) {
        showToast("warning", `Dòng ${i + 1}: Số lượng phải lớn hơn 0`);
        return false;
      }
    }
    return true;
  };

  // 1. Thao tác Lưu nháp (DRAFT)
  const handleSaveDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateItems()) return;

    // Chuẩn hóa supplierId khi gửi payload: PHẢI là UUID hợp lệ từ API /api/suppliers
    const resolvedSupplier = suppliers.find(
      (s) => s.id === supplierId || s.code === supplierId
    );
    const candidateSupplierId = resolvedSupplier?.id || supplierId;
    const finalSupplierId = resolveSupplierUuid(candidateSupplierId) || (isValidUuid(candidateSupplierId) ? candidateSupplierId : undefined);

    const payloadItems = items.map((i) => {
      const validProdId =
        (i.product?.id && resolveProductUuid(i.product.id)) ||
        resolveProductUuid(i.productId) ||
        i.productId;
      return {
        productId: validProdId,
        unitId: i.unitId,
        packageQuantity: Number(i.packageQuantity),
        conversionFactor: Number(i.conversionFactor),
        unitCost: Number(i.unitCost),
        batchNumber: i.batchNumber || undefined,
        mfgDate: i.mfgDate || undefined,
        expiryDate: i.expiryDate || undefined,
        notes: i.notes || undefined,
      };
    });

    try {
      setSubmitting(true);
      await goodsReceiptService.createReceipt({
        warehouseId,
        supplierId: finalSupplierId,
        referenceDocument: referenceDocument || undefined,
        receiptDate: receiptDate || undefined,
        notes: notes || undefined,
        items: payloadItems,
      });

      showToast("success", "Lưu phiếu nhập nháp thành công!");
      navigate("/inventory/receipts");
    } catch (error: unknown) {
      showToast("error", getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  // 2. Mở dialog xác nhận nhập kho
  const handleOpenConfirmDialog = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!validateItems()) return;
    setIsConfirmDialogOpen(true);
  };

  // 3. Thực thi Xác nhận nhập kho chính thức (CONFIRMED)
  const handleConfirmReceipt = async () => {
    // Chuẩn hóa supplierId khi gửi payload: PHẢI là UUID hợp lệ từ API /api/suppliers
    const resolvedSupplier = suppliers.find(
      (s) => s.id === supplierId || s.code === supplierId
    );
    const candidateSupplierId = resolvedSupplier?.id || supplierId;
    const finalSupplierId = resolveSupplierUuid(candidateSupplierId) || (isValidUuid(candidateSupplierId) ? candidateSupplierId : undefined);

    const payloadItems = items.map((i) => {
      const validProdId =
        (i.product?.id && resolveProductUuid(i.product.id)) ||
        resolveProductUuid(i.productId) ||
        i.productId;
      return {
        productId: validProdId,
        unitId: i.unitId,
        packageQuantity: Number(i.packageQuantity),
        conversionFactor: Number(i.conversionFactor),
        unitCost: Number(i.unitCost),
        batchNumber: i.batchNumber || undefined,
        mfgDate: i.mfgDate || undefined,
        expiryDate: i.expiryDate || undefined,
        notes: i.notes || undefined,
      };
    });

    try {
      setSubmitting(true);
      // Tạo phiếu DRAFT trước để lấy ID
      const createRes = await goodsReceiptService.createReceipt({
        warehouseId,
        supplierId: finalSupplierId,
        referenceDocument: referenceDocument || undefined,
        receiptDate: receiptDate || undefined,
        notes: notes || undefined,
        items: payloadItems,
      });

      // Xác nhận phiếu nhập kho (cộng tồn kho thực tế và tạo thẻ kho)
      await goodsReceiptService.confirmReceipt(createRes.id);
      showToast("success", "Xác nhận nhập kho thành công! Đã cộng tồn kho.");
      navigate("/inventory/receipts");
    } catch (error: unknown) {
      showToast("error", getErrorMessage(error));
    } finally {
      setSubmitting(false);
      setIsConfirmDialogOpen(false); // Đảm bảo unmount modal/backdrop hoàn toàn
    }
  };

  const totalAmount = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (item.packageQuantity || 0) * (item.unitCost || 0),
      0
    );
  }, [items]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
        <span className="text-sm font-medium">Đang tải dữ liệu khởi tạo...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate("/inventory/receipts")}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Quay lại danh sách"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Lập phiếu nhập kho
          </h1>
          <p className="text-slate-500 mt-0.5 text-sm">
            Tạo phiếu nhập hàng hóa từ nhà cung cấp (Draft / Confirmed)
          </p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
        {/* Layout 2 cột cân đối */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CỘT TRÁI: Thông tin chung & Tổng kết (4 cột) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card Thông tin chung */}
            <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6 space-y-4">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-600" />
                Thông tin chung
              </h3>

              {/* Kho nhập hàng */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Kho nhập hàng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-5 h-5 text-slate-400 z-10" />
                  {warehouses.length > 1 ? (
                    <select
                      value={warehouseId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setWarehouseId(nextId);
                        const match = warehouses.find((w) => w.id === nextId);
                        if (match) {
                          setWarehouseDisplayName(
                            match.name
                              ? `${match.name} - LOHA ${match.code}`
                              : match.code
                          );
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 font-medium transition-all text-sm"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.code})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={warehouseDisplayName}
                      disabled
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-not-allowed text-sm"
                    />
                  )}
                </div>
              </div>

              {/* Nhà cung cấp */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nhà cung cấp
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = suppliers.find((s) => s.id === val || s.code === val);
                    const finalUuid = matched?.id ? resolveSupplierUuid(matched.id) || matched.id : (resolveSupplierUuid(val) || val);
                    setSupplierId(finalUuid);
                  }}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm text-slate-800"
                >
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Số chứng từ & Ngày nhập */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Số chứng từ
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={referenceDocument}
                      onChange={(e) => setReferenceDocument(e.target.value)}
                      placeholder="VD: HD123456"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Ngày nhập
                  </label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ghi chú
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all text-sm resize-none"
                  placeholder="Ghi chú thêm về phiếu nhập hàng..."
                />
              </div>
            </div>

            {/* Card Tổng kết */}
            <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6 space-y-3">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 text-sm uppercase tracking-wider">
                Tổng kết phiếu nhập
              </h3>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Tổng số dòng hàng:</span>
                <span className="font-semibold text-slate-900">{items.length} mặt hàng</span>
              </div>
              <div className="flex justify-between items-center text-base pt-2 border-t border-slate-100">
                <span className="font-semibold text-slate-800">Tổng tiền nhập:</span>
                <span className="font-bold text-brand-600 font-mono text-lg">
                  {totalAmount.toLocaleString("vi-VN")} đ
                </span>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Chi tiết hàng hóa (8 cột) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-xl shadow-soft border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/70">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-600" />
                  <h3 className="font-semibold text-slate-800">
                    Chi tiết hàng hóa
                  </h3>
                  <span className="text-xs text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full font-medium">
                    {items.length} mặt hàng
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="btn-secondary text-sm py-1.5 px-3 rounded-xl flex items-center font-medium cursor-pointer shadow-xs hover:border-slate-300"
                >
                  <Plus className="w-4 h-4 mr-1 text-brand-600" /> Thêm dòng
                </button>
              </div>

              {/* Bảng danh sách hàng hóa có thanh cuộn ngang & dọc */}
              <div className="p-0 overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin">
                <table className="w-full border-collapse min-w-[920px]">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600 shadow-xs">
                    <tr>
                      <th className="p-3 text-center w-12">STT</th>
                      <th className="p-3 text-left min-w-[260px]">Sản phẩm (SKU / Tên)</th>
                      <th className="p-3 text-center w-32">ĐVT</th>
                      <th className="p-3 text-right w-28">Số lượng</th>
                      <th className="p-3 text-right w-36">Đơn giá nhập</th>
                      <th className="p-3 text-right w-36">Thành tiền</th>
                      <th className="p-3 text-left w-44">Lô / Hạn dùng</th>
                      <th className="p-3 text-center w-14">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-medium">Chưa có mặt hàng nào</p>
                          <p className="text-xs text-slate-400 mt-1">
                            Bấm nút "Thêm dòng" ở góc trên để thêm sản phẩm cần nhập
                          </p>
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const baseUnitName =
                          item.product?.units?.find((u) => u.isBaseUnit)?.unitName ||
                          item.product?.baseUnit ||
                          "Đơn vị";
                        const baseQty =
                          (item.packageQuantity || 0) * (item.conversionFactor || 1);

                        return (
                          <tr
                            key={idx}
                            className="hover:bg-slate-50/50 transition-colors"
                          >
                            {/* STT: Căn giữa */}
                            <td className="p-3 text-center text-slate-500 font-medium">
                              {idx + 1}
                            </td>

                            {/* Sản phẩm: Căn trái */}
                            <td className="p-3 text-left">
                              <Autocomplete
                                size="sm"
                                placeholder="- Chọn mã SKU hoặc tên SP -"
                                value={
                                  item.product
                                    ? `${item.product.name} (${item.product.sku})`
                                    : ""
                                }
                                items={productOptions}
                                onSelect={(opt) =>
                                  handleItemChange(idx, "productId", String(opt.id))
                                }
                                className="min-w-[240px]"
                              />
                            </td>

                            {/* ĐVT: Căn giữa */}
                            <td className="p-3 text-center">
                              <select
                                value={item.unitId}
                                onChange={(e) =>
                                  handleItemChange(idx, "unitId", e.target.value)
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 text-xs text-center disabled:bg-slate-50 disabled:text-slate-400"
                                disabled={!item.product}
                              >
                                {item.product?.units && item.product.units.length > 0 ? (
                                  item.product.units.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.unitName} (x{u.conversionRate})
                                    </option>
                                  ))
                                ) : (
                                  <option value="">Chưa có ĐVT</option>
                                )}
                              </select>
                            </td>

                            {/* Số lượng: Căn phải font-mono kèm quy đổi trực quan */}
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={item.packageQuantity || ""}
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    "packageQuantity",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 text-sm text-right font-mono"
                              />
                              {/* Hiển thị trực quan quy đổi ĐVT */}
                              <div className="text-[11px] text-brand-600 font-medium mt-1 text-right whitespace-nowrap">
                                (= {baseQty} {baseUnitName})
                              </div>
                            </td>

                            {/* Đơn giá: Căn phải font-mono */}
                            <td className="p-3 text-right">
                              <CurrencyInput
                                value={item.unitCost}
                                onChange={(val) =>
                                  handleItemChange(idx, "unitCost", val || 0)
                                }
                                placeholder="0"
                                showWordsBadge={false}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 text-sm text-right font-mono"
                              />
                            </td>

                            {/* Thành tiền: Căn phải font-mono */}
                            <td className="p-3 text-right font-mono font-semibold text-slate-800 whitespace-nowrap">
                              {(
                                (item.packageQuantity || 0) * (item.unitCost || 0)
                              ).toLocaleString("vi-VN")}{" "}
                              đ
                            </td>

                            {/* Lô & HSD: Căn trái */}
                            <td className="p-3 text-left space-y-1.5">
                              <input
                                type="text"
                                value={item.batchNumber}
                                onChange={(e) =>
                                  handleItemChange(idx, "batchNumber", e.target.value)
                                }
                                placeholder="Số lô..."
                                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 text-xs"
                              />
                              <input
                                type="date"
                                value={item.expiryDate}
                                onChange={(e) =>
                                  handleItemChange(idx, "expiryDate", e.target.value)
                                }
                                className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-brand-500 text-xs"
                              />
                            </td>

                            {/* Thao tác: Căn giữa */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa dòng"
                              >
                                <Trash2 className="w-4 h-4 mx-auto" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-5 border-t border-slate-200 flex justify-end gap-3 bg-white/70 rounded-xl p-4 shadow-xs">
          <button
            type="button"
            onClick={() => navigate("/inventory/receipts")}
            className="text-slate-600 hover:bg-slate-100 rounded-xl px-5 py-2.5 transition-colors font-medium text-sm cursor-pointer border border-transparent"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSaveDraft}
            className="border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-5 py-2.5 flex items-center transition-colors font-medium text-sm cursor-pointer disabled:opacity-60"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2 text-slate-500" />
            )}
            Lưu nháp
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleOpenConfirmDialog}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6 py-2.5 shadow-sm transition-colors font-medium text-sm flex items-center cursor-pointer disabled:opacity-60"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Xác nhận nhập kho
          </button>
        </div>
      </form>

      {/* Modal Xác nhận nhập kho chính thức - Render có điều kiện, hoàn toàn miễn nhiễm lỗi kẹt backdrop */}
      {isConfirmDialogOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-150"
            onClick={() => !submitting && setIsConfirmDialogOpen(false)}
          />

          {/* Dialog box */}
          <div className="relative w-full max-w-md rounded-xl bg-white border border-slate-200/80 shadow-xl overflow-hidden z-10 transition-all duration-150">
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    Xác nhận nhập kho chính thức
                  </h3>
                  <div className="mt-2 text-sm text-slate-600 leading-relaxed space-y-2">
                    <p className="font-medium text-slate-800">
                      Phiếu sau khi xác nhận sẽ chính thức cộng tồn kho và không thể chỉnh sửa. Bạn có chắc chắn muốn xác nhận?
                    </p>
                    <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      Hệ thống sẽ cập nhật số lượng tồn kho khả dụng/thực tế tại kho đã chọn và ghi nhận lịch sử thẻ kho bất biến.
                    </p>
                  </div>
                </div>
                {!submitting && (
                  <button
                    type="button"
                    onClick={() => setIsConfirmDialogOpen(false)}
                    className="p-1 -mr-1 -mt-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50/60">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setIsConfirmDialogOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmReceipt}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Đồng ý xác nhận
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
