import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  User,
  FileText,
  Building2,
  CheckSquare,
  Square,
  Search,
  ChevronDown,
  X,
  MapPin,
} from 'lucide-react';
import type { InvoiceItem } from '../services/invoices.service';
import { invoicesService } from '../services/invoices.service';
import { paymentsService } from '../services/payments.service';
import { customerService } from '../services/customer.service';
import type { Customer } from '../types/customer.types';
import type { PaymentMethod } from '../types/payment';
import { tokenStorage } from '../utils/token-storage';
import { numberToVietnameseWords } from '../utils/number-to-words';
import { showToast } from './toast';

export interface RecordPaymentModalProps {
  invoice?: InvoiceItem | null;
  customerId?: string | null;
  customerName?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentResult?: unknown, message?: string) => void;
}

// Định dạng tiền tệ VNĐ chuẩn
const formatCurrency = (val?: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

// Định dạng số có dấu chấm ngăn cách 3 chữ số (VD: 15.000.000)
const formatNumberWithDots = (val: number): string => {
  if (!val && val !== 0) return '';
  return String(val).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Giới hạn số tiền nhập tối đa là hàng chục nghìn tỷ (99.999.999.999.999 đ - 14 chữ số)
const MAX_AMOUNT_LIMIT = 99_999_999_999_999;

// Định dạng ngày hiển thị dd/MM/yyyy
const formatDate = (dateVal?: string | Date): string => {
  if (!dateVal) return '-';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// Số lượng đại lý tải / hiển thị mỗi đợt khi cuộn (Scroll pagination)
const CUSTOMERS_PAGE_SIZE = 8;

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoice,
  customerId: propCustomerId,
  customerName: propCustomerName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Lấy thông tin tài khoản đang đăng nhập (Người thu tiền)
  const currentUser = tokenStorage.getUser();
  const currentCollectorName = currentUser?.fullName || 'Kế toán công nợ';
  const currentCollectorId = currentUser?.id || 'usr-acc-01';

  // State thông tin đại lý
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    invoice?.customerId || propCustomerId || '',
  );
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>(
    invoice?.customerName || propCustomerName || '',
  );
  const [selectedCustomerCode, setSelectedCustomerCode] = useState<string>('');

  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(false);

  // State cho thanh tìm kiếm và Dropdown cuộn phân trang đại lý (Thiết kế đồng bộ Phát hành hóa đơn)
  const [customerSearchKeyword, setCustomerSearchKeyword] = useState<string>('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState<boolean>(false);
  const [visibleCustomersCount, setVisibleCustomersCount] = useState<number>(CUSTOMERS_PAGE_SIZE);
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State danh sách hóa đơn còn nợ của đại lý
  const [unpaidInvoices, setUnpaidInvoices] = useState<InvoiceItem[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(false);

  // State hình thức đối trừ: 'AUTO' (Tự động đối trừ cũ nhất trước) hoặc 'SPECIFIC' (Chọn hóa đơn cụ thể)
  const [offsetMode, setOffsetMode] = useState<'AUTO' | 'SPECIFIC'>('AUTO');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());

  // State các trường thông tin thu tiền:
  // 1. Số tiền, 2. Hình thức thu, 3. Ngày thu, 4. Người thu, 5. Ghi chú
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [note, setNote] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lắng nghe sự kiện click ngoài Dropdown đại lý để tự động đóng
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        customerDropdownRef.current &&
        !customerDropdownRef.current.contains(event.target as Node)
      ) {
        setIsCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Khởi tạo hoặc reset form khi modal được mở
  useEffect(() => {
    if (!isOpen) return;
    const initialCId = invoice?.customerId || propCustomerId || '';
    const initialCName = invoice?.customerName || propCustomerName || '';
    setSelectedCustomerId(initialCId);
    setSelectedCustomerName(initialCName);
    setSelectedCustomerCode('');
    setCustomerSearchKeyword('');
    setErrorMessage(null);
    setSubmitting(false);

    if (invoice) {
      setSelectedInvoiceIds(new Set([invoice.id]));
      setAmount(invoice.remainingAmount || 0);
      setNote(`Thanh toán hóa đơn ${invoice.invoiceCode}`);
    } else {
      setSelectedInvoiceIds(new Set());
      setAmount(0);
      setNote('');
    }
  }, [isOpen, invoice, propCustomerId, propCustomerName]);

  // Tải danh sách đại lý khi không có sẵn đại lý
  useEffect(() => {
    if (!isOpen) return;
    if (!invoice && !propCustomerId) {
      setLoadingCustomers(true);
      void customerService
        .getCustomers({ limit: 100 })
        .then((res) => {
          setCustomersList(res.data || []);
        })
        .finally(() => {
          setLoadingCustomers(false);
        });
    }
  }, [isOpen, invoice, propCustomerId]);

  // Tự động đồng bộ mã đại lý khi danh sách đại lý được tải
  useEffect(() => {
    if (!isOpen) return;
    if (selectedCustomerId && customersList.length > 0 && !selectedCustomerCode) {
      const found = customersList.find(
        (c) => c.id === selectedCustomerId || c.code === selectedCustomerId,
      );
      if (found) {
        setSelectedCustomerCode(found.code);
        if (!selectedCustomerName) setSelectedCustomerName(found.name);
      }
    }
  }, [isOpen, selectedCustomerId, customersList, selectedCustomerCode, selectedCustomerName]);

  // Tải danh sách hóa đơn còn nợ khi chọn đại lý
  const fetchUnpaidInvoices = useCallback(async (cId: string) => {
    if (!cId) {
      setUnpaidInvoices([]);
      return;
    }
    setLoadingInvoices(true);
    try {
      const allInvoices = await invoicesService.getInvoices({ customerId: cId });
      // Lọc các hóa đơn chưa thanh toán hoặc thanh toán một phần
      const filtered = allInvoices.filter(
        (inv) =>
          inv.status !== 'PAID' &&
          inv.status !== 'CANCELLED' &&
          Number(inv.remainingAmount || 0) > 0,
      );
      // Sắp xếp ngày phát hành cũ nhất trước (FIFO)
      filtered.sort((a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime());
      setUnpaidInvoices(filtered);
    } catch {
      // Fallback nếu có lỗi
      if (invoice) {
        setUnpaidInvoices([invoice]);
      }
    } finally {
      setLoadingInvoices(false);
    }
  }, [invoice]);

  useEffect(() => {
    if (!isOpen) return;
    const cId = invoice?.customerId || propCustomerId || selectedCustomerId;
    if (cId) {
      void fetchUnpaidInvoices(cId);
    }
  }, [isOpen, invoice, propCustomerId, selectedCustomerId, fetchUnpaidInvoices]);

  // Lọc đại lý theo từ khóa tìm kiếm (hỗ trợ tìm kiếm theo tên, mã, sđt)
  const filteredCustomers = useMemo(() => {
    if (!customerSearchKeyword.trim()) {
      return customersList;
    }
    const q = customerSearchKeyword.toLowerCase().trim();
    return customersList.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)),
    );
  }, [customersList, customerSearchKeyword]);

  // Danh sách đại lý được giới hạn theo số lượng hiển thị (cuộn để tải thêm)
  const displayedCustomers = useMemo(() => {
    return filteredCustomers.slice(0, visibleCustomersCount);
  }, [filteredCustomers, visibleCustomersCount]);

  // Xử lý cuộn danh sách đại lý (Scroll Pagination)
  const handleCustomerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      if (visibleCustomersCount < filteredCustomers.length) {
        setVisibleCustomersCount((prev) =>
          Math.min(prev + CUSTOMERS_PAGE_SIZE, filteredCustomers.length),
        );
      }
    }
  };

  // Chọn một đại lý từ danh sách
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setSelectedCustomerName(c.name);
    setSelectedCustomerCode(c.code);
    setIsCustomerDropdownOpen(false);
    setCustomerSearchKeyword('');
    setSelectedInvoiceIds(new Set());
    setAmount(0);
  };

  // Tổng nợ của toàn bộ các hóa đơn chưa thanh toán
  const totalCustomerDebt = useMemo(() => {
    return unpaidInvoices.reduce((sum, inv) => sum + Number(inv.remainingAmount || 0), 0);
  }, [unpaidInvoices]);

  // Tổng nợ của các hóa đơn cụ thể được tick chọn
  const totalSelectedInvoicesDebt = useMemo(() => {
    if (offsetMode === 'AUTO') {
      return totalCustomerDebt;
    }
    return unpaidInvoices
      .filter((inv) => selectedInvoiceIds.has(inv.id))
      .reduce((sum, inv) => sum + Number(inv.remainingAmount || 0), 0);
  }, [offsetMode, totalCustomerDebt, unpaidInvoices, selectedInvoiceIds]);

  // Hạn mức thu tối đa theo chế độ đối trừ
  const maxAllowedAmount = offsetMode === 'AUTO' ? totalCustomerDebt : totalSelectedInvoicesDebt;

  // Cập nhật số tiền thu bằng toàn bộ nợ
  const handleSetMaxAmount = () => {
    setAmount(maxAllowedAmount);
  };

  // Xử lý khi người dùng nhập số tiền (Ngăn cách 3 chữ số bằng dấu chấm & giới hạn tối đa chục nghìn tỷ)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Chỉ giữ lại các chữ số
    const rawDigits = e.target.value.replace(/\D/g, '');
    if (!rawDigits) {
      setAmount(0);
      return;
    }

    // Giới hạn tối đa 14 chữ số (hàng chục nghìn tỷ: 99.999.999.999.999 đ)
    const truncatedDigits = rawDigits.slice(0, 14);
    let parsedNum = Number(truncatedDigits);
    if (parsedNum > MAX_AMOUNT_LIMIT) {
      parsedNum = MAX_AMOUNT_LIMIT;
    }
    setAmount(parsedNum);
  };

  // Toggle chọn hóa đơn cụ thể
  const toggleInvoiceSelection = (invId: string) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(invId)) {
        next.delete(invId);
      } else {
        next.add(invId);
      }
      return next;
    });
  };

  // Chọn hoặc bỏ chọn tất cả hóa đơn
  const toggleSelectAllInvoices = () => {
    if (selectedInvoiceIds.size === unpaidInvoices.length) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(unpaidInvoices.map((inv) => inv.id)));
    }
  };

  // Xử lý gửi biểu mẫu ghi nhận thanh toán & đối trừ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetCustomerId = invoice?.customerId || propCustomerId || selectedCustomerId;
    if (!targetCustomerId) {
      setErrorMessage('Vui lòng tìm kiếm và chọn đại lý cần thu tiền');
      return;
    }

    if (amount <= 0) {
      setErrorMessage('Số tiền thanh toán phải lớn hơn 0 đ');
      return;
    }

    // AC 4: Kiểm tra không cho thu vượt tổng công nợ còn lại
    if (amount > maxAllowedAmount) {
      setErrorMessage(
        `Số tiền thanh toán (${formatCurrency(amount)}) không được vượt quá tổng công nợ khả dụng (${formatCurrency(maxAllowedAmount)})`,
      );
      return;
    }

    if (offsetMode === 'SPECIFIC' && selectedInvoiceIds.size === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 1 hóa đơn cụ thể để đối trừ công nợ');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      // Gọi API POST /api/payments (SN-202)
      const res = await paymentsService.createPayment({
        customerId: targetCustomerId,
        customerCode: selectedCustomerCode || undefined,
        customerName: selectedCustomerName || undefined,
        amount,
        paymentMethod,
        paymentDate,
        collectorId: currentCollectorId,
        collectorName: currentCollectorName,
        note: note.trim() || undefined,
        invoiceIds: offsetMode === 'SPECIFIC' ? Array.from(selectedInvoiceIds) : undefined,
        autoOffsetOldest: offsetMode === 'AUTO',
      });

      showToast('success', res.message || 'Ghi nhận thanh toán và đối trừ công nợ thành công!');
      onSuccess(res.data, res.message);
      onClose();
    } catch (err: unknown) {
      const errObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        errObj.response?.data?.message || errObj.message || 'Lỗi khi ghi nhận thanh toán & đối trừ';
      setErrorMessage(msg);
      showToast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl my-6 bg-white rounded-xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header Modal (Đã bỏ nút X và bỏ dòng mô tả phụ) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ghi Nhận Thanh Toán & Đối Trừ Công Nợ
              </h2>
              {selectedCustomerName && (
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Đại lý: {selectedCustomerName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Khung tìm kiếm đại lý thiết kế chuẩn 100% giống Phát Hành Hóa Đơn */}
          {!invoice && !propCustomerId ? (
            <div className="space-y-1.5" ref={customerDropdownRef}>
              <div className="flex items-center justify-between gap-1.5">
                <label
                  htmlFor="customer-search-input"
                  className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
                >
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span>Chọn đại lý thanh toán</span>
                  <span className="text-rose-500">*</span>
                </label>
              </div>

              {/* Khung tìm kiếm tích hợp nút bấm sổ danh sách option */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                    <input
                      ref={searchInputRef}
                      id="customer-search-input"
                      type="text"
                      value={customerSearchKeyword}
                      onChange={(e) => {
                        setCustomerSearchKeyword(e.target.value);
                        if (!isCustomerDropdownOpen) setIsCustomerDropdownOpen(true);
                        setVisibleCustomersCount(CUSTOMERS_PAGE_SIZE);
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
                        selectedCustomerName
                          ? `Đang chọn: ${selectedCustomerCode || selectedCustomerId} - ${selectedCustomerName}`
                          : 'Nhập mã đại lý (VD: DL-0001) hoặc tên công ty (tìm có dấu hoặc không dấu)...'
                      }
                      className="w-full h-10 pl-10 pr-10 text-xs sm:text-sm border border-slate-200 rounded-xl bg-white hover:border-slate-300 focus:bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all shadow-2xs font-medium cursor-text"
                    />
                    {customerSearchKeyword && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomerSearchKeyword('');
                          searchInputRef.current?.focus();
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title="Xóa từ khóa tìm kiếm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Nút bấm Tìm kiếm / Sổ danh sách (màu tím thương hiệu chuẩn Phát hành hóa đơn) */}
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
                        {customerSearchKeyword ? (
                          <>
                            Kết quả tìm kiếm &quot;
                            <strong className="text-indigo-600">{customerSearchKeyword}</strong>
                            &quot; ({filteredCustomers.length})
                          </>
                        ) : (
                          <>Danh sách đại lý khả dụng ({customersList.length})</>
                        )}
                      </span>
                      {displayedCustomers.length < filteredCustomers.length && (
                        <span className="text-[11px] text-slate-400">
                          Hiển thị {displayedCustomers.length} / {filteredCustomers.length} (cuộn để tải thêm)
                        </span>
                      )}
                    </div>

                    <div
                      onScroll={handleCustomerScroll}
                      className="max-h-64 overflow-y-auto divide-y divide-slate-100/90 scrollbar-thin text-xs"
                    >
                      {loadingCustomers ? (
                        <div className="py-8 text-center text-slate-400">Đang tải danh sách đại lý...</div>
                      ) : displayedCustomers.length === 0 ? (
                        <div className="py-8 px-4 text-center">
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
                            <Search className="w-4 h-4" />
                          </div>
                          <p className="text-xs font-bold text-slate-700">Không tìm thấy đại lý phù hợp</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Hỗ trợ tìm kiếm theo tên, mã hoặc số điện thoại
                          </p>
                        </div>
                      ) : (
                        displayedCustomers.map((c) => {
                          const isSelected = selectedCustomerId === c.id;
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

                              <div className="text-right pl-3 shrink-0">
                                <span className="text-[11px] text-slate-500 block">Nợ hiện tại:</span>
                                <span className="font-mono font-bold text-rose-600">
                                  {formatCurrency(c.currentDebt || 0)}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Thông báo tải tiếp khi cuộn */}
                      {displayedCustomers.length < filteredCustomers.length && (
                        <div className="py-2.5 text-center text-[11px] text-slate-400 bg-slate-50/80 font-medium">
                          Đang cuộn hiển thị ({displayedCustomers.length} / {filteredCustomers.length}) đại lý (Cuộn tiếp để xem thêm...)
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-500" />
                <span className="font-medium text-slate-600">Đại lý:</span>
                <span className="font-semibold text-slate-900">{selectedCustomerName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600">
                <span>Tổng nợ hoá đơn:</span>
                <span className="font-mono font-bold text-rose-600">
                  {formatCurrency(totalCustomerDebt)}
                </span>
              </div>
            </div>
          )}

          {/* 2. Tùy chọn cơ chế đối trừ */}
          <div className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-indigo-600" />
                Cơ chế đối trừ công nợ
              </span>
              <span className="text-[11px] text-slate-500">
                Khả dụng: <strong className="text-rose-600 font-mono">{formatCurrency(maxAllowedAmount)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  offsetMode === 'AUTO'
                    ? 'border-indigo-500 bg-indigo-50/40 text-indigo-900 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="offsetMode"
                  value="AUTO"
                  checked={offsetMode === 'AUTO'}
                  onChange={() => setOffsetMode('AUTO')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-semibold">Tự động đối trừ hóa đơn cũ nhất trước</div>
                  {/* Đã xóa bỏ cụm chữ "Nguyên tắc FIFO:" */}
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Trừ dần tiền vào hoá đơn có ngày phát hành cũ nhất.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  offsetMode === 'SPECIFIC'
                    ? 'border-indigo-500 bg-indigo-50/40 text-indigo-900 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="offsetMode"
                  value="SPECIFIC"
                  checked={offsetMode === 'SPECIFIC'}
                  onChange={() => setOffsetMode('SPECIFIC')}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-semibold">Chọn hóa đơn cụ thể để đối trừ</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Chỉ định chính xác danh sách các hóa đơn bạn muốn trừ công nợ.
                  </div>
                </div>
              </label>
            </div>

            {/* Bảng chọn hoá đơn cụ thể khi chọn SPECIFIC */}
            {offsetMode === 'SPECIFIC' && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700">
                    Danh sách hóa đơn còn nợ ({unpaidInvoices.length} hóa đơn):
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAllInvoices}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    {selectedInvoiceIds.size === unpaidInvoices.length ? (
                      <>
                        <CheckSquare className="h-3.5 w-3.5" />
                        <span>Bỏ chọn tất cả</span>
                      </>
                    ) : (
                      <>
                        <Square className="h-3.5 w-3.5" />
                        <span>Chọn tất cả</span>
                      </>
                    )}
                  </button>
                </div>

                {loadingInvoices ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    Đang tải danh sách hóa đơn còn nợ...
                  </div>
                ) : unpaidInvoices.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                    Đại lý này hiện không còn hóa đơn nào nợ cần thanh toán.
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 text-xs">
                    {unpaidInvoices.map((inv) => {
                      const isChecked = selectedInvoiceIds.has(inv.id);
                      return (
                        <div
                          key={inv.id}
                          onClick={() => toggleInvoiceSelection(inv.id)}
                          className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                            isChecked ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleInvoiceSelection(inv.id)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <div className="font-mono font-semibold text-slate-900">
                                {inv.invoiceCode}
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Ngày xuất: {formatDate(inv.issueDate)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-rose-600">
                              {formatCurrency(inv.remainingAmount)}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Tổng: {formatCurrency(inv.amount)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. Chi tiết các trường nhập liệu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Trường 1: Số tiền thu (Ngăn cách 3 đơn vị bằng dấu chấm & tối đa chục nghìn tỷ) */}
            <div className="sm:col-span-2">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Số tiền thu (VND) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleSetMaxAmount}
                  disabled={maxAllowedAmount <= 0}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer disabled:opacity-40"
                >
                  Thu toàn bộ ({formatCurrency(maxAllowedAmount)})
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={amount > 0 ? formatNumberWithDots(amount) : ''}
                  onChange={handleAmountChange}
                  placeholder="Nhập số tiền thực thu (VD: 10.000.000)..."
                  className={`w-full h-10 px-3 text-xs sm:text-sm font-mono font-bold rounded-xl border ${
                    amount > maxAllowedAmount
                      ? 'border-rose-400 ring-2 ring-rose-200'
                      : 'border-slate-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600'
                  } focus:outline-none bg-white text-slate-900`}
                  required
                />
              </div>

              {/* Dòng hiển thị bằng chữ Tiếng Việt chuẩn xác qua numberToVietnameseWords */}
              <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-center text-[11px] text-slate-500 mt-1 gap-1">
                <span>
                  Bằng chữ:{' '}
                  <strong className="text-slate-800 font-medium italic">
                    {numberToVietnameseWords(amount)}
                  </strong>
                </span>
                {amount > 0 && amount < maxAllowedAmount && (
                  <span className="text-amber-700 font-medium">
                    (Thanh toán một phần — Dư nợ còn lại:{' '}
                    {formatCurrency(maxAllowedAmount - amount)})
                  </span>
                )}
              </div>
            </div>

            {/* Trường 2: Hình thức thu */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hình thức thu <span className="text-rose-500">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-800 cursor-pointer"
                required
              >
                <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng (Vietcombank/QR)</option>
                <option value="CASH">Tiền mặt tại quầy / COD</option>
                <option value="CREDIT_CARD">Thẻ tín dụng / Thẻ ghi nợ</option>
                <option value="CHECK">Séc thanh toán ngân hàng</option>
              </select>
            </div>

            {/* Trường 3: Ngày thu (Datepicker) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày thu tiền <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-800 font-mono"
                  required
                />
              </div>
            </div>

            {/* Trường 4: Người thu (Read-only từ auth) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Người thu tiền (Kế toán phụ trách)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={`${currentCollectorName} (${currentCollectorId})`}
                  readOnly
                  disabled
                  className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-medium cursor-not-allowed"
                />
                <User className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Trường 5: Ghi chú (Textarea) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú / Số chứng từ tham chiếu (UNC)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Ủy nhiệm chi UNC-98765 Vietcombank đối trừ công nợ đợt 1..."
                rows={2}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white text-slate-800 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="inline-flex items-center justify-center h-10 px-4 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-2xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={
                submitting ||
                amount <= 0 ||
                amount > maxAllowedAmount ||
                (offsetMode === 'SPECIFIC' && selectedInvoiceIds.size === 0)
              }
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{submitting ? 'Đang đối trừ...' : 'Xác nhận thu tiền & Đối trừ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
