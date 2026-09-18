import { readFileSync,existsSync,writeFileSync,mkdirSync } from 'node:fs';
import { validateTracking,validateCapabilities,assertViewRows,assertTaskDetails,taskRows,acceptanceRows,renderTasks,renderAcceptance,type Tracking,type AcceptanceTracking,type CapabilityRegister } from './tracking.ts';
const tasks=JSON.parse(readFileSync('tracking/tasks.json','utf8')) as Tracking;
const acceptance=JSON.parse(readFileSync('tracking/acceptance.json','utf8')) as AcceptanceTracking;
validateTracking(tasks,acceptance,existsSync,path=>JSON.parse(readFileSync(path,'utf8')));
const capabilities=JSON.parse(readFileSync('tracking/capabilities.json','utf8')) as CapabilityRegister;
validateCapabilities(capabilities,existsSync,Object.keys(JSON.parse(readFileSync('package.json','utf8')).scripts));
assertViewRows(readFileSync('docs/prototype/TASK_BOARD.md','utf8'),taskRows(tasks));
assertTaskDetails(readFileSync('docs/prototype/TASK_BOARD.md','utf8'),tasks);
assertViewRows(readFileSync('docs/prototype/ACCEPTANCE.md','utf8'),acceptanceRows(acceptance));
if(process.argv.includes('--propose-views')){
  // Work owns canonical Markdown; emit a review proposal in Codex-owned space.
  mkdirSync('handoffs/codex/generated',{recursive:true});
  writeFileSync('handoffs/codex/generated/TASK_BOARD.md',renderTasks(tasks));
  writeFileSync('handoffs/codex/generated/ACCEPTANCE.md',renderAcceptance(acceptance));
}
console.log(`Validated ${tasks.tasks.length} tasks, ${acceptance.tests.length} acceptance definitions, ${capabilities.capabilities.length} capability modules and Markdown tables; no results promoted.`);
