import {readdirSync,readFileSync} from 'node:fs';
const secrets=[];
for(const profile of ['codex-a00','rehearsal','vendor-a00']) {
 for(const file of ['bootstrap.json','e2e-users.json'])try {
  const data=JSON.parse(readFileSync(`.local/profiles/${profile}/auth/${file}`,'utf8'));
  const walk=o=>{if(!o||typeof o!=='object')return;for(const [k,v] of Object.entries(o)){if(typeof v==='string'&&/password|totp|token|secret/i.test(k)&&v.length>4)secrets.push(v);else walk(v);}};walk(data);
 }catch{}
}
const redact=t=>secrets.reduce((s,v)=>s.replaceAll(v,'[PRIVATE FIXTURE VALUE]'),t);
for(const dir of readdirSync('.local/browser-evidence').filter(x=>x.startsWith(process.argv[2]??'2026-10-02T14-55'))) {
 for(const file of readdirSync(`.local/browser-evidence/${dir}`).filter(x=>x.startsWith('errors-')&&x.endsWith('.json'))) {
  const errors=JSON.parse(readFileSync(`.local/browser-evidence/${dir}/${file}`,'utf8'));
  if(errors.length)console.log(JSON.stringify({directory:dir,file,errors:errors.map(e=>({message:redact(e.message??'').slice(0,2500),location:e.location}))}));
 }
}
