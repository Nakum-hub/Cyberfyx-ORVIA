import {connectDatabase} from '../../database/customer/src/index.ts';
import {loadProfile} from '../../shared/testing/src/config.ts';
import {writeEvidence} from '../../shared/testing/src/evidence.ts';
const phase=process.argv[2];
if(!['before-final-run','after-final-run'].includes(phase??''))throw new Error('Named observation phase required');
const profile=loadProfile();
if(!['codex-a00','rehearsal'].includes(profile.profile))throw new Error('Owned customer fixture profiles only');
const pool=connectDatabase(profile).pool;
try {
 const tx=await pool.connect();
 try {
  await tx.query('BEGIN READ ONLY');
  const identity=(await tx.query('SELECT installation_id,profile FROM bootstrap_profile WHERE singleton=1')).rows[0];
  if(identity.installation_id!==profile.installation_id||identity.profile!==profile.profile)throw new Error('Fixture identity mismatch');
  const outbox=(await tx.query(`SELECT tenant_id,legal_entity_id,environment_id,count(*)::int total,count(*) FILTER(WHERE dispatched_at IS NULL)::int pending,min(created_at) FILTER(WHERE dispatched_at IS NULL) oldest_pending FROM app.outbox_events GROUP BY 1,2,3 ORDER BY 1,2,3`)).rows;
  const reconciliations=(await tx.query(`SELECT count(*)::int total,count(*) FILTER(WHERE dispatched_at IS NULL)::int pending FROM app.reconciliations`)).rows[0];
  const workflows=(await tx.query('SELECT state,count(*)::int total FROM app.workflows GROUP BY state ORDER BY state')).rows;
  await tx.query('COMMIT');
  const report={phase,profile:profile.profile,installation_id:identity.installation_id,outbox,reconciliations,workflows,dispatcher_batch:20,note:'Read-only snapshot. No row, marker, event, restriction or history was reset.'};
  console.log(JSON.stringify(report));writeEvidence('round-ten-outbox-state',report);
 }finally{tx.release();}
}finally{await pool.end();}
