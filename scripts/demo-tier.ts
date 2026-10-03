/**
 * `npm run demo:tier -- <aster|birch> <1|2|3>` — puts one organisation of the rehearsal installation on a tier, the way it
 * happens for a real customer: the vendor issues a signed licence for the plan (backend/vendor/licensing/issue.ts, local
 * development licence key), and the organisation's super administrator uploads it on the Files page and approves it.
 * The installation verifies the signature and the sequence and from then on enforces that tier on the server, and the
 * interface shows what the plan includes and locks the rest.
 *
 *   Aster  (owner)  and  Birch (birch)  are two organisations on the same installation; each can be on a different tier.
 *   Tier 1 = FOUNDATION, Tier 2 = CONTROL, Tier 3 = ENTERPRISE (shared/contracts/src/tiers.ts).
 *
 * Synthetic installations only. Upgrades and downgrades are superseding licences with a higher sequence; nothing is reset.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { childEnvironment, toolchainExecutable } from './orvia-cli.ts';

if (process.env.ORVIA_DEMO_REEXEC !== '1') {
  const child = spawnSync(toolchainExecutable(), ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true, env: { ...childEnvironment(), ORVIA_DEMO_REEXEC: '1' } });
  process.exit(child.status ?? 1);
}
const { randomUUID } = await import('node:crypto');
const S = await import('../shared/contracts/src/index.ts');
const { HttpFixture } = await import('../shared/testing/src/http-fixture.ts');
const { issueLicence } = await import('../backend/vendor/licensing/issue.ts');
const { vendorDirectory, vendorSigningKey } = await import('./credentials.ts');
const { privateDirectory, writePrivateJson } = await import('./local-private.ts');

const [org, tierArg] = process.argv.slice(2);
const ORGS: Record<string, string> = { aster: 'owner', birch: 'birch' };
const OPTIONS: Record<string, string> = { 1: 'tier_1_members_10', 2: 'tier_2_members_25', 3: 'tier_3_members_100' };
if (!org || !ORGS[org] || !tierArg || !OPTIONS[tierArg]) { process.stdout.write('\n  Usage: npm run demo:tier -- <aster|birch> <1|2|3>\n\n'); process.exit(1); }
const say = (t: string) => process.stdout.write(`${t}\n`);

const h = new HttpFixture();
if (h.config.profile !== 'rehearsal') throw new Error('Demonstration tiers are set on the rehearsal installation only.');
const ready = await fetch(`${h.config.origin}/readyz`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
if (!ready?.ok) { say('\n  ORVIA is not running. Start it with npm start, then run this in a second window.\n'); process.exit(1); }

// Vendor side: the next sequence for this installation, kept with the issued licences (anti-rollback needs it to rise).
const issued = resolve(vendorDirectory(), 'issued'); privateDirectory(issued);
const counterFile = resolve(issued, `sequence-${h.config.installation_id}.json`);
const sequence = (existsSync(counterFile) ? (JSON.parse(readFileSync(counterFile, 'utf8')) as { next: number }).next : 1000);
const edition = ({ 1: 'FOUNDATION', 2: 'CONTROL', 3: 'ENTERPRISE' } as const)[tierArg as '1' | '2' | '3'];
const entitlements = [...S.editionCeiling(edition)];
const now = Date.now();
const { licence, plan } = issueLicence({ installation_id: h.config.installation_id, option: OPTIONS[tierArg]!, entitlements, environments: 1, term: 'ANNUAL', sequence,
  valid_from: new Date(now - 60_000).toISOString(), valid_to: new Date(now + 365 * 86_400_000).toISOString() }, vendorSigningKey('licence'));
writePrivateJson(resolve(issued, `${licence.claims.licence_id}.json`), { licence });
writePrivateJson(counterFile, { next: sequence + 1 });
say(`\n  Vendor: issued a signed ${plan.tier.replace('_', ' ')} (${edition}) licence for ${org === 'aster' ? 'Aster' : 'Birch'}, ${plan.member_seats} member seats, sequence ${sequence}.`);

// Customer side: the organisation's super administrator uploads it on the Files page and approves it.
const admin = await h.login(ORGS[org]!);
const key = () => ({ 'idempotency-key': randomUUID() });
const file = Buffer.from(JSON.stringify({ licence }));
const staged = await admin.call('/api/v1/admin/file-intake', { file_name: `licence-${plan.tier}-${sequence}.json`, content_base64: file.toString('base64') }, key());
const item = await staged.json() as { id: string; detected_kind: string; detail: string };
if (staged.status !== 201 && staged.status !== 200) throw new Error(`Upload refused (${staged.status}): ${JSON.stringify(item).slice(0, 300)}`);
say(`  ${org === 'aster' ? 'Aster' : 'Birch'}: uploaded on the Files page, recognised as ${item.detected_kind}: ${item.detail}`);
const decided = await admin.call(`/api/v1/admin/file-intake/${item.id}/decision`, { decision: 'APPROVE', reason: `Licence for ${plan.tier.replace('_', ' ')} from the vendor.`, subject_kind: null, subject_id: null }, key());
if (decided.status !== 200) throw new Error(`Approval refused (${decided.status}): ${(await decided.text()).slice(0, 300)}`);
const summary = S.PlanSummary.parse(await (await admin.call('/api/v1/admin/plan')).json());
const locked = S.EntitlementCode.options.filter(code => !summary.usable.includes(code));
say(`  Approved. The installation verified the signature and now enforces ${summary.edition} for ${org === 'aster' ? 'Aster' : 'Birch'}:`);
say(`    usable: ${summary.usable.length} features   locked: ${locked.length}${locked.length ? ` (${locked.slice(0, 6).join(', ')}${locked.length > 6 ? ', …' : ''})` : ''}`);
say(`  Sign in as ${ORGS[org]} to see it: locked modules show "Upgrade" in the navigation, and the server refuses them.\n`);
