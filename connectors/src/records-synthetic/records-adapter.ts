import { createHash } from 'node:crypto';
import { digest } from '../../../shared/contracts/src/crypto.ts';
import { targetTransaction } from '../shared/target-db.ts';
import type { ConnectorAction, ConnectorAdapter, ConnectorCapabilities, ExecuteResult, RetrieveResult, VerifyResult } from '../shared/connector-adapters.ts';

/**
 * TEST ADAPTER for the synthetic records target. It proves the execution and
 * verification contract end to end against fictional records; it is not, and is
 * never reported as, a live production connector.
 *
 * Execution runs as orvia_target_agent through an idempotency ledger, so a key
 * seen before returns its recorded outcome and is never applied twice.
 * Verification runs as orvia_target_observer and re-reads the record itself.
 */
const hash = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const capabilities: ConnectorCapabilities = {
  adapter_kind: 'TEST_ADAPTER', discover_metadata: false, read_reference: true, correct: true, erase: true, anonymise: true, suppress: true,
  retrieve_evidence: true, verify: true, bulk: false, idempotency: true, rate_limit: 'None declared by the synthetic target.',
  consistency: 'IMMEDIATE', irreversible_actions: ['ERASE', 'ANONYMISE'], verification_method: 'INDEPENDENT_READ_BACK',
  limitation: 'Test adapter over the isolated synthetic records target. It demonstrates the contract; it does not prove connectivity to any customer system.',
};
const supported = new Set(['SUPPRESS', 'ERASE', 'ANONYMISE', 'CORRECT', 'READ_REFERENCE']);

export const syntheticRecordsAdapter: ConnectorAdapter = {
  name: 'SYNTHETIC_RECORDS_TEST_ADAPTER', version: '1.0.0', capabilities,
  supports: action => supported.has(action),

  async execute(pools, actor, action): Promise<ExecuteResult> {
    const requestDigest = digest({ action_type: action.action_type, system_id: action.system_id, target_reference: action.target_reference, payload: action.payload === null ? null : Object.keys(action.payload).sort().map(k => [k, hash(action.payload![k]!)]) });
    return targetTransaction(pools.agent, actor, async tx => {
      await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify(['subject-operation', action.idempotency_key])]);
      const prior = (await tx.query('SELECT request_digest,outcome FROM subject_operations WHERE idempotency_key=$1', [action.idempotency_key])).rows[0];
      if (prior) {
        if (prior.request_digest !== requestDigest) return { target_result: 'FAILED', replayed: true, error_code: 'IDEMPOTENCY_CONFLICT', response_digest: null };
        return { target_result: 'COMPLETED_BY_TARGET', replayed: true, error_code: null, response_digest: digest({ key: action.idempotency_key, outcome: prior.outcome }) };
      }
      const control = (await tx.query('SELECT mode FROM subject_controls WHERE system_id=$1', [action.system_id])).rows[0];
      const mode: string = control?.mode ?? 'HEALTHY';
      if (mode === 'UNAVAILABLE') return { target_result: 'FAILED', replayed: false, error_code: 'TARGET_UNAVAILABLE', response_digest: null };
      const record = (await tx.query('SELECT fields FROM subject_records WHERE system_id=$1 AND subject_reference=$2 FOR UPDATE', [action.system_id, action.target_reference])).rows[0];
      if (!record) return { target_result: 'NOT_FOUND', replayed: false, error_code: 'RECORD_NOT_FOUND', response_digest: null };
      const apply = mode !== 'ACK_WITHOUT_EFFECT';
      if (apply) {
        if (action.action_type === 'ERASE') await tx.query(`UPDATE subject_records SET fields='{}'::jsonb,erased_at=now(),version=version+1,changed_at=now() WHERE system_id=$1 AND subject_reference=$2`, [action.system_id, action.target_reference]);
        else if (action.action_type === 'ANONYMISE') await tx.query(`UPDATE subject_records SET fields=(SELECT COALESCE(jsonb_object_agg(key,'ANONYMISED'),'{}'::jsonb) FROM jsonb_object_keys(fields) key),anonymised_at=now(),version=version+1,changed_at=now() WHERE system_id=$1 AND subject_reference=$2`, [action.system_id, action.target_reference]);
        else if (action.action_type === 'SUPPRESS') await tx.query('UPDATE subject_records SET suppressed=true,version=version+1,changed_at=now() WHERE system_id=$1 AND subject_reference=$2', [action.system_id, action.target_reference]);
        else if (action.action_type === 'CORRECT') await tx.query('UPDATE subject_records SET fields=fields||$3::jsonb,version=version+1,changed_at=now() WHERE system_id=$1 AND subject_reference=$2', [action.system_id, action.target_reference, action.payload ?? {}]);
      }
      const outcome = apply ? 'COMPLETED' : 'ACKNOWLEDGED';
      await tx.query('INSERT INTO subject_operations(idempotency_key,system_id,subject_reference,operation,request_digest,applied,outcome) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [action.idempotency_key, action.system_id, action.target_reference, action.action_type, requestDigest, apply, outcome]);
      const response = digest({ key: action.idempotency_key, outcome });
      // The effect is committed, but the caller is told the call timed out: the effect is unknown to it.
      if (mode === 'APPLY_THEN_TIMEOUT') return { target_result: 'TIMEOUT_EFFECT_UNKNOWN', replayed: false, error_code: 'TARGET_TIMEOUT', response_digest: null };
      return { target_result: 'COMPLETED_BY_TARGET', replayed: false, error_code: null, response_digest: response };
    });
  },

  async verify(pools, actor, action: ConnectorAction): Promise<VerifyResult> {
    const verifier = 'orvia_target_observer independent read-back';
    return targetTransaction(pools.observer, actor, async tx => {
      const control = (await tx.query('SELECT read_mode FROM subject_controls WHERE system_id=$1', [action.system_id])).rows[0];
      if (control?.read_mode === 'UNAVAILABLE') return { method: 'INDEPENDENT_READ_BACK', verifier, expected: { action: action.action_type }, observed: { readable: false }, result: 'INCONCLUSIVE', failure_reason: 'The target could not be read, so the effect was neither confirmed nor refuted.' };
      const record = (await tx.query('SELECT fields,suppressed,erased_at,anonymised_at FROM subject_records WHERE system_id=$1 AND subject_reference=$2', [action.system_id, action.target_reference])).rows[0];
      if (!record) return { method: 'INDEPENDENT_READ_BACK', verifier, expected: { action: action.action_type }, observed: { record_present: false }, result: 'FAIL', failure_reason: 'The target record was not found on read-back.' };
      const fields = record.fields as Record<string, unknown>;
      let pass: boolean; let expected: Record<string, unknown>; let observed: Record<string, unknown>;
      if (action.action_type === 'ERASE') { expected = { erased: true, field_count: 0 }; observed = { erased: record.erased_at !== null, field_count: Object.keys(fields).length }; pass = record.erased_at !== null && Object.keys(fields).length === 0; }
      else if (action.action_type === 'ANONYMISE') { expected = { anonymised: true }; observed = { anonymised: record.anonymised_at !== null && Object.values(fields).every(v => v === 'ANONYMISED') }; pass = observed.anonymised === true; }
      else if (action.action_type === 'SUPPRESS') { expected = { suppressed: true }; observed = { suppressed: record.suppressed }; pass = record.suppressed === true; }
      else if (action.action_type === 'CORRECT') {
        const keys = Object.keys(action.payload ?? {}).sort();
        expected = Object.fromEntries(keys.map(k => [k, hash(action.payload![k]!)]));
        observed = Object.fromEntries(keys.map(k => [k, typeof fields[k] === 'string' ? hash(fields[k] as string) : null]));
        pass = keys.length > 0 && keys.every(k => expected[k] === observed[k]);
      } else { expected = { record_present: true }; observed = { record_present: true, field_count: Object.keys(fields).length }; pass = true; }
      return { method: 'INDEPENDENT_READ_BACK', verifier, expected, observed, result: pass ? 'PASS' : 'FAIL', failure_reason: pass ? null : 'The state read back from the target does not match the requested effect.' };
    });
  },

  async retrieve(pools, actor, systemId, reference): Promise<RetrieveResult> {
    const read_by = 'orvia_target_observer independent read';
    return targetTransaction(pools.observer, actor, async tx => {
      const control = (await tx.query('SELECT read_mode FROM subject_controls WHERE system_id=$1', [systemId])).rows[0];
      if (control?.read_mode === 'UNAVAILABLE') return { result: 'UNAVAILABLE', fields: null, state: null, read_by };
      const record = (await tx.query('SELECT fields,suppressed,erased_at,anonymised_at FROM subject_records WHERE system_id=$1 AND subject_reference=$2', [systemId, reference])).rows[0];
      if (!record) return { result: 'NOT_FOUND', fields: null, state: null, read_by };
      const fields = Object.fromEntries(Object.entries(record.fields as Record<string, unknown>).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
      return { result: 'READ', fields, state: { suppressed: record.suppressed, erased: record.erased_at !== null, anonymised: record.anonymised_at !== null }, read_by };
    });
  },
};
