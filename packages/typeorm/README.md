# nest-tx-typeorm

A TypeORM connector for next-tx.

## Installation

Yarn:

```
yarn add next-tx-core nest-tx-typeorm
```

NPM:

```
npm install next-tx-core nest-tx-typeorm
```

## Usage

Initialize the module first. Here we are using `@nestjs/typeorm` packed to initialize Knex connection:

```typescript
import { Module } from '@nestjs/common';
import { getConnectionToken, TypeOrmModule } from '@nestjs/typeorm';
import { TransactionManager } from '@leocode/nest-tx-core';
import { TypeORMTransactionManagerModule } from '@leocode/nest-tx-typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'secret',
      database: 'postgres',
      entities: [TestEntitySchema],
    }),
    TypeORMTransactionManagerModule.forRoot(),
  ],
})
class AppModule {}
```

Then you can use it in your services:

```typescript

import { Injectable, Module } from '@nestjs/common';
import { InjectTransactionManager, TransactionManager } from '@leocode/nest-tx-core';
import {
  getEntityManagerFromTypeORMTransaction,
  TypeORMTransactionManagerModule
} from '@leocode/nest-tx-typeorm';

@Injectable()
class CatsService {
  constructor(
    @InjectTransactionManager() private readonly transactionManager: TransactionManager,
  ) {}

  public async save() {
    await this.transactionManager.withTransaction(async tx => {
      const manager = getEntityManagerFromTypeORMTransaction(tx);

      const qb = await manager
        .createQueryBuilder()
        .select('id')
        .from('cats')
        .getRawMany();
    });
  }
}
```

If you have multiple named TypeORM connections, you can provide an instance of the transaction manager for each of them:

```typescript
@Module({
  imports: [
    // default
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'secret',
      database: 'postgres',
      entities: [TestEntitySchema],
    }),
    // named 'secondConnection'
    TypeOrmModule.forRoot({
      name: 'secondConnection',
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'secret',
      database: 'postgres',
      entities: [TestEntitySchema],
    }),
    // tx manager for the default connection
    TypeORMTransactionManagerModule.forRoot(),
    // tx manager for the 'secondConnection' connection
    TypeORMTransactionManagerModule.forRoot({
      connectionName: 'secondConnection'
    }),
  ],
})
class AppModule {}
```

Then in the service, you need to use the connection name in the injection decorator:

```typescript
@Injectable()
class CatsService {
  constructor(
    @InjectTransactionManager('secondConnection') private readonly transactionManager: TransactionManager,
  ) {
  }
}
```
