import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Calendar,
  AlertCircle,
  Truck,
  CheckSquare,
  Square,
  Receipt,
  Check,
  Search,
  ChevronDown,
  X,
  MapPin,
  FileText,
  Loader2,
  Package,
} from 'lucide-react';
import { matchesSearchTerm } from '../utils/vietnamese';
import {
  invoicesService,
  type UnbilledDeliverySlip,
  type UnbilledDeliverySlipItem,
} from '../services/invoices.service';
import { customerService } from '../services/customer.service';
import { type Customer } from '../types/customer.types';
import { showToast } from '../components/toast';

const formatCurrency = (val?: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

export const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCustomerId = searchParams.get('customerId') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [unbilledSlips, setUnbilledSlips] = useState<UnbilledDeliverySlip[]>([]);
  const [selectedSlipIds, setSelectedSlipIds] = useState<string[]>([]);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [note, setNote] = useState<string>('');

  // Tải danh sách khách hàng và các phiếu giao hàng đã giao thành công chưa xuất hóa đơn
  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [custRes, slipsRes] = await Promise.all([
          customerService.getCustomers({ limit: 100 }),
          invoicesService.getUnbilledDeliveries(),
        ]);

        if (!isMounted) return;

        const customerList = Array.isArray(custRes) ? custRes : custRes.data || [];
        setCustomers(customerList);
        setUnbilledSlips(slipsRes);

        // Khởi tạo chọn đại lý: ưu tiên theo query param, hoặc đại lý đầu tiên có phiếu giao
        // Để trống customerSearchTerm để ô input hiển thị placeholder mờ như trang tạo đơn hàng
        if (initialCustomerId) {
          const found = customerList.find((c: Customer) => c.id === initialCustomerId || c.code === initialCustomerId);
          if (found) {
            setSelectedCustomerId(found.id);
            setCustomerSearchTerm('');
            const matching = slipsRes.filter((s: UnbilledDeliverySlip) => isMatchingCustomer(s, found.id, found));
            setSelectedSlipIds(matching.map((s: UnbilledDeliverySlip) => s.id));
            return;
          }
        }

        if (slipsRes.length > 0) {
          const firstCustomerId = slipsRes[0].customerId;
          setSelectedCustomerId(firstCustomerId);
          setSelectedSlipIds([slipsRes[0].id]);
          setCustomerSearchTerm('');
        } else if (customerList.length > 0) {
          setSelectedCustomerId(customerList[0].id);
          setCustomerSearchTerm('');
        }
      } catch {
        showToast('error', 'Không thể tải danh sách phiếu giao hàng chờ lập hóa đơn');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [initialCustomerId]);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
        setIsCustomerDropdownOpen(false);
        setCustomerSearchTerm('');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCustomerDropdownOpen(false);
        setCustomerSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Hàm so khớp đại lý thông minh giữa hồ sơ khách hàng và phiếu giao hàng
  const isMatchingCustomer = (slip: UnbilledDeliverySlip, customerId: string, customer?: Customer): boolean => {
    if (!slip) return false;
    if (slip.customerId === customerId) return true;
    if (customerId === 'cust-001' && slip.customerId === '55555555-0000-0000-0000-000000000001') return true;
    if (customerId === '55555555-0000-0000-0000-000000000001' && slip.customerId === 'cust-001') return true;
    if (customer) {
      if (customer.code && slip.customerId === customer.code) return true;
      if (slip.customerName && customer.name && slip.customerName.trim().toLowerCase() === customer.name.trim().toLowerCase()) return true;
      if (customer.id === 'cust-dl-0001' && (slip.customerId === 'cust-001' || slip.customerId === 'cust-003')) return true;
      if (customer.id === 'cust-dl-0002' && slip.customerId === 'cust-002') return true;
    }
    return false;
  };

  // Đếm số phiếu giao hàng đang chờ của từng đại lý
  const getSlipCountForCustomer = useCallback(
    (customer: Customer) => {
      return unbilledSlips.filter((s) => isMatchingCustomer(s, customer.id, customer)).length;
    },
    [unbilledSlips],
  );

  // Lọc danh sách đại lý theo từ khóa tìm kiếm (hỗ trợ tiếng Việt không dấu)
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) return customers;
    return customers.filter(
      (c) =>
        matchesSearchTerm(c.name, customerSearchTerm) ||
        matchesSearchTerm(c.code, customerSearchTerm) ||
        (c.address && matchesSearchTerm(c.address, customerSearchTerm)) ||
        (c.taxCode && matchesSearchTerm(c.taxCode, customerSearchTerm)),
    );
  }, [customers, customerSearchTerm]);

  // Đại lý đang được chọn
  const selectedCustomer = useMemo(() => {
    return (
      customers.find(
        (c) =>
          c.id === selectedCustomerId ||
          (selectedCustomerId === 'cust-001' && c.id === '55555555-0000-0000-0000-000000000001'),
      ) || null
    );
  }, [customers, selectedCustomerId]);

  // Lọc các phiếu giao hàng thuộc về đại lý đã chọn
  const slipsForCurrentCustomer = useMemo(() => {
    if (!selectedCustomerId) return [];
    return unbilledSlips.filter((s) => isMatchingCustomer(s, selectedCustomerId, selectedCustomer || undefined));
  }, [unbilledSlips, selectedCustomerId, selectedCustomer]);

  // Xử lý khi chọn một đại lý từ danh sách tìm kiếm
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomerId(customer.id);
    setCustomerSearchTerm('');
    setIsCustomerDropdownOpen(false);

    // Mặc định chọn tất cả phiếu giao của đại lý này để hỗ trợ gộp nhanh
    const matchingSlips = unbilledSlips.filter((s) => isMatchingCustomer(s, customer.id, customer));
    setSelectedSlipIds(matchingSlips.map((s) => s.id));
  };

  // Toggle chọn một phiếu giao hàng
  const handleToggleSlip = (slipId: string) => {
    setSelectedSlipIds((prev) =>
      prev.includes(slipId)
        ? prev.filter((id) => id !== slipId)
        : [...prev, slipId],
    );
  };

  // Chọn tất cả hoặc bỏ chọn tất cả
  const handleToggleSelectAll = () => {
    if (selectedSlipIds.length === slipsForCurrentCustomer.length) {
      setSelectedSlipIds([]);
    } else {
      setSelectedSlipIds(slipsForCurrentCustomer.map((s) => s.id));
    }
  };

  // Tổng hợp danh sách dòng hàng từ các phiếu giao được tick chọn
  const previewLines = useMemo(() => {
    const lines: Array<UnbilledDeliverySlipItem & { slipCode: string; slipId: string }> = [];
    const chosenSlips = slipsForCurrentCustomer.filter((s) =>
      selectedSlipIds.includes(s.id),
    );

    for (const slip of chosenSlips) {
      for (const item of slip.items) {
        lines.push({
          ...item,
          slipCode: slip.trackingNumber || slip.id,
          slipId: slip.id,
        });
      }
    }
    return lines;
  }, [slipsForCurrentCustomer, selectedSlipIds]);

  // RÀNG BUỘC KẾ TOÁN: Tiền hóa đơn sinh từ SỐ LƯỢNG THỰC GIAO
  const grandTotal = useMemo(() => {
    return previewLines.reduce((acc, line) => acc + line.lineTotal, 0);
  }, [previewLines]);

  const totalOrderedQty = useMemo(() => {
    return previewLines.reduce((acc, line) => acc + line.orderedQuantity, 0);
  }, [previewLines]);

  const totalDeliveredQty = useMemo(() => {
    return previewLines.reduce((acc, line) => acc + line.deliveredQuantity, 0);
  }, [previewLines]);

  // Xử lý nộp form phát hành hóa đơn
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      showToast('warning', 'Vui lòng chọn đại lý phát hành hóa đơn.');
      return;
    }

    if (selectedSlipIds.length === 0) {
      showToast('warning', 'Vui lòng chọn ít nhất một phiếu giao hàng để lập hóa đơn.');
      return;
    }

    if (dueDate && dueDate < todayStr) {
      showToast('warning', `Hạn thanh toán không được trước ngày lập hóa đơn (${formatDate(todayStr)}).`);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        deliverySlipIds: selectedSlipIds,
        dueDate: dueDate || undefined,
        note: note.trim() || undefined,
      };

      const newInvoice = await invoicesService.issueInvoice(payload);
      showToast(
        'success',
        `Phát hành hóa đơn ${newInvoice.invoiceCode} thành công từ ${selectedSlipIds.length} phiếu thực giao!`,
      );
      navigate('/accounting/invoices');
    } catch (err: unknown) {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể phát hành hóa đơn. Vui lòng kiểm tra lại.';
      showToast('error', errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-semibold">Đang nạp dữ liệu đại lý và phiếu giao hàng...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-3 sm:p-6 pb-24">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* =================================================================== */}
        {/* KHỐI 1: THÔNG TIN ĐẠI LÝ & HẠN THANH TOÁN                           */}
        {/* Thiết kế chuẩn theo phong cách chọn đại lý của create-order-page   */}
        {/* =================================================================== */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Link
                to="/accounting/invoices"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shrink-0 shadow-2xs"
                title="Quay lại danh sách hóa đơn"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay lại</span>
              </Link>
              <div className="h-4 w-px bg-slate-200 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-900">
                  Thông tin đại lý & Hạn thanh toán
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {slipsForCurrentCustomer.length} phiếu chờ gộp
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Cột 1 & 2: Tìm kiếm & Chọn đại lý (Hỗ trợ tiếng Việt không dấu) */}
            <div className="lg:col-span-2 space-y-2">
              <div className="flex items-center justify-between gap-1.5">
                <label
                  htmlFor="customer-search-input"
                  className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Chọn đại lý phát hành hóa đơn</span>
                  <span className="text-rose-500">*</span>
                </label>
              </div>

              {/* Khung tìm kiếm tích hợp nút bấm sổ danh sách option */}
              <div ref={customerDropdownRef} className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      id="customer-search-input"
                      type="text"
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        if (!isCustomerDropdownOpen) setIsCustomerDropdownOpen(true);
                      }}
                      onClick={() => {
                        setIsCustomerDropdownOpen((prev) => !prev);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          setIsCustomerDropdownOpen(true);
                        } else if (e.key === 'Escape') {
                          setIsCustomerDropdownOpen(false);
                        }
                      }}
                      placeholder={
                        selectedCustomer
                          ? `Đang chọn: ${selectedCustomer.code || selectedCustomer.id} - ${selectedCustomer.name}`
                          : 'Nhập mã đại lý (VD: DL-0001) hoặc tên công ty (tìm có dấu hoặc không dấu)...'
                      }
                      className="w-full h-10 pl-10 pr-10 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white hover:border-slate-300 focus:bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-2xs font-medium cursor-text"
                    />
                    {customerSearchTerm && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerSearchTerm('');
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title="Xóa từ khóa tìm kiếm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Nút bấm Tìm kiếm / Sổ danh sách */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomerDropdownOpen((prev) => !prev);
                      if (!isCustomerDropdownOpen) {
                        searchInputRef.current?.focus();
                      }
                    }}
                    className={`h-10 px-3.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 ${
                      isCustomerDropdownOpen
                        ? 'bg-indigo-700 text-white shadow-indigo-600/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                    }`}
                    title="Bấm để tìm kiếm và sổ danh sách đại lý"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tìm kiếm</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isCustomerDropdownOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Dropdown danh sách kết quả đại lý */}
                {isCustomerDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-4 py-2 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">
                        {customerSearchTerm ? (
                          <>
                            Kết quả tìm kiếm &quot;
                            <strong className="text-indigo-600">{customerSearchTerm}</strong>
                            &quot; ({filteredCustomers.length})
                          </>
                        ) : (
                          <>Danh sách đại lý khả dụng ({customers.length})</>
                        )}
                      </span>
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100/90 scrollbar-thin">
                      {filteredCustomers.length === 0 ? (
                        <div className="py-10 px-4 text-center">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                            <Search className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">Không tìm thấy đại lý phù hợp</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Hỗ trợ tìm kiếm theo tên hoặc mã không dấu
                          </p>
                        </div>
                      ) : (
                        filteredCustomers.map((c) => {
                          const isSelected = selectedCustomer?.id === c.id;
                          const slipCount = getSlipCountForCustomer(c);

                          return (
                            <div
                              key={c.id}
                              onClick={() => handleSelectCustomer(c)}
                              className={`px-4 py-3 flex items-start sm:items-center justify-between gap-3 cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-indigo-50/90 border-l-4 border-l-indigo-600 text-indigo-950 font-medium'
                                  : 'hover:bg-slate-50/90 hover:border-l-4 hover:border-l-indigo-400 text-slate-700'
                              }`}
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/70 shrink-0">
                                    {c.code || c.id}
                                  </span>
                                  <span
                                    className="text-xs sm:text-sm font-bold text-slate-900 truncate"
                                    title={c.name}
                                  >
                                    {c.name}
                                  </span>
                                </div>
                                {c.address && (
                                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <span className="truncate">{c.address}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0 pt-0.5 sm:pt-0">
                                <span
                                  className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                                    slipCount > 0
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs'
                                      : 'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}
                                >
                                  {slipCount} phiếu chờ
                                </span>
                                {isSelected && (
                                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                    <Check className="w-3.5 h-3.5" />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cột 3: Hạn thanh toán hóa đơn (Ràng buộc: không được trước ngày lập) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Hạn thanh toán hóa đơn</span>
                <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                min={todayStr}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={`w-full h-10 px-3 text-xs sm:text-sm font-medium border rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 transition-all cursor-pointer shadow-2xs ${
                  dueDate && dueDate < todayStr
                    ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 text-rose-700 bg-rose-50/50'
                    : 'border-slate-200 hover:border-slate-300 focus:ring-indigo-100 focus:border-indigo-500'
                }`}
              />
              {dueDate && dueDate < todayStr && (
                <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  Hạn thanh toán không được trước ngày tạo hóa đơn ({formatDate(todayStr)})
                </p>
              )}
            </div>
          </div>

          {/* Card thông tin chi tiết đại lý đã chọn (Đồng bộ thiết kế chuẩn từ create-order-page) */}
          {selectedCustomer && (
            <div className="p-4 bg-gradient-to-br from-white via-indigo-50/20 to-slate-50/60 border border-indigo-100 rounded-2xl shadow-xs transition-all text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                {/* Cột 1: Tên & Mã đại lý */}
                <div className="space-y-1 min-w-0">
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Đại lý phát hành hóa đơn
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm truncate" title={selectedCustomer.name}>
                    {selectedCustomer.name}
                  </div>
                  <div className="text-slate-500 font-mono text-xs flex items-center gap-2">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">
                      {selectedCustomer.code || selectedCustomer.id}
                    </span>
                    {selectedCustomer.phone && (
                      <span className="text-[11px] text-slate-400">• {selectedCustomer.phone}</span>
                    )}
                  </div>
                </div>

                {/* Cột 2: Mã số thuế & Liên hệ */}
                <div className="space-y-1 min-w-0">
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Mã số thuế & Liên hệ
                  </div>
                  <div className="text-slate-800 font-medium text-xs">
                    MST: <strong className="font-mono text-slate-900">{selectedCustomer.taxCode || '0316789002'}</strong>
                  </div>
                  <div className="text-slate-500 text-[11px] truncate" title={selectedCustomer.email || ''}>
                    Email: {selectedCustomer.email || 'kinhdoanh@lohafood.vn'}
                  </div>
                </div>

                {/* Cột 3: Địa chỉ kinh doanh */}
                <div className="space-y-1 min-w-0">
                  <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Địa chỉ kinh doanh
                  </div>
                  <div className="text-slate-700 text-xs line-clamp-2" title={selectedCustomer.address || ''}>
                    {selectedCustomer.address || 'Chưa có thông tin địa chỉ'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* KHỐI 2: DANH SÁCH PHIẾU GIAO HÀNG ĐÃ GIAO THÀNH CÔNG                 */}
        {/* =================================================================== */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                Phiếu giao hàng đã giao thành công
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {slipsForCurrentCustomer.length} phiếu
              </span>
            </div>

            {slipsForCurrentCustomer.length > 0 && (
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
              >
                {selectedSlipIds.length === slipsForCurrentCustomer.length ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    <span>Bỏ chọn tất cả</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Chọn tất cả ({slipsForCurrentCustomer.length})</span>
                  </>
                )}
              </button>
            )}
          </div>

          {slipsForCurrentCustomer.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-xs sm:text-sm font-bold text-slate-700">
                Không có phiếu giao hàng nào chờ xuất hóa đơn cho đại lý này
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Các phiếu giao hàng phải ở trạng thái đã giao thành công và có chữ ký xác nhận của đại lý.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {slipsForCurrentCustomer.map((slip) => {
                const isChecked = selectedSlipIds.includes(slip.id);
                return (
                  <div
                    key={slip.id}
                    onClick={() => handleToggleSlip(slip.id)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      isChecked
                        ? 'border-indigo-500 bg-indigo-50/30 ring-1 ring-indigo-500 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSlip(slip.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-slate-900 truncate">
                            {slip.trackingNumber || slip.id}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            Đơn hàng: <span className="font-mono font-medium text-slate-700">{slip.orderCode}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                        Đã giao
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 text-xs">
                      <span className="text-slate-400 text-[11px]">{formatDate(slip.deliveredAt)}</span>
                      <span className="font-bold text-indigo-700">
                        {formatCurrency(
                          slip.totalAmount ||
                            (slip.items || []).reduce((acc, it) => acc + (it.lineTotal || 0), 0),
                        )}
                        <span className="text-[11px] text-slate-400 font-normal ml-1">
                          ({slip.items.length} món)
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* =================================================================== */}
        {/* KHỐI 3: BẢNG CHI TIẾT DÒNG HÀNG HÓA ĐƠN (Chỉ hiện khi thêm phiếu giao hàng) */}
        {/* =================================================================== */}
        {previewLines.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Chi tiết dòng hàng hoá đơn (Căn cứ tính tiền: SL Thực Giao)
                </h2>
              </div>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {previewLines.length} dòng sản phẩm
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200/80">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 text-slate-600 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3">SKU & SẢN PHẨM</th>
                    <th className="py-2.5 px-3 text-center w-16">ĐVT</th>
                    <th className="py-2.5 px-3 w-28">PHIẾU GIAO</th>
                    <th className="py-2.5 px-3 text-right w-20">SL ĐẶT</th>
                    <th className="py-2.5 px-3 text-right w-24 bg-indigo-50/70 text-indigo-900 font-extrabold">
                      SL THỰC GIAO
                    </th>
                    <th className="py-2.5 px-3 text-right w-28">ĐƠN GIÁ</th>
                    <th className="py-2.5 px-3 text-right w-32">THÀNH TIỀN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {previewLines.map((line, idx) => (
                    <tr key={`${line.slipId}-${line.productSku}-${idx}`} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-[11px] text-slate-400">{line.productSku}</div>
                        <div className="font-bold text-slate-900">{line.productName}</div>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600">{line.unit}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">{line.slipCode}</td>
                      <td className="py-2.5 px-3 text-right text-slate-500 font-mono">{line.orderedQuantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700 bg-indigo-50/40">
                        {line.deliveredQuantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{formatCurrency(line.unitPrice)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(line.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* KHỐI 4: GHI CHÚ & TỔNG TIỀN HÓA ĐƠN (XẾP THÀNH 1 HÀNG DỌC)        */}
        {/* =================================================================== */}
        <div className="flex flex-col gap-4">
          {/* 1. Ghi chú phát hành hóa đơn */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Ghi chú phát hành hóa đơn</span>
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Gộp phiếu giao PGH-001 và PGH-002 theo thỏa thuận kỳ thanh toán tháng 10..."
              className="w-full p-3 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
            />
          </div>

          {/* 2. Khối Tổng tiền hóa đơn full-width */}
          <div className="p-4 sm:p-5 rounded-xl border border-indigo-100 bg-slate-50/80 space-y-3 shadow-xs">
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between items-center">
                <span>Số phiếu giao hàng gộp:</span>
                <span className="font-bold text-slate-900">{selectedSlipIds.length} phiếu</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Tổng số lượng đặt hàng:</span>
                <span className="font-bold text-slate-700 font-mono">{totalOrderedQty} SP</span>
              </div>
              <div className="flex justify-between items-center text-indigo-700 font-semibold">
                <span>Tổng số lượng thực giao tính tiền:</span>
                <span className="font-bold font-mono">{totalDeliveredQty} SP</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-slate-900 uppercase">
                Tổng tiền hóa đơn:
              </span>
              <span className="text-lg sm:text-2xl font-black text-indigo-700 font-mono">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* =================================================================== */}
        {/* THANH THAO TÁC SUBMIT DƯỚI CÙNG                                     */}
        {/* =================================================================== */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <Link
            to="/accounting/invoices"
            className="px-5 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            disabled={submitting || selectedSlipIds.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang phát hành...</span>
              </>
            ) : (
              <>
                <Receipt className="w-4 h-4" />
                <span>Phát hành hóa đơn</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
