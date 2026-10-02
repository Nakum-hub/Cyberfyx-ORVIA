import { mkdir, readdir, lstat, open, rename, writeFile } from 'node:fs/promises';
import { constants, type Stats } from 'node:fs';
import { join, resolve, parse, sep } from 'node:path';
import {randomUUID} from 'node:crypto';
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
const same=(a:Stats,b:Stats)=>a.dev===b.dev&&a.ino===b.ino&&a.isDirectory()===b.isDirectory();
async function directoryChain(path:string,create=false) {
  const absolute=resolve(path),volume=parse(absolute).root;let current=volume;
  const chain:{path:string;stat:Stats}[]=[];
  for(const part of absolute.slice(volume.length).split(sep).filter(Boolean)) {
    current=join(current,part);
    if(create)await mkdir(current,{mode:0o750}).catch((e:NodeJS.ErrnoException)=>{if(e.code!=='EEXIST')throw e;});
    const stat=await lstat(current);
    if(!stat.isDirectory()||stat.isSymbolicLink())throw new Error('Linked inbox directory refused');
    chain.push({path:current,stat});
  }
  return chain;
}
async function unchanged(chain:Awaited<ReturnType<typeof directoryChain>>) {
  for(const item of chain){const stat=await lstat(item.path);if(stat.isSymbolicLink()||!same(item.stat,stat))throw new Error('Inbox directory changed during sweep');}
}

export async function sweepFileInbox(scoped: <T>(id: string, work: (c: Context) => Promise<T>) => Promise<T>, workerIds: readonly string[], root: string | null, now: () => number = Date.now) {
  if (!root) return 0;
  let staged = 0;
  for (const id of workerIds) {
    // Which scope this worker identity serves, and whether the plan covers intake (every plan does; no licence, no intake).
    const scope = await scoped(id, async c => (await licenceCovers(c, 'PRIVACY_GRAPH')) ? scopeValues(c.actor) : null);
    if (!scope) continue;
    const incoming = inboxFolderFor(root, scope[2]!)!;
    const base = join(incoming, '..');
    const chain=await directoryChain(incoming,true);
    const accepted=await directoryChain(join(base,'accepted'),true),rejected=await directoryChain(join(base,'rejected'),true);
    const entries = (await readdir(incoming, { withFileTypes: true })).filter(e => !partial(e.name)).slice(0, PER_SWEEP);
    for (const entry of entries) {
      const path = join(incoming, entry.name);
      const info = await lstat(path).catch(() => null);
      if (!info || !info.isFile() || info.isSymbolicLink()) continue;
      if (now() - info.mtimeMs < SETTLE_MS) continue;
      await unchanged(chain);
      const target = `${stamp(now())}-${randomUUID()}-${entry.name}`;
      if (info.size < 1 || info.size > FILE_INTAKE_MAX_BYTES) {
        await unchanged(rejected);
        await rename(path, join(base, 'rejected', target));
        await writeFile(join(base, 'rejected', `${target}.reason.txt`), info.size < 1 ? 'Empty file.\n' : `Larger than ${FILE_INTAKE_MAX_BYTES} bytes. Split the export and drop the parts.\n`);
        continue;
      }
      const file=await open(path,constants.O_RDONLY|(process.platform==='win32'?0:constants.O_NOFOLLOW));
      let bytes:Buffer;
      try {
        const opened=await file.stat();await unchanged(chain);
        if(!opened.isFile()||!same(info,opened)||opened.size!==info.size||opened.mtimeMs!==info.mtimeMs)continue;
        const buffer=Buffer.alloc(info.size+1);let length=0;
        while(length<buffer.length){const read=await file.read(buffer,length,buffer.length-length,length);if(!read.bytesRead)break;length+=read.bytesRead;}
        const after=await file.stat(),leaf=await lstat(path);await unchanged(chain);
        if(length!==info.size||after.size!==info.size||after.mtimeMs!==info.mtimeMs||leaf.isSymbolicLink()||!same(info,leaf))continue;
        bytes=buffer.subarray(0,length);
      }finally{await file.close();}
      await scoped(id, c => stageFile(c, 'INBOX_FOLDER', entry.name, bytes));
      // Staged (or already staged: same content) before the file moves, so a crash between the two re-stages nothing new.
      await unchanged(chain);await unchanged(accepted);
      const leaf=await lstat(path);if(leaf.isSymbolicLink()||!same(info,leaf))continue;
      await rename(path, join(base, 'accepted', target));
      staged++;
    }
  }
  return staged;
}
