import { Test, TestingModule } from '@nestjs/testing';
import { getTransactionManagerName, TransactionManager } from '@leocode/nest-tx-core';
import { KyselyTransactionManagerModule } from './KyselyTransactionManagerModule';
import { readConfigVariable } from 'nest-tx-utils';
import { Kysely, PostgresDialect, sql } from 'kysely';
import { Pool } from 'pg';
import { DynamicModule, Module } from '@nestjs/common';
import { KyselyTransactionManager } from './KyselyTransactionManager';

const TEST_TABLE = 'test';

class CustomError extends Error {}

interface TestTable {
  id: number;
}

interface Database {
  test: TestTable;
}

@Module({})
export class KyselyModule {
  public static forRoot(options: { port: number; name: string; }): DynamicModule {

    const providers = [{
      provide: options.name,
      useFactory: () => {
        return new Kysely<Database>({
          dialect: new PostgresDialect({
            pool: new Pool({
              host: 'localhost',
              port: options.port,
              user: 'postgres',
              password: 'secret',
              database: 'postgres',
            })
          })
        })
      },
    }];

    return {
      module: KyselyModule,
      providers: providers,
      exports: providers,
      global: true,
    }
  }
}

describe('KyselyTransactionManager', () => {
  let txManager: TransactionManager;
  let moduleRef: TestingModule;
  let kysely: Kysely<Database>;

  beforeAll(async () => {
    const port = await readConfigVariable('databasePort');

    moduleRef = await Test.createTestingModule({
      imports: [
        KyselyModule.forRoot({
          name: 'kysely',
          port: parseInt(port, 10),
        }),
        KyselyTransactionManagerModule.forRoot({
          getInstanceToken: () => {
            return 'kysely';
          },
        }),
      ],
    }).compile()

    txManager = moduleRef.get<TransactionManager>(getTransactionManagerName());
    kysely = moduleRef.get<Kysely<Database>>('kysely')
  });

  afterAll(async () => {
    await kysely.destroy();
  })

  beforeEach(async () => {
    await kysely.schema.dropTable(TEST_TABLE).ifExists().execute();
    await kysely.schema.createTable(TEST_TABLE).addColumn('id', 'integer', col => col.primaryKey()).execute();
  })

  it('should properly execute query in transaction', async () => {
    await txManager.withTransaction(async (tx) => {
      const kyselyTrx = tx.getKyselyTransaction<Database>();

      const res = await sql`select 1 + 1 as "sum"`.execute(kyselyTrx);

      expect(kyselyTrx.isTransaction).toBeTruthy();
      expect(res.rows).toEqual([{ sum: 2 }]);
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
      const kyselyTrx = tx.getKyselyTransaction<Database>();

      await kyselyTrx.insertInto('test').values({
        id: 1,
      }).execute();
    });

    // then
    const insertedRows = await kysely.selectFrom('test').selectAll().execute();

    expect(insertedRows).toEqual([{
      id: 1,
    }]);
  });

  it('should rollback transaction when error is thrown', async () => {
    // when
    const txPromise = txManager.withTransaction(async (tx) => {
      const kyselyTrx = tx.getKyselyTransaction<Database>();

      const inserterRows = await kyselyTrx.insertInto('test').values({
        id: 1,
      }).execute();

      expect(inserterRows.length).toBe(1);

      throw new CustomError();
    });

    // then
    await expect(txPromise).rejects.toBeInstanceOf(CustomError);

    const rows = await kysely.selectFrom('test').selectAll().execute();
    expect(rows).toHaveLength(0);
  });
});
