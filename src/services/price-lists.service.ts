import { apiClient } from './api';
import type {
  PriceList,
  CreatePriceListPayload,
  UpdatePriceListPayload,
  ClonePriceListPayload,
  GetPriceListsParams,
  PaginatedPriceListsResponse,
  PriceListStatusType,
} from '../types/price-list';

/**
 * 5 Bảng giá mẫu Offline Fallback (phòng khi Backend tạm thời chưa khởi động hoặc mất kết nối)
 */
const FALLBACK_PRICE_LISTS: PriceList[] = [
  {
    id: 'pl-001',
    code: 'BG-RETAIL-2026',
    name: 'Bảng giá Bán lẻ Niêm yết 2026',
    customerGroup: 'RETAIL',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    parentVersionId: null,
    hasOrders: false,
    description: 'Bảng giá bán lẻ tiêu chuẩn áp dụng toàn quốc năm 2026',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    items: [
      {
        id: 'pli-001-1',
        productId: 'prod-001',
        productCode: 'LH-MILK-900G',
        productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
        price: 520000,
        minPrice: 480000,
        baseUnit: 'Lon',
      },
      {
        id: 'pli-001-2',
        productId: 'prod-002',
        productCode: 'LH-NUT-180ML',
        productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
        price: 18000,
        minPrice: 15000,
        baseUnit: 'Hộp',
      },
      {
        id: 'pli-001-3',
        productId: 'prod-003',
        productCode: 'LH-NEST-70ML',
        productName: 'Nước Yến Sào Chưng Đường Phèn Loha Nest 70ml',
        price: 65000,
        minPrice: 58000,
        baseUnit: 'Hũ',
      },
      {
        id: 'pli-001-4',
        productId: 'prod-004',
        productCode: 'LH-CEREAL-500G',
        productName: 'Ngũ Cốc Dinh Dưỡng Hạt Mầm Loha Meal 500g',
        price: 145000,
        minPrice: 130000,
        baseUnit: 'Túi',
      },
      {
        id: 'pli-001-5',
        productId: 'prod-005',
        productCode: 'LH-COLLAGEN-50ML',
        productName: 'Nước Uống Collagen Đông Trùng Hạ Thảo 50ml',
        price: 85000,
        minPrice: 75000,
        baseUnit: 'Chai',
      },
    ],
  },
  {
    id: 'pl-002',
    code: 'BG-AGENT1-Q4-2026',
    name: 'Bảng giá Đại lý Cấp 1 - Q4/2026',
    customerGroup: 'AGENT_LEVEL_1',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: 'ACTIVE',
    version: 1,
    parentVersionId: null,
    hasOrders: true, // Khóa Sửa/Xóa, bật nút Clone Version
    description: 'Chính sách chiết khấu sâu dành riêng cho hệ thống Nhà phân phối & Đại lý Cấp 1',
    createdAt: '2026-09-25T08:30:00.000Z',
    updatedAt: '2026-09-25T08:30:00.000Z',
    items: [
      {
        id: 'pli-002-1',
        productId: 'prod-001',
        productCode: 'LH-MILK-900G',
        productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
        price: 440000,
        minPrice: 400000,
        baseUnit: 'Lon',
      },
      {
        id: 'pli-002-2',
        productId: 'prod-002',
        productCode: 'LH-NUT-180ML',
        productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
        price: 14000,
        minPrice: 12500,
        baseUnit: 'Hộp',
      },
      {
        id: 'pli-002-3',
        productId: 'prod-003',
        productCode: 'LH-NEST-70ML',
        productName: 'Nước Yến Sào Chưng Đường Phèn Loha Nest 70ml',
        price: 52000,
        minPrice: 45000,
        baseUnit: 'Hũ',
      },
      {
        id: 'pli-002-4',
        productId: 'prod-004',
        productCode: 'LH-CEREAL-500G',
        productName: 'Ngũ Cốc Dinh Dưỡng Hạt Mầm Loha Meal 500g',
        price: 118000,
        minPrice: 105000,
        baseUnit: 'Túi',
      },
      {
        id: 'pli-002-5',
        productId: 'prod-005',
        productCode: 'LH-COLLAGEN-50ML',
        productName: 'Nước Uống Collagen Đông Trùng Hạ Thảo 50ml',
        price: 68000,
        minPrice: 60000,
        baseUnit: 'Chai',
      },
    ],
  },
  {
    id: 'pl-003',
    code: 'BG-AGENT2-TET-2027',
    name: 'Bảng giá Đại lý Cấp 2 - Mùa Tết',
    customerGroup: 'AGENT_LEVEL_2',
    startDate: '2026-11-01',
    endDate: '2027-02-28',
    status: 'ACTIVE',
    version: 1,
    parentVersionId: null,
    hasOrders: false,
    description: 'Chính sách kích cầu đại lý cấp 2 phục vụ giai đoạn cao điểm trước Tết Nguyên Đán',
    createdAt: '2026-10-01T09:00:00.000Z',
    updatedAt: '2026-10-01T09:00:00.000Z',
    items: [
      {
        id: 'pli-003-1',
        productId: 'prod-001',
        productCode: 'LH-MILK-900G',
        productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
        price: 470000,
        minPrice: 450000,
        baseUnit: 'Lon',
      },
      {
        id: 'pli-003-2',
        productId: 'prod-002',
        productCode: 'LH-NUT-180ML',
        productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
        price: 16000,
        minPrice: 14000,
        baseUnit: 'Hộp',
      },
      {
        id: 'pli-003-3',
        productId: 'prod-003',
        productCode: 'LH-NEST-70ML',
        productName: 'Nước Yến Sào Chưng Đường Phèn Loha Nest 70ml',
        price: 58000,
        minPrice: 52000,
        baseUnit: 'Hũ',
      },
      {
        id: 'pli-003-4',
        productId: 'prod-004',
        productCode: 'LH-CEREAL-500G',
        productName: 'Ngũ Cốc Dinh Dưỡng Hạt Mầm Loha Meal 500g',
        price: 130000,
        minPrice: 118000,
        baseUnit: 'Túi',
      },
      {
        id: 'pli-003-5',
        productId: 'prod-005',
        productCode: 'LH-COLLAGEN-50ML',
        productName: 'Nước Uống Collagen Đông Trùng Hạ Thảo 50ml',
        price: 76000,
        minPrice: 68000,
        baseUnit: 'Chai',
      },
    ],
  },
  {
    id: 'pl-004',
    code: 'BG-AGENT1-Q4-2026-V2',
    name: 'Bảng giá Đại lý Cấp 1 - v2.0',
    customerGroup: 'AGENT_LEVEL_1',
    startDate: '2026-10-01',
    endDate: '2026-12-31',
    status: 'DRAFT',
    version: 2,
    parentVersionId: 'pl-002',
    hasOrders: false,
    description: 'Bản nháp phiên bản 2.0 nhân bản từ BG-AGENT1-Q4-2026, chuẩn bị cập nhật mức giá mới',
    createdAt: '2026-10-02T14:15:00.000Z',
    updatedAt: '2026-10-02T14:15:00.000Z',
    items: [
      {
        id: 'pli-004-1',
        productId: 'prod-001',
        productCode: 'LH-MILK-900G',
        productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
        price: 445000,
        minPrice: 400000,
        baseUnit: 'Lon',
      },
      {
        id: 'pli-004-2',
        productId: 'prod-002',
        productCode: 'LH-NUT-180ML',
        productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
        price: 14500,
        minPrice: 12500,
        baseUnit: 'Hộp',
      },
      {
        id: 'pli-004-3',
        productId: 'prod-003',
        productCode: 'LH-NEST-70ML',
        productName: 'Nước Yến Sào Chưng Đường Phèn Loha Nest 70ml',
        price: 53000,
        minPrice: 45000,
        baseUnit: 'Hũ',
      },
      {
        id: 'pli-004-4',
        productId: 'prod-004',
        productCode: 'LH-CEREAL-500G',
        productName: 'Ngũ Cốc Dinh Dưỡng Hạt Mầm Loha Meal 500g',
        price: 120000,
        minPrice: 105000,
        baseUnit: 'Túi',
      },
      {
        id: 'pli-004-5',
        productId: 'prod-005',
        productCode: 'LH-COLLAGEN-50ML',
        productName: 'Nước Uống Collagen Đông Trùng Hạ Thảo 50ml',
        price: 70000,
        minPrice: 60000,
        baseUnit: 'Chai',
      },
    ],
  },
  {
    id: 'pl-005',
    code: 'BG-SUMMER-PROMO-2026',
    name: 'Khuyến mãi Mùa Hè 2026',
    customerGroup: 'RETAIL',
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    status: 'EXPIRED',
    version: 1,
    parentVersionId: null,
    hasOrders: false,
    description: 'Chương trình trợ giá bán lẻ mùa hè 2026 (đã hết hiệu lực)',
    createdAt: '2026-05-20T10:00:00.000Z',
    updatedAt: '2026-08-31T23:59:59.000Z',
    items: [
      {
        id: 'pli-005-1',
        productId: 'prod-001',
        productCode: 'LH-MILK-900G',
        productName: 'Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g',
        price: 490000,
        minPrice: 460000,
        baseUnit: 'Lon',
      },
      {
        id: 'pli-005-2',
        productId: 'prod-002',
        productCode: 'LH-NUT-180ML',
        productName: 'Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml',
        price: 16500,
        minPrice: 14500,
        baseUnit: 'Hộp',
      },
      {
        id: 'pli-005-3',
        productId: 'prod-003',
        productCode: 'LH-NEST-70ML',
        productName: 'Nước Yến Sào Chưng Đường Phèn Loha Nest 70ml',
        price: 60000,
        minPrice: 50000,
        baseUnit: 'Hũ',
      },
      {
        id: 'pli-005-4',
        productId: 'prod-004',
        productCode: 'LH-CEREAL-500G',
        productName: 'Ngũ Cốc Dinh Dưỡng Hạt Mầm Loha Meal 500g',
        price: 135000,
        minPrice: 120000,
        baseUnit: 'Túi',
      },
      {
        id: 'pli-005-5',
        productId: 'prod-005',
        productCode: 'LH-COLLAGEN-50ML',
        productName: 'Nước Uống Collagen Đông Trùng Hạ Thảo 50ml',
        price: 78000,
        minPrice: 70000,
        baseUnit: 'Chai',
      },
    ],
  },
];

let localCache: PriceList[] = [...FALLBACK_PRICE_LISTS];

export const priceListsService = {
  /**
   * Lấy danh sách bảng giá có phân trang, tìm kiếm và lọc
   */
  async getPriceLists(params: GetPriceListsParams = {}): Promise<PaginatedPriceListsResponse> {
    try {
      const response = await apiClient.get<PaginatedPriceListsResponse>('/price-lists', {
        params,
      });
      return response.data;
    } catch {
      // Fallback cục bộ khi chưa bật Backend
      let items = [...localCache];

      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        items = items.filter(
          (pl) =>
            pl.code.toLowerCase().includes(q) ||
            pl.name.toLowerCase().includes(q) ||
            (pl.description && pl.description.toLowerCase().includes(q)),
        );
      }

      if (params.customerGroup && params.customerGroup !== 'ALL') {
        items = items.filter((pl) => pl.customerGroup === params.customerGroup);
      }

      if (params.status && params.status !== 'ALL') {
        items = items.filter((pl) => pl.status === params.status);
      }

      const page = params.page || 1;
      const limit = params.limit || 20;
      const total = items.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const data = items.slice(startIndex, startIndex + limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
      };
    }
  },

  /**
   * Lấy chi tiết bảng giá theo ID
   */
  async getPriceListById(id: string): Promise<PriceList> {
    try {
      const response = await apiClient.get<PriceList>(`/price-lists/${id}`);
      return response.data;
    } catch {
      const found = localCache.find((pl) => pl.id === id || pl.code === id);
      if (!found) throw new Error(`Không tìm thấy bảng giá với ID: ${id}`);
      return found;
    }
  },

  /**
   * Tạo mới bảng giá
   */
  async createPriceList(payload: CreatePriceListPayload): Promise<PriceList> {
    try {
      const response = await apiClient.post<PriceList>('/price-lists', payload);
      return response.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr?.response?.data?.message;
      if (msg) {
        throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
      throw err;
    }
  },

  /**
   * Cập nhật thông tin bảng giá
   */
  async updatePriceList(id: string, payload: UpdatePriceListPayload): Promise<PriceList> {
    try {
      const response = await apiClient.put<PriceList>(`/price-lists/${id}`, payload);
      return response.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
      const msg = axiosErr?.response?.data?.message;
      if (msg) {
        throw new Error(Array.isArray(msg) ? msg.join(', ') : msg);
      }
      throw err;
    }
  },

  /**
   * Cập nhật nhanh trạng thái
   */
  async updatePriceListStatus(id: string, status: PriceListStatusType): Promise<PriceList> {
    try {
      const response = await apiClient.patch<PriceList>(`/price-lists/${id}/status`, {
        status,
      });
      return response.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      if (axiosErr?.response?.data?.message) {
        throw new Error(axiosErr.response.data.message);
      }
      throw err;
    }
  },

  /**
   * Nhân bản bảng giá thành phiên bản mới (Clone Version)
   */
  async clonePriceList(id: string, payload?: ClonePriceListPayload): Promise<PriceList> {
    try {
      const response = await apiClient.post<PriceList>(`/price-lists/${id}/clone`, payload || {});
      return response.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      if (axiosErr?.response?.data?.message) {
        throw new Error(axiosErr.response.data.message);
      }
      throw err;
    }
  },

  /**
   * Xóa bảng giá (Chặn khi hasOrders == true)
   */
  async deletePriceList(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        `/price-lists/${id}`,
      );
      return response.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      if (axiosErr?.response?.data?.message) {
        throw new Error(axiosErr.response.data.message);
      }
      throw err;
    }
  },
};
