import { HttpFixture } from '../shared/testing/src/http-fixture.ts';
import { loadProfile } from '../shared/testing/src/config.ts';
import { connectDatabase } from '../database/customer/src/index.ts';
import { waitForAuthWindow } from '../shared/testing/src/auth-window.ts';
import { Id,Evidence } from '../shared/contracts/src/index.ts';
import { writeEvidence,safeError } from '../shared/testing/src/evidence.ts';
const p=loadProfile();if(p.profile!=='rehearsal'||process.argv[2]!=='confirm:rehearsal')throw new Error('Named rehearsal export required');
const id=Id.parse(process.argv[3]);const h=new HttpFixture();const db=connectDatabase(p).pool;
try{await h.start();await waitForAuthWindow(db);const auditor=await h.login('auditor');const response=await auditor.call(`/api/v1/admin/evidence/${id}/export`);if(response.status!==200)throw new Error('Scoped evidence export denied');const evidence=Evidence.parse(await response.json());writeEvidence('operator-export',{profile:p.profile,evidence,result:'PASS'});}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await h.stop();await db.end();}
