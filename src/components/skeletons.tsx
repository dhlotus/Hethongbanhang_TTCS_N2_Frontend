import React from "react";

/**
 * Skeleton Loading cho Bảng Sản phẩm (Desktop Table)
 * Mô phỏng chính xác cấu trúc cột để chống giật giao diện (CLS = 0)
 */
export const ProductsTableSkeleton: React.FC<{
  count?: number;
  canViewCostPrice?: boolean;
}> = ({ count = 6, canViewCostPrice = false }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <tr key={idx} className="animate-pulse border-b border-slate-100">
          {/* Cột 1: Ảnh Thumbnail */}
          <td className="px-3 py-3 text-center">
            <div className="h-9 w-9 mx-auto rounded-xl bg-slate-200/80 shadow-2xs" />
          </td>

          {/* Cột 2: Mã SKU */}
          <td className="px-3 py-3 whitespace-nowrap">
            <div className="h-4 w-16 bg-slate-200 rounded-md" />
          </td>

          {/* Cột 3: Tên sản phẩm */}
          <td className="px-3 py-3">
            <div className="space-y-1.5 max-w-[240px]">
              <div
                className="h-4 bg-slate-200 rounded-md"
                style={{ width: `${75 + (idx % 3) * 10}%` }}
              />
              <div className="h-3 w-28 bg-slate-100 rounded-md" />
            </div>
          </td>

          {/* Cột 4: Nhóm hàng */}
          <td className="px-3 py-3">
            <div className="space-y-1 max-w-[200px]">
              <div className="h-5 w-24 bg-purple-100/70 rounded-md" />
              <div className="h-3 w-32 bg-slate-100 rounded-md" />
            </div>
          </td>

          {/* Cột 5: ĐVT */}
          <td className="px-3 py-3 text-center whitespace-nowrap">
            <div className="h-4 w-10 mx-auto bg-blue-100/60 rounded-md" />
          </td>

          {/* Cột 6: Quy cách */}
          <td className="px-3 py-3 whitespace-nowrap">
            <div className="h-4 w-20 bg-slate-100 rounded-md" />
          </td>

          {/* Cột 7: Giá niêm yết */}
          <td className="px-3 py-3 text-right whitespace-nowrap">
            <div className="h-4 w-24 ml-auto bg-slate-200 rounded-md" />
          </td>

          {/* Cột 8: Tồn kho */}
          <td className="px-3 py-3 text-right whitespace-nowrap">
            <div className="h-4 w-16 ml-auto bg-slate-200 rounded-md" />
          </td>

          {/* Cột Giá vốn & Biên LN (Chỉ hiển thị khi có quyền) */}
          {canViewCostPrice && (
            <>
              <td className="px-3 py-3 text-right bg-emerald-50/20 whitespace-nowrap">
                <div className="h-4 w-20 ml-auto bg-emerald-100/70 rounded-md" />
              </td>
              <td className="px-3 py-3 text-right bg-emerald-50/20 whitespace-nowrap">
                <div className="h-4 w-12 ml-auto bg-emerald-100/70 rounded-md" />
              </td>
            </>
          )}

          {/* Cột Trạng thái */}
          <td className="px-3 py-3 text-center whitespace-nowrap">
            <div className="h-6 w-24 mx-auto bg-slate-100 rounded-full" />
          </td>

          {/* Cột Thao tác */}
          <td className="px-3 py-3 text-center whitespace-nowrap">
            <div className="inline-flex items-center gap-1 justify-center">
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

/**
 * Skeleton Loading cho Thẻ Sản phẩm (Mobile Card View)
 */
export const ProductsMobileCardSkeleton: React.FC<{
  count?: number;
  canViewCostPrice?: boolean;
}> = ({ count = 4, canViewCostPrice = false }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-4 space-y-3 animate-pulse">
          {/* Hàng 1: Thumbnail + Tiêu đề */}
          <div className="flex items-start gap-3.5">
            <div className="h-16 w-16 rounded-xl bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between items-center">
                <div className="h-4 w-16 bg-slate-200 rounded-md" />
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
              </div>
              <div
                className="h-4 bg-slate-200 rounded-md"
                style={{ width: `${80 + (idx % 2) * 15}%` }}
              />
              <div className="h-4 w-28 bg-purple-100/70 rounded-md" />
            </div>
          </div>

          {/* Hàng 2: Khung số liệu 2 cột */}
          <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="space-y-1.5">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-5 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-12 bg-slate-100 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-5 w-20 bg-slate-200 rounded" />
              <div className="h-3 w-16 bg-slate-100 rounded" />
            </div>

            {canViewCostPrice && (
              <>
                <div className="pt-2 border-t border-slate-200/60 space-y-1">
                  <div className="h-3 w-12 bg-slate-200 rounded" />
                  <div className="h-4 w-20 bg-slate-200 rounded" />
                </div>
                <div className="pt-2 border-t border-slate-200/60 space-y-1">
                  <div className="h-3 w-14 bg-slate-200 rounded" />
                  <div className="h-4 w-12 bg-slate-200 rounded" />
                </div>
              </>
            )}
          </div>

          {/* Hàng 3: Thao tác */}
          <div className="flex justify-between items-center pt-1 border-t border-slate-50">
            <div className="h-3 w-16 bg-slate-100 rounded" />
            <div className="flex gap-1.5">
              <div className="h-7 w-14 bg-slate-100 rounded-lg" />
              <div className="h-7 w-14 bg-slate-100 rounded-lg" />
              <div className="h-7 w-7 bg-slate-100 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Skeleton Loading cho Bảng Nhân sự (Users Table)
 */
export const UsersTableSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <tr key={idx} className="animate-pulse border-b border-slate-100">
          {/* Nhân sự: Avatar + Họ tên */}
          <td className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-100 shrink-0" />
              <div className="space-y-1.5">
                <div
                  className="h-4 bg-slate-200 rounded-md"
                  style={{ width: `${120 + (idx % 3) * 20}px` }}
                />
                <div className="h-3 w-28 bg-slate-100 rounded-md" />
              </div>
            </div>
          </td>

          {/* Số điện thoại */}
          <td className="px-5 py-3.5 whitespace-nowrap">
            <div className="h-4 w-24 bg-slate-100 rounded-md" />
          </td>

          {/* Vai trò */}
          <td className="px-5 py-3.5">
            <div className="flex gap-1">
              <div className="h-5 w-24 bg-slate-100 rounded-lg" />
            </div>
          </td>

          {/* Trạng thái */}
          <td className="px-5 py-3.5 text-center whitespace-nowrap">
            <div className="h-6 w-24 mx-auto bg-slate-100 rounded-full" />
          </td>

          {/* Thao tác */}
          <td className="px-5 py-3.5 text-center whitespace-nowrap">
            <div className="inline-flex items-center gap-1 justify-center">
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

/**
 * Skeleton Loading cho Thẻ Nhân sự (Users Mobile Card)
 */
export const UsersMobileCardSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-4 space-y-3 animate-pulse">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-purple-100 shrink-0" />
              <div className="space-y-1.5 min-w-0">
                <div
                  className="h-4 bg-slate-200 rounded-md"
                  style={{ width: `${110 + (idx % 2) * 25}px` }}
                />
                <div className="h-3 w-24 bg-slate-100 rounded-md" />
              </div>
            </div>
            <div className="h-5 w-20 bg-slate-100 rounded-full shrink-0" />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-50">
            <div className="h-5 w-24 bg-slate-100 rounded-lg" />
            <div className="flex items-center gap-1 shrink-0">
              <div className="h-7 w-7 bg-slate-100 rounded-lg" />
              <div className="h-7 w-7 bg-slate-100 rounded-lg" />
              <div className="h-7 w-7 bg-slate-100 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

/**
 * Skeleton Loading cho Bảng Nhà cung cấp (Suppliers Table)
 */
export const SuppliersTableSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <tr key={idx} className="animate-pulse border-b border-slate-100">
          {/* Mã NCC */}
          <td className="px-4 py-3.5 whitespace-nowrap">
            <div className="h-6 w-16 bg-blue-100/70 rounded-lg" />
          </td>

          {/* Tên NCC */}
          <td className="px-4 py-3.5">
            <div
              className="h-4 bg-slate-200 rounded-md"
              style={{ width: `${150 + (idx % 3) * 30}px` }}
            />
          </td>

          {/* Người đại diện */}
          <td className="px-4 py-3.5 whitespace-nowrap">
            <div className="h-4 w-28 bg-slate-100 rounded-md" />
          </td>

          {/* Ràng buộc Phiếu nhập */}
          <td className="px-4 py-3.5 text-center whitespace-nowrap">
            <div className="h-6 w-24 mx-auto bg-indigo-50 rounded-lg" />
          </td>

          {/* Trạng thái */}
          <td className="px-4 py-3.5 text-center whitespace-nowrap">
            <div className="h-6 w-24 mx-auto bg-slate-100 rounded-full" />
          </td>

          {/* Thao tác */}
          <td className="px-4 py-3.5 text-center whitespace-nowrap">
            <div className="inline-flex items-center gap-1 justify-center">
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

/**
 * Skeleton Loading cho Bảng Bảng giá (PriceLists Table)
 */
export const PriceListsTableSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <tr key={idx} className="animate-pulse border-b border-slate-100">
          {/* STT */}
          <td className="py-3.5 px-4 text-center">
            <div className="h-4 w-5 mx-auto bg-slate-100 rounded" />
          </td>

          {/* Mã bảng giá */}
          <td className="py-3.5 px-4 whitespace-nowrap">
            <div className="space-y-1">
              <div className="h-4 w-24 bg-slate-200 rounded-md" />
              <div className="h-4 w-12 bg-blue-100/60 rounded" />
            </div>
          </td>

          {/* Tên bảng giá */}
          <td className="py-3.5 px-4">
            <div
              className="h-4 bg-slate-200 rounded-md"
              style={{ width: `${140 + (idx % 3) * 35}px` }}
            />
          </td>

          {/* Nhóm khách hàng */}
          <td className="py-3.5 px-4 whitespace-nowrap">
            <div className="h-6 w-24 bg-purple-50 rounded-lg" />
          </td>

          {/* Thời gian hiệu lực */}
          <td className="py-3.5 px-4 whitespace-nowrap">
            <div className="h-4 w-32 bg-slate-100 rounded-md" />
          </td>

          {/* Trạng thái */}
          <td className="py-3.5 px-4 whitespace-nowrap">
            <div className="h-6 w-24 bg-slate-100 rounded-full" />
          </td>

          {/* Ràng buộc đơn hàng */}
          <td className="py-3.5 px-4 text-center whitespace-nowrap">
            <div className="h-6 w-24 mx-auto bg-slate-100 rounded-lg" />
          </td>

          {/* Thao tác */}
          <td className="py-3.5 px-4 text-center whitespace-nowrap">
            <div className="inline-flex items-center gap-1 justify-center">
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
              <div className="h-7 w-7 rounded-lg bg-slate-100" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
};

/**
 * Skeleton Loading cho Cây danh mục (Categories Tree)
 */
export const CategoriesTreeSkeleton: React.FC = () => {
  return (
    <div className="space-y-3 p-2 animate-pulse">
      {/* Node Cấp 1 */}
      <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-slate-200 rounded" />
          <div className="h-5 w-36 bg-slate-200 rounded-md" />
          <div className="h-4 w-12 bg-blue-100 rounded-md" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-7 w-7 bg-slate-200 rounded-lg" />
          <div className="h-7 w-7 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Node con Cấp 2 thụt lề */}
      <div className="pl-2 sm:pl-6 space-y-2">
        <div className="p-3 rounded-xl border border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-4 bg-slate-200 rounded" />
            <div className="h-4 w-32 bg-slate-200 rounded-md" />
            <div className="h-3.5 w-10 bg-slate-100 rounded-md" />
          </div>
          <div className="flex gap-1">
            <div className="h-6 w-6 bg-slate-100 rounded-md" />
          </div>
        </div>
        <div className="p-3 rounded-xl border border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-4 bg-slate-200 rounded" />
            <div className="h-4 w-28 bg-slate-200 rounded-md" />
            <div className="h-3.5 w-10 bg-slate-100 rounded-md" />
          </div>
          <div className="flex gap-1">
            <div className="h-6 w-6 bg-slate-100 rounded-md" />
          </div>
        </div>
      </div>

      {/* Node Cấp 1 tiếp theo */}
      <div className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-slate-200 rounded" />
          <div className="h-5 w-44 bg-slate-200 rounded-md" />
          <div className="h-4 w-12 bg-blue-100 rounded-md" />
        </div>
        <div className="flex gap-1.5">
          <div className="h-7 w-7 bg-slate-200 rounded-lg" />
          <div className="h-7 w-7 bg-slate-200 rounded-lg" />
        </div>
      </div>

      {/* Node con Cấp 2 */}
      <div className="pl-2 sm:pl-6 space-y-2">
        <div className="p-3 rounded-xl border border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-4 w-4 bg-slate-200 rounded" />
            <div className="h-4 w-36 bg-slate-200 rounded-md" />
            <div className="h-3.5 w-10 bg-slate-100 rounded-md" />
          </div>
          <div className="flex gap-1">
            <div className="h-6 w-6 bg-slate-100 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
};
