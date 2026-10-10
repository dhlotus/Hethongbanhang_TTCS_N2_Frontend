import { apiClient } from './api';
import type {
  AgencyWarehouseAssignment,
  CreateLocationPayload,
  CreateWarehousePayload,
  Warehouse,
  WarehouseLocation,
  WarehouseManager,
} from '../types/warehouse.types';

export const warehouseService = {
  async getWarehouses(): Promise<Warehouse[]> {
    const response = await apiClient.get<Warehouse[]>('/warehouses');
    return response.data;
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
  async getAgencyDefault(agencyId: string): Promise<AgencyWarehouseAssignment> {
    const response = await apiClient.get<AgencyWarehouseAssignment>(
      `/warehouses/agencies/${encodeURIComponent(agencyId)}/default`
    );
    return response.data;
  },
};
