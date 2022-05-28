import {
  Connection,
  EntityManager,
  getConnection,
  QueryFailedError,
} from "@przemyslawwalczak/typeorm";
import {
  Operation,
  TransactionManager,
  TransactionOptions,
  TypeORMOptions,
} from "@przemyslawwalczak/nest-tx-core";
import { isTypeORMTransaction, TypeORMTransaction } from "./TypeORMTransaction";
import { PostgresDriver } from "typeorm/driver/postgres/PostgresDriver";
import { NotATypeORMTransactionError } from "./NotATypeORMTransactionError";

const isRetriableError = (error: any, connection: Connection): boolean => {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  // NOTE: Seems that the typescript doesn't agree on changing the type of err to QueryFailedError,
  // even if the logical operator for instanceof checkes clearly that if anything other than instanceof QueryFailedError,
  // returns false.

  // POSTGRESQL SERIALIZATION FAILURE
  if (
    connection.driver instanceof PostgresDriver &&
    error.driverError.code === "40001"
  ) {
    return true;
  }

  return false;
};

function errorWithStack(error: unknown, stack?: string) {
  if (error instanceof Error) {
    // TODO: Drop the stacktrace to the point of .withTransaction call location.
    // By looking for the first .withTransaction in the stacktrace (in top to bottom direction).
    // TODO: Check if portion of the stack we are replacing to is the current stack.

    error.stack = stack;
  }

  return error;
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

    // const runInTransaction = async (manager: EntityManager) => {
    //   return await fn(new TypeORMTransaction(manager));
    // };

    let retries = 0;

    // NOTE: Wouldn't be better to split this function to recursive asynchronous function called on timeout?
    // The above would require storing the promise resolve and reject for later return to the chain.
    while (true) {
      try {
        if (isolationLevel) {
          return await connection.transaction(
            isolationLevel,
            async function Transaction(manager: EntityManager) {
              return await fn(new TypeORMTransaction(manager));
            }
          );
        }

        if (options?.activeTransaction) {
          return await fn(options.activeTransaction);
        }

        return await connection.transaction(async function Transaction(
          manager: EntityManager
        ) {
          return await fn(new TypeORMTransaction(manager));
        });
      } catch (err: unknown) {
        if (isRetriableError(err, connection) && retries <= maxRetries) {
          retries += 1;
          continue;
        }

        throw errorWithStack(err, stack);
      }
    }
  }
}
