import { Operation, SQLIsolationLevel, TransactionManager, TransactionOptions, } from '@leocode/nest-tx-core';
import { Kysely, IsolationLevel, Transaction } from 'kysely';
import { isKyselyTransaction, KyselyTransaction } from './KyselyTransaction';
import { NotAKyselyTransactionError } from './NotAKyselyTransactionError';

export interface DefaultOptions {
  isolationLevel?: SQLIsolationLevel;
}

declare module '@leocode/nest-tx-core' {
  interface TransactionOptions {
    kysely?: DefaultOptions;
  }
}

export class KyselyTransactionManager implements TransactionManager {
  constructor(
    private readonly kyselyInstance: Kysely<unknown>,
    private readonly defaultOptions: DefaultOptions,
  ) {
  }

  async withTransaction<T>(fn: Operation<T>, options?: TransactionOptions): Promise<T> {
    if (options?.activeTransaction) {
      if (!isKyselyTransaction(options.activeTransaction)) {
        throw new NotAKyselyTransactionError('You are using Kysely transaction manager - active transaction must be an instance of KyselyTransaction class.');
      } else {
        return await fn(options.activeTransaction);
      }
    } else {
      const isolationLevel = this.convertIsolationLevel(options?.kysely?.isolationLevel ?? this.defaultOptions.isolationLevel);

      const runInTransaction = async (tx: Transaction<unknown>) => {
        return await fn(new KyselyTransaction(tx));
      };

      if (isolationLevel) {
        return await this.kyselyInstance.transaction().setIsolationLevel(isolationLevel).execute(runInTransaction);
      } else {
        return await this.kyselyInstance.transaction().execute(runInTransaction);
      }
    }
  }

  private convertIsolationLevel(isolationLevel: SQLIsolationLevel | undefined): IsolationLevel | undefined {
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
