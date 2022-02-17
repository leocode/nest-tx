import { Connection, EntityManager, getConnection, QueryFailedError } from 'typeorm';
import { Operation, SQLIsolationLevel, TransactionManager, TransactionOptions } from '@leocode/nest-tx-core';
import { isTypeORMTransaction, TypeORMTransaction } from './TypeORMTransaction';
import { PostgresDriver } from 'typeorm/driver/postgres/PostgresDriver';
import { NotATypeORMTransactionError } from './NotATypeORMTransactionError';

const isRetriableError = (err: unknown, connection: Connection): boolean => {
  if (!(err instanceof QueryFailedError)) {
    return false;
  }

  // POSTGRESQL SERIALIZATION FAILURE
  if (connection.driver instanceof PostgresDriver && err.driverError.code === '40001') {
    return true;
  }

  return false;
}

export interface DefaultOptions {
  retries?: number;
  isolationLevel?: SQLIsolationLevel;
}

export class TypeORMTransactionManager implements TransactionManager {
  constructor(
    private readonly connectionName: string | undefined,
    private readonly defaultOptions: DefaultOptions,
  ) {
  }

  async withTransaction<T>(fn: Operation<T>, options?: TransactionOptions): Promise<T> {
    const connection = getConnection(this.connectionName);
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

      let retries = 0;
      const maxRetries = options?.retries ?? this.defaultOptions.retries ?? 0;

      while (true) {
        try {
          if (isolationLevel) {
            return await connection.transaction(isolationLevel, runInTransaction);
          } else {
            return await connection.transaction(runInTransaction);
          }
        } catch (err: unknown) {
          if (isRetriableError(err, connection) && retries <= maxRetries) {
            retries += 1;
          } else {
            throw err;
          }
        }
      }
    }
  }
}
