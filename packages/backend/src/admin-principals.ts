import { randomUUID, createHash } from 'node:crypto';
import { PrincipalCreate, Principal, Pagination, Id, schemas } from '../../contracts/src/index.ts';
import { authorityFor, requireCapability, AccessError } from '../../authz/src/index.ts';
import { scopedTransaction } from '../../db/src/runtime.ts';
import { limitedBody } from '../../auth/src/server.ts';
import { runtime } from './runtime.ts';
import { safeRoute } from './http.ts';

export const listPrincipals = (request: Request) => safeRoute(async requestId => {
  const r = runtime(); const actor = await authorityFor(request, r.staff, r.principal);
  await requireCapability(r.config, actor, 'STAFF', 'principals.read');
  const params = new URL(request.url).searchParams;
  if ([...params.keys()].some(key => !['cursor','limit'].includes(key))) throw new AccessError(400,'VALIDATION_ERROR');
  const parsed = Pagination.safeParse({ ...(params.has('limit') ? { limit: Number(params.get('limit')) } : {}), ...(params.has('cursor') ? { cursor: params.get('cursor') } : {}) });
  if (!parsed.success) throw new AccessError(400,'VALIDATION_ERROR');
  const cursor = parsed.data.cursor ? Buffer.from(parsed.data.cursor,'base64url').toString('utf8') : null;
  if (cursor && !Id.safeParse(cursor).success) throw new AccessError(400,'VALIDATION_ERROR');
  const rows = await scopedTransaction(r.pool,actor,async tx => {
    await tx.query(`INSERT INTO app.audit_events (id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,request_id)
      VALUES ($1,$2,$3,$4,$5,'STAFF','principals.list',$6)`,[randomUUID(),actor.scope.tenant_id,actor.scope.legal_entity_id,actor.scope.environment_id,actor.actor_id,requestId]);
    return tx.query(`SELECT id,legal_entity_id,environment_id,display_name,email,synthetic
    FROM app.principal_references WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND ($4::uuid IS NULL OR id>$4)
    ORDER BY id LIMIT $5`, [actor.scope.tenant_id,actor.scope.legal_entity_id,actor.scope.environment_id,cursor,parsed.data.limit+1]);
  });
  const items = rows.rows.slice(0,parsed.data.limit);
  return Response.json(schemas.PrincipalList.parse({ items, next_cursor: rows.rows.length>parsed.data.limit ? Buffer.from(items.at(-1).id).toString('base64url') : null }));
}, 'PRINCIPAL_LIST');

export const createPrincipal = (request: Request) => safeRoute(async requestId => {
  const r = runtime(); const actor = await authorityFor(request, r.staff, r.principal);
  await requireCapability(r.config,actor,'STAFF','principals.create');
  if (request.headers.get('origin') !== r.config.origin) throw new AccessError(403,'FORBIDDEN');
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new AccessError(400,'VALIDATION_ERROR');
  const key = request.headers.get('idempotency-key');
  if (!key || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) throw new AccessError(400,'VALIDATION_ERROR');
  const raw = await limitedBody(request,8192);
  let input: unknown; try { input = JSON.parse(raw ?? ''); } catch { throw new AccessError(400,'VALIDATION_ERROR'); }
  const parsed = PrincipalCreate.safeParse(input); if (!parsed.success) throw new AccessError(400,'VALIDATION_ERROR',parsed.error.issues.slice(0,32).map(issue=>({field:issue.path.join('.').slice(0,120),code:issue.code})));
  const value = { ...parsed.data, email: parsed.data.email.toLowerCase() };
  if (value.legal_entity_id !== actor.scope.legal_entity_id || value.environment_id !== actor.scope.environment_id) throw new AccessError(404,'NOT_FOUND');
  const digest = createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const result = await scopedTransaction(r.pool,actor,async tx => {
    const currentActor = await authorityFor(request,r.staff,r.principal);
    if (JSON.stringify(currentActor.scope) !== JSON.stringify(actor.scope) || currentActor.actor_id !== actor.actor_id ||
      !currentActor.capabilities.includes('principals.create')) throw new AccessError(403,'FORBIDDEN');
    const scope = [actor.scope.tenant_id,actor.scope.legal_entity_id,actor.scope.environment_id,actor.actor_id];
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([...scope,'principal.create',key])]);
    const old = await tx.query(`SELECT digest,response FROM app.idempotency_records WHERE tenant_id=$1 AND legal_entity_id=$2
      AND environment_id=$3 AND actor_id=$4 AND operation='principal.create' AND key=$5`, [...scope,key]);
    if (old.rowCount) { if (old.rows[0].digest !== digest) throw new AccessError(409,'IDEMPOTENCY_CONFLICT'); return Principal.parse(old.rows[0].response); }
    const principal = Principal.parse({ ...value, id: randomUUID(), synthetic: true });
    await tx.query('INSERT INTO app.principal_references VALUES ($1,$2,$3,$4,$5,$6,true)', [...scope.slice(0,3),principal.id,principal.display_name,principal.email]);
    await tx.query(`INSERT INTO app.idempotency_records (tenant_id,legal_entity_id,environment_id,actor_id,operation,key,digest,response)
      VALUES ($1,$2,$3,$4,'principal.create',$5,$6,$7)`, [...scope,key,digest,JSON.stringify(principal)]);
    await tx.query(`INSERT INTO app.audit_events (id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id)
      VALUES ($1,$2,$3,$4,$5,'STAFF','principal.create',$6,$7)`, [randomUUID(),...scope,principal.id,requestId]);
    return principal;
  }).catch((error: unknown) => {
    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') throw new AccessError(400,'VALIDATION_ERROR',[{field:'email',code:'ALREADY_EXISTS_IN_SCOPE'}]);
    throw error;
  });
  return Response.json(result,{ status: 201 });
}, 'PRINCIPAL_CREATE');
