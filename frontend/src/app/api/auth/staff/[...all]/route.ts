import { staffAuthRoute, onlyOn } from '@orvia/backend';
export const dynamic = 'force-dynamic';
export const GET = onlyOn('CUSTOMER_INSTALLATION', staffAuthRoute);
export const POST = GET;
