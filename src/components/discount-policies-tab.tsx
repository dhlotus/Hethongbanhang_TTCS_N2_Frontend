import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, CheckCircle2, X, Edit2, Trash2, Search, RefreshCw, Filter } from 'lucide-react';
import { showToast } from './toast';
import { ConfirmDialog } from './confirm-dialog';
import { Button } from './button';
import { IconButton } from './icon-button';
import { Badge } from './badge';
import { discountPoliciesService } from '../services/discount-policies.service';
import type {
  DiscountPolicy,
  CreateDiscountPolicyPayload,
} from '../services/discount-policies.service';
import { DiscountPolicyFormModal } from './discount-policy-form-modal';

/**
 * Trích xuất thông báo lỗi an toàn không dùng `any` theo CODE_CONVENTION.md
 */
const getErrorMessage = (err: unknown, fallback: string): string => {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
};

export const DiscountPoliciesTab: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Dữ liệu & Tải trang
  const [policies, setPolicies] = useState<DiscountPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DiscountPolicy | null>(null);
  const [policyToDelete, setPolicyToDelete] = useState<DiscountPolicy | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Phân tích trạng thái & từ khóa từ URL Search Params
  const urlStatusParam = (searchParams.get('status') || 'ALL').toUpperCase();
  const validStatus =
    urlStatusParam === 'ACTIVE' || urlStatusParam === 'INACTIVE' || urlStatusParam === 'EXPIRED'
      ? urlStatusParam
      : 'ALL';

  const urlSearchParam = searchParams.get('search') || '';

  const [selectedStatus, setSelectedStatus] = useState<string>(validStatus);
  const [searchInput, setSearchInput] = useState<string>(urlSearchParam);
  const [searchTerm, setSearchTerm] = useState<string>(urlSearchParam);

  const isInitialSearchMount = useRef(true);

  // Cập nhật an toàn các Query Params lên URL (không reload trang)
  const updateUrlParams = useCallback(
    (updates: { status?: string; search?: string }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          // Đảm bảo tab luôn là discount
          next.set('tab', 'discount');

          // Trạng thái
          const targetStatus = updates.status !== undefined ? updates.status : selectedStatus;
          if (targetStatus && targetStatus !== 'ALL') {
            next.set('status', targetStatus.toLowerCase());
          } else {
            next.delete('status');
          }

          // Từ khóa tìm kiếm
          const targetSearch = updates.search !== undefined ? updates.search : searchTerm;
          const trimmed = targetSearch.trim();
          if (trimmed) {
            next.set('search', trimmed);
          } else {
            next.delete('search');
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams, selectedStatus, searchTerm]
  );

  // Debounce tìm kiếm (400ms)
  useEffect(() => {
    if (isInitialSearchMount.current) {
      isInitialSearchMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed !== searchTerm) {
        setSearchTerm(trimmed);
        updateUrlParams({ search: trimmed });
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, searchTerm, updateUrlParams]);

  // Lắng nghe thay đổi của URL searchParams (Back/Forward hoặc link chia sẻ)
  useEffect(() => {
    const rawStatus = (searchParams.get('status') || 'ALL').toUpperCase();
    const newStatus =
      rawStatus === 'ACTIVE' || rawStatus === 'INACTIVE' || rawStatus === 'EXPIRED'
        ? rawStatus
        : 'ALL';
    if (newStatus !== selectedStatus) {
      setSelectedStatus(newStatus);
    }

    const newSearch = searchParams.get('search') || '';
    if (newSearch !== searchTerm) {
      setSearchTerm(newSearch);
      setSearchInput(newSearch);
    }
  }, [searchParams, selectedStatus, searchTerm]);

  // Nạp danh sách chính sách chiết khấu
  const loadPolicies = useCallback(async () => {
    setLoading(true);
    try {
      const data = await discountPoliciesService.getPolicies();
      setPolicies(data);
    } catch (err: unknown) {
      showToast('error', getErrorMessage(err, 'Lỗi khi tải danh sách chính sách chiết khấu'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPolicies();
  }, [loadPolicies]);

  // Lọc dữ liệu hiển thị theo trạng thái và từ khóa tìm kiếm
  const filteredPolicies = useMemo(() => {
    return policies.filter((p) => {
      // Bộ lọc Trạng thái
      if (selectedStatus === 'ACTIVE' && p.status !== 'ACTIVE') {
        return false;
      }
      if (selectedStatus === 'INACTIVE' && p.status !== 'INACTIVE') {
        return false;
      }
      if (selectedStatus === 'EXPIRED') {
        if (!p.endDate) return false;
        const isExpired = new Date(p.endDate) < new Date();
        if (!isExpired) return false;
      }

      // Bộ lọc Tìm kiếm
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const matchCode = p.code?.toLowerCase().includes(q);
        const matchName = p.name?.toLowerCase().includes(q);
        const matchTarget = (p.targetIds?.join(' ') || p.targetId || '').toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchTarget) {
          return false;
        }
      }

      return true;
    });
  }, [policies, selectedStatus, searchTerm]);

  const handleOpenCreateModal = () => {
    setEditingPolicy(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (policy: DiscountPolicy) => {
    setEditingPolicy(policy);
    setIsModalOpen(true);
  };

  const handleDelete = (policy: DiscountPolicy) => {
    setPolicyToDelete(policy);
  };

  const handleFormSubmit = async (payload: CreateDiscountPolicyPayload, id?: string) => {
    try {
      if (id) {
        await discountPoliciesService.updatePolicy(id, payload);
        showToast('success', 'Cập nhật chính sách thành công');
      } else {
        await discountPoliciesService.createPolicy(payload);
        showToast('success', 'Thêm mới chính sách thành công');
      }
      setIsModalOpen(false);
      await loadPolicies();
    } catch (err: unknown) {
      const msg = getErrorMessage(err, 'Lỗi khi lưu chính sách');
      showToast('error', msg);
      throw err;
    }
  };

  const handleStatusFilterChange = (status: string) => {
    setSelectedStatus(status);
    updateUrlParams({ status });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setSelectedStatus('ALL');
    updateUrlParams({ search: '', status: 'ALL' });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Chính sách Chiết khấu theo Sản lượng
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập chiết khấu bậc thang theo số lượng đặt hàng cho đại lý và khách sỉ
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          fullWidth={false}
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={handleOpenCreateModal}
        >
          Thêm chính sách
        </Button>
      </div>

      {/* 2. Filter Bar (Đồng bộ URL searchParams) */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Ô Tìm kiếm */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm theo mã chính sách, tên hoặc đối tượng áp dụng..."
              className="w-full pl-9.5 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 font-medium"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Lọc Trạng thái */}
          <div className="sm:w-48">
            <select
              value={selectedStatus}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
            >
              <option value="ALL">Tất cả Trạng thái</option>
              <option value="ACTIVE">Đang hiệu lực</option>
              <option value="INACTIVE">Không hiệu lực</option>
              <option value="EXPIRED">Đã hết hạn</option>
            </select>
          </div>

          {/* Nút Làm mới */}
          <button
            type="button"
            onClick={loadPolicies}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer shrink-0 disabled:opacity-50"
            title="Tải lại danh sách chính sách"
          >
            <RefreshCw
              className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin text-blue-600' : ''}`}
            />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {/* Nút Xóa bộ lọc nếu có lọc */}
          {(searchTerm || selectedStatus !== 'ALL') && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 px-3.5 py-2 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-100/60 active:scale-[0.98] transition-all cursor-pointer shrink-0"
              title="Đặt lại toàn bộ bộ lọc"
            >
              <Filter className="h-3.5 w-3.5 text-rose-500" />
              <span>Bỏ lọc</span>
            </button>
          )}
        </div>

        {/* Thông tin kết quả tìm kiếm */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 font-medium pt-2 border-t border-slate-100">
          <div>
            Hiển thị{' '}
            <strong className="text-slate-900 font-semibold">{filteredPolicies.length}</strong> /{' '}
            {policies.length} chính sách
          </div>
          {(searchTerm || selectedStatus !== 'ALL') && (
            <div className="text-[11px] text-blue-600 font-medium">
              Đang áp dụng bộ lọc URL: {selectedStatus !== 'ALL' && `Trạng thái: ${selectedStatus} `}
              {searchTerm && `• Từ khóa: "${searchTerm}"`}
            </div>
          )}
        </div>
      </div>

      {/* 3. Bảng dữ liệu chính sách chiết khấu */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div
          className="overflow-auto max-h-[calc(100vh-320px)] relative [scrollbar-width:thin] [scrollbar-color:#E5E7EB_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#E5E7EB] hover:[&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#E5E7EB transparent' }}
        >
          <table className="w-full text-left text-xs border-separate border-spacing-0">
            <thead>
              <tr className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-12 text-center">
                  STT
                </th>
                <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 min-w-[150px]">
                  Mã chính sách
                </th>
                <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 min-w-[200px]">
                  Tên chính sách
                </th>
                <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-36">
                  Đối tượng
                </th>
                <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-36">
                  Loại chiết khấu
                </th>
                <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-48">
                  Thời gian hiệu lực
                </th>
                <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-36 text-center">
                  Trạng thái
                </th>
                <th className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-28 text-center">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Đang nạp danh sách chính sách chiết khấu...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPolicies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="font-semibold text-slate-700">Không tìm thấy chính sách phù hợp</p>
                      <p className="text-xs text-slate-400">
                        {searchTerm || selectedStatus !== 'ALL'
                          ? 'Thử thay đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc trạng thái'
                          : 'Chưa có chính sách chiết khấu sản lượng nào trong hệ thống'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPolicies.map((p, i) => (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px] w-12">
                      {i + 1}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.code}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{p.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-semibold text-slate-800 text-[11px]">
                          {p.targetType === 'HYBRID'
                            ? 'Đa tầng (Nhóm + SKU)'
                            : p.targetType === 'SKU'
                              ? 'Sản phẩm (SKU)'
                              : 'Nhóm hàng (Category)'}
                        </span>
                        <span
                          className="text-slate-500 font-mono text-[11px] truncate max-w-[220px]"
                          title={p.targetIds?.join(', ') || p.targetId}
                        >
                          {p.targetIds && p.targetIds.length > 0
                            ? p.targetIds.join(', ')
                            : p.targetId}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {p.discountType === 'PERCENTAGE' ? '% Phần trăm' : 'Cố định'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {p.startDate ? p.startDate.split('T')[0] : ''} -{' '}
                      {p.endDate ? p.endDate.split('T')[0] : ''}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {p.status === 'ACTIVE' ? (
                        <Badge variant="success" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                          Đang hiệu lực
                        </Badge>
                      ) : (
                        <Badge variant="neutral" icon={<X className="w-3.5 h-3.5" />}>
                          Không hiệu lực
                        </Badge>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex justify-center items-center gap-1">
                        <IconButton
                          icon={<Edit2 className="w-3.5 h-3.5" />}
                          size="sm"
                          variant="default"
                          tooltip="Chỉnh sửa chính sách"
                          onClick={() => handleOpenEditModal(p)}
                        />
                        <IconButton
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          size="sm"
                          variant="danger"
                          tooltip="Xóa chính sách"
                          onClick={() => handleDelete(p)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DiscountPolicyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingPolicy}
      />

      <ConfirmDialog
        isOpen={Boolean(policyToDelete)}
        onCancel={() => setPolicyToDelete(null)}
        onConfirm={async () => {
          if (!policyToDelete) return;
          setIsDeleting(true);
          try {
            await discountPoliciesService.deletePolicy(policyToDelete.id);
            showToast('success', 'Xóa chính sách thành công');
            setPolicyToDelete(null);
            await loadPolicies();
          } catch (err: unknown) {
            showToast('error', getErrorMessage(err, 'Lỗi khi xóa chính sách'));
          } finally {
            setIsDeleting(false);
          }
        }}
        title="Xóa chính sách chiết khấu"
        message={`Bạn có chắc chắn muốn xóa chính sách "${policyToDelete?.name}"? Các đơn hàng tính chiết khấu trong tương lai sẽ không còn áp dụng chính sách này.`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
