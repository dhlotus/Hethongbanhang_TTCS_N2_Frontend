import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { apiClient } from '../services/api';
import { tokenStorage } from '../utils/token-storage';

/**
 * Khung giao diện quản trị tổng quan (AdminLayout) cho hệ thống LOHA SALES:
 * - Cấu trúc 2 cột responsive (Sidebar 260px bên trái, Header + Content bên phải)
 * - Tự động thích ứng mobile với Drawer trượt
 * - Vùng nội dung sử dụng <Outlet /> để hiển thị các trang con nghiệp vụ
 * - Giám sát trạng thái hoạt động: Nếu tài khoản bị Quản trị viên khóa, lập tức ngắt phiên và chuyển về màn hình đăng nhập
 */
export const AdminLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('loha_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleToggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('loha_sidebar_collapsed', String(next));
      } catch {
        // Bỏ qua lỗi truy cập storage
      }
      return next;
    });
  };

  // Giám sát trạng thái tài khoản: Nếu bị Khóa, lập tức bị out ra ngay
  useEffect(() => {
    const checkActiveStatus = async () => {
      const token = tokenStorage.getAccessToken();
      if (!token) {
        return;
      }
      try {
        await apiClient.get('/auth/me');
      } catch {
        // Interceptor của apiClient sẽ tự động bắt mã 401 và chuyển hướng về /login nếu tài khoản bị khóa
      }
    };

    const interval = setInterval(checkActiveStatus, 7000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkActiveStatus();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return (
    <div
      style={{
        '--sidebar-width': isSidebarCollapsed ? '5rem' : '18.25rem',
      } as React.CSSProperties}
      className="flex h-screen h-[100dvh] w-full overflow-hidden bg-slate-50/70 font-sans antialiased text-slate-900"
    >
      {/* 1. Sidebar điều hướng liền mạch chuẩn Enterprise B2B */}
      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={handleCloseMobileMenu}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* 2. Khung bên phải: Header liền khối + Vùng Main Content */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* Header trên cùng liền mạch */}
        <Header onToggleMobileMenu={handleToggleMobileMenu} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 px-2 py-3 sm:px-4 sm:py-4 lg:px-6">
          <div className="mx-auto w-full max-w-[1800px] page-transition min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
