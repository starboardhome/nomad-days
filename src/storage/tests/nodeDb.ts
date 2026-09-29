import { DatabaseSync } from 'node:sqlite';
import type { Db, SqlParam } from '../db';

/** An in-memory node:sqlite database behind the same Db interface as expo-sqlite */
export const nodeDb = (): Db & { raw: DatabaseSync } => {
  const raw = new DatabaseSync(':memory:');
  return {
    raw,
    execAsync: async (sql) => {
      raw.exec(sql);
    },
    runAsync: async (sql, params: SqlParam[]) => raw.prepare(sql).run(...params),
    getAllAsync: async <T>(sql: string, params: SqlParam[]) => raw.prepare(sql).all(...params) as T[],
    getFirstAsync: async <T>(sql: string, params: SqlParam[]) => (raw.prepare(sql).get(...params) as T) ?? null,
    withTransactionAsync: async (task) => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
};
