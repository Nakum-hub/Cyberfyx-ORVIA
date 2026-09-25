import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from '../../database/customer/src/index.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { writeEvidence,safeError } from '../../shared/testing/src/evidence.ts';

const profile=loadProfile();
if(profile.profile!=='codex-a00')throw new Error('Isolated synthetic codex-a00 only');
const db=connectDatabase(profile).pool;
const assertions:{name:string;result:'PASS'|'FAIL'}[]=[];
let phase='setup';
function check(name:string,actual:unknown,expected:unknown){
  try{assert.deepEqual(actual,expected);assertions.push({name,result:'PASS'});console.log('PASS '+name);}
  catch{assertions.push({name,result:'FAIL'});throw new Error(`Assertion failed: ${name}`);}
}
try{
  const source=(await db.query(`SELECT * FROM app.data_assets WHERE provenance='OBSERVED' AND source_observation_id IS NOT NULL
    ORDER BY recorded_at DESC LIMIT 1`)).rows[0];
  if(!source)throw new Error('A synthetic source-bound asset is required');
  const tx=await db.connect();
  try{
    await tx.query('BEGIN');
    phase='unbound insert';
    let denied=false;
    await tx.query('SAVEPOINT guard_case');
    try{
      const document={...source.document,id:randomUUID(),source_observation_id:null};
      await tx.query(`INSERT INTO app.data_assets(tenant_id,legal_entity_id,environment_id,id,system_id,kind,provenance,
        owner_actor_id,valid_from,last_seen_at,fresh_until,document)
        VALUES($1,$2,$3,$4,$5,'DATASET','OBSERVED',$6,$7,$8,$9,$10)`,
        [source.tenant_id,source.legal_entity_id,source.environment_id,document.id,source.system_id,
          source.owner_actor_id,source.valid_from,source.last_seen_at,source.fresh_until,document]);
    }catch(error){denied=(error as {code?:string}).code==='23514';}
    await tx.query('ROLLBACK TO SAVEPOINT guard_case');
    check('database rejects new observed asset without source',denied,true);
    phase='JSON mismatch';
    denied=false;
    await tx.query('SAVEPOINT guard_case_two');
    try{
      await tx.query(`UPDATE app.data_assets SET document=jsonb_set(document,'{provenance}','"ASSERTED"') WHERE id=$1`,[source.id]);
    }catch(error){denied=(error as {code?:string}).code==='23514';}
    await tx.query('ROLLBACK TO SAVEPOINT guard_case_two');
    check('database rejects JSON and column provenance disagreement',denied,true);
  }finally{await tx.query('ROLLBACK');tx.release();}
  writeEvidence('graph-source-binding',{profile:profile.profile,phase:'complete',result:'PASS',assertions});
  console.log(`${assertions.length} assertions, 0 failures.`);
}catch(error){
  writeEvidence('graph-source-binding',{profile:profile.profile,phase,result:'FAIL',assertions,error:safeError(error)});
  console.error(safeError(error));process.exitCode=1;
}finally{await db.end();}
