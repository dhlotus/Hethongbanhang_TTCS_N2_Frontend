import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Printer,
  Download,
  X,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { quantityToVietnameseWords } from '../../utils/number-to-words';
import type { InternalTransfer } from '../../types/internal-transfer.types';
import type { Warehouse } from '../../types/warehouse.types';

export interface TransferPrintModalProps {
  transfer: InternalTransfer | null;
  warehouses?: Warehouse[];
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Định dạng ngày tháng theo chuẩn văn bản kế toán: NGÀY DD THÁNG MM NĂM YYYY
 */
const formatPrintDate = (dateStr?: string): { day: string; month: string; year: string } => {
  const d = dateStr ? new Date(dateStr) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  return {
    day: String(validDate.getDate()).padStart(2, '0'),
    month: String(validDate.getMonth() + 1).padStart(2, '0'),
    year: String(validDate.getFullYear()),
  };
};

/**
 * Modal xem trước và in Phiếu Xuất Điều Chuyển chuẩn A4 theo đúng biểu mẫu chứng từ kho (SN-181)
 */
export const TransferPrintModal: React.FC<TransferPrintModalProps> = ({
  transfer,
  warehouses = [],
  isOpen,
  onClose,
}) => {
  const printContentRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !transfer) return null;

  const dateParts = formatPrintDate(transfer.transferredAt || transfer.createdAt);

  // Tìm mã kho tương ứng để hiển thị định dạng: [Mã kho] - [Tên kho]
  const fromWh = warehouses.find((w) => w.id === transfer.fromWarehouseId);
  const toWh = warehouses.find((w) => w.id === transfer.toWarehouseId);

  const fromWarehouseDisplay = fromWh
    ? `${fromWh.code} - ${fromWh.name}`
    : transfer.fromWarehouseName;
  const toWarehouseDisplay = toWh
    ? `${toWh.code} - ${toWh.name}`
    : transfer.toWarehouseName;

  // Tính tổng số lượng thực xuất và thực nhập dạng số nguyên chuẩn
  const totalExportQuantity = Math.round(
    (transfer.items || []).reduce(
      (sum, item) => sum + (Number(item.transferQuantity) || 0),
      0,
    ),
  );

  const totalReceivedQuantity = Math.round(
    (transfer.items || []).reduce(
      (sum, item) =>
        sum +
        (Number(
          item.receivedQuantity != null
            ? item.receivedQuantity
            : item.transferQuantity,
        ) || 0),
      0,
    ),
  );

  const quantityInWords = quantityToVietnameseWords(totalExportQuantity);

  /**
   * Kỹ thuật in cô lập qua iframe ẩn:
   * Đảm bảo máy in chỉ nhận duy nhất nội dung Phiếu Xuất Điều Chuyển,
   * tuyệt đối không in giao diện web, modal, nút bấm hay thanh điều hướng.
   */
  const handlePrint = () => {
    let printIframe = document.getElementById(
      'transfer-print-iframe',
    ) as HTMLIFrameElement | null;

    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'transfer-print-iframe';
      printIframe.style.position = 'fixed';
      printIframe.style.right = '0';
      printIframe.style.bottom = '0';
      printIframe.style.width = '0';
      printIframe.style.height = '0';
      printIframe.style.border = '0';
      document.body.appendChild(printIframe);
    }

    const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!doc || !printIframe.contentWindow) {
      window.print();
      return;
    }

    const itemsHtml = (transfer.items || [])
      .map((item, index) => {
        const exportQty = Math.round(Number(item.transferQuantity) || 0);
        const importQty = Math.round(
          Number(
            item.receivedQuantity != null
              ? item.receivedQuantity
              : item.transferQuantity,
          ) || 0,
        );
        return `
          <tr>
            <td style="text-align: center; border: 1px solid #000; padding: 6px 8px;">${index + 1}</td>
            <td style="text-align: center; border: 1px solid #000; padding: 6px 8px; font-family: monospace;">${item.sku}</td>
            <td style="border: 1px solid #000; padding: 6px 8px; text-align: left;">${item.productName}</td>
            <td style="text-align: center; border: 1px solid #000; padding: 6px 8px;">${item.unit || item.baseUnit}</td>
            <td style="text-align: right; border: 1px solid #000; padding: 6px 8px; font-weight: bold;">${exportQty.toLocaleString('vi-VN')}</td>
            <td style="text-align: right; border: 1px solid #000; padding: 6px 8px; font-weight: bold;">${importQty.toLocaleString('vi-VN')}</td>
          </tr>
        `;
      })
      .join('');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Phiếu Xuất Điều Chuyển - ${transfer.code}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Times New Roman', Times, serif;
              color: #000000;
              background: #ffffff;
              font-size: 13px;
              line-height: 1.5;
            }
            .header-info {
              margin-bottom: 16px;
              line-height: 1.4;
            }
            .header-info p {
              margin: 2px 0;
            }
            .doc-title {
              text-align: center;
              margin: 20px 0 16px 0;
            }
            .doc-title h1 {
              font-size: 20px;
              font-weight: bold;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .doc-date {
              margin: 4px 0 0 0;
              font-size: 13px;
              font-style: italic;
            }
            .doc-code {
              margin: 4px 0 0 0;
              font-size: 13px;
            }
            .meta-section {
              margin-bottom: 16px;
              font-size: 13px;
              line-height: 1.6;
            }
            .meta-row {
              display: flex;
              margin-bottom: 4px;
            }
            .meta-label {
              width: 170px;
              font-weight: 600;
              flex-shrink: 0;
            }
            .meta-value {
              flex: 1;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              border: 1px solid #000;
              margin: 14px 0;
              font-size: 12.5px;
            }
            th, td {
              border: 1px solid #000;
              padding: 6px 8px;
            }
            th {
              background-color: #f8fafc !important;
              font-weight: bold;
              text-align: center;
              font-size: 12px;
            }
            .words-row {
              margin: 12px 0 20px 0;
              font-size: 13px;
              line-height: 1.6;
            }
            .signatures-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              column-gap: 32px;
              text-align: center;
              margin-top: 20px;
              page-break-inside: avoid;
            }
            .sub-signatures {
              display: grid;
              grid-template-columns: 1fr 1fr;
              column-gap: 16px;
            }
            .sign-title {
              font-weight: bold;
              text-transform: uppercase;
              margin: 0;
              font-size: 12.5px;
            }
            .sign-sub {
              font-size: 11px;
              font-style: italic;
              color: #444;
              margin: 2px 0 0 0;
            }
            .sign-space {
              height: 80px;
            }
          </style>
        </head>
        <body>
          <div class="header-info">
            <p><strong>Công ty:</strong> CÔNG TY CỔ PHẦN PHÂN PHỐI & THỰC PHẨM DINH DƯỠNG LOHA VIỆT NAM</p>
            <p><strong>Địa chỉ:</strong> 123 Nguyễn Trọng Tuyển, Phường 8, Quận Phú Nhuận, Thành phố Hồ Chí Minh</p>
          </div>

          <div class="doc-title">
            <h1>PHIẾU XUẤT ĐIỀU CHUYỂN</h1>
            <p class="doc-date">Ngày ${dateParts.day} tháng ${dateParts.month} năm ${dateParts.year}</p>
            <p class="doc-code">Số chứng từ: <strong>${transfer.code}</strong></p>
          </div>

          <div class="meta-section">
            <div class="meta-row">
              <div class="meta-label">Người nhận hàng:</div>
              <div class="meta-value">${transfer.receivedByName || 'Nguyễn Văn A'}</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Nội dung điều chuyển:</div>
              <div class="meta-value">${transfer.notes || 'Xuất điều chuyển sang kho chi nhánh'}</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Kho xuất hàng:</div>
              <div class="meta-value">${fromWarehouseDisplay}</div>
            </div>
            <div class="meta-row">
              <div class="meta-label">Kho nhận hàng:</div>
              <div class="meta-value">${toWarehouseDisplay}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 50px;">SỐ THỨ TỰ</th>
                <th style="width: 120px;">MÃ VẬT TƯ</th>
                <th>TÊN VẬT TƯ, HÀNG HÓA</th>
                <th style="width: 95px;">ĐƠN VỊ TÍNH</th>
                <th style="width: 125px;">SỐ LƯỢNG THỰC XUẤT</th>
                <th style="width: 125px;">SỐ LƯỢNG THỰC NHẬP</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr style="font-weight: bold;">
                <td colspan="4" style="text-align: right; text-transform: uppercase; border: 1px solid #000; padding: 6px 8px;">TỔNG CỘNG:</td>
                <td style="text-align: right; border: 1px solid #000; padding: 6px 8px; font-weight: bold;">${totalExportQuantity.toLocaleString('vi-VN')}</td>
                <td style="text-align: right; border: 1px solid #000; padding: 6px 8px; font-weight: bold;">${totalReceivedQuantity.toLocaleString('vi-VN')}</td>
              </tr>
            </tbody>
          </table>

          <div class="words-row">
            Tổng số lượng thực xuất (viết bằng chữ): <span style="font-style: italic; font-weight: 600;">${quantityInWords}</span>
          </div>

          <div class="signatures-grid">
            <div>
              <p style="font-style: italic; margin-bottom: 8px;">Xuất ngày ..... tháng ..... năm .........</p>
              <div class="sub-signatures">
                <div>
                  <p class="sign-title">NGƯỜI GIAO HÀNG</p>
                  <p class="sign-sub">(Ký, ghi rõ họ tên và đóng dấu)</p>
                  <div class="sign-space"></div>
                </div>
                <div>
                  <p class="sign-title">THỦ KHO XUẤT</p>
                  <p class="sign-sub">(Ký, ghi rõ họ tên)</p>
                  <div class="sign-space"></div>
                </div>
              </div>
            </div>

            <div>
              <p style="font-style: italic; margin-bottom: 8px;">Nhập ngày ..... tháng ..... năm .........</p>
              <div class="sub-signatures">
                <div>
                  <p class="sign-title">NGƯỜI NHẬN HÀNG</p>
                  <p class="sign-sub">(Ký, ghi rõ họ tên)</p>
                  <div class="sign-space"></div>
                </div>
                <div>
                  <p class="sign-title">THỦ KHO NHẬN</p>
                  <p class="sign-sub">(Ký, ghi rõ họ tên)</p>
                  <div class="sign-space"></div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe?.contentWindow?.focus();
      printIframe?.contentWindow?.print();
    }, 200);
  };

  const handleExportPdf = () => {
    handlePrint();
  };

  const modalElement = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Thanh công cụ xem trước (Ẩn khi in) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary-light)] text-[var(--color-primary)] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Xem Trước & In Phiếu Xuất Điều Chuyển
              </h2>
              <p className="text-xs text-slate-500">
                Mã chứng từ:{' '}
                <span className="font-mono font-bold text-[var(--color-primary)] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {transfer.code}
                </span>{' '}
                · Khổ giấy A4 tiêu chuẩn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-xs transition-colors cursor-pointer"
              title="In trực tiếp ra máy in A4"
            >
              <Printer className="w-3.5 h-3.5" />
              In phiếu ngay
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
              title="Xuất file PDF để lưu trữ chứng từ"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer ml-1"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Nội dung Mẫu in chuẩn A4 (Xem trước trực quan trên màn hình) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100">
          <div
            ref={printContentRef}
            id="transfer-print-document"
            className="bg-white max-w-[210mm] mx-auto p-8 sm:p-12 rounded-sm shadow-xl border border-slate-300 text-black text-xs sm:text-sm"
            style={{ fontFamily: "'Times New Roman', Times, serif" }}
          >
            {/* 1. Header Công ty */}
            <div className="text-xs sm:text-sm mb-5 leading-normal pb-3 border-b border-slate-200">
              <p className="font-bold">
                Công ty: CÔNG TY CỔ PHẦN PHÂN PHỐI & THỰC PHẨM DINH DƯỠNG LOHA VIỆT NAM
              </p>
              <p className="mt-0.5">
                Địa chỉ: 123 Nguyễn Trọng Tuyển, Phường 8, Quận Phú Nhuận, Thành phố Hồ Chí Minh
              </p>
            </div>

            {/* 2. Tiêu đề Phiếu xuất điều chuyển */}
            <div className="text-center my-6">
              <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wide text-slate-950">
                PHIẾU XUẤT ĐIỀU CHUYỂN
              </h1>
              <p className="text-xs sm:text-sm mt-1.5 italic text-slate-700">
                Ngày {dateParts.day} tháng {dateParts.month} năm {dateParts.year}
              </p>
              <p className="text-xs sm:text-sm mt-1 text-slate-800">
                Số chứng từ:{' '}
                <span className="font-mono font-bold text-sm bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  {transfer.code}
                </span>
              </p>
            </div>

            {/* 3. Thông tin người nhận, nội dung, kho xuất, kho nhập */}
            <div className="space-y-2 mb-6 text-xs sm:text-sm leading-relaxed">
              <div className="flex">
                <span className="w-44 shrink-0 font-semibold text-slate-800">Người nhận hàng:</span>
                <span className="text-slate-900">{transfer.receivedByName || 'Nguyễn Văn A'}</span>
              </div>
              <div className="flex">
                <span className="w-44 shrink-0 font-semibold text-slate-800">Nội dung điều chuyển:</span>
                <span className="text-slate-900">{transfer.notes || 'Xuất điều chuyển sang kho chi nhánh'}</span>
              </div>
              <div className="flex">
                <span className="w-44 shrink-0 font-semibold text-slate-800">Kho xuất hàng:</span>
                <span className="text-slate-900 font-medium">{fromWarehouseDisplay}</span>
              </div>
              <div className="flex">
                <span className="w-44 shrink-0 font-semibold text-slate-800">Kho nhận hàng:</span>
                <span className="text-slate-900 font-medium">{toWarehouseDisplay}</span>
              </div>
            </div>

            {/* 4. Bảng chi tiết vật tư / hàng hóa chuẩn 6 cột */}
            <div className="mb-4">
              <table className="w-full border-collapse border border-black text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-center font-bold">
                    <th className="border border-black p-2 w-14">SỐ THỨ TỰ</th>
                    <th className="border border-black p-2 w-28">MÃ VẬT TƯ</th>
                    <th className="border border-black p-2">TÊN VẬT TƯ, HÀNG HÓA</th>
                    <th className="border border-black p-2 w-24">ĐƠN VỊ TÍNH</th>
                    <th className="border border-black p-2 w-32">SỐ LƯỢNG THỰC XUẤT</th>
                    <th className="border border-black p-2 w-32">SỐ LƯỢNG THỰC NHẬP</th>
                  </tr>
                </thead>
                <tbody>
                  {(transfer.items || []).map((item, index) => {
                    const exportQty = Math.round(Number(item.transferQuantity) || 0);
                    return (
                      <tr key={item.id || index} className="align-middle">
                        <td className="border border-black p-2 text-center">{index + 1}</td>
                        <td className="border border-black p-2 text-center font-mono font-medium">
                          {item.sku}
                        </td>
                        <td className="border border-black p-2 text-left">{item.productName}</td>
                        <td className="border border-black p-2 text-center">{item.unit || item.baseUnit}</td>
                        <td className="border border-black p-2 text-right font-bold">
                          {exportQty.toLocaleString('vi-VN')}
                        </td>
                        <td className="border border-black p-2 text-right font-bold">
                          {Math.round(
                            Number(
                              item.receivedQuantity != null
                                ? item.receivedQuantity
                                : item.transferQuantity,
                            ) || 0,
                          ).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Dòng tổng cộng */}
                  <tr className="font-bold">
                    <td colSpan={4} className="border border-black p-2 text-right uppercase">
                      TỔNG CỘNG:
                    </td>
                    <td className="border border-black p-2 text-right font-bold">
                      {totalExportQuantity.toLocaleString('vi-VN')}
                    </td>
                    <td className="border border-black p-2 text-right font-bold">
                      {totalReceivedQuantity.toLocaleString('vi-VN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 5. Số lượng viết bằng chữ */}
            <div className="mb-6 text-xs sm:text-sm leading-relaxed">
              <span>Tổng số lượng thực xuất (viết bằng chữ): </span>
              <span className="font-semibold italic">{quantityInWords}</span>
            </div>

            {/* 6. Phần chữ ký xác nhận 4 vị trí (Xuất & Nhập) theo đúng mẫu biểu gốc, không có dòng admin */}
            <div className="grid grid-cols-2 gap-8 text-center text-xs sm:text-sm mt-8">
              {/* Vế bên trái: Xuất kho */}
              <div>
                <p className="italic mb-3 text-slate-700">
                  Xuất ngày ..... tháng ..... năm .........
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold uppercase text-slate-900">NGƯỜI GIAO HÀNG</p>
                    <p className="text-[11px] italic text-slate-500 mt-0.5">(Ký, ghi rõ họ tên và đóng dấu)</p>
                    <div className="h-20" />
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-900">THỦ KHO XUẤT</p>
                    <p className="text-[11px] italic text-slate-500 mt-0.5">(Ký, ghi rõ họ tên)</p>
                    <div className="h-20" />
                  </div>
                </div>
              </div>

              {/* Vế bên phải: Nhập kho */}
              <div>
                <p className="italic mb-3 text-slate-700">
                  Nhập ngày ..... tháng ..... năm .........
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-bold uppercase text-slate-900">NGƯỜI NHẬN HÀNG</p>
                    <p className="text-[11px] italic text-slate-500 mt-0.5">(Ký, ghi rõ họ tên)</p>
                    <div className="h-20" />
                  </div>
                  <div>
                    <p className="font-bold uppercase text-slate-900">THỦ KHO NHẬN</p>
                    <p className="text-[11px] italic text-slate-500 mt-0.5">(Ký, ghi rõ họ tên)</p>
                    <div className="h-20" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer modal trên màn hình */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Mẫu phiếu điều chuyển đã sẵn sàng theo khổ giấy tiêu chuẩn A4</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In phiếu ngay
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }
  return modalElement;
};
