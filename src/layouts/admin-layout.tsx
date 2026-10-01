import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { Header } from "./header";

/**
 * Khung giao diện quản trị tổng quan (AdminLayout) cho hệ thống LOHA SALES:
 * - Cấu trúc 2 cột responsive (Sidebar 260px bên trái, Header + Content bên phải)
 * - Tự động thích ứng mobile với Drawer trượt
 * - Vùng nội dung sử dụng <Outlet /> để hiển thị các trang con nghiệp vụ
 */
export const AdminLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleToggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const handleCloseMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 font-sans antialiased text-slate-900">
      {/* 1. Sidebar điều hướng (Desktop cố định & Mobile Drawer) */}
      <Sidebar isOpen={isMobileMenuOpen} onClose={handleCloseMobileMenu} />

      {/* 2. Khung bên phải: Header cố định + Vùng Main Content */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {/* Header trên cùng */}
        <Header onToggleMobileMenu={handleToggleMobileMenu} />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
