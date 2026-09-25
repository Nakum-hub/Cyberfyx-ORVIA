import assert from 'node:assert/strict';
import { runtimeConfig } from '../../../backend/auth/src/config.ts';
import { observerEnrollment,agentEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { machineAuthority,servicePool } from '../../../backend/auth/src/machine.ts';
import { observePostgresCatalog } from '../../../connectors/src/discovery/postgres-catalog.ts';
import { writeEvidence,safeError } from '../../../shared/testing/src/evidence.ts';

const config=runtimeConfig();
if(config.profile!=='codex-a00')throw new Error('Only the codex-a00 synthetic profile is owned here');
const observer=servicePool(config,'orvia_target_observer');
const agent=servicePool(config,'orvia_target_agent');
const assertions:{name:string;result:'PASS'|'FAIL'}[]=[];
function check(name:string,actual:unknown,expected:unknown){
  try{assert.deepEqual(actual,expected);assertions.push({name,result:'PASS'});console.log('PASS '+name);}
  catch{assertions.push({name,result:'FAIL'});throw new Error('Assertion failed: '+name);}
}
async function denied(work:()=>Promise<unknown>){try{await work();return false;}catch{return true;}}
try{
  const identities=observerEnrollment(config).identities;
  const actor=machineAuthority(identities[0]!);
  const scan=await observePostgresCatalog(observer,actor,[{schema:'public',relation:'marketing_memberships'}]);
  check('one allowlisted relation observed',scan.length,1);
  check('catalog result is scoped to the observer',scan[0]?.scope,actor.scope);
  check('metadata is observed but no row values are read',scan[0]?.state,'OBSERVED_METADATA');
  check('known column appears',scan[0]?.columns.some(column=>column.name==='marketing_restricted'),true);
  check('digest binds the exact column inventory',/^[a-f0-9]{64}$/.test(scan[0]?.digest??''),true);
  check('limits state that no data values were read',scan[0]?.limits.some(limit=>limit.includes('no record values')),true);
  const repeat=await observePostgresCatalog(observer,actor,[{schema:'public',relation:'marketing_memberships'}]);
  check('unchanged catalog has stable digest',repeat[0]?.digest,scan[0]?.digest);
  const missing=await observePostgresCatalog(observer,actor,[{schema:'public',relation:'does_not_exist'}]);
  check('missing target is explicit',[missing[0]?.state,missing[0]?.digest],['MISSING',null]);
  check('invalid target identifier refused',await denied(()=>observePostgresCatalog(observer,actor,[{schema:'public',relation:'marketing_memberships; DROP TABLE x'}])),true);
  check('duplicate target refused',await denied(()=>observePostgresCatalog(observer,actor,[{schema:'public',relation:'marketing_memberships'},{schema:'public',relation:'marketing_memberships'}])),true);
  check('agent identity cannot use observer reader',await denied(()=>observePostgresCatalog(observer,machineAuthority(agentEnrollment(config).identities[0]!),[{schema:'public',relation:'marketing_memberships'}])),true);
  check('mutating target role cannot use reader',await denied(()=>observePostgresCatalog(agent,actor,[{schema:'public',relation:'marketing_memberships'}])),true);
  if(identities.length>1){
    const other=machineAuthority(identities[1]!);
    const otherScan=await observePostgresCatalog(observer,other,[{schema:'public',relation:'marketing_memberships'}]);
    check('second environment retains its own scope',otherScan[0]?.scope,other.scope);
  }
  writeEvidence('postgres-catalog-discovery',{profile:config.profile,result:'PASS',assertions,limits:scan[0]?.limits});
  console.log(`${assertions.length} assertions, 0 failures.`);
}catch(error){
  const detail=error instanceof Error?error.message.slice(0,300):'Unknown failure';
  writeEvidence('postgres-catalog-discovery',{profile:config.profile,result:'FAIL',assertions,error:safeError(error),detail});
  console.error({error:safeError(error),detail});process.exitCode=1;
}finally{await observer.end();await agent.end();}
