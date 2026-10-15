import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  ShoppingCart,
  CheckCircle2,
  Tag,
  CreditCard,
  Clock,
  Sparkles,
} from 'lucide-react';

export interface SystemNotification {
  id: string;
  type: 'STOCK_ALERT' | 'ORDER' | 'DELIVERY' | 'PRICING' | 'CREDIT';
  title: string;
  message: string;
  timestamp: string;
  link: string;
  isRead: boolean;
  priority?: 'high' | 'normal';
}

const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-001',
    type: 'STOCK_ALERT',
    title: 'Cảnh báo đứt hàng tại kho',
    message: 'SKU Sữa Bột Dinh Dưỡng Loha Gold 900g đã hết tồn khả dụng tại Kho Tổng Miền Nam.',
    timestamp: '10 phút trước',
    link: '/inventory/stock',
    isRead: false,
    priority: 'high',
  },
  {
    id: 'notif-002',
    type: 'ORDER',
    title: 'Đơn hàng B2B mới cần duyệt',
    message: 'Đơn hàng tự phục vụ từ Chuỗi Cửa Hàng Tiện Lợi An Phú Mart đang chờ kiểm tra hạn mức.',
    timestamp: '45 phút trước',
    link: '/sales/orders',
    isRead: false,
    priority: 'high',
  },
  {
    id: 'notif-003',
    type: 'DELIVERY',
    title: 'Giao hàng thành công',
    message: 'Đơn hàng giao cho Đại lý Thực Phẩm Sông Hàn đã hoàn tất giao đủ 100%.',
    timestamp: '2 giờ trước',
    link: '/portal/tracking',
    isRead: false,
    priority: 'normal',
  },
  {
    id: 'notif-004',
    type: 'PRICING',
    title: 'Chính sách giá & Chiết khấu',
    message: 'Bảng giá đại lý tháng 11/2026 đã áp dụng hiệu lực cho toàn bộ kênh đại lý.',
    timestamp: '1 ngày trước',
    link: '/catalog/pricing',
    isRead: true,
    priority: 'normal',
  },
  {
    id: 'notif-005',
    type: 'CREDIT',
    title: 'Hạn mức công nợ kích hoạt',
    message: 'Hạn mức tín dụng mua buôn 55.000.000 đ đã sẵn sàng khả dụng đặt hàng.',
    timestamp: '2 ngày trước',
    link: '/sales/customers',
    isRead: true,
    priority: 'normal',
  },
];

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    try {
      const savedReadIds = JSON.parse(localStorage.getItem('loha_read_notifications') || '[]');
      return DEFAULT_NOTIFICATIONS.map((n) => ({
        ...n,
        isRead: savedReadIds.includes(n.id) || n.isRead,
      }));
    } catch {
      return DEFAULT_NOTIFICATIONS;
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lưu trạng thái đã đọc vào LocalStorage
  const saveReadStatus = (updated: SystemNotification[]) => {
    try {
      const readIds = updated.filter((n) => n.isRead).map((n) => n.id);
      localStorage.setItem('loha_read_notifications', JSON.stringify(readIds));
    } catch {
      // Ignore
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications =
    activeTab === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  // Đóng khi click ngoài hoặc ESC
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Đánh dấu tất cả là đã đọc
  const handleMarkAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    setNotifications(updated);
    saveReadStatus(updated);
  };

  // Click vào 1 thông báo
  const handleNotificationClick = (item: SystemNotification) => {
    const updated = notifications.map((n) => (n.id === item.id ? { ...n, isRead: true } : n));
    setNotifications(updated);
    saveReadStatus(updated);
    setIsOpen(false);
    navigate(item.link);
  };

  const getIcon = (type: SystemNotification['type']) => {
    switch (type) {
      case 'STOCK_ALERT':
        return (
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
        );
      case 'ORDER':
        return (
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <ShoppingCart className="w-4 h-4" />
          </div>
        );
      case 'DELIVERY':
        return (
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'PRICING':
        return (
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
            <Tag className="w-4 h-4" />
          </div>
        );
      case 'CREDIT':
        return (
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <CreditCard className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative shrink-0 flex items-center" ref={dropdownRef}>
      {/* Nút Chuông Thông Báo */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative flex items-center justify-center h-10 w-10 sm:h-10 sm:w-10 rounded-xl border transition-all duration-200 cursor-pointer select-none focus:outline-none ${
          isOpen
            ? 'bg-indigo-50 border-indigo-300 text-indigo-600 ring-2 ring-indigo-500/20'
            : 'bg-white border-slate-200/90 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
        }`}
        title="Thông báo hệ thống"
        aria-label="Thông báo hệ thống"
        aria-expanded={isOpen}
      >
        <Bell className="w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-105" />

        {/* Badge số lượng thông báo chưa đọc */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel Thông Báo */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200/90 shadow-2xl py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Thông báo hệ thống</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1 cursor-pointer"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc hết</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 px-4 pt-2.5 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('UNREAD')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'UNREAD'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 no-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500/70 mb-2" />
                <p className="text-xs font-semibold text-slate-700">Không có thông báo nào</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Bạn đã xem hết toàn bộ các thông báo quan trọng.
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                    !item.isRead ? 'bg-indigo-50/30' : ''
                  }`}
                >
                  {getIcon(item.type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <h4
                        className={`text-xs truncate ${
                          !item.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {item.timestamp}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                  </div>

                  {!item.isRead && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="pt-2 px-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Thông báo đồng bộ thời gian thực
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-medium">LOHA SALES</span>
          </div>
        </div>
      )}
    </div>
  );
};
