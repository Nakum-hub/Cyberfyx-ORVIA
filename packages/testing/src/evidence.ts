import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { safeArtifactPath } from './config.ts';
export function writeEvidence(kind:string, data:Record<string,unknown>){
  if(!/^[a-z-]+$/.test(kind))throw new Error('Invalid evidence kind');
  mkdirSync('handoffs/codex/artifacts',{recursive:true});
  const task=process.env.ORVIA_TASK_ID??'A00';
  if(!/^A0[0-7]$/.test(task))throw new Error('Invalid evidence task');
  const path=`handoffs/codex/artifacts/${task}-${kind}-${Date.now()}-${randomUUID()}.json`;
  writeFileSync(safeArtifactPath(path),JSON.stringify({task_id:task,fixture_kind:task==='A00'?'SYNTHETIC_BOOTSTRAP_ONLY':'CUSTOMER_LOCAL_SYNTHETIC',recorded_at:new Date().toISOString(),...data},null,2)+'\n',{flag:'wx'});
  console.log(`Artifact: ${path}`);
  return path;
}
/**
 * Static operator guidance keyed by error code. The text is a literal from this
 * table and is never taken from the error itself, so an actionable message can
 * be surfaced without any path for a credential, connection setting or raw
 * service error to reach an operator console or an evidence artifact.
 */
const OPERATOR_GUIDANCE:Record<string,string>={
  MACHINE_ENROLLMENT_EXPIRED:'Machine enrollment expired; renew through protected local setup (machine:init confirm:<profile>) before starting the application.',
};
// Do not serialize SQL clients, connection settings or raw service errors.
export function safeError(error:unknown){
  const code=typeof error==='object'&&error!==null&&'code'in error?String(error.code):'UNCLASSIFIED';
  const resolved=/^[A-Za-z0-9_]{1,50}$/.test(code)?code:'UNCLASSIFIED';
  const guidance=OPERATOR_GUIDANCE[resolved];
  return {name:error instanceof Error?error.name:'Error',code:resolved,...guidance?{operator_guidance:guidance}:{}};
}
