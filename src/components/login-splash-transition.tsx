import React, { useEffect, useState, useRef } from 'react';
import logoImg from '../assets/logo.png';

export interface LoginSplashTransitionProps {
  /** Tên đầy đủ hoặc username của người dùng để gán aria-label (A11y) */
  userName: string;
  /** Vai trò của người dùng (tùy chọn) */
  userRole?: string | string[];
  /** Callback kích hoạt khi animation hoàn thành để chuyển trang */
  onFinish: () => void;
  /** Tổng thời gian hiệu ứng chuyển tiếp (mặc định: 1100ms) */
  duration?: number;
}

/**
 * Hiệu ứng chuyển cảnh đăng nhập nghệ thuật phiên bản Tone Sáng (Luminous Pearl & Aurora):
 * - Nền sáng ngọc thanh thoát (Pearl White & Soft Lavender Canvas) tươi sáng, tích cực.
 * - Hào quang cực quang phát sáng mềm mại (Luminous Brand Aurora #371CDB & Cyan).
 * - Tối giản tinh tế: Chỉ hiển thị Logo trong đĩa ngọc thủy tinh và tên thương hiệu LOHA SALES.
 * - Trang trí chuyển động sáng tạo:
 *   + Vòng sóng lượng tử đồng tâm (Concentric Quantum Ripples) lan tỏa từ logo.
 *   + Vòng quỹ đạo xoay kép (Dual Gyroscope Orbital Rings) với đốm sáng vệ tinh sapphire.
 *   + Tia quét laser thanh mảnh (Precision Laser Sweep) 60fps.
 *   + Cú chuyển cảnh điện ảnh (Cinematic Portal Zoom-through): Bùng nở ánh sáng tinh khôi để lộ diện Dashboard.
 */
export const LoginSplashTransition: React.FC<LoginSplashTransitionProps> = ({
  userName,
  onFinish,
  duration = 1100,
}) => {
  const [stage, setStage] = useState<'enter' | 'active' | 'portal'>('enter');
  const timersRef = useRef<number[]>([]);
  const finishedRef = useRef(false);

  const displayName = userName.trim() || 'Thành viên LOHA';

  const triggerFinish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinish();
  };

  useEffect(() => {
    // 1. Kích hoạt giai đoạn xuất hiện mượt mà (Enter -> Active)
    const activeTimer = window.setTimeout(() => {
      setStage('active');
    }, 40);
    timersRef.current.push(activeTimer);

    // 2. Kích hoạt cú chuyển cảnh bùng nở điện ảnh (Portal Zoom-through)
    const portalTimer = window.setTimeout(() => {
      setStage('portal');
    }, Math.max(duration - 220, 650));
    timersRef.current.push(portalTimer);

    // 3. Hoàn tất chuỗi chuyển động và chuyển giao trang
    const finishTimer = window.setTimeout(() => {
      triggerFinish();
    }, duration);
    timersRef.current.push(finishTimer);

    // Hỗ trợ phím tắt ESC hoặc Enter để lướt qua nhanh
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        triggerFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Dọn dẹp timer an toàn, chống rò rỉ bộ nhớ
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      timersRef.current.forEach((id) => clearTimeout(id));
      timersRef.current = [];
    };
  }, [duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Chào mừng ${displayName} đăng nhập hệ thống LOHA SALES`}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#f8fafc] via-[#f1f5f9] to-[#eef2ff] select-none"
    >
      {/* ===================================================================== */}
      {/* 1. KHÔNG GIAN CỰC QUANG TONE SÁNG (Luminous Aurora & Radiant Glow)      */}
      {/* ===================================================================== */}
      {/* Vệt sáng trung tâm Indigo Blue #371CDB dịu nhẹ */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] sm:w-[720px] sm:h-[720px] rounded-full pointer-events-none blur-[130px] transition-all duration-700 ease-out ${
          stage === 'enter' ? 'scale-75 opacity-0' : ''
        } ${stage === 'active' ? 'scale-100 opacity-70' : ''} ${
          stage === 'portal' ? 'scale-[2.4] opacity-0' : ''
        }`}
        style={{
          background: 'radial-gradient(circle, rgba(55, 28, 219, 0.22) 0%, rgba(99, 102, 241, 0.15) 45%, transparent 70%)',
        }}
      />

      {/* Vệt sáng phụ Electric Cyan #06B6D4 tạo sắc thái công nghệ tươi sáng */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] rounded-full pointer-events-none blur-[95px] transition-all duration-700 ${
          stage === 'portal' ? 'scale-[2.6] opacity-0' : 'scale-100 opacity-40'
        }`}
        style={{ background: 'rgba(56, 189, 248, 0.35)' }}
      />

      {/* Grid pattern trang trí chìm thanh lịch trên nền sáng */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(rgba(55, 28, 219, 0.6) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* ===================================================================== */}
      {/* 2. HOẠT ẢNH TRANG TRÍ CHUYỂN ĐỔI (Concentric Rings & Dual Gyroscope)   */}
      {/* ===================================================================== */}
      {/* Vòng sóng năng lượng đồng tâm 1 (Expanding Ripple) */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-indigo-400/35 pointer-events-none transition-all duration-700 ${
          stage === 'active' ? 'scale-100 opacity-100' : ''
        } ${stage === 'enter' ? 'scale-50 opacity-0' : ''} ${
          stage === 'portal' ? 'scale-[2.8] opacity-0 border-indigo-400/80' : ''
        }`}
        style={{
          boxShadow: '0 0 35px rgba(55, 28, 219, 0.12) inset',
        }}
      />

      {/* Vòng sóng năng lượng đồng tâm 2 */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[460px] sm:h-[460px] rounded-full border border-blue-400/25 pointer-events-none transition-all duration-700 delay-75 ${
          stage === 'active' ? 'scale-100 opacity-100' : ''
        } ${stage === 'enter' ? 'scale-75 opacity-0' : ''} ${
          stage === 'portal' ? 'scale-[3] opacity-0' : ''
        }`}
      />

      {/* Vòng quỹ đạo xoay tròn theo chiều kim đồng hồ có đốm sáng vệ tinh sapphire */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-dashed border-indigo-300/40 pointer-events-none transition-all duration-500 ${
          stage === 'portal' ? 'scale-[2.5] opacity-0' : 'opacity-100'
        }`}
        style={{ animation: 'lohaSpinOrbit 16s linear infinite' }}
      >
        {/* Đốm sáng ngọc bay trên quỹ đạo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#371cdb] shadow-[0_0_12px_#371cdb]" />
      </div>

      {/* Vòng quỹ đạo xoay ngược chiều kim đồng hồ với hạt phát sáng thứ hai */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-[420px] sm:h-[420px] rounded-full border border-sky-300/35 pointer-events-none transition-all duration-500 ${
          stage === 'portal' ? 'scale-[2.5] opacity-0' : 'opacity-100'
        }`}
        style={{ animation: 'lohaSpinCounter 20s linear infinite' }}
      >
        <div className="absolute bottom-0 right-1/4 w-2.5 h-2.5 rounded-full bg-[#0284c7] shadow-[0_0_10px_#38bdf8]" />
      </div>

      {/* ===================================================================== */}
      {/* 3. TÂM ĐIỂM NGHỆ THUẬT: LOGO & TÊN THƯƠNG HIỆU LOHA SALES              */}
      {/* ===================================================================== */}
      <div
        className={`relative z-10 flex flex-col items-center justify-center text-center px-4 transition-all duration-600 will-change-[transform,opacity,filter] ${
          stage === 'enter' ? 'scale-80 opacity-0 translate-y-4' : ''
        } ${stage === 'active' ? 'scale-100 opacity-100 translate-y-0' : ''} ${
          stage === 'portal' ? 'scale-[1.3] opacity-0 -translate-y-2 blur-[5px]' : ''
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Khung chứa Logo LOHA SALES: Đĩa ngọc thủy tinh sáng tinh khôi */}
        <div className="relative mb-6 group">
          {/* Ánh hào quang tỏa nhẹ phía sau Logo */}
          <div className="absolute inset-0 rounded-3xl bg-[#371cdb]/25 blur-2xl transition-all duration-500 group-hover:blur-3xl animate-pulse" />

          {/* Đĩa kính mờ tinh xảo bo góc hoàn hảo */}
          <div className="relative flex items-center justify-center p-4.5 sm:p-5 rounded-3xl bg-white/85 border border-white shadow-[0_20px_50px_rgba(55,28,219,0.18),0_8px_20px_rgba(0,0,0,0.05)] backdrop-blur-2xl overflow-hidden">
            <img
              src={logoImg}
              alt="LOHA SALES"
              className="h-14 sm:h-16 md:h-18 w-auto object-contain drop-shadow-xs rounded-2xl"
            />
          </div>
        </div>

        {/* Tên thương hiệu LOHA SALES Typography nổi bật trên nền sáng */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-[0.28em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#1e1b4b] via-[#371cdb] to-[#2563eb] drop-shadow-xs select-none">
          LOHA SALES
        </h1>

        {/* Tia quét laser thanh mảnh (Laser Precision Line) */}
        <div className="relative w-44 sm:w-56 h-[2.5px] mt-6 rounded-full bg-slate-200/90 overflow-hidden shadow-inner">
          <div
            className="absolute inset-y-0 h-full w-full bg-gradient-to-r from-transparent via-[#371cdb] to-[#38bdf8] shadow-[0_0_12px_#371cdb]"
            style={{
              animation: 'lohaLaserSweep 1s cubic-bezier(0.4, 0, 0.2, 1) infinite',
            }}
          />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. CSS KEYFRAMES HARDWARE ACCELERATED (60fps Jank-free)               */}
      {/* ===================================================================== */}
      <style>{`
        @keyframes lohaSpinOrbit {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        @keyframes lohaSpinCounter {
          from {
            transform: translate(-50%, -50%) rotate(360deg);
          }
          to {
            transform: translate(-50%, -50%) rotate(0deg);
          }
        }
        @keyframes lohaLaserSweep {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};
