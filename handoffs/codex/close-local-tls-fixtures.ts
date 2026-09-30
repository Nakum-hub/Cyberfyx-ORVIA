import {operationsSuite,key} from '../../shared/testing/src/operations-fixture.ts';
import {schemas} from '../../shared/contracts/src/index.ts';

// Closes only this qualification's synthetic fixtures through the normal API.
// Does not delete records or alter another qualification's engagements.
const t=operationsSuite('local-tls-fixture-closure');
await t.run(async()=>{
  const admin=await t.h.login('admin');
  const scope=t.scope();
  const rows=await t.db.query<{id:string}>(`SELECT id FROM app.audit_engagements
    WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
      AND engagement_reference LIKE 'ENG-TLS-%'
      AND firm_name='Synthetic TLS audit practice' AND state='ACTIVE'`,
    [scope.tenant_id,scope.legal_entity_id,scope.environment_id]);
  for(const row of rows.rows) {
    const result=await t.ok(admin.call(`/api/v1/admin/audit-engagements/${row.id}/closure`,{reason:'Close synthetic local TLS qualification fixture after execution.'},key()),schemas.AuditEngagement);
    t.check('synthetic TLS fixture closed through the application',result.state,'CLOSED');
  }
  console.log(`Closed ${rows.rowCount} remaining synthetic TLS qualification fixtures.`);
});
