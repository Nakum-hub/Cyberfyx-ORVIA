import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { authErrorChain, failedAuthResponse, logAuthDependencyFailure } from '../../backend/auth/src/errors.ts';
import { authHandler, type AuthInstance } from '../../backend/auth/src/server.ts';
import type { RuntimeConfig } from '../../backend/auth/src/config.ts';
import { safeError } from '../../shared/testing/src/evidence.ts';
const { DrizzleQueryError } = createRequire(new URL('../../backend/auth/package.json', import.meta.url))('drizzle-orm');
const requestId='00000000-0000-4000-8000-000000000001';
const secret='SYNTHETIC_SECRET_SENTINEL';
function wrapped() { return new DrizzleQueryError(`SELECT ${secret}`, [secret], Object.assign(new Error(secret), {name:'error',code:'57014'})); }
function capture(work:()=>unknown) {
  const saved=console.error; const lines:string[]=[];
  console.error=(value:unknown)=>{lines.push(String(value));};
  try {work();} finally {console.error=saved;}
  return lines;
}
test('actual Drizzle wrapper logging preserves SQLSTATE cause without SQL, params or secrets',()=>{
  const error=wrapped();
  const lines=capture(()=>{
    // Directly use the retained old safeRoute observation for BEFORE: it emits
    // only safeError(error), which cannot expose the actual driver's cause.
    if(process.env.R8_AUTH_DIAGNOSTICS_BEFORE==='1')console.error(JSON.stringify({request_id:requestId,operation:'AUTH_STAFF',...safeError(error)}));
    else logAuthDependencyFailure(error,{request_id:requestId,domain:'staff',stage:'AUTH_LIBRARY_HANDLER'});
  });
  assert.equal(lines.length,1); assert.equal(lines[0]!.includes(secret),false);
  const record=JSON.parse(lines[0]!);
  assert.deepEqual(record.causes,[{name:'Error',code:'UNCLASSIFIED'},{name:'error',code:'57014'}]);
  assert.equal(JSON.stringify(record).includes('SELECT'),false);
});
test('cause traversal is bounded, rejects unknown names/codes and never invokes a cause getter',()=>{
  const errors=Array.from({length:10},()=>Object.assign(new Error(secret),{name:secret,code:secret}));
  for(let n=0;n<9;n++)Object.defineProperty(errors[n],'cause',{value:errors[n+1]});
  assert.equal(authErrorChain(errors[0]).length,5);
  assert.equal(JSON.stringify(authErrorChain(errors[0])).includes(secret),false);
  const cyclic=new Error(secret);Object.defineProperty(cyclic,'cause',{value:cyclic});assert.equal(authErrorChain(cyclic).length,1);
  let read=false;const accessor=new Error(secret);Object.defineProperty(accessor,'cause',{get(){read=true;throw new Error(secret);}});
  assert.equal(authErrorChain(accessor).length,1);assert.equal(read,false);
});
test('failed login retains only HTTP status/public code/request UUID in safe evidence',async()=>{
  const failure=await failedAuthResponse(Response.json({error:{code:'SERVICE_UNAVAILABLE',message:secret},request_id:requestId,token:secret},{status:503}));
  assert.deepEqual(safeError(failure),{name:'AuthLoginFailure',code:'AUTH_LOGIN_FAILED',http_status:503,response_code:'SERVICE_UNAVAILABLE',request_id:requestId});
  assert.equal(JSON.stringify(safeError(failure)).includes(secret),false);
  const hostile=await failedAuthResponse(Response.json({code:secret,message:secret,request_id:secret},{status:401,headers:{'X-Request-Id':secret}}));
  assert.deepEqual(safeError(hostile),{name:'AuthLoginFailure',code:'AUTH_LOGIN_FAILED',http_status:401,response_code:'UNKNOWN'});
});
test('actual auth handler rethrows original dependency failures and labels library versus audit stages',async()=>{
  const config={origin:'http://127.0.0.1:4310'} as RuntimeConfig;
  for(const target of ['AUTH_LIBRARY_HANDLER','AUTH_AUDIT_INSERT'] as const) {
    const error=wrapped();const lines:string[]=[];let queries=0;
    const instance={domain:'staff',auth:{handler:async()=>{if(target==='AUTH_LIBRARY_HANDLER')throw error;return Response.json({});}},
      pool:{query:async()=>{queries++;throw error;}}} as unknown as AuthInstance;
    const request=new Request(config.origin+'/api/auth/staff/sign-in/email',{method:'POST',headers:{host:'127.0.0.1:4310',origin:config.origin,'content-type':'application/json'},body:JSON.stringify({email:'synthetic@example.test',password:secret})});
    const saved=console.error;console.error=(value:unknown)=>{lines.push(String(value));};
    try {await assert.rejects(authHandler(instance,config,request,requestId),cause=>cause===error);} finally {console.error=saved;}
    assert.equal(queries,target==='AUTH_AUDIT_INSERT'?1:0);assert.equal(lines.length,1);
    const record=JSON.parse(lines[0]!);assert.equal(record.stage,target);assert.equal(record.request_id,requestId);
    assert.equal(record.response_status,target==='AUTH_AUDIT_INSERT'?200:undefined);
    assert.equal(lines[0]!.includes(secret),false);assert.equal(lines[0]!.includes('synthetic@example.test'),false);
  }
});
