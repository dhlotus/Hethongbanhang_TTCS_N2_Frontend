import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  ArrowLeft,
  RefreshCw,
  Printer,
  Download,
  Search,
  Filter,
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
  Clock,
  User,
  AlertTriangle,
  Layers,
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
  const initialType = searchParams.get('type') || 'ALL';
  const initialStartDate = searchParams.get('startDate') || '';
  const initialEndDate = searchParams.get('endDate') || '';
  const initialSearch = searchParams.get('search') || searchParams.get('q') || '';

  // State danh sách & dữ liệu
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [warehousesList] = useState<StandardWarehouse[]>(STANDARD_WAREHOUSES);
  const [loading, setLoading] = useState<boolean>(true);

  // Bộ lọc
  const [selectedSku, setSelectedSku] = useState<string>(initialSku);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>(initialWarehouse);
  const [selectedType, setSelectedType] = useState<string>(initialType);
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);
  const [quickDateFilter, setQuickDateFilter] = useState<string>('ALL');
  const [searchText, setSearchText] = useState<string>(initialSearch);

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);

  // Modal xem nhanh chứng từ gốc
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
    if (rawWh.includes('WH02') || rawWh.includes('HÀ NỘI') || rawWh.includes('HA NOI')) {
      return STANDARD_WAREHOUSES[1];
    }
    if (rawWh.includes('WH03') || rawWh.includes('ĐÀ NẴNG') || rawWh.includes('DA NANG')) {
      return STANDARD_WAREHOUSES[3];
    }
    return STANDARD_WAREHOUSES[2]; // Kho Tổng Miền Nam
  }, [user]);

  // Tải danh mục sản phẩm phục vụ Dropdown chọn SKU
  useEffect(() => {
    productsService
      .getProducts({ limit: 500, status: 'ACTIVE' })
      .then((res) => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setAllProducts(res.data);
          // Nếu chưa có SKU trên URL hoặc State, tự động chọn sản phẩm đầu tiên
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
  const fetchTransactions = useCallback(async (isRefresh = false) => {
    setLoading(true);
    try {
      const params = {
        sku: selectedSku || undefined,
        warehouse: selectedWarehouse !== 'ALL' ? selectedWarehouse : undefined,
        type: selectedType !== 'ALL' ? selectedType : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: searchText.trim() || undefined,
        limit: 500,
      };

      const data = await inventoryService.getTransactions(params);
      setTransactions(data);
      if (isRefresh) {
        showToast('success', 'Đã làm mới dữ liệu thẻ kho');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tải lịch sử thẻ kho';
      showToast('error', msg);
    } finally {
      setLoading(false);
    }
  }, [selectedSku, selectedWarehouse, selectedType, startDate, endDate, searchText]);

  // Gọi fetch khi bộ lọc thay đổi
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Đồng bộ bộ lọc lên URL query params
  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (selectedSku) nextParams.set('sku', selectedSku);
    if (selectedWarehouse && selectedWarehouse !== 'ALL') nextParams.set('warehouse', selectedWarehouse);
    if (selectedType && selectedType !== 'ALL') nextParams.set('type', selectedType);
    if (startDate) nextParams.set('startDate', startDate);
    if (endDate) nextParams.set('endDate', endDate);
    if (searchText) nextParams.set('search', searchText);
    setSearchParams(nextParams, { replace: true });
  }, [selectedSku, selectedWarehouse, selectedType, startDate, endDate, searchText, setSearchParams]);

  // Tìm thông tin chi tiết sản phẩm đang chọn
  const currentProduct = useMemo(() => {
    if (!selectedSku) return null;
    return allProducts.find((p) => p.sku.toUpperCase() === selectedSku.toUpperCase()) || null;
  }, [allProducts, selectedSku]);

  // Xử lý nút lọc thời gian nhanh
  const handleQuickDateFilter = (filterKey: string) => {
    setQuickDateFilter(filterKey);
    const now = new Date();
    setCurrentPage(1);

    if (filterKey === 'ALL') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (filterKey === 'TODAY') {
      const todayStr = now.toISOString().slice(0, 10);
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }

    if (filterKey === 'LAST_7_DAYS') {
      const past = new Date(now.getTime() - 7 * 86400000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
      return;
    }

    if (filterKey === 'LAST_30_DAYS') {
      const past = new Date(now.getTime() - 30 * 86400000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
      return;
    }

    if (filterKey === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(startOfMonth.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
      return;
    }
  };

  // Tính toán KPI Tổng hợp kỳ báo cáo (Tồn đầu kỳ, Tổng nhập, Tổng xuất, Tồn cuối kỳ)
  const summaryStats = useMemo(() => {
    if (transactions.length === 0) {
      return {
        openingStock: 0,
        totalImport: 0,
        totalExport: 0,
        closingStock: 0,
        count: 0,
      };
    }

    // Danh sách đã sắp xếp từ mới nhất đến cũ nhất
    let totalImport = 0;
    let totalExport = 0;

    for (const tx of transactions) {
      if (tx.baseQuantityChange > 0) {
        totalImport += tx.baseQuantityChange;
      } else {
        totalExport += Math.abs(tx.baseQuantityChange);
      }
    }

    // Giao dịch mới nhất thể hiện tồn cuối kỳ
    const latestTx = transactions[0];
    const closingStock = latestTx.newStock;

    // Giao dịch cũ nhất thể hiện tồn đầu kỳ
    const oldestTx = transactions[transactions.length - 1];
    const openingStock = oldestTx.previousStock;

    return {
      openingStock,
      totalImport,
      totalExport,
      closingStock,
      count: transactions.length,
    };
  }, [transactions]);

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

  // Hiển thị badge nghiệp vụ
  const renderTransactionTypeBadge = (type: string) => {
    switch (type) {
      case 'IMPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600 shrink-0" />
            Nhập kho
          </span>
        );
      case 'ORDER':
      case 'EXPORT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <ArrowUpRight className="w-3 h-3 text-blue-600 shrink-0" />
            Xuất bán
          </span>
        );
      case 'TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20">
            <ArrowRightLeft className="w-3 h-3 text-purple-600 shrink-0" />
            Điều chuyển
          </span>
        );
      case 'ADJUSTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <SlidersHorizontal className="w-3 h-3 text-amber-600 shrink-0" />
            Kiểm kê / Điều chỉnh
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {type}
          </span>
        );
    }
  };

  // Xuất file Excel / CSV UTF-8 có BOM
  const handleExportCsv = () => {
    if (transactions.length === 0) {
      showToast('warning', 'Không có dữ liệu thẻ kho để xuất file');
      return;
    }

    const headers = [
      'STT',
      'Ngày giờ',
      'Mã chứng từ',
      'Loại nghiệp vụ',
      'SKU',
      'Tên sản phẩm',
      'Kho bãi',
      'Đơn vị tính',
      'Số lượng phát sinh',
      'Tồn trước phát sinh',
      'Tồn sau phát sinh',
      'Lý do / Diễn giải',
      'Người thực hiện',
    ];

    const rows = transactions.map((tx, idx) => [
      idx + 1,
      `"${new Date(tx.createdAt).toLocaleString('vi-VN')}"`,
      `"${tx.referenceCode || ''}"`,
      `"${tx.transactionType}"`,
      `"${tx.sku}"`,
      `"${(tx.productName || '').replace(/"/g, '""')}"`,
      `"${(tx.warehouse || '').replace(/"/g, '""')}"`,
      `"${tx.baseUnit}"`,
      tx.baseQuantityChange > 0 ? `+${tx.baseQuantityChange}` : tx.baseQuantityChange,
      tx.previousStock,
      tx.newStock,
      `"${(tx.reason || '').replace(/"/g, '""')}"`,
      `"${(tx.performedBy || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `the_kho_${selectedSku || 'tong_hop'}_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', 'Đã tải xuống file Thẻ kho (CSV/Excel) thành công!');
  };

  // In thẻ kho chuẩn
  const handlePrintStockCard = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto print:p-0 print:m-0">
      {/* 1. Header Bar: Tiêu đề Thẻ kho + Nút chức năng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 print:border-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/inventory/stock')}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer print:hidden"
              title="Quay lại Sổ tồn kho"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl print:hidden">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Thẻ Kho Hàng Hóa (Stock Card)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 pl-8 sm:pl-9">
            Theo dõi toàn bộ lịch sử biến động nhập, xuất, chuyển, kiểm kê và truy nguyên chứng từ làm số tồn bị lệch (SN-185).
          </p>
        </div>

        {/* Nút tác vụ nhanh */}
        <div className="flex items-center gap-2 print:hidden self-end sm:self-auto">
          <button
            type="button"
            onClick={() => fetchTransactions(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handlePrintStockCard}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-2xs transition-all cursor-pointer"
            title="In thẻ kho chuẩn A4"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>In thẻ kho</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all cursor-pointer"
            title="Xuất file Excel / CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Thanh Lọc Toàn Diện (Sản phẩm, Kho bãi, Ngày từ - đến, Loại nghiệp vụ, Tìm kiếm) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Lọc 1: Chọn Sản Phẩm (SKU / Tên) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Sản phẩm theo dõi <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Package className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedSku}
                onChange={(e) => {
                  setSelectedSku(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer truncate"
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
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Kho hàng phát sinh
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedWarehouse}
                onChange={(e) => {
                  setSelectedWarehouse(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
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

          {/* Lọc 3: Loại Nghiệp Vụ */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Loại nghiệp vụ
            </label>
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
              >
                <option value="ALL">Tất cả nghiệp vụ</option>
                <option value="IMPORT">Nhập kho (IMPORT)</option>
                <option value="ORDER">Xuất bán đơn hàng (ORDER)</option>
                <option value="EXPORT">Xuất kho khác (EXPORT)</option>
                <option value="TRANSFER">Điều chuyển kho (TRANSFER)</option>
                <option value="ADJUSTMENT">Kiểm kê / Điều chỉnh (ADJUSTMENT)</option>
              </select>
            </div>
          </div>

          {/* Lọc 4: Tìm kiếm theo mã chứng từ / người lập */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tìm chứng từ / Ghi chú
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Mã PNK, PKK, PCK, DH..."
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
              {searchText && (
                <button
                  type="button"
                  onClick={() => setSearchText('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hàng 2: Bộ lọc ngày (Từ ngày - Đến ngày) & Phím tắt chọn nhanh */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
              Khoảng ngày:
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setQuickDateFilter('CUSTOM');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                title="Từ ngày"
              />
              <span className="text-slate-400">→</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setQuickDateFilter('CUSTOM');
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
                title="Đến ngày"
              />
            </div>
          </div>

          {/* Quick Date Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Toàn bộ thời gian' },
              { id: 'TODAY', label: 'Hôm nay' },
              { id: 'LAST_7_DAYS', label: '7 ngày qua' },
              { id: 'LAST_30_DAYS', label: '30 ngày qua' },
              { id: 'THIS_MONTH', label: 'Tháng này' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => handleQuickDateFilter(btn.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  quickDateFilter === btn.id
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Thông tin sản phẩm đang đối soát */}
        {currentProduct && (
          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-indigo-700 bg-white border border-indigo-200 px-2.5 py-1 rounded-md shadow-2xs">
                {currentProduct.sku}
              </span>
              <div>
                <span className="font-bold text-slate-900 text-sm">{currentProduct.name}</span>
                <div className="text-slate-500 flex items-center gap-2 mt-0.5">
                  <span>Nhóm hàng: <strong>{currentProduct.category || 'Mặc định'}</strong></span>
                  <span>•</span>
                  <span>ĐVT cơ sở: <strong className="text-indigo-700">{currentProduct.baseUnit}</strong></span>
                </div>
              </div>
            </div>

            {currentProduct.units && currentProduct.units.length > 1 && (
              <div className="flex items-center gap-1.5 text-slate-600 bg-white/80 px-2.5 py-1 rounded-lg border border-indigo-100">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Quy đổi:</span>
                {currentProduct.units
                  .filter((u) => !u.isBaseUnit)
                  .map((u, i) => (
                    <span key={i} className="font-semibold text-slate-800">
                      1 {u.unitName} = {u.conversionRate} {currentProduct.baseUnit}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Bốn Thẻ KPI Tổng Hợp Kỳ Báo Cáo (Tồn đầu kỳ, Tổng nhập, Tổng xuất, Tồn cuối kỳ) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Tồn Đầu Kỳ */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Tồn đầu kỳ
            </span>
            <div className="p-2 bg-slate-100 text-slate-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-slate-900 tabular-nums">
            {summaryStats.openingStock.toLocaleString('vi-VN')}
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              {currentProduct?.baseUnit || 'Đơn vị'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Thời điểm trước phát sinh đầu tiên</p>
        </div>

        {/* Card 2: Tổng Lượng Nhập (+) */}
        <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Tổng phát sinh nhập (+)
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-emerald-600 tabular-nums">
            +{summaryStats.totalImport.toLocaleString('vi-VN')}
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              {currentProduct?.baseUnit || 'Đơn vị'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Các phiếu nhập, nhận chuyển kho</p>
        </div>

        {/* Card 3: Tổng Lượng Xuất (-) */}
        <div className="rounded-2xl border border-rose-200/80 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Tổng phát sinh xuất (-)
            </span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-extrabold text-rose-600 tabular-nums">
            -{summaryStats.totalExport.toLocaleString('vi-VN')}
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              {currentProduct?.baseUnit || 'Đơn vị'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Xuất bán, điều chuyển đi, hao hụt</p>
        </div>

        {/* Card 4: Tồn Cuối Kỳ (=) */}
        <div className="rounded-2xl border border-indigo-200 bg-white p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">
              Tồn cuối kỳ (=)
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-black text-indigo-600 tabular-nums">
            {summaryStats.closingStock.toLocaleString('vi-VN')}
            <span className="text-xs font-normal text-slate-500 ml-1.5">
              {currentProduct?.baseUnit || 'Đơn vị'}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Số tồn khả dụng sau giao dịch mới nhất
          </p>
        </div>
      </div>

      {/* 4. Bảng Dữ Liệu Thẻ Kho (Chi Tiết Phát Sinh & Tồn Sau Phát Sinh) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Header trên bảng */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 text-sm">
              Sổ phát sinh nhập / xuất / chuyển / điều chỉnh
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {transactions.length} bản ghi
            </span>
          </div>
          <div className="text-xs text-slate-500 italic">
            * Mỗi dòng thể hiện số tồn sau phát sinh và liên kết trực tiếp tới chứng từ gốc (AC1 & AC2).
          </div>
        </div>

        {/* Bảng dữ liệu chính */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 whitespace-nowrap">Thời gian</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Chứng từ gốc</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Nghiệp vụ</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Kho hàng</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Biến động (+/-)</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">Tồn trước</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap bg-indigo-50/40 text-indigo-900 font-extrabold">
                  Tồn sau phát sinh
                </th>
                <th className="py-3.5 px-4 min-w-[220px]">Diễn giải / Nguyên nhân lệch</th>
                <th className="py-3.5 px-4 whitespace-nowrap">Người thực hiện</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap print:hidden">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
                      <span className="text-xs font-medium">Đang truy xuất thẻ kho hàng hóa...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertTriangle className="w-8 h-8 text-amber-500" />
                      <span className="text-sm font-semibold text-slate-700">
                        Không có phát sinh nào phù hợp với bộ lọc
                      </span>
                      <p className="text-xs text-slate-400">
                        Vui lòng mở rộng khoảng thời gian hoặc chọn kho bãi / loại nghiệp vụ khác.
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
                      className="hover:bg-slate-50/80 transition-colors group text-xs sm:text-sm"
                    >
                      {/* 1. Thời gian */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {tx.referenceCode ? (
                          <button
                            type="button"
                            onClick={() => handleNavigateToDocument(tx.referenceCode)}
                            className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline bg-indigo-50/70 border border-indigo-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs group-hover:border-indigo-300"
                            title={`Mở chứng từ gốc: ${tx.referenceCode}`}
                          >
                            <span>{tx.referenceCode}</span>
                            <ExternalLink className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600" />
                          </button>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Không có</span>
                        )}
                      </td>

                      {/* 3. Loại nghiệp vụ */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {renderTransactionTypeBadge(tx.transactionType)}
                      </td>

                      {/* 4. Kho hàng */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-700">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="line-clamp-1">{tx.warehouse}</span>
                        </div>
                      </td>

                      {/* 5. Biến động (+/-) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className={`font-extrabold text-sm tabular-nums ${
                            isPositive
                              ? 'text-emerald-600'
                              : isNegative
                              ? 'text-rose-600'
                              : 'text-slate-600'
                          }`}
                        >
                          {isPositive ? `+${tx.baseQuantityChange}` : tx.baseQuantityChange}{' '}
                          <span className="text-xs font-normal text-slate-500">{tx.baseUnit}</span>
                        </div>
                        {tx.inputUnit && tx.inputUnit !== tx.baseUnit && (
                          <div className="text-[11px] text-slate-400">
                            ({tx.inputQuantity > 0 ? `+${tx.inputQuantity}` : tx.inputQuantity}{' '}
                            {tx.inputUnit} x {tx.conversionRate})
                          </div>
                        )}
                      </td>

                      {/* 6. Tồn trước phát sinh */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-600 tabular-nums font-semibold">
                        {tx.previousStock.toLocaleString('vi-VN')}{' '}
                        <span className="text-xs font-normal text-slate-400">{tx.baseUnit}</span>
                      </td>

                      {/* 7. Tồn sau phát sinh (In đậm, nổi bật - AC2) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap bg-indigo-50/40 tabular-nums">
                        <span className="font-extrabold text-slate-900 text-sm">
                          {tx.newStock.toLocaleString('vi-VN')}
                        </span>
                        <span className="text-xs font-semibold text-indigo-700 ml-1">
                          {tx.baseUnit}
                        </span>
                      </td>

                      {/* 8. Diễn giải / Nguyên nhân lệch */}
                      <td className="py-3.5 px-4 text-slate-700 text-xs">
                        <div className="font-medium line-clamp-2" title={tx.reason}>
                          {tx.reason || 'Biến động phát sinh thường lệ'}
                        </div>
                      </td>

                      {/* 9. Người thực hiện */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 text-xs">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-medium">{tx.performedBy || 'Hệ thống'}</span>
                        </div>
                      </td>

                      {/* 10. Xem nhanh chi tiết */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap print:hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedTxForDetail(tx)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="Xem chi tiết giao dịch này"
                        >
                          <Eye className="w-4 h-4" />
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
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 print:hidden">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-600">Số dòng:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
              >
                <option value={10}>10 dòng</option>
                <option value={20}>20 dòng</option>
                <option value={50}>50 dòng</option>
                <option value={100}>100 dòng</option>
              </select>
              <span className="text-slate-400 ml-1">
                (Hiển thị {(currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, transactions.length)} trên {transactions.length})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
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
                          className={`w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                            currentPage === p
                              ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
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
                className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center shadow-2xs cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 5. Modal Xem Nhanh Chi Tiết Giao Dịch & Chứng Từ Gốc */}
      {selectedTxForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl transition-all">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
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
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thống kê biến động */}
            <div className="my-4 grid grid-cols-3 gap-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-center text-xs">
              <div>
                <div className="text-slate-500">Tồn trước</div>
                <div className="text-sm font-bold text-slate-800 mt-0.5">
                  {selectedTxForDetail.previousStock.toLocaleString('vi-VN')} {selectedTxForDetail.baseUnit}
                </div>
              </div>
              <div>
                <div className="text-indigo-700 font-semibold">Biến động</div>
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
                <div className="text-indigo-900 font-semibold">Tồn sau</div>
                <div className="text-sm font-black text-indigo-700 mt-0.5">
                  {selectedTxForDetail.newStock.toLocaleString('vi-VN')} {selectedTxForDetail.baseUnit}
                </div>
              </div>
            </div>

            {/* Chi tiết các trường */}
            <div className="space-y-2.5 text-xs">
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

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Kho bãi:</span>
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
                  {selectedTxForDetail.performedBy || 'Hệ thống'}
                </span>
              </div>

              <div className="py-1.5">
                <span className="text-slate-500 block mb-1">Lý do / Diễn giải cụ thể:</span>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-medium leading-relaxed">
                  {selectedTxForDetail.reason || 'Không có ghi chú thêm.'}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="mt-5 flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedTxForDetail(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
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
