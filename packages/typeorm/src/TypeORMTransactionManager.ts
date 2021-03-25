import { Connection } from 'typeorm';
import { Operation, TransactionManager } from '@leocode/nest-tx-core';
import { TypeORMTransaction } from './TypeORMTransaction';

export class TypeORMTransactionManager implements TransactionManager {
  constructor(private readonly connection: Connection) {}

  async withTransaction<T>(fn: Operation<T>): Promise<T> {
    return await this.connection.transaction(async (manager) => {
      return await fn(new TypeORMTransaction(manager));
    });
  }
}
