// Integration-only harness. Generated credentials and authenticator secrets stay
// in the protected local fixture journal and are never included in evidence.
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runtimeConfig } from '../../auth/src/config.ts';
import type { AuthFixture } from '../../../scripts/auth-bootstrap.ts';
import { writePrivateJson } from '../../../scripts/local-private.ts';

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
    const require=createRequire(new URL('../../../apps/web/package.json',import.meta.url));
    this.child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(this.config.app_port)],{cwd:resolve('apps/web'),windowsHide:true,stdio:['ignore','ignore','pipe'],env:{...process.env,ORVIA_WORKSPACE_ROOT:process.cwd(),NEXT_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1',BETTER_AUTH_TELEMETRY:'0'}});
    this.child.stderr?.on('data',chunk=>{this.diagnostics+=chunk.toString();});
    for(let i=0;i<90;i++) {
      if(this.child.exitCode!==null)throw new Error('Owned web process failed to start');
      try {if((await fetch(this.config.origin+'/healthz',{signal:AbortSignal.timeout(1000)})).ok)return;}catch{/* bounded readiness */}
      await new Promise(resolve=>setTimeout(resolve,500));
    }
    throw new Error('Readiness timeout');
  }
  async stop() {if(this.child&&this.child.exitCode===null){const closed=once(this.child,'close');this.child.kill();await closed;}}
  browser() {
    const cookies=new Map<string,string>();const origin=this.config.origin;
    return {
      headers:()=>({cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')}),
      async call(path: string, body?: unknown, extra: Record<string,string>={}) {
        const response=await fetch(origin+path,{method:body===undefined?'GET':'POST',headers:{cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; '),origin,'content-type':'application/json',...extra},...(body===undefined?{}:{body:JSON.stringify(body)})});
        for(const cookie of response.headers.getSetCookie()){const value=cookie.split(';')[0]!;const at=value.indexOf('=');cookies.set(value.slice(0,at),value.slice(at+1));}
        return response;
      },
    };
  }
  async login(name: string) {
    const user=this.users[name]!;const browser=this.browser();const base=`/api/auth/${user.domain}`;
    if((await browser.call(base+'/sign-in/email',{email:user.email,password:user.password,rememberMe:false})).status!==200)throw new Error(`Synthetic ${name} login failed`);
    if(user.domain==='staff'&&user.role!=='AUDITOR') {
      if(!user.totp_uri) {
        const response=await browser.call(base+'/two-factor/enable',{password:user.password,method:'totp'});
        if(!response.ok)throw new Error('Synthetic enrollment failed');
        user.totp_uri=(await response.json()).totpURI;
        const fixture=JSON.parse(readFileSync(this.journal,'utf8')) as AuthFixture;fixture.users[name]=user;writePrivateJson(this.journal,fixture);
      }
      if((await browser.call(base+'/two-factor/verify-totp',{code:authenticatorCode(user.totp_uri!),trustDevice:false})).status!==200)throw new Error(`Synthetic ${name} MFA failed`);
    }
    return browser;
  }
}
