import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

// Coverage index, not a completion generator. Preserve prior task acceptance;
// never infer delivery, V2 deferral or applicability from a heading keyword.
const source='ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md';
const target='tracking/v1-source-inventory.json';
const expectedHash='c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b';
const hash=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
const bytes=readFileSync(source);
if(hash(bytes)!==expectedHash)throw new Error('Approved master changed; review its authority before regenerating this index.');
const lines=bytes.toString('utf8').split(/\r?\n/);
const appendix=lines.findIndex(line=>/^# APPENDIX A\b/.test(line));
if(appendix<0)throw new Error('Cannot identify numbered-master boundary.');
const headings=lines.slice(0,appendix).flatMap((line,index)=>{
  const match=/^# (\d+)\. (.+)$/.exec(line);
  return match?[{number:Number(match[1]),title:match[2]!,start:index}]:[];
});
if(headings.length!==218||headings.some((h,i)=>h.number!==i+1))throw new Error('Missing, duplicate or reordered numbered section.');
const result={schema_version:1,source,source_revision:'1.4',source_sha256:expectedHash,
  purpose:'Complete numbered-source inventory to prevent silently omitted work. This is not a requirements interpretation or evidence of implementation.',
  authority_notes:[
    'Read the active numbered master with its approved V1/V2 boundaries and expanded baseline E1.',
    'Custom-model runtime functions remain DEFERRED_V2; applicability is reviewed from the source, never inferred from an AI keyword.',
    'Appendix history, repeated diffs and role-planning summaries are excluded from this numbered-section inventory.',
    'UNREVIEWED here does not revoke existing accepted engineering evidence; it means this new complete-source mapping has not received a section-level review.',
    'A section can contain multiple requirements. Trace each applicable requirement to implementation and exact-build acceptance before marking it covered.',
  ],expanded_baseline:'docs/engineering/V1_EXPANDED_BASELINE.md',expanded_register:'tracking/v1-expansion.json',
  section_count:headings.length,
  sections:headings.map((h,i)=>{
    const end=headings[i+1]?.start??appendix;
    return {source_section:h.number,title:h.title,start_line:h.start+1,end_line:end,
      normalized_content_sha256:hash(lines.slice(h.start,end).join('\n')),
      review_status:'UNREVIEWED',requirement_mappings:[],acceptance_status:'NOT_ASSESSED'};
  })};
const output=JSON.stringify(result,null,2)+'\n';
const args=process.argv.slice(2);
if(args.length>1||(args.length===1&&args[0]!=='--check'))throw new Error('Usage: tsx scripts/v1-source-inventory.ts [--check]');
if(args[0]==='--check'){
  if(readFileSync(target,'utf8')!==output)throw new Error('Source inventory differs. Preserve reviewed mappings before regeneration.');
  console.log('PASS: all 218 numbered master sections match the immutable source inventory. No implementation acceptance inferred.');
}else{
  // Do not erase future reviewed mappings on regeneration.
  let previous:unknown;
  try{previous=JSON.parse(readFileSync(target,'utf8'));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  if(previous){
    const value=previous as typeof result;
    if(!Array.isArray(value.sections)||value.sections.some(s=>s.review_status!=='UNREVIEWED'||s.requirement_mappings.length||s.acceptance_status!=='NOT_ASSESSED'))throw new Error('Existing reviewed mappings require a preserving migration, not regeneration.');
  }
  writeFileSync(target,output);
  console.log(`Wrote ${headings.length} source sections to ${target}; acceptance remains unassessed.`);
}
