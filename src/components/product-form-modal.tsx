import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
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
  Scale,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from './button';
import { ModalLayout } from './modal-layout';
import { ConfirmDialog } from './confirm-dialog';
import { CurrencyInput } from './currency-input';
import { PRODUCT_CATEGORIES } from '../services/products.service';
import { categoriesService } from '../services/categories.service';
import type {
  Product,
  ProductCategory,
  CreateProductPayload,
  ProductUnit,
} from '../types/products';

export interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductPayload) => Promise<void>;
  initialData?: Product | null;
  canManageCostPrice: boolean; // Chỉ ADMIN hoặc SALES_MANAGER
}

// Danh sách gợi ý ĐVT cơ sở phổ biến FMCG
const COMMON_UNITS = ['Lon', 'Hộp', 'Hũ', 'Chai', 'Túi', 'Gói', 'Lọ', 'Cái', 'Thùng'];

// Danh sách ảnh mẫu FMCG chất lượng cao để chọn nhanh
const SAMPLE_IMAGES = [
  {
    label: 'Sữa bột',
    url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Sữa hạt',
    url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Nước yến',
    url: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Ngũ cốc',
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Collagen',
    url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300&auto=format&fit=crop&q=80',
  },
  {
    label: 'Nước khoáng',
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=300&auto=format&fit=crop&q=80',
  },
];

export interface ProductFormValues {
  sku: string;
  name: string;
  parentCategory: string;
  subCategory: string;
  baseUnit: string;
  packagingSpec?: string;
  price?: number;
  costPrice?: number;
  status: 'ACTIVE' | 'INACTIVE';
  imageUrl?: string;
}

// Khởi tạo Schema Validation bằng Zod
const productSchema = z.object({
  sku: z
    .string()
    .min(1, 'Mã SKU bắt buộc phải nhập')
    .regex(
      /^[A-Z0-9_-]+$/,
      'Mã SKU chỉ bao gồm chữ in HOA, số và dấu gạch ngang (không khoảng trắng)'
    ),
  name: z
    .string()
    .min(1, 'Tên sản phẩm bắt buộc phải nhập')
    .min(3, 'Tên sản phẩm phải có ít nhất 3 ký tự'),
  parentCategory: z.string().min(1, 'Vui lòng chọn nhóm hàng Cấp 1'),
  subCategory: z.string().min(1, 'Vui lòng chọn nhóm hàng Cấp 2'),
  baseUnit: z.string().min(1, 'Đơn vị tính cơ sở bắt buộc phải nhập'),
  packagingSpec: z.string().optional(),
  price: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0, 'Giá niêm yết không được là số âm').optional()
  ),
  costPrice: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0, 'Giá vốn không được là số âm').optional()
  ),
  status: z.enum(['ACTIVE', 'INACTIVE']),
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
  const [selectedChildCategory, setSelectedChildCategory] = useState<string>('');

  // Quản lý danh sách đơn vị quy đổi (SN-23 AC-1)
  const [conversionUnits, setConversionUnits] = useState<
    Array<{ unitName: string; conversionRate: number }>
  >([]);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitRate, setNewUnitRate] = useState<number | ''>('');
  const [unitError, setUnitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      sku: '',
      name: '',
      parentCategory: PRODUCT_CATEGORIES[0].name,
      subCategory: PRODUCT_CATEGORIES[0].subCategories?.[0]?.name || '',
      baseUnit: 'Lon',
      packagingSpec: '',
      price: 0,
      costPrice: canManageCostPrice ? 0 : undefined,
      status: 'ACTIVE',
      imageUrl: '',
    },
    mode: 'onChange',
  });

  const selectedParentCategory = watch('parentCategory');
  const watchedSubCategory = watch('subCategory');
  const selectedStatus = watch('status');
  const watchedPrice = watch('price');
  const watchedCostPrice = watch('costPrice');
  const watchedImageUrl = watch('imageUrl');

  // Tải danh mục động từ Backend khi mount
  useEffect(() => {
    let isMounted = true;
    categoriesService
      .getCategoryTree()
      .then((tree) => {
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
      })
      .catch(() => {});
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
        let pCat = initialData.parentCategory || '';
        let sCat = initialData.subCategory || '';
        let cCat = '';

        // Nếu chuỗi category có 3 cấp dạng "A / B / C"
        if (initialData.category && initialData.category.includes('/')) {
          const parts = initialData.category.split('/').map((s) => s.trim());
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

        const fallbackPCat = pCat || categoriesList[0]?.name || 'Sữa & Chế phẩm sữa';
        const parentNode = categoriesList.find((c) => c.name === fallbackPCat) || categoriesList[0];
        const fallbackSCat = sCat || parentNode?.subCategories?.[0]?.name || '';

        setSelectedChildCategory(cCat);
        reset({
          sku: initialData.sku || '',
          name: initialData.name || '',
          parentCategory: fallbackPCat,
          subCategory: fallbackSCat,
          baseUnit: initialData.baseUnit || 'Lon',
          packagingSpec: initialData.packagingSpec || '',
          price: initialData.price ?? 0,
          costPrice: canManageCostPrice ? (initialData.costPrice ?? 0) : undefined,
          status: initialData.status || 'ACTIVE',
          imageUrl: initialData.imageUrl || '',
        });

        if (initialData.units && Array.isArray(initialData.units)) {
          const currentBase = (initialData.baseUnit || 'Lon').trim().toLowerCase();
          const convs = initialData.units
            .filter((u) => !u.isBaseUnit && u.unitName.trim().toLowerCase() !== currentBase)
            .map((u) => ({ unitName: u.unitName, conversionRate: u.conversionRate }));
          setConversionUnits(convs);
        } else {
          setConversionUnits([]);
        }
        setNewUnitName('');
        setNewUnitRate('');
        setUnitError(null);
      } else {
        const defaultPCat = categoriesList[0]?.name || 'Sữa & Chế phẩm sữa';
        const defaultSubCat = categoriesList[0]?.subCategories?.[0]?.name || '';
        const defaultChildCat =
          categoriesList[0]?.subCategories?.[0]?.subCategories?.[0]?.name || '';

        setSelectedChildCategory(defaultChildCat);
        reset({
          sku: '',
          name: '',
          parentCategory: defaultPCat,
          subCategory: defaultSubCat,
          baseUnit: 'Lon',
          packagingSpec: '',
          price: 0,
          costPrice: canManageCostPrice ? 0 : undefined,
          status: 'ACTIVE',
          imageUrl: '',
        });
        setConversionUnits([]);
        setNewUnitName('');
        setNewUnitRate('');
        setUnitError(null);
      }
      setFormServerError(null);
    }
  }, [initialData, isOpen, canManageCostPrice, reset, categoriesList]);

  // Xử lý đổi Cấp 1 -> cập nhật Cấp 2 và Cấp 3 tự động
  const handleParentCategoryChange = (newParent: string) => {
    setValue('parentCategory', newParent, { shouldValidate: true });
    const cat = categoriesList.find((c) => c.name === newParent);
    if (cat?.subCategories && cat.subCategories.length > 0) {
      const firstSub = cat.subCategories[0];
      setValue('subCategory', firstSub.name, { shouldValidate: true });
      if (firstSub.subCategories && firstSub.subCategories.length > 0) {
        setSelectedChildCategory(firstSub.subCategories[0].name);
      } else {
        setSelectedChildCategory('');
      }
    } else {
      setValue('subCategory', '', { shouldValidate: true });
      setSelectedChildCategory('');
    }
  };

  // Xử lý đổi Cấp 2 -> cập nhật Cấp 3 tự động
  const handleSubCategoryChange = (newSub: string) => {
    setValue('subCategory', newSub, { shouldValidate: true });
    const sub = availableSubCategories.find((s) => s.name === newSub);
    if (sub?.subCategories && sub.subCategories.length > 0) {
      setSelectedChildCategory(sub.subCategories[0].name);
    } else {
      setSelectedChildCategory('');
    }
  };

  // Upload file ảnh cục bộ và convert sang base64 preview
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setValue('imageUrl', event.target.result as string, { shouldValidate: true });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const isFormDirty = isDirty || units.length > 0;

  // Đóng modal kèm animation mượt mà
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  }, [isClosing, onClose]);

  const handleCancelClick = () => {
    if (isFormDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    handleClose();
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  // Quản lý đơn vị quy đổi (SN-23 AC-1)
  const handleAddConversionUnit = () => {
    const name = newUnitName.trim();
    const rate = Number(newUnitRate);
    const currentBase = (watch('baseUnit') || 'Lon').trim();

    if (!name) {
      setUnitError('Vui lòng nhập tên đơn vị quy đổi (vd: Lốc, Thùng)');
      return;
    }
    if (!rate || rate <= 1) {
      setUnitError('Hệ số quy đổi phải lớn hơn 1 đơn vị cơ sở');
      return;
    }
    if (name.toLowerCase() === currentBase.toLowerCase()) {
      setUnitError(`Tên đơn vị quy đổi không được trùng với ĐVT cơ sở (${currentBase})`);
      return;
    }
    if (conversionUnits.some((u) => u.unitName.toLowerCase() === name.toLowerCase())) {
      setUnitError(`Đơn vị "${name}" đã có trong danh sách quy đổi`);
      return;
    }

    setConversionUnits((prev) => [...prev, { unitName: name, conversionRate: rate }]);
    setNewUnitName('');
    setNewUnitRate('');
    setUnitError(null);
  };

  const handleRemoveConversionUnit = (index: number) => {
    setConversionUnits((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickAddUnit = (name: string, defaultRate: number) => {
    setNewUnitName(name);
    setNewUnitRate(defaultRate);
    setUnitError(null);
  };

  // Xử lý submit hợp lệ
  const onValidSubmit = async (formData: ProductFormValues) => {
    try {
      setFormServerError(null);
      const cleanSku = formData.sku.trim().toUpperCase().replace(/\s+/g, '');

      // Xác định chính xác leaf node và categoryId
      let targetCategoryId = '';
      let fullCategory = '';
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

      // Chuẩn hóa toàn bộ danh sách đơn vị (BaseUnit + ConversionUnits)
      const baseUnitName = formData.baseUnit.trim();
      const allUnits: ProductUnit[] = [
        {
          unitName: baseUnitName,
          conversionRate: 1,
          isBaseUnit: true,
        },
        ...conversionUnits.map((u) => ({
          unitName: u.unitName.trim(),
          conversionRate: Number(u.conversionRate),
          isBaseUnit: false,
        })),
      ];

      const payload: CreateProductPayload = {
        sku: cleanSku,
        name: formData.name.trim(),
        categoryId: targetCategoryId || initialData?.categoryId,
        parentCategory: formData.parentCategory,
        subCategory: finalSub,
        category: fullCategory,
        baseUnit: formData.baseUnit.trim(),
        packagingSpec: formData.packagingSpec?.trim() || '',
        price: Number(formData.price ?? initialData?.price ?? 0),
        costPrice: canManageCostPrice
          ? formData.costPrice !== undefined
            ? Number(formData.costPrice)
            : undefined
          : undefined,
        status: formData.status,
        imageUrl: formData.imageUrl?.trim() || undefined,
        stockQuantity: initialData ? initialData.stockQuantity : undefined,
        units: allUnits,
      };

      await onSubmit(payload);
      handleClose();
    } catch (err: unknown) {
      const error = err as Error;
      setFormServerError(error.message || 'Không thể lưu thông tin sản phẩm. Vui lòng thử lại!');
    }
  };

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={handleClose}
      closeOnOverlayClick={false}
      isDirty={isFormDirty}
      dirtyPromptMessage="Thông tin sản phẩm đang nhập dở chưa được lưu. Bạn có chắc chắn muốn thoát và bỏ các thay đổi?"
      title={isEditMode ? 'Cập nhật Thông tin Sản phẩm (SKU)' : 'Thêm mới Sản phẩm (SKU)'}
      subtitle={
        isEditMode
          ? `Mã định danh SKU: ${initialData?.sku}`
          : 'Chuẩn hóa thông tin SKU hàng hóa phân phối'
      }
      icon={<Package className="h-5 w-5" />}
      maxWidth="max-w-2xl"
      bodyClassName="p-4 sm:p-6 space-y-4 sm:space-y-5 text-xs text-slate-700"
      footer={
        <div className="flex items-center justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelClick}
            disabled={isSubmitting}
            className="flex-1 sm:flex-initial py-2.5 sm:py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Hủy bỏ
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit(onValidSubmit)}
            isLoading={isSubmitting}
            loadingText="Đang lưu..."
            className="flex-1 sm:flex-initial py-2.5 sm:py-2 px-5 rounded-xl text-xs font-semibold cursor-pointer shadow-xs hover:shadow-sm"
          >
            {isEditMode ? 'Cập nhật sản phẩm' : 'Lưu vào danh mục'}
          </Button>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit(onValidSubmit)}
        className="space-y-4 sm:space-y-5 text-xs text-slate-700 pb-2"
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
                {...register('sku', {
                  onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                    const clean = e.target.value.toUpperCase().replace(/\s+/g, '');
                    setValue('sku', clean, { shouldValidate: true });
                  },
                })}
                placeholder="VD: LH-MILK-900G"
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-wider uppercase transition-all focus:outline-none focus:ring-2 ${
                  errors.sku
                    ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white'
                }`}
                disabled={isSubmitting}
              />
              {errors.sku && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.sku.message}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-1">Mã định danh duy nhất</p>
            </div>

            {/* Tên sản phẩm đầy đủ */}
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Tên sản phẩm đầy đủ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="VD: Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g"
                className={`w-full px-3 py-2.5 rounded-xl border text-xs transition-all focus:outline-none focus:ring-2 ${
                  errors.name
                    ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white font-medium'
                }`}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.name.message}</p>
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
              className={`grid grid-cols-1 ${
                availableChildCategories.length > 0 ? 'md:grid-cols-3' : 'md:grid-cols-2'
              } gap-3 sm:gap-4 items-start`}
            >
              <div>
                <label
                  className="flex items-center gap-1 text-xs font-semibold text-slate-800 mb-1.5 h-5 truncate"
                  title="Nhóm hàng Cấp 1 (Nhóm chính)"
                >
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
                <label
                  className="flex items-center gap-1 text-xs font-semibold text-slate-800 mb-1.5 h-5 truncate"
                  title="Nhóm hàng Cấp 2 (Nhóm phụ)"
                >
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
                  <label
                    className="flex items-center gap-1 text-xs font-semibold text-slate-800 mb-1.5 h-5 truncate"
                    title="Phân loại con Cấp 3 (Chi tiết)"
                  >
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
                  {...register('baseUnit')}
                  placeholder="VD: Lon, Chai, Hộp..."
                  className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-medium focus:outline-none focus:ring-2 ${
                    errors.baseUnit
                      ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                      : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100 bg-white'
                  }`}
                  disabled={isSubmitting}
                />
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      setValue('baseUnit', e.target.value, { shouldValidate: true });
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
              <label className="block font-semibold text-slate-800 mb-1">Quy cách đóng gói</label>
              <input
                type="text"
                {...register('packagingSpec')}
                placeholder="VD: 24 lon/thùng, 12 hộp/lốc..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                disabled={isSubmitting}
              />
              <p className="text-[10px] text-slate-400 mt-1">Quy đổi (vd: 24 lon/thùng)</p>
            </div>
          </div>

          {/* Đơn vị quy đổi kho (Lon / Lốc / Thùng) - SN-23 AC-1 */}
          <div className="p-3.5 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">
                  Khai báo đơn vị tính quy đổi kho (Lon / Lốc / Thùng)
                </span>
              </div>
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md inline-block self-start sm:self-auto">
                Tự động quy về ĐVT cơ sở: {watch('baseUnit') || 'Lon'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Nhập xuất theo Thùng, Lốc nhưng sổ kho và thẻ kho luôn quy đổi chính xác theo đơn vị
              cơ sở ({watch('baseUnit') || 'Lon'}).
            </p>

            {/* Danh sách các đơn vị quy đổi hiện tại */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {/* Đơn vị cơ sở luôn hiển thị cố định */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>
                  1 {watch('baseUnit') || 'Lon'} = 1 {watch('baseUnit') || 'Lon'}
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-1 rounded font-semibold">
                  (Cơ sở)
                </span>
              </div>

              {conversionUnits.map((u, idx) => (
                <div
                  key={`${u.unitName}-${idx}`}
                  className="inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-blue-200 text-blue-900 text-xs font-semibold rounded-lg shadow-2xs group"
                >
                  <span>
                    1 {u.unitName} = {u.conversionRate} {watch('baseUnit') || 'Lon'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveConversionUnit(idx)}
                    className="btn-icon text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Xóa đơn vị quy đổi này"
                    disabled={isSubmitting}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Thêm nhanh gợi ý phổ biến */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium">Gợi ý nhanh:</span>
              <button
                type="button"
                onClick={() => handleQuickAddUnit('Lốc', 6)}
                className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 rounded-md transition-colors cursor-pointer"
              >
                + Lốc (x6)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddUnit('Lốc', 4)}
                className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 rounded-md transition-colors cursor-pointer"
              >
                + Lốc (x4)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddUnit('Thùng', 24)}
                className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 rounded-md transition-colors cursor-pointer"
              >
                + Thùng (x24)
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddUnit('Thùng', 30)}
                className="px-2 py-0.5 text-[11px] font-medium bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 rounded-md transition-colors cursor-pointer"
              >
                + Thùng (x30)
              </button>
            </div>

            {/* Form thêm đơn vị quy đổi mới */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1 items-start sm:items-center">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  placeholder="Tên đơn vị (vd: Thùng, Lốc)"
                  value={newUnitName}
                  onChange={(e) => {
                    setNewUnitName(e.target.value);
                    if (unitError) setUnitError(null);
                  }}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                />
              </div>
              <div className="w-full sm:w-48 flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap">=</span>
                <input
                  type="number"
                  min="2"
                  step="1"
                  placeholder="Hệ số (vd: 24)"
                  value={newUnitRate}
                  onChange={(e) => {
                    setNewUnitRate(e.target.value === '' ? '' : Number(e.target.value));
                    if (unitError) setUnitError(null);
                  }}
                  disabled={isSubmitting}
                  className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none"
                />
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                  {watch('baseUnit') || 'Lon'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddConversionUnit}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm</span>
              </button>
            </div>
            {unitError && <p className="text-[11px] text-rose-500 font-medium">{unitError}</p>}
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
              canManageCostPrice ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'
            }`}
          >
            {/* Ô Giá niêm yết (Giá bán cơ sở của SKU) */}
            <div className="p-3.5 rounded-xl bg-blue-50/30 border border-blue-100/80">
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span>
                    Giá niêm yết <span className="text-rose-500">*</span>
                  </span>
                </label>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md ring-1 ring-blue-600/20">
                  Giá bán chuẩn
                </span>
              </div>

              <CurrencyInput
                value={watchedPrice}
                onChange={(val) =>
                  setValue('price', val, { shouldValidate: true, shouldDirty: true })
                }
                placeholder="0"
                disabled={isSubmitting}
                showWordsBadge={true}
                className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold text-blue-900 focus:outline-none focus:ring-2 bg-white transition-all ${
                  errors.price
                    ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
              />

              {errors.price && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">{errors.price.message}</p>
              )}
              <p className="text-[10px] text-slate-400 mt-1">
                Giá bán cơ sở trước chiết khấu bảng giá
              </p>
            </div>

            {/* RÀNG BUỘC UI QUAN TRỌNG: Giá vốn CHỈ render khi canManageCostPrice = true (ADMIN hoặc SALES_MANAGER) */}
            {canManageCostPrice && (
              <div className="p-3.5 rounded-xl bg-emerald-50/30 border border-emerald-100/80">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>
                      Giá vốn (Cost Price) <span className="text-rose-500">*</span>
                    </span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md ring-1 ring-emerald-600/20">
                    <ShieldCheck className="h-3 w-3" />
                    Quyền Quản lý
                  </span>
                </div>

                <CurrencyInput
                  value={watchedCostPrice}
                  onChange={(val) =>
                    setValue('costPrice', val, { shouldValidate: true, shouldDirty: true })
                  }
                  placeholder="0"
                  disabled={isSubmitting}
                  showWordsBadge={true}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold text-emerald-900 focus:outline-none focus:ring-2 bg-white transition-all ${
                    errors.costPrice
                      ? 'border-rose-300 focus:ring-rose-200 bg-rose-50/30'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
                  }`}
                />

                {errors.costPrice && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">
                    {errors.costPrice.message}
                  </p>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Giá nhập vốn (chỉ Quản lý được thấy)
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
                  onClick={() => setValue('status', 'ACTIVE', { shouldValidate: true })}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    selectedStatus === 'ACTIVE'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-2xs ring-1 ring-emerald-500/20'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <CheckCircle2
                    className={`h-4 w-4 ${
                      selectedStatus === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span>Đang kinh doanh</span>
                </button>

                <button
                  type="button"
                  onClick={() => setValue('status', 'INACTIVE', { shouldValidate: true })}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    selectedStatus === 'INACTIVE'
                      ? 'border-rose-400 bg-rose-50 text-rose-700 shadow-xs font-bold ring-2 ring-rose-200'
                      : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <XCircle
                    className={`h-4 w-4 ${
                      selectedStatus === 'INACTIVE' ? 'text-rose-600' : 'text-slate-400'
                    }`}
                  />
                  <span>Ngừng kinh doanh</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                <span>Trạng thái:</span>
                {selectedStatus === 'ACTIVE' ? (
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
                      (e.target as HTMLElement).style.display = 'none';
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
                    {...register('imageUrl')}
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
                      onClick={() => setValue('imageUrl', sample.url, { shouldValidate: true })}
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

      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          handleClose();
        }}
        title="Bỏ thay đổi sản phẩm?"
        message="Thông tin sản phẩm đang nhập dở chưa được lưu. Bạn có chắc chắn muốn thoát và hủy bỏ các thay đổi?"
        confirmText="Rời khỏi & Bỏ thay đổi"
        cancelText="Tiếp tục chỉnh sửa"
        type="warning"
      />
    </ModalLayout>
  );
};
