import { z } from 'zod';
import { CommandPayload, schemas, type SchemaName } from './index.ts';
import { digest } from './crypto.ts';
import signatureVector from '../fixtures/command-vector.json' with { type:'json' };
export const uuid = (n:number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12,'0')}`;
export const sampleTime='2026-09-16T10:00:00.000Z';
export const exampleBinding={workflow_id:uuid(10),action_id:uuid(11),scope:{tenant_id:uuid(1),legal_entity_id:uuid(2),environment_id:uuid(3),principal_reference_id:uuid(4),system_id:uuid(5),resource_id:uuid(6),target_subject_reference:'syn_asha_demo',purpose_id:uuid(7),policy_version_id:uuid(8),consent_epoch:2,target_generation:1,operation:'CRM_REMOVE_MARKETING_MEMBERSHIP' as const},capability:'restrict_exact_synthetic_subject' as const,capability_version:'1.0.0',operation_budget:{maximum_records:1 as const,maximum_attempts:3}};
const approval={result:'NOT_REQUIRED_BY_POLICY' as const,decision_id:uuid(12),policy_version_id:uuid(8),approved_plan_digest:digest(exampleBinding),rule_id:'SYNTHETIC_NON_DESTRUCTIVE_RESTRICTION' as const,decided_at:sampleTime};
export const examplePayload=CommandPayload.parse({schema_version:'0.2.0',command_id:uuid(13),installation_id:uuid(14),signing_key_id:uuid(15),binding:exampleBinding,scope_digest:digest(exampleBinding.scope),plan_digest:digest(exampleBinding),approval,approval_digest:digest(approval),issued_at:sampleTime,expires_at:'2026-09-16T10:04:00.000Z',nonce:'synthetic_example_nonce_000000000000000001'});
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
  return 'Synthetic example'.padEnd(schema.minLength??1,'x');
}
export function example(name:SchemaName):unknown {
  if(name==='CommandPayload')return examplePayload;
  if(name==='SignedCommand')return signatureVector.command;
  if(name==='Receipt')return exampleReceipt;
  if(name==='ReceiptView')return receiptReplayExample.current_get;
  if(name==='SendResult')return {attempt_id:uuid(30),decision:'BLOCK',send_record_id:null,admitted_at:null,evaluated_epoch:2,reason_codes:['CONSENT_WITHDRAWN']};
  const result=sample(z.toJSONSchema(schemas[name],{target:'draft-2020-12'}) as JsonSchema);
  return schemas[name].parse(result);
}
