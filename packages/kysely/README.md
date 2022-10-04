# nest-tx-kysely

A Kysely connector for next-tx.

## Installation

Yarn:

```
yarn add next-tx-core nest-tx-kysely kysely
```

NPM:

```
npm install next-tx-core nest-tx-kysely kysely
```

## Usage

Initialize the module first. Here we are using custom module for creating Kysely instance:

```typescript
import { Module } from '@nestjs/common';
import { TransactionManager } from '@leocode/nest-tx-core';
import { KyselyTransactionManagerModule } from '@leocode/nest-tx-kysely';

@Module({})
export class KyselyModule {
  public static forRoot(options: { name: string; }): DynamicModule {
    const providers = [{
      provide: options.name,
      useFactory: () => {
        return new Kysely<unknown>({
          dialect: new PostgresDialect({
            pool: new Pool({
              host: 'localhost',
              port: 5432,
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

const KYSELY_INSTANCE_NAME = 'kysely__default';

@Module({
  imports: [
    KyselyModule.forRoot({
      name: KYSELY_INSTANCE_NAME,
    }),
    KyselyTransactionManagerModule.forRoot({
      // we need to provide an instance token
      // so the TX manager can get a Kysely instance from the DI container
      getInstanceToken: () => {
        return KYSELY_INSTANCE_NAME;
      },
    }),
  ],
})
class AppModule {}
```

Then you can use it in your services:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectTransactionManager, TransactionManager } from '@leocode/nest-tx-core';

interface TestTable {
  id: number;
}

interface Database {
  test: TestTable;
}

@Injectable()
class CatsService {
  constructor(
    @InjectTransactionManager() private readonly transactionManager: TransactionManager,
  ) {
  }

  public async save() {
    await this.transactionManager.withTransaction(async tx => {
      const kyselyTrx = tx.getKyselyTransaction<Database>();

      await kyselyTrx.selectFrom('test').selectAll().execute();
    });
  }
}
```
