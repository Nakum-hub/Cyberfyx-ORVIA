import { z } from 'zod';
import { COMMAND_SCHEMA_VERSION, AuditCategory, CommandPayload, ConnectionStep, schemas, type SchemaName } from './index.ts';
import { digest } from './crypto.ts';
import signatureVector from '../fixtures/command-vector.json' with { type:'json' };
export const uuid = (n:number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`;
export const sampleTime='2026-09-16T10:00:00.000Z';
export const exampleBinding={workflow_id:uuid(10),action_id:uuid(11),scope:{tenant_id:uuid(1),legal_entity_id:uuid(2),environment_id:uuid(3),principal_reference_id:uuid(4),system_id:uuid(5),resource_id:uuid(6),target_subject_reference:'syn_asha_demo',purpose_id:uuid(7),policy_version_id:uuid(8),consent_epoch:2,target_generation:1,operation:'CRM_REMOVE_MARKETING_MEMBERSHIP' as const},capability:'restrict_exact_synthetic_subject' as const,capability_version:'1.0.0',operation_budget:{maximum_records:1 as const,maximum_attempts:3}};
const approval={result:'NOT_REQUIRED_BY_POLICY' as const,decision_id:uuid(12),policy_version_id:uuid(8),approved_plan_digest:digest(exampleBinding),rule_id:'SYNTHETIC_NON_DESTRUCTIVE_RESTRICTION' as const,decided_at:sampleTime};
export const examplePayload=CommandPayload.parse({schema_version:COMMAND_SCHEMA_VERSION,command_id:uuid(13),installation_id:uuid(14),signing_key_id:uuid(15),binding:exampleBinding,scope_digest:digest(exampleBinding.scope),plan_digest:digest(exampleBinding),approval,approval_digest:digest(approval),issued_at:sampleTime,expires_at:'2026-09-16T10:04:00.000Z',nonce:'synthetic_example_nonce_000000000000000001'});
export const exampleReceipt={receipt_id:uuid(20),event_id:uuid(21),purpose_id:uuid(7),consent_status:'WITHDRAWN',consent_epoch:2,accepted_at:sampleTime,workflow_id:uuid(10),propagation_status:'ACCEPTED'};
export const receiptReplayExample={description:'An identical authorised retry after epoch 3 returns the unchanged epoch-2 acceptance receipt.',original_response:exampleReceipt,replayed_response:exampleReceipt,current_get:{receipt:exampleReceipt,current:{consent_status:'GRANTED',consent_epoch:3,propagation_status:'NEEDS_ATTENTION',as_of:'2026-09-16T10:10:00.000Z'}}};

type JsonSchema = {anyOf?:JsonSchema[];oneOf?:JsonSchema[];const?:unknown;enum?:unknown[];type?:string;format?:string;pattern?:string;minimum?:number;exclusiveMinimum?:number;minLength?:number;minItems?:number;properties?:Record<string,JsonSchema>;items?:JsonSchema;required?:string[];default?:unknown};
let sequence=100;
export function sample(schema:JsonSchema,key=''):unknown {
  if('const' in schema)return schema.const;
  if(schema.default!==undefined)return schema.default;
  if(schema.enum)return schema.enum[0];
  const union=schema.anyOf??schema.oneOf;
  if(union)return sample(union.find(s=>s.type==='null')??union[0]!,key);
  if(schema.type==='object')return Object.fromEntries(Object.entries(schema.properties??{}).filter(([k])=>schema.required?.includes(k)).map(([k,v])=>[k,sample(v,k)]));
  if(schema.type==='array')return Array.from({length:schema.minItems??0},()=>sample(schema.items??{},key));
  if(schema.type==='integer'||schema.type==='number')return schema.minimum??(schema.exclusiveMinimum===undefined?0:schema.exclusiveMinimum+1);
  if(schema.type==='boolean')return false;
  if(schema.type==='null')return null;
  if(schema.format==='uuid')return uuid(sequence++);
  if(schema.format==='date-time')return sampleTime;
  if(schema.format==='email'||key==='email')return 'asha@aster.example';
  if(schema.pattern?.includes('[a-f0-9]{64}'))return 'a'.repeat(64);
  if(schema.pattern?.includes('\\d+\\.'))return '1.0.0';
  if(schema.pattern?.includes('syn_order_'))return 'syn_order_001';
  if(schema.pattern?.includes('syn_'))return 'syn_asha_demo';
  if(schema.pattern?.includes('{86}'))return 'A'.repeat(86);
  if(schema.pattern?.includes('{32,128}'))return 'A'.repeat(32);
  if(schema.pattern?.includes('[A-Z_]'))return 'SYNTHETIC_EXAMPLE';
  if(key==='build_id')return 'a00-synthetic-example';
  if(schema.pattern==='^[0-9]{6}$')return '123456';
  return 'Synthetic example'.padEnd(schema.minLength??1,'x');
}
/** A relationship type fixes both endpoint kinds, so the generic sampler cannot build a valid edge. */
const exampleRelationshipCreate={relationship_type:'ASSET_PROCESSED_BY_ACTIVITY' as const,from:{kind:'DATA_ASSET' as const,id:uuid(40)},to:{kind:'PROCESSING_ACTIVITY' as const,id:uuid(41)},provenance:'ASSERTED' as const,valid_from:sampleTime,confidence_basis:'Reviewed customer declaration'};
export const exampleRelationship={...exampleRelationshipCreate,id:uuid(42),review_state:'UNREVIEWED' as const,recorded_at:sampleTime,valid_to:null,last_seen_at:null,owner_actor_id:uuid(43)};
export function example(name:SchemaName):unknown {
  if(name==='CommandPayload')return examplePayload;
  if(name==='GraphRelationshipCreate')return exampleRelationshipCreate;
  if(name==='GraphRelationship')return exampleRelationship;
  // An exact match resolves to exactly one reference, so the generic sampler's
  // zero-count minimum cannot produce a coherent review.
  if(name==='IdentityReview')return {grade:'EXACT',basis:'Verified against the recorded portal identity.',matched_reference_count:1};
  // A successful outcome must name its method and evidence, which the generic
  // sampler's null-for-nullable rule cannot produce.
  // The sampler picks null for every nullable, which a constraint that must bound
  // something, an eligible copy and a verifiable copy class all reject.
  const constraintExample={data_asset_id:uuid(60),purpose_id:uuid(61),trigger:'RECORD_CREATED' as const,basis:'STATUTORY_OBLIGATION' as const,source_reference:'Reviewed statutory retention schedule.',minimum_days:365,maximum_days:2555,permitted_use:'Retained only to satisfy the stated obligation.',owner_reference:'Records management',review_at:sampleTime,release_condition:'Released when the obligation lapses.'};
  if(name==='RetentionConstraintCreate')return constraintExample;
  if(name==='RetentionConstraint')return {...constraintExample,id:uuid(62),recorded_at:sampleTime,recorded_by:uuid(63)};
  if(name==='Eligibility')return {data_asset_id:uuid(60),evaluated_at:sampleTime,eligible:false,blockers:['NO_RECORDED_BASIS'],applicable_constraint_ids:[],active_hold_ids:[],governing_constraint_id:null,earliest_deletion_at:null,reasons:['No reviewed retention basis is recorded for this copy, so deletion is not permitted.'],limits:['Absence of a recorded constraint is not permission to delete.']};
  if(name==='RetentionOutcomeRecord')return {result:'SUPPRESSED' as const,method:'MANUAL_ATTESTATION' as const,evidence_reference:'Signed suppression confirmation.',note:'Suppressed in the live store.'};
  if(name==='RetentionOutcome')return {data_asset_id:uuid(60),copy_class:'DATASET' as const,result:'SUPPRESSED' as const,method:'MANUAL_ATTESTATION' as const,evidence_reference:'Signed suppression confirmation.',note:'Suppressed in the live store.',recorded_at:sampleTime,recorded_by:uuid(63)};
  // Notification, acknowledgement and verification each fix their own method,
  // which the generic sampler's first-enum-value rule cannot satisfy together.
  if(name==='CoordinationRecord')return {processor_id:uuid(80),fact:'NOTIFIED' as const,subject:'Withdrawal propagation request.',method:'RECORDED_MESSAGE' as const,evidence_reference:'Message reference SYN-MSG-0001.',note:'Sent to the designated contact.'};
  if(name==='Coordination')return {processor_id:uuid(80),fact:'NOTIFIED' as const,subject:'Withdrawal propagation request.',method:'RECORDED_MESSAGE' as const,evidence_reference:'Message reference SYN-MSG-0001.',note:'Sent to the designated contact.',id:uuid(81),recorded_at:sampleTime,recorded_by:uuid(82)};
  if(name==='FindingClosure')return {state:'REMEDIATED' as const,closure_evidence:'Retest report SYN-RT-0001.',retest_reference:null,note:'Control re-tested and confirmed working.'};
  if(name==='Finding')return {assessment_id:uuid(83),severity:'MEDIUM' as const,description:'Sub-processor list was out of date.',affected_system_ids:[],owner_reference:'Vendor management',due_at:sampleTime,id:uuid(84),state:'OPEN' as const,recorded_at:sampleTime,recorded_by:uuid(82),closed_at:null,closure_evidence:null,retest_reference:null,closure_note:null};
  const templateExample={code:'GAP_OVERDUE_NOTICE',channel:'IN_APP' as const,recipient_scope:'CUSTOMER_STAFF' as const,subject:'A recorded gap has passed its deadline.',body:'A gap assigned to you passed its agreed deadline. The deadline has not been changed.',purpose_note:'Operational escalation only; never a marketing opportunity.'};
  if(name==='TemplateCreate')return templateExample;
  if(name==='Template')return {...templateExample,id:uuid(90),version:1,content_digest:'a'.repeat(64),recorded_at:sampleTime,recorded_by:uuid(91)};
  if(name==='DeliveryRecord')return {fact:'QUEUED' as const,evidence_reference:null,note:'Queued for in-app delivery.'};
  if(name==='Delivery')return {id:uuid(92),task_id:uuid(93),fact:'QUEUED' as const,evidence_reference:null,note:'Queued for in-app delivery.',recorded_at:sampleTime,recorded_by:uuid(91)};
  if(name==='NotificationTask')return {id:uuid(93),template_id:uuid(90),template_code:'GAP_OVERDUE_NOTICE',channel:'IN_APP' as const,recipient_scope:'CUSTOMER_STAFF' as const,recipient_reference:'Records management',source:'COVERAGE_GAP' as const,source_id:uuid(94),source_due_at:sampleTime,created_at:sampleTime,queued:true,sent:false,delivered:false,failed:false,acknowledged:false,attempts:0,channel_available:true,escalated_at:null,escalation_reason:null,deliveries:[]};
  const licenceClaims={licence_id:uuid(95),edition:'CONTROL' as const,entitlements:['PRIVACY_GRAPH' as const],installation_id:uuid(96),audience:'ORVIA_CUSTOMER_INSTALLATION' as const,valid_from:sampleTime,valid_to:'2027-09-16T10:00:00.000Z',licensed_limits:{environments:3,staff_members:25}};
  if(name==='LicenceClaims')return licenceClaims;
  if(name==='SignedLicence')return {algorithm:'Ed25519' as const,claims:licenceClaims,signing_key_id:uuid(97),signature:'A'.repeat(86)};
  if(name==='LicenceImport')return {licence:{algorithm:'Ed25519' as const,claims:licenceClaims,signing_key_id:uuid(97),signature:'A'.repeat(86)}};
  if(name==='LicenceState')return {licence_id:uuid(95),edition:'CONTROL' as const,entitlements:['PRIVACY_GRAPH' as const],installation_id:uuid(96),valid_from:sampleTime,valid_to:'2027-09-16T10:00:00.000Z',licensed_limits:{environments:3,staff_members:25},imported_at:sampleTime,imported_by:uuid(98),active:true,expired:false,continuity_note:'Expiry restricts new work and never removes recorded evidence or the ability to read and export it.'};
  if(name==='FeatureAvailability')return {feature:'PRIVACY_GRAPH' as const,usable:false,gates:[
    {gate:'RELEASE_AVAILABILITY' as const,satisfied:true,reason:'Shipped in this release.'},
    {gate:'DEPLOYMENT_SUPPORT' as const,satisfied:true,reason:'Supported on this deployment profile.'},
    {gate:'CONTROLLED_ROLLOUT' as const,satisfied:true,reason:'Not held back by a rollout control.'},
    {gate:'LICENCE_ENTITLEMENT' as const,satisfied:false,reason:'No active licence names this entitlement.'},
    {gate:'ACTOR_AUTHORISATION' as const,satisfied:true,reason:'This actor holds the capability.'}],limits:[]};
  // A submission is accepted exactly when nothing rejected it, which the
  // sampler's false-for-boolean and null-for-nullable rules cannot agree on.
  if(name==='IngressValidation')return {validated_at:sampleTime,accepted:true,rejection_code:null,byte_length:612,body_persisted:false,
    limits:['A rejected body is never stored. Only its size and the reason are kept.','Validation is the check a vendor ingress would run. This product performs no transfer.']};
  if(name==='IngressSubmission')return {case_reference:'SYNTHETIC_EXAMPLE',body_base64:Buffer.from('{"report_id":"'+uuid(200)+'"}').toString('base64')};
  const releaseClaims={release_id:uuid(201),version:'0.1.0',published_at:sampleTime,audience:'ORVIA_CUSTOMER_INSTALLATION' as const,
    minimum_upgradable_from:'0.0.0',supported_profiles:['CUSTOMER_LOCAL_SYNTHETIC' as const],artifact_digest:'a'.repeat(64),artifact_bytes:52428800,
    archive:[{path:'orvia/packages/db/migrations/0024_support_bundles.sql',bytes:4096}],
    dependencies:[{name:'zod',version:'4.1.13',digest:'b'.repeat(64)}],
    provenance:{source_commit:'0'.repeat(40),built_at:sampleTime,builder_reference:'Internal release pipeline, reproducible build.',reviewed_by_reference:'Release review record SYN-REL-0001.'},
    migrations:[{migration:'0024_support_bundles',irreversible:true,note:'Creates append-only support tables; reversing it would discard recorded approvals.'}],
    introduces_network_egress:false as const,requires_model_runtime:false as const,introduces_capabilities:['support.read' as const]};
  if(name==='ReleaseClaims')return releaseClaims;
  if(name==='SignedRelease')return {algorithm:'Ed25519' as const,claims:releaseClaims,signing_key_id:uuid(202),signature:'A'.repeat(86)};
  if(name==='ReleaseImport')return {release:{algorithm:'Ed25519' as const,claims:releaseClaims,signing_key_id:uuid(202),signature:'A'.repeat(86)}};
  if(name==='ReleaseState')return {id:uuid(203),release_id:uuid(201),version:'0.1.0',published_at:sampleTime,artifact_digest:'a'.repeat(64),artifact_bytes:52428800,
    signing_key_id:uuid(202),imported_at:sampleTime,imported_by:uuid(204),dependency_count:1,migration_count:1,
    irreversible_migrations:['0024_support_bundles'],provenance:releaseClaims.provenance};
  // Every check must be named once, which eight copies of the first enum value
  // cannot do, and rollback must agree with the recovery mode.
  if(name==='UpdateEligibility')return {release_id:uuid(201),release_version:'0.1.0',installed_version:'0.0.0',evaluated_at:sampleTime,eligible:true,
    checks:[{check:'TRUSTED_ORIGIN' as const,satisfied:true,reason:'Signed by the configured release key.'},
      {check:'SIGNATURE_VALID' as const,satisfied:true,reason:'The signature verifies over the exact claims.'},
      {check:'AUDIENCE_MATCH' as const,satisfied:true,reason:'Issued for a customer installation.'},
      {check:'PROFILE_SUPPORTED' as const,satisfied:true,reason:'This deployment profile is named as supported.'},
      {check:'UPGRADE_PATH_SUPPORTED' as const,satisfied:true,reason:'The installed version is at or above the declared minimum.'},
      {check:'ARCHIVE_ENTRIES_SAFE' as const,satisfied:true,reason:'Every archive path is relative and contained.'},
      {check:'NO_PROHIBITED_CHANGE' as const,satisfied:true,reason:'No egress, model runtime or excluded capability is introduced.'},
      {check:'NO_UNSAFE_DOWNGRADE' as const,satisfied:true,reason:'The release is newer than the installed version.'}],
    recovery_mode:'FORWARD_RECOVERY_ONLY' as const,rollback_available:false,eligibility_is_not_permission_to_execute:true,
    limits:['An irreversible migration is declared, so recovery is forward only and rollback is not offered.','Being eligible is not permission to apply. Applying is a separate approval.']};
  // Eight categories, each exactly once. The example shows both of the things
  // the schema exists to keep apart: a category with a path and recorded events,
  // and a category with no path in this build at all.
  if(name==='AuditCoverage')return {as_of:sampleTime,derived_from_recorded_events:true,
    entries:AuditCategory.options.map(category=>category==='OWNER_CHANGES'
      ? {category,operations:[],recorded:0,first_seen_at:null,last_seen_at:null,has_a_path:false,
        note:'This build has no ownership-transfer route at all, so there is nothing to audit rather than something unaudited.'}
      : {category,operations:[`${category.toLowerCase()}.example`],recorded:3,first_seen_at:sampleTime,last_seen_at:sampleTime,has_a_path:true,
        note:'Recorded from the trail rather than declared by configuration.'}),
    limits:['Every count here was measured from the recorded trail.','Reading this page is itself an audited event.']};
  // The carried events and the matched count are the same number, because an
  // export that carried fewer than it matched would not be produced at all.
  if(name==='AuditExport'){const events=[example('AuditEvent')];
    return {exported_at:sampleTime,filter:{operation:'evidence.export'},events,matched:events.length,complete:true,
      digest:digest(events),
      limits:['This artifact carries every event the stated filter matched.','Producing this export is itself an audited event.']};}
  // Eleven gates, each exactly once, and the two lists derived from them. The
  // example keeps the backup gate unverifiable because that is the fact the
  // shape exists to carry: a preflight that passes everything is
  // indistinguishable from one that checked nothing.
  if(name==='PreflightReport'){
    const gate=(kind:string,verdict:'PASSED'|'FAILED'|'NOT_VERIFIABLE_HERE',checked:string,observed:string|null,unverifiable_reason:string|null,remedy:string|null)=>
      ({kind,verdict,checked,observed,unverifiable_reason,remedy});
    const gates=[
      gate('RUNTIME_LOCATION','PASSED','The address this application is actually serving on.','Serving on 127.0.0.1:4310.',null,null),
      gate('RUNTIME_AND_ARCHITECTURE','PASSED','The Node major version, platform and architecture this process is executing on.','Node 24.21.0 on linux/x64.',null,null),
      gate('TRANSPORT_SECURITY','PASSED','The scheme this application serves on, and whether it can be reached from off the host.','Serving HTTP on loopback, so no request crosses a network.',null,null),
      gate('DURABLE_STORAGE','PASSED','Whether the database is configured to survive a power loss.','fsync=on, synchronous_commit=on.',null,null),
      gate('CUSTOMER_CONTROLLED_IDENTITY','PASSED','Whether an active primary owner exists in the local identity store.','1 active primary owner, held locally.',null,null),
      gate('SIGNING_KEYS','PASSED','Whether the public key identifiers needed to verify trusted input are configured.','Configured: ORVIA_RELEASE_KEY_ID.',null,null),
      gate('BACKUP_TARGET','NOT_VERIFIABLE_HERE','Whether a backup exists, is reachable, and has been restored from successfully.',null,
        'This build has no backup subsystem, so nothing here could observe a backup target. It must be verified outside this product.',null),
      gate('PERMITTED_EGRESS','PASSED','That no guided connection records an endpoint outside loopback, and that this build declares no vendor egress.','0 endpoints outside loopback.',null,null),
      gate('VENDOR_TELEMETRY_DISABLED','PASSED','The telemetry switches of every third-party component, read from the running environment.','Disabled: NEXT_TELEMETRY_DISABLED, DO_NOT_TRACK, BETTER_AUTH_TELEMETRY.',null,null),
      gate('LICENCE_VALIDITY','PASSED','Whether a signed licence is within its validity window.','CONTROL licence valid until 2027-09-16T10:00:00.000Z.',null,null),
      gate('PACKAGE_SIGNATURE','FAILED','Whether the installed version has a signed release manifest verified at import.','No installed version is recorded.',null,
        'Record the installed version through the update path so the package behind it can be named and its signature checked.'),
    ];
    return {as_of:sampleTime,profile:'CUSTOMER_LOCAL_SYNTHETIC' as const,gates,
      failing:['PACKAGE_SIGNATURE'],not_verifiable:['BACKUP_TARGET'],
      an_unverified_gate_is_not_a_passed_gate:true,
      passing_every_gate_is_not_a_statement_about_the_law:true,
      limits:['A gate this build cannot check reports that it could not, with the reason, and is not counted as passed.',
        'These are eleven technical checks against this installation. Passing them is not a statement that any legal obligation has been met.']};
  }
  // The case FR-M12-04 exists for: a principal who asked for Tamil, an
  // installation that has only published English and Hindi, and a response that
  // says so instead of presenting English as though the request had been met.
  if(name==='NoticeAvailability')return {purpose_id:uuid(810),requested_language:'ta' as const,served_language:'en' as const,
    available_in_requested_language:false,published_languages:['en' as const,'hi' as const],
    limits:['The language a principal chose and the language they were shown are separate facts.',
      'This product does not translate. A notice in a language is one somebody authored in that language.']};
  // A reference to where the customer keeps the secret. The generic sampler's
  // filler contains a space, which the reference pattern refuses -- and should,
  // because the pattern is what stops a pasted secret fitting in this field.
  if(name==='ScopedIdentityRecord')return {secret_reference:'vault://synthetic/crm-reader'};
  // Nine steps, each exactly once and in order, with the current step being the
  // first that is not done. The example stops at step 6 on purpose: a finished
  // example would hide the field the schema exists for, which is what a step
  // that is not done says is still outstanding.
  if(name==='GuidedConnection'){
    const answered=[
      ['SELECT_SYSTEM','The connection names a configured system and is marked test.'],
      ['CHOOSE_CAPABILITIES','DISCOVER, READ requested. Neither is a right to update or delete.'],
      ['CONFIGURE_CONNECTIVITY','Endpoint crm.internal:5432 recorded, with its certificate verified.'],
      ['SCOPED_IDENTITY','A reference to a customer-held secret is recorded.'],
      ['TEST_PERMISSIONS','A recorded capability check observed read allowed and restrict denied.'],
    ] as const;
    const pending: Record<string,string[]>={
      SELECT_RESOURCES:['Approve the specific assets in scope. Discovering an asset does not approve it.'],
      REVIEW_MAPPINGS:['Map the source references, identities and purposes this connection will act on.'],
      PREVIEW_AND_TEST:['Run a decision preview so the planned effect is examined before anything is enabled.'],
      ENABLE_PROGRESSIVELY:['Move to coordination, and then to approved enforcement, as a separate decision under its own authority.'],
    };
    return {id:uuid(730),system_id:uuid(731),environment_kind:'TEST' as const,
      requested_capabilities:['DISCOVER' as const,'READ' as const],
      endpoint_reference:'crm.internal:5432',tls_verified:true,secret_reference:'vault://synthetic/crm-reader',
      steps:ConnectionStep.options.map((step,index)=>{
        const hit=answered.find(([name])=>name===step);
        return hit
          ? {step,position:index+1,done:true,measured_from:hit[1],outstanding:[]}
          : {step,position:index+1,done:false,measured_from:'Nothing has been recorded for this step yet.',outstanding:pending[step]!};
      }),
      current_step:'SELECT_RESOURCES' as const,enablement_stage:'OBSERVE' as const,
      connection_is_not_permission_to_mutate:true,observed_read:true,observed_restrict:false,
      started_at:sampleTime,
      limits:['A completed connection is not permission to change anything in the connected system.',
        'This product never holds the connection secret, only a reference to where the customer keeps it.']};
  }
  // Three kinds and seven signals, each exactly once, which repeated copies of
  // the first enum value cannot satisfy. The example also has to show the thing
  // the schema exists for: two signals that were not measured, and a business
  // readiness verdict that differs from the other two.
  if(name==='OperationalReadiness')return {as_of:sampleTime,profile:'CUSTOMER_LOCAL_SYNTHETIC' as const,
    facts:[
      {kind:'LIVENESS' as const,verdict:'READY' as const,covers:'This process is running and answered this request. It says nothing about any dependency.',blocking:[]},
      {kind:'DEPENDENCY_READINESS' as const,verdict:'READY' as const,covers:'PostgreSQL answered a scoped query and the policy engine authorised this request.',blocking:[]},
      {kind:'BUSINESS_READINESS' as const,verdict:'NOT_READY' as const,covers:'Whether a privacy decision could be carried through to a system that can act on it.',
        blocking:['No configured system has been checked and found able to restrict, so a decision could be recorded and never carried out.']}],
    signals:[
      {signal:'PROPAGATION_LAG' as const,measured:true,value:4,unit:'SECONDS' as const,counted:'The longest delay between accepting an event and dispatching it, across 12 dispatched events.',unavailable_reason:null},
      {signal:'OLDEST_UNRESOLVED_WORK' as const,measured:true,value:1820,unit:'SECONDS' as const,counted:'The age of the oldest workflow that has not reached a terminal state, across 2 unresolved workflows.',unavailable_reason:null},
      {signal:'OBSERVATION_FRESHNESS' as const,measured:true,value:900,unit:'SECONDS' as const,counted:'The age of the most recent connector capability check, across 3 recorded checks.',unavailable_reason:null},
      {signal:'QUEUE_DEPTH' as const,measured:true,value:0,unit:'RECORDS' as const,counted:'Accepted events that have not been dispatched. This is a depth, not a rate.',unavailable_reason:null},
      {signal:'CONNECTOR_LIMIT_HEADROOM' as const,measured:false,value:null,unit:null,counted:'Remaining headroom against a connector load budget.',
        unavailable_reason:'No connector load budget has been measured for this deployment, so there is nothing to report headroom against.'},
      {signal:'STORAGE_FOOTPRINT' as const,measured:true,value:36476595,unit:'BYTES' as const,counted:'Total size of this installation database, including indexes and every environment it holds.',unavailable_reason:null},
      {signal:'BACKUP_STATUS' as const,measured:false,value:null,unit:null,counted:'Age and outcome of the most recent verified backup.',
        unavailable_reason:'This build has no backup or restore capability, so there is no backup whose status could be reported.'}],
    combined_status_is_not_reported:true,uptime_is_not_evidence_of_correct_operation:true,
    limits:['These are three separate verdicts and they are not combined. A live process with reachable dependencies can still carry out no decision at all.',
      'Two of the seven signals were not measured. An unmeasured signal is not a signal at zero.']};
  if(name==='GapClosure')return {state:'RESOLVED' as const,note:'Observation restored and confirmed against the copy.',evidence_reference:'Observation record SYN-OBS-0001.'};
  if(name==='Gap')return {id:uuid(70),source:'NEVER_OBSERVED' as const,subject_kind:'DATA_ASSET' as const,subject_id:uuid(71),detected_at:sampleTime,last_seen_at:sampleTime,state:'OPEN' as const,severity:'MEDIUM' as const,owner_reference:null,due_at:null,evidence_reference:null,resolution_note:null,description:'This copy has never been independently observed.'};
  if(name==='SystemOutcomeRecord')return {system_id:uuid(50),result:'SUCCEEDED',method:'CONNECTOR_OPERATION',evidence_reference:'Synthetic connector receipt.',note:'Restriction applied to the exact synthetic subject.'};
  if(name==='SystemOutcome')return {system_id:uuid(50),result:'SUCCEEDED',method:'CONNECTOR_OPERATION',evidence_reference:'Synthetic connector receipt.',note:'Restriction applied to the exact synthetic subject.',recorded_at:sampleTime,recorded_by:uuid(51)};
  if(name==='SignedCommand')return signatureVector.command;
  if(name==='Receipt')return exampleReceipt;
  if(name==='ReceiptView')return receiptReplayExample.current_get;
  if(name==='SendResult')return {attempt_id:uuid(30),decision:'BLOCK',send_record_id:null,admitted_at:null,evaluated_epoch:2,reason_codes:['CONSENT_WITHDRAWN']};
  const result=sample(z.toJSONSchema(schemas[name],{target:'draft-2020-12'}) as JsonSchema);
  return schemas[name].parse(result);
}
