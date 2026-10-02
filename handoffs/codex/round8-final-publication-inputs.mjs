// Explicit review publication lists only; no Git, scan, secrets or runtime.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const label='final-review-gamma';
const prefix=`handoffs/codex/artifacts/R8-${label}`;
const scanResult=`${prefix}-publication-private-material-scan.json`;
const stageInput=`${prefix}-stage-input.txt`;
const scanInput=`${prefix}-scan-input.txt`;
const selected=readFileSync(`${prefix}-publication.txt`,'utf8').trim().split(/\r?\n/);
const extras=[`${prefix}-publication.txt`,`${prefix}-publication-text-scan.txt`,`${prefix}-publication-png.txt`,`${prefix}-publication.json`,
  'handoffs/codex/artifacts/R8-final-review-alpha-publication.txt',
  'handoffs/codex/artifacts/R8-final-review-alpha-publication-text-scan.txt',
  'handoffs/codex/artifacts/R8-final-review-alpha-publication-png.txt',
  'handoffs/codex/artifacts/R8-final-review-alpha-publication.json',
  'handoffs/codex/artifacts/R8-final-review-beta-publication.txt',
  'handoffs/codex/artifacts/R8-final-review-beta-publication-text-scan.txt',
  'handoffs/codex/artifacts/R8-final-review-beta-publication-png.txt',
  'handoffs/codex/artifacts/R8-final-review-beta-publication.json',
  'handoffs/codex/artifacts/R8-final-review-beta-stage-input.txt',
  'handoffs/codex/artifacts/R8-final-review-beta-scan-input.txt',
  'handoffs/codex/artifacts/R8-final-review-beta-publication-private-material-scan.json',
  'handoffs/codex/artifacts/R8-final-review-beta-stage-guard.json',
  'handoffs/codex/round8-png-chunk-metadata.mjs',
  'handoffs/codex/round8-png-profile-review.mjs',
  'handoffs/codex/artifacts/R8-png-profile-alpha-png-profile-review.json',
  'handoffs/codex/round8-final-publication-inputs.mjs',stageInput,scanInput,scanResult];
const paths=[...new Set([...selected,...extras])].sort();
for(const path of paths){
  assert.match(path,/^(handoffs\/|output\/playwright\/round8\/)/);
  assert.ok(!/[\x00-\x1f:]/.test(path)&&!path.split('/').some(part=>!part||part==='.'||part==='..'));
  assert.ok([stageInput,scanInput,scanResult].includes(path)||existsSync(path),'Listed file missing');
}
assert.ok(!paths.includes('handoffs/codex/artifacts/R8-body-trace-webkit-operations.log'),'Raw nonUTF8 log must use verified lossless derivative');
assert.ok(paths.includes('handoffs/codex/artifacts/R8-body-trace-webkit-operations-lossless.json'));
const text=paths.filter(path=>!path.endsWith('.png')&&path!==scanResult);
writeFileSync(stageInput,paths.join('\n')+'\n',{flag:'wx'});
writeFileSync(scanInput,text.join('\n')+'\n',{flag:'wx'});
console.log(JSON.stringify({stage_input:stageInput,scan_input:scanInput,selected_paths:paths.length,text_paths:text.length,scan_result:scanResult,exit_code:0}));
