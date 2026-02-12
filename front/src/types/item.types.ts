// Item types matching backend Prisma models
export enum ItemStatus {
  AVAILABLE = "AVAILABLE",
  RENTED = "RENTED",
  MAINTENANCE = "MAINTENANCE",
  RETIRED = "RETIRED",
}

export interface Category {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Genre {
  id: string;
  name: string;
  categoryId: string;
  category: Category;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemType {
  id: string;
  title: string;
  description?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  imageUrl?: string | null;
  rentalPeriodDays: number;
  genreId: string;
  genre: Genre;
  createdAt?: string;
  updatedAt?: string;
}

export interface Item {
  id: string;
  barcode: string;
  serialNumber?: string | null;
  location: string;
  status: ItemStatus;
  itemTypeId: string;
  itemType: ItemType;
  createdAt?: string;
  updatedAt?: string;
}

// Helper type for grouped items (frontend only)
export interface ItemGroup {
  itemType: ItemType;
  items: Item[];
  availableCount: number;
}
