import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, X, Edit2, Trash2 } from 'lucide-react';
import { showToast } from './toast';
import { discountPoliciesService } from '../services/discount-policies.service';
import type { DiscountPolicy, CreateDiscountPolicyPayload } from '../services/discount-policies.service';
import { DiscountPolicyFormModal } from './discount-policy-form-modal';

export const DiscountPoliciesTab: React.FC = () => {
  const [policies, setPolicies] = useState<DiscountPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<DiscountPolicy | null>(null);

  const loadPolicies = async () => {
    setLoading(true);
    try {
      const data = await discountPoliciesService.getPolicies();
      setPolicies(data);
    } catch (err: any) {
      showToast('error', 'Lỗi khi tải danh sách chính sách chiết khấu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingPolicy(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (policy: DiscountPolicy) => {
    setEditingPolicy(policy);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa chính sách này không?')) return;
    try {
      await discountPoliciesService.deletePolicy(id);
      showToast('success', 'Xóa chính sách thành công');
      loadPolicies();
    } catch (err: any) {
      showToast('error', 'Lỗi khi xóa chính sách');
    }
  };

  const handleFormSubmit = async (payload: CreateDiscountPolicyPayload, id?: string) => {
    try {
      if (id) {
        await discountPoliciesService.updatePolicy(id, payload);
        showToast('success', 'Cập nhật chính sách thành công');
      } else {
        await discountPoliciesService.createPolicy(payload);
        showToast('success', 'Thêm mới chính sách thành công');
      }
      setIsModalOpen(false);
      loadPolicies();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Lỗi khi lưu chính sách');
      throw err; // Re-throw to prevent modal from closing if we want, or handle inside modal
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Danh sách Chính sách Chiết khấu theo Sản lượng</h2>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Thêm chính sách</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs border-separate border-spacing-0">
          <thead>
            <tr className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <th className="bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-12 text-center">STT</th>
              <th className="bg-slate-50 border-b border-slate-200/80 py-3 px-4 min-w-[150px]">Mã chính sách</th>
              <th className="bg-slate-50 border-b border-slate-200/80 py-3 px-4 min-w-[200px]">Tên chính sách</th>
              <th className="bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-36">Đối tượng</th>
              <th className="bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-36">Loại chiết khấu</th>
              <th className="bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-48">Thời gian hiệu lực</th>
              <th className="bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-36 text-center">Trạng thái</th>
              <th className="bg-slate-50 border-b border-slate-200/80 py-3 px-4 w-28 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr><td colSpan={8} className="py-4 text-center">Đang tải...</td></tr>
            ) : policies.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-500">Không có chính sách nào</td></tr>
            ) : (
              policies.map((p, i) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4 text-center text-slate-400 font-mono text-[11px] w-12">{i + 1}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{p.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900">{p.name}</td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-slate-800 text-[11px]">
                        {p.targetType === 'HYBRID'
                          ? 'Đa tầng (Nhóm + SKU)'
                          : p.targetType === 'SKU'
                            ? 'Sản phẩm (SKU)'
                            : 'Nhóm hàng (Category)'}
                      </span>
                      <span className="text-slate-500 font-mono text-[11px] truncate max-w-[220px]" title={p.targetIds?.join(', ') || p.targetId}>
                        {p.targetIds && p.targetIds.length > 0 ? p.targetIds.join(', ') : p.targetId}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">{p.discountType === 'PERCENTAGE' ? '% Phần trăm' : 'Cố định'}</td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {p.startDate ? p.startDate.split('T')[0] : ''} - {p.endDate ? p.endDate.split('T')[0] : ''}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {p.status === 'ACTIVE' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Đang hiệu lực
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 ring-1 ring-inset ring-slate-600/20">
                        <X className="w-3.5 h-3.5" />
                        Không hiệu lực
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => handleOpenEditModal(p)} className="p-1 text-slate-400 hover:text-blue-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(p.id)} className="p-1 text-slate-400 hover:text-rose-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <DiscountPolicyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingPolicy}
      />
    </div>
  );
};
