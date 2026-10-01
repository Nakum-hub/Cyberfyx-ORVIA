// Renew existing synthetic workers only. No role/grant, key, token, active-state,
// target or customer record changes; production enrollment remains setup-owned.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadProfile} from '../../shared/testing/src/config.ts';
import {connectDatabase} from '../../database/customer/src/index.ts';
import {WorkerEnrollment} from '../../backend/auth/src/machine-profile.ts';
import {writePrivateJson} from '../../scripts/local-private.ts';
const profile=loadProfile();
assert.equal(profile.profile,'codex-a00');
assert.equal(process.argv[2],'confirm:codex-a00');
const path=resolve(profile.directory,'worker/enrollment.json');
const original=WorkerEnrollment.parse(JSON.parse(readFileSync(path,'utf8')));
assert.equal(original.installation_id,profile.installation_id);
const next=structuredClone(original);const expires_at=new Date(Date.now()+3600000).toISOString();
const pool=connectDatabase(profile).pool;const tx=await pool.connect();
try {
 await tx.query('BEGIN');await tx.query('SELECT pg_advisory_xact_lock(728103)');
 const acl=(await tx.query("SELECT oid,proacl FROM pg_proc WHERE pronamespace='app'::regnamespace ORDER BY oid")).rows;
 for(const identity of next.identities) {
  assert.equal(identity.kind,'WORKER');
  const {scope}=identity;
  const r=await tx.query(`UPDATE machine_auth.identities SET expires_at=$7 WHERE id=$1 AND installation_id=$2 AND tenant_id=$3 AND legal_entity_id=$4 AND environment_id=$5 AND kind=$6 AND active AND token_digest IS NULL RETURNING id`,[identity.id,profile.installation_id,scope.tenant_id,scope.legal_entity_id,scope.environment_id,'WORKER',expires_at]);
  assert.equal(r.rowCount,1,'Existing active fixture identity must match');identity.expires_at=expires_at;
 }
 assert.deepEqual((await tx.query("SELECT oid,proacl FROM pg_proc WHERE pronamespace='app'::regnamespace ORDER BY oid")).rows,acl);
 writePrivateJson(path,next);await tx.query('COMMIT');
 console.log(`Renewed ${next.identities.length} existing synthetic workers for the normal one-hour fixture period; function ACLs unchanged.`);
}catch(error){await tx.query('ROLLBACK');writePrivateJson(path,original);throw error;}
finally {tx.release();await pool.end();}
