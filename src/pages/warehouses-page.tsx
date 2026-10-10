import { useCallback, useEffect, useState } from 'react';
import { Building2, MapPin, Plus, RefreshCw, Warehouse as WarehouseIcon } from 'lucide-react';
import { showToast } from '../components/toast';
import { getFriendlyErrorMessage } from '../utils/error-handler';
import { customerService } from '../services/customer.service';
import { warehouseService } from '../services/warehouse.service';
import type { Customer } from '../types/customer.types';
import type { Warehouse, WarehouseLocation, WarehouseManager } from '../types/warehouse.types';

const SELECTED_WAREHOUSE_STORAGE_KEY = 'warehouse-management:selected-warehouse';
const SELECTED_AGENCY_STORAGE_KEY = 'warehouse-management:selected-agency';

function getWarehouseEditForm(warehouse: Warehouse) {
  return {
    name: warehouse.name,
    address: warehouse.address,
    phone: warehouse.phone || '',
    managerId: warehouse.managerId || '',
    status: warehouse.status,
  };
}

export function WarehousesPage(): React.ReactElement {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedId, setSelectedId] = useState(
    () => sessionStorage.getItem(SELECTED_WAREHOUSE_STORAGE_KEY) || ''
  );
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [managers, setManagers] = useState<WarehouseManager[]>([]);
  const [agencies, setAgencies] = useState<Customer[]>([]);
  const [agencyId, setAgencyId] = useState(
    () => sessionStorage.getItem(SELECTED_AGENCY_STORAGE_KEY) || ''
  );
  const [agencyDefaults, setAgencyDefaults] = useState<Record<string, string>>({});
  const [warehouseForm, setWarehouseForm] = useState({
    code: '',
    name: '',
    address: '',
    phone: '',
    managerId: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    phone: '',
    managerId: '',
    status: 'ACTIVE' as Warehouse['status'],
  });
  const [locationForm, setLocationForm] = useState({
    code: '',
    zone: '',
    aisle: '',
    rack: '',
    shelf: '',
  });
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async (): Promise<void> => {
    try {
      const [rows, agencyRows, assignments, managerRows] = await Promise.all([
        warehouseService.getWarehouses(),
        customerService.getCustomers({ limit: 100 }).then((result) => result.data),
        warehouseService.getAgencyDefaults(),
        warehouseService.getManagers(),
      ]);
      setWarehouses(rows);
      setAgencies(agencyRows);
      setManagers(managerRows);
      setAgencyDefaults(
        Object.fromEntries(assignments.map((item) => [item.agencyId, item.warehouseId]))
      );
      const selected =
        rows.find((row) => row.id === sessionStorage.getItem(SELECTED_WAREHOUSE_STORAGE_KEY)) ||
        rows[0];
      setSelectedId(selected?.id || '');
      if (selected) setEditForm(getWarehouseEditForm(selected));
      setAgencyId((current) => (agencyRows.some((agency) => agency.id === current) ? current : ''));
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể tải danh sách kho'));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(reload);
  }, [reload]);
  useEffect(() => {
    if (selectedId) sessionStorage.setItem(SELECTED_WAREHOUSE_STORAGE_KEY, selectedId);
    else sessionStorage.removeItem(SELECTED_WAREHOUSE_STORAGE_KEY);
  }, [selectedId]);
  useEffect(() => {
    if (agencyId) sessionStorage.setItem(SELECTED_AGENCY_STORAGE_KEY, agencyId);
    else sessionStorage.removeItem(SELECTED_AGENCY_STORAGE_KEY);
  }, [agencyId]);
  useEffect(() => {
    if (!selectedId) return;
    warehouseService
      .getLocations(selectedId)
      .then(setLocations)
      .catch((error: unknown) => {
        showToast('error', getFriendlyErrorMessage(error, 'Không thể tải vị trí kho'));
      });
  }, [selectedId]);

  const createWarehouse = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    try {
      const created = await warehouseService.createWarehouse({
        ...warehouseForm,
        managerId: warehouseForm.managerId || undefined,
      });
      setWarehouseForm({ code: '', name: '', address: '', phone: '', managerId: '' });
      selectWarehouse(created.id);
      await reload();
      showToast('success', 'Đã tạo kho hàng');
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể tạo kho hàng'));
    } finally {
      setBusy(false);
    }
  };

  const saveWarehouse = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    try {
      await warehouseService.updateWarehouse(selectedId, {
        name: editForm.name,
        address: editForm.address,
        phone: editForm.phone,
        managerId: editForm.managerId || undefined,
        status: editForm.status,
      });
      await reload();
      showToast('success', 'Đã cập nhật kho hàng');
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể cập nhật kho hàng'));
    } finally {
      setBusy(false);
    }
  };

  const createLocation = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedId) return;
    setBusy(true);
    try {
      await warehouseService.createLocation(selectedId, locationForm);
      setLocationForm({ code: '', zone: '', aisle: '', rack: '', shelf: '' });
      setLocations(await warehouseService.getLocations(selectedId));
      showToast('success', 'Đã thêm vị trí lưu kho');
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể thêm vị trí'));
    } finally {
      setBusy(false);
    }
  };

  const assignAgency = async (): Promise<void> => {
    if (!agencyId || !selectedId) return;
    try {
      await warehouseService.setAgencyDefaultWarehouse(agencyId, selectedId);
      setAgencyDefaults((current) => ({ ...current, [agencyId]: selectedId }));
      showToast('success', 'Đã gán kho phục vụ mặc định cho đại lý');
    } catch (error: unknown) {
      showToast('error', getFriendlyErrorMessage(error, 'Không thể gán kho cho đại lý'));
    }
  };

  const selectWarehouse = (warehouseId: string): void => {
    sessionStorage.setItem(SELECTED_WAREHOUSE_STORAGE_KEY, warehouseId);
    setSelectedId(warehouseId);
    setLocations([]);
    const selected = warehouses.find((warehouse) => warehouse.id === warehouseId);
    if (selected) setEditForm(getWarehouseEditForm(selected));
    setAgencyId(agencies.find((agency) => agencyDefaults[agency.id] === warehouseId)?.id || '');
  };

  const assignedAgencies = agencies.filter((agency) => agencyDefaults[agency.id] === selectedId);

  return (
    <main className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý kho hàng</h1>
          <p className="mt-1 text-sm text-slate-500">
            Khai báo nhiều kho, vị trí soạn hàng và kho phục vụ mặc định của đại lý.
          </p>
        </div>
        <button
          onClick={() => void reload()}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold"
        >
          <RefreshCw size={16} /> Làm mới
        </button>
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <WarehouseIcon size={18} /> Danh sách kho ({warehouses.length})
          </h2>
          <div className="space-y-2">
            {warehouses.map((item) => (
              <button
                key={item.id}
                onClick={() => selectWarehouse(item.id)}
                className={`w-full rounded-lg border p-3 text-left ${selectedId === item.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{item.name}</span>
                  <span className="text-xs text-slate-500">{item.code}</span>
                </div>
                <div className="mt-1 text-sm text-slate-500">{item.address}</div>
                <div className="mt-2 text-xs text-slate-500">
                  {item.locationCount} vị trí ·{' '}
                  {item.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                </div>
              </button>
            ))}
          </div>
          {selectedId && (
            <form
              onSubmit={(event) => void saveWarehouse(event)}
              className="mt-5 grid gap-2 border-t pt-4 sm:grid-cols-2"
            >
              <h3 className="sm:col-span-2 font-semibold">Cập nhật kho đang chọn</h3>
              <input
                required
                aria-label="Tên kho"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="rounded-lg border px-3 py-2"
              />
              <input
                required
                aria-label="Địa chỉ kho"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="rounded-lg border px-3 py-2"
              />
              <input
                placeholder="Số điện thoại"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="rounded-lg border px-3 py-2"
              />
              <select
                aria-label="Người phụ trách"
                value={editForm.managerId}
                onChange={(e) => setEditForm({ ...editForm, managerId: e.target.value })}
                className="rounded-lg border px-3 py-2"
              >
                <option value="">Chọn người phụ trách</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="Trạng thái kho"
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value as Warehouse['status'] })
                }
                className="rounded-lg border px-3 py-2"
              >
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Ngưng hoạt động</option>
              </select>
              <button
                disabled={busy}
                className="rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white disabled:opacity-50"
              >
                Lưu thay đổi
              </button>
            </form>
          )}
          <form
            onSubmit={(event) => void createWarehouse(event)}
            className="mt-5 grid gap-2 border-t pt-4 sm:grid-cols-2"
          >
            <h3 className="sm:col-span-2 font-semibold">Khai báo kho mới</h3>
            <input
              required
              placeholder="Mã kho"
              value={warehouseForm.code}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, code: e.target.value })}
              className="rounded-lg border px-3 py-2"
            />
            <input
              required
              placeholder="Tên kho"
              value={warehouseForm.name}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
              className="rounded-lg border px-3 py-2"
            />
            <input
              required
              placeholder="Địa chỉ"
              value={warehouseForm.address}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, address: e.target.value })}
              className="rounded-lg border px-3 py-2 sm:col-span-2"
            />
            <input
              placeholder="Số điện thoại"
              value={warehouseForm.phone}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, phone: e.target.value })}
              className="rounded-lg border px-3 py-2"
            />
            <select
              aria-label="Người phụ trách kho mới"
              value={warehouseForm.managerId}
              onChange={(e) => setWarehouseForm({ ...warehouseForm, managerId: e.target.value })}
              className="rounded-lg border px-3 py-2"
            >
              <option value="">Chọn người phụ trách</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
            <button
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white disabled:opacity-50"
            >
              <Plus size={16} /> Tạo kho
            </button>
          </form>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold">
              <MapPin size={18} /> Vị trí lưu trữ
            </h2>
            {selectedId ? (
              <>
                <div className="mb-3 flex flex-wrap gap-2">
                  {locations.map((location) => (
                    <span
                      key={location.id}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-sm"
                    >
                      {location.code}
                      <span className="text-slate-500">
                        {' '}
                        ·{' '}
                        {[
                          location.zone,
                          location.aisle,
                          location.rack,
                          location.shelf,
                          location.bin,
                        ]
                          .filter(Boolean)
                          .join('/')}
                      </span>
                    </span>
                  ))}
                </div>
                <form
                  onSubmit={(event) => void createLocation(event)}
                  className="grid grid-cols-2 gap-2"
                >
                  <input
                    required
                    placeholder="Mã vị trí"
                    value={locationForm.code}
                    onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })}
                    className="rounded-lg border px-3 py-2"
                  />
                  <input
                    placeholder="Khu"
                    value={locationForm.zone}
                    onChange={(e) => setLocationForm({ ...locationForm, zone: e.target.value })}
                    className="rounded-lg border px-3 py-2"
                  />
                  <input
                    placeholder="Dãy"
                    value={locationForm.aisle}
                    onChange={(e) => setLocationForm({ ...locationForm, aisle: e.target.value })}
                    className="rounded-lg border px-3 py-2"
                  />
                  <input
                    placeholder="Kệ"
                    value={locationForm.rack}
                    onChange={(e) => setLocationForm({ ...locationForm, rack: e.target.value })}
                    className="rounded-lg border px-3 py-2"
                  />
                  <input
                    placeholder="Tầng"
                    value={locationForm.shelf}
                    onChange={(e) => setLocationForm({ ...locationForm, shelf: e.target.value })}
                    className="rounded-lg border px-3 py-2"
                  />
                  <button
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 font-semibold text-white"
                  >
                    <Plus size={16} /> Thêm vị trí
                  </button>
                </form>
              </>
            ) : (
              <p className="text-sm text-slate-500">Tạo hoặc chọn kho để khai báo vị trí.</p>
            )}
          </section>
          <section className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="mb-2 flex items-center gap-2 font-semibold">
              <Building2 size={18} /> Kho mặc định của đại lý
            </h2>
            <p className="mb-3 text-sm text-slate-500">
              Gán kho sẽ phục vụ xử lý đơn của đại lý đã chọn.
            </p>
            <p className="mb-2 text-sm font-medium text-slate-700">
              Đại lý đã gán cho kho đang chọn ({assignedAgencies.length})
            </p>
            {assignedAgencies.length ? (
              <ul className="mb-3 space-y-1 text-sm text-slate-600">
                {assignedAgencies.map((agency) => (
                  <li key={agency.id}>
                    {agency.code} · {agency.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-slate-500">Chưa có đại lý nào được gán.</p>
            )}
            <select
              value={agencyId}
              onChange={(event) => setAgencyId(event.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">Chọn đại lý</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.code} · {agency.name}
                </option>
              ))}
            </select>
            {agencyId && (
              <p className="mt-2 text-sm text-slate-600">
                Kho hiện tại:{' '}
                {warehouses.find((item) => item.id === agencyDefaults[agencyId])?.name ||
                  'Chưa gán'}
              </p>
            )}
            <button
              type="button"
              disabled={!agencyId || !selectedId}
              onClick={() => void assignAgency()}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Gán kho đang chọn
            </button>
            {!agencies.length && (
              <p className="mt-2 text-sm text-amber-700">Không tải được danh sách đại lý.</p>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
