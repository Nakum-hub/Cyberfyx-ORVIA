import { principalAuthRoute, onlyOn } from '@orvia/backend';
export const dynamic = 'force-dynamic';
export const GET = onlyOn('CUSTOMER_INSTALLATION', principalAuthRoute);
export const POST = GET;
