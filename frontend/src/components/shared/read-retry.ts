import { ApiError } from '@orvia/contracts/client';

/** Retain the existing single delayed read retry, but cancel it with its screen. */
export async function readAfterDelay<T>(work: () => Promise<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  try { return await work(); }
  catch (error) {
    if (!(error instanceof ApiError) || error.envelope.error.retry !== 'AFTER_DELAY') throw error;
    await new Promise<void>((resolve, reject) => {
      const done = () => { signal?.removeEventListener('abort', abort); resolve(); };
      const timer = setTimeout(done, 1500);
      const abort = () => { clearTimeout(timer); signal?.removeEventListener('abort', abort); reject(signal?.reason); };
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
    });
    signal?.throwIfAborted();
    return work();
  }
}
