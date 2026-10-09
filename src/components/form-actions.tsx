import React from "react";
import { Button } from "./button";

export interface FormActionsProps {
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  isSubmitting?: boolean;
  loadingText?: string;
  submitVariant?: "primary" | "danger";
  align?: "left" | "center" | "right" | "between";
  extraActions?: React.ReactNode;
  className?: string;
}

/**
 * Component FormActions chuẩn LOHA SALES (UI_GUIDELINES Section 60)
 * - Nút Hủy (Secondary/Outline) nhẹ nhàng
 * - Nút Submit (Primary/Danger) nổi bật, khóa thao tác và hiển thị spinner khi isSubmitting
 * - Căn chỉnh thống nhất ở chân Form
 */
export const FormActions: React.FC<FormActionsProps> = ({
  submitText = "Lưu thay đổi",
  cancelText = "Hủy bỏ",
  onCancel,
  isSubmitting = false,
  loadingText = "Đang lưu...",
  submitVariant = "primary",
  align = "right",
  extraActions,
  className = "",
}) => {
  const alignStyles = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
    between: "justify-between",
  }[align];

  return (
    <div
      className={`flex items-center gap-3 pt-4 border-t border-slate-100 ${alignStyles} ${className}`}
    >
      {extraActions && <div className="mr-auto">{extraActions}</div>}

      {onCancel && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          fullWidth={false}
          disabled={isSubmitting}
          onClick={onCancel}
        >
          {cancelText}
        </Button>
      )}

      <Button
        type="submit"
        variant={submitVariant}
        size="sm"
        fullWidth={false}
        isLoading={isSubmitting}
        loadingText={loadingText}
      >
        {submitText}
      </Button>
    </div>
  );
};
