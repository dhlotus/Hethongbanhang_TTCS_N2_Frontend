import axios from 'axios';
import { apiClient, refreshClient } from './api';
import { tokenStorage } from '../utils/token-storage';
import type {
  LoginCredentials,
  LoginResponse,
  TokenResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
} from '../types/auth';

export class TemporaryLockedError extends Error {
  isTemporaryLocked = true;
  isLocked = true;

  constructor(message: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'TemporaryLockedError';
    Object.setPrototypeOf(this, TemporaryLockedError.prototype);
  }
}

export class AccountLockedError extends Error {
  isLocked = true;
  isAdminLocked = true;
  lockReason?: string;

  constructor(message: string, lockReason?: string, cause?: unknown) {
    super(message, cause !== undefined ? { cause } : undefined);
    this.name = 'AccountLockedError';
    this.lockReason = lockReason;
    Object.setPrototypeOf(this, AccountLockedError.prototype);
  }
}

export const authService = {
  /**
   * Gọi API đăng nhập tài khoản chính thức: POST /auth/login
   * Toàn bộ tài khoản đều nhận JWT Token thật từ máy chủ Backend
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const identifier = credentials.email.trim().toLowerCase();
    const { password } = credentials;

    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', {
        username: identifier,
        email: identifier,
        password,
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response) {
        const data = error.response.data as {
          message?: string | string[];
          statusCode?: number;
          isLocked?: boolean;
          lockReason?: string;
          status?: string;
        };
        const rawMessage = Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || '';

        // Kiểm tra xem có bị khóa tạm thời do quá 5 lần sai không
        const isTemporaryLocked =
          error.response.status === 423 ||
          rawMessage.toLowerCase().includes('tạm khóa') ||
          rawMessage.toLowerCase().includes('tạm khoá') ||
          rawMessage.toLowerCase().includes('15 phút');

        if (isTemporaryLocked) {
          throw new TemporaryLockedError(
            'Tài khoản bị khóa tạm thời 15 phút do nhập sai quá số lần quy định',
            error
          );
        }

        // Kiểm tra xem tài khoản có bị Quản trị viên khóa không
        const lowerRaw = rawMessage.toLowerCase();
        const normRaw = rawMessage.normalize('NFC').toLowerCase();
        const isLockedByAdmin =
          Boolean(data?.isLocked) ||
          data?.status === 'LOCKED' ||
          lowerRaw.includes('quản trị viên khóa') ||
          lowerRaw.includes('quản trị viên khoá') ||
          normRaw.includes('quản trị viên khóa') ||
          normRaw.includes('quản trị viên khoá') ||
          lowerRaw.includes('đã bị khóa') ||
          lowerRaw.includes('đã bị khoá') ||
          lowerRaw.includes('tài khoản đã bị');

        if (isLockedByAdmin) {
          const extractedReason =
            data?.lockReason ||
            (rawMessage.includes('Lý do:')
              ? rawMessage.split('Lý do:')[1]?.split('.')[0]?.trim()
              : undefined);

          throw new AccountLockedError(
            rawMessage || 'Tài khoản của bạn đã bị quản trị viên khóa.',
            extractedReason
          );
        }

        // Bắt lỗi 401 hoặc 400
        if (error.response.status === 401 || error.response.status === 400) {
          if (rawMessage && !rawMessage.toLowerCase().includes('unauthorized')) {
            throw new Error(rawMessage, { cause: error });
          }
          throw new Error('Tài khoản hoặc mật khẩu không chính xác', { cause: error });
        }

        throw new Error(rawMessage || 'Tài khoản hoặc mật khẩu không chính xác', { cause: error });
      }

      const err = error as Error;
      throw new Error(
        err.message || 'Không thể kết nối đến máy chủ Backend. Vui lòng kiểm tra lại kết nối mạng!',
        { cause: error }
      );
    }
  },

  /**
   * Gọi API làm mới token: POST /auth/refresh
   */
  async refreshTokens(refreshToken: string): Promise<TokenResponse> {
    const cleanToken = refreshToken.trim();

    const response = await refreshClient.post<TokenResponse>('/auth/refresh', {
      refreshToken: cleanToken,
    });

    return response.data;
  },

  /**
   * Đăng xuất khỏi hệ thống:
   * 1. Gọi API POST /auth/logout để máy chủ thu hồi refresh token / session
   * 2. Dọn sạch toàn bộ localStorage (access_token, refresh_token, user info)
   * 3. Tùy chọn chuyển hướng về trang /auth/login
   */
  async logout(redirect = false): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    const accessToken = tokenStorage.getAccessToken();

    try {
      const isOnline = typeof navigator === 'undefined' || navigator.onLine;

      if (isOnline && refreshToken) {
        await refreshClient.post(
          '/auth/logout',
          { refreshToken },
          {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
            timeout: 3000,
          }
        );
      }
    } catch (error: unknown) {
      console.warn(
        'Không thể thu hồi token trên máy chủ khi đăng xuất (có thể do mạng chập chờn):',
        error
      );
    } finally {
      tokenStorage.clearAuthData();

      if (redirect) {
        window.location.href = '/auth/login';
      }
    }
  },

  /**
   * Đổi mật khẩu tài khoản người dùng: POST /auth/change-password
   */
  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    try {
      const response = await apiClient.post<ChangePasswordResponse>('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!', {
            cause: error,
          });
        }

        const resData = error.response.data as {
          message?: string | string[];
          statusCode?: number;
        };

        const rawMessage = Array.isArray(resData?.message)
          ? resData.message.join(', ')
          : resData?.message || '';

        if (error.response.status === 400 || error.response.status === 401) {
          throw new Error(rawMessage || 'Mật khẩu hiện tại không chính xác', { cause: error });
        }

        throw new Error(rawMessage || 'Không thể đổi mật khẩu. Vui lòng thử lại sau!', {
          cause: error,
        });
      }

      const err = error as Error;
      throw new Error(err.message || 'Đổi mật khẩu thất bại', { cause: error });
    }
  },

  /**
   * Yêu cầu gửi email đặt lại mật khẩu: POST /auth/forgot-password (SN-8)
   */
  async forgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const email = data.email.trim().toLowerCase();

    try {
      const response = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', {
        email,
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!', {
            cause: error,
          });
        }

        const resData = error.response.data as {
          message?: string | string[];
          statusCode?: number;
        };
        const rawMessage = Array.isArray(resData?.message)
          ? resData.message.join(', ')
          : resData?.message;

        throw new Error(rawMessage || 'Địa chỉ email này chưa được đăng ký trong hệ thống!', {
          cause: error,
        });
      }

      const err = error as Error;
      throw new Error(err.message || 'Gửi yêu cầu thất bại', { cause: error });
    }
  },

  /**
   * Đặt lại mật khẩu mới với token từ email: POST /auth/reset-password (SN-8)
   */
  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const { token, newPassword } = data;

    try {
      const response = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', {
        token: token.trim(),
        newPassword,
      });
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!', {
            cause: error,
          });
        }

        const resData = error.response.data as {
          message?: string | string[];
          statusCode?: number;
        };

        const rawMessage = Array.isArray(resData?.message)
          ? resData.message.join(', ')
          : resData?.message;

        throw new Error(
          rawMessage || 'Mã token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn (30 phút).',
          { cause: error }
        );
      }

      const err = error as Error;
      throw new Error(err.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại sau!', {
        cause: error,
      });
    }
  },

  /**
   * Đặt lại mật khẩu bằng mã cấp từ Quản trị viên (SN-10 Extension)
   */
  async resetPasswordWithCode(data: {
    identifier: string;
    resetCode: string;
    newPassword: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        '/auth/reset-password-with-code',
        {
          identifier: data.identifier.trim(),
          resetCode: data.resetCode.trim().toUpperCase(),
          newPassword: data.newPassword,
        }
      );
      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng!', {
            cause: error,
          });
        }
        const resData = error.response.data as {
          message?: string | string[];
          statusCode?: number;
        };
        const rawMessage = Array.isArray(resData?.message)
          ? resData.message.join(', ')
          : resData?.message;
        throw new Error(rawMessage || 'Mã cấp đổi mật khẩu không chính xác hoặc đã được sử dụng.', {
          cause: error,
        });
      }
      const err = error as Error;
      throw new Error(err.message || 'Đặt lại mật khẩu thất bại.', { cause: error });
    }
  },
};
