// Explicit manifest staging only; no commit, push, runtime or directory walk.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = realpathSync(fileURLToPath(new URL('../../', import.meta.url)));
assert.equal(realpathSync(process.cwd()), root);
const [manifestPath, scanPath] = process.argv.slice(2);
assert.equal(process.argv.length, 4);
function checked(path) {
  assert.ok(typeof path === 'string' && /^(handoffs\/|output\/playwright\/round8\/)/.test(path));
  assert.ok(!/[\x00-\x1f:]/.test(path) && !path.split('/').some(p => !p || p === '.' || p === '..'));
  assert.ok(!/(^|\/)(\.local|node_modules|\.next|build|dist|credentials|signing|profiles)(\/|$)|\.(pem|key|pfx|p12)$/i.test(path));
  const absolute = resolve(root, path);
  assert.equal(relative(root, absolute).split(sep).join('/'), path);
  assert.equal(realpathSync(absolute), absolute);
  assert.ok(lstatSync(absolute).isFile() && !lstatSync(absolute).isSymbolicLink());
  return absolute;
}
function git(args, options = {}) {
  const result = spawnSync('git', args, { windowsHide: true, maxBuffer: 32 * 1024 * 1024, ...options });
  assert.equal(result.status, 0, `Git operation failed: ${args[0]}`);
  return result.stdout;
}
assert.equal(git(['branch', '--show-current']).toString().trim(), 'codex/round8');
assert.equal(git(['rev-parse', 'HEAD']).toString().trim(), 'f07cf733bfb22ad958ef4a5b3ba345b90fd43af6');
assert.equal(git(['diff', '--cached', '--name-only']).length, 0, 'Existing index must be empty');
const scan = JSON.parse(readFileSync(checked(scanPath), 'utf8'));
assert.deepEqual(Object.keys(scan).sort(), ['diagnostic_only','scope','files_checked','bytes_checked','private_header_count','known_private_material_count','files','unscanned_files','exit_code'].sort());
assert.equal(scan.diagnostic_only, true);
assert.equal(scan.scope, 'explicit publication manifest; listed nested files only');
assert.ok(Number.isSafeInteger(scan.bytes_checked) && scan.bytes_checked >= 0 && scan.bytes_checked <= 512 * 1024 * 1024);
assert.equal(scan.files_checked, scan.files.length);
for (const file of scan.files) {
  assert.deepEqual(Object.keys(file).sort(), ['filename','private_header_count','known_private_material_count'].sort());
  checked(file.filename);
  assert.equal(file.private_header_count, 0); assert.equal(file.known_private_material_count, 0);
}
assert.equal(scan.exit_code, 0);
assert.equal(scan.private_header_count, 0);
assert.equal(scan.known_private_material_count, 0);
assert.deepEqual(scan.unscanned_files, []);
const paths = readFileSync(checked(manifestPath), 'utf8').trim().split(/\r?\n/);
assert.ok(paths.length > 0 && paths.length <= 10000);
assert.equal(new Set(paths).size, paths.length);
const scanned = new Set(scan.files.map(file => typeof file === 'string' ? file : file.filename));
const historicalEmptyPngs = [];
const fixedMetadata = {
  sBIT: { length: 4, sha256: '918bd027f59087bef8e055f9b587b25486d58c606d8658d4ce7b1199274f6744' },
  iCCP: { length: 260, sha256: 'de0aeedb87da585b71c24b6d823642529ad5fd0427403f1ca7efa2f0543c6204' },
};
for (const path of paths) {
  checked(path);
  assert.ok(path.endsWith('.png') || path === scanPath || scanned.has(path), `Unscanned publication text: ${path}`);
  if (path.endsWith('.png')) {
    const bytes = readFileSync(checked(path));
    if (path === 'output/playwright/round8/matrix-final-eta/webkit/customer-owner-desktop-workspace_registry_retention.png' && bytes.length === 0) {
      historicalEmptyPngs.push(path); continue; // Retained failed placeholder, never valid fresh PNG evidence.
    }
    assert.ok(bytes.length >= 45 && bytes.length <= 64 * 1024 * 1024);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    let offset = 8, chunks = 0, ended = false;
    while (offset < bytes.length) {
      assert.ok(offset + 12 <= bytes.length);
      const length = bytes.readUInt32BE(offset), kind = bytes.toString('ascii', offset + 4, offset + 8);
      assert.ok(offset + 12 + length <= bytes.length);
      if (Object.hasOwn(fixedMetadata, kind)) {
        const fixed = fixedMetadata[kind];
        assert.equal(length, fixed.length);
        assert.equal(createHash('sha256').update(bytes.subarray(offset + 8, offset + 8 + length)).digest('hex'), fixed.sha256, 'Unreviewed PNG colour metadata');
      } else {
        assert.ok(['IHDR','IDAT','IEND','sRGB','gAMA','pHYs','cHRM','bKGD','PLTE','tRNS'].includes(kind), 'Unexpected PNG metadata chunk');
      }
      if (!chunks++) assert.equal(kind, 'IHDR');
      offset += 12 + length;
      if (kind === 'IEND') { assert.equal(length, 0); ended = true; break; }
    }
    assert.ok(ended && offset === bytes.length, 'PNG missing final chunk or trailing bytes');
  }
}
git(['--literal-pathspecs', 'add', '--pathspec-from-file=-', '--pathspec-file-nul'], { input: Buffer.from(paths.join('\0') + '\0') });
const index = new Map(git(['ls-files', '--stage', '-z']).toString('utf8').split('\0').filter(Boolean).map(row => {
  const match = /^(\d+) ([a-f0-9]{40}) (\d)\t(.+)$/.exec(row);
  assert.ok(match); return [match[4], { mode: match[1], oid: match[2], stage: match[3] }];
}));
for (const path of paths) {
  const bytes = readFileSync(checked(path));
  const oid = createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
  const record = index.get(path);
  assert.ok(record && record.stage === '0' && ['100644', '100755'].includes(record.mode));
  assert.equal(record.oid, oid, `Staged bytes differ: ${path}`);
}
const staged = git(['diff', '--cached', '--name-only', '-z']).toString('utf8').split('\0').filter(Boolean);
assert.ok(staged.length > 0 && staged.every(path => paths.includes(path)), 'Unexpected staged path');
process.stdout.write(JSON.stringify({ staged_paths: staged.length, selected_paths: paths.length, raw_blob_bytes_verified: true, historical_empty_failed_pngs: historicalEmptyPngs, exit_code: 0 }) + '\n');
