import { createHash, sign, verify, type KeyObject } from 'node:crypto';
import { z } from 'zod';
import { CommandPayload, CommandScope, PlanBinding, Approval, SignedCommand } from './index.ts';

/** ORVIA-CJSON-1: UTF-8 JSON, sorted UTF-16 object keys, ordered arrays, finite safe integers. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'string') {
    if (!value.isWellFormed()) throw new Error('Ill-formed Unicode is not canonical');
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || Object.is(value, -0)) throw new Error('Canonical number must be a safe integer');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${Array.from(value,item=>canonicalJson(item)).join(',')}]`;
  if (typeof value === 'object' && value && Object.getPrototypeOf(value) === Object.prototype) {
    const record = value as Record<string,unknown>;
    return `{${Object.keys(record).sort().map(key=>`${canonicalJson(key)}:${canonicalJson(record[key])}`).join(',')}}`;
  }
  throw new Error('Unsupported canonical value');
}
export const digest = (value: unknown) => createHash('sha256').update(canonicalJson(value),'utf8').digest('hex');
export function validateBindings(value: unknown) {
  const payload=CommandPayload.parse(value);
  if (payload.scope_digest !== digest(CommandScope.parse(payload.binding.scope))) throw new Error('Scope digest mismatch');
  if (payload.plan_digest !== digest(PlanBinding.parse(payload.binding))) throw new Error('Plan digest mismatch');
  if (payload.approval_digest !== digest(Approval.parse(payload.approval))) throw new Error('Approval digest mismatch');
  return payload;
}
export function signCommand(value: z.infer<typeof CommandPayload>, key: KeyObject) {
  if(key.asymmetricKeyType!=='ed25519')throw new Error('Ed25519 key required');
  const payload=validateBindings(value);
  return SignedCommand.parse({algorithm:'Ed25519',payload,signature:sign(null,Buffer.from(canonicalJson(payload)),key).toString('base64url')});
}
export function verifyCommand(value: unknown, key: KeyObject, expected: {installation_id:string;tenant_id:string;legal_entity_id:string;environment_id:string;signing_key_id:string;now:Date}) {
  if(key.asymmetricKeyType!=='ed25519'||!Number.isFinite(expected.now.getTime()))throw new Error('Invalid trust key or current time');
  const command=SignedCommand.parse(value);
  const p=validateBindings(command.payload);
  if (p.installation_id!==expected.installation_id || p.binding.scope.tenant_id!==expected.tenant_id || p.binding.scope.legal_entity_id!==expected.legal_entity_id || p.binding.scope.environment_id!==expected.environment_id || p.signing_key_id!==expected.signing_key_id) throw new Error('Command trust/scope mismatch');
  if (Date.parse(p.issued_at)>expected.now.getTime() || Date.parse(p.expires_at)<=expected.now.getTime()) throw new Error('Command outside validity window');
  if (!verify(null,Buffer.from(canonicalJson(p)),key,Buffer.from(command.signature,'base64url'))) throw new Error('Invalid signature');
  return p;
}
