import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
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

  // Danh sách hóa đơn / đơn hàng khả dụng
  const [eligibleInvoices, setEligibleInvoices] = useState<EligibleInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(
    searchParams.get('invoiceId') || '',
  );

  // Dòng sản phẩm
  const [loadingLines, setLoadingLines] = useState(false);
  const [itemRows, setItemRows] = useState<ReturnItemRow[]>([]);

  // Danh mục kho
  const [warehouses, setWarehouses] = useState<SystemWarehouse[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [generalReason, setGeneralReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tải danh sách kho thực tế
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

  // Tải danh sách đại lý khi vào trang
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

  // Tải danh sách hóa đơn khả dụng khi chọn đại lý
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

  // Tải các dòng sản phẩm của hóa đơn được chọn
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
      const digitsOnly = rawVal.replace(/[^\d]/g, '');
      if (!digitsOnly) {
        updated[index] = { ...updated[index], returnQuantity: 0 };
        return updated;
      }
      const parsed = parseInt(digitsOnly, 10);
      const safeVal = Math.max(0, Math.min(max, isNaN(parsed) ? 0 : parsed));
      updated[index] = { ...updated[index], returnQuantity: safeVal };
      return updated;
    });
  };

  // Đổi tình trạng hàng
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
      showToast('error', 'Vui lòng chọn hóa đơn gốc');
      return;
    }
    if (!generalReason.trim()) {
      showToast('error', 'Vui lòng nhập lý do trả hàng');
      return;
    }
    if (selectedItems.length === 0) {
      showToast('error', 'Vui lòng chọn ít nhất 1 sản phẩm và nhập số lượng trả > 0');
      return;
    }

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

      window.dispatchEvent(
        new CustomEvent('loha_return_created', {
          detail: {
            ...res,
            agencyName: currentAgency?.name || res.agencyName || 'Đại lý',
            totalRefundAmount: totalRefundEstimated,
          },
        }),
      );

      showToast('success', `Lập phiếu trả hàng ${res.code} thành công!`);
      navigate('/accounting/returns');
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast('error', msg || 'Lỗi khi lập phiếu trả hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto px-2 sm:px-4 pb-12">
      {/* Thanh điều hướng: Nút Quay lại và Tiêu đề trang (Đã bỏ nút hủy bỏ trên cùng) */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80">
        <Link
          to="/accounting/returns"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-all shadow-2xs cursor-pointer"
          title="Quay lại danh sách phiếu trả hàng"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Quay lại</span>
        </Link>
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
            Lập phiếu trả hàng
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Khối Thông tin đại lý & Hóa đơn gốc (Không đánh số 1, không icon tiêu đề) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-2.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Thông tin đại lý & Hóa đơn gốc
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Chọn Đại lý */}
            <div>
              <label htmlFor="select-agency" className="block text-xs font-bold text-slate-700 mb-1.5">
                Đại lý trả hàng <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-agency"
                value={selectedAgencyId}
                onChange={(e) => setSelectedAgencyId(e.target.value)}
                disabled={loadingCustomers}
                className="w-full h-9 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
              {currentAgency && (
                <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span>Dư nợ hiện tại:</span>
                  <span className="text-rose-600 font-bold font-mono">
                    {formatVND(currentAgency.currentDebt || 0)}
                  </span>
                </div>
              )}
            </div>

            {/* Chọn Hóa đơn gốc */}
            <div>
              <label htmlFor="select-invoice" className="block text-xs font-bold text-slate-700 mb-1.5">
                Hóa đơn gốc <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-invoice"
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                disabled={loadingInvoices || eligibleInvoices.length === 0}
                className="w-full h-9 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors cursor-pointer"
              >
                {eligibleInvoices.length === 0 ? (
                  <option value="">(Không có hóa đơn khả dụng)</option>
                ) : (
                  eligibleInvoices.map((inv) => (
                    <option key={inv.id || inv.code} value={inv.id || inv.code}>
                      {inv.code} {inv.orderCode && inv.orderCode !== inv.code ? `(${inv.orderCode})` : ''} — {formatVND(inv.totalAmount)}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Kho nhận hàng trả */}
            <div>
              <label htmlFor="select-warehouse" className="block text-xs font-bold text-slate-700 mb-1.5">
                Kho tiếp nhận <span className="text-rose-500">*</span>
              </label>
              <select
                id="select-warehouse"
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                disabled={loadingWarehouses}
                className="w-full h-9 px-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors disabled:bg-slate-50 cursor-pointer"
              >
                {loadingWarehouses ? (
                  <option value="">Đang tải kho...</option>
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

        {/* Khối Chi tiết sản phẩm trả (Không đánh số 2, không icon tiêu đề) */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Chi tiết sản phẩm trả
            </h2>
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>Đã chọn: <strong className="text-indigo-600 font-bold">{selectedItems.length}</strong> dòng</span>
              <span>•</span>
              <span>Tổng SL: <strong className="text-slate-900 font-bold">{totalQuantityToReturn}</strong></span>
            </div>
          </div>

          {loadingLines ? (
            <div className="py-10 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs sm:text-sm">Đang tải chi tiết sản phẩm hóa đơn...</p>
            </div>
          ) : itemRows.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs sm:text-sm">Chưa có dòng sản phẩm nào. Vui lòng chọn hóa đơn gốc.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs min-w-[680px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={itemRows.length > 0 && itemRows.every((r) => r.selected || r.remainingReturnableQuantity === 0)}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <th className="p-3">Sản phẩm</th>
                    <th className="p-3 text-right">SL Mua</th>
                    <th className="p-3 text-right">Đã trả</th>
                    <th className="p-3 text-right">Còn lại</th>
                    <th className="p-3 text-center w-24">SL Trả</th>
                    <th className="p-3 w-40">Tình trạng</th>
                    <th className="p-3 w-40">Số lô</th>
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
                          row.selected ? 'bg-indigo-50/30' : 'hover:bg-slate-50/60'
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

                        {/* Tên & SKU / ĐVT */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{row.productName}</div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {row.productSku} • {row.unit}
                          </div>
                        </td>

                        {/* SL Mua */}
                        <td className="p-3 text-right font-mono text-slate-600">
                          {row.purchasedQuantity}
                        </td>

                        {/* Đã trả */}
                        <td className="p-3 text-right font-mono text-slate-400">
                          {row.alreadyReturnedQuantity}
                        </td>

                        {/* SL Còn lại */}
                        <td className="p-3 text-right font-mono font-bold text-slate-900">
                          {row.remainingReturnableQuantity}
                        </td>

                        {/* SL Trả */}
                        <td className="p-3 text-center">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={row.returnQuantity === 0 ? '0' : String(row.returnQuantity)}
                            onFocus={(e) => e.target.select()}
                            disabled={!row.selected || isRowDisabled}
                            onChange={(e) => handleQuantityChange(idx, e.target.value)}
                            className={`w-18 h-8 px-2 text-center text-xs font-mono font-bold rounded-lg border transition-colors ${
                              isExceeded
                                ? 'border-rose-400 text-rose-600 bg-rose-50 focus:ring-rose-500/20'
                                : 'border-slate-300 text-slate-900 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20'
                            } disabled:bg-slate-100 disabled:text-slate-400`}
                          />
                          {isExceeded && (
                            <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                              Tối đa {row.remainingReturnableQuantity}
                            </div>
                          )}
                        </td>

                        {/* Tình trạng hàng */}
                        <td className="p-3">
                          <select
                            value={row.conditionType}
                            disabled={!row.selected || isRowDisabled}
                            onChange={(e) => handleConditionChange(idx, e.target.value as ReturnConditionType)}
                            className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors disabled:bg-slate-100 cursor-pointer"
                          >
                            <option value="GOOD">Hàng tốt (Kho bán)</option>
                            <option value="DAMAGED">Hàng lỗi (Kho lỗi)</option>
                          </select>
                        </td>

                        {/* Số lô */}
                        <td className="p-3">
                          {row.availableBatches && row.availableBatches.length > 0 ? (
                            <select
                              value={row.batchNumber}
                              disabled={!row.selected || isRowDisabled}
                              onChange={(e) => handleBatchChange(idx, e.target.value)}
                              className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors disabled:bg-slate-100 font-mono cursor-pointer"
                            >
                              <option value="">-- Chọn số lô --</option>
                              {row.availableBatches.map((b) => (
                                <option key={b} value={b}>
                                  {b}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-400 text-center block">—</span>
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

        {/* Khối Lý do trả hàng & Tóm tắt tài chính */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          {/* Lý do trả hàng */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
            <label htmlFor="general-reason" className="block text-xs font-bold text-slate-700">
              Lý do trả hàng <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="general-reason"
              rows={4}
              value={generalReason}
              onChange={(e) => setGeneralReason(e.target.value)}
              placeholder="Nhập lý do trả hàng..."
              className="w-full p-3 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-colors resize-none"
            />
          </div>

          {/* Tóm tắt tài chính hoàn trả */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Tóm tắt hoàn trả
              </span>
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                {selectedItems.length} mặt hàng
              </span>
            </div>

            {selectedItems.length > 0 && (
              <div className="space-y-2 border-b border-slate-100 pb-3 max-h-40 overflow-y-auto divide-y divide-slate-100">
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

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Tổng số lượng:</span>
                <span className="font-mono font-bold text-slate-900">{totalQuantityToReturn}</span>
              </div>
              <div className="flex justify-between">
                <span>Hàng tốt:</span>
                <span className="font-mono font-medium text-emerald-700">
                  {selectedItems.filter((i) => i.conditionType === 'GOOD').reduce((s, i) => s + i.returnQuantity, 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Hàng lỗi:</span>
                <span className="font-mono font-medium text-amber-700">
                  {selectedItems.filter((i) => i.conditionType === 'DAMAGED').reduce((s, i) => s + i.returnQuantity, 0)}
                </span>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-500 font-medium">Tổng tiền hoàn ước tính:</div>
              <div className="text-xl sm:text-2xl font-bold font-mono text-indigo-600 mt-0.5">
                {formatVND(totalRefundEstimated)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer thao tác */}
        <div className="flex items-center justify-end pt-3">
          <button
            type="submit"
            disabled={isSubmitting || selectedItems.length === 0}
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Đang lưu...</span>
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
