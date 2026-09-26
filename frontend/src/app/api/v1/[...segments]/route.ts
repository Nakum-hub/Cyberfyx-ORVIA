import { businessRoute, machineRoute, supplierRoute } from '@orvia/backend';
export const dynamic='force-dynamic';
const route=(request: Request)=>{const path=new URL(request.url).pathname;return path.startsWith('/api/v1/machine/')?machineRoute(request):path.startsWith('/api/v1/supplier/')?supplierRoute(request):businessRoute(request);};
export const GET=route;
export const POST=route;
