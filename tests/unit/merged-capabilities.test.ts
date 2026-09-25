import test from 'node:test';
import assert from 'node:assert/strict';
import {routes,Capability} from '../../shared/contracts/src/index.ts';
import {roleCapabilities} from '../../backend/authorization/src/index.ts';

test('merged contract preserves distinct DPDP and GRC endpoints without collisions',()=>{
  for(const id of ['import_regulatory_package','append_bulk_job_rows','run_evidence_package','create_grc_audit','grc_audit_response_history','create_catalog_discovery_target','create_ai_system'])assert.ok(routes.some(r=>r.id===id),id);
  assert.equal(new Set(routes.map(r=>r.id)).size,routes.length);
  assert.equal(new Set(routes.map(r=>`${r.method}:${r.path}`)).size,routes.length);
});
test('merged authorization retains both families without granting auditor writes',()=>{
  for(const cap of ['registry.read','grc.read','ai_governance.read'])assert.ok(roleCapabilities.AUDITOR!.includes(cap));
  for(const cap of ['registry.write','operations.execute','grc.write'])assert.ok(roleCapabilities.ORG_ADMIN!.includes(cap));
  for(const cap of ['operations.approve','regulatory.manage','sdf.manage','grc.approve','ai_governance.approve']){
    assert.ok(roleCapabilities.ORG_SUPER_ADMIN!.includes(cap));
    assert.ok(!roleCapabilities.ORG_ADMIN!.includes(cap));
    assert.ok(!roleCapabilities.AUDITOR!.includes(cap));
  }
  for(const values of Object.values(roleCapabilities))for(const cap of values)assert.ok(Capability.safeParse(cap).success,cap);
});
test('merged request limits retain bounded DPDP imports and GRC frameworks',()=>{
  const size=(id:string)=>routes.find(r=>r.id===id)?.maximum_body_bytes??16384;
  assert.equal(size('import_regulatory_package'),1048576);
  assert.equal(size('append_bulk_job_rows'),1048576);
  assert.equal(size('create_grc_framework'),262144);
  assert.equal(size('create_grc_control'),65536);
  assert.equal(size('create_grc_audit'),16384);
});
