import { businessRoute, cmpConsentRoute, machineRoute, supplierRoute } from '@orvia/backend';
export const dynamic='force-dynamic';
const route=(request: Request)=>{const path=new URL(request.url).pathname;return path.startsWith('/api/v1/machine/')?machineRoute(request):path.startsWith('/api/v1/supplier/')?supplierRoute(request):path.startsWith('/api/v1/cmp/')?cmpConsentRoute(request):businessRoute(request);};
export const GET=route;
export const POST=route;
// Website consent posts are cross-origin from approved customer sites, so their preflight is answered here.
export const OPTIONS=(request: Request)=>new URL(request.url).pathname.startsWith('/api/v1/cmp/')?cmpConsentRoute(request):new Response(null,{status:405});
