import { Transaction } from '../Transaction';
import { PropagationLevel } from '../types';
import { IllegalTransactionStateException } from '../IllegalTransactionStateException';
import { TransactionManager, TransactionOptions } from '../TransactionManager';

enum CommandType {
  New = 'new',
  Reuse = 'reuse',
}

type NewCommand = {
  type: CommandType.New;
}

type ReuseCommand = {
  type: CommandType.Reuse;
  tx: Transaction;
}

type Command = NewCommand | ReuseCommand;

const makeNewCommand = (): NewCommand => ({
  type: CommandType.New,
})

const makeReuseCommand = (tx: Transaction): ReuseCommand => ({
  type: CommandType.Reuse,
  tx,
})

const selectAction = (propagation: PropagationLevel, existingTx: Transaction | null): Command => {
  switch (propagation) {
    case PropagationLevel.Mandatory: {
      if (!existingTx) {
        throw new IllegalTransactionStateException('An active tx was expected in this context.');
      } else {
        return makeReuseCommand(existingTx);
      }
    }
    case PropagationLevel.Required:
      if (!existingTx) {
        return makeNewCommand();
      } else {
        return makeReuseCommand(existingTx);
      }
    case PropagationLevel.RequiresNew:
      return makeNewCommand();
    default:
      throw new Error(`Unknown propagation level: ${ propagation }`);
  }
}

type Params = {
  propagation: PropagationLevel;
  existingTx: Transaction | null;
  txManager: TransactionManager;
  options?: TransactionOptions;
}

export const makeTxWrapper = ({
  propagation,
  existingTx,
  txManager,
  options,
}: Params) => {
  const command = selectAction(propagation, existingTx);

  return (fn: (tx: Transaction) => Promise<any>) => async () => {
    if (command.type === CommandType.New) {
      return await txManager.withTransaction(async (newTx) => {
        return await fn(newTx);
      }, options);
    } else {
      return await fn(command.tx);
    }
  };
}
