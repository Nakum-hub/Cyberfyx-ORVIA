import { setupCompleteRoute, setupStateRoute, onlyOn } from '@orvia/backend';

export const dynamic = 'force-dynamic';
export const GET = onlyOn('CUSTOMER_INSTALLATION', (request: Request) => setupStateRoute(request));
export const POST = onlyOn('CUSTOMER_INSTALLATION', (request: Request) => setupCompleteRoute(request));
