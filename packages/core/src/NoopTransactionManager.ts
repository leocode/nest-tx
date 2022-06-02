import { TransactionManager, Operation } from "./TransactionManager";
import { NoopTransaction } from "./NoopTransaction";

export class NoopTransactionManager implements TransactionManager {
  async withTransaction<T>(fn: Operation<T>): Promise<T> {
    return await fn(new NoopTransaction());
  }
}
