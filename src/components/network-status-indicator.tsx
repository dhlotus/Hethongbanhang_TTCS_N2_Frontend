import React, { useState, useEffect } from "react";
import { Wifi, WifiOff } from "lucide-react";

/**
 * Component hiển thị trạng thái kết nối mạng (Network Status Indicator)
 * - Tự động xuất hiện khi thiết bị mất kết nối Internet
 * - Báo hiệu dữ liệu đang được bảo vệ an toàn bằng bộ nhớ cục bộ
 * - Tự động ẩn đi sau 3 giây khi kết nối được khôi phục
 */
export const NetworkStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [showReconnected, setShowReconnected] = useState<boolean>(false);

  useEffect(() => {
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Nếu đang online bình thường và không ở trạng thái vừa kết nối lại -> Ẩn
  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
    >
      {!isOnline ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-slate-900/95 text-white text-xs font-semibold shadow-xl border border-slate-700/80 backdrop-blur-xs select-none">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
          </span>
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Mất kết nối Internet. Dữ liệu đang được lưu tạm cục bộ</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-semibold shadow-lg select-none">
          <Wifi className="w-3.5 h-3.5 shrink-0" />
          <span>Đã khôi phục kết nối Internet</span>
        </div>
      )}
    </div>
  );
};
