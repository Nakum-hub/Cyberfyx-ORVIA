import type pg from 'pg';
import type { Authority } from '../../../database/customer/src/runtime.ts';
import { syntheticRecordsAdapter } from '../records-synthetic/records-adapter.ts';

/**
 * The connector capability contract (integrations/CONNECTORS_EXECUTION_AND_VERIFICATION.md s9-s12).
 *
 * Every adapter publishes factual capabilities from its own code. An action it
 * does not implement returns NOT_SUPPORTED; it never pretends. Execution and
 * verification are separate calls, and verification must use a different
 * credential from execution wherever the target allows, so the thing that
 * reports success is not the thing that confirms it.
 */
export type ConnectorCapabilities = {
  adapter_kind: 'TEST_ADAPTER' | 'MANUAL';
  discover_metadata: boolean; read_reference: boolean; correct: boolean; erase: boolean; anonymise: boolean; suppress: boolean;
  retrieve_evidence: boolean; verify: boolean; bulk: boolean; idempotency: boolean;
  rate_limit: string; consistency: 'IMMEDIATE' | 'EVENTUAL' | 'NOT_DECLARED'; irreversible_actions: ('ERASE' | 'ANONYMISE')[];
  verification_method: 'INDEPENDENT_READ_BACK' | 'NONE_AVAILABLE'; limitation: string;
};
export type ConnectorActionType = 'SUPPRESS' | 'ERASE' | 'ANONYMISE' | 'CORRECT' | 'READ_REFERENCE';
export type ConnectorAction = {
  idempotency_key: string; action_type: ConnectorActionType; system_id: string; target_reference: string;
  /** Correction values keyed by field. Present only for CORRECT and never logged. */
  payload: Record<string, string> | null;
};
export type ExecuteResult = {
  target_result: 'ACCEPTED_BY_TARGET' | 'COMPLETED_BY_TARGET' | 'FAILED' | 'TIMEOUT_EFFECT_UNKNOWN' | 'NOT_SUPPORTED' | 'NOT_FOUND';
  replayed: boolean; error_code: string | null; response_digest: string | null;
};
export type VerifyResult = {
  method: 'INDEPENDENT_READ_BACK' | 'NONE_AVAILABLE'; verifier: string;
  /** Digests and booleans only: a verification record never carries personal values. */
  expected: Record<string, unknown>; observed: Record<string, unknown>;
  result: 'PASS' | 'FAIL' | 'INCONCLUSIVE'; failure_reason: string | null;
};
export type TargetPools = { agent: pg.Pool; observer: pg.Pool };
/**
 * A read of the record itself, for a rights response package. Unlike a
 * verification this carries the values, because disclosing them to the
 * principal is its purpose; it is read through the observer role only.
 */
export type RetrieveResult = {
  result: 'READ' | 'NOT_FOUND' | 'UNAVAILABLE' | 'NOT_SUPPORTED';
  fields: Record<string, string> | null; state: { suppressed: boolean; erased: boolean; anonymised: boolean } | null; read_by: string;
};
export type ConnectorAdapter = {
  name: 'SYNTHETIC_RECORDS_TEST_ADAPTER' | 'MANUAL_ONLY'; version: string; capabilities: ConnectorCapabilities;
  supports(action: ConnectorActionType): boolean;
  execute(pools: TargetPools, actor: Authority, action: ConnectorAction): Promise<ExecuteResult>;
  verify(pools: TargetPools, actor: Authority, action: ConnectorAction): Promise<VerifyResult>;
  retrieve(pools: TargetPools, actor: Authority, systemId: string, reference: string): Promise<RetrieveResult>;
};

const manualCapabilities: ConnectorCapabilities = {
  adapter_kind: 'MANUAL', discover_metadata: false, read_reference: false, correct: false, erase: false, anonymise: false, suppress: false,
  retrieve_evidence: false, verify: false, bulk: false, idempotency: false, rate_limit: 'Not applicable: no automated operation exists.',
  consistency: 'NOT_DECLARED', irreversible_actions: [], verification_method: 'NONE_AVAILABLE',
  limitation: 'No connector operation exists for this system. Every action is reported as not supported and must be handled outside ORVIA.',
};
/** A system with no automated path. Every action is reported as not supported. */
export const manualAdapter: ConnectorAdapter = {
  name: 'MANUAL_ONLY', version: '1.0.0', capabilities: manualCapabilities,
  supports: () => false,
  execute: async () => ({ target_result: 'NOT_SUPPORTED', replayed: false, error_code: 'NO_CONNECTOR_OPERATION', response_digest: null }),
  verify: async () => ({ method: 'NONE_AVAILABLE', verifier: 'none', expected: {}, observed: {}, result: 'INCONCLUSIVE', failure_reason: 'No verification method exists for a manual-only system.' }),
  retrieve: async () => ({ result: 'NOT_SUPPORTED', fields: null, state: null, read_by: 'none' }),
};

export const adapters: Record<ConnectorAdapter['name'], ConnectorAdapter> = {
  SYNTHETIC_RECORDS_TEST_ADAPTER: syntheticRecordsAdapter,
  MANUAL_ONLY: manualAdapter,
};
export function adapterFor(name: string | null | undefined): ConnectorAdapter | null {
  return name && Object.hasOwn(adapters, name) ? adapters[name as ConnectorAdapter['name']] : null;
}
