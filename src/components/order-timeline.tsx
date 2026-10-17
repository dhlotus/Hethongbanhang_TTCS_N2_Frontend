import React from 'react';
import type { OrderStatus } from '../types/order';
import { CheckCircle2, Clock, FileText, Package, PackageCheck, Truck, X } from 'lucide-react';

interface OrderTimelineProps {
  status: OrderStatus;
  shipmentStatus?: string;
}

const LIFECYCLE_STEPS = [
  { status: 'DRAFT', label: 'Nháp', icon: FileText },
  { status: 'PENDING', label: 'Chờ duyệt', icon: Clock },
  { status: 'APPROVED', label: 'Đã duyệt', icon: CheckCircle2 },
  { status: 'PROCESSING', label: 'Đang soạn', icon: Package },
  { status: 'PACKED', label: 'Đã đóng gói', icon: PackageCheck },
  { status: 'DISPATCHED', label: 'Đã xuất', icon: Package },
  { status: 'SHIPPED', label: 'Đang giao', icon: Truck },
  { status: 'DELIVERED', label: 'Đã giao', icon: CheckCircle2 },
  { status: 'CLOSED', label: 'Đóng', icon: CheckCircle2 },
] as const;

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ status, shipmentStatus }) => {
  // Determine current step index based on status and shipmentStatus
  let effectiveStatus: OrderStatus = status;
  if (status === 'PROCESSING' && shipmentStatus === 'PACKED') {
    effectiveStatus = 'PACKED';
  } else if ((status === 'PROCESSING' || status === 'PACKED') && shipmentStatus === 'SHIPPED') {
    effectiveStatus = 'SHIPPED';
  } else if (shipmentStatus === 'DELIVERED' && status !== 'CLOSED') {
    effectiveStatus = 'DELIVERED';
  }

  let currentIndex = LIFECYCLE_STEPS.findIndex((s) => s.status === effectiveStatus);

  // Handle alternative/special states mapping to the linear flow
  if (effectiveStatus === 'PENDING_APPROVAL' || effectiveStatus === 'PENDING_INVENTORY_APPROVAL') {
    currentIndex = 1; // Maps to Chờ duyệt
  }

  const isCancelled = status === 'CANCELLED';
  const isReturned = status === 'RETURNED';

  return (
    <div className="w-full py-4 overflow-x-auto custom-scrollbar">
      <div className="flex items-center justify-between min-w-[600px] relative px-4">
        {/* Background connector line */}
        <div className="absolute top-4 left-8 right-8 h-0.5 bg-slate-100 z-0"></div>

        {LIFECYCLE_STEPS.map((step, idx) => {
          const isCompleted = currentIndex >= idx;
          const isCurrent = currentIndex === idx;
          
          // Determine colors based on state
          let bgClass = 'bg-white border-slate-200 text-slate-300';
          let iconClass = 'text-slate-300';
          let textClass = 'text-slate-400';
          let lineClass = 'bg-slate-100';

          if (isCompleted && !isCancelled && !isReturned) {
            bgClass = 'bg-blue-500 border-blue-500 text-white shadow-sm';
            iconClass = 'text-white';
            textClass = 'text-slate-800 font-semibold';
            lineClass = 'bg-blue-500';
          }

          if (isCancelled && isCurrent) {
            bgClass = 'bg-red-500 border-red-500 text-white shadow-sm';
            iconClass = 'text-white';
            textClass = 'text-red-600 font-bold';
          }

          if (isReturned && isCurrent) {
            bgClass = 'bg-orange-500 border-orange-500 text-white shadow-sm';
            iconClass = 'text-white';
            textClass = 'text-orange-600 font-bold';
          }

          const Icon = isCancelled && isCurrent ? X : step.icon;

          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center gap-2">
              {/* Connector line fill to the left */}
              {idx > 0 && isCompleted && !isCancelled && !isReturned && (
                <div
                  className={`absolute top-4 right-1/2 w-full h-0.5 -z-10 ${lineClass}`}
                ></div>
              )}

              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${bgClass}`}
              >
                <Icon className={`w-4 h-4 ${iconClass}`} />
              </div>
              <span className={`text-xs whitespace-nowrap ${textClass}`}>
                {isCancelled && isCurrent ? 'Đã hủy' : isReturned && isCurrent ? 'Hoàn hàng' : step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
