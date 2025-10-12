export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  userType: UserType;
  createdAt: Date;
  updatedAt: Date;
  settings?: Record<string, unknown>;
  isVerified: boolean;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  verificationCode?: string;
  verificationCodeExpiresAt?: Date;
}

export type UserType = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

// Optional: Create a type for creating a new user
export interface CreateUserInput {
  email?: string;
  phone?: string;
  name: string;
  password?: string;
  userType?: UserType;
}

// Optional: Create a type for updating a user
export interface UpdateUserInput {
  email?: string;
  phone?: string;
  name?: string;
  password?: string;
  userType?: UserType;
  settings?: Record<string, unknown>;
}
