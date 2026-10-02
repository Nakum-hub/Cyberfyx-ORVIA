import type { EntitlementCodeValue } from './tiers.ts';

/**
 * Revision 1.11: which tier entitlement every route needs. One classification, read by the API dispatcher (enforcement), the
 * interface (locked badges) and the unit invariants (every route classified, protective routes never gated, legal floor on
 * FOUNDATION).
 *
 *   READ        every GET. Reading what exists is never gated, so a downgrade or expiry never hides data (FR-M28-03).
 *   PLATFORM    sign-in, team, licence, setup, updates, support, regulatory packages, the audit trail: needed to run and renew.
 *   PROTECTIVE  writes the law or a person's safety depends on: withdrawals, rights requests, breach reporting, the website/app
 *               intake channel, the Data Principal portal, send admission and the agent channel, completing and attesting
 *               erasure, recording restores, exports. Never gated by any tier or licence state (AGENTS: a licence state never
 *               reactivates marketing or blocks a legal duty).
 *   <code>      every other write needs that entitlement in the licence in force.
 */
export type RouteClass = 'READ' | 'PLATFORM' | 'PROTECTIVE' | EntitlementCodeValue;
type RouteLike = { id: string; method: string; path: string; authority: string };

/** Non-staff channels. A person, an organisation's website or app, a supplier link or the agent never meets a plan wall. */
const PROTECTIVE_AUTHORITIES = new Set(['PRINCIPAL', 'INTAKE_CLIENT', 'MACHINE', 'SUPPLIER_LINK', 'STAFF_OR_PRINCIPAL']);
/** Staff writes that are protective by id. */
const PROTECTIVE_IDS = new Set([
  'record_cmp_consent', 'reconcile', 'attest', 'export', 'export_audit_events', 'export_dpdpa_gap_register',
]);
/**
 * Wind-down. Switching off, revoking or terminating something reduces exposure, so it stays possible after a downgrade or
 * expiry: a customer is never left unable to revoke a delivery link, disable a transport or end a processor contract because
 * the feature that created it is no longer in their plan. (Toggling a control test both ways stays gated; the runner stops
 * scheduled premium work on its own once the licence no longer covers it.)
 */
const WIND_DOWN_IDS = new Set([
  'disable_catalog_discovery_target', 'terminate_processor_engagement', 'terminate_processor_agreement', 'revoke_intake_client',
  'cancel_run', 'revoke_supplier_link', 'revoke_response_package', 'withdraw_response_package', 'disable_delivery_transport',
  'withdraw_outbound_message', 'disable_cmp_site', 'retire_ai_model_version', 'revoke_audit_package', 'withdraw_audit_package_item',
  'withdraw_audit_finding_response',
]);
/** Writes whose segment is protective but whose substance is a higher-tier feature. */
const ID_ENTITLEMENT: Record<string, EntitlementCodeValue> = { prepare_response_package: 'RIGHTS_FULFILMENT' };
/** Path segments (after /api/v1/admin/) whose writes are protective. */
const PROTECTIVE_SEGMENTS = new Set([
  'rights-requests', 'rights-case-profiles', 'erasure-intimations', 'mandates', 'incidents', 'personal-data-breaches',
  'breach-tasks', 'notification-obligations', 'consent-records', 'data-exports', 'system-restores', 'erasure-ledger',
  'manual-tasks', 'actions',
]);
/** Path segments whose writes are platform (ungated). */
const PLATFORM_SEGMENTS = new Set([
  'session', 'my-login', 'staff-members', 'licences', 'entitlements', 'capabilities', 'overview', 'readiness', 'preflight',
  'diagnostics', 'diagnostic-approvals', 'installation-versions', 'update-plans', 'releases', 'support-cases',
  'support-canaries', 'support-ingress', 'regulatory', 'organisation-profile', 'audit-events', 'audit-retention',
  'audit-retention-rules', 'audit-coverage', 'audit-corrections', 'evidence', 'evidence-records', 'imports',
  'operational-events', 'vendor-visibility', 'reports', 'obligation-rules', 'sdf-obligations', 'operations',
]);
/** Gated writes by segment. Ordered by tier for review. */
const SEGMENT_ENTITLEMENT: Record<string, EntitlementCodeValue> = {
  // FOUNDATION
  graph: 'PRIVACY_GRAPH', systems: 'PRIVACY_GRAPH', 'registry-purposes': 'PRIVACY_GRAPH', 'personal-data-categories': 'PRIVACY_GRAPH',
  'data-principal-categories': 'PRIVACY_GRAPH', 'processing-activities': 'PRIVACY_GRAPH', 'processing-conditions': 'PRIVACY_GRAPH',
  'registry-activities': 'PRIVACY_GRAPH', 'registry-activity-links': 'PRIVACY_GRAPH', 'data-assets': 'PRIVACY_GRAPH', ropa: 'PRIVACY_GRAPH',
  'security-safeguards': 'PRIVACY_GRAPH',
  purposes: 'CONSENT_MANAGEMENT', policies: 'CONSENT_MANAGEMENT', consents: 'CONSENT_MANAGEMENT', 'preference-topics': 'CONSENT_MANAGEMENT',
  'preference-centres': 'CONSENT_MANAGEMENT', 'preference-decisions': 'CONSENT_MANAGEMENT', 'child-status-records': 'CONSENT_MANAGEMENT',
  'consent-managers': 'CONSENT_MANAGEMENT', 'withdrawal-canaries': 'CONSENT_MANAGEMENT', 'canary-hits': 'CONSENT_MANAGEMENT',
  'data-principals': 'CONSENT_MANAGEMENT', 'data-principal-relationships': 'CONSENT_MANAGEMENT',
  'data-principal-representatives': 'CONSENT_MANAGEMENT', principals: 'CONSENT_MANAGEMENT',
  notices: 'NOTICE_MANAGEMENT', 'registry-notices': 'NOTICE_MANAGEMENT', 'registry-notice-versions': 'NOTICE_MANAGEMENT',
  'notice-delivery-evidence': 'NOTICE_MANAGEMENT',
  'intake-clients': 'INTAKE_AND_PORTAL', 'intake-submissions': 'INTAKE_AND_PORTAL', 'privacy-centre': 'INTAKE_AND_PORTAL',
  retention: 'RETENTION_MANAGEMENT', 'retention-rules': 'RETENTION_MANAGEMENT', 'backup-treatments': 'RETENTION_MANAGEMENT',
  processors: 'PROCESSOR_MANAGEMENT', 'processor-engagements': 'PROCESSOR_MANAGEMENT', 'processor-agreements': 'PROCESSOR_MANAGEMENT',
  'data-sharing-links': 'PROCESSOR_MANAGEMENT', findings: 'PROCESSOR_MANAGEMENT',
  'notification-tasks': 'NOTIFICATIONS', 'notification-templates': 'NOTIFICATIONS',
  'cmp-sites': 'WEBSITE_CONSENT', 'cmp-configs': 'WEBSITE_CONSENT',
  // CONTROL
  'target-mappings': 'REALTIME_ENFORCEMENT', policy: 'REALTIME_ENFORCEMENT',
  workflows: 'WORKFLOW_AUTOMATION', 'workflow-runs': 'WORKFLOW_AUTOMATION', connections: 'WORKFLOW_AUTOMATION',
  'connector-bindings': 'WORKFLOW_AUTOMATION', 'bulk-jobs': 'WORKFLOW_AUTOMATION', commands: 'WORKFLOW_AUTOMATION',
  gaps: 'COVERAGE_REPORTING', coverage: 'COVERAGE_REPORTING', failures: 'COVERAGE_REPORTING', 'control-map': 'COVERAGE_REPORTING',
  'response-packages': 'RIGHTS_FULFILMENT',
  'catalog-discovery-targets': 'DISCOVERY_CLASSIFICATION', 'classification-runs': 'DISCOVERY_CLASSIFICATION',
  'exposure-findings': 'DISCOVERY_CLASSIFICATION', 'policy-discoveries': 'DISCOVERY_CLASSIFICATION',
  'impact-assessments': 'ASSESSMENTS', 'impact-templates': 'ASSESSMENTS', 'impact-findings': 'ASSESSMENTS', assessments: 'ASSESSMENTS',
  'supplier-links': 'THIRD_PARTY_LIFECYCLE', 'third-party-standing': 'THIRD_PARTY_LIFECYCLE',
  'delivery-transports': 'DELIVERY_TRANSPORTS', 'outbound-messages': 'DELIVERY_TRANSPORTS', 'alert-routings': 'DELIVERY_TRANSPORTS',
  'retention-holds': 'RETENTION_ADVANCED', 'restore-runs': 'RETENTION_ADVANCED', 'backup-snapshots': 'RETENTION_ADVANCED',
  // ENTERPRISE
  'test-runs': 'PRIVACY_TEST_ENGINE',
  'ai-systems': 'SECURITY_AI_GOVERNANCE', 'ai-model-versions': 'SECURITY_AI_GOVERNANCE', 'ai-governance': 'SECURITY_AI_GOVERNANCE',
  'audit-engagements': 'AUDIT_EXCHANGE', 'audit-packages': 'AUDIT_EXCHANGE', 'audit-imports': 'AUDIT_EXCHANGE',
  'audit-mandates': 'AUDIT_EXCHANGE', 'audit-finding-responses': 'AUDIT_EXCHANGE', 'audit-channel-requests': 'AUDIT_EXCHANGE',
  'audit-channel-documents': 'AUDIT_EXCHANGE', 'audit-channel-deliveries': 'AUDIT_EXCHANGE', 'dpdpa-audit': 'AUDIT_EXCHANGE',
  'evidence-files': 'AUDIT_EXCHANGE',
};
/** GRC sub-areas (/admin/grc/<sub>): scheduled control tests and alerts are continuous compliance; the rest is GRC and audit. */
const GRC_CONTINUOUS = new Set(['control-tests', 'compliance-alerts']);

/** The first path segment after the channel prefix, e.g. /api/v1/admin/cmp-sites/{id}/x -> cmp-sites. */
export function routeSegment(path: string) {
  return path.replace(/^\/api\/v1\/(admin\/|machine\/|portal\/|intake\/|supplier\/)?/, '').split('/')[0] ?? '';
}
/** Exposed for the unit invariants. */
export const ROUTE_CLASS_INPUTS = { WIND_DOWN_IDS, ID_ENTITLEMENT, PROTECTIVE_IDS } as const;
export function classifyRoute(route: RouteLike): RouteClass | null {
  if (route.method.toLowerCase() === 'get') return 'READ';
  if (PROTECTIVE_AUTHORITIES.has(route.authority) || route.authority === 'PUBLIC') return 'PROTECTIVE';
  if (PROTECTIVE_IDS.has(route.id) || WIND_DOWN_IDS.has(route.id)) return 'PROTECTIVE';
  if (ID_ENTITLEMENT[route.id]) return ID_ENTITLEMENT[route.id]!;
  const segment = routeSegment(route.path);
  if (PROTECTIVE_SEGMENTS.has(segment)) return 'PROTECTIVE';
  if (PLATFORM_SEGMENTS.has(segment)) return 'PLATFORM';
  if (segment === 'grc') {
    const sub = route.path.replace(/^\/api\/v1\/admin\/grc\//, '').split('/')[0] ?? '';
    return GRC_CONTINUOUS.has(sub) ? 'CONTINUOUS_COMPLIANCE' : 'GRC_AUDIT';
  }
  return SEGMENT_ENTITLEMENT[segment] ?? null;
}
