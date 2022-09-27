# nest-tx-knex

A Knex connector for next-tx.

## Installation

Yarn:

```
yarn add next-tx-core nest-tx-knex
```

NPM:

```
npm install next-tx-core nest-tx-knex
```

## Usage

Initialize the module first. Here we are using `nestjs-knex` packed to initialize Knex connection:

```typescript
import { Module } from '@nestjs/common';
import { getKnexConnectionToken, KnexModule } from 'nestjs-knex';
import { TransactionManager } from '@leocode/nest-tx-core';
import { KnexTransactionManagerModule, getKnexTransactionFromTransaction } from '@leocode/nest-tx-knex';

@Module({
  imports: [
    KnexModule.forRoot({
      config: {
        client: 'pg',
        connection: {
          host: 'localhost',
          port: 5432,
          user: 'postgres',
          password: 'secret',
          database: 'postgres',
        },
      },
    }),
    KnexTransactionManagerModule.forRoot({
      // we need to provide a connection token
      // so the TX manager can get a Knex connection from the DI container
      getConnectionToken: () => {
        return getKnexConnectionToken('');
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
import { getKnexTransactionFromTransaction } from '@leocode/nest-tx-knex';

@Injectable()
class CatsService {
  constructor(
    @InjectTransactionManager() private readonly transactionManager: TransactionManager,
  ) {}

  public async save() {
    await this.transactionManager.withTransaction(async tx => {
      const knexTrx = getKnexTransactionFromTransaction(tx);

      await knexTrx.raw('select 1 + 1');
    });
  }
}
```
