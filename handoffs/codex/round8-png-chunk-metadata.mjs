import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const paths=readFileSync('handoffs/codex/artifacts/R8-final-review-beta-stage-input.txt','utf8').trim().split(/\r?\n/).filter(path=>path.endsWith('.png'));
const counts=new Map();
const unexpected=[];
for(const path of paths){
  const bytes=readFileSync(path);let offset=8;
  while(offset<bytes.length){
    assert.ok(offset+12<=bytes.length);
    const length=bytes.readUInt32BE(offset),kind=bytes.toString('ascii',offset+4,offset+8);
    assert.ok(offset+12+length<=bytes.length);
    counts.set(kind,(counts.get(kind)??0)+1);
    if(!['IHDR','IDAT','IEND','sRGB','gAMA','pHYs','cHRM','bKGD','PLTE','tRNS'].includes(kind)&&unexpected.length<8)unexpected.push({path,kind,length});
    offset+=12+length;
  }
}
console.log(JSON.stringify({diagnostic_only:true,png_count:paths.length,chunk_counts:Object.fromEntries(counts),unexpected,exit_code:0}));
