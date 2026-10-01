import { apiClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import type { Product } from '../types/products';

const MOCK_PRODUCTS: Product[] = [
  {
    id: "prod-001",
    sku: "LH-MILK-900G",
    name: "Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g",
    category: "Sữa Dinh Dưỡng",
    baseUnit: "Lon",
    price: 520000,
    costPrice: 380000,
    margin: 26.92,
    stockQuantity: 340,
    status: "ACTIVE",
    barcode: "8936012345011",
    description: "Dòng sữa dinh dưỡng bổ sung Canxi và DHA cho trẻ nhỏ và người lớn tuổi",
  },
  {
    id: "prod-002",
    sku: "LH-NUT-180ML",
    name: "Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml",
    category: "Sữa Dinh Dưỡng",
    baseUnit: "Hộp",
    price: 18000,
    costPrice: 11500,
    margin: 36.11,
    stockQuantity: 1200,
    status: "ACTIVE",
    barcode: "8936012345028",
    description: "Sữa hạt thuần chay ít ngọt tốt cho tim mạch",
  },
  {
    id: "prod-003",
    sku: "LH-NEST-70ML",
    name: "Nước Yến Sào Chưng Đường Phèn Loha Nest 70ml",
    category: "Yến Sào & Bổ Dưỡng",
    baseUnit: "Hũ",
    price: 65000,
    costPrice: 42000,
    margin: 35.38,
    stockQuantity: 580,
    status: "ACTIVE",
    barcode: "8936012345035",
    description: "Tổ yến thiên nhiên chưng đường phèn thanh mát",
  },
  {
    id: "prod-004",
    sku: "LH-CEREAL-500G",
    name: "Ngũ Cốc Dinh Dưỡng Hạt Mầm Loha Meal 500g",
    category: "Ngũ Cốc Thực Dưỡng",
    baseUnit: "Túi",
    price: 145000,
    costPrice: 95000,
    margin: 34.48,
    stockQuantity: 410,
    status: "ACTIVE",
    barcode: "8936012345042",
    description: "Hỗn hợp 12 loại hạt mầm nướng chín nguyên chất",
  },
  {
    id: "prod-005",
    sku: "LH-COLLAGEN-50ML",
    name: "Nước Uống Collagen Đông Trùng Hạ Thảo 50ml",
    category: "Thực Phẩm Chức Năng",
    baseUnit: "Chai",
    price: 85000,
    costPrice: 55000,
    margin: 35.29,
    stockQuantity: 260,
    status: "ACTIVE",
    barcode: "8936012345059",
    description: "Collagen thủy phân kết hợp chiết xuất đông trùng",
  },
];

export const productsService = {
  /**
   * Lấy danh sách sản phẩm từ Backend API (đã qua Interceptor lọc giá vốn)
   */
  async getProducts(): Promise<Product[]> {
    const token = tokenStorage.getAccessToken();
    if (token && token.startsWith("demo-jwt-")) {
      const user = tokenStorage.getUser();
      const roles = user?.roles || [];
      const canViewCost = roles.includes("ADMIN") || roles.includes("SALES_MANAGER");
      if (canViewCost) return MOCK_PRODUCTS;
      return MOCK_PRODUCTS.map(({ costPrice, margin, ...rest }) => rest as Product);
    }

    const response = await apiClient.get<Product[]>('/products');
    return response.data;
  },

  /**
   * Lấy chi tiết sản phẩm theo ID hoặc SKU
   */
  async getProductById(id: string): Promise<Product> {
    const token = tokenStorage.getAccessToken();
    if (token && token.startsWith("demo-jwt-")) {
      const found = MOCK_PRODUCTS.find(
        (p) => p.id === id || p.sku.toLowerCase() === id.toLowerCase(),
      );
      if (!found) throw new Error("Sản phẩm không tồn tại");
      const user = tokenStorage.getUser();
      const roles = user?.roles || [];
      const canViewCost = roles.includes("ADMIN") || roles.includes("SALES_MANAGER");
      if (canViewCost) return found;
      const { costPrice, margin, ...rest } = found;
      return rest as Product;
    }

    const response = await apiClient.get<Product>(`/products/${id}`);
    return response.data;
  },

  /**
   * Tạo mới sản phẩm (Chỉ dành cho ADMIN & SALES_MANAGER)
   */
  async createProduct(data: Partial<Product>): Promise<Product> {
    const response = await apiClient.post<Product>('/products', data);
    return response.data;
  },
};
