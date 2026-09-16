import type pg from 'pg';
import { randomUUID } from 'node:crypto';
import type { Authority } from '../../db/src/runtime.ts';
import { AccessError } from '../../authz/src/index.ts';
import { digest } from '../../contracts/src/crypto.ts';

export type Context = { tx: pg.PoolClient; actor: Authority; requestId: string };
export const predicate = 'tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3';
export const scopeValues = (actor: Authority) => [actor.scope.tenant_id,actor.scope.legal_entity_id,actor.scope.environment_id];
export async function audit(c: Context, operation: string, resource?: string) {
  await c.tx.query(`INSERT INTO app.audit_events(id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[randomUUID(),...scopeValues(c.actor),c.actor.actor_id,c.actor.actor_domain,operation,resource??null,c.requestId]);
}
export async function idempotent<T>(c: Context, operation: string, key: string, input: unknown, work: () => Promise<T>): Promise<T> {
  const scope=[...scopeValues(c.actor),c.actor.actor_id,operation,key];
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify(scope)]);
  const hash=digest(input);
  const existing=await c.tx.query(`SELECT digest,response FROM app.idempotency_records WHERE ${predicate} AND actor_id=$4 AND operation=$5 AND key=$6`,scope);
  if(existing.rowCount) {
    if(existing.rows[0].digest!==hash)throw new AccessError(409,'IDEMPOTENCY_CONFLICT');
    await audit(c,operation+'.replayed');
    return existing.rows[0].response as T;
  }
  const result=await work();
  await c.tx.query('INSERT INTO app.idempotency_records(tenant_id,legal_entity_id,environment_id,actor_id,operation,key,digest,response) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[...scope,hash,JSON.stringify(result)]);
  return result;
}
export function requireOne<T>(rows: T[]): T { if(rows.length!==1)throw new AccessError(404,'NOT_FOUND');return rows[0]!; }
export function selectorScope(c: Context, value: {legal_entity_id: string;environment_id: string}) {
  if(value.legal_entity_id!==c.actor.scope.legal_entity_id||value.environment_id!==c.actor.scope.environment_id)throw new AccessError(404,'NOT_FOUND');
}
export type Page = { limit: number; cursor: string | null };
export function paged<T extends {id: string}>(rows: T[], page: Page) {
  const items=rows.slice(0,page.limit);return {items,next_cursor:rows.length>page.limit?Buffer.from(items.at(-1)!.id).toString('base64url'):null};
}
