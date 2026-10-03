import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {vendorHarness} from '../../tests/integration/vendor/harness.ts';
import {vendorSigningKey} from '../../scripts/credentials.ts';
import {signServiceLicence} from '../../scripts/vendor-service-licence.ts';
import {writeEvidence} from '../../shared/testing/src/evidence.ts';
process.env.ORVIA_PROFILE='vendor-a00';
const h=await vendorHarness();let accepted=false,reason='',code:string|null=null;
try {
 const email='owner@race.example';
 const setup=await h.session().json('/api/v1/vendor/setup',{setup_code:await h.issueSetupCode(),owner:{name:'Synthetic Owner',email,password:`Owner-${randomUUID()}`},admin:{name:'Synthetic Admin',email:'admin@race.example',password:`Admin-${randomUUID()}`}});
 assert.equal(setup.status,201);
 const actor=(await h.operator.query('SELECT id FROM vendor_auth."user" WHERE email=$1',[email])).rows[0].id;
 const first=await h.operator.connect(),second=await h.operator.connect();
 const invoke=async(tx:typeof first,sequence:number)=>{
  const signed=signServiceLicence(vendorSigningKey('service-licence'),h.config.installation_id,5,30,Date.now(),sequence);
  await tx.query('SELECT vendor.import_service_licence($1,$2,$3,$4,$5,$6)',[actor,randomUUID(),h.config.installation_id,signed.claims,signed.signing_key_id,signed.signature]);
 };
 try {
  for(const tx of [first,second]){await tx.query('BEGIN');await tx.query("SELECT set_config('vendor.actor_id',$1,true)",[actor]);}
  await invoke(first,2);
  const pending=invoke(second,1).then(()=>true,(e:{message:string;code:string})=>{reason=e.message;code=e.code;return false;});
  await new Promise(done=>setTimeout(done,100));await first.query('COMMIT');accepted=await pending;
  await second.query('ROLLBACK');
  console.log(JSON.stringify({lower_sequence_accepted:accepted,reason,code,expected:process.argv[2]}));
  assert.equal(accepted,process.argv[2]==='expect-defect');
  if(process.argv[2]==='expect-fixed'){assert.equal(reason,'stale_sequence');assert.equal(code,'P0001');}
 }finally{await first.query('ROLLBACK');await second.query('ROLLBACK');first.release();second.release();}
}catch(error){console.error(error instanceof Error?error.message:'Race probe failed');process.exitCode=1;}
finally{await h.close();writeEvidence('vendor-import-race',{expected_defect:process.argv[2]==='expect-defect',lower_sequence_accepted:accepted,reason,code,result:process.exitCode?'FAIL':'PASS'});}
