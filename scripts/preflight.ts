import { loadProfile } from '../packages/testing/src/config.ts';
import { writeEvidence } from '../packages/testing/src/evidence.ts';
import { checkServices } from './service-readiness.ts';
const profile=loadProfile();
const checks=await checkServices(profile);
if(Object.values(checks).some(check=>check.result!=='PASS'))process.exitCode=1;
writeEvidence('preflight-services',{profile:profile.profile,checks,limitations:['No business auth, consent, send, CRM or agent operation is exercised.']});
console.log(JSON.stringify(checks,null,2));
