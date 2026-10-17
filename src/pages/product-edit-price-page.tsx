import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  DollarSign,
  ShieldCheck,
  Clock,
  AlertCircle,
  Package,
  Save,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { productsService } from '../services/products.service';
import { CurrencyInput } from '../components/currency-input';
import { showToast } from '../components/toast';
import { tokenStorage } from '../utils/token-storage';
import type { Product, ProductPriceHistory } from '../types/products';

/**
 * Định dạng tiền tệ VND chuẩn hệ thống
 */
const formatCurrency = (val?: number | null): string => {
  if (val === undefined || val === null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(val);
};

/**
 * Định dạng ngày giờ chuẩn
 */
const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '---';
  try {
    const d = new Date(dateStr);
    return `${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return dateStr;
  }
};

const ADJUST_REASONS = [
  'Biến động giá nguyên liệu & chi phí sản xuất đầu vào',
  'Chính sách khuyến mại kích cầu định kỳ',
  'Điều chỉnh theo biến động giá thị trường & đối thủ cạnh tranh',
  'Cập nhật định kỳ theo quý / năm tài chính',
  'Điều chỉnh chiết khấu theo phân cấp nhóm đại lý',
  'Lý do khác (chi tiết trong ghi chú)',
];

export const ProductEditPricePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Xác định quyền hạn quản lý
  const currentUser = tokenStorage.getUser();
  const currentRoles = (currentUser?.roles || []) as string[];
  const canManageCostPrice =
    currentRoles.includes('ADMIN') || currentRoles.includes('SALES_MANAGER');
  const canManageProducts =
    canManageCostPrice || currentRoles.includes('BUSINESS_MANAGER');

  // Trạng thái dữ liệu
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Form điều chỉnh giá
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newCostPrice, setNewCostPrice] = useState<number | undefined>(undefined);
  const [reason, setReason] = useState<string>(ADJUST_REASONS[0]);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Lịch sử giá
  const [priceHistory, setPriceHistory] = useState<ProductPriceHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Tải thông tin sản phẩm và lịch sử giá
  const loadProductData = useCallback(async () => {
    if (!id) {
      setErrorMessage('Không tìm thấy mã sản phẩm hợp lệ trong đường dẫn.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const data = await productsService.getProductById(id);
      setProduct(data);
      setNewPrice(data.price ?? 0);
      setNewCostPrice(data.costPrice ?? 0);

      // Tải lịch sử giá
      setIsLoadingHistory(true);
      try {
        const history = await productsService.getPriceHistory(id);
        setPriceHistory(history);
      } catch {
        setPriceHistory([]);
      } finally {
        setIsLoadingHistory(false);
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Không thể tải thông tin sản phẩm từ máy chủ.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProductData();
  }, [loadProductData]);

  // Tính chênh lệch giá niêm yết
  const currentPrice = product?.price ?? 0;
  const priceDiff = newPrice - currentPrice;
  const priceDiffPercent = currentPrice > 0 ? ((priceDiff / currentPrice) * 100) : 0;

  // Tính chênh lệch giá vốn
  const currentCost = product?.costPrice ?? 0;
  const costDiff = (newCostPrice ?? 0) - currentCost;

  // Tính biên lợi nhuận dự kiến
  const expectedMargin = useMemo(() => {
    if (!canManageCostPrice || newPrice <= 0) return 0;
    const cost = newCostPrice ?? currentCost;
    return Math.round(((newPrice - cost) / newPrice) * 10000) / 100;
  }, [canManageCostPrice, newPrice, newCostPrice, currentCost]);

  // Kiểm tra có thay đổi nào chưa lưu
  const hasPriceChanges =
    product !== null &&
    (newPrice !== product.price ||
      (canManageCostPrice &&
        newCostPrice !== undefined &&
        newCostPrice !== (product.costPrice ?? 0)));

  // Xử lý gửi biểu mẫu cập nhật giá
  const handleSubmitPriceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!canManageProducts) {
      showToast('error', 'Bạn không có quyền cập nhật bảng giá sản phẩm.');
      return;
    }

    if (newPrice < 0) {
      showToast('error', 'Giá bán niêm yết không được là số âm.');
      return;
    }

    if (canManageCostPrice && newCostPrice !== undefined && newCostPrice < 0) {
      showToast('error', 'Giá vốn không được là số âm.');
      return;
    }

    const currentCost =
      canManageCostPrice && newCostPrice !== undefined
        ? newCostPrice
        : (product.costPrice ?? 0);
    if (currentCost > 0 && newPrice <= currentCost) {
      showToast('error', 'Giá niêm yết bắt buộc phải lớn hơn giá vốn.');
      return;
    }

    try {
      setIsSubmitting(true);
      await productsService.updateProduct(product.id, {
        price: newPrice,
        costPrice: canManageCostPrice ? newCostPrice : undefined,
      });

      showToast(
        'success',
        `Cập nhật giá bán sản phẩm ${product.name} (${product.sku}) thành công!`
      );
      await loadProductData();
    } catch (err: unknown) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Lỗi khi cập nhật giá sản phẩm.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Đặt lại giá về ban đầu
  const handleResetToCurrent = () => {
    if (!product) return;
    setNewPrice(product.price ?? 0);
    setNewCostPrice(product.costPrice ?? 0);
    setNotes('');
  };

  // Trạng thái đang tải
  if (isLoading) {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs flex items-center justify-between animate-pulse">
          <div className="h-5 w-48 bg-slate-200 rounded" />
          <div className="h-9 w-28 bg-slate-200 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 h-96 animate-pulse" />
          <div className="bg-white rounded-xl border border-slate-200 p-6 h-96 animate-pulse" />
        </div>
      </div>
    );
  }

  // Trạng thái lỗi không tìm thấy
  if (errorMessage || !product) {
    return (
      <div className="w-full max-w-xl mx-auto bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-4 mt-8">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mx-auto border border-rose-100">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base sm:text-lg font-bold text-slate-800">
          Không tìm thấy thông tin sản phẩm
        </h2>
        <p className="text-xs text-slate-500">
          {errorMessage || 'Sản phẩm không tồn tại hoặc đã bị ngừng kinh doanh trên hệ thống.'}
        </p>
        <div className="pt-2">
          <Link
            to="/catalog/products"
            className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại danh sách sản phẩm</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-8">
      {/* ── 1. HEADER PHÂN CẤP (BREADCRUMB & THÔNG TIN TIÊU ĐỀ) ── */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
        {/* Breadcrumb phân cấp chuẩn theo UI_GUIDELINES */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-slate-500 font-medium overflow-x-auto whitespace-nowrap pb-1"
        >
          <Link
            to="/catalog/products"
            className="text-slate-500 hover:text-indigo-600 font-medium transition-colors"
          >
            Danh mục sản phẩm
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60 font-semibold text-[11px] shrink-0">
            {product.sku}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
          <span className="text-slate-900 font-bold">Điều chỉnh bảng giá</span>
        </nav>

        {/* Thanh tiêu đề & nút hành động */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              to="/catalog/products"
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs shrink-0 cursor-pointer"
              title="Quay lại danh mục sản phẩm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại</span>
            </Link>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                Điều chỉnh giá: {product.name}
              </h1>
              <p className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                <span>
                  ĐVT cơ sở: <strong className="text-slate-700">{product.baseUnit || 'Lon'}</strong>
                </span>
                <span>•</span>
                <span>
                  Trạng thái:{' '}
                  {product.status === 'ACTIVE' ? (
                    <span className="text-emerald-700 font-semibold">Đang kinh doanh</span>
                  ) : (
                    <span className="text-rose-600 font-semibold">Ngừng kinh doanh</span>
                  )}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {hasPriceChanges && (
              <button
                type="button"
                onClick={handleResetToCurrent}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Khôi phục giá cũ</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSubmitPriceChange}
              disabled={isSubmitting || !hasPriceChanges}
              className="inline-flex items-center justify-center gap-1.5 h-[38px] px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu bảng giá mới'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. NỘI DUNG CHÍNH (LƯỚI RESPONSIVE KHÔNG HARDCODE WIDTH) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
        {/* CỘT TRÁI (2/3): FORM ĐIỀU CHỈNH GIÁ & BẢNG SO SÁNH */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          {/* Form điều chỉnh giá bán */}
          <form
            onSubmit={handleSubmitPriceChange}
            className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">Thiết lập Bảng giá mới</h2>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200/60">
                Hiệu lực tức thì
              </span>
            </div>

            {/* Bảng so sánh Giá hiện tại vs Giá mới */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Giá niêm yết hiện tại */}
              <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Giá niêm yết hiện tại
                </div>
                <div className="text-lg sm:text-xl font-bold font-mono text-slate-800">
                  {formatCurrency(currentPrice)}
                </div>
                <p className="text-[11px] text-slate-400">
                  Đơn vị tính: 1 {product.baseUnit || 'Lon'}
                </p>
              </div>

              {/* Ô nhập Giá niêm yết mới */}
              <div className="p-3.5 rounded-xl bg-indigo-50/40 border border-indigo-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                    Giá niêm yết mới
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-600">Bắt buộc</span>
                </div>
                <CurrencyInput
                  value={newPrice}
                  onChange={(val) => setNewPrice(val ?? 0)}
                  placeholder="0"
                  disabled={isSubmitting}
                  className="w-full h-[38px] px-3 text-xs font-bold font-mono text-indigo-950 border border-indigo-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-2xs"
                />
                {/* Badge phân tích mức tăng/giảm */}
                <div className="flex items-center gap-2 pt-0.5">
                  {priceDiff !== 0 ? (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md ${
                        priceDiff > 0
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      {priceDiff > 0 ? (
                        <>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          <span>Tăng +{formatCurrency(priceDiff)} (+{priceDiffPercent.toFixed(1)}%)</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="w-3.5 h-3.5" />
                          <span>Giảm -{formatCurrency(Math.abs(priceDiff))} ({priceDiffPercent.toFixed(1)}%)</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Chưa có thay đổi</span>
                  )}
                </div>
              </div>
            </div>

            {/* Phân hệ Giá vốn & Biên lợi nhuận (Chỉ ADMIN & SALES_MANAGER) */}
            {canManageCostPrice && (
              <div className="p-3.5 rounded-xl bg-emerald-50/30 border border-emerald-200/70 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-950">
                      Giá vốn & Biên lợi nhuận (Phân quyền Quản lý)
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                    Biên LN dự kiến: {expectedMargin.toFixed(1)}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-700">Giá vốn hiện tại:</span>
                    <div className="h-[38px] px-3 flex items-center text-xs font-mono font-bold text-slate-700 bg-white border border-slate-200 rounded-lg">
                      {formatCurrency(currentCost)}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-emerald-900">
                      Điều chỉnh Giá vốn mới (tùy chọn):
                    </label>
                    <CurrencyInput
                      value={newCostPrice}
                      onChange={(val) => setNewCostPrice(val)}
                      placeholder="0"
                      disabled={isSubmitting}
                      className="w-full h-[38px] px-3 text-xs font-bold font-mono text-emerald-950 border border-emerald-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-2xs"
                    />
                  </div>
                </div>

                {costDiff !== 0 && (
                  <p className="text-[11px] text-emerald-800">
                    Giá vốn thay đổi:{' '}
                    <strong>
                      {costDiff > 0 ? `+${formatCurrency(costDiff)}` : `-${formatCurrency(Math.abs(costDiff))}`}
                    </strong>
                  </p>
                )}
              </div>
            )}

            {/* Lý do điều chỉnh giá */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <span>Lý do điều chỉnh bảng giá</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[38px] px-3 text-xs font-medium border border-slate-200 rounded-lg bg-slate-50/70 hover:bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-2xs"
              >
                {ADJUST_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Ghi chú chi tiết */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                Ghi chú phê duyệt / Diễn giải thêm
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nhập chi tiết quyết định điều chỉnh giá, căn cứ chính sách, số hiệu văn bản (nếu có)..."
                rows={3}
                disabled={isSubmitting}
                className="w-full p-3 text-xs border border-slate-200 rounded-lg bg-slate-50/60 hover:bg-white focus:bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Nút hành động trong form */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate('/catalog/products')}
                disabled={isSubmitting}
                className="inline-flex items-center justify-center gap-1.5 h-[38px] px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                <span>Hủy bỏ</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !hasPriceChanges}
                className="inline-flex items-center justify-center gap-1.5 h-[38px] px-5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5 shrink-0" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Xác nhận cập nhật giá'}</span>
              </button>
            </div>
          </form>

          {/* Lịch sử thay đổi giá gần đây */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Lịch sử thay đổi giá của SKU này
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                {priceHistory.length} lần điều chỉnh
              </span>
            </div>

            {isLoadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Đang tải dữ liệu lịch sử giá...
              </div>
            ) : priceHistory.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                Chưa có đợt thay đổi giá nào được ghi nhận cho sản phẩm này.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="px-3 py-2.5 text-left">Thời gian</th>
                      <th className="px-3 py-2.5 text-right">Giá cũ</th>
                      <th className="px-3 py-2.5 text-right">Giá mới</th>
                      <th className="px-3 py-2.5 text-center">Chênh lệch</th>
                      <th className="px-3 py-2.5 text-left">Người sửa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {priceHistory.map((item, idx) => {
                      const diff = item.newPrice - item.oldPrice;
                      return (
                        <tr key={item.id || idx} className="hover:bg-indigo-50/25 transition-colors">
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 font-medium">
                            {formatDateTime(item.changedAt)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono text-slate-500">
                            {formatCurrency(item.oldPrice)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono font-bold text-slate-900">
                            {formatCurrency(item.newPrice)}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-center">
                            {diff > 0 ? (
                              <span className="text-amber-700 font-semibold font-mono">
                                +{formatCurrency(diff)}
                              </span>
                            ) : diff < 0 ? (
                              <span className="text-emerald-700 font-semibold font-mono">
                                -{formatCurrency(Math.abs(diff))}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono">0 ₫</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap text-slate-700 font-medium">
                            {item.changedBy || 'Quản trị viên'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI (1/3): THẺ TỔNG QUAN SẢN PHẨM */}
        <div className="space-y-5 sm:space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Package className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Hồ sơ SKU</h3>
            </div>

            {/* Ảnh đại diện */}
            <div className="w-full aspect-video sm:aspect-square max-h-48 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center shadow-2xs">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Package className="w-12 h-12 text-slate-300" />
              )}
            </div>

            {/* Chi tiết thông số */}
            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Tên sản phẩm:</span>
                <span className="font-bold text-slate-800 text-sm leading-snug">
                  {product.name}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-500">Mã định danh SKU:</span>
                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/60">
                  {product.sku}
                </span>
              </div>

              {product.barcode && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Mã vạch (Barcode):</span>
                  <span className="font-mono text-slate-700">{product.barcode}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-500">Nhánh phân loại:</span>
                <span className="text-slate-800 font-semibold text-right truncate max-w-[65%]">
                  {product.category || product.parentCategory || '---'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Đơn vị tính cơ sở:</span>
                <span className="font-semibold text-slate-800">{product.baseUnit || 'Lon'}</span>
              </div>

              {product.packagingSpec && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Quy cách đóng gói:</span>
                  <span className="font-medium text-slate-700">{product.packagingSpec}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <span className="text-slate-500">Tồn kho khả dụng:</span>
                <span className="font-bold text-slate-900">
                  {product.stockQuantity ?? 0} {product.baseUnit || 'đơn vị'}
                </span>
              </div>
            </div>

            {/* Đơn vị quy đổi kho */}
            {product.units && product.units.length > 1 && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase">
                  Bảng quy đổi kho:
                </div>
                <div className="space-y-1">
                  {product.units
                    .filter((u) => !u.isBaseUnit)
                    .map((u, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs p-1.5 rounded bg-slate-50 text-slate-700 font-mono"
                      >
                        <span>1 {u.unitName}</span>
                        <span>= {u.conversionRate} {product.baseUnit || 'Lon'}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
