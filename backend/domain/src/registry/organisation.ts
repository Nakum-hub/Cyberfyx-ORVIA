import { randomUUID } from 'node:crypto';
import * as R from '../../../../shared/contracts/src/registry.ts';
import { audit, type Context } from '../shared/transaction.ts';
import { emit, inForce, iso, packageAt, predicate, recordEvidence, refuse, scope, type RequirementClaim, only } from '../operations/shared.ts';

/**
 * Organisation profile and Significant Data Fiduciary mode (requirements s22).
 *
 * SDF status is a recorded fact with the Central Government reference that
 * established it; UNKNOWN is a valid value and no customer is treated as an SDF
 * by default. Obligations exist only while a designation is recorded, are
 * created from the requirements of the package in force, and are closed (never
 * deleted) if the designation ends, so their history survives.
 */
type ProfileRow = { id: string; version: number; sdf_status: string; sdf_designation_reference: string | null; dpo_contact: string | null; grievance_contact: string | null;
  independent_auditor_reference: string | null; facts: { third_schedule_class: string }; effective_from: Date; reason: string; recorded_at: Date; recorded_by: string };
const profileFields = (p: ProfileRow) => ({ id: p.id, version: p.version, sdf_status: p.sdf_status, sdf_designation_reference: p.sdf_designation_reference, dpo_contact: p.dpo_contact,
  grievance_contact: p.grievance_contact, independent_auditor_reference: p.independent_auditor_reference, facts: p.facts, effective_from: iso(p.effective_from), reason: p.reason,
  recorded_at: iso(p.recorded_at), recorded_by: p.recorded_by });

type ObligationRow = { id: string; requirement_id: string; kind: string; period_start: Date; due_at: Date | null; legal_status: string; state: string; completed_at: Date | null; evidence_reference: string | null; closure_reason: string | null; package_row_id: string };
const obligationView = (o: ObligationRow) => R.SdfObligation.parse({ ...only(R.SdfObligation, o), period_start: iso(o.period_start), due_at: iso(o.due_at), completed_at: iso(o.completed_at),
  overdue: o.state === 'OPEN' && o.due_at !== null && o.due_at.getTime() < Date.now() });

function dueFrom(requirement: RequirementClaim, start: Date) {
  return requirement.timer.kind === 'HOURS' ? new Date(start.getTime() + requirement.timer.hours * 3_600_000) : null;
}
async function createObligations(c: Context, profileId: string, start: Date) {
  // Without a package in force there is nothing official to derive obligations from; the gap is surfaced by Attention.
  const pkg = await packageAt(c, new Date());
  if (!pkg) return;
  for (const requirement of pkg.claims.requirements.filter(r => r.sdf_obligation_kind)) {
    await c.tx.query(`INSERT INTO app.sdf_obligations(tenant_id,legal_entity_id,environment_id,id,profile_version_id,package_row_id,requirement_id,kind,period_start,due_at,legal_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [...scope(c), randomUUID(), profileId, pkg.id, requirement.requirement_id, requirement.sdf_obligation_kind, start, dueFrom(requirement, start), inForce(requirement, new Date()) ? 'APPLICABLE' : 'NOT_YET_IN_FORCE']);
  }
}

export async function setOrganisationProfile(c: Context, input: unknown) {
  const value = R.OrganisationProfileSet.parse(input);
  if (value.sdf_status === 'DESIGNATED' && !value.sdf_designation_reference) refuse(400, 'sdf_designation_reference', 'designation_is_recorded_with_its_reference');
  const s = scope(c);
  // Profile versions are append-only (no UPDATE grant), so serialise writers with an advisory lock rather than a row lock.
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([...s, 'organisation_profile'])]);
  const previous = (await c.tx.query(`SELECT * FROM app.organisation_profile_versions WHERE ${predicate} ORDER BY version DESC LIMIT 1`, s)).rows[0] as ProfileRow | undefined;
  if (previous && Date.parse(value.effective_from) < previous.effective_from.getTime()) refuse(400, 'effective_from', 'must_not_precede_current_profile');
  const id = randomUUID();
  const row = (await c.tx.query(`INSERT INTO app.organisation_profile_versions(tenant_id,legal_entity_id,environment_id,id,version,sdf_status,sdf_designation_reference,dpo_contact,grievance_contact,independent_auditor_reference,facts,effective_from,reason,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
  [...s, id, (previous?.version ?? 0) + 1, value.sdf_status, value.sdf_designation_reference, value.dpo_contact, value.grievance_contact, value.independent_auditor_reference, value.facts, value.effective_from, value.reason, c.actor.actor_id])).rows[0] as ProfileRow;
  const was = previous?.sdf_status ?? 'UNKNOWN';
  if (was !== value.sdf_status) {
    await emit(c, 'sdf_status_changed', 'organisation_profile', id, { from: was, to: value.sdf_status });
    await recordEvidence(c, { entity_kind: 'organisation_profile', entity_id: id, origin: 'OPERATOR', method: 'SDF_STATUS_RECORD', content_digest: null, package_row_id: null, requirement_ids: [],
      summary: { from: was, to: value.sdf_status, designation_reference: value.sdf_designation_reference }, fixture: false });
    if (value.sdf_status === 'DESIGNATED') await createObligations(c, id, new Date(value.effective_from));
    if (was === 'DESIGNATED') await c.tx.query(`UPDATE app.sdf_obligations SET state='NOT_APPLICABLE',closure_reason=$4 WHERE ${predicate} AND state='OPEN'`,
      [...s, `SDF designation no longer recorded from ${value.effective_from} (profile version ${row.version}).`]);
  }
  await audit(c, 'organisation_profile.set', id);
  return profileView(c, row);
}

async function profileView(c: Context, row: ProfileRow) {
  const obligations = (await c.tx.query(`SELECT * FROM app.sdf_obligations WHERE ${predicate} ORDER BY created_at DESC LIMIT 100`, scope(c))).rows as ObligationRow[];
  return R.OrganisationProfile.parse({ ...profileFields(row), sdf_obligations: obligations.map(obligationView) });
}
export async function organisationProfile(c: Context) {
  const rows = (await c.tx.query(`SELECT * FROM app.organisation_profile_versions WHERE ${predicate} ORDER BY version DESC LIMIT 100`, scope(c))).rows as ProfileRow[];
  return R.OrganisationProfileView.parse({ current: rows[0] ? await profileView(c, rows[0]) : null, history: rows.map(profileFields) });
}

/** Completing a periodic obligation opens the next period from its completion. */
export async function completeSdfObligation(c: Context, id: string, input: unknown) {
  const value = R.SdfObligationComplete.parse(input);
  const s = scope(c);
  const row = (await c.tx.query(`SELECT * FROM app.sdf_obligations WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  if (row.state !== 'OPEN') refuse(409, 'state', 'obligation_not_open');
  const updated = (await c.tx.query(`UPDATE app.sdf_obligations SET state='COMPLETED',completed_at=clock_timestamp(),evidence_reference=$4 WHERE ${predicate} AND id=$5 RETURNING *`, [...s, value.evidence_reference, id])).rows[0] as ObligationRow;
  if (row.kind === 'PERIODIC_DPIA' || row.kind === 'PERIODIC_AUDIT') {
    const pkg = await packageAt(c, new Date());
    const requirement = pkg?.claims.requirements.find(r => r.requirement_id === row.requirement_id);
    const designated = (await c.tx.query(`SELECT sdf_status FROM app.organisation_profile_versions WHERE ${predicate} ORDER BY version DESC LIMIT 1`, s)).rows[0]?.sdf_status === 'DESIGNATED';
    if (pkg && requirement && designated) await c.tx.query(`INSERT INTO app.sdf_obligations(tenant_id,legal_entity_id,environment_id,id,profile_version_id,package_row_id,requirement_id,kind,period_start,due_at,legal_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [...s, randomUUID(), row.profile_version_id, pkg.id, row.requirement_id, row.kind, updated.completed_at, dueFrom(requirement, updated.completed_at!), inForce(requirement, new Date()) ? 'APPLICABLE' : 'NOT_YET_IN_FORCE']);
  }
  await recordEvidence(c, { entity_kind: 'sdf_obligation', entity_id: id, origin: 'OPERATOR', method: 'OBLIGATION_COMPLETION', content_digest: null, package_row_id: row.package_row_id, requirement_ids: [row.requirement_id], summary: { kind: row.kind, evidence_reference: value.evidence_reference }, fixture: false });
  await audit(c, 'sdf_obligation.complete', id);
  return obligationView(updated);
}
