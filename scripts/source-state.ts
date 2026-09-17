import { execFileSync } from 'node:child_process';
import { existsSync,readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
export function sourceState(){
 const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
 const paths=git('ls-files','--cached','--others','--exclude-standard').split(/\r?\n/).filter(p=>p&&existsSync(p)&&!p.startsWith('handoffs/')&&!p.startsWith('artifacts/')&&!p.startsWith('docs/')).sort();
 const files=paths.map(path=>({path,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
 return {commit:git('rev-parse','HEAD'),dirty:!!git('status','--porcelain','--untracked-files=all'),sha256:createHash('sha256').update(JSON.stringify(files)).digest('hex'),files};
}
