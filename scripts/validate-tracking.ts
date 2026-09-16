import { readFileSync,existsSync,writeFileSync,mkdirSync } from 'node:fs';
import { validateTracking,assertViewRows,assertTaskDetails,taskRows,acceptanceRows,renderTasks,renderAcceptance,type Tracking,type AcceptanceTracking } from './tracking.ts';
const tasks=JSON.parse(readFileSync('tracking/tasks.json','utf8')) as Tracking;
const acceptance=JSON.parse(readFileSync('tracking/acceptance.json','utf8')) as AcceptanceTracking;
validateTracking(tasks,acceptance,existsSync,path=>JSON.parse(readFileSync(path,'utf8')));
assertViewRows(readFileSync('docs/prototype/TASK_BOARD.md','utf8'),taskRows(tasks));
assertTaskDetails(readFileSync('docs/prototype/TASK_BOARD.md','utf8'),tasks);
assertViewRows(readFileSync('docs/prototype/ACCEPTANCE.md','utf8'),acceptanceRows(acceptance));
if(process.argv.includes('--propose-views')){
  // Work owns canonical Markdown; emit a review proposal in Codex-owned space.
  mkdirSync('handoffs/codex/generated',{recursive:true});
  writeFileSync('handoffs/codex/generated/TASK_BOARD.md',renderTasks(tasks));
  writeFileSync('handoffs/codex/generated/ACCEPTANCE.md',renderAcceptance(acceptance));
}
console.log(`Validated ${tasks.tasks.length} tasks and ${acceptance.tests.length} acceptance definitions and Markdown tables; no results promoted.`);
