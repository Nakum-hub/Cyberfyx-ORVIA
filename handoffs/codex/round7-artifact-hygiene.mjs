import { readdirSync,readFileSync,writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const root='handoffs/codex/artifacts';
const findings=[];let files=0;
const selected=new Set(readdirSync(root).filter(n=>n.startsWith('R7V-')&&/\.(jsonl?|log|txt)$/.test(n)).map(n=>`${root}/${n}`));
for(const name of execFileSync('git',['diff','--cached','--name-only','--diff-filter=ACM'],{encoding:'utf8'}).trim().split(/\r?\n/))if(/^handoffs\/(codex|code)\/artifacts\//.test(name)&&/\.(jsonl?|log|txt)$/.test(name))selected.add(name);
for(const name of selected) {
  const bytes=readFileSync(name);
  const text=bytes[0]===255&&bytes[1]===254?bytes.subarray(2).toString('utf16le'):bytes.toString('utf8');files++;
  const patterns={private_key:/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,bearer_credential:/Bearer\s+[A-Za-z0-9_\-.]{30,}/,password_value:/"password"\s*:\s*"(?!REDACTED)[^"\r\n]{8,}"/,session_cookie_value:/"cookie"\s*:\s*"(?!REDACTED|\[REDACTED)[^"\r\n]+/,credential_uri:/\b(?:postgres(?:ql)?|mysql|redis):\/\/[^:\s/@]+:[^\s/@]+@/,authenticator_seed:/otpauth:\/\/[^\s"<>]+[?&]secret=/,token_value:/"(?:access_token|session_token)"\s*:\s*"(?!REDACTED)[^"\r\n]{20,}"/};
  for(const [kind,pattern] of Object.entries(patterns))if(pattern.test(text))findings.push({file:name,kind});
}
const result={files_checked:files,findings,scope:'New R7V text artifacts and staged A00/crawl text artifacts; heuristic credential scan plus manual instrumentation review, not a general secret-scanner certification.'};
writeFileSync(`${root}/R7V-artifact-hygiene.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result));process.exitCode=findings.length?1:0;
