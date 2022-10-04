import { DataSource, EntityManager, getConnection } from 'typeorm';
import { Operation, SQLIsolationLevel, TransactionManager, TransactionOptions } from '@leocode/nest-tx-core';
import { isTypeORMTransaction, TypeORMTransaction } from './TypeORMTransaction';
import { NotATypeORMTransactionError } from './NotATypeORMTransactionError';

export interface DefaultOptions {
  isolationLevel?: SQLIsolationLevel;
}

export class TypeORMTransactionManager implements TransactionManager {
  constructor(
    private readonly dataSource: DataSource,
    private readonly defaultOptions: DefaultOptions,
  ) {
  }

  async withTransaction<T>(fn: Operation<T>, options?: TransactionOptions): Promise<T> {
    if (options?.activeTransaction) {
      if (!isTypeORMTransaction(options.activeTransaction)) {
        throw new NotATypeORMTransactionError('You are using TypeORM transaction manager - active transaction must be an instance of TypeORMTransaction class.');
      } else {
        return await fn(options.activeTransaction);
      }
    } else {
      const isolationLevel = options?.typeorm?.isolationLevel ?? this.defaultOptions.isolationLevel;

      const runInTransaction = async (manager: EntityManager) => {
        return await fn(new TypeORMTransaction(manager));
      };

      if (isolationLevel) {
        return await this.dataSource.transaction(isolationLevel, runInTransaction);
      } else {
        return await this.dataSource.transaction(runInTransaction);
      }
    }
  }
}
