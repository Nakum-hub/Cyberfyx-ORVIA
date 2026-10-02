import { mkdir, readdir, lstat, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Context } from '../../../backend/domain/src/shared/transaction.ts';
import { scopeValues } from '../../../backend/domain/src/shared/transaction.ts';
import { stageFile, inboxFolderFor } from '../../../backend/domain/src/onboarding/file-intake.ts';
import { licenceCovers } from '../../../backend/domain/src/licensing/licensing.ts';
import { FILE_INTAKE_MAX_BYTES } from '../../../shared/contracts/src/file-intake.ts';

/**
 * Automatic file intake (revision 1.12). Each scope has a folder on the installation server, <root>/<environment id>/incoming.
 * The customer's own systems or scheduled exports drop files there. This sweep stages each complete file (nothing in it is
 * applied: a staff member approves it in Files), then moves it to accepted/ or, if it cannot even be staged, to rejected/
 * with a .reason.txt beside it. Only regular files are read: links, folders, hidden and partial files (.part, .tmp,
 * .crdownload) are left alone, and a file modified in the last few seconds is treated as still being written. Nothing is
 * fetched from anywhere: the folder is the only source, and no file is ever deleted.
 */
const SETTLE_MS = 5_000;
const PER_SWEEP = 20;
const partial = (name: string) => name.startsWith('.') || /\.(part|tmp|crdownload|partial)$/i.test(name) || name.endsWith('~');
const stamp = (now: number) => new Date(now).toISOString().replace(/[:.]/g, '-');

export async function sweepFileInbox(scoped: <T>(id: string, work: (c: Context) => Promise<T>) => Promise<T>, workerIds: readonly string[], root: string | null, now: () => number = Date.now) {
  if (!root) return 0;
  let staged = 0;
  for (const id of workerIds) {
    // Which scope this worker identity serves, and whether the plan covers intake (every plan does; no licence, no intake).
    const scope = await scoped(id, async c => (await licenceCovers(c, 'PRIVACY_GRAPH')) ? scopeValues(c.actor) : null);
    if (!scope) continue;
    const incoming = inboxFolderFor(root, scope[2]!)!;
    const base = join(incoming, '..');
    await mkdir(incoming, { recursive: true, mode: 0o750 });
    await mkdir(join(base, 'accepted'), { recursive: true, mode: 0o750 });
    await mkdir(join(base, 'rejected'), { recursive: true, mode: 0o750 });
    const entries = (await readdir(incoming, { withFileTypes: true })).filter(e => !partial(e.name)).slice(0, PER_SWEEP);
    for (const entry of entries) {
      const path = join(incoming, entry.name);
      const info = await lstat(path).catch(() => null);
      if (!info || !info.isFile() || info.isSymbolicLink()) continue;
      if (now() - info.mtimeMs < SETTLE_MS) continue;
      const target = `${stamp(now())}-${entry.name}`;
      if (info.size < 1 || info.size > FILE_INTAKE_MAX_BYTES) {
        await rename(path, join(base, 'rejected', target));
        await writeFile(join(base, 'rejected', `${target}.reason.txt`), info.size < 1 ? 'Empty file.\n' : `Larger than ${FILE_INTAKE_MAX_BYTES} bytes. Split the export and drop the parts.\n`);
        continue;
      }
      const bytes = await readFile(path);
      await scoped(id, c => stageFile(c, 'INBOX_FOLDER', entry.name, bytes));
      // Staged (or already staged: same content) before the file moves, so a crash between the two re-stages nothing new.
      await rename(path, join(base, 'accepted', target));
      staged++;
    }
  }
  return staged;
}
