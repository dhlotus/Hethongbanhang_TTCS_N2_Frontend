import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, AlertCircle, RefreshCw, X } from 'lucide-react';
import { shipmentsService, type Shipment } from '../services/shipments.service';
import { ordersService } from '../services/orders.service';
import type { Order } from '../types/order';
import { showToast } from './toast';

export interface CreateShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  onSuccess?: (createdShipment: Shipment) => void;
}

export const CreateShipmentModal: React.FC<CreateShipmentModalProps> = ({
  isOpen,
  onClose,
  order,
  onSuccess,
}) => {
  const [orderCode, setOrderCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [carrierName, setCarrierName] = useState('Giao Hàng Nhanh');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [readyOrders, setReadyOrders] = useState<Order[]>([]);

  // Validation errors
  const [orderCodeError, setOrderCodeError] = useState<string | null>(null);
  const [customerNameError, setCustomerNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Hàm tạo mã vận đơn tự động chuẩn TRK-YYYY-XXXXXX
  const generateTrackingNumber = () => {
    const year = new Date().getFullYear();
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    return `TRK-${year}-${randomSuffix}`;
  };

  // Tải danh sách đơn hàng để tra cứu và gợi ý khi người dùng nhập mã đơn (chỉ lấy đơn đã duyệt chuẩn ERP)
  useEffect(() => {
    if (isOpen) {
      ordersService.getOrdersForShipment({ limit: 100 })
        .then((res) => {
          if (res?.data) {
            const VALID_STATUSES = new Set(['APPROVED', 'READY_TO_SHIP', 'PROCESSING']);
            const FORBIDDEN_STATUSES = new Set(['CANCELLED', 'DRAFT', 'PENDING', 'PENDING_APPROVAL', 'PENDING_INVENTORY_APPROVAL', 'REJECTED']);
            const valid = res.data.filter((o) => {
              const st = String(o.status || '').toUpperCase().trim();
              return VALID_STATUSES.has(st) && !FORBIDDEN_STATUSES.has(st);
            });
            setReadyOrders(valid);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Khởi tạo và tự động điền dữ liệu khi mở modal theo đơn hàng
  useEffect(() => {
    if (isOpen) {
      setOrderCode(order?.orderCode || '');
      setCustomerName(order?.customerName || '');

      // Tự động điền người nhận, số điện thoại, địa chỉ theo đơn hàng (không cần tự nhập)
      const initialReceiver =
        order?.deliveryPoint?.receiverName ||
        order?.deliveryPoint?.contactPerson ||
        order?.customerName ||
        '';
      const initialPhone =
        order?.deliveryPoint?.phone ||
        (order as any)?.phone ||
        (order as any)?.customerPhone ||
        '';
      const initialAddress =
        order?.deliveryPoint?.address ||
        (order as any)?.deliveryAddress ||
        (order as any)?.shippingAddress ||
        '';

      setReceiverName(initialReceiver);
      setPhone(initialPhone);
      setDeliveryAddress(initialAddress);
      setCarrierName('Giao Hàng Nhanh');
      // Mã vận đơn tự động tạo (cố định không cho sửa)
      setTrackingNumber(generateTrackingNumber());

      // Reset các lỗi validation
      setOrderCodeError(null);
      setCustomerNameError(null);
      setPhoneError(null);
      setAddressError(null);
    }
  }, [isOpen, order]);

  // Xử lý khi người dùng nhập hoặc chọn mã đơn hàng khác -> tự động điền thông tin
  const handleOrderCodeChange = (val: string) => {
    const upper = val.toUpperCase();
    setOrderCode(upper);
    const trimmed = upper.trim();
    if (!trimmed) {
      setOrderCodeError('Vui lòng nhập hoặc chọn Mã đơn hàng');
    } else if (trimmed.length < 4) {
      setOrderCodeError('Mã đơn hàng phải có tối thiểu 4 ký tự');
    } else {
      setOrderCodeError(null);
    }

    // Tra cứu đơn hàng khớp mã để tự động điền địa chỉ, số điện thoại và tên người nhận
    const matched = readyOrders.find(
      (o) => o.orderCode?.toUpperCase() === trimmed || o.id?.toUpperCase() === trimmed
    );
    if (matched) {
      if (matched.customerName) {
        setCustomerName(matched.customerName);
        setCustomerNameError(null);
      }
      const rec =
        matched.deliveryPoint?.receiverName ||
        matched.deliveryPoint?.contactPerson ||
        matched.customerName ||
        '';
      if (rec) setReceiverName(rec);

      const ph =
        matched.deliveryPoint?.phone ||
        (matched as any)?.phone ||
        (matched as any)?.customerPhone ||
        '';
      if (ph) {
        setPhone(ph);
        setPhoneError(validatePhoneInput(ph, false));
      }

      const addr =
        matched.deliveryPoint?.address ||
        (matched as any)?.deliveryAddress ||
        (matched as any)?.shippingAddress ||
        '';
      if (addr) {
        setDeliveryAddress(addr);
        setAddressError(null);
      }
    }
  };

  // Kiểm tra tính hợp lệ của số điện thoại
  const validatePhoneInput = (val: string, isSubmit = false): string | null => {
    const trimmed = (val || '').trim();
    if (!trimmed) {
      return isSubmit ? 'Vui lòng nhập số điện thoại người nhận hàng' : null;
    }
    if (/[^\d]/.test(trimmed)) {
      return 'Số điện thoại chỉ được chứa các chữ số (0-9), không chứa chữ hay ký tự đặc biệt';
    }
    if (!trimmed.startsWith('0')) {
      return 'Số điện thoại phải bắt đầu bằng số 0 (ví dụ: 0988xxxxxx)';
    }
    if (trimmed.length > 10) {
      return `Số điện thoại chỉ gồm đúng 10 chữ số (bạn đang nhập thừa ${trimmed.length - 10} số)`;
    }
    if (isSubmit && trimmed.length < 10) {
      return `Số điện thoại phải gồm đúng 10 chữ số (mới nhập ${trimmed.length}/10 số - còn thiếu ${10 - trimmed.length} số)`;
    }
    if (isSubmit && !/^(03|05|07|08|09|02)[0-9]{8}$/.test(trimmed)) {
      return 'Đầu số điện thoại không hợp lệ (hỗ trợ các đầu số 03, 05, 07, 08, 09, 02)';
    }
    return null;
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedOrderCode = orderCode.trim();
    const orderErr = !trimmedOrderCode
      ? 'Vui lòng nhập hoặc chọn Mã đơn hàng'
      : trimmedOrderCode.length < 4
      ? 'Mã đơn hàng phải có tối thiểu 4 ký tự'
      : null;

    const custErr = !customerName.trim()
      ? 'Vui lòng nhập Tên đại lý / Khách hàng'
      : customerName.trim().length < 2
      ? 'Tên đại lý phải có tối thiểu 2 ký tự'
      : null;

    const phoneErr = validatePhoneInput(phone, true);

    const addrErr = !deliveryAddress.trim()
      ? 'Vui lòng nhập Địa chỉ giao hàng'
      : deliveryAddress.trim().length < 5
      ? 'Địa chỉ giao hàng quá ngắn, vui lòng nhập chi tiết'
      : null;

    setOrderCodeError(orderErr);
    setCustomerNameError(custErr);
    setPhoneError(phoneErr);
    setAddressError(addrErr);

    if (orderErr || custErr || phoneErr || addrErr) {
      showToast('warning', phoneErr || orderErr || custErr || addrErr || 'Vui lòng kiểm tra lại thông tin');
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await shipmentsService.createShipment({
        orderId: order?.id || 'ord-unknown',
        orderCode: trimmedOrderCode,
        customerId: order?.customerId || 'cust-001',
        customerName: customerName.trim(),
        receiverName: receiverName.trim() || customerName.trim(),
        phone: phone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        carrierName: carrierName.trim() || 'Giao Hàng Nhanh',
        trackingNumber: trackingNumber.trim() || generateTrackingNumber(),
        status: 'PICKING',
      });

      showToast('success', `Tạo phiếu xuất kho thành công cho đơn ${trimmedOrderCode}`);
      if (onSuccess) {
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi tạo phiếu xuất kho');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <form
        onSubmit={handleCreateShipment}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 relative animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Plus className="w-5 h-5 text-blue-600" />
          Tạo Phiếu Xuất Kho & Giao Hàng Mới
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
          {/* 1. Mã đơn hàng */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã đơn hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              list="create-shipment-orders-list"
              value={orderCode}
              onChange={(e) => handleOrderCodeChange(e.target.value)}
              placeholder="Ví dụ: DH2610-66569"
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 font-mono text-sm transition-colors ${
                orderCodeError
                  ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20'
                  : 'border-slate-200 focus:ring-blue-500 bg-white'
              }`}
            />
            <datalist id="create-shipment-orders-list">
              {readyOrders.map((o) => (
                <option key={o.id || o.orderCode} value={o.orderCode || o.id}>
                  {o.customerName ? `${o.customerName} (${o.orderCode})` : o.orderCode}
                </option>
              ))}
            </datalist>
            {orderCodeError ? (
              <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {orderCodeError}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Gõ mã hoặc chọn từ danh sách đơn đã duyệt
              </p>
            )}
          </div>

          {/* 2. Tên đại lý / Khách hàng */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên đại lý / Khách hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                if (e.target.value.trim().length >= 2) setCustomerNameError(null);
              }}
              placeholder="Ví dụ: Đại lý Minh Khang"
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 text-sm transition-colors ${
                customerNameError
                  ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20'
                  : 'border-slate-200 focus:ring-blue-500 bg-white'
              }`}
            />
            {customerNameError && (
              <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {customerNameError}
              </p>
            )}
          </div>

          {/* 3. Người nhận */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Người nhận</label>
            <input
              type="text"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              placeholder="Tên người nhận hàng"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            />
          </div>

          {/* 4. Số điện thoại */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số điện thoại <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              maxLength={11}
              value={phone}
              onChange={(e) => {
                const val = e.target.value;
                setPhone(val);
                setPhoneError(validatePhoneInput(val, false));
              }}
              onBlur={() => {
                setPhoneError(validatePhoneInput(phone, true));
              }}
              placeholder="0988xxxxxx"
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 text-sm transition-colors ${
                phoneError
                  ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20'
                  : 'border-slate-200 focus:ring-blue-500 bg-white'
              }`}
            />
            {phoneError ? (
              <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {phoneError}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-0.5">
                Đúng 10 chữ số, bắt đầu bằng số 0
              </p>
            )}
          </div>

          {/* 5. Địa chỉ giao hàng */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Địa chỉ giao hàng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={deliveryAddress}
              onChange={(e) => {
                setDeliveryAddress(e.target.value);
                if (e.target.value.trim().length >= 5) setAddressError(null);
              }}
              placeholder="Địa chỉ kho đại lý nhận hàng..."
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 text-sm transition-colors ${
                addressError
                  ? 'border-rose-400 focus:ring-rose-200 focus:border-rose-500 bg-rose-50/20'
                  : 'border-slate-200 focus:ring-blue-500 bg-white'
              }`}
            />
            {addressError && (
              <p className="text-xs text-rose-500 font-medium mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {addressError}
              </p>
            )}
          </div>

          {/* 6. Đơn vị vận chuyển */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị vận chuyển</label>
            <input
              type="text"
              list="carrier-suggestions-list"
              value={carrierName}
              onChange={(e) => setCarrierName(e.target.value)}
              placeholder="Giao Hàng Nhanh / Viettel Post"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            />
            <datalist id="carrier-suggestions-list">
              <option value="Giao Hàng Nhanh (GHN)" />
              <option value="Viettel Post" />
              <option value="Giao Hàng Tiết Kiệm (GHTK)" />
              <option value="VNPost (Bưu Điện)" />
              <option value="Đội xe giao hàng nội bộ LOHA" />
            </datalist>
          </div>

          {/* 7. Mã vận đơn (Tự động tạo - Không thể thay đổi) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">Mã vận đơn</label>
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                Tự động tạo
              </span>
            </div>
            <input
              type="text"
              readOnly
              tabIndex={-1}
              value={trackingNumber}
              placeholder="TRK-2026-..."
              className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-100/90 text-slate-600 font-mono text-sm cursor-not-allowed select-none focus:outline-none"
              title="Mã vận đơn được hệ thống tự động sinh và không thể thay đổi"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              Mã vận đơn tự động tạo, không thể thay đổi
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Tạo Phiếu Xuất
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
};
