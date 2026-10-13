import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  AlertCircle,
  FileText,
  User,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './button';
import { ModalLayout } from './modal-layout';
import { ConfirmDialog } from './confirm-dialog';
import type { Supplier, CreateSupplierPayload, SupplierStatus } from '../types/supplier';

export interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSupplierPayload) => Promise<void>;
  initialData?: Supplier | null;
}

const COMMON_PAYMENT_TERMS = [
  { label: 'Tiền mặt / Khi nhận hàng (COD)', value: 'COD' },
  { label: 'Gối đầu 15 ngày (NET 15)', value: 'NET_15' },
  { label: 'Gối đầu 30 ngày (NET 30)', value: 'NET_30' },
  { label: 'Gối đầu 45 ngày (NET 45)', value: 'NET_45' },
  { label: 'Gối đầu 60 ngày (NET 60)', value: 'NET_60' },
  { label: 'Thanh toán trước 100%', value: 'PREPAID_100' },
];

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const isEditMode = Boolean(initialData);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('NET_30');
  const [status, setStatus] = useState<SupplierStatus>('ACTIVE');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const isDirty = isEditMode
    ? Boolean(
        name !== (initialData?.name || '') ||
        taxCode !== (initialData?.taxCode || initialData?.tax_code || '') ||
        contactName !== (initialData?.contactName || initialData?.contact_name || '') ||
        phone !== (initialData?.phone || '') ||
        email !== (initialData?.email || '') ||
        address !== (initialData?.address || '') ||
        paymentTerms !== (initialData?.paymentTerms || initialData?.payment_terms || 'NET_30') ||
        status !== (initialData?.status || 'ACTIVE') ||
        notes !== (initialData?.notes || '')
      )
    : Boolean(name || taxCode || contactName || phone || email || address || notes);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    onClose();
  }, [isSubmitting, onClose]);

  const handleCancelClick = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
      return;
    }
    handleClose();
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setCode(initialData.code || '');
        setName(initialData.name || '');
        setTaxCode(initialData.taxCode || initialData.tax_code || '');
        setContactName(initialData.contactName || initialData.contact_name || '');
        setPhone(initialData.phone || '');
        setEmail(initialData.email || '');
        setAddress(initialData.address || '');
        setPaymentTerms(initialData.paymentTerms || initialData.payment_terms || 'NET_30');
        setStatus(initialData.status || 'ACTIVE');
        setNotes(initialData.notes || '');
      } else {
        setCode('');
        setName('');
        setTaxCode('');
        setContactName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setPaymentTerms('NET_30');
        setStatus('ACTIVE');
        setNotes('');
      }
      setErrors({});
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  // Các hàm kiểm tra tính hợp lệ dữ liệu chặt chẽ và thông minh:
  const validateName = (val: string): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) return 'Vui lòng nhập tên nhà cung cấp / doanh nghiệp';
    if (trimmed.length < 3) return 'Tên nhà cung cấp phải có tối thiểu 3 ký tự';
    if (/^[0-9\W]+$/.test(trimmed)) return 'Tên nhà cung cấp không hợp lệ, không được chỉ gồm số hoặc ký tự đặc biệt';
    return null;
  };

  const validateTaxCode = (val: string, isSubmitting = false): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return isSubmitting ? 'Vui lòng nhập mã số thuế của nhà cung cấp' : null;
    }
    if (/[^\d]/.test(trimmed)) {
      return 'Mã số thuế chỉ được chứa các chữ số (0-9), không chứa chữ hay ký tự đặc biệt';
    }
    if (trimmed.length > 12) {
      return `Mã số thuế chỉ gồm đúng 12 chữ số (bạn đang nhập thừa ${trimmed.length - 12} số)`;
    }
    if (isSubmitting && trimmed.length !== 12) {
      return `Mã số thuế phải bao gồm đúng 12 chữ số (bạn mới nhập ${trimmed.length}/12 số - còn thiếu ${12 - trimmed.length} số)`;
    }
    return null;
  };

  const validateContactName = (val: string, isSubmitting = false): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return isSubmitting ? 'Vui lòng nhập tên người liên hệ đại diện' : null;
    }
    if (trimmed.length < 2) {
      return 'Tên người liên hệ phải có tối thiểu 2 ký tự';
    }
    if (!/^[a-zA-ZÀ-ỹ\s]+$/u.test(trimmed)) {
      return 'Tên người liên hệ không được chứa chữ số hoặc ký tự đặc biệt';
    }
    return null;
  };

  const validatePhone = (val: string, isSubmitting = false): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return isSubmitting ? 'Vui lòng nhập số điện thoại liên hệ' : null;
    }
    if (/[^\d]/.test(trimmed)) {
      return 'Số điện thoại chỉ được chứa các chữ số (0-9), không chứa chữ hay ký tự đặc biệt';
    }
    if (!trimmed.startsWith('0')) {
      return 'Số điện thoại phải bắt đầu bằng số 0 (ví dụ: 02838123456 hoặc 0901234567)';
    }
    if (trimmed.length > 11) {
      return `Số điện thoại tối đa 11 chữ số (bạn đang nhập thừa ${trimmed.length - 11} số)`;
    }
    if (isSubmitting && trimmed.length < 10) {
      return `Số điện thoại phải từ 10 đến 11 chữ số (bạn mới nhập ${trimmed.length}/10 số)`;
    }
    return null;
  };

  const validateAddress = (val: string, isSubmitting = false): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return isSubmitting ? 'Vui lòng nhập địa chỉ trụ sở hoặc kho xuất hàng' : null;
    }
    if (trimmed.length < 5) {
      return 'Địa chỉ quá ngắn, vui lòng nhập chi tiết địa chỉ (tối thiểu 5 ký tự)';
    }
    return null;
  };

  const validateEmail = (val: string): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) return null;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'Email không đúng định dạng hợp lệ (ví dụ: supply@loha.vn)';
    }
    return null;
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    const nameErr = validateName(name);
    if (nameErr) errs.name = nameErr;

    const taxErr = validateTaxCode(taxCode, true);
    if (taxErr) errs.taxCode = taxErr;

    const contactErr = validateContactName(contactName, true);
    if (contactErr) errs.contactName = contactErr;

    const phoneErr = validatePhone(phone, true);
    if (phoneErr) errs.phone = phoneErr;

    const addrErr = validateAddress(address, true);
    if (addrErr) errs.address = addrErr;

    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;

    if (isEditMode && code.trim() && /\s/.test(code.trim())) {
      errs.code = 'Mã nhà cung cấp không được chứa khoảng trắng';
    }

    if (Object.keys(errs).length > 0) {
      errs.form = 'Vui lòng kiểm tra và điền đầy đủ, chính xác các trường thông tin bắt buộc.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        code: isEditMode && code.trim() ? code.trim().toUpperCase() : undefined,
        name: name.trim(),
        taxCode: taxCode.trim() || undefined,
        contactName: contactName.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      });
      handleClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
      setErrors((prev) => ({ ...prev, form: message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={handleClose}
      closeOnOverlayClick={false}
      isDirty={isDirty}
      dirtyPromptMessage="Thông tin nhà cung cấp đang nhập dở chưa được lưu. Bạn có chắc chắn muốn thoát và bỏ thay đổi?"
      title={isEditMode ? 'Chỉnh sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
      subtitle={
        isEditMode
          ? initialData?.code
            ? `Mã NCC: ${initialData.code}`
            : 'Cập nhật hồ sơ đối tác'
          : 'Thêm đối tác cung ứng hàng hóa mới vào hệ thống'
      }
      icon={<Building2 className="h-5 w-5" />}
      maxWidth="max-w-2xl"
      bodyClassName="p-6 space-y-4"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelClick}
            disabled={isSubmitting}
            className="py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Hủy bỏ
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            loadingText="Đang lưu..."
            className="py-2 px-5 rounded-xl text-xs font-semibold cursor-pointer shadow-xs hover:shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" />
            {isEditMode ? 'Lưu thay đổi' : 'Tạo nhà cung cấp'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Hàng 1: Mã NCC & Trạng thái */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã nhà cung cấp
            </label>
            <input
              type="text"
              value={isEditMode ? code : ''}
              placeholder="Mã nhà cung cấp tự sinh"
              readOnly
              disabled
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 text-slate-500 cursor-not-allowed select-none transition-all uppercase placeholder:text-slate-400 font-medium"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {isEditMode
                ? 'Mã định danh duy nhất của nhà cung cấp'
                : 'Hệ thống sẽ tự động cấp mã định danh khi lưu'}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Trạng thái hoạt động
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as SupplierStatus)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all bg-white"
              disabled={isSubmitting}
            >
              <option value="ACTIVE">Đang giao dịch (ACTIVE)</option>
              <option value="INACTIVE">Ngừng hoạt động (INACTIVE)</option>
            </select>
          </div>
        </div>

        {/* Hàng 2: Tên NCC */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tên nhà cung cấp / Doanh nghiệp <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              const val = e.target.value;
              setName(val);
              const err = validateName(val);
              setErrors((prev) => {
                const next = { ...prev };
                if (err) next.name = err;
                else delete next.name;
                return next;
              });
            }}
            onBlur={() => {
              const err = validateName(name);
              if (err) setErrors((prev) => ({ ...prev, name: err }));
            }}
            placeholder="VD: Công ty Cổ phần Nước giải khát LOHA"
            className={`w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:outline-none transition-all ${
              errors.name
                ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
            }`}
            disabled={isSubmitting}
          />
          {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
        </div>

        {/* Hàng 3: MST & Người liên hệ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã số thuế <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                maxLength={13}
                value={taxCode}
                onChange={(e) => {
                  const val = e.target.value;
                  setTaxCode(val);
                  const err = validateTaxCode(val, false);
                  setErrors((prev) => {
                    const next = { ...prev };
                    if (err) next.taxCode = err;
                    else delete next.taxCode;
                    return next;
                  });
                }}
                onBlur={() => {
                  const err = validateTaxCode(taxCode, true);
                  if (err) setErrors((prev) => ({ ...prev, taxCode: err }));
                }}
                placeholder="VD: 031234567890"
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:ring-2 focus:outline-none transition-all ${
                  errors.taxCode
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
                disabled={isSubmitting}
              />
            </div>
            {errors.taxCode && <p className="text-[11px] text-rose-500 mt-1">{errors.taxCode}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Người liên hệ đại diện <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={contactName}
                onChange={(e) => {
                  const val = e.target.value;
                  setContactName(val);
                  const err = validateContactName(val, false);
                  setErrors((prev) => {
                    const next = { ...prev };
                    if (err) next.contactName = err;
                    else delete next.contactName;
                    return next;
                  });
                }}
                onBlur={() => {
                  const err = validateContactName(contactName, true);
                  if (err) setErrors((prev) => ({ ...prev, contactName: err }));
                }}
                placeholder="VD: Ông Đỗ Quốc Tuấn"
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:ring-2 focus:outline-none transition-all ${
                  errors.contactName
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
                disabled={isSubmitting}
              />
            </div>
            {errors.contactName && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.contactName}</p>
            )}
          </div>
        </div>

        {/* Hàng 4: SĐT & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số điện thoại liên hệ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="tel"
                maxLength={11}
                value={phone}
                onChange={(e) => {
                  const val = e.target.value;
                  setPhone(val);
                  const err = validatePhone(val, false);
                  setErrors((prev) => {
                    const next = { ...prev };
                    if (err) next.phone = err;
                    else delete next.phone;
                    return next;
                  });
                }}
                onBlur={() => {
                  const err = validatePhone(phone, true);
                  if (err) setErrors((prev) => ({ ...prev, phone: err }));
                }}
                placeholder="VD: 02838123456 hoặc 0901234567"
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:ring-2 focus:outline-none transition-all ${
                  errors.phone
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
                disabled={isSubmitting}
              />
            </div>
            {errors.phone && <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Địa chỉ Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  const val = e.target.value;
                  setEmail(val);
                  const err = validateEmail(val);
                  setErrors((prev) => {
                    const next = { ...prev };
                    if (err) next.email = err;
                    else delete next.email;
                    return next;
                  });
                }}
                onBlur={() => {
                  const err = validateEmail(email);
                  if (err) setErrors((prev) => ({ ...prev, email: err }));
                }}
                placeholder="VD: supply@loha.vn"
                className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:ring-2 focus:outline-none transition-all ${
                  errors.email
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
                }`}
                disabled={isSubmitting}
              />
            </div>
            {errors.email && <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>}
          </div>
        </div>

        {/* Hàng 5: Địa chỉ trụ sở / kho */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Địa chỉ trụ sở / Kho xuất hàng <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={address}
              onChange={(e) => {
                const val = e.target.value;
                setAddress(val);
                const err = validateAddress(val, false);
                setErrors((prev) => {
                  const next = { ...prev };
                  if (err) next.address = err;
                  else delete next.address;
                  return next;
                });
              }}
              onBlur={() => {
                const err = validateAddress(address, true);
                if (err) setErrors((prev) => ({ ...prev, address: err }));
              }}
              placeholder="VD: KCN Tân Bình, Tây Thạnh, Tân Phú, TP.HCM"
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs focus:ring-2 focus:outline-none transition-all ${
                errors.address
                  ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
              }`}
              disabled={isSubmitting}
            />
          </div>
          {errors.address && <p className="text-[11px] text-rose-500 mt-1">{errors.address}</p>}
        </div>

        {/* Hàng 6: Điều khoản thanh toán */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Điều khoản thanh toán (Payment Terms)
          </label>
          <div className="relative mb-2">
            <CreditCard className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="VD: NET_30 hoặc COD"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              disabled={isSubmitting}
            />
          </div>
          {/* Gợi ý chọn nhanh */}
          <div className="flex flex-wrap gap-1.5">
            {COMMON_PAYMENT_TERMS.map((term) => (
              <button
                key={term.value}
                type="button"
                onClick={() => setPaymentTerms(term.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer border ${
                  paymentTerms === term.value
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {term.label}
              </button>
            ))}
          </div>
        </div>

        {/* Hàng 7: Ghi chú */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ghi chú hợp tác / Mặt hàng cung cấp chính
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="VD: Cung ứng nước đóng chai, bao bì lon 330ml..."
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all resize-none"
            disabled={isSubmitting}
          />
        </div>
      </form>

      <ConfirmDialog
        isOpen={showDiscardConfirm}
        onCancel={() => setShowDiscardConfirm(false)}
        onConfirm={() => {
          setShowDiscardConfirm(false);
          handleClose();
        }}
        title="Bỏ thay đổi nhà cung cấp?"
        message="Thông tin đối tác nhà cung cấp đang nhập dở chưa được lưu. Bạn có chắc chắn muốn thoát mà không lưu?"
        confirmText="Rời khỏi & Bỏ thay đổi"
        cancelText="Tiếp tục chỉnh sửa"
        type="warning"
      />
    </ModalLayout>
  );
};
