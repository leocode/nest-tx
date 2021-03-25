import { Transaction } from './Transaction';

export class NoopTransaction implements Transaction {
  async commit(): Promise<void> {
    // noop
  }
  async rollback(): Promise<void> {
    // noop
  }
}
