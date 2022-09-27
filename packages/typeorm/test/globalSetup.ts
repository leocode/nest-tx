import { GenericContainer } from 'testcontainers';
import { saveConfigVariable } from 'nest-tx-utils';

async function spawnDatabase() {
  return new GenericContainer('postgres:14')
    .withEnv('POSTGRES_USER', 'postgres')
    .withEnv('POSTGRES_DB', 'postgres')
    .withEnv('POSTGRES_PASSWORD', 'secret')
    .withExposedPorts(5432)
    .withTmpFs({ '/temp_pgdata': 'rw,noexec,nosuid,size=65536k' })
    .start();
}

async function setupDatabase(): Promise<void> {
  const container = await spawnDatabase();

  await saveConfigVariable('databasePort', container.getMappedPort(5432).toString())
}

module.exports = setupDatabase;
