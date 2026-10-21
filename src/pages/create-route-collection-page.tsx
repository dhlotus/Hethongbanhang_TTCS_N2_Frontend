import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  UploadCloud,
  Check,
  RefreshCw,
  Building2,
  CreditCard,
  Banknote,
  AlertCircle,
  FileText,
  ShieldCheck,
  Clock,
  Package,
  ShoppingBag,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  collectionsService,
  type CreateCollectionPayload,
  type PaymentMethod,
  type EligibleOrderForCollection,
} from '../services/collections.service';
import { customerService } from '../services/customer.service';
import type { Customer } from '../types/customer.types';
import { showToast } from '../components/toast';
import { getStoredUser } from '../utils/navigation';

export const CreateRouteCollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  useEffect(() => {
    document.title = 'Tạo phiếu thu tuyến | LOHA SALES';
  }, []);

  // Danh sách đại lý
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Form states
  const [agencyId, setAgencyId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [collectionDate, setCollectionDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [note, setNote] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Đơn hàng đủ điều kiện theo tuyến của đại lý
  const [eligibleOrders, setEligibleOrders] = useState<EligibleOrderForCollection[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderCodes, setSelectedOrderCodes] = useState<string[]>([]);

  // Tải danh sách đại lý
  useEffect(() => {
    async function loadCustomers() {
      try {
        setLoadingCustomers(true);
        const res = await customerService.getCustomers({ limit: 100 });
        if (res?.data) {
          setCustomers(res.data);
        }
      } catch (err: any) {
        showToast('error', 'Lỗi tải đại lý', err?.message || 'Không thể tải danh sách đại lý');
      } finally {
        setLoadingCustomers(false);
      }
    }
    loadCustomers();
  }, []);

  // Helper lấy mã đơn hàng, ngày và mã định danh duy nhất của từng đơn
  const getOrderCode = (o: any, idx?: number): string => {
    return String(
      o?.orderCode ||
      o?.order_code ||
      o?.code ||
      o?.invoiceCode ||
      o?.invoice_code ||
      (o?.id ? o.id : '') ||
      (idx !== undefined ? `DH-TUYEN-${idx + 1}` : 'DH-TUYEN')
    );
  };

  const getOrderDate = (o: any) => {
    return (
      o?.orderDate ||
      o?.order_date ||
      o?.createdAt ||
      o?.created_at ||
      o?.deliveryDate ||
      o?.delivery_date ||
      o?.issueDate ||
      o?.issue_date
    );
  };

  const formatOrderDate = (dateVal?: any) => {
    if (!dateVal) return '—';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleDateString('vi-VN');
  };

  // Tải danh sách đơn hàng đang đi giao (SHIPPED) hoặc đã giao (DELIVERED) của đại lý
  useEffect(() => {
    if (!agencyId) {
      setEligibleOrders([]);
      setSelectedOrderCodes([]);
      setAmount(0);
      return;
    }

    let isMounted = true;
    async function fetchOrders() {
      try {
        setLoadingOrders(true);
        const orders = await collectionsService.getEligibleOrders(agencyId);
        if (isMounted) {
          setEligibleOrders(orders);
          // Mặc định tích chọn tất cả các đơn hàng đủ điều kiện
          const codes = orders.map((o, idx) => getOrderCode(o, idx));
          setSelectedOrderCodes(codes);
          // Tính tổng số tiền còn phải thu của các đơn được chọn
          const totalRemaining = orders.reduce(
            (sum, o) =>
              sum +
              (o.remainingAmount ??
                (o as any).remaining_amount ??
                Math.max(
                  0,
                  (o.totalAmount ?? (o as any).total_amount ?? 0) -
                    (o.paidAmount ?? (o as any).paid_amount ?? 0),
                )),
            0,
          );
          setAmount(totalRemaining > 0 ? totalRemaining : 0);
        }
      } catch (err) {
        console.error('Failed to load eligible orders', err);
        if (isMounted) {
          setEligibleOrders([]);
          setSelectedOrderCodes([]);
          setAmount(0);
        }
      } finally {
        if (isMounted) setLoadingOrders(false);
      }
    }

    fetchOrders();
    return () => {
      isMounted = false;
    };
  }, [agencyId]);

  // Xử lý upload ảnh preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('error', 'File quá lớn', 'Kích thước ảnh tối đa là 10MB');
        return;
      }
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Đại lý đang chọn
  const selectedAgency = useMemo(() => {
    return customers.find((c) => c.id === agencyId || c.code === agencyId);
  }, [customers, agencyId]);

  // Danh sách đơn hàng được tích chọn
  const selectedOrders = useMemo(() => {
    return eligibleOrders.filter((o, idx) => selectedOrderCodes.includes(getOrderCode(o, idx)));
  }, [eligibleOrders, selectedOrderCodes]);

  // Tổng giá trị các đơn hàng được chọn
  const totalSelectedOrdersAmount = useMemo(() => {
    return selectedOrders.reduce(
      (sum, o) => sum + (o.totalAmount ?? (o as any).total_amount ?? 0),
      0,
    );
  }, [selectedOrders]);

  // Tổng số tiền còn phải thu của các đơn được chọn
  const totalSelectedRemaining = useMemo(() => {
    return selectedOrders.reduce(
      (sum, o) =>
        sum +
        (o.remainingAmount ??
          (o as any).remaining_amount ??
          Math.max(
            0,
            (o.totalAmount ?? (o as any).total_amount ?? 0) -
              (o.paidAmount ?? (o as any).paid_amount ?? 0),
          )),
      0,
    );
  }, [selectedOrders]);

  // Bật/tắt chọn tất cả đơn hàng
  const handleToggleSelectAll = () => {
    if (selectedOrderCodes.length === eligibleOrders.length) {
      setSelectedOrderCodes([]);
      setAmount(0);
    } else {
      const allCodes = eligibleOrders.map((o, idx) => getOrderCode(o, idx));
      setSelectedOrderCodes(allCodes);
      const totalRemaining = eligibleOrders.reduce(
        (sum, o) =>
          sum +
          (o.remainingAmount ??
            (o as any).remaining_amount ??
            Math.max(
              0,
              (o.totalAmount ?? (o as any).total_amount ?? 0) -
                (o.paidAmount ?? (o as any).paid_amount ?? 0),
            )),
        0,
      );
      setAmount(totalRemaining);
    }
  };

  // Bật/tắt chọn từng đơn
  const handleToggleOrder = (code: string) => {
    setSelectedOrderCodes((prev) => {
      const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
      const nextSelected = eligibleOrders.filter((o, idx) => next.includes(getOrderCode(o, idx)));
      if (nextSelected.length === 0) {
        setAmount(0);
      } else {
        const nextRemaining = nextSelected.reduce(
          (sum, o) =>
            sum +
            (o.remainingAmount ??
              (o as any).remaining_amount ??
              Math.max(
                0,
                (o.totalAmount ?? (o as any).total_amount ?? 0) -
                  (o.paidAmount ?? (o as any).paid_amount ?? 0),
              )),
          0,
        );
        setAmount(nextRemaining);
      }
      return next;
    });
  };

  // Đọc số tiền bằng chữ (Tiếng Việt)
  const amountInWords = useMemo(() => {
    if (amount === 0) return 'Không đồng';
    if (!amount || amount < 0) return '';
    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

    const readGroup = (group: number, showZeroHundred: boolean): string => {
      const a = Math.floor(group / 100);
      const b = Math.floor((group % 100) / 10);
      const c = group % 10;
      let res = '';

      if (a > 0 || showZeroHundred) {
        res += `${digits[a]} trăm `;
      }

      if (b > 1) {
        res += `${digits[b]} mươi `;
        if (c === 1) res += 'mốt ';
        else if (c === 4) res += 'tư ';
        else if (c === 5) res += 'lăm ';
        else if (c > 0) res += `${digits[c]} `;
      } else if (b === 1) {
        res += 'mười ';
        if (c === 1) res += 'một ';
        else if (c === 5) res += 'lăm ';
        else if (c > 0) res += `${digits[c]} `;
      } else {
        if ((a > 0 || showZeroHundred) && c > 0) {
          res += 'lẻ ';
        }
        if (c > 0) {
          res += `${digits[c]} `;
        }
      }
      return res.trim();
    };

    const str = Math.round(Number(amount)).toString();
    const groups: number[] = [];
    for (let i = str.length; i > 0; i -= 3) {
      groups.push(parseInt(str.substring(Math.max(0, i - 3), i), 10));
    }

    const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
    let result = '';

    for (let i = groups.length - 1; i >= 0; i--) {
      const g = groups[i];
      if (g > 0) {
        const showZero = i < groups.length - 1;
        const readText = readGroup(g, showZero);
        const unit = units[i] || '';
        result += `${readText} ${unit} `;
      }
    }

    result = result.trim();
    if (!result) return '';
    return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
  }, [amount]);

  // Chuỗi hiển thị phân tách dấu chấm hàng nghìn
  const displayAmount = useMemo(() => {
    if (amount === '' || typeof amount !== 'number') return '';
    return amount.toLocaleString('vi-VN');
  }, [amount]);

  // Xử lý thay đổi số tiền tự động format
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setAmount('');
      return;
    }
    const num = parseInt(raw, 10);
    setAmount(num);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agencyId) {
      showToast('error', 'Thiếu thông tin', 'Vui lòng chọn đại lý cần thu tiền');
      return;
    }
    if (eligibleOrders.length > 0 && selectedOrderCodes.length === 0) {
      showToast('error', 'Chưa chọn đơn hàng', 'Vui lòng tích chọn ít nhất một đơn hàng trong tuyến để thu tiền');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      showToast('error', 'Số tiền không hợp lệ', 'Vui lòng nhập số tiền thu lớn hơn 0');
      return;
    }
    if (!receiptFile && !receiptPreview) {
      showToast('error', 'Thiếu ảnh biên lai', 'Vui lòng tải lên ảnh biên lai giấy hoặc ủy nhiệm chi / chuyển khoản');
      return;
    }

    try {
      setIsSubmitting(true);
      const orderDetails = selectedOrders.map((o) => ({
        orderId: o.orderId || o.id,
        orderCode: getOrderCode(o),
        totalAmount: o.totalAmount,
        remainingAmount: o.remainingAmount ?? Math.max(0, o.totalAmount - (o.paidAmount || 0)),
        status: o.status,
      }));

      const payload: CreateCollectionPayload = {
        agency_id: agencyId,
        agency_name: selectedAgency?.name || undefined,
        amount: Number(amount),
        payment_method: paymentMethod,
        collection_date: collectionDate,
        note: note.trim() || undefined,
        image: receiptFile || undefined,
        receipt_image_url: !receiptFile ? receiptPreview : undefined,
        order_ids: selectedOrders.map((o) => o.id),
        order_codes: selectedOrderCodes,
        order_details: orderDetails,
      };

      const res = await collectionsService.createCollection(payload);
      showToast(
        'success',
        'Tạo phiếu thu thành công',
        `Mã phiếu: ${res.code} - Số tiền: ${Number(amount).toLocaleString('vi-VN')} đ đang ở trạng thái Chờ nộp`,
      );

      // Phát sự kiện lên chuông thông báo toàn hệ thống tức thì
      window.dispatchEvent(
        new CustomEvent('loha_collection_created', {
          detail: {
            id: res.id,
            code: res.code,
            agencyName: selectedAgency?.name || res.agencyName || agencyId,
            amount: Number(amount),
            paymentMethod,
          },
        }),
      );

      // Chuyển hướng về trang cha Quản lý ngân sách
      navigate('/route-collections');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tạo phiếu thu';
      showToast('error', 'Tạo phiếu thất bại', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* THANH ĐIỀU HƯỚNG QUAY LẠI                                                */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/route-collections')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại</span>
        </button>

        <span className="text-xs text-slate-400">
          Nhân viên thực hiện: <strong className="text-slate-700">{currentUser?.fullName || currentUser?.username}</strong>
        </span>
      </div>

      {/* ========================================================================= */}
      {/* NỘI DUNG FORM (BỐ CỤC 2 CỘT CHUẨN CLEAN SAAS)                             */}
      {/* ========================================================================= */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (7 CỘT): FORM NHẬP THÔNG TIN PHIẾU THU */}
        <div className="lg:col-span-7 space-y-6">
          {/* KHỐI 1: THÔNG TIN ĐẠI LÝ & SỐ TIỀN THU */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                1. Thông tin đại lý & Số tiền thu
              </h2>
            </div>

            {/* Chọn đại lý */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Đại lý / Cửa hàng nộp tiền <span className="text-rose-500">*</span>
              </label>
              <select
                value={agencyId}
                onChange={(e) => {
                  const val = e.target.value;
                  setAgencyId(val);
                  if (!val) {
                    setAmount('');
                    setEligibleOrders([]);
                    setSelectedOrderCodes([]);
                  }
                }}
                disabled={loadingCustomers}
                required
                className="w-full h-[42px] px-3.5 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer disabled:opacity-60"
              >
                <option value="">
                  {loadingCustomers ? '-- Đang tải danh sách đại lý... --' : '-- Chọn đại lý thu tiền theo tuyến --'}
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code || c.id})
                  </option>
                ))}
              </select>
            </div>

            {/* KHI CHƯA CHỌN ĐẠI LÝ: ẨN TOÀN BỘ Ô NHẬP TIỀN, HÌNH THỨC, NGÀY THU & ĐƠN HÀNG */}
            {!agencyId ? (
              <div className="py-7 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 space-y-1.5">
                <Building2 className="w-7 h-7 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">
                  Chưa chọn đại lý thu tiền
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Vui lòng chọn đại lý từ danh sách phía trên để hiển thị danh sách đơn hàng trong tuyến, ô nhập số tiền thu thực tế, hình thức thanh toán và ngày thu.
                </p>
              </div>
            ) : (
              <>
                {/* BẢNG CHỌN ĐƠN HÀNG THEO TUYẾN */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-600" />
                    <label className="text-xs font-bold text-slate-800">
                      Đơn hàng trong tuyến cần thu tiền
                    </label>
                    {eligibleOrders.length > 0 && (
                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
                        {eligibleOrders.length} đơn hàng
                      </span>
                    )}
                  </div>

                  {loadingOrders ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Đang tìm kiếm đơn hàng đang giao (SHIPPED) hoặc đã giao (DELIVERED)...</span>
                    </div>
                  ) : eligibleOrders.length === 0 ? (
                    <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-xs text-amber-800 flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Đại lý hiện không có đơn hàng cần thu tiền</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          Không tìm thấy đơn hàng nào ở trạng thái Đang giao (SHIPPED) hoặc Đã giao (DELIVERED) của đại lý này.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200/80 text-slate-600 font-semibold">
                                <th className="py-2.5 px-3 w-8 text-center">
                                  <input
                                    type="checkbox"
                                    checked={selectedOrderCodes.length === eligibleOrders.length && eligibleOrders.length > 0}
                                    onChange={handleToggleSelectAll}
                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                  />
                                </th>
                                <th className="py-2.5 px-3">Mã đơn hàng</th>
                                <th className="py-2.5 px-3">Ngày đặt</th>
                                <th className="py-2.5 px-3 text-center">Trạng thái</th>
                                <th className="py-2.5 px-3 text-right">Tổng tiền</th>
                                <th className="py-2.5 px-3 text-right">Đã thanh toán</th>
                                <th className="py-2.5 px-3 text-right font-bold text-indigo-700">Còn phải thu</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {eligibleOrders.map((order, idx) => {
                                const ordCode = getOrderCode(order, idx);
                                const ordDate = getOrderDate(order);
                                const isSelected = selectedOrderCodes.includes(ordCode);
                                const totalAmt = order.totalAmount ?? (order as any).total_amount ?? 0;
                                const paidAmt = order.paidAmount ?? (order as any).paid_amount ?? 0;
                                const remaining =
                                  order.remainingAmount ??
                                  (order as any).remaining_amount ??
                                  Math.max(0, totalAmt - paidAmt);

                                return (
                                  <tr
                                    key={ordCode}
                                    onClick={() => handleToggleOrder(ordCode)}
                                    className={`transition-colors cursor-pointer ${
                                      isSelected ? 'bg-indigo-50/40 hover:bg-indigo-50/70' : 'hover:bg-slate-50/80'
                                    }`}
                                  >
                                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleToggleOrder(ordCode)}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                                      {ordCode}
                                    </td>
                                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                      {formatOrderDate(ordDate)}
                                    </td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                          order.status === 'DELIVERED'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-blue-50 text-blue-700 border-blue-200'
                                        }`}
                                      >
                                        {order.status === 'DELIVERED' ? 'Đã giao hàng' : 'Đang đi giao'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                                      {totalAmt.toLocaleString('vi-VN')} đ
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                                      {paidAmt.toLocaleString('vi-VN')} đ
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700">
                                      {remaining.toLocaleString('vi-VN')} đ
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Thanh tóm tắt chọn đơn */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">Đã chọn:</span>
                          <strong className="text-slate-900 font-bold">{selectedOrders.length} / {eligibleOrders.length} đơn</strong>
                          <span className="text-slate-300">|</span>
                          <span className="text-slate-600">Tổng cần thu theo đơn:</span>
                          <strong className="text-indigo-700 font-mono font-bold text-sm">
                            {totalSelectedRemaining.toLocaleString('vi-VN')} đ
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Số tiền thu */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Số tiền thu thực tế (VND) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={displayAmount}
                      onChange={handleAmountChange}
                      placeholder="Nhập số tiền thu (Ví dụ: 15.000.000)"
                      required
                      className="w-full h-[46px] px-4 pr-12 text-base font-bold font-mono bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      VNĐ
                    </span>
                  </div>

                  {/* Nút gợi ý số tròn */}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className="text-xs text-slate-400">Gợi ý nhanh:</span>
                    {totalSelectedRemaining > 0 && (
                      <button
                        type="button"
                        onClick={() => setAmount(totalSelectedRemaining)}
                        className="px-2.5 py-1 text-xs font-mono font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                      >
                        Thu đủ đơn ({totalSelectedRemaining.toLocaleString('vi-VN')} đ)
                      </button>
                    )}
                    {[5000000, 10000000, 20000000, 30000000, 50000000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val)}
                        className="px-2.5 py-1 text-xs font-mono font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        {(val / 1000000).toLocaleString('vi-VN')} tr
                      </button>
                    ))}
                  </div>

                  {/* Ô ghi lại số tiền bằng chữ ngay dưới */}
                  <div className="mt-2.5 p-2.5 bg-slate-50/80 rounded-lg border border-slate-200/80 flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 shrink-0">Bằng chữ:</span>
                    <input
                      type="text"
                      readOnly
                      value={amountInWords}
                      placeholder="Chưa có số tiền"
                      tabIndex={-1}
                      className="w-full text-xs italic font-medium text-slate-800 bg-transparent border-none outline-none cursor-default"
                    />
                  </div>

                  {/* THÔNG BÁO ĐỐI CHIẾU SỐ TIỀN THU: THU ĐỦ vs THU THIẾU */}
                  {selectedOrders.length > 0 && typeof amount === 'number' && amount > 0 && (
                    <div className="mt-3">
                      {amount === totalSelectedRemaining ? (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900 animate-in fade-in duration-150">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-emerald-800">
                              ✓ Thu đủ 100% tiền đơn hàng: {amount.toLocaleString('vi-VN')} đ
                            </p>
                            <p className="text-[11px] text-emerald-700 mt-0.5">
                              Khớp đúng toàn bộ giá trị các đơn hàng được chọn. Khi kế toán duyệt phiếu, hệ thống sẽ gạch nợ hoàn tất cho các đơn hàng này.
                            </p>
                          </div>
                        </div>
                      ) : amount < totalSelectedRemaining ? (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900 animate-in fade-in duration-150">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-amber-800">
                              ⚠️ Đại lý trả thiếu {(totalSelectedRemaining - amount).toLocaleString('vi-VN')} đ so với tổng đơn được chọn
                            </p>
                            <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                              Phần tiền còn thiếu vẫn sẽ giữ nguyên trên công nợ của hóa đơn/đại lý, hệ thống <strong>không tự động cộng thêm nợ mới hay trừ khống</strong>. Khi đại lý trả nốt qua các lần thu sau, hệ thống sẽ tiếp tục cấn trừ tiếp.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 flex items-start gap-2.5 text-xs text-blue-900 animate-in fade-in duration-150">
                          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-blue-800">
                              ℹ️ Số tiền thu lớn hơn giá trị các đơn được chọn {(amount - totalSelectedRemaining).toLocaleString('vi-VN')} đ
                            </p>
                            <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                              Phần tiền thu dư sẽ được cấn trừ thêm vào tổng công nợ chung của đại lý sau khi kế toán duyệt.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Hình thức thanh toán & Ngày thu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Hình thức thanh toán
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CASH')}
                        className={`h-[40px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          paymentMethod === 'CASH'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Banknote className="w-4 h-4" />
                        <span>Tiền mặt</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('BANK_TRANSFER')}
                        className={`h-[40px] px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          paymentMethod === 'BANK_TRANSFER'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Chuyển khoản</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Ngày thu tiền thực tế
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        min="2020-01-01"
                        max="2099-12-31"
                        value={collectionDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) {
                            setCollectionDate('');
                            return;
                          }
                          const [yearStr] = val.split('-');
                          if (yearStr && (yearStr.length > 4 || parseInt(yearStr, 10) > 2099 || parseInt(yearStr, 10) < 2000)) {
                            return;
                          }
                          setCollectionDate(val);
                        }}
                        required
                        className="w-full h-[40px] px-3 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* KHỐI 2: ẢNH CHỤP BIÊN LAI / ỦY NHIỆM CHI & GHI CHÚ */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <FileText className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Chứng từ ảnh biên lai & Ghi chú
              </h2>
            </div>

            {/* Upload ảnh */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tải lên ảnh biên lai giấy / Ủy nhiệm chi ngân hàng <span className="text-rose-500">*</span>
              </label>

              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                {receiptPreview ? (
                  <div className="space-y-3">
                    <img
                      src={receiptPreview}
                      alt="Biên lai đối soát"
                      className="max-h-64 mx-auto rounded-xl object-contain shadow-md border border-slate-200"
                    />
                    <div className="flex items-center justify-center gap-3">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer transition-colors">
                        <span>Đổi ảnh khác</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptFile(null);
                          setReceiptPreview('');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer transition-colors"
                      >
                        Xóa ảnh
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer block py-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      Bấm để tải lên ảnh biên lai hoặc kéo thả ảnh vào đây
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Hỗ trợ định dạng PNG, JPG, JPEG (Kích thước tối đa: 10MB)
                    </p>
                    <span className="inline-block mt-3 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 rounded-lg">
                      Chọn file ảnh từ thiết bị
                    </span>
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
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Ghi chú thêm về khoản thu
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Nhập ghi chú đợt thu, số hóa đơn thanh toán, thỏa thuận thanh toán hoặc lý do thu nợ..."
                className="w-full p-3 text-xs bg-slate-50/70 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (5 CỘT): THẺ TÓM TẮT & XÁC NHẬN */}
        <div className="lg:col-span-5 space-y-5">
          {/* TÓM TẮT DÒNG TIỀN ĐỐI SOÁT */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
            <div className="pb-3 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Tóm tắt khoản thu nộp
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between py-2 border-b border-slate-100 gap-3">
                <span className="text-slate-500 shrink-0">Đại lý:</span>
                <span className="font-semibold text-slate-800 text-right break-words flex-1 leading-snug" title={selectedAgency?.name}>
                  {selectedAgency?.name || 'Chưa chọn'}
                </span>
              </div>

              {/* Đơn hàng được chọn */}
              <div className="flex items-start justify-between py-1.5 border-b border-slate-100 gap-2">
                <span className="text-slate-500 shrink-0">Đơn hàng trong tuyến:</span>
                <div className="text-right">
                  <span className="font-bold text-slate-800">{selectedOrders.length} đơn</span>
                  {selectedOrderCodes.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-1 mt-1">
                      {selectedOrderCodes.map((code) => (
                        <span key={code} className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded border border-slate-200">
                          {code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Cần thu theo đơn:</span>
                <span className="font-mono font-semibold text-indigo-700">
                  {totalSelectedRemaining.toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Số tiền thực thu:</span>
                <span className="font-mono font-bold text-indigo-600 text-sm">
                  {typeof amount === 'number' ? amount.toLocaleString('vi-VN') : 0} đ
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Hình thức:</span>
                <span className="font-semibold text-slate-700">
                  {paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Clock className="w-3 h-3" />
                  Chờ nộp (PENDING)
                </span>
              </div>
            </div>

            {/* Nút Hủy và Xác nhận nằm ngang nhau */}
            <div className="pt-2 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/route-collections')}
                className="h-[40px] text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer flex items-center justify-center shadow-2xs"
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="h-[40px] inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-60 rounded-lg transition-all shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <span>Xác nhận</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
