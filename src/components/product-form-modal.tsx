import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  X,
  Package,
  Layers,
  DollarSign,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Upload,
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

// Danh sách gợi ý ĐVT cơ sở phổ biến FMCG
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

export interface ProductFormValues {
  sku: string;
  name: string;
  parentCategory: string;
  subCategory: string;
  baseUnit: string;
  packagingSpec?: string;
  costPrice?: number;
  status: "ACTIVE" | "INACTIVE";
  imageUrl?: string;
}

// Khởi tạo Schema Validation bằng Zod
const productSchema = z.object({
  sku: z
    .string()
    .min(1, "Mã SKU bắt buộc phải nhập")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Mã SKU chỉ bao gồm chữ in HOA, số và dấu gạch ngang (không khoảng trắng)"
    ),
  name: z
    .string()
    .min(1, "Tên sản phẩm bắt buộc phải nhập")
    .min(3, "Tên sản phẩm phải có ít nhất 3 ký tự"),
  parentCategory: z.string().min(1, "Vui lòng chọn nhóm hàng Cấp 1"),
  subCategory: z.string().min(1, "Vui lòng chọn nhóm hàng Cấp 2"),
  baseUnit: z.string().min(1, "Đơn vị tính cơ sở bắt buộc phải nhập"),
  packagingSpec: z.string().optional(),
  costPrice: z
    .preprocess(
      (val) => (val === "" || val === undefined || val === null ? undefined : Number(val)),
      z.number().min(0, "Giá vốn không được là số âm").optional()
    ),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  imageUrl: z.string().optional(),
});

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  canManageCostPrice,
}) => {
  const isEditMode = Boolean(initialData);
  const [isClosing, setIsClosing] = useState(false);
  const [formServerError, setFormServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      sku: "",
      name: "",
      parentCategory: PRODUCT_CATEGORIES[0].name,
      subCategory: PRODUCT_CATEGORIES[0].subCategories?.[0]?.name || "",
      baseUnit: "Lon",
      packagingSpec: "",
      costPrice: canManageCostPrice ? 0 : undefined,
      status: "ACTIVE",
      imageUrl: "",
    },
    mode: "onChange",
  });

  const selectedParentCategory = watch("parentCategory");
  const selectedStatus = watch("status");
  const watchedCostPrice = watch("costPrice");
  const watchedImageUrl = watch("imageUrl");

  // Danh sách Cấp 2 tương ứng theo Cấp 1 đã chọn
  const currentCategoryObj = PRODUCT_CATEGORIES.find(
    (c) => c.name === selectedParentCategory
  );
  const availableSubCategories = currentCategoryObj?.subCategories || [];

  // Reset form khi mở hoặc chuyển đổi dữ liệu
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const pCat = initialData.parentCategory || PRODUCT_CATEGORIES[0].name;
        const subCat =
          initialData.subCategory ||
          PRODUCT_CATEGORIES.find((c) => c.name === pCat)?.subCategories?.[0]?.name ||
          "";

        reset({
          sku: initialData.sku || "",
          name: initialData.name || "",
          parentCategory: pCat,
          subCategory: subCat,
          baseUnit: initialData.baseUnit || "Lon",
          packagingSpec: initialData.packagingSpec || "",
          costPrice: canManageCostPrice ? (initialData.costPrice ?? 0) : undefined,
          status: initialData.status || "ACTIVE",
          imageUrl: initialData.imageUrl || "",
        });
      } else {
        const defaultPCat = PRODUCT_CATEGORIES[0].name;
        const defaultSubCat =
          PRODUCT_CATEGORIES[0].subCategories?.[0]?.name || "";

        reset({
          sku: "",
          name: "",
          parentCategory: defaultPCat,
          subCategory: defaultSubCat,
          baseUnit: "Lon",
          packagingSpec: "",
          costPrice: canManageCostPrice ? 0 : undefined,
          status: "ACTIVE",
          imageUrl: "",
        });
      }
      setFormServerError(null);
    }
  }, [initialData, isOpen, canManageCostPrice, reset]);

  // Xử lý đổi Cấp 1 -> cập nhật Cấp 2 tự động
  const handleParentCategoryChange = (newParent: string) => {
    setValue("parentCategory", newParent, { shouldValidate: true });
    const cat = PRODUCT_CATEGORIES.find((c) => c.name === newParent);
    if (cat?.subCategories && cat.subCategories.length > 0) {
      setValue("subCategory", cat.subCategories[0].name, { shouldValidate: true });
    } else {
      setValue("subCategory", "", { shouldValidate: true });
    }
  };

  // Upload file ảnh cục bộ và convert sang base64 preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setValue("imageUrl", event.target.result as string, { shouldValidate: true });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Đóng modal kèm animation mượt mà
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  }, [isClosing, onClose]);

  // Đóng khi nhấn phím Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  // Xử lý submit hợp lệ
  const onValidSubmit = async (formData: ProductFormValues) => {
    try {
      setFormServerError(null);
      const cleanSku = formData.sku.trim().toUpperCase().replace(/\s+/g, "");
      const fullCategory = `${formData.parentCategory} / ${formData.subCategory}`;

      const payload: CreateProductPayload = {
        sku: cleanSku,
        name: formData.name.trim(),
        parentCategory: formData.parentCategory,
        subCategory: formData.subCategory,
        category: fullCategory,
        baseUnit: formData.baseUnit.trim(),
        packagingSpec: formData.packagingSpec?.trim() || "",
        price: initialData?.price ?? (canManageCostPrice ? Number(formData.costPrice || 0) : 0),
        costPrice: canManageCostPrice ? Number(formData.costPrice) : undefined,
        status: formData.status,
        imageUrl: formData.imageUrl?.trim() || undefined,
      };

      await onSubmit(payload);
      handleClose();
    } catch (err: unknown) {
      const error = err as Error;
      setFormServerError(
        error.message || "Không thể lưu thông tin sản phẩm. Vui lòng thử lại!"
      );
    }
  };

  return createPortal(
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-2xs">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="product-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900 tracking-tight"
              >
                {isEditMode
                  ? "Cập nhật Thông tin Sản phẩm (SKU)"
                  : "Thêm mới Sản phẩm (SKU)"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditMode
                  ? `Mã định danh SKU: ${initialData?.sku}`
                  : "Chuẩn hóa thông tin SKU hàng hóa (SN-139 / SN-20)"}
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
        <form
          onSubmit={handleSubmit(onValidSubmit)}
          className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700"
        >
          {/* Thông báo lỗi máy chủ nếu có */}
          {formServerError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="leading-relaxed font-medium">{formServerError}</div>
            </div>
          )}

          {/* 1. Nhóm Thông tin chung */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-slate-900 text-xs uppercase tracking-wider">
              <Package className="h-4 w-4 text-blue-600" />
              <span>1. Thông tin chung</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mã SKU */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Mã SKU <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("sku", {
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      const clean = e.target.value
                        .toUpperCase()
                        .replace(/\s+/g, "");
                      setValue("sku", clean, { shouldValidate: true });
                    },
                  })}
                  placeholder="VD: LH-MILK-900G"
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-wider uppercase transition-all focus:outline-none focus:ring-2 ${
                    errors.sku
                      ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white"
                  }`}
                  disabled={isSubmitting}
                />
                {errors.sku && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">
                    {errors.sku.message}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Mã định danh duy nhất
                </p>
              </div>

              {/* Tên sản phẩm đầy đủ */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Tên sản phẩm đầy đủ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("name")}
                  placeholder="VD: Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g"
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 ${
                    errors.name
                      ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white font-medium"
                  }`}
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">
                    {errors.name.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2. Nhóm Phân loại & Quy cách */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-slate-900 text-xs uppercase tracking-wider">
              <Layers className="h-4 w-4 text-indigo-600" />
              <span>2. Phân loại & Quy cách</span>
            </div>

            {/* Hàng: Nhóm hàng Cấp 1 & Cấp 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Nhóm hàng Cấp 1 <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedParentCategory}
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
                {errors.parentCategory && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">
                    {errors.parentCategory.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Nhóm hàng Cấp 2 <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register("subCategory")}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none cursor-pointer"
                  disabled={isSubmitting}
                >
                  {availableSubCategories.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
                {errors.subCategory && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">
                    {errors.subCategory.message}
                  </p>
                )}
              </div>
            </div>

            {/* Hàng: Đơn vị tính cơ sở & Quy cách đóng gói */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Đơn vị tính cơ sở <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    {...register("baseUnit")}
                    placeholder="VD: Lon, Chai, Hộp..."
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 ${
                      errors.baseUnit
                        ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30"
                        : "border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white"
                    }`}
                    disabled={isSubmitting}
                  />
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setValue("baseUnit", e.target.value, { shouldValidate: true });
                      }
                    }}
                    className="px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] text-slate-600 cursor-pointer"
                    title="Chọn nhanh ĐVT"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Gợi ý
                    </option>
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.baseUnit && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">
                    {errors.baseUnit.message}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Đơn vị nhỏ nhất (vd: Lon, Chai, Cái)
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Quy cách đóng gói
                </label>
                <input
                  type="text"
                  {...register("packagingSpec")}
                  placeholder="VD: 24 lon/thùng, 12 hộp/lốc..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                  disabled={isSubmitting}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Quy đổi (vd: 24 lon/thùng)
                </p>
              </div>
            </div>
          </div>

          {/* 3. Nhóm Giá & Trạng thái */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-slate-900 text-xs uppercase tracking-wider">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <span>3. Nhóm Giá & Trạng thái</span>
            </div>

            <div
              className={`grid gap-4 ${
                canManageCostPrice ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {/* RÀNG BUỘC UI QUAN TRỌNG: Giá vốn CHỈ render khi canManageCostPrice = true (ADMIN hoặc SALES_MANAGER) */}
              {canManageCostPrice && (
                <div className="p-3.5 rounded-xl bg-emerald-50/30 border border-emerald-100/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <span>Giá vốn (Cost Price) <span className="text-rose-500">*</span></span>
                    </label>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md ring-1 ring-emerald-600/20">
                      <ShieldCheck className="h-3 w-3" />
                      Quyền Quản lý
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      {...register("costPrice")}
                      placeholder="Nhập giá vốn sản phẩm"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold text-emerald-900 focus:outline-none focus:ring-2 ${
                        errors.costPrice
                          ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30"
                          : "border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-100"
                      }`}
                      disabled={isSubmitting}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                      đ
                    </span>
                  </div>

                  {errors.costPrice && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium">
                      {errors.costPrice.message}
                    </p>
                  )}

                  <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(Number(watchedCostPrice) || 0)}
                  </p>
                </div>
              )}

              {/* Trạng thái kinh doanh */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Trạng thái kinh doanh
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setValue("status", "ACTIVE", { shouldValidate: true })}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      selectedStatus === "ACTIVE"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Đang kinh doanh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValue("status", "INACTIVE", { shouldValidate: true })}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      selectedStatus === "INACTIVE"
                        ? "border-slate-400 bg-slate-100 text-slate-800 shadow-2xs font-bold"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span>Ngừng kinh doanh</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Mặc định: Đang kinh doanh
                </p>
              </div>
            </div>
          </div>

          {/* 4. Nhóm Hình ảnh */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-100 font-bold text-slate-900 text-xs uppercase tracking-wider">
              <ImageIcon className="h-4 w-4 text-blue-600" />
              <span>4. Ảnh đại diện sản phẩm</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-3">
              <div className="flex items-start gap-3.5">
                {/* Khung Preview ảnh thumbnail bo góc rounded-xl */}
                <div className="h-16 w-16 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                  {watchedImageUrl ? (
                    <img
                      src={watchedImageUrl}
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

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      {...register("imageUrl")}
                      placeholder="Dán liên kết ảnh https://..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                      disabled={isSubmitting}
                    />

                    {/* Nút Upload ảnh từ thiết bị */}
                    <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shrink-0 shadow-2xs transition-colors">
                      <Upload className="h-3.5 w-3.5 text-slate-500" />
                      <span>Chọn file</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isSubmitting}
                      />
                    </label>
                  </div>

                  {/* Chọn nhanh ảnh mẫu demo */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-amber-500" />
                      <span>Ảnh mẫu nhanh:</span>
                    </span>
                    {SAMPLE_IMAGES.map((sample) => (
                      <button
                        key={sample.label}
                        type="button"
                        onClick={() =>
                          setValue("imageUrl", sample.url, { shouldValidate: true })
                        }
                        className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer"
                      >
                        {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
            onClick={handleSubmit(onValidSubmit)}
            isLoading={isSubmitting}
            loadingText="Đang lưu..."
            className="py-2 px-5 rounded-xl text-xs font-semibold cursor-pointer shadow-xs hover:shadow-sm"
          >
            {isEditMode ? "Cập nhật sản phẩm" : "Lưu vào danh mục"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
