import { Knex } from 'knex';
import { Transaction } from '@leocode/nest-tx-core';
import { NotAKnexTransactionError } from './NotAKnexTransactionError';

export const isKnexTransaction = (tx: Transaction): tx is KnexTransaction => {
  return tx instanceof KnexTransaction;
};

export class KnexTransaction implements Transaction {
  constructor(public knexTransaction: Knex.Transaction) {
  }
}

export const getKnexTransactionFromTransaction = (
  tx: Transaction,
): Knex.Transaction => {
  if (!isKnexTransaction(tx)) {
    throw new NotAKnexTransactionError('Not a TypeORM transaction.');
  }

  return tx.knexTransaction;
};
