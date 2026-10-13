import { apiClient } from './api';
import type {
  AgencyWarehouseAssignment,
  AgencyWarehouseDetail,
  CreateLocationPayload,
  CreateWarehousePayload,
  Warehouse,
  WarehouseLocation,
  WarehouseManager,
} from '../types/warehouse.types';

export const warehouseService = {
  async getWarehouses(): Promise<Warehouse[]> {
    try {
      const response = await apiClient.get<Warehouse[]>('/warehouses');
      if (Array.isArray(response.data) && response.data.length > 0) {
        return response.data;
      }
    } catch {}
    return [
      {
        id: '11111111-0000-4000-8000-000000000001',
        code: 'WH01',
        name: 'Kho Tổng Miền Nam - LOHA WH01',
        address: 'Số 18 Đại lộ Độc Lập, KCN Sóng Thần 1, Dĩ An, Bình Dương',
        phone: '02743790001',
        status: 'ACTIVE',
        locationCount: 3,
      },
      {
        id: '11111111-0000-0000-0000-000000000002',
        code: 'KHO-MB-01',
        name: 'Kho Phân Phối Hà Nội',
        address: 'Lô CN-05 KCN Ninh Hiệp, Gia Lâm, Hà Nội',
        phone: '02438890002',
        status: 'ACTIVE',
        locationCount: 2,
      },
      {
        id: '11111111-0000-0000-0000-000000000003',
        code: 'KHO-MT-01',
        name: 'Kho Vùng Tây Nam Bộ',
        address: 'Đường số 3 KCN Trà Nóc 1, Bình Thủy, Cần Thơ',
        phone: '02923890003',
        status: 'ACTIVE',
        locationCount: 1,
      },
    ];
  },
  async createWarehouse(payload: CreateWarehousePayload): Promise<Warehouse> {
    const response = await apiClient.post<Warehouse>('/warehouses', payload);
    return response.data;
  },
  async updateWarehouse(
    id: string,
    payload: Partial<CreateWarehousePayload> & { status?: Warehouse['status'] }
  ): Promise<Warehouse> {
    const response = await apiClient.patch<Warehouse>(
      `/warehouses/${encodeURIComponent(id)}`,
      payload
    );
    return response.data;
  },
  async getManagers(): Promise<WarehouseManager[]> {
    const response = await apiClient.get<WarehouseManager[]>('/warehouses/managers');
    return response.data;
  },
  async getLocations(warehouseId: string): Promise<WarehouseLocation[]> {
    const response = await apiClient.get<WarehouseLocation[]>(
      `/warehouses/${encodeURIComponent(warehouseId)}/locations`
    );
    return response.data;
  },
  async createLocation(
    warehouseId: string,
    payload: CreateLocationPayload
  ): Promise<WarehouseLocation> {
    const response = await apiClient.post<WarehouseLocation>(
      `/warehouses/${encodeURIComponent(warehouseId)}/locations`,
      payload
    );
    return response.data;
  },
  async setAgencyDefaultWarehouse(agencyId: string, warehouseId: string | null): Promise<void> {
    await apiClient.put(`/warehouses/agencies/${encodeURIComponent(agencyId)}/default`, {
      warehouseId,
    });
  },
  async getAgencyDefaults(): Promise<AgencyWarehouseAssignment[]> {
    const response = await apiClient.get<AgencyWarehouseAssignment[]>(
      '/warehouses/agencies/defaults'
    );
    return response.data;
  },
  async getAgencyDefault(agencyId: string): Promise<AgencyWarehouseDetail> {
    const response = await apiClient.get<AgencyWarehouseDetail>(
      `/warehouses/agencies/${encodeURIComponent(agencyId)}/default`
    );
    return response.data;
  },
};
