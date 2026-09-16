import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadProfile } from '../packages/testing/src/config.ts';
import { connectDatabase } from '../packages/db/src/index.ts';
import { Id } from '../packages/contracts/src/index.ts';
import type { AuthFixture } from './auth-bootstrap.ts';
import { safeError } from '../packages/testing/src/evidence.ts';
const profile=loadProfile();if(process.argv[2]!==`confirm:${profile.profile}`)throw new Error('Named synthetic profile confirmation required');
const workflow=Id.parse(process.argv[3]);const fixture=JSON.parse(readFileSync(resolve(profile.directory,'auth/bootstrap.json'),'utf8')) as AuthFixture;
if(fixture.installation_id!==profile.installation_id||fixture.fixture_id!=='aster-birch-v1')throw new Error('Fixture mismatch');const member=fixture.users.member!;const scope=[member.scope.tenant_id,member.scope.legal_entity_id,member.scope.environment_id];const pool=connectDatabase(profile).pool;
try{const tx=await pool.connect();try{await tx.query('BEGIN');if((await tx.query('SELECT installation_id FROM bootstrap_profile')).rows[0]?.installation_id!==profile.installation_id)throw new Error('Installation mismatch');if(!(await tx.query('SELECT 1 FROM app.workflows WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$4',[...scope,workflow])).rowCount)throw new Error('Workflow not in fixed synthetic member scope');await tx.query('INSERT INTO app.workflow_assignments VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[...scope,workflow,member.id]);await tx.query("INSERT INTO app.audit_events(id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id) VALUES($1,$2,$3,$4,$5,'MACHINE','fixture.member-assignment',$6,$7)",[randomUUID(),...scope,profile.installation_id,workflow,randomUUID()]);await tx.query('COMMIT');console.log('Assigned exact synthetic workflow to the fixed enrolled member; no role or tenant change.');}catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await pool.end();}
