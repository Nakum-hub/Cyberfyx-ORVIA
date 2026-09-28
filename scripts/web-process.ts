import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { customerEnvironment } from './credentials.ts';
/** The customer application process: its command, and an environment that carries no private key (see scripts/credentials.ts). */
export function webProcess(profile:{profile:string;app_port:number}){
 const root=process.env.ORVIA_WORKSPACE_ROOT??process.cwd();
 const env=customerEnvironment({...process.env,ORVIA_WORKSPACE_ROOT:root},profile.profile);
 if(profile.profile==='rehearsal')return {args:['--import','tsx',resolve(root,'scripts/tls-server.ts')],cwd:root,env};
 const require=createRequire(resolve(root,'frontend/package.json'));
 return {args:[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(profile.app_port)],cwd:resolve(root,'frontend'),env};
}
