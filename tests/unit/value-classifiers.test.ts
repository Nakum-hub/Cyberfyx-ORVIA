import test from 'node:test';
import assert from 'node:assert/strict';
import { countColumn, decide, luhnValid, matches, verhoeffValid } from '../../connectors/src/discovery/classifiers.ts';
import { exposureFindings } from '../../backend/domain/src/discovery/classification.ts';

// Synthetic values only. The valid Aadhaar-shaped number below is a published
// Verhoeff test vector with a leading digit in range, not a real identifier.
test('an Aadhaar-shaped number is classified only when its Verhoeff check digit holds', () => {
  assert.equal(verhoeffValid('2363'), true);
  assert.equal(verhoeffValid('2364'), false);
  const valid = '234123412346';
  assert.equal(verhoeffValid(valid), true);
  assert.deepEqual(matches(valid), ['AADHAAR']);
  assert.deepEqual(matches('234123412347'), []);
  assert.deepEqual(matches('123412341234'), [], 'a leading 0 or 1 is never an Aadhaar number');
});

test('a card-shaped number is classified only when its Luhn check digit holds', () => {
  assert.equal(luhnValid('4111111111111111'), true);
  assert.equal(luhnValid('4111111111111112'), false);
  assert.deepEqual(matches('4111 1111 1111 1111'), ['PAYMENT_CARD']);
  assert.deepEqual(matches('4111111111111112'), []);
});

test('shape rules separate identifiers that look alike', () => {
  assert.deepEqual(matches('ABCPE1234F'), ['PAN']);
  assert.deepEqual(matches('ABCXE1234F'), [], 'the fourth character of a PAN names a holder type');
  assert.deepEqual(matches('HDFC0001234'), ['IFSC']);
  assert.deepEqual(matches('+91 98765 43210'), ['PHONE_IN']);
  assert.deepEqual(matches('5876543210'), [], 'an Indian mobile number starts with 6 to 9');
  assert.deepEqual(matches('person@example.invalid'), ['EMAIL']);
  assert.deepEqual(matches('192.168.10.25'), ['IPV4']);
  assert.deepEqual(matches('300.1.1.1'), []);
  assert.deepEqual(matches('2026-09-26'), []);
});

test('a column is classified from the share of values that match, and free text is not', () => {
  const emails = decide(countColumn('contact_email', ['a@x.example', 'b@x.example', 'c@x.example', 'd@x.example', null, '']));
  assert.deepEqual([emails.category, emails.confidence, emails.non_empty, emails.share], ['EMAIL', 'CONFIRMED', 4, 1]);
  const notes = decide(countColumn('notes', ['call back', 'wrote to a@x.example', 'no answer', 'left a message', 'resolved']));
  assert.deepEqual([notes.category, notes.confidence], [null, 'NONE'], 'one address in five notes does not make the column an email column');
  const mixed = decide(countColumn('mixed', ['a@x.example', 'b@x.example', 'nothing', 'none']));
  assert.deepEqual([mixed.category, mixed.confidence], ['EMAIL', 'POSSIBLE']);
  const empty = decide(countColumn('blank', [null, null]));
  assert.deepEqual([empty.category, empty.confidence, empty.share], [null, 'NONE', 0]);
});

test('exposure findings name who can read confirmed sensitive columns, and only those', () => {
  const columns = [decide(countColumn('aadhaar', ['234123412346'])), decide(countColumn('city', ['Pune']))];
  const findings = exposureFindings(columns, [
    { grantee: 'PUBLIC', privileges: ['SELECT'], columns: null },
    { grantee: 'app_writer', privileges: ['SELECT', 'UPDATE'], columns: null },
    { grantee: 'reporting', privileges: ['SELECT'], columns: ['city'] },
    { grantee: 'orvia_target_observer', privileges: ['SELECT'], columns: null },
    { grantee: 'owner_role', privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], columns: null },
  ], 'owner_role');
  assert.deepEqual(findings.map(f => [f.kind, f.severity, f.grantee]), [
    ['PUBLIC_CAN_READ', 'HIGH', 'PUBLIC'], ['READ_WRITE_ROLE_CAN_READ', 'MEDIUM', 'app_writer'], ['ORVIA_OBSERVER', 'INFO', 'orvia_target_observer'], ['OWNER', 'INFO', 'owner_role'],
  ]);
  assert.ok(!findings.some(f => f.grantee === 'reporting'), 'a column grant on an unclassified column is not an exposure');
  assert.deepEqual(exposureFindings([decide(countColumn('city', ['Pune']))], [{ grantee: 'PUBLIC', privileges: ['SELECT'], columns: null }], null), [], 'no sensitive column, no finding');
});
