import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const result = { diagnostic_only: true, workspace_matches_cwd: process.env.ORVIA_WORKSPACE_ROOT === process.cwd(), stages: [] };
try {
  const { vendorSigningKey, vendorKeyPath } = await import('../../scripts/credentials.ts');
  for (const kind of ['release','licence','audit']) {
    try { vendorSigningKey(kind); result.stages.push({ stage: kind, exists: existsSync(vendorKeyPath(kind)), valid: true }); }
    catch(error) { result.stages.push({ stage: kind, exists: existsSync(vendorKeyPath(kind)), valid: false, error_class: error?.name === 'Error' ? 'Error' : 'OTHER' }); }
  }
  const { loadProfile } = await import('../../shared/testing/src/config.ts');
  try { const profile=loadProfile(); result.stages.push({stage:'profile',valid:true,worker_key_exists:existsSync(resolve(profile.directory,'worker/signing-key.pem'))}); }
  catch {result.stages.push({stage:'profile',valid:false});}
} catch { result.stages.push({stage:'imports',valid:false}); }
console.log(JSON.stringify(result));
