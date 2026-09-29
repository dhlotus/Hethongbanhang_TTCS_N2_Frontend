export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  user: AuthUser;
}
