/** WP14 / BUILD-14: local verification of one exported evidence JSON artifact.
 * No network, runtime database, customer credentials, or payload output. */
import { readFileSync, statSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Evidence } from '../shared/contracts/src/index.ts';
import { digest } from '../shared/contracts/src/crypto.ts';

const DIGEST = /^[a-f0-9]{64}$/;
const MAX_BYTES = 16 * 1024 * 1024;

function sameDigest(left: string, right: string) {
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

export function verifyEvidenceDocument(input: unknown, expectedDigest?: string) {
  if (expectedDigest !== undefined && !DIGEST.test(expectedDigest))
    throw new Error('Expected digest must be 64 lowercase hexadecimal characters');
  const parsed = Evidence.safeParse(input);
  if (!parsed.success) return {
    integrity_check_passed: false, schema_valid: false, embedded_digest_valid: false,
    reference_check: expectedDigest === undefined ? 'NOT_PROVIDED' : 'NOT_CHECKED',
    limitation: 'No conclusion about external effects or source authenticity.',
  } as const;
  const { integrity_digest, ...body } = parsed.data;
  const calculated = digest(body);
  const embeddedValid = sameDigest(integrity_digest, calculated);
  const referenceCheck = expectedDigest === undefined ? 'NOT_PROVIDED'
    : sameDigest(expectedDigest, calculated) ? 'MATCH' : 'MISMATCH';
  return {
    integrity_check_passed: embeddedValid && referenceCheck !== 'MISMATCH',
    schema_valid: true, embedded_digest_valid: embeddedValid,
    reference_check: referenceCheck,
    calculated_digest: calculated,
    limitation: 'A matching digest detects byte-equivalent canonical content relative to a separately trusted reference; it does not prove external effects, authorship, or prevent privileged rewriting.',
  } as const;
}

function main(args: string[]) {
  if (args.length !== 1 && args.length !== 3)
    throw new Error('Usage: verify-evidence <local-evidence.json> [--expected-digest <sha256>]');
  if (args.length === 3 && args[1] !== '--expected-digest')
    throw new Error('Usage: verify-evidence <local-evidence.json> [--expected-digest <sha256>]');
  const path = args[0]!;
  const size = statSync(path).size;
  if (size > MAX_BYTES) throw new Error('Evidence file exceeds the 16 MiB verifier limit');
  const bytes = readFileSync(path);
  if (bytes.byteLength > MAX_BYTES) throw new Error('Evidence file exceeds the 16 MiB verifier limit');
  const result = verifyEvidenceDocument(JSON.parse(bytes.toString('utf8')), args[2]);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  if (!result.integrity_check_passed) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(process.argv.slice(2)); }
  catch (error) {
    // File contents and paths can contain customer identifiers. The CLI keeps
    // its error output to a fixed category and never prints the supplied JSON.
    process.stderr.write(`${error instanceof SyntaxError ? 'Invalid JSON' : 'Unable to verify evidence file'}\n`);
    process.exitCode = 2;
  }
}
