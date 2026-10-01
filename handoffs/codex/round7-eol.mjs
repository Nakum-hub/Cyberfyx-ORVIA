// Clean added CRLF lines without changing canonical source or SQL tokens.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const diff=execFileSync('git',['diff','--unified=0','--','backend/domain','frontend/src/components/screens'],{encoding:'utf8'});
const ranges=new Map();let file;
for(const line of diff.split('\n')) {
  if(line.startsWith('+++ b/'))file=line.slice(6);
  const match=/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
  if(match&&file){const current=ranges.get(file)??[];current.push([Number(match[1]),Number(match[2]??1)]);ranges.set(file,current);}
}
const canonicalHash=s=>createHash('sha256').update(s.replaceAll('\r\n','\n')).digest('hex');
const proof=[];
for(const [path,blocks] of ranges) {
  const before=readFileSync(path,'utf8'),lines=before.split('\n');
  for(const [start,count] of blocks)for(let n=start-1;n<start-1+count;n++)lines[n]=lines[n].replace(/\r$/,'');
  const after=lines.join('\n');
  if(canonicalHash(before)!==canonicalHash(after))throw new Error('Canonical source changed');
  if(before!==after){writeFileSync(path,after);proof.push({path,canonical_sha256:canonicalHash(after),canonical_source_unchanged:true});}
}
writeFileSync('handoffs/codex/artifacts/R7V-line-ending-proof.json',JSON.stringify(proof,null,2));
console.log(`Normalized added line endings in ${proof.length} files; canonical source hashes unchanged.`);
