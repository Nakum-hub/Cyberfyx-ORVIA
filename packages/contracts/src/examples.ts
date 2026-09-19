import { z } from 'zod';
import { COMMAND_SCHEMA_VERSION, CommandPayload, schemas, type SchemaName } from './index.ts';
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
