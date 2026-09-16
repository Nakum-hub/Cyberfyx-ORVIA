import pg from 'pg';
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';
import { Id, Scope, Time } from '../../contracts/src/index.ts';
import type { RuntimeConfig } from './config.ts';
import type { Authority } from '../../db/src/runtime.ts';
import { AccessError } from '../../authz/src/index.ts';

export const MachineIdentity=z.strictObject({id:Id,kind:z.enum(['AGENT','WORKER','SENDER']),scope:Scope,installation_id:Id,expires_at:Time});
export type MachineIdentity=z.infer<typeof MachineIdentity>;
export const serviceRoles=['orvia_worker','orvia_agent_control','orvia_machine_auth','orvia_target_agent','orvia_target_observer','orvia_sender'] as const;
export type ServiceRole=typeof serviceRoles[number];
const owners: Record<ServiceRole,string>={orvia_worker:'worker',orvia_agent_control:'agent',orvia_machine_auth:'machine-auth',orvia_target_agent:'agent',orvia_target_observer:'observer',orvia_sender:'sender'};
export function servicePool(config: RuntimeConfig, role: ServiceRole) {
  const password=readFileSync(resolve(config.directory,owners[role],role+'-password'),'utf8').trim();
  if(!/^[a-f0-9]{64}$/.test(password))throw new Error('Invalid service credential');
  return new pg.Pool({host:'127.0.0.1',port:config.postgres_port,database:role.startsWith('orvia_target_')?config.database+'_targets':config.database,user:role,password,max:2,connectionTimeoutMillis:5000,query_timeout:10000,application_name:role});
}
export function machineAuthority(identity: MachineIdentity): Authority {
  const {id,kind,scope,installation_id,expires_at}=identity;
  const parsed=MachineIdentity.parse({id,kind,scope,installation_id,expires_at});
  return {actor_domain:'MACHINE',actor_id:parsed.id,scope:parsed.scope,role:parsed.kind,expires_at:parsed.expires_at,capabilities:parsed.kind==='WORKER'?['workflow.execute']:parsed.kind==='AGENT'?['target.execute']:['send.admit']};
}
export async function machineFor(request: Request, pool: pg.Pool, config: RuntimeConfig, kind: MachineIdentity['kind']) {
  if(request.headers.has('cookie'))throw new AccessError(401,'UNAUTHENTICATED');
  const token=request.headers.get('authorization')?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if(!token)throw new AccessError(401,'UNAUTHENTICATED');
  const hash=createHash('sha256').update(token).digest('hex');
  const result=await pool.query('SELECT * FROM machine_auth.identities WHERE token_digest=$1 AND active AND expires_at>now() AND kind=$2 AND installation_id=$3',[hash,kind,config.installation_id]);
  const row=result.rows[0];
  if(result.rowCount!==1||!timingSafeEqual(Buffer.from(hash),Buffer.from(row.token_digest)))throw new AccessError(401,'UNAUTHENTICATED');
  return MachineIdentity.parse({id:row.id,kind:row.kind,installation_id:row.installation_id,expires_at:row.expires_at.toISOString(),scope:{tenant_id:row.tenant_id,legal_entity_id:row.legal_entity_id,environment_id:row.environment_id}});
}
