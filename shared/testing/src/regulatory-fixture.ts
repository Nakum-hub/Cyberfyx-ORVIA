import { randomUUID, sign } from 'node:crypto';
import { RegulatoryPackageClaims } from '../../contracts/src/regulatory.ts';
import { canonicalJson } from '../../contracts/src/crypto.ts';
import { provisions, requirements, conditionVocabulary } from '../../../scripts/regulatory/dpdp-baseline.ts';

/**
 * TEST_FIXTURE regulatory packages for automated suites.
 *
 * They reuse the baseline requirement structure but are labelled TEST_FIXTURE
 * throughout (distribution, sources and every evidence record derived from them),
 * carry fixture sources on a non-resolvable host, and move effective dates into
 * the past so in-force behaviour can be exercised before the real commencement.
 * The runtime accepts them only because they are signed by the fixture release
 * key the test installation trusts. They are never a production package.
 */
export type FixtureOptions = { version: string; previous_version: string | null; effective_from: string; requirement_effective_from: string;
  /** Replace or add requirement fields to model an amended package. */
  amend?: Record<string, Record<string, unknown>>; drop?: string[] };
export function fixturePackage(options: FixtureOptions) {
  const sources = [...new Set(provisions.map(p => p.source_id))].map(source_id => ({ source_id: `FIXTURE-${source_id}`, source_type: 'RULES' as const,
    publisher: 'Synthetic fixture publisher (not an official source)', title: `Fixture copy of ${source_id}`, official_url: `https://fixture.invalid/${source_id.toLowerCase()}`,
    notification_reference: null, publication_date: null, artifact_digest: null, retrieved_at: null, verification: 'TEST_FIXTURE' as const, supersedes: null, corrects: null }));
  const claims = RegulatoryPackageClaims.parse({
    package_id: randomUUID(), version: options.version, previous_version: options.previous_version, audience: 'ORVIA_CUSTOMER_INSTALLATION', distribution: 'TEST_FIXTURE',
    effective_from: options.effective_from, created_at: new Date().toISOString(), sources,
    provisions: provisions.map(p => ({ ...p, source_id: `FIXTURE-${p.source_id}`, version: 1, published_on: null, commences_on: options.requirement_effective_from, status: 'IN_FORCE', commencement_basis: 'Test fixture commencement.', text_digest: null })),
    requirements: requirements.filter(r => !(options.drop ?? []).includes(r.requirement_id)).map(r => ({ ...r, version: 1, effective_from: options.requirement_effective_from, ...(options.amend?.[r.requirement_id] ?? {}) })),
    condition_vocabulary: conditionVocabulary.filter(v => v.requirement_ids.every(id => !(options.drop ?? []).includes(id))),
    release_notes: ['TEST FIXTURE: synthetic package for automated validation only.'], open_verification_items: [],
  });
  return claims;
}
export function signFixture(claims: ReturnType<typeof fixturePackage>, keyId: string, privateKeyBase64: string) {
  const signature = sign(null, Buffer.from(canonicalJson(claims)), { key: Buffer.from(privateKeyBase64, 'base64'), format: 'der', type: 'pkcs8' }).toString('base64url');
  return { package: { algorithm: 'Ed25519' as const, claims, signing_key_id: keyId, signature } };
}
