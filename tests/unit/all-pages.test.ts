import test from 'node:test';import assert from 'node:assert/strict';
import { allPages } from '../../shared/testing/src/all-pages.ts';
const parse=(v:unknown)=>v as {items:string[];next_cursor:string|null};
test('test list reader preserves filters, replaces limit and encodes opaque cursors',async()=>{
 const paths:string[]=[];
 const result=await allPages(async path=>{paths.push(path);return Response.json(paths.length===1?{items:['first'],next_cursor:'cursor+/='}:{items:['own'],next_cursor:null});},'/api/v1/admin/example?state=OPEN&limit=25',parse);
 assert.deepEqual(result,['first','own']);
 for(const path of paths){const q=new URL(path,'http://synthetic.invalid').searchParams;assert.equal(q.get('state'),'OPEN');assert.deepEqual(q.getAll('limit'),['100']);}
 assert.equal(new URL(paths[1]!,'http://synthetic.invalid').searchParams.get('cursor'),'cursor+/=');
});
test('test list reader refuses later-page denial and repeating cursors',async()=>{
 let calls=0;await assert.rejects(allPages(async()=>++calls===1?Response.json({items:['partial'],next_cursor:'next'}):new Response(null,{status:403}),'/api/v1/admin/example',parse),/Unexpected 403/);
 await assert.rejects(allPages(async()=>Response.json({items:[],next_cursor:'same'}),'/api/v1/admin/example',parse),/Repeated cursor/);
});
