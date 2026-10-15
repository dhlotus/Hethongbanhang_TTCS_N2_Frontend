import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  X,
  ArrowRight,
  User,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Tag,
  ShieldCheck,
} from 'lucide-react';
import { productsService } from '../services/products.service';
import type { ProductPriceHistory } from '../types/products';

export interface ProductPriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productSku?: string;
  currentPrice?: number;
}

interface FormattedDateTime {
  time: string;
  date: string;
  full: string;
}

/**
 * Định dạng ngày giờ chuẩn: HH:mm • DD/MM/YYYY
 * Tách bạch rõ ràng giờ và ngày để tránh dính chữ (ví dụ 00:0014/09/2026)
 */
const formatDateTime = (dateInput: string | Date): FormattedDateTime => {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return { time: '--:--', date: '--/--/----', full: '--:-- • --/--/----' };
    }
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    const time = `${hours}:${minutes}`;
    const date = `${day}/${month}/${year}`;
    return {
      time,
      date,
      full: `${time} • ${date}`,
    };
  } catch {
    return { time: '--:--', date: '--/--/----', full: '--:-- • --/--/----' };
  }
};

/**
 * Định dạng tiền tệ VND chuẩn Việt Nam
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const ProductPriceHistoryModal: React.FC<ProductPriceHistoryModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  productSku,
  currentPrice,
}) => {
  const [history, setHistory] = useState<ProductPriceHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!productId) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await productsService.getPriceHistory(productId);
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setError('Không thể tải lịch sử thay đổi giá. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (isOpen && productId) {
      fetchHistory();
    } else {
      setHistory([]);
      setError(null);
    }
  }, [isOpen, productId, fetchHistory]);

  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh] border border-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-history-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - STICKY TOP */}
        <div className="shrink-0 flex items-start justify-between px-6 py-5 border-b border-slate-100 bg-white z-10">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-[#371cdb]/10 text-[#371cdb] rounded-xl shadow-xs shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="price-history-modal-title"
                  className="text-lg font-bold text-slate-900 tracking-tight"
                >
                  Lịch sử thay đổi giá
                </h2>
                {productSku && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold font-mono bg-slate-100 text-slate-700 border border-slate-200">
                    {productSku}
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-600 font-medium mt-0.5 line-clamp-1">
                {productName}
              </p>
              {typeof currentPrice === 'number' && (
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <span>Giá niêm yết hiện tại:</span>
                  <span className="font-bold text-[#371cdb]">
                    {formatCurrency(currentPrice)}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-[#371cdb]/20"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - SCROLLABLE TIMELINE CONTAINER */}
        <div className="flex-1 overflow-y-auto max-h-[460px] p-6 bg-slate-50/60 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 pr-3">
          {isLoading ? (
            /* Skeleton Loading State */
            <div className="space-y-4 py-2">
              {[1, 2, 3].map((skeletonIdx) => (
                <div
                  key={`skeleton-${skeletonIdx}`}
                  className="p-4 rounded-xl bg-white border border-slate-100 shadow-xs animate-pulse space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-32 bg-slate-200 rounded-md"></div>
                    <div className="h-5 w-20 bg-slate-100 rounded-md"></div>
                  </div>
                  <div className="h-14 bg-slate-100 rounded-lg"></div>
                  <div className="h-4 w-44 bg-slate-100 rounded-md"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            /* Error State */
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-red-50/80 rounded-xl border border-red-100">
              <AlertCircle className="w-10 h-10 text-red-500 mb-2.5" />
              <p className="text-sm font-semibold text-red-800">{error}</p>
              <button
                type="button"
                onClick={fetchHistory}
                className="mt-3 px-4 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : history.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-14 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-200 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-[#371cdb]/10 text-[#371cdb] flex items-center justify-center mb-3">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Chưa có lịch sử thay đổi giá
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                Sản phẩm này chưa từng có lần điều chỉnh giá niêm yết nào trên hệ thống.
              </p>
            </div>
          ) : (
            /* Timeline List */
            <div className="space-y-4 relative before:absolute before:top-3 before:bottom-3 before:left-4 before:w-0.5 before:bg-gradient-to-b before:from-[#371cdb]/30 before:via-slate-200 before:to-transparent">
              {history.map((item, index) => {
                const dateTime = formatDateTime(item.changedAt);
                const diff = item.newPrice - item.oldPrice;
                const isIncrease = diff > 0;
                const isDecrease = diff < 0;
                const diffPercent =
                  item.oldPrice > 0
                    ? Math.abs(Number(((diff / item.oldPrice) * 100).toFixed(1)))
                    : 0;

                return (
                  <div key={item.id || `hist-${index}`} className="relative pl-10">
                    {/* Timeline Node Marker */}
                    <div className="absolute left-2.25 top-3.5 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white bg-[#371cdb] shadow-xs flex items-center justify-center z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    </div>

                    {/* Timeline Card */}
                    <div className="p-4 rounded-xl bg-white shadow-xs border border-slate-200/80 hover:border-[#371cdb]/40 hover:shadow-md transition-all">
                      {/* Card Header: Timestamp & Difference Badge */}
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        {/* TÁCH BẠCH RÕ RÀNG NGÀY VÀ GIỜ */}
                        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-900 font-bold">{dateTime.time}</span>
                          <span className="text-slate-300 font-light">•</span>
                          <span className="text-slate-600">{dateTime.date}</span>
                        </div>

                        {/* Thay đổi giá (+/-) */}
                        {isIncrease && (
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded-md">
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>+{formatCurrency(diff)}</span>
                            {diffPercent > 0 && <span>(+{diffPercent}%)</span>}
                          </div>
                        )}
                        {isDecrease && (
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
                            <TrendingDown className="w-3.5 h-3.5" />
                            <span>{formatCurrency(diff)}</span>
                            {diffPercent > 0 && <span>(-{diffPercent}%)</span>}
                          </div>
                        )}
                      </div>

                      {/* Card Body: Price Compare Box */}
                      <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100 p-3 rounded-xl mb-3">
                        <div className="flex flex-col items-center flex-1">
                          <span className="text-xs text-slate-400 font-medium mb-0.5">
                            Giá cũ
                          </span>
                          <span className="font-semibold text-slate-500 line-through text-sm">
                            {formatCurrency(item.oldPrice)}
                          </span>
                        </div>

                        <div className="px-2 text-slate-300 shrink-0">
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </div>

                        <div className="flex flex-col items-center flex-1">
                          <span className="text-xs text-[#371cdb] font-medium mb-0.5">
                            Giá mới
                          </span>
                          <span className="font-bold text-[#371cdb] text-base">
                            {formatCurrency(item.newPrice)}
                          </span>
                        </div>
                      </div>

                      {/* Card Footer: Người thực hiện */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            Người sửa:{' '}
                            <span className="font-semibold text-slate-800">
                              {item.changedBy || 'Quản trị viên'}
                            </span>
                          </span>
                        </div>
                        {index === 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#371cdb] bg-[#371cdb]/10 px-2 py-0.5 rounded-full">
                            <ShieldCheck className="w-3 h-3" />
                            Gần nhất
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - STICKY BOTTOM */}
        <div className="shrink-0 px-6 py-4 bg-white border-t border-slate-100 flex items-center justify-between z-10">
          <span className="text-xs text-slate-500 font-medium">
            {history.length > 0
              ? `Tổng cộng ${history.length} lần điều chỉnh giá`
              : 'Dữ liệu được cập nhật theo thời gian thực'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded-xl transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }
  return null;
};
