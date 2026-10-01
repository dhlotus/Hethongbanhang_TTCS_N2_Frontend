import { apiClient } from './api';
import type {
  AssignedCustomersResponse,
  CreateUserPayload,
  CreateUserResponse,
  PaginatedUsersResponse,
  UpdateUserPayload,
  UpdateUserStatusPayload,
  UpdateUserStatusResponse,
  UserManagementItem,
} from '../types/user';

export const usersService = {
  /**
   * Lấy danh sách người dùng phân trang, tìm kiếm và lọc vai trò/trạng thái
   */
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  } = {}): Promise<PaginatedUsersResponse> {
    const response = await apiClient.get<PaginatedUsersResponse>('/users', {
      params,
    });
    return response.data;
  },

  /**
   * Lấy thông tin chi tiết người dùng
   */
  async getUserById(id: string): Promise<UserManagementItem> {
    const response = await apiClient.get<UserManagementItem>(`/users/${id}`);
    return response.data;
  },

  /**
   * Tạo tài khoản nhân sự mới (Tự sinh mật khẩu tạm nếu không nhập)
   */
  async createUser(payload: CreateUserPayload): Promise<CreateUserResponse> {
    const response = await apiClient.post<CreateUserResponse>('/users', payload);
    return response.data;
  },

  /**
   * Cập nhật thông tin nhân sự
   */
  async updateUser(
    id: string,
    payload: UpdateUserPayload,
  ): Promise<UserManagementItem> {
    const response = await apiClient.patch<UserManagementItem>(
      `/users/${id}`,
      payload,
    );
    return response.data;
  },

  /**
   * Khóa / Mở khóa tài khoản nhân sự kèm lý do (Thu hồi session khi khóa & Cảnh báo bàn giao)
   */
  async updateUserStatus(
    id: string,
    payload: UpdateUserStatusPayload,
  ): Promise<UpdateUserStatusResponse> {
    const response = await apiClient.patch<UpdateUserStatusResponse>(
      `/users/${id}/status`,
      payload,
    );
    return response.data;
  },

  /**
   * Lấy danh sách đại lý do nhân sự phụ trách kèm cảnh báo bàn giao (SN-15)
   */
  async getAssignedCustomers(id: string): Promise<AssignedCustomersResponse> {
    const response = await apiClient.get<AssignedCustomersResponse>(
      `/users/${id}/assigned-customers`,
    );
    return response.data;
  },

  /**
   * Admin sinh mã cấp đổi mật khẩu cho nhân sự (SN-10 Extension)
   */
  async generateResetCode(
    id: string,
  ): Promise<{ resetCode: string; user: UserManagementItem }> {
    const response = await apiClient.post<{
      resetCode: string;
      user: UserManagementItem;
    }>(`/users/${id}/reset-code`);
    return response.data;
  },
};
