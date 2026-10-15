import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ClipboardCheck,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Warehouse,
  ShieldCheck,
  Layers,
  Info,
  ArrowLeft,
  Calendar,
  FileText,
  ChevronDown,
  Eye,
  Clock,
} from 'lucide-react';
import { toast } from '../components/toast';
import { Pagination } from '../components/pagination';
import { inventoryAuditsService } from '../services/inventory-audits.service';
import type {
  InventoryAudit,
  CreateInventoryAuditPayload,
} from '../types/inventory-audit.types';
import { getStoredUser } from '../utils/navigation';

export const InventoryAuditsPage: React.FC = () => {
  // Current user & RBAC
  const user = getStoredUser();
  const userRoles: string[] = useMemo(() => {
    const roles: string[] = [];
    if (Array.isArray(user?.roles)) {
      roles.push(...user.roles.map((r: any) => String(r).toUpperCase()));
    }
    if ((user as any)?.role) {
      roles.push(String((user as any).role).toUpperCase());
    }
    return roles;
  }, [user]);

  // Quản lý kho: WAREHOUSE_MANAGER, WH_MANAGER, ADMIN
  const isWarehouseManager = useMemo(() => {
    return userRoles.some((r) =>
      ['WAREHOUSE_MANAGER', 'WH_MANAGER', 'ADMIN'].includes(r),
    );
  }, [userRoles]);

  // State
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<InventoryAudit | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Form Create State
  const [createWarehouseId] = useState('WH01');
  const [createScope, setCreateScope] = useState<'ALL' | 'CATEGORY'>('ALL');
  const [createCategory, setCreateCategory] = useState('');
  const [createNote, setCreateNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Detail / Counting Form State (Map productId -> { actualQty, note })
  const [editingCounts, setEditingCounts] = useState<{
    [productId: string]: { actualQuantity: number | ''; note: string };
  }>({});
  const [isSavingCounts, setIsSavingCounts] = useState(false);

  // Complete Audit State
  const [completeReason, setCompleteReason] = useState('');
  const [completeNote, setCompleteNote] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Cancel Audit State
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Pagination & Action Menu State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [actionMenuAuditId, setActionMenuAuditId] = useState<string | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setActionMenuAuditId(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Load danh sách phiếu
  const loadAudits = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const data = await inventoryAuditsService.getAudits(params);
      setAudits(data);
    } catch (err: any) {
      toast.error(err.message || 'Không thể tải danh sách phiếu kiểm kê');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    loadAudits();
  }, [loadAudits]);

  // Mở màn hình chi tiết / đếm
  const handleOpenDetail = (audit: InventoryAudit) => {
    setSelectedAudit(audit);
    // Khởi tạo state đếm từ items hiện tại
    const countsMap: { [productId: string]: { actualQuantity: number | ''; note: string } } = {};
    for (const item of audit.items) {
      countsMap[item.productId] = {
        actualQuantity: item.actualQuantity !== null && item.actualQuantity !== undefined ? item.actualQuantity : '',
        note: item.note || '',
      };
    }
    setEditingCounts(countsMap);
    setDetailModalOpen(true);
  };

  // Tạo phiếu kiểm kê mới (AC1: chốt bookQuantity)
  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const payload: CreateInventoryAuditPayload = {
        warehouseId: createWarehouseId,
        warehouseName: 'Kho Tổng Miền Nam - LOHA WH01',
        scope: createScope,
        categoryName: createScope === 'CATEGORY' ? createCategory : undefined,
        note: createNote.trim() || undefined,
      };

      const newAudit = await inventoryAuditsService.createAudit(payload);
      toast.success(`Tạo phiếu kiểm kê ${newAudit.auditCode} thành công!`);
      setCreateModalOpen(false);
      setCreateNote('');
      setCreateCategory('');
      setCreateScope('ALL');
      await loadAudits();
      // Mở ngay màn hình kiểm đếm cho phiếu vừa tạo
      handleOpenDetail(newAudit);
    } catch (err: any) {
      toast.error(err.message || 'Lỗi tạo phiếu kiểm kê');
    } finally {
      setIsCreating(false);
    }
  };

  // Lưu số đếm thực tế (AC2: tự động tính chênh lệch)
  const handleSaveCounts = async () => {
    if (!selectedAudit) return;
    try {
      setIsSavingCounts(true);
      const itemsToUpdate = selectedAudit.items.map((item) => {
        const row = editingCounts[item.productId];
        const actualQty =
          row && row.actualQuantity !== '' && !isNaN(Number(row.actualQuantity))
            ? Number(row.actualQuantity)
            : item.bookQuantity;
        return {
          productId: item.productId,
          actualQuantity: actualQty,
          note: row?.note || '',
        };
      });

      const updated = await inventoryAuditsService.updateAuditItems(selectedAudit.id, {
        items: itemsToUpdate,
      });
      setSelectedAudit(updated);
      toast.success('Đã lưu kết quả đếm thực tế và cập nhật chênh lệch!');
      await loadAudits();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi lưu số liệu kiểm đếm');
    } finally {
      setIsSavingCounts(false);
    }
  };

  // Mở modal chốt kiểm kê
  const handleOpenCompleteModal = (audit: InventoryAudit) => {
    if (!isWarehouseManager) {
      toast.error('Chỉ Quản lý kho mới có thẩm quyền chốt phiếu kiểm kê điều chỉnh tồn!');
      return;
    }
    setSelectedAudit(audit);
    setCompleteReason('');
    setCompleteNote('');
    setCompleteModalOpen(true);
  };

  // Chốt kiểm kê điều chỉnh tồn (AC3: bắt buộc reason, cập nhật tồn thực đếm, ghi sổ kho)
  const handleCompleteAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAudit) return;
    if (!completeReason.trim()) {
      toast.error('Bắt buộc phải nhập lý do điều chỉnh khi chốt kiểm kê!');
      return;
    }

    try {
      setIsCompleting(true);
      const updated = await inventoryAuditsService.completeAudit(selectedAudit.id, {
        reason: completeReason.trim(),
        note: completeNote.trim() || undefined,
      });

      toast.success(`Chốt kiểm kê thành công! Tồn kho đã điều chỉnh về số thực đếm.`);
      setCompleteModalOpen(false);
      setSelectedAudit(updated);
      await loadAudits();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi chốt phiếu kiểm kê');
    } finally {
      setIsCompleting(false);
    }
  };

  // Hủy phiếu kiểm kê
  const handleCancelAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAudit) return;
    try {
      setIsCancelling(true);
      await inventoryAuditsService.cancelAudit(selectedAudit.id, cancelReason.trim() || undefined);
      toast.success('Đã hủy phiếu kiểm kê!');
      setCancelModalOpen(false);
      setDetailModalOpen(false);
      await loadAudits();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi hủy phiếu kiểm kê');
    } finally {
      setIsCancelling(false);
    }
  };

  // Lọc và phân trang danh sách phiếu kiểm kê
  const filteredAudits = useMemo(() => {
    return audits.filter((audit) => {
      const matchStatus = statusFilter === 'ALL' || audit.status === statusFilter;
      const s = searchTerm.trim().toLowerCase();
      const matchSearch =
        s === '' ||
        audit.auditCode.toLowerCase().includes(s) ||
        audit.creatorName.toLowerCase().includes(s) ||
        (audit.warehouseName && audit.warehouseName.toLowerCase().includes(s)) ||
        (audit.note && audit.note.toLowerCase().includes(s));
      return matchStatus && matchSearch;
    });
  }, [audits, statusFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredAudits.length / pageSize));
  const paginatedAudits = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAudits.slice(start, start + pageSize);
  }, [filteredAudits, page, pageSize]);

  // Format tiền tệ
  const formatCurrency = (val?: number) => {
    if (val === undefined || isNaN(val)) return '0 đ';
    return `${val.toLocaleString('vi-VN')} đ`;
  };

  // Render Modal Chốt Kiểm Kê (AC3 & AC4)
  const renderCompleteModal = () => {
    if (!completeModalOpen || !selectedAudit) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/60">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Chốt Kiểm Kê & Điều Chỉnh Tồn Kho
              </h3>
            </div>
            <button
              onClick={() => setCompleteModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCompleteAudit} className="p-6 space-y-4">
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs text-slate-700 space-y-2">
              <div className="font-semibold text-emerald-800 text-sm">
                Phiếu kiểm kê: {selectedAudit.auditCode}
              </div>
              <div>
                Hệ thống sẽ cập nhật số lượng tồn kho của toàn bộ SKU về <strong>số lượng thực đếm</strong> và tự động ghi sổ kho giao dịch điều chỉnh (<code>ADJUSTMENT</code>).
              </div>
              <div className="pt-1 text-slate-500">
                Tổng chênh lệch:{' '}
                <strong className={selectedAudit.totalDifferenceQuantity >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  {selectedAudit.totalDifferenceQuantity > 0 ? `+${selectedAudit.totalDifferenceQuantity}` : selectedAudit.totalDifferenceQuantity} sản phẩm
                </strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Lý do điều chỉnh tồn kho <span className="text-rose-500">* (Bắt buộc)</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Ví dụ: Bù trừ hao hụt bốc xếp theo biên bản số BB-1026, xuất hủy hàng móp méo..."
                value={completeReason}
                onChange={(e) => setCompleteReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Ghi chú bổ sung
              </label>
              <input
                type="text"
                placeholder="Phê duyệt bởi Ban Giám Đốc, phòng Tài chính..."
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isCompleting || !completeReason.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isCompleting ? 'Đang điều chỉnh...' : 'Xác nhận chốt & Điều chỉnh tồn'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Render Modal Hủy Phiếu
  const renderCancelModal = () => {
    if (!cancelModalOpen || !selectedAudit) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-slate-900 text-base">Hủy Phiếu Kiểm Kê</h3>
            </div>
            <button
              onClick={() => setCancelModalOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleCancelAudit} className="p-6 space-y-4">
            <p className="text-sm text-slate-600">
              Bạn có chắc chắn muốn hủy phiếu kiểm kê <strong>{selectedAudit.auditCode}</strong>?
              Sau khi hủy, kết quả kiểm đếm sẽ không được áp dụng vào tồn kho.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                Lý do hủy (tùy chọn)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Đổi lịch kiểm kê sang tuần sau..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={isCancelling}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy phiếu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // =========================================================================
  // MÀN HÌNH KIỂM ĐẾM & CHI TIẾT PHIẾU KIỂM KÊ (TRANG TOÀN MÀN HÌNH - SN-182)
  // =========================================================================
  if (selectedAudit && detailModalOpen) {
    return (
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
        {/* Nút quay lại & Breadcrumb */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setDetailModalOpen(false);
              setSelectedAudit(null);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-all shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span>Quay lại danh sách phiếu kiểm kê</span>
          </button>
        </div>

        {/* Khung nội dung chính */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Header chi tiết phiếu */}
          <div className="p-6 border-b border-slate-200 bg-slate-50/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xl font-bold text-slate-900">
                  Phiếu kiểm kê: {selectedAudit.auditCode}
                </span>
                {selectedAudit.status === 'COMPLETED' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Đã chốt hoàn thành
                  </span>
                ) : selectedAudit.status === 'DRAFT' ? (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                    Bản nháp (Đang kiểm đếm)
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    Đã hủy
                  </span>
                )}
              </div>

              {/* Thông tin metadata: Kho, Phạm vi kiểm kê (chỗ bôi đậm xanh), Người tạo, Ngày lập */}
              <div className="text-xs text-slate-600 mt-3 flex flex-wrap items-center gap-3.5">
                <span>
                  Kho: <strong className="text-slate-900 font-semibold">{selectedAudit.warehouseName}</strong>
                </span>

                {/* HIỂN THỊ RÕ RÀNG PHẠM VI KIỂM KÊ: TOÀN BỘ KHO HAY THEO NHÓM HÀNG */}
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
                    selectedAudit.scope === 'ALL'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    Phạm vi kiểm kê:{' '}
                    <strong className="text-blue-900">
                      {selectedAudit.scope === 'ALL'
                        ? 'Toàn bộ kho hàng'
                        : `Theo nhóm hàng: ${selectedAudit.categoryName || 'Tùy chọn'}`}
                    </strong>
                  </span>
                </span>

                <span>
                  Người tạo: <strong className="text-slate-900 font-semibold">{selectedAudit.creatorName}</strong>
                </span>
                <span>
                  Ngày lập:{' '}
                  <strong className="text-slate-900 font-semibold">
                    {new Date(selectedAudit.createdAt).toLocaleString('vi-VN')}
                  </strong>
                </span>
                {selectedAudit.reason && (
                  <span className="text-emerald-700 font-medium">
                    Lý do điều chỉnh: <strong>{selectedAudit.reason}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Nút lưu đếm thực tế ở header */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedAudit.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={handleSaveCounts}
                  disabled={isSavingCounts}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCounts ? 'Đang lưu...' : 'Lưu kết quả đếm'}
                </button>
              )}
            </div>
          </div>

          {/* Table Items */}
          <div className="p-6">
            <div className="mb-4">
              <h4 className="font-bold text-slate-800 text-sm">
                Danh sách mặt hàng kiểm đếm ({selectedAudit.items.length} SKU)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập số lượng đếm thực tế tại kệ, hệ thống sẽ tự động tính chênh lệch từng dòng.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Mã SKU & Sản phẩm</th>
                    <th className="py-3 px-3">Đơn vị</th>
                    <th className="py-3 px-3 text-right">Tồn sổ sách</th>
                    <th className="py-3 px-3 text-right w-44">Thực đếm</th>
                    <th className="py-3 px-3 text-right">Chênh lệch</th>
                    <th className="py-3 px-3 text-right">Giá trị lệch</th>
                    <th className="py-3 px-3">Ghi chú dòng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedAudit.items.map((item, idx) => {
                    const countState = editingCounts[item.productId] || {
                      actualQuantity: item.actualQuantity ?? '',
                      note: item.note || '',
                    };
                    const actualVal =
                      countState.actualQuantity === ''
                        ? item.bookQuantity
                        : Number(countState.actualQuantity);
                    const currentDiff = actualVal - item.bookQuantity;
                    const diffColor =
                      currentDiff > 0
                        ? 'text-emerald-600 font-bold'
                        : currentDiff < 0
                        ? 'text-rose-600 font-bold'
                        : 'text-slate-400';

                    const diffAmount = currentDiff * (item.unitPrice || 0);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-3 text-xs text-slate-400">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{item.productName}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            {item.productSku} • {item.categoryName}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">{item.unit}</td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          {item.bookQuantity.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {selectedAudit.status === 'DRAFT' ? (
                            <input
                              type="number"
                              min={0}
                              placeholder={String(item.bookQuantity)}
                              value={countState.actualQuantity}
                              onChange={(e) => {
                                const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                                setEditingCounts((prev) => ({
                                  ...prev,
                                  [item.productId]: {
                                    ...prev[item.productId],
                                    actualQuantity: val,
                                    note: prev[item.productId]?.note || '',
                                  },
                                }));
                              }}
                              className="w-32 px-2.5 py-1.5 border border-slate-300 rounded-lg text-right font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            />
                          ) : (
                            <span className="font-bold text-slate-900">
                              {(item.actualQuantity ?? item.bookQuantity).toLocaleString()}
                            </span>
                          )}
                        </td>
                        <td className={`py-3 px-3 text-right font-semibold ${diffColor}`}>
                          {currentDiff > 0 ? `+${currentDiff.toLocaleString()}` : currentDiff.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-xs text-slate-600">
                          {formatCurrency(diffAmount)}
                        </td>
                        <td className="py-3 px-3">
                          {selectedAudit.status === 'DRAFT' ? (
                            <input
                              type="text"
                              placeholder="Ghi chú lệch..."
                              value={countState.note}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditingCounts((prev) => ({
                                  ...prev,
                                  [item.productId]: {
                                    ...prev[item.productId],
                                    actualQuantity: prev[item.productId]?.actualQuantity ?? '',
                                    note: val,
                                  },
                                }));
                              }}
                              className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-xs text-slate-500">{item.note || '-'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span>
                Tổng tồn sổ sách: <strong className="text-slate-800 font-bold">{selectedAudit.totalBookQuantity.toLocaleString()}</strong>
              </span>
              <span>
                Tổng thực đếm: <strong className="text-slate-800 font-bold">{selectedAudit.totalActualQuantity.toLocaleString()}</strong>
              </span>
              <span>
                Tổng chênh lệch:{' '}
                <strong
                  className={
                    selectedAudit.totalDifferenceQuantity !== 0
                      ? selectedAudit.totalDifferenceQuantity > 0
                        ? 'text-emerald-600 font-bold'
                        : 'text-rose-600 font-bold'
                      : 'text-slate-600'
                  }
                >
                  {selectedAudit.totalDifferenceQuantity > 0
                    ? `+${selectedAudit.totalDifferenceQuantity}`
                    : selectedAudit.totalDifferenceQuantity}
                </strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedAudit.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={() => {
                    setCancelReason('');
                    setCancelModalOpen(true);
                  }}
                  className="px-3.5 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy phiếu
                </button>
              )}

              {selectedAudit.status === 'DRAFT' && isWarehouseManager && (
                <button
                  type="button"
                  onClick={() => handleOpenCompleteModal(selectedAudit)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Chốt kiểm kê điều chỉnh tồn
                </button>
              )}

              {selectedAudit.status === 'DRAFT' && !isWarehouseManager && (
                <div className="text-xs text-slate-400 italic">
                  (Chỉ Quản lý kho mới có quyền chốt phiếu)
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setDetailModalOpen(false);
                  setSelectedAudit(null);
                }}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Quay lại danh sách
              </button>
            </div>
          </div>
        </div>

        {/* Modal 3 & 4 */}
        {renderCompleteModal()}
        {renderCancelModal()}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto min-h-screen bg-slate-50/50">
      {/* 1. Tiêu đề trang & Vai trò người dùng */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl shadow-2xs border border-slate-200/90">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Kiểm kê Kho hàng
            </h1>
          </div>
        </div>

        {/* Badge vai trò */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
            isWarehouseManager
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>
            {isWarehouseManager ? 'Vai trò: Quản lý kho (Toàn quyền)' : 'Vai trò: Thủ kho (Chỉ nhập số đếm)'}
          </span>
        </div>
      </div>

      {/* 2. Thanh tìm kiếm, lọc trạng thái & Nút tạo phiếu kiểm kê (chung hàng) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, người tạo, ghi chú..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp (Đang kiểm đếm)</option>
              <option value="COMPLETED">Đã chốt kiểm kê</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadAudits}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo phiếu kiểm kê</span>
          </button>
        </div>
      </div>

      {/* 3. Bảng danh sách phiếu kiểm kê (chuẩn Form mẫu Image 3) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-[18%]">Mã phiếu</th>
                <th className="py-3.5 px-4 w-[24%]">Kho & Phạm vi</th>
                <th className="py-3.5 px-4 w-[15%]">Ngày lập</th>
                <th className="py-3.5 px-4 text-right w-[11%]">Tồn sổ sách</th>
                <th className="py-3.5 px-4 text-right w-[11%]">Thực tế đếm</th>
                <th className="py-3.5 px-4 text-right w-[9%]">Chênh lệch</th>
                <th className="py-3.5 px-4 text-center w-[12%]">Trạng thái</th>
                <th className="py-3.5 px-4 text-right w-[10%] min-w-[105px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải danh sách phiếu kiểm kê...
                  </td>
                </tr>
              ) : filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Chưa có phiếu kiểm kê nào phù hợp điều kiện lọc.
                  </td>
                </tr>
              ) : (
                paginatedAudits.map((audit) => {
                  const diff = audit.totalDifferenceQuantity;
                  const diffColor =
                    diff > 0
                      ? 'text-emerald-600 font-bold'
                      : diff < 0
                      ? 'text-rose-600 font-bold'
                      : 'text-slate-500';

                  return (
                    <tr
                      key={audit.id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(audit)}
                    >
                      {/* 1. Mã phiếu */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetail(audit);
                          }}
                          className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/60 px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-2xs group-hover:border-blue-300"
                          title={`Xem chi tiết phiếu ${audit.auditCode}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-700 transition-colors" />
                          <span>{audit.auditCode}</span>
                        </button>
                        {audit.note && (
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5" title={audit.note}>
                            {audit.note}
                          </div>
                        )}
                      </td>

                      {/* 2. Kho & Phạm vi */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-sm line-clamp-1">{audit.warehouseName}</div>
                        <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="line-clamp-1">
                            {audit.scope === 'ALL'
                              ? 'Toàn bộ kho hàng'
                              : `Nhóm: ${audit.categoryName || 'Tùy chọn'}`}
                          </span>
                        </div>
                      </td>

                      {/* 3. Ngày lập & Người tạo */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {new Date(audit.createdAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">{audit.creatorName}</div>
                      </td>

                      {/* 4. Tồn sổ sách */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-slate-700 tabular-nums text-sm">
                          {audit.totalBookQuantity.toLocaleString()}
                        </span>
                      </td>

                      {/* 5. Thực tế đếm */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-bold text-slate-900 tabular-nums text-sm">
                          {audit.status === 'DRAFT' && audit.items.some((i) => i.actualQuantity === null) ? (
                            <span className="text-amber-600 italic font-normal text-xs">Đang đếm...</span>
                          ) : (
                            audit.totalActualQuantity.toLocaleString()
                          )}
                        </span>
                      </td>

                      {/* 6. Chênh lệch */}
                      <td className={`py-3.5 px-4 text-right whitespace-nowrap ${diffColor}`}>
                        <span className="font-bold tabular-nums text-sm">
                          {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()}
                        </span>
                      </td>

                      {/* 7. Trạng thái */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {audit.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Đã chốt
                          </span>
                        ) : audit.status === 'DRAFT' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            Bản nháp
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            Đã hủy
                          </span>
                        )}
                      </td>

                      {/* 8. Thao tác */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="relative inline-block text-left">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActionMenuAuditId((prev) => (prev === audit.id ? null : audit.id));
                            }}
                            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-2xs select-none whitespace-nowrap shrink-0 ${
                              actionMenuAuditId === audit.id
                                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs ring-2 ring-blue-500/10'
                                : 'bg-white border-slate-200/90 text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-slate-300'
                            }`}
                          >
                            <span>Thao tác</span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
                                actionMenuAuditId === audit.id ? 'rotate-180 text-blue-600' : ''
                              }`}
                            />
                          </button>

                          {actionMenuAuditId === audit.id && (
                            <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1 z-50 text-left animate-in fade-in zoom-in-95 duration-100 divide-y divide-slate-100">
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActionMenuAuditId(null);
                                    handleOpenDetail(audit);
                                  }}
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2 cursor-pointer transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Xem chi tiết / Đếm</span>
                                </button>
                              </div>

                              {audit.status === 'DRAFT' && (
                                <div className="py-1">
                                  {isWarehouseManager && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActionMenuAuditId(null);
                                        handleOpenCompleteModal(audit);
                                      }}
                                      className="w-full text-left px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 flex items-center gap-2 cursor-pointer transition-colors"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Chốt điều chỉnh tồn</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuAuditId(null);
                                      setSelectedAudit(audit);
                                      setCancelReason('');
                                      setCancelModalOpen(true);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Hủy phiếu</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh phân trang chuẩn LOHA SALES */}
        {filteredAudits.length > 0 && (
          <Pagination
            variant="default"
            currentPage={page}
            totalPages={totalPages}
            totalItems={filteredAudits.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            itemLabel="phiếu"
            showRecordRange={false}
            showFirstLast={false}
            onPageChange={(p) => setPage(p)}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPage(1);
            }}
          />
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: TẠO PHIẾU KIỂM KÊ (AC1)                                          */}
      {/* ========================================================================= */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Tạo Phiếu Kiểm Kê Kho</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAudit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Kho kiểm kê
                </label>
                <input
                  type="text"
                  disabled
                  value="Kho Tổng Miền Nam - LOHA WH01"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Phạm vi kiểm kê
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateScope('ALL')}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium text-center transition-all ${
                      createScope === 'ALL'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Toàn bộ kho hàng
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateScope('CATEGORY')}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium text-center transition-all ${
                      createScope === 'CATEGORY'
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Theo nhóm hàng
                  </button>
                </div>
              </div>

              {createScope === 'CATEGORY' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                    Nhóm hàng cần kiểm kê
                  </label>
                  <select
                    value={createCategory}
                    onChange={(e) => setCreateCategory(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="">-- Chọn nhóm hàng --</option>
                    <option value="Sữa Bột">Sữa Bột Dinh Dưỡng</option>
                    <option value="Sữa Hạt">Sữa Hạt & Ngũ Cốc</option>
                    <option value="Yến Sào">Yến Sào & Thực Phẩm Bổ Dưỡng</option>
                    <option value="Cà Phê">Cà Phê & Trà Thảo Mộc</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Ghi chú đợt kiểm kê
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Kiểm kê định kỳ cuối tháng, kiểm đếm tồn phục vụ thanh tra..."
                  value={createNote}
                  onChange={(e) => setCreateNote(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>


              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {isCreating ? 'Đang tạo...' : 'Tạo phiếu & Bắt đầu đếm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3 & 4: Chốt kiểm kê & Hủy phiếu (khi mở từ danh sách chính) */}
      {renderCompleteModal()}
      {renderCancelModal()}
    </div>
  );
};
