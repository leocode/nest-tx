import { Inject } from '@nestjs/common'
import { getTransactionManagerName, TransactionManager } from './TransactionManager';
import { AsyncLocalStorage } from 'async_hooks';
import { Transaction } from './Transaction';
import { IllegalTransactionStateException } from './IllegalTransactionStateException';

export const InjectTransactionManager = (name?: string) =>
  Inject(getTransactionManagerName(name))

export enum PropagationLevel {
  Required = 'required',
  Mandatory = 'mandatory',
  RequiresNew = 'requires_new',
}

const asyncLocalStorage = new AsyncLocalStorage<Map<string, Transaction[]>>();

type Command = {
  type: 'new';
} | {
  type: 'reuse';
  tx: Transaction;
}

export const Transactional = ({
  propagation = PropagationLevel.Required,
  managerName,
}: {
  managerName?: string;
  propagation?: PropagationLevel;
} = {}): MethodDecorator => {
  const txManagerName = getTransactionManagerName(managerName);
  const injectTransactionManager = Inject(txManagerName);
  const managerProp = `__txManager_${ txManagerName }`;

  return (
    target: Object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    injectTransactionManager(target, managerProp);
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any) {
      const txManager: TransactionManager = (this as any)[managerProp];
      const maybeCurrentStore = asyncLocalStorage.getStore();
      const hasStore = Boolean(maybeCurrentStore);
      const store = maybeCurrentStore ?? new Map([[txManagerName, []]])

      if (!store.has(txManagerName)) {
        store.set(txManagerName, []);
      }

      const existingTx = store.get(txManagerName)?.[0];

      const command = ((): Command => {
        switch (propagation) {
          case PropagationLevel.Mandatory: {
            if (!existingTx) throw new IllegalTransactionStateException('Active tx was expected in this context.');
            return {
              type: 'reuse',
              tx: existingTx,
            };
          }
          case PropagationLevel.Required:
            if (!existingTx) {
              return {
                type: 'new',
              };
            } else {
              return {
                type: 'reuse',
                tx: existingTx,
              };
            }
          case PropagationLevel.RequiresNew:
            return {
              type: 'new',
            }
          default:
            throw new Error(`Unknown propagation level: ${ propagation }`);
        }
      })()

      const operation = async (tx: Transaction) => {
        store.get(txManagerName)?.unshift(tx);

        const returnValue = await originalMethod.apply(this, args);

        store.get(txManagerName)?.shift();

        return returnValue;
      }

      const maybeWrapWithTX = (fn: (tx: Transaction) => Promise<any>) => async () => {
        if (command.type === 'new') {
          return await txManager.withTransaction(async (newTx) => {
            return await fn(newTx);
          });
        } else {
          return await fn(command.tx);
        }
      };

      const maybeWrapWithAsyncContext = async (fn: () => Promise<any>) => {
        if (hasStore) {
          return await fn();
        } else {
          return await asyncLocalStorage.run(store, () => {
            return fn();
          });
        }
      }

      return maybeWrapWithAsyncContext(maybeWrapWithTX(operation));
    }

    return descriptor;
  }
};

export const tryGetTransactionFromContext = (name?: string) => {
  const txManagerName = getTransactionManagerName(name);
  const txStore = asyncLocalStorage.getStore();
  return txStore?.get(txManagerName)?.[0];
}

export const getTransactionFromContext = (name?: string) => {
  const tx = tryGetTransactionFromContext(name);

  if (!tx) {
    throw new Error('No active ');
  }

  return tx;
}
