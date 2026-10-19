import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Scale,
  ShoppingBag,
  CreditCard,
  RefreshCw,
  Check,
} from 'lucide-react';
import { customerService } from '../services/customer.service';
import type { Customer } from '../types/customer.types';
import { debtReconciliationService } from '../services/debt-reconciliation.service';
import type { ReconciliationPreview } from '../types/debt-reconciliation';
import { numberToVietnameseWords } from '../utils/number-to-words';
import { showToast } from '../components/toast';

const formatVND = (val?: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(val || 0);
};

export const CreateDebtReconciliationPage: React.FC = () => {
  const navigate = useNavigate();

  // Danh sách đại lý
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Form inputs
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('2026-10');
  const [note, setNote] = useState('');

  // Số liệu bóc tách
  const [calculating, setCalculating] = useState(false);
  const [preview, setPreview] = useState<ReconciliationPreview | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Tải danh sách đại lý khi mở trang
  useEffect(() => {
    customerService.getCustomers({ limit: 100 })
      .then((res) => {
        if (res && res.data && res.data.length > 0) {
          setCustomers(res.data);
          // Chọn đại lý đầu tiên làm mặc định
          setSelectedAgencyId(res.data[0].id);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách khách hàng:', err);
        showToast('error', 'Không thể tải danh sách đại lý');
      })
      .finally(() => setLoadingCustomers(false));
  }, []);

  // Tự động tính toán bóc tách số liệu khi chọn đại lý hoặc kỳ đối chiếu
  useEffect(() => {
    if (!selectedAgencyId || !selectedPeriod) return;

    setCalculating(true);
    debtReconciliationService.calculatePreview(selectedAgencyId, selectedPeriod)
      .then((data) => {
        setPreview(data);
      })
      .catch((err) => {
        console.error('Lỗi tính toán số liệu đối chiếu:', err);
        showToast('error', 'Lỗi khi tính toán số liệu đối chiếu đại lý');
      })
      .finally(() => setCalculating(false));
  }, [selectedAgencyId, selectedPeriod]);

  // Submit tạo biên bản
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgencyId) {
      showToast('error', 'Vui lòng chọn đại lý');
      return;
    }
    if (!selectedPeriod) {
      showToast('error', 'Vui lòng chọn kỳ đối chiếu');
      return;
    }

    setSubmitting(true);
    try {
      const res = await debtReconciliationService.createReport({
        agency_id: selectedAgencyId,
        period: selectedPeriod,
        note: note.trim() || undefined,
      });

      showToast('success', `Đã lập biên bản ${res.code} thành công!`);

      // Bắn sự kiện tới chuông thông báo nếu cùng phiên làm việc
      window.dispatchEvent(
        new CustomEvent('loha_reconciliation_created', { detail: res }),
      );

      navigate('/accounting/debt-reconciliations');
    } catch (err: any) {
      console.error('Lỗi tạo biên bản đối chiếu:', err);
      showToast('error', err?.response?.data?.message || 'Không thể tạo biên bản đối chiếu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* 1. Thanh Điều Hướng & Trạng Thái Ngang Hàng (Bỏ hình 1, bỏ icon trạng thái, đổi thành Trạng thái) */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/accounting/debt-reconciliations')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Trạng thái: Chờ xác nhận
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 2. Khung Chọn Đại Lý & Kỳ Đối Chiếu (Bỏ các dòng chữ không cần thiết ở hình 3) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Thông tin đối chiếu</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chọn đại lý */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Đại lý đối chiếu <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedAgencyId}
                onChange={(e) => setSelectedAgencyId(e.target.value)}
                disabled={loadingCustomers || submitting}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Chọn kỳ đối chiếu */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Kỳ đối chiếu <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              >
                <option value="2026-10">Tháng 10/2026 (Kỳ hiện tại)</option>
                <option value="2026-09">Tháng 09/2026</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Thẻ Số Liệu Tự Động Bóc Tách (Bỏ (Phát sinh +/-), bỏ dấu +/-, bỏ các dòng chú thích ở hình 4) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-600" />
              <span>Số liệu công nợ chốt kỳ</span>
            </h3>
            {calculating && (
              <span className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Đang bóc tách số liệu...
              </span>
            )}
          </div>

          {/* 4 Khối số liệu */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-xs text-slate-500 font-medium">1. Số dư đầu kỳ</span>
              <p className="text-lg font-bold text-slate-800 mt-1">
                {formatVND(preview?.openingBalance)}
              </p>
            </div>

            <div className="p-4 bg-rose-50/50 border border-rose-200/80 rounded-xl">
              <span className="text-xs text-rose-600 font-medium">2. Mua hàng</span>
              <p className="text-lg font-bold text-rose-700 mt-1">
                {formatVND(preview?.totalInvoiced)}
              </p>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl">
              <span className="text-xs text-emerald-600 font-medium">3. Đã thanh toán</span>
              <p className="text-lg font-bold text-emerald-700 mt-1">
                {formatVND(preview?.totalPaid)}
              </p>
            </div>

            <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-xl">
              <span className="text-xs text-indigo-600 font-medium">4. Dư nợ cuối kỳ</span>
              <p className="text-lg font-bold text-indigo-700 mt-1">
                {formatVND(preview?.closingBalance)}
              </p>
            </div>
          </div>

          {/* Ô Đọc Số Tiền Bằng Chữ (Hiển thị readonly theo yêu cầu) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-xs font-semibold text-slate-500 mb-1">
              Số tiền nợ cuối kỳ viết bằng chữ:
            </div>
            <div className="text-sm font-bold text-indigo-900 select-all">
              {numberToVietnameseWords(preview?.closingBalance || 0)}
            </div>
          </div>
        </div>

        {/* 5. Bảng Kê Chi Tiết Chứng Từ Bóc Tách */}
        {preview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Đơn hàng mua hàng */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-rose-600" />
                  Đơn hàng mua buôn ({preview.invoices?.length || 0})
                </span>
                <span className="text-xs font-semibold text-rose-600">
                  {formatVND(preview.totalInvoiced)}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Mã đơn hàng</th>
                      <th className="py-2 px-3">Ngày</th>
                      <th className="py-2 px-3 text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.invoices?.map((inv, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-rose-600">{inv.code}</td>
                        <td className="py-2 px-3 text-slate-500">{inv.date}</td>
                        <td className="py-2 px-3 text-right font-medium text-slate-800">
                          {formatVND(inv.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Phiếu thu & thanh toán */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Phiếu thu ngân sách đã duyệt ({preview.payments?.length || 0})
                </span>
                <span className="text-xs font-semibold text-emerald-600">
                  {formatVND(preview.totalPaid)}
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="py-2 px-3">Mã phiếu thu</th>
                      <th className="py-2 px-3">Ngày</th>
                      <th className="py-2 px-3 text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.payments?.map((pm, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-semibold text-emerald-600">{pm.code}</td>
                        <td className="py-2 px-3 text-slate-500">{pm.date}</td>
                        <td className="py-2 px-3 text-right font-medium text-slate-800">
                          {formatVND(pm.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. Ô Ghi Chú Biên Bản */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <label className="block text-xs font-semibold text-slate-700">
            Ghi chú biên bản (Tùy chọn)
          </label>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nhập ghi chú hoặc căn cứ đối chiếu gửi cho đại lý..."
            className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
          />
        </div>

        {/* 7. Hai Nút Thao Tác Nằm Ngang Hàng Nhau */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={() => navigate('/accounting/debt-reconciliations')}
            disabled={submitting}
            className="px-5 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition active:scale-[0.98]"
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={submitting || calculating || !preview}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>Xác nhận</span>
          </button>
        </div>
      </form>
    </div>
  );
};
