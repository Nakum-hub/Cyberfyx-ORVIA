import { z } from 'zod';

/** Pending consolidated Work review; accepted baseline was 0.2.1.
 *  0.6.0 added the WP04 privacy-control graph; 0.7.0 adds WP07 rights management;
 *  0.8.0 adds WP26 support bundles and WP27 updates; 0.9.0 adds the update plan
 *  list, without which FR-M31-03's promise that an interrupted update stays
 *  visible is not keepable — only applied plans were reachable, through the
 *  installed version history, and an interrupted one could be found by nobody.
 *  0.10.0 adds the M32 operational readiness report; 0.11.0 adds M33 audit
 *  administration: a scoped, filtered read of the trail and append-only
 *  corrections. 0.12.0 adds M29's nine-step guided connection, whose step
 *  states are measured from existing evidence rather than stored as ticks.
 *  0.13.0 closes two gaps against the Act: a notice may be authored in English
 *  or any Eighth Schedule language (s5), a principal records the language they
 *  chose, and a notice change is classified so existing consent is not silently
 *  carried across a material change (FR-M12-03, FR-M12-04).
 *
 *  Everything up to 0.12.0 was additive. 0.13.0 is the first release that is
 *  not, and the two breaks are deliberate. ProcessorRole's JOINT_CONTROLLER and
 *  INDEPENDENT_CONTROLLER become JOINT_FIDUCIARY and INDEPENDENT_FIDUCIARY,
 *  because this product is built to the DPDP Act and "controller" is another
 *  regime's word; migration 0030 rewrites the stored values so no row is left
 *  naming a role the contract cannot parse. ConsentChoice gains a required
 *  `language` object, because a portal that returns one language field cannot
 *  distinguish the language a principal chose from the one they were served,
 *  and FR-M12-04 turns on exactly that distinction.
 *  0.14.0 adds M29's preflight gates and M32's snapshot statement, restore
 *  quarantine and consent reconciliation. Additive again: no existing route,
 *  schema or wire meaning changed. */
export const CONTRACT_VERSION = '0.14.0' as const;
/** The version this build declares of itself. It is what a diagnostic report and
 *  a release manifest are compared against, so it must match package.json; a unit
 *  test asserts that rather than trusting it. */
export const PRODUCT_VERSION = '0.0.0' as const;
// Transport pagination does not change the signed command wire format.
export const COMMAND_SCHEMA_VERSION = '0.3.0' as const;
export const PROFILE = 'CUSTOMER_LOCAL_SYNTHETIC' as const;
export const AUTH = {
  staff: { base_path: '/api/auth/staff', cookie_prefix: 'orvia.staff', secure_cookie_prefix: '__Secure-orvia.staff' },
  principal: { base_path: '/api/auth/principal', cookie_prefix: 'orvia.principal', secure_cookie_prefix: '__Secure-orvia.principal' },
} as const;
export const PROFILES = {
  'codex-a00': { compose_project: 'orvia-codex-a00', app_port: 4310, postgres_port: 55431, opa_port: 58181, temporal_port: 57233, database: 'orvia_codex_a00', temporal_namespace: 'orvia-codex-a00', seed: 'aster-birch-v1', reset: 'codex-a00-bootstrap-only' },
  'ui-b00': { compose_project: 'orvia-ui-b00', app_port: 4320, postgres_port: 55432, opa_port: 58182, temporal_port: 57234, database: 'orvia_ui_b00', temporal_namespace: 'orvia-ui-b00', seed: 'aster-birch-v1', reset: 'ui-b00-bootstrap-only' },
  rehearsal: { compose_project: 'orvia-rehearsal', app_port: 4330, postgres_port: 55433, opa_port: 58183, temporal_port: 57235, database: 'orvia_rehearsal', temporal_namespace: 'orvia-rehearsal', seed: 'aster-birch-v1', reset: 'rehearsal-bootstrap-only' },
} as const;

export const Id = z.uuid();
export const Time = z.iso.datetime();
export const Epoch = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const Digest = z.string().regex(/^[a-f0-9]{64}$/);
export const Version = z.string().regex(/^\d+\.\d+\.\d+$/).max(32);
export const SafeText = z.string().min(1).max(500);
export const ConsentState = z.enum(['NOT_GIVEN', 'GRANTED', 'WITHDRAWN']);
export const WorkflowState = z.enum(['ACCEPTED', 'RUNNING', 'NEEDS_ATTENTION', 'COMPLETED']);
export const ExecutionState = z.enum(['PENDING', 'RUNNING', 'ACKNOWLEDGED', 'EFFECT_UNKNOWN', 'FAILED', 'MANUAL_REQUIRED', 'SKIPPED']);
export const ObservationState = z.enum(['NOT_CHECKED', 'OBSERVED_SATISFIED', 'OBSERVED_NOT_SATISFIED', 'UNVERIFIABLE', 'STALE']);
export const DecisionState = z.enum(['ALLOW', 'BLOCK', 'INDETERMINATE']);
export const TestState = z.enum(['NOT_RUN', 'RUNNING', 'PASS', 'FAIL', 'ERROR', 'SKIPPED']);
export const ReconciliationState = z.enum(['PENDING', 'RECONCILING', 'RESOLVED', 'INCONCLUSIVE', 'FAILED']);
export const Capability = z.enum(['overview.read', 'configuration.read', 'configuration.write', 'policy.publish', 'systems.check', 'principals.read', 'principals.create', 'workflow.read', 'action.reconcile', 'manual.attest', 'evidence.read', 'evidence.export', 'policy.preview', 'tests.run', 'tests.read', 'capabilities.read', 'graph.read', 'graph.write', 'rights.read', 'rights.write', 'rights.release', 'retention.read', 'retention.write', 'retention.approve', 'coverage.read', 'coverage.manage', 'processor.read', 'processor.write', 'incident.read', 'incident.write', 'incident.approve', 'notification.read', 'notification.manage', 'licence.read', 'licence.manage', 'support.read', 'support.manage', 'support.approve', 'update.read', 'update.approve', 'audit.read', 'audit.export', 'audit.administer', 'connection.enable', 'restore.release', 'consent.own.read', 'consent.own.write', 'receipt.own.read', 'health.read']);
export const Scope = z.strictObject({ tenant_id: Id, legal_entity_id: Id, environment_id: Id });
export const ErrorResponse = z.strictObject({
  error: z.strictObject({ code: z.enum(['VALIDATION_ERROR', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'EPOCH_CONFLICT', 'IDEMPOTENCY_CONFLICT', 'RATE_LIMITED', 'SERVICE_UNAVAILABLE', 'UNSUPPORTED_VERSION', 'STALE_GENERATION', 'INVALID_COMMAND']), message: SafeText,
    retry: z.enum(['NEVER', 'REAUTHENTICATE', 'REFRESH', 'SAME_IDEMPOTENCY_KEY', 'AFTER_DELAY']),
    field_errors: z.array(z.strictObject({ field: z.string().max(120), code: z.string().max(64) })).max(32).optional() }),
  request_id: Id,
});
export const Pagination = z.strictObject({ cursor: z.string().regex(/^[A-Za-z0-9_-]{1,200}$/).optional(), limit: z.number().int().min(1).max(100).default(25) });
const page = <T extends z.ZodType>(schema: T) => z.strictObject({ items: z.array(schema).max(100), next_cursor: z.string().max(200).nullable() });
export const Session = z.discriminatedUnion('actor_domain', [
  z.strictObject({ actor_domain: z.literal('STAFF'), actor_id: Id, scope: Scope, role: z.enum(['ORG_SUPER_ADMIN', 'ORG_ADMIN', 'MEMBER', 'AUDITOR']), capabilities: z.array(Capability), mfa_verified: z.boolean(), expires_at: Time }),
  z.strictObject({ actor_domain: z.literal('PRINCIPAL'), actor_id: Id, principal_id: Id, scope: Scope, role: z.literal('DATA_PRINCIPAL'), capabilities: z.array(z.enum(['consent.own.read', 'consent.own.write', 'receipt.own.read'])), expires_at: Time }),
]);
export const Grant = z.strictObject({ expected_epoch: Epoch, notice_version_id: Id, interaction_id: Id, affirmative: z.literal(true) });
export const Withdraw = z.strictObject({ expected_epoch: Epoch, interaction_id: Id });
export const Receipt = z.strictObject({
  receipt_id: Id, event_id: Id, purpose_id: Id,
  consent_status: z.enum(['GRANTED', 'WITHDRAWN']), consent_epoch: Epoch,
  accepted_at: Time, workflow_id: Id.nullable(), propagation_status: z.enum(['ACCEPTED', 'NOT_REQUIRED']),
}).superRefine((r, c) => {
  if ((r.workflow_id === null) !== (r.propagation_status === 'NOT_REQUIRED')) c.addIssue({ code: 'custom', message: 'Workflow and acceptance propagation state disagree' });
});
export const ReceiptView = z.strictObject({ receipt: Receipt, current: z.strictObject({
  consent_status: ConsentState, consent_epoch: Epoch,
  propagation_status: z.enum(['ACCEPTED', 'RUNNING', 'NEEDS_ATTENTION', 'COMPLETED', 'NOT_REQUIRED']),
  as_of: Time,
}) });
export const PurposeCreate = z.strictObject({ environment_id: Id, legal_entity_id: Id, code: z.enum(['promotional_marketing', 'order_service_demo']), name: z.string().min(1).max(120), description: SafeText });
export const Purpose = PurposeCreate.extend({ id: Id, version_id: Id, version: z.number().int().positive(), status: z.enum(['DRAFT', 'PUBLISHED', 'SUPERSEDED']) });
/**
 * English and the twenty-two languages of the Eighth Schedule, which is the set
 * Act §5 allows a notice to be made available in. The list is closed on purpose:
 * a language this product cannot name is one a principal cannot be recorded as
 * having chosen, and silently widening it would let a notice claim a language
 * nobody agreed was permissible.
 */
export const NoticeLanguage = z.enum([
  'en', 'as', 'bn', 'brx', 'doi', 'gu', 'hi', 'kn', 'ks', 'kok', 'mai', 'ml',
  'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur',
]);
export const NoticeCreate = z.strictObject({ purpose_id: Id, language: NoticeLanguage, title: z.string().min(1).max(120), content: z.string().min(1).max(10000) });
export const Notice = NoticeCreate.extend({ id: Id, version_id: Id, content_digest: Digest, published_at: Time.nullable() });
/**
 * FR-M12-03. What changed between two notice versions, classified by the person
 * who made the change rather than guessed from a diff.
 *
 * The classification decides whether existing consent still stands. An editorial
 * fix or a translation does not change what anybody agreed to; a material change
 * to scope does, and it cannot be recorded without saying what happens to the
 * grants already given. `affected_grants` is counted from the consent records at
 * the moment of the decision -- it is never a number somebody typed.
 */
export const NoticeChangeKind = z.enum(['EDITORIAL', 'TRANSLATION', 'MATERIAL_SCOPE_CHANGE']);
export const ConsentDecision = z.enum(['MIGRATE_EXISTING_GRANTS', 'REQUIRE_FRESH_CONSENT']);
const revisionShape = {
  change_kind: NoticeChangeKind,
  /** A translation says which version it is a translation of, so a reader can
   *  tell whether it has fallen behind the text it came from. */
  translates_version_id: Id.nullable(),
  consent_decision: ConsentDecision.nullable(),
  note: SafeText,
};
const revisionRules = (r: { change_kind: string; translates_version_id: string | null; consent_decision: string | null }, c: z.RefinementCtx) => {
  if ((r.change_kind === 'TRANSLATION') !== (r.translates_version_id !== null)) c.addIssue({ code: 'custom', message: 'A translation names the version it translates, and nothing else does' });
  if ((r.change_kind === 'MATERIAL_SCOPE_CHANGE') !== (r.consent_decision !== null)) c.addIssue({ code: 'custom', message: 'A material change to scope decides what happens to existing grants, and only a material change may' });
};
export const NoticeRevisionCreate = z.strictObject({ ...revisionShape, version_id: Id }).superRefine(revisionRules);
export const NoticeRevision = z.strictObject({
  ...revisionShape, id: Id, notice_id: Id, version_id: Id,
  /** Counted from the consent records when the decision was taken. */
  affected_grants: Epoch,
  counted_at: Time, recorded_at: Time, recorded_by: Id,
  /** Structural: this figure was measured, so nothing can assert it instead. */
  affected_grants_were_counted: z.literal(true),
  limits: z.array(SafeText).max(6),
}).superRefine(revisionRules);
/**
 * FR-M12-04. Which languages a purpose's notice actually exists in.
 *
 * English-first administration must not erase a principal's language choice, so
 * the shape refuses to let it: a language that was asked for and one that was
 * served are separate fields, and `available_in_requested_language` is true only
 * when they are the same. Falling back to English is expressible; reporting the
 * fallback as though the request had been met is not.
 */
const availabilityShape = {
  requested_language: NoticeLanguage,
  served_language: NoticeLanguage.nullable(),
  available_in_requested_language: z.boolean(),
  /** Every language this purpose has a published notice in. */
  published_languages: z.array(NoticeLanguage).max(23),
};
const availabilityRules = (a: { requested_language: string; served_language: string | null; available_in_requested_language: boolean; published_languages: string[] }, c: z.RefinementCtx) => {
  if (a.available_in_requested_language !== (a.served_language === a.requested_language)) c.addIssue({ code: 'custom', message: 'A request is met only when the language served is the language asked for' });
  if (new Set(a.published_languages).size !== a.published_languages.length) c.addIssue({ code: 'custom', message: 'Each language is listed once' });
  if (a.served_language !== null && !a.published_languages.includes(a.served_language)) c.addIssue({ code: 'custom', message: 'A served language is one this purpose actually has a notice in' });
};
/** The same facts as they appear beside a principal's own choice in the portal. */
export const LanguageAvailability = z.strictObject(availabilityShape).superRefine(availabilityRules);
export const NoticeAvailability = z.strictObject({
  ...availabilityShape, purpose_id: Id, limits: z.array(SafeText).max(6),
}).superRefine(availabilityRules);
export const LanguageChoice = z.strictObject({ preferred_language: NoticeLanguage });
/** Which language an operator is asking about. Omitted means English, which is
 *  the one language Act s5 always permits. */
export const LanguageQuery = z.strictObject({ language: NoticeLanguage.optional() });
export const PolicyCreate = z.strictObject({ purpose_id: Id, notice_version_id: Id, condition: z.enum(['AFFIRMATIVE_MARKETING_CONSENT', 'APPROVED_SYNTHETIC_ORDER_SERVICE']), system_ids: z.array(Id).min(1).max(3), required_observation: z.boolean() });
export const Policy = PolicyCreate.extend({ id: Id, version_id: Id, digest: Digest, author_id: Id, status: z.enum(['DRAFT', 'PUBLISHED', 'SUPERSEDED']), published_at: Time.nullable() });
export const PolicyPublish = z.strictObject({ version_id: Id, digest: Digest, reauthentication_id: Id });
export const PolicyReauthenticate = z.strictObject({ version_id: Id, digest: Digest, code: z.string().regex(/^[0-9]{6}$/) });
export const PublicationProof = z.strictObject({ reauthentication_id: Id, version_id: Id, digest: Digest, expires_at: Time });
export const MappingCreate = z.strictObject({ principal_id: Id, purpose_id: Id, system_id: Id });
export const TargetMapping = MappingCreate.extend({ id: Id, target_subject_reference: z.string().regex(/^syn_[a-z0-9_]{1,80}$/), target_generation: Epoch });
export const SystemCreate = z.strictObject({ environment_id: Id, legal_entity_id: Id, name: z.string().min(1).max(120), connector: z.enum(['SYNTHETIC_CRM', 'ORVIA_REST_SIMULATOR', 'LEGACY_MANUAL']) });
export const System = SystemCreate.extend({ id: Id, capability_version: Version, supports_restrict: z.boolean(), supports_read: z.boolean(), checked_at: Time.nullable() });
export const PrincipalCreate = z.strictObject({ environment_id: Id, legal_entity_id: Id, display_name: z.string().min(1).max(100), email: z.email().regex(/@(?:aster|birch)\.example$/) });
export const Principal = PrincipalCreate.extend({ id: Id, synthetic: z.literal(true) });
/**
 * `notice` is what the principal is actually shown, and `language` says whether
 * that is the language they chose. The two are separate because Act §5 gives
 * the choice to the principal: showing an English notice to somebody who asked
 * for Tamil may be all this installation can do, but reporting it as though
 * their choice had been honoured is the thing the shape refuses.
 */
export const ConsentChoice = z.strictObject({ purpose_id: Id, purpose_name: SafeText, consent_status: ConsentState, consent_epoch: Epoch, notice: Notice.nullable(), language: LanguageAvailability, interaction_id: Id });
export const Operation = z.enum(['CRM_REMOVE_MARKETING_MEMBERSHIP', 'SIMULATOR_RESTRICT']);
export const CommandScope = Scope.extend({ principal_reference_id: Id, system_id: Id, resource_id: Id, target_subject_reference: z.string().regex(/^syn_[a-z0-9_]{1,80}$/), purpose_id: Id, policy_version_id: Id, consent_epoch: Epoch, target_generation: Epoch, operation: Operation });
export const Approval = z.discriminatedUnion('result', [
  z.strictObject({ result: z.literal('APPROVED'), decision_id: Id, reviewer_id: Id, author_id: Id, approved_plan_digest: Digest, policy_version_id: Id, decided_at: Time }).refine(a => a.reviewer_id !== a.author_id, 'Independent reviewer required'),
  z.strictObject({ result: z.literal('NOT_REQUIRED_BY_POLICY'), decision_id: Id, policy_version_id: Id, approved_plan_digest: Digest, rule_id: z.literal('SYNTHETIC_NON_DESTRUCTIVE_RESTRICTION'), decided_at: Time }),
]);
export const PlanBinding = z.strictObject({ workflow_id: Id, action_id: Id, scope: CommandScope, capability: z.literal('restrict_exact_synthetic_subject'), capability_version: Version, operation_budget: z.strictObject({ maximum_records: z.literal(1), maximum_attempts: z.number().int().min(1).max(3) }) });
export const CommandPayload = z.strictObject({
  schema_version: z.literal(COMMAND_SCHEMA_VERSION), command_id: Id, installation_id: Id,
  signing_key_id: Id, binding: PlanBinding, scope_digest: Digest, plan_digest: Digest,
  approval: Approval, approval_digest: Digest, issued_at: Time, expires_at: Time,
  nonce: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/),
}).superRefine((p, c) => {
  if (Date.parse(p.expires_at) <= Date.parse(p.issued_at) || Date.parse(p.expires_at) - Date.parse(p.issued_at) > 300_000) c.addIssue({ code: 'custom', message: 'Command lifetime must be positive and at most five minutes' });
  if (p.approval.policy_version_id !== p.binding.scope.policy_version_id || p.approval.approved_plan_digest !== p.plan_digest) c.addIssue({ code: 'custom', message: 'Approval binding mismatch' });
});
export const SignedCommand = z.strictObject({ algorithm: z.literal('Ed25519'), payload: CommandPayload, signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/) });
export const CommandReceipt = z.strictObject({ command_id: Id, command_digest: Digest, attempt_id: Id, execution_state: z.enum(['ACKNOWLEDGED', 'EFFECT_UNKNOWN', 'FAILED']), recorded_at: Time, reason_code: z.string().regex(/^[A-Z_]{1,64}$/), target_generation: Epoch });
export const Observation = z.strictObject({ id: Id, action_id: Id, system_id: Id, resource_id: Id, target_generation: Epoch, state: ObservationState, method: z.enum(['SCOPED_READ', 'PROVIDER_RECEIPT', 'NONE']), observed_at: Time.nullable(), fresh_until: Time.nullable(), desired_state: z.literal('MARKETING_RESTRICTED'), observed_state: z.enum(['MARKETING_RESTRICTED', 'MARKETING_ENABLED', 'UNKNOWN']), limits: z.array(SafeText).max(16) }).superRefine((o,c)=>{
  if(['OBSERVED_SATISFIED','OBSERVED_NOT_SATISFIED'].includes(o.state)&&(o.method==='NONE'||o.observed_at===null||o.fresh_until===null))c.addIssue({code:'custom',message:'Observation requires method and freshness bounds'});
  if(o.observed_at&&o.fresh_until&&Date.parse(o.fresh_until)<=Date.parse(o.observed_at))c.addIssue({code:'custom',message:'Invalid observation freshness interval'});
  if(o.state==='OBSERVED_SATISFIED'&&o.observed_state!==o.desired_state)c.addIssue({code:'custom',message:'Observed state does not satisfy desired state'});
});
export const Reconciliation = z.strictObject({ id: Id, action_id: Id, uncertain_attempt_id: Id, state: ReconciliationState, method: z.enum(['SCOPED_READ', 'PROVIDER_RECEIPT']), started_at: Time.nullable(), finished_at: Time.nullable(), observation_id: Id.nullable(), reason_code: z.string().regex(/^[A-Z_]{1,64}$/).nullable() }).superRefine((r,c)=>{
  if((r.state==='PENDING')!==(r.started_at===null))c.addIssue({code:'custom',message:'Reconciliation start time/state mismatch'});
  const terminal=['RESOLVED','INCONCLUSIVE','FAILED'].includes(r.state);
  if(terminal!==(r.finished_at!==null))c.addIssue({code:'custom',message:'Reconciliation finish time/state mismatch'});
  if(r.started_at&&r.finished_at&&Date.parse(r.finished_at)<Date.parse(r.started_at))c.addIssue({code:'custom',message:'Reconciliation ends before start'});
  if(r.state==='RESOLVED'&&r.observation_id===null)c.addIssue({code:'custom',message:'Resolved reconciliation requires observation evidence'});
  if(['INCONCLUSIVE','FAILED'].includes(r.state)&&r.reason_code===null)c.addIssue({code:'custom',message:'Unresolved reconciliation requires reason'});
});
export const ManualAttestation = z.strictObject({ statement: z.string().min(10).max(2000), evidence_record_ids: z.array(Id).min(1).max(10), expected_task_version: Epoch });
export const Obligation = z.strictObject({ id: Id, task_version: Epoch.describe('Authoritative stored manual-task revision. Submit this exact value as expected_task_version; never infer it from workflow state or attestation presence.'), required: z.boolean(), completion_criterion: z.enum(['CURRENT_SCOPED_OBSERVATION', 'ATTRIBUTED_MANUAL_ATTESTATION']).describe('CURRENT_SCOPED_OBSERVATION requires a fresh, satisfied SCOPED_READ in the current scope. PROVIDER_RECEIPT remains attributable evidence/reconciliation input and cannot satisfy this criterion. ATTRIBUTED_MANUAL_ATTESTATION remains a separate administrative criterion.'), execution_state: ExecutionState, observation: Observation.nullable(), attestation: z.strictObject({ actor_id: Id, recorded_at: Time, statement: z.string().max(2000), evidence_record_ids: z.array(Id).min(1) }).nullable(), scope_still_current: z.boolean(), skip_reason: SafeText.nullable() });
export const Action = z.strictObject({ id: Id, plan: PlanBinding, execution_state: ExecutionState, attempts: z.array(CommandReceipt).max(100), observations: z.array(Observation).max(100), reconciliations: z.array(Reconciliation).max(100) });
export const WorkflowSummary = z.strictObject({ id: Id, event_id: Id, purpose_id: Id, state: WorkflowState, accepted_at: Time, updated_at: Time });
export const Workflow = WorkflowSummary.extend({ actions: z.array(Action).max(100), obligations: z.array(Obligation).max(100) });
export const AcceptedOperation = z.strictObject({ operation_id: Id, status: z.literal('ACCEPTED'), accepted_at: Time });
export const Evaluate = z.strictObject({ principal_id: Id, purpose_id: Id, system_id: Id, action: z.enum(['MARKETING_SEND', 'ORDER_SERVICE_SEND']) });
export const Decision = z.strictObject({ decision_id: Id, decision: DecisionState, reason_codes: z.array(z.string().regex(/^[A-Z_]{1,64}$/)).min(1).max(16), policy_version_id: Id.nullable(), consent_epoch: Epoch.nullable(), preview_only: z.literal(true), evaluated_at: Time });
export const SendRequest = z.strictObject({ attempt_id: Id, principal_reference_id: Id, purpose_id: Id, system_id: Id, message_class: z.enum(['MARKETING', 'ORDER_SERVICE']), order_reference: z.string().regex(/^syn_order_[a-z0-9_]{1,64}$/).nullable() });
export const SendResult = z.strictObject({ attempt_id: Id, decision: DecisionState, send_record_id: Id.nullable(), admitted_at: Time.nullable(), evaluated_epoch: Epoch, reason_codes: z.array(SafeText).min(1) }).superRefine((s,c) => {
  if ((s.decision === 'ALLOW') !== (s.send_record_id !== null && s.admitted_at !== null)) c.addIssue({code:'custom',message:'Only an actual admission may have a send record'});
  if (s.decision !== 'ALLOW' && (s.send_record_id !== null || s.admitted_at !== null)) c.addIssue({code:'custom',message:'Blocked/indeterminate admission has no effect'});
});
export const SimulatorState = z.strictObject({ resource_id: Id, generation: Epoch, last_applied_epoch: Epoch, marketing_restricted: z.boolean(), observed_at: Time });
export const TestRunCreate = z.strictObject({ scenario: z.enum(['MARKETING_WITHDRAWAL_HEALTHY', 'MARKETING_WITHDRAWAL_BROKEN_CONTROL', 'TARGET_RESTORE_QUARANTINE']), profile: z.enum(['codex-a00', 'ui-b00', 'rehearsal']), fixture_id: z.literal('aster-birch-v1') });
export const Assertion = z.strictObject({ id: z.string().max(80), result: z.enum(['PASS', 'FAIL', 'ERROR', 'SKIPPED']), expected: SafeText, actual: SafeText, artifact_paths: z.array(z.string().regex(/^[A-Za-z0-9_./-]{1,200}$/)).max(32) });
export const TestRun = z.strictObject({ id: Id, request: TestRunCreate, state: TestState, build_id: z.string().max(100), contract_version: Version, started_at: Time.nullable(), finished_at: Time.nullable(), assertions: z.array(Assertion).max(500), expected_fault_detection: z.boolean() });
export const CapabilityRecord = z.strictObject({ code: z.string().max(100), target_release: z.enum(['V1', 'DEFERRED_V2']), implementation_status: z.enum(['NOT_IMPLEMENTED', 'IMPLEMENTED']), test_status: TestState, supported_profile: z.literal(PROFILE), limitations: z.array(SafeText).max(16) });
export const Overview = z.strictObject({ scope: Scope, build_id: z.string().max(100), contract_version: Version, profile: z.literal(PROFILE), as_of: Time, counts: z.strictObject({ accepted: Epoch, running: Epoch, needs_attention: Epoch, completed: Epoch, effect_unknown: Epoch, manual_required: Epoch, failed: Epoch, unverified: Epoch }) });
export const Evidence = z.strictObject({ workflow: Workflow, receipts: z.array(Receipt).max(100), policy_version_ids: z.array(Id).max(100), notice_version_ids: z.array(Id).max(100), tests: z.array(TestRun).max(100), exported_at: Time, coverage_limits: z.array(SafeText).max(100), integrity_digest: Digest, integrity_limit: z.literal('Digest detects change relative to a trusted reference; it does not prove external effects or prevent privileged rewriting.') });
export const ControlMap = z.strictObject({ edges: z.array(z.strictObject({ purpose_id: Id, system_id: Id, resource_id: Id, capability_version: Version, declared_restrict: z.boolean(), observed_restrict: z.boolean().nullable(), as_of: Time.nullable() })).max(100), next_cursor: z.string().max(200).nullable() });
// ---------------------------------------------------------------------------
// M03 Privacy Control Graph (WP04). Relational inventory and typed relationships
// over PostgreSQL. Provenance separates what the customer declared (ASSERTED)
// from what a scoped connector read actually saw (OBSERVED); the two never merge
// into a single "known" state, and a field name alone never implies a purpose.
// ---------------------------------------------------------------------------
export const Provenance = z.enum(['ASSERTED', 'OBSERVED']);
export const ReviewState = z.enum(['UNREVIEWED', 'IN_REVIEW', 'ACCEPTED', 'REJECTED']);
export const GraphNodeKind = z.enum(['DATA_ASSET', 'PROCESSING_ACTIVITY', 'SYSTEM', 'PURPOSE']);
export const DataAssetKind = z.enum(['DATASET', 'FIELD', 'DERIVED_COPY', 'EXPORT', 'BACKUP_COPY']);
/** Categories are reviewed, explicitly assigned relationships, never derived from a name. */
export const DataCategoryCode = z.enum(['CONTACT_DETAILS', 'IDENTIFIERS', 'MARKETING_PREFERENCES', 'ORDER_RECORDS', 'SUPPORT_NOTES']);
export const LawfulCondition = z.enum(['AFFIRMATIVE_MARKETING_CONSENT', 'APPROVED_SYNTHETIC_ORDER_SERVICE']);
export const CategoryAssignment = z.strictObject({ code: DataCategoryCode, basis: SafeText, review_state: ReviewState });
export const DataAssetCreate = z.strictObject({
  system_id: Id, kind: DataAssetKind, parent_id: Id.nullable(), name: z.string().min(1).max(120), description: SafeText,
  provenance: Provenance, valid_from: Time, categories: z.array(CategoryAssignment).max(16),
});
export const DataAsset = DataAssetCreate.extend({
  id: Id, review_state: ReviewState, recorded_at: Time, valid_to: Time.nullable(),
  last_seen_at: Time.nullable(), fresh_until: Time.nullable(), owner_actor_id: Id,
  tombstoned_at: Time.nullable(), tombstone_reason: SafeText.nullable(),
}).superRefine((a, c) => {
  // An observation is only an observation when it names when it was seen and how
  // long that reading may be trusted. A declaration carries neither.
  if ((a.provenance === 'OBSERVED') !== (a.last_seen_at !== null && a.fresh_until !== null)) c.addIssue({ code: 'custom', message: 'Only an OBSERVED asset carries observation time and freshness' });
  if (a.last_seen_at && a.fresh_until && Date.parse(a.fresh_until) <= Date.parse(a.last_seen_at)) c.addIssue({ code: 'custom', message: 'Invalid asset freshness interval' });
  if (a.valid_to && Date.parse(a.valid_to) <= Date.parse(a.valid_from)) c.addIssue({ code: 'custom', message: 'Asset validity ends before it starts' });
  if ((a.tombstoned_at === null) !== (a.tombstone_reason === null)) c.addIssue({ code: 'custom', message: 'A tombstone must state its justification' });
});
export const ProcessingActivityCreate = z.strictObject({ purpose_id: Id, name: z.string().min(1).max(120), description: SafeText, lawful_condition: LawfulCondition, owner_reference: SafeText });
export const ProcessingActivity = ProcessingActivityCreate.extend({ id: Id, review_state: ReviewState, recorded_at: Time, owner_actor_id: Id });
export const RelationshipType = z.enum(['ASSET_STORED_IN_SYSTEM', 'ASSET_PROCESSED_BY_ACTIVITY', 'ACTIVITY_SERVES_PURPOSE', 'ASSET_COPIED_TO']);
export const GraphEndpoint = z.strictObject({ kind: GraphNodeKind, id: Id });
/** Each relationship type fixes the kind of both endpoints, so an edge cannot connect arbitrary nodes. */
export const RELATIONSHIP_ENDPOINTS: Record<z.infer<typeof RelationshipType>, { from: z.infer<typeof GraphNodeKind>; to: z.infer<typeof GraphNodeKind> }> = {
  ASSET_STORED_IN_SYSTEM: { from: 'DATA_ASSET', to: 'SYSTEM' },
  ASSET_PROCESSED_BY_ACTIVITY: { from: 'DATA_ASSET', to: 'PROCESSING_ACTIVITY' },
  ACTIVITY_SERVES_PURPOSE: { from: 'PROCESSING_ACTIVITY', to: 'PURPOSE' },
  ASSET_COPIED_TO: { from: 'DATA_ASSET', to: 'DATA_ASSET' },
};
const endpointRule = (r: { relationship_type: z.infer<typeof RelationshipType>; from: z.infer<typeof GraphEndpoint>; to: z.infer<typeof GraphEndpoint> }, c: z.RefinementCtx) => {
  const expected = RELATIONSHIP_ENDPOINTS[r.relationship_type];
  if (r.from.kind !== expected.from || r.to.kind !== expected.to) c.addIssue({ code: 'custom', message: 'Relationship endpoints do not match the declared relationship type' });
  if (r.from.kind === r.to.kind && r.from.id === r.to.id) c.addIssue({ code: 'custom', message: 'A node cannot relate to itself' });
};
export const GraphRelationshipCreate = z.strictObject({ relationship_type: RelationshipType, from: GraphEndpoint, to: GraphEndpoint, provenance: Provenance, valid_from: Time, confidence_basis: SafeText }).superRefine(endpointRule);
export const GraphRelationship = z.strictObject({
  relationship_type: RelationshipType, from: GraphEndpoint, to: GraphEndpoint, provenance: Provenance, valid_from: Time, confidence_basis: SafeText,
  id: Id, review_state: ReviewState, recorded_at: Time, valid_to: Time.nullable(), last_seen_at: Time.nullable(), owner_actor_id: Id,
}).superRefine((r, c) => {
  endpointRule(r, c);
  if ((r.provenance === 'OBSERVED') !== (r.last_seen_at !== null)) c.addIssue({ code: 'custom', message: 'Only an OBSERVED relationship carries an observation time' });
  if (r.valid_to && Date.parse(r.valid_to) <= Date.parse(r.valid_from)) c.addIssue({ code: 'custom', message: 'Relationship validity ends before it starts' });
});
export const AssetTombstone = z.strictObject({ reason: z.string().min(10).max(500), integrity_reference: SafeText });
export const GraphNode = z.strictObject({ kind: GraphNodeKind, id: Id, label: SafeText, provenance: Provenance.nullable(), review_state: ReviewState.nullable(), tombstoned: z.boolean() });
export const GraphSearchQuery = z.strictObject({ q: z.string().min(2).max(120) });
export const GraphSearchHit = GraphNode.extend({ rank: z.number().min(0).max(1) });
export const GraphSearchResult = z.strictObject({
  query_terms: z.array(z.string().min(1).max(120)).max(16), hits: z.array(GraphSearchHit).max(50),
  truncated: z.boolean().describe('The bounded result limit was reached; this is not an exhaustive estate search.'), limits: z.array(SafeText).max(8),
});
export const NeighbourhoodQuery = z.strictObject({ depth: z.enum(['1', '2', '3']).default('1') });
export const GraphNeighbourhood = z.strictObject({
  root: GraphEndpoint, depth: z.number().int().min(1).max(3), nodes: z.array(GraphNode).max(200),
  edges: z.array(GraphRelationship).max(200), truncated: z.boolean(), limits: z.array(SafeText).max(8),
});
export type LicenceRejectionValue = z.infer<typeof LicenceRejection>;
export type RightTypeValue = z.infer<typeof RightType>;
export type RequestStateValue = z.infer<typeof RequestState>;
export type GraphNodeKindValue = z.infer<typeof GraphNodeKind>;
export type GraphNodeValue = z.infer<typeof GraphNode>;
export type GraphRelationshipValue = z.infer<typeof GraphRelationship>;
export const ImpactDimension = z.enum(['POLICY_VERSIONS', 'WORKFLOWS', 'TEST_RUNS', 'DATA_ASSETS', 'OWNERS', 'PROCESSORS', 'RETENTION_CONSTRAINTS', 'INCIDENTS']);
export const ImpactAssessment = z.strictObject({
  node: GraphEndpoint, assessed_at: Time,
  affected: z.strictObject({ policy_version_ids: z.array(Id).max(100), workflow_ids: z.array(Id).max(100), test_run_ids: z.array(Id).max(100), data_asset_ids: z.array(Id).max(100), owner_actor_ids: z.array(Id).max(100), processor_ids: z.array(Id).max(100), retention_constraint_ids: z.array(Id).max(100), incident_ids: z.array(Id).max(100) }),
  truncated_dimensions: z.array(ImpactDimension).max(8).describe('Reached the bounded limit; the listed dimension is incomplete, not empty.'),
  unavailable_dimensions: z.array(z.enum(['NOTIFICATION_OBLIGATIONS'])).max(1).describe('Not implemented in this release. An unavailable dimension is explicitly not the same as an assessed-and-empty one.'),
  limits: z.array(SafeText).max(8),
});
// ---------------------------------------------------------------------------
// M14 Rights Management (WP07). The lifecycle state is the master's exact
// vocabulary. It is deliberately NOT the whole truth about a request: identity,
// authority, execution, response and scope are independent dimensions, because
// a request can be administratively CLOSED while its execution is still partial
// and its response was never delivered. Collapsing those into one state is how
// a system ends up claiming erasure it never performed.
// ---------------------------------------------------------------------------
export const RequestState = z.enum(['RECEIVED', 'PENDING_VERIFICATION', 'VERIFIED', 'SCOPING', 'AWAITING_APPROVAL', 'EXECUTING', 'PARTIALLY_COMPLETED', 'COMPLETED', 'FAILED', 'ESCALATED', 'REJECTED', 'CLOSED']);
export const RightType = z.enum(['ACCESS', 'CORRECTION', 'ERASURE', 'GRIEVANCE', 'NOMINATION']);
/** Rights whose execution destroys or discloses, and which an unresolved identity must block. */
export const DESTRUCTIVE_OR_DISCLOSING: readonly z.infer<typeof RightType>[] = ['ACCESS', 'CORRECTION', 'ERASURE'];
export const IdentityMatchGrade = z.enum(['EXACT', 'STRONG', 'PROBABLE', 'AMBIGUOUS', 'NO_MATCH']);
/** Grades that may not authorise disclosure or destructive automation. */
export const BLOCKING_GRADES: readonly z.infer<typeof IdentityMatchGrade>[] = ['AMBIGUOUS', 'NO_MATCH'];
export const IdentityDimension = z.enum(['NOT_ASSESSED', 'UNDER_REVIEW', 'ESTABLISHED', 'AMBIGUOUS', 'NO_MATCH']);
export const AuthorityDimension = z.enum(['NOT_ESTABLISHED', 'SELF', 'MANDATED', 'MANDATE_EXPIRED', 'MANDATE_REVOKED']);
export const ExecutionDimension = z.enum(['NOT_STARTED', 'RUNNING', 'PARTIAL', 'COMPLETE', 'FAILED', 'MANUAL_REQUIRED']);
export const ResponseDimension = z.enum(['NOT_PREPARED', 'IN_REVIEW', 'RELEASED', 'DELIVERY_FAILED', 'EXPIRED', 'WITHHELD']);
export const ScopeDimension = z.enum(['NOT_DETERMINED', 'DETERMINED', 'UNRESOLVED_DESTINATIONS']);
/** The master's exact transition map. CLOSED is terminal administrative closure. */
export const REQUEST_TRANSITIONS: Record<z.infer<typeof RequestState>, readonly z.infer<typeof RequestState>[]> = {
  RECEIVED: ['PENDING_VERIFICATION', 'REJECTED'],
  PENDING_VERIFICATION: ['VERIFIED', 'REJECTED', 'ESCALATED'],
  VERIFIED: ['SCOPING', 'REJECTED', 'ESCALATED'],
  SCOPING: ['AWAITING_APPROVAL', 'ESCALATED', 'REJECTED'],
  // A scope change after approval returns here and invalidates the approval.
  AWAITING_APPROVAL: ['EXECUTING', 'SCOPING', 'REJECTED', 'ESCALATED'],
  EXECUTING: ['PARTIALLY_COMPLETED', 'COMPLETED', 'FAILED', 'ESCALATED'],
  PARTIALLY_COMPLETED: ['EXECUTING', 'COMPLETED', 'FAILED', 'ESCALATED', 'CLOSED'],
  COMPLETED: ['CLOSED'],
  FAILED: ['ESCALATED', 'CLOSED'],
  ESCALATED: ['SCOPING', 'EXECUTING', 'REJECTED', 'FAILED', 'CLOSED'],
  REJECTED: ['CLOSED'],
  CLOSED: [],
};
export const MandateKind = z.enum(['NOMINATION', 'GUARDIAN']);
export const MandateState = z.enum(['ACTIVE', 'REVOKED', 'EXPIRED', 'SUPERSEDED']);
export const MandateCreate = z.strictObject({
  kind: MandateKind, principal_id: Id, representative_reference: SafeText,
  permitted_rights: z.array(RightType).min(1).max(5), valid_from: Time, valid_to: Time.nullable(),
  evidence_reference: SafeText,
}).superRefine((m, c) => {
  if (m.valid_to && Date.parse(m.valid_to) <= Date.parse(m.valid_from)) c.addIssue({ code: 'custom', message: 'Mandate validity ends before it starts' });
});
export const Mandate = z.strictObject({
  kind: MandateKind, principal_id: Id, representative_reference: SafeText,
  permitted_rights: z.array(RightType).min(1).max(5), valid_from: Time, valid_to: Time.nullable(), evidence_reference: SafeText,
  id: Id, state: MandateState, recorded_at: Time, recorded_by: Id, revoked_at: Time.nullable(), revocation_reason: SafeText.nullable(),
}).superRefine((m, c) => {
  if ((m.state === 'REVOKED') !== (m.revoked_at !== null)) c.addIssue({ code: 'custom', message: 'A revoked mandate records when it was revoked' });
  if ((m.revoked_at === null) !== (m.revocation_reason === null)) c.addIssue({ code: 'custom', message: 'A revocation must state its reason' });
});
export const MandateRevoke = z.strictObject({ reason: z.string().min(10).max(500) });
export const RightsRequestCreate = z.strictObject({
  right_type: RightType, principal_id: Id, submitted_channel: z.enum(['PORTAL', 'RECORDED_MANUAL_INTAKE']),
  mandate_id: Id.nullable(), description: SafeText,
});
export const IdentityReview = z.strictObject({
  grade: IdentityMatchGrade, basis: z.string().min(10).max(500),
  matched_reference_count: z.number().int().min(0).max(1000),
}).superRefine((r, c) => {
  if (r.grade === 'NO_MATCH' && r.matched_reference_count !== 0) c.addIssue({ code: 'custom', message: 'A no-match review cannot name matched references' });
  if (r.grade === 'AMBIGUOUS' && r.matched_reference_count < 2) c.addIssue({ code: 'custom', message: 'An ambiguous review means more than one candidate matched' });
  if (['EXACT', 'STRONG'].includes(r.grade) && r.matched_reference_count !== 1) c.addIssue({ code: 'custom', message: 'An exact or strong match resolves to exactly one reference' });
});
/** One planned action per system. A destination ORVIA cannot act on stays visible. */
export const PlanAction = z.enum(['DISCLOSE_COPY', 'CORRECT_RECORD', 'ERASE_RECORD', 'RESTRICT_PROCESSING', 'NO_ACTION_REQUIRED']);
/** What an operator may propose. Whether it can actually be automated is not
 *  theirs to assert: the server derives that from the system's real connector. */
export const RequestPlanItemInput = z.strictObject({
  system_id: Id, action: PlanAction, retention_exception: SafeText.nullable(), note: SafeText,
});
export const RequestPlanItem = RequestPlanItemInput.extend({ automatable: z.boolean() });
export const RequestScope = z.strictObject({
  items: z.array(RequestPlanItemInput).min(1).max(50),
  unresolved_destinations: z.array(SafeText).max(50).describe('Known destinations this plan cannot reach. They remain unresolved; they are never counted as done.'),
});
// --- WP08: execution outcomes ------------------------------------------------
// The execution dimension is computed from these rows. It is never set by an
// operator moving the request along, because moving a ticket is not an effect.
export const OutcomeResult = z.enum(['SUCCEEDED', 'FAILED', 'EFFECT_UNKNOWN', 'MANUAL_REQUIRED', 'NOT_SUPPORTED']);
export const OutcomeMethod = z.enum(['CONNECTOR_OPERATION', 'MANUAL_ATTESTATION', 'NONE']);
const outcomeRule = (o: { result: z.infer<typeof OutcomeResult>; method: z.infer<typeof OutcomeMethod>; evidence_reference: string | null }, c: z.RefinementCtx) => {
  // Success is a claim about the outside world, so it must name how it was done
  // and what evidence supports it.
  if (o.result === 'SUCCEEDED' && (o.method === 'NONE' || o.evidence_reference === null)) c.addIssue({ code: 'custom', message: 'A successful outcome must name its method and its evidence' });
  if (o.result === 'EFFECT_UNKNOWN' && o.method !== 'CONNECTOR_OPERATION') c.addIssue({ code: 'custom', message: 'An effect is only unknown after an attempt through a connector' });
  if (o.result === 'FAILED' && o.method === 'NONE') c.addIssue({ code: 'custom', message: 'A failure must name what was attempted' });
  // Work that has not happened yet cannot carry a method or evidence.
  if (['MANUAL_REQUIRED', 'NOT_SUPPORTED'].includes(o.result) && (o.method !== 'NONE' || o.evidence_reference !== null)) c.addIssue({ code: 'custom', message: 'Outstanding work carries no method and no evidence' });
};
export const SystemOutcomeRecord = z.strictObject({
  system_id: Id, result: OutcomeResult, method: OutcomeMethod, evidence_reference: SafeText.nullable(), note: SafeText,
}).superRefine(outcomeRule);
export const SystemOutcome = z.strictObject({
  system_id: Id, result: OutcomeResult, method: OutcomeMethod, evidence_reference: SafeText.nullable(), note: SafeText,
  recorded_at: Time, recorded_by: Id,
}).superRefine(outcomeRule);
export const RequestTransition = z.strictObject({ to: RequestState, reason: z.string().min(10).max(500) });
export const ResponseRelease = z.strictObject({
  third_party_redaction_reviewed: z.literal(true).describe('An access or correction response may only be released after a reviewer confirms unrelated persons are excluded.'),
  delivery_reference: SafeText, expires_at: Time,
});
export const RightsRequest = z.strictObject({
  id: Id, right_type: RightType, principal_id: Id, submitted_channel: z.enum(['PORTAL', 'RECORDED_MANUAL_INTAKE']),
  mandate_id: Id.nullable(), description: SafeText, state: RequestState, received_at: Time, updated_at: Time,
  identity: IdentityDimension, identity_grade: IdentityMatchGrade.nullable(),
  authority: AuthorityDimension, execution: ExecutionDimension, response: ResponseDimension, scope: ScopeDimension,
  plan: z.array(RequestPlanItem).max(50), unresolved_destinations: z.array(SafeText).max(50),
  outcomes: z.array(SystemOutcome).max(50), closure_note: SafeText.nullable(),
}).superRefine((r, c) => {
  // Complete means every planned system actually succeeded. Nothing else counts.
  if (r.execution === 'COMPLETE') {
    const succeeded = new Set(r.outcomes.filter(o => o.result === 'SUCCEEDED').map(o => o.system_id));
    if (r.plan.some(item => item.action !== 'NO_ACTION_REQUIRED' && !succeeded.has(item.system_id))) c.addIssue({ code: 'custom', message: 'Execution cannot be complete while a planned system has no successful outcome' });
  }
  if ((r.identity === 'NOT_ASSESSED') !== (r.identity_grade === null)) c.addIssue({ code: 'custom', message: 'An assessed identity records its grade' });
  // The invariant the whole module exists to protect: administrative closure
  // never implies that every system was reached.
  if (r.state === 'CLOSED' && r.execution === 'COMPLETE' && r.unresolved_destinations.length) c.addIssue({ code: 'custom', message: 'Execution cannot be complete while destinations remain unresolved' });
  if (r.scope === 'UNRESOLVED_DESTINATIONS' && !r.unresolved_destinations.length) c.addIssue({ code: 'custom', message: 'Unresolved scope must name its unresolved destinations' });
  if (r.response === 'RELEASED' && BLOCKING_GRADES.includes(r.identity_grade!)) c.addIssue({ code: 'custom', message: 'An unresolved identity cannot have received a disclosure' });
});
// ---------------------------------------------------------------------------
// M15 Retention Management (WP15). Retention is evaluated per copy, because a
// live record, a derived copy and a backup have different reachability and
// different truths. Three rules drive the design: no recorded basis is not
// permission to delete; conflicting constraints need a reviewed decision rather
// than an automatic longest-wins; and backup erasure is never reported verified.
// ---------------------------------------------------------------------------
export const RetentionTrigger = z.enum(['RECORD_CREATED', 'LAST_INTERACTION', 'CONSENT_WITHDRAWN', 'CONTRACT_ENDED', 'LEGAL_EVENT']);
export const RetentionBasis = z.enum(['STATUTORY_OBLIGATION', 'CONTRACTUAL_NECESSITY', 'REVIEWED_BUSINESS_NEED', 'CONSENT']);
const constraintShape = {
  data_asset_id: Id, purpose_id: Id, trigger: RetentionTrigger, basis: RetentionBasis,
  source_reference: SafeText.describe('The reviewed source this constraint comes from. A constraint is never inferred from usage.'),
  minimum_days: z.number().int().min(0).max(36500).nullable(),
  maximum_days: z.number().int().min(0).max(36500).nullable(),
  permitted_use: SafeText, owner_reference: SafeText, review_at: Time, release_condition: SafeText,
};
const constraintRule = (r: { minimum_days: number | null; maximum_days: number | null }, c: z.RefinementCtx) => {
  // A constraint that bounds nothing is not a constraint.
  if (r.minimum_days === null && r.maximum_days === null) c.addIssue({ code: 'custom', message: 'A retention constraint must state a minimum, a maximum, or both' });
  if (r.minimum_days !== null && r.maximum_days !== null && r.minimum_days > r.maximum_days) c.addIssue({ code: 'custom', message: 'Minimum retention cannot exceed maximum retention' });
};
export const RetentionConstraintCreate = z.strictObject(constraintShape).superRefine(constraintRule);
export const RetentionConstraint = z.strictObject({ ...constraintShape, id: Id, recorded_at: Time, recorded_by: Id }).superRefine(constraintRule);
/** A hold names the exact copies it covers. There is no hold-everything flag. */
const holdShape = {
  data_asset_ids: z.array(Id).min(1).max(50), reason: z.string().min(10).max(500),
  authority_reference: SafeText, issued_at: Time, review_at: Time,
  release_criterion: z.string().min(10).max(500),
};
export const LegalHoldCreate = z.strictObject(holdShape);
export const LegalHold = z.strictObject({
  ...holdShape, id: Id, state: z.enum(['ACTIVE', 'RELEASED']), recorded_at: Time, recorded_by: Id,
  released_at: Time.nullable(), release_reason: SafeText.nullable(),
}).superRefine((h, c) => {
  if ((h.state === 'RELEASED') !== (h.released_at !== null)) c.addIssue({ code: 'custom', message: 'A released hold records when it was released' });
  if ((h.released_at === null) !== (h.release_reason === null)) c.addIssue({ code: 'custom', message: 'A release must state its reason' });
});
export const HoldRelease = z.strictObject({ reason: z.string().min(10).max(500) });
/** A reviewed choice between constraints that disagree. Never computed automatically. */
export const RetentionDecisionRecord = z.strictObject({ governing_constraint_id: Id, reason: z.string().min(10).max(500) });
export const EligibilityBlocker = z.enum(['NO_RECORDED_BASIS', 'ACTIVE_LEGAL_HOLD', 'MINIMUM_NOT_ELAPSED', 'MAXIMUM_NOT_REACHED', 'UNRESOLVED_CONSTRAINT_CONFLICT', 'AWAITING_QUARANTINE_RECONCILIATION', 'ALREADY_TOMBSTONED']);
export const Eligibility = z.strictObject({
  data_asset_id: Id, evaluated_at: Time, eligible: z.boolean(),
  blockers: z.array(EligibilityBlocker).max(8),
  applicable_constraint_ids: z.array(Id).max(20), active_hold_ids: z.array(Id).max(20),
  governing_constraint_id: Id.nullable(), earliest_deletion_at: Time.nullable(),
  reasons: z.array(SafeText).min(1).max(16), limits: z.array(SafeText).max(8),
}).superRefine((e, c) => {
  // Eligibility and the blocker list are the same fact stated twice; they cannot disagree.
  if (e.eligible !== (e.blockers.length === 0)) c.addIssue({ code: 'custom', message: 'A copy is eligible exactly when nothing blocks it' });
  if (e.eligible && e.governing_constraint_id === null) c.addIssue({ code: 'custom', message: 'An eligible copy names the constraint that permits deletion' });
});
export const RetentionResult = z.enum(['SUPPRESSED', 'DELETED', 'FAILED', 'EFFECT_UNKNOWN', 'NOT_SUPPORTED', 'RESTORED_TO_QUARANTINE']);
const retentionOutcomeRule = (o: { result: z.infer<typeof RetentionResult>; method: z.infer<typeof OutcomeMethod>; evidence_reference: string | null }, c: z.RefinementCtx) => {
  if (['SUPPRESSED', 'DELETED'].includes(o.result) && (o.method === 'NONE' || o.evidence_reference === null)) c.addIssue({ code: 'custom', message: 'A completed retention action must name its method and its evidence' });
  if (o.result === 'EFFECT_UNKNOWN' && o.method === 'NONE') c.addIssue({ code: 'custom', message: 'An effect is only unknown after an attempt' });
  if (o.result === 'NOT_SUPPORTED' && (o.method !== 'NONE' || o.evidence_reference !== null)) c.addIssue({ code: 'custom', message: 'An unsupported action carries no method and no evidence' });
};
export const RetentionOutcomeRecord = z.strictObject({
  result: RetentionResult, method: OutcomeMethod, evidence_reference: SafeText.nullable(), note: SafeText,
}).superRefine(retentionOutcomeRule);
export const RetentionOutcome = z.strictObject({
  data_asset_id: Id, copy_class: DataAssetKind, result: RetentionResult, method: OutcomeMethod,
  evidence_reference: SafeText.nullable(), note: SafeText, recorded_at: Time, recorded_by: Id,
}).superRefine((o, c) => {
  retentionOutcomeRule(o, c);
  // A backup is not reachable for verification. A future expiry date is not
  // current proof of erasure, so a backup copy may never be reported as done.
  if (o.copy_class === 'BACKUP_COPY' && ['SUPPRESSED', 'DELETED'].includes(o.result)) c.addIssue({ code: 'custom', message: 'A backup copy cannot be reported as suppressed or deleted; backup erasure is not independently verifiable' });
});
// ---------------------------------------------------------------------------
// M18 Coverage and Failure Center (WP13). Two habits this module refuses:
// reporting a percentage without saying what was counted, and adding up states
// that overlap. Every measure carries its numerator, denominator and exclusions;
// every state names the states it can co-occur with, so nothing here can be
// summed into a single reassuring number.
// ---------------------------------------------------------------------------
export const CoverageDimension = z.enum(['INVENTORY_REVIEWED', 'INVENTORY_OBSERVED', 'RETENTION_BASIS', 'CONTROL_OBSERVATION', 'RIGHTS_EXECUTION']);
export const CoverageMeasure = z.strictObject({
  dimension: CoverageDimension,
  counted: SafeText.describe('Exactly what the denominator is a count of.'),
  numerator: Epoch, denominator: Epoch,
  excluded: Epoch, exclusion_reasons: z.array(SafeText).max(8),
  as_of: Time,
}).superRefine((m, c) => {
  if (m.numerator > m.denominator) c.addIssue({ code: 'custom', message: 'A coverage numerator cannot exceed its denominator' });
  // An exclusion that nobody can explain is indistinguishable from a silent drop.
  if ((m.excluded > 0) !== (m.exclusion_reasons.length > 0)) c.addIssue({ code: 'custom', message: 'Excluded records must be explained' });
});
export const AttentionState = z.enum(['FAILED', 'MANUAL_REQUIRED', 'EFFECT_UNKNOWN', 'PENDING', 'UNVERIFIED']);
export const AttentionCount = z.strictObject({
  state: AttentionState, count: Epoch,
  overlaps_with: z.array(AttentionState).max(5).describe('States a record in this count may also be in. These counts describe overlapping sets and must never be added together.'),
});
export const CoverageReport = z.strictObject({
  scope: Scope, as_of: Time,
  measures: z.array(CoverageMeasure).max(10),
  attention: z.array(AttentionCount).max(8),
  limits: z.array(SafeText).max(8),
}).superRefine((r, c) => {
  // A state cannot overlap with itself; that would make the warning meaningless.
  for (const entry of r.attention) if (entry.overlaps_with.includes(entry.state)) c.addIssue({ code: 'custom', message: 'A state cannot overlap with itself' });
});
export const GapSource = z.enum(['NO_RETENTION_BASIS', 'NEVER_OBSERVED', 'STALE_OBSERVATION', 'UNREVIEWED_INVENTORY', 'UNRESOLVED_DESTINATION', 'FAILED_EXECUTION']);
export const GapSeverity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const GapState = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'ACCEPTED_RISK']);
export const Gap = z.strictObject({
  id: Id, source: GapSource, subject_kind: z.enum(['DATA_ASSET', 'RIGHTS_REQUEST']), subject_id: Id,
  detected_at: Time, last_seen_at: Time, state: GapState, severity: GapSeverity,
  owner_reference: SafeText.nullable(), due_at: Time.nullable(),
  evidence_reference: SafeText.nullable(), resolution_note: SafeText.nullable(), description: SafeText,
}).superRefine((g, c) => {
  // A gap is only closed by evidence or by a recorded, owned acceptance of risk.
  if (g.state === 'RESOLVED' && g.evidence_reference === null) c.addIssue({ code: 'custom', message: 'A resolved gap must name the evidence that resolved it' });
  if (g.state === 'ACCEPTED_RISK' && (g.owner_reference === null || g.resolution_note === null)) c.addIssue({ code: 'custom', message: 'Accepted risk must name an owner and a reason' });
  if (Date.parse(g.last_seen_at) < Date.parse(g.detected_at)) c.addIssue({ code: 'custom', message: 'A gap cannot be last seen before it was detected' });
});
export const GapAssignment = z.strictObject({
  severity: GapSeverity, owner_reference: SafeText, due_at: Time,
});
export const GapClosure = z.strictObject({
  state: z.enum(['RESOLVED', 'ACCEPTED_RISK']), note: z.string().min(10).max(500), evidence_reference: SafeText.nullable(),
}).superRefine((g, c) => {
  if (g.state === 'RESOLVED' && g.evidence_reference === null) c.addIssue({ code: 'custom', message: 'Resolving a gap requires evidence' });
});
export const GapDerivation = z.strictObject({
  derived_at: Time, opened: Epoch, refreshed: Epoch, examined: Epoch,
  limits: z.array(SafeText).max(8),
});
/** Advisory only. A rule match never certifies a cause or closes anything. */
export const Guidance = z.strictObject({
  gap_id: Id, matched_rule: z.string().max(80).nullable(),
  suggestion: SafeText.nullable(),
  authority: z.literal('ADVISORY_ONLY').describe('Guidance is a suggestion for a person. It does not establish a root cause, close an action, or produce a decision.'),
  caveats: z.array(SafeText).min(1).max(8),
});
// ---------------------------------------------------------------------------
// M16 Processor and Vendor Management (WP16). The distinction this module is
// built to hold: telling a processor something, that processor acknowledging it,
// and somebody independently verifying it are three different facts. Collapsing
// them is how an organisation ends up believing a control it never checked.
// ---------------------------------------------------------------------------
/**
 * The Act's own role names, not another regime's. A Data Processor processes on
 * behalf of a Fiduciary (§2(k)); a Data Fiduciary is whoever "alone or in
 * conjunction with other persons determines the purpose and means" (§2(i)),
 * which is where the joint case comes from -- there is no "joint controller"
 * here to borrow. Reading these back against the Act is the point of naming
 * them this way.
 */
export const ProcessorRole = z.enum(['PROCESSOR', 'SUB_PROCESSOR', 'JOINT_FIDUCIARY', 'INDEPENDENT_FIDUCIARY']);
export const ProcessorCreate = z.strictObject({
  name: z.string().min(1).max(120), role: ProcessorRole,
  authorised_purpose_ids: z.array(Id).min(1).max(20),
  authorised_categories: z.array(DataCategoryCode).min(1).max(16),
  region: SafeText, contract_reference: SafeText,
  owner_reference: SafeText, incident_contact: SafeText,
  subprocessors_permitted: z.boolean(),
});
export const Processor = z.strictObject({
  name: z.string().min(1).max(120), role: ProcessorRole,
  authorised_purpose_ids: z.array(Id).min(1).max(20), authorised_categories: z.array(DataCategoryCode).min(1).max(16),
  region: SafeText, contract_reference: SafeText, owner_reference: SafeText, incident_contact: SafeText,
  subprocessors_permitted: z.boolean(), id: Id, recorded_at: Time, recorded_by: Id,
});
/** A system may be operated by a processor. The link is declared, never inferred. */
export const ProcessorLinkCreate = z.strictObject({ system_id: Id, basis: SafeText });
/**
 * Three separate facts about one coordination step, deliberately not merged.
 * NOTIFIED means ORVIA recorded that the processor was told. ACKNOWLEDGED means
 * the processor said something back. VERIFIED means somebody independently
 * checked. Only the third is evidence that anything actually happened.
 */
export const CoordinationFact = z.enum(['NOTIFIED', 'ACKNOWLEDGED', 'VERIFIED']);
export const CoordinationRecord = z.strictObject({
  processor_id: Id, fact: CoordinationFact, subject: SafeText,
  method: z.enum(['RECORDED_MESSAGE', 'RECORDED_REPLY', 'INDEPENDENT_CHECK', 'ATTRIBUTED_STATEMENT']),
  evidence_reference: SafeText.nullable(), note: SafeText,
}).superRefine((r, c) => {
  // Verification means somebody looked. A statement from the processor is an
  // attributable claim, not an independent check, and can never be verification.
  if (r.fact === 'VERIFIED' && r.method !== 'INDEPENDENT_CHECK') c.addIssue({ code: 'custom', message: 'Only an independent check can record verification; a processor statement is an attributable claim' });
  if (r.fact === 'VERIFIED' && r.evidence_reference === null) c.addIssue({ code: 'custom', message: 'Verification must name its evidence' });
  if (r.fact === 'NOTIFIED' && r.method !== 'RECORDED_MESSAGE') c.addIssue({ code: 'custom', message: 'Notification records the message that was sent' });
  if (r.fact === 'ACKNOWLEDGED' && !['RECORDED_REPLY', 'ATTRIBUTED_STATEMENT'].includes(r.method)) c.addIssue({ code: 'custom', message: 'An acknowledgement is something the processor said' });
});
export const Coordination = z.strictObject({
  processor_id: Id, fact: CoordinationFact, subject: SafeText,
  method: z.enum(['RECORDED_MESSAGE', 'RECORDED_REPLY', 'INDEPENDENT_CHECK', 'ATTRIBUTED_STATEMENT']),
  evidence_reference: SafeText.nullable(), note: SafeText, id: Id, recorded_at: Time, recorded_by: Id,
});
/** What is actually established about a processor, per fact, never as one score. */
export const ProcessorStanding = z.strictObject({
  processor_id: Id, as_of: Time,
  notified: z.boolean(), acknowledged: z.boolean(), verified: z.boolean(),
  open_findings: Epoch, overdue_remediations: Epoch,
  unauthorised_system_links: z.array(Id).max(20).describe('Systems linked to this processor that serve a purpose the processor is not authorised for.'),
  limits: z.array(SafeText).max(8),
}).superRefine((p, c) => {
  // Acknowledgement without notification, or verification presented as though it
  // followed from either, are the exact confusions this module exists to prevent.
  if (p.verified && !p.notified) c.addIssue({ code: 'custom', message: 'A verification cannot exist for a coordination that was never recorded as notified' });
});
export const AssessmentKind = z.enum(['DATA_PROTECTION_IMPACT', 'TRANSFER_RISK', 'SECTOR_SPECIFIC', 'VENDOR_DUE_DILIGENCE']);
export const AssessmentCreate = z.strictObject({
  processor_id: Id, kind: AssessmentKind,
  applicability_basis: z.string().min(10).max(500).describe('The reviewed reason this assessment applies. An assessment is never activated by a questionnaire alone.'),
  scope_system_ids: z.array(Id).max(20), reviewer_reference: SafeText, due_at: Time,
});
export const Assessment = z.strictObject({
  processor_id: Id, kind: AssessmentKind, applicability_basis: z.string().min(10).max(500),
  scope_system_ids: z.array(Id).max(20), reviewer_reference: SafeText, due_at: Time,
  id: Id, state: z.enum(['OPEN', 'COMPLETED', 'SUPERSEDED']), recorded_at: Time, recorded_by: Id,
  completed_at: Time.nullable(), conclusion: SafeText.nullable(),
}).superRefine((a, c) => {
  if ((a.state === 'COMPLETED') !== (a.completed_at !== null)) c.addIssue({ code: 'custom', message: 'A completed assessment records when it completed' });
  if ((a.completed_at === null) !== (a.conclusion === null)) c.addIssue({ code: 'custom', message: 'A completed assessment states its conclusion' });
});
export const FindingCreate = z.strictObject({
  assessment_id: Id, severity: GapSeverity, description: SafeText,
  affected_system_ids: z.array(Id).max(20), owner_reference: SafeText, due_at: Time,
});
export const Finding = z.strictObject({
  assessment_id: Id, severity: GapSeverity, description: SafeText, affected_system_ids: z.array(Id).max(20),
  owner_reference: SafeText, due_at: Time, id: Id, state: z.enum(['OPEN', 'REMEDIATED', 'ACCEPTED_RISK']),
  recorded_at: Time, recorded_by: Id, closed_at: Time.nullable(),
  closure_evidence: SafeText.nullable(), retest_reference: SafeText.nullable(), closure_note: SafeText.nullable(),
}).superRefine((f, c) => {
  if ((f.state === 'OPEN') === (f.closed_at !== null)) c.addIssue({ code: 'custom', message: 'A closed finding records when it closed' });
  // FR-M16-03: closure needs defined evidence or a retest. Neither is optional.
  if (f.state === 'REMEDIATED' && f.closure_evidence === null && f.retest_reference === null) c.addIssue({ code: 'custom', message: 'A remediated finding must name closure evidence or a retest' });
  if (f.state === 'ACCEPTED_RISK' && f.closure_note === null) c.addIssue({ code: 'custom', message: 'Accepted risk must state its reason' });
});
export const FindingClosure = z.strictObject({
  state: z.enum(['REMEDIATED', 'ACCEPTED_RISK']),
  closure_evidence: SafeText.nullable(), retest_reference: SafeText.nullable(), note: z.string().min(10).max(500),
}).superRefine((f, c) => {
  if (f.state === 'REMEDIATED' && f.closure_evidence === null && f.retest_reference === null) c.addIssue({ code: 'custom', message: 'Remediation requires closure evidence or a retest' });
});
export const AssessmentCompletion = z.strictObject({ conclusion: z.string().min(10).max(500) });
// ---------------------------------------------------------------------------
// M17 Privacy Incident Explorer (WP17). Occurrence, detection and awareness are
// three different moments and are recorded separately, because obligations run
// from different ones and conflating them silently moves a deadline. Deadlines
// come from a reviewed rule pack the customer activated, never from hours
// hard-coded into the product, and severity is deterministic configured policy
// rather than an inference about what the law requires.
// ---------------------------------------------------------------------------
export const IncidentSeverity = z.enum(['NEGLIGIBLE', 'LOW', 'MEDIUM', 'HIGH', 'SEVERE']);
export const IncidentState = z.enum(['OPEN', 'CONTAINED', 'CLOSED']);
export const IncidentCreate = z.strictObject({
  summary: z.string().min(10).max(500),
  occurred_at: Time.nullable().describe('When the incident actually happened, if established. Unknown is a real answer and is not replaced by the detection time.'),
  detected_at: Time.describe('When the organisation first detected something was wrong.'),
  became_aware_at: Time.nullable().describe('When the organisation became aware in the sense a reviewed rule pack means. Often later than detection, and never assumed equal to it.'),
  occurrence_basis: SafeText, severity: IncidentSeverity, severity_basis: SafeText,
  affected_system_ids: z.array(Id).max(20), affected_purpose_ids: z.array(Id).max(20),
  affected_processor_ids: z.array(Id).max(20),
  principal_scope: SafeText.describe('What is known about who is affected, including that it is not yet known.'),
  principal_scope_certain: z.boolean(),
}).superRefine((i, c) => {
  // Checked at the boundary as well as in the database, so a caller gets a named
  // validation error rather than a bare failure from a constraint.
  if (i.occurred_at && Date.parse(i.detected_at) < Date.parse(i.occurred_at)) c.addIssue({ code: 'custom', message: 'An incident cannot be detected before it occurred' });
  if (i.became_aware_at && Date.parse(i.became_aware_at) < Date.parse(i.detected_at)) c.addIssue({ code: 'custom', message: 'Awareness cannot precede detection' });
});
export const Incident = z.strictObject({
  summary: z.string().min(10).max(500), occurred_at: Time.nullable(), detected_at: Time, became_aware_at: Time.nullable(),
  occurrence_basis: SafeText, severity: IncidentSeverity, severity_basis: SafeText,
  affected_system_ids: z.array(Id).max(20), affected_purpose_ids: z.array(Id).max(20), affected_processor_ids: z.array(Id).max(20),
  principal_scope: SafeText, principal_scope_certain: z.boolean(),
  id: Id, state: IncidentState, recorded_at: Time, recorded_by: Id,
  contained_at: Time.nullable(), closed_at: Time.nullable(), closure_note: SafeText.nullable(),
}).superRefine((i, c) => {
  // An incident cannot be detected before it happened, nor become known before
  // it was detected. These orderings are the whole point of keeping them apart.
  if (i.occurred_at && Date.parse(i.detected_at) < Date.parse(i.occurred_at)) c.addIssue({ code: 'custom', message: 'An incident cannot be detected before it occurred' });
  if (i.became_aware_at && Date.parse(i.became_aware_at) < Date.parse(i.detected_at)) c.addIssue({ code: 'custom', message: 'Awareness cannot precede detection' });
  if ((i.state === 'CLOSED') !== (i.closed_at !== null)) c.addIssue({ code: 'custom', message: 'A closed incident records when it closed' });
  if ((i.closed_at === null) !== (i.closure_note === null)) c.addIssue({ code: 'custom', message: 'Closing an incident requires a reason' });
  if (i.state === 'OPEN' && i.contained_at !== null) c.addIssue({ code: 'custom', message: 'An open incident has not been contained' });
});
/** Corrections append. A correction never silently restarts a clock. */
export const IncidentCorrection = z.strictObject({
  field: z.enum(['OCCURRED_AT', 'BECAME_AWARE_AT', 'SEVERITY', 'PRINCIPAL_SCOPE']),
  new_value: SafeText, reason: z.string().min(10).max(500), reviewer_reference: SafeText,
});
export const IncidentCorrectionRecord = z.strictObject({
  id: Id, incident_id: Id, field: z.enum(['OCCURRED_AT', 'BECAME_AWARE_AT', 'SEVERITY', 'PRINCIPAL_SCOPE']),
  previous_value: SafeText.nullable(), new_value: SafeText, reason: z.string().min(10).max(500),
  reviewer_reference: SafeText, recorded_at: Time, recorded_by: Id,
  affected_deadlines: z.array(Id).max(20).describe('Obligations whose deadline was recomputed. A correction changes them openly or not at all.'),
});
/**
 * A reviewed rule pack the customer activated. ORVIA ships no universal hours:
 * the duration and the clock it runs from are configuration with a named source,
 * and activating a pack is a separate reviewed decision from recording it.
 */
export const ObligationRuleCreate = z.strictObject({
  recipient: SafeText.describe('Who must be told. A regulator, a class of principals, or a named counterparty.'),
  regime_reference: SafeText.describe('The reviewed source this duty comes from.'),
  runs_from: z.enum(['OCCURRED_AT', 'DETECTED_AT', 'BECAME_AWARE_AT']),
  hours: z.number().int().min(1).max(8760),
  minimum_severity: IncidentSeverity,
  applies_when_scope_uncertain: z.boolean(),
});
export const ObligationRule = z.strictObject({
  recipient: SafeText, regime_reference: SafeText, runs_from: z.enum(['OCCURRED_AT', 'DETECTED_AT', 'BECAME_AWARE_AT']),
  hours: z.number().int().min(1).max(8760), minimum_severity: IncidentSeverity, applies_when_scope_uncertain: z.boolean(),
  id: Id, active: z.boolean(), recorded_at: Time, recorded_by: Id,
});
export const NotificationState = z.enum(['NOT_APPLICABLE', 'PENDING_REVIEW', 'DRAFTED', 'APPROVED', 'DISPATCHED', 'DELIVERY_UNCONFIRMED', 'MANUAL_PACKAGE_REQUIRED']);
export const NotificationObligation = z.strictObject({
  id: Id, incident_id: Id, rule_id: Id, recipient: SafeText, regime_reference: SafeText,
  state: NotificationState, runs_from: z.enum(['OCCURRED_AT', 'DETECTED_AT', 'BECAME_AWARE_AT']),
  clock_started_at: Time.nullable(), due_at: Time.nullable(), overdue: z.boolean(),
  dispatch_evidence: SafeText.nullable(), unavailable_reason: SafeText.nullable(),
}).superRefine((o, c) => {
  // A clock that has not started has no deadline, and a deadline with no clock
  // is a number somebody invented.
  if ((o.clock_started_at === null) !== (o.due_at === null)) c.addIssue({ code: 'custom', message: 'A deadline exists exactly when its clock has started' });
  if (o.overdue && o.due_at === null) c.addIssue({ code: 'custom', message: 'Nothing can be overdue without a deadline' });
  if (o.state === 'DISPATCHED' && o.dispatch_evidence === null) c.addIssue({ code: 'custom', message: 'A dispatch must name its evidence' });
  if (o.state === 'MANUAL_PACKAGE_REQUIRED' && o.unavailable_reason === null) c.addIssue({ code: 'custom', message: 'A manual package must state why no supported channel exists' });
});
export const IncidentAssessment = z.strictObject({
  incident: Incident, obligations: z.array(NotificationObligation).max(50),
  corrections: z.array(IncidentCorrectionRecord).max(50),
  assessed_at: Time, limits: z.array(SafeText).max(8),
});
export const NotificationTransition = z.strictObject({
  to: NotificationState, note: z.string().min(10).max(500),
  dispatch_evidence: SafeText.nullable(), unavailable_reason: SafeText.nullable(),
}).superRefine((t, c) => {
  if (t.to === 'DISPATCHED' && t.dispatch_evidence === null) c.addIssue({ code: 'custom', message: 'Dispatch requires evidence' });
  if (t.to === 'MANUAL_PACKAGE_REQUIRED' && t.unavailable_reason === null) c.addIssue({ code: 'custom', message: 'A manual package must state why no supported channel exists' });
});
export const IncidentClosure = z.strictObject({ note: z.string().min(10).max(500) });
export const IncidentContainment = z.strictObject({ note: z.string().min(10).max(500) });
// ---------------------------------------------------------------------------
// M10 Notification Engine (WP11). Queued, sent, delivered, failed and
// acknowledged are five different facts about one message and are recorded
// separately, because "we sent it" is not "they got it" and neither is "they
// read it". Escalation raises attention without ever moving the deadline that
// caused it: silently resetting a clock is how a breach of it disappears.
// ---------------------------------------------------------------------------
export const NotificationChannel = z.enum(['IN_APP', 'EMAIL', 'APPROVED_WEBHOOK']);
export const NotificationSource = z.enum(['COVERAGE_GAP', 'NOTIFICATION_OBLIGATION', 'ASSESSMENT_FINDING']);
export const RecipientScope = z.enum(['CUSTOMER_STAFF', 'DATA_PRINCIPAL', 'DESIGNATED_BUSINESS_CONTACT']);
export const TemplateCreate = z.strictObject({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{2,60}$/), channel: NotificationChannel,
  recipient_scope: RecipientScope, subject: SafeText, body: z.string().min(10).max(4000),
  purpose_note: SafeText.describe('Why this message is sent at all. An operational message is not a marketing opportunity.'),
});
export const Template = z.strictObject({
  code: z.string().regex(/^[A-Z][A-Z0-9_]{2,60}$/), channel: NotificationChannel, recipient_scope: RecipientScope,
  subject: SafeText, body: z.string().min(10).max(4000), purpose_note: SafeText,
  id: Id, version: z.number().int().positive(), content_digest: Digest, recorded_at: Time, recorded_by: Id,
});
export const NotificationTaskCreate = z.strictObject({
  template_id: Id, source: NotificationSource, source_id: Id,
  recipient_reference: SafeText.describe('Who this goes to, as the customer records them. ORVIA holds no directory.'),
  /** The deadline that made this necessary. Escalation never changes it. */
  source_due_at: Time.nullable(),
});
export const DeliveryFact = z.enum(['QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'ACKNOWLEDGED']);
export const DeliveryRecord = z.strictObject({
  fact: DeliveryFact,
  evidence_reference: SafeText.nullable(), note: SafeText,
}).superRefine((d, c) => {
  // Every fact after queueing is a claim about the outside world and must be
  // evidenced. Queueing is the one thing ORVIA does itself.
  if (d.fact !== 'QUEUED' && d.evidence_reference === null) c.addIssue({ code: 'custom', message: 'Anything beyond queueing is a claim about the outside world and must name its evidence' });
});
export const Delivery = z.strictObject({
  id: Id, task_id: Id, fact: DeliveryFact, evidence_reference: SafeText.nullable(), note: SafeText,
  recorded_at: Time, recorded_by: Id,
});
export const NotificationTask = z.strictObject({
  id: Id, template_id: Id, template_code: z.string().max(64), channel: NotificationChannel,
  recipient_scope: RecipientScope, recipient_reference: SafeText,
  source: NotificationSource, source_id: Id, source_due_at: Time.nullable(),
  created_at: Time,
  /** Each fact recorded independently. They are not a single progress bar. */
  queued: z.boolean(), sent: z.boolean(), delivered: z.boolean(), failed: z.boolean(), acknowledged: z.boolean(),
  attempts: z.number().int().min(0).max(1000),
  channel_available: z.boolean().describe('Whether this deployment can actually deliver on this channel. A message on an unavailable channel is queued and nothing more.'),
  escalated_at: Time.nullable(), escalation_reason: SafeText.nullable(),
  deliveries: z.array(Delivery).max(100),
}).superRefine((t, c) => {
  // Delivery presupposes sending; acknowledgement presupposes delivery. Claiming
  // a later fact without the earlier one is the confusion this prevents.
  if (t.delivered && !t.sent) c.addIssue({ code: 'custom', message: 'Something cannot be delivered without having been sent' });
  if (t.acknowledged && !t.delivered) c.addIssue({ code: 'custom', message: 'Something cannot be acknowledged without having been delivered' });
  if (t.sent && !t.queued) c.addIssue({ code: 'custom', message: 'Something cannot be sent without having been queued' });
  if ((t.escalated_at === null) !== (t.escalation_reason === null)) c.addIssue({ code: 'custom', message: 'An escalation must state its reason' });
  if (t.channel_available === false && t.sent) c.addIssue({ code: 'custom', message: 'A message cannot have been sent on a channel this deployment cannot deliver' });
});
export const EscalationSweep = z.strictObject({
  swept_at: Time, examined: Epoch, escalated: Epoch,
  deadlines_changed: z.literal(0).describe('Escalation never alters a deadline. This is asserted, not merely intended.'),
  limits: z.array(SafeText).max(8),
});
// ---------------------------------------------------------------------------
// M27 Licensing and M28 Entitlements (WP25). A licence says what was bought. It
// is not a channel for instructions: it carries no commands, no endpoints and no
// authority grants, and a licence that names a capability this product will not
// sell is rejected outright rather than quietly ignored. Five independent gates
// must all be satisfied before a feature is usable, so no single flag can open
// anything on its own.
// ---------------------------------------------------------------------------
export const Edition = z.enum(['FOUNDATION', 'CONTROL', 'ENTERPRISE']);
/** Features that can be licensed. One closed vocabulary, shared by every gate. */
export const EntitlementCode = z.enum([
  'PRIVACY_GRAPH', 'RIGHTS_MANAGEMENT', 'RETENTION_MANAGEMENT', 'PROCESSOR_MANAGEMENT',
  'INCIDENT_MANAGEMENT', 'COVERAGE_REPORTING', 'NOTIFICATIONS', 'PRIVACY_TEST_ENGINE',
]);
/**
 * Capabilities no edition and no licence may ever enable. These are not priced
 * features being withheld: they are commitments about what this product does not
 * do, and a licence naming one is rejected rather than ignored.
 */
export const NEVER_LICENSABLE: readonly string[] = ['AI_COPILOT', 'AI_DISCOVERY', 'AI_POLICY_BUILDER', 'VENDOR_REMOTE_ACCESS', 'STAFF_DIRECTORY_SYNC', 'PROACTIVE_DIAGNOSTICS', 'CUSTOMER_RUNTIME_REPLICATION'];
export const LicenceClaims = z.strictObject({
  licence_id: Id, edition: Edition,
  entitlements: z.array(EntitlementCode).min(1).max(16),
  installation_id: Id.describe('The installation this licence is bound to. A licence is not transferable by copying it.'),
  audience: z.literal('ORVIA_CUSTOMER_INSTALLATION'),
  valid_from: Time, valid_to: Time,
  licensed_limits: z.strictObject({ environments: z.number().int().min(1).max(100), staff_members: z.number().int().min(1).max(10000) }),
}).superRefine((l, c) => {
  if (Date.parse(l.valid_to) <= Date.parse(l.valid_from)) c.addIssue({ code: 'custom', message: 'A licence validity window must be positive' });
  if (new Set(l.entitlements).size !== l.entitlements.length) c.addIssue({ code: 'custom', message: 'A licence cannot name the same entitlement twice' });
});
export const SignedLicence = z.strictObject({
  algorithm: z.literal('Ed25519'), claims: LicenceClaims,
  signing_key_id: Id, signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
});
export const LicenceImport = z.strictObject({ licence: SignedLicence });
export const LicenceRejection = z.enum([
  'UNTRUSTED_SIGNER', 'INVALID_SIGNATURE', 'WRONG_AUDIENCE', 'WRONG_INSTALLATION',
  'NOT_YET_VALID', 'EXPIRED', 'MALFORMED', 'FORBIDDEN_CAPABILITY', 'REPLAYED',
]);
export const LicenceState = z.strictObject({
  licence_id: Id, edition: Edition, entitlements: z.array(EntitlementCode).max(16),
  installation_id: Id, valid_from: Time, valid_to: Time,
  licensed_limits: z.strictObject({ environments: z.number().int().min(1).max(100), staff_members: z.number().int().min(1).max(10000) }),
  imported_at: Time, imported_by: Id, active: z.boolean(),
  /** Set when the window has passed. Expiry restricts new work; it never removes
   *  recorded evidence or the ability to read and export what already exists. */
  expired: z.boolean(), continuity_note: SafeText,
});
export const EntitlementGate = z.enum(['RELEASE_AVAILABILITY', 'DEPLOYMENT_SUPPORT', 'CONTROLLED_ROLLOUT', 'LICENCE_ENTITLEMENT', 'ACTOR_AUTHORISATION']);
export const FeatureAvailability = z.strictObject({
  feature: EntitlementCode, usable: z.boolean(),
  gates: z.array(z.strictObject({ gate: EntitlementGate, satisfied: z.boolean(), reason: SafeText })).length(5)
    .describe('All five gates must be satisfied. They are reported individually because knowing which one blocks is the whole point.'),
  limits: z.array(SafeText).max(8),
}).superRefine((f, c) => {
  // Usable exactly when every gate passes. A feature cannot be usable because
  // one gate happened to be generous.
  if (f.usable !== f.gates.every(gate => gate.satisfied)) c.addIssue({ code: 'custom', message: 'A feature is usable exactly when every gate is satisfied' });
  const named = new Set(f.gates.map(gate => gate.gate));
  if (named.size !== 5) c.addIssue({ code: 'custom', message: 'Every gate must be reported exactly once' });
});
export const EntitlementReport = z.strictObject({
  as_of: Time, licence: LicenceState.nullable(),
  features: z.array(FeatureAvailability).max(16),
  never_licensable: z.array(SafeText).min(1).max(16).describe('Capabilities no licence or edition can enable, stated so that their absence is not read as an upsell.'),
  limits: z.array(SafeText).max(8),
});
// ---------------------------------------------------------------------------
// M30 Support Bundle System (WP26). A diagnostic report is assembled from a
// closed vocabulary: every field is an enum, an integer, a timestamp, a version
// or a digest, so there is no field in which a log line, an operational summary
// or a directory listing could be written. Minimisation is a property of the
// schema rather than a promise about behaviour.
//
// Approval is bound to one exact payload digest, and carries no authority to
// generate anything: a changed report needs a new approval, and an old approval
// can never produce a fresh report. The vendor case and the local control are
// reported as two separate facts, because closing the first does not close the
// second.
// ---------------------------------------------------------------------------
/** Why a support case was opened. Closed, so the reason cannot become prose. */
export const SupportSubject = z.enum([
  'INSTALLATION_FAILURE', 'MIGRATION_FAILURE', 'POLICY_DECISION_UNAVAILABLE', 'CONNECTOR_OBSERVATION_FAILURE',
  'EVIDENCE_EXPORT_FAILURE', 'LICENCE_VERIFICATION_FAILURE', 'UPDATE_FAILURE', 'PERFORMANCE_DEGRADATION',
]);
/** Everything a diagnostic report is able to say. Adding a code is a contract
 *  change that goes through review; writing a sentence is not possible at all. */
export const DiagnosticCode = z.enum([
  'WORKFLOW_NEEDS_ATTENTION', 'CONNECTOR_OBSERVATION_FAILED', 'STALE_OBSERVATION_BACKLOG',
  'NOTIFICATION_DELIVERY_FAILED', 'RIGHTS_EXECUTION_FAILED', 'RETENTION_DELETION_UNVERIFIED',
  'OPEN_CRITICAL_GAP', 'LICENCE_ABSENT_OR_EXPIRED', 'UPDATE_STEP_INTERRUPTED',
]);
export const DiagnosticObservation = z.strictObject({
  code: DiagnosticCode, occurrences: z.number().int().min(1).max(100000),
  first_seen_at: Time, last_seen_at: Time,
}).superRefine((o, c) => {
  if (Date.parse(o.last_seen_at) < Date.parse(o.first_seen_at)) c.addIssue({ code: 'custom', message: 'An observation cannot last be seen before it was first seen' });
});
export const DiagnosticReport = z.strictObject({
  report_id: Id, generated_at: Time,
  /** A one-way reference derived from the installation id, so a vendor can
   *  correlate two reports without ever learning the installation identity. */
  installation_reference: Digest,
  product_version: Version, contract_version: Version, command_schema_version: Version,
  deployment_profile: z.enum(['CUSTOMER_LOCAL_SYNTHETIC']),
  schema_revision: Epoch.describe('How many migrations this installation has applied.'),
  subject: SupportSubject,
  observations: z.array(DiagnosticObservation).max(32),
  /** Deliberately counts of configuration and backlog, never of people. */
  counts: z.strictObject({ systems_configured: Epoch, open_gaps: Epoch, workflows_needing_attention: Epoch, failed_notification_deliveries: Epoch }),
});
export const DiagnosticDraft = z.strictObject({
  id: Id, case_id: Id, report: DiagnosticReport, payload_digest: Digest,
  generated_at: Time, generated_by: Id,
  superseded: z.boolean().describe('A newer draft exists for this case. The approval that named this one is not transferable to it.'),
  /** A draft that fails the scan is never stored, so every stored draft has zero
   *  findings. This is a structural guarantee, not a reassuring default. */
  forbidden_content_scan: z.strictObject({ ran: z.literal(true), canaries_checked: Epoch, findings: z.literal(0) }),
});
export const DiagnosticApprovalCreate = z.strictObject({
  approved_digest: Digest.describe('The digest of the exact payload the approver previewed. A different payload is refused, not substituted.'),
  destination: z.enum(['VENDOR_SUPPORT_INGRESS', 'MANUAL_OFFLINE_TRANSFER']),
  purpose: z.literal('DIAGNOSE_REPORTED_FAILURE'),
  retention_days: z.number().int().min(1).max(365),
});
export const DiagnosticApproval = z.strictObject({
  id: Id, draft_id: Id, approved_digest: Digest,
  destination: z.enum(['VENDOR_SUPPORT_INGRESS', 'MANUAL_OFFLINE_TRANSFER']),
  purpose: z.literal('DIAGNOSE_REPORTED_FAILURE'), retention_days: z.number().int().min(1).max(365),
  approved_at: Time, approved_by: Id,
  /** An approval covers one payload that already exists. It is never a standing
   *  rule, and it can never cause a report to be generated. */
  authorises_generation: z.literal(false),
  limits: z.array(SafeText).max(8),
});
export const TransferRecord = z.strictObject({
  method: z.literal('MANUAL_OFFLINE_TRANSFER'),
  outcome: z.enum(['NOT_ATTEMPTED', 'ACCEPTED', 'REJECTED']),
  rejection_code: SafeText.nullable(), evidence_reference: SafeText.nullable(), note: SafeText,
});
export const DiagnosticTransfer = z.strictObject({
  id: Id, approval_id: Id, digest_at_transfer: Digest,
  method: z.literal('MANUAL_OFFLINE_TRANSFER'),
  outcome: z.enum(['NOT_ATTEMPTED', 'ACCEPTED', 'REJECTED']),
  rejection_code: SafeText.nullable(), evidence_reference: SafeText.nullable(), note: SafeText,
  recorded_at: Time, recorded_by: Id,
  /** This product has no support transport. An operator carried the payload and
   *  is recording that they did; ORVIA neither sent it nor observed it arrive. */
  transported_by_orvia: z.literal(false),
});
export const IngressSubmission = z.strictObject({
  case_reference: z.string().regex(/^[A-Z_][A-Z0-9_-]{3,39}$/),
  body_base64: z.string().regex(/^[A-Za-z0-9+/]{4,26000}={0,2}$/).describe('The exact bytes that would be transferred. A rejected body is never stored: only its size and the reason are kept.'),
});
export const IngressValidation = z.strictObject({
  validated_at: Time, accepted: z.boolean(),
  rejection_code: z.enum(['MALFORMED_JSON', 'UNKNOWN_FIELD', 'SCHEMA_MISMATCH', 'OVERSIZED', 'FORBIDDEN_CONTENT', 'UNKNOWN_CASE_REFERENCE']).nullable(),
  byte_length: Epoch,
  /** There is no column in which a submitted body could be kept, rejected or not. */
  body_persisted: z.literal(false),
  limits: z.array(SafeText).max(8),
}).superRefine((v, c) => {
  if (v.accepted !== (v.rejection_code === null)) c.addIssue({ code: 'custom', message: 'A submission is accepted exactly when no rejection reason was found' });
});
export const CanaryRegister = z.strictObject({ token: z.string().min(8).max(200), note: SafeText });
export const Canary = z.strictObject({
  id: Id, token_digest: Digest.describe('The token itself is stored so payloads can be searched for it, and is never returned.'),
  note: SafeText, registered_at: Time, registered_by: Id,
});
export const SupportCaseCreate = z.strictObject({
  subject: SupportSubject,
  gap_id: Id.nullable().describe('The recorded coverage gap this case is about, when there is one. The gap is what closes locally; the case is not.'),
});
export const SupportCase = z.strictObject({
  id: Id, subject: SupportSubject,
  state: z.enum(['OPEN', 'AWAITING_VENDOR', 'AWAITING_CUSTOMER', 'CLOSED']),
  gap_id: Id.nullable(), vendor_case_reference: z.string().regex(/^[A-Z_][A-Z0-9_-]{3,39}$/).nullable(),
  opened_at: Time, opened_by: Id,
});
export const SupportResolution = z.strictObject({
  kind: z.enum(['REVIEWED_INSTRUCTIONS', 'SIGNED_CUSTOMER_APPLIED_PATCH', 'NO_FIX_REQUIRED']),
  reference: SafeText, vendor_case_state: z.enum(['VENDOR_RESOLVED', 'VENDOR_CLOSED']),
  vendor_case_reference: z.string().regex(/^[A-Z_][A-Z0-9_-]{3,39}$/),
});
export const SupportCaseStanding = z.strictObject({
  support_case: SupportCase,
  vendor_case_state: z.enum(['NOT_SUBMITTED', 'SUBMITTED', 'VENDOR_RESOLVED', 'VENDOR_CLOSED']),
  /** Read from the linked coverage gap, never written here. */
  local_control_state: z.enum(['NO_LINKED_GAP', 'GAP_OPEN', 'GAP_IN_PROGRESS', 'GAP_RESOLVED', 'GAP_RISK_ACCEPTED']),
  local_control_verified: z.boolean(),
  drafts: z.array(DiagnosticDraft).max(20),
  /** Structural, in the manner of a literal zero: whatever the vendor does to
   *  their case, this product never derives a local control state from it. */
  vendor_resolution_closes_local_gaps: z.literal(false),
  limits: z.array(SafeText).max(8),
}).superRefine((s, c) => {
  // The only thing that makes a local control verified is a resolved gap with
  // recorded evidence. An accepted risk is a decision, not a verification.
  if (s.local_control_verified !== (s.local_control_state === 'GAP_RESOLVED')) c.addIssue({ code: 'custom', message: 'A local control is verified exactly when its gap is resolved with evidence' });
});
// ---------------------------------------------------------------------------
// M31 Updates (WP27). A release manifest is immutable and signed, and states its
// own provenance, dependencies and migrations. Eligibility to download is
// computed and reported separately from permission to execute, which is a second
// explicit act by a second capability.
//
// The invariant that matters most: this product does not claim rollback when the
// schema cannot give it. An irreversible migration in the manifest forces
// forward recovery, and the schema refuses to express the reassuring answer.
// ---------------------------------------------------------------------------
export const MigrationNote = z.strictObject({
  migration: z.string().regex(/^\d{4}_[a-z0-9_]{1,60}$/),
  irreversible: z.boolean().describe('True when the migration cannot be undone by reversing it. One of these decides the recovery mode for the whole update.'),
  note: SafeText,
});
export const ArchiveEntry = z.strictObject({ path: z.string().min(1).max(200), bytes: z.number().int().min(0).max(4000000000) });
export const ReleaseClaims = z.strictObject({
  release_id: Id, version: Version, published_at: Time,
  audience: z.literal('ORVIA_CUSTOMER_INSTALLATION'),
  minimum_upgradable_from: Version,
  supported_profiles: z.array(z.literal('CUSTOMER_LOCAL_SYNTHETIC')).min(1).max(4),
  artifact_digest: Digest, artifact_bytes: z.number().int().min(1).max(4000000000),
  archive: z.array(ArchiveEntry).min(1).max(500),
  dependencies: z.array(z.strictObject({ name: z.string().min(1).max(120), version: Version, digest: Digest })).max(300),
  provenance: z.strictObject({
    source_commit: z.string().regex(/^[a-f0-9]{40}$/), built_at: Time,
    builder_reference: SafeText, reviewed_by_reference: SafeText,
  }),
  migrations: z.array(MigrationNote).max(64),
  /** FR-M31-04, written as literals so a manifest cannot quietly say otherwise.
   *  An update that needed any of these would have to be a different product. */
  introduces_network_egress: z.literal(false),
  requires_model_runtime: z.literal(false),
  /** Closed to this contract's own capability vocabulary, so a release cannot
   *  introduce an authority that does not already exist here. */
  introduces_capabilities: z.array(Capability).max(32),
}).superRefine((r, c) => {
  if (Date.parse(r.provenance.built_at) > Date.parse(r.published_at)) c.addIssue({ code: 'custom', message: 'A release cannot be published before it was built' });
  if (new Set(r.archive.map(entry => entry.path)).size !== r.archive.length) c.addIssue({ code: 'custom', message: 'An archive cannot name the same path twice' });
  if (new Set(r.migrations.map(m => m.migration)).size !== r.migrations.length) c.addIssue({ code: 'custom', message: 'A manifest cannot name the same migration twice' });
});
export const SignedRelease = z.strictObject({
  algorithm: z.literal('Ed25519'), claims: ReleaseClaims,
  signing_key_id: Id, signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
});
export const ReleaseImport = z.strictObject({ release: SignedRelease });
export const ReleaseRejection = z.enum([
  'UNTRUSTED_ORIGIN', 'INVALID_SIGNATURE', 'WRONG_AUDIENCE', 'MALFORMED', 'REPLAYED', 'PROHIBITED_CHANGE',
]);
export const ReleaseState = z.strictObject({
  id: Id, release_id: Id, version: Version, published_at: Time,
  artifact_digest: Digest, artifact_bytes: z.number().int().min(1).max(4000000000),
  signing_key_id: Id, imported_at: Time, imported_by: Id,
  dependency_count: Epoch, migration_count: Epoch,
  irreversible_migrations: z.array(z.string().regex(/^\d{4}_[a-z0-9_]{1,60}$/)).max(64),
  provenance: z.strictObject({ source_commit: z.string().regex(/^[a-f0-9]{40}$/), built_at: Time, builder_reference: SafeText, reviewed_by_reference: SafeText }),
});
export const UpdateCheck = z.enum([
  'TRUSTED_ORIGIN', 'SIGNATURE_VALID', 'AUDIENCE_MATCH', 'PROFILE_SUPPORTED',
  'UPGRADE_PATH_SUPPORTED', 'ARCHIVE_ENTRIES_SAFE', 'NO_PROHIBITED_CHANGE', 'NO_UNSAFE_DOWNGRADE',
]);
export const UpdateEligibility = z.strictObject({
  release_id: Id, release_version: Version, installed_version: Version, evaluated_at: Time,
  eligible: z.boolean(),
  checks: z.array(z.strictObject({ check: UpdateCheck, satisfied: z.boolean(), reason: SafeText })).length(8),
  recovery_mode: z.enum(['FORWARD_RECOVERY_ONLY', 'REVERSIBLE']),
  rollback_available: z.boolean(),
  /** Being allowed to fetch a release is not being allowed to run it. Applying
   *  is a separate act, by a separate capability, that re-runs every check. */
  eligibility_is_not_permission_to_execute: z.literal(true),
  limits: z.array(SafeText).max(8),
}).superRefine((e, c) => {
  if (e.eligible !== e.checks.every(check => check.satisfied)) c.addIssue({ code: 'custom', message: 'A release is eligible exactly when every check is satisfied' });
  if (new Set(e.checks.map(check => check.check)).size !== 8) c.addIssue({ code: 'custom', message: 'Every update check must be reported exactly once' });
  // The rule this module exists to keep: no reassuring rollback claim when the
  // applied schema cannot be reversed.
  if (e.rollback_available !== (e.recovery_mode === 'REVERSIBLE')) c.addIssue({ code: 'custom', message: 'Rollback is available exactly when the recovery mode is reversible' });
});
export const UpdateStepName = z.enum([
  'VERIFY_TRUSTED_ORIGIN', 'VERIFY_ARTIFACT_DIGEST', 'UNPACK_ARTIFACT', 'APPLY_MIGRATIONS',
  'RESTART_SERVICES', 'REVALIDATE_BOUNDARIES', 'RUN_CORE_REGRESSION',
]);
export const UpdateStepRecord = z.strictObject({
  step: UpdateStepName, state: z.enum(['RUNNING', 'SUCCEEDED', 'FAILED']),
  evidence_reference: SafeText.nullable(), note: SafeText,
}).superRefine((s, c) => {
  if (s.state === 'SUCCEEDED' && s.evidence_reference === null) c.addIssue({ code: 'custom', message: 'A step that succeeded must name the evidence for that claim' });
});
export const UpdateStep = z.strictObject({
  id: Id, step: UpdateStepName, state: z.enum(['RUNNING', 'SUCCEEDED', 'FAILED']),
  evidence_reference: SafeText.nullable(), note: SafeText, recorded_at: Time, recorded_by: Id,
});
export const UpdatePlanCreate = z.strictObject({ approval_note: SafeText, acknowledged_recovery_mode: z.enum(['FORWARD_RECOVERY_ONLY', 'REVERSIBLE']) });
export const UpdatePlan = z.strictObject({
  id: Id, release_id: Id, from_version: Version, to_version: Version,
  state: z.enum(['APPROVED', 'APPLYING', 'INTERRUPTED', 'APPLIED', 'FAILED']),
  recovery_mode: z.enum(['FORWARD_RECOVERY_ONLY', 'REVERSIBLE']), rollback_available: z.boolean(),
  approved_at: Time, approved_by: Id, approval_note: SafeText,
  steps: z.array(UpdateStep).max(64),
  outstanding_steps: z.array(UpdateStepName).max(7),
  /** FR-M31-04. The two checks that must run after the change, reported as facts
   *  rather than folded into the plan state. */
  post_change_verification: z.strictObject({ boundaries_revalidated: z.boolean(), core_regression_passed: z.boolean() }),
  recovery_instruction: SafeText,
  limits: z.array(SafeText).max(8),
}).superRefine((p, c) => {
  if (p.rollback_available !== (p.recovery_mode === 'REVERSIBLE')) c.addIssue({ code: 'custom', message: 'Rollback is available exactly when the recovery mode is reversible' });
  // An update is applied only when nothing is outstanding and both post-change
  // checks passed. A restarted service is not a verified installation.
  const verified = p.post_change_verification.boundaries_revalidated && p.post_change_verification.core_regression_passed;
  if (p.state === 'APPLIED' && (p.outstanding_steps.length > 0 || !verified)) c.addIssue({ code: 'custom', message: 'An update is applied only when every step succeeded and both post-change checks passed' });
  if (p.state !== 'APPLIED' && p.outstanding_steps.length === 0 && verified) c.addIssue({ code: 'custom', message: 'A plan with nothing outstanding and both checks passed is applied' });
});
export const InstallationVersion = z.strictObject({ id: Id, version: Version, applied_at: Time, plan_id: Id.nullable(), note: SafeText });
// ---------------------------------------------------------------------------
// M33 Audit Administration (WP02, WP14, WP24).
//
// FR-M33-01 names eight things that must be auditable with correct tenant,
// domain and actor context. The coverage report answers that per category from
// the trail itself rather than from a list somebody maintained, so a category
// nothing has ever recorded says so instead of being assumed covered. Two of
// the eight have no route in this build that could perform them, and the report
// distinguishes "nothing has happened" from "nothing here could happen".
//
// FR-M33-03 asks for scoped read, filtering, restricted administration and
// append-only correction semantics. An audit event is never edited: a dispute is
// a new record that names the one it disputes, and the original stays exactly as
// it was. Reading the trail is itself audited, which is why the read route is a
// normal business route rather than a side door.
// ---------------------------------------------------------------------------
export const AuditCategory = z.enum([
  'ROLE_GRANTS', 'OWNER_CHANGES', 'POLICY_PUBLICATION', 'CONNECTOR_CREDENTIALS_AND_SCOPE',
  'SUPPORT_APPROVAL', 'EXPORTS', 'LICENCES', 'UPDATES',
]);
export const AuditActorDomain = z.enum(['STAFF', 'PRINCIPAL', 'MACHINE']);
export const AuditEvent = z.strictObject({
  id: Id, operation: z.string().min(1).max(120), actor_id: Id, actor_domain: AuditActorDomain,
  resource_id: Id.nullable(), request_id: Id, created_at: Time,
  /** Whether a correction has been appended against this event. The event
   *  itself is unchanged either way; this is a pointer, not an amendment. */
  corrections: Epoch,
});
/** Every value arrives as a query string, so each is optional and narrow. */
export const AuditQuery = z.strictObject({
  operation: z.string().min(1).max(120).optional(),
  actor_id: Id.optional(),
  actor_domain: AuditActorDomain.optional(),
  from: Time.optional(), to: Time.optional(),
});
export const AuditCoverageEntry = z.strictObject({
  category: AuditCategory,
  /** The operation names that constitute this category, so a reader can check
   *  the claim rather than take it. */
  operations: z.array(z.string().min(1).max(120)).max(16),
  recorded: Epoch,
  first_seen_at: Time.nullable(), last_seen_at: Time.nullable(),
  /** A category with no route that could produce it is a different fact from a
   *  category with a route nobody has used, and they never share a shape. */
  has_a_path: z.boolean(),
  note: SafeText,
}).superRefine((e, c) => {
  if ((e.recorded > 0) !== (e.first_seen_at !== null)) c.addIssue({ code: 'custom', message: 'A category has a first occurrence exactly when something was recorded' });
  if ((e.first_seen_at !== null) !== (e.last_seen_at !== null)) c.addIssue({ code: 'custom', message: 'A category with a first occurrence has a last one' });
  if (!e.has_a_path && e.recorded > 0) c.addIssue({ code: 'custom', message: 'A category with no path cannot have recorded anything' });
});
export const AuditCoverage = z.strictObject({
  as_of: Time,
  entries: z.array(AuditCoverageEntry).length(8),
  /** Structural: coverage is measured from the trail, so it can never be
   *  asserted by configuration. */
  derived_from_recorded_events: z.literal(true),
  limits: z.array(SafeText).max(8),
}).superRefine((r, c) => {
  if (new Set(r.entries.map(e => e.category)).size !== 8) c.addIssue({ code: 'custom', message: 'Every audit category is reported exactly once' });
});
/**
 * FR-M33-03 names export beside read and filter. An export is all of what the
 * filter matched or it is refused: there is no partial export, because a
 * truncated file that looks whole is worse than no file. The digest covers the
 * exact events carried, so a recipient can tell whether the artifact they hold
 * is the one this installation produced.
 */
export const AuditExport = z.strictObject({
  exported_at: Time,
  /** The filter this artifact is the answer to, echoed so the file is
   *  self-describing rather than a bag of rows with no stated scope. */
  filter: AuditQuery,
  events: z.array(AuditEvent).max(5000),
  matched: Epoch,
  complete: z.literal(true),
  digest: Digest,
  limits: z.array(SafeText).max(8),
}).superRefine((e, c) => {
  if (e.events.length !== e.matched) c.addIssue({ code: 'custom', message: 'An export carries every event it matched or it is not produced at all' });
});
export const AuditCorrectionCreate = z.strictObject({
  event_id: Id,
  disputed: z.enum(['WRONG_ACTOR', 'WRONG_RESOURCE', 'WRONG_OPERATION', 'DUPLICATE_RECORD', 'MISLEADING_WITHOUT_CONTEXT']),
  correction: z.string().min(10).max(500),
});
export const AuditCorrection = z.strictObject({
  id: Id, event_id: Id,
  disputed: z.enum(['WRONG_ACTOR', 'WRONG_RESOURCE', 'WRONG_OPERATION', 'DUPLICATE_RECORD', 'MISLEADING_WITHOUT_CONTEXT']),
  correction: SafeText, recorded_at: Time, recorded_by: Id,
  /** The disputed event is untouched. A correction adds a second record beside
   *  it and never replaces, hides or supersedes the first. */
  original_event_unchanged: z.literal(true),
  limits: z.array(SafeText).max(8),
});
export type AuditCategoryValue = z.infer<typeof AuditCategory>;
export type AuditCoverageEntryValue = z.infer<typeof AuditCoverageEntry>;
export type AuditCoverageValue = z.infer<typeof AuditCoverage>;
export type AuditQueryValue = z.infer<typeof AuditQuery>;
export type AuditEventValue = z.infer<typeof AuditEvent>;
// ---------------------------------------------------------------------------
// M29 Customer Onboarding (WP03, WP27, WP34), FR-M29-03.
//
// The nine-step guided connection, run inside the customer's own workspace.
// Two things the schema will not let this product say.
//
// It will not say a step is done because somebody ticked it. Five of the nine
// are answered from evidence recorded elsewhere -- a capability check, an
// approved resource, a mapping, a preview decision -- and each step states what
// it was measured from, so the claim is checkable and stops being true when the
// evidence goes away.
//
// And it will not let connected be read as safe to mutate. Those are two fields
// that never collapse into one, `enablement_stage` only climbs, and enforcement
// is refused unless a real check found the system able to restrict.
// ---------------------------------------------------------------------------
export const ConnectionStep = z.enum([
  'SELECT_SYSTEM', 'CHOOSE_CAPABILITIES', 'CONFIGURE_CONNECTIVITY', 'SCOPED_IDENTITY',
  'TEST_PERMISSIONS', 'SELECT_RESOURCES', 'REVIEW_MAPPINGS', 'PREVIEW_AND_TEST', 'ENABLE_PROGRESSIVELY',
]);
export const ConnectionCapability = z.enum(['DISCOVER', 'READ', 'VERIFY']);
export const EnablementStage = z.enum(['OBSERVE', 'COORDINATE', 'ENFORCE']);
export const ConnectionStepState = z.strictObject({
  step: ConnectionStep,
  /** Ordinal, so an operator always knows which of the nine they are on. */
  position: z.number().int().min(1).max(9),
  done: z.boolean(),
  /** What this answer was measured from. A step that reports done names the
   *  record it read; a step that does not names what is still missing. */
  measured_from: SafeText,
  outstanding: z.array(SafeText).max(4),
}).superRefine((s, c) => {
  if (s.done !== (s.outstanding.length === 0)) c.addIssue({ code: 'custom', message: 'A step is done exactly when nothing is outstanding' });
});
export const GuidedConnection = z.strictObject({
  id: Id, system_id: Id, environment_kind: z.enum(['TEST', 'PRODUCTION']),
  requested_capabilities: z.array(ConnectionCapability).min(1).max(3),
  endpoint_reference: SafeText.nullable(), tls_verified: z.boolean().nullable(),
  /** The reference to a secret the customer holds. This product never holds
   *  the secret, and there is no field here in which one could be returned. */
  secret_reference: SafeText.nullable(),
  steps: z.array(ConnectionStepState).length(9),
  /** The first step that is not done, or null when all nine are. */
  current_step: ConnectionStep.nullable(),
  enablement_stage: EnablementStage,
  /** Structural. A successful connection is never an approval to change
   *  anything in the connected system. */
  connection_is_not_permission_to_mutate: z.literal(true),
  /** What this connection could actually be observed to do, from the recorded
   *  capability check rather than from what was requested. Null before a check. */
  observed_read: z.boolean().nullable(), observed_restrict: z.boolean().nullable(),
  started_at: Time,
  limits: z.array(SafeText).max(8),
}).superRefine((c2, c) => {
  if (new Set(c2.steps.map(s => s.step)).size !== 9) c.addIssue({ code: 'custom', message: 'Every step is reported exactly once' });
  const first = c2.steps.find(s => !s.done)?.step ?? null;
  if (c2.current_step !== first) c.addIssue({ code: 'custom', message: 'The current step is the first one that is not done' });
  if (c2.enablement_stage === 'ENFORCE' && c2.observed_restrict !== true) c.addIssue({ code: 'custom', message: 'Enforcement is only expressible where a check observed the system able to restrict' });
  if ((c2.observed_read === null) !== (c2.observed_restrict === null)) c.addIssue({ code: 'custom', message: 'A capability check reports both observations or neither' });
});
/**
 * M29 Customer Onboarding, FR-M29-01 and FR-M29-02: the gates an installer runs
 * before privileged setup and before real personal data is processed.
 *
 * The failure this shape exists to prevent is a green checklist. Eleven things
 * must be verified, and this build cannot verify all of them from inside
 * itself. A gate it cannot check says so and says why -- it never reports a
 * comfortable pass. `NOT_VERIFIABLE_HERE` and `PASSED` can never share a shape,
 * and the report carries the unverified list separately from the failing one,
 * because an installer who cannot tell those apart has been told nothing.
 *
 * There is also no field meaning "ready for production" or "compliant". Passing
 * every gate this product can measure is a statement about eleven specific
 * technical checks and about nothing else.
 */
/**
 * M32 Monitoring, FR-M32-03: backup, restore into quarantine, and reconciling
 * current authority before anything resumes.
 *
 * The failure this exists to prevent is a restore that quietly reinstates
 * consent somebody has since withdrawn. An archive taken on Monday carries
 * Monday's answers, and a system that resumes from it on Friday is acting on
 * permission that no longer exists.
 *
 * This is deliberately not a backup tool, and the schema says so out loud.
 * ORVIA does not create, encrypt, store or move an archive; that is the
 * customer's own tooling and their own key. What it records is a verifiable
 * statement of the state at the moment the snapshot was declared, and what it
 * owns is the refusal: a restore stays in quarantine until every consent
 * decision that has changed since has been looked at by a named person.
 */
export const BackupDomain = z.enum(['CONFIGURATION', 'WORKFLOW', 'EVIDENCE', 'DOMAIN_RECORDS']);
export const BackupCount = z.strictObject({ domain: BackupDomain, rows: Epoch });
export const BackupSnapshotCreate = z.strictObject({
  /** A reference to where the customer keeps the key. Never the key: the
   *  pattern refuses whitespace and anything long enough to be one. */
  key_reference: z.string().min(3).max(120).regex(/^[A-Za-z0-9._:/-]+$/),
  covers: z.array(BackupDomain).min(1).max(4),
  note: SafeText,
}).superRefine((v, c) => {
  if (new Set(v.covers).size !== v.covers.length) c.addIssue({ code: 'custom', message: 'Each domain is covered once' });
});
export const BackupSnapshot = z.strictObject({
  id: Id, taken_at: Time, key_reference: SafeText,
  covers: z.array(BackupDomain).min(1).max(4),
  counts: z.array(BackupCount).min(1).max(4),
  /** Over what this installation actually saw when the snapshot was declared,
   *  so the record can be checked rather than taken on trust. */
  state_digest: Digest,
  note: SafeText, taken_by: Id,
  /** Structural. This product did not make the archive and does not hold it. */
  archive_is_held_by_the_customer: z.literal(true),
  /** Structural. The key reference is recorded; the encryption behind it is
   *  not something this product observed. */
  encryption_was_not_verified_by_this_product: z.literal(true),
  limits: z.array(SafeText).max(8),
}).superRefine((s, c) => {
  if (JSON.stringify(s.counts.map(x => x.domain).sort()) !== JSON.stringify(s.covers.slice().sort())) c.addIssue({ code: 'custom', message: 'A count is reported for exactly the domains the snapshot covers' });
});
export const RestoreRunCreate = z.strictObject({ snapshot_id: Id, note: SafeText });
export const ConsentConflictDecision = z.enum(['CURRENT_STATE_PREVAILS', 'RESTORED_STATE_PREVAILS']);
export const ConsentConflict = z.strictObject({
  principal_id: Id, purpose_id: Id,
  state_at_snapshot: z.enum(['GRANTED', 'WITHDRAWN']),
  state_now: ConsentState,
  /** How many decisions this person has made about this purpose since. */
  decisions_since_snapshot: Epoch,
  decision: ConsentConflictDecision.nullable(),
  acknowledged_by: Id.nullable(), acknowledged_at: Time.nullable(),
}).superRefine((x, c) => {
  const done = x.decision !== null;
  if (done !== (x.acknowledged_by !== null) || done !== (x.acknowledged_at !== null)) c.addIssue({ code: 'custom', message: 'An acknowledged conflict names who decided and when, and an outstanding one names nobody' });
  if (x.state_at_snapshot === x.state_now) c.addIssue({ code: 'custom', message: 'A conflict is a decision that changed; an unchanged one is not a conflict' });
});
export const ConsentConflictAcknowledge = z.strictObject({
  principal_id: Id, purpose_id: Id, decision: ConsentConflictDecision, basis: SafeText,
});
export const RestoreReconciliation = z.strictObject({
  id: Id, snapshot_id: Id, snapshot_taken_at: Time, reconciled_at: Time,
  state: z.enum(['QUARANTINED', 'RELEASED']),
  conflicts: z.array(ConsentConflict).max(500),
  outstanding: Epoch,
  released_at: Time.nullable(),
  /** Structural. Releasing a restore never re-grants anything: a conflict
   *  resolved as CURRENT_STATE_PREVAILS leaves the withdrawal standing. */
  releasing_never_reinstates_a_withdrawal: z.literal(true),
  note: SafeText,
  limits: z.array(SafeText).max(8),
}).superRefine((r, c) => {
  if (r.outstanding !== r.conflicts.filter(x => x.decision === null).length) c.addIssue({ code: 'custom', message: 'The outstanding count is the number of conflicts nobody has decided' });
  if (r.state === 'RELEASED' && r.outstanding > 0) c.addIssue({ code: 'custom', message: 'A restore leaves quarantine only when nothing is outstanding' });
  if ((r.state === 'RELEASED') !== (r.released_at !== null)) c.addIssue({ code: 'custom', message: 'A released restore says when, and a quarantined one does not' });
});
export const PreflightGateKind = z.enum([
  'RUNTIME_LOCATION', 'RUNTIME_AND_ARCHITECTURE', 'TRANSPORT_SECURITY', 'DURABLE_STORAGE',
  'CUSTOMER_CONTROLLED_IDENTITY', 'SIGNING_KEYS', 'BACKUP_TARGET', 'PERMITTED_EGRESS',
  'VENDOR_TELEMETRY_DISABLED', 'LICENCE_VALIDITY', 'PACKAGE_SIGNATURE',
]);
export const PreflightVerdict = z.enum(['PASSED', 'FAILED', 'NOT_VERIFIABLE_HERE']);
export const PreflightGate = z.strictObject({
  kind: PreflightGateKind,
  verdict: PreflightVerdict,
  /** Exactly what was examined, so the verdict can be checked rather than taken. */
  checked: SafeText,
  /** What the examination found. Null only when nothing was examined. */
  observed: SafeText.nullable(),
  unverifiable_reason: SafeText.nullable(),
  /** What to do about a failure. Present only on a failure. */
  remedy: SafeText.nullable(),
}).superRefine((g, c) => {
  if ((g.verdict === 'NOT_VERIFIABLE_HERE') !== (g.unverifiable_reason !== null)) c.addIssue({ code: 'custom', message: 'A gate is unverifiable exactly when it says why' });
  if ((g.verdict === 'NOT_VERIFIABLE_HERE') !== (g.observed === null)) c.addIssue({ code: 'custom', message: 'A gate that was examined reports what it found, and one that was not reports nothing' });
  if ((g.verdict === 'FAILED') !== (g.remedy !== null)) c.addIssue({ code: 'custom', message: 'A failing gate names what to do about it, and a passing one has nothing to remedy' });
});
export const PreflightReport = z.strictObject({
  as_of: Time, profile: z.literal(PROFILE),
  gates: z.array(PreflightGate).length(11),
  failing: z.array(PreflightGateKind).max(11),
  not_verifiable: z.array(PreflightGateKind).max(11),
  /** Structural. The whole point of separating the two lists. */
  an_unverified_gate_is_not_a_passed_gate: z.literal(true),
  /** Structural. Eleven technical checks are not a legal conclusion. */
  passing_every_gate_is_not_a_statement_about_the_law: z.literal(true),
  limits: z.array(SafeText).max(8),
}).superRefine((r, c) => {
  if (new Set(r.gates.map(g => g.kind)).size !== 11) c.addIssue({ code: 'custom', message: 'Every gate is reported exactly once' });
  const listed = (verdict: string) => r.gates.filter(g => g.verdict === verdict).map(g => g.kind).sort();
  if (JSON.stringify(r.failing.slice().sort()) !== JSON.stringify(listed('FAILED'))) c.addIssue({ code: 'custom', message: 'The failing list is exactly the gates that failed' });
  if (JSON.stringify(r.not_verifiable.slice().sort()) !== JSON.stringify(listed('NOT_VERIFIABLE_HERE'))) c.addIssue({ code: 'custom', message: 'The unverifiable list is exactly the gates that could not be checked' });
});
// ---------------------------------------------------------------------------
// M33 Audit Administration, FR-M33-04 — purpose-based retention of the trail.
//
// Three facts shape this. `app.audit_events` has no payload column and never
// had one, so payload minimisation is the absence of a place to put anything
// rather than a policy that could lapse, and justified payload deletion cannot
// occur because there is no payload. Migration 0027 made the trail append-only
// against the migrator itself, so retention is a schedule and a disclosure and
// never an automatic purge. And OPEN-10 forbids universal statutory retention
// numbers, so no period ships: a purpose with none configured says so.
// ---------------------------------------------------------------------------
/** Why a record is kept. Closed, so a retention reason cannot become prose. */
export const AuditRetentionPurpose = z.enum([
  'SECURITY_INVESTIGATION', 'REGULATORY_ACCOUNTABILITY', 'COMMERCIAL_OBLIGATION', 'CHANGE_TRACEABILITY']);
export const AuditRetentionRuleCreate = z.strictObject({
  purpose: AuditRetentionPurpose,
  days: z.number().int().min(1).max(3650),
  /** Where the number came from. There is no default and no way to record a
   *  period without saying what it rests on. */
  source_reference: z.string().min(10).max(500),
});
export const AuditRetentionRule = z.strictObject({
  purpose: AuditRetentionPurpose, days: z.number().int().min(1).max(3650),
  source_reference: SafeText, recorded_at: Time, recorded_by: Id,
});
export const AuditRetentionLine = z.strictObject({
  purpose: AuditRetentionPurpose,
  /** The audited categories kept for this purpose. Every category appears
   *  under exactly one purpose, so nothing is retained for no stated reason. */
  categories: z.array(AuditCategory).min(1).max(8),
  rule: AuditRetentionRule.nullable(),
  events_held: Epoch, oldest_event_at: Time.nullable(),
  /** Events older than the configured period. Zero when no period is
   *  configured, because nothing can be beyond a period that does not exist --
   *  which is a different fact from nothing being overdue. */
  beyond_period: Epoch,
  /** Literal-true companion to a null rule, so an unconfigured period is
   *  never read as an unlimited one that somebody chose. */
  period_is_not_configured_here: z.boolean(),
}).superRefine((l, c) => {
  if (l.period_is_not_configured_here !== (l.rule === null)) c.addIssue({ code: 'custom', message: 'A purpose has a configured period or says it has none' });
  if (l.rule === null && l.beyond_period !== 0) c.addIssue({ code: 'custom', message: 'Nothing is beyond a period that was never configured' });
  if ((l.events_held === 0) !== (l.oldest_event_at === null)) c.addIssue({ code: 'custom', message: 'A purpose holding events has an oldest one, and one holding none does not' });
  if (l.beyond_period > l.events_held) c.addIssue({ code: 'custom', message: 'More events cannot be overdue than are held' });
});
export const AuditRetentionReport = z.strictObject({
  as_of: Time, profile: z.literal(PROFILE),
  lines: z.array(AuditRetentionLine).length(4),
  /** Measured, not asserted: the number of payload-shaped columns found on the
   *  audit table. The only permitted value is zero, so if one is ever added
   *  this report refuses to render rather than quietly describing a trail that
   *  now carries content it says it does not. */
  payload_columns_found: z.literal(0),
  /** Structural. There is no payload, so there is no justified payload deletion
   *  to preserve an envelope through -- the envelope is the whole record. */
  payload_is_not_recorded_so_none_can_be_deleted: z.literal(true),
  /** Structural. The trail is append-only against the migrator itself, so an
   *  expired period never becomes authority to shorten it. */
  envelopes_are_never_deleted_by_this_product: z.literal(true),
  /** Declared snapshots whose coverage includes the audit trail. */
  snapshots_covering_evidence: Epoch,
  /** Structural, and the honest limit of any retention claim: the customer's
   *  archive is outside this product, so nothing done here reaches a copy in it. */
  a_declared_snapshot_is_not_reached_by_anything_here: z.literal(true),
  limits: z.array(SafeText).max(8),
}).superRefine((r, c) => {
  if (new Set(r.lines.map(l => l.purpose)).size !== 4) c.addIssue({ code: 'custom', message: 'Every retention purpose is reported exactly once' });
  const covered = r.lines.flatMap(l => l.categories);
  if (new Set(covered).size !== covered.length) c.addIssue({ code: 'custom', message: 'A category is retained under exactly one purpose' });
  if (covered.length !== AuditCategory.options.length) c.addIssue({ code: 'custom', message: 'Every audited category is retained for a stated purpose' });
});

export type PreflightGateValue = z.infer<typeof PreflightGate>;
// ---------------------------------------------------------------------------
// M29 Customer Onboarding, FR-M29-04 - one typed local import path.
//
// OPEN-11 is explicit: implement one approved typed path fully before writing
// another parser, and no arbitrary upload-to-table tool. So there is exactly
// one import kind, its rows are a declared shape rather than a file, and the
// schema is the parser.
//
// The clause that shapes everything else is the last one: a source snapshot is
// never live control evidence. An inventory exported from a customer's CRM says
// what that CRM's operator believed at a moment. It is not an observation ORVIA
// made and it is not evidence that any restriction is in force, so everything
// applied from an import is ASSERTED and unreviewed, and the batch says so in
// fields that cannot be set otherwise.
// ---------------------------------------------------------------------------
export const ImportKind = z.enum(['DATA_ASSET_INVENTORY']);
/** One inventory line. This shape is the parser: nothing outside it is stored. */
export const ImportedAssetRow = z.strictObject({
  line_number: z.number().int().min(1).max(500),
  system_id: Id, kind: DataAssetKind, name: z.string().min(1).max(120), description: SafeText,
  categories: z.array(CategoryAssignment).max(16),
});
export const ImportSubmit = z.strictObject({
  kind: ImportKind,
  source_reference: z.string().min(3).max(200),
  /** What the rows describe as at. An import that will not say which moment it
   *  is a snapshot of is not a snapshot. */
  captured_at: Time,
  rows: z.array(ImportedAssetRow).min(1).max(500),
}).superRefine((v, c) => {
  if (new Set(v.rows.map(r => r.line_number)).size !== v.rows.length) c.addIssue({ code: 'custom', message: 'Each line number appears once' });
});
export const ImportRowConflict = z.enum(['NEW', 'MATCHES_EXISTING', 'CONFLICTS_WITH_EXISTING']);
export const ImportRowDecision = z.enum(['IMPORT_AS_NEW', 'SKIP_ROW']);
export const ImportRowDecide = z.strictObject({ line_number: z.number().int().min(1).max(500), decision: ImportRowDecision });
export const ImportPurge = z.strictObject({ reason: z.string().min(10).max(500) });
export const ImportRowPreview = z.strictObject({
  line_number: z.number().int().min(1).max(500),
  row: ImportedAssetRow,
  conflict: ImportRowConflict,
  existing_asset_id: Id.nullable(),
  decision: ImportRowDecision.nullable(),
  decided_by: Id.nullable(), decided_at: Time.nullable(),
  created_asset_id: Id.nullable(),
}).superRefine((r, c) => {
  if ((r.conflict === 'NEW') !== (r.existing_asset_id === null)) c.addIssue({ code: 'custom', message: 'A row that matched something names what, and one that matched nothing names nothing' });
  const decided = r.decision !== null;
  if (decided !== (r.decided_by !== null) || decided !== (r.decided_at !== null)) c.addIssue({ code: 'custom', message: 'A decided row names who decided and when' });
  if (r.created_asset_id !== null && r.decision === 'SKIP_ROW') c.addIssue({ code: 'custom', message: 'A skipped row did not become an asset' });
});
export const ImportBatch = z.strictObject({
  id: Id, kind: ImportKind, source_reference: SafeText, captured_at: Time,
  row_count: Epoch, content_digest: Digest,
  state: z.enum(['QUARANTINED', 'APPLIED', 'PURGED']),
  submitted_at: Time, submitted_by: Id,
  settled_at: Time.nullable(), settled_by: Id.nullable(), purge_reason: SafeText.nullable(),
  rows: z.array(ImportRowPreview).max(500),
  /** Conflicting rows nobody has decided. An import does not apply while any
   *  remain, so this is the number standing between quarantine and inventory. */
  undecided_conflicts: Epoch,
  /** Structural. Anything applied from an import is a customer statement, never
   *  something this product observed, and the graph refuses to let an ASSERTED
   *  record carry an observation time at all. */
  imported_rows_are_asserted_never_observed: z.literal(true),
  /** Structural, and the clause the whole path exists to honour. */
  a_source_snapshot_is_not_evidence_that_any_control_is_in_force: z.literal(true),
  /** Structural. Purging removes the quarantined rows and keeps the record that
   *  they were submitted, so a purge never looks like nothing having arrived. */
  purging_removes_the_rows_and_keeps_this_record: z.literal(true),
  limits: z.array(SafeText).max(8),
}).superRefine((b, c) => {
  if (b.undecided_conflicts !== b.rows.filter(r => r.conflict !== 'NEW' && r.decision === null).length) c.addIssue({ code: 'custom', message: 'The undecided count is the conflicting rows nobody has decided' });
  if ((b.state === 'QUARANTINED') !== (b.settled_at === null)) c.addIssue({ code: 'custom', message: 'A settled import says when it settled' });
  if ((b.state === 'PURGED') !== (b.purge_reason !== null)) c.addIssue({ code: 'custom', message: 'A purge states its reason' });
  if (b.state === 'PURGED' && b.rows.length > 0) c.addIssue({ code: 'custom', message: 'A purged import has no rows left; the record of it remains' });
  if (b.state === 'APPLIED' && b.undecided_conflicts > 0) c.addIssue({ code: 'custom', message: 'An import applies only when every conflict has been decided' });
});

export type AuditRetentionPurposeValue = z.infer<typeof AuditRetentionPurpose>;
export type AuditRetentionReportValue = z.infer<typeof AuditRetentionReport>;
export type ImportedAssetRowValue = z.infer<typeof ImportedAssetRow>;
export type ImportBatchValue = z.infer<typeof ImportBatch>;

// ---------------------------------------------------------------------------
// M32 Monitoring, FR-M32-04 — what the vendor side can see.
//
// The requirement is mostly a set of things that must not exist, and things
// that do not exist are hard to show. So this is built the other way round: it
// is a customer-facing account of everything that ever left this installation
// towards the vendor, derived entirely from records this installation already
// keeps, with nothing new collected to produce it.
//
// Every entry is a payload a named person approved and a named person recorded
// carrying. There is no automatic channel for anything else to travel on, and
// the report says what it is rather than making a claim about what the vendor
// holds, which is not something this product could ever observe.
// ---------------------------------------------------------------------------
/** The vendor's own service health, which this build genuinely cannot see. */
export const VendorServiceHealth = z.strictObject({
  /** Structural. There is no vendor service in this deployment to observe, and
   *  an unobserved service is never reported as a healthy one. */
  observed: z.literal(false),
  reason: SafeText,
});
export const VendorDisclosure = z.strictObject({
  case_id: Id, subject: SupportSubject,
  vendor_case_reference: z.string().regex(/^[A-Z_][A-Z0-9_-]{3,39}$/).nullable(),
  approved_at: Time, approved_by: Id, approved_digest: Digest,
  destination: z.enum(['VENDOR_SUPPORT_INGRESS', 'MANUAL_OFFLINE_TRANSFER']),
  retention_days: z.number().int().min(1).max(365),
  /** When an operator recorded carrying the payload, and how that went. Null
   *  means approved and never carried, which is a different fact from carried
   *  and rejected. */
  carried_at: Time.nullable(),
  outcome: z.enum(['NOT_ATTEMPTED', 'ACCEPTED', 'REJECTED']).nullable(),
  /** The per-case reported facts themselves: closed codes with occurrence
   *  counts and the window they were seen in. This is the whole of what the
   *  vendor was told about this case. */
  facts: z.array(DiagnosticObservation).max(32),
  /** Structural. An operator carried this; ORVIA has no transport and did not
   *  observe it arrive. */
  transported_by_orvia: z.literal(false),
}).superRefine((d, c) => {
  if ((d.carried_at !== null) !== (d.outcome !== null)) c.addIssue({ code: 'custom', message: 'A carried payload records when and how it went, and one never carried records neither' });
});
export const VendorVisibility = z.strictObject({
  as_of: Time, profile: z.literal(PROFILE),
  vendor_service_health: VendorServiceHealth,
  disclosures: z.array(VendorDisclosure).max(200),
  /** Approved and never carried. Counted separately because an approval is not
   *  a disclosure, and collapsing the two would overstate what left. */
  approved_but_not_carried: Epoch,
  /** Cases that have disclosed nothing at all. A support case is not by itself
   *  a transfer of anything. */
  cases_with_nothing_disclosed: Epoch,
  /** Structural. Nothing here was gathered by this product on its own account. */
  no_automatic_telemetry_is_collected: z.literal(true),
  /** Structural. Nothing disclosed names, counts or measures a person. */
  no_employee_activity_is_tracked: z.literal(true),
  /** Structural. This build has no model, and the absence of one is a property
   *  of the product rather than something that happened to an installation. */
  the_absence_of_a_model_is_never_an_incident: z.literal(true),
  /** Structural, and the honest limit of the whole report: this is what was
   *  approved and recorded as carried. What the vendor actually holds is not
   *  something this product can see. */
  this_states_what_was_disclosed_not_what_the_vendor_holds: z.literal(true),
  limits: z.array(SafeText).max(8),
}).superRefine((v, c) => {
  if (v.approved_but_not_carried !== v.disclosures.filter(d => d.carried_at === null).length) c.addIssue({ code: 'custom', message: 'The uncarried count is the number of approvals nobody recorded carrying' });
});

export type BackupDomainValue = z.infer<typeof BackupDomain>;
export type BackupSnapshotValue = z.infer<typeof BackupSnapshot>;
export type RestoreReconciliationValue = z.infer<typeof RestoreReconciliation>;
export const ConnectionStart = z.strictObject({
  system_id: Id, environment_kind: z.enum(['TEST', 'PRODUCTION']),
  requested_capabilities: z.array(ConnectionCapability).min(1).max(3),
}).superRefine((v, c) => {
  if (new Set(v.requested_capabilities).size !== v.requested_capabilities.length) c.addIssue({ code: 'custom', message: 'Each capability is requested once' });
});
export const ConnectivityRecord = z.strictObject({
  endpoint_reference: z.string().min(3).max(200).regex(/^[A-Za-z0-9 ._:/-]+$/),
  tls_verified: z.boolean(),
});
export const ScopedIdentityRecord = z.strictObject({
  /** A reference to where the customer keeps the secret, not the secret. The
   *  pattern refuses anything long enough to be one by accident. */
  secret_reference: z.string().min(3).max(120).regex(/^[A-Za-z0-9._:/-]+$/),
});
export const ResourceApproval = z.strictObject({ data_asset_ids: z.array(Id).min(1).max(100) });
export const EnablementChange = z.strictObject({ to: EnablementStage });
export type ConnectionStepValue = z.infer<typeof ConnectionStep>;
export type EnablementStageValue = z.infer<typeof EnablementStage>;
export type GuidedConnectionValue = z.infer<typeof GuidedConnection>;
// ---------------------------------------------------------------------------
// M32 Monitoring (WP29, WP32). Two requirements are met here and the schema is
// shaped so neither can be quietly softened.
//
// FR-M32-01 asks that liveness, readiness and business readiness be
// distinguished. They are three separate facts with three separate verdicts and
// there is no field that combines them, because the whole failure this prevents
// is an installation that answers every probe while being unable to carry out a
// single privacy decision.
//
// FR-M32-02 asks for propagation lag, oldest unresolved work, freshness, queue
// saturation, connector limits, storage and backup status, and says plainly:
// not just uptime. Two of those seven cannot be measured by this build, so they
// report that they were not measured and why, rather than defaulting to a
// comfortable zero. Everything measured is a count or a duration: there is no
// field in which a payload, a secret or a reference to a person could appear.
// ---------------------------------------------------------------------------
export const ReadinessKind = z.enum(['LIVENESS', 'DEPENDENCY_READINESS', 'BUSINESS_READINESS']);
export const ReadinessVerdict = z.enum(['READY', 'NOT_READY', 'NOT_ASSESSABLE']);
export const ReadinessFact = z.strictObject({
  kind: ReadinessKind, verdict: ReadinessVerdict,
  /** What this verdict covers, and what it deliberately says nothing about. */
  covers: SafeText,
  /** Named, because "not ready" without a reason is not something anybody can act on. */
  blocking: z.array(SafeText).max(8),
}).superRefine((f, c) => {
  if ((f.verdict === 'NOT_READY') !== (f.blocking.length > 0)) c.addIssue({ code: 'custom', message: 'A readiness verdict is not ready exactly when something is blocking it' });
});
export const OperationalSignalName = z.enum([
  'PROPAGATION_LAG', 'OLDEST_UNRESOLVED_WORK', 'OBSERVATION_FRESHNESS',
  'QUEUE_DEPTH', 'CONNECTOR_LIMIT_HEADROOM', 'STORAGE_FOOTPRINT', 'BACKUP_STATUS',
]);
export const SignalUnit = z.enum(['SECONDS', 'RECORDS', 'BYTES']);
export const OperationalSignal = z.strictObject({
  signal: OperationalSignalName,
  measured: z.boolean(),
  value: Epoch.nullable(), unit: SignalUnit.nullable(),
  /** What the number counts. A figure without this is not a measurement. */
  counted: SafeText,
  /** Present exactly when the signal was not measured. An unmeasured signal is
   *  a different fact from a signal measured at zero, and they never share a
   *  representation here. */
  unavailable_reason: SafeText.nullable(),
}).superRefine((s, c) => {
  if (s.measured !== (s.value !== null)) c.addIssue({ code: 'custom', message: 'A measured signal has a value and an unmeasured one has none' });
  if (s.measured !== (s.unit !== null)) c.addIssue({ code: 'custom', message: 'A measured signal names its unit' });
  if (s.measured === (s.unavailable_reason !== null)) c.addIssue({ code: 'custom', message: 'A signal is unavailable exactly when it says why' });
});
export const OperationalReadiness = z.strictObject({
  as_of: Time, profile: z.literal(PROFILE),
  facts: z.array(ReadinessFact).length(3),
  signals: z.array(OperationalSignal).length(7),
  /** Structural. There is no overall verdict field, and adding one later would
   *  be the change that made this report useless. */
  combined_status_is_not_reported: z.literal(true),
  /** Structural. The process answering is not the product working, and this
   *  report is not allowed to imply otherwise. */
  uptime_is_not_evidence_of_correct_operation: z.literal(true),
  limits: z.array(SafeText).max(8),
}).superRefine((r, c) => {
  if (new Set(r.facts.map(f => f.kind)).size !== 3) c.addIssue({ code: 'custom', message: 'Each readiness kind is reported exactly once' });
  if (new Set(r.signals.map(s => s.signal)).size !== 7) c.addIssue({ code: 'custom', message: 'Each operational signal is reported exactly once' });
});
export type OperationalSignalValue = z.infer<typeof OperationalSignal>;
export type ReadinessFactValue = z.infer<typeof ReadinessFact>;
export type DiagnosticObservationValue = z.infer<typeof DiagnosticObservation>;
export type ReleaseClaimsValue = z.infer<typeof ReleaseClaims>;
export type ReleaseRejectionValue = z.infer<typeof ReleaseRejection>;
export type LocalControlStateValue = z.infer<typeof SupportCaseStanding>['local_control_state'];
export const IdPath = z.strictObject({ id: Id });
export const PurposePath = z.strictObject({ purpose_id: Id });
export const WorkflowPath = z.strictObject({ workflow_id: Id });
export const PollRequest = z.strictObject({ installation_id: Id, environment_id: Id, maximum_commands: z.number().int().min(1).max(10) });

export const schemas = { ErrorResponse, Pagination, Session, Grant, Withdraw, Receipt, ReceiptView, PurposeCreate, Purpose, NoticeCreate, Notice, PolicyCreate, Policy, PolicyPublish, PolicyReauthenticate, PublicationProof, MappingCreate, TargetMapping, SystemCreate, System, PrincipalCreate, Principal, ConsentChoice, CommandScope, Approval, PlanBinding, CommandPayload, SignedCommand, CommandReceipt, Observation, Reconciliation, ManualAttestation, Obligation, Action, WorkflowSummary, Workflow, AcceptedOperation, Evaluate, Decision, SendRequest, SendResult, SimulatorState, TestRunCreate, TestRun, CapabilityRecord, Overview, Evidence, ControlMap, IdPath, PurposePath, WorkflowPath, PollRequest,
  DataAssetCreate, DataAsset, ProcessingActivityCreate, ProcessingActivity, GraphRelationshipCreate, GraphRelationship, AssetTombstone,
  GraphSearchQuery, GraphSearchResult, NeighbourhoodQuery, GraphNeighbourhood, ImpactAssessment,
  RightsRequestCreate, RightsRequest, IdentityReview, RequestScope, RequestTransition, ResponseRelease, MandateCreate, Mandate, MandateRevoke, SystemOutcomeRecord, SystemOutcome,
  RetentionConstraintCreate, RetentionConstraint, LegalHoldCreate, LegalHold, HoldRelease, RetentionDecisionRecord, Eligibility, RetentionOutcomeRecord, RetentionOutcome,
  CoverageMeasure, CoverageReport, AttentionCount, Gap, GapAssignment, GapClosure, GapDerivation, Guidance,
  ProcessorCreate, Processor, ProcessorLinkCreate, CoordinationRecord, Coordination, ProcessorStanding, AssessmentCreate, Assessment, AssessmentCompletion, FindingCreate, Finding, FindingClosure,
  IncidentCreate, Incident, IncidentCorrection, IncidentCorrectionRecord, ObligationRuleCreate, ObligationRule, NotificationObligation, IncidentAssessment, NotificationTransition, IncidentClosure, IncidentContainment,
  TemplateCreate, Template, NotificationTaskCreate, NotificationTask, DeliveryRecord, Delivery, EscalationSweep,
  LicenceClaims, SignedLicence, LicenceImport, LicenceState, FeatureAvailability, EntitlementReport,
  SupportCaseCreate, SupportCase, SupportCaseStanding, DiagnosticReport, DiagnosticDraft, DiagnosticApprovalCreate, DiagnosticApproval,
  TransferRecord, DiagnosticTransfer, IngressSubmission, IngressValidation, CanaryRegister, Canary, SupportResolution,
  ReleaseClaims, SignedRelease, ReleaseImport, ReleaseState, UpdateEligibility, UpdatePlanCreate, UpdatePlan, UpdateStepRecord, UpdateStep, InstallationVersion,
  SupportCaseList: page(SupportCase), CanaryList: page(Canary), ReleaseList: page(ReleaseState), InstallationVersionList: page(InstallationVersion),
  // The full plan, not a summary: an operator looking for an interrupted update
  // needs the outstanding steps and both post-change facts, which are the whole
  // reason the list exists. A parallel summary shape would be one more thing to
  // drift away from the truth.
  UpdatePlanList: page(UpdatePlan),
  OperationalReadiness,
  AuditEvent, AuditQuery, AuditCoverage, AuditExport, AuditCorrectionCreate, AuditCorrection, AuditEventList: page(AuditEvent),
  GuidedConnection, ConnectionStart, ConnectivityRecord, ScopedIdentityRecord, ResourceApproval, EnablementChange, GuidedConnectionList: page(GuidedConnection),
  NoticeRevisionCreate, NoticeRevision, NoticeAvailability, LanguageChoice, LanguageQuery, NoticeRevisionList: page(NoticeRevision),
  PreflightReport,
  BackupSnapshotCreate, BackupSnapshot, RestoreRunCreate, RestoreReconciliation, ConsentConflictAcknowledge,
  BackupSnapshotList: page(BackupSnapshot), RestoreRunList: page(RestoreReconciliation), VendorVisibility,
  AuditRetentionRuleCreate, AuditRetentionRule, AuditRetentionReport,
  ImportSubmit, ImportBatch, ImportRowDecide, ImportPurge, ImportBatchList: page(ImportBatch),
  DataAssetList: page(DataAsset), ProcessingActivityList: page(ProcessingActivity), GraphRelationshipList: page(GraphRelationship),
  RightsRequestList: page(RightsRequest), MandateList: page(Mandate),
  GapList: page(Gap), ProcessorList: page(Processor), AssessmentList: page(Assessment), FindingList: page(Finding),
  IncidentList: page(Incident), ObligationRuleList: page(ObligationRule),
  TemplateList: page(Template), NotificationTaskList: page(NotificationTask),
  RetentionConstraintList: page(RetentionConstraint), LegalHoldList: page(LegalHold), RetentionOutcomeList: z.strictObject({ items: z.array(RetentionOutcome).max(100), next_cursor: z.string().max(200).nullable() }),
  ReceiptList: page(Receipt), MappingList: page(TargetMapping),
  PurposeList: page(Purpose), NoticeList: page(Notice), PolicyList: page(Policy), SystemList: page(System), PrincipalList: page(Principal), ConsentList: page(ConsentChoice), WorkflowList: page(WorkflowSummary), FailureList: page(Obligation), CapabilityList: page(CapabilityRecord), CommandList: z.strictObject({commands:z.array(SignedCommand).max(10), poll_after_ms:z.literal(2000)}), Health: z.strictObject({status:z.literal('alive')}) };
export type SchemaName = keyof typeof schemas;
export type RouteDefinition = { id: string; method: 'get'|'post'; path:string; authority:'PUBLIC'|'STAFF'|'PRINCIPAL'|'STAFF_OR_PRINCIPAL'|'MACHINE'; request?:SchemaName; response:SchemaName; status:200|201|202; params?:SchemaName; query?:SchemaName; paginated?:boolean; idempotency?:boolean; capability?:z.infer<typeof Capability> };
/** Declared query keys for a route. The dispatcher rejects any parameter not listed here. */
export function queryKeys(name: SchemaName): string[] { return Object.keys((schemas[name] as unknown as z.ZodObject<z.ZodRawShape>).shape); }
export const routes: RouteDefinition[] = [
  {id:'health',method:'get',path:'/healthz',authority:'PUBLIC',response:'Health',status:200},
  {id:'session',method:'get',path:'/api/v1/session',authority:'STAFF_OR_PRINCIPAL',response:'Session',status:200},
  {id:'overview',method:'get',path:'/api/v1/admin/overview',authority:'STAFF',capability:'overview.read',response:'Overview',status:200},
  ...(['purposes','notices','policies','systems','principals'] as const).flatMap((resource) => {
    const names = {purposes:['Purpose','configuration.read','configuration.write'],notices:['Notice','configuration.read','configuration.write'],policies:['Policy','configuration.read','configuration.write'],systems:['System','configuration.read','configuration.write'],principals:['Principal','principals.read','principals.create']} as const;
    const [name,read,write] = names[resource];
    return [{id:`list_${resource}`,method:'get',path:`/api/v1/admin/${resource}`,authority:'STAFF',response:`${name}List`,status:200,paginated:true,capability:read}, {id:`create_${resource}`,method:'post',path:`/api/v1/admin/${resource}`,authority:'STAFF',request:`${name}Create`,response:name,status:201,idempotency:true,capability:write}] as RouteDefinition[];
  }),
  {id:'record_notice_revision',method:'post',path:'/api/v1/admin/notices/{id}/revisions',authority:'STAFF',capability:'configuration.write',params:'IdPath',request:'NoticeRevisionCreate',response:'NoticeRevision',status:201,idempotency:true},
  {id:'list_notice_revisions',method:'get',path:'/api/v1/admin/notices/{id}/revisions',authority:'STAFF',capability:'configuration.read',params:'IdPath',response:'NoticeRevisionList',status:200,paginated:true},
  {id:'notice_languages',method:'get',path:'/api/v1/admin/purposes/{id}/notice-languages',authority:'STAFF',capability:'configuration.read',params:'IdPath',query:'LanguageQuery',response:'NoticeAvailability',status:200},
  {id:'set_language',method:'post',path:'/api/v1/portal/me/language',authority:'PRINCIPAL',capability:'consent.own.write',request:'LanguageChoice',response:'LanguageChoice',status:200,idempotency:true},
  {id:'publish_policy',method:'post',path:'/api/v1/admin/policies/{id}/publish',authority:'STAFF',capability:'policy.publish',params:'IdPath',request:'PolicyPublish',response:'Policy',status:200,idempotency:true},
  {id:'reauthenticate_policy',method:'post',path:'/api/v1/admin/policies/{id}/reauthenticate',authority:'STAFF',capability:'policy.publish',params:'IdPath',request:'PolicyReauthenticate',response:'PublicationProof',status:201},
  {id:'create_mapping',method:'post',path:'/api/v1/admin/target-mappings',authority:'STAFF',capability:'configuration.write',request:'MappingCreate',response:'TargetMapping',status:201,idempotency:true},
  {id:'list_mappings',method:'get',path:'/api/v1/admin/target-mappings',authority:'STAFF',capability:'configuration.read',response:'MappingList',status:200,paginated:true},
  {id:'control_map',method:'get',path:'/api/v1/admin/control-map',authority:'STAFF',capability:'configuration.read',response:'ControlMap',status:200,paginated:true},
  {id:'check_system',method:'post',path:'/api/v1/admin/systems/{id}/check',authority:'STAFF',capability:'systems.check',params:'IdPath',response:'System',status:200},
  {id:'own_consents',method:'get',path:'/api/v1/portal/me/consents',authority:'PRINCIPAL',capability:'consent.own.read',response:'ConsentList',status:200,paginated:true},
  {id:'own_history',method:'get',path:'/api/v1/portal/me/consents/{purpose_id}/history',authority:'PRINCIPAL',capability:'consent.own.read',params:'PurposePath',response:'ReceiptList',status:200,paginated:true},
  {id:'grant',method:'post',path:'/api/v1/portal/me/consents/{purpose_id}/grant',authority:'PRINCIPAL',capability:'consent.own.write',params:'PurposePath',request:'Grant',response:'Receipt',status:202,idempotency:true},
  {id:'withdraw',method:'post',path:'/api/v1/portal/me/consents/{purpose_id}/withdraw',authority:'PRINCIPAL',capability:'consent.own.write',params:'PurposePath',request:'Withdraw',response:'Receipt',status:202,idempotency:true},
  {id:'own_receipt',method:'get',path:'/api/v1/portal/me/receipts/{id}',authority:'PRINCIPAL',capability:'receipt.own.read',params:'IdPath',response:'ReceiptView',status:200},
  {id:'workflows',method:'get',path:'/api/v1/admin/workflows',authority:'STAFF',capability:'workflow.read',response:'WorkflowList',status:200,paginated:true},
  {id:'workflow',method:'get',path:'/api/v1/admin/workflows/{id}',authority:'STAFF',capability:'workflow.read',params:'IdPath',response:'Workflow',status:200},
  {id:'reconcile',method:'post',path:'/api/v1/admin/actions/{id}/reconcile',authority:'STAFF',capability:'action.reconcile',params:'IdPath',response:'AcceptedOperation',status:202,idempotency:true},
  {id:'attest',method:'post',path:'/api/v1/admin/manual-tasks/{id}/attest',authority:'STAFF',capability:'manual.attest',params:'IdPath',request:'ManualAttestation',response:'AcceptedOperation',status:202,idempotency:true},
  {id:'failures',method:'get',path:'/api/v1/admin/failures',authority:'STAFF',capability:'workflow.read',response:'FailureList',status:200,paginated:true},
  ...(['evidence','export'] as const).map(id => ({id,method:'get',path:`/api/v1/admin/evidence/{workflow_id}${id==='export'?'/export':''}`,authority:'STAFF',capability:id==='export'?'evidence.export':'evidence.read',params:'WorkflowPath',response:'Evidence',status:200}) as RouteDefinition),
  {id:'evaluate',method:'post',path:'/api/v1/admin/policy/evaluate',authority:'STAFF',capability:'policy.preview',request:'Evaluate',response:'Decision',status:200},
  {id:'start_test',method:'post',path:'/api/v1/admin/test-runs',authority:'STAFF',capability:'tests.run',request:'TestRunCreate',response:'TestRun',status:202,idempotency:true},
  {id:'test_run',method:'get',path:'/api/v1/admin/test-runs/{id}',authority:'STAFF',capability:'tests.read',params:'IdPath',response:'TestRun',status:200},
  {id:'capabilities',method:'get',path:'/api/v1/admin/capabilities',authority:'STAFF',capability:'capabilities.read',response:'CapabilityList',status:200,paginated:true},
  {id:'list_data_assets',method:'get',path:'/api/v1/admin/data-assets',authority:'STAFF',capability:'graph.read',response:'DataAssetList',status:200,paginated:true},
  {id:'data_asset',method:'get',path:'/api/v1/admin/data-assets/{id}',authority:'STAFF',capability:'graph.read',params:'IdPath',response:'DataAsset',status:200},
  {id:'create_data_asset',method:'post',path:'/api/v1/admin/data-assets',authority:'STAFF',capability:'graph.write',request:'DataAssetCreate',response:'DataAsset',status:201,idempotency:true},
  {id:'tombstone_data_asset',method:'post',path:'/api/v1/admin/data-assets/{id}/tombstone',authority:'STAFF',capability:'graph.write',params:'IdPath',request:'AssetTombstone',response:'DataAsset',status:200,idempotency:true},
  {id:'list_activities',method:'get',path:'/api/v1/admin/processing-activities',authority:'STAFF',capability:'graph.read',response:'ProcessingActivityList',status:200,paginated:true},
  {id:'create_activity',method:'post',path:'/api/v1/admin/processing-activities',authority:'STAFF',capability:'graph.write',request:'ProcessingActivityCreate',response:'ProcessingActivity',status:201,idempotency:true},
  {id:'list_relationships',method:'get',path:'/api/v1/admin/graph/relationships',authority:'STAFF',capability:'graph.read',response:'GraphRelationshipList',status:200,paginated:true},
  {id:'create_relationship',method:'post',path:'/api/v1/admin/graph/relationships',authority:'STAFF',capability:'graph.write',request:'GraphRelationshipCreate',response:'GraphRelationship',status:201,idempotency:true},
  {id:'graph_search',method:'get',path:'/api/v1/admin/graph/search',authority:'STAFF',capability:'graph.read',query:'GraphSearchQuery',response:'GraphSearchResult',status:200},
  {id:'graph_neighbourhood',method:'get',path:'/api/v1/admin/graph/nodes/{id}/neighbourhood',authority:'STAFF',capability:'graph.read',params:'IdPath',query:'NeighbourhoodQuery',response:'GraphNeighbourhood',status:200},
  {id:'graph_impact',method:'get',path:'/api/v1/admin/graph/nodes/{id}/impact',authority:'STAFF',capability:'graph.read',params:'IdPath',response:'ImpactAssessment',status:200},
  {id:'list_rights_requests',method:'get',path:'/api/v1/admin/rights-requests',authority:'STAFF',capability:'rights.read',response:'RightsRequestList',status:200,paginated:true},
  {id:'create_rights_request',method:'post',path:'/api/v1/admin/rights-requests',authority:'STAFF',capability:'rights.write',request:'RightsRequestCreate',response:'RightsRequest',status:201,idempotency:true},
  {id:'rights_request',method:'get',path:'/api/v1/admin/rights-requests/{id}',authority:'STAFF',capability:'rights.read',params:'IdPath',response:'RightsRequest',status:200},
  {id:'review_identity',method:'post',path:'/api/v1/admin/rights-requests/{id}/identity-review',authority:'STAFF',capability:'rights.write',params:'IdPath',request:'IdentityReview',response:'RightsRequest',status:200,idempotency:true},
  {id:'scope_request',method:'post',path:'/api/v1/admin/rights-requests/{id}/scope',authority:'STAFF',capability:'rights.write',params:'IdPath',request:'RequestScope',response:'RightsRequest',status:200,idempotency:true},
  {id:'transition_request',method:'post',path:'/api/v1/admin/rights-requests/{id}/transition',authority:'STAFF',capability:'rights.write',params:'IdPath',request:'RequestTransition',response:'RightsRequest',status:200,idempotency:true},
  {id:'release_response',method:'post',path:'/api/v1/admin/rights-requests/{id}/response',authority:'STAFF',capability:'rights.release',params:'IdPath',request:'ResponseRelease',response:'RightsRequest',status:200,idempotency:true},
  {id:'record_outcome',method:'post',path:'/api/v1/admin/rights-requests/{id}/outcomes',authority:'STAFF',capability:'rights.write',params:'IdPath',request:'SystemOutcomeRecord',response:'RightsRequest',status:200,idempotency:true},
  {id:'list_constraints',method:'get',path:'/api/v1/admin/retention/constraints',authority:'STAFF',capability:'retention.read',response:'RetentionConstraintList',status:200,paginated:true},
  {id:'create_constraint',method:'post',path:'/api/v1/admin/retention/constraints',authority:'STAFF',capability:'retention.write',request:'RetentionConstraintCreate',response:'RetentionConstraint',status:201,idempotency:true},
  {id:'list_holds',method:'get',path:'/api/v1/admin/retention/holds',authority:'STAFF',capability:'retention.read',response:'LegalHoldList',status:200,paginated:true},
  {id:'create_hold',method:'post',path:'/api/v1/admin/retention/holds',authority:'STAFF',capability:'retention.write',request:'LegalHoldCreate',response:'LegalHold',status:201,idempotency:true},
  {id:'release_hold',method:'post',path:'/api/v1/admin/retention/holds/{id}/release',authority:'STAFF',capability:'retention.approve',params:'IdPath',request:'HoldRelease',response:'LegalHold',status:200,idempotency:true},
  {id:'asset_eligibility',method:'get',path:'/api/v1/admin/data-assets/{id}/eligibility',authority:'STAFF',capability:'retention.read',params:'IdPath',response:'Eligibility',status:200},
  {id:'retention_decision',method:'post',path:'/api/v1/admin/data-assets/{id}/retention-decision',authority:'STAFF',capability:'retention.approve',params:'IdPath',request:'RetentionDecisionRecord',response:'Eligibility',status:200,idempotency:true},
  {id:'retention_outcome',method:'post',path:'/api/v1/admin/data-assets/{id}/retention-outcome',authority:'STAFF',capability:'retention.write',params:'IdPath',request:'RetentionOutcomeRecord',response:'RetentionOutcome',status:200,idempotency:true},
  {id:'list_retention_outcomes',method:'get',path:'/api/v1/admin/retention/outcomes',authority:'STAFF',capability:'retention.read',response:'RetentionOutcomeList',status:200,paginated:true},
  {id:'coverage',method:'get',path:'/api/v1/admin/coverage',authority:'STAFF',capability:'coverage.read',response:'CoverageReport',status:200},
  {id:'list_gaps',method:'get',path:'/api/v1/admin/gaps',authority:'STAFF',capability:'coverage.read',response:'GapList',status:200,paginated:true},
  {id:'derive_gaps',method:'post',path:'/api/v1/admin/gaps/derive',authority:'STAFF',capability:'coverage.manage',response:'GapDerivation',status:200,idempotency:true},
  {id:'assign_gap',method:'post',path:'/api/v1/admin/gaps/{id}/assignment',authority:'STAFF',capability:'coverage.manage',params:'IdPath',request:'GapAssignment',response:'Gap',status:200,idempotency:true},
  {id:'close_gap',method:'post',path:'/api/v1/admin/gaps/{id}/closure',authority:'STAFF',capability:'coverage.manage',params:'IdPath',request:'GapClosure',response:'Gap',status:200,idempotency:true},
  {id:'gap_guidance',method:'get',path:'/api/v1/admin/gaps/{id}/guidance',authority:'STAFF',capability:'coverage.read',params:'IdPath',response:'Guidance',status:200},
  {id:'list_processors',method:'get',path:'/api/v1/admin/processors',authority:'STAFF',capability:'processor.read',response:'ProcessorList',status:200,paginated:true},
  {id:'create_processor',method:'post',path:'/api/v1/admin/processors',authority:'STAFF',capability:'processor.write',request:'ProcessorCreate',response:'Processor',status:201,idempotency:true},
  {id:'link_processor_system',method:'post',path:'/api/v1/admin/processors/{id}/systems',authority:'STAFF',capability:'processor.write',params:'IdPath',request:'ProcessorLinkCreate',response:'Processor',status:200,idempotency:true},
  {id:'processor_standing',method:'get',path:'/api/v1/admin/processors/{id}/standing',authority:'STAFF',capability:'processor.read',params:'IdPath',response:'ProcessorStanding',status:200},
  {id:'record_coordination',method:'post',path:'/api/v1/admin/processors/{id}/coordination',authority:'STAFF',capability:'processor.write',params:'IdPath',request:'CoordinationRecord',response:'Coordination',status:201,idempotency:true},
  {id:'list_assessments',method:'get',path:'/api/v1/admin/assessments',authority:'STAFF',capability:'processor.read',response:'AssessmentList',status:200,paginated:true},
  {id:'create_assessment',method:'post',path:'/api/v1/admin/assessments',authority:'STAFF',capability:'processor.write',request:'AssessmentCreate',response:'Assessment',status:201,idempotency:true},
  {id:'complete_assessment',method:'post',path:'/api/v1/admin/assessments/{id}/completion',authority:'STAFF',capability:'processor.write',params:'IdPath',request:'AssessmentCompletion',response:'Assessment',status:200,idempotency:true},
  {id:'list_findings',method:'get',path:'/api/v1/admin/findings',authority:'STAFF',capability:'processor.read',response:'FindingList',status:200,paginated:true},
  {id:'create_finding',method:'post',path:'/api/v1/admin/findings',authority:'STAFF',capability:'processor.write',request:'FindingCreate',response:'Finding',status:201,idempotency:true},
  {id:'close_finding',method:'post',path:'/api/v1/admin/findings/{id}/closure',authority:'STAFF',capability:'processor.write',params:'IdPath',request:'FindingClosure',response:'Finding',status:200,idempotency:true},
  {id:'list_incidents',method:'get',path:'/api/v1/admin/incidents',authority:'STAFF',capability:'incident.read',response:'IncidentList',status:200,paginated:true},
  {id:'create_incident',method:'post',path:'/api/v1/admin/incidents',authority:'STAFF',capability:'incident.write',request:'IncidentCreate',response:'Incident',status:201,idempotency:true},
  {id:'incident_assessment',method:'get',path:'/api/v1/admin/incidents/{id}/assessment',authority:'STAFF',capability:'incident.read',params:'IdPath',response:'IncidentAssessment',status:200},
  {id:'correct_incident',method:'post',path:'/api/v1/admin/incidents/{id}/corrections',authority:'STAFF',capability:'incident.write',params:'IdPath',request:'IncidentCorrection',response:'IncidentAssessment',status:200,idempotency:true},
  {id:'contain_incident',method:'post',path:'/api/v1/admin/incidents/{id}/containment',authority:'STAFF',capability:'incident.write',params:'IdPath',request:'IncidentContainment',response:'Incident',status:200,idempotency:true},
  {id:'close_incident',method:'post',path:'/api/v1/admin/incidents/{id}/closure',authority:'STAFF',capability:'incident.approve',params:'IdPath',request:'IncidentClosure',response:'Incident',status:200,idempotency:true},
  {id:'transition_notification',method:'post',path:'/api/v1/admin/notification-obligations/{id}/transition',authority:'STAFF',capability:'incident.write',params:'IdPath',request:'NotificationTransition',response:'NotificationObligation',status:200,idempotency:true},
  {id:'list_obligation_rules',method:'get',path:'/api/v1/admin/obligation-rules',authority:'STAFF',capability:'incident.read',response:'ObligationRuleList',status:200,paginated:true},
  {id:'create_obligation_rule',method:'post',path:'/api/v1/admin/obligation-rules',authority:'STAFF',capability:'incident.approve',request:'ObligationRuleCreate',response:'ObligationRule',status:201,idempotency:true},
  {id:'list_templates',method:'get',path:'/api/v1/admin/notification-templates',authority:'STAFF',capability:'notification.read',response:'TemplateList',status:200,paginated:true},
  {id:'create_template',method:'post',path:'/api/v1/admin/notification-templates',authority:'STAFF',capability:'notification.manage',request:'TemplateCreate',response:'Template',status:201,idempotency:true},
  {id:'list_notification_tasks',method:'get',path:'/api/v1/admin/notification-tasks',authority:'STAFF',capability:'notification.read',response:'NotificationTaskList',status:200,paginated:true},
  {id:'create_notification_task',method:'post',path:'/api/v1/admin/notification-tasks',authority:'STAFF',capability:'notification.manage',request:'NotificationTaskCreate',response:'NotificationTask',status:201,idempotency:true},
  {id:'notification_task',method:'get',path:'/api/v1/admin/notification-tasks/{id}',authority:'STAFF',capability:'notification.read',params:'IdPath',response:'NotificationTask',status:200},
  {id:'record_delivery',method:'post',path:'/api/v1/admin/notification-tasks/{id}/deliveries',authority:'STAFF',capability:'notification.manage',params:'IdPath',request:'DeliveryRecord',response:'NotificationTask',status:200,idempotency:true},
  {id:'escalation_sweep',method:'post',path:'/api/v1/admin/notification-tasks/escalate',authority:'STAFF',capability:'notification.manage',response:'EscalationSweep',status:200,idempotency:true},
  {id:'entitlements',method:'get',path:'/api/v1/admin/entitlements',authority:'STAFF',capability:'licence.read',response:'EntitlementReport',status:200},
  {id:'import_licence',method:'post',path:'/api/v1/admin/licences',authority:'STAFF',capability:'licence.manage',request:'LicenceImport',response:'LicenceState',status:201,idempotency:true},
  {id:'list_support_cases',method:'get',path:'/api/v1/admin/support-cases',authority:'STAFF',capability:'support.read',response:'SupportCaseList',status:200,paginated:true},
  {id:'create_support_case',method:'post',path:'/api/v1/admin/support-cases',authority:'STAFF',capability:'support.manage',request:'SupportCaseCreate',response:'SupportCase',status:201,idempotency:true},
  {id:'support_case',method:'get',path:'/api/v1/admin/support-cases/{id}',authority:'STAFF',capability:'support.read',params:'IdPath',response:'SupportCaseStanding',status:200},
  {id:'generate_diagnostic',method:'post',path:'/api/v1/admin/support-cases/{id}/diagnostics',authority:'STAFF',capability:'support.manage',params:'IdPath',response:'DiagnosticDraft',status:201,idempotency:true},
  {id:'record_resolution',method:'post',path:'/api/v1/admin/support-cases/{id}/resolution',authority:'STAFF',capability:'support.manage',params:'IdPath',request:'SupportResolution',response:'SupportCaseStanding',status:200,idempotency:true},
  {id:'approve_diagnostic',method:'post',path:'/api/v1/admin/diagnostics/{id}/approval',authority:'STAFF',capability:'support.approve',params:'IdPath',request:'DiagnosticApprovalCreate',response:'DiagnosticApproval',status:201,idempotency:true},
  {id:'record_transfer',method:'post',path:'/api/v1/admin/diagnostic-approvals/{id}/transfers',authority:'STAFF',capability:'support.manage',params:'IdPath',request:'TransferRecord',response:'DiagnosticTransfer',status:201,idempotency:true},
  {id:'validate_submission',method:'post',path:'/api/v1/admin/support-ingress/validation',authority:'STAFF',capability:'support.manage',request:'IngressSubmission',response:'IngressValidation',status:200,idempotency:true},
  {id:'list_canaries',method:'get',path:'/api/v1/admin/support-canaries',authority:'STAFF',capability:'support.read',response:'CanaryList',status:200,paginated:true},
  {id:'register_canary',method:'post',path:'/api/v1/admin/support-canaries',authority:'STAFF',capability:'support.manage',request:'CanaryRegister',response:'Canary',status:201,idempotency:true},
  {id:'list_releases',method:'get',path:'/api/v1/admin/releases',authority:'STAFF',capability:'update.read',response:'ReleaseList',status:200,paginated:true},
  {id:'import_release',method:'post',path:'/api/v1/admin/releases',authority:'STAFF',capability:'update.approve',request:'ReleaseImport',response:'ReleaseState',status:201,idempotency:true},
  {id:'update_eligibility',method:'get',path:'/api/v1/admin/releases/{id}/eligibility',authority:'STAFF',capability:'update.read',params:'IdPath',response:'UpdateEligibility',status:200},
  {id:'plan_update',method:'post',path:'/api/v1/admin/releases/{id}/plan',authority:'STAFF',capability:'update.approve',params:'IdPath',request:'UpdatePlanCreate',response:'UpdatePlan',status:201,idempotency:true},
  {id:'list_update_plans',method:'get',path:'/api/v1/admin/update-plans',authority:'STAFF',capability:'update.read',response:'UpdatePlanList',status:200,paginated:true},
  {id:'update_plan',method:'get',path:'/api/v1/admin/update-plans/{id}',authority:'STAFF',capability:'update.read',params:'IdPath',response:'UpdatePlan',status:200},
  {id:'record_update_step',method:'post',path:'/api/v1/admin/update-plans/{id}/steps',authority:'STAFF',capability:'update.approve',params:'IdPath',request:'UpdateStepRecord',response:'UpdatePlan',status:200,idempotency:true},
  {id:'installation_versions',method:'get',path:'/api/v1/admin/installation-versions',authority:'STAFF',capability:'update.read',response:'InstallationVersionList',status:200,paginated:true},
  {id:'operational_readiness',method:'get',path:'/api/v1/admin/readiness',authority:'STAFF',capability:'health.read',response:'OperationalReadiness',status:200},
  {id:'list_audit_events',method:'get',path:'/api/v1/admin/audit-events',authority:'STAFF',capability:'audit.read',query:'AuditQuery',response:'AuditEventList',status:200,paginated:true},
  {id:'export_audit_events',method:'get',path:'/api/v1/admin/audit-events/export',authority:'STAFF',capability:'audit.export',query:'AuditQuery',response:'AuditExport',status:200},
  {id:'audit_coverage',method:'get',path:'/api/v1/admin/audit-coverage',authority:'STAFF',capability:'audit.read',response:'AuditCoverage',status:200},
  {id:'list_backup_snapshots',method:'get',path:'/api/v1/admin/backup-snapshots',authority:'STAFF',capability:'health.read',response:'BackupSnapshotList',status:200,paginated:true},
  {id:'declare_snapshot',method:'post',path:'/api/v1/admin/backup-snapshots',authority:'STAFF',capability:'configuration.write',request:'BackupSnapshotCreate',response:'BackupSnapshot',status:201,idempotency:true},
  {id:'start_restore',method:'post',path:'/api/v1/admin/restore-runs',authority:'STAFF',capability:'configuration.write',request:'RestoreRunCreate',response:'RestoreReconciliation',status:201,idempotency:true},
  // Quarantine is only a control if the person holding restore.release can find
  // what is waiting. They are deliberately not the person who started it.
  {id:'list_restore_runs',method:'get',path:'/api/v1/admin/restore-runs',authority:'STAFF',capability:'health.read',response:'RestoreRunList',status:200,paginated:true},
  // FR-M32-04. A read of what this installation disclosed, held by the same
  // capability as its other installation reads so an auditor can see it too.
  {id:'vendor_visibility',method:'get',path:'/api/v1/admin/vendor-visibility',authority:'STAFF',capability:'health.read',response:'VendorVisibility',status:200},
  // FR-M33-04. Reading the schedule is an audit read; setting how long the
  // trail is kept is audit administration, which is a different authority.
  {id:'audit_retention',method:'get',path:'/api/v1/admin/audit-retention',authority:'STAFF',capability:'audit.read',response:'AuditRetentionReport',status:200},
  {id:'set_audit_retention',method:'post',path:'/api/v1/admin/audit-retention-rules',authority:'STAFF',capability:'audit.administer',request:'AuditRetentionRuleCreate',response:'AuditRetentionRule',status:201,idempotency:true},
  // FR-M29-04. One typed path: submit into quarantine, preview with conflicts,
  // decide each conflict, then apply as asserted inventory or purge the rows.
  {id:'list_imports',method:'get',path:'/api/v1/admin/imports',authority:'STAFF',capability:'graph.read',response:'ImportBatchList',status:200,paginated:true},
  {id:'submit_import',method:'post',path:'/api/v1/admin/imports',authority:'STAFF',capability:'graph.write',request:'ImportSubmit',response:'ImportBatch',status:201,idempotency:true},
  {id:'import_batch',method:'get',path:'/api/v1/admin/imports/{id}',authority:'STAFF',capability:'graph.read',params:'IdPath',response:'ImportBatch',status:200},
  {id:'decide_import_row',method:'post',path:'/api/v1/admin/imports/{id}/decisions',authority:'STAFF',capability:'graph.write',params:'IdPath',request:'ImportRowDecide',response:'ImportBatch',status:200,idempotency:true},
  {id:'apply_import',method:'post',path:'/api/v1/admin/imports/{id}/apply',authority:'STAFF',capability:'graph.write',params:'IdPath',response:'ImportBatch',status:200,idempotency:true},
  {id:'purge_import',method:'post',path:'/api/v1/admin/imports/{id}/purge',authority:'STAFF',capability:'graph.write',params:'IdPath',request:'ImportPurge',response:'ImportBatch',status:200,idempotency:true},
  {id:'restore_run',method:'get',path:'/api/v1/admin/restore-runs/{id}',authority:'STAFF',capability:'health.read',params:'IdPath',response:'RestoreReconciliation',status:200},
  {id:'acknowledge_conflict',method:'post',path:'/api/v1/admin/restore-runs/{id}/acknowledgements',authority:'STAFF',capability:'configuration.write',params:'IdPath',request:'ConsentConflictAcknowledge',response:'RestoreReconciliation',status:200,idempotency:true},
  {id:'release_restore',method:'post',path:'/api/v1/admin/restore-runs/{id}/release',authority:'STAFF',capability:'restore.release',params:'IdPath',response:'RestoreReconciliation',status:200,idempotency:true},
  {id:'preflight',method:'get',path:'/api/v1/admin/preflight',authority:'STAFF',capability:'health.read',response:'PreflightReport',status:200},
  {id:'list_connections',method:'get',path:'/api/v1/admin/connections',authority:'STAFF',capability:'configuration.read',response:'GuidedConnectionList',status:200,paginated:true},
  {id:'start_connection',method:'post',path:'/api/v1/admin/connections',authority:'STAFF',capability:'configuration.write',request:'ConnectionStart',response:'GuidedConnection',status:201,idempotency:true},
  {id:'connection',method:'get',path:'/api/v1/admin/connections/{id}',authority:'STAFF',capability:'configuration.read',params:'IdPath',response:'GuidedConnection',status:200},
  {id:'record_connectivity',method:'post',path:'/api/v1/admin/connections/{id}/connectivity',authority:'STAFF',capability:'configuration.write',params:'IdPath',request:'ConnectivityRecord',response:'GuidedConnection',status:200,idempotency:true},
  {id:'record_scoped_identity',method:'post',path:'/api/v1/admin/connections/{id}/identity',authority:'STAFF',capability:'configuration.write',params:'IdPath',request:'ScopedIdentityRecord',response:'GuidedConnection',status:200,idempotency:true},
  {id:'approve_resources',method:'post',path:'/api/v1/admin/connections/{id}/resources',authority:'STAFF',capability:'configuration.write',params:'IdPath',request:'ResourceApproval',response:'GuidedConnection',status:200,idempotency:true},
  {id:'change_enablement',method:'post',path:'/api/v1/admin/connections/{id}/enablement',authority:'STAFF',capability:'connection.enable',params:'IdPath',request:'EnablementChange',response:'GuidedConnection',status:200,idempotency:true},
  {id:'correct_audit_event',method:'post',path:'/api/v1/admin/audit-corrections',authority:'STAFF',capability:'audit.administer',request:'AuditCorrectionCreate',response:'AuditCorrection',status:201,idempotency:true},
  {id:'list_mandates',method:'get',path:'/api/v1/admin/mandates',authority:'STAFF',capability:'rights.read',response:'MandateList',status:200,paginated:true},
  {id:'create_mandate',method:'post',path:'/api/v1/admin/mandates',authority:'STAFF',capability:'rights.write',request:'MandateCreate',response:'Mandate',status:201,idempotency:true},
  {id:'revoke_mandate',method:'post',path:'/api/v1/admin/mandates/{id}/revoke',authority:'STAFF',capability:'rights.write',params:'IdPath',request:'MandateRevoke',response:'Mandate',status:200,idempotency:true},
  {id:'poll_commands',method:'post',path:'/api/v1/machine/commands/poll',authority:'MACHINE',request:'PollRequest',response:'CommandList',status:200},
  {id:'command_receipt',method:'post',path:'/api/v1/machine/commands/{id}/receipts',authority:'MACHINE',params:'IdPath',request:'CommandReceipt',response:'AcceptedOperation',status:202,idempotency:true},
  {id:'send',method:'post',path:'/api/v1/machine/simulator/send',authority:'MACHINE',request:'SendRequest',response:'SendResult',status:200,idempotency:true},
  {id:'restrict',method:'post',path:'/api/v1/machine/simulator/resources/{id}/restrict',authority:'MACHINE',params:'IdPath',request:'SignedCommand',response:'CommandReceipt',status:200,idempotency:true},
  {id:'read_simulator',method:'get',path:'/api/v1/machine/simulator/resources/{id}',authority:'MACHINE',params:'IdPath',response:'SimulatorState',status:200},
  {id:'read_simulator_receipt',method:'get',path:'/api/v1/machine/simulator/receipts/{id}',authority:'MACHINE',params:'IdPath',response:'CommandReceipt',status:200},
];
