import React, { useState, useEffect } from "react";
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
  AlertCircle
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
  productId: string;
  unitId: string;
  packageQuantity: number;
  conversionFactor: number;
  unitCost: number;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  notes: string;
  
  // UI helpers
  product?: Product;
}

export const CreateInventoryReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [supplierId, setSupplierId] = useState("");
  const [referenceDocument, setReferenceDocument] = useState("");
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  
  const [items, setItems] = useState<ReceiptItemForm[]>([]);

  const productOptions: AutocompleteItem[] = React.useMemo(() => {
    return products.map((p) => {
      const baseUnit = p.units?.find((u) => u.isBaseUnit)?.unitName || p.baseUnit || "";
      const isBatch = p.isBatchManaged !== false;
      return {
        id: p.id,
        label: `${p.sku} - ${p.name}`,
        sublabel: `Mã: ${p.sku} · ĐVT: ${baseUnit} · Tồn: ${p.stockQuantity ?? 0}${isBatch ? ' · [Quản lý Lô/HSD]' : ''}`,
        data: p,
      };
    });
  }, [products]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [supRes, prodRes, whList] = await Promise.all([
          suppliersService.getSuppliers({ limit: 100 }),
          productsService.getProducts({ limit: 500, status: 'ACTIVE' }),
          warehouseService.getWarehouses()
        ]);
        setSuppliers(supRes.data || []);
        setProducts(prodRes.data || []);
        setWarehouses(whList || []);
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
    setItems([
      ...items,
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
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof ReceiptItemForm, value: string | number) => {
    const newItems = [...items];
    const item = newItems[index];
    
    if (field === "productId") {
      const prod = products.find(p => p.id === value);
      item.productId = value as string;
      item.product = prod;
      if (prod && prod.units && prod.units.length > 0) {
        const baseUnit = prod.units.find(u => u.isBaseUnit) || prod.units[0];
        item.unitId = baseUnit.id || baseUnit.unitName;
        item.conversionFactor = Number(baseUnit.conversionRate) || 1;
      } else {
        item.unitId = prod?.baseUnit || "Đơn vị";
        item.conversionFactor = 1;
      }
      if (prod?.costPrice) {
        item.unitCost = prod.costPrice * item.conversionFactor;
      }
    } else if (field === "unitId") {
      item.unitId = value as string;
      const u = item.product?.units?.find(u => u.id === value || u.unitName === value);
      if (u) {
        item.conversionFactor = Number(u.conversionRate) || 1;
        if (item.product?.costPrice) {
          item.unitCost = item.product.costPrice * item.conversionFactor;
        }
      }
    } else if (field === "packageQuantity" || field === "unitCost" || field === "conversionFactor") {
      Object.assign(item, { [field]: Number(value) });
    } else if (field !== "product") {
      Object.assign(item, { [field]: value as string });
    }
    
    setItems(newItems);
  };

  const submitReceipt = async (status: 'DRAFT' | 'CONFIRMED') => {
    try {
      setSubmitting(true);
      const res = await inventoryReceiptsService.create({
        warehouseId,
        supplierId: supplierId || undefined,
        referenceDocument: referenceDocument || undefined,
        receiptDate: receiptDate || undefined,
        notes: notes || undefined,
        items: items.map(i => ({
          productId: i.productId,
          unitId: i.unitId,
          packageQuantity: Number(i.packageQuantity),
          conversionFactor: Number(i.conversionFactor),
          unitCost: Number(i.unitCost),
          batchNumber: i.batchNumber?.trim() || undefined,
          mfgDate: i.mfgDate || undefined,
          expiryDate: i.expiryDate || undefined,
          notes: i.notes || undefined,
        }))
      });
      
      if (status === 'CONFIRMED' && res.id) {
        await inventoryReceiptsService.confirm(res.id);
      }
      showToast(
        "success", 
        status === 'CONFIRMED' 
          ? "Xác nhận và nhập kho thành công! Tồn kho đã được cộng." 
          : "Đã lưu phiếu nhập nháp thành công (chưa cộng tồn kho)"
      );
      navigate("/inventory/receipts");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Lỗi khi tạo phiếu nhập kho");
    } finally {
      setSubmitting(false);
    }
  };

  const validateCommonFields = (): boolean => {
    if (!warehouseId) {
      showToast("warning", "Vui lòng chọn kho nhập hàng");
      return false;
    }
    if (items.length === 0) {
      showToast("warning", "Phiếu nhập phải có ít nhất 1 mặt hàng");
      return false;
    }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        showToast("warning", `Dòng ${i + 1}: Vui lòng chọn sản phẩm`);
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
    }
    return true;
  };

  const handleSaveDraft = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validateCommonFields()) return;
    await submitReceipt('DRAFT');
  };

  const handleConfirmReceipt = () => {
    if (!validateCommonFields()) return;

    // Kiểm tra tính hợp lệ của Số lô & Hạn sử dụng đối với mặt hàng quản lý lô
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const isBatch = it.product?.isBatchManaged !== false;
      const hasBatchInput = Boolean(it.batchNumber?.trim() || it.expiryDate);

      if (isBatch || hasBatchInput) {
        if (!it.batchNumber?.trim()) {
          showToast("warning", `Dòng ${i + 1} (${it.product?.name || 'Mặt hàng'}): Bắt buộc nhập Số lô hàng`);
          return;
        }
        if (!it.expiryDate?.trim()) {
          showToast("warning", `Dòng ${i + 1} (${it.product?.name || 'Mặt hàng'}): Bắt buộc chọn Hạn sử dụng (HSD)`);
          return;
        }
        if (it.mfgDate && it.expiryDate && it.expiryDate <= it.mfgDate) {
          showToast("warning", `Dòng ${i + 1}: Hạn sử dụng phải sau Ngày sản xuất`);
          return;
        }
      }
    }

    setIsConfirmDialogOpen(true);
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.packageQuantity * item.unitCost), 0);
  const totalBaseQuantity = items.reduce((sum, item) => sum + (item.packageQuantity * item.conversionFactor), 0);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#371cdb] mb-3" />
        <p className="font-medium">Đang tải dữ liệu khởi tạo...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header điều hướng */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/inventory/receipts")}
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

      <form onSubmit={handleSaveDraft} className="flex flex-col min-h-[calc(100vh-10rem)]">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: Khai báo thông tin chứng từ & nhà cung cấp */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-4">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#371cdb]" />
                Thông tin phiếu nhập
              </h3>
              
              {/* Kho nhập hàng */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kho nhập hàng <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 focus:border-[#371cdb] text-sm text-slate-800 font-medium transition-all"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Nhà cung cấp */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nhà cung cấp
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 focus:border-[#371cdb] text-sm text-slate-800 transition-all"
                >
                  <option value="">-- Chọn nhà cung cấp giao hàng --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              {/* Số chứng từ & Ngày nhập */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Số chứng từ gốc
                  </label>
                  <input
                    type="text"
                    value={referenceDocument}
                    onChange={(e) => setReferenceDocument(e.target.value)}
                    placeholder="VD: HĐ-88291..."
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 focus:border-[#371cdb] text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Ngày nhập kho
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 focus:border-[#371cdb] text-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Ghi chú chứng từ / Biên bản dỡ xe
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20 focus:border-[#371cdb] text-sm transition-all resize-none"
                  placeholder="Ghi nhận tình trạng xe, bao bì, nhiệt độ lúc dỡ hàng..."
                />
              </div>
            </div>

            {/* Thẻ tóm tắt giá trị phiếu */}
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-3">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">
                Tổng hợp phiếu nhập
              </h3>
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Số lượng mặt hàng (SKU):</span>
                <span className="font-bold text-slate-900">{items.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-slate-600">
                <span>Tổng số lượng quy đổi:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {totalBaseQuantity.toLocaleString('vi-VN')} ĐVT cơ sở
                </span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="font-semibold text-slate-800">Tổng tiền dự tính:</span>
                <span className="text-xl font-bold text-[#371cdb] font-mono">
                  {totalAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="mt-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>Phiếu nháp sẽ không tăng tồn kho. Chỉ khi bấm <strong>Xác nhận nhập kho</strong>, hệ thống mới ghi thẻ kho và cộng tồn.</span>
              </div>
            </div>
          </div>

          {/* Cột phải: Bảng chi tiết mặt hàng nhập */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <div>
                  <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#371cdb]" />
                    Chi tiết mặt hàng & Số lô/HSD
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hệ thống tự động quy về đơn vị cơ sở khi ghi sổ tồn kho
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#371cdb]" /> Thêm dòng
                </button>
              </div>

              <div className="p-0 overflow-x-auto min-h-[360px]">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-slate-100/70 border-b border-slate-200 text-xs">
                    <tr>
                      <th className="p-3 font-semibold text-slate-600 w-10 text-center">#</th>
                      <th className="p-3 font-semibold text-slate-600 text-left min-w-[220px]">Sản phẩm (SKU)</th>
                      <th className="p-3 font-semibold text-slate-600 w-32 text-center">Đơn vị nhập</th>
                      <th className="p-3 font-semibold text-slate-600 w-28 text-right">Số lượng</th>
                      <th className="p-3 font-semibold text-slate-600 w-32 text-right">Đơn giá nhập</th>
                      <th className="p-3 font-semibold text-slate-600 w-32 text-right">Thành tiền</th>
                      <th className="p-3 font-semibold text-slate-600 min-w-[200px] text-left">Thông tin Lô & HSD</th>
                      <th className="p-3 font-semibold text-slate-600 w-12 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                          <p className="font-medium text-slate-600">Chưa có dòng hàng nào</p>
                          <p className="text-xs text-slate-400 mt-1">Bấm nút "Thêm dòng" ở góc trên để chọn mặt hàng cần nhập kho</p>
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const baseUnitName = item.product?.units?.find(u => u.isBaseUnit)?.unitName || item.product?.baseUnit || "Đơn vị";
                        const isBatchManaged = item.product?.isBatchManaged !== false;
                        return (
                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                            <td className="p-3 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>
                            
                            {/* Chọn sản phẩm */}
                            <td className="p-3 text-left">
                              <Autocomplete
                                size="sm"
                                placeholder="- Tìm mã SKU hoặc tên SP -"
                                value={item.product ? `${item.product.sku} - ${item.product.name}` : ""}
                                items={productOptions}
                                onSelect={(opt) => handleItemChange(idx, "productId", String(opt.id))}
                                className="min-w-[220px]"
                              />
                              {item.product && (
                                <div className="mt-1 flex items-center gap-1.5">
                                  {isBatchManaged ? (
                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                      <ShieldCheck className="w-2.5 h-2.5" /> Quản lý lô
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">Hàng tiêu chuẩn</span>
                                  )}
                                  <span className="text-[11px] text-slate-500">
                                    ĐVT gốc: <strong>{baseUnitName}</strong>
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* Chọn đơn vị tính quy đổi */}
                            <td className="p-3 text-center">
                              <select
                                value={item.unitId}
                                onChange={(e) => handleItemChange(idx, "unitId", e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#371cdb] text-xs font-medium"
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
                            </td>

                            {/* Số lượng nhập */}
                            <td className="p-3 text-right">
                              <input
                                type="number"
                                min="0.01"
                                step="any"
                                value={item.packageQuantity || ""}
                                onChange={(e) => handleItemChange(idx, "packageQuantity", parseFloat(e.target.value))}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#371cdb] text-xs text-right font-mono"
                              />
                              {item.conversionFactor > 1 && (
                                <div className="text-[10px] text-[#371cdb] font-medium mt-1">
                                  = {(item.packageQuantity || 0) * item.conversionFactor} {baseUnitName}
                                </div>
                              )}
                            </td>

                            {/* Đơn giá nhập */}
                            <td className="p-3 text-right">
                              <CurrencyInput
                                value={item.unitCost}
                                onChange={(val) => handleItemChange(idx, "unitCost", val || 0)}
                                placeholder="0"
                                showWordsBadge={false}
                                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-[#371cdb] text-xs text-right font-mono"
                              />
                            </td>

                            {/* Thành tiền */}
                            <td className="p-3 text-right font-mono font-semibold text-slate-800 text-xs">
                              {((item.packageQuantity || 0) * (item.unitCost || 0)).toLocaleString("vi-VN")} đ
                            </td>

                            {/* Thông tin Lô & HSD */}
                            <td className="p-3 space-y-1.5 text-left">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={item.batchNumber}
                                  onChange={(e) => handleItemChange(idx, "batchNumber", e.target.value)}
                                  placeholder={isBatchManaged ? "Số lô (bắt buộc)..." : "Số lô..."}
                                  className={`w-full px-2.5 py-1 bg-white border rounded text-xs ${
                                    isBatchManaged && !item.batchNumber
                                      ? "border-amber-300 bg-amber-50/30"
                                      : "border-slate-300"
                                  } focus:outline-none focus:border-[#371cdb]`}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-1 text-[11px]">
                                <div>
                                  <span className="text-[10px] text-slate-400 block">NSX:</span>
                                  <input
                                    type="date"
                                    value={item.mfgDate}
                                    onChange={(e) => handleItemChange(idx, "mfgDate", e.target.value)}
                                    className="w-full px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[11px] focus:outline-none focus:border-[#371cdb]"
                                    title="Ngày sản xuất"
                                  />
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-400 block">HSD *:</span>
                                  <input
                                    type="date"
                                    value={item.expiryDate}
                                    onChange={(e) => handleItemChange(idx, "expiryDate", e.target.value)}
                                    className={`w-full px-1.5 py-0.5 bg-white border rounded text-[11px] ${
                                      isBatchManaged && !item.expiryDate
                                        ? "border-amber-300 bg-amber-50/30"
                                        : "border-slate-300"
                                    } focus:outline-none focus:border-[#371cdb]`}
                                    title="Hạn sử dụng"
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Xóa dòng */}
                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa dòng này"
                              >
                                <Trash2 className="w-4 h-4" />
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

        {/* Thanh công cụ hành động phía dưới */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex flex-wrap justify-between items-center gap-4 bg-white/70 py-2">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Hệ thống áp dụng phương pháp FEFO (First-Expired, First-Out) khi xuất kho</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/inventory/receipts")}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors font-medium cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              onClick={handleSaveDraft}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl flex items-center text-sm font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin text-slate-500" />
              ) : (
                <Save className="w-4 h-4 mr-2 text-slate-500" />
              )}
              Lưu phiếu nháp
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirmReceipt}
              className="bg-[#371cdb] hover:bg-[#2d14b8] text-white rounded-xl px-5 py-2 shadow-xs transition-colors text-sm font-semibold flex items-center cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Xác nhận nhập kho
            </button>
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
            await submitReceipt('CONFIRMED');
          }}
          title="Xác nhận nhập kho chính thức (SN-178)"
          message={
            <div className="space-y-3 text-left">
              <p className="text-slate-700 text-sm">
                Bạn đang chuẩn bị xác nhận phiếu nhập kho gồm <strong>{items.length} mặt hàng</strong> (tổng <strong>{totalBaseQuantity.toLocaleString('vi-VN')} ĐVT cơ sở</strong>).
              </p>
              <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 space-y-1">
                <p className="font-semibold flex items-center gap-1 text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600" /> Lưu ý quan trọng:
                </p>
                <p>• Phiếu sau khi xác nhận sẽ <strong>cộng trực tiếp tồn kho thực tế</strong> và ghi sổ giao dịch thẻ kho.</p>
                <p>• Phiếu đã xác nhận <strong>không thể chỉnh sửa hoặc xóa</strong>. Mọi sai sót sau này chỉ có thể xử lý bằng cách lập <em>Phiếu điều chỉnh kiểm kê</em>.</p>
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
