## Usage

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
  ) {
  }

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


@Module({
  providers: [
    CatsService,
  ]
})
class CatsModule {}

@Module({
  imports: [
    TypeORMTransactionManagerModule.forRoot(),
    CatsModule,
  ],
})
class AppModule {}
```
