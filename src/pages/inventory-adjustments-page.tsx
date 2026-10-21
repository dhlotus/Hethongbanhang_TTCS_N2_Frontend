import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  SlidersHorizontal,
  Trash2,
  Warehouse,
  Ban,
} from 'lucide-react';
import { toast } from '../components/toast';
import { Pagination } from '../components/pagination';
import { inventoryAdjustmentsService } from '../services/inventory-adjustments.service';
import { inventoryService } from '../services/inventory.service';
import { productsService } from '../services/products.service';
import type {
  StockAdjustment,
  StockAdjustmentReason,
  CreateStockAdjustmentPayload,
  CreateStockAdjustmentItemPayload,
} from '../types/inventory-adjustment.types';
import {
  REASON_CONFIG,
  STATUS_CONFIG,
} from '../types/inventory-adjustment.types';
import type { StockOverviewItem } from '../types/products';
import { getStoredUser } from '../utils/navigation';

export const InventoryAdjustmentsPage: React.FC = () => {
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

  // State danh sách
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<StockAdjustment | null>(null);

  // Form Create State
  const [availableProducts, setAvailableProducts] = useState<StockOverviewItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [createReason, setCreateReason] = useState<StockAdjustmentReason>('DAMAGED');
  const [createReasonDetail, setCreateReasonDetail] = useState('');
  const [createWarehouseId] = useState('WH01');
  const [createWarehouseName] = useState('Kho Tổng Miền Nam - LOHA WH01');
  const [formItems, setFormItems] = useState<CreateStockAdjustmentItemPayload[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form Reject State
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  // Load danh sách phiếu điều chỉnh
  const loadAdjustments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await inventoryAdjustmentsService.getAdjustments({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        reason: reasonFilter !== 'ALL' ? reasonFilter : undefined,
        search: searchTerm.trim() || undefined,
      });
      setAdjustments(data);
    } catch (err: any) {
      toast.error('Không thể tải danh sách phiếu điều chỉnh: ' + (err.message || 'Lỗi kết nối'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, reasonFilter, searchTerm]);

  useEffect(() => {
    loadAdjustments();
    loadAvailableProducts();
  }, [loadAdjustments]);

  // Load danh sách sản phẩm tồn kho khi mở modal tạo phiếu
  const loadAvailableProducts = async () => {
    try {
      setLoadingProducts(true);
      let items = await inventoryService.getStockOverview();
      if (!items || items.length === 0) {
        const res = await productsService.getProducts({ limit: 100 });
        const list = res?.data || [];
        items = list.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          productName: p.name,
          baseUnit: p.baseUnit || 'Cái',
          physicalStock: p.stockQuantity ?? p.stock ?? 100,
          price: p.price || p.costPrice || 50000,
          costPrice: p.costPrice || p.price || 50000,
          units: [],
        } as any));
      }

      if (!items || items.length === 0) {
        items = [
          {
            id: 'prod-001',
            sku: 'LH-MILK-900G',
            name: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
            productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
            baseUnit: 'Lon',
            physicalStock: 340,
            price: 550000,
            costPrice: 550000,
            units: [],
          } as any,
          {
            id: 'prod-002',
            sku: 'LH-NUT-180ML',
            name: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
            productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
            baseUnit: 'Hộp',
            physicalStock: 1200,
            price: 28000,
            costPrice: 28000,
            units: [],
          } as any,
          {
            id: 'prod-003',
            sku: 'LH-YOG-100G',
            name: 'Sữa Chua Lên Men Tự Nhiên Loha Kids 100g',
            productName: 'Sữa Chua Lên Men Tự Nhiên Loha Kids 100g',
            baseUnit: 'Hũ',
            physicalStock: 500,
            price: 15000,
            costPrice: 15000,
            units: [],
          } as any,
        ];
      }

      setAvailableProducts(items);
    } catch {
      try {
        const res = await productsService.getProducts({ limit: 100 });
        const list = res?.data || [];
        const fallbackItems = list.map((p: any) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          productName: p.name,
          baseUnit: p.baseUnit || 'Cái',
          physicalStock: p.stockQuantity ?? p.stock ?? 100,
          price: p.price || p.costPrice || 50000,
          costPrice: p.costPrice || p.price || 50000,
          units: [],
        } as any));
        setAvailableProducts(fallbackItems);
      } catch {
        setAvailableProducts([]);
      }
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleOpenCreateModal = () => {
    setCreateReason('DAMAGED');
    setCreateReasonDetail('');
    setFormItems([]);
    setCreateModalOpen(true);
    loadAvailableProducts();
  };

  // Thêm một dòng sản phẩm vào form lập phiếu
  const handleAddItem = (productSku: string) => {
    const p = availableProducts.find((item) => item.sku === productSku);
    if (!p) return;

    // Kiểm tra trùng
    if (formItems.some((it) => it.productSku === productSku)) {
      toast.error('Sản phẩm này đã có trong danh sách điều chỉnh.');
      return;
    }

    const price = Number((p as any).price || (p as any).costPrice || 50000);
    const stock = Number(p.physicalStock ?? p.physicalQuantity ?? p.stockQuantity ?? 0);
    const pName = p.productName || p.name || p.sku;
    const pUnit = p.baseUnit || p.units?.[0]?.unitName || 'Cái';

    const newItem: CreateStockAdjustmentItemPayload = {
      productId: (p as any).productId || p.sku,
      productSku: p.sku,
      productName: pName,
      unit: pUnit,
      currentStock: stock,
      adjustedQuantity: 1,
      unitPrice: price,
      lossValue: price,
      reason: createReason,
      note: '',
    };

    setFormItems((prev) => [...prev, newItem]);
  };

  // Cập nhật số lượng hoặc ghi chú của item
  const handleUpdateItem = (
    index: number,
    field: 'adjustedQuantity' | 'unitPrice' | 'reason' | 'note',
    value: any,
  ) => {
    setFormItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      if (field === 'adjustedQuantity' || field === 'unitPrice') {
        const qty = Number(field === 'adjustedQuantity' ? value : item.adjustedQuantity) || 0;
        const price = Number(field === 'unitPrice' ? value : item.unitPrice) || 0;
        item.lossValue = qty * price;
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Tổng giá trị tổn thất tính toán được
  const calculatedTotalLoss = useMemo(() => {
    return formItems.reduce((sum, item) => sum + (Number(item.lossValue) || 0), 0);
  }, [formItems]);

  // Submit lập phiếu điều chỉnh
  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 sản phẩm cần điều chỉnh.');
      return;
    }

    for (const item of formItems) {
      if (item.adjustedQuantity <= 0) {
        toast.error(`Số lượng điều chỉnh của sản phẩm ${item.productName} phải lớn hơn 0.`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload: CreateStockAdjustmentPayload = {
        warehouseId: createWarehouseId,
        warehouseName: createWarehouseName,
        reason: createReason,
        reasonDetail: createReasonDetail.trim() || undefined,
        totalLossValue: calculatedTotalLoss,
        items: formItems,
        note: undefined,
      };

      const result = await inventoryAdjustmentsService.createAdjustment(payload);
      toast.success(`Lập phiếu điều chỉnh ${result.adjustmentCode} thành công! Đang chờ Quản lý duyệt.`);
      setCreateModalOpen(false);
      loadAdjustments();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lập phiếu điều chỉnh.');
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý phê duyệt (AC-3: creatorId !== approverId)
  const handleApprove = async (adj: StockAdjustment) => {
    const currentUserId = user?.id || (user as any)?.userId;
    const currentUsername = user?.username;

    const isCreator =
      Boolean(currentUserId && adj.creatorId && currentUserId === adj.creatorId) ||
      Boolean(
        currentUsername &&
          adj.creatorName &&
          currentUsername.toLowerCase() === adj.creatorName.toLowerCase(),
      );

    if (isCreator) {
      toast.error(
        'Bạn không thể tự duyệt phiếu do chính mình lập (Quy tắc SN-214: creatorId !== approverId). Vui lòng để một Quản lý kho khác phê duyệt!',
      );
      return;
    }

    const confirm = window.confirm(
      `Xác nhận phê duyệt phiếu điều chỉnh [${adj.adjustmentCode}]?\n\nHệ thống sẽ tự động trừ ${adj.items.length} mặt hàng khỏi tồn kho và ghi sổ Thẻ kho với giá trị tổn thất: ${Number(adj.totalLossValue).toLocaleString('vi-VN')} đ.`,
    );
    if (!confirm) return;

    try {
      await inventoryAdjustmentsService.approveAdjustment(adj.id);
      toast.success(`Đã phê duyệt phiếu ${adj.adjustmentCode}! Tồn kho và Thẻ kho đã được cập nhật.`);
      setDetailModalOpen(false);
      loadAdjustments();
    } catch (err: any) {
      toast.error(err.message || 'Không thể phê duyệt phiếu điều chỉnh.');
    }
  };

  // Xử lý từ chối
  const handleOpenReject = (adj: StockAdjustment) => {
    setSelectedAdjustment(adj);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustment) return;
    if (!rejectReason.trim()) {
      toast.error('Bắt buộc nhập lý do từ chối phiếu điều chỉnh.');
      return;
    }

    try {
      setRejecting(true);
      await inventoryAdjustmentsService.rejectAdjustment(selectedAdjustment.id, {
        rejectReason: rejectReason.trim(),
      });
      toast.success(`Đã từ chối phiếu điều chỉnh ${selectedAdjustment.adjustmentCode}.`);
      setRejectModalOpen(false);
      setDetailModalOpen(false);
      loadAdjustments();
    } catch (err: any) {
      toast.error(err.message || 'Không thể từ chối phiếu điều chỉnh.');
    } finally {
      setRejecting(false);
    }
  };

  // Thống kê tóm tắt
  const stats = useMemo(() => {
    const total = adjustments.length;
    const pending = adjustments.filter((a) => a.status === 'PENDING').length;
    const approved = adjustments.filter((a) => a.status === 'APPROVED').length;
    const rejected = adjustments.filter((a) => a.status === 'REJECTED').length;
    const totalLoss = adjustments.reduce(
      (sum, a) => sum + (Number(a.totalLossValue) || 0),
      0,
    );
    return { total, pending, approved, rejected, totalLoss };
  }, [adjustments]);

  // Phân trang dữ liệu
  const paginatedAdjustments = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return adjustments.slice(start, start + pageSize);
  }, [adjustments, currentPage]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* Action & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, lý do, người lập, người duyệt..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-sans"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Reason Filter */}
          <select
            value={reasonFilter}
            onChange={(e) => {
              setReasonFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tất cả lý do</option>
            <option value="DAMAGED">Hàng hỏng hóc, bể vỡ</option>
            <option value="LOST">Hàng thất thoát, mất</option>
            <option value="EXPIRED">Hàng hết hạn (huỷ)</option>
            <option value="OTHER">Lý do khác</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ phê duyệt</option>
            <option value="APPROVED">Đã phê duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
          </select>

          <button
            onClick={loadAdjustments}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 whitespace-nowrap font-sans"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap font-sans"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Lập phiếu điều chỉnh</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-sans">
        <table className="w-full text-left text-xs text-slate-700 border-collapse table-fixed">
          <thead className="bg-slate-50 text-xs text-slate-600 uppercase tracking-wider border-b border-slate-200 font-semibold font-sans">
            <tr>
              <th className="py-3 px-3.5 w-[18%]">Mã phiếu</th>
              <th className="py-3 px-3.5 w-[30%]">Lý do điều chỉnh</th>
              <th className="py-3 px-3.5 text-right w-[15%]">Giá trị tổn thất</th>
              <th className="py-3 px-3.5 w-[17%]">Người lập / Duyệt</th>
              <th className="py-3 px-3.5 text-center w-[10%]">Trạng thái</th>
              <th className="py-3 px-3.5 text-right w-[10%]">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                  Đang nạp dữ liệu phiếu điều chỉnh...
                </td>
              </tr>
            ) : paginatedAdjustments.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                  <SlidersHorizontal className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  Không tìm thấy phiếu điều chỉnh tồn kho nào phù hợp.
                </td>
              </tr>
            ) : (
              paginatedAdjustments.map((adj) => {
                const currentUserId = user?.id || (user as any)?.userId;
                const currentUsername = user?.username;
                const isCreator =
                  Boolean(currentUserId && adj.creatorId && currentUserId === adj.creatorId) ||
                  Boolean(
                    currentUsername &&
                      adj.creatorName &&
                      currentUsername.toLowerCase() === adj.creatorName.toLowerCase(),
                  );
                const canApprove = isWarehouseManager && adj.status === 'PENDING';

                return (
                  <tr key={adj.id} className="hover:bg-slate-50/75 transition-colors font-sans">
                    {/* 1. Mã phiếu & Ngày lập */}
                    <td className="py-3 px-3.5">
                      <button
                        onClick={() => {
                          setSelectedAdjustment(adj);
                          setDetailModalOpen(true);
                        }}
                        className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline block text-xs"
                      >
                        {adj.adjustmentCode}
                      </button>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(adj.createdAt).toLocaleDateString('vi-VN')} {new Date(adj.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* 2. Lý do điều chỉnh */}
                    <td className="py-3 px-3.5">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${
                          REASON_CONFIG[adj.reason]?.badgeClass || 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {REASON_CONFIG[adj.reason]?.label || adj.reason}
                      </span>
                    </td>

                    {/* 3. Giá trị tổn thất */}
                    <td className="py-3 px-3.5 text-right font-bold text-rose-600 text-xs">
                      <div>{Number(adj.totalLossValue).toLocaleString('vi-VN')} đ</div>
                      <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                        {adj.items.length} mặt hàng
                      </div>
                    </td>

                    {/* 4. Người lập & Duyệt */}
                    <td className="py-3 px-3.5 text-xs text-slate-700">
                      <div className="font-medium text-slate-800">
                        Lập: <span className="text-slate-900 font-semibold">{adj.creatorName}</span>
                      </div>
                      <div className="text-[11px] mt-0.5">
                        {adj.approverName ? (
                          <span className="text-emerald-700 font-medium">
                            Duyệt: {adj.approverName}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa duyệt</span>
                        )}
                      </div>
                    </td>

                    {/* 5. Trạng thái */}
                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          STATUS_CONFIG[adj.status]?.badgeClass || 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {STATUS_CONFIG[adj.status]?.label || adj.status}
                      </span>
                    </td>

                    {/* 6. Thao tác */}
                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedAdjustment(adj);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {canApprove && (
                          <>
                            <button
                              onClick={() => handleApprove(adj)}
                              disabled={isCreator}
                              className={`p-1.5 rounded transition-colors ${
                                isCreator
                                  ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={
                                isCreator
                                  ? 'Không thể tự duyệt phiếu do bạn lập (creatorId !== approverId)'
                                  : 'Phê duyệt'
                              }
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenReject(adj)}
                              className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              title="Từ chối"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Dòng tổng hợp dưới cuối bảng */}
          {adjustments.length > 0 && (
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 text-xs text-slate-700 font-sans">
              <tr>
                <td className="py-3 px-3.5 font-bold text-slate-900">
                  Tổng: {stats.total} phiếu
                </td>
                <td className="py-3 px-3.5">
                  <span className="text-amber-700 font-semibold">Chờ duyệt: {stats.pending}</span>
                  <span className="mx-2 text-slate-300">|</span>
                  <span className="text-emerald-700 font-semibold">Đã duyệt: {stats.approved}</span>
                  {stats.rejected > 0 && (
                    <>
                      <span className="mx-2 text-slate-300">|</span>
                      <span className="text-rose-700 font-semibold">Từ chối: {stats.rejected}</span>
                    </>
                  )}
                </td>
                <td className="py-3 px-3.5 text-right font-bold text-rose-600">
                  {stats.totalLoss.toLocaleString('vi-VN')} đ
                </td>
                <td colSpan={3} className="py-3 px-3.5 text-slate-500 text-right text-xs">
                  Tổng giá trị tổn thất: <span className="font-bold text-rose-600">{stats.totalLoss.toLocaleString('vi-VN')} đ</span>
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        {/* Phân trang */}
        {adjustments.length > pageSize && (
          <div className="p-3 border-t border-slate-200 font-sans">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(adjustments.length / pageSize)}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal: Lập phiếu điều chỉnh mới */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full p-6 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Lập phiếu điều chỉnh tồn kho</h3>
            </div>

            <form onSubmit={handleSubmitCreate} className="space-y-5">
              {/* Warehouse & Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Kho điều chỉnh <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 text-sm text-slate-700 font-medium">
                    <Warehouse className="w-4 h-4 text-slate-400" />
                    <span>{createWarehouseName}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Lý do điều chỉnh (Bắt buộc) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={createReason}
                    onChange={(e) => setCreateReason(e.target.value as StockAdjustmentReason)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="DAMAGED">Hàng hỏng hóc, bể vỡ (DAMAGED)</option>
                    <option value="LOST">Hàng thất thoát, mất (LOST)</option>
                    <option value="EXPIRED">Hàng hết hạn phải huỷ (EXPIRED)</option>
                    <option value="OTHER">Lý do khác (OTHER)</option>
                  </select>
                </div>
              </div>

              {/* Diễn giải chi tiết lý do */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Diễn giải chi tiết lý do <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Rơi vỡ khi bốc dỡ từ xe tải hoặc hết hạn lô EXP-202610..."
                  value={createReasonDetail}
                  onChange={(e) => setCreateReasonDetail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Chọn sản phẩm thêm vào danh sách */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Danh sách sản phẩm điều chỉnh ({formItems.length}) <span className="text-rose-500">*</span>
                  </label>
                  <div className="w-72">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddItem(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      defaultValue=""
                      disabled={loadingProducts}
                      className="w-full px-3 py-1.5 text-xs border border-indigo-300 rounded-lg bg-indigo-50/50 text-indigo-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="" disabled>
                        {loadingProducts ? 'Đang tải danh mục...' : '+ Chọn sản phẩm từ kho...'}
                      </option>
                      {availableProducts.map((p) => (
                        <option key={p.sku} value={p.sku}>
                          [{p.sku}] {p.productName || p.name} (Tồn: {p.physicalStock ?? p.physicalQuantity ?? p.stockQuantity ?? 0} {p.baseUnit || 'Cái'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formItems.length === 0 ? (
                  <div className="p-8 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 bg-slate-50/50">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-1.5 text-amber-500/80" />
                    <p className="text-sm font-medium text-slate-700">Chưa có sản phẩm nào được chọn</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Vui lòng chọn sản phẩm từ danh sách trên để lập phiếu hao hụt / tổn thất.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3">Sản phẩm</th>
                          <th className="py-2.5 px-3 text-center">Tồn sổ</th>
                          <th className="py-2.5 px-3 text-center w-28">SL giảm</th>
                          <th className="py-2.5 px-3 text-right w-32">Đơn giá vốn</th>
                          <th className="py-2.5 px-3 text-right w-36">Tổn thất (VNĐ)</th>
                          <th className="py-2.5 px-2 text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {formItems.map((item, idx) => (
                          <tr key={item.productSku} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">{item.productName}</div>
                              <div className="text-slate-400 font-mono text-[11px]">{item.productSku}</div>
                            </td>

                            <td className="py-2.5 px-3 text-center whitespace-nowrap text-slate-600 font-medium">
                              {item.currentStock} {item.unit}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="number"
                                min="1"
                                max={item.currentStock || 999999}
                                value={item.adjustedQuantity}
                                onChange={(e) =>
                                  handleUpdateItem(idx, 'adjustedQuantity', Math.max(1, parseInt(e.target.value, 10) || 1))
                                }
                                className="w-20 px-2 py-1 text-center font-bold text-slate-900 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              />
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={item.unitPrice}
                                onChange={(e) =>
                                  handleUpdateItem(idx, 'unitPrice', Math.max(0, parseInt(e.target.value, 10) || 0))
                                }
                                className="w-28 px-2 py-1 text-right font-medium text-slate-800 border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              />
                            </td>

                            <td className="py-2.5 px-3 text-right font-bold text-rose-600 whitespace-nowrap">
                              {Number(item.lossValue).toLocaleString('vi-VN')} đ
                            </td>

                            <td className="py-2.5 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded"
                                title="Xoá dòng"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Total Loss Value Display */}
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                    Tổng giá trị tổn thất (VNĐ) (AC-2)
                  </p>
                  <p className="text-xs text-rose-600 mt-0.5">
                    Bắt buộc ghi nhận giá trị thiệt hại tài chính để phục vụ kế toán & phê duyệt
                  </p>
                </div>
                <div className="text-2xl font-black text-rose-700 font-mono">
                  {calculatedTotalLoss.toLocaleString('vi-VN')} đ
                </div>
              </div>



              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  disabled={submitting || formItems.length === 0}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang lưu phiếu...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xác nhận lập phiếu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xem chi tiết phiếu điều chỉnh */}
      {detailModalOpen && selectedAdjustment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full p-6 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Chi tiết phiếu điều chỉnh: {selectedAdjustment.adjustmentCode}
                </h3>
                <p className="text-xs text-slate-500">
                  Lập lúc: {new Date(selectedAdjustment.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 font-medium">Trạng thái</span>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                      STATUS_CONFIG[selectedAdjustment.status]?.badgeClass
                    }`}
                  >
                    {STATUS_CONFIG[selectedAdjustment.status]?.label}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium">Lý do chính</span>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                      REASON_CONFIG[selectedAdjustment.reason]?.badgeClass
                    }`}
                  >
                    {REASON_CONFIG[selectedAdjustment.reason]?.label}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium">Người lập</span>
                <p className="text-sm font-semibold text-slate-900 mt-0.5">
                  {selectedAdjustment.creatorName}
                </p>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium">Người duyệt</span>
                <p className="text-sm font-semibold text-emerald-700 mt-0.5">
                  {selectedAdjustment.approverName || 'Chưa duyệt'}
                </p>
              </div>
            </div>

            {/* Reason detail & note */}
            {selectedAdjustment.reasonDetail && (
              <div className="text-xs bg-amber-50/60 p-3 rounded-lg border border-amber-200 text-amber-900">
                <span className="font-bold">Diễn giải nguyên nhân:</span> {selectedAdjustment.reasonDetail}
              </div>
            )}

            {selectedAdjustment.rejectReason && (
              <div className="text-xs bg-rose-50 p-3 rounded-lg border border-rose-200 text-rose-900">
                <span className="font-bold">Lý do từ chối:</span> {selectedAdjustment.rejectReason}
              </div>
            )}

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Danh sách mặt hàng tổn thất / điều chỉnh ({selectedAdjustment.items.length})
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Mặt hàng</th>
                      <th className="py-2.5 px-3 text-center">Tồn trước</th>
                      <th className="py-2.5 px-3 text-center">SL giảm</th>
                      <th className="py-2.5 px-3 text-right">Đơn giá vốn</th>
                      <th className="py-2.5 px-3 text-right">Tổn thất (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedAdjustment.items.map((it) => (
                      <tr key={it.id || it.productSku} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{it.productName}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{it.productSku}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                          {it.currentStock} {it.unit}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-rose-600">
                          -{it.adjustedQuantity} {it.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-slate-700">
                          {Number(it.unitPrice).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                          {Number(it.lossValue).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 text-right uppercase text-slate-600 text-xs">
                        Tổng giá trị tổn thất:
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-rose-600 font-mono">
                        {Number(selectedAdjustment.totalLossValue).toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Đóng
              </button>

              {isWarehouseManager && selectedAdjustment.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenReject(selectedAdjustment)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Từ chối</span>
                  </button>

                  <button
                    onClick={() => handleApprove(selectedAdjustment)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Phê duyệt phiếu</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Từ chối phiếu điều chỉnh */}
      {rejectModalOpen && selectedAdjustment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-rose-600 pb-2 border-b border-slate-200">
              <Ban className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Từ chối phiếu điều chỉnh</h3>
            </div>

            <p className="text-xs text-slate-600">
              Bạn đang từ chối phiếu điều chỉnh <strong className="text-slate-900">{selectedAdjustment.adjustmentCode}</strong>.
              Vui lòng ghi rõ nguyên nhân từ chối để người lập khắc phục.
            </p>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Lý do từ chối <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ví dụ: Chưa đủ căn cứ xác nhận hàng mất, yêu cầu kiểm đếm lại..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Đóng
                </button>

                <button
                  type="submit"
                  disabled={rejecting || !rejectReason.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {rejecting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Xác nhận từ chối</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
