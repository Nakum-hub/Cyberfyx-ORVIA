'use client';

// Includes queued reads and every page of a collection. Each generation owns
// its token, so finishing a superseded read cannot clear a newer one.
const active = new Set<symbol>();
// The shell owns the main element; request activity owns its accessibility
// busy state. Update it synchronously when a refresh is queued, before its
// React effect can start, so retained data cannot look settled in that gap.
const notify = () => {
  if (typeof document !== 'undefined') document.getElementById('main')?.setAttribute('aria-busy', String(active.size > 0));
};
export function beginRead() {
  const token = Symbol(); active.add(token); notify();
  return () => { if (active.delete(token)) notify(); };
}
