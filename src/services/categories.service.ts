import { apiClient } from './api';
import type {
  CategoryTreeNode,
  CategoryItem,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  MoveProductsPayload,
} from '../types/categories';

export const categoriesService = {
  /**
   * Lấy toàn bộ cây danh mục nhóm hàng phân cấp đa cấp (Tree Structure)
   * GET /api/categories/tree
   */
  async getCategoryTree(): Promise<CategoryTreeNode[]> {
    try {
      const response = await apiClient.get<CategoryTreeNode[]>('/categories/tree');
      return response.data;
    } catch (err: unknown) {
      this.handleError(err, 'Không thể tải cây danh mục nhóm hàng.');
      return [];
    }
  },

  /**
   * Lấy danh sách nhóm hàng dạng mảng phẳng
   * GET /api/categories
   */
  async getCategories(): Promise<CategoryItem[]> {
    try {
      const response = await apiClient.get<CategoryItem[]>('/categories');
      return response.data;
    } catch (err: unknown) {
      this.handleError(err, 'Không thể tải danh sách nhóm hàng.');
      return [];
    }
  },

  /**
   * Tạo nhóm hàng mới
   * POST /api/categories
   */
  async createCategory(payload: CreateCategoryPayload): Promise<CategoryItem> {
    try {
      const response = await apiClient.post<CategoryItem>('/categories', payload);
      return response.data;
    } catch (err: unknown) {
      this.handleError(err, 'Không thể tạo mới nhóm hàng.');
      throw err;
    }
  },

  /**
   * Cập nhật thông tin nhóm hàng (chống circular dependency)
   * PATCH /api/categories/:id
   */
  async updateCategory(id: string, payload: UpdateCategoryPayload): Promise<CategoryItem> {
    try {
      const response = await apiClient.patch<CategoryItem>(`/categories/${id}`, payload);
      return response.data;
    } catch (err: unknown) {
      this.handleError(err, 'Không thể cập nhật nhóm hàng.');
      throw err;
    }
  },

  /**
   * Di chuyển sản phẩm giữa các nhóm hàng
   * POST /api/categories/move-products
   */
  async moveProducts(
    payload: MoveProductsPayload
  ): Promise<{ success: boolean; message: string; movedCount: number }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        movedCount: number;
      }>('/categories/move-products', payload);
      return response.data;
    } catch (err: unknown) {
      this.handleError(err, 'Không thể di chuyển sản phẩm giữa các nhóm.');
      throw err;
    }
  },

  /**
   * Xóa nhóm hàng (Ràng buộc toàn vẹn cứng)
   * DELETE /api/categories/:id
   */
  async deleteCategory(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(
        `/categories/${id}`
      );
      return response.data;
    } catch (err: unknown) {
      this.handleError(err, 'Không thể xóa nhóm hàng.');
      throw err;
    }
  },

  /**
   * Helper trích xuất thông báo lỗi chính xác từ backend
   */
  handleError(err: unknown, defaultMessage: string): never {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as {
        response?: { data?: { message?: string | string[] } };
      };
      const serverMsg = axiosErr.response?.data?.message;
      if (serverMsg) {
        const msg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
        throw new Error(msg);
      }
    }
    const message = err instanceof Error ? err.message : defaultMessage;
    throw new Error(message);
  },
};
