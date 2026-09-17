import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { sourceState } from '../../scripts/source-state.ts';
import { CONTRACT_VERSION } from '../../packages/contracts/src/index.ts';

// Raw traces/errors may contain credentials or cookies: keep them private.
// Published outcomes carry exact identities/statuses, never raw auth call logs.
export default class EvidenceReporter implements Reporter {
  results:unknown[]=[];
  onTestEnd(test:TestCase,result:TestResult){
    const record={title:test.titlePath(),status:result.status,expected_status:test.expectedStatus,duration_ms:result.duration,retry:result.retry,location:test.location,
      errors:result.errors.map(e=>({category:/ERR_CERT/.test(e.message??'')?'BROWSER_CERTIFICATE_NOT_TRUSTED':'EXECUTION_OR_ASSERTION_FAILURE',private_detail:true})),
      attachments:result.attachments.filter(a=>a.path).map(a=>({name:a.name,sha256:createHash('sha256').update(readFileSync(a.path!)).digest('hex'),private_path:a.path}))};
    this.results.push(record);console.log(`${result.status.toUpperCase()} ${test.title}`);
    const dir=resolve('.local/browser-evidence',process.env.ORVIA_BROWSER_RUN_ID!);mkdirSync(dir,{recursive:true});
    writeFileSync(resolve(dir,`errors-${test.id}.json`),JSON.stringify(result.errors,null,2));
  }
  onEnd(result:FullResult){
    const dir=resolve('handoffs/codex/browser',`B06-playwright-${process.env.ORVIA_BROWSER_RUN_ID}`);mkdirSync(dir,{recursive:true});
    writeFileSync(resolve(dir,'results.json'),JSON.stringify({result:result.status,source_commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim(),source_tree_sha256:sourceState().sha256,contract_version:CONTRACT_VERSION,profile:'rehearsal',fixture:'aster-birch-v1',tests:this.results,limitations:['Raw authenticated traces/error details stay in the protected .local directory.','Screenshots supplement executable assertions.','Browser request observations do not qualify all host or browser-process egress.','Work acceptance and human rehearsals are separate.']},null,2)+'\n');
  }
}
