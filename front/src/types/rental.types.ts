import { Item } from "./item.types";
import { User } from "./user.types";

// Rental types matching backend Prisma models
export enum RentalStatus {
  RENTING = "RENTING",
  RETURNED = "RETURNED",
  OVERDUE = "OVERDUE",
}

export interface Rental {
  id: string;
  itemId: string;
  userId: string;
  rentedAt: string;
  dueDate: string;
  returnedAt?: string | null;
  status: RentalStatus;
  createdAt?: string;
  updatedAt?: string;
  item: Item;
  user?: User;
}
