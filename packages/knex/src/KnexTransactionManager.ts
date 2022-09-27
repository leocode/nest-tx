import { Operation, SQLIsolationLevel, TransactionManager, TransactionOptions, } from '@leocode/nest-tx-core';
import { isKnexTransaction, KnexTransaction } from './KnexTransaction';
import { NotAKnexTransactionError } from './NotAKnexTransactionError';
import { Knex } from 'knex';

export interface DefaultOptions {
  retries?: number;
  isolationLevel?: Knex.IsolationLevels;
}

export class KnexTransactionManager implements TransactionManager {
  constructor(
    private readonly knexInstance: Knex,
    private readonly defaultOptions: DefaultOptions,
  ) {
  }

  async withTransaction<T>(fn: Operation<T>, options?: TransactionOptions): Promise<T> {
    if (options?.activeTransaction) {
      if (!isKnexTransaction(options.activeTransaction)) {
        throw new NotAKnexTransactionError('You are using Knex transaction manager - active transaction must be an instance of KnexTransaction class.');
      } else {
        return await fn(options.activeTransaction);
      }
    } else {
      const isolationLevel = this.convertIsolationLevel(options?.knex?.isolationLevel) ?? this.defaultOptions.isolationLevel;

      const runInTransaction = async (tx: Knex.Transaction) => {
        return await fn(new KnexTransaction(tx));
      };

      if (isolationLevel) {
        return await this.knexInstance.transaction(runInTransaction, {
          isolationLevel,
          doNotRejectOnRollback: options?.knex?.doNotRejectOnRollback,
          userParams: options?.knex?.userParams,
        });
      } else {
        return await this.knexInstance.transaction(runInTransaction, {
          doNotRejectOnRollback: options?.knex?.doNotRejectOnRollback,
          userParams: options?.knex?.userParams,
        });
      }
    }
  }

  private convertIsolationLevel(isolationLevel: SQLIsolationLevel | undefined): Knex.IsolationLevels | undefined {
    switch (isolationLevel) {
      case 'READ UNCOMMITTED':
        return 'read uncommitted';
      case 'READ COMMITTED':
        return 'read committed';
      case 'REPEATABLE READ':
        return 'repeatable read';
      case 'SERIALIZABLE':
        return 'serializable';
      default:
        return undefined;
    }
  }
}
