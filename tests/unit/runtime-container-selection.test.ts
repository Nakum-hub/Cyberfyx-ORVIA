import assert from 'node:assert/strict';
import test from 'node:test';
import { opaContainer } from '../../shared/testing/src/opa-container.ts';
import { postgresContainer } from '../../shared/testing/src/postgres-container.ts';

test('container overrides remain confined to the explicitly owned synthetic stack', () => {
  const savedOpa = process.env.ORVIA_TEST_OPA_CONTAINER;
  const savedPostgres = process.env.ORVIA_TEST_POSTGRES_CONTAINER;
  try {
    const local = { profile: 'codex-a00', compose_project: 'orvia-codex-a00' };
    delete process.env.ORVIA_TEST_OPA_CONTAINER; delete process.env.ORVIA_TEST_POSTGRES_CONTAINER;
    assert.equal(opaContainer(local), 'orvia-codex-a00-opa-1');
    assert.equal(postgresContainer(local), 'orvia-codex-a00-postgres-1');
    process.env.ORVIA_TEST_OPA_CONTAINER = 'orvia-round9-opa';
    process.env.ORVIA_TEST_POSTGRES_CONTAINER = 'orvia-qualification-20260930-postgres';
    assert.equal(opaContainer(local), 'orvia-round9-opa');
    assert.equal(postgresContainer(local), 'orvia-qualification-20260930-postgres');
    assert.throws(() => opaContainer({ ...local, profile: 'rehearsal' }), /Unapproved/);
    assert.throws(() => postgresContainer({ ...local, profile: 'rehearsal' }), /Unapproved/);
    process.env.ORVIA_TEST_OPA_CONTAINER = 'another-owner-opa';
    process.env.ORVIA_TEST_POSTGRES_CONTAINER = 'another-owner-postgres';
    assert.throws(() => opaContainer(local), /Unapproved/);
    assert.throws(() => postgresContainer(local), /Unapproved/);
  } finally {
    if (savedOpa === undefined) delete process.env.ORVIA_TEST_OPA_CONTAINER; else process.env.ORVIA_TEST_OPA_CONTAINER = savedOpa;
    if (savedPostgres === undefined) delete process.env.ORVIA_TEST_POSTGRES_CONTAINER; else process.env.ORVIA_TEST_POSTGRES_CONTAINER = savedPostgres;
  }
});
