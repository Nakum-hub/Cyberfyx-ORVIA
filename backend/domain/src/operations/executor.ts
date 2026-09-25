import { randomUUID } from 'node:crypto';
import * as O from '../../../../shared/contracts/src/operations.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { adapterFor, type ConnectorAction } from '../../../../connectors/src/shared/connector-adapters.ts';
import { audit, type Context } from '../shared/transaction.ts';
import { settleExecution } from '../rights/rights.ts';
import { coveringHolds, runView } from './runs.ts';
import { emit, predicate, recordEvidence, refuse, scope, type OperationsEnv } from './shared.ts';

/**
 * The executor (integrations s1, s10-s12).
 *
 *   decision -> action -> target result -> independent verification -> evidence -> state
 *
 * An action is attempted through its adapter with its stable idempotency key, so
 * a retry after an interruption replays the target's recorded outcome instead of
 * applying the effect twice. A target's success response makes an action
 * succeeded_unverified; only a passing independent verification makes it
 * verified. A timeout is an unknown effect, resolved only by verification.
 */
const MAX_ATTEMPTS = 3;
const RETRYABLE = new Set(['TARGET_UNAVAILABLE', 'TARGET_TIMEOUT']);
const SETTLED = new Set(['verified', 'failed', 'inconclusive', 'not_supported', 'blocked', 'cancelled']);
type ActionRow = { id: string; run_id: string; ordinal: number; subject_id: string | null; system_id: string | null; target_reference: string | null; action_type: string; idempotency_key: string;
  state: string; target_result: string; verification: string; attempts: number; last_error_code: string | null; hold_ids: string[] };

async function setAction(c: Context, id: string, changes: Record<string, unknown>) {
  const keys = Object.keys(changes);
  await c.tx.query(`UPDATE app.downstream_actions SET ${keys.map((k, i) => `${k}=$${i + 4}`).join(',')},updated_at=clock_timestamp() WHERE ${predicate} AND id=$${keys.length + 4}`,
    [...scope(c), ...keys.map(k => changes[k]), id]);
}

async function verifyAction(c: Context, env: OperationsEnv, run: { id: string; package_row_id: string; configuration: Record<string, unknown> }, row: ActionRow, connectorAction: ConnectorAction, adapterName: string) {
  const adapter = adapterFor(adapterName)!;
  let result;
  try { result = await adapter.verify(env.targets!, c.actor, connectorAction); }
  catch { result = { method: 'INDEPENDENT_READ_BACK' as const, verifier: adapter.name, expected: { action: row.action_type }, observed: { readable: false }, result: 'INCONCLUSIVE' as const, failure_reason: 'The verification read could not be completed.' }; }
  const fixture = adapter.capabilities.adapter_kind === 'TEST_ADAPTER';
  const evidenceId = await recordEvidence(c, { entity_kind: 'downstream_action', entity_id: row.id, origin: 'CONNECTOR', method: result.method, content_digest: digest({ expected: result.expected, observed: result.observed, result: result.result }),
    package_row_id: run.package_row_id, requirement_ids: (run.configuration.requirement_ids as string[] | undefined) ?? [], summary: { verifier: result.verifier, result: result.result, action_type: row.action_type, adapter: adapter.name, test_adapter: fixture }, fixture });
  await c.tx.query(`INSERT INTO app.action_verifications(tenant_id,legal_entity_id,environment_id,id,action_id,method,verifier,expected,observed,result,failure_reason,evidence_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [...scope(c), randomUUID(), row.id, result.method, result.verifier, result.expected, result.observed, result.result, result.failure_reason, evidenceId]);
  if (result.result === 'PASS') {
    await setAction(c, row.id, { state: 'verified', verification: 'VERIFIED', last_error_code: null });
    if (row.action_type === 'ERASE' || row.action_type === 'ANONYMISE') await emit(c, 'erasure_action_verified', 'downstream_action', row.id, { run_id: run.id }, run.id);
  } else if (result.result === 'FAIL') {
    await setAction(c, row.id, { state: 'failed', verification: 'FAILED', last_error_code: 'VERIFICATION_FAILED' });
    await emit(c, 'verification_failed', 'downstream_action', row.id, { run_id: run.id, reason: result.failure_reason }, run.id);
    if (row.action_type === 'ERASE' || row.action_type === 'ANONYMISE') await emit(c, 'erasure_action_failed', 'downstream_action', row.id, { run_id: run.id, reason: 'VERIFICATION_FAILED' }, run.id);
  } else {
    await setAction(c, row.id, { state: 'inconclusive', verification: 'INCONCLUSIVE', last_error_code: 'VERIFICATION_INCONCLUSIVE' });
    await emit(c, 'verification_failed', 'downstream_action', row.id, { run_id: run.id, inconclusive: true }, run.id);
  }
  return result.result;
}

/** One bounded batch. Safe to call repeatedly: settled actions are never re-run. */
export async function executeRun(c: Context, env: OperationsEnv, id: string, input: unknown) {
  const value = O.RunExecute.parse(input);
  if (!env.targets) refuse(409, 'targets', 'connector_targets_unavailable');
  const s = scope(c);
  const run = (await c.tx.query(`SELECT * FROM app.workflow_runs WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, id])).rows[0];
  if (!run) refuse(404, 'id', 'not_found');
  if (!['APPROVED', 'RUNNING', 'PARTIALLY_FAILED'].includes(run.status)) refuse(409, 'status', run.status === 'DRY_RUN_READY' ? 'run_requires_approval' : 'run_is_not_executable');
  if (run.status === 'APPROVED') await c.tx.query(`UPDATE app.workflow_runs SET status='RUNNING',started_at=COALESCE(started_at,clock_timestamp()),updated_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...s, id]);
  // Pending work first; then actions interrupted mid-flight; then bounded retries of transient failures and re-verification.
  const rows = (await c.tx.query(`SELECT * FROM app.downstream_actions WHERE ${predicate} AND run_id=$4 AND action_type<>'DISPOSITION_CONFIRMATION' AND (
      state IN ('pending','executing','succeeded_unverified') OR (state='failed' AND last_error_code=ANY($5::text[]) AND attempts<$6) OR (state='inconclusive' AND verification<>'VERIFIED' AND attempts<$6))
    ORDER BY ordinal LIMIT $7 FOR UPDATE`, [...s, id, [...RETRYABLE], MAX_ATTEMPTS, value.limit])).rows as ActionRow[];
  const bindingRows = (await c.tx.query(`SELECT system_id,adapter,holds_data_categories FROM app.connector_bindings WHERE ${predicate} AND valid_to IS NULL AND system_id=ANY($4::uuid[])`, [...s, [...new Set(rows.map(r => r.system_id).filter(Boolean))]])).rows;
  const binding = new Map(bindingRows.map(b => [b.system_id, b]));
  for (const row of rows) {
    const bound = binding.get(row.system_id);
    const adapter = adapterFor(bound?.adapter);
    if (!adapter || !adapter.supports(row.action_type as never)) { await setAction(c, row.id, { state: 'not_supported', target_result: 'NOT_SUPPORTED' }); continue; }
    // A hold recorded after approval still stops an irreversible action.
    if (row.action_type === 'ERASE' || row.action_type === 'ANONYMISE') {
      const activityIds = (await c.tx.query(`SELECT DISTINCT activity_id FROM app.registry_activity_links WHERE ${predicate} AND link_kind='SYSTEM' AND valid_to IS NULL AND system_id=$4`, [...s, row.system_id])).rows.map(r => r.activity_id);
      const holds = await coveringHolds(c, row.subject_id, row.system_id, bound.holds_data_categories ?? [], activityIds);
      if (holds.length && row.target_result === 'NONE') { await setAction(c, row.id, { state: 'blocked', block_reason: 'BLOCKED_BY_RECORDED_HOLD', hold_ids: holds }); continue; }
    }
    const payload = row.action_type === 'CORRECT' ? (await c.tx.query(`SELECT payload FROM app.downstream_action_payloads WHERE ${predicate} AND action_id=$4`, [...s, row.id])).rows[0]?.payload ?? null : null;
    if (row.action_type === 'CORRECT' && !payload) { await setAction(c, row.id, { state: 'failed', last_error_code: 'PAYLOAD_PURGED_BEFORE_EXECUTION' }); continue; }
    const connectorAction: ConnectorAction = { idempotency_key: row.idempotency_key, action_type: row.action_type as ConnectorAction['action_type'], system_id: row.system_id!, target_reference: row.target_reference!, payload };
    // A completed target call whose verification was inconclusive is re-verified, not re-executed.
    const reverifyOnly = row.state === 'succeeded_unverified' || (row.state === 'inconclusive' && row.target_result !== 'NONE' && row.target_result !== 'FAILED');
    if (!reverifyOnly) {
      const attempt = row.attempts + 1;
      await setAction(c, row.id, { state: 'executing', attempts: attempt, requested_at: new Date() });
      await c.tx.query(`INSERT INTO app.downstream_action_attempts(tenant_id,legal_entity_id,environment_id,id,action_id,attempt,dispatched_at,target_result,actor_id) VALUES($1,$2,$3,$4,$5,$6,clock_timestamp(),'DISPATCHED',$7)`,
        [...s, randomUUID(), row.id, attempt, c.actor.actor_id]);
      let result;
      try { result = await adapter.execute(env.targets, c.actor, connectorAction); }
      catch { result = { target_result: 'TIMEOUT_EFFECT_UNKNOWN' as const, replayed: false, error_code: 'CONNECTOR_CALL_FAILED', response_digest: null }; }
      await c.tx.query(`INSERT INTO app.downstream_action_attempts(tenant_id,legal_entity_id,environment_id,id,action_id,attempt,dispatched_at,completed_at,target_result,replayed,error_code,target_response_digest,actor_id)
        VALUES($1,$2,$3,$4,$5,$6,clock_timestamp(),clock_timestamp(),$7,$8,$9,$10,$11)`, [...s, randomUUID(), row.id, attempt, result.target_result, result.replayed, result.error_code, result.response_digest, c.actor.actor_id]);
      if (row.action_type === 'ERASE' || row.action_type === 'ANONYMISE') await emit(c, 'erasure_action_executed', 'downstream_action', row.id, { run_id: id, target_result: result.target_result, replayed: result.replayed }, id);
      if (result.target_result === 'NOT_SUPPORTED') { await setAction(c, row.id, { state: 'not_supported', target_result: 'NOT_SUPPORTED' }); continue; }
      if (result.target_result === 'FAILED' || result.target_result === 'NOT_FOUND') {
        await setAction(c, row.id, { state: 'failed', target_result: result.target_result, last_error_code: result.error_code });
        if (row.action_type === 'ERASE' || row.action_type === 'ANONYMISE') await emit(c, 'erasure_action_failed', 'downstream_action', row.id, { run_id: id, reason: result.error_code }, id);
        continue;
      }
      await setAction(c, row.id, { state: result.target_result === 'TIMEOUT_EFFECT_UNKNOWN' ? 'inconclusive' : 'succeeded_unverified', target_result: result.target_result, target_response_reference: result.response_digest, last_error_code: result.error_code });
    }
    await verifyAction(c, env, run, row, connectorAction, bound.adapter);
    const settled = (await c.tx.query(`SELECT state FROM app.downstream_actions WHERE ${predicate} AND id=$4`, [...s, row.id])).rows[0].state;
    // A settled correction no longer needs the corrected value; only its digest remains.
    if (settled === 'verified' || (settled === 'failed')) await c.tx.query(`DELETE FROM app.downstream_action_payloads WHERE ${predicate} AND action_id=$4`, [...s, row.id]);
  }
  await settleRun(c, id);
  await audit(c, 'workflow_run.execute', id);
  return runView(c, id);
}

/** Recomputes a run's status from its actions and feeds dependent records. */
export async function settleRun(c: Context, id: string) {
  const s = scope(c);
  const run = (await c.tx.query(`SELECT * FROM app.workflow_runs WHERE ${predicate} AND id=$4`, [...s, id])).rows[0];
  const actions = (await c.tx.query(`SELECT * FROM app.downstream_actions WHERE ${predicate} AND run_id=$4 ORDER BY ordinal`, [...s, id])).rows;
  if (run.kind === 'RETENTION_ERASURE') {
    await c.tx.query(`UPDATE app.retention_states rs SET state=CASE WHEN a.all_verified THEN 'ERASED' WHEN a.any_failed THEN 'FAILED' ELSE rs.state END
      FROM (SELECT subject_id,bool_and(state='verified') all_verified,bool_or(state IN ('failed','inconclusive')) any_failed FROM app.downstream_actions
        WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND run_id=$4 GROUP BY subject_id) a
      WHERE rs.tenant_id=$1 AND rs.legal_entity_id=$2 AND rs.environment_id=$3 AND rs.run_id=$4 AND rs.subject_id=a.subject_id AND rs.rule_id=$5 AND (a.all_verified OR a.any_failed)`,
    [...s, id, run.retention_rule_id]);
  }
  if (!['RUNNING', 'PARTIALLY_FAILED', 'APPROVED'].includes(run.status)) return;
  const open = actions.some(a => !SETTLED.has(a.state) || (a.state === 'failed' && RETRYABLE.has(a.last_error_code) && a.attempts < MAX_ATTEMPTS));
  if (open) return;
  // The V1 request receives outcomes only once nothing is still in flight, so it never records a premature failure.
  if (run.rights_request_id && c.actor.actor_domain === 'STAFF') await syncRightsOutcomes(c, run.rights_request_id, actions);
  const status = actions.length && actions.every(a => a.state === 'verified') ? 'COMPLETED_VERIFIED'
    : actions.some(a => a.state === 'failed' || a.state === 'inconclusive') ? 'PARTIALLY_FAILED' : 'COMPLETED_WITH_EXCEPTIONS';
  await c.tx.query(`UPDATE app.workflow_runs SET status=$4,ended_at=CASE WHEN $4='PARTIALLY_FAILED' THEN NULL ELSE clock_timestamp() END,updated_at=clock_timestamp() WHERE ${predicate} AND id=$5`, [...s, status, id]);
  await recordEvidence(c, { entity_kind: 'workflow_run', entity_id: id, origin: 'SYSTEM', method: 'RUN_FINAL_STATE', content_digest: digest(actions.map(a => [a.ordinal, a.state, a.verification])),
    package_row_id: run.package_row_id, requirement_ids: run.configuration.requirement_ids ?? [], summary: { status, actions: actions.length }, fixture: false });
  if (run.rights_request_id && status !== 'PARTIALLY_FAILED') await emit(c, 'rights_request_updated', 'rights_request', run.rights_request_id, { run_id: id, run_status: status });
}

const OUTCOME: Record<string, { result: string; method: string; evidence: boolean; note: string }> = {
  verified: { result: 'SUCCEEDED', method: 'CONNECTOR_OPERATION', evidence: true, note: 'Executed through the connector and confirmed by independent read-back.' },
  failed: { result: 'FAILED', method: 'CONNECTOR_OPERATION', evidence: true, note: 'Attempted through the connector; the action failed or its effect was not observed.' },
  inconclusive: { result: 'EFFECT_UNKNOWN', method: 'CONNECTOR_OPERATION', evidence: true, note: 'Attempted through the connector; the effect could not be confirmed either way.' },
  not_supported: { result: 'NOT_SUPPORTED', method: 'NONE', evidence: false, note: 'The system has no supported connector operation for this action.' },
  blocked: { result: 'MANUAL_REQUIRED', method: 'NONE', evidence: false, note: 'Not executed: blocked by a recorded hold, a missing reference or an unresolved source; a person must decide.' },
};
/** Feeds the V1 rights request with one outcome per system, taken from the settled action. */
async function syncRightsOutcomes(c: Context, requestId: string, actions: { id: string; system_id: string | null; state: string; v1_outcome_synced: boolean }[]) {
  const s = scope(c);
  let changed = false;
  for (const action of actions) {
    const mapping = OUTCOME[action.state];
    if (!mapping || action.v1_outcome_synced || !action.system_id) continue;
    const request = (await c.tx.query(`SELECT state FROM app.rights_requests WHERE ${predicate} AND id=$4`, [...s, requestId])).rows[0];
    if (!['EXECUTING', 'PARTIALLY_COMPLETED'].includes(request.state)) break;
    if ((await c.tx.query(`SELECT 1 FROM app.rights_request_outcomes WHERE ${predicate} AND request_id=$4 AND system_id=$5`, [...s, requestId, action.system_id])).rowCount) { await setAction(c, action.id, { v1_outcome_synced: true }); continue; }
    const evidence = mapping.evidence ? (await c.tx.query(`SELECT id FROM app.evidence_records WHERE ${predicate} AND entity_kind='downstream_action' AND entity_id=$4 ORDER BY recorded_at DESC LIMIT 1`, [...s, action.id])).rows[0]?.id : null;
    await c.tx.query(`INSERT INTO app.rights_request_outcomes(tenant_id,legal_entity_id,environment_id,request_id,system_id,result,method,evidence_reference,note,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [...s, requestId, action.system_id, mapping.result, mapping.method, mapping.evidence ? `evidence-record:${evidence ?? action.id}` : null, mapping.note, c.actor.actor_id]);
    await setAction(c, action.id, { v1_outcome_synced: true });
    changed = true;
  }
  if (changed) await settleExecution(c, requestId);
}
