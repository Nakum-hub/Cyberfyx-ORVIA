import test from 'node:test';
import assert from 'node:assert/strict';
import { renewingEnrollment } from '../../backend/auth/src/machine-profile.ts';

// Machine identities are short-lived and renewed only by the protected local
// setup, which rewrites the enrollment file. A running service must pick the
// renewal up without a restart, and must fail loudly, not quietly, once expired.
const at = (ms: number) => new Date(ms).toISOString();
test('a renewal written by the protected setup is picked up without a restart', () => {
  let clock = 0; let file = { identities: [{ expires_at: at(3_600_000) }] }; let reads = 0;
  const current = renewingEnrollment(() => { reads++; return file; }, () => clock);
  assert.equal(current().identities[0]!.expires_at, at(3_600_000));
  clock = 1_000_000; current(); assert.equal(reads, 1, 'no re-read while comfortably valid');
  file = { identities: [{ expires_at: at(7_200_000) }] };
  clock = 3_550_000; assert.equal(current().identities[0]!.expires_at, at(7_200_000), 're-read within a minute of expiry');
  assert.equal(reads, 2);
});
test('an identity still expired after re-reading fails loudly with a stable code', () => {
  let clock = 0; const file = { identities: [{ expires_at: at(1_000) }] };
  const current = renewingEnrollment(() => file, () => clock);
  clock = 2_000;
  assert.throws(() => current(), (e: Error & { code?: string }) => e.code === 'MACHINE_ENROLLMENT_EXPIRED');
});
test('one expired identity among several is not silently skipped', () => {
  const clock = 10_000; const file = { identities: [{ expires_at: at(1_000_000) }, { expires_at: at(5_000) }] };
  const current = renewingEnrollment(() => file, () => clock);
  assert.throws(() => current(), /renew through protected local setup/);
});
