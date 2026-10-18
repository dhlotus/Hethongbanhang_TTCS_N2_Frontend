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
} from 'lucide-react';
import {
  collectionsService,
  type CreateCollectionPayload,
  type PaymentMethod,
} from '../services/collections.service';
import { customerService } from '../services/customer.service';
import type { Customer } from '../types/customer.types';
import { showToast } from '../components/toast';
import { getStoredUser } from '../utils/navigation';

export const CreateRouteCollectionPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

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

  // Đọc số tiền bằng chữ (Tiếng Việt)
  const amountInWords = useMemo(() => {
    if (!amount || amount <= 0) return '';
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

  // Dư nợ sau khi gạch nợ dự kiến
  const projectedRemainingDebt = useMemo(() => {
    if (!selectedAgency || selectedAgency.currentDebt === undefined) return 0;
    const current = Number(selectedAgency.currentDebt) || 0;
    const pay = typeof amount === 'number' ? amount : 0;
    return Math.max(0, current - pay);
  }, [selectedAgency, amount]);

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!agencyId) {
      showToast('error', 'Thiếu thông tin', 'Vui lòng chọn đại lý cần thu tiền');
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
      const payload: CreateCollectionPayload = {
        agency_id: agencyId,
        agency_name: selectedAgency?.name || undefined,
        amount: Number(amount),
        payment_method: paymentMethod,
        collection_date: collectionDate,
        note: note.trim() || undefined,
        image: receiptFile || undefined,
        receipt_image_url: !receiptFile ? receiptPreview : undefined,
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
                  setAgencyId(e.target.value);
                  const cust = customers.find(
                    (c) => c.id === e.target.value || c.code === e.target.value,
                  );
                  if (cust && cust.currentDebt && cust.currentDebt > 0 && !amount) {
                    setAmount(cust.currentDebt);
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
                    {c.name} ({c.code || c.id}) - Nợ hiện tại: {(c.currentDebt || 0).toLocaleString('vi-VN')} đ
                  </option>
                ))}
              </select>

              {/* Thông tin nợ đại lý hiện tại */}
              {selectedAgency && (
                <div className="mt-2.5 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-600">Đại lý: </span>
                    <strong className="text-slate-800">{selectedAgency.name}</strong>
                    <span className="text-slate-400 font-mono ml-1.5">({selectedAgency.code || selectedAgency.id})</span>
                    <div className="mt-0.5 text-slate-500">
                      Dư nợ hiện tại: <strong className="text-indigo-700 font-mono">{(selectedAgency.currentDebt || 0).toLocaleString('vi-VN')} đ</strong>
                    </div>
                  </div>
                  {selectedAgency.currentDebt && selectedAgency.currentDebt > 0 ? (
                    <button
                      type="button"
                      onClick={() => setAmount(selectedAgency.currentDebt)}
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
                    >
                      <Check className="w-3 h-3 text-indigo-600" />
                      <span>Thu hết nợ</span>
                    </button>
                  ) : null}
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
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Tóm tắt khoản thu nộp
              </h3>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" />
                Trạng thái sau tạo: Chờ duyệt
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between py-2 border-b border-slate-100 gap-3">
                <span className="text-slate-500 shrink-0">Đại lý:</span>
                <span className="font-semibold text-slate-800 text-right break-words flex-1 leading-snug" title={selectedAgency?.name}>
                  {selectedAgency?.name || 'Chưa chọn'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Dư nợ hiện tại:</span>
                <span className="font-mono font-semibold text-slate-700">
                  {selectedAgency ? (selectedAgency.currentDebt || 0).toLocaleString('vi-VN') : 0} đ
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Số tiền thu nộp:</span>
                <span className="font-mono font-bold text-indigo-600 text-sm">
                  {typeof amount === 'number' ? amount.toLocaleString('vi-VN') : 0} đ
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Dư nợ sau khi duyệt:</span>
                <span className="font-mono font-bold text-emerald-600">
                  {projectedRemainingDebt.toLocaleString('vi-VN')} đ
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
                  Chờ duyệt
                </span>
              </div>
            </div>

            {/* Lưu ý quy trình đối soát */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-[11px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
                Quy trình đối soát:
              </p>
              <p>• Phiếu thu tạo xong sẽ ở trạng thái <strong>Chờ duyệt</strong>.</p>
              <p>• Kế toán sẽ đối chiếu ảnh biên lai và bấm duyệt để <strong>gạch nợ tự động</strong>.</p>
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
