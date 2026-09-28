export const STORAGE_KEYS = {
    TOKEN: "hethong_auth_token",
    USER: "hethong_auth_user",
    SESSION_EXPIRED: "hethong_session_expired",
} as const;

export const AUTH_EVENTS = {
    SESSION_EXPIRED: "hethong:auth:session_expired",
} as const;
