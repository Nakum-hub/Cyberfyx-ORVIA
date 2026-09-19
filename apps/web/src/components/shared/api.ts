'use client';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { routes, schemas } from '@orvia/contracts';
import { createClient } from '@orvia/contracts/client';
import type { EndpointMap } from '@orvia/contracts/generated/endpoint-types';
import interfaces from '@orvia/contracts/generated/interfaces.json';
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

/**
 * One request at a time from this tab.
 *
 * The customer-local runtime keeps a deliberately tiny database pool, so a
 * screen that fans out several paginated reads can starve it and make an
 * unrelated request — including the session read on the next screen — fail with
 * SERVICE_UNAVAILABLE. Serialising here bounds the pressure this interface can
 * put on the server no matter how many components a screen composes. It changes
 * no semantics: each request still carries its own timeout, abort signal and
 * idempotency key, and a cancelled request leaves the queue immediately.
 */
let gate: Promise<unknown> = Promise.resolve();
function queued(input: RequestInfo | URL, init?: RequestInit) {
  const run = gate.then(
    () => fetch(input, { ...init, signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) }),
  );
  gate = run.then(() => undefined, () => undefined);
  return run;
}
const client = createClient(queued);

export type Operation = keyof EndpointMap;
export type CallOptions = { params?: Record<string, string>; cursor?: string; limit?: number; idempotency_key?: string; signal?: AbortSignal };

export function call<K extends Operation>(operation: K, input: EndpointMap[K]['request'], options: CallOptions = {}) {
  return client.call(operation, input, options);
}

/* ------------------------------------------------------------------ *
 * Identity-scoped cache
 * ------------------------------------------------------------------ */

let identity = 'anonymous';
const activeRequests = new Set<string>();
const requestListeners = new Set<() => void>();
function markRequest(id:string, blocked:boolean) {
  if(blocked) activeRequests.add(id); else activeRequests.delete(id);
  for(const listener of requestListeners) listener();
}
/** Prevent screen switches from dropping a pending or unresolved same-tab request. */
export function useRequestGuard() {
  return useSyncExternalStore(listener=>{requestListeners.add(listener);return ()=>{requestListeners.delete(listener);};},()=>activeRequests.size>0,()=>false);
}
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
  activeRequests.clear();
  for(const listener of requestListeners) listener();
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
  cursor?: string;
  /** Internal collection reader: each page is contract-validated before combining. */
  allPages?: boolean;
  /** Return true while the result should continue to be polled. */
  pollWhile?: (data: T) => boolean;
};

/**
 * Reads one operation, cancelling any superseded request. Polling honours the
 * generated minimum interval and backs off to the generated maximum on failure.
 */
export function useQuery<K extends Operation>(operation: K, options: QueryOptions<EndpointMap[K]['response']> = {}): Query<EndpointMap[K]['response']> {
  type Result = EndpointMap[K]['response'];
  const { enabled = true, params, limit, cursor, allPages = false, pollWhile } = options;
  const [state, setState] = useState<{ status: QueryStatus; data: Result | null; failure: UiFailure | null; loadedAt: number | null }>(
    { status: 'idle', data: null, failure: null, loadedAt: null });
  const [tick, setTick] = useState(0);
  const paramsKey = JSON.stringify(params ?? null);
  const sourceRef = useRef<string | null>(null);
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
    const sourceKey = JSON.stringify([identity,operation,paramsKey,limit,cursor,allPages]);
    const sameSource = sourceRef.current === sourceKey;
    sourceRef.current = sourceKey;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let backoff = POLL.minimumIntervalMs;

    // Rebuilt from the serialised key so an inline object literal from the
    // caller cannot retrigger this effect on every render.
    const effectiveParams = JSON.parse(paramsKey) as Record<string, string> | null;

    const read = async (isRefresh: boolean) => {
      setState(previous => isRefresh ? { ...previous, status: 'refreshing' } : { status: 'loading', data: null, failure: null, loadedAt: null });
      try {
        let data = await client.call(operation, undefined as EndpointMap[K]['request'],
          { ...(effectiveParams ? { params: effectiveParams } : {}), ...(limit ? { limit } : {}), cursor, signal: controller.signal }) as Result;
        if (allPages) {
          const collection = data as Result & {items:unknown[];next_cursor:string|null};
          const items = [...collection.items]; const seen = new Set<string>();
          let next = collection.next_cursor;
          while (next) {
            if(seen.has(next) || seen.size >= 100) throw new Error('Collection pagination did not complete; no partial list is displayed.');
            seen.add(next);
            const page = await client.call(operation, undefined as EndpointMap[K]['request'],
              { ...(effectiveParams ? {params:effectiveParams} : {}), limit:100,cursor:next,signal:controller.signal }) as Result & {items:unknown[];next_cursor:string|null};
            items.push(...page.items); next=page.next_cursor;
          }
          data={...collection,items,next_cursor:null};
        }
        // A response that outlived its actor or its screen is discarded, never rendered.
        if (cancelled || requestIdentity !== identity) return;
        setState({ status: 'ready', data, failure: null, loadedAt: Date.now() });
        backoff = POLL.minimumIntervalMs;
        if (pollRef.current?.(data)) timer = setTimeout(() => void read(true), POLL.minimumIntervalMs);
      } catch (error) {
        if (cancelled || requestIdentity !== identity) return;
        const failure = describeFailure(error);
        if (failure.kind === 'ABORTED') return;
        const denied = failure.status === 401 || failure.status === 403 || failure.status === 404;
        setState(previous => ({ status: 'error', data: denied ? null : previous.data, failure, loadedAt: denied ? null : previous.loadedAt }));
        if (failure.status === 401) globalThis.dispatchEvent(new globalThis.Event('orvia-session-invalid'));
        if (pollRef.current) {
          backoff = Math.min(backoff * 2, POLL.maximumBackoffMs);
          timer = setTimeout(() => void read(true), backoff);
        }
      }
    };
    void read(sameSource);
    return () => { cancelled = true; controller.abort(); if (timer) clearTimeout(timer); };
  }, [operation, enabled, paramsKey, limit, cursor, allPages, tick]);

  const refresh = useCallback(() => setTick(value => value + 1), []);
  const bound=sourceRef.current===JSON.stringify([identity,operation,paramsKey,limit,cursor,allPages]);
  return bound ? {...state,refresh} : {status:enabled?'loading':'idle',data:null,failure:null,loadedAt:null,refresh};
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
  retry: () => Promise<EndpointMap[K]['response'] | null>;
  unsettled: boolean;
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
  const requestId=useId();
  const [state, setState] = useState<{ status: MutationStatus; result: Result | null; failure: UiFailure | null }>(
    { status: 'idle', result: null, failure: null });
  const keyRef = useRef<{ digest: string; key: string } | null>(null);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const requestRef = useRef<{ input: EndpointMap[K]['request']; options: { params?: Record<string,string> } } | null>(null);
  const unsettled = useRef(false);

  useEffect(() => onIdentityChange(() => {
    keyRef.current = null;
    generation.current += 1;
    requestRef.current = null;
    unsettled.current = false;
    setState({ status: 'idle', result: null, failure: null });
  }), []);
  useEffect(() => {
    const warn = (event:BeforeUnloadEvent) => {if(unsettled.current || inFlight.current){event.preventDefault();event.returnValue='';}};
    globalThis.addEventListener('beforeunload',warn);
    return ()=>{generation.current+=1;markRequest(requestId,false);globalThis.removeEventListener('beforeunload',warn);};
  },[requestId]);

  const run = useCallback(async (input: EndpointMap[K]['request'], options: { params?: Record<string, string> } = {}) => {
    if (inFlight.current) return null; // duplicate submit while pending is ignored
    // Canonical validation before dispatch distinguishes invalid input from a
    // malformed response after a possibly committed request.
    try {
      const route=routes.find(candidate=>candidate.id===operation)!;
      if(route.request)schemas[route.request].parse(input);
      if(route.params)schemas[route.params].parse(options.params);
    } catch(error) {
      if(unsettled.current)return null;
      const failure=describeFailure(error);
      if(error instanceof Error && 'issues' in error && Array.isArray(error.issues)) failure.fieldErrors=error.issues.slice(0,32).map(issue=>({field:issue.path.join('.'),code:issue.code}));
      setState({status:'error',result:null,failure});return null;
    }
    const digest = stableStringify({ input: input ?? null, params: options.params ?? null });
    if (unsettled.current && keyRef.current?.digest !== digest) return null;
    const requestIdentity = identity;
    const requestGeneration = generation.current;
    inFlight.current = true;
    markRequest(requestId,true);
    requestRef.current = { input: structuredClone(input), options: structuredClone(options) };
    setState({ status: 'pending', result: null, failure: null });
    let key: string | undefined;
    if (needsKey) {
      if (!keyRef.current || keyRef.current.digest !== digest) keyRef.current = { digest, key: newIdempotencyKey() };
      key = keyRef.current.key;
    }
    try {
      const result = await client.call(operation, input, { ...(options.params ? { params: options.params } : {}), ...(key ? { idempotency_key: key } : {}) }) as Result;
      if (requestGeneration !== generation.current || requestIdentity !== identity) return null;
      unsettled.current = false;
      setState({ status: 'done', result, failure: null });
      return result;
    } catch (error) {
      if (requestGeneration !== generation.current || requestIdentity !== identity) return null;
      const failure = describeFailure(error, { write: true });
      unsettled.current = needsKey && (failure.outcomeUnknown || failure.code === 'IDEMPOTENCY_CONFLICT');
      if (failure.status === 401) globalThis.dispatchEvent(new globalThis.Event('orvia-session-invalid'));
      setState({ status: 'error', result: null, failure });
      return null;
    } finally {
      inFlight.current = false;
      markRequest(requestId,unsettled.current);
    }
  }, [operation, needsKey, requestId]);

  const reset = useCallback(() => { if (!unsettled.current) setState({ status: 'idle', result: null, failure: null }); }, []);
  const newInteraction = useCallback(() => { if (unsettled.current || inFlight.current) return; keyRef.current = null; requestRef.current = null; setState({ status: 'idle', result: null, failure: null }); }, []);
  const retry = useCallback(() => requestRef.current ? run(requestRef.current.input, requestRef.current.options) : Promise.resolve(null), [run]);
  return { ...state, run, reset, newInteraction, retry, unsettled: unsettled.current };
}

/** Each page is rendered only after its own real response; an empty page may still have a next cursor. */
export function usePagedQuery<K extends Operation>(operation: K, options: Omit<QueryOptions<EndpointMap[K]['response']>, 'cursor'> = {}) {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const paramsKey = JSON.stringify(options.params ?? null);
  useEffect(() => { setCursors([undefined]); }, [paramsKey]);
  useEffect(() => onIdentityChange(() => setCursors([undefined])), []);
  const query = useQuery(operation, { ...options, cursor: cursors.at(-1) });
  return { ...query, page: cursors.length, hasPrevious: cursors.length > 1,
    next: (cursor: string) => setCursors(previous => [...previous, cursor]),
    previous: () => setCursors(previous => previous.length > 1 ? previous.slice(0,-1) : previous),
    first: () => setCursors([undefined]) };
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

/** Load selector collections through every canonical cursor, never truncate silently. */
type CollectionOperation = { [K in Operation]: EndpointMap[K]['response'] extends {items:unknown[];next_cursor:string|null} ? K : never }[Operation];
export function useCollection<K extends CollectionOperation>(operation:K, options:Omit<QueryOptions<EndpointMap[K]['response']>,'cursor'|'allPages'>={}) {
  return useQuery(operation,{...options,limit:100,allPages:true});
}
