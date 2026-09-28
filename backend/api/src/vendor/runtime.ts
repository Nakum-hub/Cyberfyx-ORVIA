import { runtimeConfig } from '../../../auth/src/config.ts';
import { createAuth } from '../../../auth/src/server.ts';
import { runtimePool } from '../../../../database/customer/src/runtime.ts';

/**
 * Runtime of the vendor's own VENDOR_SERVICE installation: the vendor database
 * as the unprivileged business role, the vendor staff identity store and the
 * client vendor-account identity store. A customer installation never creates
 * it (every vendor route is wrapped by onlyOn('VENDOR_SERVICE')).
 */
function createVendorRuntime() {
  const config = runtimeConfig();
  return { config, vendor: createAuth(config, 'vendor'), account: createAuth(config, 'account'), pool: runtimePool(config, 'orvia_vendor_app') };
}
let instance: ReturnType<typeof createVendorRuntime> | undefined;
export function vendorRuntime() { return instance ??= createVendorRuntime(); }
export type VendorRuntime = ReturnType<typeof createVendorRuntime>;
