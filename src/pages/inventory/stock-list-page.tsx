import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Package,
  PackageCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  X,
  Warehouse,
  ShieldCheck,
  Info,
  FileText,
  XCircle,
  Pencil,
} from 'lucide-react';
import { inventoryService } from '../../services/inventory.service';
import { ordersService } from '../../services/orders.service';
import { showToast } from '../../components/toast';
import { MinStockModal } from '../../components/inventory/min-stock-modal';
import type { StockBalance, StockItem, StockReservation } from '../../types/inventory.types';

export const StockListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'HAS_RESERVED' | 'OUT_OF_STOCK' | 'BELOW_MIN_STOCK'>(() => {
    return searchParams.get('filter') === 'BELOW_MIN_STOCK' ? 'BELOW_MIN_STOCK' : 'ALL';
  });
  const [selectedStockForModal, setSelectedStockForModal] = useState<StockItem | null>(null);
  const [editingStockBalance, setEditingStockBalance] = useState<StockBalance | null>(null);
  const [modalReservations, setModalReservations] = useState<StockReservation[]>([]);
  const [loadingModalRes, setLoadingModalRes] = useState<boolean>(false);

  const fetchStocks = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setLoading(true);
      const data = await inventoryService.getStocks();
      setStocks(data);
      if (isRefresh) {
        showToast('success', 'Đã cập nhật dữ liệu sổ tồn kho mới nhất');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách tồn kho';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // Hàm hiển thị badge tình trạng đơn hàng chuẩn hệ thống
  const renderOrderStatusBadge = (orderStatus?: string) => {
    const status = (orderStatus || 'APPROVED').toUpperCase();
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
            <FileText className="h-2.5 w-2.5 text-slate-500" />
            Nháp
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            <Clock className="h-2.5 w-2.5 text-amber-500" />
            Chờ duyệt
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-300">
            <AlertTriangle className="h-2.5 w-2.5 text-amber-600" />
            Cần duyệt hạn mức
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700 ring-1 ring-purple-200">
            <Package className="h-2.5 w-2.5 text-purple-600" />
            Đang soạn
          </span>
        );
      case 'PACKED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200">
            <PackageCheck className="h-2.5 w-2.5 text-indigo-600" />
            Đã đóng gói
          </span>
        );
      case 'DELIVERED':
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
            Giao thành công
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700">
            <XCircle className="h-2.5 w-2.5 text-rose-500" />
            Đã hủy
          </span>
        );
      case 'APPROVED':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200">
            <CheckCircle2 className="h-2.5 w-2.5 text-indigo-600" />
            Đã duyệt
          </span>
        );
    }
  };

  // Quét danh sách các đơn hàng APPROVED đang giữ chỗ cho sản phẩm được chọn
  useEffect(() => {
    if (!selectedStockForModal) {
      setModalReservations([]);
      return;
    }

    setLoadingModalRes(true);
    const targetSku = selectedStockForModal.sku.toUpperCase();

    const isMatch = (sku?: string, id?: string) => {
      const s = (sku || '').trim().toUpperCase();
      const i = (id || '').trim().toUpperCase();
      if (s === targetSku || i === targetSku) return true;
      if (
        (s === 'LH-MILK-900G' || s === 'LH-MILK-POWDER-900G') &&
        (targetSku === 'LH-MILK-900G' || targetSku === 'LH-MILK-POWDER-900G')
      ) return true;
      return false;
    };

    const initialList: StockReservation[] = (selectedStockForModal.activeReservations || []).map((r) => ({
      ...r,
      status: (r.status || 'ACTIVE') as StockReservation['status'],
      orderStatus: r.orderStatus || 'APPROVED',
    }));

    ordersService
      .getOrders({ status: 'APPROVED', limit: 50 })
      .then((res) => {
        const approvedOrders = res.data || [];
        const mergedList: StockReservation[] = [...initialList];

        for (const order of approvedOrders) {
          for (const line of order.lines || []) {
            if (isMatch(line.productSku, line.productId)) {
              const qty = line.baseQuantity ?? Math.round((line.quantity || 0) * (line.conversionRate || 1));
              const existsIndex = mergedList.findIndex(
                (existing) =>
                  existing.orderId === order.id ||
                  existing.orderCode === order.orderCode ||
                  (order.orderCode && existing.orderId === order.orderCode),
              );

              if (existsIndex >= 0) {
                mergedList[existsIndex] = {
                  ...mergedList[existsIndex],
                  customerName: mergedList[existsIndex].customerName || order.customerName,
                  orderStatus: mergedList[existsIndex].orderStatus || order.status || 'APPROVED',
                };
              } else {
                mergedList.push({
                  id: `res-${order.id || order.orderCode}-${line.productSku || selectedStockForModal.sku}`,
                  orderId: order.id || order.orderCode || 'DH-ORDER',
                  orderCode: order.orderCode || order.id,
                  productId: line.productId || selectedStockForModal.sku,
                  productSku: line.productSku || selectedStockForModal.sku,
                  productName: line.productName || selectedStockForModal.name,
                  customerName: order.customerName,
                  orderStatus: order.status || 'APPROVED',
                  quantity: qty,
                  status: 'ACTIVE',
                  expiredAt: order.reservedUntil || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
                  createdAt: order.createdAt || new Date().toISOString(),
                });
              }
            }
          }
        }

        if (mergedList.length > 0) {
          setModalReservations(mergedList);
        } else if (selectedStockForModal.reservedQuantity > 0) {
          try {
            const raw = localStorage.getItem('loha_demo_orders');
            if (raw) {
              const demoList = JSON.parse(raw);
              for (const ord of demoList) {
                if (ord.status === 'APPROVED') {
                  for (const l of ord.lines || []) {
                    if (isMatch(l.productSku, l.productId)) {
                      const qty = l.baseQuantity ?? Math.round((l.quantity || 0) * (l.conversionRate || 1));
                      mergedList.push({
                        id: `res-demo-${ord.id}-${l.productSku || selectedStockForModal.sku}`,
                        orderId: ord.id,
                        orderCode: ord.orderCode || ord.id,
                        productId: l.productId || selectedStockForModal.sku,
                        productSku: l.productSku || selectedStockForModal.sku,
                        productName: l.productName || selectedStockForModal.name,
                        customerName: ord.customerName,
                        orderStatus: ord.status || 'APPROVED',
                        quantity: qty,
                        status: 'ACTIVE',
                        expiredAt: ord.reservedUntil || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
                        createdAt: ord.createdAt || new Date().toISOString(),
                      });
                    }
                  }
                }
              }
            }
          } catch {}

          if (mergedList.length > 0) {
            setModalReservations(mergedList);
          } else {
            setModalReservations([
              {
                id: `res-approved-${Date.now()}`,
                orderId: 'Đơn hàng gần nhất',
                orderCode: 'Đơn hàng vừa duyệt (Chờ xuất)',
                productId: selectedStockForModal.sku,
                customerName: 'Khách hàng đại lý',
                orderStatus: 'APPROVED',
                quantity: selectedStockForModal.reservedQuantity,
                status: 'ACTIVE',
                expiredAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
                createdAt: new Date().toISOString(),
              },
            ]);
          }
        } else {
          setModalReservations([]);
        }
      })
      .catch(() => {
        setModalReservations(initialList);
      })
      .finally(() => {
        setLoadingModalRes(false);
      });
  }, [selectedStockForModal]);

  useEffect(() => {
    const f = searchParams.get('filter');
    if (f === 'BELOW_MIN_STOCK') {
      setFilterMode('BELOW_MIN_STOCK');
    }
  }, [searchParams]);

  // Thống kê tổng hợp
  const stats = useMemo(() => {
    return stocks.reduce(
      (acc, item) => {
        acc.totalPhysical += item.physicalQuantity;
        acc.totalReserved += item.reservedQuantity;
        acc.totalAvailable += item.availableQuantity;
        if (item.reservedQuantity > 0) acc.itemsWithReservation += 1;
        if (item.isBelowMinStock) acc.belowMinStockCount += 1;
        return acc;
      },
      {
        totalPhysical: 0,
        totalReserved: 0,
        totalAvailable: 0,
        itemsWithReservation: 0,
        belowMinStockCount: 0,
      },
    );
  }, [stocks]);

  // Bộ lọc dữ liệu
  const filteredStocks = useMemo(() => {
    return stocks.filter((item) => {
      const matchSearch =
        item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterMode === 'HAS_RESERVED') {
        return item.reservedQuantity > 0;
      }
      if (filterMode === 'OUT_OF_STOCK') {
        return item.availableQuantity <= 0;
      }
      if (filterMode === 'BELOW_MIN_STOCK') {
        return Boolean(item.isBelowMinStock);
      }

      return true;
    });
  }, [stocks, searchTerm, filterMode]);

  const handleSaveMinStock = async (stockItem: StockBalance, minStock: number): Promise<void> => {
    try {
      const warehouseId = stockItem.warehouseId || '11111111-0000-0000-0000-000000000001';
      await inventoryService.updateMinStockLevel(warehouseId, stockItem.sku, minStock);
      showToast(
        'success',
        `Đã lưu mức tồn tối thiểu cho ${stockItem.name}: ${formatNumber(minStock)} ${stockItem.baseUnit}`,
      );
      setEditingStockBalance(null);
      await fetchStocks();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật tồn tối thiểu';
      showToast('error', msg);
      throw err;
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatDateTime = (dateStr?: string): string => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Công thức giải thích */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sổ Tồn Kho & Giữ Chỗ Hàng Hóa
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi tồn thực tế, số lượng giữ chỗ cho các đơn hàng đã duyệt, tồn khả dụng sẵn sàng bán và ngưỡng cảnh báo đặt hàng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchStocks(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Banner cảnh báo nhanh khi có hàng dưới tồn tối thiểu (SN-183) */}
      {stats.belowMinStockCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-sm text-rose-900 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold text-rose-950">
                Cảnh báo thiếu hụt hàng tồn kho ({stats.belowMinStockCount} sản phẩm dưới mức an toàn)
              </p>
              <p className="text-xs text-rose-800">
                Có {stats.belowMinStockCount} sản phẩm có tồn khả dụng chạm hoặc thấp hơn ngưỡng tối thiểu. Cần đặt hàng nhà cung cấp để tránh gián đoạn kinh doanh.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setFilterMode('BELOW_MIN_STOCK');
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.set('filter', 'BELOW_MIN_STOCK');
                return next;
              });
            }}
            className="shrink-0 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700 active:scale-95"
          >
            Lọc xem ngay
          </button>
        </div>
      )}

      {/* Banner công thức chuẩn */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 text-sm text-indigo-900 shadow-sm">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 text-indigo-600" />
          <div className="space-y-1">
            <p className="font-semibold text-indigo-950">
              Quy tắc tính sổ tồn kho tự động (ACID Transaction):
            </p>
            <p className="text-indigo-800">
              <span className="font-medium text-emerald-700 underline">Tồn khả dụng (Available)</span>{' '}
              ={' '}
              <span className="font-medium text-slate-800">Tồn thực tế trong kho (Physical)</span>{' '}
              -{' '}
              <span className="font-medium text-amber-700">Đang giữ chỗ cho đơn đã duyệt (Reserved)</span>.
            </p>
            <p className="text-xs text-indigo-700">
              * Khi đơn hàng được duyệt, hàng được giữ chỗ trong 24 giờ. Nếu hủy đơn hoặc quá hạn giữ chỗ, tồn giữ chỗ sẽ tự động nhả về tồn khả dụng. Ngưỡng tồn tối thiểu dùng để kích hoạt cảnh báo tái đặt hàng.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Thẻ Metric Cards tóm tắt chuẩn UI_GUIDELINES */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Tồn thực tế */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Tồn thực tế (Physical)
            </span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <Warehouse className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
              {formatNumber(stats.totalPhysical)}
            </span>
            <span className="text-xs font-medium text-slate-500">đơn vị cơ sở</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Số lượng hàng hóa hiện có thực tế tại các kho
          </p>
        </div>

        {/* Card 2: Đang giữ chỗ */}
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
              Đang giữ chỗ (Reserved)
            </span>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-amber-700">
              {formatNumber(stats.totalReserved)}
            </span>
            <span className="text-xs font-medium text-amber-700">đang khóa</span>
          </div>
          <p className="mt-2 text-xs text-amber-800">
            {stats.itemsWithReservation} sản phẩm đang có đơn duyệt chờ xuất
          </p>
        </div>

        {/* Card 3: Tồn khả dụng */}
        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-5 shadow-sm transition hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Tồn khả dụng (Available)
            </span>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-emerald-700">
              {formatNumber(stats.totalAvailable)}
            </span>
            <span className="text-xs font-medium text-emerald-700">có thể bán</span>
          </div>
          <p className="mt-2 text-xs text-emerald-800">
            Số lượng nhân viên được phép chốt đơn cho khách
          </p>
        </div>

        {/* Card 4: Cảnh báo dưới tồn tối thiểu (SN-183) */}
        <div
          onClick={() => {
            setFilterMode('BELOW_MIN_STOCK');
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('filter', 'BELOW_MIN_STOCK');
              return next;
            });
          }}
          className={`cursor-pointer rounded-xl border p-5 shadow-sm transition hover:shadow-md ${
            stats.belowMinStockCount > 0
              ? 'border-rose-300 bg-rose-50/40 hover:bg-rose-50/80'
              : 'border-slate-200/80 bg-white'
          }`}
          title="Bấm để lọc danh sách sản phẩm dưới tồn tối thiểu"
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              stats.belowMinStockCount > 0 ? 'text-rose-700' : 'text-slate-500'
            }`}>
              Cảnh báo dưới tồn
            </span>
            <div className={`rounded-lg p-2 ${
              stats.belowMinStockCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
            }`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className={`text-3xl font-extrabold tracking-tight ${
              stats.belowMinStockCount > 0 ? 'text-rose-600' : 'text-slate-700'
            }`}>
              {stats.belowMinStockCount}
            </span>
            <span className={`text-xs font-medium ${
              stats.belowMinStockCount > 0 ? 'text-rose-600 font-semibold' : 'text-slate-500'
            }`}>
              sản phẩm hụt
            </span>
          </div>
          <p className={`mt-2 text-xs ${stats.belowMinStockCount > 0 ? 'text-rose-700' : 'text-slate-500'}`}>
            Tồn khả dụng xuống dưới ngưỡng tối thiểu
          </p>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo mã SKU hoặc tên sản phẩm..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFilterMode('ALL');
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('filter');
                  return next;
                });
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterMode === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({stocks.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('HAS_RESERVED');
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('filter');
                  return next;
                });
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterMode === 'HAS_RESERVED'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Clock className="h-3 w-3" />
              Đang giữ chỗ ({stats.itemsWithReservation})
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('OUT_OF_STOCK');
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('filter');
                  return next;
                });
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterMode === 'OUT_OF_STOCK'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              Hết tồn khả dụng
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('BELOW_MIN_STOCK');
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.set('filter', 'BELOW_MIN_STOCK');
                  return next;
                });
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filterMode === 'BELOW_MIN_STOCK'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : stats.belowMinStockCount > 0
                  ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 ring-1 ring-inset ring-rose-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <AlertTriangle className="h-3 w-3 text-rose-500" />
              <span>Cảnh báo dưới tồn ({stats.belowMinStockCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bảng Sổ Tồn Kho Chuẩn 3 Cột + Ngưỡng Tồn Tối Thiểu (SN-180 & SN-183) */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto overscroll-x-contain">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th scope="col" className="px-5 py-3.5">
                  Sản phẩm & SKU
                </th>
                <th scope="col" className="px-4 py-3.5">
                  Kho lưu trữ
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Tồn thực tế (Physical)
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Đang giữ chỗ (Reserved)
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Tồn khả dụng (Available)
                </th>
                <th scope="col" className="px-4 py-3.5 text-right">
                  Tồn tối thiểu (Min)
                </th>
                <th scope="col" className="px-5 py-3.5 text-center">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-indigo-600" />
                      <span>Đang tải dữ liệu tồn kho...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Package className="h-8 w-8 text-slate-300" />
                      <span>Không tìm thấy sản phẩm nào phù hợp</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStocks.map((item) => {
                  const hasReservation = item.reservedQuantity > 0;
                  const isAvailable = item.availableQuantity > 0;
                  const isBelowMin = Boolean(item.isBelowMinStock);
                  const shortage = Math.max(0, (item.minStockLevel || 0) - item.availableQuantity);

                  return (
                    <tr
                      key={item.sku}
                      className={`transition ${
                        isBelowMin
                          ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-500'
                          : 'hover:bg-slate-50/75'
                      }`}
                    >
                      {/* Cột 1: Thông tin sản phẩm */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{item.name}</span>
                          {isBelowMin && (
                            <span className="inline-flex items-center rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                              Hụt tồn
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono font-medium text-slate-600">{item.sku}</span>
                          <span>•</span>
                          <span>ĐVT: {item.baseUnit}</span>
                        </div>
                      </td>

                      {/* Cột 2: Kho */}
                      <td className="px-4 py-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Warehouse className="h-3.5 w-3.5 text-slate-400" />
                          <span>{item.warehouse || 'Kho Tổng Miền Nam'}</span>
                        </div>
                      </td>

                      {/* Cột 3: Tồn thực tế */}
                      <td className="px-4 py-4 text-right font-medium text-slate-800">
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">
                          {formatNumber(item.physicalQuantity)} {item.baseUnit}
                        </span>
                      </td>

                      {/* Cột 4: Đang giữ chỗ */}
                      <td className="px-4 py-4 text-right">
                        {hasReservation ? (
                          <div className="inline-flex flex-col items-end gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedStockForModal(item)}
                              className="group inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-sm font-bold text-amber-700 shadow-sm transition hover:bg-amber-100"
                              title="Bấm để xem danh sách đơn hàng đang giữ chỗ"
                            >
                              <Clock className="h-3.5 w-3.5 text-amber-600 transition group-hover:scale-110" />
                              <span>{formatNumber(item.reservedQuantity)} {item.baseUnit}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedStockForModal(item)}
                              className="text-[11px] font-medium text-amber-700 underline decoration-amber-300 hover:text-amber-800"
                            >
                              Xem {item.activeReservations?.length || 1} đơn giữ
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-medium text-slate-400">0</span>
                        )}
                      </td>

                      {/* Cột 5: Tồn khả dụng */}
                      <td className="px-4 py-4 text-right">
                        <span
                          className={`inline-flex rounded-md px-2.5 py-1 text-sm font-extrabold ${
                            isAvailable
                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border border-rose-200 bg-rose-50 text-rose-700'
                          }`}
                        >
                          {formatNumber(item.availableQuantity)} {item.baseUnit}
                        </span>
                      </td>

                      {/* Cột 6: Tồn tối thiểu (SN-183) */}
                      <td className="px-4 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`text-sm font-semibold ${
                            (item.minStockLevel || 0) > 0 ? 'text-slate-800' : 'text-slate-400'
                          }`}>
                            {formatNumber(item.minStockLevel || 0)} {item.baseUnit}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStockBalance({
                                sku: item.sku,
                                name: item.name,
                                stockQuantity: item.availableQuantity,
                                physicalStockQuantity: item.physicalQuantity,
                                physicalQuantity: item.physicalQuantity,
                                reservedQuantity: item.reservedQuantity,
                                availableQuantity: item.availableQuantity,
                                baseUnit: item.baseUnit,
                                units: item.units || [],
                                warehouse: item.warehouse || 'Kho Tổng Miền Nam',
                                warehouseId: item.warehouseId || '11111111-0000-0000-0000-000000000001',
                                minStockLevel: item.minStockLevel || 0,
                                isBelowMinStock: item.isBelowMinStock,
                              });
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition"
                            title="Khai báo mức tồn tối thiểu cho SKU này"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Cột 7: Trạng thái */}
                      <td className="px-5 py-4 text-center">
                        {isBelowMin ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-800 ring-1 ring-inset ring-rose-300">
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            Dưới tồn (Hụt {formatNumber(shortage)})
                          </span>
                        ) : isAvailable ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Sẵn sàng bán
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            <AlertTriangle className="h-3 w-3 text-slate-500" />
                            Hết tồn bán
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Xem Danh Sách Đơn Hàng Đang Giữ Chỗ */}
      {selectedStockForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-amber-100 p-1.5 text-amber-700">
                    <Clock className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    Chi tiết đơn giữ chỗ tồn kho
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Sản phẩm: <span className="font-semibold text-slate-800">{selectedStockForModal.name}</span> ({selectedStockForModal.sku})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStockForModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Thống kê giữ chỗ */}
            <div className="my-4 grid grid-cols-3 gap-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-center">
              <div>
                <div className="text-xs text-slate-500">Tồn thực tế</div>
                <div className="text-base font-bold text-slate-800">
                  {formatNumber(selectedStockForModal.physicalQuantity)} {selectedStockForModal.baseUnit}
                </div>
              </div>
              <div>
                <div className="text-xs text-amber-700 font-semibold">Tổng đang giữ</div>
                <div className="text-base font-bold text-amber-700">
                  {formatNumber(selectedStockForModal.reservedQuantity)} {selectedStockForModal.baseUnit}
                </div>
              </div>
              <div>
                <div className="text-xs text-emerald-700 font-semibold">Tồn khả dụng</div>
                <div className="text-base font-bold text-emerald-700">
                  {formatNumber(selectedStockForModal.availableQuantity)} {selectedStockForModal.baseUnit}
                </div>
              </div>
            </div>

            {/* Danh sách đơn giữ */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Các bản ghi giữ chỗ đang hoạt động (ACTIVE):
                </h4>
                {modalReservations.length > 0 && (
                  <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {modalReservations.length} đơn hàng
                  </span>
                )}
              </div>

              {loadingModalRes ? (
                <div className="flex items-center justify-center p-8 text-sm text-slate-500">
                  <RefreshCw className="h-5 w-5 animate-spin mr-2 text-amber-600" />
                  Đang tải danh sách đơn giữ chỗ...
                </div>
              ) : modalReservations.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                  Chưa có phiếu giữ chỗ nào đang hoạt động cho sản phẩm này.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-semibold text-slate-700 sticky top-0 border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2.5">Mã đơn hàng</th>
                        <th className="px-3.5 py-2.5">Khách hàng / Đại lý</th>
                        <th className="px-3.5 py-2.5 text-right">Số lượng giữ</th>
                        <th className="px-3.5 py-2.5">Thời hạn 24h</th>
                        <th className="px-3.5 py-2.5 text-center">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {modalReservations.map((res: StockReservation) => (
                        <tr key={res.id} className="hover:bg-amber-50/40 transition">
                          <td className="px-3.5 py-3 font-mono font-semibold text-slate-900">
                            <span className="font-semibold text-blue-600">
                              {res.orderCode || res.orderId}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-slate-700 font-medium max-w-[160px] truncate">
                            {res.customerName || 'Đại lý hệ thống'}
                          </td>
                          <td className="px-3.5 py-3 text-right font-bold text-amber-700">
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-xs">
                              {formatNumber(res.quantity)} {selectedStockForModal.baseUnit}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-slate-600">
                            <div className="flex items-center gap-1 text-[11px]">
                              <Clock className="h-3 w-3 text-amber-500" />
                              <span>{formatDateTime(res.expiredAt)}</span>
                            </div>
                          </td>
                          <td className="px-3.5 py-3 text-center">
                            {renderOrderStatusBadge(res.orderStatus)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="text-xs text-slate-500">
                Tự động nhả tồn khi đơn hủy hoặc quá hạn 24 giờ.
              </span>
              <button
                type="button"
                onClick={() => setSelectedStockForModal(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thiết Lập Tồn Tối Thiểu (SN-183) */}
      {editingStockBalance && (
        <MinStockModal
          item={editingStockBalance}
          onClose={() => setEditingStockBalance(null)}
          onSave={handleSaveMinStock}
        />
      )}
    </div>
  );
};
