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
  RefreshCw
} from "lucide-react";
import { showToast } from "../components/toast";
import { suppliersService } from "../services/suppliers.service";
import { productsService } from "../services/products.service";
import { inventoryReceiptsService } from "../services/inventory-receipts.service";
import type { Supplier } from "../types/supplier";
import type { Product } from "../types/products";

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
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [supplierId, setSupplierId] = useState("");
  const [referenceDocument, setReferenceDocument] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [notes, setNotes] = useState("");
  const warehouseId = "WH01"; // Default warehouse
  
  const [items, setItems] = useState<ReceiptItemForm[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [supRes, prodRes] = await Promise.all([
          suppliersService.getSuppliers({ limit: 100 }),
          productsService.getProducts({ limit: 500, status: 'ACTIVE' })
        ]);
        setSuppliers(supRes.data || []);
        setProducts(prodRes.data || []);
      } catch (error) {
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
        item.unitId = baseUnit.id || "";
        item.conversionFactor = baseUnit.conversionRate;
      } else {
        item.unitId = "";
        item.conversionFactor = 1;
      }
    } else if (field === "unitId") {
      item.unitId = value as string;
      const u = item.product?.units?.find(u => u.id === value);
      if (u) {
        item.conversionFactor = u.conversionRate;
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
          batchNumber: i.batchNumber || undefined,
          mfgDate: i.mfgDate || undefined,
          expiryDate: i.expiryDate || undefined,
          notes: i.notes || undefined,
        }))
      });
      // Backend service create() ignores status and always creates DRAFT.
      // So we call the separate confirm API if status === 'CONFIRMED'.
      if (status === 'CONFIRMED' && res.id) {
        await inventoryReceiptsService.confirm(res.id);
      }
      showToast("success", status === 'CONFIRMED' ? "Nhập kho thành công" : "Tạo phiếu nhập nháp thành công");
      navigate("/inventory/receipts");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      showToast("error", err.response?.data?.message || "Lỗi khi tạo phiếu nhập");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return showToast("warning", "Phiếu nhập phải có ít nhất 1 mặt hàng");
    for (let i = 0; i < items.length; i++) {
      if (!items[i].productId) return showToast("warning", `Dòng ${i + 1}: Chưa chọn sản phẩm`);
      if (!items[i].unitId) return showToast("warning", `Dòng ${i + 1}: Chưa chọn đơn vị tính`);
      if (items[i].packageQuantity <= 0) return showToast("warning", `Dòng ${i + 1}: Số lượng phải > 0`);
    }
    await submitReceipt('DRAFT');
  };

  const handleConfirmReceipt = async () => {
    if (items.length === 0) return showToast("warning", "Phiếu nhập phải có ít nhất 1 mặt hàng");
    for (let i = 0; i < items.length; i++) {
      if (!items[i].productId) return showToast("warning", `Dòng ${i + 1}: Chưa chọn sản phẩm`);
      if (!items[i].unitId) return showToast("warning", `Dòng ${i + 1}: Chưa chọn đơn vị tính`);
      if (items[i].packageQuantity <= 0) return showToast("warning", `Dòng ${i + 1}: Số lượng phải > 0`);
    }
    const ok = window.confirm("Phiếu đã xác nhận sẽ chính thức cộng tồn kho và không thể chỉnh sửa. Bạn có chắc chắn muốn xác nhận?");
    if (ok) {
      await submitReceipt('CONFIRMED');
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.packageQuantity * item.unitCost), 0);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Đang tải dữ liệu...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/inventory/receipts")}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            Lập phiếu nhập kho
          </h1>
          <p className="text-slate-500 mt-1">Tạo phiếu nhập hàng hóa từ nhà cung cấp</p>
        </div>
      </div>

      <form onSubmit={handleSaveDraft} className="flex flex-col min-h-[calc(100vh-8rem)]">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cột trái: Thông tin chung */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6 space-y-4">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Thông tin chung</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kho nhập hàng <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value="Kho Tổng Miền Nam - LOHA WH01"
                    disabled
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nhà cung cấp</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                >
                  <option value="">-- Chọn nhà cung cấp --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Số chứng từ</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-2.5 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={referenceDocument}
                      onChange={(e) => setReferenceDocument(e.target.value)}
                      placeholder="VD: HD123456"
                      className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ngày nhập</label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all resize-none"
                  placeholder="Ghi chú thêm..."
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-soft border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2 mb-4">Tổng kết</h3>
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">Tổng số lượng mặt hàng:</span>
                <span className="font-medium text-slate-900">{items.length}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold text-slate-800">Tổng tiền nhập:</span>
                <span className="font-bold text-brand-600">{totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>

          {/* Cột phải: Danh sách hàng hóa */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-soft border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Package className="w-5 h-5 text-brand-500" />
                  Chi tiết hàng hóa
                </h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="btn-secondary text-sm py-1.5"
                >
                  <Plus className="w-4 h-4 mr-1" /> Thêm dòng
                </button>
              </div>

              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-sm">
                    <tr>
                      <th className="p-3 font-semibold text-slate-700 w-12 text-center">STT</th>
                      <th className="p-3 font-semibold text-slate-700 text-left min-w-[200px]">Sản phẩm</th>
                      <th className="p-3 font-semibold text-slate-700 w-32 text-center">ĐVT</th>
                      <th className="p-3 font-semibold text-slate-700 w-28 text-right">Số lượng</th>
                      <th className="p-3 font-semibold text-slate-700 w-32 text-right">Đơn giá</th>
                      <th className="p-3 font-semibold text-slate-700 w-32 text-right">Thành tiền</th>
                      <th className="p-3 font-semibold text-slate-700 min-w-[150px] text-left">Lô / HSD</th>
                      <th className="p-3 font-semibold text-slate-700 w-16 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          Chưa có mặt hàng nào. Vui lòng bấm "Thêm dòng".
                        </td>
                      </tr>
                    ) : (
                      items.map((item, idx) => {
                        const baseUnitName = item.product?.units?.find(u => u.isBaseUnit)?.unitName || "";
                        return (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/30">
                          <td className="p-3 text-center text-slate-500 font-medium">{idx + 1}</td>
                          <td className="p-3 text-left">
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-brand-500 text-sm"
                            >
                              <option value="">- Chọn sp -</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 text-center">
                            <select
                              value={item.unitId}
                              onChange={(e) => handleItemChange(idx, "unitId", e.target.value)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-brand-500 text-sm"
                              disabled={!item.product}
                            >
                              {item.product?.units?.map(u => (
                                <option key={u.id} value={u.id}>{u.unitName} (x{u.conversionRate})</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={item.packageQuantity || ""}
                              onChange={(e) => handleItemChange(idx, "packageQuantity", parseFloat(e.target.value))}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-brand-500 text-sm text-right font-mono"
                            />
                            {item.conversionFactor > 1 && (
                              <div className="text-[11px] text-slate-500 font-medium mt-1">
                                (= {(item.packageQuantity || 0) * item.conversionFactor} {baseUnitName})
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min="0"
                              value={item.unitCost === 0 ? "" : item.unitCost}
                              onChange={(e) => handleItemChange(idx, "unitCost", parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded focus:outline-none focus:border-brand-500 text-sm text-right font-mono"
                              placeholder="0"
                            />
                          </td>
                          <td className="p-3 text-right font-mono font-medium text-slate-700">
                            {((item.packageQuantity || 0) * (item.unitCost || 0)).toLocaleString("vi-VN")} đ
                          </td>
                          <td className="p-3 space-y-2 text-left">
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={(e) => handleItemChange(idx, "batchNumber", e.target.value)}
                              placeholder="Số lô..."
                              className="w-full px-3 py-1 bg-white border border-slate-300 rounded focus:outline-none focus:border-brand-500 text-xs disabled:bg-slate-100"
                            />
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => handleItemChange(idx, "expiryDate", e.target.value)}
                              className="w-full px-3 py-1 bg-white border border-slate-300 rounded focus:outline-none focus:border-brand-500 text-xs disabled:bg-slate-100"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
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

        {/* Footer Actions */}
        <div className="mt-8 pt-5 border-t border-slate-200 flex justify-end gap-3 bg-white/50 pb-2">
          <button
            type="button"
            onClick={() => navigate("/inventory/receipts")}
            className="text-slate-600 hover:bg-slate-100 rounded-xl px-4 py-2 transition-colors font-medium"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={submitting}
            onClick={handleSaveDraft}
            className="border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-4 py-2 flex items-center transition-colors font-medium"
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
            onClick={handleConfirmReceipt}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2 shadow-sm transition-colors font-medium flex items-center"
          >
            Xác nhận nhập kho
          </button>
        </div>
      </form>
    </div>
  );
};
