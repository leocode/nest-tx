import { DynamicModule, Module } from '@nestjs/common';
import { getTransactionManagerName } from '@leocode/nest-tx-core';
import { DefaultOptions, TypeORMTransactionManager } from './TypeORMTransactionManager';

type InjectionToken = string;

export interface TypeORMTransactionManagerModuleOptions {
  connectionName?: string;
  name?: InjectionToken;
  defaults?: DefaultOptions,
}

@Module({})
export class TypeORMTransactionManagerModule {
  public static forRoot(options: TypeORMTransactionManagerModuleOptions = {}): DynamicModule {
    const defaultOptions = {
      retries: 0,
      ...options.defaults,
    };

    const providers = [{
      provide: getTransactionManagerName(options.name),
      useFactory: () => {
        return new TypeORMTransactionManager(
          options.connectionName,
          defaultOptions,
        )
      }
    }];

    return {
      module: TypeORMTransactionManagerModule,
      providers: providers,
      exports: providers,
      global: true,
    }
  }
}
