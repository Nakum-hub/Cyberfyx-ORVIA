import { spawnSync } from 'node:child_process';
import { loadProfile } from '../packages/testing/src/config.ts';
const action = process.argv[2];
const allowed = { pull:['pull'], up:['up','-d'], stop:['stop'], status:['ps'], restart:['restart'], config:['config','--quiet'] } as const;
if (!action || !(action in allowed)) throw new Error('Use pull, up, stop, status, restart or config; volume deletion is not exposed');
const p=loadProfile();
const result=spawnSync('docker',['compose','-f','infrastructure/compose.yaml',...allowed[action as keyof typeof allowed]],{stdio:'inherit',windowsHide:true,env:{...process.env,ORVIA_COMPOSE_PROJECT:p.compose_project,ORVIA_DATABASE:p.database,ORVIA_POSTGRES_PORT:String(p.postgres_port),ORVIA_OPA_PORT:String(p.opa_port),ORVIA_TEMPORAL_PORT:String(p.temporal_port),ORVIA_TEMPORAL_NAMESPACE:p.temporal_namespace,ORVIA_SECRET_DIRECTORY:p.directory}});
if(result.error) throw new Error(`Docker launch failed: ${result.error.message}`);
process.exitCode=result.status??1;
