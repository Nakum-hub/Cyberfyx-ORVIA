import { spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync, appendFileSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = process.cwd();
const ledger = 'handoffs/codex/artifacts/R10-preparation.jsonl';
mkdirSync('handoffs/codex/artifacts', { recursive: true });
const node = resolve('.local/tools/node-v24.21.0-win-x64/node.exe');
const env = { ...process.env, ORVIA_WORKSPACE_ROOT: root, ORVIA_PROFILE: 'codex-a00', NEXT_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' };
function command(args, profile='codex-a00') {
  const started_at = new Date().toISOString();
  const r = spawnSync(node, args, { env: { ...env, ORVIA_PROFILE: profile }, encoding: 'utf8', windowsHide: true });
  const log = `handoffs/codex/artifacts/R10-prep-${profile}-${randomUUID()}-${args.filter(x=>!x.startsWith('--')).join('-').replaceAll(/[\\/:]/g,'_')}.log`;
  writeFileSync(log, (r.stdout??'')+(r.stderr??''));
  appendFileSync(ledger, JSON.stringify({ command:[node,...args], profile, started_at, ended_at:new Date().toISOString(), exit_code:r.status, log })+'\n');
  console.log(JSON.stringify({args,profile,exit_code:r.status,log}));
  if(r.status!==0) process.exit(r.status??1);
}
if (process.argv[2]==='keys') {
  mkdirSync('.local/vendor/signing',{recursive:true});
  for(const kind of ['licence','release','audit']) {
    const file=`.local/vendor/signing/${kind}.json`;
    if(existsSync(file)) throw new Error('Do not overwrite a signing key');
    const pair=generateKeyPairSync('ed25519');
    writeFileSync(file,JSON.stringify({key_id:kind==='audit'?`orvia-audit-dev-${randomUUID().slice(0,8)}`:randomUUID(),note:'Synthetic Round 10 development key only',public:pair.publicKey.export({format:'der',type:'spki'}).toString('base64'),private:pair.privateKey.export({format:'der',type:'pkcs8'}).toString('base64')}),{flag:'wx',mode:0o600});
  }
  command(['--import','tsx','scripts/credentials-separate.ts','confirm:local']);
  command(['--import','tsx','scripts/tls-init.ts','confirm:rehearsal'],'rehearsal');
} else if(process.argv[2]==='repair-keys') {
  for(const kind of ['licence','release','audit']) {
    const file=`.local/vendor/signing/${kind}.json`,pair=JSON.parse(readFileSync(file,'utf8'));
    if(pair.note!=='Synthetic Round 10 development key only'||!pair.key_id.startsWith(`round10-${kind}-dev-`))throw new Error('Only reviewer-created Round 10 fixture identifiers may be repaired');
    pair.key_id=kind==='audit'?`orvia-audit-dev-${randomUUID().slice(0,8)}`:randomUUID();
    writeFileSync(file,JSON.stringify(pair),{mode:0o600});
  }
  command(['--import','tsx','scripts/credentials-separate.ts','confirm:local']);
} else if(process.argv[2]==='customer') {
  for(const [file,...args] of [['roles-init','confirm:codex-a00'],['migrate'],['auth-init','confirm:codex-a00'],['auth-bootstrap','owner','confirm:codex-a00'],['auth-bootstrap','fixtures','confirm:codex-a00'],['machine-init','confirm:codex-a00'],['seed-orders','confirm:codex-a00'],['regression-init','confirm:codex-a00'],['vendor-init','confirm:vendor-a00'],['vendor-service-licence','keys','confirm:local']]) command(['--import','tsx',`scripts/${file}.ts`,...args]);
} else if(process.argv[2]==='rehearsal') {
  for(const [file,...args] of [['roles-init','confirm:rehearsal'],['migrate'],['auth-init','confirm:rehearsal'],['auth-bootstrap','owner','confirm:rehearsal'],['auth-bootstrap','fixtures','confirm:rehearsal'],['machine-init','confirm:rehearsal'],['seed-orders','confirm:rehearsal'],['regression-init','confirm:rehearsal']]) command(['--import','tsx',`scripts/${file}.ts`,...args],'rehearsal');
} else throw new Error('Use keys, customer or rehearsal');
