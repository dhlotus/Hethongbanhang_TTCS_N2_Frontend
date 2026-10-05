import React, { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  Info,
  Trash2,
} from 'lucide-react';
import { ModalLayout } from './modal-layout';
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

  const handleClose = useCallback(() => {
    if (isUploading) return;
    onClose();
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

  if (typeof document === 'undefined') return null;

  return (
    <ModalLayout
      isOpen={true}
      onClose={handleClose}
      title="Tạo tài khoản hàng loạt từ Excel"
      subtitle="Nhập nhân sự từ file bảng tính Excel (.xlsx, .xls)"
      icon={<FileSpreadsheet className="h-5 w-5 text-emerald-700" />}
      maxWidth="max-w-2xl"
      bodyClassName="p-6 space-y-5"
      footer={
        <div className="flex items-center justify-between w-full">
          {!report ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading}
                className="px-5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] px-6 py-2.5 text-xs font-semibold text-white shadow-sm transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Bắt đầu Import</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Nhập tiếp tệp khác
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm cursor-pointer"
              >
                Hoàn tất & Đóng
              </button>
            </>
          )}
        </div>
      }
    >
          {/* Thông báo lỗi client / server nếu có */}
          {clientError && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-700">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1 leading-relaxed">{clientError}</div>
            </div>
          )}

          {!report ? (
            <>
              {/* Vùng Dropzone & Card xem trước tệp */}
              {selectedFile ? (
                <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50/70 to-emerald-50/20 p-4 transition-all">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-500/20">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-slate-800 truncate" title={selectedFile.name}>
                            {selectedFile.name}
                          </p>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full shrink-0">
                            <CheckCircle2 className="h-3 w-3" /> Đã chọn
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Sẵn sàng tải lên và đối soát dữ liệu
                        </p>
                      </div>
                    </div>
                    {!isUploading && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReset();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
                        title="Hủy chọn tệp này để chọn tệp khác"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Đổi tệp</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-7 text-center transition-all cursor-pointer group ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                      : 'border-slate-200 bg-slate-50/40 hover:border-emerald-400 hover:bg-slate-50/80'
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

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100/80 text-emerald-700 mb-3 shadow-2xs group-hover:scale-105 group-hover:bg-emerald-100 transition-all">
                    {isUploading ? (
                      <RefreshCw className="h-6 w-6 animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6" />
                    )}
                  </div>

                  <p className="text-sm font-semibold text-slate-700">
                    Kéo thả tệp Excel vào đây hoặc <span className="text-emerald-600 underline underline-offset-2">chọn tệp từ máy tính</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hỗ trợ định dạng .xlsx, .xls dung lượng tối đa 5MB
                  </p>
                </div>
              )}

              {/* Progress bar giả lập khi upload */}
              {isUploading && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-2 text-emerald-800 font-semibold">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                      Đang đọc và tạo tài khoản từ tệp Excel...
                    </span>
                    <span className="text-slate-400">Vui lòng chờ</span>
                  </div>
                  <div className="h-1.5 w-full bg-emerald-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full animate-pulse w-3/4" />
                  </div>
                </div>
              )}

              {/* Hướng dẫn định dạng cột - Thiết kế trực quan, rõ ràng */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-slate-500" />
                    <span>Quy chuẩn 7 cột trong file Excel (theo đúng thứ tự):</span>
                  </div>
                  <span className="text-[11px] font-normal text-slate-400">Từ cột A đến cột G</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="flex flex-col justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Cột A</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold text-slate-800 text-[11px]">Họ và tên</span>
                      <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Bắt buộc</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Cột B</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold text-slate-800 text-[11px]">Username</span>
                      <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Bắt buộc</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Cột C</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold text-slate-800 text-[11px]">Email</span>
                      <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Bắt buộc</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Cột D</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold text-slate-800 text-[11px]">Mật khẩu</span>
                      <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">Tự sinh</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Cột E</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold text-slate-800 text-[11px]">Vai trò</span>
                      <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">Bắt buộc</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Cột F</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold text-slate-800 text-[11px]">Số ĐT</span>
                      <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">Tùy chọn</span>
                    </div>
                  </div>

                  <div className="flex flex-col justify-between p-2.5 rounded-xl bg-white border border-slate-200/70 shadow-2xs col-span-2">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Cột G</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-semibold text-slate-800 text-[11px]">Kho phụ trách</span>
                      <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.5 rounded">Tùy chọn</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-2 border-t border-slate-200/60">
                  <span className="font-semibold text-slate-600">Lưu ý:</span>
                  <span>Dòng 1 trong tệp là dòng tiêu đề cột và sẽ được tự động bỏ qua khi nhập dữ liệu.</span>
                </div>
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
    </ModalLayout>
  );
};

