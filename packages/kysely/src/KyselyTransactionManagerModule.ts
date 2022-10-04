import { DynamicModule, Module } from '@nestjs/common';
import { getTransactionManagerName } from '@leocode/nest-tx-core';
import { DefaultOptions, KyselyTransactionManager } from './KyselyTransactionManager';
import { Kysely } from 'kysely';

export interface KyselyTransactionManagerModuleOptions {
  getInstanceToken: () => string | Function;
  name?: string;
  defaults?: DefaultOptions,
}

@Module({})
export class KyselyTransactionManagerModule {
  public static forRoot(options: KyselyTransactionManagerModuleOptions): DynamicModule {
    const defaultOptions = {
      retries: 0,
      ...options.defaults,
    };

    const providers = [{
      provide: getTransactionManagerName(options.name),
      useFactory: (kyselyInstance: Kysely<unknown>) => {
        return new KyselyTransactionManager(
          kyselyInstance,
          defaultOptions,
        )
      },
      inject: [options.getInstanceToken()],
    }];

    return {
      module: KyselyTransactionManagerModule,
      providers: providers,
      exports: providers,
      global: true,
    }
  }
}
