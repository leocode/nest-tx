import { DynamicModule, Module } from "@nestjs/common";
import { getTransactionManagerName } from "./TransactionManager";
import { NoopTransactionManager } from "./NoopTransactionManager";

export interface NoopTransactionManagerModuleOptions {
  name?: string;
}

@Module({})
export class NoopTransactionManagerModule {
  public static forRoot(
    options: NoopTransactionManagerModuleOptions = {}
  ): DynamicModule {
    const providers = [
      {
        provide: getTransactionManagerName(options.name),
        useFactory: () => {
          return new NoopTransactionManager();
        },
      },
    ];

    return {
      module: NoopTransactionManagerModule,
      providers: providers,
      exports: providers,
      global: true,
    };
  }
}
