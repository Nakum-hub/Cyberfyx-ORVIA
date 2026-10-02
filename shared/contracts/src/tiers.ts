import { z } from 'zod';

/**
 * Revision 1.11 (owner decisions 2026-10-02): tiers, subscriptions and the licence lifecycle.
 * See docs/engineering/V1_BASELINE_REV_1_11_TIERS_AND_SUBSCRIPTIONS.md.
 *
 * This file is the single source of the tier model. The installation's import check (edition ceiling), the route and runner
 * enforcement, the interface's locked badges and the tier-walk tests all read it; nothing keeps a second copy.
 *
 * Every legal duty of an ordinary Data Fiduciary is achievable on FOUNDATION (the legal floor). Higher tiers sell automation,
 * verification, scale and assurance. Protective controls (withdrawal enforcement, suppression, rights and breach deadlines,
 * the audit trail, reading and exporting what is recorded) are never gated by any tier or licence state.
 */
export const Edition = z.enum(['FOUNDATION', 'CONTROL', 'ENTERPRISE', 'CUSTOM']);
export type EditionValue = z.infer<typeof Edition>;
/** Commercial term of a licence. TRIAL overlays a paid licence and falls back to it; CONTRACT is for CUSTOM and legacy licences. */
export const LicenceTerm = z.enum(['MONTHLY', 'QUARTERLY', 'ANNUAL', 'TRIAL', 'CONTRACT']);
export type LicenceTermValue = z.infer<typeof LicenceTerm>;
/** Days a licence keeps working after `valid_to` before premium work stops (rev 1.11, section E). */
export const GRACE_DAYS: Record<LicenceTermValue, number> = { MONTHLY: 7, QUARTERLY: 15, ANNUAL: 30, TRIAL: 0, CONTRACT: 30 };
/** Longest trial a licence may grant. */
export const MAX_TRIAL_DAYS = 30;

/** The ordered tiers. A tier includes every entitlement of the tiers below it. CUSTOM may carry any entitlement. */
export const TIER_ORDER: readonly EditionValue[] = ['FOUNDATION', 'CONTROL', 'ENTERPRISE'];

/** Features that can be licensed. One closed vocabulary, shared by every gate. */
export const EntitlementCode = z.enum([
  // FOUNDATION: the legal floor.
  'PRIVACY_GRAPH', 'CONSENT_MANAGEMENT', 'NOTICE_MANAGEMENT', 'INTAKE_AND_PORTAL', 'RIGHTS_MANAGEMENT', 'RETENTION_MANAGEMENT',
  'PROCESSOR_MANAGEMENT', 'INCIDENT_MANAGEMENT', 'NOTIFICATIONS', 'WEBSITE_CONSENT', 'SDF_OBLIGATIONS',
  // CONTROL: automate and verify.
  'REALTIME_ENFORCEMENT', 'WORKFLOW_AUTOMATION', 'DOWNSTREAM_VERIFICATION', 'COVERAGE_REPORTING', 'RIGHTS_FULFILMENT',
  'DISCOVERY_CLASSIFICATION', 'ASSESSMENTS', 'THIRD_PARTY_LIFECYCLE', 'DELIVERY_TRANSPORTS', 'RETENTION_ADVANCED',
  // ENTERPRISE: assure.
  'PRIVACY_TEST_ENGINE', 'CONTINUOUS_COMPLIANCE', 'GRC_AUDIT', 'SECURITY_AI_GOVERNANCE', 'AUDIT_EXCHANGE', 'SSO_IDENTITY',
]);
export type EntitlementCodeValue = z.infer<typeof EntitlementCode>;

export type EntitlementInfo = {
  /** The lowest tier that includes it. */
  tier: Exclude<EditionValue, 'CUSTOM'>;
  /** Shown on a locked item: what it does, in one line, without pressure. */
  label: string; value: string;
  /** The capability an actor needs to use it, once licensed. */
  capability: string;
};
export const ENTITLEMENTS: Record<EntitlementCodeValue, EntitlementInfo> = {
  PRIVACY_GRAPH: { tier: 'FOUNDATION', label: 'Systems and processing register', value: 'Record your systems, purposes and data, and export your record of processing.', capability: 'graph.read' },
  CONSENT_MANAGEMENT: { tier: 'FOUNDATION', label: 'Consent and withdrawal', value: 'Record consent, honour withdrawal and keep the evidence.', capability: 'registry.read' },
  NOTICE_MANAGEMENT: { tier: 'FOUNDATION', label: 'Notices in 22 languages', value: 'Publish versioned notices in English and every Eighth Schedule language.', capability: 'registry.read' },
  INTAKE_AND_PORTAL: { tier: 'FOUNDATION', label: 'Website and app intake', value: 'Receive consent changes and rights requests from your own website or app.', capability: 'registry.read' },
  RIGHTS_MANAGEMENT: { tier: 'FOUNDATION', label: 'Rights requests', value: 'Handle access, correction, erasure, grievance and nomination within their deadlines.', capability: 'rights.read' },
  RETENTION_MANAGEMENT: { tier: 'FOUNDATION', label: 'Retention and erasure', value: 'Set retention rules and record erasure, including what remains in backups.', capability: 'retention.read' },
  PROCESSOR_MANAGEMENT: { tier: 'FOUNDATION', label: 'Processors', value: 'Keep your processor register, contracts and their termination.', capability: 'processor.read' },
  INCIDENT_MANAGEMENT: { tier: 'FOUNDATION', label: 'Breaches', value: 'Record breaches and meet the 72-hour Board reporting clock.', capability: 'incident.read' },
  NOTIFICATIONS: { tier: 'FOUNDATION', label: 'Notifications', value: 'Prepare notifications to people and the Board.', capability: 'notification.read' },
  WEBSITE_CONSENT: { tier: 'FOUNDATION', label: 'Cookie banner', value: 'Consent banner and script blocking for your websites.', capability: 'registry.read' },
  SDF_OBLIGATIONS: { tier: 'FOUNDATION', label: 'SDF duty tracking', value: 'Record your DPO, auditor and the yearly DPIA and audit if you are a Significant Data Fiduciary.', capability: 'regulatory.manage' },
  REALTIME_ENFORCEMENT: { tier: 'CONTROL', label: 'Real-time enforcement', value: 'Your own systems ask ORVIA before sending, and are refused in milliseconds after a withdrawal.', capability: 'policy.preview' },
  WORKFLOW_AUTOMATION: { tier: 'CONTROL', label: 'Automation and connectors', value: 'Carry out suppression and erasure in your systems automatically.', capability: 'workflow.read' },
  DOWNSTREAM_VERIFICATION: { tier: 'CONTROL', label: 'Verification', value: 'Check independently that each system actually did what it was told.', capability: 'workflow.read' },
  COVERAGE_REPORTING: { tier: 'CONTROL', label: 'Coverage and failures', value: 'See where processing is not yet covered and what failed.', capability: 'coverage.read' },
  RIGHTS_FULFILMENT: { tier: 'CONTROL', label: 'Rights at scale', value: 'Response packages with redaction and expiring delivery links.', capability: 'rights.read' },
  DISCOVERY_CLASSIFICATION: { tier: 'CONTROL', label: 'Discovery', value: 'Find personal data in your databases and website policy changes automatically.', capability: 'registry.read' },
  ASSESSMENTS: { tier: 'CONTROL', label: 'Assessments and DPIA', value: 'Run questionnaires and impact assessments with remediation.', capability: 'grc.read' },
  THIRD_PARTY_LIFECYCLE: { tier: 'CONTROL', label: 'Third-party reviews', value: 'Send suppliers questionnaires by link and reassess them on a schedule.', capability: 'processor.read' },
  DELIVERY_TRANSPORTS: { tier: 'CONTROL', label: 'Your own email and webhooks', value: 'Send reviewed notifications through your own mail server or webhook.', capability: 'notification.read' },
  RETENTION_ADVANCED: { tier: 'CONTROL', label: 'Legal holds and restores', value: 'Legal holds, re-erasure after restores and restore coverage reviews.', capability: 'retention.read' },
  PRIVACY_TEST_ENGINE: { tier: 'ENTERPRISE', label: 'Privacy regression gate', value: 'Test privacy controls before every release.', capability: 'tests.read' },
  CONTINUOUS_COMPLIANCE: { tier: 'ENTERPRISE', label: 'Continuous compliance', value: 'Scheduled control tests with drift alerts.', capability: 'grc.read' },
  GRC_AUDIT: { tier: 'ENTERPRISE', label: 'GRC and audit workspace', value: 'Policies, control mapping and audit preparation.', capability: 'grc.read' },
  SECURITY_AI_GOVERNANCE: { tier: 'ENTERPRISE', label: 'Data security and AI governance', value: 'Security posture, AI use inventory and model version governance.', capability: 'ai_governance.read' },
  AUDIT_EXCHANGE: { tier: 'ENTERPRISE', label: 'External DPDPA audit', value: 'Signed audit evidence and continuous assurance for your auditor.', capability: 'audit_exchange.read' },
  SSO_IDENTITY: { tier: 'ENTERPRISE', label: 'Single sign-on', value: 'Sign in through your identity provider.', capability: 'staff.manage' },
};

/** Entitlements an edition may carry. A licence naming more is refused at import (ENTITLEMENT_EXCEEDS_EDITION). */
export function editionCeiling(edition: EditionValue): ReadonlySet<EntitlementCodeValue> {
  if (edition === 'CUSTOM') return new Set(EntitlementCode.options);
  const rank = TIER_ORDER.indexOf(edition);
  return new Set(EntitlementCode.options.filter(code => TIER_ORDER.indexOf(ENTITLEMENTS[code].tier) <= rank));
}
/** The standard entitlement set of a tier (what a plan of that edition grants unless a CUSTOM contract says otherwise). */
export const editionEntitlements = (edition: Exclude<EditionValue, 'CUSTOM'>) => [...editionCeiling(edition)];
/** The lowest tier that includes an entitlement, for refusals and locked badges. */
export const tierFor = (code: EntitlementCodeValue) => ENTITLEMENTS[code].tier;
