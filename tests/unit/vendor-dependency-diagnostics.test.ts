import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { markVendorFailure, vendorFailureMetadata } from '../../backend/api/src/vendor/dependency-errors.ts';
import { vendorSafeRoute } from '../../backend/api/src/vendor/authority.ts';
import type { VendorRuntime } from '../../backend/api/src/vendor/runtime.ts';
const { APIError } = createRequire(new URL('../../backend/auth/package.json', import.meta.url))('better-auth/api');
const secret = 'SYNTHETIC_PRIVATE_MARKER';

test('installed APIError exposes only bounded status and exact session stage', () => {
  for (const [status, expected, stage] of [
    ['TOO_MANY_REQUESTS', 429, 'VENDOR_SESSION_READ'],
    ['SERVICE_UNAVAILABLE', 503, 'ACCOUNT_SESSION_READ'],
  ] as const) {
    const error = new APIError(status, { message: secret, code: secret });
    assert.deepEqual(vendorFailureMetadata(error), { dependency_status: expected });
    assert.throws(() => markVendorFailure(error, stage), caught => caught === error);
    const metadata = vendorFailureMetadata(error);
    assert.deepEqual(metadata, { dependency_status: expected, failure_stage: stage });
    assert.equal(JSON.stringify(metadata).includes(secret), false);
  }
});

test('only own bounded numeric status or known enum is admitted', () => {
  assert.deepEqual(vendorFailureMetadata({ statusCode: 429, status: 'SERVICE_UNAVAILABLE' }), { dependency_status: 429 });
  assert.deepEqual(vendorFailureMetadata({ statusCode: secret, status: 'TOO_MANY_REQUESTS' }), { dependency_status: 429 });
  for (const statusCode of [NaN, Infinity, -1, 99, 600, 429.5, '429']) {
    assert.deepEqual(vendorFailureMetadata({ statusCode, message: secret, body: { code: secret } }), {});
  }
  assert.deepEqual(vendorFailureMetadata({ status: secret }), {});
  assert.deepEqual(vendorFailureMetadata(Object.create({ statusCode: 429, status: 'TOO_MANY_REQUESTS' })), {});
  for (const value of [null, undefined, secret, 429]) assert.deepEqual(vendorFailureMetadata(value), {});
});

test('getters and hostile descriptor proxies cannot execute or replace the failure', () => {
  let getters = 0;
  const accessor = Object.defineProperties({}, {
    statusCode: { get() { getters++; throw new Error(secret); } },
    status: { get() { getters++; throw new Error(secret); } },
    message: { get() { getters++; throw new Error(secret); } },
    body: { get() { getters++; throw new Error(secret); } },
  });
  assert.deepEqual(vendorFailureMetadata(accessor), {});
  assert.equal(getters, 0);
  const hostile = new Proxy({}, { getOwnPropertyDescriptor() { throw new Error(secret); } });
  assert.deepEqual(vendorFailureMetadata(hostile), {});
  assert.throws(() => markVendorFailure(hostile, 'VENDOR_SESSION_READ'), caught => caught === hostile);
  assert.deepEqual(vendorFailureMetadata(hostile), {});
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  assert.deepEqual(vendorFailureMetadata(revoked.proxy), {});
  assert.throws(() => markVendorFailure(revoked.proxy, 'ACCOUNT_SESSION_READ'), caught => caught === revoked.proxy);
});

test('actual vendor boundary retains503 audit/envelope and logs bounded429 stage even with debug enabled', async () => {
  const error = new APIError('TOO_MANY_REQUESTS', { message: secret, code: secret });
  const queries: { sql: string; values: unknown[] }[] = [];
  // Runtime construction is lazy; this injected audit pool never opens a connection.
  const runtime = { pool: { query: async (sql: string, values: unknown[]) => {
    queries.push({ sql, values }); return { rows: [], rowCount: 1 };
  } } } as unknown as VendorRuntime;
  const lines: string[] = [], savedError = console.error, savedDebug = process.env.ORVIA_DEBUG_ERRORS;
  console.error = (value: unknown) => { lines.push(String(value)); };
  process.env.ORVIA_DEBUG_ERRORS = '1';
  let response: Response;
  try {
    response = await vendorSafeRoute(async () => markVendorFailure(error, 'VENDOR_SESSION_READ'), 'VENDOR', () => runtime);
  } finally {
    console.error = savedError;
    if (savedDebug === undefined) delete process.env.ORVIA_DEBUG_ERRORS; else process.env.ORVIA_DEBUG_ERRORS = savedDebug;
  }
  assert.equal(response.status, 503);
  const body = await response.json();
  assert.deepEqual(body.error, { code: 'SERVICE_UNAVAILABLE', message: 'Request could not be completed.', retry: 'AFTER_DELAY' });
  assert.match(body.request_id, /^[0-9a-f-]{36}$/);
  assert.equal(response.headers.get('X-Request-Id'), body.request_id);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(queries.length, 1);
  assert.equal(queries[0]!.sql, 'INSERT INTO vendor.request_audit (id, operation, status) VALUES ($1,$2,$3)');
  assert.deepEqual(queries[0]!.values, [body.request_id, 'VENDOR', 503]);
  assert.equal(lines.length, 1);
  const logged = JSON.parse(lines[0]!);
  assert.equal(logged.request_id, body.request_id);
  assert.equal(logged.operation, 'VENDOR');
  assert.equal(logged.dependency_status, 429);
  assert.equal(logged.failure_stage, 'VENDOR_SESSION_READ');
  assert.equal(logged.debug, undefined);
  assert.equal(lines[0]!.includes(secret), false);
  assert.equal(JSON.stringify(body).includes(secret), false);
});
