import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, openSync, writeFileSync, fsyncSync, closeSync, renameSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

export function privateDirectory(path: string) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  if (process.platform === 'win32') {
    const user = execFileSync('whoami', { encoding: 'utf8', windowsHide: true }).trim();
    execFileSync('icacls', [path, '/inheritance:r', '/grant:r', `${user}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F'], { stdio: 'pipe', windowsHide: true });
  } else chmodSync(path, 0o700);
}

export function writePrivateJson(path: string, value: unknown) {
  const temporary = `${path}.${randomUUID()}.pending`;
  const fd = openSync(temporary, 'wx', 0o600);
  try { writeFileSync(fd, JSON.stringify(value,null,2)+'\n'); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary,path);
}
