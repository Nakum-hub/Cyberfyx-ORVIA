/** Serial dispatch; cancellation rejects the caller without releasing an active transport. */
export function createQueuedFetch(transport: typeof fetch = fetch): typeof fetch {
  let gate: Promise<unknown> = Promise.resolve();
  return (input, init) => {
    const signal = init?.signal;
    if (signal?.aborted) return Promise.reject(signal.reason);
    let detach = () => {};
    const result = new Promise<Response>((resolve, reject) => {
      const abort = () => reject(signal?.reason);
      signal?.addEventListener('abort', abort, { once: true });
      detach = () => signal?.removeEventListener('abort', abort);
      const run = gate.then(() => {
        // A canceled queued request never reaches the transport. The dispatch
        // timeout starts here, rather than while waiting behind another read.
        if (signal?.aborted) throw signal.reason;
        return transport(input, { ...init, signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) });
      });
      gate = run.then(() => undefined, () => undefined);
      void run.then(resolve, reject);
    });
    return result.finally(detach);
  };
}
