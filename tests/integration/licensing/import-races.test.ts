import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {connectDatabase} from '../../../database/customer/src/index.ts';
import {loadProfile} from '../../../shared/testing/src/config.ts';
import {writeEvidence} from '../../../shared/testing/src/evidence.ts';
const pool=connectDatabase(loadProfile()).pool;
const observations: {name:string; accepted:boolean}[]=[];
try {
  for(const name of ['lower sequence','unsequenced after sequenced','second edition trial']) {
    const scope=[randomUUID(),randomUUID(),randomUUID()];
    const first=await pool.connect(),second=await pool.connect();
    const insert=async(tx:typeof first,sequence:number|null,trial:boolean)=>{
      const id=randomUUID();
      return tx.query(`INSERT INTO app.licences(tenant_id,legal_entity_id,environment_id,id,licence_id,installation_id,edition,valid_from,valid_to,signing_key_id,signature,imported_by,claims,term,sequence,trial)
        VALUES($1,$2,$3,$4,$4,$5,'CONTROL',clock_timestamp()-interval '1 day',clock_timestamp()+interval '1 day','round10-synthetic','synthetic-only',$5,'{}',$6,$7,$8)`,[...scope,id,randomUUID(),trial?'TRIAL':'MONTHLY',sequence,trial]);
    };
    try {
      await first.query('BEGIN');await second.query('BEGIN');
      await insert(first,2,name==='second edition trial');
      const pending=insert(second,name==='unsequenced after sequenced'?null:name==='second edition trial'?3:1,name==='second edition trial').then(()=>true,()=>false);
      // A concurrent contender must wait for the first import's committed history.
      await new Promise(done=>setTimeout(done,100));
      await first.query('COMMIT');
      observations.push({name,accepted:await pending});
      await second.query('ROLLBACK');
    } finally {await first.query('ROLLBACK');await second.query('ROLLBACK');first.release();second.release();}
  }
  console.log(JSON.stringify(observations));
  assert.deepEqual(observations.map(x=>x.accepted),[false,false,false],'concurrent imports must preserve rollback and trial restrictions');
} catch(error) {console.error(error instanceof Error?error.message:'Import race failed');process.exitCode=1;}
finally {await pool.end();writeEvidence('round10-import-races',{observations,result:process.exitCode?'FAIL':'PASS'});}
