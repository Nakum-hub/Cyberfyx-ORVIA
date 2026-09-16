import { businessRoute } from '../../../../server/business.ts';
import { machineRoute } from '../../../../server/machine.ts';
export const dynamic='force-dynamic';
const route=(request: Request)=>new URL(request.url).pathname.startsWith('/api/v1/machine/')?machineRoute(request):businessRoute(request);
export const GET=route;
export const POST=route;
