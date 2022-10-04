import { DynamicModule, Module, Type } from '@nestjs/common';
import { getTransactionManagerName } from '@leocode/nest-tx-core';
import { DataSource } from 'typeorm';
import { DefaultOptions, TypeORMTransactionManager } from './TypeORMTransactionManager';

export interface TypeORMTransactionManagerModuleOptions {
  name?: string;
  getDataSourceToken: () => string | Function | Type<DataSource>;
  defaults?: DefaultOptions,
}

@Module({})
export class TypeORMTransactionManagerModule {
  public static forRoot(options: TypeORMTransactionManagerModuleOptions): DynamicModule {
    const defaultOptions = {
      ...options.defaults,
    };

    const providers = [{
      provide: getTransactionManagerName(options.name),
      useFactory: (dataSource: DataSource) => {
        return new TypeORMTransactionManager(
          dataSource,
          defaultOptions,
        )
      },
      inject: [options.getDataSourceToken()],
    }];

    return {
      module: TypeORMTransactionManagerModule,
      providers: providers,
      exports: providers,
      global: true,
    }
  }
}
