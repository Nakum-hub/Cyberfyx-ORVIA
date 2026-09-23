import { authHandler } from '../../auth/src/server.ts';
import { runtime } from './runtime.ts';
import { safeRoute } from './http.ts';

export const staffAuthRoute = (request: Request) => safeRoute(async requestId => { const r = runtime(); return authHandler(r.staff, r.config, request, requestId); }, 'AUTH_STAFF');
export const principalAuthRoute = (request: Request) => safeRoute(async requestId => { const r = runtime(); return authHandler(r.principal, r.config, request, requestId); }, 'AUTH_PRINCIPAL');
