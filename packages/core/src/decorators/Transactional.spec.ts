import { Test } from '@nestjs/testing';
import { Inject, Injectable } from '@nestjs/common';
import { setTimeout } from 'timers/promises';
import {
  getTransactionFromContext,
  NoopTransaction,
  NoopTransactionManagerModule,
  PropagationLevel,
  Transactional
} from '../';

describe('Transactional', () => {
  it('should reuse existing tx in child', async () => {
    // given
    @Injectable()
    class ChildService {
      @Transactional({
        propagation: PropagationLevel.Required,
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

        expect(tx).toBe(childTx);
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


  it('should create new tx in child despite active tx', async () => {
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

        expect(txPre).toBeInstanceOf(NoopTransaction)
        expect(txPost).toBeInstanceOf(NoopTransaction)
        expect(childTx).toBeInstanceOf(NoopTransaction)


        expect(txPre).toBe(txPost);
        expect(txPost).not.toBe(childTx);
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


  it('should not throw when transaction is active for mandatory level', async () => {
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

        expect(tx).toBeInstanceOf(NoopTransaction)
        expect(childTx).toBeInstanceOf(NoopTransaction)
        expect(tx).toBe(childTx);
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

  it('should correctly set `this`', async () => {
    // given
    let that: ParentService;

    @Injectable()
    class ParentService {
      constructor() {
        that = this;
      }

      @Transactional({
        propagation: PropagationLevel.Required,
      })
      public async testOperation() {
        expect(this).toBe(that);
      }
    }

    const moduleRef = await Test.createTestingModule({
      imports: [
        NoopTransactionManagerModule.forRoot(),
      ],
      providers: [ParentService],
    }).compile();

    const parentService = moduleRef.get(ParentService);

    await parentService.testOperation();
  });
})
