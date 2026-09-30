import { ownerRecoveryRoute, onlyOn } from '@orvia/backend';

export const dynamic = 'force-dynamic';
export const POST = onlyOn('CUSTOMER_INSTALLATION', (request: Request) => ownerRecoveryRoute(request));
