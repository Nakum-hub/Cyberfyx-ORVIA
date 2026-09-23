import { loadProfile } from '../shared/testing/src/config.ts';
import { connectDatabase } from '../database/customer/src/index.ts';
import { Id } from '../shared/contracts/src/index.ts';
import { safeError } from '../shared/testing/src/evidence.ts';
const profile=loadProfile();if(process.argv[2]!==`confirm:${profile.profile}`)throw new Error('Named synthetic profile confirmation required');
const resource=Id.parse(process.argv[3]);const mode=process.argv[4];const read=process.argv[5];
if(!['HEALTHY','UNAVAILABLE','APPLY_THEN_TIMEOUT','ACK_WITHOUT_EFFECT'].includes(mode??'')||!['read','deny-read'].includes(read??''))throw new Error('Allowlisted mode and read state required');
const pool=connectDatabase({...profile,database:profile.database+'_targets'}).pool;
try{const tx=await pool.connect();try{await tx.query('BEGIN');const identity=(await tx.query('SELECT * FROM target_identity')).rows;if(identity.length!==1||identity[0].installation_id!==profile.installation_id||identity[0].profile!==profile.profile)throw new Error('Target profile mismatch');if(!(await tx.query("SELECT 1 FROM marketing_memberships WHERE resource_id=$1 AND connector='ORVIA_REST_SIMULATOR'",[resource])).rowCount)throw new Error('Not an enrolled synthetic REST resource');await tx.query('INSERT INTO simulator_controls VALUES($1,$2,$3) ON CONFLICT(resource_id) DO UPDATE SET mode=EXCLUDED.mode,read_allowed=EXCLUDED.read_allowed',[resource,mode,read==='read']);await tx.query('COMMIT');console.log('Named local synthetic provider behavior updated; no customer target or runtime result changed.');}catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await pool.end();}
