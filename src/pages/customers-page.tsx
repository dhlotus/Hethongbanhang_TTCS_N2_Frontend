import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  ShoppingCart,
  CheckCircle2,
  X,
  Filter,
  ShieldCheck,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { showToast } from '../components/toast';
import { DeliveryPointModal } from '../components/delivery-point-modal';
import { customerService } from '../services/customer.service';
import type { Customer, CreateCustomerPayload, DeliveryPoint } from '../types/customer.types';

/**
 * Trang Quản lý Đại lý & Hạn mức tín dụng (SN-31, SN-32, SN-37 & Đồng bộ dữ liệu)
 * Tuân thủ triệt để UI_GUIDELINES.md và CODE_CONVENTION.md
 */
export const CustomersPage: React.FC = () => {
  const navigate = useNavigate();

  // State danh sách đại lý & tải dữ liệu
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Bộ lọc & tìm kiếm (Hỗ trợ SN-37 đa tiêu chí)
  const [searchInput, setSearchInput] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  // Modal quản lý điểm giao hàng (SN-31 & SN-32)
  const [selectedCustomerForDelivery, setSelectedCustomerForDelivery] = useState<Customer | null>(
    null
  );
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState<boolean>(false);

  // Modal thêm đại lý mới
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formData, setFormData] = useState<CreateCustomerPayload>({
    name: '',
    code: '',
    customerGroup: 'AGENT_LEVEL_2',
    phone: '',
    email: '',
    taxCode: '',
    address: '',
    region: 'Miền Nam',
    creditLimit: 50000000,
    maxDebtDays: 30,
    deliveryPointName: '',
    receiverName: '',
  });

  // Tải danh sách đại lý từ API / Persistent Storage
  const loadCustomers = useCallback(async (keyword?: string) => {
    try {
      setLoading(true);
      const res = await customerService.getCustomers({
        search: keyword,
        limit: 100,
      });
      setCustomers(res.data || []);
    } catch {
      showToast('error', 'Lỗi tải dữ liệu', 'Không thể nạp danh sách đại lý từ hệ thống.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  // Lắng nghe sự kiện đồng bộ từ Tạo đơn hàng (SN-38) hoặc Tab khác
  useEffect(() => {
    const handleSync = () => {
      void loadCustomers(searchInput.trim() || undefined);
    };

    window.addEventListener('loha_customers_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('loha_customers_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadCustomers, searchInput]);

  // Làm mới dữ liệu
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCustomers(searchInput.trim() || undefined);
    showToast(
      'success',
      'Đồng bộ hoàn tất',
      'Dữ liệu đại lý và điểm giao hàng đã được cập nhật mới nhất.'
    );
  };

  // Lọc dữ liệu đại lý theo từ khóa, nhóm, vùng và trạng thái
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        !searchInput.trim() ||
        c.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        c.code.toLowerCase().includes(searchInput.toLowerCase()) ||
        c.phone.includes(searchInput.trim());

      const matchGroup = selectedGroup === 'ALL' || c.customerGroup === selectedGroup;
      const matchStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
      const matchRegion = selectedRegion === 'ALL' || c.region === selectedRegion;

      return matchSearch && matchGroup && matchStatus && matchRegion;
    });
  }, [customers, searchInput, selectedGroup, selectedStatus, selectedRegion]);

  // Thống kê nhanh KPI
  const stats = useMemo(() => {
    const total = customers.length;
    const active = customers.filter((c) => c.status === 'ACTIVE').length;
    const totalCredit = customers.reduce((sum, c) => sum + (c.creditLimit || 0), 0);
    const totalDebt = customers.reduce((sum, c) => sum + (c.currentDebt || 0), 0);
    return { total, active, totalCredit, totalDebt };
  }, [customers]);

  // Xử lý tạo mới đại lý & đồng bộ ngay lập tức
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast('error', 'Thiếu thông tin', 'Vui lòng nhập tên đại lý hoặc công ty.');
      return;
    }
    if (!formData.phone.trim()) {
      showToast('error', 'Thiếu thông tin', 'Vui lòng nhập số điện thoại liên hệ của đại lý.');
      return;
    }
    if (!formData.address.trim()) {
      showToast(
        'error',
        'Thiếu thông tin',
        'Vui lòng nhập địa chỉ trụ sở / kinh doanh của đại lý.'
      );
      return;
    }

    try {
      setSubmitting(true);
      const newCustomer = await customerService.createCustomer({
        ...formData,
        code: formData.code?.trim() || undefined,
        creditLimit: Number(formData.creditLimit) || 50000000,
        maxDebtDays: Number(formData.maxDebtDays) || 30,
      });

      showToast(
        'success',
        'Thêm đại lý thành công',
        `Đại lý "${newCustomer.name}" đã được tạo và đồng bộ ngay vào hệ thống!`
      );

      // Đóng modal và reset form
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        code: '',
        customerGroup: 'AGENT_LEVEL_2',
        phone: '',
        email: '',
        taxCode: '',
        address: '',
        region: 'Miền Nam',
        creditLimit: 50000000,
        maxDebtDays: 30,
        deliveryPointName: '',
        receiverName: '',
      });

      // Cập nhật state danh sách ngay lập tức để người dùng thấy đại lý nhảy vào bảng
      setCustomers((prev) => [newCustomer, ...prev]);
    } catch {
      showToast('error', 'Lỗi tạo đại lý', 'Không thể tạo đại lý mới. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  // Mở modal điểm giao hàng của đại lý
  const handleOpenDeliveryPoints = (customer: Customer) => {
    setSelectedCustomerForDelivery(customer);
    setIsDeliveryModalOpen(true);
  };

  // Cập nhật lại số điểm giao hàng khi sửa trong DeliveryPointModal
  const handleDeliveryPointsUpdated = (updatedPoints: DeliveryPoint[]) => {
    if (!selectedCustomerForDelivery) return;

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === selectedCustomerForDelivery.id ? { ...c, deliveryPoints: updatedPoints } : c
      )
    );

    setSelectedCustomerForDelivery((prev) =>
      prev ? { ...prev, deliveryPoints: updatedPoints } : null
    );
  };

  // Format tiền tệ VNĐ
  const formatVnd = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Lấy nhãn phân nhóm đại lý
  const getGroupLabel = (group: string) => {
    switch (group) {
      case 'AGENT_LEVEL_1':
        return 'Đại lý Cấp 1';
      case 'AGENT_LEVEL_2':
        return 'Đại lý Cấp 2';
      case 'WHOLESALE':
        return 'Bán buôn';
      case 'RETAIL':
        return 'Bán lẻ';
      default:
        return 'Đại lý chuẩn';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-4">
      {/* ── HEADER CTA ── */}
      <div className="flex items-center justify-end gap-2.5 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          title="Đồng bộ danh sách"
        >
          <RefreshCw
            className={`w-4 h-4 ${refreshing ? 'animate-spin text-[var(--color-primary)]' : 'text-slate-500'}`}
          />
          <span className="hidden sm:inline">Làm mới</span>
        </button>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[var(--color-primary)] hover:opacity-90 rounded-lg shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm đại lý mới</span>
        </button>
      </div>

      {/* ── THỐNG KÊ NHANH KPI (CARD-BASED UI) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-[var(--color-primary)] shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Tổng số đại lý</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 font-medium">Đang hoạt động</p>
            <p className="text-lg sm:text-xl font-bold text-slate-900">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <div className="min-w-0 truncate">
            <p className="text-xs text-slate-500 font-medium">Tổng hạn mức tín dụng</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {formatVnd(stats.totalCredit)}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0 truncate">
            <p className="text-xs text-slate-500 font-medium">Tổng dư nợ hiện tại</p>
            <p className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {formatVnd(stats.totalDebt)}
            </p>
          </div>
        </div>
      </div>

      {/* ── THANH TÌM KIẾM & BỘ LỌC ĐA TIÊU CHÍ (SN-37) ── */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-3 items-center justify-between">
        <div className="relative w-full lg:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên đại lý, mã hoặc số điện thoại..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 bg-slate-50/50 hover:bg-white transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden md:inline">Lọc:</span>
          </div>

          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            aria-label="Lọc theo khu vực"
            className="text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="ALL">Tất cả khu vực</option>
            <option value="Miền Nam">Miền Nam</option>
            <option value="Miền Trung">Miền Trung</option>
            <option value="Miền Bắc">Miền Bắc</option>
          </select>

          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            aria-label="Lọc theo nhóm đại lý"
            className="text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="ALL">Tất cả phân nhóm</option>
            <option value="AGENT_LEVEL_1">Đại lý Cấp 1</option>
            <option value="AGENT_LEVEL_2">Đại lý Cấp 2</option>
            <option value="WHOLESALE">Bán buôn</option>
            <option value="RETAIL">Bán lẻ</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Lọc theo trạng thái hoạt động"
            className="text-xs sm:text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Tạm khóa</option>
            <option value="INACTIVE">Ngừng hoạt động</option>
          </select>
        </div>
      </div>

      {/* ── BẢNG DANH SÁCH ĐẠI LÝ ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-[var(--color-primary)]" />
            <p className="text-sm font-medium">Đang tải danh sách đại lý...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <Building2 className="w-10 h-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium">Không tìm thấy đại lý phù hợp với điều kiện lọc</p>
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSelectedGroup('ALL');
                setSelectedStatus('ALL');
                setSelectedRegion('ALL');
              }}
              className="text-xs text-[var(--color-primary)] hover:underline font-medium"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-slate-600 text-xs uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3.5">Mã & Tên Đại Lý</th>
                  <th className="px-4 py-3.5">Liên Hệ</th>
                  <th className="px-4 py-3.5">Phân Nhóm & Phụ Trách</th>
                  <th className="px-4 py-3.5">Hạn Mức & Dư Nợ</th>
                  <th className="px-4 py-3.5">Điểm Giao Hàng (SN-31)</th>
                  <th className="px-4 py-3.5">Trạng Thái</th>
                  <th className="px-4 py-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((customer) => {
                  const debtPercent =
                    customer.creditLimit > 0
                      ? Math.min(
                          100,
                          Math.round((customer.currentDebt / customer.creditLimit) * 100)
                        )
                      : 0;

                  return (
                    <tr key={customer.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Cột 1: Mã & Tên Đại lý */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 group-hover:text-[var(--color-primary)] transition-colors">
                          {customer.name}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          {customer.code} • {customer.region || 'Miền Nam'}
                        </div>
                        {customer.address && (
                          <div
                            className="text-xs text-slate-400 line-clamp-1 mt-0.5"
                            title={customer.address}
                          >
                            {customer.address}
                          </div>
                        )}
                      </td>

                      {/* Cột 2: Liên hệ */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-mono text-xs">{customer.phone}</span>
                        </div>
                        {customer.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[140px]">{customer.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Cột 3: Phân nhóm & Phụ trách */}
                      <td className="px-4 py-3.5">
                        <div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              customer.customerGroup === 'AGENT_LEVEL_1'
                                ? 'bg-indigo-50 text-[var(--color-primary)] border border-indigo-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}
                          >
                            {getGroupLabel(customer.customerGroup)}
                          </span>
                        </div>
                        {(customer.salesRepName || customer.salesRep?.name) && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
                            <UserCheck className="w-3 h-3 text-slate-400" />
                            <span>{customer.salesRepName || customer.salesRep?.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Cột 4: Hạn mức & Công nợ */}
                      <td className="px-4 py-3.5 min-w-[170px]">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-500">Dư nợ:</span>
                          <span
                            className={`font-semibold ${
                              debtPercent > 80 ? 'text-rose-600 font-bold' : 'text-slate-800'
                            }`}
                          >
                            {formatVnd(customer.currentDebt || 0)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              debtPercent > 80
                                ? 'bg-rose-500'
                                : debtPercent > 50
                                  ? 'bg-amber-500'
                                  : 'bg-[var(--color-primary)]'
                            }`}
                            style={{ width: `${debtPercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-400 mt-0.5">
                          <span>{debtPercent}% hạn mức</span>
                          <span>HM: {formatVnd(customer.creditLimit || 0)}</span>
                        </div>
                      </td>

                      {/* Cột 5: Điểm giao hàng (SN-31 & SN-32) */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDeliveryPoints(customer)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:text-[var(--color-primary)] hover:border-indigo-200 transition-colors shadow-2xs"
                        >
                          <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          <span>{customer.deliveryPoints?.length || 0} Điểm giao</span>
                        </button>
                      </td>

                      {/* Cột 6: Trạng thái */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            customer.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              customer.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {customer.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm dừng'}
                        </span>
                      </td>

                      {/* Cột 7: Thao tác */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDeliveryPoints(customer)}
                            className="p-1.5 text-slate-500 hover:text-[var(--color-primary)] hover:bg-slate-100 rounded-lg transition-colors"
                            title="Quản lý điểm giao hàng (SN-31)"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              // Chuyển sang tạo đơn hàng với đại lý này (SN-38)
                              navigate(`/sales/orders?customerId=${customer.id}`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[var(--color-primary)] bg-indigo-50 hover:bg-[var(--color-primary)] hover:text-white rounded-lg transition-all"
                            title="Tạo đơn hàng B2B cho đại lý này"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Lên đơn</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL THÊM ĐẠI LÝ MỚI (TƯƠNG THÍCH ĐỒNG BỘ 100%) ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 text-[var(--color-primary)] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Thêm Đại Lý Mới</h3>
                  <p className="text-xs text-slate-500">
                    Dữ liệu sẽ đồng bộ ngay lập tức sang Quản lý đại lý & Tạo đơn hàng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleCreateCustomer} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Tên đại lý */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Tên đại lý / Doanh nghiệp <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Công ty TNHH Phân Phối Toàn Cầu"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                  />
                </div>

                {/* Mã đại lý */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Mã đại lý (tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="Tự sinh nếu để trống (DL-...)"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 font-mono"
                  />
                </div>

                {/* Phân nhóm */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Phân nhóm đại lý</label>
                  <select
                    value={formData.customerGroup}
                    onChange={(e) => setFormData({ ...formData, customerGroup: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 bg-white"
                  >
                    <option value="AGENT_LEVEL_1">Đại lý Cấp 1</option>
                    <option value="AGENT_LEVEL_2">Đại lý Cấp 2</option>
                    <option value="WHOLESALE">Bán buôn</option>
                    <option value="RETAIL">Bán lẻ</option>
                  </select>
                </div>

                {/* Số điện thoại */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Số điện thoại liên hệ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0988776655"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Email liên hệ</label>
                  <input
                    type="email"
                    placeholder="VD: daily@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                  />
                </div>

                {/* Địa chỉ trụ sở */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Địa chỉ kinh doanh / trụ sở <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 123 Đường Nguyễn Trãi, Phường 2, Quận 5, TP.HCM"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                  />
                </div>

                {/* Hạn mức tín dụng */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Hạn mức tín dụng (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000000"
                    value={formData.creditLimit}
                    onChange={(e) =>
                      setFormData({ ...formData, creditLimit: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15"
                  />
                </div>

                {/* Khu vực */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Khu vực địa bàn</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 bg-white"
                  >
                    <option value="Miền Nam">Miền Nam</option>
                    <option value="Miền Trung">Miền Trung</option>
                    <option value="Miền Bắc">Miền Bắc</option>
                  </select>
                </div>

                {/* Điểm giao ban đầu */}
                <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                    <span>Điểm giao hàng mặc định ban đầu</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Tên điểm giao (VD: Kho chính, Showroom)"
                      value={formData.deliveryPointName}
                      onChange={(e) =>
                        setFormData({ ...formData, deliveryPointName: e.target.value })
                      }
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Người nhận (mặc định lấy theo tên đại lý)"
                      value={formData.receiverName}
                      onChange={(e) => setFormData({ ...formData, receiverName: e.target.value })}
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 text-xs sm:text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[var(--color-primary)] hover:opacity-90 rounded-lg shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang lưu & Đồng bộ...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lưu đại lý & Đồng bộ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL QUẢN LÝ ĐIỂM GIAO HÀNG CỦA ĐẠI LÝ (SN-31 & SN-32) ── */}
      {selectedCustomerForDelivery && isDeliveryModalOpen && (
        <DeliveryPointModal
          open={isDeliveryModalOpen}
          customer={selectedCustomerForDelivery}
          onClose={() => {
            setIsDeliveryModalOpen(false);
            setSelectedCustomerForDelivery(null);
          }}
          onUpdated={handleDeliveryPointsUpdated}
        />
      )}
    </div>
  );
};
