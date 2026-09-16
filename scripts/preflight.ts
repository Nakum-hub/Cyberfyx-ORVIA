import { connectDatabase } from '../packages/db/src/index.ts';
import { connectTemporal } from '../apps/worker/src/probe-client.ts';
import { loadProfile } from '../packages/testing/src/config.ts';
import { safeError,writeEvidence } from '../packages/testing/src/evidence.ts';
const profile=loadProfile();
const checks:Record<string,unknown>={};
const {pool}=connectDatabase(profile);
try{
  const result=await pool.query('SELECT current_database() AS database, current_setting(\'server_version\') AS version, installation_id,profile FROM bootstrap_profile WHERE singleton=1');
  if(result.rows[0]?.database!==profile.database||result.rows[0]?.installation_id!==profile.installation_id||result.rows[0]?.profile!==profile.profile)throw new Error('Database identity mismatch');
  checks.postgres={result:'PASS',...result.rows[0]};
}catch(error){checks.postgres={result:'FAIL',error:safeError(error)};process.exitCode=1;}finally{await pool.end();}
try{
  const response=await fetch(`http://127.0.0.1:${profile.opa_port}/v1/data/orvia/bootstrap/ready`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:{profile:'CUSTOMER_LOCAL_SYNTHETIC',operation:'BOOTSTRAP_READINESS'}}),signal:AbortSignal.timeout(5000)});
  const body=await response.json() as {result?:boolean};
  if(!response.ok||body.result!==true)throw new Error('OPA readiness decision failed');
  const negative=await fetch(`http://127.0.0.1:${profile.opa_port}/v1/data/orvia/bootstrap/ready`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:{profile:'CUSTOMER_LOCAL_SYNTHETIC',operation:'ARBITRARY_OPERATION'}}),signal:AbortSignal.timeout(5000)});
  if(!negative.ok||(await negative.json() as {result?:boolean}).result!==false)throw new Error('OPA deny control failed');
  checks.opa={result:'PASS',readiness:true,arbitrary_operation:false,policy_scope:'bootstrap readiness only'};
}catch(error){checks.opa={result:'FAIL',error:safeError(error)};process.exitCode=1;}
try{
  const {connection}=await connectTemporal(profile);
  try{const description=await connection.workflowService.describeNamespace({namespace:profile.temporal_namespace});checks.temporal={result:'PASS',namespace:description.namespaceInfo?.name,server:'persistent single-node CLI development server'};}
  finally{await connection.close();}
}catch(error){checks.temporal={result:'FAIL',error:safeError(error)};process.exitCode=1;}
writeEvidence('preflight-services',{profile:profile.profile,checks,limitations:['No business auth, consent, send, CRM or agent operation is exercised.']});
console.log(JSON.stringify(checks,null,2));
