import React, { useState, useEffect } from 'react';
import { X, Building2, Loader2, Phone, Hash, Mail, MapPin, AlertCircle } from 'lucide-react';
import { customersService } from '../services/customers.service';
import { toast } from './toast';
import type { Customer, SalesRepOption } from '../types/customer';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer | null;
  salesReps: SalesRepOption[];
  onSuccess: (savedCustomer: Customer) => void;
}

const REGION_OPTIONS = [
  'Miền Bắc',
  'Miền Trung',
  'Miền Nam',
  'Đông Nam Bộ',
  'Tây Nam Bộ',
];

const GROUP_OPTIONS = [
  { value: 'TIER_1', label: 'Đại lý Cấp 1 (Tier 1)' },
  { value: 'TIER_2', label: 'Đại lý Cấp 2 (Tier 2)' },
  { value: 'GOLD', label: 'Khách hàng VIP / Vàng' },
  { value: 'RETAIL', label: 'Chuỗi Bán lẻ' },
];

/**
 * Modal Thêm mới / Cập nhật Đại lý B2B (SN-31, SN-35)
 * - Số điện thoại: Bắt buộc, bắt đầu bằng số 0, đúng chính xác 10 chữ số
 * - Mã số thuế: Bắt buộc không được để trống, chuẩn 10 chữ số hoặc 13 chữ số / 10-3 số chi nhánh
 * - Hiển thị lỗi trực quan theo chuẩn UI
 */
export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
  isOpen,
  onClose,
  customer,
  salesReps,
  onSuccess,
}) => {
  const [code, setCode] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [region, setRegion] = useState<string>('Miền Nam');
  const [customerGroup, setCustomerGroup] = useState<string>('TIER_1');
  const [salesRepId, setSalesRepId] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [taxCode, setTaxCode] = useState<string>('');
  const [creditLimit, setCreditLimit] = useState<number>(50000000);
  const [maxDebtDays, setMaxDebtDays] = useState<number>(30);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = Boolean(customer);

  useEffect(() => {
    if (customer) {
      setCode(customer.code || '');
      setName(customer.name || '');
      setRegion(customer.region || 'Miền Nam');
      setCustomerGroup(customer.customerGroup || 'TIER_1');
      setSalesRepId(customer.salesRepId || '');
      setPhone(customer.phone || '');
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setTaxCode(customer.taxCode || '');
      setCreditLimit(customer.creditLimit || 0);
      setMaxDebtDays(customer.maxDebtDays || 30);
    } else {
      setCode(`DL-${Math.floor(100 + Math.random() * 900)}`);
      setName('');
      setRegion('Miền Nam');
      setCustomerGroup('TIER_1');
      setSalesRepId('');
      setPhone('');
      setEmail('');
      setAddress('');
      setTaxCode('');
      setCreditLimit(50000000);
      setMaxDebtDays(30);
    }
    setErrors({});
  }, [customer, isOpen]);

  if (!isOpen) return null;

  // Xử lý thay đổi số điện thoại (chỉ cho phép nhập số, mặc định đúng 10 chữ số)
  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/[^0-9]/g, '').slice(0, 10);
    setPhone(clean);
    if (errors.phone) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.phone;
        return next;
      });
    }
  };

  // Xử lý thay đổi mã số thuế (chỉ cho phép số và dấu gạch nối, tối đa 14 ký tự)
  const handleTaxCodeChange = (val: string) => {
    const clean = val.replace(/[^0-9-]/g, '').slice(0, 14);
    setTaxCode(clean);
    if (errors.taxCode) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.taxCode;
        return next;
      });
    }
  };

  // Kiểm tra tính hợp lệ toàn form theo tiêu chuẩn
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // 1. Validate Tên đại lý
    if (!name.trim()) {
      newErrors.name = 'Tên đại lý không được để trống';
    }

    // 2. Validate Mã đại lý
    if (!code.trim()) {
      newErrors.code = 'Mã đại lý không được để trống';
    } else if (/\s/.test(code.trim())) {
      newErrors.code = 'Mã đại lý không được chứa khoảng trắng';
    }

    // 3. Validate Mã số thuế (Bắt buộc không được để trống)
    const cleanTaxCode = taxCode.trim();
    if (!cleanTaxCode) {
      newErrors.taxCode = 'Mã số thuế không được để trống';
    } else {
      const isValidMST =
        /^[0-9]{10}$/.test(cleanTaxCode) ||
        /^[0-9]{10}-[0-9]{3}$/.test(cleanTaxCode) ||
        /^[0-9]{13}$/.test(cleanTaxCode);
      if (!isValidMST) {
        newErrors.taxCode =
          'Mã số thuế phải gồm 10 chữ số (hoặc 13 chữ số / 10 số - 3 số chi nhánh, ví dụ: 0312345678-001)';
      }
    }

    // 4. Validate Số điện thoại chuẩn (Mặc định đúng 10 số, bắt đầu bằng số 0)
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      newErrors.phone = 'Số điện thoại không được để trống';
    } else if (!cleanPhone.startsWith('0')) {
      newErrors.phone = 'Số điện thoại phải bắt đầu bằng số 0';
    } else if (!/^[0-9]{10}$/.test(cleanPhone)) {
      newErrors.phone = 'Số điện thoại phải bao gồm đúng 10 chữ số (chuẩn viễn thông VN)';
    }

    // 5. Validate Email (nếu có nhập)
    const cleanEmail = email.trim();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = 'Địa chỉ email không đúng định dạng (ví dụ: daily@loha.vn)';
    }

    // 6. Validate Hạn mức công nợ
    if (creditLimit < 0) {
      newErrors.creditLimit = 'Hạn mức công nợ không được là số âm';
    }

    // 7. Validate Số ngày nợ
    if (maxDebtDays < 0) {
      newErrors.maxDebtDays = 'Số ngày nợ tối đa không được âm';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const rep = salesReps.find((r) => r.id === salesRepId);

      if (isEdit && customer) {
        const updated = await customersService.updateCustomer(customer.id, {
          name: name.trim(),
          region,
          customerGroup,
          salesRepId: salesRepId || null,
          salesRepName: rep?.fullName || null,
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          taxCode: taxCode.trim(),
          creditLimit,
          maxDebtDays,
        });
        toast.success(`Cập nhật thông tin đại lý ${updated.name} thành công!`);
        onSuccess(updated);
      } else {
        const created = await customersService.createCustomer({
          code: code.trim().toUpperCase(),
          name: name.trim(),
          region,
          customerGroup,
          salesRepId: salesRepId || null,
          salesRepName: rep?.fullName || null,
          phone: phone.trim(),
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          taxCode: taxCode.trim(),
          creditLimit,
          maxDebtDays,
        });
        toast.success(`Thêm mới đại lý ${created.name} thành công!`);
        onSuccess(created);
      }

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu đại lý';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-fade-in">
      <div
        className="w-full max-w-xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {isEdit ? 'Chỉnh Sửa Đại Lý' : 'Thêm Mới Đại Lý B2B'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? 'Cập nhật thông tin đại lý và nhân viên kinh doanh phụ trách (SN-35)'
                  : 'Khai báo thông tin đại lý mới vào hệ thống (SN-31, SN-35)'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Hàng 1: Mã đại lý & Mã số thuế */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã đại lý <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                disabled={isEdit}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (errors.code) {
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.code;
                      return next;
                    });
                  }
                }}
                className={`w-full px-3.5 py-2 text-sm bg-slate-50 disabled:bg-slate-100 border rounded-xl font-mono uppercase focus:outline-none focus:ring-2 transition-all ${
                  errors.code
                    ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900'
                    : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                }`}
                required
              />
              {errors.code && (
                <p className="text-2xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.code}
                </p>
              )}
            </div>

            {/* Ô nhập Mã số thuế chuẩn - BẮT BUỘC KHÔNG ĐƯỢC ĐỂ TRỐNG */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã số thuế <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Hash className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  value={taxCode}
                  onChange={(e) => handleTaxCodeChange(e.target.value)}
                  placeholder="Ví dụ: 0312345678 hoặc 0312345678-001"
                  maxLength={14}
                  className={`w-full pl-9.5 pr-3.5 py-2 text-sm bg-white border rounded-xl font-mono tracking-wider focus:outline-none focus:ring-2 transition-all ${
                    errors.taxCode
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900'
                      : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                  required
                />
              </div>
              {errors.taxCode ? (
                <p className="text-2xs text-rose-500 mt-1 flex items-center gap-1 font-medium animate-fade-in">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.taxCode}
                </p>
              ) : (
                <p className="text-2xs text-slate-400 mt-1">
                  Bắt buộc nhập: 10 chữ số (hoặc 13 chữ số / 10 số - 3 số chi nhánh)
                </p>
              )}
            </div>
          </div>

          {/* Hàng 2: Tên đại lý */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên đại lý / Cửa hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.name;
                    return next;
                  });
                }
              }}
              placeholder="Ví dụ: Đại Lý Bán Buôn An Bình..."
              className={`w-full px-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900'
                  : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
              }`}
              required
            />
            {errors.name && (
              <p className="text-2xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3 h-3 shrink-0" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Hàng 3: Khu vực & Nhóm khách hàng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Khu vực địa bàn <span className="text-rose-500">*</span>
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                {REGION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nhóm khách hàng
              </label>
              <select
                value={customerGroup}
                onChange={(e) => setCustomerGroup(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                {GROUP_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Hàng 4: Phân công nhân viên kinh doanh (SN-35) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nhân viên kinh doanh phụ trách chính (SN-35)
            </label>
            <select
              value={salesRepId}
              onChange={(e) => setSalesRepId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            >
              <option value="">-- Chưa phân công người phụ trách --</option>
              {salesReps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.fullName} ({rep.email}) — Đang quản lý {rep.assignedCustomerCount} đại lý
                </option>
              ))}
            </select>
            <p className="mt-1 text-2xs text-slate-400">
              Nhân viên được gán sẽ chịu trách nhiệm chăm sóc và quản lý đại lý trên địa bàn được phân công.
            </p>
          </div>

          {/* Hàng 5: Ô nhập Số điện thoại & Email chuẩn */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ô nhập Số điện thoại chuẩn - MẶC ĐỊNH 10 CHỮ SỐ */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số điện thoại liên hệ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Ví dụ: 0901234567"
                  maxLength={10}
                  className={`w-full pl-9.5 pr-3.5 py-2 text-sm bg-white border rounded-xl font-mono focus:outline-none focus:ring-2 transition-all ${
                    errors.phone
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900'
                      : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                  required
                />
              </div>
              {errors.phone ? (
                <p className="text-2xs text-rose-500 mt-1 flex items-center gap-1 font-medium animate-fade-in">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.phone}
                </p>
              ) : (
                <p className="text-2xs text-slate-400 mt-1">
                  Bắt đầu bằng số 0, đúng 10 chữ số
                </p>
              )}
            </div>

            {/* Ô nhập Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email đại lý
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.email;
                        return next;
                      });
                    }
                  }}
                  placeholder="daily@loha.vn"
                  className={`w-full pl-9.5 pr-3.5 py-2 text-sm bg-white border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.email
                      ? 'border-rose-400 bg-rose-50/20 focus:ring-rose-500/20 focus:border-rose-500 text-rose-900'
                      : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                  }`}
                />
              </div>
              {errors.email && (
                <p className="text-2xs text-rose-500 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Hàng 6: Địa chỉ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Địa chỉ kinh doanh
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành..."
                className="w-full pl-9.5 pr-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Hàng 7: Hạn mức công nợ & Số ngày nợ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hạn mức nợ (VND)
              </label>
              <input
                type="number"
                min="0"
                step="1000000"
                value={creditLimit}
                onChange={(e) => setCreditLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
              />
              {errors.creditLimit && (
                <p className="text-2xs text-rose-500 mt-1 font-medium">
                  {errors.creditLimit}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số ngày nợ tối đa (Ngày)
              </label>
              <input
                type="number"
                min="0"
                value={maxDebtDays}
                onChange={(e) => setMaxDebtDays(Number(e.target.value))}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-mono"
              />
              {errors.maxDebtDays && (
                <p className="text-2xs text-rose-500 mt-1 font-medium">
                  {errors.maxDebtDays}
                </p>
              )}
            </div>
          </div>

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 focus:outline-none transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:bg-indigo-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEdit ? 'Lưu thay đổi' : 'Tạo đại lý'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
