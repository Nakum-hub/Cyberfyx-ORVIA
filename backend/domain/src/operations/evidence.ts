import * as O from '../../../../shared/contracts/src/operations.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { decisionView } from '../regulatory/applicability.ts';
import { actionView, runView } from './runs.ts';
import { iso, packageById, pageOf, predicate, refuse, scope, only } from './shared.ts';

/**
 * Evidence (security s4-s5, s11-s12; integrations s15). Evidence records are
 * append-only references with origin, method, actor and integrity digest. The
 * evidence package for a workflow run is assembled from recorded rows only, and
 * producing it is an audited export held by the export capability.
 */
type EvidenceRow = { id: string; entity_kind: string; entity_id: string; origin: string; method: string; actor_id: string; recorded_at: Date; content_digest: string | null; integrity_state: string;
  package_row_id: string | null; requirement_ids: string[]; summary: Record<string, unknown>; supersedes: string | null; fixture: boolean };
const evidenceView = (e: EvidenceRow) => O.EvidenceRecord.parse({ ...only(O.EvidenceRecord, e), recorded_at: iso(e.recorded_at) });

export async function evidenceList(c: Context, page: Page, query: unknown) {
  const q = (query ?? {}) as { requirement_id?: string; entity_id?: string };
  const rows = (await c.tx.query(`SELECT * FROM app.evidence_records WHERE ${predicate} AND ($4::text IS NULL OR $4=ANY(requirement_ids)) AND ($5::uuid IS NULL OR entity_id=$5)
    AND ($6::uuid IS NULL OR id>$6) ORDER BY id LIMIT $7`, [...scope(c), q.requirement_id ?? null, q.entity_id ?? null, page.cursor, page.limit + 1])).rows as EvidenceRow[];
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(evidenceView), next_cursor: paged.next_cursor };
}

export async function eventList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.operational_events WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(e => O.OperationalEvent.parse({ id: e.id, event_type: e.event_type, subject_kind: e.subject_kind, subject_id: e.subject_id, payload: e.payload, occurred_at: iso(e.occurred_at), actor_id: e.actor_id, correlation_id: e.correlation_id })), next_cursor: paged.next_cursor };
}

export async function evidencePackage(c: Context, id: string) {
  const s = scope(c);
  const run = await runView(c, id);
  const row = (await c.tx.query(`SELECT package_row_id FROM app.workflow_runs WHERE ${predicate} AND id=$4`, [...s, id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  const pkg = await packageById(c, row.package_row_id);
  const actionRows = (await c.tx.query(`SELECT * FROM app.downstream_actions WHERE ${predicate} AND run_id=$4 ORDER BY ordinal LIMIT 5000`, [...s, id])).rows;
  const actions = [];
  for (const action of actionRows) actions.push(await actionView(c, action));
  const requirementIds = (run.configuration.requirement_ids as string[] | undefined) ?? [];
  const applicability = (await c.tx.query(`SELECT DISTINCT ON (requirement_id,scope_kind,scope_id) * FROM app.applicability_decisions WHERE ${predicate} AND package_row_id=$4 AND requirement_id=ANY($5::text[])
    ORDER BY requirement_id,scope_kind,scope_id,evaluated_at DESC LIMIT 100`, [...s, pkg.id, requirementIds])).rows;
  const holdIds = [...new Set(actionRows.flatMap(a => a.hold_ids as string[]))];
  const holds = holdIds.length ? (await c.tx.query(`SELECT id,hold_type,authority_reference,state FROM app.retention_holds WHERE ${predicate} AND id=ANY($4::uuid[])`, [...s, holdIds])).rows : [];
  const approvals = run.approval ? [run.approval] : [];
  const evidence = (await c.tx.query(`SELECT id,entity_kind,method,content_digest,recorded_at,fixture FROM app.evidence_records WHERE ${predicate} AND (entity_id=$4 OR entity_id=ANY($5::uuid[])) ORDER BY recorded_at LIMIT 5000`,
    [...s, id, actionRows.map(a => a.id)])).rows;
  const communications = run.rights_request_id ? (await c.tx.query(`SELECT 'RIGHTS_RESPONSE' source,document->>'delivery_reference' reference,updated_at recorded_at FROM app.rights_requests WHERE ${predicate} AND id=$4 AND response='RELEASED'`, [...s, run.rights_request_id])).rows : [];
  const body = {
    package_kind: 'ORVIA_WORKFLOW_EVIDENCE_PACKAGE' as const, generated_at: new Date().toISOString(), run,
    regulatory_package: { id: pkg.id, version: pkg.version, distribution: pkg.distribution, package_digest: pkg.package_digest, effective_from: iso(pkg.effective_from)! },
    trigger: run.trigger, applicability: applicability.map(decisionView), approvals, actions,
    holds, communications: communications.filter(x => x.reference).map(x => ({ source: x.source, reference: x.reference, recorded_at: iso(x.recorded_at) })),
    evidence: evidence.map(e => ({ id: e.id, entity_kind: e.entity_kind, method: e.method, content_digest: e.content_digest, recorded_at: iso(e.recorded_at), fixture: e.fixture })),
    final_state: run.status, fixture_content: pkg.distribution === 'TEST_FIXTURE' || evidence.some(e => e.fixture),
    integrity_limit: 'The digest detects change relative to this export; it does not prove the target effects it describes beyond the recorded verifications.' as const,
  };
  await audit(c, 'workflow_run.evidence_export', id);
  return O.EvidencePackage.parse({ ...body, integrity_digest: digest(body) });
}
