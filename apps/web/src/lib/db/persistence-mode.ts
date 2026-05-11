export type PersistenceMode =
  | "json"
  | "postgres"
  | "dual_write_json_primary"
  | "dual_write_postgres_primary";

const VALID_PERSISTENCE_MODES = new Set<PersistenceMode>([
  "json",
  "postgres",
  "dual_write_json_primary",
  "dual_write_postgres_primary"
]);

export function getPersistenceMode(
  env: NodeJS.ProcessEnv = process.env
): PersistenceMode {
  const raw = env.PERSISTENCE_MODE?.trim().toLowerCase();

  if (raw && VALID_PERSISTENCE_MODES.has(raw as PersistenceMode)) {
    return raw as PersistenceMode;
  }

  return "json";
}

export function usesPostgresPersistence(mode: PersistenceMode) {
  return mode === "postgres" || mode.startsWith("dual_write_");
}
