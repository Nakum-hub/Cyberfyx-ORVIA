// Integration-only harness. Generated credentials and authenticator secrets stay
// in the protected local fixture journal and are never included in evidence.
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { webProcess } from '../../../scripts/web-process.ts';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runtimeConfig } from '../../auth/src/config.ts';
import type { AuthFixture } from '../../../scripts/auth-bootstrap.ts';
import { writePrivateJson } from '../../../scripts/local-private.ts';
import { guardAuthWindow } from './auth-window.ts';

export function authenticatorCode(uri: string) {
  const secret=new URL(uri).searchParams.get('secret')!;const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bits=[...secret.toUpperCase().replaceAll('=','')].map(char=>alphabet.indexOf(char).toString(2).padStart(5,'0')).join('');
  const key=Buffer.from((bits.match(/.{8}/g)??[]).map(byte=>parseInt(byte,2)));const counter=Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)));const mac=createHmac('sha1',key).update(counter).digest();
  return ((mac.readUInt32BE(mac.at(-1)!&15)&0x7fffffff)%1000000).toString().padStart(6,'0');
}
export class HttpFixture {
  readonly config=runtimeConfig();
  readonly journal=resolve(this.config.directory,'auth/bootstrap.json');
  readonly users=(JSON.parse(readFileSync(this.journal,'utf8')) as AuthFixture).users;
  child: ChildProcess|undefined;
  diagnostics='';
  async start() {
    const command=webProcess(this.config);
    this.child=spawn(process.execPath,command.args,{cwd:command.cwd,windowsHide:true,stdio:['ignore','ignore','pipe'],env:{...process.env,ORVIA_WORKSPACE_ROOT:process.cwd(),NEXT_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1',BETTER_AUTH_TELEMETRY:'0'}});
    this.child.stderr?.on('data',chunk=>{this.diagnostics+=chunk.toString();});
    // /healthz answers before the business route graph is loaded. A suite that
    // restarts the application and immediately calls a business route was
    // therefore racing the first module load of that route, and under container
    // load the first call could exceed its own 20s timeout and abort the suite.
    // Readiness now means the business boundary is answering: an unauthenticated
    // 401 proves the route is loaded and refusing correctly. Nothing is retried
    // and no failure is masked -- if it never answers, this still throws.
    for(const [path,ready] of [['/healthz',(r:Response)=>r.ok],['/api/v1/session',(r:Response)=>r.status>0]] as const) {
      let answered=false;
      for(let i=0;i<90;i++) {
        if(this.child.exitCode!==null)throw new Error('Owned web process failed to start');
        try {if(ready(await fetch(this.config.origin+path,{signal:AbortSignal.timeout(2000)}))){answered=true;break;}}catch{/* bounded readiness */}
        await new Promise(resolve=>setTimeout(resolve,500));
      }
      if(!answered)throw new Error('Readiness timeout');
    }
    return;
  }
  async stop() {if(this.child&&this.child.exitCode===null&&this.child.signalCode===null){const closed=once(this.child,'close');this.child.kill();await closed;}}
  browser() {
    const cookies=new Map<string,string>();const origin=this.config.origin;
    return {
      headers:()=>({cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')}),
      async call(path: string, body?: unknown, extra: Record<string,string>={}) {
        const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',signal:AbortSignal.timeout(20000),headers:{cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),origin,'content-type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
        for(const cookie of response.headers.getSetCookie()){const value=cookie.split(';')[0]!;const at=value.indexOf('=');cookies.set(value.slice(0,at),value.slice(at+1));}
        return response;
      },
    };
  }
  /** Overridden by fixtures that already hold a pool; see guardAuthWindow. */
  async authWindow(){await guardAuthWindow();}
  async login(name: string) {
    const user=this.users[name]!;const browser=this.browser();const base=`/api/auth/${user.domain}`;
    if(user.domain==='staff')await this.authWindow();
    if((await browser.call(base+'/sign-in/email',{email:user.email,password:user.password,rememberMe:false})).status!==200)throw new Error(`Synthetic ${name} login failed`);
    if(user.domain==='staff'&&user.role!=='AUDITOR') {
      if(!user.totp_uri) {
        const response=await browser.call(base+'/two-factor/enable',{password:user.password,method:'totp'});
        if(!response.ok)throw new Error('Synthetic enrollment failed');
        user.totp_uri=(await response.json()).totpURI;
        const fixture=JSON.parse(readFileSync(this.journal,'utf8')) as AuthFixture;fixture.users[name]=user;writePrivateJson(this.journal,fixture);
      }
      const verified=await browser.call(base+'/two-factor/verify-totp',{code:authenticatorCode(user.totp_uri!),trustDevice:false});
      if(verified.status!==200){const result=await verified.json();const code=typeof result.code==='string'&&/^[A-Z_]+$/.test(result.code)?result.code:'UNKNOWN';throw new Error(`Synthetic ${name} MFA failed (${verified.status}, ${code})`);}
    }
    return browser;
  }
}
