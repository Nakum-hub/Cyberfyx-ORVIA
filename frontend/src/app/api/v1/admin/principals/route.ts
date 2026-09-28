import { listPrincipals, createPrincipal, onlyOn } from '@orvia/backend';
export const dynamic = 'force-dynamic';
export const GET = onlyOn('CUSTOMER_INSTALLATION', listPrincipals);
export const POST = onlyOn('CUSTOMER_INSTALLATION', createPrincipal);
