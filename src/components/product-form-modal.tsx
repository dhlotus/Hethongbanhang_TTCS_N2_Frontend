import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Package,
  Layers,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Percent,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Barcode,
  Info,
  Sparkles,
} from "lucide-react";
import { Button } from "./button";
import { PRODUCT_CATEGORIES } from "../services/products.service";
import type { Product, CreateProductPayload } from "../types/products";

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductPayload) => Promise<void>;
  initialData?: Product | null;
  canManageCostPrice: boolean; // Chỉ ADMIN hoặc SALES_MANAGER
}

// Danh sách ĐVT cơ sở gợi ý phổ biến ngành FMCG
const COMMON_UNITS = [
  "Lon",
  "Hộp",
  "Hũ",
  "Chai",
  "Túi",
  "Gói",
  "Lọ",
  "Cái",
  "Thùng",
];

// Danh sách ảnh mẫu FMCG chất lượng cao để chọn nhanh
const SAMPLE_IMAGES = [
  {
    label: "Sữa bột",
    url: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80",
  },
  {
    label: "Sữa hạt",
    url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=80",
  },
  {
    label: "Nước yến",
    url: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=300&auto=format&fit=crop&q=80",
  },
  {
    label: "Ngũ cốc",
    url: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80",
  },
  {
    label: "Collagen",
    url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80",
  },
  {
    label: "Nước khoáng",
    url: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&auto=format&fit=crop&q=80",
  },
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  canManageCostPrice,
}) => {
  const isEditMode = Boolean(initialData);

  // Form State
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [parentCategory, setParentCategory] = useState(PRODUCT_CATEGORIES[0].name);
  const [subCategory, setSubCategory] = useState(PRODUCT_CATEGORIES[0].subCategories?.[0]?.name || "");
  const [baseUnit, setBaseUnit] = useState("Lon");
  const [packagingSpec, setPackagingSpec] = useState("24 lon/thùng");
  const [price, setPrice] = useState<number | string>(50000);
  const [costPrice, setCostPrice] = useState<number | string>(35000);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [barcode, setBarcode] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Danh sách Cấp 2 tương ứng theo Cấp 1 đã chọn
  const currentCategoryObj = PRODUCT_CATEGORIES.find((c) => c.name === parentCategory);
  const availableSubCategories = currentCategoryObj?.subCategories || [];

  // Reset & Điền form khi mở modal
  useEffect(() => {
    if (initialData) {
      setSku(initialData.sku || "");
      setName(initialData.name || "");
      const pCat = initialData.parentCategory || PRODUCT_CATEGORIES[0].name;
      setParentCategory(pCat);
      setSubCategory(initialData.subCategory || "");
      setBaseUnit(initialData.baseUnit || "Lon");
      setPackagingSpec(initialData.packagingSpec || "");
      setPrice(initialData.price ?? 0);
      setCostPrice(initialData.costPrice ?? 0);
      setStatus(initialData.status || "ACTIVE");
      setBarcode(initialData.barcode || "");
      setImageUrl(initialData.imageUrl || "");
      setDescription(initialData.description || "");
    } else {
      setSku("");
      setName("");
      const defaultPCat = PRODUCT_CATEGORIES[0].name;
      setParentCategory(defaultPCat);
      setSubCategory(PRODUCT_CATEGORIES[0].subCategories?.[0]?.name || "");
      setBaseUnit("Lon");
      setPackagingSpec("24 lon/thùng");
      setPrice(100000);
      setCostPrice(70000);
      setStatus("ACTIVE");
      setBarcode("");
      setImageUrl("");
      setDescription("");
    }
    setFormErrors({});
  }, [initialData, isOpen]);

  // Cập nhật SubCategory tự động khi đổi ParentCategory
  const handleParentCategoryChange = (newParent: string) => {
    setParentCategory(newParent);
    const cat = PRODUCT_CATEGORIES.find((c) => c.name === newParent);
    if (cat?.subCategories && cat.subCategories.length > 0) {
      setSubCategory(cat.subCategories[0].name);
    } else {
      setSubCategory("");
    }
  };

  // Tính toán biên lợi nhuận thời gian thực
  const numPrice = Number(price) || 0;
  const numCost = Number(costPrice) || 0;
  const calculatedMargin =
    numPrice > 0 && numCost > 0
      ? Math.round(((numPrice - numCost) / numPrice) * 10000) / 100
      : undefined;

  // Xử lý đóng modal kèm animation mượt mà
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  }, [isClosing, onClose]);

  // Đóng modal khi nhấn phím ESC
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    // Validate SKU: Viết hoa, không dấu cách, chỉ chữ, số và gạch ngang
    const cleanSku = sku.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanSku) {
      errors.sku = "Mã SKU bắt buộc phải nhập";
    } else if (!/^[A-Z0-9_-]+$/.test(cleanSku)) {
      errors.sku = "Mã SKU chỉ được chứa chữ in hoa, số và dấu gạch nối (VD: LH-MILK-900G)";
    }

    if (!name.trim()) {
      errors.name = "Tên sản phẩm bắt buộc phải nhập";
    } else if (name.trim().length < 3) {
      errors.name = "Tên sản phẩm phải có ít nhất 3 ký tự";
    }

    if (!baseUnit.trim()) {
      errors.baseUnit = "Đơn vị tính cơ sở bắt buộc phải chọn";
    }

    if (!packagingSpec.trim()) {
      errors.packagingSpec = "Vui lòng nhập quy cách đóng gói (VD: 24 lon/thùng)";
    }

    if (numPrice <= 0) {
      errors.price = "Giá bán niêm yết phải lớn hơn 0 VNĐ";
    }

    if (canManageCostPrice && numCost < 0) {
      errors.costPrice = "Giá vốn không được là số âm";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);
      const cleanSku = sku.trim().toUpperCase().replace(/\s+/g, "");
      const fullCategory = `${parentCategory} / ${subCategory}`;

      const payload: CreateProductPayload = {
        sku: cleanSku,
        name: name.trim(),
        parentCategory,
        subCategory,
        category: fullCategory,
        baseUnit: baseUnit.trim(),
        packagingSpec: packagingSpec.trim(),
        price: numPrice,
        costPrice: canManageCostPrice ? numCost : undefined,
        status,
        barcode: barcode.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        description: description.trim() || undefined,
      };

      await onSubmit(payload);
      handleClose();
    } catch (err: unknown) {
      const error = err as Error;
      setFormErrors((prev) => ({
        ...prev,
        form: error.message || "Không thể lưu thông tin sản phẩm. Vui lòng thử lại!",
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs ${
        isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
          isClosing ? "animate-modal-out" : "animate-modal-in"
        }`}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-2xs">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="product-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
              >
                {isEditMode ? "Cập nhật Thông tin Sản phẩm (SKU)" : "Thêm mới Sản phẩm (SKU) vào Danh mục"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditMode
                  ? `Mã định danh SKU: ${initialData?.sku}`
                  : "Chuẩn hóa quy cách đóng gói, nhóm hàng và bảo mật giá vốn (SN-139 / SN-20)"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng popup"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700">
          {/* Thông báo lỗi tổng quát nếu có */}
          {formErrors.form && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="leading-relaxed font-medium">{formErrors.form}</div>
            </div>
          )}

          {/* Cảnh báo khóa xóa nếu sản phẩm đã phát sinh giao dịch */}
          {isEditMode && initialData?.hasTransactions && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 text-xs">
              <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Sản phẩm đã có lịch sử giao dịch:</strong> Sản phẩm này đã phát sinh chứng từ kho hoặc đơn hàng. Để đảm bảo tính toàn vẹn dữ liệu kế toán, hệ thống khóa xóa vĩnh viễn và chỉ cho phép bạn điều chỉnh thông tin hoặc chuyển sang <strong>Ngừng kinh doanh</strong>.
              </div>
            </div>
          )}

          {/* Hàng 1: Mã SKU & Tên sản phẩm */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block font-semibold text-slate-800 mb-1.5">
                Mã SKU <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                placeholder="VD: LH-MILK-900G"
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-wider uppercase transition-all focus:outline-none focus:ring-2 ${
                  formErrors.sku
                    ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30"
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white"
                }`}
                disabled={isSubmitting}
                required
              />
              {formErrors.sku && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{formErrors.sku}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-1">Duy nhất, viết hoa, không khoảng trắng</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-800 mb-1.5">
                Tên sản phẩm đầy đủ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g"
                className={`w-full px-3 py-2.5 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 ${
                  formErrors.name
                    ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30"
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white font-medium"
                }`}
                disabled={isSubmitting}
                required
              />
              {formErrors.name && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{formErrors.name}</p>
              )}
            </div>
          </div>

          {/* Hàng 2: Nhóm hàng (Cấp 1 & Cấp 2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70">
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                <span>Nhóm hàng Cấp 1 (Ngành hàng) <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={parentCategory}
                onChange={(e) => handleParentCategoryChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none cursor-pointer"
                disabled={isSubmitting}
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-indigo-600" />
                <span>Nhóm hàng Cấp 2 (Chủng loại) <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none cursor-pointer"
                disabled={isSubmitting}
              >
                {availableSubCategories.map((sub) => (
                  <option key={sub.id} value={sub.name}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hàng 3: ĐVT cơ sở & Quy cách đóng gói */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                Đơn vị tính cơ sở <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  placeholder="VD: Lon, Chai, Hộp..."
                  className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  disabled={isSubmitting}
                  required
                />
                <select
                  onChange={(e) => {
                    if (e.target.value) setBaseUnit(e.target.value);
                  }}
                  className="px-2 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] text-slate-600 cursor-pointer"
                  title="Chọn nhanh ĐVT"
                  defaultValue=""
                >
                  <option value="" disabled>Chọn nhanh</option>
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Đơn vị nhỏ nhất để kiểm kê & xuất kho</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                Quy cách đóng gói phân phối <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={packagingSpec}
                onChange={(e) => setPackagingSpec(e.target.value)}
                placeholder="VD: 24 lon/thùng, 12 hộp/lốc..."
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-medium transition-all focus:outline-none focus:ring-2 ${
                  formErrors.packagingSpec
                    ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30"
                    : "border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white"
                }`}
                disabled={isSubmitting}
                required
              />
              {formErrors.packagingSpec && (
                <p className="text-[11px] text-rose-600 mt-1 font-medium">{formErrors.packagingSpec}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-1">Dùng để quy đổi sang Thùng / Lốc khi xuất bán buôn</p>
            </div>
          </div>

          {/* Hàng 4: Giá bán & Giá vốn (Bảo mật theo RBAC SN-10) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-blue-50/40 border border-blue-100">
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>Giá bán niêm yết (VNĐ) <span className="text-rose-500">*</span></span>
                <span className="text-[10px] font-normal text-slate-500">Bán buôn B2B</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  disabled={isSubmitting}
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                  đ
                </span>
              </div>
              <p className="text-[11px] text-blue-700 font-semibold mt-1">
                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(numPrice)}
              </p>
            </div>

            {/* Ô nhập Giá vốn: Chỉ hiển thị cho ADMIN & SALES_MANAGER */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Giá vốn (Cost Price)</span>
                </label>
                {canManageCostPrice ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md ring-1 ring-emerald-600/20">
                    <ShieldCheck className="h-3 w-3" />
                    Bảo mật SN-10
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md ring-1 ring-amber-600/20">
                    <ShieldAlert className="h-3 w-3" />
                    Ẩn theo phân quyền
                  </span>
                )}
              </div>

              {canManageCostPrice ? (
                <>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={costPrice}
                      onChange={(e) => setCostPrice(e.target.value)}
                      placeholder="Nhập giá vốn nhập hàng"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-emerald-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
                      disabled={isSubmitting}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                      đ
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] mt-1">
                    <span className="text-emerald-700 font-semibold">
                      {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(numCost)}
                    </span>
                    {calculatedMargin !== undefined && (
                      <span className={`font-bold inline-flex items-center gap-0.5 ${
                        calculatedMargin >= 20 ? "text-emerald-700" : "text-amber-700"
                      }`}>
                        <Percent className="h-3 w-3" />
                        Biên LN: {calculatedMargin}%
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-100 text-slate-500 text-[11px] italic">
                  Chỉ Quản trị viên (ADMIN) và Quản lý kinh doanh (SALES_MANAGER) mới có thẩm quyền thiết lập và xem giá vốn sản phẩm.
                </div>
              )}
            </div>
          </div>

          {/* Hàng 5: Trạng thái & Mã vạch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-800 mb-1.5">
                Trạng thái kinh doanh
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus("ACTIVE")}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    status === "ACTIVE"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Đang kinh doanh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus("INACTIVE")}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    status === "INACTIVE"
                      ? "border-slate-400 bg-slate-100 text-slate-800 shadow-2xs font-bold"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <X className="h-4 w-4 text-slate-500" />
                  <span>Ngừng kinh doanh</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Barcode className="h-3.5 w-3.5 text-slate-500" />
                <span>Mã vạch Barcode (EAN-13 / UPC)</span>
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="VD: 8936012345011"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                disabled={isSubmitting}
              />
              <p className="text-[10px] text-slate-400 mt-1">Dùng để quét mã vạch bằng máy đọc tại kho</p>
            </div>
          </div>

          {/* Hàng 6: Ảnh sản phẩm (URL + Xem trước + Chọn nhanh) */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-blue-600" />
                <span>Ảnh đại diện sản phẩm (Thumbnail)</span>
              </label>
              <span className="text-[10px] text-slate-400">Định dạng URL / Web image</span>
            </div>

            <div className="flex items-start gap-3">
              {/* Khung Preview ảnh */}
              <div className="h-16 w-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="h-full w-full object-cover object-center"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Package className="h-7 w-7 text-slate-300" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Dán liên kết ảnh https://..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  disabled={isSubmitting}
                />
                
                {/* Chọn ảnh mẫu nhanh */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" />
                    <span>Chọn nhanh ảnh mẫu:</span>
                  </span>
                  {SAMPLE_IMAGES.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      onClick={() => setImageUrl(sample.url)}
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Hàng 7: Mô tả sản phẩm */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1.5">
              Mô tả chi tiết / Ghi chú kỹ thuật
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập thông tin dinh dưỡng, quy cách bảo quản, hạn dùng hoặc ghi chú xuất hàng..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none resize-none"
              disabled={isSubmitting}
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Hủy bỏ
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Đang lưu sản phẩm..."
            className="py-2 px-5 rounded-xl text-xs font-semibold cursor-pointer shadow-xs hover:shadow-sm"
          >
            {isEditMode ? "Cập nhật sản phẩm" : "Lưu vào danh mục"}
          </Button>
        </div>
      </div>
    </div>
  );
};
