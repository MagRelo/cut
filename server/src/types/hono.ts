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
  RPC_URL: string;
  ORACLE_PRIVATE_KEY: string;
  PLATFORM_TOKEN_ADDRESS: string;
  PAYMENT_TOKEN_ADDRESS: string;
  ESCROW_FACTORY_ADDRESS: string;
  TREASURY_ADDRESS: string;
  SENDGRID_API_KEY: string;
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

export interface CreateLineupBody {
  tournamentId: string;
  playerIds: string[];
}

export interface UpdateLineupBody {
  playerIds: string[];
}

export interface CreateContestBody {
  tournamentId: string;
  name: string;
  entryFee: number;
  maxParticipants: number;
  prizePool: number;
}

export interface JoinContestBody {
  contestId: string;
  lineupId: string;
}

// Database entity types (matching Prisma schema)
export interface User {
  id: string;
  address: string;
  chainId: number;
  userType: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tournament {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Player {
  id: string;
  name: string;
  pgaId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lineup {
  id: string;
  userId: string;
  tournamentId: string;
  playerIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Contest {
  id: string;
  tournamentId: string;
  name: string;
  entryFee: number;
  maxParticipants: number;
  prizePool: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
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
