import { Pool, type PoolConfig } from "pg";

export type DatabasePool = Pool;

export function createPgPool(config: Partial<PoolConfig> = {}): DatabasePool {
  const connectionString = config.connectionString ?? process.env["DATABASE_URL"];

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create a PostgreSQL connection pool.");
  }

  return new Pool({
    max: 10,
    ...config,
    connectionString
  });
}
