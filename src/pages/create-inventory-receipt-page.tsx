import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  ShieldCheck,
  AlertCircle,
  Truck,
  Calendar,
} from "lucide-react";
import { showToast } from "../components/toast";
import { ConfirmDialog } from "../components/confirm-dialog";
import { CurrencyInput } from "../components/currency-input";
import { Autocomplete, type AutocompleteItem } from "../components/autocomplete";
import { suppliersService } from "../services/suppliers.service";
import { productsService } from "../services/products.service";
import { warehouseService } from "../services/warehouse.service";
import { inventoryReceiptsService } from "../services/inventory-receipts.service";
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

const getTodayString = (): string => new Date().toISOString().split("T")[0];

const createInitialItem = (): ReceiptItemForm => ({
  id: `row-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  productId: "",
  unitId: "",
  unitName: "",
  packageQuantity: 1,
  conversionFactor: 1,
  unitCost: 0,
  batchNumber: "",
  mfgDate: "",
  expiryDate: "",
  notes: "",
});

/**
 * Màn hình Lập phiếu nhập kho từ nhà cung cấp (SN-178)
 * - Khối 1: Header Section 100% width dạng responsive grid 5 cột
 * - Khối 2: Bảng chi tiết mặt hàng 100% width với nút "+ Thêm dòng hàng" ở header card
 * - Khối 3: Cố định Bottom Action Bar (Sticky Footer) với tóm tắt và hành động
 * - Hỗ trợ resetForm toàn diện khi mount/unmount hoặc bấm Hủy bỏ
 */
export const CreateInventoryReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [referenceDocument, setReferenceDocument] = useState("");
  const [receiptDate, setReceiptDate] = useState<string>(getTodayString);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ReceiptItemForm[]>([createInitialItem()]);

  /**
   * Reset form về trạng thái ban đầu sạch sẽ (SN-178)
   */
  const resetForm = useCallback(() => {
    setWarehouseId((prev) => prev || "11111111-0000-0000-0000-000000000001");
    setSupplierId("");
    setReferenceDocument("");
    setReceiptDate(getTodayString());
    setNotes("");
    setShowValidationErrors(false);
    setItems([createInitialItem()]);
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
    const loadData = async () => {
      setLoading(true);
      try {
        let supList: Supplier[] = [];
        let prodList: Product[] = [];
        let whList: Warehouse[] = [];

        try {
          const supRes = await suppliersService.getSuppliers({ limit: 100 });
          supList = supRes.data || [];
        } catch {
          supList = [
            { id: "22222222-0000-0000-0000-000000000001", code: "NCC-IDP", name: "Công ty Cổ phần Sữa Quốc Tế (IDP)", status: "ACTIVE" } as Supplier,
            { id: "22222222-0000-0000-0000-000000000002", code: "NCC-NSX", name: "Công ty TNHH Nông Sản Xanh Loha", status: "ACTIVE" } as Supplier,
          ];
        }

        try {
          const prodRes = await productsService.getProducts({ limit: 500, status: "ACTIVE" });
          prodList = prodRes.data || [];
        } catch {
          prodList = [
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
          ];
        }

        try {
          whList = (await warehouseService.getWarehouses()) || [];
        } catch {
          whList = [
            {
              id: "11111111-0000-0000-0000-000000000001",
              code: "WH01",
              name: "Kho Tổng Miền Nam - LOHA WH01",
              status: "ACTIVE",
            } as Warehouse,
          ];
        }

        setSuppliers(supList);
        setProducts(prodList);
        setWarehouses(whList);

        if (whList && whList.length > 0) {
          setWarehouseId(whList[0].id);
        } else {
          setWarehouseId("11111111-0000-0000-0000-000000000001");
        }
      } catch {
        showToast("error", "Lỗi khi tải dữ liệu khởi tạo");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddItem = () => {
    setItems((prev) => [...prev, createInitialItem()]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCancel = () => {
    resetForm();
    navigate("/inventory/receipts");
  };

  const handleItemChange = (index: number, field: keyof ReceiptItemForm, value: string | number) => {
    const newItems = [...items];
    const item = newItems[index];

    if (field === "productId") {
      const prod = products.find((p) => p.id === value);
      item.productId = value as string;
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

  const validateCommonFields = (isConfirming: boolean): boolean => {
    setShowValidationErrors(true);

    if (!warehouseId) {
      showToast("warning", "Vui lòng chọn Kho nhập hàng (*)");
      return false;
    }
    if (!supplierId) {
      showToast("warning", "Vui lòng chọn Nhà cung cấp (*)");
      return false;
    }
    if (!receiptDate) {
      showToast("warning", "Vui lòng chọn Ngày nhập kho (*)");
      return false;
    }
    if (items.length === 0) {
      showToast("warning", "Phiếu nhập phải có ít nhất 1 mặt hàng");
      return false;
    }

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        showToast("warning", `Dòng ${i + 1}: Vui lòng chọn sản phẩm / SKU`);
        return false;
      }
      if (!it.unitId) {
        showToast("warning", `Dòng ${i + 1}: Vui lòng chọn đơn vị tính`);
        return false;
      }
      if (!it.packageQuantity || it.packageQuantity <= 0) {
        showToast("warning", `Dòng ${i + 1}: Số lượng nhập phải lớn hơn 0`);
        return false;
      }

      if (isConfirming) {
        const isBatch = it.product?.isBatchManaged !== false;
        const hasBatchInput = Boolean(it.batchNumber?.trim() || it.expiryDate);

        if (isBatch || hasBatchInput) {
          if (!it.batchNumber?.trim()) {
            showToast("warning", `Dòng ${i + 1} (${it.product?.name || "Mặt hàng"}): Bắt buộc nhập Số lô hàng`);
            return false;
          }
          if (!it.expiryDate?.trim()) {
            showToast("warning", `Dòng ${i + 1} (${it.product?.name || "Mặt hàng"}): Bắt buộc chọn Hạn sử dụng (HSD)`);
            return false;
          }
          if (it.mfgDate && it.expiryDate && it.expiryDate <= it.mfgDate) {
            showToast("warning", `Dòng ${i + 1}: Hạn sử dụng phải sau Ngày sản xuất`);
            return false;
          }
        }
      }
    }

    return true;
  };

  const submitReceipt = async (status: "DRAFT" | "CONFIRMED") => {
    try {
      setSubmitting(true);
      const res = await inventoryReceiptsService.create({
        warehouseId,
        supplierId: supplierId || undefined,
        referenceDocument: referenceDocument || undefined,
        receiptDate: receiptDate || undefined,
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          unitId: i.unitId,
          packageQuantity: Number(i.packageQuantity),
          conversionFactor: Number(i.conversionFactor),
          unitCost: Number(i.unitCost),
          batchNumber: i.batchNumber?.trim() || undefined,
          mfgDate: i.mfgDate || undefined,
          expiryDate: i.expiryDate || undefined,
          notes: i.notes || undefined,
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
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Lỗi khi tạo phiếu nhập kho");
    } finally {
      setSubmitting(false);
    }
  };

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

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#371cdb] mb-3" />
        <p className="font-medium">Đang tải dữ liệu khởi tạo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header điều hướng */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleCancel}
          className="p-2.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          title="Quay lại danh sách phiếu nhập"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-[#371cdb]" />
            Lập phiếu nhập kho từ Nhà cung cấp
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Ghi nhận hàng về đúng lô và số lượng ngay khi xe dỡ hàng tại kho (SN-178)
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveDraft} className="space-y-6">
        {/* Khối 1: Thông tin chung phiếu nhập (Header Section - Chiếm trọn 100% chiều ngang) */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 space-y-4">
          <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#371cdb]" />
            Thông tin chung phiếu nhập
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Cột 1: Kho nhập hàng (*) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Kho nhập hàng <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 focus:border-[#371cdb] text-xs font-medium text-slate-800 transition-all truncate"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cột 2: Nhà cung cấp (*) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nhà cung cấp <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Truck className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 bg-white border ${
                    showValidationErrors && !supplierId
                      ? "border-rose-500 ring-1 ring-rose-200"
                      : "border-slate-300 focus:border-[#371cdb]"
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 text-xs font-medium text-slate-800 transition-all truncate`}
                >
                  <option value="">-- Chọn NCC giao hàng --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cột 3: Số chứng từ gốc */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Số chứng từ gốc
              </label>
              <input
                type="text"
                value={referenceDocument}
                onChange={(e) => setReferenceDocument(e.target.value)}
                placeholder="VD: HĐ-88291..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 focus:border-[#371cdb] text-xs text-slate-800 transition-all"
              />
            </div>

            {/* Cột 4: Ngày nhập kho (*) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Ngày nhập kho <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 focus:border-[#371cdb] text-xs text-slate-800 transition-all font-mono"
                />
              </div>
            </div>

            {/* Cột 5: Ghi chú / Biên bản dỡ xe */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Ghi chú / Biên bản dỡ xe
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Biên bản dỡ xe, số xe, nhiệt độ..."
                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 focus:border-[#371cdb] text-xs text-slate-800 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Khối 2: Bảng chi tiết mặt hàng & Quản lý Lô/HSD (100% Width Table) */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#371cdb]" />
                Chi tiết mặt hàng & Quản lý Lô/HSD
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Toàn bộ bề ngang được tối ưu cho việc nhập thông tin chi tiết, Số lô và HSD được tách thành các cột riêng biệt
              </p>
            </div>
            
            {/* Cụm góc trên bên phải: Nút + Thêm dòng hàng nằm cạnh badge Mặt hàng đã chọn */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-[#371cdb] hover:text-[#371cdb] transition-all shadow-2xs cursor-pointer"
              >
                <Plus className="w-4 h-4 text-[#371cdb]" /> Thêm dòng hàng
              </button>
              <div className="text-xs text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs font-medium whitespace-nowrap">
                Mặt hàng đã chọn: <strong className="text-slate-900">{items.filter((i) => !!i.productId).length}</strong> / {items.length}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse min-w-[1160px]">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-xs">
                <tr>
                  <th className="p-3 font-semibold text-slate-600 w-12 text-center">#</th>
                  <th className="p-3 font-semibold text-slate-600 text-left min-w-[280px]">
                    Sản phẩm / SKU <span className="text-rose-500">*</span>
                  </th>
                  <th className="p-3 font-semibold text-slate-600 w-44 text-left">
                    Đơn vị tính & Quy đổi <span className="text-rose-500">*</span>
                  </th>
                  <th className="p-3 font-semibold text-slate-600 w-32 text-right">
                    Số lượng nhập <span className="text-rose-500">*</span>
                  </th>
                  <th className="p-3 font-semibold text-slate-600 w-44 text-left">
                    Số lô (Batch No) <span className="text-rose-500">*</span>
                  </th>
                  <th className="p-3 font-semibold text-slate-600 w-44 text-left">
                    Hạn sử dụng (HSD) <span className="text-rose-500">*</span>
                  </th>
                  <th className="p-3 font-semibold text-slate-600 w-44 min-w-[150px] text-right">
                    Đơn giá nhập
                  </th>
                  <th className="p-3 font-semibold text-slate-600 w-44 min-w-[150px] text-right">
                    Thành tiền
                  </th>
                  <th className="p-3 font-semibold text-slate-600 w-16 text-center">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-12 text-center text-slate-400">
                      <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                      <p className="font-medium text-slate-600">Chưa có dòng hàng nào</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Bấm nút &quot;+ Thêm dòng hàng&quot; ở thanh tiêu đề bên trên để bắt đầu chọn sản phẩm
                      </p>
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const baseUnitName =
                      item.product?.units?.find((u) => u.isBaseUnit)?.unitName ||
                      item.product?.baseUnit ||
                      "Đơn vị";
                    const isBatchManaged = item.product?.isBatchManaged !== false;
                    const isProductMissing = showValidationErrors && !item.productId;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Cột 0: STT */}
                        <td className="p-3 text-center text-slate-400 font-mono text-xs align-top pt-4">
                          {idx + 1}
                        </td>

                        {/* Cột 1: Sản phẩm / SKU */}
                        <td className="p-3 text-left align-top">
                          <Autocomplete
                            size="sm"
                            placeholder="- Tìm mã SKU hoặc tên SP -"
                            value={item.product ? `${item.product.sku} - ${item.product.name}` : ""}
                            items={productOptions}
                            error={isProductMissing ? "Vui lòng chọn sản phẩm" : undefined}
                            onSelect={(opt) => handleItemChange(idx, "productId", String(opt.id))}
                            className="w-full"
                          />
                          {item.product && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              {isBatchManaged ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  <ShieldCheck className="w-3 h-3 text-amber-600" /> Quản lý Lô/HSD
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">Hàng tiêu chuẩn</span>
                              )}
                              <span className="text-[11px] text-slate-500">
                                ĐVT gốc: <strong className="text-slate-700">{baseUnitName}</strong>
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Cột 2: Đơn vị tính & Quy đổi */}
                        <td className="p-3 text-left align-top">
                          <div className="space-y-1">
                            <select
                              value={item.unitId}
                              onChange={(e) => handleItemChange(idx, "unitId", e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 focus:border-[#371cdb] text-xs font-medium text-slate-800 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                              disabled={!item.product}
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
                            {item.product && (
                              <div
                                className="text-[11px] text-slate-500 font-medium truncate"
                                title={`1 ${item.unitName || item.unitId} = ${item.conversionFactor} ${baseUnitName}`}
                              >
                                {item.conversionFactor > 1 ? (
                                  <span>
                                    1 {item.unitName || item.unitId} ={" "}
                                    <strong className="text-[#371cdb] font-bold">{item.conversionFactor}</strong>{" "}
                                    {baseUnitName}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">Đơn vị cơ sở (x1)</span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Cột 3: Số lượng nhập */}
                        <td className="p-3 text-right align-top">
                          <div>
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.packageQuantity || ""}
                              onChange={(e) =>
                                handleItemChange(idx, "packageQuantity", parseFloat(e.target.value) || 0)
                              }
                              placeholder="0"
                              className={`w-full px-2.5 py-1.5 bg-white border ${
                                showValidationErrors && (!item.packageQuantity || item.packageQuantity <= 0)
                                  ? "border-rose-500 ring-1 ring-rose-200"
                                  : "border-slate-300 focus:border-[#371cdb]"
                              } rounded-lg focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 text-xs text-right font-mono font-medium text-slate-900 transition-all`}
                            />
                            {item.conversionFactor > 1 && (
                              <div className="text-[10px] text-[#371cdb] font-medium font-mono text-right mt-1 whitespace-nowrap">
                                = {((item.packageQuantity || 0) * item.conversionFactor).toLocaleString("vi-VN")}{" "}
                                {baseUnitName}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Cột 4: Số lô - Batch No (Cột riêng biệt) */}
                        <td className="p-3 text-left align-top">
                          <div>
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={(e) => handleItemChange(idx, "batchNumber", e.target.value)}
                              placeholder={isBatchManaged ? "LOT-202610-A (*)" : "LOT-..."}
                              className={`w-full px-2.5 py-1.5 bg-white border ${
                                isBatchManaged && showValidationErrors && !item.batchNumber.trim()
                                  ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-200"
                                  : isBatchManaged && !item.batchNumber.trim()
                                  ? "border-amber-300 bg-amber-50/20 focus:border-[#371cdb]"
                                  : "border-slate-300 focus:border-[#371cdb]"
                              } rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 transition-all`}
                            />
                            {isBatchManaged && (
                              <span className="text-[10px] text-amber-600 block mt-1 font-medium">
                                Bắt buộc theo lô
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Cột 5: Hạn sử dụng - HSD (Cột riêng biệt) */}
                        <td className="p-3 text-left align-top">
                          <div className="space-y-1">
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => handleItemChange(idx, "expiryDate", e.target.value)}
                              title="Hạn sử dụng (HSD)"
                              className={`w-full px-2 py-1.5 bg-white border ${
                                (isBatchManaged || Boolean(item.batchNumber)) &&
                                showValidationErrors &&
                                !item.expiryDate.trim()
                                  ? "border-rose-500 bg-rose-50/20 ring-1 ring-rose-200"
                                  : isBatchManaged && !item.expiryDate.trim()
                                  ? "border-amber-300 bg-amber-50/20 focus:border-[#371cdb]"
                                  : "border-slate-300 focus:border-[#371cdb]"
                              } rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 transition-all font-mono`}
                            />
                            <div className="flex items-center justify-between text-[10px] text-slate-400 gap-1 pt-0.5">
                              <span className="shrink-0">NSX:</span>
                              <input
                                type="date"
                                value={item.mfgDate}
                                onChange={(e) => handleItemChange(idx, "mfgDate", e.target.value)}
                                title="Ngày sản xuất"
                                className="w-28 px-1 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600 focus:outline-none focus:border-[#371cdb] font-mono"
                              />
                            </div>
                          </div>
                        </td>

                        {/* Cột 6: Đơn giá nhập (Độ rộng mở rộng, căn phải, định dạng phân cách hàng nghìn) */}
                        <td className="p-3 text-right align-top w-44 min-w-[150px]">
                          <div className="w-full min-w-[130px]">
                            <CurrencyInput
                              value={item.unitCost}
                              onChange={(val) => handleItemChange(idx, "unitCost", val || 0)}
                              placeholder="0"
                              showWordsBadge={false}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 focus:border-[#371cdb] text-slate-900 transition-all font-medium"
                            />
                          </div>
                        </td>

                        {/* Cột 7: Thành tiền (Độ rộng mở rộng tương xứng) */}
                        <td className="p-3 text-right align-top pt-3.5 w-44 min-w-[150px]">
                          <div className="font-mono font-bold text-slate-900 text-sm whitespace-nowrap">
                            {((item.packageQuantity || 0) * (item.unitCost || 0)).toLocaleString("vi-VN")} đ
                          </div>
                        </td>

                        {/* Cột 8: Thao tác (Nút xóa) */}
                        <td className="p-3 text-center align-top pt-3">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa dòng hàng này"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Dải chân bảng: FEFO Note */}
          <div className="p-3 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between">
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>FEFO (First-Expired, First-Out) tự động ưu tiên xuất lô cận date</span>
            </div>
            <div className="text-xs text-slate-400">
              Tổng số dòng: <strong className="text-slate-700 font-mono">{items.length}</strong>
            </div>
          </div>
        </div>

        {/* Khối 3: Cố định Bottom Action Bar (Sticky Footer) */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 shadow-lg z-20 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 mt-8 rounded-b-2xl">
          {/* Phía bên trái: Tóm tắt nhanh */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm w-full md:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-400">Tổng SKU:</span>
              <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full text-xs sm:text-sm font-mono">
                {items.length}
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-400 whitespace-nowrap">
                Tổng lượng quy đổi:
              </span>
              <span className="font-bold text-slate-900 font-mono text-sm whitespace-nowrap">
                {totalBaseQuantity.toLocaleString("vi-VN")} ĐVT cơ sở
              </span>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-slate-400 whitespace-nowrap">
                Tổng tiền dự tính:
              </span>
              <span className="text-base sm:text-lg font-bold text-[#371cdb] font-mono whitespace-nowrap">
                {totalAmount.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </div>

          {/* Phía bên phải: Các nút hành động chính */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <div className="relative group">
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveDraft}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl flex items-center text-sm font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
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
                  Không ảnh hưởng tồn kho
                </div>
                <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
              </div>
            </div>
            <div className="relative group">
              <button
                type="button"
                disabled={submitting}
                onClick={handleConfirmReceipt}
                className="bg-[#371cdb] hover:bg-[#2d14b8] text-white rounded-xl px-5 py-2 shadow-xs hover:shadow-md transition-all text-sm font-semibold flex items-center cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4.5 h-4.5 mr-1.5" />
                Xác nhận nhập kho
              </button>
              <div className="absolute bottom-full right-0 mb-2 hidden group-hover:flex flex-col items-end pointer-events-none z-30">
                <div className="bg-slate-900 text-white text-xs py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md">
                  Ghi thẻ kho và cộng tồn khả dụng
                </div>
                <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 mr-6"></div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Dialog xác nhận nhập kho chính thức */}
      {isConfirmDialogOpen && (
        <ConfirmDialog
          isOpen={isConfirmDialogOpen}
          onCancel={() => setIsConfirmDialogOpen(false)}
          onConfirm={async () => {
            setIsConfirmDialogOpen(false);
            await submitReceipt("CONFIRMED");
          }}
          title="Xác nhận nhập kho chính thức (SN-178)"
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
    </div>
  );
};
