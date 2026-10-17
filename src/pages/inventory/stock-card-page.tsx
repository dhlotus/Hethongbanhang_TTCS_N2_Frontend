import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  ArrowLeft,
  Building2,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  SlidersHorizontal,
  ExternalLink,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  User,
  AlertTriangle,
} from 'lucide-react';
import { inventoryService } from '../../services/inventory.service';
import { productsService } from '../../services/products.service';
import { showToast } from '../../components/toast';
import { STANDARD_WAREHOUSES, type StandardWarehouse } from '../../constants/warehouse.constants';
import { getStoredUser } from '../../utils/navigation';
import type { InventoryTransaction, Product } from '../../types/products';

export const StockCardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = getStoredUser();

  // URL Query Params ban đầu
  const initialSku = searchParams.get('sku') || '';
  const initialWarehouse = searchParams.get('warehouse') || searchParams.get('warehouseId') || 'ALL';
  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';

  // State danh sách & dữ liệu
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [warehousesList] = useState<StandardWarehouse[]>(STANDARD_WAREHOUSES);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc
  const [selectedSku, setSelectedSku] = useState<string>(initialSku);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(initialWarehouse);
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Modal xem chi tiết giao dịch
  const [selectedTxForDetail, setSelectedTxForDetail] = useState<InventoryTransaction | null>(null);

  // Xác định thông tin vai trò người dùng
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('ADMIN');
  const isManager =
    userRoles.includes('WAREHOUSE_MANAGER') ||
    userRoles.includes('WH_MANAGER') ||
    isAdmin;
  const isKeeper =
    !isManager &&
    (userRoles.includes('WAREHOUSE_KEEPER') ||
      userRoles.includes('WAREHOUSE') ||
      userRoles.includes('WH_KEEPER'));

  // Xác định kho công tác của Thủ kho
  const keeperWarehouse = useMemo(() => {
    if (!user) return STANDARD_WAREHOUSES[2];
    const userWhId = user.warehouseId || user.assignedWarehouseId;
    if (userWhId) {
      const match = STANDARD_WAREHOUSES.find((w) => w.id === userWhId);
      if (match) return match;
    }
    const rawWh = (user.warehouseCode || user.assignedWarehouseCode || user.assignedWarehouse || '').toUpperCase();
    if (rawWh.includes('WH02') || rawWh.includes('HÀ NỘI') || rawWh.includes('HA NOI') || rawWh.includes('MB')) {
      return STANDARD_WAREHOUSES[0]; // Kho Miền Bắc
    }
    if (rawWh.includes('WH03') || rawWh.includes('ĐÀ NẴNG') || rawWh.includes('DA NANG') || rawWh.includes('MT')) {
      return STANDARD_WAREHOUSES[1]; // Kho Miền Trung
    }
    if (rawWh.includes('WEST') || rawWh.includes('CẦN THƠ') || rawWh.includes('CAN THO')) {
      return STANDARD_WAREHOUSES[3]; // Kho Miền Tây
    }
    return STANDARD_WAREHOUSES[2]; // Kho Miền Nam (TP. Hồ Chí Minh)
  }, [user]);

  // Tải danh mục sản phẩm phục vụ Dropdown chọn SKU
  useEffect(() => {
    productsService
      .getProducts({ limit: 500, status: 'ACTIVE' })
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setAllProducts(res.data);
          if (!selectedSku && !initialSku) {
            setSelectedSku(res.data[0].sku);
          }
        }
      })
      .catch(() => {});
  }, [selectedSku, initialSku]);

  // Nếu là thủ kho và chưa chọn kho trên URL, tự động gán kho của thủ kho
  useEffect(() => {
    if (isKeeper && selectedWarehouse === 'ALL' && !searchParams.get('warehouse')) {
      setSelectedWarehouse(keeperWarehouse.name);
    }
  }, [isKeeper, keeperWarehouse, selectedWarehouse, searchParams]);

  // Hàm tải danh sách biến động giao dịch
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        sku: selectedSku || undefined,
        warehouse: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 500,
      };

      const data = await inventoryService.getTransactions(params);
      setTransactions(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử thẻ kho';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [selectedSku, selectedWarehouse, startDate, endDate]);

  // Gọi fetch khi bộ lọc thay đổi
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Đồng bộ bộ lọc lên URL query params
  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (selectedSku) nextParams.set('sku', selectedSku);
    if (selectedWarehouse && selectedWarehouse !== 'ALL') nextParams.set('warehouse', selectedWarehouse);
    if (startDate) nextParams.set('startDate', startDate);
    if (endDate) nextParams.set('endDate', endDate);
    setSearchParams(nextParams, { replace: true });
  }, [selectedSku, selectedWarehouse, startDate, endDate, setSearchParams]);

  // Tìm thông tin chi tiết sản phẩm đang chọn
  const currentProduct = useMemo(() => {
    if (!selectedSku) return null;
    return allProducts.find((p) => p.sku.toUpperCase() === selectedSku.toUpperCase()) || null;
  }, [allProducts, selectedSku]);

  // Lấy đơn vị quy đổi tóm tắt (nếu có)
  const conversionSummary = useMemo(() => {
    if (!currentProduct?.units || currentProduct.units.length <= 1) return null;
    return currentProduct.units
      .filter((u) => !u.isBaseUnit)
      .map((u) => `1 ${u.unitName} = ${u.conversionRate} ${currentProduct.baseUnit}`)
      .join(', ');
  }, [currentProduct]);

  // Kiểm tra xem có đang áp dụng bộ lọc nào không
  const hasActiveFilters = useMemo(() => {
    return Boolean(
      (selectedWarehouse !== 'ALL' && (!isKeeper || selectedWarehouse !== keeperWarehouse.name)) ||
      startDate ||
      endDate
    );
  }, [selectedWarehouse, isKeeper, keeperWarehouse, startDate, endDate]);

  // Reset bộ lọc về mặc định
  const handleResetFilters = () => {
    setSelectedWarehouse(isKeeper ? keeperWarehouse.name : 'ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };

  // Phân trang danh sách giao dịch
  const totalPages = Math.max(1, Math.ceil(transactions.length / pageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return transactions.slice(start, start + pageSize);
  }, [transactions, currentPage, pageSize]);

  // Điều hướng tới chứng từ gốc tương ứng (AC2)
  const handleNavigateToDocument = (referenceCode: string) => {
    if (!referenceCode) return;
    const code = referenceCode.trim().toUpperCase();

    if (code.startsWith('PNK')) {
      navigate(`/inventory/receipts?search=${encodeURIComponent(code)}`);
    } else if (code.startsWith('PKK')) {
      navigate(`/inventory/audits?search=${encodeURIComponent(code)}`);
    } else if (code.startsWith('PCK')) {
      navigate(`/inventory/transfers?search=${encodeURIComponent(code)}`);
    } else if (code.startsWith('PXK')) {
      navigate(`/inventory/issues?search=${encodeURIComponent(code)}`);
    } else if (code.startsWith('DH') || code.startsWith('SO')) {
      navigate(`/warehouse/orders?search=${encodeURIComponent(code)}`);
    } else {
      showToast('info', `Chứng từ tham chiếu: ${referenceCode}`);
    }
  };

  // Hiển thị badge nghiệp vụ nhỏ gọn
  const renderTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'IMPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600 shrink-0" />
            Nhập kho
          </span>
        );
      case 'ORDER':
      case 'EXPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <ArrowUpRight className="w-3 h-3 text-blue-600 shrink-0" />
            Xuất bán
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <ArrowRightLeft className="w-3 h-3 text-purple-600 shrink-0" />
            Điều chuyển
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <SlidersHorizontal className="w-3 h-3 text-amber-600 shrink-0" />
            Kiểm kê / Điều chỉnh
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-5 space-y-4 max-w-[1600px] mx-auto">
      {/* 1. Header Bar: Tiêu đề gọn gàng, tối ưu không chiếm diện tích */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/inventory/stock')}
            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Quay lại Sổ tồn kho"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            Thẻ kho hàng hóa
          </h1>
        </div>

        {/* Nút đặt lại bộ lọc nếu có lọc */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Đặt lại các bộ lọc"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>

      {/* 2. Khối Bộ Lọc: Tối ưu trực quan - chỉ lọc theo Kho hàng và Khoảng thời gian */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          {/* Lọc 1: Sản Phẩm */}
          <div className="md:col-span-5 space-y-1">
            <label className="block text-xs font-semibold text-slate-600">
              Sản phẩm theo dõi <span className="text-rose-500">*</span>
              {conversionSummary && (
                <span className="text-[11px] font-normal text-indigo-600 ml-1">
                  ({conversionSummary})
                </span>
              )}
            </label>
            <div className="relative">
              <Package className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <select
                value={selectedSku}
                onChange={(e) => {
                  setSelectedSku(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer truncate"
              >
                {allProducts.length === 0 ? (
                  <option value={selectedSku}>{selectedSku || 'Đang tải sản phẩm...'}</option>
                ) : (
                  allProducts.map((p) => (
                    <option key={p.id} value={p.sku}>
                      [{p.sku}] {p.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Lọc 2: Kho Hàng */}
          <div className="md:col-span-3 space-y-1">
            <label className="block text-xs font-semibold text-slate-600">
              Kho hàng phát sinh
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <select
                value={selectedWarehouse}
                onChange={(e) => {
                  setSelectedWarehouse(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer truncate"
              >
                <option value="ALL">Tất cả kho hàng</option>
                {warehousesList.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.displayName || w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lọc 3: Khoảng thời gian (Từ ngày -> Đến ngày) */}
          <div className="md:col-span-4 space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-600">
                Khoảng thời gian
              </label>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setCurrentPage(1);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Xóa khoảng ngày"
                >
                  (Xóa ngày)
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all"
                title="Từ ngày"
              />
              <span className="text-slate-400 font-medium text-xs">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-2 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer transition-all"
                title="Đến ngày"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bảng Thẻ Kho Tối Ưu Gọn Gàng: Chỉ giữ các cột thiết yếu, bấm Xem chi tiết để xem toàn bộ */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Header bảng gọn */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-xs sm:text-sm">
              Lịch sử phát sinh biến động tồn kho
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {transactions.length} bản ghi
            </span>
          </div>
        </div>

        {/* Bảng dữ liệu chính: Bảng tinh gọn, không dàn trải */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2.5 px-3.5 whitespace-nowrap">Thời gian</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Chứng từ gốc</th>
                <th className="py-2.5 px-3.5 whitespace-nowrap">Nghiệp vụ</th>
                <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Biến động</th>
                <th className="py-2.5 px-3.5 text-right whitespace-nowrap bg-indigo-50/30 text-indigo-900 font-bold">
                  Tồn sau
                </th>
                <th className="py-2.5 px-3.5 text-center whitespace-nowrap">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 text-xs">
                    Đang tải lịch sử phát sinh...
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <AlertTriangle className="w-7 h-7 text-amber-500" />
                      <span className="text-xs sm:text-sm font-semibold text-slate-700">
                        Không có phát sinh nào phù hợp
                      </span>
                      <p className="text-xs text-slate-400">
                        Vui lòng chọn sản phẩm khác hoặc đặt lại bộ lọc.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const isPositive = tx.baseQuantityChange > 0;
                  const isNegative = tx.baseQuantityChange < 0;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 transition-colors text-xs sm:text-sm"
                    >
                      {/* 1. Thời gian: Gọn gàng */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap text-slate-600">
                        <div className="font-semibold text-slate-800">
                          {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {new Date(tx.createdAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* 2. Chứng từ gốc (Clickable Link - AC2) */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {tx.referenceCode ? (
                          <button
                            type="button"
                            onClick={() => handleNavigateToDocument(tx.referenceCode)}
                            className="inline-flex items-center gap-1 font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50/70 border border-indigo-200/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                            title={`Mở chứng từ gốc: ${tx.referenceCode}`}
                          >
                            <span>{tx.referenceCode}</span>
                            <ExternalLink className="w-3 h-3 text-indigo-400" />
                          </button>
                        ) : (
                          <span className="text-slate-400 italic text-xs">-</span>
                        )}
                      </td>

                      {/* 3. Loại nghiệp vụ: Badge nhỏ gọn */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {renderTransactionTypeBadge(tx.transactionType)}
                      </td>

                      {/* 4. Biến động (+/-) */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <span
                          className={`font-bold text-xs sm:text-sm tabular-nums ${
                            isPositive
                              ? 'text-emerald-600'
                              : isNegative
                              ? 'text-rose-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {isPositive ? `+${tx.baseQuantityChange}` : tx.baseQuantityChange}{' '}
                          <span className="text-[11px] font-normal text-slate-500">{tx.baseUnit}</span>
                        </span>
                      </td>

                      {/* 5. Tồn sau phát sinh (In đậm, rõ ràng) */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap bg-indigo-50/30 tabular-nums">
                        <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                          {tx.newStock.toLocaleString('vi-VN')}
                        </span>
                        <span className="text-[11px] font-medium text-indigo-700 ml-1">
                          {tx.baseUnit}
                        </span>
                      </td>

                      {/* 6. Nút Xem chi tiết: Bấm vào để hiện đầy đủ toàn bộ thông tin */}
                      <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedTxForDetail(tx)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                          title="Xem chi tiết toàn bộ giao dịch này"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Chi tiết</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh Phân Trang (10 - 20 - 50 - 100 Dòng) */}
        {transactions.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">Số dòng:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
              <span className="text-slate-400 text-[11px]">
                ({(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, transactions.length)} trên {transactions.length})
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 7) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - currentPage) <= 1;
                  })
                  .map((p, idx, arr) => {
                    const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && <span className="px-1 text-slate-400">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-7 h-7 rounded-md text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                            currentPage === p
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Modal Xem Chi Tiết Giao Dịch & Chứng Từ Gốc: Hiện đầy đủ toàn bộ thông tin khi bấm nút Chi tiết */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xl transition-all">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Chi tiết giao dịch thẻ kho
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Chứng từ tham chiếu:{' '}
                  <strong className="text-indigo-700 font-mono">
                    {selectedTxForDetail.referenceCode || 'Không có mã'}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTxForDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thống kê 3 chỉ số tồn & biến động */}
            <div className="my-3.5 grid grid-cols-3 gap-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-center text-xs">
              <div>
                <div className="text-slate-500 text-[11px]">Tồn trước</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedTxForDetail.previousStock.toLocaleString('vi-VN')} {selectedTxForDetail.baseUnit}
                </div>
              </div>
              <div>
                <div className="text-indigo-700 font-semibold text-[11px]">Biến động</div>
                <div
                  className={`text-sm font-extrabold mt-0.5 ${
                    selectedTxForDetail.baseQuantityChange >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {selectedTxForDetail.baseQuantityChange >= 0
                    ? `+${selectedTxForDetail.baseQuantityChange}`
                    : selectedTxForDetail.baseQuantityChange}{' '}
                  {selectedTxForDetail.baseUnit}
                </div>
              </div>
              <div>
                <div className="text-indigo-900 font-semibold text-[11px]">Tồn sau</div>
                <div className="text-sm font-black text-indigo-700 mt-0.5">
                  {selectedTxForDetail.newStock.toLocaleString('vi-VN')} {selectedTxForDetail.baseUnit}
                </div>
              </div>
            </div>

            {/* Chi tiết tất cả các thông tin khi bấm Xem chi tiết */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Sản phẩm:</span>
                <span className="font-semibold text-slate-800 text-right">
                  [{selectedTxForDetail.sku}] {selectedTxForDetail.productName}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Nghiệp vụ:</span>
                <span>{renderTransactionTypeBadge(selectedTxForDetail.transactionType)}</span>
              </div>

              {selectedTxForDetail.inputUnit && selectedTxForDetail.inputUnit !== selectedTxForDetail.baseUnit && (
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Đơn vị gọi hàng:</span>
                  <span className="font-semibold text-indigo-700">
                    {selectedTxForDetail.inputQuantity} {selectedTxForDetail.inputUnit} (Quy đổi: x{selectedTxForDetail.conversionRate})
                  </span>
                </div>
              )}

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Kho bãi phát sinh:</span>
                <span className="font-medium text-slate-800">{selectedTxForDetail.warehouse}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Thời gian ghi nhận:</span>
                <span className="font-medium text-slate-800">
                  {new Date(selectedTxForDetail.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Người thực hiện:</span>
                <span className="font-semibold text-slate-800">
                  <div className="inline-flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    <span>{selectedTxForDetail.performedBy || 'Hệ thống'}</span>
                  </div>
                </span>
              </div>

              <div className="py-1.5">
                <span className="text-slate-500 block mb-1 font-medium">Nguyên nhân:</span>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium leading-relaxed">
                  {selectedTxForDetail.reason || 'Không có ghi chú thêm.'}
                </div>
              </div>
            </div>

            {/* Footer Modal: Nút Đóng & Nút Mở chứng từ gốc */}
            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3.5">
              <button
                type="button"
                onClick={() => setSelectedTxForDetail(null)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Đóng
              </button>

              {selectedTxForDetail.referenceCode && (
                <button
                  type="button"
                  onClick={() => {
                    const code = selectedTxForDetail.referenceCode;
                    setSelectedTxForDetail(null);
                    handleNavigateToDocument(code);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <span>Mở chứng từ gốc</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockCardPage;
