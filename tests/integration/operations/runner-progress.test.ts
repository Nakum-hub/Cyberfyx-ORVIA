// Durable synthetic regression for executor progress across supervised batches.
// Execute serially with the real synthetic fixture/runtime only.
// No database reset, direct business-row fabrication, or pretend production adapter.
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow, unique } from '../../../shared/testing/src/operations-fixture.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { recordsTarget } from '../../../shared/testing/src/records-target.ts';
import { operationsRunner } from '../../../services/worker/src/operations-runner.ts';
import { vendorSigningEnvironment } from '../../../scripts/credentials.ts';
import { runtimeConfig } from '../../../backend/auth/src/config.ts';
import { workerEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { machineAuthority, servicePool } from '../../../backend/auth/src/machine.ts';
import { scopedTransaction } from '../../../database/customer/src/runtime.ts';
import { pendingExecutionRunIds } from '../../../backend/domain/src/operations/executor.ts';

if(loadProfile().profile!=='codex-a00') throw new Error('Synthetic codex-a00 only');
Object.assign(process.env,vendorSigningEnvironment('release')); // Test signer; HttpFixture strips it from the application.
const t=operationsSuite('runner-persisted-progress');
const {h,db,check,ok}=t;
const target=recordsTarget();
const operator=promisify(execFile);
const tag=randomUUID().slice(0,8);
const N=52; // Greater than the supervised runner's execution batch limit of 50.

await t.run(async()=>{
  const changedSystems: string[]=[];
  try {
    await t.ensurePackage();
    await operator(process.execPath,['--import','tsx','scripts/machine-init.ts','confirm:codex-a00'],{timeout:180000,windowsHide:true});
    const admin=await h.login('admin'); const auditor=await h.login('auditor'); const birch=await h.login('birch');
    const s=t.scope(); const values=[s.tenant_id,s.legal_entity_id,s.environment_id];
    const predicate='tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3';
    const view=(id:string)=>ok(admin.call(`/api/v1/admin/workflow-runs/${id}`),S.schemas.WorkflowRun);
    const audits=async(id:string)=>Number((await db.query(`SELECT count(*)::int AS n FROM app.audit_events WHERE ${predicate} AND resource_id=$4 AND operation='workflow_run.execute'`,[...values,id])).rows[0].n);
    const actions=async(id:string)=>(await db.query(`SELECT action_type,state,target_result,verification,attempts,last_error_code FROM app.downstream_actions WHERE ${predicate} AND run_id=$4 ORDER BY ordinal,id`,[...values,id])).rows;
    const onePass=async(id:string,admitted=true)=>{
      // Use the real selection under the enrolled, database-validated worker
      // authority. Manual-only waiting is preserved without consuming a slot.
      const config=runtimeConfig(); const identity=workerEnrollment(config).identities.find(row=>row.scope.environment_id===s.environment_id);
      if(!identity)throw new Error('Missing synthetic worker scope');
      const actor=machineAuthority(identity); const control=servicePool(config,'orvia_worker');
      try {
        const selected=await scopedTransaction(control,actor,tx=>pendingExecutionRunIds({tx,actor,requestId:randomUUID()},20));
        check('the actual scoped admission matches owned executable or manual-waiting work',selected.includes(id),admitted);
      } finally { await control.end(); }
      const runner=operationsRunner();
      try {const report=await runner.once();check('the owned scope reports no background errors',report.filter(row=>row.scope===s.environment_id).flatMap(row=>row.errors),[]);}
      finally {await runner.close();}
    };

    t.setPhase('manual disposition does not spin');
    const purpose=await ok(admin.call('/api/v1/admin/purposes',{legal_entity_id:s.legal_entity_id,environment_id:s.environment_id,code:'order_service_demo',name:unique('SYNTHETIC progress purpose'),description:'Synthetic purpose for durable runner regression.'},key()),S.schemas.Purpose);
    const processor=await ok(admin.call('/api/v1/admin/processors',{name:unique('SYNTHETIC progress processor'),role:'PROCESSOR',authorised_purpose_ids:[purpose.id],authorised_categories:['CONTACT_DETAILS'],region:'Synthetic region',contract_reference:'SYNTHETIC DPA progress control',owner_reference:'Synthetic fixture owner',incident_contact:'incidents@synthetic.example',subprocessors_permitted:false},key()),S.schemas.Processor);
    const engagement=await ok(admin.call('/api/v1/admin/processor-engagements',{processor_id:processor.id,service_description:'Synthetic manual disposition control',subprocessor_of:null,effective_from:hoursFromNow(-24),contract_evidence_reference:'SYNTHETIC contract fixture',safeguard_evidence_reference:null,links:[]},key()),S.schemas.Engagement);
    const termination={terminated_at:hoursFromNow(-0.01),reason:'Synthetic fixture termination for progress regression.',disposition_required:true};
    check('auditor cannot terminate the engagement',(await auditor.call(`/api/v1/admin/processor-engagements/${engagement.id}/termination`,termination,key())).status,403);
    const ended=await ok(admin.call(`/api/v1/admin/processor-engagements/${engagement.id}/termination`,termination,key()),S.schemas.Engagement);
    const manualId=ended.disposition_run_id!;
    check('foreign tenant cannot read the disposition run',(await birch.call(`/api/v1/admin/workflow-runs/${manualId}`)).status,404);
    await ok(admin.call(`/api/v1/admin/workflow-runs/${manualId}/execution`,{limit:50},key()),S.schemas.WorkflowRun);
    const manualBefore=await actions(manualId); const auditBefore=await audits(manualId);
    check('the durable control really contains manual pending work',manualBefore.map(row=>[row.action_type,row.state,row.attempts]),[['DISPOSITION_CONFIRMATION','pending',0]]);
    await onePass(manualId,false);
    check('manual-only waiting consumes no background execution audit',await audits(manualId)-auditBefore,0);
    check('manual action state, target outcome, verification and attempts remain intact',await actions(manualId),manualBefore);
    check('manual waiting is not promoted to successful completion',(await view(manualId)).status,'RUNNING');

    t.setPhase('more than one legitimate execution batch');
    const system=await t.boundSystem(`SYNTHETIC progress batch ${tag}`);
    const setup=await t.activity({condition:'CONSENT',systems:[system.id],categoryName:`SYNTHETIC expired batch ${tag}`});
    const references=Array.from({length:N},(_,i)=>`rp_${tag}_${i}`);
    const rows=references.map((reference,i)=>({row_key:`progress-${tag}-${i}`,source_key:null,references:[{system_id:system.id,target_reference:reference}],relationships:[{category_id:setup.category.id,status:'ENDED',effective_from:hoursFromNow(-24*900),effective_to:hoursFromNow(-24*400),source_reference:`SYNTHETIC roster ${i}`,evidence_state:'EVIDENCE_AVAILABLE',evidence_reference:`SYNTHETIC row fixture ${i}`}],consent:[],notice_deliveries:[]}));
    const job=await ok(admin.call('/api/v1/admin/bulk-jobs',{source_label:`SYNTHETIC progress ${tag}`,mapping_version:'r8-progress-1'},key()),S.schemas.BulkJob);
    await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/rows`,{first_ordinal:0,rows},key()),S.schemas.BulkJob);
    const imported=await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/processing`,{limit:200},key()),S.schemas.BulkJob);
    check('all synthetic rows import in the declared bounded batch',[imported.status,imported.counts.applied],['COMPLETED',N]);
    await target.seed(s,system.id,references.map((reference,i)=>({reference,fields:{email:`progress${i}@records.example`,segment:'synthetic'}})));
    const rule=await ok(admin.call('/api/v1/admin/retention-rules',{name:`SYNTHETIC progress retention ${tag}`,activity_id:setup.activity.id,principal_category_id:setup.category.id,data_category_id:null,system_id:null,trigger:'RELATIONSHIP_ENDED',duration_days:365,duration_source:'CUSTOMER_CONFIGURATION',source_reference:'SYNTHETIC rule fixture',requirement_id:null,approval_required:false,erasure_action:'SUPPRESS',effective_from:hoursFromNow(-24)},key()),S.schemas.RetentionRule);
    const created=await ok(admin.call('/api/v1/admin/workflow-runs/retention',{retention_rule_id:rule.id},key()),S.schemas.WorkflowRun);
    const large=await ok(admin.call(`/api/v1/admin/workflow-runs/${created.id}/evaluation`,{limit:200},key()),S.schemas.WorkflowRun);
    check('the genuine run has more actions than one execution batch',[large.status,(await actions(large.id)).length],['APPROVED',N]);
    check('auditor cannot execute this run',(await auditor.call(`/api/v1/admin/workflow-runs/${large.id}/execution`,{limit:50},key())).status,403);
    const largeAudits=await audits(large.id);
    await onePass(large.id);
    const completed=await view(large.id);
    check('a progressing run continues through both batches',[completed.status,completed.counts.verified,await audits(large.id)-largeAudits],['COMPLETED_VERIFIED',N,2]);
    let suppressed=0;for(const reference of references) if((await target.record(system.id,reference)).suppressed===true)suppressed++;
    check('all target records are independently read back suppressed',suppressed,N);

    t.setPhase('uncertain effect is never promoted by the progress guard');
    const uncertain=await t.boundSystem(`SYNTHETIC uncertain progress ${tag}`);
    const uncertainSetup=await t.activity({condition:'CONSENT',systems:[uncertain.id]});
    const reference=`ru_${tag}`;
    const subject=await ok(admin.call('/api/v1/admin/data-principals',{principal_id:null,references:[{system_id:uncertain.id,target_reference:reference,source_key:null}]},key()),S.schemas.Subject);
    await target.seed(s,uncertain.id,[{reference,fields:{email:'uncertain@records.example',segment:'synthetic'}}]);
    changedSystems.push(uncertain.id);await target.mode(s,uncertain.id,'APPLY_THEN_TIMEOUT','UNAVAILABLE');
    const consent=await ok(admin.call('/api/v1/admin/consent-records',{subject_id:subject.id,relationship_id:null,activity_id:uncertainSetup.activity.id,channel:'WEB_FORM',expiry_policy:null,v1_principal_id:null,v1_purpose_id:null},key()),S.schemas.ConsentRecord);
    const eventPath=`/api/v1/admin/consent-records/${consent.id}/events`;
    await ok(admin.call(eventPath,{event:'GRANTED',occurred_at:hoursFromNow(-48),evidence_state:'EVIDENCE_AVAILABLE',evidence_reference:'SYNTHETIC grant fixture',notice_version_id:null},key()),S.schemas.ConsentRecord);
    const withdrawn=await ok(admin.call(eventPath,{event:'WITHDRAWN',occurred_at:hoursFromNow(-0.01),evidence_state:'EVIDENCE_AVAILABLE',evidence_reference:'SYNTHETIC withdrawal fixture',notice_version_id:null},key()),S.schemas.ConsentRecord);
    const uncertainId=withdrawn.withdrawal_run_ids[0]!;
    await onePass(uncertainId);
    const uncertainActions=await actions(uncertainId);
    check('actual durable uncertain result remains inconclusive and unverified',uncertainActions.map(row=>[row.state,row.target_result,row.verification,row.attempts]),[['inconclusive','TIMEOUT_EFFECT_UNKNOWN','INCONCLUSIVE',1]]);
    check('uncertainty is not reported as completed verified',(await view(uncertainId)).status,'PARTIALLY_FAILED');
    const operations=await target.operations(uncertain.id,reference);
    check('target execution is not repeated while verification is unavailable',[operations.length,operations[0]?.applied],[1,true]);
    check('earlier manual waiting still remains pending after all other work',await actions(manualId),manualBefore);
  } finally {
    try { for(const id of changedSystems) await target.mode(t.scope(),id,'HEALTHY','AVAILABLE'); }
    finally { await target.end(); }
  }
});
