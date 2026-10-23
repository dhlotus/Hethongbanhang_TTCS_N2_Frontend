import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HandCoins,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  FileText,
  Eye,
  AlertCircle,
  UploadCloud,
  X,
  Check,
  Scale,
  CreditCard,
  Banknote,
  ChevronDown,
} from 'lucide-react';
import { DateInput } from '../components/date-input';
import { Pagination } from '../components/pagination';
import {
  collectionsService,
  type RouteCollection,
  type CollectionSummary,
  type ReconciliationRow,
  type CreateCollectionPayload,
  type CollectionStatus,
  type PaymentMethod,
} from '../services/collections.service';
import { customerService } from '../services/customer.service';
import type { Customer } from '../types/customer.types';
import { showToast } from '../components/toast';
import { getStoredUser } from '../utils/navigation';
import { USER_ROLES } from '../types/auth';

const STATUS_CONFIG: Record<
  CollectionStatus,
  { label: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  PENDING: {
    label: 'Chờ nộp',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: Clock,
  },
  APPROVED: {
    label: 'Đã duyệt',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  REJECTED: {
    label: 'Bị từ chối',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    icon: XCircle,
  },
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  CASH: { label: 'Tiền mặt', icon: Banknote },
  BANK_TRANSFER: { label: 'Chuyển khoản', icon: CreditCard },
};

export const RouteCollectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  useEffect(() => {
    document.title = 'Quản lý thu tuyến | LOHA SALES';
  }, []);
  const roles = (currentUser?.roles || (currentUser?.role ? [currentUser.role] : [])).map((r) =>
    String(r).toUpperCase(),
  );

  const isAdmin = roles.includes(USER_ROLES.ADMIN);
  const isAccountant = roles.includes(USER_ROLES.ACCOUNTANT) || roles.includes('ACCOUNTANT_DEBT');
  const isSalesManager = roles.includes(USER_ROLES.SALES_MANAGER) || roles.includes('BUSINESS_MANAGER');
  const isSalesRep = roles.includes(USER_ROLES.SALES_REP);

  const canApprove = isAdmin || isAccountant || isSalesManager;
  const canCreate = isAdmin || isSalesRep || isSalesManager;

  // Tabs: 'COLLECTIONS' (Danh sách phiếu thu) | 'RECONCILIATION' (Bảng đối chiếu tổng hợp)
  const [activeTab, setActiveTab] = useState<'COLLECTIONS' | 'RECONCILIATION'>('COLLECTIONS');

  // Dữ liệu Danh sách phiếu thu
  const [collections, setCollections] = useState<RouteCollection[]>([]);
  const [summary, setSummary] = useState<CollectionSummary>({
    totalAmount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
    rejectedAmount: 0,
    totalCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Bộ lọc danh sách phiếu
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Ràng buộc ngày hợp lệ (chỉ cho phép năm 4 chữ số trong khoảng 2020 - 2099, ngăn chặn lỗi gõ năm quá dài)
  const handleFromDateChange = (val: string) => {
    if (!val) {
      setFromDate('');
      return;
    }
    const [yearStr] = val.split('-');
    if (yearStr && (yearStr.length > 4 || parseInt(yearStr, 10) > 2099 || parseInt(yearStr, 10) < 2000)) {
      return;
    }
    if (toDate && val > toDate) {
      setToDate(val);
    }
    setFromDate(val);
  };

  const handleToDateChange = (val: string) => {
    if (!val) {
      setToDate('');
      return;
    }
    const [yearStr] = val.split('-');
    if (yearStr && (yearStr.length > 4 || parseInt(yearStr, 10) > 2099 || parseInt(yearStr, 10) < 2000)) {
      return;
    }
    if (fromDate && val < fromDate) {
      setFromDate(val);
    }
    setToDate(val);
  };

  const handleReconDateChange = (val: string) => {
    if (!val) {
      setReconDate('');
      return;
    }
    const [yearStr] = val.split('-');
    if (yearStr && (yearStr.length > 4 || parseInt(yearStr, 10) > 2099 || parseInt(yearStr, 10) < 2000)) {
      return;
    }
    setReconDate(val);
  };

  // State menu thao tác dropdown của từng hàng
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  useEffect(() => {
    const handleOutsideClick = () => setOpenActionId(null);
    if (openActionId) {
      document.addEventListener('click', handleOutsideClick);
      return () => document.removeEventListener('click', handleOutsideClick);
    }
  }, [openActionId]);

  // Dữ liệu Bảng đối chiếu tổng hợp
  const [reconciliationRows, setReconciliationRows] = useState<ReconciliationRow[]>([]);
  const [loadingRecon, setLoadingRecon] = useState(false);
  const [reconDate, setReconDate] = useState('');
  const [reconSalesRep, setReconSalesRep] = useState('ALL');

  // Danh sách đại lý phục vụ tạo phiếu
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Modal Tạo Phiếu Thu Mới
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newAgencyId, setNewAgencyId] = useState('');
  const [newAmount, setNewAmount] = useState<number | ''>('');
  const [newMethod, setNewMethod] = useState<PaymentMethod>('CASH');
  const [newCollectionDate, setNewCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [newNote, setNewNote] = useState('');
  const [newReceiptFile, setNewReceiptFile] = useState<File | null>(null);
  const [newReceiptPreview, setNewReceiptPreview] = useState<string>('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  // Modal Xem chi tiết & Duyệt biên lai
  const [selectedCollection, setSelectedCollection] = useState<RouteCollection | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Modal Xem ảnh phóng to
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  // Tải danh sách phiếu thu
  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const res = await collectionsService.getCollections({
        search: searchTerm || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setCollections(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      showToast('error', 'Lỗi tải phiếu thu', err?.message || 'Không thể tải danh sách phiếu thu');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, fromDate, toDate]);

  // Tải bảng đối chiếu tổng hợp
  const fetchReconciliation = useCallback(async () => {
    try {
      setLoadingRecon(true);
      const res = await collectionsService.getReconciliation({
        date: reconDate || undefined,
        sales_rep_id: reconSalesRep !== 'ALL' ? reconSalesRep : undefined,
      });
      setReconciliationRows(res.rows);
    } catch (err: any) {
      showToast('error', 'Lỗi đối chiếu', err?.message || 'Không thể tải bảng đối chiếu');
    } finally {
      setLoadingRecon(false);
    }
  }, [reconDate, reconSalesRep]);

  // Tải danh sách đại lý
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await customerService.getCustomers({ limit: 100 });
      if (res?.data) {
        setCustomers(res.data);
      }
    } catch {
      // Fallback nếu có lỗi
    }
  }, []);

  useEffect(() => {
    fetchCollections();
    fetchCustomers();
  }, [fetchCollections, fetchCustomers]);

  useEffect(() => {
    if (activeTab === 'RECONCILIATION') {
      fetchReconciliation();
    }
  }, [activeTab, fetchReconciliation]);

  // Xử lý upload ảnh preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('error', 'File quá lớn', 'Kích thước ảnh tối đa là 10MB');
        return;
      }
      setNewReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Đại lý đang được chọn trong modal tạo
  const selectedAgency = useMemo(() => {
    return customers.find((c) => c.id === newAgencyId || c.code === newAgencyId);
  }, [customers, newAgencyId]);

  // Submit tạo phiếu thu mới
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgencyId) {
      showToast('error', 'Thiếu thông tin', 'Vui lòng chọn đại lý cần thu tiền');
      return;
    }
    if (!newAmount || Number(newAmount) <= 0) {
      showToast('error', 'Số tiền không hợp lệ', 'Vui lòng nhập số tiền lớn hơn 0');
      return;
    }
    if (!newReceiptFile && !newReceiptPreview) {
      showToast('error', 'Thiếu ảnh biên lai', 'Vui lòng tải lên ảnh biên lai giấy hoặc ủy nhiệm chi/chuyển khoản');
      return;
    }

    try {
      setIsSubmittingCreate(true);
      const payload: CreateCollectionPayload = {
        agency_id: newAgencyId,
        agency_name: selectedAgency?.name || undefined,
        amount: Number(newAmount),
        payment_method: newMethod,
        collection_date: newCollectionDate,
        note: newNote,
        image: newReceiptFile || undefined,
        receipt_image_url: !newReceiptFile ? newReceiptPreview : undefined,
      };

      const res = await collectionsService.createCollection(payload);
      showToast(
        'success',
        'Tạo phiếu thu thành công',
        `Mã phiếu ${res.code} - Số tiền ${Number(newAmount).toLocaleString('vi-VN')} đ đang ở trạng thái Chờ nộp`,
      );

      // Phát sự kiện lên chuông thông báo toàn hệ thống tức thì
      window.dispatchEvent(
        new CustomEvent('loha_collection_created', {
          detail: {
            id: res.id,
            code: res.code,
            agencyName: selectedAgency?.name || res.agencyName || newAgencyId,
            amount: Number(newAmount),
            paymentMethod: newMethod,
          },
        }),
      );

      // Reset form
      setIsCreateOpen(false);
      setNewAgencyId('');
      setNewAmount('');
      setNewNote('');
      setNewReceiptFile(null);
      setNewReceiptPreview('');

      // Reload
      fetchCollections();
      if (activeTab === 'RECONCILIATION') fetchReconciliation();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tạo phiếu thu';
      showToast('error', 'Tạo phiếu thất bại', msg);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  // Duyệt hoặc Từ chối phiếu thu (Kế toán)
  const handleActionStatus = async (status: 'APPROVED' | 'REJECTED') => {
    if (!selectedCollection) return;
    if (status === 'REJECTED' && !rejectionReasonInput.trim()) {
      showToast('error', 'Thiếu lý do', 'Vui lòng nhập lý do từ chối phiếu thu');
      return;
    }

    try {
      setIsSubmittingAction(true);
      await collectionsService.updateStatus(selectedCollection.id, {
        status,
        note: rejectionReasonInput.trim() || undefined,
        rejection_reason: rejectionReasonInput.trim() || undefined,
      });

      showToast(
        status === 'APPROVED' ? 'success' : 'info',
        status === 'APPROVED' ? 'Duyệt thành công' : 'Đã từ chối phiếu thu',
        status === 'APPROVED'
          ? `Đã duyệt phiếu ${selectedCollection.code} và tự động gạch nợ ${selectedCollection.amount.toLocaleString('vi-VN')} đ cho đại lý`
          : `Đã từ chối phiếu ${selectedCollection.code}`,
      );

      setIsReviewOpen(false);
      setSelectedCollection(null);
      setIsRejecting(false);
      setRejectionReasonInput('');

      fetchCollections();
      if (activeTab === 'RECONCILIATION') fetchReconciliation();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Thao tác không thành công';
      showToast('error', 'Lỗi xử lý', msg);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Phân trang danh sách phiếu thu (Hình 2)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset trang về 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, methodFilter, fromDate, toDate]);

  // Lọc phía client thêm phương thức
  const filteredCollections = useMemo(() => {
    return collections.filter((c) => {
      if (methodFilter !== 'ALL' && c.paymentMethod !== methodFilter) return false;
      return true;
    });
  }, [collections, methodFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCollections.length / pageSize));

  // Điều chỉnh currentPage nếu vượt quá totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Danh sách phiếu thu hiển thị theo phân trang
  const paginatedCollections = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCollections.slice(start, start + pageSize);
  }, [filteredCollections, currentPage, pageSize]);

  // Phân trang Bảng đối chiếu tổng hợp
  const [currentReconPage, setCurrentReconPage] = useState(1);
  const [reconPageSize, setReconPageSize] = useState(10);

  // Reset trang đối chiếu về 1 khi thay đổi bộ lọc
  useEffect(() => {
    setCurrentReconPage(1);
  }, [reconDate, reconSalesRep]);

  const totalReconPages = Math.max(1, Math.ceil(reconciliationRows.length / reconPageSize));

  useEffect(() => {
    if (currentReconPage > totalReconPages) {
      setCurrentReconPage(totalReconPages);
    }
  }, [currentReconPage, totalReconPages]);

  // Dữ liệu đối chiếu hiển thị theo phân trang
  const paginatedReconciliationRows = useMemo(() => {
    const start = (currentReconPage - 1) * reconPageSize;
    return reconciliationRows.slice(start, start + reconPageSize);
  }, [reconciliationRows, currentReconPage, reconPageSize]);

  // Danh sách sales rep duy nhất để lọc
  const salesRepOptions = useMemo(() => {
    const map = new Map<string, string>();
    collections.forEach((c) => {
      if (c.salesRepId && c.salesRepName) {
        map.set(c.salesRepId, c.salesRepName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [collections]);

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* THẺ KPI THỐNG KÊ NHANH                                                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tổng tiền đã thu */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Tổng tiền đã thu</p>
          <p className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {summary.totalAmount.toLocaleString('vi-VN')} <span className="text-sm font-sans font-medium text-slate-400">đ</span>
          </p>
        </div>

        {/* Chờ nộp */}
        <div className="bg-white p-4 rounded-xl border border-amber-200/80 bg-amber-50/20 shadow-xs">
          <p className="text-xs font-semibold text-amber-800">Chờ nộp</p>
          <p className="text-xl font-bold text-amber-700 mt-1 font-mono">
            {summary.pendingAmount.toLocaleString('vi-VN')} <span className="text-sm font-sans font-medium text-amber-500">đ</span>
          </p>
        </div>

        {/* Đã duyệt */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 bg-emerald-50/20 shadow-xs">
          <p className="text-xs font-semibold text-emerald-800">Đã duyệt</p>
          <p className="text-xl font-bold text-emerald-700 mt-1 font-mono">
            {summary.approvedAmount.toLocaleString('vi-VN')} <span className="text-sm font-sans font-medium text-emerald-500">đ</span>
          </p>
        </div>

        {/* Bị từ chối */}
        <div className="bg-white p-4 rounded-xl border border-rose-200/80 bg-rose-50/20 shadow-xs">
          <p className="text-xs font-semibold text-rose-800">Bị từ chối</p>
          <p className="text-xl font-bold text-rose-700 mt-1 font-mono">
            {summary.rejectedAmount.toLocaleString('vi-VN')} <span className="text-sm font-sans font-medium text-rose-500">đ</span>
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TABS CHUYỂN ĐỔI KÈM CÁC NÚT HÀNH ĐỘNG NẰM CÙNG HÀNG                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('COLLECTIONS')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'COLLECTIONS'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>Danh sách phiếu thu</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RECONCILIATION')}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'RECONCILIATION'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>Bảng đối chiếu tổng hợp</span>
          </button>
        </div>

        {/* CÁC NÚT HÀNH ĐỘNG NẰM CÙNG HÀNG BÊN PHẢI */}
        <div className="flex items-center gap-2 pb-2">
          <button
            type="button"
            onClick={() => {
              fetchCollections();
              if (activeTab === 'RECONCILIATION') fetchReconciliation();
            }}
            className="inline-flex items-center justify-center gap-1.5 h-[36px] px-3.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingRecon ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={() => navigate('/route-collections/create')}
              className="inline-flex items-center justify-center h-[36px] px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <span>Tạo phiếu thu mới</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DANH SÁCH PHIẾU THU TIỀN                                           */}
      {/* ========================================================================= */}
      {activeTab === 'COLLECTIONS' && (
        <div className="space-y-4">
          {/* Hàng bộ lọc */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Search */}
              <div className="md:col-span-4 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo mã phiếu, đại lý, nhân viên..."
                  className="w-full h-[38px] pl-9 pr-3 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Lọc trạng thái */}
              <div className="md:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-[38px] px-3 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PENDING">Chờ nộp</option>
                  <option value="APPROVED">Đã duyệt</option>
                  <option value="REJECTED">Bị từ chối</option>
                </select>
              </div>

              {/* Lọc hình thức */}
              <div className="md:col-span-2">
                <select
                  value={methodFilter}
                  onChange={(e) => setMethodFilter(e.target.value)}
                  className="w-full h-[38px] px-3 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="ALL">Tất cả hình thức</option>
                  <option value="CASH">Tiền mặt</option>
                  <option value="BANK_TRANSFER">Chuyển khoản</option>
                </select>
              </div>

              {/* Khoảng ngày chuẩn Việt Nam dùng DateInput */}
              <div className="md:col-span-3 flex items-center gap-2">
                <DateInput
                  value={fromDate}
                  onChange={handleFromDateChange}
                  max={toDate || '2099-12-31'}
                  min="2020-01-01"
                  placeholder="Từ ngày"
                  className="w-1/2"
                />
                <span className="text-slate-400 text-xs">-</span>
                <DateInput
                  value={toDate}
                  onChange={handleToDateChange}
                  min={fromDate || '2020-01-01'}
                  max="2099-12-31"
                  placeholder="Đến ngày"
                  className="w-1/2"
                />
              </div>
            </div>
          </div>

          {/* Bảng danh sách phiếu thu */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm min-w-[960px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-700 font-semibold uppercase tracking-wider text-xs">
                    <th className="py-3.5 px-5">Mã phiếu</th>
                    <th className="py-3.5 px-5">Mã đơn hàng</th>
                    <th className="py-3.5 px-5">Đại lý</th>
                    <th className="py-3.5 px-5">Nhân viên thu</th>
                    <th className="py-3.5 px-5 text-right">Số tiền thu</th>
                    <th className="py-3.5 px-5 text-center">Trạng thái</th>
                    <th className="py-3.5 px-6 text-center w-36 min-w-[140px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Đang tải danh sách phiếu thu tiền tuyến...
                      </td>
                    </tr>
                  ) : filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-14 text-slate-400">
                        <HandCoins className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium text-slate-600">Chưa có phiếu thu nào phù hợp</p>
                        <p className="text-xs text-slate-400 mt-0.5">Nhân viên kinh doanh tạo phiếu khi thu tiền từ đại lý đi tuyến</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedCollections.map((item) => {
                      const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
                      const StatusIcon = statusInfo.icon;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setSelectedCollection(item);
                            setIsRejecting(false);
                            setRejectionReasonInput('');
                            setIsReviewOpen(true);
                          }}
                          className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                          title="Bấm để xem chi tiết phiếu thu"
                        >
                          {/* Mã phiếu: Chỉ hiển thị mã phiếu */}
                          <td className="py-4.5 px-5 whitespace-nowrap">
                            <span className="font-bold text-indigo-600 font-mono text-sm group-hover:underline block">
                              {item.code}
                            </span>
                          </td>

                          {/* Mã đơn hàng liên kết */}
                          <td className="py-4.5 px-5 whitespace-nowrap">
                            {item.orderCodes && item.orderCodes.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {item.orderCodes.map((oc) => (
                                  <span
                                    key={oc}
                                    className="inline-block text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md"
                                  >
                                    {oc}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* Đại lý: Tên đại lý hiển thị rõ ràng, font chữ to hơn */}
                          <td className="py-4.5 px-5">
                            <p className="font-semibold text-slate-800 text-sm break-words leading-relaxed" title={item.agencyName}>
                              {item.agencyName}
                            </p>
                          </td>

                          {/* Nhân viên thu: Avatar và tên to hơn */}
                          <td className="py-4.5 px-5 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                                {item.salesRepName ? item.salesRepName.charAt(0).toUpperCase() : 'S'}
                              </div>
                              <span className="font-medium text-slate-800 text-sm">{item.salesRepName}</span>
                            </div>
                          </td>

                          {/* Số tiền thu: Font chữ to nổi bật */}
                          <td className="py-4.5 px-5 text-right whitespace-nowrap">
                            <span className="font-bold text-slate-900 font-mono text-base block">
                              {item.amount.toLocaleString('vi-VN')} đ
                            </span>
                          </td>

                          {/* Trạng thái: Badge to hơn và cân đối */}
                          <td className="py-4.5 px-5 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusInfo.bg} ${statusInfo.text}`}
                            >
                              <StatusIcon className="w-3.5 h-3.5" />
                              {statusInfo.label}
                            </span>
                          </td>

                          {/* Thao tác: Căn giữa, padding rộng rãi tránh bị thanh cuộn / mép màn hình che lấp */}
                          <td
                            className="py-4.5 px-6 text-center whitespace-nowrap w-36 min-w-[140px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="relative inline-block text-left">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionId(openActionId === item.id ? null : item.id);
                                }}
                                className="inline-flex items-center justify-center gap-1.5 h-[34px] px-3.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-all shadow-2xs cursor-pointer"
                              >
                                <span>Thao tác</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              </button>

                              {openActionId === item.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-lg border border-slate-200/90 py-1.5 z-30 divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100 text-left"
                                >
                                  <div className="py-0.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionId(null);
                                        setSelectedCollection(item);
                                        setIsRejecting(false);
                                        setRejectionReasonInput('');
                                        setIsReviewOpen(true);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>Xem chi tiết</span>
                                    </button>
                                  </div>

                                  {canApprove && item.status === 'PENDING' && (
                                    <div className="py-0.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionId(null);
                                          setSelectedCollection(item);
                                          handleActionStatus('APPROVED');
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors text-left cursor-pointer"
                                      >
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Duyệt phiếu thu</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionId(null);
                                          setSelectedCollection(item);
                                          setIsRejecting(true);
                                          setRejectionReasonInput('');
                                          setIsReviewOpen(true);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                                      >
                                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                        <span>Từ chối phiếu</span>
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

            {/* Thanh phân trang nhỏ gọn chuẩn size sm (nhỏ hơn các dòng dữ liệu) */}
            {filteredCollections.length > 0 && (
              <Pagination
                size="sm"
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredCollections.length}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                showRecordRange={false}
                showFirstLast={false}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BẢNG ĐỐI CHIẾU TỔNG HỢP (RECONCILIATION MATRIX)                    */}
      {/* ========================================================================= */}
      {activeTab === 'RECONCILIATION' && (
        <div className="space-y-4">
          {/* Bộ lọc bảng đối chiếu */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Ngày đối chiếu:</span>
                <DateInput
                  value={reconDate}
                  onChange={handleReconDateChange}
                  min="2020-01-01"
                  max="2099-12-31"
                  placeholder="Chọn ngày đối chiếu"
                  className="w-44"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">Nhân viên:</span>
                <select
                  value={reconSalesRep}
                  onChange={(e) => setReconSalesRep(e.target.value)}
                  className="h-[36px] px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả nhân viên</option>
                  {salesRepOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>

              {reconDate && (
                <button
                  type="button"
                  onClick={() => setReconDate('')}
                  className="text-xs text-indigo-600 hover:underline cursor-pointer"
                >
                  Xem toàn bộ thời gian
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500">
              Tổng số đợt đối soát: <strong className="text-slate-800">{reconciliationRows.length}</strong>
            </div>
          </div>

          {/* Bảng ma trận đối chiếu dòng tiền */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm min-w-[1050px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-700 font-semibold uppercase tracking-wider text-xs">
                    <th className="py-3.5 px-4.5">Nhân viên kinh doanh</th>
                    <th className="py-3.5 px-4.5">Ngày thu</th>
                    <th className="py-3.5 px-4 text-center">Số phiếu</th>
                    <th className="py-3.5 px-4.5 text-right">Tổng tiền đã thu</th>
                    <th className="py-3.5 px-4.5 text-right text-emerald-700">Đã nộp (Duyệt)</th>
                    <th className="py-3.5 px-4.5 text-right text-amber-700">Chờ nộp</th>
                    <th className="py-3.5 px-4.5 text-right text-rose-700">Từ chối</th>
                    <th className="py-3.5 px-4.5 text-center">Tỷ lệ đã nộp</th>
                    <th className="py-3.5 px-4.5 text-center">Trạng thái đối soát</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingRecon ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                        Đang tổng hợp dữ liệu đối chiếu dòng tiền...
                      </td>
                    </tr>
                  ) : reconciliationRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-12 text-slate-400">
                        <Scale className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                        Chưa có dữ liệu đối chiếu trong khoảng thời gian này
                      </td>
                    </tr>
                  ) : (
                    paginatedReconciliationRows.map((r, idx) => {
                      const isComplete = r.pendingAmount === 0 && r.totalAmount > 0;
                      const hasRejected = r.rejectedAmount > 0;

                      return (
                        <tr key={idx} className="hover:bg-indigo-50/20 transition-colors">
                          <td className="py-4 px-4.5 font-semibold text-slate-800">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shadow-2xs">
                                {r.salesRepName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800 text-sm">{r.salesRepName}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{r.salesRepId}</p>
                              </div>
                            </div>
                          </td>

                          <td className="py-4 px-4.5 whitespace-nowrap">
                            <span className="font-mono text-slate-800 font-medium text-sm">
                              {new Date(r.collectionDate).toLocaleDateString('vi-VN')}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-center font-bold text-slate-800 text-sm">
                            {r.totalRecords}
                          </td>

                          <td className="py-4 px-4.5 text-right font-bold text-slate-900 font-mono text-base">
                            {r.totalAmount.toLocaleString('vi-VN')} đ
                          </td>

                          <td className="py-4 px-4.5 text-right font-bold text-emerald-700 font-mono text-base">
                            {r.approvedAmount.toLocaleString('vi-VN')} đ
                          </td>

                          <td className="py-4 px-4.5 text-right font-bold text-amber-700 font-mono text-base">
                            {r.pendingAmount.toLocaleString('vi-VN')} đ
                          </td>

                          <td className="py-4 px-4.5 text-right font-bold text-rose-600 font-mono text-base">
                            {r.rejectedAmount.toLocaleString('vi-VN')} đ
                          </td>

                          {/* Progress bar tỷ lệ hoàn tất */}
                          <td className="py-4 px-4.5 text-center">
                            <div className="w-24 mx-auto space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                                <span>{r.fulfillmentRate}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    r.fulfillmentRate === 100
                                      ? 'bg-emerald-500'
                                      : r.fulfillmentRate > 50
                                      ? 'bg-indigo-500'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.min(100, r.fulfillmentRate)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Trạng thái đối soát */}
                          <td className="py-4 px-4.5 text-center whitespace-nowrap">
                            {isComplete ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đã khớp 100%
                              </span>
                            ) : hasRejected ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                <AlertCircle className="w-3.5 h-3.5" />
                                Có khoản từ chối
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3.5 h-3.5" />
                                Chờ nộp {r.pendingCount} phiếu
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

            {/* Thanh phân trang nhỏ gọn chuẩn size sm (nhỏ hơn các dòng dữ liệu) */}
            {reconciliationRows.length > 0 && (
              <Pagination
                size="sm"
                currentPage={currentReconPage}
                totalPages={totalReconPages}
                totalItems={reconciliationRows.length}
                pageSize={reconPageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                showRecordRange={false}
                showFirstLast={false}
                onPageChange={(page) => setCurrentReconPage(page)}
                onPageSizeChange={(size) => {
                  setReconPageSize(size);
                  setCurrentReconPage(1);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TẠO PHIẾU THU MỚI (SALES REP / ADMIN)                            */}
      {/* ========================================================================= */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <HandCoins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Lập phiếu thu tiền tuyến</h3>
                  <p className="text-xs text-slate-500">Ghi nhận khoản tiền thu trực tiếp tại đại lý</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* Chọn Đại lý */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đại lý / Cửa hàng thu tiền <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newAgencyId}
                  onChange={(e) => {
                    setNewAgencyId(e.target.value);
                    const cust = customers.find((c) => c.id === e.target.value || c.code === e.target.value);
                    if (cust && cust.currentDebt && cust.currentDebt > 0 && !newAmount) {
                      setNewAmount(cust.currentDebt);
                    }
                  }}
                  required
                  className="w-full h-[40px] px-3 text-xs bg-slate-50/60 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">-- Chọn đại lý theo tuyến --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code || c.id}) - Nợ hiện tại: {(c.currentDebt || 0).toLocaleString('vi-VN')} đ
                    </option>
                  ))}
                </select>
                {selectedAgency && (
                  <div className="mt-1.5 p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/80 flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      Dư nợ hiện tại: <strong className="text-indigo-700 font-mono">{(selectedAgency.currentDebt || 0).toLocaleString('vi-VN')} đ</strong>
                    </span>
                    {selectedAgency.currentDebt && selectedAgency.currentDebt > 0 ? (
                      <button
                        type="button"
                        onClick={() => setNewAmount(selectedAgency.currentDebt)}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Thu hết nợ
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {/* Số tiền thu & gợi ý số tròn */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tiền thu (VND) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="Nhập số tiền thu (Ví dụ: 15000000)"
                    required
                    className="w-full h-[42px] px-3.5 pr-10 text-sm font-semibold font-mono bg-slate-50/60 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                    VNĐ
                  </span>
                </div>
                {/* Nút gợi ý nhanh */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] text-slate-400">Gợi ý nhanh:</span>
                  {[5000000, 10000000, 20000000, 50000000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setNewAmount(val)}
                      className="px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                    >
                      {(val / 1000000).toLocaleString()}tr
                    </button>
                  ))}
                </div>
              </div>

              {/* Hình thức thanh toán */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hình thức thu tiền
                  </label>
                  <select
                    value={newMethod}
                    onChange={(e) => setNewMethod(e.target.value as PaymentMethod)}
                    className="w-full h-[40px] px-3 text-xs bg-slate-50/60 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="CASH">Tiền mặt tại đại lý</option>
                    <option value="BANK_TRANSFER">Chuyển khoản ngân hàng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày thu tiền
                  </label>
                  <input
                    type="date"
                    value={newCollectionDate}
                    onChange={(e) => setNewCollectionDate(e.target.value)}
                    className="w-full h-[40px] px-3 text-xs bg-slate-50/60 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Tải lên ảnh biên lai */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ảnh chụp biên lai giấy / Ủy nhiệm chi <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-4 text-center transition-colors bg-slate-50/50 relative">
                  {newReceiptPreview ? (
                    <div className="space-y-2">
                      <img
                        src={newReceiptPreview}
                        alt="Biên lai Preview"
                        className="max-h-44 mx-auto rounded-lg object-contain shadow-xs border border-slate-200"
                      />
                      <div className="flex items-center justify-center gap-2">
                        <label className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer">
                          <span>Chọn ảnh khác</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewReceiptFile(null);
                            setNewReceiptPreview('');
                          }}
                          className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                        >
                          Xóa ảnh
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <UploadCloud className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">
                        Bấm để tải lên ảnh biên lai hoặc kéo thả ảnh vào đây
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Hỗ trợ PNG, JPG, JPEG (tối đa 10MB)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        required
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú thêm (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Ghi chú đợt thu, số hóa đơn liên quan hoặc lý do thu..."
                  className="w-full p-2.5 text-xs bg-slate-50/60 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-lg transition-all shadow-xs cursor-pointer"
                >
                  {isSubmittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu phiếu...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tạo phiếu thu & Nộp chờ duyệt</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CHI TIẾT & XÉT DUYỆT ĐỐI SOÁT (KẾ TOÁN / QUẢN LÝ)                 */}
      {/* ========================================================================= */}
      {isReviewOpen && selectedCollection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    Chi tiết phiếu thu {selectedCollection.code}
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        STATUS_CONFIG[selectedCollection.status]?.bg
                      } ${STATUS_CONFIG[selectedCollection.status]?.text}`}
                    >
                      {STATUS_CONFIG[selectedCollection.status]?.label}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">Đối chiếu biên lai nộp tiền với chứng từ thực tế</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Thẻ tóm tắt thông tin chi tiết */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Mã phiếu thu</span>
                  <strong className="text-indigo-600 font-mono text-sm block">
                    {selectedCollection.code}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Ngày giờ thu tiền</span>
                  <strong className="text-slate-800 block">
                    {new Date(selectedCollection.collectionDate).toLocaleDateString('vi-VN')}{' '}
                    {new Date(selectedCollection.collectionDate).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Số tiền thu</span>
                  <strong className="text-indigo-600 font-mono text-sm block">
                    {selectedCollection.amount.toLocaleString('vi-VN')} đ
                  </strong>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Đại lý nộp tiền</span>
                  <p className="font-semibold text-slate-800 break-words" title={selectedCollection.agencyName}>
                    {selectedCollection.agencyName}
                  </p>
                  <span className="inline-block text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded mt-0.5">
                    ID: {selectedCollection.agencyId}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Nhân viên thu tiền</span>
                  <strong className="text-slate-800 block">{selectedCollection.salesRepName}</strong>
                  <span className="inline-block text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-1.5 py-0.2 rounded mt-0.5">
                    ID: {selectedCollection.salesRepId}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px]">Hình thức thanh toán</span>
                  <strong className="text-slate-800 block">
                    {PAYMENT_METHOD_LABELS[selectedCollection.paymentMethod]?.label || selectedCollection.paymentMethod}
                  </strong>
                </div>
              </div>

              {/* Danh sách đơn hàng trong tuyến liên kết */}
              {((selectedCollection.orderDetails && selectedCollection.orderDetails.length > 0) ||
                (selectedCollection.orderCodes && selectedCollection.orderCodes.length > 0)) && (
                <div className="space-y-2.5 border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Đơn hàng trong tuyến liên kết ({selectedCollection.orderDetails?.length || selectedCollection.orderCodes?.length || 0} đơn)
                    </span>
                  </div>

                  {selectedCollection.orderDetails && selectedCollection.orderDetails.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                            <th className="py-2 px-3">Mã đơn hàng</th>
                            <th className="py-2 px-3 text-right">Tổng tiền đơn</th>
                            <th className="py-2 px-3 text-right font-bold text-indigo-700">Còn phải thu</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-xs">
                          {selectedCollection.orderDetails.map((od, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-bold text-indigo-600">{od.orderCode}</td>
                              <td className="py-2 px-3 text-right text-slate-700">{od.totalAmount.toLocaleString('vi-VN')} đ</td>
                              <td className="py-2 px-3 text-right font-bold text-indigo-700">
                                {(od.remainingAmount ?? od.totalAmount).toLocaleString('vi-VN')} đ
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCollection.orderCodes?.map((oc) => (
                        <span key={oc} className="px-2 py-1 bg-white border border-slate-200 rounded font-mono text-xs font-semibold text-indigo-700">
                          {oc}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Thông tin đối chiếu thu đủ vs thu thiếu */}
                  {(() => {
                    const totalOrderAmt = selectedCollection.orderDetails?.reduce(
                      (s, od) => s + (od.remainingAmount ?? od.totalAmount),
                      0,
                    ) || 0;
                    if (totalOrderAmt <= 0) return null;

                    if (selectedCollection.amount === totalOrderAmt) {
                      return (
                        <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>✓ Thu đủ 100% giá trị các đơn hàng được chọn ({selectedCollection.amount.toLocaleString('vi-VN')} đ).</span>
                        </div>
                      );
                    } else if (selectedCollection.amount < totalOrderAmt) {
                      return (
                        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-amber-800">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>Đại lý trả thiếu {(totalOrderAmt - selectedCollection.amount).toLocaleString('vi-VN')} đ so với tổng đơn.</span>
                          </div>
                          <p className="text-[11px] text-amber-700">
                            Phần tiền thiếu vẫn giữ nguyên trên công nợ của hóa đơn đó, hệ thống không tự động cộng thêm nợ mới hay trừ khống.
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
                          <span>Đại lý nộp dư {(selectedCollection.amount - totalOrderAmt).toLocaleString('vi-VN')} đ so với đơn hàng liên kết.</span>
                        </div>
                      );
                    }
                  })()}
                </div>
              )}

              {/* Thông tin đối chiếu xét duyệt nếu có */}
              {selectedCollection.status === 'APPROVED' && selectedCollection.approvedByName && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
                  <span>
                    Phiếu đã được duyệt bởi: <strong>{selectedCollection.approvedByName}</strong>
                  </span>
                  <span className="text-emerald-700 font-mono text-[11px]">Đã gạch nợ thành công</span>
                </div>
              )}

              {selectedCollection.status === 'REJECTED' && selectedCollection.rejectionReason && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900">
                  <span className="font-semibold block mb-0.5">Lý do từ chối:</span>
                  <p>{selectedCollection.rejectionReason}</p>
                </div>
              )}

              {/* Ảnh biên lai phóng to */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Ảnh biên lai thu tiền / Giấy xác nhận</span>
                  <span className="text-[11px] text-slate-400 font-normal">Click để xem kích thước gốc</span>
                </label>
                <div
                  onClick={() => setZoomImageUrl(selectedCollection.receiptImageUrl)}
                  className="bg-slate-900/5 rounded-xl p-3 border border-slate-200 flex items-center justify-center max-h-72 overflow-hidden cursor-zoom-in group"
                >
                  <img
                    src={selectedCollection.receiptImageUrl}
                    alt="Biên lai đối soát"
                    className="max-h-64 object-contain rounded-lg group-hover:scale-[1.02] transition-transform"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              {selectedCollection.note && (
                <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/60 text-xs text-amber-900">
                  <span className="font-semibold block mb-0.5">Ghi chú của nhân viên:</span>
                  <p>{selectedCollection.note}</p>
                </div>
              )}

              {/* Vùng nhập lý do từ chối nếu đang chọn Reject */}
              {isRejecting && (
                <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                  <label className="block text-xs font-bold text-rose-800">
                    Lý do từ chối phiếu thu <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    placeholder="Nhập rõ lý do từ chối (Ví dụ: Biên lai mờ, số tiền không khớp, đại lý chưa ký nhận...)"
                    className="w-full p-2 text-xs bg-white border border-rose-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Quay lại
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingAction || !rejectionReasonInput.trim()}
                      onClick={() => handleActionStatus('REJECTED')}
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Xác nhận Từ chối
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Ngày thu: {new Date(selectedCollection.collectionDate).toLocaleDateString('vi-VN')}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Đóng
                </button>

                {canApprove && selectedCollection.status === 'PENDING' && !isRejecting && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsRejecting(true)}
                      className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingAction}
                      onClick={() => handleActionStatus('APPROVED')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Xác nhận Duyệt & Gạch nợ</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: XEM ẢNH BIÊN LAI KÍCH THƯỚC ĐẦY ĐỦ                               */}
      {/* ========================================================================= */}
      {zoomImageUrl && (
        <div
          onClick={() => setZoomImageUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out animate-in fade-in duration-150"
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl">
            <img
              src={zoomImageUrl}
              alt="Biên lai phóng to"
              className="max-h-[85vh] max-w-full object-contain mx-auto rounded-lg shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setZoomImageUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
