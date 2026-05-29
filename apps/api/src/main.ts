import { createPgPool } from "@belovedops/database";
import { getApiEnv } from "./config/env.js";
import { createApiServer } from "./http/server.js";

const env = getApiEnv();
const pool = createPgPool();
const server = createApiServer(pool, env);

server.listen(env.apiPort, () => {
  console.log(`Beloved Ops API listening on port ${env.apiPort}.`);
});

async function shutdown(): Promise<void> {
  server.close();
  await pool.end();
}

process.on("SIGINT", () => {
  void shutdown().finally(() => process.exit(0));
});

process.on("SIGTERM", () => {
  void shutdown().finally(() => process.exit(0));
});
