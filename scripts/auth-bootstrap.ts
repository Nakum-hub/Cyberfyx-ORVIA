import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { hashPassword } from '../packages/auth/src/bootstrap-password.ts';
import { loadProfile } from '../packages/testing/src/config.ts';
import { connectDatabase } from '../packages/db/src/index.ts';
import { safeError } from '../packages/testing/src/evidence.ts';
import { privateDirectory, writePrivateJson } from './local-private.ts';

export type FixtureUser = { id: string; email: string; password: string; domain: 'staff' | 'principal'; role: string; principal_id?: string; totp_uri?: string; scope: { tenant_id: string; legal_entity_id: string; environment_id: string } };
export type AuthFixture = { fixture_id: 'aster-birch-v1'; installation_id: string; users: Record<string, FixtureUser> };
const profile = loadProfile();
const mode = process.argv[2];
if (!['owner', 'fixtures'].includes(mode ?? '') || process.argv[3] !== `confirm:${profile.profile}`) throw new Error('Use owner|fixtures with named profile confirmation');
const directory = resolve(profile.directory, 'auth'); privateDirectory(directory);
const path = resolve(directory, 'bootstrap.json');
let fixture: AuthFixture;
if (existsSync(path)) fixture = JSON.parse(readFileSync(path, 'utf8'));
else {
  const scope = { tenant_id: randomUUID(), legal_entity_id: randomUUID(), environment_id: randomUUID() };
  fixture = { fixture_id: 'aster-birch-v1', installation_id: profile.installation_id, users: {
    owner: { id: randomUUID(), email: `owner.${randomUUID()}@aster.example`, password: randomBytes(32).toString('hex'), domain: 'staff', role: 'ORG_SUPER_ADMIN', scope },
  } };
  writeFileSync(path, JSON.stringify(fixture, null, 2), { flag: 'wx', mode: 0o600 });
}
if (fixture.fixture_id !== 'aster-birch-v1' || fixture.installation_id !== profile.installation_id) throw new Error('Fixture identity mismatch');
if (mode === 'fixtures' && !fixture.users.birch) {
  const aster = fixture.users.owner!.scope;
  const sibling = { ...aster, environment_id: randomUUID() };
  const birch = { tenant_id: randomUUID(), legal_entity_id: randomUUID(), environment_id: randomUUID() };
  for (const [name, domain, role, scope] of [
    ['admin','staff','ORG_ADMIN',aster], ['auditor','staff','AUDITOR',aster], ['member','staff','MEMBER',aster],
    ['reviewer','staff','ORG_SUPER_ADMIN',aster], ['birch','staff','ORG_SUPER_ADMIN',birch], ['sibling','staff','ORG_SUPER_ADMIN',sibling],
    ['alice','principal','DATA_PRINCIPAL',aster], ['bob','principal','DATA_PRINCIPAL',aster], ['birch_principal','principal','DATA_PRINCIPAL',birch],
  ] as const) fixture.users[name] = { id: randomUUID(), email: `${name}.${randomUUID()}@${name.startsWith('birch') ? 'birch' : 'aster'}.example`,
    password: randomBytes(32).toString('hex'), domain, role, scope, ...(domain === 'principal' ? { principal_id: randomUUID() } : {}) };
  // Persist the credential journal first. Transaction interruption can resume
  // with the same IDs and credentials, without granting a partial owner.
  writePrivateJson(path,fixture);
}
const { pool } = connectDatabase(profile);
try {
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN'); await tx.query('SELECT pg_advisory_xact_lock(728102)');
    const identity = await tx.query('SELECT installation_id,profile FROM bootstrap_profile WHERE singleton=1');
    if (identity.rows[0]?.installation_id !== profile.installation_id || identity.rows[0]?.profile !== profile.profile) throw new Error('Database identity mismatch');
    for (const [name, user] of Object.entries(fixture.users)) {
      const { tenant_id: t, legal_entity_id: l, environment_id: e } = user.scope;
      await tx.query('INSERT INTO app.organisations (id,name) VALUES ($1,$2) ON CONFLICT DO NOTHING', [t, name.startsWith('birch') ? 'Birch Demo' : 'Aster Demo']);
      await tx.query('INSERT INTO app.legal_entities VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [t,l,'Synthetic legal entity']);
      await tx.query('INSERT INTO app.environments VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [t,l,e,'Synthetic environment']);
      const schema = user.domain === 'staff' ? 'staff_auth' : 'principal_auth';
      const existing = await tx.query(`SELECT id,email FROM ${schema}."user" WHERE id=$1 OR email=$2`, [user.id,user.email]);
      if (existing.rowCount) {
        if (existing.rowCount !== 1 || existing.rows[0].id !== user.id || existing.rows[0].email !== user.email) throw new Error('Existing identity mismatch');
      } else {
        const passwordHash = await hashPassword(user.password);
        await tx.query(`INSERT INTO ${schema}."user" (id,name,email,"emailVerified") VALUES ($1,$2,$3,true)`, [user.id,`Synthetic ${name}`,user.email]);
        await tx.query(`INSERT INTO ${schema}.account (id,"accountId","providerId","userId",password) VALUES ($1,$2,'credential',$3,$4)`, [randomUUID(),user.id,user.id,passwordHash]);
      }
      if (user.domain === 'principal') {
        await tx.query('INSERT INTO app.principal_references VALUES ($1,$2,$3,$4,$5,$6,true) ON CONFLICT DO NOTHING', [t,l,e,user.principal_id,`Synthetic ${name}`,user.email]);
        await tx.query('INSERT INTO principal_auth.authority (user_id,tenant_id,legal_entity_id,environment_id,principal_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [user.id,t,l,e,user.principal_id]);
      } else await tx.query('INSERT INTO staff_auth.authority (user_id,tenant_id,legal_entity_id,environment_id,role) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING', [user.id,t,l,e,user.role]);
      await tx.query(`INSERT INTO app.audit_events (id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id)
        VALUES ($1,$2,$3,$4,$5,'MACHINE','protected-bootstrap.identity-checked',$6,$7)`, [randomUUID(),t,l,e,profile.installation_id,user.id,randomUUID()]);
    }
    await tx.query('COMMIT');
    console.log(`Protected ${mode} bootstrap committed. Credentials remain in local profile auth/bootstrap.json; no credential printed.`);
  } catch (error) { await tx.query('ROLLBACK'); throw error; } finally { tx.release(); }
} catch (error) { console.error(safeError(error)); process.exitCode = 1; } finally { await pool.end(); }
