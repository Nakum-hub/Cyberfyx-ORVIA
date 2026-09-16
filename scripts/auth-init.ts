import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { loadProfile } from '../packages/testing/src/config.ts';
import { runtimeRoles } from '../packages/auth/src/config.ts';
import { connectDatabase } from '../packages/db/src/index.ts';
import { privateDirectory } from './local-private.ts';
import { safeError } from '../packages/testing/src/evidence.ts';

const profile = loadProfile();
if (process.argv[2] !== `confirm:${profile.profile}`) throw new Error('Named synthetic profile confirmation required');
const directory = resolve(profile.directory, 'auth');
privateDirectory(directory);
for (const name of [...runtimeRoles.map(role => `${role}-password`), 'staff-secret', 'principal-secret']) {
  const path = resolve(directory, name);
  if (!existsSync(path)) writeFileSync(path, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 });
}
const { pool } = connectDatabase(profile);
try {
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN'); await tx.query('SELECT pg_advisory_xact_lock(728101)');
    const identity = await tx.query('SELECT installation_id,profile FROM bootstrap_profile WHERE singleton=1');
    if (identity.rows[0]?.installation_id !== profile.installation_id || identity.rows[0]?.profile !== profile.profile) throw new Error('Profile mismatch');
    const migration = await tx.query("SELECT 1 FROM bootstrap_migrations WHERE id='0001_auth_scope'");
    if (migration.rowCount !== 1) throw new Error('Run the versioned migrations first');
    for (const role of runtimeRoles) {
      const password = readFileSync(resolve(directory, `${role}-password`), 'utf8');
      if (!/^[a-f0-9]{64}$/.test(password)) throw new Error('Invalid local credential');
      const exists = await tx.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role]);
      // Role identifiers are a compiled allowlist; password is generated hex only.
      // Never serialize database errors from this operator command.
      if (!exists.rowCount) await tx.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${password}'`);
      else {
        const unsafe = await tx.query('SELECT 1 FROM pg_roles WHERE rolname=$1 AND (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole)', [role]);
        if (unsafe.rowCount) throw new Error('Existing runtime role has unsafe privileges');
      }
    }
    await tx.query('GRANT USAGE ON SCHEMA app TO orvia_app');
    await tx.query('GRANT SELECT ON app.organisations,app.legal_entities,app.environments,app.principal_references,app.audit_events,app.idempotency_records TO orvia_app');
    await tx.query('GRANT INSERT ON app.principal_references,app.audit_events,app.idempotency_records TO orvia_app');
    await tx.query('GRANT INSERT ON app.request_audit TO orvia_app');
    await tx.query('GRANT SELECT,INSERT ON app.purpose_versions,app.notice_versions,app.policy_versions,app.policy_systems,app.systems,app.target_mappings,app.publication_proofs,app.policy_approvals,app.consent_aggregates,app.consent_interactions,app.consent_events,app.workflows,app.outbox_events TO orvia_app');
    await tx.query('GRANT UPDATE ON app.purpose_versions,app.notice_versions,app.policy_versions,app.publication_proofs,app.consent_aggregates,app.consent_interactions TO orvia_app');
    await tx.query('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO orvia_app');
    for (const [schema, role] of [['staff_auth', 'orvia_staff_auth'], ['principal_auth', 'orvia_principal_auth']]) {
      await tx.query(`GRANT USAGE ON SCHEMA ${schema} TO ${role}`);
      for (const table of ['user', 'session', 'account', 'verification', 'twoFactor', 'rateLimit']) {
        await tx.query(`GRANT SELECT,INSERT,UPDATE,DELETE ON ${schema}."${table}" TO ${role}`);
      }
      await tx.query(`GRANT SELECT ON ${schema}.authority TO ${role}`);
      await tx.query(`GRANT INSERT ON ${schema}.auth_audit TO ${role}`);
    }
    await tx.query('GRANT SELECT,INSERT,UPDATE ON staff_auth.mfa_sessions TO orvia_staff_auth');
    await tx.query('COMMIT');
    console.log('Runtime roles provisioned; generated credentials remain in the protected local auth directory.');
  } catch (error) { await tx.query('ROLLBACK'); throw error; } finally { tx.release(); }
} catch (error) { console.error(safeError(error)); process.exitCode = 1; } finally { await pool.end(); }
