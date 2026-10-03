import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Presentation,PresentationFile} from '@oai/artifact-tool';
const root='C:/Cyberfyx-projects/Cyberfyx_ORVIA';
const dir=root+'/tmp/presentations/exact';
const skill='C:/Users/sadas/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations';
const source='C:/Users/sadas/.codex/attachments/256032c4-589a-4b01-b8b6-91f4e09b364d/Pasted text.txt';
await fs.mkdir(dir,{recursive:true});
const {resolvePresentationFont,finalizePresentation}=await import(pathToFileURL(skill+'/container_tools/artifact_tool_utils.mjs').href);
const font=resolvePresentationFont({fontFamily:'Arial'});
const raw=(await fs.readFile(source,'utf8')).replace(/\r/g,'');
const p=Presentation.create({slideSize:{width:1920,height:1080}});
const navy='#14283F',teal='#087C82',grey='#435466';
function clean(t){return t.replace(/`/g,'').replace(/\*\*/g,'').replace(/^\s*\*\s*/,'').trim();}
function text(s,t,x,y,w,h,size=30,bold=false,color=navy,fill='none'){
 const a=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill,line:{fill:'none',width:0}});
 a.text=t;a.text.style={typeface:font,fontSize:size,bold,color,wrap:true,autoFit:'none',verticalAlignment:'top'};return a;
}
function base(title,sub,n){const s=p.slides.add();s.background.fill='#FFFFFF';text(s,title,80,46,1750,100,48,true);text(s,sub,80,151,1750,68,29,false,teal);text(s,'Supplied content • 28 September 2026',80,1032,1500,25,18,false,grey);text(s,String(n).padStart(2,'0'),1770,1022,80,38,26,true,teal);return s;}
function para(s,lines,x,y,w,maxH,size=28){let yy=y;for(const line of lines){if(!line.trim())continue;const t=clean(line);const count=Math.max(1,Math.ceil(t.length/(w/(size*.51))));const h=count*size*1.2+size*.28;text(s,t,x,yy,w,h,size,/^(Overview:|Use Case [12]:|Tier [1-4]:|Family [1-3]:|Milestone [1-3]:|The Six|The Technical|The Lifecycle|Statutory Foundations:|Competitor Documentation Baselines:|Technical Engineering Frameworks:|The Controlled Testing Matrices:|The 33-Module|Current System Status)/.test(t));yy+=h;}if(yy>y+maxH)throw Error('Text exceeds frame '+(yy-y)+' / '+maxH);return yy;}
function two(s,lines,y=244,h=760,size=28){let best=1,d=1e9;for(let i=1;i<lines.length;i++){const weight=a=>a.reduce((v,t)=>v+Math.ceil(clean(t).length/56)+.3,0);const dd=Math.abs(weight(lines.slice(0,i))-weight(lines.slice(i)));if(dd<d){d=dd;best=i;}}const estimate=a=>a.reduce((v,t)=>v+Math.max(1,Math.ceil(clean(t).length/(850/(size*.51))))*size*1.2+size*.28,0);while(Math.max(estimate(lines.slice(0,best)),estimate(lines.slice(best)))>h&&size>21)size--;para(s,lines.slice(0,best),80,y,850,h,size);para(s,lines.slice(best),990,y,850,h,size);}
function node(s,t,x,y,w,h,size=25){const b=s.shapes.add({geometry:'rect',position:{left:x,top:y,width:w,height:h},fill:'#EDF5F4',line:{fill:teal,width:2}});text(s,t,x+18,y+16,w-36,h-30,size,true);return b;}
function arrow(s,x,y,dir='right'){text(s,dir==='right'?'→':dir==='left'?'←':'↓',x,y,45,dir==='down'?30:42,dir==='down'?20:32,true,teal);}
function tableRows(block){const rows=[];let cur=[];for(const l of block.split('\n')){if(l.startsWith('│')){const cells=l.split('│').slice(1,-1).map(t=>t.trim().replace(/`/g,''));if(!cur.length)cur=cells;else cur=cur.map((v,i)=>v+(cells[i]?' '+cells[i]:''));}else if(/[├└]/.test(l)&&cur.length){rows.push(cur);cur=[];}}if(cur.length)rows.push(cur);return rows;}
function nativeTable(s,values,y,h,n){const widths=values[0].length===4?[530,445,445,340]:[340,700,720];const t=s.tables.add({rows:values.length,columns:values[0].length,left:80,top:y,width:1760,height:h,columnWidths:widths,values});t.borders.assign({fill:'#CEDBDf',width:1,style:'solid'});for(let r=0;r<values.length;r++){t.rows[r].height=r===0?92:(h-92)/(values.length-1);for(let c=0;c<values[0].length;c++){const cell=t.getCell(r,c);cell.fill=r===0?navy:(r%2?'#F0F6F6':'#FFFFFF');cell.text.style={typeface:font,fontSize:n===6?28:27,bold:r===0||c===0,color:r===0?'#FFFFFF':navy,wrap:true};}}}
const matches=[...raw.matchAll(/^## Slide (\d+): ([^\n]+)\n/gm)];
const blocks=new Map();
for(let i=0;i<matches.length;i++){const m=matches[i];const end=i+1<matches.length?matches[i+1].index:raw.indexOf('\nSlide 11:',m.index);const body=raw.slice(m.index+m[0].length,end<0?raw.length:end).replace(/^-{5,}\s*$/gm,'').trim();const [title,sub='']=m[2].split('## ');blocks.set(+m[1],{title,sub,body});}
// The unnumbered opening in the supplied file is the cover.
{const s=p.slides.add();s.background.fill='#FFFFFF';text(s,'ORVIA Project Technical Briefing',80,46,1750,100,48,true);}
{
 const s=base('Agenda','What this briefing covers',2);
 const entries=[
  ['01','Use cases and testing basis','Slides 3–4'],
  ['02','Market comparison','Slides 5–7'],
  ['03','ORVIA architecture and DPDP controls','Slides 8–11'],
  ['04','Synthetic testing and baselines','Slides 12–13'],
  ['05','Build status and catalogs','Slides 14–15'],
  ['06','Data boundaries, release plan and sources','Slides 16–18'],
 ];
 for(let i=0;i<entries.length;i++){
  const col=i%2,row=Math.floor(i/2),x=80+col*900,y=285+row*210;
  text(s,entries[i][0],x,y,100,55,31,true,teal);
  text(s,entries[i][1],x+95,y,710,90,34,true,navy);
  text(s,entries[i][2],x+95,y+95,600,40,23,false,grey);
 }
 s.speakerNotes.textFrame.setText('The agenda follows the sequence of the presentation: use cases, market context, architecture and DPDP controls, synthetic testing, current engineering evidence, then delivery boundaries and release plan. This slide is an overview, not a claim that all described functions are production-qualified.');
}
const s11={title:'The Synthetic Testing Engine Architecture',sub:'Programmatic Verification Without Production Data Risk',body:`The Core Problem: No enterprise client or startup will ever give a compliance vendor access to their live customer database to "test" if a privacy platform works. To deliver a complete, market-ready tool, ORVIA must validate its verification loops internally.
The Solution: ORVIA builds automated twin networks named Aster and Birch. These are hyper-realistic, synthetic client application environments that mirror real-world Indian enterprise data models, e.g. at commit e95b5acab785cad14e1687a92c8c368eb3caf909.
On What Basis Are We Doing This? (The Statutory & Technical Alignment):
Every synthetic profile, database row, and communication event is strictly engineered around the constraints of the DPDPA 2023 and TRAI TCCCPR 2018 (DLT Systems).
The Controlled Testing Matrices:
Positive Dataset Baselines: Simulates clean operational journeys. A user profile switches is_marketing_allowed from true to false via a mock Consent Manager token; ORVIA verifies the status registers perfectly in the target datastore within cessation_latency_ms.
Adverse / Negative Dataset Baselines: Simulates active privacy failures. The user revokes consent, but a synthetic, pre-queued backend task tries to fire a marketing email. ORVIA’s P3 Canary Trap intercepts the ping, flags an ObservedViolation, and intentionally crashes the CI/CD pipeline build.
Boundary & Cross-Tenant Baselines: Seeds deliberately malformed tokens and multi-tenant intersection flows to test row-level security (RLS), database timeouts (TIMEOUT_EFFECT_UNKNOWN), and state restorations from old application backups.
Traceability Matrix: The test engine maps every synthetic failure directly back to a specific DPDPA section (e.g., Section 6(6) processing cessation). If a code update breaks a compliance path in the sandbox, the internal test runner detects it before a client ever downloads the release.`};blocks.set(11,s11);
for(let n=2;n<=17;n++){
 const b=blocks.get(n);if(!b)throw Error('Missing slide '+n);const s=base(b.title,b.sub,n+1);const lines=b.body.split('\n').filter(l=>l.trim());s.speakerNotes.textFrame.setText('Source: '+source+'\nSupplied text, reproduced without independent verification. References [1] and [2] are not defined in the supplied file.\n\n'+b.body);
 if([3,4,5,6,12].includes(n)){const first=b.body.indexOf('┌'),last=b.body.lastIndexOf('┘');const before=b.body.slice(0,first).split('\n').filter(l=>l.trim());const after=b.body.slice(last+1).split('\n').filter(l=>l.trim());const top=para(s,before,80,242,1760,150,29)+25;const bottom=after.length>0?155:20;nativeTable(s,tableRows(b.body.slice(first,last+1)),top,1005-top-bottom,n);para(s,after,80,1005-bottom+50,1760,bottom-30,27);}
 else if(n===8||n===15){const first=b.body.indexOf('┌'),last=b.body.lastIndexOf('┘');const before=b.body.slice(0,first).split('\n').filter(l=>l.trim());const after=b.body.slice(last+1).split('\n').filter(l=>l.trim());para(s,before,80,242,1760,210,28);const map=b.body.slice(first,last+1);const groups=map.split(/┌[^\n]*\n/).slice(1).map(t=>t.split('\n').filter(l=>l.startsWith('│')).map(l=>l.replace(/^│\s*|\s*│$/g,'').trim()).filter(t=>t&&!t.startsWith('(')));const y=n===8?420:390;node(s,groups[0].join('\n'),120,y,1680,160,30);arrow(s,920,y+161,'down');const label=map.match(/\((Secure[^)]+)\)/)?.[0]||'';text(s,label,1020,y+183,720,50,25,false,grey);node(s,groups[1].join('\n'),120,y+255,1680,175,29);para(s,after,80,y+465,1760,1005-y-465,n===15?25:28);}
 else if(n===9){para(s,lines.slice(0,1),80,242,1760,105,29);node(s,'ORGANISATION',740,335,440,65,26);arrow(s,930,401,'down');const rows=[['REGULATORY SOURCE','OBLIGATION','ORVIA CONTROL'],['PROCESSING ACT.','PURPOSE','NOTICE VERSION'],['DATA ASSET RES.','CONSENT','RIGHTS CASE REG.'],['TELEMETRY PROBE','OBSERVATION','EVIDENCE PACKAGE']];for(let r=0;r<4;r++){const y=475+r*100;for(let c=0;c<3;c++){node(s,rows[r][c],230+c*540,y,430,66,26);if(c<2)arrow(s,675+c*540,y+3);}if(r<3)arrow(s,1518,y+66,'down');}arrow(s,1518,842,'down');node(s,'FINDING/INCIDENT',1310,920,430,65,26);const after=b.body.slice(b.body.lastIndexOf('┘')+1).trim();text(s,clean(after),80,925,1150,92,22);}
 else if(n===10||n===14){const formula=b.body.match(/\$\$[\s\S]*?\$\$/)?.[0];const without=b.body.replace(formula||'','');const ls=without.split('\n').filter(l=>l.trim());if(n===10){para(s,ls.slice(0,2),80,242,1760,130,28);const names=[...formula.matchAll(/\\text\{([^}]+)\}/g)].map(m=>m[1]);for(let i=0;i<names.length;i++){const r=Math.floor(i/4),c=r===0?i%4:3-i%4;node(s,names[i],80+c*450,395+r*105,395,74,24);if(r===0&&c<3)arrow(s,485+c*450,414+r*105);if(r===1&&c>0)arrow(s,35+c*450,414+r*105,'left');}arrow(s,1680,470,'down');two(s,ls.slice(2),640,375,25);}else{para(s,ls,80,242,1760,510,31);const names=[...formula.matchAll(/\\text\{([^}]+)\}/g)].map(m=>m[1]);for(let i=0;i<names.length;i++){const r=Math.floor(i/3),c=r===0?i%3:2-i%3;node(s,names[i],80+c*610,790+r*112,530,80,27);if(r===0&&c<2)arrow(s,630+c*610,815+r*112);if(r===1&&c>0)arrow(s,20+c*610,815+r*112,'left');}arrow(s,1620,870,'down');}}
 else if(n===16){const first=b.body.indexOf('  MILESTONE'),last=b.body.lastIndexOf('┘');para(s,b.body.slice(0,first).split('\n').filter(l=>l.trim()),80,242,1760,130,29);const labels=['MILESTONE 1: SPRINT','MILESTONE 2: PROOF','MILESTONE 3: COMPLY','MILESTONE 4: LAUNCH'];const v=[['Freeze Code Baseline','Build Live Adapters','Secure Pilot DB'],['Complete CI/CD Gate','Deploy Web-Probe','Generate Signed Card'],['Run T01-T34 Testing','Audit Data Models','Lock Production KMS'],['Secure Pilot Release','Generate Proof Card','Initiate Expansion']];for(let i=0;i<4;i++){text(s,labels[i],80+i*450,355,400,45,24,true,teal);node(s,v[i].join('\n'),80+i*450,405,395,150,26);if(i<3)arrow(s,482+i*450,447);}const ls=b.body.slice(last+1).split('\n').filter(l=>l.trim());two(s,ls,607,400,26);}
 else{two(s,lines,244,760,n===2?26:n===7?29:n===11?27:30);}
}
const candidate=dir+'/candidate.pptx';await (await PresentationFile.exportPptx(p)).save(candidate);
for(let i=0;i<18;i++){const png=await p.export({slide:p.slides.items[i],format:'png',scale:.75});await fs.writeFile(dir+`/agenda-version-slide-${i+1}.png`,new Uint8Array(await png.arrayBuffer()));}
const final=root+'/output/pptx/ORVIA_Technical_Briefing_18_Slides_With_Agenda_2026-09-30.pptx';
await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath:final,explicitTotalSlideCount:18,requiredNativeTableOwnerSlides:[4,5,6,7,13],fontPolicy:{basis:'design',families:[font]},pythonExecutable:'C:/Users/sadas/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',integrityValidatorPath:skill+'/container_tools/inspect_presentation_package_integrity.py',layoutValidatorPath:skill+'/container_tools/inspect_presentation_layout_geometry.py',layoutArgs:['--expected-slide-size-emu','18288000,10287000','--validate-heading-fit',...[4,5,6,7,13].flatMap(n=>['--require-native-table-slide',String(n)])],verifyArtifactToolImport:true,receiptPath:dir+'/validation_agenda.json'});
console.log(final);
