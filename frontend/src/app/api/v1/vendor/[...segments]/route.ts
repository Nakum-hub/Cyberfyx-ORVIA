import { vendorRoute, onlyOn } from '@orvia/backend';
export const dynamic = 'force-dynamic';
// The vendor's own VENDOR_SERVICE installation only (revision 1.5 addendum); a 404 on every customer installation.
export const GET = onlyOn('VENDOR_SERVICE', vendorRoute);
export const POST = GET;
