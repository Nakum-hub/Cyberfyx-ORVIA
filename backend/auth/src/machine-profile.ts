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

/**
 * A loader that picks up renewals. Identities are short-lived and are renewed
 * only by the protected local setup, which rewrites the enrollment file and the
 * identity rows. A long-running service holding the file it read at start would
 * refuse itself once the old expiry passed, even after a renewal. This re-reads
 * the file when any identity is within a minute of expiry, and fails loudly if
 * an identity is still expired after that. It grants nothing: the database still
 * checks every identity is active and unexpired on each transaction.
 */
export function renewingEnrollment<T extends { identities: { expires_at: string }[] }>(load: () => T, now: () => number = Date.now) {
  let current = load();
  return () => {
    if (current.identities.some(i => Date.parse(i.expires_at) <= now() + 60_000)) current = load();
    if (current.identities.some(i => Date.parse(i.expires_at) <= now()))
      throw Object.assign(new Error('Machine enrollment expired; renew through protected local setup'), { code: 'MACHINE_ENROLLMENT_EXPIRED' });
    return current;
  };
}
