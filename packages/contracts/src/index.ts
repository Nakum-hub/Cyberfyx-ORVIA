import { z } from 'zod';

/** A02 additions pending consolidated Work review; accepted baseline was 0.2.1. */
export const CONTRACT_VERSION = '0.4.0' as const;
// Transport pagination does not change the signed command wire format.
export const COMMAND_SCHEMA_VERSION = '0.3.0' as const;
export const PROFILE = 'CUSTOMER_LOCAL_SYNTHETIC' as const;
export const AUTH = {
  staff: { base_path: '/api/auth/staff', cookie_prefix: 'orvia.staff' },
  principal: { base_path: '/api/auth/principal', cookie_prefix: 'orvia.principal' },
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
export const Capability = z.enum(['overview.read', 'configuration.read', 'configuration.write', 'policy.publish', 'systems.check', 'principals.read', 'principals.create', 'workflow.read', 'action.reconcile', 'manual.attest', 'evidence.read', 'evidence.export', 'policy.preview', 'tests.run', 'tests.read', 'capabilities.read', 'consent.own.read', 'consent.own.write', 'receipt.own.read', 'health.read']);
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
export const NoticeCreate = z.strictObject({ purpose_id: Id, language: z.enum(['en']), title: z.string().min(1).max(120), content: z.string().min(1).max(10000) });
export const Notice = NoticeCreate.extend({ id: Id, version_id: Id, content_digest: Digest, published_at: Time.nullable() });
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
export const ConsentChoice = z.strictObject({ purpose_id: Id, purpose_name: SafeText, consent_status: ConsentState, consent_epoch: Epoch, notice: Notice.nullable(), interaction_id: Id });
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
export const Obligation = z.strictObject({ id: Id, required: z.boolean(), completion_criterion: z.enum(['CURRENT_SCOPED_OBSERVATION', 'ATTRIBUTED_MANUAL_ATTESTATION']).describe('CURRENT_SCOPED_OBSERVATION requires a fresh, satisfied SCOPED_READ in the current scope. PROVIDER_RECEIPT remains attributable evidence/reconciliation input and cannot satisfy this criterion. ATTRIBUTED_MANUAL_ATTESTATION remains a separate administrative criterion.'), execution_state: ExecutionState, observation: Observation.nullable(), attestation: z.strictObject({ actor_id: Id, recorded_at: Time, statement: z.string().max(2000), evidence_record_ids: z.array(Id).min(1) }).nullable(), scope_still_current: z.boolean(), skip_reason: SafeText.nullable() });
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
export const IdPath = z.strictObject({ id: Id });
export const PurposePath = z.strictObject({ purpose_id: Id });
export const WorkflowPath = z.strictObject({ workflow_id: Id });
export const PollRequest = z.strictObject({ installation_id: Id, environment_id: Id, maximum_commands: z.number().int().min(1).max(10) });

export const schemas = { ErrorResponse, Pagination, Session, Grant, Withdraw, Receipt, ReceiptView, PurposeCreate, Purpose, NoticeCreate, Notice, PolicyCreate, Policy, PolicyPublish, PolicyReauthenticate, PublicationProof, MappingCreate, TargetMapping, SystemCreate, System, PrincipalCreate, Principal, ConsentChoice, CommandScope, Approval, PlanBinding, CommandPayload, SignedCommand, CommandReceipt, Observation, Reconciliation, ManualAttestation, Obligation, Action, WorkflowSummary, Workflow, AcceptedOperation, Evaluate, Decision, SendRequest, SendResult, SimulatorState, TestRunCreate, TestRun, CapabilityRecord, Overview, Evidence, ControlMap, IdPath, PurposePath, WorkflowPath, PollRequest,
  ReceiptList: page(Receipt), MappingList: page(TargetMapping),
  PurposeList: page(Purpose), NoticeList: page(Notice), PolicyList: page(Policy), SystemList: page(System), PrincipalList: page(Principal), ConsentList: page(ConsentChoice), WorkflowList: page(WorkflowSummary), FailureList: page(Obligation), CapabilityList: page(CapabilityRecord), CommandList: z.strictObject({commands:z.array(SignedCommand).max(10), poll_after_ms:z.literal(2000)}), Health: z.strictObject({status:z.literal('alive')}) };
export type SchemaName = keyof typeof schemas;
export type RouteDefinition = { id: string; method: 'get'|'post'; path:string; authority:'PUBLIC'|'STAFF'|'PRINCIPAL'|'STAFF_OR_PRINCIPAL'|'MACHINE'; request?:SchemaName; response:SchemaName; status:200|201|202; params?:SchemaName; paginated?:boolean; idempotency?:boolean; capability?:z.infer<typeof Capability> };
export const routes: RouteDefinition[] = [
  {id:'health',method:'get',path:'/healthz',authority:'PUBLIC',response:'Health',status:200},
  {id:'session',method:'get',path:'/api/v1/session',authority:'STAFF_OR_PRINCIPAL',response:'Session',status:200},
  {id:'overview',method:'get',path:'/api/v1/admin/overview',authority:'STAFF',capability:'overview.read',response:'Overview',status:200},
  ...(['purposes','notices','policies','systems','principals'] as const).flatMap((resource) => {
    const names = {purposes:['Purpose','configuration.read','configuration.write'],notices:['Notice','configuration.read','configuration.write'],policies:['Policy','configuration.read','configuration.write'],systems:['System','configuration.read','configuration.write'],principals:['Principal','principals.read','principals.create']} as const;
    const [name,read,write] = names[resource];
    return [{id:`list_${resource}`,method:'get',path:`/api/v1/admin/${resource}`,authority:'STAFF',response:`${name}List`,status:200,paginated:true,capability:read}, {id:`create_${resource}`,method:'post',path:`/api/v1/admin/${resource}`,authority:'STAFF',request:`${name}Create`,response:name,status:201,idempotency:true,capability:write}] as RouteDefinition[];
  }),
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
  {id:'poll_commands',method:'post',path:'/api/v1/machine/commands/poll',authority:'MACHINE',request:'PollRequest',response:'CommandList',status:200},
  {id:'command_receipt',method:'post',path:'/api/v1/machine/commands/{id}/receipts',authority:'MACHINE',params:'IdPath',request:'CommandReceipt',response:'AcceptedOperation',status:202,idempotency:true},
  {id:'send',method:'post',path:'/api/v1/machine/simulator/send',authority:'MACHINE',request:'SendRequest',response:'SendResult',status:200,idempotency:true},
  {id:'restrict',method:'post',path:'/api/v1/machine/simulator/resources/{id}/restrict',authority:'MACHINE',params:'IdPath',request:'SignedCommand',response:'CommandReceipt',status:200,idempotency:true},
  {id:'read_simulator',method:'get',path:'/api/v1/machine/simulator/resources/{id}',authority:'MACHINE',params:'IdPath',response:'SimulatorState',status:200},
  {id:'read_simulator_receipt',method:'get',path:'/api/v1/machine/simulator/receipts/{id}',authority:'MACHINE',params:'IdPath',response:'CommandReceipt',status:200},
];
