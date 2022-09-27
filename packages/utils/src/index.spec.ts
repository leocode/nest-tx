import { readConfigVariable, saveConfigVariable } from './index';

describe('config', () => {
  it('should read previously saved variable', async () => {
    const variableName = 'my_var';
    const variableValue = 'my_value';

    await saveConfigVariable(variableName, variableValue);
    const actualValue = await readConfigVariable(variableName);

    expect(actualValue).toEqual(variableValue);
  })
})
