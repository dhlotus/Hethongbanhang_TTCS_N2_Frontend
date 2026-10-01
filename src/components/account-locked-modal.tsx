import React, { useState, useEffect, useCallback } from "react";
import { ShieldAlert, X, Lock } from "lucide-react";
import { Button } from "./button";

export interface AccountLockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
  message?: string;
}

/**
 * Modal hiển thị thông báo chi tiết khi tài khoản người dùng bị khóa bởi Quản trị viên
 * Tuân thủ nghiêm ngặt UI_GUIDELINES.md: Clean SaaS, bo góc mềm mại rounded-2xl,
 * hiệu ứng chuyển động mượt mà (smooth enter/exit animation), không bị đột ngột.
 */
export const AccountLockedModal: React.FC<AccountLockedModalProps> = ({
  isOpen,
  onClose,
  reason,
}) => {
  const [isClosing, setIsClosing] = useState(false);

  // Xử lý đóng modal kèm animation mượt mà
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 220);
  }, [isClosing, onClose]);

  // Lắng nghe phím ESC để đóng modal mượt mà
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const displayReason =
    reason ||
    "Tài khoản hiện đang bị tạm khóa theo quyết định của Quản trị viên hệ thống để bảo đảm an toàn dữ liệu.";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="locked-modal-title"
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs ${
        isClosing ? "animate-modal-backdrop-out" : "animate-modal-backdrop-in"
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className={`relative w-full max-w-md bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-7 overflow-hidden text-slate-800 ${
          isClosing ? "animate-modal-out" : "animate-modal-in"
        }`}
      >
        {/* Nút đóng góc phải trên */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Đóng popup thông báo"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Tiêu đề */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shadow-xs mb-3.5">
            <Lock className="w-7 h-7 text-rose-600 stroke-[2.2]" />
          </div>

          <h2
            id="locked-modal-title"
            className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight"
          >
            Tài khoản đã bị khóa
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xs">
            Quyền truy cập vào hệ thống LOHA SALES của tài khoản này đã bị tạm dừng bởi Quản trị viên.
          </p>
        </div>

        {/* Khung lý do khóa từ Quản trị viên */}
        <div className="mt-5 p-4 rounded-xl bg-rose-50/70 border border-rose-100 text-left">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-800 uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Lý do khóa từ Quản trị viên</span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-slate-800 leading-relaxed break-words">
            {displayReason}
          </p>
        </div>

        {/* Hướng dẫn liên hệ hỗ trợ ngắn gọn, không chứa email/hotline theo yêu cầu */}
        <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-600 text-center leading-relaxed">
          Nếu bạn cho rằng đây là một sự nhầm lẫn hoặc cần mở lại tài khoản, vui lòng liên hệ trực tiếp với Quản trị viên hệ thống để được hỗ trợ.
        </div>

        {/* Nút hành động */}
        <div className="mt-6">
          <Button
            type="button"
            variant="primary"
            onClick={handleClose}
            className="w-full py-2.5 rounded-xl font-medium cursor-pointer shadow-xs hover:shadow-sm active:scale-[0.99] transition-all"
          >
            Đã hiểu
          </Button>
        </div>
      </div>
    </div>
  );
};
