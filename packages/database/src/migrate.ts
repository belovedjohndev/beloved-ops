import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolClient } from "pg";
import { createPgPool } from "./pool.js";

type MigrationFile = {
  filename: string;
  path: string;
  sql: string;
  checksum: string;
};

type AppliedMigration = {
  filename: string;
  checksum: string;
};

const migrationTableName = "schema_migrations";

function getMigrationsDirectory(): string {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDirectory = dirname(currentFilePath);

  return resolve(currentDirectory, "../migrations");
}

function createChecksum(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function readMigrationFiles(): Promise<MigrationFile[]> {
  const migrationsDirectory = getMigrationsDirectory();
  const directoryEntries = await readdir(migrationsDirectory);
  const filenames = directoryEntries
    .filter((filename) => filename.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));

  const migrations: MigrationFile[] = [];

  for (const filename of filenames) {
    const path = resolve(migrationsDirectory, filename);
    const sql = await readFile(path, "utf8");

    migrations.push({
      filename,
      path,
      sql,
      checksum: createChecksum(sql)
    });
  }

  return migrations;
}

async function ensureMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    create table if not exists ${migrationTableName} (
      id bigserial primary key,
      filename text not null unique,
      checksum text not null,
      applied_at timestamptz not null default now()
    )
  `);
}

async function readAppliedMigrations(client: PoolClient): Promise<AppliedMigration[]> {
  const result = await client.query<AppliedMigration>(`
    select filename, checksum
    from ${migrationTableName}
    order by filename asc
  `);

  return result.rows;
}

function validateAppliedChecksums(
  appliedMigrations: AppliedMigration[],
  migrationFiles: MigrationFile[]
): void {
  const filesByName = new Map(
    migrationFiles.map((migration) => [migration.filename, migration])
  );

  for (const appliedMigration of appliedMigrations) {
    const migrationFile = filesByName.get(appliedMigration.filename);

    if (!migrationFile) {
      throw new Error(
        `Applied migration is missing from disk: ${appliedMigration.filename}`
      );
    }

    if (migrationFile.checksum !== appliedMigration.checksum) {
      throw new Error(
        `Checksum mismatch for applied migration ${appliedMigration.filename}. ` +
          "Do not edit migrations after they have been applied."
      );
    }
  }
}

function getPendingMigrations(
  appliedMigrations: AppliedMigration[],
  migrationFiles: MigrationFile[]
): MigrationFile[] {
  const appliedFilenames = new Set(
    appliedMigrations.map((migration) => migration.filename)
  );

  return migrationFiles.filter((migration) => !appliedFilenames.has(migration.filename));
}

async function applyMigration(client: PoolClient, migration: MigrationFile): Promise<void> {
  await client.query("begin");

  try {
    await client.query(migration.sql);
    await client.query(
      `
        insert into schema_migrations (filename, checksum)
        values ($1, $2)
      `,
      [migration.filename, migration.checksum]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  }
}

async function run(): Promise<void> {
  const isVerifyMode = process.argv.includes("--verify");
  const pool = createPgPool();

  try {
    const migrationFiles = await readMigrationFiles();
    const client = await pool.connect();

    try {
      await ensureMigrationTable(client);

      const appliedMigrations = await readAppliedMigrations(client);
      validateAppliedChecksums(appliedMigrations, migrationFiles);

      const pendingMigrations = getPendingMigrations(appliedMigrations, migrationFiles);

      if (isVerifyMode) {
        console.log(
          `Verified ${appliedMigrations.length} applied migration checksum(s).`
        );

        if (pendingMigrations.length === 0) {
          console.log("No pending migrations.");
          return;
        }

        console.log(`${pendingMigrations.length} pending migration(s):`);

        for (const migration of pendingMigrations) {
          console.log(`- ${migration.filename}`);
        }

        return;
      }

      if (pendingMigrations.length === 0) {
        console.log("Database is already up to date.");
        return;
      }

      for (const migration of pendingMigrations) {
        console.log(`Applying migration: ${migration.filename}`);
        await applyMigration(client, migration);
        console.log(`Applied migration: ${migration.filename}`);
      }

      console.log(`Applied ${pendingMigrations.length} migration(s).`);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

run().catch((error: unknown) => {
  console.error("Migration failed.");

  if (error instanceof Error) {
    console.error(error.message);

    if (error.stack) {
      console.error(error.stack);
    }
  } else {
    console.error(error);
  }

  process.exitCode = 1;
});
