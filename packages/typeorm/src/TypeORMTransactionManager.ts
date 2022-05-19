import {
  Connection,
  EntityManager,
  getConnection,
  QueryFailedError,
} from "typeorm";
import {
  Operation,
  TransactionManager,
  TransactionOptions,
  TypeORMOptions,
} from "@leocode/nest-tx-core";
import { isTypeORMTransaction, TypeORMTransaction } from "./TypeORMTransaction";
import { PostgresDriver } from "typeorm/driver/postgres/PostgresDriver";
import { NotATypeORMTransactionError } from "./NotATypeORMTransactionError";

const isRetriableError = (err: unknown, connection: Connection): boolean => {
  if (!(err instanceof QueryFailedError)) {
    return false;
  }

  // POSTGRESQL SERIALIZATION FAILURE
  if (
    connection.driver instanceof PostgresDriver &&
    err.driverError.code === "40001"
  ) {
    return true;
  }

  return false;
};

class ErrorWithStack extends Error {
  constructor(error: Error, stack?: string) {
    super(error.message);

    // TODO: Drop the stacktrace to the point of .withTransaction call location.
    // By looking for the first .withTransaction function mention in the stacktrace (top to bottom).
    this.stack = stack;
  }
}

export class TypeORMTransactionManager implements TransactionManager {
  constructor(
    private readonly connectionName: string | undefined,
    private readonly defaultOptions: TypeORMOptions
  ) {}

  async withTransaction<T>(
    fn: Operation<T>,
    options?: TransactionOptions
  ): Promise<T> {
    const connection = getConnection(this.connectionName);

    if (
      options?.activeTransaction &&
      !isTypeORMTransaction(options.activeTransaction)
    ) {
      throw new NotATypeORMTransactionError(
        "You are using TypeORM transaction manager - active transaction must be an instance of TypeORMTransaction class."
      );
    }

    const isolationLevel =
      options?.typeorm?.isolationLevel ?? this.defaultOptions.isolationLevel;
    const maxRetries =
      options?.typeorm?.retries ?? this.defaultOptions.retries ?? 0;

    const { stack } = new Error();

    const runInTransaction = async (manager: EntityManager) => {
      try {
        return await fn(new TypeORMTransaction(manager)).catch((e: Error) => {
          throw new ErrorWithStack(e, stack);
        });
      } catch (err: unknown | ErrorWithStack) {
        if (err instanceof ErrorWithStack) {
          throw err;
        }

        throw new ErrorWithStack(err as Error, stack);
      }
    };

    let retries = 0;

    // NOTE: Wouldn't be better to split this function to recursive asynchronous function called on timeout?
    // The above would require storing the promise resolve and reject for later chain.
    while (true) {
      try {
        if (isolationLevel) {
          return await connection.transaction(isolationLevel, runInTransaction);
        }

        if (options?.activeTransaction) {
          return await fn(options.activeTransaction);
        }

        return await connection.transaction(runInTransaction);
      } catch (err: unknown) {
        if (isRetriableError(err, connection) && retries <= maxRetries) {
          retries += 1;
          continue;
        }

        if (err instanceof ErrorWithStack) {
          throw err;
        }

        throw new ErrorWithStack(err as Error, stack);
      }
    }
  }
}
