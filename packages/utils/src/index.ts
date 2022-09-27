import { mkdir, readFile, writeFile } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export const saveConfigVariable = async (name: string, value: string): Promise<void> => {
  const variablesDir = path.join(
    os.tmpdir(),
    'jest_testcontainers_global_setup'
  );
  await mkdir(variablesDir, { recursive: true });
  await writeFile(
    path.join(variablesDir, name),
    value,
  );
}

export const readConfigVariable = async (name: string): Promise<string> => {
  const variablesDir = path.join(
    os.tmpdir(),
    'jest_testcontainers_global_setup'
  );
  const value = await readFile(path.join(variablesDir, name), 'utf8');
  if (value) {
    return value;
  } else {
    throw Error('dsada');
  }
}
