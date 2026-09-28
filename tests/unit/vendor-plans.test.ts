import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify, randomUUID } from 'node:crypto';
import { canonicalJson } from '../../shared/contracts/src/crypto.ts';
import { CATALOGUE, findOption, validateCatalogue } from '../../backend/vendor/plans/catalogue.ts';
import { issueLicence } from '../../backend/vendor/licensing/issue.ts';

// The vendor catalogue decides member seats; the issued licence carries them,
// signed, for one installation. Owner and administrator are included, not counted.
const pair = generateKeyPairSync('ed25519');
const key = { key_id: randomUUID(), private: pair.privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64') };
const request = (option: string) => ({ installation_id: randomUUID(), option, entitlements: ['PRIVACY_GRAPH'], environments: 1, valid_from: new Date().toISOString(), valid_to: new Date(Date.now() + 86_400_000).toISOString() });

test('Tier 1 offers 5 and 10 members', () => {
  assert.deepEqual(CATALOGUE.find(t => t.code === 'tier_1')!.options.map(o => o.member_seats), [5, 10]);
  assert.doesNotThrow(() => validateCatalogue());
});
test('an issued licence carries the option\'s seats, is signed, and counts owner and administrator separately', () => {
  for (const [option, seats] of [['tier_1_members_5', 5], ['tier_1_members_10', 10]] as const) {
    const { licence, plan } = issueLicence(request(option), key);
    assert.equal(plan.member_seats, seats);
    assert.deepEqual(licence.claims.licensed_limits, { environments: 1, staff_members: seats + 2, member_seats: seats });
    assert.equal(licence.claims.edition, 'FOUNDATION');
    assert.equal(verify(null, Buffer.from(canonicalJson(licence.claims)), pair.publicKey, Buffer.from(licence.signature, 'base64url')), true);
    const tampered = { ...licence.claims, licensed_limits: { ...licence.claims.licensed_limits, member_seats: 500 } };
    assert.equal(verify(null, Buffer.from(canonicalJson(tampered)), pair.publicKey, Buffer.from(licence.signature, 'base64url')), false, 'raising seats breaks the signature');
  }
});
test('an option that does not exist, or a tier not yet defined, cannot be issued', () => {
  assert.throws(() => issueLicence(request('tier_1_members_50'), key), /No plan option/);
  assert.throws(() => findOption('tier_2'), /No plan option/);
});
test('a catalogue with an impossible seat count or duplicate code is refused', () => {
  assert.throws(() => validateCatalogue([{ code: 'tier_x', name: 'X', edition: 'FOUNDATION', options: [{ code: 'x_0', label: 'none', member_seats: 0 }] }]), /1 to 10000/);
  assert.throws(() => validateCatalogue([{ code: 'tier_x', name: 'X', edition: 'FOUNDATION', options: [{ code: 'tier_x', label: 'dup', member_seats: 5 }] }]), /duplicate/);
});
test('an unknown entitlement is refused rather than signed', () => {
  assert.throws(() => issueLicence({ ...request('tier_1_members_5'), entitlements: ['EVERYTHING'] }, key));
});
