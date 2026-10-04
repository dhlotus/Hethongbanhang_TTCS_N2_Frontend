import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  UploadCloud,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { productsService } from "../services/products.service";
import type { ImportProductItemDto, PreviewImportResult } from "../types/products";

interface ImportProductsModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState<PreviewImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const blob = await productsService.downloadImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Template_Nhap_SanPham.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Không thể tải tệp mẫu.");
    } finally {
      setLoading(false);
    }
  };

  const processFile = async (selectedFile: File) => {
    // Check extension
    const ext = selectedFile.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      setErrorMsg("Vui lòng chọn tệp Excel (.xlsx, .xls)");
      return;
    }

    setFile(selectedFile);
    setErrorMsg("");
    setPreviewResult(null);

    // Call preview API
    try {
      setLoading(true);
      const result = await productsService.previewImport(selectedFile);
      setPreviewResult(result);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra khi đọc tệp Excel.");
      setFile(null);
    } finally {
      setLoading(false);
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const selectedFile = e.dataTransfer.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleConfirm = async () => {
    if (!previewResult || previewResult.valid === 0) return;

    try {
      setLoading(true);
      setErrorMsg("");
      const result = await productsService.confirmImport(previewResult.data);
      if (result.error > 0) {
        setErrorMsg(`Đã nhập thành công ${result.success} dòng. Có ${result.error} dòng lỗi: \n${result.errorDetails.join("\n")}`);
      } else {
        onSuccess();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Có lỗi xảy ra khi xác nhận nhập.");
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:p-6 transition-all">
      <div className="relative flex max-h-full w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Nhập danh mục từ Excel (SN-24)
              </h2>
              <p className="text-xs text-slate-500">
                Tải lên tệp danh sách để tạo mới hoặc cập nhật hàng loạt.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {errorMsg && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100 whitespace-pre-wrap">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {/* Upload Area */}
          {!previewResult ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Tải tệp mẫu (.xlsx)
                </button>
              </div>

              <div
                className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all py-12 px-6 ${
                  isDragging 
                    ? "border-blue-500 bg-blue-50/70" 
                    : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50"
                }`}
                onClick={() => !loading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                
                {loading && file ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-sm font-semibold text-slate-700">
                      Đang xử lý tệp: {file.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Dung lượng: {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <>
                    <div className={`rounded-full p-4 shadow-sm transition-transform ${isDragging ? "bg-blue-100 scale-110" : "bg-white group-hover:scale-110"}`}>
                      <UploadCloud className="h-8 w-8 text-blue-500" />
                    </div>
                    <div className="mt-4 text-center pointer-events-none">
                      <p className="text-sm font-semibold text-slate-700">
                        {isDragging ? "Thả tệp vào đây" : "Nhấp để tải lên hoặc kéo thả tệp vào đây"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Chỉ hỗ trợ tệp định dạng .xlsx, tối đa 5000 dòng.
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Preview Table */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex items-center gap-6 text-sm font-medium">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs">Tổng số dòng</span>
                    <span className="text-slate-800 text-base">{previewResult.total}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs">Hợp lệ</span>
                    <span className="text-emerald-600 text-base flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" /> {previewResult.valid}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs">Lỗi</span>
                    <span className="text-red-600 text-base flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" /> {previewResult.invalid}
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setPreviewResult(null);
                    setFile(null);
                    setErrorMsg("");
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Chọn tệp khác
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-center w-12">Dòng</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3 w-48">Tên SP</th>
                      <th className="px-4 py-3">Giá bán</th>
                      <th className="px-4 py-3">Giá vốn</th>
                      <th className="px-4 py-3">Lỗi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {previewResult.data.map((item, idx) => (
                      <tr 
                        key={idx} 
                        className={!item.isValid ? "bg-red-50/50" : "hover:bg-slate-50"}
                      >
                        <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">{item.row}</td>
                        <td className="px-4 py-3">
                          {!item.isValid ? (
                            <span className="inline-flex rounded bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">LỖI</span>
                          ) : item.status === "UPDATE" ? (
                            <span className="inline-flex rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">CẬP NHẬT</span>
                          ) : (
                            <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">MỚI</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{item.sku}</td>
                        <td className="px-4 py-3 truncate max-w-[12rem]" title={item.name}>{item.name}</td>
                        <td className="px-4 py-3">{item.price?.toLocaleString()}</td>
                        <td className="px-4 py-3">{item.costPrice?.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-red-600 max-w-[15rem]">
                          {item.errors.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors focus:outline-none"
          >
            Hủy bỏ
          </button>
          
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !previewResult || previewResult.valid === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 transition-all focus:outline-none"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Xác nhận nhập kho
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
