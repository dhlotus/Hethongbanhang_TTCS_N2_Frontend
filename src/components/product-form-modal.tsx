import React, { useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Package,
  Layers,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Upload,
  Link as LinkIcon,
  Sparkles,
  Info,
  ShieldCheck,
} from "lucide-react";
import { Button } from "./button";
import { PRODUCT_CATEGORIES } from "../services/products.service";
import type { Product, CreateProductPayload, ProductStatus } from "../types/products";

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

// Hàm tạo Zod Schema theo vai trò người dùng (SN-10 & SN-139)
const createProductValidationSchema = (canManageCostPrice: boolean) =>
  z.object({
    sku: z
      .string()
      .trim()
      .min(1, "Mã SKU bắt buộc phải nhập")
      .regex(
        /^[A-Z0-9_-]+$/,
        "Mã SKU chỉ được chứa chữ in hoa, chữ số và gạch nối (không dấu cách)"
      ),
    name: z
      .string()
      .trim()
      .min(1, "Tên sản phẩm bắt buộc phải nhập")
      .min(3, "Tên sản phẩm phải có ít nhất 3 ký tự"),
    parentCategory: z.string().min(1, "Vui lòng chọn nhóm hàng Cấp 1"),
    subCategory: z.string().min(1, "Vui lòng chọn nhóm hàng Cấp 2"),
    baseUnit: z.string().trim().min(1, "Đơn vị tính cơ sở bắt buộc phải nhập"),
    packagingSpec: z.string().optional(),
    costPrice: canManageCostPrice
      ? z
          .union([z.number(), z.string()])
          .refine(
            (val) => {
              if (val === "" || val === undefined || val === null) return false;
              const n = Number(val);
              return !isNaN(n) && n >= 0;
            },
            { message: "Giá vốn bắt buộc nhập và phải lớn hơn hoặc bằng 0 VNĐ" }
          )
      : z.any().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    imageUrl: z.string().optional(),
  });

type ProductFormData = z.infer<ReturnType<typeof createProductValidationSchema>>;

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  canManageCostPrice,
}) => {
  const isEditMode = Boolean(initialData);
  const [isClosing, setIsClosing] = React.useState(false);
  const [generalError, setGeneralError] = React.useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tạo schema thích ứng theo quyền truy cập Giá vốn
  const schema = useMemo(
    () => createProductValidationSchema(canManageCostPrice),
    [canManageCostPrice]
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      sku: "",
      name: "",
      parentCategory: PRODUCT_CATEGORIES[0]?.name || "",
      subCategory: PRODUCT_CATEGORIES[0]?.subCategories?.[0]?.name || "",
      baseUnit: "Lon",
      packagingSpec: "",
      costPrice: 50000,
      status: "ACTIVE",
      imageUrl: "",
    },
    mode: "onChange", // Validate dữ liệu realtime
  });

  // Watch các trường để phục vụ tương tác động
  const watchedParentCategory = watch("parentCategory");
  const watchedCostPrice = watch("costPrice");
  const watchedStatus = watch("status");
  const watchedImageUrl = watch("imageUrl");

  // Tìm danh sách nhóm hàng Cấp 2 tương ứng theo Cấp 1 đã chọn
  const availableSubCategories = useMemo(() => {
    const parent = PRODUCT_CATEGORIES.find((c) => c.name === watchedParentCategory);
    return parent?.subCategories || [];
  }, [watchedParentCategory]);

  // Cập nhật giá trị mặc định khi mở Modal hoặc thay đổi initialData
  useEffect(() => {
    if (isOpen) {
      setGeneralError(null);
      if (initialData) {
        const pCat = initialData.parentCategory || PRODUCT_CATEGORIES[0]?.name || "";
        const parentObj = PRODUCT_CATEGORIES.find((c) => c.name === pCat);
        const subCat =
          initialData.subCategory || parentObj?.subCategories?.[0]?.name || "";

        reset({
          sku: initialData.sku || "",
          name: initialData.name || "",
          parentCategory: pCat,
          subCategory: subCat,
          baseUnit: initialData.baseUnit || "Lon",
          packagingSpec: initialData.packagingSpec || "",
          costPrice: initialData.costPrice ?? 0,
          status: initialData.status || "ACTIVE",
          imageUrl: initialData.imageUrl || "",
        });
      } else {
        const defaultParent = PRODUCT_CATEGORIES[0]?.name || "";
        const defaultSub = PRODUCT_CATEGORIES[0]?.subCategories?.[0]?.name || "";

        reset({
          sku: "",
          name: "",
          parentCategory: defaultParent,
          subCategory: defaultSub,
          baseUnit: "Lon",
          packagingSpec: "",
          costPrice: 50000,
          status: "ACTIVE",
          imageUrl: "",
        });
      }
    }
  }, [isOpen, initialData, reset]);

  // Tự động đổi SubCategory khi người dùng chọn ParentCategory khác
  const handleParentCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParent = e.target.value;
    setValue("parentCategory", newParent, { shouldValidate: true });
    const parentObj = PRODUCT_CATEGORIES.find((c) => c.name === newParent);
    if (parentObj?.subCategories && parentObj.subCategories.length > 0) {
      setValue("subCategory", parentObj.subCategories[0].name, { shouldValidate: true });
    } else {
      setValue("subCategory", "", { shouldValidate: true });
    }
  };

  // Đóng modal với hiệu ứng animation mượt mà
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [isClosing, onClose]);

  // Hỗ trợ phím ESC để đóng modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  // Xử lý chọn ảnh từ máy tính (Upload -> Data URL)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Giới hạn file 3MB
    if (file.size > 3 * 1024 * 1024) {
      setGeneralError("Kích thước tệp ảnh không được vượt quá 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setValue("imageUrl", reader.result, { shouldValidate: true });
        setGeneralError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit dữ liệu form
  const onFormSubmit = async (formData: ProductFormData) => {
    try {
      setGeneralError(null);
      const cleanSku = formData.sku.trim().toUpperCase().replace(/\s+/g, "");
      const fullCategory = `${formData.parentCategory} / ${formData.subCategory}`;

      const numCost = canManageCostPrice ? Number(formData.costPrice) : undefined;

      const payload: CreateProductPayload = {
        sku: cleanSku,
        name: formData.name.trim(),
        parentCategory: formData.parentCategory,
        subCategory: formData.subCategory,
        category: fullCategory,
        baseUnit: formData.baseUnit.trim(),
        packagingSpec: formData.packagingSpec?.trim() || "",
        price: initialData?.price ?? (numCost ? numCost * 1.25 : 0),
        costPrice: numCost ?? initialData?.costPrice,
        status: formData.status as ProductStatus,
        imageUrl: formData.imageUrl?.trim() || undefined,
      };

      await onSubmit(payload);
      handleClose();
    } catch (err: unknown) {
      const error = err as Error;
      setGeneralError(
        error.message || "Không thể lưu thông tin sản phẩm. Vui lòng thử lại!"
      );
    }
  };

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-modal-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200 ${
        isClosing ? "opacity-0" : "opacity-100"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all duration-200 ${
          isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"
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
                {isEditMode ? "Cập nhật Sản phẩm (SKU)" : "Thêm mới Sản phẩm (SKU)"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditMode
                  ? `Chỉnh sửa thông tin SKU: ${initialData?.sku}`
                  : "Nhập thông tin sản phẩm theo chuẩn danh mục hệ thống LOHA SALES"}
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
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700"
        >
          {/* Thông báo lỗi tổng quát nếu có */}
          {generalError && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="leading-relaxed font-medium">{generalError}</div>
            </div>
          )}

          {/* Cảnh báo khóa xóa nếu sản phẩm đã phát sinh giao dịch */}
          {isEditMode && initialData?.hasTransactions && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-800 text-xs">
              <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Sản phẩm đã có lịch sử giao dịch:</strong> Sản phẩm này đã phát sinh chứng từ xuất nhập kho hoặc đơn hàng. Bạn có thể cập nhật thông tin hoặc chuyển sang <strong>Ngừng kinh doanh</strong>.
              </div>
            </div>
          )}

          {/* NHÓM 1: THÔNG TIN CHUNG */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs border-b border-slate-200/60 pb-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span>1. Nhóm Thông tin chung</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Mã SKU */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Mã SKU <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("sku")}
                  onChange={(e) => {
                    const formatted = e.target.value.toUpperCase().replace(/\s+/g, "");
                    setValue("sku", formatted, { shouldValidate: true });
                  }}
                  placeholder="VD: LH-MILK-900G"
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-wider uppercase transition-all focus:outline-none focus:ring-2 ${
                    errors.sku
                      ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30 text-rose-900"
                      : "border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white"
                  }`}
                  disabled={isSubmitting}
                />
                {errors.sku && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">
                    {errors.sku.message}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">Mã định danh duy nhất</p>
              </div>

              {/* Tên sản phẩm đầy đủ */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Tên sản phẩm đầy đủ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("name")}
                  placeholder="VD: Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g"
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 ${
                    errors.name
                      ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30 text-rose-900"
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

          {/* NHÓM 2: PHÂN LOẠI & QUY CÁCH */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3.5">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs border-b border-slate-200/60 pb-2">
              <Layers className="h-4 w-4 text-blue-600" />
              <span>2. Nhóm Phân loại & Quy cách</span>
            </div>

            {/* Nhóm hàng Cấp 1 & Cấp 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Nhóm hàng Cấp 1 (Ngành hàng) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={watchedParentCategory}
                  onChange={handleParentCategoryChange}
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
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Nhóm hàng Cấp 2 (Chủng loại) <span className="text-rose-500">*</span>
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

            {/* Đơn vị tính cơ sở & Quy cách đóng gói */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Đơn vị tính cơ sở <span className="text-rose-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    {...register("baseUnit")}
                    placeholder="VD: Lon, Chai, Hộp..."
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all focus:outline-none focus:ring-2 ${
                      errors.baseUnit
                        ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30 text-rose-900"
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
                    className="px-2.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200/80 text-[11px] text-slate-700 font-medium cursor-pointer transition-colors"
                    title="Chọn nhanh ĐVT"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Gợi ý ĐVT
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
                <label className="block font-semibold text-slate-800 mb-1.5">
                  Quy cách đóng gói
                </label>
                <input
                  type="text"
                  {...register("packagingSpec")}
                  placeholder="VD: 24 lon/thùng, 12 hộp/lốc..."
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  disabled={isSubmitting}
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Quy đổi (vd: 24 lon/thùng)
                </p>
              </div>
            </div>
          </div>

          {/* NHÓM 3: GIÁ & TRẠNG THÁI */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span>3. Nhóm Giá & Trạng thái</span>
              </div>
              {canManageCostPrice && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md ring-1 ring-emerald-600/20">
                  <ShieldCheck className="h-3 w-3" />
                  Quyền Quản trị / Quản lý
                </span>
              )}
            </div>

            <div
              className={`grid gap-4 ${
                canManageCostPrice ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {/* Giá vốn (Cost Price): CHỈ HIỂN THỊ KHI canManageCostPrice = true. Ẩn hoàn toàn khỏi DOM nếu là SALES_REP hoặc vai trò khác */}
              {canManageCostPrice && (
                <div>
                  <label className="block font-semibold text-slate-800 mb-1.5">
                    Giá vốn (Cost Price) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      {...register("costPrice")}
                      placeholder="VD: 350000"
                      className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all focus:outline-none focus:ring-2 ${
                        errors.costPrice
                          ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30 text-rose-900"
                          : "border-slate-200 focus:border-emerald-500 focus:ring-emerald-100 bg-white text-emerald-900"
                      }`}
                      disabled={isSubmitting}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none">
                      đ
                    </span>
                  </div>
                  {errors.costPrice && (
                    <p className="text-[11px] text-rose-500 mt-1 font-medium">
                      {String(errors.costPrice.message)}
                    </p>
                  )}
                  {Number(watchedCostPrice) > 0 && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                      {new Intl.NumberFormat("vi-VN", {
                        style: "currency",
                        currency: "VND",
                      }).format(Number(watchedCostPrice))}
                    </p>
                  )}
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
                      watchedStatus === "ACTIVE"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs font-bold ring-1 ring-emerald-400/40"
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
                      watchedStatus === "INACTIVE"
                        ? "border-slate-400 bg-slate-100 text-slate-800 shadow-2xs font-bold ring-1 ring-slate-400/40"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <X className="h-4 w-4 text-slate-500" />
                    <span>Ngừng kinh doanh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* NHÓM 4: HÌNH ẢNH */}
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                <ImageIcon className="h-4 w-4 text-blue-600" />
                <span>4. Nhóm Hình ảnh</span>
              </div>
              <span className="text-[10px] text-slate-400">Ảnh đại diện sản phẩm</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start gap-3.5">
              {/* Khung Thumbnail Preview */}
              <div className="h-20 w-20 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs relative group">
                {watchedImageUrl ? (
                  <img
                    src={watchedImageUrl}
                    alt="Preview sản phẩm"
                    className="h-full w-full object-cover object-center"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-300">
                    <Package className="h-8 w-8" />
                    <span className="text-[9px] mt-0.5 text-slate-400">Chưa có ảnh</span>
                  </div>
                )}
              </div>

              {/* Khu vực Nhập URL / Tải ảnh lên */}
              <div className="flex-1 w-full space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      {...register("imageUrl")}
                      placeholder="Dán liên kết ảnh https://..."
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                      disabled={isSubmitting}
                    />
                    <LinkIcon className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Nút Upload ảnh từ máy tính */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Upload className="h-3.5 w-3.5 text-blue-600" />
                    <span>Chọn tệp</span>
                  </button>
                </div>

                {/* Chọn nhanh ảnh mẫu ngành FMCG */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
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
                      className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 text-[10px] text-slate-600 transition-all cursor-pointer shadow-2xs"
                    >
                      {sample.label}
                    </button>
                  ))}
                  {watchedImageUrl && (
                    <button
                      type="button"
                      onClick={() => setValue("imageUrl", "", { shouldValidate: true })}
                      className="text-[10px] text-rose-500 hover:underline cursor-pointer ml-1"
                    >
                      Xóa ảnh
                    </button>
                  )}
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
            onClick={handleSubmit(onFormSubmit)}
            isLoading={isSubmitting}
            loadingText="Đang lưu sản phẩm..."
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
