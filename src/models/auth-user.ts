export interface AuthUser {
    id: string;
    username: string;
    fullName: string;
    roles: string[];
    email?: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken?: string;
    tokenType?: string;
    user: AuthUser;
}
