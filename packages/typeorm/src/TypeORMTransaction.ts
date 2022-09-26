import { EntityManager } from 'typeorm';
import { Transaction } from '@leocode/nest-tx-core';
import { NotATypeORMTransactionError } from './NotATypeORMTransactionError';

declare module '@leocode/nest-tx-core' {
  interface Transaction {
    getEntityManager: () => EntityManager;
  }
}

export const isTypeORMTransaction = (tx: Transaction): tx is TypeORMTransaction => {
  return tx instanceof TypeORMTransaction;
};

export class TypeORMTransaction implements Transaction {
  constructor(public manager: EntityManager) {}

  getEntityManager() {
    return getEntityManagerFromTypeORMTransaction(this);
  }
}

export const getEntityManagerFromTypeORMTransaction = (
  tx: Transaction,
): EntityManager => {
  if (!isTypeORMTransaction(tx)) {
    throw new NotATypeORMTransactionError('Not a TypeORM transaction.');
  }

  return tx.manager;
};
