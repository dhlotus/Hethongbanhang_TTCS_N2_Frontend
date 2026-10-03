import { apiClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import type {
  Product,
  ProductCategory,
  ProductQueryParams,
  PaginatedProductsResponse,
  CreateProductPayload,
  UpdateProductPayload,
} from '../types/products';

/**
 * Danh mục nhóm hàng chuẩn hóa 2 cấp (FMCG / Phân phối Thực phẩm & Đồ uống)
 */
export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: "cat-milk",
    code: "MILK",
    name: "Sữa & Chế phẩm sữa",
    level: 1,
    subCategories: [
      {
        id: "cat-milk-powder",
        code: "MILK_POWDER",
        name: "Sữa bột công thức",
        level: 2,
        parentId: "cat-milk",
        subCategories: [
          { id: "cat-milk-powder-baby", code: "MILK_POWDER_BABY", name: "Sữa bột cho trẻ em", level: 3, parentId: "cat-milk-powder" },
          { id: "cat-milk-powder-adult", code: "MILK_POWDER_ADULT", name: "Sữa bột người lớn & cao tuổi", level: 3, parentId: "cat-milk-powder" },
        ],
      },
      { id: "cat-milk-nut", code: "MILK_NUT", name: "Sữa hạt organic", level: 2, parentId: "cat-milk" },
      { id: "cat-milk-ready", code: "MILK_READY", name: "Sữa tươi & Tiệt trùng", level: 2, parentId: "cat-milk" },
    ],
  },
  {
    id: "cat-nest",
    code: "NEST",
    name: "Nước yến & Bổ dưỡng",
    level: 1,
    subCategories: [
      {
        id: "cat-nest-ready",
        code: "NEST_READY",
        name: "Nước yến chưng sẵn",
        level: 2,
        parentId: "cat-nest",
        subCategories: [
          { id: "cat-nest-ready-sugar", code: "NEST_READY_SUGAR", name: "Nước yến chưng đường phèn", level: 3, parentId: "cat-nest-ready" },
        ],
      },
      { id: "cat-nest-pure", code: "NEST_PURE", name: "Tổ yến sào tinh chế", level: 2, parentId: "cat-nest" },
    ],
  },
  {
    id: "cat-cereal",
    code: "CEREAL",
    name: "Ngũ cốc & Hạt dinh dưỡng",
    level: 1,
    subCategories: [
      { id: "cat-cereal-sprout", code: "CEREAL_SPROUT", name: "Ngũ cốc hạt mầm", level: 2, parentId: "cat-cereal" },
      { id: "cat-cereal-nuts", code: "CEREAL_NUTS", name: "Hạt dinh dưỡng sấy giòn", level: 2, parentId: "cat-cereal" },
    ],
  },
  {
    id: "cat-supp",
    code: "SUPP",
    name: "Thực phẩm chức năng",
    level: 1,
    subCategories: [
      { id: "cat-supp-collagen", code: "SUPP_COLLAGEN", name: "Collagen & Chống lão hóa", level: 2, parentId: "cat-supp" },
      { id: "cat-supp-herb", code: "SUPP_HERB", name: "Đông trùng & Thảo dược", level: 2, parentId: "cat-supp" },
    ],
  },
  {
    id: "cat-bev",
    code: "BEV",
    name: "Nước giải khát & Trà",
    level: 1,
    subCategories: [
      { id: "cat-bev-tea", code: "BEV_TEA", name: "Trà thảo mộc thanh nhiệt", level: 2, parentId: "cat-bev" },
      { id: "cat-bev-water", code: "BEV_WATER", name: "Nước khoáng thiên nhiên", level: 2, parentId: "cat-bev" },
    ],
  },
];

/**
 * Danh sách sản phẩm mẫu phong phú phục vụ demo / fallback
 */
let MOCK_PRODUCTS: Product[] = [
  {
    id: "prod-001",
    sku: "LH-MILK-900G",
    name: "Sữa Bột Dinh Dưỡng Cao Cấp Loha Gold 900g",
    parentCategory: "Sữa & Chế phẩm sữa",
    subCategory: "Sữa bột công thức",
    category: "Sữa & Chế phẩm sữa / Sữa bột công thức",
    categoryId: "cat-milk-powder",
    baseUnit: "Lon",
    packagingSpec: "24 lon/thùng",
    price: 520000,
    costPrice: 380000,
    margin: 26.92,
    stockQuantity: 340,
    status: "ACTIVE",
    barcode: "8936012345011",
    hasTransactions: true,
    imageUrl: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&auto=format&fit=crop&q=80",
    description: "Dòng sữa dinh dưỡng cao cấp bổ sung Canxi, DHA cho trẻ nhỏ và người cao tuổi",
    createdAt: "2026-01-15T08:00:00Z",
  },
  {
    id: "prod-002",
    sku: "LH-NUT-180ML",
    name: "Sữa Hạt Óc Chó Hạnh Nhân Organic 180ml",
    parentCategory: "Sữa & Chế phẩm sữa",
    subCategory: "Sữa hạt organic",
    category: "Sữa & Chế phẩm sữa / Sữa hạt organic",
    categoryId: "cat-milk-nut",
    baseUnit: "Hộp",
    packagingSpec: "48 hộp/thùng (12 lốc x 4 hộp)",
    price: 18000,
    costPrice: 11500,
    margin: 36.11,
    stockQuantity: 1200,
    status: "ACTIVE",
    barcode: "8936012345028",
    hasTransactions: true,
    imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&auto=format&fit=crop&q=80",
    description: "Sữa hạt thuần chay ít đường, giàu omega-3 tốt cho tim mạch và trí não",
    createdAt: "2026-01-18T09:30:00Z",
  },
  {
    id: "prod-003",
    sku: "LH-NEST-70ML",
    name: "Nước Yến Sào Chưng Đường Phèn Loha Nest 70ml",
    parentCategory: "Nước yến & Bổ dưỡng",
    subCategory: "Nước yến chưng sẵn",
    category: "Nước yến & Bổ dưỡng / Nước yến chưng sẵn",
    categoryId: "cat-nest-ready",
    baseUnit: "Hũ",
    packagingSpec: "30 hũ/thùng (5 hộp x 6 hũ)",
    price: 65000,
    costPrice: 42000,
    margin: 35.38,
    stockQuantity: 580,
    status: "ACTIVE",
    barcode: "8936012345035",
    hasTransactions: true,
    imageUrl: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=200&auto=format&fit=crop&q=80",
    description: "Tổ yến đảo thiên nhiên chưng đường phèn thanh mát bồi bổ khí huyết",
    createdAt: "2026-02-01T10:15:00Z",
  },
  {
    id: "prod-004",
    sku: "LH-CEREAL-500G",
    name: "Ngũ Cốc Dinh Dưỡng Hạt Mầm Loha Meal 500g",
    parentCategory: "Ngũ cốc & Hạt dinh dưỡng",
    subCategory: "Ngũ cốc hạt mầm",
    category: "Ngũ cốc & Hạt dinh dưỡng / Ngũ cốc hạt mầm",
    categoryId: "cat-cereal-sprout",
    baseUnit: "Túi",
    packagingSpec: "20 túi/thùng",
    price: 145000,
    costPrice: 95000,
    margin: 34.48,
    stockQuantity: 410,
    status: "ACTIVE",
    barcode: "8936012345042",
    hasTransactions: true,
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&auto=format&fit=crop&q=80",
    description: "Hỗn hợp 12 loại hạt mầm nướng chín nguyên chất dồi dào chất xơ",
    createdAt: "2026-02-10T14:20:00Z",
  },
  {
    id: "prod-005",
    sku: "LH-COLLAGEN-50ML",
    name: "Nước Uống Collagen Đông Trùng Hạ Thảo 50ml",
    parentCategory: "Thực phẩm chức năng",
    subCategory: "Collagen & Chống lão hóa",
    category: "Thực phẩm chức năng / Collagen & Chống lão hóa",
    categoryId: "cat-supp-collagen",
    baseUnit: "Chai",
    packagingSpec: "24 chai/thùng (4 lốc x 6 chai)",
    price: 85000,
    costPrice: 55000,
    margin: 35.29,
    stockQuantity: 260,
    status: "ACTIVE",
    barcode: "8936012345059",
    hasTransactions: true,
    imageUrl: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&auto=format&fit=crop&q=80",
    description: "Collagen peptit thủy phân kết hợp chiết xuất đông trùng hạ thảo tươi",
    createdAt: "2026-02-15T11:00:00Z",
  },
  {
    id: "prod-006",
    sku: "LH-TEA-350ML",
    name: "Trà Thảo Mộc Hoa Cúc La Hán Quả 350ml",
    parentCategory: "Nước giải khát & Trà",
    subCategory: "Trà thảo mộc thanh nhiệt",
    category: "Nước giải khát & Trà / Trà thảo mộc thanh nhiệt",
    categoryId: "cat-bev-tea",
    baseUnit: "Chai",
    packagingSpec: "24 chai/thùng",
    price: 15000,
    costPrice: 9200,
    margin: 38.67,
    stockQuantity: 890,
    status: "ACTIVE",
    barcode: "8936012345066",
    hasTransactions: true,
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=200&auto=format&fit=crop&q=80",
    description: "Trà hoa cúc nguyên bông nấu la hán quả thanh nhiệt giải độc",
    createdAt: "2026-02-20T16:00:00Z",
  },
  {
    id: "prod-007",
    sku: "LH-WATER-500ML",
    name: "Nước Khoáng Kiềm Thiên Nhiên Loha Ion 500ml",
    parentCategory: "Nước giải khát & Trà",
    subCategory: "Nước khoáng thiên nhiên",
    category: "Nước giải khát & Trà / Nước khoáng thiên nhiên",
    categoryId: "cat-bev-water",
    baseUnit: "Chai",
    packagingSpec: "24 chai/thùng",
    price: 12000,
    costPrice: 6800,
    margin: 43.33,
    stockQuantity: 1500,
    status: "ACTIVE",
    barcode: "8936012345073",
    hasTransactions: false,
    imageUrl: "https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=200&auto=format&fit=crop&q=80",
    description: "Nước khoáng kiềm pH 9.0 khai thác từ mạch nước ngầm núi cao",
    createdAt: "2026-03-01T08:30:00Z",
  },
  {
    id: "prod-008",
    sku: "LH-MILK-PAST-1L",
    name: "Sữa Tươi Thanh Trùng Nguyên Chất 1 Lít",
    parentCategory: "Sữa & Chế phẩm sữa",
    subCategory: "Sữa tươi & Tiệt trùng",
    category: "Sữa & Chế phẩm sữa / Sữa tươi & Tiệt trùng",
    categoryId: "cat-milk-ready",
    baseUnit: "Chai",
    packagingSpec: "12 chai/thùng",
    price: 38000,
    costPrice: 26000,
    margin: 31.58,
    stockQuantity: 180,
    status: "ACTIVE",
    barcode: "8936012345080",
    hasTransactions: false,
    imageUrl: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=200&auto=format&fit=crop&q=80",
    description: "100% sữa bò tươi thanh trùng bảo quản lạnh 2-4 độ C",
    createdAt: "2026-03-05T09:10:00Z",
  },
  {
    id: "prod-009",
    sku: "LH-NEST-PREM-100G",
    name: "Hộp Quà Yến Sào Tinh Chế Thượng Hạng 100g",
    parentCategory: "Nước yến & Bổ dưỡng",
    subCategory: "Tổ yến sào tinh chế",
    category: "Nước yến & Bổ dưỡng / Tổ yến sào tinh chế",
    categoryId: "cat-nest-pure",
    baseUnit: "Hộp",
    packagingSpec: "10 hộp/thùng",
    price: 4200000,
    costPrice: 3100000,
    margin: 26.19,
    stockQuantity: 45,
    status: "ACTIVE",
    barcode: "8936012345097",
    hasTransactions: false,
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=200&auto=format&fit=crop&q=80",
    description: "Tổ yến tai to đều sạch lông sấy khô tiệt trùng kèm đường phèn táo đỏ",
    createdAt: "2026-03-10T14:40:00Z",
  },
  {
    id: "prod-010",
    sku: "LH-NUTS-MIX-250G",
    name: "Hạt Hỗn Hợp Macca Óc Chó Hạnh Nhân Sấy Giòn 250g",
    parentCategory: "Ngũ cốc & Hạt dinh dưỡng",
    subCategory: "Hạt dinh dưỡng sấy giòn",
    category: "Ngũ cốc & Hạt dinh dưỡng / Hạt dinh dưỡng sấy giòn",
    categoryId: "cat-cereal-nuts",
    baseUnit: "Hũ",
    packagingSpec: "24 hũ/thùng",
    price: 135000,
    costPrice: 88000,
    margin: 34.81,
    stockQuantity: 320,
    status: "ACTIVE",
    barcode: "8936012345103",
    hasTransactions: false,
    imageUrl: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=200&auto=format&fit=crop&q=80",
    description: "Hạt dinh dưỡng nhập khẩu sấy mộc không muối thơm ngậy giòn tan",
    createdAt: "2026-03-12T15:20:00Z",
  },
  {
    id: "prod-011",
    sku: "LH-OLD-COFFEE-CAN",
    name: "Cà Phê Sữa Đóng Lon Loha Classic 240ml (Mẫu Cũ)",
    parentCategory: "Nước giải khát & Trà",
    subCategory: "Trà thảo mộc thanh nhiệt",
    category: "Nước giải khát & Trà / Trà thảo mộc thanh nhiệt",
    categoryId: "cat-bev-tea",
    baseUnit: "Lon",
    packagingSpec: "24 lon/thùng",
    price: 14000,
    costPrice: 9000,
    margin: 35.71,
    stockQuantity: 0,
    status: "INACTIVE",
    barcode: "8936012345110",
    hasTransactions: true,
    description: "Sản phẩm phiên bản cũ năm 2025, hiện đã ngừng kinh doanh để thay thế mẫu mới",
    createdAt: "2025-06-10T10:00:00Z",
  },
];

/**
 * Kiểm tra xem người dùng hiện tại có quyền xem Giá vốn & Biên lợi nhuận hay không
 */
const checkCanViewCost = (): boolean => {
  const user = tokenStorage.getUser();
  const roles = user?.roles || [];
  return roles.includes("ADMIN") || roles.includes("SALES_MANAGER");
};

/**
 * Lọc bỏ trường nhạy cảm costPrice và margin nếu không đủ quyền hạn (SN-10)
 */
const sanitizeProduct = (p: Product, canViewCost: boolean): Product => {
  if (canViewCost) return p;
  const { costPrice, margin, ...rest } = p;
  return rest as Product;
};

export const productsService = {
  /**
   * Lấy danh sách nhóm hàng phân cấp (Tree Structure)
   */
  async getCategories(): Promise<ProductCategory[]> {
    try {
      const response = await apiClient.get<any[]>('/categories/tree');
      if (Array.isArray(response.data) && response.data.length > 0) {
        const mapTree = (nodes: any[]): ProductCategory[] => {
          return nodes.map((n) => ({
            id: n.id,
            name: n.name,
            code: n.code,
            level: n.level,
            parentId: n.parentId || n.parent_id || null,
            productCount: n.productCount ?? n.product_count ?? 0,
            children: n.children ? mapTree(n.children) : [],
            subCategories: n.children ? mapTree(n.children) : [],
          }));
        };
        return mapTree(response.data);
      }
    } catch {
      // Fallback
    }
    return PRODUCT_CATEGORIES;
  },

  /**
   * Lấy danh sách sản phẩm phân trang, tìm kiếm và lọc theo Nhóm hàng / Trạng thái (SN-139)
   */
  async getProducts(params: ProductQueryParams = {}): Promise<PaginatedProductsResponse> {
    const {
      page = 1,
      limit = 20,
      search = "",
      categoryId,
      category,
      parentCategory,
      subCategory,
      status,
    } = params;

    const canViewCost = checkCanViewCost();

    // 1. Thử gọi API Backend thật: GET /products
    try {
      const response = await apiClient.get<Product[] | PaginatedProductsResponse>('/products', {
        params: {
          page,
          limit,
          search: search || undefined,
          categoryId: categoryId || undefined,
          category: category || undefined,
          parentCategory: parentCategory || undefined,
          subCategory: subCategory || undefined,
          status: status && status !== 'ALL' ? status : undefined,
        },
      });

      // Nếu Backend trả về cấu trúc phân trang chuẩn
      if (response.data && typeof response.data === 'object' && 'data' in response.data) {
        const paginated = response.data as PaginatedProductsResponse;
        return {
          ...paginated,
          data: paginated.data.map((p) => sanitizeProduct(p, canViewCost)),
        };
      }

      // Nếu Backend trả về mảng phẳng, thực hiện phân trang và lọc client-side
      const list = Array.isArray(response.data) ? response.data : [];
      let filtered = [...list];

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.sku.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.includes(q))
        );
      }

      if (parentCategory && parentCategory !== 'ALL') {
        filtered = filtered.filter((p) => p.parentCategory === parentCategory || p.category?.includes(parentCategory));
      }

      if (subCategory && subCategory !== 'ALL') {
        filtered = filtered.filter((p) => p.subCategory === subCategory || p.category?.includes(subCategory));
      }

      if (status && status !== 'ALL') {
        filtered = filtered.filter((p) => p.status === status);
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const pagedData = filtered.slice(startIndex, startIndex + limit).map((p) => sanitizeProduct(p, canViewCost));

      return {
        data: pagedData,
        total,
        page,
        limit,
        totalPages,
      };
    } catch {
      // 2. Fallback xử lý Offline / Mock Data mượt mà khi Backend chưa có route hoặc đang nâng cấp
      let filtered = [...MOCK_PRODUCTS];

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.sku.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            (p.barcode && p.barcode.includes(q))
        );
      }

      if (parentCategory && parentCategory !== 'ALL') {
        filtered = filtered.filter((p) => p.parentCategory === parentCategory);
      }

      if (subCategory && subCategory !== 'ALL') {
        filtered = filtered.filter((p) => p.subCategory === subCategory);
      }

      if (status && status !== 'ALL') {
        filtered = filtered.filter((p) => p.status === status);
      }

      const total = filtered.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const startIndex = (page - 1) * limit;
      const pagedData = filtered.slice(startIndex, startIndex + limit).map((p) => sanitizeProduct(p, canViewCost));

      return {
        data: pagedData,
        total,
        page,
        limit,
        totalPages,
      };
    }
  },

  /**
   * Lấy chi tiết sản phẩm theo ID hoặc SKU
   */
  async getProductById(id: string): Promise<Product> {
    const canViewCost = checkCanViewCost();

    try {
      const response = await apiClient.get<Product>(`/products/${id}`);
      return sanitizeProduct(response.data, canViewCost);
    } catch {
      const found = MOCK_PRODUCTS.find(
        (p) => p.id === id || p.sku.toLowerCase() === id.toLowerCase()
      );
      if (!found) throw new Error("Sản phẩm không tồn tại trên hệ thống!");
      return sanitizeProduct(found, canViewCost);
    }
  },

  /**
   * Thêm mới SKU sản phẩm (Validate SKU duy nhất, uppercase, chặn trùng lặp)
   */
  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const canViewCost = checkCanViewCost();
    const cleanSku = payload.sku.trim().toUpperCase().replace(/\s+/g, '');

    if (!cleanSku) {
      throw new Error("Mã SKU không được để trống!");
    }

    try {
      const response = await apiClient.post<Product>('/products', {
        ...payload,
        sku: cleanSku,
      });
      return sanitizeProduct(response.data, canViewCost);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          const msg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
          throw new Error(msg);
        }
      }

      // Mock Fallback
      const isDuplicate = MOCK_PRODUCTS.some(
        (p) => p.sku.toUpperCase() === cleanSku
      );

      if (isDuplicate) {
        throw new Error(`Mã SKU [${cleanSku}] đã tồn tại trên hệ thống. Vui lòng đặt mã khác!`);
      }

      const margin =
        payload.price > 0 && payload.costPrice !== undefined
          ? Math.round(((payload.price - payload.costPrice) / payload.price) * 10000) / 100
          : undefined;

      const newProduct: Product = {
        id: `prod-${Date.now().toString(36)}`,
        sku: cleanSku,
        name: payload.name.trim(),
        parentCategory: payload.parentCategory,
        subCategory: payload.subCategory,
        category: payload.category || `${payload.parentCategory || ''} / ${payload.subCategory || ''}`,
        categoryId: payload.categoryId,
        baseUnit: payload.baseUnit,
        packagingSpec: payload.packagingSpec,
        price: Number(payload.price),
        costPrice: payload.costPrice !== undefined ? Number(payload.costPrice) : undefined,
        margin,
        stockQuantity: 0,
        status: payload.status || 'ACTIVE',
        barcode: payload.barcode?.trim(),
        imageUrl: payload.imageUrl?.trim(),
        description: payload.description?.trim(),
        hasTransactions: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      MOCK_PRODUCTS.unshift(newProduct);
      return sanitizeProduct(newProduct, canViewCost);
    }
  },

  /**
   * Cập nhật thông tin sản phẩm (PATCH /products/:id)
   */
  async updateProduct(id: string, payload: UpdateProductPayload): Promise<Product> {
    const canViewCost = checkCanViewCost();

    try {
      const response = await apiClient.patch<Product>(`/products/${id}`, payload);
      const resProduct = response.data;

      // Đồng bộ vào bộ nhớ MOCK_PRODUCTS nếu có sẵn trong danh mục cục bộ
      const index = MOCK_PRODUCTS.findIndex((p) => p.id === id || p.sku === id);
      if (index !== -1) {
        const currentStock = MOCK_PRODUCTS[index].stockQuantity;
        MOCK_PRODUCTS[index] = {
          ...MOCK_PRODUCTS[index],
          ...resProduct,
          stockQuantity:
            resProduct.stockQuantity !== undefined && resProduct.stockQuantity !== null
              ? resProduct.stockQuantity
              : (payload.stockQuantity !== undefined ? payload.stockQuantity : currentStock),
        };
      }

      return sanitizeProduct(resProduct, canViewCost);
    } catch (err: unknown) {
      // Nếu máy chủ backend trả về lỗi nghiệp vụ (400, 403, 404, 409...), hiển thị thông báo chính xác từ server
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          const msg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
          throw new Error(msg);
        }
      }

      const index = MOCK_PRODUCTS.findIndex((p) => p.id === id || p.sku === id);
      if (index === -1) {
        throw new Error("Sản phẩm cần cập nhật không tồn tại!");
      }

      const existing = MOCK_PRODUCTS[index];

      // Nếu có cập nhật SKU, kiểm tra trùng với sản phẩm khác
      if (payload.sku) {
        const cleanSku = payload.sku.trim().toUpperCase().replace(/\s+/g, '');
        const duplicate = MOCK_PRODUCTS.find(
          (p) => p.sku.toUpperCase() === cleanSku && p.id !== existing.id
        );
        if (duplicate) {
          throw new Error(`Mã SKU [${cleanSku}] đã được dùng bởi sản phẩm khác!`);
        }
        existing.sku = cleanSku;
      }

      if (payload.name !== undefined) existing.name = payload.name.trim();
      if (payload.parentCategory !== undefined) existing.parentCategory = payload.parentCategory;
      if (payload.subCategory !== undefined) existing.subCategory = payload.subCategory;
      if (payload.category !== undefined) existing.category = payload.category;
      if (payload.baseUnit !== undefined) existing.baseUnit = payload.baseUnit;
      if (payload.packagingSpec !== undefined) existing.packagingSpec = payload.packagingSpec;
      if (payload.price !== undefined) existing.price = Number(payload.price);
      if (payload.costPrice !== undefined) existing.costPrice = Number(payload.costPrice);
      if (payload.status !== undefined) existing.status = payload.status;
      if (payload.imageUrl !== undefined) existing.imageUrl = payload.imageUrl.trim();
      if (payload.description !== undefined) existing.description = payload.description.trim();
      if (payload.stockQuantity !== undefined && payload.stockQuantity !== null) {
        existing.stockQuantity = Number(payload.stockQuantity);
      }

      // Tính lại biên lợi nhuận
      if (existing.price > 0 && existing.costPrice !== undefined) {
        existing.margin = Math.round(((existing.price - existing.costPrice) / existing.price) * 10000) / 100;
      }

      existing.updatedAt = new Date().toISOString();
      MOCK_PRODUCTS[index] = existing;
      return sanitizeProduct(existing, canViewCost);
    }
  },

  /**
   * Xóa sản phẩm (Chặn xóa nếu sản phẩm đã phát sinh giao dịch)
   */
  async deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(`/products/${id}`);
      return response.data;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
        const serverMsg = axiosErr.response?.data?.message;
        if (serverMsg) {
          const msg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
          throw new Error(msg);
        }
      }

      const found = MOCK_PRODUCTS.find((p) => p.id === id || p.sku === id);
      if (!found) {
        throw new Error("Không tìm thấy sản phẩm cần xóa!");
      }

      if (found.hasTransactions) {
        throw new Error(
          `Sản phẩm [${found.sku} - ${found.name}] đã phát sinh dữ liệu giao dịch kho hoặc đơn hàng. Để đảm bảo toàn vẹn dữ liệu kế toán, bạn không thể xóa sản phẩm này mà chỉ được phép chuyển trạng thái sang [Ngừng kinh doanh]!`
        );
      }

      MOCK_PRODUCTS = MOCK_PRODUCTS.filter((p) => p.id !== found.id);
      return {
        success: true,
        message: `Đã xóa thành công sản phẩm [${found.sku}] khỏi danh mục.`,
      };
    }
  },

  /**
   * Đổi nhanh trạng thái kinh doanh của sản phẩm
   */
  async toggleProductStatus(id: string, newStatus: 'ACTIVE' | 'INACTIVE'): Promise<Product> {
    return this.updateProduct(id, { status: newStatus });
  },
};
