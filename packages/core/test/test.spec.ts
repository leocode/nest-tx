import uvu from 'uvu';
import assert from 'uvu/assert';
import { Test } from '@nestjs/testing';
import { Injectable } from '@nestjs/common';

import {
  getTransactionManagerName,
  InjectTransactionManager,
  NoopTransaction,
  NoopTransactionManagerModule,
  TransactionManager
} from '../src';

const noopSuite = uvu.suite('NoopTransactionManagerModule');

noopSuite('should call callback with correct transaction', async () => {
  // given
  const moduleRef = await Test.createTestingModule({
    imports: [
      NoopTransactionManagerModule.forRoot(),
    ],
    providers: [{
      provide: 'testOperation',
      useFactory: (transactionManager: TransactionManager) =>
        () => transactionManager.withTransaction(async (tx) => tx),
      inject: [getTransactionManagerName()],
    }],
  }).compile();

  const testOperation = moduleRef.get('testOperation');

  // when
  const tx = await testOperation();

  // then
  assert.instance(tx, NoopTransaction);
});

noopSuite('should create separate modules when registered with different name', async () => {
  // given
  const MANAGER_A_NAME = 'managerA';
  const MANAGER_B_NAME = 'managerB';
  const moduleRef = await Test.createTestingModule({
    imports: [
      NoopTransactionManagerModule.forRoot({
        name: MANAGER_A_NAME,
      }),
      NoopTransactionManagerModule.forRoot({
        name: MANAGER_B_NAME,
      }),
    ],
    providers: [],
  }).compile();

  const managerA = moduleRef.get(getTransactionManagerName(MANAGER_A_NAME));
  const managerB = moduleRef.get(getTransactionManagerName(MANAGER_B_NAME));

  // then
  assert.is.not(managerA, managerB);
});

noopSuite('should call callback with correct transaction when injected with decorator', async () => {
  // given
  @Injectable()
  class TestService {
    constructor(@InjectTransactionManager() private txManager: TransactionManager) {
    }

    public testOperation() {
      return this.txManager.withTransaction(async tx => tx);
    }
  }

  const moduleRef = await Test.createTestingModule({
    imports: [
      NoopTransactionManagerModule.forRoot(),
    ],
    providers: [TestService],
  }).compile();

  const testService = moduleRef.get(TestService);

  // when
  const tx = await testService.testOperation();

  // then
  assert.instance(tx, NoopTransaction);
});

noopSuite.run();
