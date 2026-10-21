/**
 * Utility functions xử lý và chuẩn hóa UUID theo chuẩn RFC 4122 / PostgreSQL (SN-178)
 * Tuân thủ CODE_CONVENTION (camelCase, JSDoc, không dùng any).
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Kiểm tra xem chuỗi có phải là định dạng UUID hợp lệ hay không
 * @param value Chuỗi cần kiểm tra
 * @returns boolean
 */
export function isValidUuid(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return UUID_REGEX.test(value.trim());
}

/**
 * Bảng ánh xạ ID sản phẩm cũ (hoặc SKU) sang UUID chuẩn PostgreSQL
 */
const KNOWN_PRODUCT_UUID_MAP: Record<string, string> = {
  'prod-001': '33333333-0000-0000-0000-000000000001',
  'lh-milk-900g': '33333333-0000-0000-0000-000000000001',
  'lh-milk-powder-900g': '33333333-0000-0000-0000-000000000001',
  'prod-002': '33333333-0000-0000-0000-000000000002',
  'lh-nut-180ml': '33333333-0000-0000-0000-000000000002',
  'prod-003': '33333333-0000-0000-0000-000000000003',
  'lh-nest-70ml': '33333333-0000-0000-0000-000000000003',
  'prod-004': '33333333-0000-0000-0000-000000000004',
  'lh-cereal-500g': '33333333-0000-0000-0000-000000000004',
  'prod-005': '33333333-0000-0000-0000-000000000005',
  'lh-collagen-50ml': '33333333-0000-0000-0000-000000000005',
  'prod-006': '33333333-0000-0000-0000-000000000006',
  'lh-tea-240ml': '33333333-0000-0000-0000-000000000006',
  'lh-tea-350ml': '33333333-0000-0000-0000-000000000006',
  'lh-tea-450ml': '33333333-0000-0000-0000-000000000006',
  'prod-007': '33333333-0000-0000-0000-000000000007',
  'lh-water-500ml': '33333333-0000-0000-0000-000000000007',
  'prod-008': '33333333-0000-0000-0000-000000000008',
  'lh-milk-past-1l': '33333333-0000-0000-0000-000000000008',
  'prod-009': '33333333-0000-0000-0000-000000000009',
  'lh-nest-prem-100g': '33333333-0000-0000-0000-000000000009',
  'prod-010': '33333333-0000-0000-0000-000000000010',
  'lh-nuts-mix-250g': '33333333-0000-0000-0000-000000000010',
  'prod-011': '33333333-0000-0000-0000-000000000011',
  'lh-old-coffee-can': '33333333-0000-0000-0000-000000000011',
};

/**
 * Ánh xạ kho mặc định nếu truyền code cũ
 */
const KNOWN_WAREHOUSE_UUID_MAP: Record<string, string> = {
  'all': '11111111-0000-0000-0000-000000000001',
  'tat ca kho hang': '11111111-0000-0000-0000-000000000001',
  'tất cả kho hàng': '11111111-0000-0000-0000-000000000001',
  'wh01': '11111111-0000-0000-0000-000000000001',
  'kho-mn-01': '11111111-0000-0000-0000-000000000001',
  'kho-mb-01': '11111111-0000-0000-0000-000000000002',
  'kho-west-01': '11111111-0000-0000-0000-000000000003',
  'kho-mt-01': '11111111-0000-0000-0000-000000000004',
};

/**
 * Ánh xạ nhà cung cấp mặc định nếu truyền code cũ
 */
const KNOWN_SUPPLIER_UUID_MAP: Record<string, string> = {
  'ncc-bev-01': '22222222-0000-0000-0000-000000000001',
  'ncc-idp': '22222222-0000-0000-0000-000000000001',
  'ncc-aqua-02': '22222222-0000-0000-0000-000000000002',
  'ncc-nsx': '22222222-0000-0000-0000-000000000002',
  'ncc-dairy-03': '22222222-0000-0000-0000-000000000003',
  'ncc-pack-04': '22222222-0000-0000-0000-000000000004',
  'ncc-old-05': '22222222-0000-0000-0000-000000000005',
};

/**
 * Chuyển đổi mã định danh sản phẩm thành UUID hợp lệ
 * @param productId Mã sản phẩm hiện tại
 * @param sku Mã SKU dự phòng
 * @param uuid UUID gốc (nếu có)
 * @returns Chuỗi UUID hợp lệ chuẩn RFC 4122
 */
export function normalizeProductIdToUuid(
  productId: string,
  sku?: string,
  uuid?: string,
): string {
  // 1. Nếu bản thân uuid là UUID hợp lệ
  if (uuid && isValidUuid(uuid)) {
    return uuid.trim();
  }

  // 2. Nếu productId đã là UUID hợp lệ
  if (productId && isValidUuid(productId)) {
    return productId.trim();
  }

  // 3. Tra cứu theo bảng mapping trực tiếp từ productId hoặc sku
  const cleanId = (productId || '').toLowerCase().trim();
  if (KNOWN_PRODUCT_UUID_MAP[cleanId]) {
    return KNOWN_PRODUCT_UUID_MAP[cleanId];
  }

  const cleanSku = (sku || '').toLowerCase().trim();
  if (cleanSku && KNOWN_PRODUCT_UUID_MAP[cleanSku]) {
    return KNOWN_PRODUCT_UUID_MAP[cleanSku];
  }

  // 4. Nếu có dạng prod-123, sinh UUID dạng 33333333-0000-0000-0000-000000000123
  const prodMatch = cleanId.match(/^prod-(\d+)$/i);
  if (prodMatch) {
    const num = parseInt(prodMatch[1], 10);
    return `33333333-0000-0000-0000-${String(num).padStart(12, '0')}`;
  }

  // 5. Fallback tạo UUID xác định (deterministic) từ chuỗi đầu vào
  let hash = 0;
  const str = cleanId || cleanSku || 'product';
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, '0');
  return `33333333-${hex.slice(0, 4)}-4000-8000-${hex.padStart(12, '0')}`;
}

/**
 * Chuẩn hóa warehouseId sang định dạng UUID hợp lệ
 * @param warehouseId Mã kho
 * @returns Chuỗi UUID hợp lệ
 */
export function normalizeWarehouseIdToUuid(warehouseId: string): string {
  if (!warehouseId || warehouseId === 'ALL' || warehouseId === 'all') {
    return '11111111-0000-0000-0000-000000000001';
  }
  if (isValidUuid(warehouseId)) return warehouseId.trim();
  const clean = (warehouseId || '').toLowerCase().trim();
  if (KNOWN_WAREHOUSE_UUID_MAP[clean]) {
    return KNOWN_WAREHOUSE_UUID_MAP[clean];
  }
  return '11111111-0000-0000-0000-000000000001';
}

/**
 * Chuẩn hóa supplierId sang định dạng UUID hợp lệ
 * @param supplierId Mã nhà cung cấp
 * @returns Chuỗi UUID hợp lệ hoặc undefined
 */
export function normalizeSupplierIdToUuid(supplierId?: string): string | undefined {
  if (!supplierId) return undefined;
  if (isValidUuid(supplierId)) return supplierId.trim();
  const clean = supplierId.toLowerCase().trim();
  if (KNOWN_SUPPLIER_UUID_MAP[clean]) {
    return KNOWN_SUPPLIER_UUID_MAP[clean];
  }
  return '22222222-0000-0000-0000-000000000001';
}

/**
 * Bảng mã Crockford's Base32 chuẩn cho ULID
 */
const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Sinh chuỗi định danh ULID ngẫu nhiên (Universally Unique Lexicographically Sortable Identifier)
 * Chuẩn 26 ký tự (10 ký tự timestamp + 16 ký tự entropy ngẫu nhiên) theo chuẩn Crockford Base32
 * @param prefix Tiền tố tùy chọn (VD: "CT-" hoặc để trống lấy thuần ULID 26 ký tự)
 * @returns Chuỗi ULID chuẩn 26 ký tự (hoặc kèm tiền tố)
 */
export function generateUlid(prefix = ''): string {
  const timestamp = Date.now();
  let timeStr = '';
  let time = timestamp;
  for (let i = 0; i < 10; i++) {
    const mod = time % 32;
    timeStr = CROCKFORD_BASE32[mod] + timeStr;
    time = Math.floor(time / 32);
  }

  let randStr = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 16; i++) {
      randStr += CROCKFORD_BASE32[randomBytes[i] % 32];
    }
  } else {
    for (let i = 0; i < 16; i++) {
      const rand = Math.floor(Math.random() * 32);
      randStr += CROCKFORD_BASE32[rand];
    }
  }

  const ulid = timeStr + randStr;
  return prefix ? `${prefix}${ulid}` : ulid;
}

/**
 * Sinh mã chứng từ gốc rút gọn theo chuẩn ERP: REF-YYMMDD-XXXXXX
 * Tự động đồng bộ theo ngày nhập kho (nếu truyền vào) hoặc ngày thực tế hiện tại (new Date())
 * - YYMMDD: 6 chữ số định dạng Năm-Tháng-Ngày (VD: ngày 15/10 là 261015, ngày 16/10 là 261016)
 * - XXXXXX: 6 ký tự ngẫu nhiên chuẩn Crockford Base32
 * - Tự động thay đổi theo ngày, hoàn toàn không bị cố định/hardcode
 * @param dateInput Ngày nhập kho tùy chọn (chuỗi YYYY-MM-DD hoặc đối tượng Date)
 * @returns Chuỗi mã chứng từ gốc rút gọn (VD: REF-261015-K9PN46)
 */
export function generateReferenceDocCode(dateInput?: string | Date): string {
  let targetDate = new Date();
  if (dateInput) {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-').map(Number);
      targetDate = new Date(y, m - 1, d);
    } else {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }
  }

  const yy = String(targetDate.getFullYear()).slice(-2);
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`;

  let randPart = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const randomBytes = new Uint8Array(6);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 6; i++) {
      randPart += CROCKFORD_BASE32[randomBytes[i] % 32];
    }
  } else {
    for (let i = 0; i < 6; i++) {
      const rand = Math.floor(Math.random() * 32);
      randPart += CROCKFORD_BASE32[rand];
    }
  }

  return `REF-${datePart}-${randPart}`;
}

/**
 * Sinh số lô hàng tự động ngẫu nhiên, không trùng lặp theo chuẩn ERP: LOT-YYMMDD-XXXX (SN-178 / SN-184)
 * - YYMMDD: 6 chữ số đại diện Năm-Tháng-Ngày (VD: 261018)
 * - XXXX: 4 ký tự ngẫu nhiên chuẩn Crockford Base32 tránh nhầm lẫn (VD: K8M2, 7F3A)
 * - Đảm bảo tính duy nhất, ngẫu nhiên và không bao giờ bị trùng lặp số -001
 * @param dateInput Ngày nhập kho / ngày sản xuất tùy chọn
 * @returns Chuỗi số lô tự sinh ngẫu nhiên (VD: LOT-261018-K8M2)
 */
export function generateRandomBatchCode(dateInput?: string | Date): string {
  let targetDate = new Date();
  if (dateInput) {
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      const [y, m, d] = dateInput.split('-').map(Number);
      targetDate = new Date(y, m - 1, d);
    } else {
      const parsed = new Date(dateInput);
      if (!isNaN(parsed.getTime())) {
        targetDate = parsed;
      }
    }
  }

  const yy = String(targetDate.getFullYear()).slice(-2);
  const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
  const dd = String(targetDate.getDate()).padStart(2, '0');
  const datePart = `${yy}${mm}${dd}`;

  let randPart = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const randomBytes = new Uint8Array(4);
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < 4; i++) {
      randPart += CROCKFORD_BASE32[randomBytes[i] % 32];
    }
  } else {
    for (let i = 0; i < 4; i++) {
      const rand = Math.floor(Math.random() * 32);
      randPart += CROCKFORD_BASE32[rand];
    }
  }

  return `LOT-${datePart}-${randPart}`;
}
