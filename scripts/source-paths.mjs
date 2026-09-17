/**
 * The single definition of the qualified source inventory.
 *
 * Qualified source is every **tracked** path outside the evidence and document
 * trees. That set is exactly the inventory recorded in
 * artifacts/release-manifest.json, so a candidate identity, an engineering
 * evidence record and a browser qualification record all describe the same
 * thing.
 *
 * Untracked paths are deliberately excluded. Including them made an unrelated
 * scratch or report file in the working tree change the recorded source
 * identity and set `dirty`, which destroyed the meaning of both. A genuinely
 * new source file is qualified once it is tracked, which is also when it can
 * belong to a candidate.
 */
export const EXCLUDED_PREFIXES = ['handoffs/', 'artifacts/', 'docs/'];

/**
 * Live state documents. These record where the programme has got to — the
 * candidate row, gate statuses, the acceptance board — and they change every
 * time a gate moves. Keeping them inside the candidate identity made that
 * identity circular: recording a result about a candidate altered the very
 * inventory the result named, so no candidate could ever describe itself.
 *
 * They are excluded from the *source* identity and hashed separately as gate
 * state by scripts/package-candidate.ts, so they stay fully traceable without
 * being able to invalidate a frozen candidate. The code that validates them
 * (scripts/tracking.ts and its unit tests) is qualified source and is checked at
 * qualification time against whatever the live board actually contains.
 *
 * Only the gate board itself qualifies. `tracking/capabilities.json` is imported
 * by the capability register screen and `tracking/contract_seed.json` is emitted
 * and checked by contract generation, so both are runtime source: the container
 * build context is assembled from this same inventory and fails without them.
 */
export const LIVE_STATE_FILES = [
  'CURRENT_STATE.md', 'README.md', 'README_START_HERE.md', 'AGENTS.md',
  'tracking/tasks.json', 'tracking/acceptance.json',
];

/** True when a repository-relative path belongs to the qualified runtime inventory. */
export function isQualifiedSource(path) {
  return Boolean(path)
    && !EXCLUDED_PREFIXES.some(prefix => path.startsWith(prefix))
    && !LIVE_STATE_FILES.includes(path);
}

/** Live gate/state paths, hashed separately from the candidate source identity. */
export function liveStatePaths(lsFilesOutput) {
  const all = lsFilesOutput.split(/\r?\n/).filter(Boolean);
  return [...new Set(all.filter(p => LIVE_STATE_FILES.includes(p)))].sort();
}

/** Qualified paths from `git ls-files --cached` output, sorted and de-duplicated. */
export function qualifiedSourcePaths(lsFilesOutput) {
  return [...new Set(lsFilesOutput.split(/\r?\n/).filter(isQualifiedSource))].sort();
}

/**
 * True when a qualified source path is modified, staged or deleted relative to
 * HEAD, or when an untracked file sits inside the qualified tree. Evidence,
 * artifact and document churn no longer reports the source as dirty.
 */
export function qualifiedDirty(porcelainOutput) {
  return porcelainOutput.split(/\r?\n/).some(line => {
    if (!line.trim()) return false;
    const path = line.slice(3).split(' -> ').at(-1)?.replace(/^"|"$/g, '');
    return isQualifiedSource(path);
  });
}
