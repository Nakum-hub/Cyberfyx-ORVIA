import assert from 'node:assert/strict';
import {loadProfile} from '../../shared/testing/src/config.ts';
import {connectDatabase} from '../../database/customer/src/index.ts';
import {writeEvidence} from '../../shared/testing/src/evidence.ts';
const p=loadProfile('vendor-a00'),pool=connectDatabase(p).pool,results:unknown[]=[];
// Independent caller expectations for rev 1.13's password setup, provisioning and service-licence definers.
const internal=['require_may_manage(uuid,uuid)','provisioning_require(uuid,text)','service_licence_in_force()','active_member_logins(uuid)','service_seat_guard()'];
const exposed=['create_member_pending(uuid,uuid,text,text,text)','issue_setup_code(uuid,uuid,text,integer)','set_member_password(uuid,uuid,text)','complete_account_setup(text,text,text)','team_password_state()',
 'provisioning_client(uuid)','provisioning_accept_nonce(uuid,text)','provisioning_audit(uuid,text,uuid,uuid)','provisioning_accounts(uuid)','provisioning_create_account(uuid,uuid,text,text,text,text,integer)','provisioning_issue_code(uuid,uuid,text,integer)','provisioning_deactivate(uuid,uuid)',
 'import_service_licence(uuid,uuid,uuid,jsonb,text,text)','service_licence_state()'];
try {
 const roles=(await pool.query("SELECT rolname FROM pg_roles WHERE starts_with(rolname,'orvia_') AND NOT rolsuper ORDER BY rolname")).rows.map(r=>r.rolname as string);
 assert.ok(roles.length>=11,'all installation runtime roles are present');
 for(const name of [...internal,...exposed]) {
  const fn='vendor.'+name;
  const meta=(await pool.query(`SELECT p.prosecdef,p.proconfig,EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a WHERE a.grantee=0 AND a.privilege_type='EXECUTE') public_execute FROM pg_proc p WHERE p.oid=to_regprocedure($1)`,[fn])).rows[0];
  assert.ok(meta,fn);assert.equal(meta.prosecdef,true,fn);assert.equal(meta.public_execute,false,fn);
  assert.ok(meta.proconfig.some((v:string)=>v.startsWith('search_path=pg_catalog')),fn);
  for(const role of roles) {
   const allowed=(await pool.query("SELECT has_function_privilege($1,$2,'EXECUTE') ok",[role,fn])).rows[0].ok;
   assert.equal(allowed,role==='orvia_vendor_app'&&exposed.includes(name),`${role} ${fn}`);
  }
  results.push({function:fn,result:'PASS'});
 }
 console.log(`PASS ${results.length} installed vendor definers, PUBLIC and every installed ORVIA runtime role`);
}catch(error){console.error(error instanceof Error?error.message:'Vendor ACL failure');process.exitCode=1;}
finally{await pool.end();writeEvidence('vendor-function-acl',{results,result:process.exitCode?'FAIL':'PASS'});}
