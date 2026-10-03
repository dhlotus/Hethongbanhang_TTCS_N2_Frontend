import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  AlertCircle,
  FileText,
  User,
  CheckCircle2,
} from "lucide-react";
import { Button } from "./button";
import type {
  Supplier,
  CreateSupplierPayload,
  SupplierStatus,
} from "../types/supplier";

export interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateSupplierPayload) => Promise<void>;
  initialData?: Supplier | null;
}

const COMMON_PAYMENT_TERMS = [
  { label: "Tiền mặt / Khi nhận hàng (COD)", value: "COD" },
  { label: "Gối đầu 15 ngày (NET 15)", value: "NET_15" },
  { label: "Gối đầu 30 ngày (NET 30)", value: "NET_30" },
  { label: "Gối đầu 45 ngày (NET 45)", value: "NET_45" },
  { label: "Gối đầu 60 ngày (NET 60)", value: "NET_60" },
  { label: "Thanh toán trước 100%", value: "PREPAID_100" },
];

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
}) => {
  const isEditMode = Boolean(initialData);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [taxCode, setTaxCode] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("NET_30");
  const [status, setStatus] = useState<SupplierStatus>("ACTIVE");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code || "");
      setName(initialData.name || "");
      setTaxCode(initialData.taxCode || initialData.tax_code || "");
      setContactName(initialData.contactName || initialData.contact_name || "");
      setPhone(initialData.phone || "");
      setEmail(initialData.email || "");
      setAddress(initialData.address || "");
      setPaymentTerms(
        initialData.paymentTerms || initialData.payment_terms || "NET_30"
      );
      setStatus(initialData.status || "ACTIVE");
      setNotes(initialData.notes || "");
    } else {
      setCode("");
      setName("");
      setTaxCode("");
      setContactName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setPaymentTerms("NET_30");
      setStatus("ACTIVE");
      setNotes("");
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) {
      errs.name = "Tên nhà cung cấp không được để trống";
    }

    if (code.trim() && /\s/.test(code.trim())) {
      errs.code = "Mã nhà cung cấp không được chứa khoảng trắng";
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Email không đúng định dạng hợp lệ";
    }

    if (phone.trim() && !/^[0-9+\s\-().]{8,20}$/.test(phone.trim())) {
      errs.phone = "Số điện thoại không hợp lệ (8 - 20 chữ số)";
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
        code: code.trim() ? code.trim().toUpperCase() : undefined,
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
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Đã có lỗi xảy ra";
      setErrors((prev) => ({ ...prev, form: message }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100/50 shadow-2xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                {isEditMode
                  ? "Chỉnh sửa nhà cung cấp"
                  : "Thêm nhà cung cấp mới"}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditMode
                  ? `Cập nhật thông tin đối tác ${initialData?.code || ""}`
                  : "Khai báo đối tác cung ứng hàng hóa cho hệ thống kho"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VD: NCC-001 (Bỏ trống để tự sinh)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all uppercase"
                disabled={isSubmitting}
              />
              {errors.code && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.code}</p>
              )}
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
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Công ty Cổ phần Nước giải khát LOHA"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Hàng 3: MST & Người liên hệ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã số thuế (MST)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                  placeholder="VD: 0312345678"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Người liên hệ đại diện
              </label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="VD: Ông Đỗ Quốc Tuấn"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Hàng 4: SĐT & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số điện thoại liên hệ
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="VD: 02838123456 hoặc 0901234567"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  disabled={isSubmitting}
                />
              </div>
              {errors.phone && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: supply@loha.vn"
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>
              )}
            </div>
          </div>

          {/* Hàng 5: Địa chỉ trụ sở / kho */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Địa chỉ trụ sở / Kho xuất hàng
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="VD: KCN Tân Bình, Tây Thạnh, Tân Phú, TP.HCM"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                disabled={isSubmitting}
              />
            </div>
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
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
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
            {isEditMode ? "Lưu thay đổi" : "Tạo nhà cung cấp"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
