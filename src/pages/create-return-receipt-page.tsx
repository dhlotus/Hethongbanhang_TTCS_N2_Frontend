import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  Package,
  Warehouse,
  Save,
  RefreshCw,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import {
  returnsService,
  type ReturnConditionType,
  type EligibleInvoice,
  type InvoiceLineDetail,
} from '../services/returns.service';
import { customerService } from '../services/customer.service';
import type { Customer } from '../types/customer.types';
import { warehouseService } from '../services/warehouse.service';
import type { Warehouse as SystemWarehouse } from '../types/warehouse.types';
import { showToast } from '../components/toast';

interface ReturnItemRow {
  productId: string;
  productSku: string;
  productName: string;
  unit: string;
  purchasedQuantity: number;
  alreadyReturnedQuantity: number;
  remainingReturnableQuantity: number;
  unitPrice: number;
  selected: boolean;
  returnQuantity: number;
  conditionType: ReturnConditionType;
  availableBatches?: string[];
  batchNumber: string;
  subReason: string;
}

const formatVND = (val: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);

export const CreateReturnReceiptPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Danh sách đại lý
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [selectedAgencyId, setSelectedAgencyId] = useState<string>(
    searchParams.get('agencyId') || '',
  );

  // Danh sách hóa đơn / đơn hàng DELIVERED khả dụng
  const [eligibleInvoices, setEligibleInvoices] = useState<EligibleInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    searchParams.get('invoiceId') || '',
  );

  // Dòng sản phẩm
  const [loadingLines, setLoadingLines] = useState(false);
  const [itemRows, setItemRows] = useState<ReturnItemRow[]>([]);

  // Danh mục kho thực tế trên hệ thống
  const [warehouses, setWarehouses] = useState<SystemWarehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [generalReason, setGeneralReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1a. Tải danh sách kho thực tế từ hệ thống
  useEffect(() => {
    setLoadingWarehouses(true);
    warehouseService
      .getWarehouses()
      .then((res) => {
        const list: SystemWarehouse[] = Array.isArray(res) ? res : res?.data || [];
        const activeList = list.filter((w) => w.status !== 'INACTIVE');
        setWarehouses(activeList);
        if (activeList.length > 0 && !selectedWarehouseId) {
          setSelectedWarehouseId(activeList[0].id);
        }
      })
      .catch(() => {
        showToast('error', 'Không thể tải danh mục kho');
      })
      .finally(() => setLoadingWarehouses(false));
  }, []);

  // 1b. Tải danh sách đại lý khi vào trang
  useEffect(() => {
    setLoadingCustomers(true);
    customerService
      .getCustomers({ limit: 100 })
      .then((res) => {
        const list = res.data || [];
        setCustomers(list);
        if (list.length > 0 && !selectedAgencyId) {
          setSelectedAgencyId(list[0].id);
        }
      })
      .catch(() => {
        showToast('error', 'Không thể tải danh sách đại lý');
      })
      .finally(() => setLoadingCustomers(false));
  }, []);

  // 2. Tải danh sách hóa đơn / đơn hàng đã giao thành công (DELIVERED) khi chọn đại lý
  useEffect(() => {
    if (selectedAgencyId) {
      setLoadingInvoices(true);
      setSelectedInvoiceId('');
      setItemRows([]);
      returnsService
        .getEligibleInvoices(selectedAgencyId)
        .then((res) => {
          setEligibleInvoices(res || []);
          if (res && res.length > 0) {
            setSelectedInvoiceId(res[0].id || res[0].code);
          }
        })
        .catch(() => {
          setEligibleInvoices([]);
        })
        .finally(() => setLoadingInvoices(false));
    } else {
      setEligibleInvoices([]);
      setItemRows([]);
    }
  }, [selectedAgencyId]);

  // 3. Tải các dòng sản phẩm của hóa đơn được chọn
  useEffect(() => {
    if (selectedInvoiceId) {
      setLoadingLines(true);
      returnsService
        .getInvoiceLines(selectedInvoiceId)
        .then((res) => {
          const rows: ReturnItemRow[] = (res.lines || []).map((l: InvoiceLineDetail) => ({
            productId: l.productId,
            productSku: l.productSku,
            productName: l.productName,
            unit: l.unit,
            purchasedQuantity: l.purchasedQuantity,
            alreadyReturnedQuantity: l.alreadyReturnedQuantity,
            remainingReturnableQuantity: l.remainingReturnableQuantity,
            unitPrice: l.unitPrice,
            selected: l.remainingReturnableQuantity > 0,
            returnQuantity: l.remainingReturnableQuantity > 0 ? 1 : 0,
            conditionType: 'GOOD',
            availableBatches: l.availableBatches || [],
            batchNumber: (l.availableBatches && l.availableBatches.length > 0) ? l.availableBatches[0] : '',
            subReason: '',
          }));
          setItemRows(rows);
        })
        .catch(() => {
          setItemRows([]);
        })
        .finally(() => setLoadingLines(false));
    } else {
      setItemRows([]);
    }
  }, [selectedInvoiceId]);

  // Toggle chọn sản phẩm
  const handleToggleRow = (index: number) => {
    setItemRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], selected: !updated[index].selected };
      return updated;
    });
  };

  // Chọn tất cả
  const handleSelectAll = (checked: boolean) => {
    setItemRows((prev) =>
      prev.map((r) => ({
        ...r,
        selected: r.remainingReturnableQuantity > 0 ? checked : false,
      })),
    );
  };

  // Đổi số lượng trả
  const handleQuantityChange = (index: number, rawVal: string) => {
    setItemRows((prev) => {
      const updated = [...prev];
      const max = updated[index].remainingReturnableQuantity;
      // Chỉ giữ các ký tự số
      const digitsOnly = rawVal.replace(/[^\d]/g, '');
      if (!digitsOnly) {
        updated[index] = { ...updated[index], returnQuantity: 0 };
        return updated;
      }
      // Parse int để tự động loại bỏ số 0 thừa ở đầu (ví dụ: '01' -> 1, '000' -> 0)
      const parsed = parseInt(digitsOnly, 10);
      const safeVal = Math.max(0, Math.min(max, isNaN(parsed) ? 0 : parsed));
      updated[index] = { ...updated[index], returnQuantity: safeVal };
      return updated;
    });
  };

  // Đổi tình trạng hàng (GOOD / DAMAGED)
  const handleConditionChange = (index: number, condition: ReturnConditionType) => {
    setItemRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], conditionType: condition };
      return updated;
    });
  };

  // Đổi số lô
  const handleBatchChange = (index: number, val: string) => {
    setItemRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], batchNumber: val };
      return updated;
    });
  };

  // Tổng hợp tính toán
  const selectedItems = useMemo(
    () => itemRows.filter((r) => r.selected && r.returnQuantity > 0),
    [itemRows],
  );

  const totalRefundEstimated = useMemo(
    () => selectedItems.reduce((sum, r) => sum + r.returnQuantity * r.unitPrice, 0),
    [selectedItems],
  );

  const totalQuantityToReturn = useMemo(
    () => selectedItems.reduce((sum, r) => sum + r.returnQuantity, 0),
    [selectedItems],
  );

  const currentAgency = useMemo(
    () => customers.find((c) => c.id === selectedAgencyId),
    [customers, selectedAgencyId],
  );

  // Submit tạo phiếu trả hàng
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAgencyId) {
      showToast('error', 'Vui lòng chọn đại lý trả hàng');
      return;
    }
    if (!selectedInvoiceId) {
      showToast('error', 'Vui lòng chọn hóa đơn gốc đã giao thành công');
      return;
    }
    if (!generalReason.trim()) {
      showToast('error', 'Vui lòng nhập lý do trả hàng tổng quát');
      return;
    }
    if (selectedItems.length === 0) {
      showToast('error', 'Vui lòng tích chọn ít nhất 1 sản phẩm và nhập số lượng trả > 0');
      return;
    }

    // Validate hạn mức số lượng từng dòng
    for (const item of selectedItems) {
      if (item.returnQuantity > item.remainingReturnableQuantity) {
        showToast(
          'error',
          `Sản phẩm ${item.productName} vượt quá số lượng tối đa còn được trả (${item.remainingReturnableQuantity} ${item.unit})`,
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await returnsService.createReturnReceipt({
        original_invoice_id: selectedInvoiceId,
        agency_id: selectedAgencyId,
        warehouse_id: selectedWarehouseId,
        reason: generalReason.trim(),
        items: selectedItems.map((it) => ({
          product_id: it.productId,
          product_sku: it.productSku,
          product_name: it.productName,
          unit: it.unit,
          batch_number: it.batchNumber.trim() || undefined,
          quantity: it.returnQuantity,
          unit_price: it.unitPrice,
          condition_type: it.conditionType,
          sub_reason: it.subReason.trim() || undefined,
        })),
      });

      // Bắn sự kiện realtime cho hệ thống chuông thông báo
      window.dispatchEvent(
        new CustomEvent('loha_return_created', {
          detail: {
            ...res,
            agencyName: currentAgency?.name || res.agencyName || 'Đại lý',
            totalRefundAmount: totalRefundEstimated,
          },
        }),
      );

      showToast(
        'success',
        `Lập phiếu trả hàng ${res.code} thành công! Phiếu đang chờ Quản lý kho duyệt nhận hàng.`,
      );
      navigate('/accounting/returns');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi lập phiếu trả hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-16">
      {/* ── THANH ĐIỀU HƯỚNG: QUAY LẠI VÀ HỦY BỎ Ở 2 GÓC ── */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <Link
          to="/accounting/returns"
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs"
          title="Quay lại danh sách phiếu trả hàng"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Quay lại</span>
        </Link>

        <Link
          to="/accounting/returns"
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
        >
          Hủy bỏ
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── KHỐI 1: THÔNG TIN ĐẠI LÝ & HÓA ĐƠN GỐC ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">1. Thông tin đại lý & Hóa đơn gốc</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1.1 Chọn Đại lý */}
            <div>
              <label htmlFor="select-agency" className="block text-xs font-bold text-slate-700 mb-1.5">
                Chọn đại lý trả hàng <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-agency"
                value={selectedAgencyId}
                onChange={(e) => setSelectedAgencyId(e.target.value)}
                disabled={loadingCustomers}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </option>
                ))}
              </select>
              {currentAgency && (
                <div className="mt-1.5 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700">Công nợ hiện tại:</span>
                  <span className="text-rose-600 font-bold font-mono">
                    {formatVND(currentAgency.currentDebt || 0)}
                  </span>
                </div>
              )}
            </div>

            {/* 1.2 Chọn Hóa đơn gốc */}
            <div>
              <label htmlFor="select-invoice" className="block text-xs font-bold text-slate-700 mb-1.5">
                Hóa đơn gốc đã giao thành công <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-invoice"
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                disabled={loadingInvoices || eligibleInvoices.length === 0}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors"
              >
                {eligibleInvoices.length === 0 ? (
                  <option value="">(Không có đơn hàng/hóa đơn nào đã giao)</option>
                ) : (
                  eligibleInvoices.map((inv) => (
                    <option key={inv.id || inv.code} value={inv.id || inv.code}>
                      {inv.code} {inv.orderCode && inv.orderCode !== inv.code ? `(${inv.orderCode})` : ''} - {formatVND(inv.totalAmount)}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* 1.3 Kho nhận hàng trả */}
            <div>
              <label htmlFor="select-warehouse" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Warehouse className="w-3.5 h-3.5 text-slate-500" />
                <span>Kho tiếp nhận hàng trả</span>
                <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-warehouse"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                disabled={loadingWarehouses}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors disabled:bg-slate-50"
              >
                {loadingWarehouses ? (
                  <option value="">Đang nạp danh sách kho...</option>
                ) : warehouses.length === 0 ? (
                  <option value="">(Không có kho khả dụng)</option>
                ) : (
                  warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.code})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {/* ── KHỐI 2: DANH SÁCH DÒNG SẢN PHẨM TRẢ (KIỂM SOÁT HẠN MỨC) ── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">2. Chi tiết sản phẩm trả & tình trạng hàng</h2>
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Đã chọn: <strong className="text-indigo-600 font-bold">{selectedItems.length}</strong> dòng</span>
              <span>•</span>
              <span>Tổng SL trả: <strong className="text-slate-900 font-bold">{totalQuantityToReturn}</strong></span>
            </div>
          </div>

          {loadingLines ? (
            <div className="py-12 text-center text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
              <p className="text-sm">Đang nạp chi tiết các dòng sản phẩm của hóa đơn...</p>
            </div>
          ) : itemRows.length === 0 ? (
            <div className="py-10 text-center text-slate-400 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
              <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm">Chưa có dòng sản phẩm nào. Vui lòng chọn hóa đơn gốc ở trên.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={itemRows.length > 0 && itemRows.every((r) => r.selected || r.remainingReturnableQuantity === 0)}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </th>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3 text-right">SL Mua</th>
                    <th className="p-3 text-right">Đã trả</th>
                    <th className="p-3 text-right">SL Còn lại</th>
                    <th className="p-3 text-center w-28">SL Trả</th>
                    <th className="p-3 w-48">Tình trạng nhập kho</th>
                    <th className="p-3 w-48">Số lô</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemRows.map((row, idx) => {
                    const isExceeded = row.returnQuantity > row.remainingReturnableQuantity;
                    const isRowDisabled = row.remainingReturnableQuantity <= 0;

                    return (
                      <tr
                        key={`${row.productId}-${idx}`}
                        className={`transition-colors ${
                          row.selected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'
                        } ${isRowDisabled ? 'opacity-50 bg-slate-50/80' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            disabled={isRowDisabled}
                            onChange={() => handleToggleRow(idx)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                          />
                        </td>

                        {/* Tên & SKU•ĐVT */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{row.productName}</div>
                          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {row.productSku}•{row.unit}
                          </div>
                        </td>

                        {/* SL Mua */}
                        <td className="p-3 text-right font-mono font-medium text-slate-700">
                          {row.purchasedQuantity}
                        </td>

                        {/* Đã trả */}
                        <td className="p-3 text-right font-mono text-slate-500">
                          {row.alreadyReturnedQuantity}
                        </td>

                        {/* SL Còn lại */}
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {row.remainingReturnableQuantity}
                        </td>

                        {/* Nhập SL Trả */}
                        <td className="p-3 text-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.returnQuantity === 0 ? '0' : String(row.returnQuantity)}
                            onFocus={(e) => e.target.select()}
                            disabled={!row.selected || isRowDisabled}
                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                            className={`w-20 h-8 px-2 text-center text-xs font-mono font-bold rounded-lg border transition-colors ${
                              isExceeded
                                ? 'border-rose-500 text-rose-600 bg-rose-50 focus:ring-rose-500/20'
                                : 'border-slate-300 text-slate-900 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                            } disabled:bg-slate-100 disabled:text-slate-400`}
                          />
                          {isExceeded && (
                            <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                              Tối đa {row.remainingReturnableQuantity}!
                            </div>
                          )}
                        </td>

                        {/* Tình trạng hàng (GOOD / DAMAGED) */}
                        <td className="p-3">
                          <select
                            value={row.conditionType}
                            disabled={!row.selected || isRowDisabled}
                            onChange={(e) => handleConditionChange(idx, e.target.value as ReturnConditionType)}
                            className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors disabled:bg-slate-100"
                          >
                            <option value="GOOD">Hàng tốt (Kho bán)</option>
                            <option value="DAMAGED">Hàng lỗi (Kho riêng)</option>
                          </select>
                        </td>

                        {/* Số lô */}
                        <td className="p-3 w-48">
                          {row.availableBatches && row.availableBatches.length > 0 ? (
                            <select
                              value={row.batchNumber}
                              disabled={!row.selected || isRowDisabled}
                              onChange={(e) => handleBatchChange(idx, e.target.value)}
                              className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors disabled:bg-slate-100 font-mono cursor-pointer"
                            >
                              <option value="">-- Chọn số lô --</option>
                              {row.availableBatches.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic block py-1 whitespace-nowrap">
                              Sản phẩm không có mã lô hàng
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── KHỐI 3: LÝ DO TRẢ HÀNG & TÓM TẮT TÀI CHÍNH ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* 3.1 Lý do trả hàng */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
            <div className="space-y-3 flex-1 flex flex-col">
              <label htmlFor="general-reason" className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>Lý do trả hàng</span>
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="general-reason"
                rows={5}
                value={generalReason}
                onChange={(e) => setGeneralReason(e.target.value)}
                placeholder="Nhập lý do trả hàng"
                className="w-full flex-1 min-h-[130px] p-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors resize-none"
              />
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Phiếu sau khi lưu sẽ ở trạng thái <strong>Chờ duyệt kho</strong>. Quản lý kho xác nhận nhận hàng mới cộng tồn và giảm trừ công nợ.
              </span>
            </div>
          </div>

          {/* 3.2 Bảng tóm tắt tài chính hoàn trả (Bao gồm đơn giá & thành tiền từng dòng) */}
          <div className="bg-linear-to-br from-indigo-50/80 via-white to-slate-50 rounded-2xl border border-indigo-100 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-indigo-100 pb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Tóm tắt hoàn trả</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                  {selectedItems.length} mặt hàng
                </span>
              </div>

              {/* Danh sách đơn giá & thành tiền từng mặt hàng được chọn */}
              {selectedItems.length > 0 && (
                <div className="mt-3 space-y-2 border-b border-indigo-100 pb-3 max-h-44 overflow-y-auto divide-y divide-indigo-50/60">
                  {selectedItems.map((it) => (
                    <div key={it.productId} className="pt-1.5 first:pt-0 text-xs">
                      <div className="font-semibold text-slate-800 truncate" title={it.productName}>
                        {it.productName}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono mt-0.5">
                        <span>
                          {it.returnQuantity} {it.unit} × {formatVND(it.unitPrice)}
                        </span>
                        <span className="font-bold text-slate-900">
                          {formatVND(it.returnQuantity * it.unitPrice)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 mt-3 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Tổng số lượng sản phẩm:</span>
                  <span className="font-mono font-bold text-slate-900">{totalQuantityToReturn}</span>
                </div>
                <div className="flex justify-between">
                  <span>Hàng tốt (nhập kho bán):</span>
                  <span className="font-mono font-medium text-emerald-700">
                    {selectedItems.filter((i) => i.conditionType === 'GOOD').reduce((s, i) => s + i.returnQuantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hàng lỗi (vào kho lỗi):</span>
                  <span className="font-mono font-medium text-amber-700">
                    {selectedItems.filter((i) => i.conditionType === 'DAMAGED').reduce((s, i) => s + i.returnQuantity, 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-indigo-200 pt-3">
              <div className="text-xs font-medium text-slate-500">Tổng tiền hoàn ước tính:</div>
              <div className="text-2xl font-bold font-mono text-indigo-700 mt-0.5">
                {formatVND(totalRefundEstimated)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Số tiền này sẽ được tự động trừ vào công nợ đại lý khi phiếu được duyệt.
              </p>
            </div>
          </div>
        </div>

        {/* ── FOOTER THAO TÁC DƯỚI CÙNG (CHỈ CÒN NÚT LƯU & LẬP PHIẾU) ── */}
        <div className="flex items-center justify-end pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={isSubmitting || selectedItems.length === 0}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang lưu phiếu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu & Lập phiếu trả hàng</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
export default CreateReturnReceiptPage;
