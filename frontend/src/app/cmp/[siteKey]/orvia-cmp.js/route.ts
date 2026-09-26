import { cmpSdkRoute } from '@orvia/backend';
export const dynamic='force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ siteKey: string }> }) { return cmpSdkRoute(request, (await context.params).siteKey); }
