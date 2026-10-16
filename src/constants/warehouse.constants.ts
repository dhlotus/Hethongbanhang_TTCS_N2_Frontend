/**
 * 4 Kho Cố Định Toàn Hệ Thống LOHA
 * - KHO-MB-01: Kho Miền Bắc (Hà Nội)
 * - KHO-MT-01: Kho Miền Trung (Đà Nẵng)
 * - KHO-MN-01: Kho Miền Nam (TP. Hồ Chí Minh)
 * - KHO-WEST-01: Kho Miền Tây (Cần Thơ)
 */
export interface StandardWarehouse {
  id: string;
  code: string;
  name: string;
  displayName: string;
}

export const STANDARD_WAREHOUSES: StandardWarehouse[] = [
  {
    id: '11111111-0000-0000-0000-000000000002',
    code: 'KHO-MB-01',
    name: 'Kho Miền Bắc (Hà Nội)',
    displayName: 'Kho Miền Bắc (KHO-MB-01)',
  },
  {
    id: '11111111-0000-0000-0000-000000000004',
    code: 'KHO-MT-01',
    name: 'Kho Miền Trung (Đà Nẵng)',
    displayName: 'Kho Miền Trung (KHO-MT-01)',
  },
  {
    id: '11111111-0000-0000-0000-000000000001',
    code: 'KHO-MN-01',
    name: 'Kho Miền Nam (TP. Hồ Chí Minh)',
    displayName: 'Kho Miền Nam (KHO-MN-01)',
  },
  {
    id: '11111111-0000-0000-0000-000000000003',
    code: 'KHO-WEST-01',
    name: 'Kho Miền Tây (Cần Thơ)',
    displayName: 'Kho Miền Tây (KHO-WEST-01)',
  },
];
