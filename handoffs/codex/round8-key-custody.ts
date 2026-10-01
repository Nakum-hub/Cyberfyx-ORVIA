import assert from 'node:assert/strict';import { execFileSync } from 'node:child_process';import { mkdtempSync, writeFileSync } from 'node:fs';import { tmpdir } from 'node:os';import { join } from 'node:path';
import { generateProductionKey } from '../../scripts/vendor-audit-key.ts';
const label=process.argv[2];assert.match(label??'',/^[a-z0-9-]+$/);assert.equal(process.platform,'win32');
const directory=mkdtempSync(join(tmpdir(),'orvia-round8-synthetic-key-custody-'));
// A temporary synthetic key location with a deliberately weak pre-existing ACL; no operational key is used.
execFileSync('icacls',[directory,'/grant','*S-1-1-0:(OI)(CI)R'],{stdio:'pipe',windowsHide:true});
const file=join(directory,'audit.json');const out=generateProductionKey(file);
const command=`$ErrorActionPreference='Stop'; $u=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; $a=(Get-Acl -LiteralPath $env:ORVIA_TEST_KEY_FILE).Access | ForEach-Object { [pscustomobject]@{sid=$_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value;type=$_.AccessControlType.ToString();inherited=$_.IsInherited} }; [pscustomobject]@{current_user=$u;rules=@($a)} | ConvertTo-Json -Depth 5 -Compress`;
const acl=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',command],{encoding:'utf8',windowsHide:true,env:{...process.env,ORVIA_TEST_KEY_FILE:file}}));
const unexpected=acl.rules.filter((r:{sid:string;type:string})=>r.type==='Allow'&&![acl.current_user,'S-1-5-18'].includes(r.sid));
const evidence={label,fixture:'temporary synthetic signing key; never enrolled or trusted',returned_fields:Object.keys(out).sort(),acl,unexpected_allow_rules:unexpected.length};
writeFileSync(`handoffs/codex/artifacts/R8-key-custody-${label}.json`,JSON.stringify(evidence,null,2));
console.log(JSON.stringify({label,unexpected_allow_rules:unexpected.length,fixture:'synthetic only'}));
assert.deepEqual(unexpected,[],'Signing key must not inherit or retain other readers');
