// Select only this task's R7V files and artifacts named by its executed logs.
// Older untracked artifacts in the worktree are deliberately not selected.
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
const root='handoffs/codex/artifacts';
const read=path=>{const b=readFileSync(path);return b[0]===255&&b[1]===254?b.subarray(2).toString('utf16le'):b.toString('utf8').replace(/^\uFEFF/,'');};
const selected=new Set(readdirSync(root).filter(name=>name.startsWith('R7V-')&&/\.(jsonl?|log|txt)$/.test(name)).map(name=>`${root}/${name}`));
const crawlTimes=[];
for(const path of selected){
  if(!path.endsWith('.log'))continue;
  for(const match of read(path).matchAll(/handoffs\/codex\/artifacts\/A00-[a-zA-Z0-9-]+\.json/g)){
    if(!existsSync(match[0]))throw new Error(`Executed artifact missing: ${match[0]}`);
    selected.add(match[0]);
    const time=match[0].match(/interface-crawl-(\d{13})-/);if(time)crawlTimes.push(Number(time[1]));
  }
}
const crawlRoot='handoffs/code/artifacts';
const crawls=readdirSync(crawlRoot).flatMap(name=>{
  const m=name.match(/^interface-crawl-(\d{4}-\d\d-\d\dT)(\d\d)-(\d\d)-(\d\d)-(\d{3})Z\.json$/);
  return m?[{path:`${crawlRoot}/${name}`,time:Date.parse(`${m[1]}${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`)}]:[];
});
for(const time of new Set(crawlTimes)){
  const matches=crawls.filter(c=>Math.abs(c.time-time)<2000);
  if(matches.length!==1)throw new Error(`Crawl evidence match is ambiguous or missing at ${time}`);
  selected.add(matches[0].path);
}
selected.add(`${root}/R7V-selected-artifacts.json`);
const paths=[...selected].sort();
writeFileSync(`${root}/R7V-selected-artifacts.json`,JSON.stringify(paths,null,2));
writeFileSync('.local/round7-artifact-pathspec.txt',paths.join('\n')+'\n');
console.log(JSON.stringify({selected:paths.length,a00:paths.filter(p=>p.includes('/A00-')).length,crawls:paths.filter(p=>p.includes('/interface-crawl-')).length}));
