import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  Plus,
  Check,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Clock,
  PackageCheck,
} from 'lucide-react';
import { orderSuggestionsService } from '../services/order-suggestions.service';
import type {
  CustomerPurchaseHistoryResponse,
  LatestOrderItem,
  SuggestedProductItem,
} from '../types/order-suggestion.types';

interface OrderSuggestionsPanelProps {
  customerId: string;
  customerName: string;
  existingProductIds: string[];
  existingProductSkus: string[];
  onAddSuggestedItem: (item: SuggestedProductItem, quantity: number) => void;
  onAddAllSuggestedItems?: (itemsWithQty: Array<{ item: SuggestedProductItem; quantity: number }>) => void;
  onReorderPreviousOrder: (items: LatestOrderItem[]) => void;
}

const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

const formatDate = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  } catch {
    return isoString;
  }
};

export const OrderSuggestionsPanel: React.FC<OrderSuggestionsPanelProps> = ({
  customerId,
  customerName: _customerName,
  existingProductIds,
  existingProductSkus,
  onAddSuggestedItem,
  onAddAllSuggestedItems,
  onReorderPreviousOrder,
}) => {
  void _customerName;
  const [data, setData] = useState<CustomerPurchaseHistoryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [isApplyingReorder, setIsApplyingReorder] = useState(false);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!customerId) {
        if (active) setData(null);
        return;
      }

      setIsLoading(true);
      setIsForbidden(false);
      setErrorMessage(null);

      orderSuggestionsService
        .getPurchaseHistorySuggestions(customerId)
        .then((res) => {
          if (active) {
            setData(res);
            // Khởi tạo số lượng mặc định bằng số lượng bình quân (averageQuantity)
            const initQty: Record<string, number> = {};
            for (const item of res.suggestions) {
              initQty[item.productId || item.sku] = item.averageQuantity || 1;
            }
            setItemQuantities(initQty);
          }
        })
        .catch((err: unknown) => {
          if (!active) return;
          const status = (err as { response?: { status?: number } })?.response?.status;
          if (status === 403) {
            setIsForbidden(true);
            setErrorMessage(
              'Bạn không được phân công phụ trách đại lý này nên không thể xem lịch sử gợi ý.',
            );
          } else {
            setErrorMessage('Không thể tải lịch sử mua hàng');
          }
        })
        .finally(() => {
          if (active) setIsLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customerId]);

  const handleQtyChange = (key: string, val: number) => {
    setItemQuantities((prev) => ({
      ...prev,
      [key]: Math.max(1, isNaN(val) ? 1 : val),
    }));
  };

  const handleApplyLatestOrder = () => {
    if (!data?.latestOrder || !data.latestOrder.items || data.latestOrder.items.length === 0) return;
    setIsApplyingReorder(true);
    onReorderPreviousOrder(data.latestOrder.items);
    setTimeout(() => setIsApplyingReorder(false), 600);
  };

  const handleAddAllSuggestions = () => {
    if (!data?.suggestions || data.suggestions.length === 0) return;
    const itemsWithQty = data.suggestions.map((item) => ({
      item,
      quantity: itemQuantities[item.productId || item.sku] || item.averageQuantity || 1,
    }));
    if (onAddAllSuggestedItems) {
      onAddAllSuggestedItems(itemsWithQty);
    } else {
      itemsWithQty.forEach(({ item, quantity }) => {
        onAddSuggestedItem(item, quantity);
      });
    }
  };

  const isItemAlreadyAdded = (item: SuggestedProductItem): boolean => {
    return (
      existingProductIds.includes(item.productId) ||
      (Boolean(item.sku) && existingProductSkus.includes(item.sku.toUpperCase()))
    );
  };

  if (!customerId) return null;

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 p-4 shadow-xs transition-all mb-4">
      {/* Tiêu đề & Thu phóng */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-800">
                Gợi Ý Mặt Hàng Đại Lý Thường Mua
              </h4>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                3 tháng gần nhất
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          {isCollapsed ? (
            <>
              <span>Mở rộng</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              <span>Thu gọn</span>
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Nội dung chi tiết */}
      {!isCollapsed && (
        <div className="mt-3.5 space-y-3">
          {/* Trạng thái Đang tải (Skeleton) */}
          {isLoading && (
            <div className="space-y-2.5">
              <div className="h-14 w-full animate-pulse rounded-xl bg-slate-100" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-24 animate-pulse rounded-xl bg-slate-100" />
              </div>
            </div>
          )}

          {/* Cảnh báo phân quyền (AC3) */}
          {isForbidden && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold">Phân quyền đại lý (RBAC Scope):</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {!isLoading && !isForbidden && data && (
            <>
              {/* Thẻ Hành động 1-Click Reorder đơn gần nhất (AC2) */}
              {data.latestOrder && data.latestOrder.items && data.latestOrder.items.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-indigo-200/80 bg-white p-3 shadow-xs">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                        <Clock className="h-3.5 w-3.5" />
                        Đơn gần nhất: {data.latestOrder.orderCode}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDate(data.latestOrder.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      Gồm <strong>{data.latestOrder.items.length} mặt hàng</strong> · Tổng tiền:{' '}
                      <strong className="text-slate-900">{formatCurrency(data.latestOrder.grandTotal)}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyLatestOrder}
                    disabled={isApplyingReorder}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-98 transition-all shrink-0 cursor-pointer"
                    title="Đổ toàn bộ mặt hàng và số lượng của đơn hàng gần nhất vào bảng đơn hàng mới"
                  >
                    <RotateCcw className={`h-3.5 w-3.5 ${isApplyingReorder ? 'animate-spin' : ''}`} />
                    <span>Thêm nhanh nhóm hàng lần trước</span>
                  </button>
                </div>
              )}

              {/* Danh sách mặt hàng mua đều đặn (AC1) */}
              {data.suggestions && data.suggestions.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap text-xs text-slate-500 px-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        Mặt hàng khách lấy đều đặn ({data.suggestions.length} sản phẩm):
                      </span>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">
                        (Tự động gợi ý theo số lượng bình quân)
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddAllSuggestions}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
                      title="Thêm tất cả mặt hàng gợi ý vào đơn với số lượng đang chọn"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm tất cả hàng gợi ý</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {data.suggestions.map((item) => {
                      const itemKey = item.productId || item.sku;
                      const isAdded = isItemAlreadyAdded(item);
                      const currentQty = itemQuantities[itemKey] || item.averageQuantity || 1;

                      return (
                        <div
                          key={itemKey}
                          className={`flex flex-col justify-between rounded-xl border p-3 transition-all ${
                            isAdded
                              ? 'border-emerald-200 bg-emerald-50/40'
                              : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs'
                          }`}
                        >
                          <div>
                            {/* Tên & SKU */}
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-1" title={item.productName}>
                                  {item.productName}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  Mã: <span className="font-semibold text-slate-700">{item.sku}</span> · Đơn giá: {formatCurrency(item.price)}
                                </p>
                              </div>

                              {isAdded && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                                  <Check className="h-3 w-3" /> Đã có trong đơn
                                </span>
                              )}
                            </div>

                            {/* Badges thông số bình quân & lịch sử */}
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-100">
                                <Layers className="h-3 w-3" />
                                SL bình quân: {item.averageQuantity} {item.unit}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 border border-blue-100">
                                <PackageCheck className="h-3 w-3" />
                                Mua {item.orderCount} lần ({item.totalQuantity} {item.unit})
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                                <Calendar className="h-2.5 w-2.5" />
                                Lần cuối: {formatDate(item.lastPurchasedAt)} ({item.lastPurchasedQuantity} {item.unit})
                              </span>
                            </div>
                          </div>

                          {/* Bộ điều khiển số lượng & Nút thêm nhanh */}
                          <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] text-slate-500 font-medium">SL:</span>
                              <input
                                type="number"
                                min={1}
                                value={currentQty}
                                onChange={(e) => handleQtyChange(itemKey, parseInt(e.target.value, 10))}
                                className="w-14 rounded-lg border border-slate-200 px-2 py-1 text-center text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50"
                              />
                              <span className="text-[11px] text-slate-500 font-medium">{item.unit}</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => onAddSuggestedItem(item, currentQty)}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                                isAdded
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-98 shadow-2xs'
                              }`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>{isAdded ? 'Thêm tiếp' : 'Thêm vào đơn'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  <p>Đại lý chưa có lịch sử mua hàng trong 3 tháng qua.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
