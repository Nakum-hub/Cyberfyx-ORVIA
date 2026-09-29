import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Presentation, PresentationFile } from '@oai/artifact-tool';

const SKILL_DIR = 'C:/Users/sadas/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations';
const workspaceDir = 'C:/Cyberfyx-projects/Cyberfyx_ORVIA';
const TMP_DIR = path.join(workspaceDir, 'tmp/presentations');
const FINAL_PPTX = path.join(workspaceDir, 'output/pptx/ORVIA_Product_Overview_10_Slides_2026-09-25_v2.pptx');
await fs.mkdir(TMP_DIR, {recursive:true});
await fs.mkdir(path.dirname(FINAL_PPTX), {recursive:true});
const {resolvePresentationFont, finalizePresentation} = await import(pathToFileURL(path.join(SKILL_DIR,'container_tools/artifact_tool_utils.mjs')).href);
const font = resolvePresentationFont({fontFamily:'Arial'});
const pres = Presentation.create({slideSize:{width:1280,height:720}});
const C={navy:'#14283F', teal:'#087C82', grey:'#435466', pale:'#E9F3F2', white:'#FFFFFF'};

function box(slide,text,x,y,w,h,size=24,bold=false,color=C.navy){
 const sh=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 sh.text=text; sh.text.style={typeface:font,fontSize:size,bold,color,autoFit:'none',verticalAlignment:'middle',wrap:true};
 return sh;
}
function base(title,num,source='Source: ORVIA leadership brief, 25 Sep 2026'){
 const sl=pres.slides.add(); sl.background.fill=C.white;
 box(sl,title,70,42,1135,84,36,true,C.navy);
 box(sl,source,70,666,1050,22,12,false,C.grey);
 box(sl,String(num).padStart(2,'0'),1160,662,50,28,15,true,C.teal);
 return sl;
}
function label(sl,text,x,y,w){box(sl,text.toUpperCase(),x,y,w,30,17,true,C.teal)}
function body(sl,text,x,y,w,h,size=23){box(sl,text,x,y,w,h,size,false,C.navy)}
function notes(sl,text){sl.speakerNotes.textFrame.setText(text)}

// 1 Product case
{
 const s=base('ORVIA: privacy action with a recorded outcome',1);
 box(s,'A customer-local product for connecting a person’s choice to downstream work and evidence',70,170,1030,110,30,false,C.grey);
 label(s,'The product case',70,320,260);
 body(s,'A choice is tied to an exact notice and purpose.\nWork continues in a durable workflow.\nThe target response is checked separately.\nThe resulting evidence remains available for review.',70,365,1040,235,26);
 notes(s,'Source: ORVIA_Leadership_Market_Position_2026-09-25.pdf, opening product case. Scope: customer-local synthetic engineering profile; no production acceptance claim.');
}
// 2 Differentiation
{
 const s=base('What ORVIA makes visible',2);
 label(s,'Choice',70,156,240); label(s,'Action',455,156,240); label(s,'Proof',840,156,240);
 body(s,'Exact notice version and purpose\nOrdered consent and withdrawal',70,205,310,170,24);
 body(s,'Scoped command and durable work\nAcknowledgement kept distinct from effect',455,205,315,170,24);
 body(s,'Independent target observation\nEvidence, tests and coverage gaps',840,205,315,170,24);
 body(s,'A timeout or unchanged target remains unresolved. The product does not turn an acknowledgement into proof of completion.',70,450,1080,120,27);
 notes(s,'Source: leadership brief, product case. The documented path is demonstrated with synthetic/local targets.');
}
// 3 Use cases section 1
{
 const s=base('Priority use cases',3);
 label(s,'Principal',70,155,290); label(s,'Privacy team',465,155,290); label(s,'Control owner',860,155,290);
 body(s,'Grant consent against a specific notice\nWithdraw consent and follow the target effect\nSubmit a rights request',70,205,315,270,22);
 body(s,'Publish reviewed notice versions\nReview retention, holds and processor evidence\nHandle incidents and duties',465,205,315,270,22);
 body(s,'Run privacy tests\nReview failed or stale observations\nKeep the result linked to evidence',860,205,315,270,22);
 body(s,'These are priority journeys. Full merged-runtime acceptance is still required before customer deployment.',70,560,1080,60,21);
 notes(s,'Source: leadership brief §1. Base synthetic Aster/Birch tests and merged DPDP code have different qualification depth.');
}
// 4 Comparisons section 2
{
 const s=base('Market comparison: where the focus differs',4);
 label(s,'Enterprise platforms',70,150,425);
 body(s,'OneTrust, BigID, Securiti, ServiceNow and MetricStream publicly cover broad governance, discovery and workflow needs.',70,195,505,155,22);
 label(s,'Compliance platforms',665,150,400);
 body(s,'Vanta, Drata, Sprinto and Scrut emphasise control checks, evidence collection and audit work.',665,195,495,155,22);
 label(s,'India and specialist peers',70,400,520);
 body(s,'Redacto, miniOrange, Consentin, Privado and others address DPDP operations or narrower consent and discovery needs.',70,445,505,150,22);
 body(s,'ORVIA’s inspectable angle is the customer-local chain from choice to action, independent observation and evidence. This is a feature-level position, not a claim of broader coverage or measured superiority.',665,404,500,190,22);
 notes(s,'Source: leadership brief comparison pages and §2. Vendor descriptions are public positioning, not independent benchmarks. Module availability and price vary by contract.');
}
// 5 Architecture section 3
{
 const s=base('Architecture and module scope',5);
 label(s,'The operating spine',70,145,400);
 body(s,'Identity and scope\nPrivacy graph and policy\nDurable workflow\nBounded connector action\nIndependent verification\nEvidence and test result',70,193,505,370,24);
 label(s,'Current module picture',665,145,420);
 body(s,'The 33-module register describes the original V1/V2 structure. Merged V1 code now adds non-model AI-use governance, catalog-metadata discovery, GRC records, DPDP execution paths and payment primitives.',665,193,500,270,22);
 body(s,'M19–M25 are seven custom-model functions reserved for V2. The legacy register is not an overall completion score.',665,480,500,112,22);
 notes(s,'Source: leadership brief §3; approved master rev 1.4; 25 Sep overall completion assessment and expanded V1 baseline.');
}
// 6 Data and law sections 4-5
{
 const s=base('Data model and DPDP control path',6);
 label(s,'Local records',70,150,435);
 body(s,'PostgreSQL stores scope, purposes, notices, consent, rights cases, workflow actions, observations, evidence, tests and findings. Customer systems remain authoritative for their own records.',70,200,500,250,22);
 label(s,'From legal source to control',665,150,485);
 body(s,'A reviewed source and provision informs an applicability decision. The customer configures the control. Evidence and tests show what the software observed.',665,200,495,220,22);
 body(s,'The regulatory import and review path is coded. A complete legally approved Indian control pack and full end-to-end acceptance remain open.',70,500,1080,95,23);
 notes(s,'Source: leadership brief §§4–5. The PostgreSQL discovery adapter observes approved catalog metadata; it does not scan row values or classify personal data. Legal interpretation requires owner review.');
}
// 7 tests and baseline sections 6-7
{
 const s=base('Test reference and baselines',7);
 label(s,'Synthetic reference',70,150,440);
 body(s,'Aster and Birch are invented customer environments. They support positive cases and adverse cases such as wrong-tenant access, old consent events, timeouts and unchanged targets.',70,200,500,265,23);
 label(s,'What a baseline fixes',665,150,430);
 body(s,'Regulatory source edition\nApproved product master\nControl and fixture versions\nSecurity requirements\nExact release candidate',665,200,485,285,23);
 body(s,'A past component result belongs to its tested build. The merged application still needs its own acceptance record.',70,530,1080,70,23);
 notes(s,'Source: leadership brief §§6–7 and overall completion assessment. Merged DPDP test suites exist but lack committed execution artifacts for the merged candidate.');
}
// 8 current state section 8
{
 const s=base('Current engineering state',8);
 label(s,'Evidence available',70,150,420);
 body(s,'The combined source passed 252 unit tests, typecheck, lint, web build and policy compilation at the documented checkpoint. Core privacy journeys and newer expansion paths are coded with differing test depth.',70,200,505,300,22);
 label(s,'Qualification still open',665,150,445);
 body(s,'All 34 named full-application scenarios, T01–T34, have no qualifying full-run result. There is no frozen qualified candidate. Four of 14 expansion families are in progress; ten remain open.',665,200,495,300,22);
 body(s,'There is no defensible overall completion percentage yet.',70,560,1080,55,26,true);
 notes(s,'Source: leadership brief §8 and docs/engineering/2026-09-25-overall-completion-and-resume.md. Historical 100/104 routed-requirement figure is not whole-product completion.');
}
// 9 catalogs section 9
{
 const s=base('Catalogs and adoption',9);
 label(s,'Catalog content',70,150,390);
 body(s,'Regulatory sources and interpretations\nControls and evidence requirements\nConnector permissions and observation methods\nPolicy, workflow and test definitions\nCommercial entitlements and artifacts',70,200,515,340,22);
 label(s,'Adoption path',665,150,380);
 body(s,'Publish a signed version.\nPreview applicability and impact.\nAuthorised owner selects and configures it.\nRun tests against the adopted version.\nKeep earlier evidence tied to its original version.',665,200,495,340,22);
 body(s,'The signed regulatory-package review path exists; approved content and release sign-off remain separate gates.',70,570,1080,55,21);
 notes(s,'Source: leadership brief §9. This adoption path includes target design and coded primitives; do not present a complete approved content catalog as shipped.');
}
// 10 customer offering section 10
{
 const s=base('Customer offering and boundaries',10);
 label(s,'Customer installation',70,150,450);
 body(s,'Workspace and principal privacy centre\nAPIs, durable worker and local database\nApproved connectors, evidence and tests\nOperational records kept in the customer environment',70,200,515,320,22);
 label(s,'Vendor boundary',665,150,370);
 body(s,'A separate account and delivery service handles licence, signed download/update metadata and limited support metadata. Operational records stay with the customer.',665,200,495,270,22);
 body(s,'Local licensing and update primitives are coded. Payment processing primitives exist; complete billing, live provider integration and the full account/download journey still need qualification.',70,550,1080,80,20);
 notes(s,'Source: leadership brief §10 and overall completion assessment. Intended customer package versus qualified release status is distinguished on the slide.');
}

const candidatePath=path.join(TMP_DIR,'orvia_candidate.pptx');
await (await PresentationFile.exportPptx(pres)).save(candidatePath);
for(let i=0;i<pres.slides.length;i++){
 const preview=await pres.export({slide:pres.slides.getByIndex(i),format:'png',scale:1});
 await fs.writeFile(path.join(TMP_DIR,`slide-${i+1}.png`),new Uint8Array(await preview.arrayBuffer()));
}
const result=await finalizePresentation({
 explicitTotalSlideCount:10,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
 workspaceDir,candidatePath,finalPath:FINAL_PPTX,
 pythonExecutable:'C:/Users/sadas/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
 integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],
 fontPolicy:{basis:'design',families:[font]},verifyArtifactToolImport:true,
 receiptPath:path.join(TMP_DIR,'orvia_validation_v2.json')
});
console.log(JSON.stringify({final:FINAL_PPTX,result},null,2));
