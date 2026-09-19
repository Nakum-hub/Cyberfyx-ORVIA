import { createPublicKey,randomUUID } from 'node:crypto';
import type pg from 'pg';
import { CommandReceipt,SignedCommand } from '../../../packages/contracts/src/index.ts';
import { verifyCommand,digest } from '../../../packages/contracts/src/crypto.ts';
import { machineAuthority } from '../../../packages/auth/src/machine.ts';
import type { AgentEnrollmentConfig } from '../../../packages/auth/src/machine-profile.ts';
import { scopedTransaction } from '../../../packages/db/src/runtime.ts';
import { lockConsent,audit } from '../../../packages/domain/src/shared/transaction.ts';
import { targetTransaction } from '../../../packages/connectors/src/shared/target-db.ts';

type Enrollment=AgentEnrollmentConfig;
export async function executeCommand(value: unknown, enrollment: Enrollment, identity: Enrollment['identities'][number], control: pg.Pool, target: pg.Pool) {
 const command=SignedCommand.parse(value);const p=command.payload;const scope=p.binding.scope;
 const trusted={installation_id:enrollment.installation_id,signing_key_id:enrollment.signing_key_id,...identity.scope,now:new Date(Date.parse(p.issued_at)+1)};
 // Verify cryptography/trust first. Only an already committed identical command
 // may return its recorded receipt after expiry; it never re-executes.
 verifyCommand(command,createPublicKey(enrollment.public_key),trusted);
 if(identity.kind!=='AGENT'||Date.parse(identity.expires_at)<=Date.now())throw new Error('Expired agent enrollment');
 const system=identity.systems.find(s=>s.id===scope.system_id);
 const operation=system?.connector==='SYNTHETIC_CRM'?'CRM_REMOVE_MARKETING_MEMBERSHIP':system?.connector==='ORVIA_REST_SIMULATOR'?'SIMULATOR_RESTRICT':null;
 if(!system||!operation||scope.operation!==operation||p.binding.capability!=='restrict_exact_synthetic_subject'||p.binding.capability_version!=='1.0.0'||p.binding.operation_budget.maximum_records!==1)throw new Error('Agent capability not enrolled');
 const actor=machineAuthority(identity);const commandDigest=digest(command);
 return scopedTransaction(control,actor,async c=>{
  await lockConsent(c,actor.scope,scope.principal_reference_id,scope.purpose_id);
  return targetTransaction(target,actor,async tx=>{
   await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[p.command_id]);
   const prior=(await tx.query('SELECT command_digest,receipt FROM command_ledger WHERE command_id=$1',[p.command_id])).rows[0];
   if(prior){if(prior.command_digest!==commandDigest)throw new Error('Command identity conflict');await audit({tx:c,actor,requestId:randomUUID()},'agent.replay',p.command_id);return CommandReceipt.parse(prior.receipt);}
   verifyCommand(command,createPublicKey(enrollment.public_key),{...trusted,now:new Date()});
   const targetRow=(await tx.query(`SELECT * FROM marketing_memberships WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND resource_id=$4 AND principal_id=$5 AND purpose_id=$6 AND system_id=$7 AND subject_reference=$8 FOR UPDATE`,[scope.tenant_id,scope.legal_entity_id,scope.environment_id,scope.resource_id,scope.principal_reference_id,scope.purpose_id,scope.system_id,scope.target_subject_reference])).rows[0];
   if(!targetRow||targetRow.connector!==system.connector)throw new Error('Target is not enrolled');
   const mode=system.connector==='ORVIA_REST_SIMULATOR'?(await tx.query('SELECT mode FROM simulator_controls WHERE resource_id=$1',[scope.resource_id])).rows[0]?.mode??'HEALTHY':'HEALTHY';
   if(mode==='UNAVAILABLE')throw new Error('Synthetic provider unavailable before effect');
   const binding=(await c.query(`SELECT m.target_generation,a.epoch,a.state,p.status FROM app.target_mappings m
     JOIN app.consent_aggregates a ON(a.tenant_id=m.tenant_id AND a.legal_entity_id=m.legal_entity_id AND a.environment_id=m.environment_id AND a.principal_id=m.principal_id AND a.purpose_id=m.purpose_id)
     JOIN app.policy_versions p ON(p.tenant_id=m.tenant_id AND p.legal_entity_id=m.legal_entity_id AND p.environment_id=m.environment_id AND p.purpose_id=m.purpose_id AND p.version_id=$9)
     JOIN app.policy_approvals approval ON(approval.tenant_id=p.tenant_id AND approval.legal_entity_id=p.legal_entity_id AND approval.environment_id=p.environment_id AND approval.policy_version_id=p.version_id AND approval.digest=p.digest AND approval.author_id=p.author_id AND approval.reviewer_id<>p.author_id)
     WHERE m.tenant_id=$1 AND m.legal_entity_id=$2 AND m.environment_id=$3 AND m.id=$4 AND m.principal_id=$5 AND m.purpose_id=$6 AND m.system_id=$7 AND m.target_subject_reference=$8`,[scope.tenant_id,scope.legal_entity_id,scope.environment_id,scope.resource_id,scope.principal_reference_id,scope.purpose_id,scope.system_id,scope.target_subject_reference,scope.policy_version_id])).rows[0];
   let reason='APPLIED';
   if(!binding||binding.status==='DRAFT')reason='POLICY_NOT_APPROVED';
   else if(Number(binding.epoch)!==scope.consent_epoch||binding.state!=='WITHDRAWN')reason='STALE_EPOCH';
   else if(Number(binding.target_generation)!==scope.target_generation||Number(targetRow.generation)!==scope.target_generation)reason='STALE_GENERATION';
   else if(Number(targetRow.last_applied_epoch)>scope.consent_epoch)reason='STALE_EPOCH';
   if(reason==='APPLIED'&&mode!=='ACK_WITHOUT_EFFECT') {
    verifyCommand(command,createPublicKey(enrollment.public_key),{...trusted,now:new Date()});
    if(Date.parse(identity.expires_at)<=Date.now())throw new Error('Agent authority expired before mutation');
    const updated=await tx.query(`UPDATE marketing_memberships SET marketing_restricted=true,last_applied_epoch=$2,changed_at=now() WHERE resource_id=$1 AND generation=$3 RETURNING resource_id`,[scope.resource_id,scope.consent_epoch,scope.target_generation]);
    if(updated.rowCount!==1)throw new Error('Target changed during scoped mutation');
   }
   const receipt=CommandReceipt.parse({command_id:p.command_id,command_digest:commandDigest,attempt_id:randomUUID(),execution_state:reason==='APPLIED'?'ACKNOWLEDGED':'FAILED',recorded_at:new Date().toISOString(),reason_code:reason,target_generation:scope.target_generation});
   await tx.query('INSERT INTO command_ledger(command_id,command_digest,nonce,resource_id,receipt) VALUES($1,$2,$3,$4,$5)',[p.command_id,commandDigest,p.nonce,scope.resource_id,receipt]);
   await audit({tx:c,actor,requestId:randomUUID()},'agent.'+reason.toLowerCase(),p.command_id);
   return receipt;
  });
 });
}
