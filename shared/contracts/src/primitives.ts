import { z } from 'zod';

/**
 * Wire primitives shared by the regulatory, registry and operations contracts.
 * They restate the identical definitions in index.ts rather than importing them,
 * because index.ts assembles every schema and route and importing back from it
 * would make module initialisation order-dependent.
 */
export const Id = z.uuid();
export const Time = z.iso.datetime();
export const Day = z.iso.date();
export const Digest = z.string().regex(/^[a-f0-9]{64}$/);
export const Version = z.string().regex(/^\d+\.\d+\.\d+$/).max(32);
export const SafeText = z.string().min(1).max(500);
export const LongText = z.string().min(1).max(10000);
export const Reference = z.string().min(3).max(500);
export const Locale = z.enum(['en', 'as', 'bn', 'brx', 'doi', 'gu', 'hi', 'kn', 'ks', 'kok', 'mai', 'ml', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur']);
export const TargetReference = z.string().regex(/^[A-Za-z0-9_.:-]{1,120}$/);
export const page = <T extends z.ZodType>(schema: T) => z.strictObject({ items: z.array(schema).max(100), next_cursor: z.string().max(200).nullable() });

/** shared/CROSS_LAYER_CONTRACTS.md: knowledge/evidence vocabulary. Unknown is a real value. */
export const KnowledgeState = z.enum(['KNOWN', 'UNKNOWN', 'EVIDENCE_AVAILABLE', 'EVIDENCE_MISSING', 'NEEDS_VERIFICATION', 'NEEDS_REMEDIATION', 'NOT_APPLICABLE', 'EXCEPTION_RECORDED']);
/** shared/CROSS_LAYER_CONTRACTS.md: regulatory applicability vocabulary. */
export const Applicability = z.enum(['APPLICABLE', 'NOT_APPLICABLE', 'UNRESOLVED', 'NOT_YET_IN_FORCE', 'SUPERSEDED', 'EXEMPT_WITH_RECORDED_BASIS']);
/** shared/CROSS_LAYER_CONTRACTS.md: execution vocabulary as reported to every consumer. */
export const ExecutionReport = z.enum(['requested', 'dispatched', 'accepted_by_target', 'completed_by_target', 'verified', 'failed', 'inconclusive', 'not_supported']);
/** integrations/CONNECTORS_EXECUTION_AND_VERIFICATION.md s2: normalised action states. */
export const ActionState = z.enum(['pending', 'awaiting_approval', 'blocked', 'executing', 'succeeded_unverified', 'verified', 'failed', 'inconclusive', 'cancelled', 'not_supported']);
