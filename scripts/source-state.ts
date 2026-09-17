import { execFileSync } from 'node:child_process';
import { existsSync,readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { liveStatePaths,qualifiedDirty,qualifiedSourcePaths } from './source-paths.mjs';
const digest=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
export function sourceState(){
 const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
 // Tracked qualified runtime source only: see scripts/source-paths.mjs for why
 // an untracked scratch file, and why a live gate/state document, must not
 // change the recorded source identity.
 const paths=qualifiedSourcePaths(git('ls-files','--cached')).filter(p=>existsSync(p));
 const files=paths.map(path=>({path,sha256:digest(path)}));
 return {commit:git('rev-parse','HEAD'),dirty:qualifiedDirty(git('status','--porcelain','--untracked-files=all')),sha256:createHash('sha256').update(JSON.stringify(files)).digest('hex'),files};
}
/**
 * Gate and board state as it stood when a package was cut. Recorded beside the
 * candidate for traceability, never inside its source identity.
 */
export function liveState(){
 const git=(...args:string[])=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
 const files=liveStatePaths(git('ls-files','--cached')).filter(p=>existsSync(p)).map(path=>({path,sha256:digest(path)}));
 return {files,sha256:createHash('sha256').update(JSON.stringify(files)).digest('hex'),
  note:'Live programme state at packaging time. Deliberately outside the candidate source identity: these documents change whenever a gate moves, and a candidate must not be invalidated by a record about itself.'};
}
