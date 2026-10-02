import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as turn } from 'node:timers/promises';
import { createQueuedFetch } from '../../frontend/src/components/shared/read-queue.ts';

// Exact pre-fix queued implementation from api.ts, with fetch supplied by the
// controlled transport. R8_READ_QUEUE_BEFORE=1 runs the same assertions against it.
function beforeQueue(fetch: typeof globalThis.fetch): typeof globalThis.fetch {
  let gate: Promise<unknown> = Promise.resolve();
  return (input, init) => {
    const run = gate.then(
      () => fetch(input, { ...init, signal: init?.signal
        ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) }),
    );
    gate = run.then(() => undefined, () => undefined);
    return run;
  };
}
const factory = process.env.R8_READ_QUEUE_BEFORE === '1' ? beforeQueue : createQueuedFetch;
function fixture() {
  const calls: { input: string; signal: AbortSignal; resolve: (response: Response) => void; reject: (reason: unknown) => void }[] = [];
  const transport: typeof fetch = (input, init) => new Promise<Response>((resolve, reject) => {
    const signal = init!.signal!;
    calls.push({ input: String(input), signal, resolve, reject });
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
  return { calls, queued: factory(transport) };
}

test('queued cancellation rejects promptly, never dispatches and cannot overlap active transport', async () => {
  const { calls, queued } = fixture();
  const active = queued('/active');
  await turn();
  const controller = new AbortController();
  let canceled = false;
  const pending = queued('/canceled', { signal: controller.signal }).catch(error => { canceled = true; return error; });
  const live = queued('/live');
  controller.abort();
  await turn();
  try {
    assert.equal(canceled, true, 'Cancellation must reject while the earlier transport is still blocked');
    assert.deepEqual(calls.map(call => call.input), ['/active']);
  } finally {
    calls[0]!.resolve(new Response('active'));
    await active;
    await turn();
    for (const call of calls.slice(1)) call.resolve(new Response('remaining'));
    await Promise.all([pending, live]);
  }
  assert.deepEqual(calls.map(call => call.input), ['/active', '/live']);
});

test('stale abort cannot release a newer active request; transport rejection advances queue', async () => {
  const { calls, queued } = fixture();
  const old = new AbortController();
  const first = queued('/first', { signal: old.signal });
  await turn(); calls[0]!.resolve(new Response('first')); await first;
  const second = queued('/second').catch(error => error);
  await turn();
  const third = queued('/third');
  old.abort(); await turn();
  assert.deepEqual(calls.map(call => call.input), ['/first', '/second']);
  calls[1]!.reject(new Error('controlled transport failure')); await second; await turn();
  assert.deepEqual(calls.map(call => call.input), ['/first', '/second', '/third']);
  calls[2]!.resolve(new Response('third')); await third;
});

test('active cancellation keeps later requests gated until transport actually settles', async () => {
  const calls: string[] = [];
  let release!: (response: Response) => void;
  // Controlled delayed transport cleanup: caller abort alone is not completion.
  const queued = factory((input) => {
    calls.push(String(input));
    return calls.length === 1 ? new Promise<Response>(resolve => { release = resolve; }) : Promise.resolve(new Response('next'));
  });
  const controller = new AbortController();
  const active = queued('/active', { signal: controller.signal }).catch(error => error);
  await turn(); controller.abort();
  const next = queued('/next'); await turn();
  assert.deepEqual(calls, ['/active']);
  release(new Response('cleanup complete'));
  await Promise.all([active, next]);
  assert.deepEqual(calls, ['/active', '/next']);
});
