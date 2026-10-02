import {createHash} from 'node:crypto';
import {lstatSync,realpathSync,readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve,relative,isAbsolute,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

export const WORKFLOW_BUNDLE_REQUIRED_INPUTS=[
 'scripts/build-worker-workflows.ts',
 'services/worker/src/withdrawal-workflows.ts',
 'services/worker/src/workflow-bundle.ts',
] as const;
const ROOT_FILES=new Set(['pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','package.json']);
const PREFIXES=new Set(['services','backend','shared','scripts','connectors','database','packages']);
const HEX=/^[a-f0-9]{64}$/;
function refuse():never{throw new Error('Worker workflow bundle is missing, stale or invalid; rebuild locally before starting');}
const sha=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
function pathParts(path:string){
 if(!path||isAbsolute(path)||/[\\:]/.test(path)||[...path].some(character=>character.charCodeAt(0)<32))refuse();
 const parts=path.split('/');if(parts.some(part=>!part||part==='.'||part==='..'))refuse();return parts;
}
function localFile(root:string,path:string,max:number):Buffer{
 let current=root;
 for(const part of pathParts(path)){current=resolve(current,part);if(lstatSync(current).isSymbolicLink())refuse();}
 const actual=realpathSync(current),rel=relative(root,actual),stat=lstatSync(actual);
 if(!rel||rel==='..'||rel.startsWith('..'+sep)||isAbsolute(rel)||!stat.isFile()||stat.size>max)refuse();
 const bytes=readFileSync(actual);if(bytes.length!==stat.size||bytes.length>max)refuse();return bytes;
}
function exactKeys(value:unknown,keys:string[]):value is Record<string,unknown>{
 return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join('|')===keys.sort().join('|');
}
/** Trusted local filesystem API, not request input. Returns validated code in memory. */
export function readVerifiedWorkflowBundle(root:string,sdkVersion:string,nodeVersion:string):{code:string}{
 try{
  if(lstatSync(root).isSymbolicLink()||!lstatSync(root).isDirectory())refuse();root=realpathSync(root);
  const manifest:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(localFile(root,'services/worker/dist/workflow-bundle.json',256*1024)));
  if(!exactKeys(manifest,['version','sdk_version','node_version','lockfile_sha256','code_sha256','input_files']))refuse();
  if(manifest.version!==1||manifest.sdk_version!==sdkVersion||manifest.node_version!==nodeVersion||typeof manifest.lockfile_sha256!=='string'||!HEX.test(manifest.lockfile_sha256)||typeof manifest.code_sha256!=='string'||!HEX.test(manifest.code_sha256))refuse();
  if(sha(localFile(root,'pnpm-lock.yaml',8*1024*1024))!==manifest.lockfile_sha256)refuse();
  const inputs=manifest.input_files;
  if(!Array.isArray(inputs)||!inputs.length||inputs.length>512)refuse();
  let previous='';const captured=new Set<string>();
  for(const input of inputs){
   if(!exactKeys(input,['path','sha256'])||typeof input.path!=='string'||typeof input.sha256!=='string'||!HEX.test(input.sha256))refuse();
   const parts=pathParts(input.path);
   if(input.path<=previous||parts.some(part=>['.local','node_modules','dist','.git','.next','.worktrees'].includes(part))||!(ROOT_FILES.has(input.path)||parts.length>1&&PREFIXES.has(parts[0]!)))refuse();
   if(sha(localFile(root,input.path,8*1024*1024))!==input.sha256)refuse();
   previous=input.path;captured.add(input.path);
  }
  if(WORKFLOW_BUNDLE_REQUIRED_INPUTS.some(path=>!captured.has(path)))refuse();
  const code=localFile(root,`services/worker/dist/${manifest.code_sha256}.cjs`,8*1024*1024);
  if(!code.length||sha(code)!==manifest.code_sha256)refuse();
  return {code:new TextDecoder('utf-8',{fatal:true}).decode(code)};
 }catch{refuse();}
}
/** Runtime uses the actual installed SDK and Node, never a manifest's claims. */
export function loadWorkerWorkflowBundle():{code:string}{
 const root=fileURLToPath(new URL('../../../',import.meta.url));
 const require=createRequire(new URL('../package.json',import.meta.url));
 const entry=require.resolve('@temporalio/worker');
 const sdk=JSON.parse(readFileSync(resolve(dirname(entry),'../package.json'),'utf8')) as {version?:unknown};
 if(typeof sdk.version!=='string')refuse();
 return readVerifiedWorkflowBundle(root,sdk.version,process.version);
}
