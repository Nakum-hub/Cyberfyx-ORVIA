import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { safeArtifactPath } from './config.ts';
export function writeEvidence(kind:string, data:Record<string,unknown>){
  if(!/^[a-z-]+$/.test(kind))throw new Error('Invalid evidence kind');
  mkdirSync('handoffs/codex/artifacts',{recursive:true});
  const path=`handoffs/codex/artifacts/A00-${kind}-${Date.now()}-${randomUUID()}.json`;
  writeFileSync(safeArtifactPath(path),JSON.stringify({task_id:'A00',fixture_kind:'SYNTHETIC_BOOTSTRAP_ONLY',recorded_at:new Date().toISOString(),...data},null,2)+'\n',{flag:'wx'});
  console.log(`Artifact: ${path}`);
  return path;
}
// Do not serialize SQL clients, connection settings or raw service errors.
export function safeError(error:unknown){
  const code=typeof error==='object'&&error!==null&&'code'in error?String(error.code):'UNCLASSIFIED';
  return {name:error instanceof Error?error.name:'Error',code:/^[A-Za-z0-9_]{1,50}$/.test(code)?code:'UNCLASSIFIED'};
}
