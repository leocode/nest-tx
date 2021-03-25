import { Transaction } from './Transaction';

export type Operation<T> = (tx: Transaction) => Promise<T>;

export const TRANSACTION_MANAGER = 'transaction_manager';

export interface TransactionManager {
  withTransaction<T>(fn: Operation<T>): Promise<T>;
}
