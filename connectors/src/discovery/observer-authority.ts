import type { Authority } from '../../../database/customer/src/runtime.ts';

/** Recheck after asynchronous waits before reading or returning an observation.
 * Callers snapshot authority before their first await. */
export function requireCurrentObserver(actor: Authority): void {
  const expires = Date.parse(actor.expires_at);
  if (actor.actor_domain !== 'MACHINE' || actor.role !== 'OBSERVER' ||
    !actor.capabilities.includes('target.observe') || !Number.isFinite(expires) || expires <= Date.now())
    throw new Error('Current observer machine authority required');
}
