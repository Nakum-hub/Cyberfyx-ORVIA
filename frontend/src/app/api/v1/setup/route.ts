import { setupCompleteRoute, setupStateRoute } from '@orvia/backend';

export const dynamic = 'force-dynamic';
export const GET = (request: Request) => setupStateRoute(request);
export const POST = (request: Request) => setupCompleteRoute(request);
