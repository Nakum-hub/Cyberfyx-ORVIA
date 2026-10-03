import test from 'node:test';import assert from 'node:assert/strict';
import { ApiError } from '../../shared/contracts/src/client.ts';
import { readAfterDelay } from '../../frontend/src/components/shared/read-retry.ts';
const unavailable=()=>new ApiError(503,{error:{code:'SERVICE_UNAVAILABLE',message:'Synthetic delayed-read fixture',retry:'AFTER_DELAY'},request_id:'00000000-0000-4000-8000-000000000001'});
// Preserved pre-fix DPDPA reader; exact same assertions expose its cancellation defect.
async function before<T>(work:()=>Promise<T>,signal?:AbortSignal):Promise<T>{void signal;try{return await work();}catch(e){if(!(e instanceof ApiError)||e.envelope.error.retry!=='AFTER_DELAY')throw e;await new Promise(r=>setTimeout(r,1500));return work();}}
const read=process.env.R8_READ_RETRY_BEFORE==='1'?before:readAfterDelay;
test('cancel during the retry delay does not make a second call',async()=>{
 const controller=new AbortController();let calls=0;
 const pending=read(async()=>{calls++;if(calls===1){queueMicrotask(()=>controller.abort());throw unavailable();}return 'late success';},controller.signal);
 await assert.rejects(pending,{name:'AbortError'});assert.equal(calls,1);
});
test('an already canceled screen dispatches no read',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 await assert.rejects(read(async()=>{calls++;return 'late';},controller.signal),{name:'AbortError'});assert.equal(calls,0);
});
test('a genuine temporary read failure still retries once after the existing delay',async()=>{
 let calls=0;assert.equal(await read(async()=>{if(++calls===1)throw unavailable();return 'ready';}),'ready');assert.equal(calls,2);
 const denial=new ApiError(403,{error:{code:'FORBIDDEN',message:'Synthetic denial fixture',retry:'NEVER'},request_id:'00000000-0000-4000-8000-000000000001'});
 let denied=0;await assert.rejects(read(async()=>{denied++;throw denial;}),e=>e===denial);assert.equal(denied,1);
});
