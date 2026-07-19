import { Context, Next } from "hono";

// Extended context types for our application
export interface AppContext extends Context {
  // User context (set by auth middleware)
  get: (key: "user") =>
    | {
        userId: string;
        address: string;
        chainId: number;
        userType: string;
      }
    | undefined;
}

// Route handler type definitions
export type RouteHandler = (c: Context, next?: Next) => Promise<Response> | Response;

// Middleware type definitions
export type Middleware = (c: Context, next: Next) => Promise<Response> | Response;

// Error handler type definitions
export type ErrorHandler = (error: Error, c: Context) => Response;

// Not found handler type definitions
export type NotFoundHandler = (c: Context) => Response;

// API response types
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: {
    message: string;
    status: number;
    code?: string;
  };
  message?: string;
}

// Authentication types
export interface AuthUser {
  userId: string;
  address: string;
  chainId: number;
  userType: string;
}

// Request types
export interface AuthenticatedRequest extends Context {
  user: AuthUser;
}

// Environment variables type
export interface Env {
  NODE_ENV: string;
  PORT: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
  BASE_RPC_URL: string;
  BASE_SEPOLIA_RPC_URL: string;
  OPS_ORACLE_PK: string;
  PLATFORM_TOKEN_ADDRESS: string;
  PAYMENT_TOKEN_ADDRESS: string;
  TREASURY_ADDRESS: string;
  MAILERSEND_API_KEY: string;
  MAILERSEND_FROM_EMAIL: string;
  MAILERSEND_FROM_NAME: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
}

// Route parameter types
export interface RouteParams {
  [key: string]: string;
}

// Query parameter types
export interface QueryParams {
  [key: string]: string | string[] | undefined;
}

// Body types for different endpoints
export interface LoginBody {
  message: string;
  signature: string;
  address: string;
  chainId: number;
}

// Validation error types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
