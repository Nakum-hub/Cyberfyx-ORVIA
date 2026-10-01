import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
const root='handoffs/codex/artifacts';
const readLines=file=>readFileSync(file,'utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
const diagnostics=readdirSync(root).filter(f=>/^R7V-.*-diagnostic\.jsonl$/.test(f)).flatMap(file=>readLines(`${root}/${file}`).map(row=>({file,...row})));
const summary={
  crawl_reports:existsSync(`${root}/R7V-selected-artifacts.json`)?JSON.parse(readFileSync(`${root}/R7V-selected-artifacts.json`,'utf8')).filter(file=>file.startsWith('handoffs/code/artifacts/interface-crawl-')).map(file=>{const report=JSON.parse(readFileSync(file,'utf8'));return{file,visits:report.visits,pages_with_issues:report.pages_with_issues,unvisited_detail_routes:report.unvisited_detail_routes,issues:report.issues,viewport_scope:report.viewport_scope,continuation:report.continuation};}):[],
  matrix:existsSync(`${root}/R7V-matrix-exits.jsonl`)?readLines(`${root}/R7V-matrix-exits.jsonl`).filter(r=>r.command.includes('round7-browser')).map(row=>{
    const log=readFileSync(row.log,'utf8');return {...row,assertions:log.match(/\d+ assertions, \d+ failures\./)?.[0]??null,crawl:log.match(/interface crawl: \d+ visits, \d+ with issues/)?.[0]??null,evidence:[...log.matchAll(/Artifact: ([^\r\n]+)/g)].map(m=>m[1])};
  }):[],
  policy_engine_errors:diagnostics.filter(r=>r.server?.dependency==='policy_engine'),
  service_unavailable:diagnostics.filter(r=>r.status===503||r.server?.status===503),
  vendor_sessions:diagnostics.filter(r=>r.url?.includes('/api/v1/vendor/session')||r.console||r.event==='vendor_session_pageerror'),
  vendor_probe_events:readdirSync(root).filter(file=>/^R7V-vendor-session-(before|before-traced|before-delay|after-delay)\.json$/.test(file)).flatMap(file=>JSON.parse(readFileSync(`${root}/${file}`,'utf8')).events.filter(row=>row.url?.includes('/api/v1/vendor/session')||row.message?.includes('/api/v1/vendor/session')||row.event==='mfa_response').map(row=>({file,...row}))),
};
const percentiles=values=>{const a=values.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?{n:a.length,min:a[0],median:a[Math.floor(a.length/2)],p95:a[Math.min(a.length-1,Math.ceil(a.length*.95)-1)],max:a.at(-1)}:null;};
summary.metrics_by_engine={};
for (const engine of ['webkit','firefox','candidate-firefox','resumed-firefox']) {
const metricFile=`${root}/R7V-${engine}-opa-host-samples.jsonl`;
if(existsSync(metricFile)) {
  const data=readLines(metricFile),samples=data.filter(x=>x.opa),slow=samples.filter(s=>s.opa.elapsed_ms>=200);
  const containerNames=[...new Set(samples.flatMap(s=>Array.isArray(s.docker)?s.docker.map(d=>d.Name):[]))];
  summary.metrics_by_engine[engine]={
    configuration:data.find(x=>x.limits)||null,
    sample_count:samples.length,opa_ms:percentiles(samples.map(s=>s.opa.elapsed_ms)),probe_errors:samples.filter(s=>s.opa.error),
    authorization_deadline_ms:2000,at_or_over_authorization_deadline:samples.filter(s=>s.opa.elapsed_ms>=2000),docker_stats_errors:samples.filter(s=>!Array.isArray(s.docker)).map(s=>({at:s.at,docker:s.docker})),
    host_cpu_percent:percentiles(samples.map(s=>s.host_cpu_percent)),host_available_mib:percentiles(samples.map(s=>Math.round(s.host_available_bytes/1024**2))),
    containers:containerNames.map(name=>({name,cpu_percent:percentiles(samples.flatMap(s=>Array.isArray(s.docker)?s.docker.filter(d=>d.Name===name).map(d=>parseFloat(d.CPUPerc)):[])),memory_percent:percentiles(samples.flatMap(s=>Array.isArray(s.docker)?s.docker.filter(d=>d.Name===name).map(d=>parseFloat(d.MemPerc)):[]))})),
    slow_threshold_ms:200,slow_count:slow.length,slow_host_cpu_percent:percentiles(slow.map(s=>s.host_cpu_percent)),fast_host_cpu_percent:percentiles(samples.filter(s=>s.opa.elapsed_ms<200).map(s=>s.host_cpu_percent)),
    slow_available_mib:percentiles(slow.map(s=>Math.round(s.host_available_bytes/1024**2))),fast_available_mib:percentiles(samples.filter(s=>s.opa.elapsed_ms<200).map(s=>Math.round(s.host_available_bytes/1024**2))),
    low_memory_samples:samples.filter(s=>s.host_available_bytes<512*1024**2).length,slow_with_available_memory_under_512_mib:slow.filter(s=>s.host_available_bytes<512*1024**2).length,
    slow_with_host_cpu_at_least_90_percent:slow.filter(s=>s.host_cpu_percent>=90).length,
    slowest:samples.toSorted((a,b)=>b.opa.elapsed_ms-a.opa.elapsed_ms).slice(0,12),
    timing_note:'OPA probe and docker stats run concurrently, then wait 5 seconds. CPU is host aggregate since prior sample; docker stats is an interval average, not an instantaneous scheduler trace. No other Codex build or suite ran during sampling. WebKit sampling began after its overview 503; it cannot establish conditions at that timeout.',
  };
}
}
summary.metrics=summary.metrics_by_engine['resumed-firefox']??summary.metrics_by_engine['candidate-firefox']??summary.metrics_by_engine.firefox??null;
writeFileSync(`${root}/R7V-results.json`,JSON.stringify(summary,null,2));
console.log(JSON.stringify({matrix:summary.matrix.map(r=>({command:r.command,exit:r.exit_code,assertions:r.assertions,crawl:r.crawl})),policy_engine_errors:summary.policy_engine_errors.length,service_unavailable_records:summary.service_unavailable.length,vendor_network_failures:summary.vendor_sessions.filter(r=>r.failure).length,metrics:summary.metrics?{sample_count:summary.metrics.sample_count,opa_ms:summary.metrics.opa_ms,host_cpu_percent:summary.metrics.host_cpu_percent,host_available_mib:summary.metrics.host_available_mib}:null},null,2));
