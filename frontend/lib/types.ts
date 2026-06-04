export type BadgeColor = "default" | "success" | "warning" | "danger";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  brand?: string;
  uom: string;
  imagePath?: string;
  lowStockThreshold: number;
  isDeleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
