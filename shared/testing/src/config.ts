import { readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { z } from 'zod';
import { PROFILES } from '../../contracts/src/index.ts';
export const ProfileName = z.enum(['codex-a00', 'ui-b00', 'rehearsal']);
export const ProfileConfig = z.strictObject({ profile: ProfileName, installation_id: z.uuid(), fixture_id: z.literal('bootstrap-probe-v1'), created_at: z.iso.datetime() });
export function loadProfile(name = process.env.ORVIA_PROFILE ?? 'codex-a00') {
  const profile = ProfileName.parse(name);
  const directory = resolve('.local', 'profiles', profile);
  const config = ProfileConfig.parse(JSON.parse(readFileSync(resolve(directory, 'config.json'), 'utf8')));
  if (config.profile !== profile) throw new Error('Profile identity mismatch');
  const password = readFileSync(resolve(directory, 'postgres-password'), 'utf8').trim();
  if (!/^[a-f0-9]{64}$/.test(password)) throw new Error('Invalid locally generated credential');
  return { ...config, ...PROFILES[profile], directory, password };
}
export function safeArtifactPath(path: string) {
  const root = resolve('handoffs/codex/artifacts');
  const actual = resolve(path);
  if (!actual.startsWith(root + sep)) throw new Error('Artifact path outside lane directory');
  return actual;
}
