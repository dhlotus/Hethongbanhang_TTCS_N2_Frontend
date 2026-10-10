import React, { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type { StockBalance } from "../../types/inventory.types";

interface MinStockModalProps {
  item: StockBalance | null;
  onClose: () => void;
  onSave: (item: StockBalance, minStock: number) => Promise<void>;
}

/**
 * Modal nhập tồn tối thiểu cho một SKU (SN-183) - thay cho window.prompt.
 */
export const MinStockModal: React.FC<MinStockModalProps> = ({ item, onClose, onSave }) => {
  const [value, setValue] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!item) return;
    setValue(String(item.minStockLevel ?? 0));
    setError("");
    setSaving(false);
    const timer = window.setTimeout(() => inputRef.current?.select(), 50);
    return () => window.clearTimeout(timer);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, saving, onClose]);

  if (!item) return null;

  const parsed = Number(value.trim().replace(",", "."));
  const isValid = value.trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
  const willAlert = isValid && parsed > 0 && item.stockQuantity <= parsed;

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!isValid) {
      setError("Mức tồn tối thiểu phải là số không âm.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(item, parsed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Không cập nhật được tồn tối thiểu.");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Sửa tồn tối thiểu"
    >
      <form
        onSubmit={(event) => void submit(event)}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900">Thiết lập tồn tối thiểu</h3>
            <p className="mt-1 truncate text-xs text-slate-500">{item.name}</p>
            <p className="text-xs font-medium text-slate-400">{item.sku} · {item.warehouse}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-400">Tồn khả dụng</p>
              <p className="mt-0.5 text-sm font-bold text-emerald-700">
                {item.stockQuantity.toLocaleString("vi-VN")} {item.baseUnit}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-400">Tối thiểu hiện tại</p>
              <p className="mt-0.5 text-sm font-bold text-slate-700">
                {(item.minStockLevel ?? 0).toLocaleString("vi-VN")} {item.baseUnit}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="min-stock-input" className="mb-1.5 block text-xs font-semibold text-slate-600">
              Mức tồn tối thiểu mới ({item.baseUnit})
            </label>
            <input
              id="min-stock-input"
              ref={inputRef}
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setError("");
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
            <p className="mt-1.5 text-xs text-slate-400">Nhập 0 để tắt cảnh báo cho SKU này.</p>
          </div>

          {willAlert && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Với mức này, SKU sẽ được đưa vào danh sách cảnh báo đứt hàng.</span>
            </div>
          )}
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving || !isValid}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-md shadow-blue-600/25 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Lưu
          </button>
        </div>
      </form>
    </div>
  );
};
