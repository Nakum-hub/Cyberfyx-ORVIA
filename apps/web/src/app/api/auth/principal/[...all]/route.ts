import { authHandler } from '../../../../../../../../packages/auth/src/server.ts';
import { runtime } from '../../../../../server/runtime.ts';
import { safeRoute } from '../../../../../server/http.ts';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => safeRoute(async requestId => { const r = runtime(); return authHandler(r.principal, r.config, request, requestId); }, 'AUTH_PRINCIPAL');
export const POST = GET;
