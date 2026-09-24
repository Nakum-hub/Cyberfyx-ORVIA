/**
 * Vendor-side regulatory package tooling (regulatory/DPDP_REGULATORY_CORE.md s5, s11-s12).
 *
 *   node --import tsx scripts/regulatory-package.ts retrieve confirm:official-download
 *     Downloads each official source artifact named in scripts/regulatory/dpdp-baseline.ts
 *     from its official Government of India URL into .local/regulatory-sources/, and records
 *     the retrieval time, byte length and SHA-256 beside it. Nothing is downloaded without the
 *     explicit confirmation argument.
 *
 *   node --import tsx scripts/regulatory-package.ts build <version> <effective-from-ISO> [previous-version]
 *     Builds a PRODUCTION package from the baseline and the retrieved artifacts and signs it with
 *     the release key (ORVIA_RELEASE_KEY_ID / ORVIA_RELEASE_PRIVATE_KEY). It refuses to build if
 *     any source has not been retrieved and hashed: a production package never carries an
 *     unverified source. Output: artifacts/regulatory/dpdp-package-<version>.json.
 */
import { createHash, sign } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { RegulatoryPackageClaims, isOfficialSourceUrl } from '../shared/contracts/src/regulatory.ts';
import { canonicalJson } from '../shared/contracts/src/crypto.ts';
import { officialSources, provisions, requirements, conditionVocabulary, openVerificationItems } from './regulatory/dpdp-baseline.ts';

const directory = resolve('.local', 'regulatory-sources');
const [command, ...args] = process.argv.slice(2);

type Retrieval = { source_id: string; official_url: string; retrieved_at: string; bytes: number; sha256: string };

async function retrieve() {
  if (args[0] !== 'confirm:official-download') throw new Error('Retrieval downloads official artifacts; run with confirm:official-download.');
  mkdirSync(directory, { recursive: true });
  for (const source of officialSources) {
    if (!isOfficialSourceUrl(source.official_url)) throw new Error(`${source.source_id} is not on an official host`);
    const response = await fetch(source.official_url, { signal: AbortSignal.timeout(60000), redirect: 'error', headers: { 'user-agent': 'ORVIA regulatory package builder' } });
    if (!response.ok) throw new Error(`${source.source_id}: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw new Error(`${source.source_id}: the official URL did not return a PDF`);
    const record: Retrieval = { source_id: source.source_id, official_url: source.official_url, retrieved_at: new Date().toISOString(), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
    writeFileSync(resolve(directory, `${source.source_id}.pdf`), bytes);
    writeFileSync(resolve(directory, `${source.source_id}.json`), JSON.stringify(record, null, 2) + '\n');
    console.log(`${source.source_id}: ${record.bytes} bytes, sha256 ${record.sha256}`);
  }
}

function build() {
  const [version, effectiveFrom, previous] = args;
  if (!version || !/^\d+\.\d+\.\d+$/.test(version) || !effectiveFrom || Number.isNaN(Date.parse(effectiveFrom))) throw new Error('Usage: build <version> <effective-from-ISO> [previous-version]');
  const keyId = process.env.ORVIA_RELEASE_KEY_ID; const privateKey = process.env.ORVIA_RELEASE_PRIVATE_KEY;
  if (!keyId || !privateKey) throw new Error('Signing needs ORVIA_RELEASE_KEY_ID and ORVIA_RELEASE_PRIVATE_KEY.');
  const missing: string[] = [];
  const sources = officialSources.map(source => {
    const sidecar = resolve(directory, `${source.source_id}.json`); const artifact = resolve(directory, `${source.source_id}.pdf`);
    if (!existsSync(sidecar) || !existsSync(artifact)) { missing.push(source.source_id); return null; }
    const record = JSON.parse(readFileSync(sidecar, 'utf8')) as Retrieval;
    const actual = createHash('sha256').update(readFileSync(artifact)).digest('hex');
    if (actual !== record.sha256 || record.official_url !== source.official_url) throw new Error(`${source.source_id}: artifact does not match its retrieval record`);
    return { ...source, artifact_digest: record.sha256, retrieved_at: record.retrieved_at, verification: 'ARTIFACT_HASHED' as const };
  });
  if (missing.length) throw new Error(`Refusing to build a production package: not retrieved and hashed: ${missing.join(', ')}. Run retrieve first.`);
  const now = new Date();
  const claims = RegulatoryPackageClaims.parse({
    package_id: randomUUID(), version, previous_version: previous ?? null, audience: 'ORVIA_CUSTOMER_INSTALLATION', distribution: 'PRODUCTION',
    effective_from: new Date(effectiveFrom).toISOString(), created_at: now.toISOString(), sources,
    provisions: provisions.map(p => ({ ...p, version: 1, published_on: p.source_id === 'DPDP-ACT-2023' ? '2023-08-11' : '2025-11-13', status: Date.parse(p.commences_on) <= now.getTime() ? 'IN_FORCE' : 'NOT_COMMENCED', text_digest: null })),
    requirements: requirements.map(r => ({ ...r, version: 1, effective_from: r.provision_ids.map(id => provisions.find(p => p.provision_id === id)!.commences_on).sort().at(-1)! })),
    condition_vocabulary: conditionVocabulary,
    release_notes: ['Baseline package authored from the DPDP Act, 2023, G.S.R. 843(E), G.S.R. 844(E) and the DPDP Rules, 2025.'],
    open_verification_items: openVerificationItems,
  });
  const signature = sign(null, Buffer.from(canonicalJson(claims)), { key: Buffer.from(privateKey, 'base64'), format: 'der', type: 'pkcs8' }).toString('base64url');
  mkdirSync('artifacts/regulatory', { recursive: true });
  const path = `artifacts/regulatory/dpdp-package-${version}.json`;
  writeFileSync(path, JSON.stringify({ package: { algorithm: 'Ed25519', claims, signing_key_id: keyId, signature } }, null, 2) + '\n', { flag: 'wx' });
  console.log(`Signed PRODUCTION package ${version}: ${path}`);
}

if (command === 'retrieve') await retrieve();
else if (command === 'build') build();
else throw new Error('Use: retrieve confirm:official-download | build <version> <effective-from-ISO> [previous-version]');
