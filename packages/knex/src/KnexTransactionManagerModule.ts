import { DynamicModule, Module } from '@nestjs/common';
import { getTransactionManagerName } from '@leocode/nest-tx-core';
import { DefaultOptions, KnexTransactionManager } from './KnexTransactionManager';
import { ModuleRef } from '@nestjs/core';
import { Knex } from 'knex';

type InjectionToken = string;

export interface KnexTransactionManagerModuleOptions {
  acquireConnection: (moduleRef: ModuleRef) => Knex;
  name?: InjectionToken;
  defaults?: DefaultOptions,
}

@Module({})
export class KnexTransactionManagerModule {
  public static forRoot(options: KnexTransactionManagerModuleOptions): DynamicModule {
    const defaultOptions = {
      retries: 0,
      ...options.defaults,
    };

    const providers = [{
      provide: getTransactionManagerName(options.name),
      useFactory: (moduleRef: ModuleRef) => {
        const knexInstance = options.acquireConnection(moduleRef);

        return new KnexTransactionManager(
          knexInstance,
          defaultOptions,
        )
      },
      inject: [ModuleRef],
    }];

    return {
      module: KnexTransactionManagerModule,
      providers: providers,
      exports: providers,
      global: true,
    }
  }
}
