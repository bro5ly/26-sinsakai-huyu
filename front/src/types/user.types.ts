// User types matching backend Prisma models
export enum UserType {
  STUDENT = "STUDENT",
  TEACHER = "TEACHER",
  ADMIN = "ADMIN",
  EXTERNAL = "EXTERNAL",
}

export interface User {
  id: string;
  studentId: string;
  serialNumber?: string | null;
  name: string;
  email?: string | null;
  grade?: string | null;
  major?: string | null;
  userType: UserType;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RentalSetting {
  id: string;
  userId: string;
  canBorrow: boolean;
  maxItems: number;
  createdAt?: string;
  updatedAt?: string;
}
