import { Test, TestingModule } from '@nestjs/testing';
import { getKnexConnectionToken, KnexModule } from 'nestjs-knex';
import {
  getTransactionFromContext,
  getTransactionManagerName,
  Transactional,
  TransactionManager
} from '@leocode/nest-tx-core';
import { KnexTransactionManagerModule } from './KnexTransactionManagerModule';
import { Knex } from 'knex';
import { readConfigVariable } from 'nest-tx-utils';
import { Inject, Injectable } from '@nestjs/common';
import CreateTableBuilder = Knex.CreateTableBuilder;

const TEST_TABLE = 'test';

interface TestEntity {
  id: number;
}

class CustomError extends Error {
}

@Injectable()
class ChildService {
  @Transactional()
  public async testOperation() {
    const knexTx = getTransactionFromContext().getKnexTransaction();

    return await knexTx.raw('select 1 + 1 as "sum"');
  }
}

@Injectable()
class ParentService {
  constructor(@Inject(ChildService) private childService: ChildService) {
  }

  @Transactional()
  public async testOperation() {
    return await this.childService.testOperation();
  }
}

describe('KnexTransactionManager', () => {
  let txManager: TransactionManager;
  let moduleRef: TestingModule;
  let knex: Knex;

  beforeAll(async () => {
    const port = await readConfigVariable('databasePort');

    moduleRef = await Test.createTestingModule({
      imports: [
        KnexModule.forRoot({
          config: {
            client: 'pg',
            useNullAsDefault: true,
            asyncStackTraces: true,
            connection: {
              host: 'localhost',
              port: parseInt(port, 10),
              user: 'postgres',
              password: 'secret',
              database: 'postgres',
            },
          },
        }),
        KnexTransactionManagerModule.forRoot({
          getConnectionToken: () => {
            return getKnexConnectionToken('');
          },
        }),
      ],
      providers: [ParentService, ChildService]
    }).compile()

    txManager = moduleRef.get<TransactionManager>(getTransactionManagerName());
    knex = moduleRef.get<Knex>(getKnexConnectionToken(''))
  });

  afterAll(async () => {
    await knex.destroy();
  })

  beforeEach(async () => {
    await knex.schema.dropTableIfExists(TEST_TABLE);
    await knex.schema.createTable(TEST_TABLE, (table: CreateTableBuilder) => {
      table.integer('id').primary().notNullable();
    })
  })

  it('should properly execute query in transaction', async () => {
    await txManager.withTransaction(async (tx) => {
      const knexTrx = tx.getKnexTransaction();

      const res = await knexTrx.raw('select 1 + 1 as "sum"');

      expect(knexTrx.isTransaction).toBeTruthy();
      expect(res.rows[0].sum).toBe(2);
    })
  })

  it('should propagate return value', async () => {
    // given
    const expectedReturnValue = 'my_return_value';

    // when
    const actualReturnValue = await txManager.withTransaction(async (tx) => {
      return expectedReturnValue;
    });

    // then
    expect(actualReturnValue).toBe(expectedReturnValue);
  })

  it('should commit transaction', async () => {
    // when
    await txManager.withTransaction(async (tx) => {
      const knexTrx = tx.getKnexTransaction();

      await knexTrx<TestEntity>(TEST_TABLE).insert({
        id: 1,
      });
    });

    // then
    const insertedRows = await knex<TestEntity>(TEST_TABLE).select();

    expect(insertedRows).toEqual([{
      id: 1,
    }]);
  });

  it('should rollback transaction when error is thrown', async () => {
    // when
    const txPromise = txManager.withTransaction(async (tx) => {
      const knexTrx = tx.getKnexTransaction();

      const result = await knexTrx<TestEntity>(TEST_TABLE).insert({
        id: 1,
      });

      // `any`, because Knex types are not correct here
      expect((result as any).rowCount).toBe(1);

      throw new CustomError();
    });

    // then
    await expect(txPromise).rejects.toBeInstanceOf(CustomError);

    const rows = await knex<TestEntity>(TEST_TABLE).select();
    expect(rows).toHaveLength(0);
  });

  describe('Transactional', () => {
    it('should reuse existing tx in a child method', async () => {
      const parentService = moduleRef.get(ParentService);

      const result = await parentService.testOperation();

      expect(result.rows[0].sum).toBe(2);
    });
  })
});
