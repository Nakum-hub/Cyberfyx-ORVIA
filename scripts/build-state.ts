/**
 * Deterministic "is the production web build current?" test.
 *
 * The rehearsal profile serves the Next production build through the local
 * HTTPS entry point, so an operator command that starts the application has to
 * know whether that build still corresponds to the source on disk. A timestamp
 * comparison is not good enough: checking out an older branch, or restoring a
 * file, moves mtimes in directions that do not describe the build.
 *
 * So the identity is content-based, over exactly the inputs Next compiles from,
 * and it deliberately includes untracked files: a component that exists only in
 * the working tree is still compiled into the build being served.
 *
 * The recorded marker lives in the protected profile directory rather than in
 * `.next`, so a partially deleted build cannot be mistaken for a current one.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { writePrivateJson } from './local-private.ts';

/** Prefixes whose contents are compiled into, or resolved by, the web build. */
const BUILD_INPUT_PREFIXES = ['frontend/', 'backend/', 'database/', 'connectors/', 'shared/', 'services/', 'tracking/'];
const BUILD_INPUT_FILES = ['pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json'];
const IGNORED = /(^|\/)(node_modules|\.next)\//;

export function buildInputIdentity() {
  const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', windowsHide: true });
  const paths = [...new Set(listed.split(/\r?\n/).filter(Boolean))]
    .filter(path => !IGNORED.test(path))
    .filter(path => BUILD_INPUT_FILES.includes(path) || BUILD_INPUT_PREFIXES.some(prefix => path.startsWith(prefix)))
    .filter(path => existsSync(path))
    .sort();
  const files = paths.map(path => ({ path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }));
  return { files: files.length, sha256: createHash('sha256').update(JSON.stringify(files)).digest('hex') };
}

const markerPath = (directory: string) => resolve(directory, 'web-build.json');
const buildIdPath = () => resolve('frontend/.next/BUILD_ID');

/**
 * True when the existing build was produced from exactly these inputs. A missing
 * build, a missing marker, or any input change returns false so the caller
 * rebuilds rather than serving a stale bundle.
 */
export function webBuildCurrent(directory: string, identity = buildInputIdentity()) {
  if (!existsSync(buildIdPath()) || !existsSync(markerPath(directory))) return false;
  try {
    const marker = JSON.parse(readFileSync(markerPath(directory), 'utf8')) as { build_id?: string; inputs_sha256?: string };
    return marker.inputs_sha256 === identity.sha256 && marker.build_id === readFileSync(buildIdPath(), 'utf8').trim();
  } catch { return false; }
}

/** Record the identity of a build that has just completed. Never called on failure. */
export function recordWebBuild(directory: string, identity = buildInputIdentity()) {
  if (!existsSync(buildIdPath())) throw new Error('No production build to record');
  writePrivateJson(markerPath(directory), { build_id: readFileSync(buildIdPath(), 'utf8').trim(), inputs_sha256: identity.sha256, input_files: identity.files, recorded_at: new Date().toISOString() });
}
