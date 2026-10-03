import {readFileSync,writeFileSync} from 'node:fs';
const data=JSON.parse(readFileSync('handoffs/codex/artifacts/R10-run1-results.json','utf8'));
const rows=data.results.map(r=>{const log=r.log?readFileSync(r.log,'utf8'):'';let classification='PASS',root='Executed control';
if(r.status==='NOT_RUN'){classification='PREREQUISITE';root=r.reason;}
else if(r.status==='FAILED'){
 classification='UNRESOLVED';root=r.first_error??'See complete log';
 if(/22P02|round10-licence-dev|package.signing_key_id|reading 'claims'/.test(log)){classification='FIXTURE';root='Reviewer-generated licence/release key identifiers violate UUID schema; audit development prefix also incorrect.';}
 if(/\.spec\.ts$/.test(r.label)){classification='FIXTURE';root='Browser fixture initialization refused invalid reviewer-generated licence identifier; detailed Playwright report retained.';}
 if(/e2e-users.json/.test(log)){classification='FIXTURE';root='Vendor browser fixture journal not initialized (dependency order).';}
 if(/Unapproved synthetic|phase: 'restart OPA'|opaContainer/.test(log)){classification='HARNESS';root='Isolated Round 10 container not in bounded legacy selector allowlist.';}
 if(r.label.includes('bootstrap.test')){classification='HARNESS';root='Temporal restart uses default Compose project; real worker execution passed before restart assertion.';}
 if(r.label.includes('grc/http')){classification='FIXTURE';root='Required independent ORVIA_GRC_OPA_PORT unset.';}
 if(r.label.includes('lifecycle.test')){classification='FIXTURE';root='Rehearsal business fixture prerequisite missing.';}
 if(r.label==='runtime-image'){classification='PRODUCT';root='Build loads private profile excluded from Docker context.';}
 if(r.label==='test'){classification='PRODUCT';root='Four new probes: invalid Office ZIP prefix and binary TXT/CSV accepted as documents.';}
 if(r.label.includes('import-races')){classification='FIXTURE';root='New probe has invalid UUID signing identifier and invalid evidence kind containing digits.';}
 if(r.label.includes('member-onboarding')){classification='ENVIRONMENT';root='CREATE DATABASE exceeded existing 10-second query bound; no test assertions ran.';}
}
return {...r,classification,root};});
writeFileSync('handoffs/codex/artifacts/R10-run1-triage.json',JSON.stringify({recorded_before_fixes:new Date().toISOString(),rows},null,2),{flag:'wx'});
console.log(rows.reduce((a,r)=>(a[r.classification]=(a[r.classification]??0)+1,a),{}));
