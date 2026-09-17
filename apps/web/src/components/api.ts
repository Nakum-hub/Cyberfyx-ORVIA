'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@orvia/contracts/client';
import type { EndpointMap } from '../../../../packages/contracts/generated/endpoint-types.ts';
import interfaces from '../../../../packages/contracts/generated/interfaces.json';
import { describeFailure, type UiFailure } from './errors.ts';

/**
 * One transport for the whole interface: the generated client from
 * packages/contracts. No second DTO model, no hand-written endpoint URL and no
 * mock-success fallback exists in this runtime.
 */
export const POLL = {
  minimumIntervalMs: interfaces.polling.minimum_interval_ms,
  maximumBackoffMs: interfaces.polling.maximum_backoff_ms,
  workflowTerminal: interfaces.polling.workflow_terminal as readonly string[],
  testTerminal: interfaces.polling.test_terminal as readonly string[],
};
export const CONTRACT_VERSION = interfaces.contract_version;
export const CONTRACT_REVIEW_STATUS = interfaces.review_status;

const client = createClient((input, init) => fetch(input, init));

export type Operation = keyof EndpointMap;
export type CallOptions = { params?: Record<string, string>; cursor?: string; limit?: number; idempotency_key?: string; signal?: AbortSignal };

export function call<K extends Operation>(operation: K, input: EndpointMap[K]['request'], options: CallOptions = {}) {
  return client.call(operation, input, options);
}

/* ------------------------------------------------------------------ *
 * Identity-scoped cache
 * ------------------------------------------------------------------ */

let identity = 'anonymous';
const listeners = new Set<() => void>();

/** Stable key for the authenticated actor, organisation scope and environment. */
export function identityKey(session: { actor_domain: string; actor_id: string; scope: { tenant_id: string; legal_entity_id: string; environment_id: string } } | null): string {
  if (!session) return 'anonymous';
  return [session.actor_domain, session.actor_id, session.scope.tenant_id, session.scope.legal_entity_id, session.scope.environment_id].join('|');
}

/**
 * Switching actor, organisation or environment drops every cached response and
 * invalidates in-flight requests, so one actor's data can never paint another
 * actor's screen.
 */
export function setIdentity(next: string) {
  if (next === identity) return;
  identity = next;
  for (const listener of listeners) listener();
}

export function currentIdentity() { return identity; }

export function onIdentityChange(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/* ------------------------------------------------------------------ *
 * Queries
 * ------------------------------------------------------------------ */

export type QueryStatus = 'idle' | 'loading' | 'refreshing' | 'ready' | 'error';
export type Query<T> = {
  status: QueryStatus;
  data: T | null;
  failure: UiFailure | null;
  /** Local time the displayed data was received; drives the freshness line. */
  loadedAt: number | null;
  refresh: () => void;
};

export type QueryOptions<T> = {
  enabled?: boolean;
  params?: Record<string, string>;
  limit?: number;
  /** Return true while the result should continue to be polled. */
  pollWhile?: (data: T) => boolean;
};

/**
 * Reads one operation, cancelling any superseded request. Polling honours the
 * generated minimum interval and backs off to the generated maximum on failure.
 */
export function useQuery<K extends Operation>(operation: K, options: QueryOptions<EndpointMap[K]['response']> = {}): Query<EndpointMap[K]['response']> {
  type Result = EndpointMap[K]['response'];
  const { enabled = true, params, limit, pollWhile } = options;
  const [state, setState] = useState<{ status: QueryStatus; data: Result | null; failure: UiFailure | null; loadedAt: number | null }>(
    { status: 'idle', data: null, failure: null, loadedAt: null });
  const [tick, setTick] = useState(0);
  const paramsKey = JSON.stringify(params ?? null);
  const pollRef = useRef(pollWhile);
  pollRef.current = pollWhile;

  useEffect(() => onIdentityChange(() => {
    setState({ status: 'idle', data: null, failure: null, loadedAt: null });
    setTick(value => value + 1);
  }), []);

  useEffect(() => {
    if (!enabled) { setState({ status: 'idle', data: null, failure: null, loadedAt: null }); return; }
    const controller = new AbortController();
    const requestIdentity = identity;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let backoff = POLL.minimumIntervalMs;

    // Rebuilt from the serialised key so an inline object literal from the
    // caller cannot retrigger this effect on every render.
    const effectiveParams = JSON.parse(paramsKey) as Record<string, string> | null;

    const read = async (isRefresh: boolean) => {
      setState(previous => ({ ...previous, status: isRefresh ? 'refreshing' : 'loading' }));
      try {
        const data = await client.call(operation, undefined as EndpointMap[K]['request'],
          { ...(effectiveParams ? { params: effectiveParams } : {}), ...(limit ? { limit } : {}), signal: controller.signal }) as Result;
        // A response that outlived its actor or its screen is discarded, never rendered.
        if (cancelled || requestIdentity !== identity) return;
        setState({ status: 'ready', data, failure: null, loadedAt: Date.now() });
        backoff = POLL.minimumIntervalMs;
        if (pollRef.current?.(data)) timer = setTimeout(() => void read(true), POLL.minimumIntervalMs);
      } catch (error) {
        if (cancelled || requestIdentity !== identity) return;
        const failure = describeFailure(error);
        if (failure.kind === 'ABORTED') return;
        setState(previous => ({ status: 'error', data: previous.data, failure, loadedAt: previous.loadedAt }));
        if (pollRef.current) {
          backoff = Math.min(backoff * 2, POLL.maximumBackoffMs);
          timer = setTimeout(() => void read(true), backoff);
        }
      }
    };
    void read(false);
    return () => { cancelled = true; controller.abort(); if (timer) clearTimeout(timer); };
  }, [operation, enabled, paramsKey, limit, tick]);

  const refresh = useCallback(() => setTick(value => value + 1), []);
  return { ...state, refresh };
}

/* ------------------------------------------------------------------ *
 * Mutations
 * ------------------------------------------------------------------ */

export type MutationStatus = 'idle' | 'pending' | 'done' | 'error';
export type Mutation<K extends Operation> = {
  status: MutationStatus;
  result: EndpointMap[K]['response'] | null;
  failure: UiFailure | null;
  /** Rejects nothing: the caller reads status/failure instead. */
  run: (input: EndpointMap[K]['request'], options?: { params?: Record<string, string> }) => Promise<EndpointMap[K]['response'] | null>;
  reset: () => void;
  /** Starts a new interaction: a genuinely new request gets a new key. */
  newInteraction: () => void;
};

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`;
}

export function newIdempotencyKey(): string {
  return globalThis.crypto.randomUUID().replaceAll('-', '');
}

/**
 * Idempotency identity follows the accepted contract: one key per interaction,
 * reused only for a byte-identical retry of the same payload, and replaced when
 * the payload changes or a new interaction begins.
 */
export function useMutation<K extends Operation>(operation: K, needsKey: boolean): Mutation<K> {
  type Result = EndpointMap[K]['response'];
  const [state, setState] = useState<{ status: MutationStatus; result: Result | null; failure: UiFailure | null }>(
    { status: 'idle', result: null, failure: null });
  const keyRef = useRef<{ digest: string; key: string } | null>(null);
  const inFlight = useRef(false);

  useEffect(() => onIdentityChange(() => {
    keyRef.current = null;
    setState({ status: 'idle', result: null, failure: null });
  }), []);

  const run = useCallback(async (input: EndpointMap[K]['request'], options: { params?: Record<string, string> } = {}) => {
    if (inFlight.current) return null; // duplicate submit while pending is ignored
    inFlight.current = true;
    setState({ status: 'pending', result: null, failure: null });
    let key: string | undefined;
    if (needsKey) {
      const digest = stableStringify({ input: input ?? null, params: options.params ?? null });
      if (!keyRef.current || keyRef.current.digest !== digest) keyRef.current = { digest, key: newIdempotencyKey() };
      key = keyRef.current.key;
    }
    try {
      const result = await client.call(operation, input, { ...(options.params ? { params: options.params } : {}), ...(key ? { idempotency_key: key } : {}) }) as Result;
      setState({ status: 'done', result, failure: null });
      return result;
    } catch (error) {
      setState({ status: 'error', result: null, failure: describeFailure(error, { write: true }) });
      return null;
    } finally {
      inFlight.current = false;
    }
  }, [operation, needsKey]);

  const reset = useCallback(() => setState({ status: 'idle', result: null, failure: null }), []);
  const newInteraction = useCallback(() => { keyRef.current = null; setState({ status: 'idle', result: null, failure: null }); }, []);
  return { ...state, run, reset, newInteraction };
}

/** Convenience for one-off reads outside the hook lifecycle (exports, recovery). */
export async function readOnce<K extends Operation>(operation: K, options: CallOptions = {}) {
  return client.call(operation, undefined as EndpointMap[K]['request'], options);
}

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
