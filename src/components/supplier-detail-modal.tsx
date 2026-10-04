import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Building2,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Receipt,
  X,
  Edit2,
  Info,
} from "lucide-react";
import type { Supplier } from "../types/supplier";

export interface SupplierDetailModalProps {
  supplier: Supplier | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (supplier: Supplier) => void;
  canEdit?: boolean;
}

export const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  supplier,
  isOpen,
  onClose,
  onEdit,
  canEdit = false,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 220);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen || !supplier) return null;
  if (typeof document === "undefined") return null;

  const isActive = supplier.status === "ACTIVE";
  const hasReceipts = Boolean(supplier.hasReceipts ?? supplier.has_receipts);
  const taxCode = supplier.taxCode || supplier.tax_code;
  const contactName = supplier.contactName || supplier.contact_name;
  const paymentTerms = supplier.paymentTerms || supplier.payment_terms || "NET_30";
  const createdAt = supplier.createdAt || supplier.created_at;
  const updatedAt = supplier.updatedAt || supplier.updated_at;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-[2px] transition-all ${
        isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
      }`}
    >
      <div
        className={`relative w-full max-w-xl rounded-2xl sm:rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] ${
          isClosing ? "animate-modal-out" : "animate-modal-in"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/60 shadow-2xs">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2 py-0.5 rounded-md shrink-0">
                  {supplier.code}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                      : "bg-slate-100 text-slate-600 border border-slate-200/50"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isActive ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                  />
                  {isActive ? "Đang giao dịch" : "Ngừng giao dịch"}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 truncate mt-0.5" title={supplier.name}>
                {supplier.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 ml-2"
            title="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-slate-700">
          {/* Thông tin pháp lý & thanh toán */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
            <h3 className="font-bold text-slate-800 text-[13px] flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Thông tin Doanh nghiệp & Thanh toán
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Mã số thuế</span>
                <p className="font-semibold text-slate-800 text-xs mt-0.5">
                  {taxCode || <span className="text-slate-400 font-normal">Chưa cập nhật</span>}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-medium">Điều khoản thanh toán</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800 text-xs">{paymentTerms}</span>
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[11px] text-slate-400 font-medium">Lịch sử phiếu nhập kho</span>
                <div className="mt-1">
                  {hasReceipts ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100">
                      <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                      Đã phát sinh chứng từ phiếu nhập kho trong hệ thống
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 text-xs font-medium">
                      <Info className="h-3.5 w-3.5" />
                      Chưa phát sinh phiếu nhập kho (có thể xóa an toàn)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Thông tin liên hệ */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
            <h3 className="font-bold text-slate-800 text-[13px] flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" />
              Đại diện Liên hệ & Địa chỉ
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Người liên hệ</span>
                <p className="font-semibold text-slate-800 text-xs mt-0.5">
                  {contactName || <span className="text-slate-400 font-normal">—</span>}
                </p>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-medium">Số điện thoại</span>
                <p className="font-semibold text-slate-800 text-xs mt-0.5">
                  {supplier.phone ? (
                    <a
                      href={`tel:${supplier.phone}`}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="h-3 w-3 text-slate-400" />
                      {supplier.phone}
                    </a>
                  ) : (
                    <span className="text-slate-400 font-normal">—</span>
                  )}
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[11px] text-slate-400 font-medium">Email liên hệ</span>
                <p className="font-semibold text-slate-800 text-xs mt-0.5">
                  {supplier.email ? (
                    <a
                      href={`mailto:${supplier.email}`}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Mail className="h-3 w-3 text-slate-400" />
                      {supplier.email}
                    </a>
                  ) : (
                    <span className="text-slate-400 font-normal">—</span>
                  )}
                </p>
              </div>

              <div className="sm:col-span-2">
                <span className="text-[11px] text-slate-400 font-medium">Địa chỉ trụ sở / Kho hàng</span>
                <p className="font-medium text-slate-800 text-xs mt-0.5 flex items-start gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{supplier.address || <span className="text-slate-400 font-normal">Chưa cập nhật địa chỉ</span>}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Ghi chú & Thời gian */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3">
            <h3 className="font-bold text-slate-800 text-[13px] flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              Ghi chú & Thời gian hệ thống
            </h3>
            <div className="space-y-2 pt-1">
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Ghi chú đối tác</span>
                <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200/70 mt-1 whitespace-pre-wrap">
                  {supplier.notes ? supplier.notes : <span className="text-slate-400 italic">Không có ghi chú thêm</span>}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                <div>
                  <span>Ngày khởi tạo: </span>
                  <span className="font-medium text-slate-700">{formatDate(createdAt)}</span>
                </div>
                <div>
                  <span>Cập nhật gần nhất: </span>
                  <span className="font-medium text-slate-700">{formatDate(updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>

          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => {
                handleClose();
                setTimeout(() => {
                  onEdit(supplier);
                }, 220);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Chỉnh sửa đối tác</span>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
