/**
 * The subset of expo-sqlite's SQLiteDatabase the storage layer uses.
 * Keeping it this small lets the unit tests run the same code against node:sqlite.
 */
export type SqlParam = string | number | null;

export interface Db {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SqlParam[]): Promise<unknown>;
  getAllAsync<T>(sql: string, params: SqlParam[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: SqlParam[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
