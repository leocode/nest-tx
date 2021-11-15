import { Transaction } from './Transaction';

export type SQLIsolationLevel = 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

export interface TypeORMOptions {
  retries?: number;
  isolationLevel?: SQLIsolationLevel;
}

export type Operation<T> = (tx: Transaction) => Promise<T>;

export interface TransactionOptions {
  activeTransaction?: Transaction;
  typeorm?: TypeORMOptions;
}

const DEFAULT_TRANSACTION_MANAGER = 'default';

export const getTransactionManagerName = (name: string = DEFAULT_TRANSACTION_MANAGER) => `${ name }TransactionManager`;

export interface TransactionManager {
  withTransaction<T>(fn: Operation<T>, options?: TransactionOptions): Promise<T>;
}
