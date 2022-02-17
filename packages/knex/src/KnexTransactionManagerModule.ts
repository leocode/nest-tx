import { DynamicModule, Module } from '@nestjs/common';
import { getTransactionManagerName } from '@leocode/nest-tx-core';
import { DefaultOptions, KnexTransactionManager } from './KnexTransactionManager';
import { Knex } from 'knex';

type InjectionToken = string;

export interface KnexTransactionManagerModuleOptions {
  getConnectionToken: () => InjectionToken;
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
      useFactory: (knexInstance: Knex) => {
        return new KnexTransactionManager(
          knexInstance,
          defaultOptions,
        )
      },
      inject: [options.getConnectionToken()],
    }];

    return {
      module: KnexTransactionManagerModule,
      providers: providers,
      exports: providers,
      global: true,
    }
  }
}
