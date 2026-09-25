import test from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import type { RuntimeConfig } from '../../backend/auth/src/config.ts';
import type { Authority } from '../../database/customer/src/runtime.ts';
import { syntheticTargetObserver } from '../../backend/api/src/synthetic/target-observer.ts';

const actor: Authority = {
  actor_id: 'observer', actor_domain: 'MACHINE', role: 'observer', capabilities: [],
  scope: { tenant_id: 'tenant', legal_entity_id: 'entity', environment_id: 'environment' },
  expires_at: '2099-01-01T00:00:00.000Z',
};
const binding = {
  resource_id: 'resource', principal_id: 'principal', purpose_id: 'purpose',
  system_id: 'system', subject_reference: 'subject', connector: 'SYNTHETIC_CRM',
};

function observerPool(rows: unknown[]) {
  const queries: { text: string; values?: unknown[] }[] = [];
  const client = {
    query: async (text: string, values?: unknown[]) => {
      queries.push({ text, values });
      if (text.includes('FROM pg_roles')) return { rows: [{ name: 'orvia_target_observer', rolsuper: false, rolbypassrls: false }] };
      if (text.includes('FROM marketing_memberships')) return { rows };
      return { rows: [] };
    },
    release: () => undefined,
  };
  return { pool: { connect: async () => client } as unknown as pg.Pool, queries };
}

test('unsupported target connector fails closed before a target read', async () => {
  const { pool, queries } = observerPool([{ generation: 1, marketing_restricted: false, quarantined: false }]);
  await assert.rejects(syntheticTargetObserver({} as RuntimeConfig, pool, actor, { ...binding, connector: 'LEGACY_MANUAL' }), /Unsupported target observer/);
  assert.equal(queries.length, 0);
});

test('synthetic observation binds every target selector and does not invent a missing target', async () => {
  const { pool, queries } = observerPool([]);
  const result = await syntheticTargetObserver({} as RuntimeConfig, pool, actor, binding);
  assert.equal(result, undefined);
  assert.deepEqual(queries.find(q => q.text.includes('FROM marketing_memberships'))?.values,
    ['tenant', 'entity', 'environment', 'resource', 'principal', 'purpose', 'system', 'subject']);
});
