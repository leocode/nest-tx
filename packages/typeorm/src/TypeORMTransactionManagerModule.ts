import { DynamicModule, Module } from '@nestjs/common';
import { getTransactionManagerName } from '@leocode/nest-tx-core';
import { DefaultOptions, TypeORMTransactionManager } from './TypeORMTransactionManager';

export interface TypeORMTransactionManagerModuleOptions {
  connectionName?: string;
  defaults?: DefaultOptions,
}

@Module({})
export class TypeORMTransactionManagerModule {
  public static forRoot(options: TypeORMTransactionManagerModuleOptions = {}): DynamicModule {
    const defaultOptions = {
      ...options.defaults,
    };

    const providers = [{
      provide: getTransactionManagerName(options.connectionName),
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
