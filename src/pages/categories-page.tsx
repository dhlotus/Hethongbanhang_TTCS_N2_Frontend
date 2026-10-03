import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  FolderTree,
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  Edit2,
  Trash2,
  ArrowRightLeft,
  Package,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle2,
  X,
  ShieldCheck,
  Tag,
  ExternalLink,
} from "lucide-react";
import { categoriesService } from "../services/categories.service";
import { tokenStorage } from "../utils/token-storage";
import type {
  CategoryTreeNode,
  CategoryItem,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  MoveProductsPayload,
} from "../types/categories";

export const CategoriesPage: React.FC = () => {
  const [treeData, setTreeData] = useState<CategoryTreeNode[]>([]);
  const [flatCategories, setFlatCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Modal State: Create / Edit
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [formName, setFormName] = useState<string>("");
  const [formCode, setFormCode] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formStatus, setFormStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Modal State: Move Products
  const [isMoveModalOpen, setIsMoveModalOpen] = useState<boolean>(false);
  const [moveSourceId, setMoveSourceId] = useState<string>("");
  const [moveTargetId, setMoveTargetId] = useState<string>("");
  const [moveSubmitting, setMoveSubmitting] = useState<boolean>(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // Toast State
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Modal State: View Products in Category Branch
  const [selectedCategoryForProducts, setSelectedCategoryForProducts] =
    useState<CategoryTreeNode | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState<boolean>(false);

  const currentUser = tokenStorage.getUser();
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const canManageCategories =
    userRoles.includes("ADMIN") || userRoles.includes("SALES_MANAGER");

  // Load Tree & Flat List
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [tree, flat] = await Promise.all([
        categoriesService.getCategoryTree(),
        categoriesService.getCategories(),
      ]);
      setTreeData(tree);
      setFlatCategories(flat);

      // Auto expand Level 1 and Level 2 by default
      const initialExpanded = new Set<string>();
      const addExp = (nodes: CategoryTreeNode[]) => {
        nodes.forEach((n) => {
          if (n.level <= 2) initialExpanded.add(n.id);
          if (n.children && n.children.length > 0) addExp(n.children);
        });
      };
      addExp(tree);
      setExpandedNodes(initialExpanded);
    } catch (err: unknown) {
      const error = err as Error;
      setToast({ type: "error", message: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toast Auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Toggle Node Expand/Collapse
  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collect = (nodes: CategoryTreeNode[]) => {
      nodes.forEach((n) => {
        allIds.add(n.id);
        if (n.children) collect(n.children);
      });
    };
    collect(treeData);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Open Create Modal
  const handleOpenCreateModal = (parent?: CategoryTreeNode | CategoryItem) => {
    setEditingCategory(null);
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setFormStatus("ACTIVE");
    setSelectedParentId(parent ? parent.id : "");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (cat: CategoryTreeNode | CategoryItem) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormCode(cat.code);
    setFormDescription(cat.description || "");
    setFormStatus(cat.status);
    setSelectedParentId(cat.parentId || "");
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Move Products Modal
  const handleOpenMoveModal = (sourceCat: CategoryTreeNode | CategoryItem) => {
    setMoveSourceId(sourceCat.id);
    const other = flatCategories.find((c) => c.id !== sourceCat.id);
    setMoveTargetId(other ? other.id : "");
    setMoveError(null);
    setIsMoveModalOpen(true);
  };

  // Open View Products Modal
  const handleViewProducts = async (node: CategoryTreeNode) => {
    setSelectedCategoryForProducts(node);
    setIsProductsModalOpen(true);
    setLoadingProducts(true);
    try {
      const items = await categoriesService.getProductsByCategory(node.id);
      setCategoryProducts(items);
    } catch {
      setCategoryProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Submit Category Form
  const handleSubmitCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Tên nhóm hàng không được để trống.");
      return;
    }
    if (!formCode.trim()) {
      setFormError("Mã nhóm hàng không được để trống.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      if (editingCategory) {
        const payload: UpdateCategoryPayload = {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          parentId: selectedParentId || undefined,
          description: formDescription.trim() || undefined,
          status: formStatus,
        };
        await categoriesService.updateCategory(editingCategory.id, payload);
        setToast({
          type: "success",
          message: `Đã cập nhật nhóm hàng [${formName.trim()}] thành công!`,
        });
      } else {
        const payload: CreateCategoryPayload = {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          parentId: selectedParentId || undefined,
          description: formDescription.trim() || undefined,
          status: formStatus,
        };
        await categoriesService.createCategory(payload);
        setToast({
          type: "success",
          message: `Đã tạo mới nhóm hàng [${formName.trim()}] thành công!`,
        });
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Move Products
  const handleSubmitMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveSourceId || !moveTargetId) {
      setMoveError("Vui lòng chọn đầy đủ nhóm nguồn và nhóm đích.");
      return;
    }
    if (moveSourceId === moveTargetId) {
      setMoveError("Nhóm hàng đích phải khác nhóm hàng nguồn.");
      return;
    }

    setMoveSubmitting(true);
    setMoveError(null);

    try {
      const payload: MoveProductsPayload = {
        sourceCategoryId: moveSourceId,
        targetCategoryId: moveTargetId,
      };
      const res = await categoriesService.moveProducts(payload);
      setToast({
        type: "success",
        message: res.message,
      });
      setIsMoveModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setMoveError(error.message);
    } finally {
      setMoveSubmitting(false);
    }
  };

  // Delete Category (Verifies constraints)
  const handleDeleteCategory = async (cat: CategoryTreeNode) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa nhóm hàng [${cat.code} - ${cat.name}]?\n\nHệ thống sẽ kiểm tra nghiêm ngặt xem nhóm có chứa nhóm con hoặc sản phẩm không trước khi xóa.`
      )
    ) {
      return;
    }

    try {
      const res = await categoriesService.deleteCategory(cat.id);
      setToast({
        type: "success",
        message: res.message,
      });
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setToast({
        type: "error",
        message: error.message,
      });
    }
  };

  // Filter Tree recursively based on search
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return treeData;
    const q = searchQuery.toLowerCase().trim();

    const filterNode = (node: CategoryTreeNode): CategoryTreeNode | null => {
      const isMatch =
        node.name.toLowerCase().includes(q) || node.code.toLowerCase().includes(q);
      const filteredChildren = (node.children || [])
        .map(filterNode)
        .filter((child): child is CategoryTreeNode => child !== null);

      if (isMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    };

    return treeData
      .map(filterNode)
      .filter((n): n is CategoryTreeNode => n !== null);
  }, [treeData, searchQuery]);

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: CategoryTreeNode) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    const levelBadge =
      node.level === 1
        ? { label: "Cấp 1 - Ngành chính", color: "bg-blue-50 text-blue-700 border-blue-200" }
        : node.level === 2
        ? { label: "Cấp 2 - Nhóm phụ", color: "bg-indigo-50 text-indigo-700 border-indigo-200" }
        : { label: "Cấp 3 - Phân loại con", color: "bg-purple-50 text-purple-700 border-purple-200" };

    return (
      <div key={node.id} className="relative flex flex-col">
        {/* Node Row */}
        <div
          className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 my-1 rounded-2xl border transition-all duration-150 ${
            node.level === 1
              ? "bg-white border-slate-200 shadow-2xs hover:border-blue-300"
              : node.level === 2
              ? "bg-slate-50/70 border-slate-200/80 ml-4 sm:ml-7 hover:border-indigo-300"
              : "bg-white border-slate-200/60 ml-8 sm:ml-14 hover:border-purple-300"
          }`}
        >
          {/* Left: Expander + Icon + Name + Badges */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors focus:outline-none cursor-pointer"
                title={isExpanded ? "Thu gọn" : "Mở rộng"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-6 h-6 flex items-center justify-center text-slate-300">
                •
              </span>
            )}

            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                node.level === 1
                  ? "bg-blue-100/70 text-blue-700"
                  : node.level === 2
                  ? "bg-indigo-100/70 text-indigo-700"
                  : "bg-purple-100/70 text-purple-700"
              }`}
            >
              {hasChildren ? (
                isExpanded ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <Folder className="h-4 w-4" />
                )
              ) : (
                <Tag className="h-3.5 w-3.5" />
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                  {node.name}
                </span>
                <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                  {node.code}
                </span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelBadge.color}`}
                >
                  {levelBadge.label}
                </span>
                {node.status === "INACTIVE" && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    Ngừng KD
                  </span>
                )}
              </div>
              {node.description && (
                <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                  {node.description}
                </span>
              )}
            </div>
          </div>

          {/* Right: Product Count Badge + Action Buttons */}
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {/* Product Count Badge - Clickable to view products */}
            <button
              type="button"
              onClick={() => handleViewProducts(node)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${
                node.productCount > 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
              }`}
              title="Bấm để xem danh sách mặt hàng thuộc nhánh này"
            >
              <Package className="h-3.5 w-3.5 text-emerald-600" />
              <span>{node.productCount} sản phẩm</span>
            </button>

            {/* Actions (Admins & Sales Managers) */}
            {canManageCategories && (
              <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                {/* + Thêm nhóm con */}
                <button
                  type="button"
                  onClick={() => handleOpenCreateModal(node)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none cursor-pointer"
                  title="Thêm nhóm con cấp dưới"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>

                {/* Sửa thông tin */}
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(node)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors focus:outline-none cursor-pointer"
                  title="Sửa thông tin nhóm hàng"
                >
                  <Edit2 className="h-4 w-4" />
                </button>

                {/* Di chuyển sản phẩm */}
                <button
                  type="button"
                  onClick={() => handleOpenMoveModal(node)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus:outline-none cursor-pointer"
                  title="Chuyển sản phẩm sang nhóm khác"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                </button>

                {/* Xóa nhóm */}
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(node)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus:outline-none cursor-pointer"
                  title="Xóa nhóm hàng (Ràng buộc: nhóm rỗng và không có nhóm con)"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Children Render */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col border-l-2 border-slate-200/60 ml-4 sm:ml-6 pl-1 sm:pl-2">
            {node.children.map(renderTreeNode)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-xs sm:text-sm animate-bounce ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/20">
                <FolderTree className="h-3.5 w-3.5 text-blue-600" />
                <span>Cấu trúc Cây Đa Cấp (Tree Structure - SN-150 / SN-22)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Ràng buộc toàn vẹn dữ liệu cứng</span>
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Quản lý Cây Nhóm Hàng & Ngành Hàng
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Phân cấp nhóm hàng hóa tối thiểu 3 cấp (Ngành cha → Nhóm phụ → Phân loại con), quản lý sản phẩm liên kết, hỗ trợ chuyển sản phẩm và ngăn chặn xóa nhóm chưa dọn sạch.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all focus:outline-none cursor-pointer"
              title="Làm mới cây danh mục"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>

            {canManageCategories && (
              <button
                type="button"
                onClick={() => handleOpenCreateModal()}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] transition-all focus:outline-none cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>+ Thêm ngành hàng cha</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Expand/Collapse */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc mã nhóm..."
            className="w-full rounded-xl border border-slate-200/90 pl-9.5 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
          <button
            type="button"
            onClick={expandAll}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
          >
            Mở rộng tất cả
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium"
          >
            Thu gọn tất cả
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs min-h-[350px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-xs">Đang tải cấu trúc cây danh mục...</p>
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-3">
            <FolderTree className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">
              Không tìm thấy nhóm hàng nào phù hợp
            </p>
            <p className="text-xs text-slate-400">
              Thử tìm kiếm với từ khóa khác hoặc tạo nhóm hàng mới.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTree.map(renderTreeNode)}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL: THÊM MỚI / CHỈNH SỬA NHÓM HÀNG                                 */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FolderPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingCategory
                      ? "Cập nhật Nhóm Hàng"
                      : "Thêm Mới Nhóm Hàng"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingCategory
                      ? `Mã định danh: ${editingCategory.code}`
                      : "Cấu trúc cây đa cấp (Cấp 1, Cấp 2, Cấp 3)"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitCategory} className="p-6 space-y-4 overflow-y-auto">
              {formError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Tên nhóm */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên nhóm hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Sữa bột công thức, Nước yến chưng sẵn..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
              </div>

              {/* Mã code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã nhóm hàng (Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase().replace(/\s+/g, "_"))}
                  placeholder="Ví dụ: MILK_POWDER, NEST_READY..."
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-mono font-medium text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Mã viết hoa, không dấu, không chứa khoảng trắng.
                </span>
              </div>

              {/* Chọn Nhóm Cha */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhóm hàng cha (Trực thuộc)
                </label>
                <select
                  value={selectedParentId}
                  onChange={(e) => setSelectedParentId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value="">-- Không có (Ngành hàng Cấp 1 cao nhất) --</option>
                  {flatCategories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.level === 1 ? "📁 [Cấp 1] " : cat.level === 2 ? "  📂 [Cấp 2] " : "    🏷️ [Cấp 3] "}
                        {cat.name} ({cat.code})
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Cấp bậc (Level) sẽ tự động tính = Cấp cha + 1. Ngăn chặn chọn con/cháu làm cha.
                </span>
              </div>

              {/* Mô tả */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả nhóm hàng
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Ghi chú chi tiết về các sản phẩm thuộc phân loại này..."
                  rows={2}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Trạng thái */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái hoạt động
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="formStatus"
                      value="ACTIVE"
                      checked={formStatus === "ACTIVE"}
                      onChange={() => setFormStatus("ACTIVE")}
                      className="text-blue-600"
                    />
                    <span className="text-slate-700 font-medium">Đang kinh doanh (ACTIVE)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="formStatus"
                      value="INACTIVE"
                      checked={formStatus === "INACTIVE"}
                      onChange={() => setFormStatus("INACTIVE")}
                      className="text-blue-600"
                    />
                    <span className="text-slate-700 font-medium">Tạm ngừng (INACTIVE)</span>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {submitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>{editingCategory ? "Lưu thay đổi" : "Tạo nhóm hàng"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: DI CHUYỂN SẢN PHẨM GIỮA CÁC NHÓM                              */}
      {/* ===================================================================== */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Di chuyển Sản phẩm
                  </h3>
                  <p className="text-xs text-slate-500">
                    Chuyển toàn bộ sản phẩm sang nhóm hàng đích
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMove} className="p-6 space-y-4">
              {moveError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{moveError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhóm hàng nguồn (Từ)
                </label>
                <select
                  value={moveSourceId}
                  onChange={(e) => setMoveSourceId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 bg-slate-50"
                  disabled
                >
                  {flatCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhóm hàng đích (Đến) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={moveTargetId}
                  onChange={(e) => setMoveTargetId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  required
                >
                  <option value="">-- Chọn nhóm hàng chuyển đến --</option>
                  {flatCategories
                    .filter((c) => c.id !== moveSourceId)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.level === 1 ? "📁 [Cấp 1] " : cat.level === 2 ? "  📂 [Cấp 2] " : "    🏷️ [Cấp 3] "}
                        {cat.name} ({cat.code})
                      </option>
                    ))}
                </select>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Thao tác này sẽ chuyển toàn bộ mặt hàng thuộc nhóm nguồn sang nhóm đích, giải phóng nhóm nguồn để bạn có thể xóa nếu cần.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={moveSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {moveSubmitting && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
                  <span>Thực hiện chuyển</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: XEM DANH SÁCH SẢN PHẨM TRONG NHÓM HÀNG                       */}
      {/* ===================================================================== */}
      {isProductsModalOpen && selectedCategoryForProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Sản phẩm trong nhóm: {selectedCategoryForProducts.name}</span>
                    <span className="text-xs font-mono font-medium text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                      {selectedCategoryForProducts.code}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Phân cấp Cấp {selectedCategoryForProducts.level} • {categoryProducts.length} sản phẩm trực thuộc nhánh này
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProductsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingProducts ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                  <RefreshCw className="h-7 w-7 animate-spin text-emerald-500" />
                  <p className="text-xs">Đang tải sản phẩm thuộc nhánh...</p>
                </div>
              ) : categoryProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 space-y-3">
                  <Package className="h-10 w-10 text-slate-300" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Chưa có sản phẩm nào thuộc nhánh này</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      Khi thêm mới sản phẩm và chọn nhóm "{selectedCategoryForProducts.name}", sản phẩm sẽ tự động quy về nhánh này.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 overflow-hidden">
                    {categoryProducts.map((p) => (
                      <div
                        key={p.id || p.sku}
                        className="p-3.5 bg-white hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 overflow-hidden">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                            ) : (
                              <Package className="h-4.5 w-4.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-800">{p.sku}</span>
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  p.status === "ACTIVE"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {p.status === "ACTIVE" ? "Kinh doanh" : "Ngừng KD"}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-slate-900 truncate mt-0.5">{p.name}</p>
                            <p className="text-[11px] text-slate-500">
                              ĐVT: <span className="font-semibold text-slate-700">{p.baseUnit}</span> • Tồn kho:{" "}
                              <span className="font-semibold text-slate-700">{p.stockQuantity}</span> • Giá:{" "}
                              <span className="font-semibold text-blue-600">
                                {new Intl.NumberFormat("vi-VN").format(p.price)} đ
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
              <Link
                to={`/catalog/products?categoryId=${selectedCategoryForProducts.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>Mở trong Danh mục sản phẩm</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setIsProductsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
