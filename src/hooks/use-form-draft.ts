import { useState, useEffect, useCallback, useRef } from "react";
import { tokenStorage } from "../utils/token-storage";

export interface DraftStorageEnvelope<T> {
  data: T;
  savedAt: string;
  userId?: string;
}

export interface UseFormDraftOptions {
  /**
   * Thời gian debounce tính bằng mili-giây (Mặc định: 600ms)
   */
  debounceMs?: number;
  /**
   * Có phân tách bản nháp theo ID người dùng hay không (Mặc định: true)
   */
  perUser?: boolean;
}

export interface UseFormDraftReturn<T> {
  hasDraft: boolean;
  lastSavedAt: Date | null;
  isSaving: boolean;
  saveDraft: (data: T) => void;
  loadDraft: () => T | null;
  clearDraft: () => void;
}

/**
 * Trợ giúp đọc trạng thái bản nháp ban đầu từ localStorage
 */
const readInitialDraft = <T>(
  storageKey: string,
): { hasDraft: boolean; lastSavedAt: Date | null } => {
  if (typeof window === "undefined") {
    return { hasDraft: false, lastSavedAt: null };
  }

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const envelope = JSON.parse(stored) as DraftStorageEnvelope<T>;
      if (envelope && envelope.data) {
        return {
          hasDraft: true,
          lastSavedAt: new Date(envelope.savedAt),
        };
      }
    }
  } catch {
    // Bỏ qua lỗi parse
  }

  return { hasDraft: false, lastSavedAt: null };
};

/**
 * Hook tự động lưu nháp dữ liệu form cục bộ (Local Persistence)
 * Chống mất dữ liệu khi mất mạng đột ngột, refresh trang (F5) hoặc vô tình đóng tab
 */
export const useFormDraft = <T extends Record<string, unknown>>(
  formKey: string,
  options: UseFormDraftOptions = {},
): UseFormDraftReturn<T> => {
  const { debounceMs = 600, perUser = true } = options;

  // Tạo storage key có phân tách theo người dùng nếu cần
  const getStorageKey = useCallback((): string => {
    const user = tokenStorage.getUser();
    const userPrefix = perUser && user?.id ? `_${user.id}` : "";
    return `loha_draft_${formKey}${userPrefix}`;
  }, [formKey, perUser]);

  // Khởi tạo state bằng lazy initializers để tránh cascading renders và lỗi lint
  const [hasDraft, setHasDraft] = useState<boolean>(() => {
    return readInitialDraft<T>(getStorageKey()).hasDraft;
  });

  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(() => {
    return readInitialDraft<T>(getStorageKey()).lastSavedAt;
  });

  const [isSaving, setIsSaving] = useState<boolean>(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Lưu nháp có Debounce để không làm nghẽn UI khi người dùng gõ phím liên tục
   */
  const saveDraft = useCallback(
    (data: T): void => {
      setIsSaving(true);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        try {
          const key = getStorageKey();
          const user = tokenStorage.getUser();
          const now = new Date();

          const envelope: DraftStorageEnvelope<T> = {
            data,
            savedAt: now.toISOString(),
            userId: user?.id,
          };

          localStorage.setItem(key, JSON.stringify(envelope));
          setHasDraft(true);
          setLastSavedAt(now);
        } catch (error) {
          console.warn("Không thể lưu bản nháp vào localStorage:", error);
        } finally {
          setIsSaving(false);
        }
      }, debounceMs);
    },
    [debounceMs, getStorageKey],
  );

  /**
   * Tải lại dữ liệu bản nháp từ bộ nhớ cục bộ
   */
  const loadDraft = useCallback((): T | null => {
    try {
      const key = getStorageKey();
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const envelope = JSON.parse(stored) as DraftStorageEnvelope<T>;
      return envelope?.data || null;
    } catch {
      return null;
    }
  }, [getStorageKey]);

  /**
   * Xóa bản nháp sau khi submit thành công hoặc người dùng ấn "Hủy bản nháp"
   */
  const clearDraft = useCallback((): void => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    const key = getStorageKey();
    localStorage.removeItem(key);
    setHasDraft(false);
    setLastSavedAt(null);
    setIsSaving(false);
  }, [getStorageKey]);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    hasDraft,
    lastSavedAt,
    isSaving,
    saveDraft,
    loadDraft,
    clearDraft,
  };
};
