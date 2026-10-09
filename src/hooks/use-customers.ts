import { useState, useEffect, useCallback, useRef } from 'react';
import { customerService } from '../services/customer.service';
import type { Customer, CustomerFilterParams } from '../types/customer.types';
import { showToast } from '../components/toast';

export interface UseCustomersReturn {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  searchInput: string;
  debouncedSearch: string;
  region: string;
  customerGroup: string;
  salesRepId: string;
  status: string;
  setSearchInput: (val: string) => void;
  setRegion: (region: string) => void;
  setCustomerGroup: (group: string) => void;
  setSalesRepId: (salesRepId: string) => void;
  setStatus: (status: string) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  resetFilters: () => void;
  refresh: () => Promise<void>;
}

/**
 * Custom hook quản lý danh sách đại lý (SN-37)
 * Tối ưu debounce 300ms khi gõ tìm kiếm trên điện thoại ngoài đường
 */
export function useCustomers(initialLimit: number = 10): UseCustomersReturn {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(initialLimit);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [searchInput, setSearchInput] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [region, setRegionState] = useState<string>('');
  const [customerGroup, setCustomerGroupState] = useState<string>('');
  const [salesRepId, setSalesRepIdState] = useState<string>('');
  const [status, setStatusState] = useState<string>('');

  // Debounce 300ms search input
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1); // Reset về trang 1 khi từ khóa đổi
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  // Bộ lọc setter tự động reset về trang 1
  const setRegion = useCallback((val: string) => {
    setRegionState(val);
    setPage(1);
  }, []);

  const setCustomerGroup = useCallback((val: string) => {
    setCustomerGroupState(val);
    setPage(1);
  }, []);

  const setSalesRepId = useCallback((val: string) => {
    setSalesRepIdState(val);
    setPage(1);
  }, []);

  const setStatus = useCallback((val: string) => {
    setStatusState(val);
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setSearchInput('');
    setDebouncedSearch('');
    setRegionState('');
    setCustomerGroupState('');
    setSalesRepIdState('');
    setStatusState('');
    setPage(1);
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params: CustomerFilterParams = {
      page,
      limit,
    };

    if (debouncedSearch) {
      params.search = debouncedSearch;
    }
    if (region) {
      params.region = region;
    }
    if (customerGroup) {
      params.customerGroup = customerGroup;
    }
    if (salesRepId) {
      params.salesRepId = salesRepId;
    }
    if (status) {
      params.status = status;
    }

    try {
      const res = await customerService.getCustomers(params);
      setCustomers(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi tải danh sách đại lý';
      setError(msg);
      showToast('error', 'Không thể tải danh sách đại lý', msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, region, customerGroup, salesRepId, status]);

  useEffect(() => {
    let ignore = false;

    const execute = async () => {
      const params: CustomerFilterParams = {
        page,
        limit,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }
      if (region) {
        params.region = region;
      }
      if (customerGroup) {
        params.customerGroup = customerGroup;
      }
      if (salesRepId) {
        params.salesRepId = salesRepId;
      }
      if (status) {
        params.status = status;
      }

      try {
        const res = await customerService.getCustomers(params);
        if (!ignore) {
          setCustomers(res.data || []);
          setTotal(res.total || 0);
          setTotalPages(res.totalPages || 1);
          setError(null);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Lỗi khi tải danh sách đại lý';
          setError(msg);
          showToast('error', 'Không thể tải danh sách đại lý', msg);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    void execute();

    return () => {
      ignore = true;
    };
  }, [page, limit, debouncedSearch, region, customerGroup, salesRepId, status]);

  return {
    customers,
    total,
    page,
    limit,
    totalPages,
    loading,
    error,
    searchInput,
    debouncedSearch,
    region,
    customerGroup,
    salesRepId,
    status,
    setSearchInput,
    setRegion,
    setCustomerGroup,
    setSalesRepId,
    setStatus,
    setPage,
    setLimit,
    resetFilters,
    refresh: fetchCustomers,
  };
}
