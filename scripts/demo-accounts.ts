/**
 * Synthetic sign-in accounts for a demonstration on this machine.
 *
 *   npm run demo:accounts          writes .local/demo-accounts.txt (owner-only file permissions) listing every synthetic
 *                                  account of the customer installation and, if it is set up, the vendor installation:
 *                                  where to sign in, email, role and password. Nothing is printed and nothing leaves
 *                                  this machine; the file is under .local, which is never committed.
 *   npm run demo:code <account>    prints the current six-digit authenticator code for a synthetic account
 *                                  (for example: owner, admin, member, vendor-admin, vendor-lead), valid about 30 s.
 *
 * Synthetic installations only: the accounts are the fixture identities created at setup, all on reserved .example
 * addresses. A production installation has no such journal, and this command refuses any other profile.
 */
import { existsSync, readFileSync, writeFileSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { authenticatorCode } from '../shared/testing/src/http-fixture.ts';

type Account = { label: string; area: string; email: string; password: string; role: string; totp?: string };
const accounts: Account[] = [];
const customer = resolve('.local/profiles/rehearsal/auth/bootstrap.json');
if (!existsSync(customer)) throw new Error('No rehearsal installation on this machine; run npm start first.');
const staff = JSON.parse(readFileSync(customer, 'utf8')).users as Record<string, { email: string; password: string; role: string; domain: string; totp_uri?: string }>;
const ROLE: Record<string, string> = { ORG_SUPER_ADMIN: 'Organisation super administrator', ORG_ADMIN: 'Organisation administrator', AUDITOR: 'Internal auditor (read-only)', MEMBER: 'Member' };
for (const [name, u] of Object.entries(staff)) if (u.domain === 'staff' && ['owner', 'admin', 'auditor', 'member', 'reviewer'].includes(name))
  accounts.push({ label: name, area: 'Organisation  https://127.0.0.1:4330/workspace/sign-in', email: u.email, password: u.password, role: ROLE[u.role] ?? u.role, ...(u.totp_uri ? { totp: u.totp_uri } : {}) });
const vendorJournal = resolve('.local/profiles/vendor-a00/auth/e2e-users.json');
if (existsSync(vendorJournal)) {
  const v = JSON.parse(readFileSync(vendorJournal, 'utf8')) as Record<string, { email: string; password: string; totp?: string } | string>;
  const VENDOR: Record<string, [string, string]> = { owner: ['Vendor owner', '/vendor/sign-in'], admin: ['Vendor administrator', '/vendor/sign-in'], lead: ['Audit lead (auditor)', '/vendor/sign-in'],
    reviewer: ['Audit reviewer (auditor)', '/vendor/sign-in'], uploader: ['Client organisation account (uploads audit packages)', '/vendor/sign-in?account=client'] };
  for (const [name, [role, path]] of Object.entries(VENDOR)) { const u = v[name]; if (u && typeof u === 'object') accounts.push({ label: `vendor-${name}`, area: `Vendor        http://127.0.0.1:4340${path}`, email: u.email, password: u.password, role, ...(u.totp ? { totp: u.totp } : {}) }); }
}

const [command, which] = process.argv.slice(2);
if (command === 'code') {
  const a = accounts.find(x => x.label === which);
  if (!a) throw new Error(`Unknown account "${which ?? ''}". Use one of: ${accounts.map(x => x.label).join(', ')}`);
  if (!a.totp) { process.stdout.write(`${a.label} has no authenticator: it signs in with email and password only.\n`); process.exit(0); }
  const uri = a.totp.startsWith('otpauth://') ? a.totp : `otpauth://totp/ORVIA?secret=${a.totp}`;
  process.stdout.write(`${authenticatorCode(uri)}   (${a.label}; valid for about ${30 - Math.floor(Date.now() / 1000) % 30} more seconds)\n`);
} else {
  const file = resolve('.local/demo-accounts.txt');
  const lines = ['ORVIA demonstration accounts (SYNTHETIC; this machine only; never share or commit)', '',
    'Staff accounts with an authenticator: get the current code with  npm run demo:code <account>', '',
    ...accounts.map(a => [`[${a.label}]  ${a.role}`, `  sign in   ${a.area}`, `  email     ${a.email}`, `  password  ${a.password}`, `  code      ${a.totp ? `npm run demo:code ${a.label}` : 'not needed'}`, ''].join('\n'))];
  writeFileSync(file, lines.join('\n'), { mode: 0o600 }); chmodSync(file, 0o600);
  process.stdout.write(`Wrote ${accounts.length} synthetic accounts to .local/demo-accounts.txt (open it on this machine; it is never committed).\n`);
}
