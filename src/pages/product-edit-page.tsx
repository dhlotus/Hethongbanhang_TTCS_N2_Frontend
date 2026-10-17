import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Save,
  RotateCcw,
  Upload,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  FolderTree,
  DollarSign,
  Scale,
  CalendarClock,
  Power,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { productsService, PRODUCT_CATEGORIES } from '../services/products.service';
import { categoriesService } from '../services/categories.service';
import { CurrencyInput } from '../components/currency-input';
import { showToast } from '../components/toast';
import { tokenStorage } from '../utils/token-storage';
import type {
  Product,
  ProductCategory,
  ProductUnit,
  UpdateProductPayload,
} from '../types/products';

// Định dạng tiền tệ VND chuẩn hệ thống
const formatCurrency = (val?: number | null): string => {
  if (val === undefined || val === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

// Gợi ý ĐVT cơ sở phổ biến
const COMMON_UNITS = ['Lon', 'Hộp', 'Hũ', 'Chai', 'Túi', 'Gói', 'Lọ', 'Cái', 'Thùng'];

export const ProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Quyền hạn
  const currentUser = tokenStorage.getUser();
  const currentRoles = (currentUser?.roles || []) as string[];
  const canManageCostPrice =
    currentRoles.includes('ADMIN') || currentRoles.includes('SALES_MANAGER');
  const canManageProducts =
    canManageCostPrice || currentRoles.includes('BUSINESS_MANAGER');

  // Trạng thái dữ liệu
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');
  const [formError, setFormError] = useState<string>('');

  // Danh mục cây
  const [categoriesList, setCategoriesList] = useState<ProductCategory[]>(PRODUCT_CATEGORIES);

  // Form Fields
  const [sku, setSku] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [parentCategory, setParentCategory] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');
  const [childCategory, setChildCategory] = useState<string>('');
  const [baseUnit, setBaseUnit] = useState<string>('Lon');
  const [price, setPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [isBatchManaged, setIsBatchManaged] = useState<boolean>(true);
  const [imageUrl, setImageUrl] = useState<string>('');

  // Đơn vị quy đổi
  const [conversionUnits, setConversionUnits] = useState<
    Array<{ unitName: string; conversionRate: number }>
  >([]);
  const [newUnitName, setNewUnitName] = useState<string>('');
  const [newUnitRate, setNewUnitRate] = useState<number | ''>('');
  const [unitError, setUnitError] = useState<string>('');

  // Tải danh mục đa cấp
  useEffect(() => {
    let isMounted = true;
    categoriesService
      .getCategoryTree()
      .then((tree) => {
        if (isMounted && Array.isArray(tree) && tree.length > 0) {
          setCategoriesList(tree);
        }
      })
      .catch(() => {
        // Fallback default categories
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Tải thông tin sản phẩm
  const loadProductData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setLoadError('');
      const data = await productsService.getProductById(id);
      setProduct(data);

      setSku(data.sku || '');
      setName(data.name || '');
      setBaseUnit(data.baseUnit || 'Lon');
      setPrice(data.price || 0);
      setCostPrice(data.costPrice);
      setStatus(data.status || 'ACTIVE');
      setIsBatchManaged(data.isBatchManaged !== undefined ? data.isBatchManaged : true);
      setImageUrl(data.imageUrl || '');

      // Phân tích ngành hàng
      let pCat = data.parentCategory || '';
      let sCat = data.subCategory || '';
      let cCat = '';

      if (data.category && data.category.includes('/')) {
        const parts = data.category.split('/').map((s) => s.trim());
        if (parts.length >= 3) {
          pCat = parts[0];
          sCat = parts[1];
          cCat = parts[2];
        } else if (parts.length === 2) {
          pCat = parts[0];
          sCat = parts[1];
        }
      }

      setParentCategory(pCat || 'Sữa & Chế phẩm sữa');
      setSubCategory(sCat);
      setChildCategory(cCat);

      // Đơn vị quy đổi
      if (data.units && Array.isArray(data.units)) {
        const currentBase = (data.baseUnit || 'Lon').trim().toLowerCase();
        const convs = data.units
          .filter((u) => !u.isBaseUnit && u.unitName.trim().toLowerCase() !== currentBase)
          .map((u) => ({ unitName: u.unitName, conversionRate: u.conversionRate }));
        setConversionUnits(convs);
      }
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : 'Không thể tải thông tin sản phẩm từ máy chủ'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  // Danh sách Cấp 2 tương ứng Cấp 1 đã chọn
  const availableSubCategories = useMemo(() => {
    const parent = categoriesList.find((c) => c.name === parentCategory);
    return parent?.subCategories || parent?.children || [];
  }, [categoriesList, parentCategory]);

  // Danh sách Cấp 3 tương ứng Cấp 2 đã chọn
  const availableChildCategories = useMemo(() => {
    const sub = availableSubCategories.find((s) => s.name === subCategory);
    return sub?.subCategories || sub?.children || [];
  }, [availableSubCategories, subCategory]);

  // Xử lý đổi nhóm Cấp 1
  const handleParentCategoryChange = (newParent: string) => {
    setParentCategory(newParent);
    const cat = categoriesList.find((c) => c.name === newParent);
    const catSubs = cat?.subCategories || cat?.children;
    if (catSubs && catSubs.length > 0) {
      const firstSub = catSubs[0];
      setSubCategory(firstSub.name);
      const subChildren = firstSub.subCategories || firstSub.children;
      if (subChildren && subChildren.length > 0) {
        setChildCategory(subChildren[0].name);
      } else {
        setChildCategory('');
      }
    } else {
      setSubCategory('');
      setChildCategory('');
    }
  };

  // Xử lý đổi nhóm Cấp 2
  const handleSubCategoryChange = (newSub: string) => {
    setSubCategory(newSub);
    const sub = availableSubCategories.find((s) => s.name === newSub);
    const subChildren = sub?.subCategories || sub?.children;
    if (subChildren && subChildren.length > 0) {
      setChildCategory(subChildren[0].name);
    } else {
      setChildCategory('');
    }
  };

  // Upload ảnh xem trước
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast('error', 'Kích thước tệp không được vượt quá 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImageUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Thêm đơn vị quy đổi
  const handleAddConversionUnit = () => {
    const uName = newUnitName.trim();
    const rate = Number(newUnitRate);
    const curBase = baseUnit.trim();

    if (!uName) {
      setUnitError('Vui lòng nhập tên đơn vị quy đổi (vd: Lốc, Thùng)');
      return;
    }
    if (!rate || rate <= 1) {
      setUnitError('Hệ số quy đổi phải lớn hơn 1 đơn vị cơ sở');
      return;
    }
    if (uName.toLowerCase() === curBase.toLowerCase()) {
      setUnitError(`Tên đơn vị quy đổi không được trùng với ĐVT cơ sở (${curBase})`);
      return;
    }
    if (conversionUnits.some((u) => u.unitName.toLowerCase() === uName.toLowerCase())) {
      setUnitError(`Đơn vị "${uName}" đã có trong danh sách quy đổi`);
      return;
    }

    setConversionUnits((prev) => [...prev, { unitName: uName, conversionRate: rate }]);
    setNewUnitName('');
    setNewUnitRate('');
    setUnitError('');
  };

  const handleRemoveConversionUnit = (index: number) => {
    setConversionUnits((prev) => prev.filter((_, i) => i !== index));
  };

  // Lưu thông tin chỉnh sửa
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setFormError('');

    const cleanSku = sku.trim().toUpperCase().replace(/\s+/g, '');
    const cleanName = name.trim();

    if (!cleanSku) {
      setFormError('Mã SKU bắt buộc phải có');
      return;
    }
    if (!cleanName || cleanName.length < 3) {
      setFormError('Tên sản phẩm phải có ít nhất 3 ký tự');
      return;
    }
    if (!baseUnit.trim()) {
      setFormError('Vui lòng chọn hoặc nhập đơn vị tính cơ sở');
      return;
    }
    if (price <= 0) {
      setFormError('Giá niêm yết phải lớn hơn 0 ₫');
      return;
    }
    if (costPrice !== undefined && costPrice > 0 && price <= costPrice) {
      setFormError(
        `Giá niêm yết (${formatCurrency(price)}) bắt buộc phải lớn hơn giá vốn (${formatCurrency(costPrice)})`
      );
      return;
    }

    // Xác định phân cấp danh mục
    let targetCategoryId = product?.categoryId || '';
    let fullCategory = parentCategory;
    let finalSub = subCategory;

    const parentObj = categoriesList.find((c) => c.name === parentCategory);
    const subObj = parentObj?.subCategories?.find((s) => s.name === subCategory);
    const childObj = subObj?.subCategories?.find((ch) => ch.name === childCategory);

    if (childObj && childCategory) {
      targetCategoryId = childObj.id;
      fullCategory = `${parentCategory} / ${subCategory} / ${childCategory}`;
      finalSub = childCategory;
    } else if (subObj) {
      targetCategoryId = subObj.id;
      fullCategory = `${parentCategory} / ${subCategory}`;
      finalSub = subCategory;
    } else if (parentObj) {
      targetCategoryId = parentObj.id;
      fullCategory = parentCategory;
      finalSub = parentCategory;
    }

    // Danh sách toàn bộ đơn vị
    const allUnits: ProductUnit[] = [
      {
        unitName: baseUnit.trim(),
        conversionRate: 1,
        isBaseUnit: true,
      },
      ...conversionUnits.map((u) => ({
        unitName: u.unitName.trim(),
        conversionRate: Number(u.conversionRate),
        isBaseUnit: false,
      })),
    ];

    const payload: UpdateProductPayload = {
      sku: cleanSku,
      name: cleanName,
      categoryId: targetCategoryId,
      parentCategory,
      subCategory: finalSub,
      category: fullCategory,
      baseUnit: baseUnit.trim(),
      price,
      costPrice: canManageCostPrice ? costPrice : undefined,
      status,
      isBatchManaged,
      imageUrl: imageUrl.trim() || undefined,
      units: allUnits,
    };

    try {
      setSaving(true);
      await productsService.updateProduct(id, payload);
      showToast('success', 'Cập nhật thông tin sản phẩm thành công');
      navigate('/catalog/products');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật sản phẩm';
      setFormError(msg);
      showToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-slate-500">
        <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-700">Đang tải dữ liệu sản phẩm...</p>
        <p className="text-xs text-slate-400 mt-1">Vui lòng chờ trong giây lát</p>
      </div>
    );
  }

  if (loadError || !product) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-2xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Không tìm thấy sản phẩm</h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {loadError || 'Sản phẩm có thể đã bị xóa hoặc đường dẫn không chính xác.'}
        </p>
        <div className="pt-2">
          <Link
            to="/catalog/products"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại Danh mục sản phẩm</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-6xl mx-auto">
      {/* 1. Header Navigation & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link
              to="/catalog/products"
              className="hover:text-indigo-600 font-medium transition-colors flex items-center gap-1"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Danh mục sản phẩm</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="font-semibold text-slate-700">Chỉnh sửa</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="font-mono text-indigo-600 font-bold">{product.sku}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Chỉnh sửa sản phẩm
            </h1>
            <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md border border-slate-200/80">
              {product.sku}
            </span>
            {status === 'ACTIVE' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Đang kinh doanh</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/80">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                <span>Ngừng kinh doanh</span>
              </span>
            )}
          </div>
        </div>

        {/* Nút quay lại */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/catalog/products"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </Link>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {formError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{formError}</span>
        </div>
      )}

      {/* 2. Form chỉnh sửa thông tin - Responsive 2 cột trên Desktop */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CỘT TRÁI (2/3): THÔNG TIN CƠ BẢN, NGÀNH HÀNG, ĐVT & QUY ĐỔI */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card 1: Thông tin cơ bản */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-600" />
                  <span>1. Thông tin chung sản phẩm</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Bắt buộc</span>
              </div>

              <div className="space-y-4">
                {/* Tên sản phẩm */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tên sản phẩm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="VD: Sữa Bột Abbott Similac 900g"
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    required
                  />
                </div>

                {/* Mã SKU & Mã vạch */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mã SKU <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                      placeholder="VD: LH-MILK-900G"
                      className="w-full text-xs font-mono font-bold border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-100 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                      required
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Chữ in hoa, số và dấu gạch ngang (không khoảng trắng).
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Đơn vị tính cơ sở <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={baseUnit}
                        onChange={(e) => setBaseUnit(e.target.value)}
                        placeholder="Lon, Hộp, Chai..."
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                        required
                      />
                    </div>
                    {/* Gợi ý ĐVT */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                      <span className="text-[10px] text-slate-400">Gợi ý:</span>
                      {COMMON_UNITS.slice(0, 5).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setBaseUnit(u)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                            baseUnit.toLowerCase() === u.toLowerCase()
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Phân cấp danh mục (Cấp 1 & Cấp 2) */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Phân cấp ngành hàng</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nhóm Cấp 1 */}
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Nhóm Cấp 1 (Chính)
                      </span>
                      <select
                        value={parentCategory}
                        onChange={(e) => handleParentCategoryChange(e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        {categoriesList.map((c) => (
                          <option key={c.id || c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nhóm Cấp 2 */}
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Nhóm Cấp 2 (Phụ)
                      </span>
                      <select
                        value={subCategory}
                        onChange={(e) => handleSubCategoryChange(e.target.value)}
                        className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        <option value="">-- Không chọn / Không có Cấp 2 --</option>
                        {availableSubCategories.map((s) => (
                          <option key={s.id || s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Bảng đơn vị quy đổi (SN-23 AC-1) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Scale className="w-4 h-4 text-indigo-600" />
                  <span>2. Đơn vị tính quy đổi phụ (Bán sỉ & Đóng gói)</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Tùy chọn</span>
              </div>

              <p className="text-xs text-slate-500">
                Khai báo quy cách đóng gói (vd: 1 Thùng = 24 {baseUnit || 'đơn vị'}, 1 Lốc = 6{' '}
                {baseUnit || 'đơn vị'}) phục vụ bán sỉ và xuất kho.
              </p>

              {/* Form thêm đơn vị quy đổi */}
              <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tên đơn vị quy đổi
                    </label>
                    <input
                      type="text"
                      value={newUnitName}
                      onChange={(e) => {
                        setNewUnitName(e.target.value);
                        setUnitError('');
                      }}
                      placeholder="VD: Thùng, Lốc, Hộp..."
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Quy đổi bằng bao nhiêu {baseUnit || 'đơn vị'}?
                    </label>
                    <input
                      type="number"
                      min={2}
                      value={newUnitRate}
                      onChange={(e) => {
                        setNewUnitRate(e.target.value ? Number(e.target.value) : '');
                        setUnitError('');
                      }}
                      placeholder="VD: 24"
                      className="w-full text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={handleAddConversionUnit}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm ĐVT</span>
                    </button>
                  </div>
                </div>

                {unitError && <p className="text-[11px] text-rose-600 font-medium">{unitError}</p>}
              </div>

              {/* Danh sách các đơn vị quy đổi đã thêm */}
              {conversionUnits.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-2">
                  Chưa khai báo đơn vị quy đổi phụ. Sản phẩm sẽ được quản lý hoàn toàn theo ĐVT cơ sở
                  ({baseUnit}).
                </p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                  {conversionUnits.map((u, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-white hover:bg-slate-50/50 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{u.unitName}</span>
                        <span className="text-slate-400 font-normal">
                          = {u.conversionRate} {baseUnit}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveConversionUnit(idx)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Xóa đơn vị quy đổi này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card 3: Giá bán & Giá vốn & Quản lý lô */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  <span>3. Giá niêm yết & Thiết lập chính sách</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Giá bán niêm yết */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Giá niêm yết (VND) <span className="text-rose-500">*</span>
                  </label>
                  <CurrencyInput
                    value={price}
                    onChange={(val) => setPrice(val)}
                    placeholder="VD: 520.000 ₫"
                    className="w-full text-xs font-bold font-mono border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Giá bán tiêu chuẩn chưa bao gồm chiết khấu cấp đại lý.
                  </p>
                </div>

                {/* Giá vốn (chỉ ADMIN hoặc SALES_MANAGER) */}
                {canManageCostPrice && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                      <span>Giá vốn sản phẩm (Bảo mật)</span>
                    </label>
                    <CurrencyInput
                      value={costPrice || 0}
                      onChange={(val) => setCostPrice(val || undefined)}
                      placeholder="VD: 350.000 ₫"
                      className="w-full text-xs font-bold font-mono border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Giá vốn chỉ hiển thị cho Quản lý & Giám đốc kinh doanh.
                    </p>
                  </div>
                )}
              </div>

              {/* Tùy chọn quản lý lô & HSD */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <CalendarClock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      Quản lý theo Lô sản xuất & Hạn sử dụng (FEFO)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tự động theo dõi số lô, ngày sản xuất và cảnh báo cận date khi xuất hàng.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBatchManaged}
                    onChange={(e) => setIsBatchManaged(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI (1/3): TRẠNG THÁI & ẢNH ĐẠI DIỆN & HÀNH ĐỘNG */}
          <div className="space-y-6">
            {/* Card 4: Trạng thái kinh doanh */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Power className="w-4 h-4 text-indigo-600" />
                <span>Trạng thái hoạt động</span>
              </h3>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => setStatus('ACTIVE')}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    status === 'ACTIVE'
                      ? 'border-emerald-500 bg-emerald-50/70 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Đang kinh doanh</div>
                      <div className="text-[10px] text-slate-500">
                        Hiển thị trên bảng báo giá và cho phép lên đơn
                      </div>
                    </div>
                  </div>
                  {status === 'ACTIVE' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('INACTIVE')}
                  className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    status === 'INACTIVE'
                      ? 'border-slate-400 bg-slate-100 text-slate-800 ring-2 ring-slate-400/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold">Ngừng kinh doanh</div>
                      <div className="text-[10px] text-slate-500">
                        Ẩn khỏi danh sách đặt hàng của đại lý
                      </div>
                    </div>
                  </div>
                  {status === 'INACTIVE' && (
                    <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Card 5: Ảnh sản phẩm */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Ảnh đại diện</span>
              </h3>

              {/* Khung preview ảnh */}
              <div className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                {imageUrl ? (
                  <div className="relative group w-36 h-36 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-2xs">
                    <img
                      src={imageUrl}
                      alt={name}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute inset-0 bg-slate-900/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold cursor-pointer"
                    >
                      Xóa ảnh
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Package className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-600">Chưa có ảnh đại diện</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Hỗ trợ JPG, PNG, WEBP &lt; 2MB</p>
                  </div>
                )}

                <div className="mt-3.5 w-full">
                  <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer transition-all shadow-2xs">
                    <Upload className="w-3.5 h-3.5 text-slate-500" />
                    <span>Tải ảnh lên từ máy</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>

                <div className="mt-2.5 w-full">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Hoặc dán URL hình ảnh..."
                    className="w-full text-[11px] font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Card 6: Thông tin thống kê kho */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Số lượng tồn kho hiện tại
              </h4>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Tồn khả dụng:</span>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {(product.stockQuantity || 0).toLocaleString('vi-VN')} {product.baseUnit}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Để điều chỉnh số lượng tồn kho, vui lòng thực hiện qua phân hệ Quản lý kho.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Thanh nút bấm Lưu / Hủy (Dưới cùng) */}
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm sticky bottom-4 z-20">
          <Link
            to="/catalog/products"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Hủy bỏ & Quay lại</span>
          </Link>

          <button
            type="submit"
            disabled={saving || !canManageProducts}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold shadow-xs hover:shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Đang lưu thay đổi...' : 'Lưu thay đổi sản phẩm'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
