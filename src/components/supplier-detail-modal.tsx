import React from "react";
import {
  Building2,
  FileText,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  Edit2,
} from "lucide-react";
import { ModalLayout } from "./modal-layout";
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
  if (!isOpen || !supplier) return null;

  const isActive = supplier.status === "ACTIVE";
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

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title={supplier.name}
      subtitle={`Mã đối tác: ${supplier.code} • Hồ sơ chi tiết`}
      icon={<Building2 className="h-5 w-5" />}
      maxWidth="max-w-xl"
      bodyClassName="p-6 space-y-5 text-xs text-slate-700"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>

          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => {
                onClose();
                setTimeout(() => {
                  onEdit(supplier);
                }, 220);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <Edit2 className="h-4 w-4" />
              <span>Chỉnh sửa đối tác</span>
            </button>
          )}
        </div>
      }
    >
          {/* Thông tin pháp lý & thanh toán */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-3.5">
            <h3 className="font-bold text-slate-800 text-[13px] flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              Thông tin Doanh nghiệp & Thanh toán
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              {/* Mã nhà cung cấp */}
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Mã nhà cung cấp</span>
                <div className="mt-1">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/60 px-2.5 py-1 rounded-lg inline-block">
                    {supplier.code}
                  </span>
                </div>
              </div>

              {/* Trạng thái hoạt động */}
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Trạng thái hoạt động</span>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
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
              </div>

              {/* Mã số thuế */}
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Mã số thuế</span>
                <p className="font-semibold text-slate-800 text-xs mt-1">
                  {taxCode || <span className="text-slate-400 font-normal">Chưa cập nhật</span>}
                </p>
              </div>

              {/* Điều khoản thanh toán */}
              <div>
                <span className="text-[11px] text-slate-400 font-medium">Điều khoản thanh toán</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-800 text-xs">{paymentTerms}</span>
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
    </ModalLayout>
  );
};
