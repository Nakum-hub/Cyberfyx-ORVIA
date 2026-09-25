// Test-only browser surface. Production React components and generated client
// call the isolated real backend; this is not the Next deployment or login UI.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

export async function browserHarness(origin:string,api:(request:Request)=>Promise<Response>,sessions:Record<'writer'|'reviewer'|'auditor',()=>string[]>){
  const require=createRequire(import.meta.url),tsxRequire=createRequire(require.resolve('tsx'));
  const esbuild=tsxRequire('esbuild') as {build:(options:Record<string,unknown>)=>Promise<{outputFiles:{text:string}[]}>};
  const compile=()=>esbuild.build({absWorkingDir:resolve('frontend'),stdin:{contents:`
    import {createRoot} from 'react-dom/client';
    import {GrcWorkspace} from './src/components/screens/governance/grc.tsx';
    import {GrcAuditWorkspace} from './src/components/screens/governance/grc-audits.tsx';
    import {schemas} from '@orvia/contracts';
    import {identityKey,setIdentity} from './src/components/shared/api.ts';
    const root=createRoot(document.getElementById('root'));
    fetch('/api/v1/session').then(async response=>{
      if(!response.ok)throw new Error('Fixture session unavailable');
      const session=schemas.Session.parse(await response.json());
      if(session.actor_domain!=='STAFF')throw new Error('Staff session required');
      setIdentity(identityKey(session));root.render(location.pathname.endsWith('/audits')?<GrcAuditWorkspace session={session}/>:<GrcWorkspace session={session}/>);
    }).catch(()=>root.render(<p role="alert">Fixture session unavailable.</p>));
  `,resolveDir:resolve('frontend'),sourcefile:'grc-browser-entry.tsx',loader:'tsx'},bundle:true,write:false,format:'esm',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},logLevel:'silent'});
  await compile(); // Fail fixture setup immediately if the real screen cannot bundle.
  let finish!:()=>void;const finished=new Promise<void>(resolve=>{finish=resolve;});
  async function handler(request:Request){
    const path=new URL(request.url).pathname;
    if(request.method==='GET'&&path.startsWith('/fixture/session/')){
      const role=path.slice('/fixture/session/'.length);
      if(role!=='writer'&&role!=='reviewer'&&role!=='auditor')return new Response(null,{status:404});
      const headers=new Headers({location:'/grc','cache-control':'no-store'});
      for(const cookie of sessions[role]())headers.append('set-cookie',cookie);
      return new Response(null,{status:303,headers});
    }
    if(request.method==='POST'&&path==='/fixture/finish'){
      if(request.headers.get('origin')!==origin)return new Response(null,{status:403});
      setTimeout(finish,200);return Response.json({stopping:true});
    }
    if(request.method==='GET'&&['/grc','/workspace/grc','/workspace/grc/audits'].includes(path))return new Response('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ORVIA GRC — isolated browser fixture</title><link rel="stylesheet" href="/fixture/styles.css"></head><body><main style="padding:24px;max-width:1280px;margin:auto"><p class="eyebrow">Synthetic isolated validation</p><div id="root"></div></main><script type="module" src="/fixture/app.js"></script></body></html>',{headers:{'content-type':'text/html','cache-control':'no-store','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'none'"}});
    if(request.method==='GET'&&path==='/fixture/app.js')return new Response((await compile()).outputFiles[0]!.text,{headers:{'content-type':'text/javascript','cache-control':'no-store'}});
    if(request.method==='GET'&&path==='/fixture/styles.css')return new Response(readFileSync('frontend/src/app/globals.css','utf8'),{headers:{'content-type':'text/css','cache-control':'no-store'}});
    if(path==='/favicon.ico')return new Response(null,{status:204});
    return api(request);
  }
  return {handler,finished};
}
