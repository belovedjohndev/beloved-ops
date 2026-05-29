export type ApiEnv = {
  nodeEnv: string;
  apiPort: number;
  webOrigin: string;
  databaseUrl: string;
};

function readRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required.`);
  }

  return value;
}

export function getApiEnv(): ApiEnv {
  const apiPortValue = process.env["API_PORT"] ?? "4000";
  const apiPort = Number(apiPortValue);

  if (!Number.isInteger(apiPort) || apiPort <= 0) {
    throw new Error("API_PORT must be a positive integer.");
  }

  return {
    nodeEnv: process.env["NODE_ENV"] ?? "development",
    apiPort,
    webOrigin: process.env["WEB_ORIGIN"] ?? "http://localhost:5173",
    databaseUrl: readRequiredEnv("DATABASE_URL")
  };
}
