import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { ApplicabilityEvaluate, ApplicabilityOverride, type ApplicabilityExpressionValue } from '../../../../shared/contracts/src/regulatory.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { emit, inForce, iso, packageAt, pageOf, predicate, refuse, scope, type RequirementClaim, only } from '../operations/shared.ts';

/**
 * Applicability (regulatory/DPDP_REGULATORY_CORE.md s8). Three-valued: a fact
 * that is not recorded makes the answer UNRESOLVED. The evaluator never supplies
 * a default for a missing customer fact, and a requirement whose effective date
 * has not arrived is NOT_YET_IN_FORCE whatever its expression says.
 */
export type Facts = Record<string, string | boolean | null>;
type Truth = 'TRUE' | 'FALSE' | 'UNKNOWN';

export function evaluateExpression(expression: ApplicabilityExpressionValue, facts: Facts, trace: string[]): Truth {
  const node = expression as Record<string, unknown>;
  if ('always' in node) { trace.push('always applies'); return 'TRUE'; }
  if ('fact' in node) {
    const name = node.fact as string;
    const value = facts[name];
    if (value === null || value === undefined) { trace.push(`${name} is not recorded: unresolved`); return 'UNKNOWN'; }
    const result = 'equals' in node ? value === node.equals : (node.in as unknown[]).includes(value);
    trace.push(`${name}=${String(value)} ${'equals' in node ? '== ' + String(node.equals) : 'in [' + (node.in as unknown[]).join(',') + ']'}: ${result}`);
    return result ? 'TRUE' : 'FALSE';
  }
  if ('not' in node) {
    const inner = evaluateExpression(node.not as ApplicabilityExpressionValue, facts, trace);
    return inner === 'UNKNOWN' ? 'UNKNOWN' : inner === 'TRUE' ? 'FALSE' : 'TRUE';
  }
  const parts = ((node.all ?? node.any) as ApplicabilityExpressionValue[]).map(part => evaluateExpression(part, facts, trace));
  if ('all' in node) return parts.includes('FALSE') ? 'FALSE' : parts.includes('UNKNOWN') ? 'UNKNOWN' : 'TRUE';
  return parts.includes('TRUE') ? 'TRUE' : parts.includes('UNKNOWN') ? 'UNKNOWN' : 'FALSE';
}

export function decide(requirement: RequirementClaim, facts: Facts, asOf: Date) {
  const trace: string[] = [];
  const truth = evaluateExpression(requirement.applicability as ApplicabilityExpressionValue, facts, trace);
  if (!inForce(requirement, asOf)) {
    trace.push(`effective from ${requirement.effective_from}; not yet in force at ${asOf.toISOString()}`);
    return { result: 'NOT_YET_IN_FORCE' as const, trace };
  }
  return { result: truth === 'TRUE' ? 'APPLICABLE' as const : truth === 'FALSE' ? 'NOT_APPLICABLE' as const : 'UNRESOLVED' as const, trace };
}

/** Reads only recorded facts. Absence of a record is unknown, not false. */
export async function gatherFacts(c: Context, scopeKind: 'ORGANISATION' | 'ACTIVITY', scopeId: string | null, asOf: Date): Promise<Facts> {
  const profile = (await c.tx.query(`SELECT sdf_status,facts FROM app.organisation_profile_versions WHERE ${predicate} AND effective_from<=$4 ORDER BY version DESC LIMIT 1`, [...scope(c), asOf])).rows[0];
  const facts: Facts = {
    'organisation.sdf_status': profile && profile.sdf_status !== 'UNKNOWN' ? profile.sdf_status : null,
    'organisation.third_schedule_class': profile && profile.facts?.third_schedule_class !== 'UNKNOWN' ? profile.facts.third_schedule_class : null,
    'activity.condition_code': null, 'activity.processes_child_data': null, 'activity.has_processor': null, 'activity.has_active_relationships': null,
  };
  if (scopeKind === 'ORGANISATION') return facts;
  const activity = (await c.tx.query(`SELECT processes_child_data FROM app.registry_activities WHERE ${predicate} AND id=$4`, [...scope(c), scopeId])).rows[0];
  if (!activity) refuse(404, 'scope_id', 'not_found');
  const version = (await c.tx.query(`SELECT c.code,c.unresolved FROM app.registry_activity_versions v LEFT JOIN app.processing_conditions c
      ON c.tenant_id=v.tenant_id AND c.legal_entity_id=v.legal_entity_id AND c.environment_id=v.environment_id AND c.id=v.condition_id
    WHERE v.tenant_id=$1 AND v.legal_entity_id=$2 AND v.environment_id=$3 AND v.activity_id=$4 AND v.effective_from<=$5 AND (v.effective_to IS NULL OR v.effective_to>$5)
    ORDER BY v.version DESC LIMIT 1`, [...scope(c), scopeId, asOf])).rows[0];
  facts['activity.condition_code'] = version?.code && !version.unresolved ? version.code : null;
  facts['activity.processes_child_data'] = activity.processes_child_data === 'UNKNOWN' ? null : activity.processes_child_data === 'YES';
  const links = (await c.tx.query(`SELECT link_kind,principal_category_id FROM app.registry_activity_links WHERE ${predicate} AND activity_id=$4 AND valid_from<=$5 AND (valid_to IS NULL OR valid_to>$5)`,
    [...scope(c), scopeId, asOf])).rows;
  // A recorded engagement establishes a processor; no record leaves it unknown.
  facts['activity.has_processor'] = links.some(l => l.link_kind === 'PROCESSOR_ENGAGEMENT') ? true : null;
  const categories = links.filter(l => l.link_kind === 'PRINCIPAL_CATEGORY').map(l => l.principal_category_id);
  const active = categories.length ? (await c.tx.query(`SELECT 1 FROM app.data_principal_relationships WHERE ${predicate} AND category_id=ANY($4::uuid[]) AND status='ACTIVE' LIMIT 1`, [...scope(c), categories])).rowCount : 0;
  facts['activity.has_active_relationships'] = active ? true : null;
  return facts;
}

type DecisionRow = { id: string; package_row_id: string; requirement_id: string; requirement_version: number; scope_kind: 'ORGANISATION' | 'ACTIVITY'; scope_id: string | null;
  result: string; inputs: Record<string, string | boolean | null>; trace: string[]; as_of: Date; evaluated_at: Date; actor_id: string; override_of: string | null; override_basis: string | null };
export const decisionView = (row: DecisionRow) => S.schemas.ApplicabilityDecision.parse({ ...only(S.schemas.ApplicabilityDecision, row), as_of: iso(row.as_of), evaluated_at: iso(row.evaluated_at) });

/** Evaluates every requirement of the package in force at the chosen time and records each decision. */
export async function evaluateApplicability(c: Context, input: unknown) {
  const value = ApplicabilityEvaluate.parse(input);
  if ((value.scope_kind === 'ORGANISATION') !== (value.scope_id === null)) refuse(400, 'scope_id', 'organisation_scope_has_no_id');
  const asOf = value.as_of ? new Date(value.as_of) : new Date();
  const pkg = await packageAt(c, asOf);
  if (!pkg) refuse(409, 'regulatory_package', 'no_active_regulatory_package');
  const facts = await gatherFacts(c, value.scope_kind, value.scope_id, asOf);
  const decisions: ReturnType<typeof decisionView>[] = [];
  for (const requirement of pkg.claims.requirements) {
    const { result, trace } = decide(requirement, facts, asOf);
    const previous = (await c.tx.query(`SELECT result FROM app.applicability_decisions WHERE ${predicate} AND requirement_id=$4 AND scope_kind=$5 AND scope_id IS NOT DISTINCT FROM $6
      ORDER BY evaluated_at DESC LIMIT 1`, [...scope(c), requirement.requirement_id, value.scope_kind, value.scope_id])).rows[0];
    const row = (await c.tx.query(`INSERT INTO app.applicability_decisions(tenant_id,legal_entity_id,environment_id,id,package_row_id,requirement_id,requirement_version,scope_kind,scope_id,result,inputs,trace,expression_digest,as_of,actor_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [...scope(c), randomUUID(), pkg.id, requirement.requirement_id, requirement.version, value.scope_kind, value.scope_id, result, facts, JSON.stringify(trace), digest(requirement.applicability), asOf, c.actor.actor_id])).rows[0];
    if (previous && previous.result !== result) await emit(c, 'requirement_applicability_changed', value.scope_kind, value.scope_id, { requirement_id: requirement.requirement_id, from: previous.result, to: result });
    decisions.push(decisionView(row));
  }
  await audit(c, 'applicability.evaluate', value.scope_id ?? undefined);
  const summary = Object.fromEntries(S.schemas.ApplicabilityDecision.shape.result.options.map(r => [r, decisions.filter(d => d.result === r).length]));
  return { package_row_id: pkg.id, package_version: pkg.version, as_of: asOf.toISOString(), decisions, summary };
}

export async function applicabilityList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.applicability_decisions WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(decisionView), next_cursor: paged.next_cursor };
}

/** An exemption is a new decision that names its basis. The original is kept. */
export async function overrideApplicability(c: Context, input: unknown) {
  const value = ApplicabilityOverride.parse(input);
  const original = (await c.tx.query(`SELECT * FROM app.applicability_decisions WHERE ${predicate} AND id=$4`, [...scope(c), value.decision_id])).rows[0] as DecisionRow | undefined;
  if (!original) refuse(404, 'decision_id', 'not_found');
  if (original.override_of) refuse(409, 'decision_id', 'already_an_override');
  const row = (await c.tx.query(`INSERT INTO app.applicability_decisions(tenant_id,legal_entity_id,environment_id,id,package_row_id,requirement_id,requirement_version,scope_kind,scope_id,result,inputs,trace,expression_digest,as_of,actor_id,override_of,override_basis)
    SELECT tenant_id,legal_entity_id,environment_id,$4,package_row_id,requirement_id,requirement_version,scope_kind,scope_id,'EXEMPT_WITH_RECORDED_BASIS',inputs,
      trace||to_jsonb($5::text),expression_digest,as_of,$6,id,$5 FROM app.applicability_decisions WHERE ${predicate} AND id=$7 RETURNING *`,
  [...scope(c), randomUUID(), `exemption recorded: ${value.basis}`, c.actor.actor_id, value.decision_id])).rows[0];
  await emit(c, 'requirement_applicability_changed', original.scope_kind, original.scope_id, { requirement_id: original.requirement_id, from: original.result, to: 'EXEMPT_WITH_RECORDED_BASIS' });
  await audit(c, 'applicability.override', row.id);
  return decisionView(row);
}
