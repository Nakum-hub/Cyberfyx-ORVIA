import { runtimeConfig } from '../../../../packages/auth/src/config.ts';
import { createAuth } from '../../../../packages/auth/src/server.ts';
import { runtimePool } from '../../../../packages/db/src/runtime.ts';

function createRuntime() {
  const config = runtimeConfig();
  return { config, staff: createAuth(config, 'staff'), principal: createAuth(config, 'principal'), pool: runtimePool(config, 'orvia_app') };
}
let instance: ReturnType<typeof createRuntime> | undefined;
export function runtime() { return instance ??= createRuntime(); }
