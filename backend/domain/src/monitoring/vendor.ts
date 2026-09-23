import * as S from '../../../../shared/contracts/src/index.ts';
import { predicate, scopeValues, type Context } from '../shared/transaction.ts';

/**
 * M32 Monitoring, FR-M32-04.
 *
 * The requirement is mostly a list of things that must not happen: no automatic
 * customer telemetry, no employee tracking, no incident raised because a model
 * is absent. Absences are hard to demonstrate, and a page asserting "we collect
 * nothing" is worth nothing — it is the same sentence a product that collected
 * everything would print.
 *
 * So this is built from the other side. It accounts for everything that ever
 * left this installation towards the vendor, and the reader can see for
 * themselves that the list is short, that every entry was approved by a named
 * person, and that no entry arrived there by itself. If an automatic channel
 * existed, the only way to keep this page honest would be to list what it sent.
 *
 * Nothing is collected to produce this. Every row is derived from the support
 * records the installation already keeps, which is why there is no table here.
 *
 * Two things this deliberately does not do. It does not report vendor service
 * health as good: there is no vendor service in this deployment to observe, and
 * an unobserved service is not a healthy one. And it does not claim to say what
 * the vendor holds — only what this installation approved and recorded carrying.
 * The difference matters, and the report states it rather than blurring it.
 */

const LIMITS = [
  'This is what this installation approved and recorded as carried. What the vendor actually holds is not something this product can see, and no field here claims otherwise.',
  'Every disclosure was approved by a named person against one exact payload digest. There is no automatic channel, so there is nothing that could appear here without somebody having approved it.',
  'The facts disclosed are closed codes with occurrence counts and the window they were seen in. None of them names, counts or measures a person, and there is no field in which one could.',
  'A support case is not a disclosure. Cases that disclosed nothing are counted separately so an open case is never mistaken for something having been sent.',
  'Vendor service health is not reported here because there is no vendor service in this deployment to observe. That is an absence, not a clean bill of health.',
];

export async function vendorVisibility(c: Context): Promise<unknown> {
  const scope = scopeValues(c.actor);

  // Approvals are the only thing that can become a disclosure, so they are the
  // spine of this query. The transfer is a left join because approved and never
  // carried is a real state and must not disappear.
  const rows = await c.tx.query(
    `SELECT k.approved_at,k.approved_by,k.approved_digest,k.destination,k.retention_days,
            d.payload,
            s.id AS case_id,s.subject,s.vendor_case_reference,
            t.recorded_at AS carried_at,t.outcome
     FROM app.diagnostic_approvals k
     JOIN app.diagnostic_drafts d
       ON d.tenant_id=k.tenant_id AND d.legal_entity_id=k.legal_entity_id
      AND d.environment_id=k.environment_id AND d.id=k.draft_id
     JOIN app.support_cases s
       ON s.tenant_id=k.tenant_id AND s.legal_entity_id=k.legal_entity_id
      AND s.environment_id=k.environment_id AND s.id=d.case_id
     LEFT JOIN app.diagnostic_transfers t
       ON t.tenant_id=k.tenant_id AND t.legal_entity_id=k.legal_entity_id
      AND t.environment_id=k.environment_id AND t.approval_id=k.id
     WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3
     ORDER BY k.approved_at DESC LIMIT 200`, scope);

  const disclosures = rows.rows.map(row => {
    const payload = row.payload as { observations?: unknown[] };
    return {
      case_id: row.case_id, subject: row.subject,
      vendor_case_reference: row.vendor_case_reference ?? null,
      approved_at: (row.approved_at as Date).toISOString(),
      approved_by: row.approved_by, approved_digest: row.approved_digest,
      destination: row.destination, retention_days: Number(row.retention_days),
      carried_at: row.carried_at ? (row.carried_at as Date).toISOString() : null,
      outcome: row.outcome ?? null,
      // Exactly the observations in the payload that was approved. Read from the
      // draft the approval names, so a later draft cannot change what this says
      // was disclosed.
      facts: payload.observations ?? [],
      transported_by_orvia: false,
    };
  });

  // Cases that disclosed nothing. An open case is not a transfer, and counting
  // it as one would overstate what the vendor was told.
  const silent = await c.tx.query(
    `SELECT count(*)::int AS n FROM app.support_cases s
      WHERE ${predicate} AND NOT EXISTS (
        SELECT 1 FROM app.diagnostic_drafts d
         JOIN app.diagnostic_approvals k
           ON k.tenant_id=d.tenant_id AND k.legal_entity_id=d.legal_entity_id
          AND k.environment_id=d.environment_id AND k.draft_id=d.id
        WHERE d.tenant_id=s.tenant_id AND d.legal_entity_id=s.legal_entity_id
          AND d.environment_id=s.environment_id AND d.case_id=s.id)`, scope);

  return S.VendorVisibility.parse({
    as_of: new Date().toISOString(), profile: S.PROFILE,
    vendor_service_health: {
      observed: false,
      reason: 'There is no vendor service in this deployment. This build runs entirely on the customer’s own infrastructure and contacts nothing, so there is no service of the vendor’s whose health could be read from here. An unobserved service is not a healthy one.',
    },
    disclosures,
    approved_but_not_carried: disclosures.filter(d => d.carried_at === null).length,
    cases_with_nothing_disclosed: Number(silent.rows[0].n),
    no_automatic_telemetry_is_collected: true,
    no_employee_activity_is_tracked: true,
    the_absence_of_a_model_is_never_an_incident: true,
    this_states_what_was_disclosed_not_what_the_vendor_holds: true,
    limits: LIMITS,
  });
}
