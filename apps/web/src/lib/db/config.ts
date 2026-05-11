import {
  getPersistenceMode,
  type PersistenceMode,
  usesPostgresPersistence
} from "./persistence-mode";

export type PostgresSslMode = "disable" | "prefer" | "require";

export interface PostgresConnectionConfig {
  url: string | null;
  configured: boolean;
  applicationName: string;
  sslMode: PostgresSslMode;
  maxConnections: number;
  idleTimeoutMs: number;
  connectionTimeoutMs: number;
  statementTimeoutMs: number;
}

export interface DatabaseFoundationConfig {
  mode: PersistenceMode;
  postgres: PostgresConnectionConfig;
}

function parseInteger(
  value: string | undefined,
  fallback: number,
  options?: { min?: number; max?: number }
) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const rounded = Math.trunc(parsed);

  if (typeof options?.min === "number" && rounded < options.min) {
    return fallback;
  }

  if (typeof options?.max === "number" && rounded > options.max) {
    return fallback;
  }

  return rounded;
}

function getPostgresSslMode(env: NodeJS.ProcessEnv): PostgresSslMode {
  const raw = env.DATABASE_SSL_MODE?.trim().toLowerCase();

  if (raw === "disable" || raw === "prefer" || raw === "require") {
    return raw;
  }

  return "prefer";
}

export function getDatabaseFoundationConfig(
  env: NodeJS.ProcessEnv = process.env
): DatabaseFoundationConfig {
  const mode = getPersistenceMode(env);
  const url = env.DATABASE_URL?.trim() || null;

  return {
    mode,
    postgres: {
      url,
      configured: Boolean(url),
      applicationName:
        env.DATABASE_APPLICATION_NAME?.trim() || "restaurant-commerce-cloud",
      sslMode: getPostgresSslMode(env),
      maxConnections: parseInteger(env.DATABASE_MAX_CONNECTIONS, 10, {
        min: 1,
        max: 100
      }),
      idleTimeoutMs: parseInteger(env.DATABASE_IDLE_TIMEOUT_MS, 30_000, {
        min: 1_000
      }),
      connectionTimeoutMs: parseInteger(
        env.DATABASE_CONNECTION_TIMEOUT_MS,
        10_000,
        { min: 1_000 }
      ),
      statementTimeoutMs: parseInteger(
        env.DATABASE_STATEMENT_TIMEOUT_MS,
        15_000,
        { min: 1_000 }
      )
    }
  };
}

export function isPostgresFoundationEnabled(
  config: DatabaseFoundationConfig = getDatabaseFoundationConfig()
) {
  return usesPostgresPersistence(config.mode);
}

export function isPostgresConfigured(
  config: DatabaseFoundationConfig = getDatabaseFoundationConfig()
) {
  return config.postgres.configured;
}
