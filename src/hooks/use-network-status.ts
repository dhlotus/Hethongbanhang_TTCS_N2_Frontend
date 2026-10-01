import { useState, useEffect } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
}

/**
 * Hook giám sát trạng thái kết nối mạng theo thời gian thực (Online / Offline)
 * Hỗ trợ phát hiện khi mạng rớt và khi mạng được khôi phục trở lại
 */
export const useNetworkStatus = (): NetworkStatus => {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { isOnline, wasOffline };
};
