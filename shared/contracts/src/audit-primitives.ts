import { z } from 'zod';

/**
 * Schema definitions shared by the audit contracts and the screens. Kept free of node:crypto: audit-exchange.ts and
 * audit-channel.ts hold the signing code, and importing them from a schema module shipped the whole Node crypto polyfill
 * (including code that calls eval, refused by the Content-Security-Policy) to every browser.
 */
export const RequirementId = z.string().regex(/^DPDP-[A-Z0-9-]{2,60}$/);
export const ProvisionId = z.string().regex(/^[A-Z0-9()\-.]{2,40}$/);
export const PersonalDataFlag = z.enum(['YES', 'NO', 'UNKNOWN']);
export const EvidenceMediaType = z.enum(['application/pdf', 'image/png', 'image/jpeg', 'text/plain', 'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
export const Severity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const RequirementResult = z.enum(['MEETS', 'PARTIALLY_MEETS', 'DOES_NOT_MEET', 'NOT_APPLICABLE', 'NOT_TESTED']);
export const EvidenceCategory = z.enum(['INDICATORS', 'CONTROL_STANDING', 'CONTROL_TESTS', 'NOTICE_VERSIONS', 'POLICY_VERSIONS', 'ACTIVITY_LOG_DIGEST', 'SAMPLE_COUNTS']);
export const SamplePopulation = z.enum(['CONSENT_EVENTS_WITH_EVIDENCE', 'BREACH_TASKS_WITHIN_TIMER', 'GRIEVANCES_RESOLVED_WITHIN_90_DAYS', 'WITHDRAWAL_RUNS_VERIFIED']);
export const MandateKind = z.enum(['ENGAGEMENT', 'CONTINUOUS_ASSURANCE']);
export const MandateSchedule = z.enum(['DAILY', 'WEEKLY']);
export const MandateState = z.enum(['DRAFT', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'ENDED']);
