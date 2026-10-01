// OPA test exit 2 is useful only with actual failed assertions. Execution,
// compilation, malformed output and test evaluation errors are gate errors.
import {readFileSync} from 'node:fs';
const [path,status]=process.argv.slice(2);
let outcome=1;
try {
 const tests=JSON.parse(readFileSync(path,'utf8'));
 if(Array.isArray(tests)&&tests.length>0&&tests.every(t=>t&&typeof t==='object'&&typeof t.name==='string'&&!t.error&&!t.skip)) {
  const failures=tests.filter(t=>t.fail===true).length;
  if(status==='0'&&failures===0)outcome=0;
  else if(status==='2'&&failures>0)outcome=2;
 }
}catch { /* Unusable evidence is never a semantic regression detection. */ }
process.exitCode=outcome;
