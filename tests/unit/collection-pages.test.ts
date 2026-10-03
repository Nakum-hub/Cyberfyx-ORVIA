import test from 'node:test';
import assert from 'node:assert/strict';
import { collectPages } from '../../frontend/src/components/shared/collection-pages.ts';

test('collection reaches records beyond page one with opaque cursors', async () => {
  const calls: (string | undefined)[] = [];
  const result = await collectPages(async cursor => {
    calls.push(cursor);
    return cursor ? { items: ['own record'], next_cursor: null } : { items: Array.from({ length: 100 }, (_, n) => String(n)), next_cursor: 'opaque:cursor' };
  });
  assert.equal(result.length, 101); assert.equal(result.at(-1), 'own record');
  assert.deepEqual(calls, [undefined, 'opaque:cursor']);
});
test('collection rejects a failed later page and repeating cursors', async () => {
  await assert.rejects(collectPages(async cursor => {
    if (cursor) throw new Error('later page denied');
    return { items: ['partial'], next_cursor: 'next' };
  }), /later page denied/);
  await assert.rejects(collectPages(async () => ({ items: [], next_cursor: 'same' })), /no partial list/);
});
