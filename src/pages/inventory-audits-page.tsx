import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Warehouse,
  Layers,
  Info,
  ArrowLeft,
  FileText,
  ChevronDown,
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

  const [searchParams, setSearchParams] = useSearchParams();
  // Search params từ điều hướng (ví dụ: chuyển từ Phiếu nhập kho đã xác nhận sang lập điều chỉnh)
  const referenceCode = searchParams.get('referenceCode');

  // Helper đồng bộ query parameters với URL
  const updateQueryParam = useCallback(
    (paramsToUpdate: Record<string, string | null | undefined>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          Object.entries(paramsToUpdate).forEach(([key, val]) => {
            if (
              val === null ||
              val === undefined ||
              val === '' ||
              (key === 'status' && val === 'ALL') ||
              (key === 'page' && val === '1') ||
              (key === 'limit' && val === '10')
            ) {
              next.delete(key);
            } else {
              next.set(key, val);
            }
          });
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Đọc giá trị Query Parameters ban đầu từ URL
  const initialStatus = searchParams.get('status') || 'ALL';
  const initialSearch = searchParams.get('search') || searchParams.get('q') || '';
  const initialPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
  const initialLimit = Math.max(1, parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '10', 10) || 10);
  const initialCreate = searchParams.get('create') === 'true' || searchParams.get('action') === 'create';

  // State
  const [audits, setAudits] = useState<InventoryAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(referenceCode || initialSearch);
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  // Modal State
  const [createModalOpen, setCreateModalOpen] = useState(Boolean(referenceCode) || initialCreate);
  const [selectedAudit, setSelectedAudit] = useState<InventoryAudit | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  // Form Create State
  const [createWarehouseId] = useState('WH01');
  const [createScope, setCreateScope] = useState<'ALL' | 'CATEGORY'>('ALL');
  const [createCategory, setCreateCategory] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Detail / Counting Form State (Map productId -> { actualQty, note })
  const [editingCounts, setEditingCounts] = useState<{
    [productId: string]: { actualQuantity: number | ''; note: string };
  }>({});
  const [auditOverallNote, setAuditOverallNote] = useState('');
  const [isSavingCounts, setIsSavingCounts] = useState(false);

  // Helper format tên người tạo chuẩn (thay username thành họ tên)
  const getDisplayCreatorName = useCallback(
    (name?: string) => {
      if (!name || name.toLowerCase().includes('manager') || name.toLowerCase() === 'admin') {
        return user?.fullName || 'Đỗ Quốc Bảo';
      }
      return name;
    },
    [user],
  );

  // Complete Audit State
  const [completeReason, setCompleteReason] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);

  // Cancel Audit State
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Pagination & Action Menu State
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialLimit);
  const [actionMenuAuditId, setActionMenuAuditId] = useState<string | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setActionMenuAuditId(null);
    window.addEventListener('click', handleCloseMenu);
    return () => window.removeEventListener('click', handleCloseMenu);
  }, []);

  // Đồng bộ từ URL khi người dùng bấm nút Back / Forward của trình duyệt
  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('q') || '';
    if (q !== searchTerm) {
      setSearchTerm(q);
    }
    const s = searchParams.get('status') || 'ALL';
    if (s !== statusFilter) {
      setStatusFilter(s);
    }
    const p = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    if (p !== page) {
      setPage(p);
    }
    const l = Math.max(1, parseInt(searchParams.get('limit') || searchParams.get('pageSize') || '10', 10) || 10);
    if (l !== pageSize) {
      setPageSize(l);
    }
    const shouldOpenCreate = searchParams.get('create') === 'true' || searchParams.get('action') === 'create';
    if (shouldOpenCreate !== createModalOpen) {
      setCreateModalOpen(shouldOpenCreate);
    }
  }, [searchParams]);

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
  const handleOpenDetail = useCallback((audit: InventoryAudit, updateUrl = true) => {
    setSelectedAudit(audit);
    setAuditOverallNote(audit.note || '');
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
    if (updateUrl) {
      updateQueryParam({ auditId: audit.auditCode || audit.id });
    }
  }, [updateQueryParam]);

  // Đóng màn hình chi tiết và xóa query param
  const handleCloseDetail = useCallback(() => {
    setDetailModalOpen(false);
    setSelectedAudit(null);
    updateQueryParam({ auditId: null });
  }, [updateQueryParam]);

  // Quản lý Query Param khi mở/đóng Modal Tạo phiếu
  const handleOpenCreateModal = useCallback(() => {
    setCreateModalOpen(true);
    updateQueryParam({ create: 'true' });
  }, [updateQueryParam]);

  const handleCloseCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    updateQueryParam({ create: null });
  }, [updateQueryParam]);

  // Tự động khôi phục / mở màn hình chi tiết khi URL có query param ?auditId=... (F5 không mất)
  const auditIdParam = searchParams.get('auditId') || searchParams.get('id') || '';
  useEffect(() => {
    if (!auditIdParam) {
      if (detailModalOpen) {
        setDetailModalOpen(false);
        setSelectedAudit(null);
      }
      return;
    }
    if (selectedAudit && (selectedAudit.id === auditIdParam || selectedAudit.auditCode === auditIdParam)) {
      return;
    }
    const found = audits.find((a) => a.id === auditIdParam || a.auditCode === auditIdParam);
    if (found) {
      handleOpenDetail(found, false);
      return;
    }
    inventoryAuditsService
      .getAuditById(auditIdParam)
      .then((item) => {
        if (item) {
          handleOpenDetail(item, false);
        }
      })
      .catch(() => {});
  }, [auditIdParam, audits, selectedAudit, detailModalOpen, handleOpenDetail]);

  // Tạo phiếu kiểm kê mới (AC1: chốt bookQuantity)
  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const targetWarehouseName = user?.assignedWarehouse || 'Kho Tổng Miền Nam - LOHA WH01';
      const targetWarehouseId = user?.warehouseId || user?.warehouseCode || createWarehouseId;
      const payload: CreateInventoryAuditPayload = {
        warehouseId: targetWarehouseId,
        warehouseName: targetWarehouseName,
        scope: createScope,
        categoryName: createScope === 'CATEGORY' ? createCategory : undefined,
      };

      const newAudit = await inventoryAuditsService.createAudit(payload);
      toast.success(`Tạo phiếu kiểm kê ${newAudit.auditCode} thành công!`);
      setCreateModalOpen(false);
      setCreateCategory('');
      setCreateScope('ALL');
      await loadAudits();
      // Mở ngay màn hình kiểm đếm cho phiếu vừa tạo
      handleOpenDetail(newAudit);
      updateQueryParam({ create: null, auditId: newAudit.auditCode || newAudit.id });
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
        };
      });

      const updated = await inventoryAuditsService.updateAuditItems(selectedAudit.id, {
        items: itemsToUpdate,
      });
      const withOverallNote = { ...updated, note: auditOverallNote.trim() || updated.note };
      setSelectedAudit(withOverallNote);
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
      await inventoryAuditsService.completeAudit(selectedAudit.id, {
        reason: completeReason.trim(),
        note: completeReason.trim() || undefined,
      });

      toast.success('Chốt kiểm kê thành công! Tồn kho đã điều chỉnh về số thực đếm.');
      setCompleteModalOpen(false);
      handleCloseDetail(); // Tự động quay lại danh sách phiếu kiểm kê
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
    if (!isWarehouseManager) {
      toast.error('Chỉ Quản lý kho mới có quyền hủy phiếu kiểm kê!');
      return;
    }
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
                Lý do & Ghi chú điều chỉnh tồn kho <span className="text-rose-500">* (Bắt buộc)</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Ví dụ: Bù trừ hao hụt bốc xếp theo biên bản số BB-1026, xuất hủy hàng móp méo; Phê duyệt bởi Ban Giám Đốc và phòng Kế toán..."
                value={completeReason}
                onChange={(e) => setCompleteReason(e.target.value)}
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
                {isCompleting ? 'Đang chốt...' : 'Chốt phiếu'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Render Modal Hủy Phiếu
  const renderCancelModal = () => {
    if (!cancelModalOpen || !selectedAudit || !isWarehouseManager) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/60">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              <h3 className="font-bold text-slate-900 text-base">Hủy Phiếu Kiểm Kê</h3>
            </div>
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
                Hủy
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
      <div className="space-y-6">
        {/* Khung nội dung chính */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          {/* Header chi tiết phiếu */}
          <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/80 flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition-colors cursor-pointer shrink-0"
                  title="Quay lại danh sách phiếu"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại danh sách</span>
                </button>
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

              {/* Thông tin metadata: Mỗi cái hiển thị trên một dòng rõ ràng */}
              <div className="text-xs text-slate-700 mt-3.5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium w-32 shrink-0">Kho kiểm kê:</span>
                  <strong className="text-slate-900 font-semibold">{selectedAudit.warehouseName}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium w-32 shrink-0">Phạm vi kiểm kê:</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold border ${
                      selectedAudit.scope === 'ALL'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      {selectedAudit.scope === 'ALL'
                        ? 'Toàn bộ kho hàng'
                        : `Theo nhóm hàng: ${selectedAudit.categoryName || 'Tùy chọn'}`}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium w-32 shrink-0">Người tạo:</span>
                  <strong className="text-slate-900 font-semibold">
                    {getDisplayCreatorName(selectedAudit.creatorName)}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium w-32 shrink-0">Ngày lập phiếu:</span>
                  <strong className="text-slate-900 font-semibold">
                    {new Date(selectedAudit.createdAt).toLocaleString('vi-VN')}
                  </strong>
                </div>

                {selectedAudit.reason && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium w-32 shrink-0">Lý do điều chỉnh:</span>
                    <strong className="text-emerald-700 font-semibold">{selectedAudit.reason}</strong>
                  </div>
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
          <div className="p-3 sm:p-6">
            <div className="mb-4">
              <h4 className="font-bold text-slate-800 text-sm">
                Danh sách mặt hàng kiểm đếm
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhập số lượng đếm thực tế tại kệ, hệ thống sẽ tự động tính chênh lệch từng dòng.
              </p>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
              <table className="w-full text-left border-collapse text-sm min-w-[720px]">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-xs font-semibold text-slate-700 uppercase">
                    <th className="py-3 px-3 whitespace-nowrap">
                      # ({selectedAudit.items.length})
                    </th>
                    <th className="py-3 px-3">Sản phẩm</th>
                    <th className="py-3 px-3">Đơn vị</th>
                    <th className="py-3 px-3 text-right">Tồn sổ sách</th>
                    <th className="py-3 px-3 text-right w-44">Thực đếm</th>
                    <th className="py-3 px-3 text-right">Chênh lệch</th>
                    <th className="py-3 px-3 text-right">Giá trị lệch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedAudit.items.map((item, idx) => {
                    const countState = editingCounts[item.productId] || {
                      actualQuantity: item.actualQuantity ?? '',
                      note: '',
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
                        <td className="py-3 px-3 text-xs text-slate-500 font-medium">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{item.productName}</div>
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
                                    note: '',
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
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ô ghi chú tổng cho toàn bộ phiếu kiểm kê */}
          <div className="p-4 sm:px-6 sm:py-4 border-t border-slate-200 bg-slate-50/50">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
              Ghi chú phiếu kiểm kê
            </label>
            <textarea
              rows={2}
              disabled={selectedAudit.status !== 'DRAFT'}
              placeholder="Nhập ghi chú chung cho phiếu kiểm kê này..."
              value={auditOverallNote}
              onChange={(e) => setAuditOverallNote(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-600">
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

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap justify-end">
              {selectedAudit.status === 'DRAFT' && isWarehouseManager && (
                <>
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

                  <button
                    type="button"
                    onClick={() => handleOpenCompleteModal(selectedAudit)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
                  >
                    Chốt phiếu
                  </button>
                </>
              )}

              {selectedAudit.status === 'DRAFT' && !isWarehouseManager && (
                <div className="text-xs text-slate-400 italic">
                  (Chỉ Quản lý kho mới có quyền chốt hoặc hủy phiếu)
                </div>
              )}
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
    <div className="space-y-6">
      {/* 1. Thanh tìm kiếm, lọc trạng thái & Nút tạo phiếu kiểm kê (chung hàng) */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, người tạo, ghi chú..."
            value={searchTerm}
            onChange={(e) => {
              const val = e.target.value;
              setSearchTerm(val);
              setPage(1);
              updateQueryParam({ search: val, page: '1' });
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <span className="text-xs font-medium text-slate-500 whitespace-nowrap">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStatusFilter(val);
                setPage(1);
                updateQueryParam({ status: val, page: '1' });
              }}
              className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp (Đang kiểm đếm)</option>
              <option value="COMPLETED">Đã chốt kiểm kê</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo phiếu kiểm kê</span>
          </button>
        </div>
      </div>

      {/* 3. Bảng danh sách phiếu kiểm kê (chuẩn Form mẫu) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/90 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-[20%]">Mã phiếu</th>
                <th className="py-3.5 px-4 w-[35%]">Kho & Phạm vi</th>
                <th className="py-3.5 px-4 w-[20%]">Ngày lập</th>
                <th className="py-3.5 px-4 text-center w-[15%]">Trạng thái</th>
                <th className="py-3.5 px-4 text-right w-[10%] min-w-[105px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/90">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải danh sách phiếu kiểm kê...
                  </td>
                </tr>
              ) : filteredAudits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    Chưa có phiếu kiểm kê nào phù hợp điều kiện lọc.
                  </td>
                </tr>
              ) : (
                paginatedAudits.map((audit) => {
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
                      </td>

                      {/* 2. Kho & Phạm vi */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800 text-sm line-clamp-1">{audit.warehouseName}</div>
                        <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {audit.scope === 'ALL'
                            ? 'Toàn bộ kho hàng'
                            : `Nhóm: ${audit.categoryName || 'Tùy chọn'}`}
                        </div>
                      </td>

                      {/* 3. Ngày lập */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center text-xs font-medium text-slate-600 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200/60">
                          {new Date(audit.createdAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </span>
                      </td>

                      {/* 4. Trạng thái */}
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

                      {/* 5. Thao tác */}
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
                                  className="w-full text-left px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 cursor-pointer transition-colors"
                                >
                                  <span>Xem chi tiết</span>
                                </button>
                              </div>

                              {audit.status === 'DRAFT' && isWarehouseManager && (
                                <div className="py-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuAuditId(null);
                                      handleOpenCompleteModal(audit);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer transition-colors"
                                  >
                                    <span>Chốt phiếu</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuAuditId(null);
                                      setSelectedAudit(audit);
                                      setCancelReason('');
                                      setCancelModalOpen(true);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                                  >
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
            onPageChange={(p) => {
              setPage(p);
              updateQueryParam({ page: String(p) });
            }}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPage(1);
              updateQueryParam({ limit: String(sz), page: '1' });
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
            </div>

            <form onSubmit={handleCreateAudit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
                  Kho kiểm kê
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.assignedWarehouse || 'Kho Tổng Miền Nam - LOHA WH01'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium"
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

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {isCreating ? 'Đang tạo...' : 'Tạo phiếu'}
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
