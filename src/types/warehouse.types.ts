export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address: string;
  phone?: string;
  managerId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  locationCount: number;
}

export interface WarehouseManager {
  id: string;
  name: string;
  roleName?: string;
  roleCode?: string;
  phone?: string;
  assignedWarehouseId?: string | null;
  assignedWarehouseCode?: string | null;
  assignedWarehouseName?: string | null;
}

export interface WarehouseLocation {
  id: string;
  warehouseId: string;
  code: string;
  zone: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
}

export interface CreateWarehousePayload {
  code: string;
  name: string;
  address: string;
  phone?: string;
  managerId?: string;
}

export interface CreateLocationPayload {
  code: string;
  zone?: string;
  aisle?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
}

export interface AgencyWarehouseAssignment {
  agencyId: string;
  warehouseId: string;
}

export interface AgencyWarehouseDetail extends AgencyWarehouseAssignment {
  warehouseCode: string;
  warehouseName: string;
}
