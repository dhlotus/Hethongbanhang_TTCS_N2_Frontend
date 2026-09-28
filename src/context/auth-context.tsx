import React, { createContext, useContext, useEffect, useState } from "react";
import type { AuthUser, LoginResponse } from "../models/auth-user";
import { AuthService } from "../services/auth-service";
import { getRedirectPathByRole } from "../constants/roles";
import { STORAGE_KEYS, AUTH_EVENTS } from "../constants/storage-keys";

interface AuthContextType {
    user: AuthUser | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<LoginResponse>;
    logout: () => void;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    getHomeUrl: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Khởi tạo từ localStorage
    useEffect(() => {
        try {
            const savedToken = localStorage.getItem(STORAGE_KEYS.TOKEN);
            const savedUser = localStorage.getItem(STORAGE_KEYS.USER);

            if (savedToken && savedUser) {
                setToken(savedToken);
                setUser(JSON.parse(savedUser));
            }
        } catch (error) {
            console.error("Lỗi khi đọc auth từ localStorage:", error);
            localStorage.removeItem(STORAGE_KEYS.TOKEN);
            localStorage.removeItem(STORAGE_KEYS.USER);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Lắng nghe sự kiện session hết hạn từ Interceptor 401
    useEffect(() => {
        const handleSessionExpired = () => {
            console.warn("[AuthContext] Nhận được tín hiệu session hết hạn từ Interceptor 401");
            setToken(null);
            setUser(null);
        };

        window.addEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);
        return () => {
            window.removeEventListener(AUTH_EVENTS.SESSION_EXPIRED, handleSessionExpired);
        };
    }, []);

    const login = async (username: string, password: string): Promise<LoginResponse> => {
        const response = await AuthService.login(username, password);
        setToken(response.accessToken);
        setUser(response.user);

        localStorage.setItem(STORAGE_KEYS.TOKEN, response.accessToken);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));

        return response;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
    };

    const hasRole = (role: string): boolean => {
        if (!user || !user.roles) return false;
        return user.roles.includes(role);
    };

    const hasAnyRole = (roles: string[]): boolean => {
        if (!user || !user.roles) return false;
        return roles.some((role) => user.roles.includes(role));
    };

    const getHomeUrl = (): string => {
        if (!user || !user.roles) return "/login";
        return getRedirectPathByRole(user.roles);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!token && !!user,
                isLoading,
                login,
                logout,
                hasRole,
                hasAnyRole,
                getHomeUrl,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
