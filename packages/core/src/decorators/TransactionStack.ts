import { Transaction } from '../Transaction';

export class TransactionStack {
  private stack: Map<string, Transaction[]> = new Map();

  push(txManagerName: string, tx: Transaction) {
    this.ensureStack(txManagerName);

    this.stack.get(txManagerName)?.unshift(tx);
  }

  getLatest(txManagerName: string): Transaction | null {
    this.ensureStack(txManagerName);

    return this.stack.get(txManagerName)?.[0] || null;
  }

  pop(txManagerName: string) {
    this.ensureStack(txManagerName);
    this.stack.get(txManagerName)?.shift();
  }

  private ensureStack(txManagerName: string) {
    if (!this.stack.has(txManagerName)) {
      this.stack.set(txManagerName, []);
    }
  }
}
