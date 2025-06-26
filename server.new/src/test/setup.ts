import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { PrismaClient } from "@prisma/client";

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";
process.env.RPC_URL = "http://localhost:8545";
process.env.ORACLE_PRIVATE_KEY =
  "0x1234567890123456789012345678901234567890123456789012345678901234";
process.env.PLATFORM_TOKEN_ADDRESS = "0x1234567890123456789012345678901234567890";

// Global test setup
beforeAll(async () => {
  // Any global setup before all tests
});

afterAll(async () => {
  // Any global cleanup after all tests
});

beforeEach(async () => {
  // Setup before each test
});

afterEach(async () => {
  // Cleanup after each test
});
