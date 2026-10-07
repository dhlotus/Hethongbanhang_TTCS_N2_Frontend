import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
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
  X,
  ShieldCheck,
  Tag,
  ExternalLink,
  ArrowLeft,
  MoreVertical,
} from "lucide-react";
import { CategoriesTreeSkeleton } from "../components/skeletons";
import { categoriesService } from "../services/categories.service";
import { showToast } from "../components/toast";
import { ConfirmDeleteModal } from "../components/confirm-delete-modal";
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

  // Modal State: View Products in Category Branch
  const [selectedCategoryForProducts, setSelectedCategoryForProducts] =
    useState<CategoryTreeNode | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState<boolean>(false);
  const [activeActionSheetNode, setActiveActionSheetNode] =
    useState<CategoryTreeNode | null>(null);

  // Modal State: Delete Category
  const [categoryToDelete, setCategoryToDelete] =
    useState<CategoryTreeNode | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

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
    } catch {
      showToast("error", "Không thể tải danh mục sản phẩm");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        showToast("success", "Cập nhật nhóm hàng thành công");
      } else {
        const payload: CreateCategoryPayload = {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          parentId: selectedParentId || undefined,
          description: formDescription.trim() || undefined,
          status: formStatus,
        };
        await categoriesService.createCategory(payload);
        showToast("success", "Tạo mới nhóm hàng thành công");
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
      await categoriesService.moveProducts(payload);
      showToast("success", "Di chuyển sản phẩm thành công");
      setIsMoveModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setMoveError(error.message);
    } finally {
      setMoveSubmitting(false);
    }
  };

  // Delete Category Flow
  const handleDeleteCategory = (cat: CategoryTreeNode) => {
    setCategoryToDelete(cat);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await categoriesService.deleteCategory(categoryToDelete.id);
      showToast("success", "Xóa nhóm hàng thành công");
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      showToast("error", error.message || "Không thể xóa nhóm hàng");
    } finally {
      setIsDeleting(false);
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
        ? { label: "Cấp 1 - Nhóm chính", color: "bg-blue-50 text-blue-700 border-blue-200" }
        : node.level === 2
          ? { label: "Cấp 2 - Nhóm phụ", color: "bg-indigo-50 text-indigo-700 border-indigo-200" }
          : { label: "Cấp 3 - Phân loại con", color: "bg-purple-50 text-purple-700 border-purple-200" };

    return (
      <div key={node.id} className="relative flex flex-col">
        {/* Node Row */}
        <div
          className={`group flex items-center justify-between gap-2 sm:gap-3 p-2.5 sm:p-3.5 my-1 rounded-xl sm:rounded-2xl border transition-all duration-150 ${node.level === 1
            ? "bg-white border-slate-200 shadow-2xs hover:border-blue-300"
            : node.level === 2
              ? "bg-slate-50/70 border-slate-200/80 hover:border-indigo-300"
              : "bg-white border-slate-200/60 hover:border-purple-300"
            }`}
        >
          {/* Left: Expander + Icon + Name + Badges */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors focus:outline-none cursor-pointer shrink-0"
                title={isExpanded ? "Thu gọn" : "Mở rộng"}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-6 h-6 flex items-center justify-center text-slate-300 shrink-0">
                •
              </span>
            )}

            <div
              className={`flex h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-xl ${node.level === 1
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

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                  {node.name}
                </span>
                <span className="font-mono text-[10px] sm:text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium shrink-0">
                  {node.code}
                </span>
                <span
                  className={`hidden md:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelBadge.color} shrink-0`}
                >
                  {levelBadge.label}
                </span>
                {node.status === "INACTIVE" && (
                  <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 shrink-0">
                    Ngừng KD
                  </span>
                )}
              </div>
              {node.description && (
                <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 hidden sm:block">
                  {node.description}
                </span>
              )}
            </div>
          </div>

          {/* Right: Product Count Badge + Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Product Count Badge - Clickable to view products */}
            <button
              type="button"
              onClick={() => handleViewProducts(node)}
              className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95 ${node.productCount > 0
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                }`}
              title="Bấm để xem danh sách mặt hàng thuộc nhánh này"
            >
              <Package className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                {node.productCount} <span className="hidden sm:inline">sản phẩm</span>
              </span>
            </button>

            {/* Desktop Actions Toolbar (>= sm) */}
            {canManageCategories && (
              <div className="hidden sm:flex items-center gap-1 bg-white/80 p-0.5 rounded-xl border border-slate-200/80 shadow-2xs">
                {/* + Thêm nhóm con */}
                {node.level < 3 && (
                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal(node)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none cursor-pointer"
                    title="Thêm nhóm con cấp dưới"
                  >
                    <FolderPlus className="h-4 w-4" />
                  </button>
                )}

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

            {/* Mobile Action Sheet Trigger (...) */}
            {canManageCategories && (
              <button
                type="button"
                onClick={() => setActiveActionSheetNode(node)}
                className="sm:hidden p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                title="Tùy chọn thao tác"
                aria-label="Tùy chọn thao tác"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Children Render: Thụt lề linh hoạt pl-2 sm:pl-6 theo chuẩn Mobile */}
        {hasChildren && isExpanded && (
          <div className="flex flex-col border-l-2 border-slate-200/60 ml-1.5 sm:ml-4 pl-2 sm:pl-6 space-y-1">
            {node.children.map(renderTreeNode)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar (Tinh gọn 1 hàng, không lặp thẻ h1, tiết kiệm 150px chiều cao) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:px-5 sm:py-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        {/* Bên trái: Icon + Tiêu đề phụ + Badge */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FolderTree className="h-4 w-4" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Phân cấp Nhóm hàng & Ngành hàng
            </h2>
          </div>

          <span className="text-slate-300 hidden sm:inline">|</span>

          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <ShieldCheck className="h-3 w-3 text-emerald-600" />
            <span>Toàn vẹn dữ liệu</span>
          </span>
        </div>

        {/* Bên phải: Nút hành động */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <Link
            to="/catalog/products"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all focus:outline-none cursor-pointer group"
            title="Quay lại Danh mục sản phẩm"
          >
            <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Danh mục sản phẩm</span>
          </Link>

          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all focus:outline-none cursor-pointer"
            title="Làm mới cây danh mục"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Làm mới</span>
          </button>

          {canManageCategories && (
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 active:scale-[0.99] transition-all focus:outline-none cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm ngành hàng cha</span>
            </button>
          )}
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
          <CategoriesTreeSkeleton />
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 shadow-2xl flex flex-col h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
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
            <form onSubmit={handleSubmitCategory} className="flex-1 min-h-0 p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain">
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
              <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3 sm:py-4 border-t border-slate-100 bg-slate-50/95 backdrop-blur-xs shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 sm:flex-initial px-5 py-2.5 sm:py-2 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-none sm:rounded-3xl border-0 sm:border border-slate-200 shadow-2xl flex flex-col h-[100dvh] sm:h-auto max-h-[100dvh] sm:max-h-[90vh]">
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
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

            <form onSubmit={handleSubmitMove} className="flex-1 min-h-0 p-5 sm:p-6 space-y-4 overflow-y-auto overscroll-contain">
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

              <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3 sm:py-4 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 border-t border-slate-100 bg-slate-50/95 backdrop-blur-xs shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4">
                <button
                  type="button"
                  onClick={() => setIsMoveModalOpen(false)}
                  className="flex-1 sm:flex-initial px-4 py-2.5 sm:py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={moveSubmitting}
                  className="flex-1 sm:flex-initial px-5 py-2.5 sm:py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
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
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.status === "ACTIVE"
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

      {/* ===================================================================== */}
      {/* MOBILE ACTION SHEET (MENU 3 CHẤM DẠNG VUỐT GỌN GÀNG TRÊN SMARTPHONE) */}
      {/* ===================================================================== */}
      {activeActionSheetNode &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
            {/* Backdrop click to dismiss */}
            <div
              className="absolute inset-0"
              onClick={() => setActiveActionSheetNode(null)}
            />

            {/* Bottom Sheet Card */}
            <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-100 z-10 space-y-4 animate-in slide-in-from-bottom-5 duration-200">
              {/* Handle bar on mobile */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto sm:hidden -mt-1 mb-2" />

              {/* Header: Thông tin nhóm hàng */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      activeActionSheetNode.level === 1
                        ? "bg-blue-100 text-blue-700"
                        : activeActionSheetNode.level === 2
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-purple-100 text-purple-700"
                    }`}
                  >
                    <Folder className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">
                      {activeActionSheetNode.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      Mã: {activeActionSheetNode.code} • Cấp {activeActionSheetNode.level}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveActionSheetNode(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Danh sách hành động (Action Buttons) */}
              <div className="space-y-1 text-sm font-medium">
                {/* 1. Thêm nhóm con (nếu chưa tới cấp 3) */}
                {activeActionSheetNode.level < 3 && canManageCategories && (
                  <button
                    type="button"
                    onClick={() => {
                      const node = activeActionSheetNode;
                      setActiveActionSheetNode(null);
                      handleOpenCreateModal(node);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-blue-50 text-slate-700 hover:text-blue-700 transition-colors text-left"
                  >
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                      <FolderPlus className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-xs sm:text-sm">
                        Thêm nhóm con cấp {activeActionSheetNode.level + 1}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Tạo danh mục trực thuộc nhóm này
                      </p>
                    </div>
                  </button>
                )}

                {/* 2. Sửa thông tin */}
                {canManageCategories && (
                  <button
                    type="button"
                    onClick={() => {
                      const node = activeActionSheetNode;
                      setActiveActionSheetNode(null);
                      handleOpenEditModal(node);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-amber-50 text-slate-700 hover:text-amber-700 transition-colors text-left"
                  >
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                      <Edit2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-xs sm:text-sm">
                        Sửa thông tin nhóm hàng
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Đổi tên, mã hoặc trạng thái kinh doanh
                      </p>
                    </div>
                  </button>
                )}

                {/* 3. Chuyển sản phẩm */}
                {canManageCategories && (
                  <button
                    type="button"
                    onClick={() => {
                      const node = activeActionSheetNode;
                      setActiveActionSheetNode(null);
                      handleOpenMoveModal(node);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-colors text-left"
                  >
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                      <ArrowRightLeft className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-xs sm:text-sm">
                        Chuyển sản phẩm sang nhóm khác
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Di chuyển toàn bộ SKU sang danh mục mới
                      </p>
                    </div>
                  </button>
                )}

                {/* 4. Xem danh sách sản phẩm */}
                <button
                  type="button"
                  onClick={() => {
                    const node = activeActionSheetNode;
                    setActiveActionSheetNode(null);
                    handleViewProducts(node);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors text-left"
                >
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-xs sm:text-sm">
                      Xem {activeActionSheetNode.productCount} sản phẩm
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Danh sách SKU hàng hóa thuộc phân cấp này
                    </p>
                  </div>
                </button>

                {/* 5. Xóa nhóm hàng */}
                {canManageCategories && (
                  <button
                    type="button"
                    onClick={() => {
                      const node = activeActionSheetNode;
                      setActiveActionSheetNode(null);
                      handleDeleteCategory(node);
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-rose-50 text-rose-600 transition-colors text-left"
                  >
                    <div className="p-2 rounded-xl bg-rose-50 text-rose-600 shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-rose-700 text-xs sm:text-sm">
                        Xóa nhóm hàng
                      </p>
                      <p className="text-[11px] text-rose-400">
                        Yêu cầu nhóm rỗng và không có nhóm con
                      </p>
                    </div>
                  </button>
                )}
              </div>

              {/* Nút đóng */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveActionSheetNode(null)}
                  className="w-full py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* MODAL: XÁC NHẬN XÓA NHÓM HÀNG */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen && Boolean(categoryToDelete)}
        onCancel={() => {
          setDeleteModalOpen(false);
          setCategoryToDelete(null);
        }}
        onConfirm={handleConfirmDeleteCategory}
        title="Xác nhận xóa Nhóm Hàng"
        itemName={categoryToDelete?.name}
        itemCode={categoryToDelete?.code}
        message={
          categoryToDelete ? (
            <div className="space-y-1.5">
              <p>
                Bạn có chắc chắn muốn xóa nhóm hàng{" "}
                <strong className="text-slate-900 font-bold">&quot;{categoryToDelete.name}&quot;</strong> khỏi hệ thống?
              </p>
              <p className="text-[11px] text-slate-500">
                Hệ thống yêu cầu nhóm hàng phải rỗng (không chứa sản phẩm) và không có nhóm hàng con trực thuộc.
              </p>
            </div>
          ) : undefined
        }
        warningText="Thao tác này mang tính vĩnh viễn và không thể hoàn tác sau khi thực hiện."
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        isDeleting={isDeleting}
      />
    </div>
  );
};
