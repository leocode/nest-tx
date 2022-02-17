# nest-tx - database transaction manager for NestJS

[![lerna](https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg)](https://lerna.js.org/)

## Motivation

Transaction management is usually done in application services, which should not have knowledge of implementation details
like DB engine or DB access library (like TypeORM). This way you can change the underlying DB technology without modifying
business logic. `@leocode/nest-tx-core` provides an abstract way of managing transactions - it is not tied to any
particular database, driver or ORM. It can be used with many libraries and drivers by using adapters (like `@leocode/nest-tx-typeorm`). 

## Installation

`@leocode/nest-tx-core` must always be installed:

```
yarn add @leocode/nest-tx-core
```

Then you can install particular adapters (and its peer dependencies) for your application, for example:

```
yarn add @leocode/nest-tx-typeorm
```

## Usage

First, you need to register an adapter:

```typescript
import { Module } from '@nestjs/common';
import { TypeORMTransactionManagerModule } from '@leocode/nest-tx-typeorm';

@Module({
  imports: [
    TypeORMTransactionManagerModule.forRoot(),
  ],
})
export class AppModule {}

```

Then you can use

```typescript
import { Injectable } from '@nestjs/common';
import { InjectTransactionManager, TransactionManager } from '@leocode/nest-tx-core';
import { getEntityManagerFromTypeORMTransaction } from '@leocode/nest-tx-typeorm';

@Injectable()
class CatsService {
  constructor(
    @InjectTransactionManager() private transactionManager: TransactionManager,
  ) {}

  async save() {
    await this.transactionManager.withTransaction(async (tx) => {
      /**
       * NOTE: Usually you should write code like this in separate repository class -
       * it's written here for example brevity. 
       */
      const manager = getEntityManagerFromTypeORMTransaction(tx);

      await manager.query('SELECT * FROM "table"');
    });
  }
}
```
