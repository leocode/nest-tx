import { Test, TestingModule } from '@nestjs/testing';
import {
  getTransactionFromContext,
  getTransactionManagerName,
  Transactional,
  TransactionManager
} from '@leocode/nest-tx-core';
import { TypeORMTransactionManagerModule } from './TypeORMTransactionManagerModule';
import { readConfigVariable } from 'nest-tx-utils';
import { getConnectionToken, TypeOrmModule } from '@nestjs/typeorm';
import { Connection, Entity, EntitySchema } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';

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

@Injectable()
class ChildService {
  @Transactional()
  public async testOperation() {
    const manager = getTransactionFromContext().getEntityManager();

    return await manager.query('select 1 + 1 as "sum"');
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

describe('TypeORMTransactionManager', () => {
  let txManager: TransactionManager;
  let moduleRef: TestingModule;
  let connection: Connection;

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
        TypeORMTransactionManagerModule.forRoot(),
      ],
      providers: [ParentService, ChildService],
    }).compile()

    txManager = moduleRef.get(getTransactionManagerName());
    connection = moduleRef.get(getConnectionToken())
  });

  afterAll(async () => {
    await moduleRef.close()
  })

  beforeEach(async () => {
    await connection.manager.query(`DROP TABLE IF EXISTS ${ TEST_TABLE }`)
    await connection.manager.query(
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
    const insertedRows = await connection.manager.find(TestEntity);

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

    const rows = await connection.manager.find(TestEntity);
    expect(rows).toHaveLength(0);
  });


  describe('Transactional', () => {
    it('should reuse existing tx in a child method', async () => {
      const parentService = moduleRef.get(ParentService);

      const result = await parentService.testOperation();

      expect(result[0]).toEqual({
        sum: 2,
      });
    });
  })
});
