import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sparkles,
  Calendar,
  AlertTriangle,
  Clock,
  Search,
  CheckCircle2,
  RefreshCw,
  MapPin,
  Layers,
  ArrowRight,
  ShieldCheck,
  Plus,
  Minus,
} from 'lucide-react';
import {
  type FefoBatchItem,
  type BatchExpiryStatus,
  type SelectedBatchAllocation,
  type FefoOverrideReasonCode,
  FEFO_OVERRIDE_REASONS,
} from '../types/fefo-picking.types';
import { fefoPickingService } from '../services/fefo-picking.service';
import { showToast } from '../components/toast';

export const InventoryBatchesPage: React.FC = () => {
  const [batches, setBatches] = useState<FefoBatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'LIST' | 'SIMULATOR'>('LIST');

  // Filters cho Danh sách
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | BatchExpiryStatus>('ALL');

  // State cho Mô phỏng FEFO
  const [simProductId, setSimProductId] = useState<string>('prod-milk-vnm');
  const [simRequiredQty, setSimRequiredQty] = useState<number>(35);
  const [simResultBatches, setSimResultBatches] = useState<FefoBatchItem[]>([]);
  const [simAllocations, setSimAllocations] = useState<Record<string, number>>({});
  const [simOverrideReasonCode, setSimOverrideReasonCode] = useState<FefoOverrideReasonCode | ''>('');
  const [simCustomNote, setSimCustomNote] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);

  // Tải danh sách lô hàng
  const loadBatches = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fefoPickingService.getBatches();
      setBatches(data);
    } catch {
      showToast('error', 'Không thể tải danh sách lô hàng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  // Thống kê tổng quan
  const stats = useMemo(() => {
    const total = batches.length;
    const critical = batches.filter((b) => b.expiryStatus === 'CRITICAL' || b.expiryStatus === 'EXPIRED').length;
    const warning = batches.filter((b) => b.expiryStatus === 'WARNING').length;
    const good = batches.filter((b) => b.expiryStatus === 'GOOD').length;
    const totalAvailableQty = batches.reduce((sum, b) => sum + b.availableQuantity, 0);

    return { total, critical, warning, good, totalAvailableQty };
  }, [batches]);

  // Danh sách lô đã lọc
  const filteredBatches = useMemo(() => {
    return batches.filter((b) => {
      const matchStatus = statusFilter === 'ALL' || b.expiryStatus === statusFilter;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        b.batchNumber.toLowerCase().includes(q) ||
        b.productName?.toLowerCase().includes(q) ||
        b.locationCode?.toLowerCase().includes(q) ||
        b.productId.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [batches, statusFilter, searchTerm]);

  // Danh sách sản phẩm duy nhất để chọn trong simulator
  const uniqueProducts = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of batches) {
      if (!map.has(b.productId)) {
        map.set(b.productId, b.productName || b.productId);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [batches]);

  // Chạy mô phỏng gợi ý FEFO
  const handleRunSimulation = useCallback(
    async (targetProductId: string, reqQty: number) => {
      try {
        setIsSimulating(true);
        const res = await fefoPickingService.getFefoRecommendations(
          'wh-main-01',
          targetProductId,
          reqQty,
        );

        setSimResultBatches(res.batches);
        const initialMap: Record<string, number> = {};
        for (const b of res.batches) {
          if (b.suggestedQuantity > 0) {
            initialMap[b.id] = b.suggestedQuantity;
          }
        }
        setSimAllocations(initialMap);
        setSimOverrideReasonCode('');
        setSimCustomNote('');
      } catch {
        showToast('error', 'Lỗi khi tính toán thuật toán FEFO');
      } finally {
        setIsSimulating(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (activeTab === 'SIMULATOR') {
      handleRunSimulation(simProductId, simRequiredQty);
    }
  }, [activeTab, simProductId, handleRunSimulation, simRequiredQty]);

  // Kiểm tra vi phạm FEFO trong mô phỏng (Tiêu chí 2)
  const isSimOverride = useMemo(() => {
    if (simResultBatches.length === 0) return false;
    const selectedList: SelectedBatchAllocation[] = simResultBatches.map((b) => ({
      batchId: b.id,
      batchNumber: b.batchNumber,
      quantity: simAllocations[b.id] || 0,
      expiryDate: b.expiryDate,
      daysUntilExpiry: b.daysUntilExpiry,
    }));
    return fefoPickingService.detectFefoOverride(simResultBatches, selectedList);
  }, [simResultBatches, simAllocations]);

  const simTotalAllocated = useMemo(() => {
    return Object.values(simAllocations).reduce((sum, q) => sum + (q || 0), 0);
  }, [simAllocations]);

  // Áp dụng lại FEFO tối ưu
  const handleSimApplyFefo = () => {
    const map: Record<string, number> = {};
    for (const b of simResultBatches) {
      if (b.suggestedQuantity > 0) {
        map[b.id] = b.suggestedQuantity;
      }
    }
    setSimAllocations(map);
    setSimOverrideReasonCode('');
    setSimCustomNote('');
    showToast('success', 'Đã tự động áp dụng phân bổ theo nguyên tắc FEFO chuẩn!');
  };

  // Thử nghiệm xuất kho trừ tồn thực tế (Tiêu chí 3)
  const handleSimDispatch = async () => {
    if (isSimOverride) {
      if (!simOverrideReasonCode) {
        showToast('error', 'Bắt buộc phải chọn lý do giải trình khi chọn lô khác FEFO!');
        return;
      }
      if (simOverrideReasonCode === 'OTHER' && !simCustomNote.trim()) {
        showToast('error', 'Vui lòng nhập rõ lý do chi tiết khi chọn "Khác"!');
        return;
      }
    }

    const selectedList: SelectedBatchAllocation[] = [];
    for (const b of simResultBatches) {
      const q = simAllocations[b.id] || 0;
      if (q > 0) {
        selectedList.push({
          batchId: b.id,
          batchNumber: b.batchNumber,
          quantity: q,
          expiryDate: b.expiryDate,
          daysUntilExpiry: b.daysUntilExpiry,
        });
      }
    }

    if (selectedList.length === 0) {
      showToast('error', 'Chưa có số lượng phân bổ để xuất!');
      return;
    }

    try {
      const reasonObj = FEFO_OVERRIDE_REASONS.find((r) => r.code === simOverrideReasonCode);
      const finalReason = reasonObj
        ? simOverrideReasonCode === 'OTHER'
          ? simCustomNote.trim()
          : simCustomNote.trim()
          ? `${reasonObj.label} (${simCustomNote.trim()})`
          : reasonObj.label
        : undefined;

      await fefoPickingService.confirmFefoDispatch({
        warehouseId: 'wh-main-01',
        productId: simProductId,
        selectedBatches: selectedList,
        isOverride: isSimOverride,
        overrideReason: finalReason,
        overrideReasonCode: simOverrideReasonCode || undefined,
        notes: 'Thử nghiệm xuất mô phỏng FEFO từ trang quản lý lô',
      });

      showToast('success', 'Xuất kho và trừ tồn lô thành công! Dữ liệu tồn đã được cập nhật.');
      loadBatches();
      handleRunSimulation(simProductId, simRequiredQty);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi xuất kho theo lô';
      showToast('error', msg);
    }
  };

  const renderBadge = (status: BatchExpiryStatus, days: number) => {
    if (status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-200">
          <Clock className="w-3.5 h-3.5 text-red-600" /> Quá hạn ({days} ngày)
        </span>
      );
    }
    if (status === 'CRITICAL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200">
          <Clock className="w-3.5 h-3.5 text-rose-600" /> Cận date nguy cấp ({days} ngày)
        </span>
      );
    }
    if (status === 'WARNING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" /> Cần chú ý xuất ({days} ngày)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-medium border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> An toàn ({days} ngày)
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/70 p-4 sm:p-6 lg:p-8 space-y-6 text-slate-900">
      {/* ── 1. HEADER CHÍNH ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              FEFO: First Expired, First Out (SN-187)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Quản Lý Lô Hàng & Gợi Ý Xuất Kho (FEFO)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
            Ưu tiên xuất các lô có hạn dùng gần nhất để hạn chế tối đa tỷ lệ hàng hủy do hết hạn, hỗ trợ kiểm soát
            lý do giải trình khi chọn lô khác và tự động trừ tồn kho chính xác theo từng lô.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadBatches}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* ── 2. METRIC CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold block uppercase tracking-wider">Tổng số lô hàng</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-slate-900 font-mono">{stats.total}</span>
            <span className="text-xs text-slate-500">Tồn: {stats.totalAvailableQty} đv</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 shadow-xs">
          <span className="text-xs text-rose-800 font-bold block uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Cận date nguy cấp (&lt; 30 ngày)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-rose-700 font-mono">{stats.critical}</span>
            <span className="text-xs text-rose-600 font-semibold">Ưu tiên xuất ngay</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-xs">
          <span className="text-xs text-amber-800 font-bold block uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Cần chú ý (&lt; 90 ngày)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-amber-700 font-mono">{stats.warning}</span>
            <span className="text-xs text-amber-600 font-semibold">Đẩy vào chương trình KM</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-xs">
          <span className="text-xs text-emerald-800 font-bold block uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Hạn xa an toàn (&gt; 90 ngày)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-extrabold text-emerald-700 font-mono">{stats.good}</span>
            <span className="text-xs text-emerald-600 font-semibold">Tồn kho ổn định</span>
          </div>
        </div>
      </div>

      {/* ── 3. TABS CHUYỂN ĐỔI ── */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('LIST')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'LIST'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Danh sách Lô hàng ({batches.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SIMULATOR')}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'SIMULATOR'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
          Máy tính Mô phỏng Gợi ý FEFO (Simulator)
        </button>
      </div>

      {/* ── 4. TAB 1: DANH SÁCH LÔ HÀNG TRONG KHO ── */}
      {activeTab === 'LIST' && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 p-5 space-y-4 shadow-xs">
          {/* Bộ lọc và Tìm kiếm */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tất cả ({batches.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('CRITICAL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'CRITICAL'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                Cận date ({stats.critical})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('WARNING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'WARNING'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                Chú ý ({stats.warning})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('GOOD')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'GOOD'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                An toàn ({stats.good})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm mã lô, tên SP, vị trí kệ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Bảng danh sách lô */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Mã Lô</th>
                  <th className="py-3 px-4">Sản Phẩm</th>
                  <th className="py-3 px-4">Vị Trí Kho</th>
                  <th className="py-3 px-4">Hạn Sử Dụng (HSD)</th>
                  <th className="py-3 px-4">Tình Trạng</th>
                  <th className="py-3 px-4 text-right">Tồn Khả Dụng</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80">
                {filteredBatches.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Không tìm thấy lô hàng nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  filteredBatches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900 block">{b.productName}</span>
                        <span className="text-[11px] font-mono text-slate-500">SKU: {b.productId}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-indigo-900 font-medium">
                          <MapPin className="w-3 h-3 text-indigo-600" />
                          {b.locationCode || 'A-01-R01-T1'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{b.expiryDate}</span>
                        <span className="text-[11px] text-slate-500 block">NSX: {b.mfgDate}</span>
                      </td>
                      <td className="py-3 px-4">{renderBadge(b.expiryStatus, b.daysUntilExpiry)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                        {b.availableQuantity}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSimProductId(b.productId);
                            setActiveTab('SIMULATOR');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs inline-flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          Thử FEFO
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 5. TAB 2: MÁY TÍNH MÔ PHỎNG GỢI Ý XUẤT FEFO (SIMULATOR) ── */}
      {activeTab === 'SIMULATOR' && (
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 p-6 space-y-6 shadow-xs">
          {/* Cấu hình tham số đầu vào */}
          <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-4">
            <h3 className="text-sm font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              1. Thiết lập tham số yêu cầu xuất kho
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chọn sản phẩm cần xuất:</label>
                <select
                  value={simProductId}
                  onChange={(e) => setSimProductId(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {uniqueProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng yêu cầu xuất:</label>
                <input
                  type="number"
                  min={1}
                  value={simRequiredQty}
                  onChange={(e) => setSimRequiredQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full text-xs sm:text-sm bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-800 font-mono font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => handleRunSimulation(simProductId, simRequiredQty)}
                  disabled={isSimulating}
                  className="w-full h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
                  Chạy tính toán FEFO
                </button>
              </div>
            </div>
          </div>

          {/* Trình bày thuật toán gợi ý FEFO (Tiêu chí 1) */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-emerald-600" />
                2. Kết quả đề xuất lô xuất theo nguyên tắc Hạn dùng gần nhất
              </h3>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600">
                  Đã phân bổ:{' '}
                  <strong
                    className={`font-mono text-sm ${
                      simTotalAllocated === simRequiredQty
                        ? 'text-emerald-600'
                        : simTotalAllocated > simRequiredQty
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {simTotalAllocated} / {simRequiredQty}
                  </strong>
                </span>

                <button
                  type="button"
                  onClick={handleSimApplyFefo}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Khôi phục đề xuất FEFO
                </button>
              </div>
            </div>

            {/* Danh sách các lô kèm bộ chọn số lượng và ghi đè */}
            <div className="space-y-3">
              {simResultBatches.map((b) => {
                const currentQty = simAllocations[b.id] || 0;
                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border transition-all ${
                      currentQty > 0
                        ? 'bg-indigo-50/30 border-indigo-300 ring-1 ring-indigo-400/20'
                        : b.isFefoRecommended
                        ? 'bg-amber-50/20 border-amber-300'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-slate-900 text-base">{b.batchNumber}</span>
                          {renderBadge(b.expiryStatus, b.daysUntilExpiry)}
                          {b.isFefoRecommended && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[11px] font-bold flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-300 fill-amber-300" />
                              Thuật toán đề xuất: {b.suggestedQuantity}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            HSD: <strong className="text-slate-800">{b.expiryDate}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                            Vị trí: <strong>{b.locationCode}</strong>
                          </span>
                          <span>
                            Tồn kho: <strong className="font-mono text-slate-900">{b.availableQuantity}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Bộ điều khiển số lượng */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() =>
                              setSimAllocations((prev) => ({
                                ...prev,
                                [b.id]: Math.max(0, currentQty - 1),
                              }))
                            }
                            disabled={currentQty <= 0}
                            className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={b.availableQuantity}
                            value={currentQty}
                            onChange={(e) =>
                              setSimAllocations((prev) => ({
                                ...prev,
                                [b.id]: Math.max(
                                  0,
                                  Math.min(b.availableQuantity, parseInt(e.target.value, 10) || 0),
                                ),
                              }))
                            }
                            className="w-14 h-9 text-center font-mono font-bold text-slate-900 text-sm focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSimAllocations((prev) => ({
                                ...prev,
                                [b.id]: Math.min(b.availableQuantity, currentQty + 1),
                              }))
                            }
                            disabled={currentQty >= b.availableQuantity}
                            className="w-9 h-9 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CẢNH BÁO VÀ FORM LÝ DO GHI ĐÈ TRONG MÔ PHỎNG (Tiêu chí 2) */}
          {isSimOverride && (
            <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-400 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-amber-950">
                    Phát hiện ghi đè: Bạn đang chọn xuất lô khác với đề xuất FEFO
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                    Theo tiêu chuẩn kho vận, nếu không xuất lô cận date trước, thủ kho bắt buộc phải giải trình lý do
                    hợp lệ để chuyển cấp quản lý phê duyệt.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-amber-950">
                  Lý do ghi đè (Bắt buộc) <span className="text-rose-600">*</span>
                </label>
                <select
                  value={simOverrideReasonCode}
                  onChange={(e) => setSimOverrideReasonCode(e.target.value as FefoOverrideReasonCode)}
                  className="w-full text-xs sm:text-sm bg-white border border-amber-300 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                >
                  <option value="">-- Chọn lý do giải trình chuẩn hóa --</option>
                  {FEFO_OVERRIDE_REASONS.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <textarea
                  rows={2}
                  placeholder={
                    simOverrideReasonCode === 'OTHER'
                      ? 'Bắt buộc ghi rõ lý do chi tiết giải trình...'
                      : 'Ghi chú giải trình bổ sung (tùy chọn)...'
                  }
                  value={simCustomNote}
                  onChange={(e) => setSimCustomNote(e.target.value)}
                  className="w-full text-xs sm:text-sm bg-white border border-amber-300 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>
            </div>
          )}

          {/* TIÊU CHÍ 3: THAO TÁC XUẤT KHO TRỪ TỒN THỰC TẾ CỦA LÔ ĐÃ CHỌN */}
          <div className="p-4 rounded-xl bg-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              <span>Đang chọn xuất: </span>
              <strong className="text-slate-900 font-bold font-mono">{simTotalAllocated}</strong> đơn vị.
              {isSimOverride ? (
                <span className="text-amber-700 font-semibold ml-2">
                  (Có ghi đè - Bắt buộc lý do giải trình)
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold ml-2">(Tuân thủ 100% FEFO)</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleSimDispatch}
              disabled={
                simTotalAllocated === 0 ||
                (isSimOverride && !simOverrideReasonCode) ||
                (isSimOverride && simOverrideReasonCode === 'OTHER' && !simCustomNote.trim())
              }
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4" />
              Thực hiện xuất kho trừ tồn lô
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
