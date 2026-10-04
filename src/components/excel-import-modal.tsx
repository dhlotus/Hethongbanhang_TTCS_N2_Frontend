import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Info,
} from 'lucide-react';
import { usersService } from '../services/users.service';
import type { ExcelImportReport, ImportRowResult } from '../types/user';

export interface ExcelImportModalProps {
  onClose: () => void;
  onImportSuccess?: () => void;
}

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ['.xlsx', '.xls'];

/**
 * Sub-component: Bảng các bản ghi nhập thành công kèm mật khẩu tạm
 */
interface SuccessTableProps {
  items: ImportRowResult[];
}

const SuccessTable: React.FC<SuccessTableProps> = ({ items }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-emerald-100 bg-white overflow-hidden shadow-2xs">
      <div className="bg-emerald-50/70 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-semibold text-emerald-800">
            Tài khoản tạo thành công ({items.length})
          </span>
        </div>
        <span className="text-[11px] text-emerald-600 font-medium">
          Mật khẩu tạm cần lưu lại cho nhân sự
        </span>
      </div>
      <div className="max-h-60 overflow-y-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 sticky top-0 border-b border-slate-100">
            <tr>
              <th className="px-3 py-2 text-center w-12">Dòng</th>
              <th className="px-3 py-2">Họ và tên</th>
              <th className="px-3 py-2">Tên đăng nhập</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Vai trò</th>
              <th className="px-3 py-2">Mật khẩu tạm</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <tr key={`success-${item.row}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-3 py-2 text-center font-mono text-slate-400 text-[11px]">
                  #{item.row}
                </td>
                <td className="px-3 py-2 font-medium text-slate-800">
                  {item.createdUser?.fullName || item.rawData.fullName || '—'}
                </td>
                <td className="px-3 py-2 font-mono text-slate-700">
                  {item.createdUser?.username || item.rawData.username || '—'}
                </td>
                <td className="px-3 py-2 text-slate-600">
                  {item.createdUser?.email || item.rawData.email || '—'}
                </td>
                <td className="px-3 py-2">
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    {item.createdUser?.role || item.rawData.role || '—'}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {item.temporaryPassword ? (
                    <div className="flex items-center gap-1.5">
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-slate-800 font-semibold select-all">
                        {item.temporaryPassword}
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.temporaryPassword || '', idx)}
                        title="Copy mật khẩu"
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                      >
                        {copiedIndex === idx ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Đã tạo từ file</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Sub-component: Bảng các bản ghi lỗi kèm nguyên nhân chi tiết
 */
interface ErrorTableProps {
  items: ImportRowResult[];
}

const ErrorTable: React.FC<ErrorTableProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-rose-100 bg-white overflow-hidden shadow-2xs">
      <div className="bg-rose-50/70 px-4 py-2.5 border-b border-rose-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span className="text-xs font-semibold text-rose-800">
            Dòng thất bại cần điều chỉnh ({items.length})
          </span>
        </div>
        <span className="text-[11px] text-rose-600 font-medium">
          Vui lòng sửa các dòng này trong file Excel và nhập lại
        </span>
      </div>
      <div className="max-h-60 overflow-y-auto">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 sticky top-0 border-b border-slate-100">
            <tr>
              <th className="px-3 py-2 text-center w-12">Dòng</th>
              <th className="px-3 py-2">Dữ liệu thô</th>
              <th className="px-3 py-2">Nguyên nhân lỗi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <tr key={`error-${item.row}-${idx}`} className="hover:bg-rose-50/20 transition-colors">
                <td className="px-3 py-2 text-center font-mono text-rose-500 font-semibold text-[11px]">
                  #{item.row}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium text-slate-800 text-[11px]">
                    {item.rawData.fullName || '—'}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    {item.rawData.username || item.rawData.email || 'Thiếu username/email'}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-600">
                    {item.errors && item.errors.length > 0 ? (
                      item.errors.map((err, errIdx) => (
                        <li key={errIdx} className="leading-tight">
                          {err}
                        </li>
                      ))
                    ) : (
                      <li>Dữ liệu không hợp lệ</li>
                    )}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Sub-component: 3 thẻ thống kê tóm tắt
 */
interface ResultStatsPanelProps {
  report: ExcelImportReport;
}

const ResultStatsPanel: React.FC<ResultStatsPanelProps> = ({ report }) => {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-center">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Tổng số dòng</p>
        <p className="text-xl font-bold text-slate-800 mt-1">{report.totalRows}</p>
      </div>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-center">
        <p className="text-[11px] font-medium text-emerald-600 uppercase tracking-wider">Thành công</p>
        <p className="text-xl font-bold text-emerald-700 mt-1">{report.successCount}</p>
      </div>
      <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 text-center">
        <p className="text-[11px] font-medium text-rose-600 uppercase tracking-wider">Thất bại</p>
        <p className="text-xl font-bold text-rose-700 mt-1">{report.failedCount}</p>
      </div>
    </div>
  );
};

/**
 * Modal chính: Import nhân sự hàng loạt từ file Excel (SN-147)
 */
export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  onClose,
  onImportSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [report, setReport] = useState<ExcelImportReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lắng nghe phím ESC để đóng khi không upload
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUploading, onClose]);

  const validateFile = useCallback((file: File): string | null => {
    const fileName = file.name.toLowerCase();
    const hasValidExt = ACCEPTED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    if (!hasValidExt) {
      return 'Vui lòng chọn tệp bảng tính định dạng Excel (.xlsx hoặc .xls)';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `Dung lượng tệp vượt quá giới hạn cho phép (${MAX_FILE_SIZE_MB}MB)`;
    }
    return null;
  }, []);

  const handleSelectFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setClientError(error);
      setSelectedFile(null);
    } else {
      setClientError(null);
      setSelectedFile(file);
    }
  }, [validateFile]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleSelectFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleSelectFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;
    setIsUploading(true);
    setClientError(null);

    try {
      const response = await usersService.importUsersFromExcel(selectedFile);
      if (response && response.data) {
        setReport(response.data);
        if (response.data.successCount > 0) {
          onImportSuccess?.();
        }
      } else {
        setClientError('Không nhận được dữ liệu báo cáo từ máy chủ.');
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string | string[] } }; message?: string };
      const serverMessage = errorObj?.response?.data?.message;
      if (Array.isArray(serverMessage)) {
        setClientError(serverMessage.join(', '));
      } else if (typeof serverMessage === 'string') {
        setClientError(serverMessage);
      } else {
        setClientError(errorObj?.message || 'Đã có lỗi xảy ra khi tải lên và xử lý tệp Excel.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setReport(null);
    setClientError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const successItems = report ? report.results.filter((r) => r.status === 'SUCCESS') : [];
  const failedItems = report ? report.results.filter((r) => r.status === 'FAILED') : [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="excel-import-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 id="excel-import-modal-title" className="text-base font-bold text-slate-800">
                Nhập Tài khoản Hàng loạt từ Excel
              </h2>
              <p className="text-xs text-slate-500">
                Tải lên bảng tính nhân sự để tự động kiểm tra và tạo tài khoản
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Đóng cửa sổ"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Thông báo lỗi client / server nếu có */}
          {clientError && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 leading-relaxed">{clientError}</div>
            </div>
          )}

          {!report ? (
            <>
              {/* Vùng Dropzone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                    : selectedFile
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-slate-200 bg-slate-50/40 hover:border-emerald-400 hover:bg-slate-50'
                } ${isUploading ? 'pointer-events-none opacity-70' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileInputChange}
                  className="hidden"
                  disabled={isUploading}
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 mb-3 shadow-inner">
                  {isUploading ? (
                    <RefreshCw className="h-7 w-7 animate-spin" />
                  ) : (
                    <Upload className="h-7 w-7" />
                  )}
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800 flex items-center justify-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {(selectedFile.size / 1024).toFixed(1)} KB — Bấm vào đây để chọn tệp khác
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-700">
                      Kéo thả tệp Excel vào đây hoặc <span className="text-emerald-600 underline">duyệt tệp</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Hỗ trợ tệp định dạng .xlsx, .xls dung lượng tối đa 5MB
                    </p>
                  </div>
                )}
              </div>

              {/* Progress bar giả lập khi upload */}
              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Đang phân tích và xử lý từng dòng dữ liệu...
                    </span>
                    <span>Vui lòng chờ</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full animate-pulse w-3/4" />
                  </div>
                </div>
              )}

              {/* Hướng dẫn định dạng cột */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Info className="h-4 w-4 text-slate-500" />
                  <span>Quy chuẩn 7 cột trong file Excel (theo thứ tự):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="font-semibold text-slate-800">1. Họ và tên</span>
                    <span className="text-rose-500 ml-0.5">*</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="font-semibold text-slate-800">2. Username</span>
                    <span className="text-rose-500 ml-0.5">*</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="font-semibold text-slate-800">3. Email</span>
                    <span className="text-rose-500 ml-0.5">*</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="font-semibold text-slate-800">4. Mật khẩu</span>
                    <span className="text-slate-400 text-[10px] ml-1">(để trống = auto)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="font-semibold text-slate-800">5. Vai trò</span>
                    <span className="text-rose-500 ml-0.5">*</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                    <span className="font-semibold text-slate-800">6. Số ĐT</span>
                    <span className="text-slate-400 text-[10px] ml-1">(tùy chọn)</span>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-200/80 col-span-2">
                    <span className="font-semibold text-slate-800">7. Kho phụ trách</span>
                    <span className="text-slate-400 text-[10px] ml-1">(tùy chọn)</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 italic pt-1">
                  * Dòng 1 được quy định là dòng Tiêu đề (Header) và sẽ được tự động bỏ qua.
                </p>
              </div>
            </>
          ) : (
            /* Hiển thị Báo cáo kết quả */
            <div className="space-y-4">
              <ResultStatsPanel report={report} />

              {/* Thông điệp tổng quan */}
              <div
                className={`rounded-xl p-3.5 text-xs font-medium flex items-center gap-2.5 ${
                  report.failedCount === 0
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : report.successCount === 0
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {report.failedCount === 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                )}
                <span>{report.summary}</span>
              </div>

              {/* Bảng kết quả thành công */}
              <SuccessTable items={successItems} />

              {/* Bảng kết quả thất bại */}
              <ErrorTable items={failedItems} />
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          {!report ? (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isUploading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Bắt đầu Import
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Nhập tiếp tệp khác
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm"
              >
                Hoàn tất & Đóng
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
