import { vendorAuthRoute, onlyOn } from '@orvia/backend';
export const dynamic = 'force-dynamic';
export const GET = onlyOn('VENDOR_SERVICE', vendorAuthRoute);
export const POST = GET;
