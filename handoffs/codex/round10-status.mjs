import {readFileSync,existsSync} from 'node:fs';
const run=process.argv[2]??'2',path=`handoffs/codex/artifacts/R10-run${run}.jsonl`;
if(!existsSync(path))throw new Error('No run ledger');
const rows=readFileSync(path,'utf8').trim().split('\n').filter(Boolean).map(l=>JSON.parse(l));
console.log(JSON.stringify({run,completed:rows.length,counts:rows.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{}),last:rows.at(-1)?.label,failures:rows.filter(r=>r.status==='FAILED').slice(process.argv.includes('--compact')?-2:0).map(r=>({suite:r.label,error:r.first_error,log:r.log}))},null,2));
