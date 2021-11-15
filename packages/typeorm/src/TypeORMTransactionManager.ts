import { Connection, EntityManager, QueryFailedError } from 'typeorm';
import { Operation, TransactionManager, TransactionOptions, TypeORMOptions } from '@leocode/nest-tx-core';
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

export class TypeORMTransactionManager implements TransactionManager {
  constructor(
    private readonly connection: Connection,
    private readonly defaultOptions: TypeORMOptions,
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

      let retries = 0;
      const maxRetries = options?.typeorm?.retries ?? this.defaultOptions.retries ?? 0;

      while (true) {
        try {
          if (isolationLevel) {
            return await this.connection.transaction(isolationLevel, runInTransaction);
          } else {
            return await this.connection.transaction(runInTransaction);
          }
        } catch (err: unknown) {
          if (isRetriableError(err, this.connection) && retries <= maxRetries) {
            retries += 1;
          } else {
            throw err;
          }
        }
      }
    }
  }
}
