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
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Upload,
  FolderTree,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "./button";
import { PRODUCT_CATEGORIES } from "../services/products.service";
import { categoriesService } from "../services/categories.service";
import type { Product, ProductCategory, CreateProductPayload } from "../types/products";

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
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>(PRODUCT_CATEGORIES);
  const [selectedChildCategory, setSelectedChildCategory] = useState<string>("");

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
  const watchedSubCategory = watch("subCategory");
  const selectedStatus = watch("status");
  const watchedCostPrice = watch("costPrice");
  const watchedImageUrl = watch("imageUrl");

  // Tải danh mục động từ Backend khi mount
  useEffect(() => {
    let isMounted = true;
    categoriesService.getCategoryTree().then((tree) => {
      if (isMounted && Array.isArray(tree) && tree.length > 0) {
        const mapTree = (nodes: any[]): ProductCategory[] => {
          return nodes.map((n) => ({
            id: n.id,
            name: n.name,
            code: n.code,
            level: n.level,
            parentId: n.parentId || n.parent_id || null,
            productCount: n.productCount ?? n.product_count ?? 0,
            children: n.children ? mapTree(n.children) : [],
            subCategories: n.children ? mapTree(n.children) : [],
          }));
        };
        setCategoriesList(mapTree(tree));
      }
    }).catch(() => { });
    return () => {
      isMounted = false;
    };
  }, []);

  // Danh sách Cấp 2 tương ứng theo Cấp 1 đã chọn
  const currentCategoryObj =
    categoriesList.find((c) => c.name === selectedParentCategory) || categoriesList[0];
  const availableSubCategories = currentCategoryObj?.subCategories || [];

  // Danh sách Cấp 3 tương ứng theo Cấp 2 đã chọn
  const currentSubCategoryObj =
    availableSubCategories.find((s) => s.name === watchedSubCategory) || availableSubCategories[0];
  const availableChildCategories =
    currentSubCategoryObj?.subCategories || currentSubCategoryObj?.children || [];

  // Reset form khi mở hoặc chuyển đổi dữ liệu
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        let pCat = initialData.parentCategory || "";
        let sCat = initialData.subCategory || "";
        let cCat = "";

        // Nếu chuỗi category có 3 cấp dạng "A / B / C"
        if (initialData.category && initialData.category.includes("/")) {
          const parts = initialData.category.split("/").map((s) => s.trim());
          if (parts.length >= 3) {
            pCat = parts[0];
            sCat = parts[1];
            cCat = parts[2];
          } else if (parts.length === 2) {
            pCat = parts[0];
            sCat = parts[1];
          }
        }

        // Nếu có categoryId, tra cứu vị trí chính xác trong cây
        if (initialData.categoryId && categoriesList.length > 0) {
          for (const parent of categoriesList) {
            if (parent.id === initialData.categoryId) {
              pCat = parent.name;
              break;
            }
            for (const sub of parent.subCategories || []) {
              if (sub.id === initialData.categoryId) {
                pCat = parent.name;
                sCat = sub.name;
                break;
              }
              for (const child of sub.subCategories || []) {
                if (child.id === initialData.categoryId) {
                  pCat = parent.name;
                  sCat = sub.name;
                  cCat = child.name;
                  break;
                }
              }
            }
          }
        }

        const fallbackPCat = pCat || categoriesList[0]?.name || "Sữa & Chế phẩm sữa";
        const parentNode = categoriesList.find((c) => c.name === fallbackPCat) || categoriesList[0];
        const fallbackSCat =
          sCat || parentNode?.subCategories?.[0]?.name || "";

        setSelectedChildCategory(cCat);
        reset({
          sku: initialData.sku || "",
          name: initialData.name || "",
          parentCategory: fallbackPCat,
          subCategory: fallbackSCat,
          baseUnit: initialData.baseUnit || "Lon",
          packagingSpec: initialData.packagingSpec || "",
          costPrice: canManageCostPrice ? (initialData.costPrice ?? 0) : undefined,
          status: initialData.status || "ACTIVE",
          imageUrl: initialData.imageUrl || "",
        });
      } else {
        const defaultPCat = categoriesList[0]?.name || "Sữa & Chế phẩm sữa";
        const defaultSubCat =
          categoriesList[0]?.subCategories?.[0]?.name || "";
        const defaultChildCat =
          categoriesList[0]?.subCategories?.[0]?.subCategories?.[0]?.name || "";

        setSelectedChildCategory(defaultChildCat);
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
  }, [initialData, isOpen, canManageCostPrice, reset, categoriesList]);

  // Xử lý đổi Cấp 1 -> cập nhật Cấp 2 và Cấp 3 tự động
  const handleParentCategoryChange = (newParent: string) => {
    setValue("parentCategory", newParent, { shouldValidate: true });
    const cat = categoriesList.find((c) => c.name === newParent);
    if (cat?.subCategories && cat.subCategories.length > 0) {
      const firstSub = cat.subCategories[0];
      setValue("subCategory", firstSub.name, { shouldValidate: true });
      if (firstSub.subCategories && firstSub.subCategories.length > 0) {
        setSelectedChildCategory(firstSub.subCategories[0].name);
      } else {
        setSelectedChildCategory("");
      }
    } else {
      setValue("subCategory", "", { shouldValidate: true });
      setSelectedChildCategory("");
    }
  };

  // Xử lý đổi Cấp 2 -> cập nhật Cấp 3 tự động
  const handleSubCategoryChange = (newSub: string) => {
    setValue("subCategory", newSub, { shouldValidate: true });
    const sub = availableSubCategories.find((s) => s.name === newSub);
    if (sub?.subCategories && sub.subCategories.length > 0) {
      setSelectedChildCategory(sub.subCategories[0].name);
    } else {
      setSelectedChildCategory("");
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

  // Tăng / giảm giá vốn nhanh (bước nhảy 1.000đ)
  const handleStepCostPrice = (delta: number) => {
    const current = Number(watchedCostPrice) || 0;
    const next = Math.max(0, current + delta);
    setValue("costPrice", next, { shouldValidate: true, shouldDirty: true });
  };

  // Xử lý submit hợp lệ
  const onValidSubmit = async (formData: ProductFormValues) => {
    try {
      setFormServerError(null);
      const cleanSku = formData.sku.trim().toUpperCase().replace(/\s+/g, "");

      // Xác định chính xác leaf node và categoryId
      let targetCategoryId = "";
      let fullCategory = "";
      let finalSub = formData.subCategory;

      const parentObj = categoriesList.find((c) => c.name === formData.parentCategory);
      const subObj = parentObj?.subCategories?.find((s) => s.name === formData.subCategory);
      const childObj = subObj?.subCategories?.find((ch) => ch.name === selectedChildCategory);

      if (childObj && selectedChildCategory) {
        targetCategoryId = childObj.id;
        fullCategory = `${formData.parentCategory} / ${formData.subCategory} / ${selectedChildCategory}`;
        finalSub = selectedChildCategory;
      } else if (subObj) {
        targetCategoryId = subObj.id;
        fullCategory = `${formData.parentCategory} / ${formData.subCategory}`;
        finalSub = formData.subCategory;
      } else if (parentObj) {
        targetCategoryId = parentObj.id;
        fullCategory = formData.parentCategory;
        finalSub = formData.parentCategory;
      }

      const payload: CreateProductPayload = {
        sku: cleanSku,
        name: formData.name.trim(),
        categoryId: targetCategoryId || initialData?.categoryId,
        parentCategory: formData.parentCategory,
        subCategory: finalSub,
        category: fullCategory,
        baseUnit: formData.baseUnit.trim(),
        packagingSpec: formData.packagingSpec?.trim() || "",
        price: initialData?.price ?? (canManageCostPrice ? Number(formData.costPrice || 0) : 0),
        costPrice: canManageCostPrice ? Number(formData.costPrice) : undefined,
        status: formData.status,
        imageUrl: formData.imageUrl?.trim() || undefined,
        stockQuantity: initialData ? initialData.stockQuantity : undefined,
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
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs ${isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
        }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${isClosing ? "animate-modal-out" : "animate-modal-in"
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
                    onChange: (e) => {
                      const clean = e.target.value
                        .toUpperCase()
                        .replace(/\s+/g, "");
                      setValue("sku", clean, { shouldValidate: true });
                    },
                  })}
                  placeholder="VD: LH-MILK-900G"
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-wider uppercase transition-all focus:outline-none focus:ring-2 ${errors.sku
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
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 ${errors.name
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

            {/* Hàng: Phân cấp Danh mục Nhóm hàng (Cấp 1 > Cấp 2 > Cấp 3) */}
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-3">
              <div
                className={`grid grid-cols-1 ${availableChildCategories.length > 0 ? "md:grid-cols-3" : "md:grid-cols-2"
                  } gap-3 sm:gap-4 items-start`}
              >
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-800 mb-1.5 h-5 truncate" title="Nhóm hàng Cấp 1 (Nhóm chính)">
                    <span>Cấp 1 - Nhóm chính</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={selectedParentCategory}
                    onChange={(e) => handleParentCategoryChange(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none cursor-pointer"
                    disabled={isSubmitting}
                  >
                    {categoriesList.map((cat) => (
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
                  <label className="flex items-center gap-1 text-xs font-semibold text-slate-800 mb-1.5 h-5 truncate" title="Nhóm hàng Cấp 2 (Nhóm phụ)">
                    <span>Cấp 2 - Nhóm phụ</span>
                    <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    value={watchedSubCategory}
                    onChange={(e) => handleSubCategoryChange(e.target.value)}
                    className="w-full h-10 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none cursor-pointer"
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

                {availableChildCategories.length > 0 && (
                  <div>
                    <label className="flex items-center gap-1 text-xs font-semibold text-slate-800 mb-1.5 h-5 truncate" title="Phân loại con Cấp 3 (Chi tiết)">
                      <span>Cấp 3 - Phân loại con</span>
                      <span className="text-blue-600 font-normal text-[11px]">(Chi tiết)</span>
                    </label>
                    <select
                      value={selectedChildCategory}
                      onChange={(e) => setSelectedChildCategory(e.target.value)}
                      className="w-full h-10 px-3 py-2 rounded-xl border border-blue-200 bg-white text-xs font-medium text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none cursor-pointer"
                      disabled={isSubmitting}
                    >
                      <option value="">-- Mặc định theo Cấp 2 --</option>
                      {availableChildCategories.map((child) => (
                        <option key={child.id} value={child.name}>
                          {child.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Breadcrumb trực quan xác nhận nhánh sản phẩm trên cây */}
              <div className="flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-50/70 px-3 py-2 rounded-lg border border-blue-100">
                <FolderTree className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Nhánh lưu trên Cây danh mục:</span>
                <span className="font-bold text-slate-900 truncate">
                  {selectedParentCategory}
                  {watchedSubCategory && ` → ${watchedSubCategory}`}
                  {selectedChildCategory && ` → ${selectedChildCategory}`}
                </span>
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
                    className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 ${errors.baseUnit
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
              className={`grid gap-4 ${canManageCostPrice ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
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

                  <div className="relative group">
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      {...register("costPrice")}
                      placeholder="Nhập giá vốn sản phẩm"
                      className={`w-full pl-3.5 pr-16 py-2.5 rounded-xl border text-xs font-semibold text-emerald-900 focus:outline-none focus:ring-2 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all ${errors.costPrice
                          ? "border-rose-300 focus:ring-rose-200 bg-rose-50/30"
                          : "border-slate-200 bg-white focus:border-emerald-500 focus:ring-emerald-100"
                        }`}
                      disabled={isSubmitting}
                    />

                    {/* Bộ nút tăng/giảm giá vốn: Chỉ hiện khi hover hoặc focus vào ô và không đè lên chữ đ */}
                    <div className="absolute right-8 inset-y-1.5 flex items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150">
                      <div className="flex flex-col border border-slate-200/90 rounded-md bg-white shadow-2xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => handleStepCostPrice(1000)}
                          className="h-3.5 w-5 flex items-center justify-center text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 border-b border-slate-100 transition-colors cursor-pointer"
                          title="Tăng 1.000đ"
                        >
                          <ChevronUp className="h-3 w-3 stroke-[2.5]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStepCostPrice(-1000)}
                          className="h-3.5 w-5 flex items-center justify-center text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors cursor-pointer"
                          title="Giảm 1.000đ"
                        >
                          <ChevronDown className="h-3 w-3 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>

                    {/* Ký hiệu đơn vị tiền tệ 'đ' cố định riêng biệt không bị đè */}
                    <div className="absolute right-3.5 inset-y-0 flex items-center pointer-events-none">
                      <span className="text-xs font-bold text-slate-400 select-none">
                        đ
                      </span>
                    </div>
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
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${selectedStatus === "ACTIVE"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs ring-1 ring-emerald-500/20"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                      }`}
                  >
                    <CheckCircle2
                      className={`h-4 w-4 ${
                        selectedStatus === "ACTIVE" ? "text-emerald-600" : "text-slate-400"
                      }`}
                    />
                    <span>Đang kinh doanh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setValue("status", "INACTIVE", { shouldValidate: true })}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${selectedStatus === "INACTIVE"
                        ? "border-rose-400 bg-rose-50 text-rose-700 shadow-xs font-bold ring-2 ring-rose-200"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                      }`}
                  >
                    <XCircle
                      className={`h-4 w-4 ${
                        selectedStatus === "INACTIVE" ? "text-rose-600" : "text-slate-400"
                      }`}
                    />
                    <span>Ngừng kinh doanh</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                  <span>Trạng thái:</span>
                  {selectedStatus === "ACTIVE" ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Đang kinh doanh
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-bold text-rose-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                      Tạm ngừng kinh doanh
                    </span>
                  )}
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
