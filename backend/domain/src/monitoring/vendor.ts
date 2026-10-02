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
  'Support diagnostic disclosures require approval of the exact payload digest. Audit evidence may leave under an approved package or an active dual-approved audit mandate; the audit channel records those deliveries separately.',
  'Support diagnostic facts are closed codes with occurrence counts and observation windows, without personal records. Audit packages and mandate deliveries have their own recorded scope and approval requirements.',
  'A support case is not a disclosure. Cases that disclosed nothing are counted separately so an open case is never mistaken for something having been sent.',
  'Vendor service health is not measured by this installation. An approved audit channel does not establish the health of the vendor service.',
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

  // DPDPA audit evidence packages: approval is what makes one able to leave, so every approved package is listed, with each export.
  const packages = (await c.tx.query(
    `SELECT p.id, p.state, p.approved_at, p.approved_by, p.manifest_fingerprint, p.file_sha256, p.expires_at, e.engagement_reference, e.firm_name,
            (SELECT count(*)::int FROM app.audit_package_items i WHERE i.package_id=p.id) AS items,
            (SELECT count(*)::int FROM app.audit_package_items i WHERE i.package_id=p.id AND i.contains_personal_data='YES') AS personal,
            coalesce((SELECT json_agg(json_build_object('exported_at', x.exported_at, 'exported_by', x.exported_by) ORDER BY x.exported_at) FROM app.audit_package_exports x WHERE x.package_id=p.id), '[]'::json) AS exports,
            coalesce((SELECT json_agg(json_build_object('submission_id', s.id, 'state', s.state, 'requested_by', s.requested_by, 'requested_at', s.requested_at, 'completed_at', s.completed_at) ORDER BY s.requested_at) FROM app.audit_package_submissions s WHERE s.package_id=p.id), '[]'::json) AS submissions
     FROM app.audit_packages p JOIN app.audit_engagements e ON e.id=p.engagement_id
     WHERE p.tenant_id=$1 AND p.legal_entity_id=$2 AND p.environment_id=$3 AND p.approved_at IS NOT NULL ORDER BY p.approved_at DESC LIMIT 500`, scope)).rows;
  const audit_packages = packages.map(p => ({ package_id: p.id, engagement_reference: p.engagement_reference, firm_name: p.firm_name,
    state: p.state === 'APPROVED' && (p.expires_at as Date).getTime() <= Date.now() ? 'EXPIRED' : p.state, approved_at: (p.approved_at as Date).toISOString(), approved_by: p.approved_by,
    manifest_fingerprint: p.manifest_fingerprint, file_sha256: p.file_sha256, items: p.items, personal_data_items: p.personal, expires_at: (p.expires_at as Date).toISOString(),
    exports: (p.exports as { exported_at: string; exported_by: string }[]).map(x => ({ exported_at: new Date(x.exported_at).toISOString(), exported_by: x.exported_by })),
    transported_by_orvia: (p.submissions as { state: string }[]).some(x => x.state !== 'FAILED'),
    channel_submissions: (p.submissions as { submission_id: string; state: string; requested_by: string; requested_at: string; completed_at: string | null }[])
      .map(x => ({ ...x, requested_at: new Date(x.requested_at).toISOString(), completed_at: x.completed_at ? new Date(x.completed_at).toISOString() : null })) }));

  // Audit mandate channel (revision 1.6): every mandate that authorised a call and every delivery generated under one.
  const iso = (v: unknown) => v ? (v as Date).toISOString() : null;
  const mandates = (await c.tx.query(`SELECT m.id, m.kind, m.state, m.categories, m.valid_from, m.valid_to, m.approved_at, m.approved_by, m.last_check_in_at, e.engagement_reference, e.firm_name
     FROM app.audit_mandates m JOIN app.audit_engagements e ON e.id=m.engagement_id WHERE m.tenant_id=$1 AND m.legal_entity_id=$2 AND m.environment_id=$3 ORDER BY m.created_at DESC LIMIT 100`, scope)).rows;
  const deliveries = (await c.tx.query(`SELECT d.id, d.sequence, d.kind, d.categories, d.entries, d.state, d.digest, d.created_at, d.completed_at, e.engagement_reference
     FROM app.audit_channel_deliveries d JOIN app.audit_engagements e ON e.id=d.engagement_id WHERE d.tenant_id=$1 AND d.legal_entity_id=$2 AND d.environment_id=$3 ORDER BY d.created_at DESC LIMIT 1000`, scope)).rows;
  const address = process.env.ORVIA_AUDIT_SERVICE_URL ?? null;
  const audit_channel = { address,
    mandates: mandates.map(m => ({ mandate_id: m.id, engagement_reference: m.engagement_reference, firm_name: m.firm_name, kind: m.kind, state: m.state, categories: m.categories, valid_from: iso(m.valid_from), valid_to: iso(m.valid_to),
      approved_at: iso(m.approved_at), approved_by: m.approved_by, last_check_in_at: iso(m.last_check_in_at) })),
    deliveries: deliveries.map(d => ({ delivery_id: d.id, engagement_reference: d.engagement_reference, sequence: d.sequence, kind: d.kind, categories: d.categories, entries: d.entries, state: d.state, digest: d.digest,
      generated_at: iso(d.created_at), completed_at: iso(d.completed_at), personal_data: false as const })) };

  return S.VendorVisibility.parse({
    audit_packages, audit_channel,
    as_of: new Date().toISOString(), profile: S.PROFILE,
    vendor_service_health: {
      observed: false,
      reason: address
        ? 'This installation calls exactly one vendor address, the audit service named in its trust file, and only for DPDPA audit mandates your approvers signed; every call and delivery is listed under audit_channel. It does not read the health of the vendor’s service, and an unobserved service is not a healthy one.'
        : 'No vendor audit service address is configured. Vendor service health is not observed by this installation. An unobserved service is not a healthy one.',
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
