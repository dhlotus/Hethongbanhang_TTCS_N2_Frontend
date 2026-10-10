import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { inventoryService } from "../../services/inventory.service";
import type { LowStockAlert } from "../../types/inventory.types";

interface LowStockAlertsWidgetProps {
  warehouseId?: string;
  /** Thay đổi giá trị này để tải lại widget (vd: sau khi sửa tồn tối thiểu) */
  refreshKey?: number;
}

/**
 * Widget Dashboard kho: các SKU sắp đứt hàng (tồn khả dụng <= tồn tối thiểu) - SN-183.
 */
export const LowStockAlertsWidget: React.FC<LowStockAlertsWidgetProps> = ({
  warehouseId,
  refreshKey = 0,
}) => {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    inventoryService
      .getLowStockAlerts(warehouseId)
      .then((data) => {
        if (cancelled) return;
        setAlerts(data);
        setError("");
      })
      .catch(() => {
        if (cancelled) return;
        setAlerts([]);
        setError("Không tải được cảnh báo tồn kho.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [warehouseId, refreshKey]);

  return (
    <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-xs">
      <div className="flex items-center justify-between border-b border-red-100 bg-red-50 px-5 py-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h2 className="text-sm font-bold text-red-700">Cảnh báo sắp đứt hàng</h2>
        </div>
        <span className="rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white">
          {alerts.length}
        </span>
      </div>

      {loading ? (
        <p className="px-5 py-6 text-center text-sm text-slate-400">Đang tải...</p>
      ) : error ? (
        <p className="px-5 py-6 text-center text-sm text-red-600">{error}</p>
      ) : alerts.length === 0 ? (
        <div className="flex items-center justify-center gap-2 px-5 py-6 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          <span>Không có SKU nào dưới mức tồn tối thiểu.</span>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {alerts.map((item) => (
            <li
              key={`${item.warehouseId ?? ""}-${item.sku}`}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-800">{item.name}</div>
                <div className="text-xs text-slate-400">
                  {item.sku} · {item.warehouse}
                </div>
              </div>
              <div className="shrink-0 text-right text-sm font-bold text-red-600">
                {item.stockQuantity.toLocaleString("vi-VN")} /{" "}
                {item.minStockLevel.toLocaleString("vi-VN")} {item.baseUnit}
                <div className="text-xs font-medium text-red-400">
                  Hụt {item.shortage.toLocaleString("vi-VN")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
