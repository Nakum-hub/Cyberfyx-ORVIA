import type { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { sourceState } from '../../scripts/source-state.ts';
import { CONTRACT_VERSION } from '../../packages/contracts/src/index.ts';

// Raw traces/errors may contain credentials or cookies: keep them private.
// Published outcomes carry exact identities/statuses, never raw auth call logs.
export default class EvidenceReporter implements Reporter {
  results:unknown[]=[];
  /**
   * Published browser health. The console/page-error audit is summarised here so
   * qualification evidence shows it; previously it existed only as a Playwright
   * annotation that this record discarded.
   */
  browser(testId:string){
    const path=resolve('handoffs/codex/browser',`B06-playwright-${process.env.ORVIA_BROWSER_RUN_ID}`,`console-${testId}.json`);
    if(!existsSync(path))return {recorded:false as const};
    const audit=JSON.parse(readFileSync(path,'utf8')) as {counts:Record<string,number>;unexpected:number;deliberate_errors_captured:number;entries:{kind:string;text:string;deliberate:boolean}[]};
    const isFault=(kind:string)=>kind==='PAGE_ERROR'||kind==='CONSOLE_ERROR'||kind==='REACT_WARNING';
    // Deliberate HTTP statuses stay as counts. `faults` holds only genuine
    // problems, so a non-empty `faults` always means the interface misbehaved;
    // a probe this test provoked on purpose is listed separately.
    return {recorded:true as const,counts:audit.counts,unexpected:audit.unexpected,deliberate_errors_captured:audit.deliberate_errors_captured,
      faults:audit.entries.filter(e=>isFault(e.kind)&&!e.deliberate).map(e=>({kind:e.kind,text:e.text})),
      deliberate_faults:audit.entries.filter(e=>isFault(e.kind)&&e.deliberate).map(e=>({kind:e.kind,text:e.text}))};
  }
  onTestEnd(test:TestCase,result:TestResult){
    const record={title:test.titlePath(),status:result.status,expected_status:test.expectedStatus,duration_ms:result.duration,retry:result.retry,location:test.location,
      errors:result.errors.map(e=>({category:/ERR_CERT/.test(e.message??'')?'BROWSER_CERTIFICATE_NOT_TRUSTED':'EXECUTION_OR_ASSERTION_FAILURE',private_detail:true})),
      annotations:result.annotations?.map(a=>({type:a.type,description:a.description}))??[],
      browser_health:this.browser(test.id),
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
