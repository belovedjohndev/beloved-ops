import type { Pool, PoolClient } from "pg";
import type { TransactionRepositories, UnitOfWork } from "../application/ports.js";
import { PostgresClientRepository } from "./postgres-client-repository.js";
import { PostgresLeadRepository } from "./postgres-lead-repository.js";

export class PostgresUnitOfWork implements UnitOfWork {
  public constructor(private readonly pool: Pool) {}

  public async transaction<T>(
    work: (repositories: TransactionRepositories) => Promise<T>
  ): Promise<T> {
    const client: PoolClient = await this.pool.connect();

    try {
      await client.query("begin");
      const result = await work({
        leads: new PostgresLeadRepository(client),
        clients: new PostgresClientRepository(client)
      });
      await client.query("commit");

      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }
}
