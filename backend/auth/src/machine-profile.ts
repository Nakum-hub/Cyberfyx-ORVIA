import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Id } from '../../../shared/contracts/src/index.ts';
import { MachineIdentity } from './machine.ts';
import type { RuntimeConfig } from './config.ts';
const System=z.strictObject({id:Id,connector:z.enum(['SYNTHETIC_CRM','ORVIA_REST_SIMULATOR','LEGACY_MANUAL'])});
export const WorkerEnrollment=z.strictObject({installation_id:Id,signing_key_id:Id,identities:z.array(MachineIdentity.extend({agent_id:Id})).min(1)});
export const AgentEnrollment=z.strictObject({installation_id:Id,signing_key_id:Id,public_key:z.string().min(30).max(2000),identities:z.array(MachineIdentity.extend({token:z.string().regex(/^[a-f0-9]{64}$/),systems:z.array(System)})).min(1)});
export const SenderEnrollment=z.strictObject({installation_id:Id,identities:z.array(MachineIdentity.extend({token:z.string().regex(/^[a-f0-9]{64}$/)})).min(1)});
export type SenderEnrollmentConfig=z.infer<typeof SenderEnrollment>;
export type AgentEnrollmentConfig=z.infer<typeof AgentEnrollment>;
export type WorkerEnrollmentConfig=z.infer<typeof WorkerEnrollment>;
export function workerEnrollment(config: RuntimeConfig) {
  const value=WorkerEnrollment.parse(JSON.parse(readFileSync(resolve(config.directory,'worker/enrollment.json'),'utf8')));
  if(value.installation_id!==config.installation_id)throw new Error('Worker installation mismatch');return value;
}
export function agentEnrollment(config: RuntimeConfig) {
  const value=AgentEnrollment.parse(JSON.parse(readFileSync(resolve(config.directory,'agent/enrollment.json'),'utf8')));
  if(value.installation_id!==config.installation_id)throw new Error('Agent installation mismatch');return value;
}
export function senderEnrollment(config: RuntimeConfig) {
  const value=SenderEnrollment.parse(JSON.parse(readFileSync(resolve(config.directory,'sender/enrollment.json'),'utf8')));
  if(value.installation_id!==config.installation_id)throw new Error('Sender installation mismatch');return value;
}
export function observerEnrollment(config: RuntimeConfig) {
 const value=AgentEnrollment.parse(JSON.parse(readFileSync(resolve(config.directory,'observer/enrollment.json'),'utf8')));
 if(value.installation_id!==config.installation_id)throw new Error('Observer installation mismatch');return value;
}
