import { authorityFor } from '../../../../../../../packages/authz/src/index.ts';
import { scopedTransaction } from '../../../../../../../packages/db/src/runtime.ts';
import { randomUUID } from 'node:crypto';
import { runtime } from '../../../../server/runtime.ts';
import { safeRoute } from '../../../../server/http.ts';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => safeRoute(async requestId => {
  const r = runtime(); const actor = await authorityFor(request, r.staff, r.principal);
  await scopedTransaction(r.pool, actor, tx => tx.query(`INSERT INTO app.audit_events
    (id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,request_id) VALUES ($1,$2,$3,$4,$5,$6,'session.read',$7)`,
  [randomUUID(), actor.scope.tenant_id, actor.scope.legal_entity_id, actor.scope.environment_id, actor.actor_id, actor.actor_domain, requestId]));
  return Response.json(actor);
}, 'SESSION_READ');
