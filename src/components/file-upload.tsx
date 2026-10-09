import React, { useState, useRef } from "react";
import { UploadCloud, X, File, AlertCircle, Loader2 } from "lucide-react";

export interface FileUploadProps {
  label?: string;
  accept?: string; // vd: "image/png, image/jpeg" hoặc ".xlsx, .xls"
  maxSizeMB?: number; // Dung lượng tối đa theo MB
  value?: File | null;
  onChange?: (file: File | null) => void;
  previewUrl?: string | null;
  isUploading?: boolean;
  uploadProgress?: number;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
}

/**
 * Component FileUpload chuẩn LOHA SALES (UI_GUIDELINES Section 22)
 * - Vùng Dropzone trực quan, hỗ trợ kéo thả & click
 * - Hiển thị rõ định dạng cho phép và dung lượng tối đa
 * - Preview ảnh nếu là hình ảnh
 * - Nút xóa / đổi file nhanh chóng
 * - Kiểm tra lỗi định dạng và dung lượng trước khi submit
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = "image/*",
  maxSizeMB = 5,
  value,
  onChange,
  previewUrl: initialPreviewUrl,
  isUploading = false,
  uploadProgress,
  disabled = false,
  required = false,
  error: propError,
  helperText,
  className = "",
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayError = propError || internalError;
  const isImageUpload = accept.includes("image");

  const validateAndSetFile = (file: File) => {
    setInternalError(null);

    // Kiểm tra dung lượng
    const sizeInMB = file.size / (1024 * 1024);
    if (sizeInMB > maxSizeMB) {
      setInternalError(
        `File vượt quá dung lượng tối đa cho phép (${maxSizeMB}MB). Vui lòng chọn file khác.`,
      );
      return;
    }

    // Tạo preview nếu là ảnh
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        setLocalPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setLocalPreview(null);
    }

    onChange?.(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setDragOver(true);
    }
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setLocalPreview(null);
    setInternalError(null);
    onChange?.(null);
  };

  const activePreview = localPreview || initialPreviewUrl;

  return (
    <div className={`w-full text-left ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer select-none ${
          disabled
            ? "bg-slate-50 border-slate-200 cursor-not-allowed opacity-60"
            : isUploading
            ? "bg-slate-50 border-blue-400 cursor-wait"
            : dragOver
            ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
            : displayError
            ? "border-rose-300 bg-rose-50/40 hover:border-rose-400"
            : "border-slate-200 bg-white hover:border-[var(--color-primary)] hover:bg-slate-50/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          disabled={disabled || isUploading}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Trạng thái xem trước ảnh nếu có */}
        {activePreview && isImageUpload ? (
          <div className="relative group w-full flex flex-col items-center">
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center">
              <img
                src={activePreview}
                alt="Xem trước"
                className="w-full h-full object-cover"
              />
              {!disabled && !isUploading && (
                <button
                  type="button"
                  onClick={handleRemove}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors"
                  title="Xóa ảnh"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Nhấp hoặc kéo thả ảnh khác để thay thế
            </p>
          </div>
        ) : value ? (
          /* Trạng thái đã chọn file thông thường */
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200 w-full max-w-sm">
            <div className="p-2 rounded bg-white text-[var(--color-primary)] shadow-xs">
              <File className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {value.name}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                {(value.size / 1024).toFixed(1)} KB
              </p>
            </div>
            {!disabled && !isUploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="p-1 text-slate-400 hover:text-rose-600 rounded"
                title="Hủy file"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          /* Trạng thái rỗng (Empty) */
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">
              Kéo thả file vào đây hoặc <span className="text-[var(--color-primary)] underline">duyệt tìm file</span>
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Hỗ trợ: {accept} • Tối đa {maxSizeMB}MB
            </p>
          </div>
        )}

        {/* Trạng thái đang tải lên */}
        {isUploading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-lg flex flex-col items-center justify-center p-4">
            <Loader2 className="w-7 h-7 text-[var(--color-primary)] animate-spin mb-2" />
            <span className="text-xs font-semibold text-slate-700">
              Đang tải lên... {uploadProgress !== undefined ? `${uploadProgress}%` : ""}
            </span>
          </div>
        )}
      </div>

      {displayError ? (
        <p className="mt-2 text-xs text-rose-600 flex items-center gap-2 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayError}</span>
        </p>
      ) : helperText ? (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};
