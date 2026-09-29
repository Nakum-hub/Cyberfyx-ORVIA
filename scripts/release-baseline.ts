import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const MASTER = 'ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md';
const MASTER_HASH = 'c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b';
const EXPANSION = 'docs/engineering/V1_EXPANDED_BASELINE.md';
const REGISTER = 'tracking/v1-expansion.json';
const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

/** Product authority provenance, not implementation or release acceptance. */
export function releaseBaseline(read: (path: string) => Buffer = path => readFileSync(path)) {
  const master = read(MASTER);
  if (sha256(master) !== MASTER_HASH) throw new Error('Approved revision 1.4 master hash mismatch; packaging requires authority review.');
  const expansion = read(EXPANSION);
  const register = read(REGISTER);
  const metadata = JSON.parse(register.toString('utf8')) as { baseline?: unknown; baseline_revision?: unknown };
  if (metadata.baseline !== EXPANSION || metadata.baseline_revision !== 'E1' ||
      !/^Revision E1 — 25 September 2026\./m.test(expansion.toString('utf8'))) {
    throw new Error('Expanded product baseline and register disagree; review the approved scope before packaging.');
  }
  return {
    master: { path: MASTER, revision: '1.4', sha256: MASTER_HASH },
    expansion: { path: EXPANSION, revision: 'E1', sha256: sha256(expansion),
      register: { path: REGISTER, sha256: sha256(register) } },
  };
}
