from pathlib import Path
from xml.sax.saxutils import escape
import json
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf/ORVIA_Leadership_DPDPA_Product_and_Market_Dossier_2026-09-25.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('ArialEmbedded',r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBoldEmbedded',r'C:\Windows\Fonts\arialbd.ttf'))
pdfmetrics.registerFontFamily('ArialEmbedded',normal='ArialEmbedded',bold='ArialBoldEmbedded')
caps=json.loads((ROOT/'tracking/capabilities.json').read_text(encoding='utf-8'))['capabilities']
styles=getSampleStyleSheet()
NAVY=colors.HexColor('#11243A'); TEAL=colors.HexColor('#087D83'); PALE=colors.HexColor('#EAF3F4'); GREY=colors.HexColor('#4B5B68')
styles.add(ParagraphStyle(name='TitleX',fontName='ArialBoldEmbedded',fontSize=25,leading=31,textColor=NAVY,spaceAfter=16))
styles.add(ParagraphStyle(name='H1X',fontName='ArialBoldEmbedded',fontSize=15,leading=20,textColor=NAVY,spaceBefore=16,spaceAfter=9,keepWithNext=True))
styles.add(ParagraphStyle(name='H2X',fontName='ArialBoldEmbedded',fontSize=11,leading=15,textColor=TEAL,spaceBefore=10,spaceAfter=5,keepWithNext=True))
styles.add(ParagraphStyle(name='BodyX',fontName='ArialEmbedded',fontSize=9.7,leading=14.3,spaceAfter=7,textColor=NAVY))
styles.add(ParagraphStyle(name='SmallX',fontName='ArialEmbedded',fontSize=8.5,leading=11.8,spaceAfter=3,textColor=NAVY))
styles.add(ParagraphStyle(name='TinyX',fontName='ArialEmbedded',fontSize=8,leading=11,textColor=NAVY))
styles.add(ParagraphStyle(name='HeadX',fontName='ArialBoldEmbedded',fontSize=8.1,leading=11,textColor=colors.white))
styles.add(ParagraphStyle(name='DeckX',fontName='ArialEmbedded',fontSize=12.5,leading=18,textColor=GREY,spaceAfter=15))
story=[]
def p(x,style='BodyX'): story.append(Paragraph(escape(x),styles[style]))
def h(x): p(x,'H1X')
def sub(x): p(x,'H2X')
def table(headers, rows, widths=None, small='SmallX'):
    data=[[Paragraph(escape(str(c)),styles['HeadX']) for c in headers]]+[[Paragraph(escape(str(c)),styles[small]) for c in row] for row in rows]
    t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('TEXTCOLOR',(0,0),(-1,0),colors.white),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),6),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('LINEBELOW',(0,0),(-1,0),0.5,TEAL)]))
    story.append(t);story.append(Spacer(1,9))

p('ORVIA','TitleX')
p('A decision dossier for the CEO and co-founder: product truth, DPDP controls, test basis and market position','DeckX')
p('25 September 2026  |  Internal decision document  |  Customer-local Version 1 / deferred Version 2','BodyX')
p('This document answers the twelve requested questions using the approved revision 1.4 master, the current repository, the two supplied draft PDFs, the screenshots, official law and vendor pages. The PDFs and screenshots are research prompts, not authorities. Market descriptions reflect public documentation, not hands-on vendor testing. Prices and packaging require a current seller quote unless an official pricing page states otherwise.','BodyX')
sub('The answer in one page')
p('ORVIA connects an organisation\'s privacy obligations to systems, purposes, controls, authorised actions, independent observations, evidence and tests. Its strongest design claim is precise: a downstream acknowledgement is not proof that a privacy action took effect. The software retains an unknown or failed outcome until it can observe the target or a human resolves it with evidence. This is a credible product direction; it is not yet a proven market advantage over every competitor.')
p('The repository records 100 of 104 routed requirements built and exercised at the latest documented engineering checkpoint. Four Billing requirements remain open. The 33-module register describes customer-local synthetic subsets, three partial modules and seven deferred AI modules. Current uncommitted source changes mean that earlier test counts cannot certify today\'s working tree. Canonical T01-T34 acceptance remains NOT_RUN; the last frozen candidate was voided, a new candidate has not been identified, and two qualifying rehearsals and production security/legal/recovery assessment remain outstanding. [R1-R4]')
p('Leadership decision: continue productisation, but do not sell a completed DPDPA certification or production-ready integration estate. The immediate milestone is a traceable DPDP control pack, one production-grade connector journey, a frozen candidate, complete application acceptance and a security/recovery gate. Commercial price, Billing semantics and customer recovery design require decisions. [R1-R4]')

h('1 | Real use cases and their test basis')
p('Each row follows actor / input; processing and downstream action; verification and evidence; expected result and failure. The named fixtures are design requirements unless an existing suite in the capability register is cited; no production customer dataset is implied.')
use=[
('Consent grant','Principal; exact notice, purpose, data categories, affirmative act','Validate version and scope; persist receipt/epoch; permit only scoped processing','Read current consent and processing admission; preserve notice digest and receipt','Valid grant allows scoped use; reject stale notice, duplicate/replay and missing purpose. [R1,R3,L1]'),
('Withdrawal','Principal; active marketing consent','Commit new epoch; create durable target suppression work','Read target independently; preserve command, acknowledgement, observation and timestamp','Marketing stops where observed; lost response or accepted-but-ignored command stays UNKNOWN/failed. [R1,R3,L1]'),
('Rights request','Principal/authorised representative; access, correction or erasure','Verify mandate and identity; locate scoped copies; honour holds; issue allowed work','Observe each copy/processor outcome and response delivery; attach reasons','Complete only supported outcomes; ambiguity, hold or failed connector escalates. [R1,R3,L1]'),
('Notice change','Privacy admin; itemised content/language/version','Review, classify and publish immutable version','Compare served version, language, digest and consent binding','Exact approved notice served; missing item/translation mismatch blocks. [R1,R3,L2]'),
('Data inventory','Admin or allowlisted import; system, asset, data category, purpose','Quarantine/review assertions; link provenance and freshness','Compare typed graph and, where possible, connector observation','Declared facts stay ASSERTED; stale/conflicting/orphan records surface. [R1,R3]'),
('Processor and retention','Owner; vendor relationship, copy, hold, retention rule','Assess contract/evidence; calculate eligibility; queue safe deletion','Observe target and keep hold/exception/evidence history','Expired evidence is a gap; an unobserved deletion is not complete. [R1,R3]'),
('Incident and control test','Privacy/security owner; incident facts or control instance','Start scoped tasks/clock; run test against expected state','Capture delivery facts or actual versus expected observation','Uncertain scope and failed transport remain open findings. [R1,R3,L2]')]
table(['Use case','Actor / processing','Verification / evidence','Expected / adverse case'],[(a,b+'; '+c,d,e) for a,b,c,d,e in use],[80,170,120,125])

h('2 | Competitive landscape and function-level position')
p('The Redacto, IQWorks and miniOrange lists identify products to investigate; they are vendor-authored rankings and cannot establish independent superiority. Official product or pricing pages support the detailed claims below. A feature shown publicly may depend on a package, configuration, integration, services contract or deployment model. Where this was not published, the dossier says quote/verify. [M1-M3]')
comp=[
('OneTrust','Consent/preferences; DSR intake, identity, discovery, redaction, response; privacy operations, mapping, impact assessment, incidents and third-party risk.','CMP, universal consent and privacy automation priced by different usage bases; quote required.','ORVIA overlaps consent/rights/evidence in synthetic scope; OneTrust publicly documents broader suites and integrations. [V1]'),
('BigID','Discovery/classification foundation; DSAR/deletion, privacy portal/cookies, RoPA/PIA, retention/legal hold and DSPM bundles.','Pricing depends on sources, apps, connectors, deployment and support; quote.','ORVIA graph is typed and provenance-aware; autonomous enterprise discovery is absent. [V2]'),
('Securiti','Data intelligence plus privacy workflows, discovery, DSR, consent, assessments and AI governance.','Public fixed package price not verified; quote.','ORVIA V1 has no model dependency or equivalent discovery breadth. [V3]'),
('Vanta','Framework/control mapping, automated tests, evidence, monitoring, remediation and auditor workflow.','Official tiers Essentials/Plus/Professional/Pro/Enterprise; personalised quote, functions vary by tier.','ORVIA tests privacy action effects; Vanta has a wider documented compliance integration ecosystem. [V4]'),
('Drata','Controls mapped to requirements; continuous tests, evidence collection, risk and audit workflow.','Package and quote must be confirmed.','ORVIA evidence/test spine overlaps; generic enterprise compliance scope and integrations remain incomplete. [V5]'),
('ServiceNow / MetricStream','Enterprise GRC/IRM: regulatory content, risk, control, policy, audit, issue and third-party workflows.','Enterprise quotation; scope depends on licensed applications.','ORVIA is narrower and privacy-action oriented; full GRC depth is not built. [V6,V7]'),
('Sprinto / Scrut','Continuous compliance, mapped controls, automated or manual evidence, alerts and remediation.','Quote and package boundaries to verify.','ORVIA must expose observed/unknown/manual evidence clearly to compare credibly. [V8,V9]'),
('Redacto / ComplyIQ / IDfy Privy','India-oriented consent, rights, assessment, vendor and governance claims; AI assistance varies.','No reliable common public price; request module-level quotes.','Direct DPDPA peers; ORVIA has no basis to claim greater coverage or lower cost. [M1,M2]'),
('miniOrange / Consentin / GoTrust','DPDP consent and privacy operations; miniOrange also offers security and managed service; Consentin emphasises consent and privacy centre.','Quote scope, hosting, service and implementation separately.','ORVIA customer-local boundary and effect verification are design tests, not proof peers lack them. [M3,V10]'),
('Privado / Lightbeam / CookieYes','Privado and Lightbeam focus on code/data flow or discovery; CookieYes on website consent.','Check property/traffic and service tiers with vendors.','These solve narrower entry problems; ORVIA cannot claim equivalent scanners or cookie breadth. [M2,M3]')]
table(['Platform','Public operating scope','Pricing / package evidence','ORVIA comparison'],comp,[91,171,106,127])
p('Additional names in the three indexes: Seqrite, Perfios DPDP Suite, PrivaSapien, DataSafeguard, TrustArc, IBM Guardium, PrivacyEngine, KavachOne/ConsentiQo, Certinal, Usercentrics, Osano, Cross Identity/Vishwaas AI and Consently. Treat them as tracked market candidates, not verified function-by-function equivalents, until their own current product and pricing pages are checked. [M1-M3]')
sub('What an actual buying comparison must test')
table(['Function','Public comparator signal','ORVIA current truth'],[
('Data discovery','BigID and Securiti make discovery/classification core; OneTrust also markets data mapping.','Typed/provenance graph subset; no autonomous estate scan.'),
('Consent / notice','OneTrust, India-first suites and CMPs market capture, preferences, withdrawal and notices.','Customer-local grant, notice and withdrawal subset; production touchpoint coverage unproven.'),
('Rights / deletion','OneTrust and BigID document intake, search, deletion and response workflows.','Rights/retention subset; real connected systems and complete response packages unqualified.'),
('Assessments / vendors','OneTrust and GRC suites document PIAs, risk and third-party management.','Processor/vendor subset; broad DPIA and enterprise third-party lifecycle incomplete.'),
('Control / evidence / tests','Vanta, Drata, Sprinto and Scrut emphasise automated evidence and continuous checks.','Evidence and test subset; exact-candidate acceptance and real connector breadth outstanding.'),
('Incidents / reporting','Enterprise privacy suites document incident workflows and reports.','Incident/reporting subset; real notification transport and legally reviewed content incomplete.'),
('AI','Several vendors offer AI governance, assistants or discovery.','Seven custom AI modules explicitly deferred to V2; no V1 model dependency.')],[105,194,196])
sub('Complete discovery-index inventory')
table(['Market cluster','Names found across the three supplied lists','Status of this dossier'],[
('Global privacy / GRC','OneTrust, Securiti, BigID, TrustArc, IBM Guardium, ServiceNow, MetricStream','Principal functional peers studied above; exact licence scope requires vendor quote.'),
('Continuous controls','Vanta, Drata, Sprinto, Scrut','Control and evidence operating patterns compared; these are not all DPDPA-specific.'),
('India-oriented privacy','Redacto, ComplyIQ, IDfy Privy, miniOrange, Consentin, GoTrust, Seqrite, Perfios DPDP Suite, PrivaSapien, DataSafeguard','Index-identified; detailed modules/packages require direct current vendor confirmation.'),
('Specialist / adjacent','Privado, Lightbeam, CookieYes, PrivacyEngine, KavachOne/ConsentiQo, Certinal, Usercentrics, Osano, Cross Identity/Vishwaas AI, Consently','Category comparison only; do not infer a complete platform from a single feature page.')],[102,264,129])

h('3 | ORVIA architecture and all 33 modules')
p('Dependency chain: identity and tenant scope (01-02) -> graph (03) -> policy (04) -> durable workflow (05) -> allowlisted connector (06) -> independent verification (07) -> evidence (08) -> test (09). Notification and privacy operations (10-18) use that chain. Commercial/runtime modules (26-33) surround the customer installation. AI modules 19-25 are preserved for V2 and are excluded from V1. [R1,R3]')
for start,end in [(1,11),(11,19),(19,26),(26,34)]:
    rows=[]
    for c in caps[start-1:end-1]:
        stat=c['implementation_status'].replace('IMPLEMENTED_SANDBOX_SUBSET','BUILT subset').replace('PARTIAL_SANDBOX','PARTIAL').replace('NOT_IMPLEMENTED','NOT BUILT')
        lim=c.get('limitation','')
        rows.append((c['module_id'],c['name'],c['target_product'],stat,lim[:255]))
    table(['ID','Module','Plan','Today','Current boundary / missing depth'],rows,[31,104,31,65,264])
p('A built subset is executable only in the stated CUSTOMER_LOCAL_SYNTHETIC profile. It is not a declaration that the full master module, production connectors, vendor plane or release gate has been delivered. For the exact requirement and suite references, use tracking/capabilities.json and tracking/tasks.json; the current worktree has subsequent edits and needs requalification. [R2-R4]')

h('4 | Database and relationship model')
p('ORVIA stores customer-local governance and operational state in PostgreSQL; it does not replace the customer\'s CRM, HR or application databases. Every tenant-owned row must be scoped by authenticated principal and tenant/environment, with row-level and application checks. The source systems remain authoritative for their records. [R1,R3]')
db=[('Organisation, user, role, environment','Isolation root and authority; owns all graph, workflow and evidence records.'),('Source version, provision, obligation','Versioned Act/Rule/notification and legal applicability; richer explicit catalog is target work.'),('Control definition, instance, implementation','Reusable rule becomes customer-owned implementation with owner and required evidence.'),('System, asset, category, processing, purpose','Typed relationships identify where data is, why used, who receives it, and provenance/freshness.'),('Notice, grant, withdrawal','Exact served text/language/version binds to purpose and consent epoch.'),('Principal, mandate, rights request','Identity and representation decision scopes actions, copies, holds and response.'),('Processor/vendor, contract, assessment','Relationship and onward sharing are linked to systems, evidence and incident scope.'),('Action, acknowledgement, observation','Intent and external response are distinct from independently observed target effect.'),('Evidence, test, result, finding','Digest and provenance bind expected/actual checks to remediation and audit.'),('Incident, retention, audit, licence/update','Operational obligations, preserved history and deployment management.')]
table(['Entity cluster','Relationship and truth boundary'],db,[155,340])
p('Target chain: source version -> provision -> obligation -> applicability -> control definition -> customer instance -> implementation -> evidence requirement -> verification method -> test -> result -> finding. Today the repository contains graph, policy, consent, workflow, evidence and tests as subsets; a complete legally reviewed regulatory/control catalog is not demonstrated. [R1-R3]')

h('5 | DPDPA control injection')
p('Control metadata should carry Act/Rule section, source URL/digest, publication and effective dates, interpretation owner, applicability predicate, customer configuration, required evidence, machine test, manual review and supersession. A software result can show configured process and observed system behaviour; it cannot certify overall legal compliance. Official commencement is phased: some provisions began on Gazette publication, consent-manager registration follows one year, and most operating provisions follow eighteen months. The published dates and any corrigendum must be tracked, rather than a screenshot countdown. [L1-L3]')
families=[
('Scope and lawful basis','Act ss.3-4,7','Declared role, processing, exemption and purpose','Configured applicability and missing facts','Final legal interpretation'),
('Notice and consent','Act ss.5-6; Rules 3,10-11','Itemised notice, language, purpose, affirmative record','Version/receipt/epoch/withdrawal state','Clarity, age and guardian truth'),
('Withdrawal and processors','Act ss.6(4)-(6),8(2)','Targets, processor instructions and supported operations','Command vs independently observed result','Off-platform processor acts'),
('Security and breach','Act s.8; Rules 6-7','Security measures, incident facts and contacts','Configured checks, task clock, delivery record','Adequacy, materiality and full impact'),
('Accuracy, retention, erasure','Act s.8; Rule 8','Data accuracy process, copy inventory, holds','Eligibility, connected action and observation','Real-world accuracy, unseen backups'),
('Rights and grievance','Act ss.11-14; Rule 13','Identity/mandate proof, channels and response','Workflow state and dated evidence','Substantive response quality'),
('Children and disability','Act s.9; Rules 10-12','Guardian/age evidence and exceptional basis','Configured gate and supported proof','Actual age/guardian authenticity'),
('Significant fiduciary','Act s.10; Rule 13','Designation, DPO, DPIA/audit material','Track assessment completion/evidence','Designation and professional judgement'),
('Transfers/restrictions','Act s.16; Rule 14','Destination/system facts and current restrictions','Check configured destinations','Unobserved routing and legal advice'),
('Consent Manager role','Act s.6(9); Rule 4','Separate registration and role facts','Role-specific controls if applicable','Registration is not implied by a consent tool')]
table(['Family','Legal basis','Customer supplies','ORVIA can check','Human/unknown'],families,[90,80,108,111,106])

h('6 | Exact synthetic data and test references')
p('The core baseline is a deterministic ORVIA fixture, not an external downloaded dataset. Aster and Birch are synthetic organisations with colliding identifiers, two environments, staff/principals, CRM/HR-like sandbox targets, assets, processing, purpose, notices, consent epochs, vendors, holds, incidents and controls. A fixture manifest should pin schema/migration, source commit, clock, seed, expected result and requirement/control/test IDs. [R2-R4]')
table(['Set','Required case','Expected result'],[('Positive','Valid notice and consent, supported target, fresh evidence','Accepted action, observed effect, provenance-linked evidence.'),('Negative','Withdrawn/stale consent, invalid role or mandate, missing vendor evidence','Deny or finding; no success label.'),('Boundary','Exact expiry, deadline, retention threshold, concurrent epoch','Deterministic boundary result; old event cannot reactivate.'),('Isolation','Aster/Birch ID collision and sibling environment','No cross-tenant read, action, export or leakage.'),('Failure','Timeout, lost response, ack-without-effect, partial/retry exhaustion','UNKNOWN or failed until independent observation.'),('Lifecycle','Hold, backup, terminated vendor, processor-origin incident','Explicit exception or open follow-up, never silent completion.')],[95,205,195])
p('External references: TSI Coop\'s DPDP CMS is an open source functional comparator, not ORVIA test truth. SyntheticDataHub may supply sample-shaped synthetic PII only after licence/schema review. DecisionsDev policy-corpus demonstrates human-validated decision ground truth but its business policies are not DPDP controls. OpenDP dp-test-datasets concerns differential privacy and is unrelated to the DPDPA acceptance baseline. Do not import any project as production code without licence, security and provenance review. [G1-G4]')

h('7 | Six baselines the founders should expect')
table(['Baseline','Owner and source','Version / use'],[('Regulatory','Legal/content owner; official Act, final Rules, notifications/corrigenda','Source/version/effective date; derive reviewed obligations.'),('Product','Product owner; approved ORVIA master rev 1.4 and ADRs','Revision/hash; settle V1/V2 scope.'),('Control','Privacy/control owner; signed control pack and customer instance','Pack and instance version; required evidence/test.'),('Test','QA/control engineering; synthetic fixture and expected outcomes','Seed, build, case ID; reproducible positive/adverse result.'),('Security','Security owner; access, isolation, key, recovery and supply-chain requirements','Assessment/version; production gate.'),('Release','Release authority; exact source/build/dependencies/catalogs and T01-T34 evidence','Candidate/manifest/hash; only basis for ship/claim. [R1-R4]')],[90,205,200])

h('8 | What exists today, and what still needs proof')
p('The capability register marks 22 modules as implemented sandbox subsets, three as partial (Customer Onboarding, Monitoring, Audit Administration), Billing as not implemented and seven AI modules deferred to V2. The latest documented checkpoint reports 100/104 routed requirements built and exercised. This document inspected repository state; it did not execute the full suite and therefore does not promote the checkpoint to today\'s candidate. [R2-R4]')
p('Current evidence includes PostgreSQL migrations, tenant-scoped API/business code, durable workflows, synthetic target observation, consent/rights/retention/vendor/incident integration suites, generated contracts, UI journeys and recorded artifacts. The remaining product work includes production connectors and installation, formal DPDP control content, full account/billing plane, recovery and vendor-side boundary, signed evidence/key custody, complete user journeys, exact candidate qualification, security and recovery assessment. [R2-R4]')
p('Canonical T01-T34: NOT_RUN. Frozen candidate: NOT_IDENTIFIED. Two qualifying rehearsals: NOT_RUN. Production legal/security/supply-chain/full recovery: NOT_ASSESSED. These are release facts, not criticism of engineering progress. [R2]')

h('9 | What “catalog” means in ORVIA')
table(['Catalog','Item / current status / adoption rule'],[('Regulatory','Source provision and effective version; full reviewed content pack remains. Never overwrite past interpretation.'),('Control','Reusable definition, applicability, evidence/test; policy/coverage primitives exist, unified pack remains.'),('Connector','Allowlisted target/operation, permissions, version, conformance; synthetic/local framework exists, broad real catalog remains.'),('Evidence and test','Type, freshness, verification method, expected result; engine subsets exist, signed package and broader mappings remain.'),('Policy/workflow','Reviewed template and safe parameters; fixed forms/durable withdrawal flow exist, general designer does not.'),('Commercial/download','Edition, entitlement, signed artifact and support metadata; licensing/update subsets exist, full vendor storefront/billing absent.')],[115,380])
p('For every catalog update: publish signed version and compatibility/impact note; customer owner previews changes; instantiate into a tenant-scoped configured copy; migrate only with review and rollback; keep old result/evidence bound to its historical version. Vendor cannot silently alter customer decisions. [R1]')

h('10 | The customer product and vendor boundary')
p('Customer buys a licensed customer-local runtime plus approved update/control content and contracted support. The Customer Workspace, Data Principal Privacy Centre, operational PostgreSQL state, credentials, evidence, logs and connectors run in the customer environment. The vendor website/ORVIA Account may handle commercial identity, licence, signed downloads, update metadata and support entitlement, but not operational records or a remote administrator backdoor. Support bundles must be deliberately generated, previewed and minimised by the customer. [R1]')
p('A customer-side agent receives only signed, scope-bound commands for allowlisted operations. A connector needs owner approval, least-privilege credentials, target/operation registration, health and conformance tests, and an independent read path for outcome verification. Licence failure or update rollback must not reverse consent withdrawal or alter past evidence. The vendor-side account and Billing implementation are not yet complete. [R1,R3]')

h('11 | Delivery sequence, dependencies and gates')
table(['Stage','Deliverable and acceptance gate'],[('1. Reconcile source','Freeze clean source inventory and truthful capability/requirement map; resolve current uncommitted changes and shared DPDP lane boundary.'),('2. DPDP content','Legal owner signs versioned obligations, applicability, controls, evidence methods and tests against final Gazette/corrigenda.'),('3. Product gaps','Finish production connector and observation, customer recovery, account/Billing decisions, catalogue adoption and complete UI journeys.'),('4. Qualification','Run contracts, unit/integration, adverse/isolation/failure, accessibility and browser journeys on exact candidate; retain failures.'),('5. Security/recovery','Independent threat, supply-chain, penetration, secret/key, backup/restore and data-egress assessment; close findings.'),('6. Release','Freeze manifest, run canonical T01-T34 and two human rehearsals; obtain C00 and release authority approval.'),('7. Customer onboarding','Document installation, least privilege, migration/import, connector conformance, support minimisation and rollback.'),('8. Ongoing updates','Monitor law and product changes, publish reviewed signed content, customer preview/adoption and regression.'),('9. V2','Only then evaluate custom AI with separate data, evaluation and approval gates; no V1 model dependency.')],[100,395])

h('12 | Research and verification appendix')
p('The legal sources below are primary. Competitor pages are vendor statements; the three list articles are discovery indexes only. References describe what a source publicly says, not proof that ORVIA implements it. Checked 25 September 2026 unless otherwise stated. Product packaging and pricing change and must be rechecked before a customer quotation.')
refs=[
('R1','Approved ORVIA Rev 1.4 master','repository: ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md'),
('R2','CURRENT_STATE.md; candidate/acceptance status','repository: CURRENT_STATE.md'),
('R3','Capability register and contract','repository: tracking/capabilities.json; docs/prototype/CONTRACT.md'),
('R4','Tasks and handoffs','repository: tracking/tasks.json; handoffs/codex/2026-09-24-dpdp-lane-boundary.md'),
('L1','Digital Personal Data Protection Act, 2023','https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf'),
('L2','Final Digital Personal Data Protection Rules, 2025, G.S.R. 846(E)','https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf'),
('L3','Act commencement notification, G.S.R. 843(E); Rules page has corrigendum','https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf'),
('M1','Redacto platform comparison (vendor-authored)','https://www.redacto.ai/en-in/blogs/data-privacy-management-platforms'),
('M2','IQWorks platform comparison (vendor-authored)','https://iqworks.ai/blog/best-dpdpa-compliance-platforms'),
('M3','miniOrange platform comparison (vendor-authored)','https://www.miniorange.com/data-privacy/dpdp/best-dpdp-compliance-tools'),
('V1','OneTrust product and pricing','https://www.onetrust.com/products/ ; https://www.onetrust.com/pricing/'),
('V2','BigID discovery, retention and pricing','https://bigid.com/discovery-classification/ ; https://bigid.com/retention/ ; https://home.bigid.com/pricing'),
('V3','Securiti platform','https://securiti.ai/'),
('V4','Vanta automated compliance and pricing','https://www.vanta.com/products/automated-compliance ; https://www.vanta.com/pricing'),
('V5','Drata evidence overview','https://help.drata.com/en/articles/13404035-evidence-overview'),
('V6','ServiceNow privacy management content','https://www.servicenow.com/docs/r/store-release-notes/store-grc-rn-privacy-mgmt-content.html'),
('V7','MetricStream GRC product','https://www.metricstream.com/'),
('V8','Sprinto continuous compliance','https://sprinto.com/continuous-compliance/'),
('V9','Scrut compliance automation','https://www.scrut.io/platform/compliance-automation'),
('V10','miniOrange DPDP; Consentin','https://www.miniorange.com/data-privacy/dpdp/ ; https://www.consent.in/'),
('G1','TSI Coop DPDP CMS','https://github.com/tsi-coop/tsi-dpdp-cms'),
('G2','SyntheticDataHub','https://github.com/samerfarida/SyntheticDataHub'),
('G3','DecisionsDev policy-corpus','https://github.com/DecisionsDev/policy-corpus'),
('G4','OpenDP differential privacy test datasets','https://github.com/opendp/dp-test-datasets')]
table(['ID','Source','Location'],refs,[32,178,285])
p('Methods and limits: the supplied 16-page and CEO-ready PDFs were read as background. No vendor tenant, contract, API, pricing proposal or deployment was inspected. No benchmark of ORVIA against a competitor was run. No legal advice or compliance certification is asserted. The current working tree was inspected but not frozen or acceptance-tested for this document.')

h('Leadership glossary | Read the status without internal shorthand')
p('The codes below are identifiers in the engineering and acceptance records, not product features or claims that a test passed. Every T01-T34 full application scenario is currently recorded as NOT_RUN. A smaller unit or integration test can pass without satisfying one of these scenarios. [R2,R4]')
table(['Term','Plain-language meaning'],[
('T01-T34','Thirty-four named full application acceptance scenarios. T is a test ID. Each must be run and evidenced on an exact identified candidate before a PASS can be claimed.'),
('P0 / P1','Priority 0 is mandatory for the core acceptance gate. Priority 1 is optional or later depth in the bounded sprint; it is not automatically delivered.'),
('M01-M33','The 33 master module identifiers. A module may have a working subset while its full commercial scope remains unfinished.'),
('V1 / V2','Version 1 is the customer-local non-model product baseline. Version 2 reserves seven custom-AI modules and has not shipped.'),
('BUILT subset / PARTIAL','BUILT subset means specific behaviour has engineering evidence in the synthetic profile. PARTIAL means an important clause or surface remains absent.'),
('NOT_RUN / PASS','NOT_RUN means the specified test has not been executed with qualifying evidence. PASS requires actual recorded results on the right candidate; a plan or earlier run is insufficient.'),
('Frozen candidate / rehearsal','A frozen candidate is an exact source, build, dependencies and manifest identity. A rehearsal repeats full customer journeys against that same identity under human supervision.'),
('DPDPA / DPDP Rules','India\'s Digital Personal Data Protection Act, 2023, and its final 2025 implementing Rules. They have phased commencement.'),
('GRC / DSPM / CMP','Governance, risk and compliance; Data Security Posture Management; Consent Management Platform.'),
('DSR / DSAR / DPIA / RoPA','Data Subject Request; Data Subject Access Request; Data Protection Impact Assessment; Record of Processing Activities. ORVIA uses the Act\'s term Data Principal for the person.'),
('RLS / OPA','PostgreSQL Row Level Security restricts rows by scope; Open Policy Agent evaluates configured policy decisions.'),
('Receipt / epoch / observation','A receipt records an accepted event. An epoch orders consent changes. An observation is an independent check of what a target system actually did.'),
('UNKNOWN effect','A command may have succeeded after a timeout, or an acknowledgement may have been misleading. ORVIA must keep the outcome unresolved until it can check safely.')],[139,356])
sub('What each acceptance test asks, in plain English')
tests=[
('T01','Can a fresh local installation start cleanly?'),('T02','Can an owner set up and sign in securely?'),('T03','Are organisations and environments isolated?'),('T04','Are principals, staff and vendors kept separate?'),('T05','Are permissions and approvals enforced by the server?'),('T06','Do settings and relationships survive restart?'),('T07','Does consent bind to the exact notice and purpose?'),('T08','Is a withdrawal recorded atomically and durably?'),('T09','Are retries and simultaneous consent changes safe?'),('T10','Can an old event wrongly restore withdrawn consent?'),('T11','Does accepted work resume after a worker crash?'),('T12','Are connector commands signed and tightly scoped?'),('T13','Did the synthetic CRM really change, as read back?'),('T14','Is a marketing send blocked after withdrawal?'),('T15','Are unrelated purposes judged independently?'),('T16','Does a policy outage block unsafe processing?'),('T17','Can a lost response be reconciled without unsafe retry?'),('T18','Can an acknowledgement with no effect be detected?'),('T19','Are failed attempts bounded and escalated?'),('T20','Are manual and unsupported targets labelled honestly?'),('T21','Do evidence and dashboard figures match records?'),('T22','Are exports local, scoped, authorised and audited?'),('T23','Does the healthy regression scenario really run?'),('T24','Does a deliberately broken fixture fail and then recover?'),('T25','Does a restored old target remain safely quarantined?'),('T26','Can core work run without vendor or model internet?'),('T27','Are sessions, inputs, secrets and logs protected?'),('T28','Are reset and fault tools restricted to synthetic data?'),('T29','Does the full browser journey show real states and errors?'),('T30','Can two rehearsals reproduce one frozen candidate?'),('T31','Can a rights case be coordinated within its actual scope?'),('T32','Can a retention hold review proceed without fake deletion?'),('T33','Can a development licence be verified and rejected safely?'),('T34','Can reviewed non-model help point to real records?')]
table(['Test','Question the leadership team is asking'],tests,[55,440])

def footer(canvas,doc):
    canvas.saveState(); w,h=A4
    canvas.setStrokeColor(TEAL);canvas.line(42,38,w-42,38)
    canvas.setFont('ArialEmbedded',8);canvas.setFillColor(GREY)
    canvas.drawString(42,27,'ORVIA  |  Leadership decision dossier  |  25 Sep 2026')
    canvas.drawRightString(w-42,27,f'{doc.page}')
    canvas.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=42,leftMargin=42,topMargin=45,bottomMargin=50,title='ORVIA Leadership DPDPA Product and Market Dossier',author='Cyberfyx ORVIA research')
doc.build(story,onFirstPage=footer,onLaterPages=footer)
print(OUT)
