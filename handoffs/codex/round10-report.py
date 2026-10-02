"""Render actual command and suite evidence; never infer success from an absent record."""
from pathlib import Path
import json,collections
root=Path('handoffs/codex/artifacts')
runs={}
for run in [1,2,3]:
 p=root/f'R10-run{run}.jsonl'
 if p.exists():runs[run]=[json.loads(line) for line in p.read_text().splitlines() if line.strip()]
lines=['# Round 10 executed command ledger','','Original logs and failures remain unchanged. Commands contain no signing-key values. Environment uses the owned profiles, local development signers, retries=0 and real certificate verification.','']
for run,rows in runs.items():
 lines += [f'## Run {run}','', '| Suite / command | Result | Exit | Run ID | Source HEAD | Log |','|---|---|---|---|---|---|']
 for r in rows:
  command=' '.join(r.get('command',[])).replace('|','\\|')
  label=r['label']
  if command:label=f'{label}<br>`{command}`'
  lines.append('| '+ ' | '.join([label,r['status'],str(r.get('exit_code','unavailable')),r.get('run_id','unavailable'),r.get('head','unavailable'),r.get('log',r.get('reason','unavailable')).replace('|','\\|')])+' |')
 lines.append('')
for name in ['R10-preparation.jsonl','R10-fixchecks.jsonl','R10-final-checks.jsonl','R10-run2-diagnostics.jsonl','R10-review-observations.jsonl']:
 p=root/name
 if not p.exists():continue
 lines += [f'## Supplemental commands: {name}','','| Command | Result | Exit | Run ID | HEAD | Log |','|---|---|---|---|---|---|']
 for raw in p.read_text().splitlines():
  if not raw.strip():continue
  r=json.loads(raw)
  cmd=r.get('command','unavailable')
  if isinstance(cmd,list):cmd=' '.join(cmd)
  vals=[str(r.get('label','command'))+'<br>'+str(cmd),r.get('status','unavailable'),r.get('exit_code','unavailable'),r.get('run_id','unavailable'),r.get('head','unavailable'),r.get('log','unavailable')]
  lines.append('| '+' | '.join(str(v).replace('|','\\|') for v in vals)+' |')
 lines.append('')
Path('handoffs/codex/round10-command-ledger.md').write_text('\n'.join(lines),encoding='utf-8')
labels=sorted({r['label'] for rows in runs.values() for r in rows if r.get('kind')=='suite'})
matrix=[]
for label in labels:
 values={str(run):next((r for r in rows if r['label']==label),None) for run,rows in runs.items()}
 latest=next((values[str(run)] for run in sorted(runs,reverse=True) if values[str(run)]),None)
 matrix.append({'suite':label,'runs':{run:{'status':r['status'],'exit_code':r.get('exit_code'),'run_id':r.get('run_id'),'head':r.get('head'),'log':r.get('log')} if r else {'status':'NOT_SELECTED','reason':'No command executed in this targeted run; earlier evidence retained.'} for run,r in values.items()},'latest':latest['status'] if latest else 'NOT_RUN'})
(root/'R10-suite-matrix.json').write_text(json.dumps({'suites':matrix,'latest_counts':dict(collections.Counter(r['latest'] for r in matrix))},indent=2))
lines=['# Round 10 per-suite results','','NOT_SELECTED denotes no targeted rerun; it does not erase a prior outcome. Latest results are automated synthetic evidence only.','', '| Suite | Run 1 | Run 2 | Run 3 | Latest |','|---|---|---|---|---|']
for r in matrix:lines.append('| '+r['suite']+' | '+' | '.join(r['runs'].get(str(run),{}).get('status','NOT_RUN') for run in [1,2,3])+' | '+r['latest']+' |')
Path('handoffs/codex/round10-suite-results.md').write_text('\n'.join(lines)+'\n',encoding='utf-8')
print(json.dumps({run:dict(collections.Counter(r['status'] for r in rows)) for run,rows in runs.items()}))
