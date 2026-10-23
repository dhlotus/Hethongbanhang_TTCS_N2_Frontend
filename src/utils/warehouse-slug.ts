import { STANDARD_WAREHOUSES } from '../constants/warehouse.constants';

/**
 * Mapping các slug URL thân thiện cho 4 kho tiêu chuẩn toàn hệ thống:
 * - kho-bac: Kho Miền Bắc (Hà Nội) - KHO-MB-01
 * - kho-trung: Kho Miền Trung (Đà Nẵng) - KHO-MT-01
 * - kho-nam: Kho Miền Nam (TP. Hồ Chí Minh) - KHO-MN-01
 * - kho-tay: Kho Miền Tây (Cần Thơ) - KHO-WEST-01
 */

export const WAREHOUSE_SLUG_MAP: Record<string, string> = {
  // Kho Miền Bắc
  '11111111-0000-0000-0000-000000000002': 'kho-bac',
  'kho-mb-01': 'kho-bac',
  'mb': 'kho-bac',

  // Kho Miền Trung
  '11111111-0000-0000-0000-000000000004': 'kho-trung',
  'kho-mt-01': 'kho-trung',
  'mt': 'kho-trung',

  // Kho Miền Nam
  '11111111-0000-0000-0000-000000000001': 'kho-nam',
  'kho-mn-01': 'kho-nam',
  'mn': 'kho-nam',

  // Kho Miền Tây
  '11111111-0000-0000-0000-000000000003': 'kho-tay',
  'kho-west-01': 'kho-tay',
  'west': 'kho-tay',
};

export const SLUG_TO_WAREHOUSE_ID_MAP: Record<string, string> = {
  // Miền Bắc
  'kho-bac': '11111111-0000-0000-0000-000000000002',
  'kho-mien-bac': '11111111-0000-0000-0000-000000000002',
  'khobac': '11111111-0000-0000-0000-000000000002',
  'kho_bac': '11111111-0000-0000-0000-000000000002',
  'kho-mb-01': '11111111-0000-0000-0000-000000000002',
  'mb': '11111111-0000-0000-0000-000000000002',
  'north': '11111111-0000-0000-0000-000000000002',

  // Miền Trung
  'kho-trung': '11111111-0000-0000-0000-000000000004',
  'kho-mien-trung': '11111111-0000-0000-0000-000000000004',
  'khotrung': '11111111-0000-0000-0000-000000000004',
  'kho_trung': '11111111-0000-0000-0000-000000000004',
  'kho-mt-01': '11111111-0000-0000-0000-000000000004',
  'mt': '11111111-0000-0000-0000-000000000004',
  'central': '11111111-0000-0000-0000-000000000004',

  // Miền Nam
  'kho-nam': '11111111-0000-0000-0000-000000000001',
  'kho-mien-nam': '11111111-0000-0000-0000-000000000001',
  'khonam': '11111111-0000-0000-0000-000000000001',
  'kho_nam': '11111111-0000-0000-0000-000000000001',
  'kho-mn-01': '11111111-0000-0000-0000-000000000001',
  'mn': '11111111-0000-0000-0000-000000000001',
  'south': '11111111-0000-0000-0000-000000000001',
  'wh01': '11111111-0000-0000-0000-000000000001',

  // Miền Tây
  'kho-tay': '11111111-0000-0000-0000-000000000003',
  'kho-mien-tay': '11111111-0000-0000-0000-000000000003',
  'khotay': '11111111-0000-0000-0000-000000000003',
  'kho_tay': '11111111-0000-0000-0000-000000000003',
  'kho-west': '11111111-0000-0000-0000-000000000003',
  'kho-west-01': '11111111-0000-0000-0000-000000000003',
  'west': '11111111-0000-0000-0000-000000000003',
  'can-tho': '11111111-0000-0000-0000-000000000003',
  'cantho': '11111111-0000-0000-0000-000000000003',
};

/**
 * Chuyển ID / Code / Tên kho sang URL Slug thân thiện:
 * '11111111-0000-0000-0000-000000000003' -> 'kho-tay'
 * 'KHO-MB-01' -> 'kho-bac'
 * 'ALL' -> ''
 */
export function toWarehouseSlug(
  warehouseIdOrCodeOrName?: string | null,
  customWarehouses?: Array<{ id: string; code?: string; name?: string }>,
): string {
  if (!warehouseIdOrCodeOrName || warehouseIdOrCodeOrName === 'ALL' || warehouseIdOrCodeOrName === 'all') {
    return '';
  }

  const raw = warehouseIdOrCodeOrName.trim().toLowerCase();

  // 1. Kiểm tra trực tiếp bảng mapping
  if (WAREHOUSE_SLUG_MAP[raw]) {
    return WAREHOUSE_SLUG_MAP[raw];
  }

  // 2. Tra trong STANDARD_WAREHOUSES
  const std = STANDARD_WAREHOUSES.find(
    (w) =>
      w.id.toLowerCase() === raw ||
      w.code.toLowerCase() === raw ||
      w.name.toLowerCase().includes(raw) ||
      raw.includes(w.name.toLowerCase()),
  );
  if (std && WAREHOUSE_SLUG_MAP[std.id.toLowerCase()]) {
    return WAREHOUSE_SLUG_MAP[std.id.toLowerCase()];
  }

  // 3. Tra trong danh sách kho động
  if (customWarehouses && customWarehouses.length > 0) {
    const found = customWarehouses.find(
      (w) =>
        w.id?.toLowerCase() === raw ||
        w.code?.toLowerCase() === raw ||
        (w.name && (w.name.toLowerCase().includes(raw) || raw.includes(w.name.toLowerCase()))),
    );
    if (found) {
      if (found.id && WAREHOUSE_SLUG_MAP[found.id.toLowerCase()]) {
        return WAREHOUSE_SLUG_MAP[found.id.toLowerCase()];
      }
      if (found.code) {
        return found.code.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      }
    }
  }

  // 4. Nếu chuỗi đã là slug thân thiện sẵn
  if (SLUG_TO_WAREHOUSE_ID_MAP[raw]) {
    return WAREHOUSE_SLUG_MAP[SLUG_TO_WAREHOUSE_ID_MAP[raw]] || raw;
  }

  return raw;
}

/**
 * Chuyển URL Slug thân thiện sang Warehouse ID (UUID):
 * 'kho-tay' -> '11111111-0000-0000-0000-000000000003'
 * 'kho-bac' -> '11111111-0000-0000-0000-000000000002'
 * 'ALL' / '' -> 'ALL'
 */
export function fromWarehouseSlugToId(
  slugOrId?: string | null,
  customWarehouses?: Array<{ id: string; code?: string; name?: string }>,
): string {
  if (!slugOrId || slugOrId === 'ALL' || slugOrId === 'all') {
    return 'ALL';
  }

  const raw = slugOrId.trim().toLowerCase();

  // 1. Kiểm tra trực tiếp bảng slug -> ID
  if (SLUG_TO_WAREHOUSE_ID_MAP[raw]) {
    return SLUG_TO_WAREHOUSE_ID_MAP[raw];
  }

  // 2. Tra trong STANDARD_WAREHOUSES
  const std = STANDARD_WAREHOUSES.find(
    (w) =>
      w.id.toLowerCase() === raw ||
      w.code.toLowerCase() === raw ||
      w.name.toLowerCase().includes(raw),
  );
  if (std) return std.id;

  // 3. Tra trong customWarehouses (theo code, name, id)
  if (customWarehouses && customWarehouses.length > 0) {
    const found = customWarehouses.find(
      (w) =>
        w.id?.toLowerCase() === raw ||
        w.code?.toLowerCase() === raw ||
        (w.code && w.code.toLowerCase().replace(/[^a-z0-9_-]/g, '-') === raw) ||
        (w.name && w.name.toLowerCase().includes(raw)),
    );
    if (found) return found.id;
  }

  return slugOrId.trim();
}
