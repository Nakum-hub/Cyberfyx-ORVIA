import { cmpSdkRoute, onlyOn } from '@orvia/backend';
export const dynamic='force-dynamic';
export const GET = onlyOn('CUSTOMER_INSTALLATION', async (request: Request, context: { params: Promise<{ siteKey: string }> }) => cmpSdkRoute(request, (await context.params).siteKey));
