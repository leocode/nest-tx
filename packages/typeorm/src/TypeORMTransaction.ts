import { EntityManager } from 'typeorm';
import { Transaction } from '@leocode/nest-tx-core';

const isTypeORMTransaction = (tx: Transaction): tx is TypeORMTransaction => {
  return tx instanceof TypeORMTransaction;
};

export class TypeORMTransaction implements Transaction {
  constructor(public manager: EntityManager) {}

  async commit(): Promise<void> {
    // noop for this implementation
  }

  async rollback(): Promise<void> {
    // noop for this implementation
  }
}

export const getEntityManagerFromTypeORMTransaction = (
  tx: Transaction,
): EntityManager => {
  if (!isTypeORMTransaction(tx)) {
    throw new Error('Not a TypeORM transaction.');
  }

  return tx.manager;
};
