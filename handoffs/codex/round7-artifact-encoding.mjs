// PowerShell 5 redirects native output as UTF-16LE. Preserve its text in UTF-8
// so the handoff logs are readable in GitHub; do not alter active UTF-8 logs.
import { readdirSync,readFileSync,writeFileSync } from 'node:fs';
const root='handoffs/codex/artifacts';let converted=0;
for(const name of readdirSync(root).filter(n=>n.startsWith('R7V-'))) {
  const path=`${root}/${name}`,bytes=readFileSync(path);
  if(bytes[0]===255&&bytes[1]===254){writeFileSync(path,bytes.subarray(2).toString('utf16le'),'utf8');converted++;}
}
console.log(`Converted ${converted} completed PowerShell text artifacts from UTF-16LE to UTF-8; text preserved.`);
