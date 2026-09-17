import { createRequire } from 'node:module';
import { resolve } from 'node:path';
export function webProcess(profile:{profile:string;app_port:number}){
 const root=process.env.ORVIA_WORKSPACE_ROOT??process.cwd();
 if(profile.profile==='rehearsal')return {args:['--import','tsx',resolve(root,'scripts/tls-server.ts')],cwd:root};
 const require=createRequire(resolve(root,'apps/web/package.json'));
 return {args:[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(profile.app_port)],cwd:resolve(root,'apps/web')};
}
