import * as O from '../../../../shared/contracts/src/operations.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { emit, inForce, iso, packageAt, packageById, pageOf, predicate, refuse, scope } from './shared.ts';

/**
 * Rights case profiles (domain model s18). A V1 rights request gains the
 * regulatory package that was in effect when it was received and the due time
 * that package's requirements give that right. The pin is computed from the
 * receipt time, so opening the profile later yields the same answer.
 */
export async function openCaseProfile(c: Context, requestId: string, input: unknown) {
  const value = O.CaseProfileOpen.parse(input);
  const s = scope(c);
  const request = (await c.tx.query(`SELECT right_type,received_at,principal_id FROM app.rights_requests WHERE ${predicate} AND id=$4`, [...s, requestId])).rows[0];
  if (!request) refuse(404, 'id', 'not_found');
  if ((await c.tx.query(`SELECT 1 FROM app.rights_case_profiles WHERE ${predicate} AND rights_request_id=$4`, [...s, requestId])).rowCount) return caseProfile(c, requestId);
  if (value.subject_id) {
    const subject = (await c.tx.query(`SELECT principal_id FROM app.data_principals WHERE ${predicate} AND id=$4`, [...s, value.subject_id])).rows[0];
    if (!subject) refuse(404, 'subject_id', 'not_found');
    if (subject.principal_id !== request.principal_id) refuse(409, 'subject_id', 'subject_is_not_the_requesting_principal');
  }
  const pkg = await packageAt(c, request.received_at);
  let dueAt: Date | null = null; let basis = 'No approved regulatory package was in effect when this request was received.'; let status = 'NO_ACTIVE_PACKAGE';
  let requirementId: string | null = null; let requirementVersion: number | null = null;
  if (pkg) {
    const requirement = pkg.claims.requirements.find(r => r.rights_timer_scope.includes(request.right_type) && r.timer.kind === 'HOURS' && r.timer.runs_from === 'RECEIPT');
    status = 'APPLICABLE';
    basis = `Package ${pkg.version} in effect at receipt sets no time limit for a ${request.right_type.toLowerCase()} request.`;
    if (requirement && requirement.timer.kind === 'HOURS') {
      dueAt = new Date(request.received_at.getTime() + requirement.timer.hours * 3_600_000);
      requirementId = requirement.requirement_id; requirementVersion = requirement.version;
      status = inForce(requirement, request.received_at) ? 'APPLICABLE' : 'NOT_YET_IN_FORCE';
      basis = `${requirement.requirement_id} v${requirement.version}: within ${requirement.timer.hours} hours of receipt${status === 'NOT_YET_IN_FORCE' ? '; the requirement was not yet in force at receipt, so this is a preparation deadline' : ''}.`;
    }
  }
  await c.tx.query(`INSERT INTO app.rights_case_profiles(tenant_id,legal_entity_id,environment_id,rights_request_id,package_row_id,subject_id,due_at,due_basis,legal_status,requirement_id,requirement_version,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [...s, requestId, pkg?.id ?? null, value.subject_id, dueAt, basis, status, requirementId, requirementVersion, c.actor.actor_id]);
  await emit(c, 'rights_request_received', 'rights_request', requestId, { package_version: pkg?.version ?? null, due_at: iso(dueAt) });
  await audit(c, 'rights_case_profile.open', requestId);
  return caseProfile(c, requestId);
}

export async function caseProfile(c: Context, requestId: string) {
  const s = scope(c);
  const row = (await c.tx.query(`SELECT p.*,r.right_type,r.received_at,r.state FROM app.rights_case_profiles p JOIN app.rights_requests r ON r.tenant_id=p.tenant_id AND r.legal_entity_id=p.legal_entity_id AND r.environment_id=p.environment_id AND r.id=p.rights_request_id
    WHERE p.tenant_id=$1 AND p.legal_entity_id=$2 AND p.environment_id=$3 AND p.rights_request_id=$4`, [...s, requestId])).rows[0];
  if (!row) refuse(404, 'id', 'no_case_profile');
  const pkg = row.package_row_id ? await packageById(c, row.package_row_id) : null;
  const runs = (await c.tx.query(`SELECT id FROM app.workflow_runs WHERE ${predicate} AND rights_request_id=$4 ORDER BY created_at LIMIT 50`, [...s, requestId])).rows.map(r => r.id);
  return O.CaseProfile.parse({ rights_request_id: requestId, right_type: row.right_type, received_at: iso(row.received_at), package: pkg ? { id: pkg.id, version: pkg.version, distribution: pkg.distribution } : null,
    subject_id: row.subject_id, due_at: iso(row.due_at), due_basis: row.due_basis, legal_status: row.legal_status, requirement_id: row.requirement_id,
    overdue: row.due_at !== null && row.due_at.getTime() < Date.now() && !['CLOSED', 'COMPLETED', 'REJECTED'].includes(row.state), run_ids: runs, recorded_at: iso(row.recorded_at) });
}
export async function caseProfileList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT rights_request_id FROM app.rights_case_profiles WHERE ${predicate} AND ($4::uuid IS NULL OR rights_request_id>$4) ORDER BY rights_request_id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.rights_request_id);
  const items = [];
  for (const row of paged.items) items.push(await caseProfile(c, row.rights_request_id));
  return { items, next_cursor: paged.next_cursor };
}
