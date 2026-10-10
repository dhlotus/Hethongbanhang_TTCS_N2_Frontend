export type CategoryStatus = 'ACTIVE' | 'INACTIVE';

export interface CategoryTreeNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  parent_id?: string | null;
  level: number;
  description?: string | null;
  status: CategoryStatus;
  productCount: number;
  product_count?: number;
  children: CategoryTreeNode[];
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CategoryItem {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  parent_id?: string | null;
  level: number;
  description?: string | null;
  status: CategoryStatus;
  productCount?: number;
  product_count?: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateCategoryPayload {
  name: string;
  code: string;
  parentId?: string;
  description?: string;
  status?: CategoryStatus;
}

export interface UpdateCategoryPayload extends Partial<CreateCategoryPayload> {}

export interface MoveProductsPayload {
  sourceCategoryId: string;
  targetCategoryId: string;
  productIds?: string[];
}
