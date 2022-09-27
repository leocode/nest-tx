import { Knex } from 'knex';
import { Transaction } from '@leocode/nest-tx-core';
import { NotAKnexTransactionError } from './NotAKnexTransactionError';

declare module '@leocode/nest-tx-core' {
  interface Transaction {
    getKnexTransaction: () => Knex.Transaction;
  }
}

export const isKnexTransaction = (tx: Transaction): tx is KnexTransaction => {
  return tx instanceof KnexTransaction;
};

export class KnexTransaction implements Transaction {
  constructor(public knexTransaction: Knex.Transaction) {}

  getKnexTransaction() {
    return getKnexTransactionFromTransaction(this);
  }
}

export const getKnexTransactionFromTransaction = (
  tx: Transaction,
): Knex.Transaction => {
  if (!isKnexTransaction(tx)) {
    throw new NotAKnexTransactionError('Not a Knex transaction.');
  }

  return tx.knexTransaction;
};
