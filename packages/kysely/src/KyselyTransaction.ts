import * as Kysely from 'kysely';
import { NotAKyselyTransactionError } from './NotAKyselyTransactionError';
import { Transaction } from '@leocode/nest-tx-core';

declare module '@leocode/nest-tx-core' {
  interface Transaction {
    getKyselyTransaction: <T>() => Kysely.Transaction<T>;
  }
}

export const isKyselyTransaction = (tx: any): tx is KyselyTransaction => {
  return tx instanceof KyselyTransaction;
};

export class KyselyTransaction implements Transaction {
  constructor(public transaction: Kysely.Transaction<unknown>) {
  }

  getKyselyTransaction<T>(): Kysely.Transaction<T> {
    return getKyselyTransactionFromTransaction<T>(this);
  }
}

export const getKyselyTransactionFromTransaction = <T>(
  tx: Transaction,
): Kysely.Transaction<T> => {
  if (!isKyselyTransaction(tx)) {
    throw new NotAKyselyTransactionError('Not a Kysely transaction.');
  }

  return tx.transaction as Kysely.Transaction<T>;
};
