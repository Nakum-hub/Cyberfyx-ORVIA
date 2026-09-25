from pathlib import Path
import json
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate,Paragraph,Table,TableStyle,Spacer,PageBreak
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.styles import ParagraphStyle

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/pdf/ORVIA_Leadership_Market_Position_2026-09-25.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
pdfmetrics.registerFont(TTFont('ArialEmbedded',r'C:\Windows\Fonts\arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBoldEmbedded',r'C:\Windows\Fonts\arialbd.ttf'))
N=colors.HexColor('#14283f'); T=colors.HexColor('#087c82'); P=colors.HexColor('#edf5f4'); M=colors.HexColor('#435466')
title=ParagraphStyle('title',fontName='ArialBoldEmbedded',fontSize=25,leading=31,textColor=N,spaceAfter=15)
deck=ParagraphStyle('deck',fontName='ArialEmbedded',fontSize=12,leading=17,textColor=M,spaceAfter=14)
h1=ParagraphStyle('h1',fontName='ArialBoldEmbedded',fontSize=15,leading=20,textColor=N,spaceBefore=16,spaceAfter=8,keepWithNext=True)
h2=ParagraphStyle('h2',fontName='ArialBoldEmbedded',fontSize=11,leading=15,textColor=T,spaceBefore=10,spaceAfter=5,keepWithNext=True)
body=ParagraphStyle('body',fontName='ArialEmbedded',fontSize=9.7,leading=14,spaceAfter=7,textColor=N)
cell=ParagraphStyle('cell',fontName='ArialEmbedded',fontSize=8.5,leading=12,textColor=N)
head=ParagraphStyle('head',fontName='ArialBoldEmbedded',fontSize=8.5,leading=12,textColor=colors.white)
small=ParagraphStyle('small',fontName='ArialEmbedded',fontSize=8.2,leading=11.5,spaceAfter=5,textColor=M)
compact_cell=ParagraphStyle('compact_cell',fontName='ArialEmbedded',fontSize=7.5,leading=10,textColor=N)
compact_head=ParagraphStyle('compact_head',fontName='ArialBoldEmbedded',fontSize=7.5,leading=10,textColor=colors.white)
s=[]
def p(x,style=body):s.append(Paragraph(escape(x),style))
def h(x):p(x,h1)
def sub(x):p(x,h2)
def tab(headers,rows,widths,compact=False):
 hs=compact_head if compact else head; cs=compact_cell if compact else cell
 pad=4 if compact else 7
 d=[[Paragraph(escape(str(x)),hs) for x in headers]]+[[Paragraph(escape(str(x)),cs) for x in row] for row in rows]
 t=Table(d,colWidths=widths,repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),N),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,P]),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),pad),('RIGHTPADDING',(0,0),(-1,-1),pad),('TOPPADDING',(0,0),(-1,-1),pad),('BOTTOMPADDING',(0,0),(-1,-1),pad)]))
 s.append(t);s.append(Spacer(1,9))

p('ORVIA',title)
p('Where the product stands out: a grounded leadership comparison',deck)
p('25 September 2026  |  For the CEO and co-founder  |  Internal positioning brief',small)
p('ORVIA gives privacy teams a way to connect a person\'s choice to the downstream action it requires, check the result at the target, and retain the evidence. The same customer-local system links that work to policies, assets, owners, tests and coverage. This is the centre of the ORVIA story: decisions, action and proof live in one traceable chain. [O1-O3]')
p('This brief describes capabilities recorded in ORVIA\'s customer-local synthetic engineering profile. Its market comparisons describe each peer\'s public emphasis and ORVIA\'s own evidence-backed approach; they are not a benchmark or a claim that a competitor lacks a feature. [O1-O3]',small)

h('The product case in five points')
tab(['Strength','What ORVIA does'],[
('A privacy action has an outcome','Withdrawal creates durable work. The connector response is recorded separately from an independent, scoped read of the target. A timeout or unchanged target remains an unresolved effect. [O2]'),
('Consent stays ordered','The recorded grant binds to the exact notice and purpose. Epochs and replay checks prevent an older event from reversing a newer withdrawal. [O2]'),
('Evidence has a source','Receipts, actions, observations and test results form a persisted timeline. Exports name coverage limits, and reports draw from the records used by the product rather than independent dashboard arithmetic. [O2]'),
('Customer control is structural','Operational state stays in the customer installation; tenant and environment scope, signed connector commands, local evidence and bounded support diagnostics are explicit boundaries. [O1,O2]'),
('Control health can be tested','Regression scenarios execute real policy and target checks; broken controls create recorded failures and a repaired run is separately evidenced. Coverage identifies stale or missing observations. [O2]')],[140,355])

h('Comparison with enterprise privacy and GRC platforms')
p('A broader vendor product suite and a narrower customer-local execution chain can both be valuable. The comparison below states the work each product publicly emphasises and the ORVIA capability a buyer can examine directly. [P1-P8]')
enterprise=[
('OneTrust','Global consent, privacy operations, DSR, third-party risk and AI governance. [P1]','Consent-to-target effect trace: exact notice, ordered withdrawal, durable command, independent observation and evidence. [O2]'),
('BigID','Enterprise data discovery, classification, privacy and retention. [P2]','A typed asset and processing graph with distinct asserted versus observed provenance and freshness, connected to action and test records. [O2]'),
('Securiti','Data intelligence, discovery, governance and privacy automation. [P3]','Customer-local policy and action records that keep the outcome unresolved until the target is checked. [O1,O2]'),
('ServiceNow','Enterprise risk, policy, control and workflow management. [P4]','A privacy-specific chain from consent event to connector action and independently observed target state. [O2]'),
('MetricStream','Enterprise GRC, risk, control, policy and audit programs. [P5]','A concrete operational privacy event can be tied to evidence, a test result, and a coverage gap in the customer installation. [O2]'),
('TrustArc','Privacy program management, consent and rights workflows. [P6]','Version-bound notice and consent, safe withdrawal ordering and explicit observed versus unknown outcome. [O2]'),
('IBM Guardium','Data security and database activity visibility. [P7]','Privacy-purpose and consent context attached to governed actions and verification, with customer-local evidence. [O2]'),
('PrivacyEngine','Privacy program operations and training, as catalogued in the supplied market index. [I1]','Action-level proof complements governance records: a persisted command and a separate observation can be reviewed. [O2]')]
tab(['Platform','Public emphasis','ORVIA evidence-backed angle'],enterprise,[82,176,237])

h('Comparison with continuous compliance platforms')
controls=[
('Vanta','Framework/control mapping, automated tests, evidence collection and continuous monitoring. [P8]','A privacy test can check the effect of a withdrawal in a target, with a deliberately broken fixture retained as a failure. [O2]'),
('Drata','Controls, requirements, tests, evidence and audit workflows. [P9]','ORVIA connects the control record to an operational consent/action/observation timeline. [O2]'),
('Sprinto','Continuous compliance checks, evidence and remediation. [P10]','A stale observation or failed action becomes a named coverage gap; a success label requires the expected evidence. [O2]'),
('Scrut','Control and evidence automation with manual and automated evidence states. [P11]','ORVIA separates automated target observation, manual attestation and unresolved effects in its record. [O2]')]
tab(['Platform','Public emphasis','ORVIA evidence-backed angle'],controls,[82,176,237])

h('Comparison with India-oriented privacy products')
p('The three supplied market indexes identify this peer set. Their rankings are marketing material, so this table focuses on the ORVIA workflow a buyer can inspect instead of declaring a winner. [I1-I3]')
india=[
('Redacto','DPDPA privacy operations: consent, rights, assessments, vendors and breach workflows. [I1]','Purpose-bound consent and withdrawal can be followed through signed local action, readback and evidence. [O2]'),
('ComplyIQ','AI-assisted DPDPA operations, as described in its market index. [I2]','ORVIA\'s executable consent and target checks run without a model dependency. [O1,O2]'),
('IDfy Privy','India-focused consent and privacy governance. [I1-I3]','ORVIA places ordering, replay refusal and independent effect verification at the centre of its consent journey. [O2]'),
('miniOrange','DPDP privacy software alongside identity, security and managed services. [P12]','Customer-local records retain tenant scope, notice version, purpose and target observation in one chain. [O2]'),
('Consentin / Leegality','DPDP consent and privacy-centre positioning. [I3]','ORVIA links a principal\'s withdrawal receipt to durable target work and its verified or unresolved result. [O2]'),
('GoTrust','DPDP privacy and compliance operations. [I3]','ORVIA makes action, observation, evidence and regression test separately inspectable. [O2]'),
('Seqrite','Security-led privacy and data protection. [I1,I3]','ORVIA adds purpose and consent state to the workflow and checks the business effect at the target. [O2]'),
('Perfios DPDP Suite','India-oriented DPDP workflow suite. [I3]','A narrow, verifiable privacy journey is represented from principal event through evidence and coverage. [O2]'),
('PrivaSapien','Privacy and responsible-AI positioning. [I2,I3]','ORVIA\'s current control graph and policy/test spine make an auditable base for governed data use. [O2]'),
('DataSafeguard','Data protection and governance positioning. [I2,I3]','ORVIA connects a declared data purpose to exact consent and an independently checked downstream action. [O2]'),
('Cross Identity / Vishwaas AI','DPDP automation positioning. [I3]','ORVIA\'s recorded authority, signed action scope and observed effect offer a specific assurance path. [O2]')]
tab(['Platform','Public emphasis','ORVIA evidence-backed angle'],india,[98,160,237])

h('Comparison with specialist products')
special=[
('Privado','Engineering-led privacy and data-flow visibility. [I2]','ORVIA\'s graph attaches purpose, policy, workflow, test and observation history to reviewed assets. [O2]'),
('Lightbeam','Data discovery and privacy analytics. [I2,I3]','ORVIA uses provenance and freshness to distinguish a declared asset from an observed one. [O2]'),
('CookieYes','Website cookie and consent management. [I2,I3]','ORVIA carries purpose-specific consent beyond collection into a durable downstream workflow and readback. [O2]'),
('Usercentrics','Multichannel consent management. [I3]','ORVIA emphasises the customer-side operational consequence of a choice, not only its capture. [O2]'),
('Osano','Consent and vendor-risk automation. [I3]','ORVIA binds choices to local policy and target state, with an explicit unresolved state when proof is absent. [O2]'),
('KavachOne / ConsentiQo','Consent and preference management. [I3]','ORVIA shows how a preference change propagated to a declared target and how it was checked. [O2]'),
('Certinal','Governance and workflow automation. [I3]','ORVIA keeps event, action, observation and regression evidence linked. [O2]'),
('Consently','Consent collection and records. [I3]','ORVIA connects a recorded consent change to bounded processing and target verification. [O2]')]
tab(['Platform','Public emphasis','ORVIA evidence-backed angle'],special,[98,160,237])

h('A leadership statement that can be defended')
p('ORVIA is building its market case around operational proof. Its engineering foundation already connects exact consent and notice state, durable customer-local workflows, scoped connector commands, independent target observations, evidence, tests and coverage. That chain gives Cyberfyx a clear way to demonstrate value: show the same privacy event from a person\'s choice through the system response and the resulting record. [O1-O3]')
p('This brief is an engineering positioning document. The current working tree has changes beyond the last documented qualification checkpoint. Full application acceptance and the two exact-candidate rehearsals are recorded as NOT_RUN, so this brief does not claim production release, legal certification or measured superiority. [O1,O3]',small)

h('The twelve questions from the CEO and co-founder')
p('The comparison above remains the market position. The following twelve sections answer the operating, technical and delivery questions behind it. “Current” refers to the repository capability register and documented engineering checkpoint, not a released customer installation. [O1-O3]')

sub('1. Use cases and the reference used to test them')
p('Each case needs a real actor, a permitted input, a durable action, an independent check and evidence. The reusable reference is the deterministic Aster/Birch synthetic installation, not customer records. The table names the result and adverse case a reviewer should expect. [O1-O3]')
tab(['Actor and input','Processing to result','Test basis and failure'],[
('Data Principal grants marketing consent against a notice and purpose.','ORVIA binds the grant to the exact notice version, records a receipt and ordered epoch, and admits only the authorised purpose.','Positive: exact receipt and purpose. Negative: stale notice, replay or wrong purpose is denied. [O2]'),
('Data Principal withdraws marketing consent.','ORVIA commits the new state, creates durable work, sends a signed scoped command, reads the target separately and records the observed result.','Positive: target suppression observed. Negative: timeout or acknowledgement without effect remains unresolved. [O2]'),
('Privacy administrator changes a notice.','A reviewed notice version is published with language, content digest and time; later consent references that version.','Positive: exact version served. Negative: mismatch or unapproved content cannot silently replace historical notice. [O2]'),
('Principal or representative submits a rights case.','The case is scoped by identity and mandate, assigned, and linked to permitted actions and response evidence.','Positive: own case is tracked. Negative: ambiguous identity, wrong principal or retention hold stops unsupported completion. [O2]'),
('Owner reviews a retention or processor obligation.','ORVIA links copy, purpose, vendor, hold, evidence and action to the customer-local record.','Positive: evidence-backed decision. Negative: stale evidence, failed deletion or unobserved processor copy stays open. [O2]'),
('Control owner runs a privacy test.','The test executes real policy/target assertions and stores actual result, scope and evidence.','Positive: healthy run passes. Negative: deliberately broken fixture fails; interruption is an error, not success. [O2]')],[138,177,180])
p('The current synthetic profile exercises substantial parts of these cases. Production target breadth, full customer journeys and exact-candidate acceptance have separate gates; the table is a test contract, not an assertion that those gates ran. [O2,O3]',small)

sub('2. Competitive analysis, function by function')
p('The preceding platform-by-platform pages provide the named product comparison. This matrix makes the purchasing criteria explicit. “Built subset” means the function is represented and exercised in the customer-local synthetic profile; it does not mean equal breadth to a vendor suite. [O2,P1-P12]')
tab(['Function buyers inspect','ORVIA current position','Relevant peer emphasis'],[
('Consent, notice, withdrawal','Built subset: exact version, purpose, receipt, ordering and withdrawal.','OneTrust, Redacto, Privy, miniOrange and consent specialists.'),
('Rights and retention','Built subset: cases, scoped review, copy/hold decisions and recorded outcomes.','OneTrust, BigID, TrustArc and India-focused privacy suites.'),
('Discovery and data mapping','Built subset: typed graph, provenance, review and freshness.','BigID, Securiti, OneTrust, Privado and Lightbeam.'),
('Controls, evidence and tests','Built subset: policy decisions, evidence, executable regression and gaps.','Vanta, Drata, Sprinto, Scrut, ServiceNow and MetricStream.'),
('Vendors, incidents and reporting','Built subset: relationship and case records, evidence and reports.','Enterprise privacy/GRC suites and India-focused peers.'),
('AI governance','Master includes AI roadmap modules; the current register marks M19-M25 deferred V2.','OneTrust, Securiti and PrivaSapien publicly position AI governance.'),
('Integrations and monitoring','Built subset against declared synthetic/local targets; signed commands and independent readback are a clear ORVIA design emphasis.','Large suites market broader connector ecosystems.')],[126,194,175])
p('Packaging matters: feature availability and price vary by vendor contract or tier. A fair procurement comparison should request the exact module list, deployment model, connector permissions, evidence semantics and quote for the same buyer scenario. [P1-P12]')

sub('3. Complete architecture and 33-module inventory')
p('The architecture has an ordered spine: identity and tenant authority -> privacy graph -> policy -> durable workflow -> scoped connector -> independent verification -> evidence -> test. Privacy operations use that spine; commercial/runtime modules surround the installation. The approved master reserves modules 19-25 for the custom-AI roadmap. [O1,O2]')
caps=json.loads((ROOT/'tracking/capabilities.json').read_text(encoding='utf-8'))['capabilities']
purpose={
'M01':'Authenticates staff and principals; enforces roles.','M02':'Scopes organisation, entity and environment.','M03':'Links systems, assets, categories, purposes and provenance.','M04':'Evaluates published policy decisions.','M05':'Persists and resumes privacy work.','M06':'Restricts connector targets and operations.','M07':'Reads target state independently.','M08':'Preserves receipts, observations and reports.','M09':'Executes control assertions and records results.','M10':'Tracks notification obligations and status.','M11':'Records purpose-specific consent and withdrawal.','M12':'Versions and serves notices.','M13':'Presents principal-facing privacy actions.','M14':'Coordinates rights cases and actions.','M15':'Manages retention eligibility and holds.','M16':'Tracks processor relationships and evidence.','M17':'Tracks privacy incidents and duties.','M18':'Derives coverage, failures and gaps.','M19':'Custom AI privacy assistance.','M20':'Custom AI discovery.','M21':'Custom AI policy drafting.','M22':'Custom AI workflow drafting.','M23':'Custom AI risk and drift analysis.','M24':'Custom AI test generation.','M25':'Custom AI incident analysis.','M26':'Commercial billing.','M27':'Locally verifies signed licences.','M28':'Applies edition entitlements.','M29':'Guides customer onboarding.','M30':'Creates bounded local support diagnostics.','M31':'Validates signed update manifests and records steps.','M32':'Records service and boundary monitoring.','M33':'Administers scoped audit history.'}
rows=[]
for c in caps:
 st={'IMPLEMENTED_SANDBOX_SUBSET':'Built subset','PARTIAL_SANDBOX':'Partial','NOT_IMPLEMENTED':'Not built','DEFERRED_V2':'V2'}[c['implementation_status']]
 rows.append((c['module_id']+' '+c['name'],purpose[c['module_id']],st))
tab(['Module','What it does','Register status'],rows,[177,239,79])
p('Customer runtime: the APIs, workspace, principal centre, database, worker, connectors, evidence and tests. Vendor side: account, licence/download/update and support metadata under a separate authority boundary. The register and requirement files provide the module-level implementation and test references. [O1,O2]')

sub('4. The actual database and information model')
p('ORVIA keeps a separate customer-local PostgreSQL operational database. It stores governance metadata and privacy state while the customer’s CRM, HR and other applications remain authoritative for their own records. Tenant and environment scope applies to business reads, jobs and exports. [O1,O2]')
tab(['Record family','Relationship in the product'],[
('Organisation, environment, identity, role','Root of isolation and authority; owns all customer records.'),
('Source version, provision, obligation, control','Connects reviewed law or policy to an applicable customer implementation and required proof.'),
('System, asset, data category, activity, purpose','Describes where data resides, why it is processed, who owns it and how a claim was learned.'),
('Notice, consent, principal, rights request','Binds a person’s choice and request to an exact version, purpose, identity and action.'),
('Processor, vendor, copy, hold, incident','Shows external relationships, preservation decisions and event duties.'),
('Workflow, command, acknowledgement, observation','Keeps intended action, external response and observed effect as distinct facts.'),
('Evidence, test, result, finding, audit','Makes a control claim traceable to a method, actual result and remediation history.')],[154,341])
p('Target control graph: source -> provision -> obligation -> applicability -> control -> customer implementation -> evidence requirement -> verification method -> test -> result -> finding. The present schema contains substantial operational nodes and links; the complete reviewed regulatory-to-control catalog is a separate content deliverable. [O1,O2]')

sub('5. How DPDP controls enter ORVIA')
p('Every control should retain the official source version, section or rule, commencement date, interpretation owner, applicability, customer configuration, expected evidence, automated verification method, test and supersession. This keeps a legal interpretation distinct from a software observation. The Act and final Rules have phased commencement. [L1,L2]')
tab(['Control family','ORVIA / customer contribution','What can be checked; what needs judgement'],[
('Scope and lawful basis','ORVIA records the processing/purpose graph; the customer supplies its role, basis and exemption facts.','Configured applicability can be checked; legal qualification needs the accountable privacy/legal owner.'),
('Notice, consent and withdrawal','ORVIA versions notice, purpose, grant and withdrawal; customer authors the approved wording and touchpoints.','Version, receipt and target effect can be tested; clarity and adequacy need review.'),
('Security, processors and breach','ORVIA tracks relationships, tasks, controls and evidence; customer supplies actual measures, contracts and incident facts.','Missing/stale records and dated workflow steps can be checked; security adequacy and materiality need expert evidence.'),
('Rights, accuracy, retention and erasure','ORVIA coordinates cases, holds, eligibility and supported actions; customer supplies identity proof and source-system scope.','Connected actions can be observed; real-world accuracy and unseen copies require customer evidence.'),
('Children, SDF duties and cross-border','ORVIA records configured gates, assessments and destination facts; customer supplies designation and trusted proof.','Configured gates and evidence presence can be checked; age, professional assessment and legal restrictions need review.'),
('Registered Consent Manager','A separate role-specific control family applies only if the customer actually holds that regulated role.','A consent product alone does not establish registration or satisfaction of Consent Manager duties.')],[112,196,187])

sub('6. Synthetic database and test-data reference')
p('The repeatable test reference is an ORVIA-owned synthetic Aster/Birch fixture, never customer operational data. A fixture version should pin schema migration, seed, controlled clock, source/build, target behaviour, requirement/control ID and expected outcome. Synthetic records allow deliberate wrong-tenant access, races, old events and faulty targets to be tested safely. [O2,O3]')
tab(['Fixture set','Example and expected result'],[
('Positive','Aster principal, notice, purpose, consent, declared CRM target, processor and control: correct action and observed result.'),
('Negative','Wrong role, stale notice, withdrawn consent, missing processor evidence: deny or open an explained finding.'),
('Boundary','Expiry and retention threshold, simultaneous consent epochs and exact deadline: deterministic ordering and recorded result.'),
('Cross-tenant','Aster and Birch share colliding synthetic IDs: no read, action, job or export crosses the boundary.'),
('Stale or failed target','Old observation, target timeout, accepted-but-unchanged state, retry exhaustion: unresolved or failed effect, never a manufactured pass.'),
('Rights, vendor, retention, incident','Invalid representative, terminated processor, legal hold, backup exception, unknown incident scope: route to bounded review and retain evidence.')],[112,383])
p('External repositories are references, not the canonical ORVIA baseline: TSI DPDP CMS for workflow comparison; SyntheticDataHub for sample-shaped synthetic records after licence review; DecisionsDev policy-corpus for ground-truth test methodology; OpenDP dp-test-datasets for differential privacy only. [G1-G4]')

sub('7. What “baseline” means here')
tab(['Baseline','Source and owner','Version and ORVIA use'],[
('Regulatory','Official Act, final Rules and notifications; privacy/legal content owner.','Source edition, publication/effective date; controls cite this exact version.'),
('Product','Approved master revision 1.4; product owner and engineering.','Document hash and commit; defines V1/V2 scope and decisions.'),
('Control','Reviewed definitions and customer instances; privacy/control owner.','Pack and instance versions; binds applicability, evidence and test.'),
('Test','Synthetic fixture, expected outcomes, tests; QA/control engineering.','Seed, case and build; makes adverse and healthy runs reproducible.'),
('Security','Authorisation, isolation, key, recovery and dependency requirements; security owner.','Assessment version and findings; release prerequisite.'),
('Release','Exact build, dependencies, catalogs and acceptance record; release authority.','Candidate and manifest hashes; bounds what may be claimed or shipped.')],[86,192,217])

sub('8. What is built now')
p('The repository has advanced beyond the original vertical slice. The latest documented engineering checkpoint recorded 100 of 104 routed requirements built and exercised; the four remaining routed items belonged to Billing. The current register marks 22 modules as built sandbox subsets, three partial, one not implemented and seven reserved for V2. This is code and component evidence, not formal full-application acceptance. [O1-O3]')
p('Today’s worktree contains further uncommitted edits, so historical component results cannot automatically certify it. T01-T34 full application scenarios remain NOT_RUN in the canonical record, and the frozen candidate remains unidentified. The prior comparison pages deliberately lead with the demonstrable design and engineering strengths while this status remains visible to decision-makers. [O1-O3]')
p('Requirement-level details live in tracking/tasks.json and tracking/capabilities.json. Each status should be promoted only with the corresponding running journey, test result and candidate identity. [O2,O3]')

sub('9. What the catalogs contain and how they are adopted')
tab(['Catalog','Content and adoption'],[
('Regulatory','Versioned Act/Rule source, provision, effective date and reviewed interpretation; select an applicable edition.'),
('Control','Definition, applicability, owner, evidence requirement, test and customer instance; preview impact before adoption.'),
('Connector','Declared target and operation, permissions, version, conformance and observation method; install only allowlisted packages.'),
('Evidence and test','Evidence type, freshness, observation method, expected result and regression case; keep results tied to exact definitions.'),
('Policy and workflow','Reviewed template with safe parameters; instantiate for a customer environment and preserve earlier versions.'),
('Commercial/download','Edition, entitlement, signed artifact and support terms; keep vendor metadata separate from operational records.')],[119,376])
p('Adoption sequence: sign and publish a catalog version; customer previews applicability, permissions and migrations; authorised owner selects and configures it; ORVIA instantiates scoped records; tests establish the new result; prior evidence retains its original version. The current application has policy, connector, evidence, test, licence and update primitives; a complete reviewed content/distribution catalog has its own delivery and sign-off gate. [O1,O2]')

sub('10. What the customer receives')
p('The intended purchase is a licensed ORVIA installation with approved content and update/support terms. The downloaded runtime runs the Customer Workspace, Data Principal Privacy Centre, APIs, durable worker, customer-local database and allowed connectors inside the customer environment. A separate ORVIA Account and vendor website handle commercial identity, entitlement and signed download/update metadata. [O1]')
p('The vendor boundary is narrow: operational records, principal identifiers, evidence, credentials and logs stay local. A customer may deliberately preview and approve a minimised diagnostic bundle. A connector is installed with named target, operation, permission, version and conformance checks. Licence and update records may cross as limited metadata; vendor authority does not become customer authority. [O1,O2]')
p('Current engineering includes local licensing, support-bundle and update-manifest subsets. Commercial Billing and the complete vendor account/download operation are separate deliverables. This distinction keeps the customer product promise precise. [O2]')

sub('11. Delivery sequence and decision gates')
tab(['Gate','Deliverable and evidence required'],[
('Reconcile current state','Freeze a clean source inventory, requirement map and one-writer boundaries; qualify every new change.'),
('DPDP control content','Legal/content owner reviews source-to-obligation-to-control mappings and effective dates.'),
('Production integrations','Select customer targets; qualify permissions, action safety, observation, timeout and rollback behaviour.'),
('Catalog and customer product','Versioned catalog adoption, installation, account/licence boundary and customer onboarding journeys.'),
('Application qualification','Run full positive, adverse, cross-tenant, browser and recovery scenarios on the exact build.'),
('Security and release','Assess keys, supply chain, isolation, recovery and egress; run T01-T34 and two rehearsals; human release sign-off.'),
('Ongoing content','Publish reviewed regulatory/control updates with customer preview, impact analysis and regression.'),
('Custom AI roadmap','Evaluate the seven reserved V2 modules against separate model, data, safety and evidence gates.')],[120,375])

sub('12. Research trail and its meaning')
p('Official Indian law controls the regulatory analysis: the DPDP Act 2023, final DPDP Rules 2025, commencement notification and corrigenda. Official vendor pages describe vendor products; the supplied Redacto, IQWorks and miniOrange articles serve as discovery indexes, not independent product testing. NIST Privacy Framework and ISO/IEC 27701 are optional control-design references, not Indian legal requirements. A NIST workshop video is a useful orientation resource, not evidence of ORVIA implementation. [L1,L2,N1,N2,N3,I1-I3]')
p('The full source table below separates ORVIA repository evidence, official vendor documentation, regulatory sources and external reference material. A source saying a control is desirable never means ORVIA has shipped it; the register and executed acceptance records decide that. [O1-O3]')

h('Source notes')
refs=[
('O1','Approved ORVIA Version 1 master, revision 1.4; CURRENT_STATE.md','Repository, 25 Sep 2026'),
('O2','tracking/capabilities.json; docs/prototype/CONTRACT.md; integration suites and code','Repository, 25 Sep 2026'),
('O3','docs/prototype/ACCEPTANCE.md; tracking/tasks.json','Repository, 25 Sep 2026'),
('P1','OneTrust products','https://www.onetrust.com/products/'),
('P2','BigID discovery and classification','https://bigid.com/discovery-classification/'),
('P3','Securiti platform','https://securiti.ai/'),
('P4','ServiceNow privacy management content','https://www.servicenow.com/docs/r/store-release-notes/store-grc-rn-privacy-mgmt-content.html'),
('P5','MetricStream','https://www.metricstream.com/'),
('P6','TrustArc','https://trustarc.com/'),
('P7','IBM Guardium','https://www.ibm.com/guardium'),
('P8','Vanta automated compliance','https://www.vanta.com/products/automated-compliance'),
('P9','Drata evidence','https://help.drata.com/en/articles/13404035-evidence-overview'),
('P10','Sprinto continuous compliance','https://sprinto.com/continuous-compliance/'),
('P11','Scrut compliance automation','https://www.scrut.io/platform/compliance-automation'),
('P12','miniOrange DPDP','https://www.miniorange.com/data-privacy/dpdp/'),
('L1','Digital Personal Data Protection Act, 2023','https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf'),
('L2','Final DPDP Rules 2025 and commencement materials','https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa'),
('N1','NIST Privacy Framework','https://www.nist.gov/privacy-framework/privacy-framework'),
('N2','ISO/IEC 27701:2025 overview','https://www.iso.org/standard/27701'),
('N3','NIST Privacy Framework workshop video','https://www.nist.gov/news-events/events/2024/06/ready-set-update-privacy-framework-11-data-governance-and-management'),
('G1','TSI Coop DPDP CMS','https://github.com/tsi-coop/tsi-dpdp-cms'),
('G2','SyntheticDataHub','https://github.com/samerfarida/SyntheticDataHub'),
('G3','DecisionsDev policy-corpus','https://github.com/DecisionsDev/policy-corpus'),
('G4','OpenDP differential privacy datasets','https://github.com/opendp/dp-test-datasets'),
('I1','Redacto vendor-authored comparison','https://www.redacto.ai/en-in/blogs/data-privacy-management-platforms'),
('I2','IQWorks vendor-authored comparison','https://iqworks.ai/blog/best-dpdpa-compliance-platforms'),
('I3','miniOrange vendor-authored comparison','https://www.miniorange.com/data-privacy/dpdp/best-dpdp-compliance-tools')]
tab(['ID','Source','Location'],refs,[35,185,275],compact=True)

def footer(c,d):
 c.saveState();w,h=A4;c.setStrokeColor(T);c.line(42,39,w-42,39);c.setFont('ArialEmbedded',8);c.setFillColor(M)
 c.drawString(42,27,'ORVIA  |  Internal leadership positioning  |  25 Sep 2026');c.drawRightString(w-42,27,str(d.page));c.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=A4,leftMargin=42,rightMargin=42,topMargin=46,bottomMargin=52,title='ORVIA Leadership Market Position',author='Cyberfyx ORVIA')
doc.build(s,onFirstPage=footer,onLaterPages=footer)
print(OUT)
