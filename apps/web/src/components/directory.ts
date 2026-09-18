'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { schemas } from '@orvia/contracts';
import { call, currentIdentity, onIdentityChange } from './api.ts';
import { describeFailure, type UiFailure } from './errors.ts';
import { CONNECTOR_LABELS, shortId } from './state-labels.ts';

type Purpose = ReturnType<typeof schemas.Purpose.parse>;
type System = ReturnType<typeof schemas.System.parse>;
type Principal = ReturnType<typeof schemas.Principal.parse>;
type Mapping = ReturnType<typeof schemas.TargetMapping.parse>;

/**
 * Name resolution for the configuration records the rest of the interface refers
 * to only by identifier.
 *
 * Everything here is read from the same canonical endpoints the configuration
 * screens use, through every canonical cursor, and is never truncated silently.
 * It adds no field the server did not return: it only lets a workflow say
 * "Promotional marketing · Aster CRM" instead of two UUIDs, with the UUIDs still
 * one disclosure away.
 */
export type DirectorySnapshot = {
  purposes: Purpose[];
  systems: System[];
  principals: Principal[];
  mappings: Mapping[];
  loadedAt: number;
};

export type DirectoryPart = 'purposes' | 'systems' | 'principals' | 'mappings';

const OPERATION = {
  purposes: 'list_purposes', systems: 'list_systems',
  principals: 'list_principals', mappings: 'list_mappings',
} as const;

async function readAll(part: DirectoryPart, signal: AbortSignal) {
  const items: Record<string, unknown>[] = [];
  let cursor: string | undefined;
  const seen = new Set<string>();
  for (;;) {
    const page = await call(OPERATION[part], undefined as never, { limit: 100, cursor, signal }) as { items: Record<string, unknown>[]; next_cursor: string | null };
    items.push(...page.items);
    if (!page.next_cursor) return items;
    if (seen.has(page.next_cursor) || seen.size >= 100) throw new Error('Directory pagination did not complete; no partial list is displayed.');
    seen.add(page.next_cursor);
    cursor = page.next_cursor;
  }
}

/** One in-flight read per identity, shared by every component on the screen. */
const inflight = new Map<string, Promise<DirectorySnapshot>>();

function load(parts: DirectoryPart[], identity: string, controller: AbortController) {
  const key = `${identity}|${[...parts].sort().join(',')}`;
  const existing = inflight.get(key);
  if (existing) return existing;
  const promise = (async () => {
    const wanted = new Set(parts);
    // Read one collection at a time. The customer-local runtime pool is
    // deliberately tiny, and a fan-out of parallel paginated reads from one
    // screen can exhaust it and make an unrelated request fail.
    const read = async (part: DirectoryPart) => (wanted.has(part) ? readAll(part, controller.signal) : []);
    const purposes = await read('purposes');
    const systems = await read('systems');
    const principals = await read('principals');
    const mappings = await read('mappings');
    return {
      purposes: purposes as unknown as Purpose[],
      systems: systems as unknown as System[],
      principals: principals as unknown as Principal[],
      mappings: mappings as unknown as Mapping[],
      loadedAt: Date.now(),
    };
  })().finally(() => { inflight.delete(key); });
  inflight.set(key, promise);
  return promise;
}

export type Directory = {
  status: 'loading' | 'ready' | 'error';
  failure: UiFailure | null;
  data: DirectorySnapshot | null;
  refresh: () => void;
  purpose: (id: string | null | undefined) => Purpose | null;
  system: (id: string | null | undefined) => System | null;
  principal: (id: string | null | undefined) => Principal | null;
  /** Display name with a stable fallback that never pretends a name exists. */
  purposeName: (id: string | null | undefined) => string;
  systemName: (id: string | null | undefined) => string;
  principalName: (id: string | null | undefined) => string;
};

export function useDirectory(parts: DirectoryPart[] = ['purposes', 'systems'], enabled = true): Directory {
  const key = [...parts].sort().join(',');
  const [state, setState] = useState<{ status: Directory['status']; data: DirectorySnapshot | null; failure: UiFailure | null }>(
    { status: 'loading', data: null, failure: null });
  const [tick, setTick] = useState(0);

  useEffect(() => onIdentityChange(() => { setState({ status: 'loading', data: null, failure: null }); setTick(value => value + 1); }), []);

  useEffect(() => {
    if (!enabled) { setState({ status: 'ready', data: null, failure: null }); return; }
    const controller = new AbortController();
    const identity = currentIdentity();
    let cancelled = false;
    setState(previous => ({ ...previous, status: previous.data ? previous.status : 'loading' }));
    load(key.split(',') as DirectoryPart[], identity, controller)
      .then(data => { if (!cancelled && identity === currentIdentity()) setState({ status: 'ready', data, failure: null }); })
      .catch((error: unknown) => {
        if (cancelled || identity !== currentIdentity()) return;
        const failure = describeFailure(error);
        if (failure.kind === 'ABORTED') return;
        setState({ status: 'error', data: null, failure });
      });
    return () => { cancelled = true; controller.abort(); };
  }, [key, enabled, tick]);

  const index = useMemo(() => ({
    purposes: new Map((state.data?.purposes ?? []).map(item => [item.id, item])),
    systems: new Map((state.data?.systems ?? []).map(item => [item.id, item])),
    principals: new Map((state.data?.principals ?? []).map(item => [item.id, item])),
  }), [state.data]);

  const refresh = useCallback(() => setTick(value => value + 1), []);

  return {
    status: state.status,
    failure: state.failure,
    data: state.data,
    refresh,
    purpose: id => (id ? index.purposes.get(id) ?? null : null),
    system: id => (id ? index.systems.get(id) ?? null : null),
    principal: id => (id ? index.principals.get(id) ?? null : null),
    purposeName: id => index.purposes.get(id ?? '')?.name ?? (id ? `Purpose ${shortId(id)}` : '—'),
    systemName: id => {
      const system = index.systems.get(id ?? '');
      if (!system) return id ? `System ${shortId(id)}` : '—';
      // Fixture systems created by integration suites are named after their
      // connector. Showing the connector's reading name is clearer and is still
      // exactly the value the server returned.
      return CONNECTOR_LABELS[system.name] ?? system.name;
    },
    principalName: id => index.principals.get(id ?? '')?.display_name ?? (id ? `Person ${shortId(id)}` : '—'),
  };
}
