import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BadgePercent,
  Check,
  LoaderCircle,
  PackageSearch,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { ModalLayout } from './modal-layout';
import { showToast } from './toast';
import { sn40OrdersService, type Sn40Customer } from '../services/sn40-orders.service';
import type { PriceList } from '../types/price-list';
import type { Order } from '../types/order';
import type { Product } from '../types/products';

interface Sn40OrderPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (order: Order) => void;
}

interface Sn40DraftLine {
  key: string;
  product: Product;
  quantity: number;
  unit: string;
  conversionRate: number;
  listPrice: number;
  unitPrice: number;
  minPrice: number;
  discountPercent: number;
  manualPrice: string;
  isPriceManuallyEdited: boolean;
  quoteLoading: boolean;
  quoteError?: string;
}

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const getDefaultDeliveryDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  return date.toISOString().slice(0, 10);
};

const getProductPrice = (priceList: PriceList, product: Product) =>
  priceList.items.find(
    (item) => item.productId === product.id || item.productCode.toLowerCase() === product.sku.toLowerCase(),
  );

export const Sn40OrderPricingModal: React.FC<Sn40OrderPricingModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [customers, setCustomers] = useState<Sn40Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Sn40Customer | null>(null);
  const [priceList, setPriceList] = useState<PriceList | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingPriceList, setLoadingPriceList] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [priceListError, setPriceListError] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [productError, setProductError] = useState('');
  const [lines, setLines] = useState<Sn40DraftLine[]>([]);
  const [deliveryDate, setDeliveryDate] = useState(getDefaultDeliveryDate());
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoadingCustomers(true);
    setCustomerError('');
    sn40OrdersService.getCustomers()
      .then((data) => {
        if (active) setCustomers(data.filter((customer) => customer.status !== 'INACTIVE'));
      })
      .catch((error: unknown) => {
        if (active) setCustomerError(error instanceof Error ? error.message : 'Không thể tải đại lý');
      })
      .finally(() => {
        if (active) setLoadingCustomers(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !productQuery.trim()) {
      setProducts([]);
      setProductError('');
      return;
    }
    const timer = setTimeout(() => {
      setSearchingProducts(true);
      setProductError('');
      sn40OrdersService.searchProducts(productQuery.trim())
        .then(setProducts)
        .catch((error: unknown) => {
          setProducts([]);
          setProductError(error instanceof Error ? error.message : 'Không thể tìm sản phẩm');
        })
        .finally(() => setSearchingProducts(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [isOpen, productQuery]);

  const loadLinePrice = useCallback(
    async (line: Sn40DraftLine, currentPriceList: PriceList): Promise<void> => {
      const priceItem = getProductPrice(currentPriceList, line.product);
      if (!priceItem) {
        setLines((current) => current.map((item) => item.key === line.key
          ? { ...item, quoteLoading: false, quoteError: `SKU ${line.product.sku} chưa có giá trong bảng giá hiện hành` }
          : item));
        return;
      }

      const listPrice = Math.round(priceItem.price * line.conversionRate);
      const minPrice = Math.round(priceItem.minPrice * line.conversionRate);
      setLines((current) => current.map((item) => item.key === line.key
        ? { ...item, quoteLoading: true, quoteError: undefined, listPrice, minPrice }
        : item));

      try {
        const baseQuantity = Math.round(line.quantity * line.conversionRate);
        const discountPercent = await sn40OrdersService.calculateDiscount(line.product, baseQuantity);
        const automaticPrice = Math.round(listPrice * (1 - discountPercent / 100));
        const unitPrice = line.isPriceManuallyEdited
          ? Number(line.manualPrice || automaticPrice)
          : automaticPrice;
        setLines((current) => current.map((item) => {
          if (item.key !== line.key || item.quantity !== line.quantity || item.conversionRate !== line.conversionRate) {
            return item;
          }
          return {
            ...item,
            listPrice,
            minPrice,
            discountPercent: line.isPriceManuallyEdited && listPrice > 0
              ? Number((((listPrice - unitPrice) / listPrice) * 100).toFixed(2))
              : discountPercent,
            unitPrice,
            quoteLoading: false,
            quoteError: undefined,
          };
        }));
      } catch (error: unknown) {
        setLines((current) => current.map((item) => item.key === line.key
          ? { ...item, quoteLoading: false, quoteError: error instanceof Error ? error.message : 'Không thể tính giá' }
          : item));
      }
    },
    [],
  );

  const handleSelectCustomer = async (customerId: string): Promise<void> => {
    const customer = customers.find((item) => item.id === customerId) || null;
    setSelectedCustomer(customer);
    setPriceList(null);
    setLines([]);
    setPriceListError('');
    if (!customer) return;

    setLoadingPriceList(true);
    try {
      const currentPriceList = await sn40OrdersService.getEffectivePriceList(customer.customerGroup);
      setPriceList(currentPriceList);
    } catch (error: unknown) {
      setPriceListError(error instanceof Error ? error.message : 'Đại lý chưa có bảng giá hiệu lực');
    } finally {
      setLoadingPriceList(false);
    }
  };

  const handleAddProduct = (product: Product): void => {
    if (!priceList) return;
    if (!getProductPrice(priceList, product)) {
      setProductError(`SKU ${product.sku} chưa có trong bảng giá hiện hành của đại lý`);
      return;
    }
    if (lines.some((line) => line.product.id === product.id)) {
      setProductError('Sản phẩm này đã có trong đơn. Hãy đổi số lượng ở dòng hàng.');
      return;
    }

    const line: Sn40DraftLine = {
      key: `${product.id}-${Date.now()}`,
      product,
      quantity: 1,
      unit: product.baseUnit,
      conversionRate: 1,
      listPrice: 0,
      unitPrice: 0,
      minPrice: 0,
      discountPercent: 0,
      manualPrice: '',
      isPriceManuallyEdited: false,
      quoteLoading: true,
    };
    setLines((current) => [...current, line]);
    setProductQuery('');
    setProducts([]);
    void loadLinePrice(line, priceList);
  };

  const updateLine = (key: string, changes: Partial<Sn40DraftLine>): void => {
    const currentLine = lines.find((line) => line.key === key);
    if (!currentLine) return;
    const updated = { ...currentLine, ...changes };
    setLines((current) => current.map((line) => line.key === key ? updated : line));
    if (priceList && (changes.quantity !== undefined || changes.unit !== undefined || changes.conversionRate !== undefined)) {
      void loadLinePrice(updated, priceList);
    }
  };

  const handleToggleManualPrice = (line: Sn40DraftLine, enabled: boolean): void => {
    const updated = {
      ...line,
      isPriceManuallyEdited: enabled,
      manualPrice: enabled ? String(line.unitPrice) : '',
    };
    setLines((current) => current.map((item) => item.key === line.key ? updated : item));
    if (!enabled && priceList) void loadLinePrice(updated, priceList);
  };

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.listPrice, 0);
    const grandTotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
    return { subtotal, totalDiscount: subtotal - grandTotal, grandTotal };
  }, [lines]);

  const approvalLines = lines.filter((line) => line.unitPrice < line.minPrice && line.minPrice > 0);
  const canSubmit = Boolean(
    selectedCustomer &&
    priceList &&
    lines.length > 0 &&
    lines.every((line) => !line.quoteLoading && !line.quoteError && line.unitPrice >= 0),
  );

  const handleSubmit = async (): Promise<void> => {
    if (!selectedCustomer || !priceList || !canSubmit) return;
    setSubmitting(true);
    try {
      const created = await sn40OrdersService.createOrder({
        customerId: selectedCustomer.id,
        priceListId: priceList.id,
        deliveryDate,
        note: note.trim() || undefined,
        lines: lines.map((line) => ({
          productId: line.product.id,
          productSku: line.product.sku,
          productName: line.product.name,
          unit: line.unit,
          baseUnit: line.product.baseUnit,
          conversionRate: line.conversionRate,
          quantity: line.quantity,
          isPriceManuallyEdited: line.isPriceManuallyEdited,
          ...(line.isPriceManuallyEdited ? { unitPrice: Number(line.manualPrice) } : {}),
        })),
      });

      if (created.requiresApproval) {
        showToast('warning', `Đơn ${created.orderCode} đang chờ duyệt giá sàn`);
      } else {
        showToast('success', `Tạo đơn ${created.orderCode} thành công`);
      }
      onCreated(created);
      onClose();
    } catch (error: unknown) {
      showToast('error', error instanceof Error ? error.message : 'Không thể tạo đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = (): void => {
    setSelectedCustomer(null);
    setPriceList(null);
    setLines([]);
    setProductQuery('');
    setProducts([]);
    setDeliveryDate(getDefaultDeliveryDate());
    setNote('');
    setPriceListError('');
    setProductError('');
    onClose();
  };

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={handleClose}
      title="Tạo đơn hàng tự áp giá"
      subtitle="SN-40 · Báo giá, chiết khấu sản lượng và kiểm tra giá sàn"
      icon={<BadgePercent className="h-5 w-5" />}
      badge={<span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">SN-40</span>}
      maxWidth="max-w-5xl"
      bodyClassName="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5 text-sm text-slate-700"
      closeOnOverlayClick={!submitting}
      footer={(
        <>
          <Button type="button" variant="outline" className="w-auto px-5" onClick={handleClose} disabled={submitting}>
            Hủy
          </Button>
          <Button type="button" className="w-auto px-5" onClick={handleSubmit} disabled={!canSubmit} isLoading={submitting} loadingText="Đang gửi đơn...">
            <Check className="h-4 w-4" />
            Gửi đơn lên backend
          </Button>
        </>
      )}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(220px,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
          <div>
            <label htmlFor="sn40-customer" className="mb-2 block text-sm font-semibold text-slate-800">Đại lý nhận hàng</label>
            <select
              id="sn40-customer"
              value={selectedCustomer?.id || ''}
              onChange={(event) => void handleSelectCustomer(event.target.value)}
              disabled={loadingCustomers || loadingPriceList || submitting}
              className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-[var(--color-border-focus)] focus:ring-4 focus:ring-[var(--color-primary-ring)] disabled:bg-slate-50"
            >
              <option value="">{loadingCustomers ? 'Đang tải đại lý...' : 'Chọn đại lý'}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.code} · {customer.name}</option>
              ))}
            </select>
            {customerError && <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600"><AlertCircle className="h-4 w-4" />{customerError}</p>}
          </div>

          {selectedCustomer && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
              <span>Nhóm giá: <strong className="text-slate-800">{selectedCustomer.customerGroup}</strong></span>
              {selectedCustomer.phone && <span>{selectedCustomer.phone}</span>}
              {loadingPriceList && <span className="inline-flex items-center gap-1 text-indigo-700"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Đang tra bảng giá</span>}
              {priceList && <span className="text-emerald-700">{priceList.code} · hiệu lực</span>}
            </div>
          )}
          {priceListError && <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">{priceListError}</p>}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <label htmlFor="sn40-delivery-date" className="mb-2 block text-sm font-semibold text-slate-800">Ngày giao dự kiến</label>
          <input
            id="sn40-delivery-date"
            type="date"
            value={deliveryDate}
            onChange={(event) => setDeliveryDate(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-[var(--color-border-focus)] focus:ring-4 focus:ring-[var(--color-primary-ring)]"
          />
          <p className="mt-2 text-xs text-slate-500">Điểm giao mặc định của đại lý sẽ được backend tự gán.</p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-semibold text-slate-900">Sản phẩm và giá tự động</h3>
            <p className="mt-1 text-xs text-slate-500">Giá sàn và chiết khấu được tra theo nhóm đại lý; số lượng dùng đơn vị cơ sở.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
            <ShieldCheck className="h-3.5 w-3.5" /> Backend xác nhận giá khi lưu
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            disabled={!priceList || submitting}
            placeholder={priceList ? 'Tìm SKU hoặc tên sản phẩm...' : 'Chọn đại lý có bảng giá trước'}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-10 text-sm outline-none transition focus:border-[var(--color-border-focus)] focus:ring-4 focus:ring-[var(--color-primary-ring)] disabled:bg-slate-50"
          />
          {searchingProducts && <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-indigo-600" />}
          {products.length > 0 && (
            <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
              {products.map((product) => {
                const hasPrice = Boolean(priceList && getProductPrice(priceList, product));
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={!hasPrice}
                    onClick={() => handleAddProduct(product)}
                    className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">{product.name}</span>
                      <span className="mt-0.5 block text-xs text-slate-500">{product.sku} · {product.baseUnit}</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-indigo-700">{hasPrice ? 'Thêm' : 'Chưa có giá'}</span>
                  </button>
                );
              })}
            </div>
          )}
          {productError && <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600"><AlertCircle className="h-4 w-4" />{productError}</p>}
        </div>

        {lines.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">
            <PackageSearch className="mx-auto mb-2 h-7 w-7 text-slate-400" />
            Chưa có dòng hàng. Tìm và thêm sản phẩm ở phía trên.
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((line) => (
              <div key={line.key} className="rounded-xl border border-slate-200 p-3 sm:p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{line.product.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{line.product.sku} · Giá sàn {line.minPrice ? formatCurrency(line.minPrice) : 'đang tra...'}</p>
                  </div>
                  <button type="button" onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600" aria-label={`Xóa ${line.product.sku}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <label className="text-xs font-medium text-slate-600">
                    Số lượng
                    <input type="number" min={1} step={1} value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: Math.max(1, Number(event.target.value) || 1) })} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-800 outline-none focus:border-[var(--color-border-focus)] focus:ring-4 focus:ring-[var(--color-primary-ring)]" />
                  </label>
                  <label className="text-xs font-medium text-slate-600">
                    Đơn vị
                    <select value={line.unit} onChange={(event) => {
                      const unit = line.product.units?.find((item) => item.unitName === event.target.value);
                      updateLine(line.key, { unit: event.target.value, conversionRate: unit?.conversionRate || 1 });
                    }} className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800 outline-none focus:border-[var(--color-border-focus)] focus:ring-4 focus:ring-[var(--color-primary-ring)]">
                      {(line.product.units?.length ? line.product.units : [{ unitName: line.product.baseUnit, conversionRate: 1 }]).map((unit) => (
                        <option key={unit.unitName} value={unit.unitName}>{unit.unitName}</option>
                      ))}
                    </select>
                  </label>
                  <div className="text-xs font-medium text-slate-600">
                    Giá sau chiết khấu
                    <div className="mt-1.5 flex h-10 items-center gap-1.5 rounded-lg bg-slate-50 px-3 text-sm font-semibold text-slate-900">
                      {line.quoteLoading ? <LoaderCircle className="h-4 w-4 animate-spin text-indigo-600" /> : formatCurrency(line.unitPrice)}
                      {!line.isPriceManuallyEdited && line.discountPercent > 0 && <span className="text-xs font-medium text-emerald-700">−{line.discountPercent}%</span>}
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-600">
                    Thành tiền
                    <div className="mt-1.5 flex h-10 items-center rounded-lg bg-slate-50 px-3 text-sm font-semibold text-slate-900">{formatCurrency(line.quantity * line.unitPrice)}</div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                    <input type="checkbox" checked={line.isPriceManuallyEdited} onChange={(event) => handleToggleManualPrice(line, event.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-indigo-600" />
                    Sửa giá thủ công
                  </label>
                  {line.discountPercent > 0 && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><BadgePercent className="h-3.5 w-3.5" />Chiết khấu theo sản lượng</span>}
                </div>
                {line.isPriceManuallyEdited && (
                  <div className="mt-3 max-w-xs">
                    <Input label="Giá bán thủ công (VNĐ)" type="number" min={0} value={line.manualPrice} onChange={(event) => {
                      const manualPrice = event.target.value;
                      const unitPrice = Number(manualPrice) || 0;
                      const discountPercent = line.listPrice > 0 ? Number((((line.listPrice - unitPrice) / line.listPrice) * 100).toFixed(2)) : 0;
                      updateLine(line.key, { manualPrice, unitPrice, discountPercent });
                    }} />
                  </div>
                )}
                {line.quoteError && <p className="mt-2 text-xs text-rose-600">{line.quoteError}</p>}
                {line.unitPrice < line.minPrice && line.minPrice > 0 && (
                  <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Giá thấp hơn giá sàn. Đơn sẽ được chuyển sang chờ duyệt.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)]">
        <div>
          <label htmlFor="sn40-note" className="mb-2 block text-sm font-semibold text-slate-800">Ghi chú đơn hàng</label>
          <textarea id="sn40-note" value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Ghi chú giao hàng (tuỳ chọn)" className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[var(--color-border-focus)] focus:ring-4 focus:ring-[var(--color-primary-ring)]" />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5 text-sm">
          <div className="flex justify-between text-slate-600"><span>Tạm tính</span><span>{formatCurrency(totals.subtotal)}</span></div>
          <div className="flex justify-between text-slate-600"><span>Chiết khấu</span><span className="text-emerald-700">{formatCurrency(totals.totalDiscount)}</span></div>
          <div className="flex justify-between border-t border-slate-100 pt-2.5 font-bold text-slate-900"><span>Tổng phải thu</span><span>{formatCurrency(totals.grandTotal)}</span></div>
          {approvalLines.length > 0 && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">{approvalLines.length} dòng hàng cần quản lý duyệt do giá dưới sàn.</p>}
          {priceList && <p className="text-xs text-slate-500">Bảng giá: {priceList.name} · {priceList.code}</p>}
        </div>
      </div>
    </ModalLayout>
  );
};
