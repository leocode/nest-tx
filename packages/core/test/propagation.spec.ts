import uvu from 'uvu';
import assert from 'uvu/assert';
import { Test } from '@nestjs/testing';
import { Inject, Injectable } from '@nestjs/common';
import { setTimeout } from 'timers/promises';

import {
  getTransactionFromContext,
  NoopTransaction,
  NoopTransactionManagerModule,
  PropagationLevel,
  Transactional
} from '../src';

const suite = uvu.suite('transaction propagation');

suite('should reuse existing tx in child', async () => {
  // given
  @Injectable()
  class ChildService {
    @Transactional({
      propagation: PropagationLevel.Required,
    })
    public async testOperation() {
      await setTimeout(1);
      throw new Error('Błąd')
      return getTransactionFromContext();
    }
  }

  @Injectable()
  class ParentService {
    constructor(@Inject(ChildService) private childService: ChildService) {
    }

    @Transactional({
      propagation: PropagationLevel.Required,
    })
    public async testOperation() {
      await setTimeout(1);
      const tx = getTransactionFromContext();

      const childTx = await this.childService.testOperation();

      assert.is(tx, childTx);
    }
  }

  const moduleRef = await Test.createTestingModule({
    imports: [
      NoopTransactionManagerModule.forRoot(),
    ],
    providers: [ParentService, ChildService],
  }).compile();

  const parentService = moduleRef.get(ParentService);

  await parentService.testOperation();
});


suite('should create new tx in child despite active tx', async () => {
  // given
  @Injectable()
  class ChildService {
    @Transactional({
      propagation: PropagationLevel.RequiresNew,
    })
    public async testOperation() {
      await setTimeout(1);
      return getTransactionFromContext();
    }
  }

  @Injectable()
  class ParentService {
    constructor(@Inject(ChildService) private childService: ChildService) {
    }

    @Transactional({
      propagation: PropagationLevel.Required,
    })
    public async testOperation() {
      await setTimeout(1);
      const txPre = getTransactionFromContext();
      const childTx = await this.childService.testOperation();
      const txPost = getTransactionFromContext();

      assert.instance(txPre, NoopTransaction);
      assert.instance(txPost, NoopTransaction);
      assert.instance(childTx, NoopTransaction);
      assert.is(txPre, txPost);
      assert.is.not(txPost, childTx);
    }
  }

  const moduleRef = await Test.createTestingModule({
    imports: [
      NoopTransactionManagerModule.forRoot(),
    ],
    providers: [ParentService, ChildService],
  }).compile();

  const parentService = moduleRef.get(ParentService);

  await parentService.testOperation();
});


suite('should not throw when transaction is active for mandatory level', async () => {
  // given
  @Injectable()
  class ChildService {
    @Transactional({
      propagation: PropagationLevel.Mandatory,
    })
    public async testOperation() {
      await setTimeout(1);
      return getTransactionFromContext();
    }
  }

  @Injectable()
  class ParentService {
    constructor(@Inject(ChildService) private childService: ChildService) {
    }

    @Transactional({
      propagation: PropagationLevel.Required,
    })
    public async testOperation() {
      await setTimeout(1);
      const tx = getTransactionFromContext();
      const childTx = await this.childService.testOperation();

      assert.instance(tx, NoopTransaction);
      assert.instance(childTx, NoopTransaction);
      assert.is(tx, childTx);
    }
  }

  const moduleRef = await Test.createTestingModule({
    imports: [
      NoopTransactionManagerModule.forRoot(),
    ],
    providers: [ParentService, ChildService],
  }).compile();

  const parentService = moduleRef.get(ParentService);

  await parentService.testOperation();
});

suite.run();
