import { Inject } from '@nestjs/common'
import { getTransactionManagerName, TransactionManager, TransactionOptions } from '../TransactionManager';
import { AsyncLocalStorage } from 'async_hooks';
import { Transaction } from '../Transaction';
import { TransactionStack } from './TransactionStack';
import { PropagationLevel } from '../types';
import { makeTxWrapper } from './makeTxWrapper';
import { IllegalTransactionStateException } from '../IllegalTransactionStateException';

const asyncLocalStorage = new AsyncLocalStorage<TransactionStack>();

const getStore = () => {
  const maybeCurrentStore = asyncLocalStorage.getStore();
  const store = maybeCurrentStore ?? new TransactionStack();

  return {
    store,
    wasAlreadyInitialize: Boolean(maybeCurrentStore),
  };
}

export const Transactional = ({
  propagation = PropagationLevel.Required,
  managerName,
  options,
}: {
  managerName?: string;
  propagation?: PropagationLevel;
  options?: TransactionOptions;
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

    descriptor.value = async function (...args: unknown[]) {
      const txManager: TransactionManager = (this as any)[managerProp];
      const { store, wasAlreadyInitialize } = getStore();

      const existingTx = store.getLatest(txManagerName);

      const wrapWithTx = makeTxWrapper({
        options,
        txManager,
        existingTx,
        propagation,
      });

      const executeOriginalMethod = async (tx: Transaction) => {
        store.push(txManagerName, tx);

        const returnValue = await originalMethod.apply(this, args);

        store.pop(txManagerName);

        return returnValue;
      }

      const op = wrapWithTx(executeOriginalMethod);

      if (wasAlreadyInitialize) {
        return await op();
      } else {
        return await asyncLocalStorage.run(store, () => {
          return op();
        });
      }
    }

    return descriptor;
  }
};

export const tryGetTransactionFromContext = (name?: string) => {
  const txManagerName = getTransactionManagerName(name);
  const txStore = asyncLocalStorage.getStore();
  return txStore?.getLatest(txManagerName);
}

export const getTransactionFromContext = (name?: string) => {
  const tx = tryGetTransactionFromContext(name);

  if (!tx) {
    throw new IllegalTransactionStateException(`No active tx for manager "${ name }".`);
  }

  return tx;
}
