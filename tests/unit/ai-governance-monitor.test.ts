import test from 'node:test';
import assert from 'node:assert/strict';
import { aiMonitorRetryPlan, classifyAiInput } from '../../services/worker/src/ai-governance-monitor.ts';

const now=Date.parse('2026-09-25T00:00:00.000Z');
test('a declared input stays a finding even with a plausible future timestamp',()=>{
  assert.equal(classifyAiInput({provenance:'ASSERTED',fresh_until:new Date(now+1000),tombstoned_at:null},now).state,'FINDING');
});
test('an OBSERVED label remains a finding at and beyond the freshness boundary',()=>{
  assert.equal(classifyAiInput({provenance:'OBSERVED',fresh_until:new Date(now),tombstoned_at:null},now).state,'FINDING');
  assert.equal(classifyAiInput({provenance:'OBSERVED',fresh_until:new Date(now+1),tombstoned_at:null},now).state,'FINDING');
});
test('a tombstone prevents an old observation being treated as current',()=>{
  assert.equal(classifyAiInput({provenance:'OBSERVED',fresh_until:new Date(now+1000),tombstoned_at:new Date(now-1)},now).state,'FINDING');
});
test('a current staff-supplied observation label cannot become independent evidence',()=>{
  const result=classifyAiInput({provenance:'OBSERVED',fresh_until:new Date(now+1000),tombstoned_at:null},now);
  assert.equal(result.state,'FINDING');
  assert.match(result.detail,/no independent connector read is linked/);
});
test('only a current matching catalog source supports an independently read input',()=>{
  const id='00000000-0000-4000-8000-000000000081',system_id='00000000-0000-4000-8000-000000000082';
  const asset={provenance:'OBSERVED',fresh_until:new Date(now+300000),last_seen_at:new Date(now-1000),
    tombstoned_at:null,system_id,source_observation_id:id};
  const source={state:'OBSERVED_METADATA',observed_at:new Date(now-1000),digest:'a'.repeat(64),system_id,
    target_state:'APPROVED',job_state:'READY',next_run_at:new Date(now+300000),latest_id:id};
  assert.equal(classifyAiInput(asset,now,source).state,'RECORDED');
  assert.equal(classifyAiInput(asset,now,{...source,latest_id:'other'}).state,'FINDING');
  assert.equal(classifyAiInput(asset,now,{...source,job_state:'EXHAUSTED'}).state,'FINDING');
  assert.equal(classifyAiInput(asset,now,{...source,system_id:'other'}).state,'FINDING');
  assert.equal(classifyAiInput(asset,now,{...source,next_run_at:new Date(now)}).state,'FINDING');
});
test('monitor retry delays are bounded and the third failure exhausts the job',()=>{
  assert.deepEqual([0,1,2].map(aiMonitorRetryPlan),[
    {attempts:1,state:'RETRY',delayMinutes:1},
    {attempts:2,state:'RETRY',delayMinutes:2},
    {attempts:3,state:'EXHAUSTED',delayMinutes:4},
  ]);
});
