import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PROFILES, Id } from '../../contracts/src/index.ts';

export const runtimeRoles = ['orvia_app', 'orvia_staff_auth', 'orvia_principal_auth'] as const;
export type RuntimeRole = typeof runtimeRoles[number];
export function runtimeConfig() {
  const name = process.env.ORVIA_PROFILE ?? 'codex-a00';
  if (!Object.hasOwn(PROFILES, name)) throw new Error('Unknown synthetic profile');
  const profile = name as keyof typeof PROFILES;
  const directory = resolve(process.env.ORVIA_WORKSPACE_ROOT ?? process.cwd(), '.local/profiles', profile);
  const identity = JSON.parse(readFileSync(resolve(directory, 'config.json'), 'utf8'));
  if (identity.profile !== profile || identity.fixture_id !== 'bootstrap-probe-v1') throw new Error('Profile identity mismatch');
  const installation_id = Id.parse(identity.installation_id);
  const secret = (file: string) => {
    const value = readFileSync(resolve(directory, 'auth', file), 'utf8').trim();
    if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('Invalid local auth credential');
    return value;
  };
  return { ...PROFILES[profile], profile, installation_id, directory, secret,
    origin: `${profile==='rehearsal'?'https':'http'}://127.0.0.1:${PROFILES[profile].app_port}` };
}
export type RuntimeConfig = ReturnType<typeof runtimeConfig>;
