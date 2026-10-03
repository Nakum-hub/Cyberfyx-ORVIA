// Bounded source-artifact metadata only. Never prints PNG/ICC payload or strings.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync,writeFileSync,realpathSync,lstatSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { resolve,relative,isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
assert.equal(realpathSync(process.cwd()),root);
const [label]=process.argv.slice(2);assert.equal(process.argv.length,3);assert.match(label??'',/^[a-z0-9-]{1,40}$/);
const manifest='handoffs/codex/artifacts/R8-final-review-beta-stage-input.txt';
function checked(path){assert.ok(!isAbsolute(path)&&!path.includes('..')&&!/[\x00-\x1f:]/.test(path));const abs=resolve(root,path);assert.ok(!relative(root,abs).startsWith('..'));assert.equal(realpathSync(abs),abs);assert.ok(lstatSync(abs).isFile());return abs;}
const paths=readFileSync(checked(manifest),'utf8').trim().split(/\r?\n/).filter(p=>p.endsWith('.png'));assert.ok(paths.length<=10000);
const hashes=new Map();const short=[];const counts={};
const sha=b=>createHash('sha256').update(b).digest('hex');
function icc(payload){
  const zero=payload.indexOf(0);assert.ok(zero>0&&zero<=79);assert.equal(payload[zero+1],0);
  const profile=inflateSync(payload.subarray(zero+2),{maxOutputLength:65536});
  assert.ok(profile.length>=132&&profile.length<=65536);assert.equal(profile.readUInt32BE(0),profile.length);assert.equal(profile.toString('ascii',36,40),'acsp');
  const allowed=(start,values)=>{const v=profile.toString('ascii',start,start+4);return values.includes(v)?v:'UNCLASSIFIED';};
  const result={decompressed_bytes:profile.length,decompressed_sha256:sha(profile),magic:'acsp',device_class:allowed(12,['mntr','scnr','prtr','spac']),data_space:allowed(16,['RGB ','GRAY','CMYK']),connection_space:allowed(20,['XYZ ','Lab ']),description_classification:'ABSENT'};
  const n=profile.readUInt32BE(128);assert.ok(n<=128&&132+n*12<=profile.length);
  for(let i=0;i<n;i++){
    const entry=132+i*12;const offset=profile.readUInt32BE(entry+4),size=profile.readUInt32BE(entry+8);assert.ok(size>=8&&offset>=132&&offset+size<=profile.length);
    if(profile.toString('ascii',entry,entry+4)!=='desc')continue;
    result.description_classification='UNCLASSIFIED';
    const tag=profile.subarray(offset,offset+size);
    if(tag.toString('ascii',0,4)==='desc'&&tag.length>=12){
      const length=tag.readUInt32BE(8);assert.ok(length>0&&length<=1024&&12+length<=tag.length);
      const text=tag.subarray(12,12+length-1).toString('ascii');
      const descriptions=new Map([['sRGB IEC61966-2.1','SRGB_IEC61966_2_1'],['sRGB','SRGB'],['Generic RGB Profile','GENERIC_RGB_PROFILE']]);
      result.description_classification=descriptions.get(text)??'UNCLASSIFIED';
    }
  }
  return result;
}
for(const path of paths){
  const bytes=readFileSync(checked(path));assert.ok(bytes.length<=64*1024*1024);
  if(bytes.length<=45){short.push({path,bytes:bytes.length,sha256:sha(bytes),valid_png:false});continue;}
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');let offset=8;let ended=false;let chunks=0;
  while(offset<bytes.length){
    assert.ok(++chunks<=10000&&offset+12<=bytes.length);const length=bytes.readUInt32BE(offset);assert.ok(offset+length+12<=bytes.length);
    const kind=bytes.toString('ascii',offset+4,offset+8);assert.ok(/^[A-Za-z]{4}$/.test(kind));counts[kind]=(counts[kind]??0)+1;
    if(kind==='sBIT'||kind==='iCCP'){
      const payload=bytes.subarray(offset+8,offset+8+length);const hash=sha(payload);const key=kind+':'+hash;
      if(!hashes.has(key)){assert.ok(hashes.size<32);hashes.set(key,{kind,payload_bytes:length,payload_sha256:hash,count:0,...(kind==='iCCP'?{icc:icc(payload)}:{})});}
      hashes.get(key).count++;
    }
    offset+=length+12;if(kind==='IEND'){assert.equal(length,0);ended=true;break;}
  }
  assert.ok(ended&&offset===bytes.length);
}
const artifact={diagnostic_only:true,manifest,png_paths:paths.length,short_files:short,chunk_counts:counts,metadata_profiles:[...hashes.values()],limitations:['Hashes pin exact observed metadata bytes, not decoded screenshot pixels.','No generic permission for other ICC profiles, PNG text chunks or binary formats.'],exit_code:0};
const output=resolve(root,`handoffs/codex/artifacts/R8-${label}-png-profile-review.json`);writeFileSync(output,JSON.stringify(artifact,null,2)+'\n',{flag:'wx'});
process.stdout.write(JSON.stringify({artifact:output,png_paths:paths.length,short_files:short.length,unique_metadata:hashes.size,exit_code:0})+'\n');
