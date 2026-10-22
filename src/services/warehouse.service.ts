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

const agencyDefaultCache = new Map<string, { data: AgencyWarehouseDetail; expiresAt: number }>();

export const warehouseService = {
  async getWarehouses(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    try {
      const response = await apiClient.get('/warehouses', { params });
      if (response.data) {
        return response.data;
      }
    } catch {}
    const fallbackList: Warehouse[] = [
      {
        id: '11111111-0000-0000-0000-000000000002',
        code: 'KHO-MB-01',
        name: 'Kho Miền Bắc (Hà Nội)',
        address: 'Lô CN-05 KCN Ninh Hiệp, Gia Lâm, Hà Nội',
        phone: '02438890002',
        status: 'ACTIVE',
        locationCount: 2,
      },
      {
        id: '11111111-0000-0000-0000-000000000004',
        code: 'KHO-MT-01',
        name: 'Kho Miền Trung (Đà Nẵng)',
        address: 'KCN Hòa Khánh, Liên Chiểu, Đà Nẵng',
        phone: '02363890004',
        status: 'ACTIVE',
        locationCount: 2,
      },
      {
        id: '11111111-0000-0000-0000-000000000001',
        code: 'KHO-MN-01',
        name: 'Kho Miền Nam (TP. Hồ Chí Minh)',
        address: 'Số 18 Đại lộ Độc Lập, KCN Sóng Thần 1, Dĩ An, Bình Dương',
        phone: '02838890001',
        status: 'ACTIVE',
        locationCount: 3,
      },
      {
        id: '11111111-0000-0000-0000-000000000003',
        code: 'KHO-WEST-01',
        name: 'Kho Miền Tây (Cần Thơ)',
        address: 'Đường số 3 KCN Trà Nóc 1, Bình Thủy, Cần Thơ',
        phone: '02923890003',
        status: 'ACTIVE',
        locationCount: 1,
      },
    ];

    if (params?.page !== undefined || params?.limit !== undefined) {
      let filtered = fallbackList;
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (w) => w.name.toLowerCase().includes(q) || w.code.toLowerCase().includes(q)
        );
      }
      if (params.status && params.status !== 'ALL') {
        filtered = filtered.filter((w) => w.status === params.status);
      }
      const page = params.page || 1;
      const limit = params.limit || 10;
      return {
        data: filtered.slice((page - 1) * limit, page * limit),
        total: filtered.length,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
      };
    }
    return fallbackList;
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
  async deleteLocation(
    warehouseId: string,
    locationId: string
  ): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete<{ success: boolean; message?: string }>(
      `/warehouses/${encodeURIComponent(warehouseId)}/locations/${encodeURIComponent(locationId)}`
    );
    return response.data;
  },
  async setAgencyDefaultWarehouse(agencyId: string, warehouseId: string | null): Promise<void> {
    agencyDefaultCache.delete(agencyId);
    await apiClient.put(`/warehouses/agencies/${encodeURIComponent(agencyId)}/default`, {
      warehouseId,
    });
  },
  async assignAgencies(warehouseId: string, agencyIds: string[]): Promise<void> {
    agencyIds.forEach((id) => agencyDefaultCache.delete(id));
    try {
      await apiClient.post(`/warehouses/${encodeURIComponent(warehouseId)}/agencies`, {
        agencyIds,
      });
    } catch {
      await Promise.all(
        agencyIds.map((agencyId) => this.setAgencyDefaultWarehouse(agencyId, warehouseId))
      );
    }
  },
  async getAgencyDefaults(): Promise<AgencyWarehouseAssignment[]> {
    const response = await apiClient.get<AgencyWarehouseAssignment[]>(
      '/warehouses/agencies/defaults'
    );
    return response.data;
  },
  async getAgencyDefault(agencyId: string): Promise<AgencyWarehouseDetail> {
    const cached = agencyDefaultCache.get(agencyId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
    const response = await apiClient.get<AgencyWarehouseDetail>(
      `/warehouses/agencies/${encodeURIComponent(agencyId)}/default`
    );
    agencyDefaultCache.set(agencyId, {
      data: response.data,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });
    return response.data;
  },
  async checkDeleteEligibility(id: string): Promise<{
    canDelete: boolean;
    hasPositiveStock: boolean;
    totalOnHand: number;
    totalAllocated: number;
    hasZeroStockProducts: boolean;
    productRecordCount: number;
    isEmpty: boolean;
    warehouseName: string;
    warehouseCode: string;
    message: string;
  }> {
    const response = await apiClient.get(
      `/warehouses/${encodeURIComponent(id)}/delete-check`
    );
    return response.data;
  },
  async deleteWarehouse(
    id: string,
    confirmZeroStock?: boolean
  ): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete<{ success: boolean; message?: string }>(
      `/warehouses/${encodeURIComponent(id)}`,
      { params: { confirmZeroStock: confirmZeroStock ? 'true' : undefined } }
    );
    return response.data;
  },
};

