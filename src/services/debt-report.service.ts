import { apiClient } from './api';
import type {
  DebtReportResponse,
  QueryDebtReportParams,
  AgencyInvoice,
  DebtLedgerStatement,
  QueryDebtLedgerParams,
  SalesRepOption,
  AgencyOption,
} from '../types/debt-report.type';

/**
 * Service gọi API Báo cáo tuổi nợ (SN-230) và Sổ chi tiết công nợ đại lý (SN-231)
 */
export const debtReportService = {
  /**
   * SN-230: Lấy danh sách sổ công nợ theo đại lý kèm phân tích tuổi nợ & summary
   * GET /api/debt-report
   */
  async getDebtReport(params?: QueryDebtReportParams): Promise<DebtReportResponse> {
    const res = await apiClient.get<DebtReportResponse>('/debt-report', {
      params,
    });
    return res.data;
  },

  /**
   * SN-230: Xuất báo cáo sổ công nợ ra file Excel (.xlsx) dưới dạng nhị phân Blob
   * GET /api/debt-report/export
   */
  async exportDebtReportToExcel(params?: QueryDebtReportParams): Promise<Blob> {
    const res = await apiClient.get('/debt-report/export', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  /**
   * SN-230: Xuất báo cáo sổ công nợ ra file PDF (.pdf) dưới dạng nhị phân Blob
   * GET /api/debt-report/export-pdf
   */
  async exportDebtReportToPdf(params?: QueryDebtReportParams): Promise<Blob> {
    const res = await apiClient.get('/debt-report/export-pdf', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  /**
   * SN-230: Xuất báo cáo sổ công nợ ra file Word (.docx) dưới dạng nhị phân Blob
   * GET /api/debt-report/export-word
   */
  async exportDebtReportToWord(params?: QueryDebtReportParams): Promise<Blob> {
    const res = await apiClient.get('/debt-report/export-word', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  /**
   * SN-230 / SN-231: Lấy danh sách nhân viên kinh doanh phụ trách
   * GET /api/debt-report/sales-reps
   */
  async getSalesReps(): Promise<SalesRepOption[]> {
    const res = await apiClient.get<SalesRepOption[]>('/debt-report/sales-reps');
    return res.data;
  },

  /**
   * SN-230 / SN-231: Lấy danh sách đại lý (cho combobox / smart select)
   * GET /api/debt-report/agencies
   */
  async getAgencies(): Promise<AgencyOption[]> {
    const res = await apiClient.get<AgencyOption[]>('/debt-report/agencies');
    return res.data;
  },

  /**
   * SN-231: Lấy sổ chi tiết công nợ đại lý (Receivable Ledger Statement)
   * GET /api/debt-report/ledger
   */
  async getDebtLedger(params: QueryDebtLedgerParams): Promise<DebtLedgerStatement> {
    const res = await apiClient.get<DebtLedgerStatement>('/debt-report/ledger', {
      params,
    });
    return res.data;
  },

  /**
   * SN-231: Xuất Sổ chi tiết công nợ ra file Excel (.xlsx)
   * GET /api/debt-report/ledger/export-excel
   */
  async exportLedgerToExcel(params: QueryDebtLedgerParams): Promise<Blob> {
    const res = await apiClient.get('/debt-report/ledger/export-excel', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  /**
   * SN-231: Xuất Sổ chi tiết công nợ ra file PDF chuẩn in ấn (.pdf)
   * GET /api/debt-report/ledger/export-pdf
   */
  async exportLedgerToPdf(params: QueryDebtLedgerParams): Promise<Blob> {
    const res = await apiClient.get('/debt-report/ledger/export-pdf', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  /**
   * SN-231: Xuất Sổ chi tiết công nợ ra file Word (.docx)
   * GET /api/debt-report/ledger/export-word
   */
  async exportLedgerToWord(params: QueryDebtLedgerParams): Promise<Blob> {
    const res = await apiClient.get('/debt-report/ledger/export-word', {
      params,
      responseType: 'blob',
    });
    return res.data as Blob;
  },

  /**
   * SN-203 (Legacy drilldown): Lấy danh sách hóa đơn theo dải tuổi nợ
   * GET /api/debt-report/:agencyId/invoices
   */
  async getAgencyInvoices(agencyId: string): Promise<AgencyInvoice[]> {
    const res = await apiClient.get<AgencyInvoice[]>(
      `/debt-report/${agencyId}/invoices`,
    );
    return res.data;
  },
};
