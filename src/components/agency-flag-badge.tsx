import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  Info,
  ShieldAlert,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Tooltip } from './tooltip';
import {
  creditConfigService,
  type AgencyCreditEvaluation,
  type AgencyCreditFlag,
  type CreditEnforcementMode,
} from '../services/credit-config.service';

export interface AgencyFlagBadgeProps {
  /** ID của đại lý (nếu truyền và chưa có evaluation thì component sẽ tự fetch) */
  agencyId?: string;
  /** Dữ liệu đánh giá cờ công nợ từ component cha */
  evaluation?: AgencyCreditEvaluation | null;
  /** Loại cờ ghi đè trực tiếp */
  flagType?: AgencyCreditFlag;
  /** Trạng thái gắn cờ trực tiếp */
  isFlagged?: boolean;
  /** Danh sách lý do gắn cờ trực tiếp */
  reasons?: string[];
  /** Chế độ xử lý áp dụng */
  enforcementMode?: CreditEnforcementMode;
  /** Kích thước badge: sm | md */
  size?: 'sm' | 'md';
  /** Có ẩn badge nếu trạng thái là an toàn (CLEAR) hay không (Mặc định: false) */
  hideIfClear?: boolean;
  /** Cho phép hover hiển thị Tooltip chi tiết (Mặc định: true) */
  showTooltip?: boolean;
  className?: string;
}

/**
 * Component Hiển thị Cờ Cảnh Báo & Khóa Bán Công Nợ Đại Lý (SN-204)
 * - Tự động hiển thị trạng thái cờ: CLEAR, EXCEEDED_LIMIT, OVERDUE, EXCEEDED_AND_OVERDUE
 * - Hiển thị Tooltip chi tiết dư nợ, hạn mức, số ngày quá hạn và chế độ áp dụng
 */
export const AgencyFlagBadge: React.FC<AgencyFlagBadgeProps> = ({
  agencyId,
  evaluation: initialEvaluation,
  flagType: directFlagType,
  isFlagged: directIsFlagged,
  reasons: directReasons,
  enforcementMode: directEnforcementMode,
  size = 'md',
  hideIfClear = false,
  showTooltip = true,
  className = '',
}) => {
  const [evalData, setEvalData] = useState<AgencyCreditEvaluation | null>(
    initialEvaluation || null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (initialEvaluation) {
      setEvalData(initialEvaluation);
      return;
    }

    if (agencyId && !directFlagType) {
      let isMounted = true;
      setIsLoading(true);

      creditConfigService
        .getAgencyCreditEvaluation(agencyId)
        .then((data) => {
          if (isMounted) setEvalData(data);
        })
        .catch((err: unknown) => {
          // Catch error an toàn, không để màn hình crash
          console.warn('[AgencyFlagBadge] Không thể lấy trạng thái cờ đại lý:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [agencyId, initialEvaluation, directFlagType]);

  // Phân giải cờ và lý do
  const effectiveFlagType: AgencyCreditFlag =
    directFlagType || evalData?.flagType || 'CLEAR';

  const isFlagged =
    directIsFlagged !== undefined
      ? directIsFlagged
      : evalData?.isFlagged ?? effectiveFlagType !== 'CLEAR';

  const reasons = directReasons || evalData?.reasons || [];
  const enforcementMode: CreditEnforcementMode =
    directEnforcementMode || evalData?.enforcementMode || 'BLOCK_ORDER';

  if (hideIfClear && (!isFlagged || effectiveFlagType === 'CLEAR')) {
    return null;
  }

  if (isLoading) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-500 animate-pulse ${
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        } ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Đang kiểm tra cờ...
      </span>
    );
  }

  // Định nghĩa màu sắc, nhãn và icon theo từng loại cờ
  const flagConfig: Record<
    AgencyCreditFlag,
    {
      label: string;
      bgClass: string;
      textClass: string;
      ringClass: string;
      dotClass: string;
      icon: React.ReactNode;
      modeBadgeClass: string;
    }
  > = {
    EXCEEDED_AND_OVERDUE: {
      label:
        enforcementMode === 'BLOCK_ORDER'
          ? 'Khóa bán: Vượt hạn mức & Quá hạn'
          : 'Cần duyệt: Vượt hạn mức & Quá hạn',
      bgClass: 'bg-rose-50',
      textClass: 'text-rose-700',
      ringClass: 'ring-rose-600/30',
      dotClass: 'bg-rose-500',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
      modeBadgeClass: 'bg-rose-100 text-rose-800 border-rose-300',
    },
    EXCEEDED_LIMIT: {
      label:
        enforcementMode === 'BLOCK_ORDER'
          ? 'Khóa bán: Vượt hạn mức nợ'
          : 'Cần duyệt: Vượt hạn mức nợ',
      bgClass: 'bg-amber-50',
      textClass: 'text-amber-800',
      ringClass: 'ring-amber-600/30',
      dotClass: 'bg-amber-500',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
      modeBadgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    OVERDUE: {
      label:
        enforcementMode === 'BLOCK_ORDER'
          ? 'Khóa bán: Nợ quá hạn'
          : 'Cần duyệt: Nợ quá hạn',
      bgClass: 'bg-orange-50',
      textClass: 'text-orange-800',
      ringClass: 'ring-orange-600/30',
      dotClass: 'bg-orange-500',
      icon: <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />,
      modeBadgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
    },
    CLEAR: {
      label: 'Hạn mức an toàn',
      bgClass: 'bg-emerald-50',
      textClass: 'text-emerald-700',
      ringClass: 'ring-emerald-600/20',
      dotClass: 'bg-emerald-500',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
      modeBadgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
  };

  const currentCfg = flagConfig[effectiveFlagType] || flagConfig.CLEAR;

  const badgeElement = (
    <span
      className={`inline-flex items-center font-medium rounded-full ring-1 ring-inset ${
        currentCfg.bgClass
      } ${currentCfg.textClass} ${currentCfg.ringClass} ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5'
      } shadow-2xs ${className}`}
    >
      {currentCfg.icon}
      <span>{currentCfg.label}</span>
    </span>
  );

  if (!showTooltip) {
    return badgeElement;
  }

  // Nội dung chi tiết trong Tooltip
  const tooltipContent = (
    <div className="p-1 max-w-xs text-xs space-y-2">
      <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1.5">
        <span className="font-semibold text-slate-100 flex items-center gap-1.5">
          <Flag className="w-3.5 h-3.5 text-amber-400" />
          Trạng thái kiểm soát công nợ
        </span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${currentCfg.modeBadgeClass}`}
        >
          {enforcementMode === 'BLOCK_ORDER' ? 'Khóa tạo đơn' : 'Cần phê duyệt'}
        </span>
      </div>

      {evalData && (
        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
          <div>
            <span className="text-slate-400">Dư nợ: </span>
            <span className="font-semibold text-slate-100">
              {evalData.currentDebt.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div>
            <span className="text-slate-400">Hạn mức: </span>
            <span className="font-semibold text-slate-100">
              {evalData.creditLimit.toLocaleString('vi-VN')} đ
            </span>
          </div>
          {evalData.overdueDays > 0 && (
            <div className="col-span-2 text-rose-300">
              <span>Quá hạn tối đa: </span>
              <span className="font-bold">{evalData.overdueDays} ngày</span>
              <span> (Hạn mức cho phép: {evalData.maxDebtDays} ngày)</span>
            </div>
          )}
        </div>
      )}

      {reasons.length > 0 ? (
        <div className="space-y-1">
          <p className="font-semibold text-slate-300 text-[11px]">Lý do cảnh báo:</p>
          <ul className="list-disc pl-3.5 space-y-0.5 text-[11px] text-slate-200">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-emerald-300 text-[11px] flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Đại lý không có nợ quá hạn và chưa vượt hạn mức.
        </p>
      )}

      <div className="text-[10px] text-slate-400 border-t border-slate-700 pt-1 flex items-center gap-1">
        <Info className="w-3 h-3 text-slate-400" />
        {enforcementMode === 'BLOCK_ORDER'
          ? 'Hệ thống tự động chặn tạo đơn khi bị gắn cờ'
          : 'Đơn hàng mới tạo sẽ chuyển sang trạng thái Chờ duyệt'}
      </div>
    </div>
  );

  return (
    <Tooltip content={tooltipContent} position="top" usePortal={true}>
      {badgeElement}
    </Tooltip>
  );
};
