import { Test, TestingModule } from '@nestjs/testing';
import { getTransactionManagerName, TransactionManager } from '@leocode/nest-tx-core';
import { TypeORMTransactionManagerModule } from './TypeORMTransactionManagerModule';
import { readConfigVariable } from 'nest-tx-utils';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, Entity, EntitySchema } from 'typeorm';

const TEST_TABLE = 'test';

@Entity()
class TestEntity {
  id!: number;
}

const TestEntitySchema = new EntitySchema<TestEntity>({
  name: 'TestEntity',
  tableName: TEST_TABLE,
  target: TestEntity,
  columns: {
    id: {
      type: Number,
      primary: true,
    },
  },
});


class CustomError extends Error {
}

describe('TypeORMTransactionManager', () => {
  let txManager: TransactionManager;
  let moduleRef: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    const port = await readConfigVariable('databasePort');

    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: parseInt(port, 10),
          username: 'postgres',
          password: 'secret',
          database: 'postgres',
          entities: [TestEntitySchema],
        }),
        TypeORMTransactionManagerModule.forRoot({
          getDataSourceToken: () => {
            return getDataSourceToken();
          },
        }),
      ]
    }).compile()

    txManager = moduleRef.get(getTransactionManagerName());
    dataSource = moduleRef.get(getDataSourceToken())
  });

  afterAll(async () => {
    await moduleRef.close()
  })

  beforeEach(async () => {
    await dataSource.manager.query(`DROP TABLE IF EXISTS ${ TEST_TABLE }`)
    await dataSource.manager.query(
      `CREATE TABLE ${ TEST_TABLE }
       (
           id int primary key
       )`
    )
  })

  it('should properly execute query in transaction', async () => {
    await txManager.withTransaction(async (tx) => {
      const manager = tx.getEntityManager();

      const result = await manager.query('select 1 + 1 as "sum"');

      expect(result[0]).toEqual({ sum: 2 });
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
      const manager = tx.getEntityManager();

      await manager.insert(TestEntity, {
        id: 1,
      });
    });

    // then
    const insertedRows = await dataSource.manager.find(TestEntity);

    expect(insertedRows).toEqual([{
      id: 1,
    }]);
  });

  it('should rollback transaction when error is thrown', async () => {
    // when
    const txPromise = txManager.withTransaction(async (tx) => {
      const manager = tx.getEntityManager();

      const result = await manager.insert(TestEntity, {
        id: 1,
      });

      expect(result.identifiers).toEqual([{
        id: 1,
      }]);

      throw new CustomError();
    });

    // then
    await expect(txPromise).rejects.toBeInstanceOf(CustomError);

    const rows = await dataSource.manager.find(TestEntity);
    expect(rows).toHaveLength(0);
  });
});
