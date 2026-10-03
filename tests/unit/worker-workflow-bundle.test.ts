import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve,relative,isAbsolute,sep,basename} from 'node:path';
import {readVerifiedWorkflowBundle,WORKFLOW_BUNDLE_REQUIRED_INPUTS} from '../../services/worker/src/workflow-bundle.ts';

const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
function removeTemporaryRoot(path:string,prefix:string){
 const absolute=resolve(path),temporary=resolve(tmpdir()),rel=relative(temporary,absolute);
 assert.ok(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep)&&dirname(absolute)===temporary&&basename(absolute).startsWith(prefix),'recursive cleanup must target its own prefixed temporary root');
 rmSync(absolute,{recursive:true});
}
function removeFixtureChild(root:string,path:string){
 const absoluteRoot=resolve(root),absolute=resolve(path),rel=relative(absoluteRoot,absolute);
 assert.ok(rel&&!isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+sep),'recursive child cleanup must remain within the known fixture');
 assert.equal(absolute,join(absoluteRoot,'services','worker','src'));
 rmSync(absolute,{recursive:true});
}
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'orvia-workflow-bundle-'));
 const put=(path:string,value:string)=>{mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),value);};
 put('pnpm-lock.yaml','synthetic local lock\n');
 for(const path of WORKFLOW_BUNDLE_REQUIRED_INPUTS)put(path,`// synthetic build input ${path}\n`);
 const code='module.exports = { synthetic: true };\n',codeHash=hash(code);
 put(`services/worker/dist/${codeHash}.cjs`,code);
 const input_files:{path:string;sha256:string}[]=WORKFLOW_BUNDLE_REQUIRED_INPUTS.map(path=>({path,sha256:hash(readFileSync(join(root,path)))})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
 const manifest={version:1,sdk_version:'1.24.0',node_version:process.version,lockfile_sha256:hash('synthetic local lock\n'),code_sha256:codeHash,input_files};
 const save=()=>put('services/worker/dist/workflow-bundle.json',JSON.stringify(manifest));save();
 return {root,put,manifest,save,code,codeHash,read:()=>readVerifiedWorkflowBundle(root,'1.24.0',process.version),cleanup:()=>removeTemporaryRoot(root,'orvia-workflow-bundle-')};
}
test('a fresh real filesystem bundle returns the verified code, not a path',()=>{
 const f=fixture();try{assert.deepEqual(f.read(),{code:f.code});}finally{f.cleanup();}
});
for(const scenario of ['missing manifest','missing code','source changed','lock changed','SDK mismatch','Node mismatch','code tampered','required input omitted','duplicate input','unsorted input','traversal','absolute path','control character','node_modules input','local input','dist input','unknown manifest field','oversize manifest','oversize code'] as const){
 test(`worker launch refuses ${scenario}`,()=>{
  const f=fixture();try{
   switch(scenario){
    case 'missing manifest':unlinkSync(join(f.root,'services/worker/dist/workflow-bundle.json'));break;
    case 'missing code':unlinkSync(join(f.root,`services/worker/dist/${f.codeHash}.cjs`));break;
    case 'source changed':f.put(WORKFLOW_BUNDLE_REQUIRED_INPUTS[1],'// changed after build');break;
    case 'lock changed':f.put('pnpm-lock.yaml','different dependencies');break;
    case 'SDK mismatch':f.manifest.sdk_version='1.23.0';f.save();break;
    case 'Node mismatch':f.manifest.node_version='v0.0.0';f.save();break;
    case 'code tampered':f.put(`services/worker/dist/${f.codeHash}.cjs`,'different code');break;
    case 'required input omitted':f.manifest.input_files.pop();f.save();break;
    case 'duplicate input':f.manifest.input_files.splice(1,0,f.manifest.input_files[0]!);f.save();break;
    case 'unsorted input':f.manifest.input_files.reverse();f.save();break;
    case 'traversal':f.manifest.input_files[0]!.path='scripts/../outside.ts';f.save();break;
    case 'absolute path':f.manifest.input_files[0]!.path=join(f.root,'outside.ts');f.save();break;
    case 'control character':f.manifest.input_files[0]!.path='scripts/invalid\u0000input.ts';f.save();break;
    case 'node_modules input':f.manifest.input_files[0]!.path='scripts/node_modules/input.ts';f.save();break;
    case 'local input':f.manifest.input_files[0]!.path='scripts/.local/input.ts';f.save();break;
    case 'dist input':f.manifest.input_files[0]!.path='scripts/dist/input.ts';f.save();break;
    case 'unknown manifest field':f.put('services/worker/dist/workflow-bundle.json',JSON.stringify({...f.manifest,ignored:true}));break;
    case 'oversize manifest':f.put('services/worker/dist/workflow-bundle.json',' '.repeat(256*1024+1));break;
    case 'oversize code':f.put(`services/worker/dist/${f.codeHash}.cjs`,'x'.repeat(8*1024*1024+1));break;
   }
   assert.throws(f.read,/rebuild locally/);
  }finally{f.cleanup();}
 });
}
test('a linked input directory is refused even when it points to matching local content',()=>{
 const f=fixture(),external=mkdtempSync(join(tmpdir(),'orvia-workflow-linked-'));
 try{
  for(const path of WORKFLOW_BUNDLE_REQUIRED_INPUTS.filter(path=>path.startsWith('services/worker/')))writeFileSync(join(external,path.split('/').at(-1)!),readFileSync(join(f.root,path)));
  removeFixtureChild(f.root,join(f.root,'services/worker/src'));
  symlinkSync(external,join(f.root,'services/worker/src'),'junction');
  // A junction targets an otherwise valid directory: no content mismatch is
  // needed to prove the loader refuses link traversal.
  assert.throws(f.read,/rebuild locally/);
 }finally{f.cleanup();removeTemporaryRoot(external,'orvia-workflow-linked-');}
});
