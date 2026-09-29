import { accountAuthRoute, onlyOn } from '@orvia/backend';
export const dynamic = 'force-dynamic';
export const GET = onlyOn('VENDOR_SERVICE', accountAuthRoute);
export const POST = GET;
