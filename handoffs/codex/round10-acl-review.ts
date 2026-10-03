import {connectDatabase} from '../../database/customer/src/index.ts';
import {loadProfile} from '../../shared/testing/src/config.ts';
import {writeEvidence} from '../../shared/testing/src/evidence.ts';
const p=loadProfile();if(p.profile!=='codex-a00')throw new Error('Owned synthetic customer profile only');
const pool=connectDatabase(p).pool;
try {
 const rows=(await pool.query("SELECT rolname,has_function_privilege(rolname,'app.member_seats()','EXECUTE') AS may_execute FROM pg_roles WHERE rolname LIKE 'orvia_%' ORDER BY rolname")).rows;
 console.log(JSON.stringify(rows));
 writeEvidence('round-ten-seat-reader-acl-before',{profile:p.profile,rows,note:'Read-only installed ACL inspection. Function authority checks remain required independently of EXECUTE privileges.'});
}finally{await pool.end();}
