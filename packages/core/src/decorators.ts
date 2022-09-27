import { Inject } from '@nestjs/common'
import { getTransactionManagerName } from './TransactionManager';

export const InjectTransactionManager = (name? : string) =>
  Inject(getTransactionManagerName(name))
