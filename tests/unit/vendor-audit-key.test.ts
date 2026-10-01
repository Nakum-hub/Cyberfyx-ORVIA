// The production audit key tool (scripts/vendor-audit-key.ts). Docker-free; works in a temporary directory only.
// Under test: a generated key is a production key the audit practice will accept (no development prefix); the file holds the
// private key with mode 0600 while the tool returns only the public part; a development key it replaces is kept, not deleted;
// a production key is never overwritten; and the fingerprint is the SHA-256 of the public key.
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEVELOPMENT_PREFIX, generateProductionKey, isProductionKeyId, publicPart } from '../../scripts/vendor-audit-key.ts';

function assertCustody(path: string) {
  if (process.platform !== 'win32') { assert.equal(statSync(path).mode & 0o777, 0o600); return; }
  const code = `$ErrorActionPreference='Stop'; $user=[System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value; @((Get-Acl -LiteralPath $env:ORVIA_TEST_KEY_FILE).Access | Where-Object { $_.AccessControlType -eq 'Allow' -and $_.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -notin @($user,'S-1-5-18') }).Count`;
  assert.equal(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', code], { encoding: 'utf8', windowsHide: true, env: { ...process.env, ORVIA_TEST_KEY_FILE: path } }).trim(), '0');
}

test('a generated key is a production key, private only in the file, with a working signature', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-key-')); const path = join(dir, 'audit.json');
  const out = generateProductionKey(path);
  assert.ok(isProductionKeyId(out.key_id)); assert.ok(!out.key_id.startsWith(DEVELOPMENT_PREFIX));
  assert.deepEqual(Object.keys(out).sort(), ['key_id', 'public', 'sha256']);
  assert.equal(out.sha256, createHash('sha256').update(Buffer.from(out.public, 'base64')).digest('hex'));
  assertCustody(path);
  const file = JSON.parse(readFileSync(path, 'utf8')) as { private: string; public: string };
  const message = Buffer.from('synthetic report digest');
  const signature = sign(null, message, createPrivateKey({ key: Buffer.from(file.private, 'base64'), format: 'der', type: 'pkcs8' }));
  assert.ok(verify(null, message, createPublicKey({ key: Buffer.from(file.public, 'base64'), format: 'der', type: 'spki' }), signature));
  assert.equal(publicPart(path).production, true);
});

test('a development key is kept beside the new one; a production key is never overwritten', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-key-')); const path = join(dir, 'audit.json');
  writeFileSync(path, JSON.stringify({ key_id: `${DEVELOPMENT_PREFIX}abcd1234`, public: 'AA==', private: 'AA==' }));
  assert.equal(publicPart(path).production, false);
  const first = generateProductionKey(path);
  assert.equal(readdirSync(dir).filter(f => f.startsWith('audit.dev-retired-')).length, 1);
  assert.throws(() => generateProductionKey(path), /already in place/);
  assert.equal(publicPart(path).key_id, first.key_id);
});

test('key generation removes weak directory and explicit development-file grants', () => {
  const dir=mkdtempSync(join(tmpdir(),'audit-key-custody-')); const path=join(dir,'audit.json');
  writeFileSync(path,JSON.stringify({key_id:`${DEVELOPMENT_PREFIX}synthetic`,public:'AA==',private:'AA=='}));
  if(process.platform==='win32') {
    execFileSync('icacls',[dir,'/grant','*S-1-1-0:(OI)(CI)R'],{stdio:'pipe',windowsHide:true});
    execFileSync('icacls',[path,'/grant','*S-1-5-11:R'],{stdio:'pipe',windowsHide:true});
  }
  generateProductionKey(path); assertCustody(path);
  const retired=readdirSync(dir).find(name=>name.startsWith('audit.dev-retired-'))!;
  assertCustody(join(dir,retired));
});
