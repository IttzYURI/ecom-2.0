import {
  getDatabaseFoundationConfig,
  type DatabaseFoundationConfig
} from "./config";

export type DatabaseDriver = "postgres";

export type DatabaseScalar =
  | string
  | number
  | boolean
  | bigint
  | Date
  | null;

export interface DatabaseQueryResult<Row> {
  rows: Row[];
  rowCount: number;
}

export interface DatabaseConnectionSummary {
  driver: DatabaseDriver;
  mode: DatabaseFoundationConfig["mode"];
  configured: boolean;
  applicationName: string;
  sslMode: string;
}

export interface DatabaseConnection {
  readonly driver: DatabaseDriver;
  readonly configured: boolean;
  getSummary(): DatabaseConnectionSummary;
  query<Row extends Record<string, unknown>>(
    sql: string,
    params?: readonly DatabaseScalar[]
  ): Promise<DatabaseQueryResult<Row>>;
}

class PostgresFoundationConnection implements DatabaseConnection {
  readonly driver = "postgres" as const;

  constructor(private readonly config: DatabaseFoundationConfig) {}

  get configured() {
    return this.config.postgres.configured;
  }

  getSummary(): DatabaseConnectionSummary {
    return {
      driver: this.driver,
      mode: this.config.mode,
      configured: this.config.postgres.configured,
      applicationName: this.config.postgres.applicationName,
      sslMode: this.config.postgres.sslMode
    };
  }

  async query<Row extends Record<string, unknown>>(
    _sql: string,
    _params: readonly DatabaseScalar[] = []
  ): Promise<DatabaseQueryResult<Row>> {
    void _params;

    if (!this.config.postgres.configured) {
      throw new Error(
        "DATABASE_URL is not configured. PostgreSQL foundation is present, but this app is still running on legacy persistence."
      );
    }

    throw new Error(
      "PostgreSQL query execution is not wired yet. Add the SQL driver and repository implementation before using the new database as a runtime dependency."
    );
  }
}

export function createDatabaseConnection(
  config: DatabaseFoundationConfig = getDatabaseFoundationConfig()
): DatabaseConnection {
  return new PostgresFoundationConnection(config);
}
