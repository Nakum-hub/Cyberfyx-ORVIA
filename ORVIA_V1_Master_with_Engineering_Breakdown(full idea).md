# cyberfyx-orvia — ORVIA idea and complete engineering breakdown

**Decision chat:** `Orvia_idea` · **Product baseline:** Version 1 · **Custom AI:** Version 2, deferred.  
**Combined reference prepared:** 16 September 2026. The product master below remains document revision 1.3; the appended proposed engineering allocation is revision 1.0. This is not a new software release or a claim of implementation.

[Read the product idea](#orvia-section-1) · [Engineering breakdown / Appendix G](#appendix-g) · [20 roles](#g-roles) · [Four tracks](#g-tracks) · [36 work packages](#g-work-packages) · [Module ownership](#g-modules) · [Section traceability](#g-sections)

The complete supplied master is preserved unchanged between the following source markers, including its 218 product sections and historical appendices. Appendix G adds the requested role-wise execution view without rewriting the idea. Task allocations are proposals; product scope and privacy/security requirements remain the original master’s authority.

<!-- PRESERVED_PRODUCT_MASTER_START -->
# ORVIA

## Unified DPDPA Privacy Control Platform

### Product Version 1 — Unified Idea and Master Engineering Specification

### Product Version 2 — Preserved Custom-AI Roadmap

### For a 20-Person Senior Software Engineering Team and AI-Assisted Development

**Consolidated edition:** 16 September 2026.  
**Document revision:** 1.3 — Version 1 product baseline, optional deterministic Guided Assistance, and custom ORVIA AI deferred to Product Version 2.
**Product baseline:** ORVIA Version 1. **Future product scope:** ORVIA Version 2 — ORVIA Intelligence/custom AI.  
**Source scope:** Original sections 1–212 and refinement sections 213–250.  
**Status:** Proposed design for founder, engineering and privacy-counsel review. Not an implementation, security certification, legal opinion, or exhaustive consolidation of Indian law.

This is one topic-by-topic master, not two versions placed one after the other. Original sections 1–212 keep their numbers and titles. Later paragraphs, tables, examples and acceptance requirements are incorporated into the relevant existing sections without paraphrasing. Six standalone subjects continue the numbering as sections 213–218. All 250 source sections are accounted for in Appendix A.

Appendices A–E preserve the history through document revision 1.2. Document revision 1.3 adopts the user’s new release decision: retain the accumulated product design as the Version 1 baseline, put the custom ORVIA AI/model programme on hold for Product Version 2, and permit small, explicitly non-model Guided Assistance in Version 1. Changes are merged into the relevant existing sections. Appendix F records this revision’s exact diff and integrity checks. All 218 section numbers and titles remain unchanged; unrelated content and the full future custom-AI design remain in this one master.

The 36-hour prototype plan, its temporary implementation choices, AI task assignments and sprint deadlines are not changes to this product master and are not merged here. The original product roadmap, engineering roles and later product-level refinements remain included.

**Reference key:** `O§n` identifies an original source section, whose number is unchanged here. `V2§n` identifies a refinement source section; use Appendix A for its current location. `R1`–`R8` refer to the retained primary source register in section 218. Historical research dates, qualifications, proposed-design labels and review limitations remain as supplied. Revision 1.1 introduced security references `S1`–`S3`; revision 1.2 retains them and adds interface keys `T1`–`T8` and technical keys `U1`–`U10` in §218. `M0` and `M1` identify the historical document sources defined there. No document revision here newly verifies or approves the historical legal baseline. **`V2§n` is an old refinement-source identifier, not a Product Version 2 assignment.** Product releases, document revisions, original phases 0–5, and backlog priorities P0/P1/P2 are separate labels; see §§1 and 146.


**Governing customer requirements:** the complete licensed product is downloaded from the website and runs in the customer’s own environment; no customer operational/personal data is sent to ORVIA vendor infrastructure; only §31’s defined minimum business/licensing/service information may be collected. Security is a mandatory, testable and continuously maintained release obligation, not an “unbreachable” or “zero vulnerabilities” promise. These current requirements supersede older contradictory defaults; earlier hosted alternatives and original source text in the historical appendices are not active exceptions.

**Current integrated decisions:** ORVIA remains the official cloud distributor of signed complete-product ZIP bundles and profile artifacts; the customer's Workspace/Privacy Centre remain local, separate from the vendor Account and staff console. Vendor Super Admin/Admin have vendor-service authority only; Organisation Super Admin/Admin/Member and retained specialised roles govern each customer environment. Support uses approved minimal diagnostic information and customer-authorised local execution, not vendor root access. **Product Version 1 ships no learned-model AI or custom-model runtime.** Its optional **Guided Assistance** uses reviewed rules, templates, runbooks and local keyword/full-text search. **Product Version 2 preserves ORVIA Intelligence**: ORVIA-owned from-scratch weights, approved non-customer material, authorised Lightning development GPUs, and customer-local inference. Training, integration and GPU work are on hold for Version 1; no third-party model is substituted. AI coding assistance for building ORVIA remains permitted under §§121 and 188–190.

**Evidence status:** specification update only. No software implementation, model training, GPU provisioning/spending, quality benchmark, penetration test, data-egress test, security certification or production release is established by this document. UI previews remain historical synthetic illustrations, not deployed interfaces. Version 1 acceptance scenarios begin NOT_RUN; future model-specific scenarios are DEFERRED_V2, not passed. Calling this the Version 1 baseline records product scope and planning progress, not a claim that the entire application has been built or released.

**Release rule:** Version 1 must install, authenticate, execute, verify, test, provide human support, renew and upgrade without a model, GPU, model API key or Lightning connection. Version 2 adds assessed custom AI through the same customer-local architecture; it does not replace the Version 1 core. No other capability is deleted or newly deferred by this revision. Existing non-AI rollout and safety gates remain.

<details>
<summary>Contents — sections 1–218 and revision appendices</summary>

- [1. PURPOSE OF THIS DOCUMENT](#orvia-section-1)
- [2. PRODUCT DEFINITION](#orvia-section-2)
- [3. CORE PRODUCT PRINCIPLE](#orvia-section-3)
- [4. THE CENTRAL SYSTEM: PRIVACY CONTROL GRAPH](#orvia-section-4)
- [5. CORE DOMAIN MODEL](#orvia-section-5)
- [6. USER ROLES](#orvia-section-6)
- [7. ROLE-BASED ACCESS CONTROL](#orvia-section-7)
- [8. PRIVACY CONTROL GRAPH RELATIONSHIP](#orvia-section-8)
- [9. DATA PROCESSING MODEL](#orvia-section-9)
- [10. MODULE ARCHITECTURE](#orvia-section-10)
- [11. SERVICE ARCHITECTURE](#orvia-section-11)
- [12. RECOMMENDED TECHNOLOGY STACK](#orvia-section-12)
- [13. POLICY ENGINE](#orvia-section-13)
- [14. POLICY VERSIONING](#orvia-section-14)
- [15. POLICY LIFECYCLE](#orvia-section-15)
- [16. CONSENT MANAGEMENT](#orvia-section-16)
- [17. CONSENT WITHDRAWAL](#orvia-section-17)
- [18. CONSENT PROPAGATION](#orvia-section-18)
- [19. NOTICE MANAGEMENT](#orvia-section-19)
- [20. DATA PRINCIPAL PORTAL](#orvia-section-20)
- [21. CROSS-COMPANY DATA PRINCIPAL NETWORK](#orvia-section-21)
- [22. RIGHTS MANAGEMENT ENGINE](#orvia-section-22)
- [23. IDENTITY MATCHING](#orvia-section-23)
- [24. RIGHTS REQUEST STATES](#orvia-section-24)
- [25. WORKFLOW ENGINE](#orvia-section-25)
- [26. HUMAN-IN-THE-LOOP SUPPORT](#orvia-section-26)
- [27. CONNECTOR FRAMEWORK](#orvia-section-27)
- [28. CONNECTOR CAPABILITY DECLARATION](#orvia-section-28)
- [29. INITIAL CONNECTORS](#orvia-section-29)
- [30. CONNECTOR AGENT](#orvia-section-30)
- [31. CUSTOMER DATA BOUNDARY](#orvia-section-31)
- [32. PRIVACY-PRESERVING EXECUTION MODEL](#orvia-section-32)
- [33. PORTAL DATA BOUNDARY](#orvia-section-33)
- [34. CLOUD ARCHITECTURE](#orvia-section-34)
- [35. MULTI-TENANCY](#orvia-section-35)
- [36. DATABASE SECURITY](#orvia-section-36)
- [37. SECRETS MANAGEMENT](#orvia-section-37)
- [38. ENCRYPTION](#orvia-section-38)
- [39. KEY MANAGEMENT](#orvia-section-39)
- [40. PRIVACY FIREWALL / CONTROL POINT](#orvia-section-40)
- [41. PRIVACY SDK](#orvia-section-41)
- [42. LOCAL POLICY CACHE](#orvia-section-42)
- [43. OFFLINE / DEGRADED OPERATION](#orvia-section-43)
- [44. VERIFICATION ENGINE](#orvia-section-44)
- [45. EVIDENCE ENGINE](#orvia-section-45)
- [46. AUDIT TRAIL](#orvia-section-46)
- [47. EVIDENCE INTEGRITY](#orvia-section-47)
- [48. PRIVACY FAILURE CENTER](#orvia-section-48)
- [49. COVERAGE MAP](#orvia-section-49)
- [50. RETENTION ENGINE](#orvia-section-50)
- [51. DELETION ENGINE](#orvia-section-51)
- [52. CRYPTOGRAPHIC DELETION](#orvia-section-52)
- [53. PROCESSOR/VENDOR MANAGEMENT](#orvia-section-53)
- [54. PRIVACY INCIDENT EXPLORER](#orvia-section-54)
- [55. INCIDENT SEVERITY](#orvia-section-55)
- [56. NOTIFICATION SUPPORT](#orvia-section-56)
- [57. PRIVACY TEST ENGINE](#orvia-section-57)
- [58. SYNTHETIC TESTING](#orvia-section-58)
- [59. PRIVACY REGRESSION TEST](#orvia-section-59)
- [60. CI/CD INTEGRATION](#orvia-section-60)
- [61. PRIVACY TEST SUITE](#orvia-section-61)
- [62. PRIVACY DRIFT DETECTION](#orvia-section-62)
- [63. AI ARCHITECTURE](#orvia-section-63)
- [64. AI MODEL ABSTRACTION](#orvia-section-64)
- [65. AI DATA-MINIMISATION](#orvia-section-65)
- [66. AI PRIVACY COPILOT](#orvia-section-66)
- [67. AI DISCOVERY](#orvia-section-67)
- [68. AI POLICY BUILDER](#orvia-section-68)
- [69. AI WORKFLOW BUILDER](#orvia-section-69)
- [70. AI FAILURE ANALYSIS](#orvia-section-70)
- [71. AI DRIFT ANALYSIS](#orvia-section-71)
- [72. AI INCIDENT ANALYSIS](#orvia-section-72)
- [73. AI TEST GENERATION](#orvia-section-73)
- [74. AI SAFETY RULES](#orvia-section-74)
- [75. NOTIFICATION ENGINE](#orvia-section-75)
- [76. LICENSING AND ENTITLEMENTS](#orvia-section-76)
- [77. FEATURE FLAGS VS ENTITLEMENTS](#orvia-section-77)
- [78. ORVIA FOUNDATION](#orvia-section-78)
- [79. ORVIA CONTROL](#orvia-section-79)
- [80. ORVIA ENTERPRISE](#orvia-section-80)
- [81. ONE CODEBASE, THREE EDITIONS](#orvia-section-81)
- [82. WEBSITE](#orvia-section-82)
- [83. WEBSITE-TO-CUSTOMER JOURNEY](#orvia-section-83)
- [84. CUSTOMER ONBOARDING WIZARD](#orvia-section-84)
- [85. CONNECTOR INSTALLATION](#orvia-section-85)
- [86. CUSTOMER-CONTROLLED CLOUD DEPLOYMENT](#orvia-section-86)
- [87. CLOUD PROVIDER SECURITY](#orvia-section-87)
- [88. OBSERVABILITY](#orvia-section-88)
- [89. MONITORING DASHBOARD](#orvia-section-89)
- [90. SECURITY MONITORING](#orvia-section-90)
- [91. BACKUPS](#orvia-section-91)
- [92. DISASTER RECOVERY](#orvia-section-92)
- [93. UPDATE SYSTEM](#orvia-section-93)
- [94. LICENSE SECURITY](#orvia-section-94)
- [95. PRIVACY-SAFE SUPPORT](#orvia-section-95)
- [96. SUPPORT PORTAL](#orvia-section-96)
- [97. API ARCHITECTURE](#orvia-section-97)
- [98. WEBHOOK ARCHITECTURE](#orvia-section-98)
- [99. IDEMPOTENCY](#orvia-section-99)
- [100. EVENT ARCHITECTURE](#orvia-section-100)
- [101. DATA MIGRATION STRATEGY](#orvia-section-101)
- [102. FRONTEND ARCHITECTURE](#orvia-section-102)
- [103. PRIMARY NAVIGATION](#orvia-section-103)
- [104. DASHBOARD](#orvia-section-104)
- [105. PRIVACY GRAPH UI](#orvia-section-105)
- [106. CONTROL DETAIL PAGE](#orvia-section-106)
- [107. TEST DETAIL PAGE](#orvia-section-107)
- [108. INCIDENT DETAIL PAGE](#orvia-section-108)
- [109. SECURITY REQUIREMENTS](#orvia-section-109)
- [110. API SECURITY](#orvia-section-110)
- [111. FILE UPLOAD SECURITY](#orvia-section-111)
- [112. AI SECURITY](#orvia-section-112)
- [113. AI TOOL-USE MODEL](#orvia-section-113)
- [114. DEVELOPER EXPERIENCE](#orvia-section-114)
- [115. CLI](#orvia-section-115)
- [116. REPOSITORY STRUCTURE](#orvia-section-116)
- [117. 20-PERSON ENGINEERING TEAM](#orvia-section-117)
- [118. NON-ENGINEERING EXPERTISE REQUIRED](#orvia-section-118)
- [119. ENGINEERING TEAM WORKFLOW](#orvia-section-119)
- [120. DEFINITION OF DONE](#orvia-section-120)
- [121. AI CODING AGENT RULES](#orvia-section-121)
- [122. DEVELOPMENT ENVIRONMENTS](#orvia-section-122)
- [123. CI/CD PIPELINE](#orvia-section-123)
- [124. CODE QUALITY](#orvia-section-124)
- [125. TESTING PYRAMID](#orvia-section-125)
- [126. SECURITY TESTING](#orvia-section-126)
- [127. MULTI-TENANT SECURITY TEST](#orvia-section-127)
- [128. CONNECTOR SECURITY TESTING](#orvia-section-128)
- [129. PERFORMANCE TARGETS](#orvia-section-129)
- [130. SCALABILITY MODEL](#orvia-section-130)
- [131. CUSTOMER SCALE](#orvia-section-131)
- [132. DATA RETENTION WITHIN ORVIA](#orvia-section-132)
- [133. AUDIT EVIDENCE EXPORT](#orvia-section-133)
- [134. REPORTING](#orvia-section-134)
- [135. READINESS SCANNER](#orvia-section-135)
- [136. INITIAL CUSTOMER TARGET](#orvia-section-136)
- [137. FIRST VERTICAL SLICE](#orvia-section-137)
- [138. PHASE 0 — ARCHITECTURAL FOUNDATION](#orvia-section-138)
- [139. PHASE 1 — CORE PRIVACY OPERATIONS](#orvia-section-139)
- [140. PHASE 2 — CONTROL](#orvia-section-140)
- [141. PHASE 3 — TESTING](#orvia-section-141)
- [142. PHASE 4 — ENTERPRISE](#orvia-section-142)
- [143. PHASE 5 — ADVANCED](#orvia-section-143)
- [144. THREE EDITIONS MUST EXIST ARCHITECTURALLY FROM THE BEGINNING](#orvia-section-144)
- [145. BUT FEATURE DELIVERY MUST STILL BE CONTROLLED](#orvia-section-145)
- [146. RELEASE STRATEGY](#orvia-section-146)
- [147. CONNECTOR VERSIONING](#orvia-section-147)
- [148. POLICY COMPATIBILITY](#orvia-section-148)
- [149. WORKFLOW COMPATIBILITY](#orvia-section-149)
- [150. EVIDENCE IMMUTABILITY](#orvia-section-150)
- [151. CUSTOMER TRUST MODEL](#orvia-section-151)
- [152. ORVIA'S MOST IMPORTANT DIFFERENTIATOR](#orvia-section-152)
- [153. FUTURE INTEROPERABILITY](#orvia-section-153)
- [154. MOBILE AND WEB](#orvia-section-154)
- [155. INTERNATIONALISATION](#orvia-section-155)
- [156. LOCALISATION](#orvia-section-156)
- [157. SEARCH](#orvia-section-157)
- [158. ADMIN SETTINGS](#orvia-section-158)
- [159. BILLING](#orvia-section-159)
- [160. LICENSE EXPIRATION](#orvia-section-160)
- [161. OFFBOARDING](#orvia-section-161)
- [162. CUSTOMER DATA EXPORT](#orvia-section-162)
- [163. SECURITY BASELINE FOR RELEASE](#orvia-section-163)
- [164. EXTERNAL SECURITY REVIEW](#orvia-section-164)
- [165. LEGAL / COMPLIANCE CONTROL](#orvia-section-165)
- [166. REGULATORY RULE PACK ARCHITECTURE](#orvia-section-166)
- [167. LEGAL CONTENT VERSIONING](#orvia-section-167)
- [168. PRODUCT CLAIMS](#orvia-section-168)
- [169. NO FALSE "PROOF"](#orvia-section-169)
- [170. CUSTOMER CONFIGURATION MODEL](#orvia-section-170)
- [171. PRINCIPLE OF LEAST PRIVILEGE](#orvia-section-171)
- [172. CONNECTOR CREDENTIAL MODEL](#orvia-section-172)
- [173. CONNECTOR HEALTH](#orvia-section-173)
- [174. ACTION RETRY STRATEGY](#orvia-section-174)
- [175. DEAD-LETTER QUEUES](#orvia-section-175)
- [176. RATE LIMITS](#orvia-section-176)
- [177. SYSTEM HEALTH PROTECTION](#orvia-section-177)
- [178. CUSTOMER SYSTEM SAFETY](#orvia-section-178)
- [179. DRY RUN MODE](#orvia-section-179)
- [180. GRADUAL ENFORCEMENT](#orvia-section-180)
- [181. ORVIA OBSERVE MODE](#orvia-section-181)
- [182. ORVIA COORDINATE MODE](#orvia-section-182)
- [183. ORVIA ENFORCE MODE](#orvia-section-183)
- [184. USER EXPERIENCE RULE](#orvia-section-184)
- [185. DASHBOARD SUMMARY EXAMPLE](#orvia-section-185)
- [186. ENGINEERING DOCUMENTATION](#orvia-section-186)
- [187. ARCHITECTURE DECISION RECORDS](#orvia-section-187)
- [188. DEVELOPMENT STANDARD](#orvia-section-188)
- [189. AI-CODING DEVELOPMENT LOOP](#orvia-section-189)
- [190. AI SHOULD BUILD IN SMALL VERIFIED UNITS](#orvia-section-190)
- [191. FIRST DEMO TARGET](#orvia-section-191)
- [192. FAILURE DEMO](#orvia-section-192)
- [193. PRIVACY REGRESSION DEMO](#orvia-section-193)
- [194. CUSTOMER DEPLOYMENT DEMO](#orvia-section-194)
- [195. PRODUCT SUCCESS METRICS](#orvia-section-195)
- [196. PRIVACY CONTROL METRICS](#orvia-section-196)
- [197. CUSTOMER ONBOARDING TARGET](#orvia-section-197)
- [198. COMMERCIAL EXPANSION](#orvia-section-198)
- [199. FUTURE MODULE MARKETPLACE](#orvia-section-199)
- [200. LONG-TERM ARCHITECTURE PRINCIPLE](#orvia-section-200)
- [201. FINAL SYSTEM PRINCIPLE](#orvia-section-201)
- [202. FINAL CUSTOMER ARCHITECTURE](#orvia-section-202)
- [203. FINAL DELIVERY MODEL](#orvia-section-203)
- [204. FINAL COMMERCIAL MODEL](#orvia-section-204)
- [205. FINAL AI MODEL](#orvia-section-205)
- [206. FINAL SECURITY MODEL](#orvia-section-206)
- [207. FINAL ENGINEERING RULE](#orvia-section-207)
- [208. FINAL PRODUCT RULE](#orvia-section-208)
- [209. FINAL ARCHITECTURAL ADVANTAGE](#orvia-section-209)
- [210. FINAL MASTER BUILD OBJECTIVE](#orvia-section-210)
- [211. FINAL ENGINEERING COMMAND TO THE AI BUILD SYSTEM](#orvia-section-211)
- [212. ORVIA — FINAL PRODUCT IN ONE SENTENCE](#orvia-section-212)
- [213. PRIVACY CONTROL PACKAGES AND CHANGE SIMULATION](#orvia-section-213)
- [214. ASSESSMENTS, SDF GOVERNANCE AND REMEDIATION](#orvia-section-214)
- [215. CUSTOMER AI-PROCESSING GOVERNANCE EXTENSION](#orvia-section-215)
- [216. PRIORITIZED ENGINEERING BACKLOG](#orvia-section-216)
- [217. MANDATORY ACCEPTANCE AND FAILURE TEST MATRIX](#orvia-section-217)
- [218. PRIMARY SOURCE REGISTER AND REVIEW LIMITS](#orvia-section-218)

- [Appendix A — Complete source-to-unified section map](#appendix-a)
- [Appendix B — Exact edits and preservation checks](#appendix-b)
- [Appendix C — Original amendment register and source metadata](#appendix-c)

- [Appendix D — Revision 1.1 changes and integrity](#appendix-d)

- [Appendix E — Revision 1.2 change, source and integrity record](#appendix-e)

- [Appendix F — Version 1 baseline / Version 2 AI decision and integrity](#appendix-f)

</details>

---

<a id="orvia-section-1"></a>

# 1. PURPOSE OF THIS DOCUMENT

This document is the engineering source of truth for building ORVIA.

The development team must use this document to understand:

- What ORVIA is.
- What ORVIA is not.
- What needs to be built.
- How the complete system should work.
- How the modules interact.
- Which developers own which components.
- How customer data should flow.
- How cloud and customer environments communicate.
- How AI should be integrated.
- How the three commercial editions should be implemented.
- How licensing should work.
- How security should work.
- How privacy workflows should execute.
- How testing should work.
- How integrations should work.
- How failures should be handled.
- How the product should be deployed.
- How the product should be monitored.
- How the system should scale.
- How the product should be upgraded.
- What must be tested before release.
- What must never be implemented in an unsafe or misleading way.

This document describes the target platform architecture. Product scope may be released progressively, but the core architecture must be designed so that Foundation, Control and Enterprise editions can use the same underlying platform.

## PRODUCT VERSION 1 BASELINE AND VERSION 2 RESERVATION

**User decision, 16 September 2026:** the accumulated idea, architecture and planning progress through document revision 1.2, as adjusted here, become the **ORVIA Version 1 baseline**. Focus implementation on the non-model platform. Preserve the entire custom-AI plan for **Product Version 2**, rather than deleting it or replacing it with an existing model.

| Label | Meaning | Does not mean |
|---|---|---|
| Product Version 1 | Current non-model product baseline, with optional deterministic Guided Assistance | Every specified feature is already implemented, tested or generally available |
| Product Version 2 | Future integration of the custom ORVIA Intelligence model and its retained AI functions | Document revision 1.2 or the historical `V2§n` source labels |
| Document revision 1.3 | This update to the master specification | A shipped software build numbered 1.3 |
| Foundation / Control / Enterprise | Commercial editions of the shared product | Successive software versions |
| Phases 0–5 and P0/P1/P2 | Retained delivery phases and backlog priorities | Automatic assignment to Product Version 1, 2 or 3 |

All existing non-AI capabilities, delivery choices, privacy/security requirements, roles, support boundaries and acceptance requirements remain in the Version 1 product programme. Existing descriptions of later/advanced/non-supported capabilities remain accurate; this baseline does not make them day-one features. **This revision newly defers only the custom-model/learned-AI work and its dependent product functions.** It does not use the deadline to delete unrelated requirements or lower release standards.

Record a capability’s product target, implementation status, test status, supported deployment scope and edition entitlement separately. Planned scope is not delivery evidence. Preserve current engineering artifacts as they actually exist; do not infer implemented code, trained weights or passed tests from previous plans or interface previews.

---

<a id="orvia-section-2"></a>

# 2. PRODUCT DEFINITION

## Product Name

**ORVIA**

## Product Category

**Unified DPDPA Privacy Control Platform**

## Product Definition

ORVIA is a subscription/licence-based privacy operations and control product purchased and downloaded from the ORVIA website, with its complete licensed runtime deployed in the customer’s own organisation or customer-controlled cloud, that enables organisations to:

- discover and map personal-data processing;
- define purposes and privacy policies;
- manage consent and Data Principal interactions;
- coordinate privacy rights workflows;
- execute privacy actions across connected systems;
- enforce supported privacy controls;
- verify outcomes;
- generate evidence;
- detect failures;
- investigate privacy incidents;
- continuously test privacy controls;
- detect privacy-control drift;
- assist engineering teams through privacy regression testing.

The default deployment is `CUSTOMER_LOCAL`: end-client/customer personal data and customer operational records must remain in the customer-controlled environment and must not be transmitted to ORVIA-operated infrastructure. ORVIA, as the software vendor, receives only the explicitly permitted commercial, licensing and restricted service information defined in §31. Local processing is a mandatory product boundary, not a best-effort preference.

## REFINED PRODUCT THESIS

**Retained:** ORVIA, Unified DPDPA Privacy Control Platform; the seven-stage operating loop; website/cloud distribution with customer-hosted execution; Foundation, Control and Enterprise; deterministic operations, optional rules-based Guided Assistance in Product Version 1, and the preserved custom-AI assistance layer in Product Version 2. [O§2–4, O§63, O§76–81]

**Proposed positioning:** A DPDP-first privacy control engineering and assurance platform: define approved processing, implement controls at supported boundaries, coordinate actions across systems, and continuously show what is working, failing, unverified or outside coverage.

The market promise should be: **“Make privacy requirements operational—and show whether the controls actually work.”** Do not sell universal enforcement, guaranteed compliance, universal erasure, or unique capabilities without evidence.

The three primary jobs are different views of the same control:

| Buyer/user | Operational question | Shared product output |
|---|---|---|
| Privacy officer | What must we do, who owns it, and what remains unresolved? | Applicability, approved controls, requests, exceptions and evidence |
| Engineering leader | Where must behavior change, and will a release break it? | Integration contract, impact plan, runtime decision and regression result |
| Security/audit leader | What was observed, with what limits, and can the history be trusted? | Scoped verification, provenance, incident timeline and coverage gaps |

ORVIA should win through repeatable integration quality, explicit uncertainty and low operating effort—not through the number of dashboard pages. This is a competitive hypothesis to validate, not a claim of market uniqueness.

## MANDATORY DELIVERY AND TRUST REQUIREMENTS

**Customer requirement, incorporated 16 September 2026:** buy the appropriate subscription/licence on the ORVIA website; download the licensed product; install it in the customer’s infrastructure; operate it without sending the customer’s clients’ or customers’ information to ORVIA. The website/cloud is a distribution and commercial service, not the processing destination for customer privacy operations.

**Security requirement:** design, implement, test and maintain a highly secure product using the measurable controls and release gates in §§109, 126, 163–164 and 206. “Unbreachable,” “zero vulnerabilities” and equivalent absolute promises are not approved product claims.

`CUSTOMER_LOCAL` is the default for all editions offered under this promise. Enterprise can add scale, advanced integrations, resilient deployment and, in Product Version 2, private-AI management; the baseline data boundary and essential security cannot depend on buying a more expensive edition. An unsupported deployment must be labelled unsupported, not silently redirected to a hosted service.

The pre-existing vendor-hosted SaaS alternatives remain recorded as non-default architectural options in §§33 and 86; they are not enabled under this customer-local offer. Enabling a different data-handling model would require a separate, explicit product decision and accurate revised disclosures—not a hidden fallback or a support-session override.

## CURRENT PRODUCT DELIVERY, AUTHORITY AND AI DECISIONS

The ORVIA vendor remains the official publisher and distributor of the product, licences, signed updates, connector packages, reviewed knowledge packs and, when released for Product Version 2, ORVIA-owned model packages through its website and vendor-controlled distribution cloud. Distribution does not mean execution: the customer's operational platform runs in the customer's environment.

Use three customer-facing experiences: **ORVIA Account** for purchasing/licences/downloads/support, **ORVIA Workspace** for local operations, and **Customer Privacy Centre** for that customer's Data Principals. A separate **Vendor Administration and Support Console** is for ORVIA staff, not a global login into customer workspaces.

Vendor Super Admin and Vendor Admin roles govern vendor services only. Organisation Super Admin (the user's “mini super admin”), Organisation Admin and Member roles govern customer-local environments. All specialised roles already in §6 remain. A tenant is an isolation scope, not a user role.

Preserve **ORVIA Intelligence** for **Product Version 2**, with training and integration on hold during Version 1. Its retained definition is an ORVIA-owned domain AI: its own trained weights, no third-party pretrained model checkpoint or hosted foundation-model dependency, public/licensed non-customer knowledge and ORVIA-authored synthetic training material, development on separately authorised Lightning AI GPUs, and inference within the customer environment. The complete definition, training requirements and release gates are in §§63–65 and 112. No model has been trained by this specification update.

## VERSION 1 PRODUCT POSITION

Version 1 is the customer-hosted privacy-control product, not a model-training release. It delivers supported deterministic privacy operations, enforcement, verification, evidence, regression testing, scoped administration, distribution/licensing and privacy-safe support. Optional Guided Assistance adds useful local rules and documentation without a model. Product Version 2 will add the separately assessed custom-AI layer without changing the no-customer-data-training or customer-local promises.

---

<a id="orvia-section-3"></a>

# 3. CORE PRODUCT PRINCIPLE

ORVIA is built around:

# DISCOVER → GOVERN → EXECUTE → ENFORCE → VERIFY → TEST → IMPROVE

This must be reflected in the actual architecture.

The product must not become a collection of unrelated pages called:

- Consent
- DSAR
- GRC
- Breach
- Testing
- Reports

Instead, these capabilities must operate against a common underlying model.

---

<a id="orvia-section-4"></a>

# 4. THE CENTRAL SYSTEM: PRIVACY CONTROL GRAPH

The Privacy Control Graph is the central domain model of ORVIA.

It represents relationships among:

- Data Principal
- Principal Reference
- Purpose
- Processing Condition
- Data Category
- Data Asset
- Field
- Dataset
- Application
- System
- Processing Activity
- Processor
- Vendor
- Consent
- Notice
- Policy
- Retention Policy
- Privacy Request
- Workflow
- Action
- Verification
- Evidence
- Incident
- Test
- Test Result
- Control
- Control Version

The graph is not required to be implemented as a dedicated graph database initially.

PostgreSQL with relational entities and relationship tables should be the default first implementation.

A graph abstraction should exist in the domain layer so that a graph database could be introduced later if scale requires it.

## EXPANDED PRIVACY CONTROL GRAPH

**Retained:** PostgreSQL and relational integrity remain the initial source of transactional truth. Keep the domain graph abstraction. [O§4, §12]

**Proposal:** Add these entities without replacing existing ones:

| Entity family | Additions | Reason |
|---|---|---|
| Accountability | LegalEntity, BusinessUnit, Environment, ProcessingRoleAssignment | A workspace, corporate group and legal Data Fiduciary are not interchangeable. |
| Regulatory | SourceInstrument, ProvisionVersion, ApplicabilityAssessment, Obligation, InterpretationDecision | Explain which rule and interpretation produced a control. |
| Identity | IdentityAssertion, IdentityLink, RepresentationMandate, Nomination, AgeAssuranceRecord | Separate a login, a person, a guardian and authority to act. |
| Processing | DataFlow, ProcessingCopy, ProcessingContext, TransferRoute, RetentionConstraint | Model copies and purposes independently. |
| Execution | PlanVersion, ApprovalBinding, ActionAttempt, Reconciliation, RevocationCursor | Make ordering, uncertainty and safe retry explicit. |
| Assurance | VerificationObservation, CoverageAssertion, ControlPackage, EvidencePayload, Gap | Distinguish actual observations from desired settings. |
| Governance | Assessment, Finding, ExceptionDecision, RemediationTask, LegalHold | Close the loop from review to implementation. |

Inventory may say “the customer reports this flow exists”; telemetry may say “this flow was observed.” Both are useful, but they are different evidence. Never infer completeness from discovery alone.

**Acceptance:** Changing a processor relationship identifies affected purposes, workflows, retention plans and tests; an old evidence package still resolves its historical graph and policy references.

---

<a id="orvia-section-5"></a>

# 5. CORE DOMAIN MODEL

## 5.1 Organisation

Represents one customer tenant.

Fields:

- organisation\_id
- legal\_name
- display\_name
- country
- timezone
- industry
- edition
- deployment\_mode
- created\_at
- updated\_at
- status

Every customer-owned record must be tenant-isolated.

---

## 5.2 User

Represents a person using ORVIA.

Fields:

- user\_id
- organisation\_id
- email
- display\_name
- authentication\_provider
- status
- last\_login\_at
- created\_at
- updated\_at

## 5.3 Separate vendor and customer identity/domain stores

Do not reuse one global `User` or `Organisation` database across vendor commerce and customer operations. The existing Organisation and User entities above describe customer-runtime records. The vendor store contains separate `VendorStaffIdentity`, `CommercialAccount`, `CommercialAccountMember`, `Subscription`, `LicenceAssignment`, `DownloadAuthorisation` and `SupportCase` entities, with only the §31 permitted fields.

Within a customer installation, add `Environment`, `OrganisationMembership`, optional `Subtenant`, `RoleBinding`, `ServiceIdentity` and `LocalSupportCase`. A role binding records its identity, organisation, optional environment/subtenant scope, capabilities, granting actor, validity and revocation. A customer's member directory and local role assignments are not synchronised to the vendor.

Distinguish `organisation_id` (customer business boundary), `environment_id` (for example test or production), `subtenant_id` (optional delegated isolation boundary), and membership (a person's access). Do not create a tenant automatically for every employee. Different customer organisations use separate customer-controlled installations by default; approved groups/subtenants within one installation still require explicit isolation.

A random licence installation identifier may correlate a permitted support case with a commercial assignment. It must not be computed from customer records, hostnames or a staff directory. Keep the mapping from a local workflow/incident to a vendor support case only inside the customer deployment.

For **Product Version 2 AI development**, maintain a separate `TrainingSource`, `CorpusManifest`, `DatasetSplit`, `ModelExperiment`, `ModelRelease`, `KnowledgePackVersion` and `EvaluationReport` registry. These contain approved non-customer training material and vendor engineering records, never an uploaded customer inference history.

## VERSION 1 GUIDANCE DATA WITHOUT A TRAINING STORE

Version 1 can use minimal versioned runbook/rule/template metadata and permission-scoped local guidance records (§63), reusing existing domain and audit structures where suitable. Do not require a training registry, tokenizer, vector model, experiment store or model service to create a tenant or start a workflow. The Version 2 registry definitions above are preserved future scope; a Version 1 knowledge/runbook version is not a model version.

---

<a id="orvia-section-6"></a>

# 6. USER ROLES

At minimum:

### Organisation Owner

Full organisation administration.

### Privacy Administrator

Privacy configuration and privacy operations.

### DPO / Privacy Officer

Privacy oversight, evidence, reports and escalations.

### Compliance Manager

Compliance configuration and assessments.

### Security Administrator

Security and integration controls.

### Engineering Administrator

Connectors, SDKs, control points and tests.

### Workflow Operator

Can operate requests and workflows but cannot modify global policies.

### Auditor / Reviewer

Read-only evidence and audit capabilities.

### Support Administrator

Customer-controlled support functions.

### Data Principal

External portal user with access only to their own privacy interactions.

## VENDOR AUTHORITY AND CUSTOMER AUTHORITY ARE SEPARATE

“Super Admin” is scoped to a trust domain. **Vendor Super Admin is not the parent of Organisation Super Admin.** The latter is the highest customer-local product administrator, not a vendor-controlled subordinate. Its professional display name is **Organisation Super Admin**; “mini super admin” remains an explanatory alias, not a security boundary.

### Vendor roles — ORVIA staff only

| Role | Permitted scope | Explicit exclusions |
|---|---|---|
| **Vendor Super Admin** (`VENDOR_SUPER_ADMIN`) | Vendor staff roles, commercial platform settings, account/support governance and high-impact vendor approvals | No customer-runtime impersonation, local-admin password reset, customer-data access, unrestricted remote execution or decryption keys |
| **Vendor Admin** (`VENDOR_ADMIN`) | Assigned commercial customers, entitlement support within delegated limits, downloads, advisories and scoped support cases | Cannot appoint a Vendor Super Admin, approve their own exceptional elevation, read unrelated cases or independently sign/release arbitrary code |
| Vendor Support Specialist / Security Reviewer | Capability-restricted assignments within the vendor role model | No implicit access beyond assigned permitted records; no permanent runtime credentials |

The Vendor Super Admin title does not collapse separation of duties. Publishing a release or model, changing signing trust and approving high-impact account recovery require the configured independent approvals. Vendor governance authorisation is distinct from cryptographic signing-key access. Maintain separate emergency procedures and immutable administrative records.

### Customer roles — inside each customer's installation

| Role | Permitted scope | Explicit exclusions |
|---|---|---|
| **Organisation Super Admin** (`ORG_SUPER_ADMIN`) | Customer-owned identity, organisation settings, environment/subtenant creation, scoped role grants, system monitoring, local licence/update administration and local recovery | No other organisation, no vendor staff privileges, no permission to bypass mandatory audit/safety controls or change the no-vendor-data promise |
| **Organisation Admin** (`ORG_ADMIN`) | Delegated environment/subtenant settings, members, systems, connector operations and assigned support work | No automatic owner transfer, super-admin appointment, global key export, unassigned subtenant access or unrestricted destruction |
| **Member** (`MEMBER`) | Assigned workspace, tasks, reports or operational actions granted by a capability set | No default member-management, policy publication, destructive approval or broad data export |
| Optional **Subtenant Admin** | Administration within an explicitly assigned business-unit/project boundary | No sibling-subtenant or whole-organisation administration unless separately granted |

The existing **Organisation Owner** is mapped to `ORG_SUPER_ADMIN`; retain the existing role name as a compatible alias, not a second independent omnipotent identity. Privacy Administrator, DPO/Privacy Officer, Compliance Manager, Security Administrator, Engineering Administrator, Workflow Operator, Auditor/Reviewer and customer Support Administrator remain as specialised capability sets. No role is removed.

Data Principal is a separate portal identity, not automatically a Member or subtenant administrator. A person may have more than one role only through explicit grants, with conflict/separation-of-duty checks.

### Commercial account members are not vendor employees

The purchaser may assign **Commercial Owner**, **Billing Contact**, **Download/Licence Contact** and **Support Contact** in ORVIA Account. These are customer contacts on the vendor website, not Vendor Admins and not customer-runtime administrators. An individual may hold separate commercial and runtime identities without either grant automatically creating the other.

---

<a id="orvia-section-7"></a>

# 7. ROLE-BASED ACCESS CONTROL

Every ORVIA API must enforce authorisation.

Do not rely only on frontend visibility.

The backend must independently verify:

```text
Authenticated user
+
Tenant
+
Role
+
Resource
+
Action
+
Context
=
Authorisation decision

```

Use a dedicated policy engine.

OPA can be used as the first implementation because it separates policy decisions from application enforcement and accepts structured data as policy input.

Cedar may be evaluated during architecture selection as an alternative for fine-grained authorization. Cedar is explicitly designed around principal, action, resource and context-based decisions.

The final choice must be made once, documented, and abstracted so that ORVIA's application logic is not tightly coupled to a specific policy engine.

## POLICY DECISION CONTRACT AND LOCAL ENFORCEMENT

Separate administrative authorization from personal-data processing authorization. Both may use OPA initially, but use distinct policy namespaces, inputs, tests and enforcement adapters. An administrator's right to configure a purpose does not authorize processing under that purpose.

## TENANT ISOLATION AND ACCESS GOVERNANCE

Add service identities, short-lived machine credentials, scoped API tokens, approval separation and periodic access reviews. Customer-side support access is customer-authorized, just-in-time, time-limited and auditable. Under `CUSTOMER_LOCAL`, these privileges are for authorised customer personnel; ORVIA vendor staff do not receive production-data access from a billing role, support role or support approval (§95).

## INDEPENDENT LOGIN AND RECOVERY SYSTEMS

| Identity | Used for | Authority it does not imply |
|---|---|---|
| Vendor commercial identity | Billing, licences, downloads and business support | No permission to read or administer the customer's runtime |
| Customer runtime identity | Privacy operations and local administration under customer roles | No automatic right to change purchases or payment details |
| Data Principal identity | The person's own consent and request interactions | No organisational administration or another principal's records |

Use independent sessions, token audiences, role assignments and data stores. The same corporate identity provider may authenticate vendor and runtime applications where supported, but they remain separate applications with independent permissions. Do not pass vendor tokens to the runtime or require vendor-account login to operate a valid local installation.

A vendor password reset cannot reset the local administrator. Customer runtime recovery uses customer-held recovery procedures; vendor staff do not hold a universal recovery key. No vendor commerce credential or licence token can authorise an execution command. [M1 §§7, 31, 94–96]

## AUTHORISATION CONTRACT FOR THE ROLE HIERARCHY

Evaluate authority against the authenticated identity's **trust domain + organisation + environment/subtenant + resource + action + context**. Trust domain is established from validated issuer/audience, server configuration and authenticated session—not an untrusted `role` or `organisation_id` field. Deny by default and validate every API, job, search, export and AI tool call. Least-privilege and deny-by-default practices follow OWASP guidance [U1].

Vendor identities are not accepted by the customer API. Customer identities are not accepted as vendor staff. Do not create an `is_global_superadmin` bypass, cross-customer impersonation button or vendor-to-runtime role inheritance. Separate token issuers/audiences, signing keys, session stores, account recovery and machine credentials.

Organisation Admin can invite, suspend and assign members only inside its delegated scope. Role grants must be a subset of the granting actor's **delegable** capabilities; possessing an action does not automatically permit delegating it. Owner transfer, elevated roles, identity-provider changes, destructive approvals and security-sensitive configuration require contextual re-authentication and configured maker/checker review.

Require privileged MFA, named accounts, short-lived sessions, revocation, access reviews and an audited customer-held emergency recovery procedure. Prevent accidental removal of the last recoverable customer owner. Vendor billing recovery must never reset customer-runtime ownership. Super-admin administrative scope does not grant an independent processing condition or bypass privacy-request identity/scope checks.

Subtenant/environment restrictions apply to relational rows, object paths, search results, inference contexts, caches, background jobs and exports. Tests must exercise both cross-organisation and sibling-subtenant denial. A central customer-group view requires explicit grants; a vendor support queue is not that group view.

---

<a id="orvia-section-8"></a>

# 8. PRIVACY CONTROL GRAPH RELATIONSHIP

The logical relationship is:

```text
Organisation
    │
    ├── Purpose
    │      │
    │      ├── Processing Condition
    │      ├── Data Categories
    │      ├── Systems
    │      ├── Vendors
    │      ├── Retention
    │      └── Controls
    │
    ├── Principal References
    │      │
    │      ├── Consent
    │      ├── Rights
    │      ├── Preferences
    │      └── Actions
    │
    ├── Policies
    │
    ├── Workflows
    │
    ├── Evidence
    │
    ├── Incidents
    │
    └── Tests

```

## EXPANDED PRIVACY CONTROL GRAPH

Each relationship needs `source`, `asserted_or_observed`, `confidence`, `valid_from`, `valid_to`, `recorded_at`, `last_seen_at`, `owner`, `review_status` and a stable version where relevant. Use valid time plus recorded time for high-value legal/policy relationships; do not add full bitemporal complexity to every incidental table.

---

<a id="orvia-section-9"></a>

# 9. DATA PROCESSING MODEL

The platform must represent:

```text
Who
+
Why
+
What data
+
Under what processing condition
+
Where
+
With whom
+
For how long
+
What control applies
+
What happened
+
What evidence exists

```

The product must not assume that every processing operation is consent-based.

The DPDP Act distinguishes grounds for processing and includes certain legitimate uses, so the policy engine must support multiple configured processing conditions rather than hard-coding consent as the sole mechanism.

## PRESERVATION AND AMENDMENT REGISTER

Provision-level applicability and commencement replace a single “DPDP enabled” switch.

---

<a id="orvia-section-10"></a>

# 10. MODULE ARCHITECTURE

ORVIA should be divided into the following major services/modules.

## Core Platform

1. Identity and Access Management
2. Tenant Management
3. Privacy Control Graph
4. Policy Engine
5. Workflow Engine
6. Connector Framework
7. Verification Engine
8. Evidence Engine
9. Privacy Test Engine
10. Notification Engine

## Privacy Operations

11. Consent Management
12. Notice Management
13. Data Principal Portal
14. Rights Management
15. Retention Management
16. Processor/Vendor Management
17. Privacy Incident Explorer
18. Coverage and Failure Center

## AI — PRODUCT VERSION 2 / DEFERRED

19. AI Privacy Copilot
20. AI Discovery
21. AI Policy Builder
22. AI Workflow Builder
23. AI Risk/Drift Analysis
24. AI Test Generation
25. AI Incident Analysis

## Commercial/Platform

26. Billing
27. Licensing
28. Entitlements
29. Customer Onboarding
30. Support Bundle System
31. Updates
32. Monitoring
33. Audit Administration

## RELEASE ASSIGNMENT WITHOUT MODULE REMOVAL

The original inventory remains **33 modules** with unchanged IDs: modules **1–18 and 26–33** form the 26 non-AI modules in the Version 1 baseline; modules **19–25** remain the seven Product Version 2 custom-AI modules. Existing rollout stages still determine which non-AI capabilities are actually released.

Version 1 Guided Assistance is a small capability within existing help, search, configuration, failure and support surfaces—not a replacement for the seven AI modules and not a 34th mandatory platform service. Model-dependent descriptions in §§63–74 and 112–113 are preserved future requirements. No fake AI result or third-party LLM is used to make their Version 1 status appear complete.

---

<a id="orvia-section-11"></a>

# 11. SERVICE ARCHITECTURE

The platform should initially use a modular service-oriented architecture.

Do not immediately create dozens of microservices.

Start with a manageable set of services:

```text
ORVIA WEB
    │
    ▼
ORVIA API
    │
    ├── Identity
    ├── Tenant
    ├── Graph
    ├── Policy
    ├── Consent
    ├── Rights
    ├── Workflow
    ├── Connector
    ├── Evidence
    ├── Testing
    ├── Incident
    ├── Guided Assistance (V1, optional rules only)
    ├── AI (Product V2 extension; not deployed in V1)
    └── Licensing

```

Background jobs should be separated from synchronous API requests.

## DEPLOYMENT, RESILIENCE AND MEASUREMENT

**Proposal:** Begin with a modular API/control-plane application, durable workers, a policy decision service, the customer agent, the web/portal applications and, optionally in Version 1, a small deterministic assistance component. Reserve the isolated AI gateway for Product Version 2. Logical modules do not each require independent microservices. Preserve the original TypeScript/React/Node/PostgreSQL/Temporal direction, with OPA as the proposed initial policy implementation subject to an ADR and benchmark.

## LOCATION OF THE SHARED PLATFORM

In `CUSTOMER_LOCAL`, the console, APIs, portal, identity integration, graph, policy engine, workflow engine, databases, caches, connector control, verification, evidence, tests, incident functions, search and any Version 1 Guided Assistance run inside the customer boundary; the Product Version 2 operational AI gateway must also run there when introduced. A connector-only download with the real graph/workflow/evidence services still hosted by ORVIA does not satisfy this deployment model.

The local licensing component verifies entitlements; commercial checkout and invoicing remain vendor services. Reuse code and interfaces where appropriate, but do not share customer runtime databases, signing authority or service credentials with the vendor commerce plane.

## VERSION 1 HAS NO MODEL SERVICE DEPENDENCY

Version 1 startup, health/readiness checks, deployment manifests, migrations, background workers, entitlement checks and support must not depend on a trained model, inference process, model store, GPU, model-provider credential or Lightning endpoint. Keep only a documented, versioned extension boundary for Version 2; do not build or run a dormant model platform merely to reserve its place. Removing optional guidance must not remove any core privacy or human-support path.

---

<a id="orvia-section-12"></a>

# 12. RECOMMENDED TECHNOLOGY STACK

The stack should favour maintainability and hiring availability rather than exotic technology.

## Frontend

- TypeScript
- React
- Next.js
- Tailwind CSS
- Component library with accessible reusable components
- React Query / TanStack Query
- Zod for schema validation
- Playwright for browser testing

---

## Backend

Recommended:

- TypeScript
- Node.js
- NestJS or equivalent strongly structured backend framework

Reasons:

- Strong API support
- Good TypeScript alignment
- Shared types with frontend
- Mature ecosystem
- Easier hiring
- Fast product development

---

## Database

### PostgreSQL

Use PostgreSQL as the primary relational system.

Use:

- UUID/ULID identifiers
- JSONB where appropriate
- relational constraints
- foreign keys
- indexes
- partitioning where necessary
- row-level tenant protections where appropriate

Do not put the entire domain into arbitrary JSON documents.

---

## Cache / Queue

Use:

- Redis for caching where required
- job queue infrastructure for asynchronous operations

---

## Durable Workflows

Use a durable workflow engine such as:

- Temporal

or another production-grade equivalent.

The workflow engine must support:

- retries
- timeouts
- idempotency
- compensation
- human approval
- long-running workflows
- workflow history
- failure recovery

Third-party APIs are not assumed to provide exactly-once delivery.

ORVIA must use idempotent actions and tolerate at-least-once event delivery.

---

<a id="orvia-section-13"></a>

# 13. POLICY ENGINE

The policy engine is a core service.

It must be independent of:

- frontend
- database implementation
- individual connectors
- AI models

A policy request should look conceptually like:

```json
{
  "organisation": "org_123",
  "principal": "principal_456",
  "action": "marketing_send",
  "purpose": "promotional_marketing",
  "data_category": "contact_information",
  "system": "crm",
  "processor": null,
  "context": {
    "consent_status": "withdrawn",
    "policy_version": "policy_17"
  }
}

```

The decision should return something like:

```json
{
  "decision": "BLOCK",
  "policy_id": "policy_17",
  "policy_version": "17",
  "reason_codes": [
    "CONSENT_WITHDRAWN"
  ],
  "evaluation_id": "eval_123"
}

```

Possible ORVIA outcomes:

```text
ALLOW
ALLOW_WITH_LIMITATION
MASK
RESTRICT
BLOCK
REQUIRE_APPROVAL
RECORD_ONLY
INDETERMINATE

```

The result must include machine-readable reason codes.

## POLICY DECISION CONTRACT AND LOCAL ENFORCEMENT

**Proposal:** Keep all original decisions, adding an explicit `INDETERMINATE` error outcome rather than translating evaluation failures into ALLOW. A decision is a structured object with obligations, not just a boolean.

```json
{
  "decision_id": "dec_demo_01",
  "decision": "ALLOW_WITH_LIMITATION",
  "tenant_id": "org_demo",
  "environment_id": "staging",
  "principal_reference": "local_ref_42",
  "purpose_id": "service_support",
  "action": "support_profile_read",
  "policy_version": "support-v7",
  "consent_epoch": 42,
  "scope_digest": "demo_scope_digest",
  "obligations": [
    {"type": "MASK", "fields": ["payment_reference"]},
    {"type": "RECORD", "control_id": "support-minimisation-v2"}
  ],
  "freshness_requirement": "current-authorisation-at-use",
  "validity": "single-operation",
  "reason_codes": ["APPROVED_LIMITED_SUPPORT_SCOPE"]
}
```

This is a contract example, not a signed credential or production schema. A consumer unable to implement a mandatory obligation must reject or escalate the operation. Returning MASK without masking the outgoing payload is a control failure.

Keep the synchronous hot path free of full graph traversals, long-running workflows and LLM calls. Prepare approved runtime projections asynchronously. Define conflict combination per action and scope; do not use a simplistic universal “deletion always wins” or “longest retention wins.”

**Acceptance:** Unsatisfied obligations never become successful enforcement; wrong-tenant/wrong-environment decisions are rejected; policy rollback does not roll back an already accepted revocation.

---

<a id="orvia-section-14"></a>

# 14. POLICY VERSIONING

Every policy must be versioned.

Example:

```text
Marketing Policy
Version 1
Version 2
Version 3

```

Each evaluation must reference the exact policy version used.

Never evaluate historical evidence against "the current policy" and then pretend the current policy was active at that time.

## PRESERVATION AND AMENDMENT REGISTER

Preserve historical policy/workflow versions, but recheck current authorization and safety before a new irreversible effect.

---

<a id="orvia-section-15"></a>

# 15. POLICY LIFECYCLE

```text
Draft
  ↓
Review
  ↓
Approved
  ↓
Published
  ↓
Active
  ↓
Superseded
  ↓
Archived

```

No direct modification of a published policy.

Changes create a new version.

---

<a id="orvia-section-16"></a>

# 16. CONSENT MANAGEMENT

Consent must support:

- Collection
- Versioning
- Purpose
- Time
- Source
- Channel
- Notice reference
- Consent status
- Withdrawal
- Expiry
- History
- Evidence
- Receipt

Example entity:

```text
Consent
├── consent_id
├── principal_reference
├── purpose_id
├── notice_version
├── status
├── captured_at
├── captured_via
├── source
├── withdrawn_at
├── expiry_at
├── policy_version
└── evidence_id

```

The system must preserve historical states.

## NOTICE, PURPOSE AND CONSENT LIFECYCLE

**Proposal:** Treat a purpose as a versioned operational contract. Store its approved description, data categories, allowed actions, systems, recipients, processing condition, retention rules, notice versions and accountable owner.

Consent receipts should record the authenticated capture context, exact notice content digest, language, purposes selected, necessary data scope, affirmative interaction, source event and consent version. Do not collect device fingerprints simply to make receipts look stronger. A receipt evidences what was captured; it does not by itself establish that the full user journey was lawful.

Separate purposes, communications-channel preferences and operational suppression. A preference for email over SMS must not become consent to every marketing purpose. A service notification must not inherit permission from an unrelated campaign choice.

For imported consents, store provenance and verification state: `SUPPORTED`, `INCOMPLETE_EVIDENCE`, `CONFLICTING`, `REVIEW_REQUIRED`. Do not convert an imported spreadsheet boolean into an unquestioned affirmative grant.

**Acceptance:** A materially expanded purpose cannot reuse an old receipt without an approved migration decision; an unsupported imported consent is never represented as verified.

## CONSENT ORDERING, REVOCATION AND RACE SAFETY

**Proposal:** Maintain an authoritative aggregate per `(tenant, legal_entity, principal_reference, purpose)` with a monotonically increasing `consent_epoch`. Do not order events using client timestamps alone.

---

<a id="orvia-section-17"></a>

# 17. CONSENT WITHDRAWAL

The withdrawal lifecycle should be:

```text
Withdrawal received
        ↓
Validate request
        ↓
Update consent state
        ↓
Find affected purpose
        ↓
Find affected systems
        ↓
Generate execution plan
        ↓
Execute supported actions
        ↓
Verify
        ↓
Generate evidence
        ↓
Close / escalate

```

## CONSENT ORDERING, REVOCATION AND RACE SAFETY

An accepted withdrawal writes its state, new epoch and an outbox event in one transaction. Delivery to workers and agents can be repeated. Consumers maintain processed-event identifiers and the last applicable aggregate epoch. An older grant cannot overwrite a newer withdrawal.

Fresh re-consent is possible only through a new authorized interaction and a later epoch; it is not a retry of an old grant. Preserve history and never allow a stale withdrawal worker to delete newly collected, separately authorized records without re-evaluating scope.

**Acceptance:** Duplicate, reordered and delayed grants cannot reactivate a withdrawn purpose; an intentionally new grant is handled as a new state; re-consent cannot cause an old erasure job to target a new data generation.

---

<a id="orvia-section-18"></a>

# 18. CONSENT PROPAGATION

A withdrawal must not simply change a central database flag.

ORVIA should identify:

```text
Consent
 ↓
Purpose
 ↓
Data
 ↓
Systems
 ↓
Processors

```

Then create actions.

Example:

```text
CRM
Marketing platform
Messaging provider
Analytics destination

```

Each action is individually tracked.

## CONSENT ORDERING, REVOCATION AND RACE SAFETY

Use two paths: a fast revocation update to control points and a durable reconciliation workflow for downstream cleanup. Track `last_applied_epoch`, acknowledged subscription cursors and freshness. If a control point cannot prove freshness, apply the customer's approved per-action degraded-mode behavior; for the initial marketing control, propose queue-or-block rather than silent fail-open.

**Physical limit:** A network partition prevents instant global knowledge. Define the actual enforcement boundary and bounded freshness objective. State whether already handed-off messages can be cancelled. Never promise that an email already accepted by an external sender can be recalled.

---

<a id="orvia-section-19"></a>

# 19. NOTICE MANAGEMENT

The notice system must support:

- Versions
- Purpose references
- Data categories
- Processing descriptions
- Published versions
- Effective dates
- Approval
- Multilingual variants
- Change history
- Links to consent flows

The current Rules contain specific requirements around notices and understandable information, so the notice engine must remain configurable as rules evolve.

## NOTICE, PURPOSE AND CONSENT LIFECYCLE

Add `NoticeMigrationPlan`: editorial correction; translation correction; material purpose/data/recipient change; affected receipts; counsel decision on new notice or fresh consent; rollout; expiry of old flows; evidence. Never silently upgrade old grants to newly expanded purposes. Preserve existing notices for historical explanation.

---

<a id="orvia-section-20"></a>

# 20. DATA PRINCIPAL PORTAL

The portal is customer-specific.

It should support:

```text
Privacy Center
├── View privacy information
├── Consent choices
├── Withdraw consent
├── Access request
├── Correction request
├── Erasure request
├── Request status
└── Grievance

```

The portal must be tenant-specific.

No customer must be able to see another customer's data.

## NOTICE, PURPOSE AND CONSENT LIFECYCLE

Add user-journey tests for comparable withdrawal access, default choices, misleading grouping, inaccessible interactions, third-party scripts and attempts to send before authorization. Browser and mobile adapters can enforce only integrated boundaries; client-side tags alone cannot substantiate universal blocking.

## RIGHTS, IDENTITY, NOMINATION AND GUARDIAN FLOWS

Access responses must be purpose- and identity-scoped, redact unrelated people, state unresolved systems, and use authenticated, expiring delivery. Avoid enumeration in public request status responses. Add accessibility, low-bandwidth and assisted-service paths with an auditable authorized representative.

## SECURITY AND PRODUCT SAFETY RELEASE BAR

Add abuse controls for the public portal, accessible bot mitigation, attachment isolation and malware handling. Do not frustrate legitimate rights requests with indiscriminate identity-document demands. The customer defines proportionate verification and appeal procedures.

## CUSTOMER-HOSTED PORTAL REQUIREMENT

Serve the portal and its submission/status APIs from customer-controlled infrastructure. Notices, consent receipts, identity evidence, grievances, request attachments and access packages must not transit ORVIA’s website, CDN, logging service or support systems. The portal may be reachable by authorised Data Principals without exposing the administrative console or databases publicly.

Bundle required UI assets locally. Do not embed vendor analytics, session replay, external chat widgets or remotely loaded scripts that can disclose portal activity. Authorised delivery from the customer directly to the relevant Data Principal remains a rights workflow; ORVIA is not an intermediary for that content.

## CUSTOMER-BRANDED PRIVACY CENTRE EXPERIENCE

This is for the purchasing company's clients—not ORVIA's purchasers and not all clients across companies.

Use customer branding and plain language. Provide privacy information/notices, purpose-specific consent choices and withdrawal, supported request types, nomination/representation journeys, secure request status and grievance contact. Display only the authenticated person's permitted interactions. [M0 §20; M1 §§20, 22–24, 33]

Example journey: Acme's client opens Acme's privacy portal, authenticates using Acme's configured flow, withdraws promotional consent and receives an acceptance receipt. The request enters Acme's local ORVIA deployment. An authorised Acme operator sees the resulting work. Nothing in this journey needs to pass through ORVIA Account.

Publish the portal through a customer-controlled ingress or segregated portal tier when public access is needed. Keep administrative endpoints private. “Publicly reachable” does not mean “hosted by the vendor.” Do not use a vendor reverse proxy, vendor-hosted embedded page or vendor telemetry for personal interactions. Strict isolated deployments need a customer-owned inward request process or controlled portal integration; an air-gapped machine cannot also be an internet-facing server without a separate, explicitly designed boundary.

---

<a id="orvia-section-21"></a>

# 21. CROSS-COMPANY DATA PRINCIPAL NETWORK

Do not make this part of the initial core platform.

The architecture may later support interoperability, but version one should not attempt to create a national cross-company identity/network.

That is a separate future ecosystem project.

---

<a id="orvia-section-22"></a>

# 22. RIGHTS MANAGEMENT ENGINE

The Act includes rights relating to access, correction/erasure, grievance redressal and nomination.

ORVIA should model each request as:

```text
Request
 ↓
Authentication / verification
 ↓
Identity match
 ↓
Scope discovery
 ↓
Policy evaluation
 ↓
Approval requirements
 ↓
Action plan
 ↓
Execution
 ↓
Verification
 ↓
Response
 ↓
Evidence

```

## RIGHTS, IDENTITY, NOMINATION AND GUARDIAN FLOWS

Build nomination as a lifecycle: create, amend, revoke, invoke, verify authority, assess event, approve scope, exercise permitted rights, notify appropriately and retain a bounded audit record. Authority to exercise rights is not general ownership of the account or automatic permission to export all its data.

Build guardian relationships independently from nominee relationships. Record the nature, scope, validity and evidence of authority. Add adulthood-transition review and changed/revoked guardianship. Do not infer lack of legal capacity merely from disability.

For applicable child processing, add an age/guardian configuration and enforcement safeguard path in the shared core. The Enterprise pack remains as an advanced automation and deployment capability, not the only place to prevent unsupported child-directed processing. Prefer minimal reusable attestations over warehousing identity documents. Any exemption requires a reviewed provision, scope, conditions and expiry; a sector label is insufficient.

**Acceptance:** Ambiguous identity blocks destructive automation; revocation of representation immediately prevents new privileged actions; customer notification does not leak a sensitive request through an insecure channel.

---

<a id="orvia-section-23"></a>

# 23. IDENTITY MATCHING

Identity matching is high-risk.

The system must support:

- Exact match
- Strong match
- Probable match
- Ambiguous match
- No match

Example:

```text
MATCHED
CONFIDENCE_HIGH

```

or:

```text
AMBIGUOUS
HUMAN_REVIEW_REQUIRED

```

Do not automatically execute destructive operations against ambiguous matches.

## RIGHTS, IDENTITY, NOMINATION AND GUARDIAN FLOWS

Use the customer's authenticated session where possible. A verified email or phone is evidence of control of that channel, not universal proof of ownership of every historical record carrying it. Handle recycled phone numbers, shared accounts, account merges, changed addresses and disputed links. Require stronger verification for data disclosure and irreversible change than for viewing public notices; avoid needless identity-document uploads.

---

<a id="orvia-section-24"></a>

# 24. RIGHTS REQUEST STATES

```text
RECEIVED
PENDING_VERIFICATION
VERIFIED
SCOPING
AWAITING_APPROVAL
EXECUTING
PARTIALLY_COMPLETED
COMPLETED
FAILED
ESCALATED
REJECTED
CLOSED

```

The state machine must be explicit.

## RIGHTS, IDENTITY, NOMINATION AND GUARDIAN FLOWS

**Proposal:** Keep all original rights and request states. Add substate dimensions for identity confidence, representation authority, scoped execution, response delivery and unresolved external actions. `CLOSED` means administration ended, not necessarily “all requested erasure verified.”

---

<a id="orvia-section-25"></a>

# 25. WORKFLOW ENGINE

Every long-running privacy operation must be represented as a workflow.

Workflow example:

```text
Withdrawal Workflow

```

Steps:

```text
1. Receive event
2. Validate
3. Locate policy
4. Identify scope
5. Generate actions
6. Execute actions
7. Retry failures
8. Verify outcomes
9. Generate evidence
10. Notify operator
11. Close

```

Each step must be independently observable.

## DURABLE EXECUTION AND UNCERTAIN EXTERNAL EFFECTS

**Proposal:** Use PostgreSQL for domain transactions, an outbox/inbox pattern for reliable publication and deduplication, and Temporal for long-running orchestration. Do not add a second orchestration framework for convenience. Redis remains a cache/rate-limiting component, not authoritative consent storage.

A timeout after a remote delete may mean the delete succeeded but the response was lost. Add `OUTCOME_UNKNOWN` and `RECONCILING` at the action level. First query the provider's operation receipt or scoped state when possible. If repeat execution is neither idempotent nor safely reconcilable, require review. Do not sell exactly-once effects: Temporal itself documents that a side effect may complete before its completion event is recorded. [R8]

**Acceptance:** Killing a worker after the external effect but before acknowledgement produces one safe final outcome or an explicit unresolved state, not an unexamined duplicate destructive action.

---

<a id="orvia-section-26"></a>

# 26. HUMAN-IN-THE-LOOP SUPPORT

Human approval must be available for:

- Destructive deletion
- Ambiguous identity matches
- Policy publication
- High-impact enforcement
- Exceptional retention
- Critical processor actions
- Sensitive configuration changes

The platform must record:

```text
Who approved
What was approved
When
Under which policy version

```

## SECURITY AND PRODUCT SAFETY RELEASE BAR

For high-impact operations, enforce maker/checker separation where approved, contextual re-authentication, exact plan previews and a time-limited authorization window. The customer can pause a workflow, but cannot convert an unresolved effect into a verified outcome by clicking “close.”

---

<a id="orvia-section-27"></a>

# 27. CONNECTOR FRAMEWORK

Connectors are one of the most important ORVIA components.

The platform must use a common connector interface.

Conceptually:

```text
Connector
├── discover()
├── healthCheck()
├── search()
├── match()
├── read()
├── update()
├── restrict()
├── delete()
├── verify()
└── capabilities()

```

Not every connector must support every capability.

## CONNECTOR CONTRACT AND CONFORMANCE PROGRAM

Define discover, query, plan, execute, reconcile and verify contracts. Enforce pagination completeness, stable cursors, partial-response handling, deleted/recreated records, scope changes, rate limits and error taxonomy. A discovery credential must not implicitly grant mutation access. Separate discovery and destructive credentials where supported.

---

<a id="orvia-section-28"></a>

# 28. CONNECTOR CAPABILITY DECLARATION

Each connector must declare:

```json
{
  "supports": {
    "discovery": true,
    "search": true,
    "update": true,
    "delete": false,
    "verify": true,
    "restrict": true
  }
}

```

This allows ORVIA to build truthful coverage reports.

## CONNECTOR CONTRACT AND CONFORMANCE PROGRAM

**Proposal:** Extend capability booleans into a versioned manifest. Support is specific to a resource, action and permission set.

```yaml
schema_version: 1
connector: pilot-crm
connector_version: 0.1.0
resource: campaign_membership
capability: remove
execution_mode: customer_agent
required_permissions: [campaign_membership.read, campaign_membership.remove]
identity_match: exact_customer_scoped_reference
idempotency: natural_idempotence
verification:
  method: scoped_read_after_write
  consistency: eventual
  observation_window: customer_validated
limitations:
  - no_backup_erasure_visibility
safety:
  supports_dry_run: true
  requires_scope_digest: true
  maximum_records: customer_approved_budget
```

This illustrative manifest is not a claim that a specific vendor API supports these features.

**Acceptance:** Removing a required provider permission immediately changes reported coverage; a connector cannot advertise deletion verification when it only receives an HTTP success response.

---

<a id="orvia-section-29"></a>

# 29. INITIAL CONNECTORS

Do not create hundreds initially.

Build based on pilot customers.

Recommended technical starting points:

```text
PostgreSQL
MySQL
REST API
CRM connector
Marketing platform connector
Support/ticketing connector

```

The exact CRM and marketing products should be selected from actual customer demand.

---

<a id="orvia-section-30"></a>

# 30. CONNECTOR AGENT

ORVIA should use a customer-side secure connector agent for environments where internal systems should not be publicly exposed.

Architecture:

```text
        CUSTOMER-HOSTED ORVIA CONTROL PLANE
                      │
                Secure channel
                      │
                      ▼
             ORVIA CONNECTOR AGENT
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
         CRM          DB          ERP

```

The connector should normally initiate secure connections to the customer-hosted ORVIA control plane. “Outbound” describes connection direction; it does not authorise a connection to ORVIA’s vendor cloud or any unapproved destination.

Do not require customers to expose databases directly to the internet.

## CUSTOMER AGENT AS A RESTRICTED EXECUTION PLANE

**Proposal:** The agent accepts typed, signed instructions over an outbound-authenticated channel. Use distinct installation and tenant identities, short-lived credentials, certificate rotation and revocation. Customer database credentials remain local or in the customer's secrets manager.

A command envelope binds tenant, installation, environment, workflow/action, capability, schema version, scope digest, approval digest, expiry, nonce and operation budget. The agent independently validates the envelope and local configuration. A control-plane authorization check alone is insufficient protection for a powerful local process. In `CUSTOMER_LOCAL`, the control plane and command-signing authority are customer-controlled; the vendor licensing or download service cannot issue execution commands.

Deny arbitrary shell, arbitrary SQL and unapproved endpoints. Database connectors use parameterized, scoped operations and explicit table/column allowlists. Use network egress controls and isolate plugins/workers with resource limits. Restrict internal URL access and defend against SSRF; outbound-only transport does not by itself prevent misuse of local access.

Maintain an encrypted bounded spool, monotonic replay protection and an explicit disk-full response. Separate update identity from execution identity. Sign releases and manifests, pin trusted roots, and support a customer-approved emergency disable of destructive capabilities while preserving observation and essential blocking.

**Acceptance:** A validly signed but wrong-tenant command fails; an expired or replayed action fails safely; a compromised plugin cannot read another connector's secret or issue arbitrary network requests.

---

<a id="orvia-section-31"></a>

# 31. CUSTOMER DATA BOUNDARY

Classify information into:

## Category A — Control Metadata

Examples:

- Policy ID
- Purpose ID
- System ID
- Connector ID
- Workflow state
- Action status
- Evidence metadata
- Error codes

These stay in the customer-hosted control plane. Their label as metadata does not authorise vendor collection; workflow, action, policy, system and evidence identifiers are excluded from the default vendor exchange.

## Category B — Personal Data

Examples:

- Name
- Phone
- Email
- Address
- Customer profile
- Sensitive fields

Process and store these only in the customer-controlled runtime. Do not send them to ORVIA-operated infrastructure, including encrypted copies, hashes, masked values or model contexts derived from them.

## Category C — Derived Results

Examples:

- Match found
- Action completed
- Action failed
- Record count
- Verification result
- Masked identifier

Return these results to authorised services and users inside the customer deployment. Do not return principal-linked results, counts, masked identifiers or operational verification records to the vendor service.

## EXPANDED PRIVACY CONTROL GRAPH

Maintain principal-level data, lookup indices and all principal references inside the customer-controlled environment. A graph hosted in the customer’s own cloud may use tenant-scoped opaque identifiers locally; ORVIA’s vendor cloud must not receive those identifiers. Do not construct a cross-company identity graph from matching email addresses or hashes.

## PERSONAL-DATA BOUNDARIES AND EVIDENCE RETENTION

**Proposal:** Treat classification as a property of the actual content and its identifiability. Do not assume a tenant-specific hash, masked email, workflow result or error message is non-personal. [R1, §2(t)]

Prefer random opaque references backed by customer-local mappings. If keyed hashes are used for supported matching, scope keys to the tenant and intended domain, plan rotation and prohibit cross-customer correlation. Plain unsalted hashes of phone numbers are not an acceptable privacy boundary.

Keep names, addresses, identifiers, uploaded identity evidence and access-response payloads out of workflow search attributes, queue headers, telemetry tags, URL paths and unredacted error logs. Use short-lived payload references. Temporal history and AI traces are also data stores; minimizing only the main application database is insufficient.

## PRESERVATION AND AMENDMENT REGISTER

Control metadata, hashes, references and derived results can still be personal data. Apply classification rather than assuming exemption.

## EXPLICIT MINIMUM VENDOR-DATA CONTRACT

**Terminology:** “customer environment” means the infrastructure, cloud account/project, encryption keys and administrative access controlled by the purchasing organisation. It is not necessarily an on-premises building or a particular country. A cloud provider can operate underlying infrastructure without ORVIA becoming the recipient of the customer’s application data. Geographic residency and cloud-provider access commitments must be specified separately.

The following is the permitted collection specification, not a claim that every listed field must be collected. Omit any field not necessary for the purchased service. Before shipping, define each allowed field’s purpose, destination, access, retention/deletion schedule and whether the customer can disable its transmission.

| Information class | Permitted vendor handling | Boundary |
|---|---|---|
| Commercial account | Organisation/business name, designated business account contact, necessary billing/tax details, order/subscription/payment reference and support contact | Supplied for purchasing/support, never discovered by reading customer systems. Business contact details can themselves be personal data; do not claim ORVIA processes no personal data at all. |
| Licensing | Vendor account ID, licence ID, edition, purchased entitlements, validity, licensed limits and a random installation identifier where needed | Installation ID identifies the installation, not a Data Principal. Do not upload end-customer/user directories, customer counts or record-derived fingerprints. Enforce limits locally where possible. |
| Distribution/security service records | Requested release/artifact identifier, download authorisation outcome, necessary request timestamp and transport metadata such as source IP | Restrict access and retention; explain that contacting a vendor website normally exposes connection metadata. Do not add device/browser fingerprinting or operational payloads. Offline transfer avoids runtime callbacks. |
| Optional diagnostics | Customer-approved product/component versions, bounded health/error enums and necessary resource-use summaries generated from an allowlisted schema | Off by default; local preview and approval. No workload content, operational IDs, stack traces with values, internal hostnames, database names, table/field names or identifiable small-group counts. |
| Customer operational information | Principal records/references, consents, notices with personal content, requests, attachments, system maps, policies, events, workflow/action records, evidence, logs, backups, search indexes, embeddings, prompts and outputs | Customer-local only. Do not upload through licensing, analytics, AI, support, updates, crash reporting or an ORVIA-managed intermediary. |
| Secrets and key material | Customer credentials, API tokens, authentication signing keys, decryption keys and connector secrets | Customer-local only. No vendor escrow, master decryption key or recovery backdoor. |

A minimal online licence request may contain the following fixed-shape fields; the server rejects unrecognised fields and does not persist rejected bodies:

```json
{
  "schema_version": 1,
  "license_id": "lic_example",
  "installation_id": "random_installation_reference",
  "nonce": "single_use_random_value"
}
```

The example is a data-minimisation contract, not a production authentication protocol. Use authenticated transport, replay protection and a locally verified signed response. Keep the installation identifier independent of customer records, hardware serials and end-customer identity. The vendor already knows the purchased edition and should not ask the runtime to rediscover it from customer data.

**Enforcement:** deny vendor egress by default; expose only documented licensing/update endpoints through a narrowly scoped broker or approved proxy. Restrict destinations, methods, paths, fixed field formats, payload sizes and cadence. Workload services and arbitrary connector/AI code must not have direct vendor-network credentials or unrestricted internet access. Log authorised outbound exchanges locally without collecting sensitive rejected payloads on the vendor side. A JSON allowlist alone is not a complete barrier against a compromised host; customer network controls and the security programme provide additional layers.

**No telemetry exception:** hashed, encrypted, redacted or “anonymous” operational data is not automatically eligible for vendor transmission. The default does not monetise, sell, train models on or aggregate end-customer data across organisations.

**External systems:** preserve all existing connector, notification and AI-governance capabilities, but apply the actual destination boundary. Internal systems and customer-controlled cloud services can operate in `CUSTOMER_LOCAL`. An approved external SaaS processor or the customer's own external-model application governed under §215 is a distinct external-processing configuration and must not be advertised as “nothing leaves the organisation.” It still must not route personal data through ORVIA’s vendor infrastructure. In the strict no-external-processing profile, block such destinations. ORVIA Intelligence itself uses only the approved ORVIA-owned customer-local model under §§63–65; this paragraph does not authorise an external provider or pretrained model for that assistant. Direct authorised responses to a Data Principal must go through the customer’s own portal/delivery path, not ORVIA’s commerce plane.

If prohibited material is accidentally received by vendor support or another channel, stop propagation, restrict access, treat it as a boundary incident and follow the documented minimisation, evidence and deletion process. Do not use it for debugging or model training, and do not imply such an incident could never occur.

## SUPPORT AND AI DO NOT CREATE NEW CUSTOMER-DATA EXPORT RIGHTS

The vendor Super Admin/Admin receives only the commercial and deliberately permitted support information above. A role name, support escalation, encryption, hashing or AI-generated summary does not create an exception for production records. Customer member lists, system identifiers, internal hostnames, workflows and evidence remain local.

A customer-approved support exchange may include a vendor case identifier, existing licence/random installation reference, product/component version, enumerated problem category/error code, customer-selected urgency, approved runbook result enum and synthetic reproduction. Each field requires the purpose/retention/access specification already required here. No arbitrary log text or local operational reference is allowed. Detailed rules and optional opt-in notifications are in §§95–96.

For Product Version 2, Lightning AI is the vendor-selected **model-development infrastructure provider** (training is on hold for Version 1), not a customer data processor for runtime inference in this architecture. Only vetted public/licensed non-customer corpus material, ORVIA-authored documentation, synthetic fixtures, training code and resulting ORVIA experiment artifacts may enter that training environment. Do not mount customer storage, issue customer credentials, upload support payloads, or send customer prompt/output/embedding/gradient data to it.

Product Version 2 runtime inference can inspect minimal customer-local context that the requesting person is authorised to see; that is **not training**. It stays local and must not change released model weights, be added to a vendor training corpus, or be used for federated learning or cross-customer improvement. Training and inference provenance are governed by §§64–65.

Authorised display to an employee's browser or a response to a Data Principal is an intentional customer workflow, not vendor receipt. Endpoint caches, exports and downloads need customer controls. The vendor website, vendor staff, Lightning training workspace and customer runtime are four distinguishable recipients/locations, not one undifferentiated “cloud.”

---

<a id="orvia-section-32"></a>

# 32. PRIVACY-PRESERVING EXECUTION MODEL

Required in `CUSTOMER_LOCAL`:

```text
CUSTOMER-HOSTED ORVIA
    ↓
Locally authorised instruction
    ↓
Customer Agent
    ↓
Local data access
    ↓
Local action
    ↓
Local verification and evidence
    ↓
CUSTOMER-HOSTED ORVIA

```

rather than:

```text
Customer Database
    ↓
Copy everything
    ↓
ORVIA Cloud

```

Do not create a central ORVIA data lake containing customer records.

---

<a id="orvia-section-33"></a>

# 33. PORTAL DATA BOUNDARY

Because Data Principal requests can contain personal data, the default portal and request-processing components must run in the customer environment.

### Data-local mode — active default

All request content, personal identifiers, uploaded files, consent interactions and request-status records remain customer-local. No ORVIA-operated proxy, analytics endpoint or vendor-side queue may handle those records. Authentication for the privacy portal is customer-controlled and separate from the ORVIA purchase account.

### Vendor-hosted standard mode — retained alternative, not enabled

The earlier architecture allowed minimal request information through an ORVIA-hosted portal. That option is retained as an alternative design only; it does not satisfy the user’s current “customer information stays in their organisation” requirement and must not be enabled, sold under that promise or selected automatically. A future separate offer would require a revised product/data-processing decision and explicit disclosures.

Retaining the alternative in the design does not reduce the mandatory data-local boundary for the current product.

---

<a id="orvia-section-34"></a>

# 34. CLOUD ARCHITECTURE

Required location: the operational architecture below is deployed in the customer’s infrastructure. “Load Balancer / CDN” means a customer-controlled entry point approved for this boundary, not ORVIA’s website/CDN. Do not forward payloads, identifiers or request logs to a vendor edge service.

```text
                    INTERNET
                       │
                       ▼
               Load Balancer / CDN
                       │
                       ▼
                ORVIA Web / API
                       │
            ┌──────────┼──────────┐
            ▼          ▼          ▼
         Identity    Policy     Graph
            │          │          │
            └──────────┼──────────┘
                       ▼
                 Workflow Engine
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
      Connectors    Evidence       Testing
          │
          ▼
     Customer Agent
          │
          ▼
  Customer Systems

```

## SEPARATE VENDOR COMMERCE AND CUSTOMER OPERATIONAL PLANES

| Vendor-operated website/cloud | Customer-operated ORVIA runtime |
|---|---|
| Product website, checkout, business account and invoices | Admin console, portal and customer identity integration |
| Subscriptions, entitlements and signed licence issuance | Local licence verification and entitlement enforcement |
| Authenticated package downloads and signed update catalogues | Customer-approved installation, update validation and migrations |
| Minimal business support and allowlisted diagnostic intake | Databases, graph, policies, consent, rights, workflows, connectors, evidence, tests, optional V1 Guided Assistance, Product V2 AI and observability |

These planes have separate accounts, databases, credentials and trust roles. The vendor does not hold a customer runtime administrator, connector command-signing key, database account or decryption key. Compromise of a billing account must not grant access to a customer deployment.

Runtime privacy decisions, identity matching, approvals, verification and evidence must not depend on a vendor API call. A paid account obtains software and entitlements, not a vendor-mediated processing channel. Validate vendor replies as untrusted input: licence responses cannot contain executable commands, support access grants or new data-export destinations.

## NAMED INTERFACES AND THEIR HOSTING BOUNDARIES

Addresses below are illustrative, not real service endpoints.

| Experience | Audience | Hosting and identity | Example address |
|---|---|---|---|
| **ORVIA Account** | Purchaser, billing administrator, authorised download/support contacts | ORVIA vendor commerce infrastructure; commercial account login | `https://account.orvia.example` |
| **ORVIA Workspace** | Customer privacy, engineering, security and audit teams | Customer infrastructure; customer-controlled runtime identity | `https://orvia.acme.example` |
| **Acme Privacy Center, powered by ORVIA** | Acme's clients/customers, called Data Principals in the specification | Customer-controlled portal and restricted portal API; identity scoped to each person's interactions | `https://privacy.acme.example` |

The public ORVIA marketing site is an unauthenticated entry point to the first experience. An internal ORVIA vendor-support console is separate staff tooling, not a customer-runtime administrator account.

**Our website manages the commercial relationship. Their installation performs privacy operations. Their privacy portal serves their clients.** [M1 §§20, 31–34, 82–86, 95–96, 203]

---

<a id="orvia-section-35"></a>

# 35. MULTI-TENANCY

Every multi-tenant deployment—including customer-operated group workspaces and the separate vendor commercial service—must support strict tenant isolation.

Every tenant-owned object must have:

```text
organisation_id

```

Database queries must never omit tenant scope.

Testing must include cross-tenant attack attempts.

No frontend filtering should be treated as tenant security.

## TENANT ISOLATION AND ACCESS GOVERNANCE

Scope unique identifiers, foreign keys, object-store paths, queue routing, cache entries, search queries, embeddings, traces, exports and support views. Establish tenant context server-side from authenticated authorization, never from an untrusted request field alone. Test pooled-connection reuse and background jobs without a tenant.

Corporate-group views require explicit access grants and separate legal-entity contexts. Do not infer consent sharing across subsidiaries. A consultant's multi-customer view aggregates authorized operational status, not a merged principal identity pool.

**Acceptance:** The isolation suite covers API, database, background workers, search, AI retrieval, storage, exports, support and telemetry; ambiguous tenant context is denied.

## MEMBERSHIP, SUBTENANTS AND ENVIRONMENTS

A **member** is a person assigned permissions. A **tenant/subtenant** is a data and authority boundary. An **environment** is an operational context such as test or production. Keep these concepts distinct in storage, API contracts and the interface.

Default customer isolation is a separate customer-controlled deployment. An organisation may create supported subtenants for its own explicitly approved business units or projects; this does not grant permission to host unrelated businesses under one shared identity/data scope. Model legal entities separately and apply applicable product/contract boundaries.

Organisation Super Admin can oversee its own defined organisational scopes; Organisation/Subtenant Admin sees only delegated scopes; Members see only assigned resources. No vendor staff role inherits access to any of them. Counts, activity views, integration health and member administration remain customer-local. Monitor product/security activity relevant to administration—not unrelated device activity or undisclosed employee surveillance.

---

<a id="orvia-section-36"></a>

# 36. DATABASE SECURITY

Use:

- Least privilege
- Separate application DB credentials where appropriate
- Encrypted connections
- Encrypted storage
- Database backups
- Audited administrative access
- Query logging where appropriate
- Controlled migrations

Where practical, use PostgreSQL row-level security as an additional protection layer.

## TENANT ISOLATION AND ACCESS GOVERNANCE

**Proposal:** Use a non-owner, non-superuser application database role without `BYPASSRLS`. Apply row-level security as defense in depth, explicit tenant predicates and tenant-aware composite constraints. PostgreSQL documents that table owners and privileged roles can bypass RLS; merely adding a policy is not sufficient. [R6]

Keep database migration and emergency administration credentials separate from request handling. Test privileged maintenance tools and backup completeness. Limit table-wide operations and security-definer functions; RLS is not a complete answer to application compromise.

---

<a id="orvia-section-37"></a>

# 37. SECRETS MANAGEMENT

Never store:

- database passwords
- API keys
- connector credentials
- signing keys
- encryption keys

in source code.

Use:

- cloud secrets manager
- Vault-like secret management
- customer-provided secrets manager for enterprise deployments

OWASP specifically recommends centralised storage, provisioning, auditing and rotation of secrets rather than scattering credentials across source/configuration.

## CUSTOMER SECRET OWNERSHIP

In `CUSTOMER_LOCAL`, resolve customer secrets only through a customer-managed secret store or a supported local protected store. ORVIA vendor services have no read permission, shared master secret or remote recovery credential. Separate commercial licence-signing keys from runtime authorisation and encryption keys. Bootstrap must generate or enrol unique installation identities without shipping shared production credentials.

---

<a id="orvia-section-38"></a>

# 38. ENCRYPTION

Use encryption:

### In transit

TLS.

### At rest

Database/storage encryption.

### Application-level encryption

For particularly sensitive values where necessary.

### Key hierarchy

Use envelope encryption where appropriate.

Maintain:

```text
Master Key
   ↓
Data Encryption Key
   ↓
Encrypted Data

```

Do not store encryption keys alongside encrypted data.

---

<a id="orvia-section-39"></a>

# 39. KEY MANAGEMENT

Support:

- Cloud KMS
- Customer-managed keys where applicable
- Key rotation
- Key versioning
- Key access auditing

Enterprise deployments should eventually support:

```text
AWS KMS
Azure Key Vault
Google Cloud KMS
Customer HSM / compatible solution

```

## NO VENDOR DECRYPTION OR EXECUTION KEY

The customer controls runtime encryption, authentication and connector-command keys. Vendor licence/update public keys are verification material only; they must not unlock customer data or authorise privacy actions. Keep vendor signing private keys in separately controlled signing infrastructure. Support key rotation and recovery through the customer’s approved process without uploading customer key material to ORVIA. Customer-side encryption does not by itself prevent a compromised authorised process from reading data; access isolation and monitoring remain required.

---

<a id="orvia-section-40"></a>

# 40. PRIVACY FIREWALL / CONTROL POINT

This is a policy enforcement component.

Initial implementation:

```text
Application
   ↓
ORVIA SDK / API / Middleware
   ↓
Policy request
   ↓
Policy decision
   ↓
Allow / Mask / Restrict / Block

```

Do not make the first release a universal database proxy.

Start with selected application/API boundaries.

## CONSENT ORDERING, REVOCATION AND RACE SAFETY

Before a supported marketing send, export or audience admission, the enforcement point must validate current purpose authorization and a sufficiently fresh revocation view. An earlier ALLOW response is not an indefinite bearer permission. Bind a decision to the tenant, principal reference, action, purpose, audience, data scope, policy version and consent epoch.

---

<a id="orvia-section-41"></a>

# 41. PRIVACY SDK

Initial supported SDKs:

- Node.js
- Python

Potential later additions:

- Java
- .NET
- Go
- PHP
- mobile SDKs

The SDK should provide:

```text
check()
authorize()
enforce()
record()

```

Conceptually:

```javascript
const decision = await orvia.check({
  principal,
  action,
  purpose,
  resource,
  context
});

```

The SDK must not contain the complete policy definition.

It requests a decision from ORVIA's policy layer.

## POLICY DECISION CONTRACT AND LOCAL ENFORCEMENT

In `CUSTOMER_LOCAL`, the customer-hosted platform provides authoring, approval, policy distribution and evidence coordination. Its policy decision service evaluates signed published bundles and local references. The SDK calls that customer-hosted service/API, never a vendor decision endpoint carrying personal context; it does not embed the full policy set. OPA supports signed bundle verification, but freshness, rollback safety and revocation transport remain ORVIA responsibilities. [R7]

---

<a id="orvia-section-42"></a>

# 42. LOCAL POLICY CACHE

To improve resilience, selected policy decisions/configurations may be cached locally.

Cache rules must include:

- expiration
- version
- signature
- rollback support
- fail-safe/fail-closed behaviour appropriate to the control

Do not use stale policy information without a defined policy strategy.

## PRESERVATION AND AMENDMENT REGISTER

Versioned consent becomes an ordered state machine with revocation freshness and execution-time checks.

SDKs call the customer-controlled policy service, whether on premises or in the customer’s cloud. Signed policy bundles live in that service, not inside application SDK code. No vendor policy endpoint receives customer principal context in `CUSTOMER_LOCAL`.

---

<a id="orvia-section-43"></a>

# 43. OFFLINE / DEGRADED OPERATION

Customer-side components must distinguish vendor website/licensing unavailability from failure of the customer’s own operational services. With a valid locally verifiable licence, loss of the vendor connection must not stop local privacy operations.

Possible modes:

```text
ONLINE
DEGRADED
OFFLINE

```

Each privacy control should declare whether it can:

- continue locally;
- block;
- queue;
- fail closed;
- fail open;
- require human intervention.

This must not be an implicit engineering decision.

## DEPLOYMENT, RESILIENCE AND MEASUREMENT

Keep runtime enforcement isolated from expensive scans, exports and AI jobs. Use per-tenant and provider workload quotas. Define failure behavior for cloud outage, local policy failure, expired bundle, stale revocation cursor, full agent spool, unavailable secret store and interrupted external side effects.

## OFFLINE LICENSING AND STRICT NETWORK MODE

Provide signed licence import and approved package/update transfer without requiring runtime internet access. Entitlements and expiry are evaluated locally with explicit clock/tamper handling. Define safe behaviour for expiry, revocation information that cannot be refreshed, renewal and support handover; do not silently fail open, destroy data, disable an accepted restriction or grant remote vendor control (§160).

“No runtime vendor callback” is not automatically a claim of fully engineered air-gap support. Air-gap packaging, dependency mirrors, offline trust updates and operational testing remain explicit requirements in §86.

## CONNECTIVITY IS NOT THE SAME AS AUTHORISATION

| Condition | Required behaviour |
|---|---|
| Vendor website, support service or Lightning training service unavailable | Version 1 customer-local login and deterministic workflows remain independent; a future installed Product Version 2 model must also be independent of these services |
| Customer internet unavailable but local network intact | Local functions continue as supported; external integrations and vendor support delivery may be unavailable |
| Employee cannot reach the customer network | No workspace access from that device until its approved route is restored |
| Employee closes the browser | An accepted durable workflow continues on the customer server |
| Runtime host or evaluation laptop stops | Services on that host stop unless the deployed recovery/failover profile takes over |
| No supported local AI resources/model | Version 1: expected DEFERRED_V2 state, not a fault. Product Version 2: show AI unavailable; both retain deterministic help and escalation with no external-model fallback |

A completely disconnected customer environment cannot proactively notify vendor support. Record local alerts, queued approved reports and unavailable channels honestly; the customer can export a permitted report through an approved manual transfer.

---

<a id="orvia-section-44"></a>

# 44. VERIFICATION ENGINE

Verification is separate from execution.

Example:

```text
Action sent
   ≠
Action verified

```

The verification engine should support:

```text
ACKNOWLEDGED
CONFIRMED
VERIFIED
UNVERIFIED
FAILED

```

For a deletion request:

```text
DELETE API = SUCCESS

```

does not automatically mean:

```text
DELETION VERIFIED

```

unless the connector's verification mechanism supports that conclusion.

## ASSURANCE AND VERIFICATION MODEL

**Proposal:** Preserve the existing execution/verification states and add structured dimensions instead of one misleading assurance score.

An `OutcomeClaim` contains the claim, action, scope, observation method, observation time, applicable consistency delay, source identity, connector version, policy version, integrity metadata, limitations, freshness expiry and reviewer where needed.

Record independently: configuration status; supported capability; attempted effect; provider acknowledgement; observed state; test result; evidence integrity; inventory coverage. These are not interchangeable levels. A synthetic regression pass does not establish that every production record was erased. A signed response from a processor is an attributable assertion, not independent observation.

A verification result becomes stale after its defined observation window or a material system/control change. Failed verification reopens the relevant action or gap, even if the original API returned success. Sampling must identify the sample and cannot substantiate an unqualified full-population claim.

Example user-facing result: **“CRM audience removal observed at 14:03; marketing vendor acknowledged the request; vendor backup treatment remains outside automated verification.”** Every clause links to its supporting evidence.

**Acceptance:** The UI cannot display “verified across all systems” when one declared system has no verification capability; evidence corruption fails validation; old observations cannot remain indefinitely green.

---

<a id="orvia-section-45"></a>

# 45. EVIDENCE ENGINE

Every meaningful privacy operation creates an evidence chain.

Evidence should include:

- event ID
- organisation
- workflow ID
- action ID
- policy ID
- policy version
- system
- connector
- timestamps
- result
- verification result
- actor
- approval
- error codes
- integrity metadata

Evidence must be append-oriented.

Historical evidence should not be silently overwritten.

---

<a id="orvia-section-46"></a>

# 46. AUDIT TRAIL

Every security-sensitive action must be logged.

Examples:

```text
User login
Policy created
Policy modified
Policy published
Consent updated
Rights request created
Workflow started
Workflow approved
Connector credential changed
Integration installed
Action executed
Action failed
Evidence viewed
Support bundle generated
License changed

```

Logs must have:

- timestamp
- actor
- tenant
- action
- target
- outcome
- correlation ID

## ROLE, SUPPORT AND MODEL AUDIT EVENTS

Audit vendor role changes, assigned-case access, support replies, approved diagnostic receipt, licence reissue and package/model publication in vendor stores without customer operational context. Audit customer role/delegation changes, subtenant access, local troubleshooting, support-report preview/approval, local model/knowledge-pack installation and proposed repair approval inside the customer environment.

Do not mirror customer audit streams to vendor services. A model response, suggested fix, accepted action and verified outcome are distinct records. Role elevation and support closure must never erase adverse evidence or convert an unresolved privacy action into a verified result.

---

<a id="orvia-section-47"></a>

# 47. EVIDENCE INTEGRITY

Use integrity controls such as:

- hashes
- chained records
- signed evidence
- append-only storage

where appropriate.

Do not claim that cryptographic evidence automatically proves an external-world event occurred.

It proves what ORVIA recorded and can help detect tampering.

## ASSURANCE AND VERIFICATION MODEL

Add a downloadable evidence manifest and an offline validation command that checks signatures, hashes and chain continuity. The validator must explicitly state that integrity validation does not independently establish the truth of external events.

---

<a id="orvia-section-48"></a>

# 48. PRIVACY FAILURE CENTER

Central view:

```text
FAILED CONTROLS
PENDING ACTIONS
UNVERIFIED RESULTS
MANUAL TASKS
CONNECTOR FAILURES
POLICY CONFLICTS
TEST FAILURES

```

Each failure contains:

```text
What happened
Affected system
Affected purpose
Severity
Confidence
Policy
Suggested action
Owner
Deadline
Evidence
Current status

```

## USER EXPERIENCE, ACCESSIBILITY AND TRUST

**Acceptance:** A first-time operator can distinguish an unresolved vendor action from a completed internal action without reading raw logs.

## VERSION 1 RULE-BASED FAILURE GUIDANCE

Map observed error/reason codes to reviewed, versioned explanations and runbooks, with permission-filtered links to local action and verification records. Show the observed state and unresolved outcome separately from suggested checks. A timeout is not proof that an external effect failed, and a runbook match is not a verified root cause. Unknown conditions go to manual review or direct support; guidance cannot close a failed control or relabel it verified.

---

<a id="orvia-section-49"></a>

# 49. COVERAGE MAP

Every integration must expose its technical coverage.

Example:

| SystemDiscoverySearchUpdateDeleteVerify |   |   |   |   |   |
| --------------------------------------- | - | - | - | - | - |
| CRM                                     | ✓ | ✓ | ✓ | ✓ | ✓ |
| Marketing                               | ✓ | ✓ | ✓ | ✓ | ✓ |
| Legacy DB                               | ✓ | ✓ | ✗ | ✗ | ✗ |
| Vendor API                              | ✓ | ✓ | ✓ | ✗ | ✓ |

Never display 100% coverage when the connector does not provide it.

## CONTINUOUS DISCOVERY, LINEAGE AND COVERAGE GAPS

A coverage assertion specifies inventory snapshot, system/resource/action, enforced boundary, credentials used, supported operation, verification mechanism, last checked time and exclusions. Display counts alongside any percentage. Example: “7 of 10 declared marketing destinations have tested blocking; 2 manual, 1 not connected; additional undiscovered destinations are not measured.”

---

<a id="orvia-section-50"></a>

# 50. RETENTION ENGINE

Retention is policy-driven.

Model:

```text
Purpose
 ↓
Data
 ↓
System
 ↓
Retention rule
 ↓
Retention event
 ↓
Eligibility evaluation
 ↓
Exception evaluation
 ↓
Action
 ↓
Verification

```

Support:

- retention periods
- event-based retention
- approved processing condition or documented legal retention basis
- manual review
- restricted retention
- deletion
- archival where applicable

## RETENTION CONFLICTS AND LEGAL HOLDS

**Proposal:** Evaluate retention per data copy, category and processing context—not simply per person or table. A phone number used for shipping, promotional messages and a legally retained transaction can need different restrictions simultaneously.

`RetentionConstraint` needs a trigger, calculation rule, relevant processing date, minimum/maximum where applicable, authorized purpose, legal/contractual source class, applicability, release condition, owner, review date and permitted operations. Product choices and contractual requirements must not be mislabeled as law.

Replace “take the longest duration and keep everything” with an explicit plan: remove from disallowed use; segregate a necessary retained copy; restrict users and actions; delete unnecessary fields; schedule release and verification. Avoid accidentally restarting a retention timer whenever a background job reads the same data.

A `LegalHold` must identify the exact scope, authority, reason, evidence, approving role, review schedule and release criteria. An operator cannot choose “business need” to bypass a withdrawal or erasure requirement. If obligations appear incompatible, quarantine the contested action for legal review rather than inventing a universal precedence rule.

**Acceptance:** Withdrawal disables promotional use while an approved restricted retention copy remains inaccessible to marketing; hold release triggers a new eligibility review; expiry of one purpose does not erase a record still required for another authorized context without a scoped decision.

## PRESERVATION AND AMENDMENT REGISTER

A “business exception” is not independent legal permission. Require an approved processing condition or documented legal retention basis.

---

<a id="orvia-section-51"></a>

# 51. DELETION ENGINE

Deletion should be:

```text
Requested
 ↓
Validated
 ↓
Policy evaluated
 ↓
Eligible scope identified
 ↓
Human approval if needed
 ↓
Execution plan
 ↓
System actions
 ↓
Verification
 ↓
Evidence

```

Do not automatically delete records based on an AI classification alone.

## DELETION, DERIVED COPIES AND RESTORATION SAFETY

**Proposal:** Track deletion as a set of copy-level outcomes. Expand the inventory to primary stores, read replicas, caches, search indices, analytics tables, object versions, exports, processors, embeddings and backups when known.

The deletion plan separates immediate suppression, permitted live-store changes, derived-copy cleanup, processor actions, backup handling and final verification. A future backup-expiry date is not present-tense proof of erasure. A vendor acknowledgement is not a read-back observation. A soft delete is not automatically physical erasure.

Protect customer systems with chunked operations, row/copy budgets, dependency order, load windows, kill switches and checkpoints. Human approval binds to target identity, record generation, approved copy scope and exact plan digest. Changed scope invalidates approval.

**Acceptance:** A restore cannot reactivate a known withdrawn marketing purpose without reconciliation; an unknown backup remains visibly unverified; deleting one principal's key cannot affect another principal's data.

---

<a id="orvia-section-52"></a>

# 52. CRYPTOGRAPHIC DELETION

Optional advanced capability.

Possible use:

```text
Data
 ↓
Encrypted with data-specific key
 ↓
Key destroyed

```

But this should be documented as a technical data-destruction mechanism where supported.

Do not tell customers that destroying an encryption key universally guarantees legal erasure from every conceivable backup, replica or operational copy.

## DELETION, DERIVED COPIES AND RESTORATION SAFETY

For cryptographic deletion, identify key boundaries, copies of keys, caches and data encrypted with shared keys. Report precisely what became inaccessible. Never call key destruction a universal legal-erasure guarantee. Machine-unlearning claims are outside supported deletion coverage until a specific implementation and evaluation justify them.

---

<a id="orvia-section-53"></a>

# 53. PROCESSOR/VENDOR MANAGEMENT

Each processor should have:

```text
Vendor
Purpose
Data categories
Systems
Contract/reference
Status
Controls
Actions
Acknowledgements
Evidence

```

A privacy request can trigger:

```text
Internal system action
+
Processor notification
+
Processor acknowledgement
+
Verification

```

## ASSESSMENTS, SDF GOVERNANCE AND REMEDIATION

For processors, add contract ownership, purpose/data scope, authorized subprocessors, region, incident contacts, action response expectations, acknowledgement type and evidence. Procurement changes trigger scoped reviews. Processor obligations remain attributable to the responsible customer team; ORVIA does not transfer legal accountability to software.

---

<a id="orvia-section-54"></a>

# 54. PRIVACY INCIDENT EXPLORER

When a privacy incident is created:

```text
Incident
 ↓
Affected system
 ↓
Affected data
 ↓
Processing purposes
 ↓
Relevant policies
 ↓
Relevant processors
 ↓
Affected principal references
 ↓
Evidence
 ↓
Response workflow

```

The incident engine should provide:

- timeline
- affected systems
- affected processing
- affected control
- evidence
- unresolved actions
- response status

## INCIDENT WORKSPACE AND MULTIPLE NOTIFICATION CLOCKS

**Proposal:** Extend the existing Incident Explorer into an evidence-linked response workspace. Separate occurrence time, detection time, awareness time, each regime's triggering time, who established it and the supporting record. Later corrections are appended; clocks do not silently restart.

Create independent tasks per recipient and applicable regime: affected principals, Data Protection Board, CERT-In, sector authority, processors and contractual contacts. Each task has an applicability decision, deadline rule, draft, reviewer, dispatch authority, actual transmission evidence and acknowledgement. Do not derive every obligation from severity alone.

Run scheduled exercises with synthetic incidents, missing data, late processor responses and conflicting timestamps. Test that a review bottleneck is escalated rather than silently missing a deadline. The clock engine supports both exact statutory intervals and internal earlier escalation objectives without conflating them.

**Acceptance:** A single incident can show one completed notification, one pending detailed report and one unresolved applicability review without collapsing to a misleading “notified” flag.

---

<a id="orvia-section-55"></a>

# 55. INCIDENT SEVERITY

Use configurable severity:

```text
LOW
MEDIUM
HIGH
CRITICAL

```

The severity calculation should use configurable rules and not be entirely AI-generated.

---

<a id="orvia-section-56"></a>

# 56. NOTIFICATION SUPPORT

ORVIA can provide notification-support workflows and drafts.

It must not automatically make legal declarations without customer review.

The system should clearly distinguish:

```text
System-generated factual information

```

from:

```text
Legal interpretation / customer decision

```

## INCIDENT WORKSPACE AND MULTIPLE NOTIFICATION CLOCKS

Automate factual collection, timeline reconstruction, affected-scope queries, draft preparation, owner escalation and delivery-status tracking. Regulatory assertions and dispatch remain customer-authorized. Do not advertise direct Board filing unless an actual supported authorized channel exists and has been tested; otherwise produce a reviewed submission package and record manual delivery evidence.

Build notification templates in reviewed languages and use accessible, concise information. Avoid leaking other affected people's data into an individual notice. Store incident drafts securely; a draft is not proof of delivery.

---

<a id="orvia-section-57"></a>

# 57. PRIVACY TEST ENGINE

The test engine is one of ORVIA's most important capabilities.

Tests should have:

```text
test_id
name
purpose
preconditions
steps
expected_result
environment
systems
policy_version
severity

```

---

<a id="orvia-section-58"></a>

# 58. SYNTHETIC TESTING

Default tests should use:

- synthetic identities
- synthetic records
- test accounts
- sandbox environments

The platform should never silently create or modify real customer records to test destructive privacy actions.

---

<a id="orvia-section-59"></a>

# 59. PRIVACY REGRESSION TEST

Example:

```text
TEST:
Marketing withdrawal

Setup:
Synthetic principal has valid marketing consent.

Action:
Withdraw marketing consent.

Expected:
Marketing API = BLOCK
CRM campaign status = REMOVED
Marketing audience = REMOVED

Actual:
Marketing API = ALLOW

RESULT:
FAILED

```

---

<a id="orvia-section-60"></a>

# 60. CI/CD INTEGRATION

ORVIA should eventually support:

```text
Git commit
 ↓
Build
 ↓
Deploy to test environment
 ↓
ORVIA privacy tests
 ↓
PASS / FAIL

```

Possible integrations:

- GitHub Actions
- GitLab CI
- Jenkins
- Azure DevOps

The CI integration should support machine-readable results.

---

<a id="orvia-section-61"></a>

# 61. PRIVACY TEST SUITE

Provide categories:

```text
CONSENT
WITHDRAWAL
ACCESS
CORRECTION
ERASURE
RETENTION
RESTRICTED PROCESSING
PROCESSOR PROPAGATION
POLICY ENFORCEMENT
DATA FLOW
INTEGRATION
INCIDENT RESPONSE

```

---

<a id="orvia-section-62"></a>

# 62. PRIVACY DRIFT DETECTION

Detect:

- new system
- changed system
- new field
- changed data flow
- new processor
- changed purpose
- changed policy
- failed connector
- changed API behaviour
- privacy test failure

When drift is detected:

```text
Change detected
 ↓
Impact analysis
 ↓
Affected controls
 ↓
Affected tests
 ↓
Review
 ↓
Action

```

## CONTINUOUS DISCOVERY, LINEAGE AND COVERAGE GAPS

**Proposal:** Combine catalog/schema discovery, customer declarations, approved API specifications, application instrumentation and connector observations. Use incremental scans and customer-approved load budgets. Content sampling is opt-in, minimized and local where practical; field names alone do not establish actual sensitivity or purpose.

Track discovery precision, false positives, review decisions and freshness. Unknown assets remain unknown; a scanner cannot demonstrate that nothing exists outside its permissions. Reconcile new assets and changed destinations against approved purposes and owners.

Use graph impact to identify affected policies, tests, legal assessments and owners after drift. Classify drift as informational, review-required or blocking according to deterministic approved rules. Product Version 2 AI can explain the delta but cannot approve a newly inferred processing purpose. Version 1 uses the observed diff, explicit rules and reviewed explanation templates.

Extend approved data-flow checks to event streams, batch exports, analytics and customer AI retrieval surfaces as connectors become available. Avoid pretending that a generic REST connector provides comprehensive coverage of every API.

**Acceptance:** Revoking discovery access lowers freshness/coverage rather than preserving a green badge; an unreviewed new processor cannot silently inherit an old purpose approval.

---

<a id="orvia-section-63"></a>

# 63. AI ARCHITECTURE

**Product-release scope:** Version 1 contains the deterministic core and may include the small rules-based Guided Assistance defined below. The custom-model architecture in this section is preserved for **Product Version 2 — DEFERRED_V2**, not required or enabled in Version 1. AI tools used by engineers to build the product are a separate matter and remain permitted.

AI is an assistance layer.

The retained long-term architecture is; the right-hand model branch is Product Version 2:

```text
                 ORVIA
                    │
        ┌───────────┴───────────┐
        │                       │
 DETERMINISTIC CORE          AI LAYER (PRODUCT V2)
        │                       │
 Graph                      Copilot
 Policy                     Discovery
 Workflow                   Policy Builder
 Enforcement                Workflow Builder
 Verification               Risk Analysis
 Evidence                   Incident Analysis
 Testing                    Test Generation

```

The deterministic core must continue functioning if AI is unavailable.

## AI REMAINS INSIDE THE SAME DATA BOUNDARY

For operational/customer content, all seven AI functions must use inference, retrieval, embeddings, model logs and tool execution inside the customer-controlled boundary. When Product Version 2 is introduced, an approved ORVIA-owned model release running inside the customer environment is required for these AI functions; a third-party model is not an automatic substitute. If unavailable, report the affected AI capability unavailable and keep the deterministic platform running; never fall back to a vendor-hosted or public model endpoint.

Development use of GPT/Claude does not authorise runtime transmission of customer data. Use synthetic fixtures for development and externally assisted demonstrations. Do not paste customer records, evidence, incident payloads, credentials or identifiable “redacted” excerpts into external coding chats.

## ORVIA INTELLIGENCE — PURPOSE-BUILT ASSISTANCE

**Product Version 2 decision, on hold for Version 1:** build a dedicated ORVIA model family, provisionally called **ORVIA Intelligence**, for ORVIA/DPDP knowledge assistance, installation guidance, safe troubleshooting, explaining actual local records, drafting reviewed policy/workflow changes and generating scoped tests. Preserve every existing AI module in §§66–73. This is not a general-purpose public chatbot, legal decision-maker or autonomous system administrator.

**Interpretation of “not using existing models”:** train the model's learned weights from random initialisation using the approved corpus. Do not use an existing third-party pretrained checkpoint, adapter, teacher-model distillation output or hosted foundation-model API as the product's underlying intelligence. A branded prompt around another model or a fine-tuned third-party model would be a different design and must not be presented as this from-scratch model.

This does not require inventing a new neural-network algorithm or rewriting training frameworks. Approved open-source training/inference libraries and published architecture implementations can be used under reviewed licences. Own training data preparation, tokenizer training/configuration, architecture configuration, weights, evaluation and release provenance. All learned subcomponents—including an embedding/reranking model, where used—must meet the same origin rule; deterministic keyword/full-text retrieval needs no pretrained model.

### Training location and runtime location

```text
APPROVED NON-CUSTOMER MATERIAL
  Public/licensed DPDP sources + ORVIA documentation + synthetic fixtures
                    |
          Vendor-controlled preparation and review
                    |
          Authorised Lightning AI training workspace
          (ORVIA training only; no customer access/credentials)
                    |
          Candidate ORVIA weights + evaluations
                    |
          Vendor review, security checks and release signing
                    |
          ORVIA WEBSITE / VENDOR DISTRIBUTION CLOUD
                    |
          Customer-approved download and local verification
                    |
          CUSTOMER-LOCAL ORVIA INTELLIGENCE
          + versioned local knowledge pack
          + permission-filtered customer-local context
                    |
          Explanation / draft / bounded diagnostic suggestion
```

There is **no runtime request path from customer ORVIA to Lightning or a vendor inference API**, and no return path for customer prompts, outputs, feedback, gradients or operational records into training. Customer-held local context may support an answer without becoming training data.

In Product Version 2, use the local model assistant before routine vendor escalation where useful, but provide a direct support route and deterministic runbooks at all times. AI failure, uncertainty or unavailability must never block critical reporting, rights handling or a legitimate request for human support.

## VERSION 1 GUIDED ASSISTANCE — RULES, NOT A TRAINED MODEL

**Permitted small intelligence layer:** locally evaluated, reviewed rules, decision trees, templates, catalogues and keyword/full-text retrieval. It must not load learned weights, call a model API, generate embeddings with a learned model, train from user activity or require GPU infrastructure. This is **Guided Assistance**, not ORVIA Intelligence/custom AI or a general-purpose chatbot.

| Capability | Version 1 method | Required boundary |
|---|---|---|
| Explain an observed failure | Exact typed reason/error-code match to a versioned explanation and runbook | Explain recorded facts; never invent a root cause or external effect |
| Find product guidance | Customer-local keyword/full-text search in reviewed, versioned documentation | Show source section/version; permission-filter restricted content before results/snippets |
| Check configuration | Explicit schemas and approved rules for missing fields, unsupported actions or incompatible settings | A finding is a configured technical check, not a new legal requirement |
| Suggest a next step | Deterministic decision tree using known state and connector capability | Suggestions are read-only; execution uses existing permissions, scope, approvals and verification |
| Prepare policy/workflow/test drafts | Select reviewed templates and fill validated fields through forms | Label as template-based drafts, not natural-language AI generation; human review remains |
| Summarise local activity | Fixed templates over authorised structured events and explicit counts | Show scope/time/source and unknowns; do not fabricate causation or a compliance score |
| Prepare vendor escalation | Existing fixed-schema local exporter and a checklist | No free-form automatic upload, production logs or runtime record IDs; §31 still governs |

**Smallest useful implementation:** error explanations, runbook links and configuration checklists. Add the other rows only when tested and not displacing core delivery. This assistance is optional and is not a Version 1 release blocker when omitted. Documentation, clear errors, manual administration and direct human support remain required even without the enhanced helper.

A local guidance result should identify the rule/template ID and version, app/knowledge version, permitted supporting record references, observation time, match status, suggested step and approval requirement. Use explicit statuses such as `MATCHED_RULE`, `NO_MATCH`, `INSUFFICIENT_CONTEXT` and `REVIEW_REQUIRED`; do not display invented model confidence. A rule match is not proof of legal compliance or a verified incident cause.

Example using synthetic states: “The connector reported `AUTH_FAILURE`. Review the credential/permission runbook. The downstream privacy action remains unresolved until execution and verification establish its outcome.” Unknown or stale evidence must remain unknown or stale.

Rule, runbook and template packs are reviewed, versioned and distributed through signed ORVIA releases. Customer configuration stays local. Treat document text and external connector strings as data, not executable instructions. Pack changes cannot add arbitrary SQL/shell, extend permissions, enable outbound telemetry or alter legal interpretations without the appropriate review.

No natural-language-to-action generation, hosted LLM fallback, local third-party small model, trained classifier, hidden embedding model, automatic model downloads or chat-history learning is part of Version 1. Name the actual mechanism in the UI and documentation. Deterministic automation already present in the policy, workflow, discovery, notification and test engines stays in Version 1; “AI on hold” does not mean “automation removed.”

## VERSION 2 HANDOFF WITHOUT REBUILDING VERSION 1

Reserve stable typed assistance requests/results and existing permission-scoped read APIs. A Version 1 provider kind can be `RULE_BASED`; `ORVIA_MODEL` is a future capability, not an installed dormant provider. Keep advice separate from action authority in both versions. The Version 2 adapter may use the same reviewed knowledge packs and output contract after its own evaluation, but cannot replace the deterministic policy engine, change accepted consent history or broaden vendor access.

Training code, datasets, experiments, GPU allocation and model integration are not Version 1 tasks. Preserve their specification in §§64–65, 112–113 and 205. Restart that work under a future Version 2 plan with explicit ownership, budget, corpus review and release gates—not merely because the deadline pressure has passed.

---

<a id="orvia-section-64"></a>

# 64. AI MODEL ABSTRACTION

**Product Version 2 — preserved future custom-model specification.** The complete training, model-routing, inference and release lifecycle below is on hold for Version 1. No step here is a Version 1 prerequisite or authorisation to start a training/GPU job. Version 1 uses only §63’s optional rules-based assistance.

Do not hard-code ORVIA to one model version or inference engine. In Product Version 2, the gateway serves approved ORVIA-owned model releases only; third-party pretrained models and hosted-model services are not active providers.

Create:

```text
CUSTOMER-LOCAL AI GATEWAY
   │
   ├── ORVIA Intelligence — approved local CPU profile
   ├── ORVIA Intelligence — approved local GPU profile
   └── Deterministic knowledge/runbook fallback (not an LLM)

```

The AI gateway should provide:

- request routing
- model selection
- token limits
- safety filters
- logging
- redaction
- prompt templates
- structured output validation
- retry handling

## AI COPILOT: USEFUL, CONSTRAINED AND EVALUATED

Separate customer context from model configuration. Support approved ORVIA model/version routing, data minimization, local prompt logging controls, retention restrictions and customer-local inference. No product inference is routed to an external provider. Vendor model-development infrastructure needs its own approved access, retention and contractual review; do not infer those assurances from a provider name. Customer records must not be used to train ORVIA models under this product model.

## MODEL ROUTING BY DEPLOYMENT PROFILE

Keep the model/runtime abstraction, but accept only released ORVIA-owned weights and approved customer-local inference engines. Disable external/public providers, automatic pretrained-weight downloads and external embedding services. A private endpoint to somebody else's model service is not the requested ORVIA-owned customer-local model.

The former Provider A/Provider B and externally approved model alternatives are historical design options, preserved in the revision audit rather than enabled under the current requirement. Reintroducing third-party learned weights or remote inference requires a separate explicit product decision; it cannot happen through a support override, configuration default or licensing upgrade.

## MODEL ENGINEERING AND TRAINING LIFECYCLE

All items below are retained Product Version 2 design/work items, not Version 1 tasks or evidence of completed training. Training compute is separately authorised and budgeted; this document does not start jobs or commit spending.

### A. Corpus and source governance

| Corpus class | Permitted purpose | Required control |
|---|---|---|
| Authoritative published DPDP instruments and official guidance | Domain knowledge, terminology and source-grounded exercises | Record issuer, source location, publication/effective dates, version, retrieval date, reuse review and counsel-reviewed interpretation separately |
| ORVIA-authored product documentation, schemas and runbooks | Teach product behaviour, error taxonomy, support guidance and valid output structure | Match a released app version; exclude secrets, customer examples and unreleased unsafe workarounds |
| ORVIA-authored synthetic scenarios | Diagnostic reasoning, permissions, failure handling, uncertainty and support escalation exercises | Generate from fictional fixtures and executable test cases; validate outcomes; no copied/masked customer incidents |
| Approved open/licensed technical or language material | Any language/technical competence needed beyond the narrow domain documents | Explicit inclusion decision, source/rights/provenance review, personal-data screening, deduplication and documented scope |
| Customer information and customer-derived material | **Not permitted for training** | Exclude customer records/configurations, conversations, tickets, logs, exports, embeddings, feedback, gradients and “anonymised” operational derivatives |

“On the internet” is not the corpus admission rule. Require documented authority to reuse material for this purpose; reject uncertain or contaminated sources pending review. Do not scrape indiscriminately. Public source text may still contain unrelated personal information or malicious instructions; filter and review it rather than assuming public means safe.

Maintain a corpus manifest with source ID/digest, approved use, language, topic, version/date, source licence/permission, transformation history, reviewer, dataset split, excluded material and deletion/correction procedure. Dataset-card practices can document source context, licence, language and limitations [U10]; a completed card is not a legal clearance or proof of data quality.

Keep authoritative legal text, reviewer interpretation, technical product rules and model-training examples labelled separately. Do not turn a forum answer into an official legal rule. This revision does not update or certify the historical legal baseline in §§165–167 and 218.

### B. Prove the from-scratch lineage

Use an ORVIA-owned tokenizer trained on the approved corpus, an explicit architecture/configuration and random initial weights. Reusing a training architecture implementation is different from importing its learned weights. Pin framework/code versions and licences. Record seed, initialisation, corpus/tokenizer digests and all input artifacts. Initial third-party checkpoint and adapter paths must be empty; permitted resume checkpoints must trace back to ORVIA's own approved run.

Lightning's LitGPT documentation distinguishes from-scratch pretraining from continued pretraining using an initial checkpoint [U6]. Inspect each chosen template and pinned script: a tutorial named “pretrain” is not sufficient evidence that it does not load pretrained weights. Do not copy an example with an external initial checkpoint and call it original ORVIA training.

Use ordinary deterministic search initially where practical. Do not hide a third-party embedding, moderation or reranking model behind the claim that the language model is custom. A future ORVIA-trained auxiliary component needs its own provenance/evaluation and must not use customer data.

### C. Run controlled training experiments on Lightning AI

Use an authorised ORVIA team workspace for corpus preparation, training, evaluation and candidate artifacts. Lightning provides GPU workspaces and multi-node training mechanisms [U7]. Availability of GPUs does not establish data sufficiency, answer quality, budget adequacy or a completion date.

Prepare code and datasets before allocating expensive compute; start with a small bounded experiment, measure data loading, tokens/second, GPU memory, training stability and held-out performance, then approve a larger run if justified. Choose parameter count, context length, language coverage, token budget and GPU topology from those measurements—not from a marketing target.

Private workspace/repository access, approved storage and network settings, credential scope, artifact visibility, retention and provider terms must be checked for the actual Lightning account/project. Disable public sharing, unapproved copilots/log sinks and unnecessary service integrations. No customer credentials or customer-cloud mounts are present. Training-project credentials must not grant customer runtime access or product-release signing authority.

Lightning's documented user/teamspace secrets can be made available across multiple studios [U8]. Use a dedicated appropriately scoped training teamspace and least-privilege credentials; do not place broad commercial or release-signing secrets in it. Apply security controls to snapshots, caches, checkpoints, experiment trackers and multi-node replicas, not only the primary dataset directory.

Checkpoint/restart own runs reproducibly. Track actual compute/storage/transfer consumption, failures and cleanup. Publish costs only after measurement; do not claim the earlier coding subscriptions cover this GPU work or that a fixed small number of GPU hours guarantees a useful model.

### D. Build competence, then domain behaviour

The user-facing scope remains ORVIA and DPDP assistance. A narrow corpus of legal text and product manuals may support terminology but does not establish robust general language understanding or troubleshooting competence. Treat corpus sufficiency as an experiment to evaluate, not an automatic consequence of training.

Plan from-scratch language pretraining on the approved scope, domain learning, and supervised instruction tuning of **ORVIA's own resulting checkpoint** using human-reviewed synthetic tasks. Instruction tuning an ORVIA-owned base is permitted; fine-tuning an existing third-party foundation model is not the selected architecture. Include supported languages, out-of-scope questions, insufficient-evidence responses, failed diagnostic steps and correct escalation examples.

Maintain a deterministic search/runbook baseline. A trained candidate must improve useful task performance without weakening permission, privacy or safety gates. If it does not meet release thresholds, keep it a research candidate and expose the baseline honestly; do not quietly switch to an existing model or mark untrained generation as working.

### E. Ground answers in versioned local knowledge

Ship a reviewed knowledge pack for product versions, connector capabilities, error codes, runbooks and legal source references. Use permission-filtered local retrieval and deterministic source validation around the model. Start with full-text/keyword retrieval where sufficient; add only evaluated ORVIA-owned learned retrieval components.

Do not rely on weights as the legal database. Store source provision, publication/effective date, applicability, review status, app version and pack version with retrieved context. Law/product updates can be distributed as independently signed knowledge packs without pretending an old checkpoint has memorised the latest material. Unsupported, stale, conflicting or insufficient sources trigger qualification or escalation; retrieval does not guarantee a correct answer.

For a local operational question, retrieve only the authorised minimal records needed for that answer. Keep shared public documentation separate from each organisation/subtenant's restricted indexes, session state and local evidence. Never put private content in the shared pack.

### F. Evaluate before release

Create independent train/validation/test splits grouped by source, document version and scenario family; avoid near-duplicate leakage. Freeze human-reviewed test sets separately from the training pipeline. Evaluate factual/source correctness, correct citation and date handling, structured-output validity, appropriate abstention, supported-language quality, diagnostic usefulness, wrong-fix risk, tenant isolation, prompt injection, secret/PII disclosure, tool misuse and runtime resource limits.

Test failure and adversarial cases, not only FAQs. Compare pre/post-domain training and any quantised runtime artifacts with the deterministic baseline. Every claimed language, model size, hardware profile and function needs its own recorded evidence. Define release thresholds before looking at final test results; do not choose numbers afterward to make a run pass. No confirmed critical permission/egress/unsafe-action failure may be accepted merely for a higher average score.

### G. Package and maintain the model

A release contains the ORVIA weights in an approved non-executable tensor representation, tokenizer, architecture/inference configuration, local retrieval schemas, model card, corpus-provenance summary, evaluation report, dependency/SBOM information, app/knowledge compatibility and signed manifest. Do not ship training secrets, raw training dumps or an executable model-loader hook that downloads arbitrary code.

Pin and test the customer inference engine. Validate any conversion or quantisation against the original candidate. The customer imports the signed package from the ORVIA vendor distribution service; it must not download an alternate checkpoint from a model hub or contact Lightning at runtime.

Record model, tokenizer, knowledge-pack and safety-policy versions on local answers. Maintain a supported-version/advisory process. Model rollback must not roll back current consent, authorisation, safety controls or required legal knowledge. No online/federated learning, automatic gradient export, customer fine-tuning or prompt-feedback training is enabled under this requirement.

### H. Decisions that remain measurable, not invented

The final model architecture/size, corpus scale, GPU type/count, costs, runtime memory, supported languages and answer-quality thresholds require experiments and owner approval. This architecture preserves the Product Version 2 ownership/privacy route; it does not claim a trained model already exists or commit it to Version 1 or the prototype deadline. Keep all planned AI functions as DEFERRED_V2 while gating their later release by evidence.

---

<a id="orvia-section-65"></a>

# 65. AI DATA-MINIMISATION

**Release applicability:** the no-customer-data-training and minimisation rules remain binding in both versions. Model inference, model contexts and learned retrieval below are Product Version 2 only; Version 1 does not create those model stores. Version 1 rule/search/support records still obey the same local access, retention and no-vendor-export requirements.

Before AI processing:

```text
Raw information
 ↓
Redaction / minimisation
 ↓
Structured context
 ↓
AI

```

Do not send an entire production database to an LLM simply because a user asks a question.

## MINIMISATION DOES NOT AUTHORISE EXPORT

Redaction, masking, hashing and structured-context construction reduce exposure but do not permit customer operational data to leave the defined boundary. Apply minimisation before customer-local inference as well. Model caches, embeddings, prompt/output traces, evaluation data and error captures inherit the same local storage, access and retention controls.

## NO CUSTOMER-DATA TRAINING — INCLUDING LOCAL AND INDIRECT PATHS

A customer-local question may contain authorised local context for **inference only**. It must not become training/finetuning material even when it stays on the same server, because the current promise excludes customer-data training rather than merely forbidding upload. Disable learning from conversations, ratings, resolved tickets, model memory, retrieval logs and agent traces.

A local retrieval index or expiring conversation context is a customer-local information store, not a permitted vendor training dataset. Give it its own access, retention, deletion and backup policy. Do not merge it into distributed model weights, public packs or ORVIA's development corpus.

Training-data ingestion accepts only allowlisted vendor-controlled approved sources with provenance. A support attachment—even one described as scrubbed, encrypted or anonymous—is not eligible. Reproduce a defect independently using fictional fixtures; do not transform a production incident into training data by removing a name. No vendor support transcript, customer feedback, gradient or federated-learning update may cross into model development.

Keep model-development credentials and artifact namespaces disconnected from customer stores and commercial support databases. Corpus scans, human review, provenance checks and canary tests are layered controls, not a claim that a scanner alone can prove no personal information exists.

---

<a id="orvia-section-66"></a>

# 66. AI PRIVACY COPILOT

**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.

Capabilities:

- Explain privacy controls
- Search policies
- Summarise failures
- Explain workflows
- Explain evidence
- Answer "why" questions
- Generate operational summaries

Example:

> Why did marketing withdrawal fail?

AI retrieves:

- workflow event
- connector response
- policy version
- retry history

Then produces an explanation.

## AI COPILOT: USEFUL, CONSTRAINED AND EVALUATED

**Proposal:** Preserve every original AI capability, with staged privilege. Begin with permission-filtered search, explanation and draft generation. Later add typed action-plan proposals that the deterministic service validates and a human authorizes.

Retrieval must be tenant- and role-filtered before information reaches the model. A model prompt is not the authorization layer. Retrieved documents, connector responses and emails are untrusted content, not instructions to expand permissions. Outputs include record citations, source freshness, uncertainty and missing evidence.

**Acceptance:** Copilot explains a failure using actual action records; it declines to manufacture missing evidence; the platform still executes consent, rights and enforcement workflows when AI is disabled.

## LOCAL FIRST-LINE ORVIA ASSISTANCE

The assistant should answer how ORVIA works, explain an authorised local failure, find the applicable supported runbook, suggest a bounded next step, and help prepare a privacy-safe escalation. Keep the answer within ORVIA/product/DPDP scope; unsupported legal conclusions go to the designated reviewer rather than a fabricated definitive answer.

Default troubleshooting is read-only. A useful answer shows: observed facts; cited local records/documentation; model/knowledge/app version; what remains uncertain; suggested steps; required permissions/approval; and how to verify success. **Observed cause**, **likely explanation** and **unconfirmed possibility** must not be interchangeable labels. Do not display invented confidence percentages.

Typical sequence: local connector reports an error → assistant reads authorised status and the matching runbook → customer sees a proposed diagnostic → deterministic service validates capability/scope → authorised customer executes → a real check confirms the result or the case remains unresolved. A model-generated explanation is not a repair or proof that a control works.

The user can bypass AI and contact support using the approved route. The assistant cannot close a critical incident, alter deadlines, hide unresolved privacy work or send any support payload on its own.

---

<a id="orvia-section-67"></a>

# 67. AI DISCOVERY

**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.

The AI can suggest:

```text
Field:
customer_phone

Potential category:
Contact Information

Potential purposes:
Order Notifications
Marketing

Confidence:
0.87

Review:
Required

```

AI suggestions must not automatically become approved policy.

---

<a id="orvia-section-68"></a>

# 68. AI POLICY BUILDER

**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.

User provides:

> We use phone number for delivery updates and promotional messages.

AI produces:

```text
Purpose 1:
Delivery Updates

Purpose 2:
Promotional Marketing

Data:
Phone Number

Systems:
Order system
CRM
Marketing platform

```

Administrator reviews and publishes.

---

<a id="orvia-section-69"></a>

# 69. AI WORKFLOW BUILDER

**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.

User describes desired behaviour.

AI generates a workflow graph.

Example:

```text
Withdrawal
 ↓
Find purpose
 ↓
Find systems
 ↓
Block marketing
 ↓
Remove audience
 ↓
Notify processor
 ↓
Verify
 ↓
Evidence

```

The user must approve before activation.

---

<a id="orvia-section-70"></a>

# 70. AI FAILURE ANALYSIS

**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.

Input:

```text
Processor = FAILED
Timeout × 3

```

AI:

> Processor endpoint failed after three retries. Internal controls completed successfully; processor confirmation remains unresolved.

It should link to:

- action
- connector
- error
- logs
- workflow

## EXAMPLE: TROUBLESHOOTING WITHOUT DISCLOSING CUSTOMER RECORDS

A customer-local connector fails. The local assistant may inspect an authorised connector status, bounded error and relevant runbook; it must not infer that a specific credential or record is faulty without supporting evidence. It suggests a permission check and explains the expected result. Customer-held credentials remain in the connector/secret service, not the model context.

If the issue persists, a customer Support Administrator prepares a report containing the permitted product version, connector package version, enumerated error category and completed public-runbook steps. Local workflow IDs, tenant-member names, connection strings, database/table names and AI conversation text stay local. The vendor Support Admin receives the approved case, reproduces it synthetically, and supplies a signed fix or reviewed instructions. The customer authorises application and independently checks the result.

A vendor case can be resolved while a local privacy action remains unverified; the two states must not be conflated.

---

<a id="orvia-section-71"></a>

# 71. AI DRIFT ANALYSIS

**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.

Detect:

```text
New API destination

```

AI may say:

> This destination is not currently associated with an approved purpose.

The system then generates:

```text
Review required

```

AI should not silently create a new legal purpose.

---

<a id="orvia-section-72"></a>

# 72. AI INCIDENT ANALYSIS

**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.

AI can generate:

- incident summary
- executive explanation
- timeline summary
- affected-system summary
- action summary
- evidence summary

The factual inputs must originate from ORVIA's structured records.

---

<a id="orvia-section-73"></a>

# 73. AI TEST GENERATION

**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.

AI can inspect:

- purpose
- policy
- integrations
- existing controls

and suggest:

```text
Test 1
Test 2
Test 3
...

```

The deterministic test engine executes them.

---

<a id="orvia-section-74"></a>

# 74. AI SAFETY RULES

**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.

AI must never autonomously:

- publish a legal policy;
- declare legal compliance;
- approve deletion based solely on language interpretation;
- send regulatory declarations;
- alter production controls without authorisation;
- expose another tenant's data;
- bypass RBAC;
- retrieve secrets;
- execute unrestricted SQL;
- fabricate evidence.

## CUSTOM TRAINING DOES NOT REMOVE AI SAFETY BOUNDARIES

ORVIA-owned weights are not a security boundary by themselves. Enforce permissions, scope checks, output validation and approved action execution outside the model. Prompt injection and excessive agency remain threat classes even for a local specialised assistant [U9].

The AI must not train on customer context, grant roles, extend a support permission, export diagnostics, fetch outside model weights, disable auditing, weaken network restrictions, execute a free-form repair script or approve its own suggestion. Destructive or security-sensitive changes continue to require the deterministic plan/approval/verification workflow.

Use a task-scope router and grounded answer contract to keep user-facing assistance product-specific. Being trained on a domain does not prove every generated statement remains inside the domain. Out-of-scope or insufficiently supported requests receive an explicit limitation and relevant escalation, not an ungrounded answer.

---

<a id="orvia-section-75"></a>

# 75. NOTIFICATION ENGINE

Support:

- Email
- In-app notifications
- Webhooks
- Slack/Teams later
- SMS/other channels later if needed

Notification events include:

```text
Request received
Approval required
Workflow failed
Processor pending
Policy changed
Test failed
Incident created
License expiring
Connector offline

```

## CUSTOMER-CONTROLLED NOTIFICATION DELIVERY

Operational messages originate from the customer deployment and use its authorised portal, relay or integration. ORVIA’s vendor billing mailer must not receive Data Principal addresses, request details or incident content. External messaging/SaaS delivery requires the explicit boundary treatment in §31; strict mode does not silently substitute an external vendor service when a local relay fails. Licence and renewal messages use the separately supplied business contact only.

## LOCAL ALERTS AND VENDOR SUPPORT SIGNALS

Send operational failures first to authorised customer roles through customer-approved channels. Critical safety/security conditions must not wait for an AI conversation before local alerting and escalation.

Vendor support receives a report only through §95's deliberately approved diagnostic path. An optional customer-approved automatic notification uses the same bounded schema and local validation, never raw operational notifications, personal identifiers or a hidden telemetry feed. External customer messaging remains subject to §31's destination rules.

---

<a id="orvia-section-76"></a>

# 76. LICENSING AND ENTITLEMENTS

Commercial editions:

```text
ORVIA FOUNDATION
ORVIA CONTROL
ORVIA ENTERPRISE

```

The license service manages:

```text
Edition
Modules
Connector limits
User limits
Environment limits
Support level
Expiry
Deployment rights

```

## LICENCED FULL-PRODUCT DISTRIBUTION

A successful purchase grants the defined download/deployment rights for the full licensed runtime, not merely a connector linked to a mandatory vendor-hosted workspace. The purchase portal must clearly state the edition, supported deployment package, permitted installations/environments, support period, update rights and expiry/continuity terms before checkout. Enforce entitlements locally without counting or inspecting end-customer records for vendor billing.

## PRODUCT VERSION DOES NOT EQUAL COMMERCIAL EDITION

Foundation, Control and Enterprise continue within the Version 1 product architecture. Custom AI is Product Version 2 future scope in every edition; it is not a hidden Version 1 premium unlock. Licence issuance, renewal, expiry continuity and ordinary support must work without any model or AI subscription. Future AI entitlements require a supported released capability and separate customer activation, not merely a more privileged role.

---

<a id="orvia-section-77"></a>

# 77. FEATURE FLAGS VS ENTITLEMENTS

Do not implement commercial tiers by deleting code from different builds.

Use entitlement checks:

```text
feature_enabled(
    organisation,
    "privacy_regression_testing"
)

```

This allows:

- upgrades
- downgrades
- trials
- temporary licences
- enterprise modules

without separate codebases.

## RELEASE AVAILABILITY PRECEDES ENTITLEMENT

A capability is usable only when it is implemented and supported in the installed product release, enabled by a controlled rollout, permitted by the licence where applicable, and authorised for the actor. Version 2 AI is unavailable in Version 1 regardless of feature flags, paid edition or Vendor/Organisation Super Admin status. A flag cannot activate code, model artifacts or a service that the Version 1 package must not ship. This is release separation, not a separate edition-specific codebase.

---

<a id="orvia-section-78"></a>

# 78. ORVIA FOUNDATION

Features:

- Privacy Control Graph
- Purpose management
- Privacy notices
- Consent
- Data Principal portal
- Rights workflows
- Retention
- Deletion workflow
- Basic evidence
- Failure center
- Basic connectors
- Basic reporting
- Website/cloud distribution of the customer-hosted licensed product
- Secure customer connector

Position:

> **Manage privacy operations.**

## PRESERVATION AND AMENDMENT REGISTER

Every edition reports evidence honestly. Advanced verification automation remains premium; truthful minimum outcome handling is universal.

---

<a id="orvia-section-79"></a>

# 79. ORVIA CONTROL

Foundation plus:

- Advanced Policy Engine
- Runtime controls
- Allow
- Restrict
- Mask
- Block
- Consent propagation
- Advanced processor workflows
- Verification
- Advanced evidence
- Privacy Firewall
- Privacy Regression Testing
- Synthetic test framework
- CI/CD integration
- Drift detection
- Advanced connector capabilities

Position:

> **Execute and enforce privacy controls.**

---

<a id="orvia-section-80"></a>

# 80. ORVIA ENTERPRISE

Control plus:

- Enterprise identity
- Advanced customer-controlled cloud deployment and fleet management
- High availability
- Advanced security
- Advanced incident response
- Privacy Incident Explorer
- Advanced testing
- Restricted processing
- Children-focused policy pack
- Advanced retention/destruction
- Advanced local/private AI management and deployment (Product Version 2 — deferred; not required for Version 1 Enterprise)
- Restricted network
- Air-gapped deployment capability where engineered and supported
- Advanced connectors
- Enterprise SDKs
- Premium support

Position:

> **Engineer and continuously operate privacy controls at enterprise scale.**

## PRESERVATION AND AMENDMENT REGISTER

Implement nomination and guardian lifecycles explicitly. Baseline safeguards for applicable processing cannot depend on an advanced pack.

---

<a id="orvia-section-81"></a>

# 81. ONE CODEBASE, THREE EDITIONS

All editions must use the same:

```text
Core domain model
Graph
Policy engine
Workflow engine
Connector framework
Evidence engine
Test engine
Security model
Cloud infrastructure

```

Commercial editions should simply enable different capabilities.

## THREE EDITIONS WITH A UNIVERSAL SAFETY FLOOR

**Proposal:** Preserve every original edition feature and add a shared minimum safety floor: tenant isolation, secure authentication, auditability, honest outcome states, safe identity handling, relevant legal applicability, essential rights intake, child/guardian safeguards where processing is supported, baseline incident tracking and usable export/offboarding.

| Edition | Retained promise | Proposed expansion |
|---|---|---|
| Foundation | Manage privacy operations | Guided applicability, full request/nomination intake, reviewable consent provenance, processor tasks, basic claim validation and one starter control package |
| Control | Execute and enforce privacy controls | Revocation freshness, automated reconciliation, control-as-code, change simulation, broader verification and repeatable regression packages |
| Enterprise | Engineer and continuously operate at scale | Group governance, advanced SDF workflows, deployment/resilience options, advanced guardian integrations, private AI (Product Version 2) and large-scale assurance |

Premium features can automate, scale, integrate and harden operations. They cannot make an unverified action appear verified in a lower edition. A tenant whose use case cannot be safely supported must be told the limitation—not silently operate without an applicable safeguard.

**Acceptance:** Downgrading cannot make marketing ALLOW because the enforcement module entitlement changed; outstanding work has an explicit owner and transition state.

## NO PRIVACY OR ESSENTIAL-SECURITY PAYWALL

For every edition sold as `CUSTOMER_LOCAL`, personal data stays local; essential authentication, authorisation, encrypted transport, secure updates, auditability and vulnerability fixes for supported releases are part of the baseline. Larger scale, advanced SSO/federation management, high availability, automated fleet administration and additional AI/integration capacity can remain differentiated. An edition without a suitable local model must disable operational AI rather than export data to make a feature appear available.

## EDITIONS, DEPLOYMENT PROFILES AND ROLES ARE INDEPENDENT DIMENSIONS

Foundation, Control and Enterprise remain the editions. Standard Server, Kubernetes, Offline and Evaluation are deployment profiles of the same product. Vendor and customer role scopes are security boundaries, not commercial tiers. A paid support plan does not grant vendor access to production customer information.

In Product Version 2, the ORVIA-owned model and model-management capacity can be packaged according to published entitlements and supported hardware. No edition may replace unavailable local AI with a third-party or vendor-hosted model to make the feature appear present. Essential privacy/security restrictions apply even when an advanced capability is not licensed.

## VERSION 1 EDITIONS REMAIN COMPLETE WITHOUT A MODEL

The complete licensed Version 1 runtime is the supported non-model product for its edition and deployment profile. All Version 1 editions omit custom AI; none may substitute a third-party model. The optional Guided Assistance is not a prerequisite to privacy enforcement or safety. Existing non-AI edition differentiation and rollout gates remain unchanged.

---

<a id="orvia-section-82"></a>

# 82. WEBSITE

ORVIA website must provide:

```text
Product
Solutions
Features
Editions
Pricing
Documentation
Demo
Readiness Scanner
Security
Deployment
Support
Login

```

## USER EXPERIENCE, ACCESSIBILITY AND TRUST

A public trust/security page should describe actual architecture, subprocessors, data handling, support access and tested controls. Certifications, uptime numbers, no-training claims and residency promises must match actual scope. The readiness scanner produces prioritized gaps and clearly labeled assumptions, not a legal certificate.

## PURCHASE, DOWNLOADS AND SECURITY CENTRE

Provide an authenticated customer purchase/download area with the purchased edition, invoices, signed licence, supported deployment packages, exact versions/digests, verification instructions, release/security notes and renewal controls. Publish a security/trust centre with the actual data-flow boundary, minimum vendor-data inventory, vulnerability-reporting route, supported-version policy and evidence-backed assessment scope. Do not publish certification badges or “zero vulnerability” claims without support (§168).

## CUSTOMER ACCOUNT EXPERIENCE ON THE VENDOR WEBSITE

Use the heading **“Account, licences and downloads”**, not “Privacy Operations Dashboard.”

| Page | What the page should show or permit | What must not appear there |
|---|---|---|
| Account overview | Purchased edition, licence validity, purchased deployment rights, renewal prompts, latest eligible release | Live privacy-request totals, control scores or customer system health |
| Licences | Signed licence download, validity, entitlements, renewal/reissue workflow, minimal random installation binding if needed | Principal directories, discovered users, customer-record counts or runtime secrets |
| Downloads | Supported package/profile, platform, version, digest, signature verification, prerequisites and documentation | A claim that downloading means successfully installed |
| Billing | Orders, invoices, payment references, necessary billing/tax information | Client transactions or personal-data inventory |
| Commercial members | Purchaser, billing, licence/download and support permissions | The operational user directory or automatic runtime access |
| Updates and security | Release notes, compatibility, vendor service status, security advisories, supported releases and assessment scope | Unobserved claims about customer patch level or runtime health |
| Support | Business tickets and optional validated diagnostics under the minimum-data contract | Production evidence, customer screenshots, identifiers, logs or arbitrary attachments |
| Guides and trust | Install/update/recovery documentation, published data inventory, security disclosures | Compliance guarantees or certifications not actually obtained |

[M1 §§31, 82, 93–96, 159, 163–168]

### Status wording

A licence being issued is not proof that software is running. A downloaded release is not proof that it was installed. Recommended labels are **“Licence issued,” “Package downloaded,” “Customer-declared version”** and **“Runtime status not collected.”** If an allowed diagnostic was voluntarily supplied, show its timestamp and limited scope; do not turn it into a live monitoring promise.

Avoid an “Open your workspace” feature that requires vendor-side storage, discovery or proxying of private infrastructure. The default is a customer-managed bookmark. A future convenience link must be separately reviewed for data collection and navigation safety; it must not transfer vendor tokens, grant access or probe private destinations.

### Download selector

Ask **where the product will be installed**, not merely which operating system the downloading browser reports.

The proposed choices are: Server/VM; Kubernetes; offline transfer; local evaluation. Then select a supported target architecture and release. A purchaser on Windows may correctly need a Linux server bundle. Do not request cloud access keys, network maps or customer database credentials in this wizard.

## OFFICIAL ORVIA DISTRIBUTION AND SEPARATE VENDOR-STAFF CONSOLE

**Yes: ORVIA remains provided by the vendor's website and vendor-controlled distribution cloud.** The vendor publishes and signs the complete software, licences, connector/model/knowledge packages, verification instructions and updates. A vendor-managed object store, CDN or registry may deliver approved artifacts; it does not receive operational customer data. Customer private-registry mirrors and offline transfers preserve approved signatures/digests and do not change publisher identity.

Use a primary **Download ORVIA** action offering the canonical ZIP envelope defined in §85. The selected profile/architecture determines its contents; the operating system of the purchaser's browser does not choose the installation host silently. A model-training checkpoint URL at Lightning is not the official customer product download.

Add a separate **Vendor Administration and Support Console** for Vendor Super Admin/Admin staff. It manages commercial accounts, assigned support cases, approved diagnostic receipts, known product defects, advisories and release/knowledge governance. Its customer card may show purchased rights and allowed support context—not client records, runtime members, live operational counts or an unobserved “healthy” status. See §96 for its permissions and case lifecycle.

## VERSION 1 DOWNLOAD AND ACCOUNT WORDING

The official source remains ORVIA’s vendor website/distribution cloud. Version 1 downloads contain the non-model platform, supported connectors and reviewed rule/runbook/documentation packs; no ORVIA model is required, bundled or advertised as available. Retain custom AI only as clearly labelled Product Version 2 roadmap content. Downloads, licence renewal and vendor staff support work without an assistant. Do not show a model download button, “AI enabled” badge or purchasable present-tense AI feature for Version 1.

---

<a id="orvia-section-83"></a>

# 83. WEBSITE-TO-CUSTOMER JOURNEY

```text
Website
  ↓
Explore
  ↓
Readiness Scanner / Demo
  ↓
Select Edition
  ↓
Purchase
  ↓
Vendor business account created
  ↓
Subscription/licence and deployment rights assigned
  ↓
Download signed full ORVIA deployment package and licence
  ↓
Verify package origin, signature and digest
  ↓
Install ORVIA in the customer organisation / customer-controlled cloud
  ↓
Configure customer identity, local storage, keys and outbound restrictions
  ↓
Install or enable local connectors
  ↓
Connect customer systems using local credentials
  ↓
Configure policies and test privacy/data-boundary controls
  ↓
Start customer-local operations

```

## EXAMPLE OF THE COMPLETE CUSTOMER JOURNEY

Consider the fictional Acme Example Ltd. It buys an ORVIA Control licence through the vendor website. Its IT team installs ORVIA on a Linux server in Acme's own cloud account or data centre. IT configures customer DNS, certificates, identity, storage, keys, network access and permitted connectors.

A privacy officer using Windows, an engineer using macOS and an auditor using Linux all open the same workspace address. They see the same design, but their permitted actions differ. Runtime records are fetched from the customer-hosted API, not the vendor's account website. If the workspace is private, users need the customer's approved network/VPN/private-access path.

The company shares the workspace address through its own intranet, application launcher or bookmarks. It does not need to register internal hostnames with ORVIA. Acme publishes the separate privacy-portal address to its own clients.

If an employee closes their browser, the server's accepted workflows continue. If the deployment host is stopped, browser availability does not keep the backend operating. This is why a personal laptop is a demonstration environment, not the recommended always-on organisation server.

---

<a id="orvia-section-84"></a>

# 84. CUSTOMER ONBOARDING WIZARD

After first login:

```text
1. Organisation
2. Industry
3. Admins
4. Deployment
5. Connector installation
6. System discovery
7. Purpose mapping
8. Policy configuration
9. Notice setup
10. Consent configuration
11. First privacy workflow
12. Test
13. Go live

```

The user must always know their current onboarding stage.

## USER EXPERIENCE, ACCESSIBILITY AND TRUST

Add onboarding prerequisites: permission inventory, network routes, legal entity, purpose owner and test environment. The wizard must distinguish “connected” from “safe to mutate.” Begin in Observe mode, then dry-run, reversible enforcement, and approved destructive operations.

## CUSTOMER-LOCAL ONBOARDING GATES

Before go-live, display and verify the runtime location, customer-controlled identity/keys, local storage/backup targets, allowed egress, disabled vendor telemetry, licence validity and complete package signature verification. Show the precise vendor-data inventory and any optional diagnostic selection. Run a synthetic boundary test before enabling real personal-data processing. Reject a configuration requiring a vendor endpoint to receive operational content.

## SEPARATE COMMERCIAL, INSTALLATION AND DAILY-USE STAGES

**Commercial step:** buy an edition; assign commercial contacts; download the appropriate signed release, licence and guide.

**Local IT step:** verify release trust; prepare the supported runtime; configure customer domains/TLS, durable storage, backups and keys; import the licence; create a unique local administrator; configure customer authentication and roles; enforce permitted egress; run preflight and health checks.

**Privacy configuration step:** connect permitted systems with least-privilege customer-local credentials; review capabilities and identity matching; create purposes/notices/policies; run synthetic workflows and boundary tests; begin Observe/dry-run before approved enforcement.

**Everyday step:** authorised staff use their customer workspace address. Clients use the separate privacy portal. Both operate against customer-hosted services. Closing the vendor website does not stop these services.

A guided local wizard should show what is complete, what remains untested, which permissions are requested and which actions become possible after approval. Avoid one-command claims that conceal DNS, identity, key, storage or network prerequisites. [M1 §§83–86]

## CUSTOMER-LOCAL OWNER AND RELEASE-SCOPED ASSISTANCE SETUP

At the protected local bootstrap, create the Organisation Super Admin using customer-controlled authentication. Establish a customer-held recovery route; invite Admins and Members; delegate supported subtenants/environments; keep commercial contacts distinct from runtime users. Never seed a vendor master account or ship default passwords.

Version 1 may configure reviewed rule/runbook packs for Guided Assistance; it has no model/GPU/provider setup step. **Product Version 2 only:** offer an optional signed **ORVIA Intelligence** pack selection. Validate its signature, provenance, app compatibility and measured runtime prerequisites. Show local inference location, installed model/knowledge versions and disabled training/export. If no released supported model is available, show that limitation and continue with deterministic setup; never fetch an existing external model as a substitute.

The installation wizard is a setup flow, not a fourth customer-facing business portal. The vendor-staff support console is separate internal tooling. Normal users need only the customer workspace address and authorised browser access.

---

<a id="orvia-section-85"></a>

# 85. CONNECTOR INSTALLATION

The customer downloads:

```text
ORVIA full deployment package + signed licence
ORVIA Connector package (bundled or separately installed as needed)

```

The connector should support appropriate environments such as:

- Linux service
- container
- enterprise-managed VM

Windows installer support can be considered where customer demand requires it, but it should not become the primary architecture.

The installer must:

- validate prerequisites;
- establish secure identity;
- register the installation;
- establish only explicitly allowed connectivity to the customer control plane and approved distribution/licence endpoints;
- run health checks;
- show connector status.

## SECURE FULL-PRODUCT INSTALLATION

Provide supported container/VM/service packages and deployment guides for the licensed profile. Include the console/API/portal, worker/orchestration, local stores, policy service, connectors and optional deterministic Guided Assistance for Version 1; in-boundary model components are reserved for Product Version 2 profiles. State resource and cloud-service prerequisites rather than implying an installer supports every infrastructure environment.

The installer must verify signed manifests and artifact digests against a trusted release identity before execution; use a bootstrap trust process not dependent solely on an unverified checksum from the same download page. Create unique local administrator/bootstrap credentials, validate network/storage permissions, separate public portal ingress from private administration, and disable sample accounts/debug endpoints. Never execute an unreviewed remote script as an installation shortcut. Local setup must not upload customer records, cloud credentials or runtime secrets to ORVIA.

## SUPPORTED DEPLOYMENT PACKAGES

### A. Standard Server bundle — recommended default

Primary customer download: `ORVIA-<version>-server-linux-<arch>.zip`. The earlier `.tar.gz` server archive remains a possible supported engineering distribution inside or alongside the main bundle; it is not a second product or the canonical customer download.

Provide signed Linux container images with a tested single-server deployment configuration, installation/preflight tooling, manifest, migration instructions, secrets/storage/network configuration, health checks, backup/recovery procedure and licence import.

Docker Compose is suitable for defining a multi-container application and supports production-oriented single-server deployments. Compose by itself is not high availability. A production profile still needs appropriate durable databases/workflow infrastructure, TLS, resource limits, backups, restarts, monitoring and patching. Do not ship a development workflow server as production infrastructure. [T6, T7]

### B. Kubernetes bundle

Primary customer download: `ORVIA-<version>-kubernetes-<arch>.zip`, containing the versioned `orvia-<version>.tgz` Helm chart, pinned image artifacts and deployment values. A chart may also be obtained separately from the ORVIA-managed distribution service for approved automated installations.

Helm charts package Kubernetes resources. A chart does not inherently contain the container images or establish that the resulting deployment is secure, highly available or compatible with every cluster. Include supported Kubernetes/runtime versions, storage/ingress/secret requirements, workload permissions, network policies, migrations and a tested recovery model. [T8]

### C. Complete offline bundle

Primary customer download: `ORVIA-<version>-offline-linux-<arch>.zip`. An all-supported-architecture ZIP can be offered when transfer size permits. Earlier `.tar.gz` offline examples remain subordinate engineering archive formats, not an alternative data-handling model.

Include the exact required images, chart/configuration, verifier, independently bootstrapped trust information, release manifest, licence import, legal/security notes and required connector/rule packages or an explicit prerequisite list; model packages are Product Version 2 only. An installer that silently pulls dependencies from public registries is not a complete offline installer.

Use a disconnected staging test. Verify install, restart, normal operation, licence renewal import, update, recovery and diagnostics export without hidden network calls. Specify trusted time and key-revocation/update handling for offline operation. Any external dependency must be disclosed rather than described as air-gapped.

### D. Evaluation bundle

Offer the same domain/application services with a synthetic-data profile and a local setup guide. Use an approved container runtime on supported Windows, Mac or Linux development systems. No cloud subscription or production records are needed to evaluate the layout and supported synthetic workflows.

Do not call the evaluation deployment production-ready. Default to local-only binding, disable production connectors, and explain that workflows stop when the host/runtime stops.

### E. Optional native helper and agent packages

Proposed later convenience packages may include signed Windows `.msi`, macOS `.pkg`, and supported Linux packages/archives. Distinguish an **installer/launcher**, a **connector agent** and the **full platform**. A native agent may be necessary for a specific supported local resource or authentication mechanism; it is not necessary on every employee's laptop.

A preconfigured Linux VM appliance can be an additional enterprise distribution format only after a particular hypervisor profile, boot identity, patching and recovery are supported. Do not add every VM format to the first release merely for a larger download page.

**Recommendation:** Make Standard Server the default choice, Kubernetes the existing-cluster choice, Offline the restricted-network choice and Evaluation the laptop choice. These are deployment profiles, not four separate products or editions. Keep the master’s Foundation/Control/Enterprise model unchanged.

## RELEASE-PACKAGE CONTENTS

Example only; not a directory of existing ORVIA build artifacts:

```text
orvia-release/
  README.md
  release-manifest.json
  signatures/
  sbom/
  licence-import-guide.md
  install/                 # reviewed, signed installation tooling
  deploy/compose/          # supported server profile
  deploy/helm/             # supported cluster profile, when included
  images/                  # actual required images for offline distribution
  migrations/
  connectors/
  knowledge/               # reviewed rules/runbooks/docs; no learned weights in V1
  orvia-models/            # Product V2 only; excluded from Version 1 artifacts
  docs/                    # install, upgrade, security, restore, limitations
```

Future Product Version 2 ORVIA-owned model packs have explicit entitlement, distribution and hardware requirements. Include the selected signed pack in the customer ZIP or offer it as a separately signed ORVIA vendor download; publish the supported model/runtime matrix. The deterministic platform must operate when local AI is disabled. Under the strict boundary, no automatic external-model fallback is allowed. [M1 §§63–65, 85, 93]

## CANONICAL ONE-FILE DELIVERY DECISION

Use **`ORVIA-<version>-<profile>-<architecture>.zip`** as the primary customer download envelope. A full all-supported-architecture bundle can use `ORVIA-<version>-bundle.zip`; profile-specific ZIPs avoid unnecessary transfer. The product is the same signed release, not a different build/codebase per customer.

This explicitly reconciles the earlier ZIP recommendation with later `.tar.gz` server/offline examples: **ZIP is the main customer-facing format; OCI/container archives, `.tar.gz` engineering exports, and Helm `.tgz` charts are internal or optional advanced deployment artifacts.** Preserve those useful deployment methods without presenting conflicting default file formats.

The ZIP is not a universal native executable. It packages signed Linux service images, approved install/bootstrap tooling, manifests, migrations, docs, the selected Compose/Helm profile and reviewed knowledge artifacts; ORVIA model artifacts are added only in Product Version 2. Windows/macOS/Linux users see the same browser UI; supported runtime kernels, CPU architectures, storage and administrators are prerequisites [U2].

To offer literally one customer download, wrap the unchanged signed release and separately signed customer licence in a delivery ZIP. Licence issuance must not modify application binaries or obtain release-signing authority. Renewal can deliver a new licence without redistributing the whole application.

A declared complete/offline bundle contains the actual dependencies for its product release, not a YAML file that secretly pulls them later. Version 1 excludes all AI model/tokenizer/inference dependencies; a model’s absence is expected, not a preflight failure. Product Version 2 bundles include the selected approved AI dependencies, with unavailable optional AI explicitly labelled. A missing required non-AI offline dependency still fails preflight. No customer cloud credential or data record is sent to assemble the bundle.

Safe unpacking must reject path traversal, unexpected absolute paths/symlinks, archive bombs and unlisted executable entries. Verify the manifest, trusted signer, digest, size limits and supported version policy before privileged installation. The verification bootstrap needs an independently established trust identity; a checksum on the same download page is not sufficient. Installer scripts are signed, reviewable entry points, not a remote `curl | shell` execution path.

## VERSION 1 MANIFEST AND RESOURCE CONTRACT

Record `product_major_version: 1`, the exact software build, supported profile/architecture, assistance mode (`RULE_BASED` or `NONE`), model capability (`DEFERRED_V2`) and actual dependency digests in the release manifest. Version 1 does not request a GPU, training account, model API key, weights, embedding service or inference container. Measure ordinary CPU/memory/storage needs for the shipped platform; no hardware minimum is invented here. Preserve Version 2 interfaces in documentation or non-executing contracts, not unnecessary live services or blank model provisioning steps.

---

<a id="orvia-section-86"></a>

# 86. CUSTOMER-CONTROLLED CLOUD DEPLOYMENT

Customers with the appropriate subscription/licence must be able to deploy a supported complete ORVIA package into their organisation or customer-controlled cloud, including the supported profiles among:

- AWS
- Azure
- GCP
- private cloud

Containers should remain portable.

For Kubernetes, support:

- container images
- Helm
- private registry
- secrets integration
- high availability

Kubernetes production environments require deliberate planning around access, networking, IAM, runtime security, multi-tenancy, secrets and monitoring.

## DEPLOYMENT, RESILIENCE AND MEASUREMENT

Deployment profiles retain customer-controlled cloud and engineered restricted/air-gapped enterprise. Earlier shared-codebase SaaS and SaaS-plus-agent/portal options remain recorded alternatives, not enabled parts of the default customer-local offer (§33). Air gap requires offline update/signature trust, dependency mirrors, offline license behavior, diagnostics export and offline rule-pack distribution; it is not a checkbox on a connected deployment.

## SHARED RESPONSIBILITIES WITHOUT VENDOR DATA ACCESS

| Responsibility | ORVIA vendor | Customer |
|---|---|---|
| Product and downloads | Secure code, maintained dependencies, signed packages, supported configuration guidance, advisories and fixes | Verify approved package and install only supported builds |
| Runtime infrastructure | Supply tested manifests/hardening checks and documented prerequisites | Own cloud account/network, host security, resources, administrators and approved exposure |
| Secrets and operational access | No default runtime credentials, decryption access or support backdoor | Own identity, roles, keys, connector permissions and recovery procedures |
| Patching and resilience | Publish tested upgrades and clear security urgency/compatibility | Apply approved patches and test backups/restores within the agreed operating model |
| Support | Receive only approved business information and schema-limited diagnostics | Execute local diagnostic commands and retain operational evidence locally |

A local deployment still requires safe operation, updates and customer infrastructure controls. It is not a guarantee against compromise by an attacker or an authorised host administrator. The vendor must not shift responsibility for defects in its product to the customer.

## USER DEVICE AND RUNTIME SUPPORT MATRIX

**A browser UI is the cross-platform user experience; a supported Linux runtime is the backend portability strategy.** The following is a recommended support plan, not a tested compatibility claim.

| Environment | Normal user access | Proposed hosting route |
|---|---|---|
| Windows workstation | Supported browser to customer workspace | Optional local evaluation through an approved Linux virtualisation/container environment; not default production hosting |
| macOS workstation | Supported browser to customer workspace | Optional evaluation through a Linux VM/container runtime; choose a validated Intel/Apple-silicon architecture path |
| Linux workstation | Supported browser to customer workspace | Evaluation locally; an always-on supported server configuration for organisation use |
| Windows Server infrastructure | Employees browse from their own machines | Provision a supported Linux VM, for example on Hyper-V, then install the Linux ORVIA profile |
| Linux data-centre server/VM | Supported browser over customer network | Signed container deployment bundle |
| Customer-controlled cloud VM | Supported browser over approved access | Same Linux container architecture with tested provider-specific storage/network/key integration |
| Customer Kubernetes cluster | Same browser interface | Signed images and a versioned Helm chart; supported Linux worker nodes |
| Air-gapped infrastructure | Browser inside the isolated network | Supported host plus complete offline package, licence and trust/update process |

Containers still have operating-system/kernel and architecture requirements. Multi-platform images can supply variants such as `linux/amd64` and `linux/arm64`; this is not one native Windows/macOS/Linux executable. Every shipped dependency and model runtime also needs validation. [T1]

Docker Desktop provides Windows and Mac evaluation routes, with platform prerequisites. It is not supported on Windows Server; Microsoft documents Linux guests on Hyper-V. Docker Desktop also has separate commercial licensing conditions—an ORVIA licence does not automatically include it. [T2, T3, T4, T5]

Publish a release-specific browser/OS/CPU/runtime/dependency matrix. Target maintained Chrome, Edge, Firefox and Safari combinations where applicable, but mark support only after actual testing. Do not claim Safari runs on every operating system. A lightweight desktop shortcut or optional installed web-app shell can open the customer-hosted UI; it does not contain the backend or make disconnected operations safe automatically.

## PACKAGING SUPPORT IS A TESTED RELEASE PROPERTY

Publish separate client-browser, server/runtime and connector matrices. Standard Server targets a supported Linux server/VM using the declared container runtime and Compose profile; Kubernetes uses the same images with a version-pinned supported chart and cluster profile. Compose and Helm support these deployment mechanics, but neither establishes ORVIA high availability or security without configuration and tests [U3, U4].

Docker Desktop's Windows documentation excludes Windows Server hosting; use the supported Linux VM route there, and review third-party runtime licences independently [U5]. Retain future native helpers and VM appliances without promising every host/hypervisor combination at launch.

Version 1 has no model/GPU resource requirement. For Product Version 2, a training GPU on Lightning is not a GPU supplied to every installed customer. Each ORVIA model release needs measured CPU/GPU, memory, storage, context and concurrency support for customer-local inference. Offer an evaluated CPU-capable model profile or clearly declared customer-local GPU requirements where feasible. If the customer's hardware cannot run the released model, disable the AI capability explicitly rather than changing its data destination.

---

<a id="orvia-section-87"></a>

# 87. CLOUD PROVIDER SECURITY

Use:

- private subnets where appropriate;
- least-privilege IAM;
- private database connectivity;
- managed KMS;
- secret management;
- network controls;
- WAF where appropriate;
- DDoS protection;
- logging;
- monitoring.

AWS's current EKS guidance emphasises least privilege, separate application roles, cluster access management, pod/runtime security and encryption/secrets controls.

---

<a id="orvia-section-88"></a>

# 88. OBSERVABILITY

Every service should emit:

- logs
- metrics
- traces

Use OpenTelemetry as the instrumentation/telemetry standard. OpenTelemetry provides vendor-neutral collection of traces, metrics and logs.

Every workflow should have a:

```text
correlation_id

```

Every connector action should be traceable.

## LOCAL OBSERVABILITY; VENDOR TELEMETRY OFF

Operational logs, metrics, traces, crash dumps and error reporting remain inside customer-controlled storage and collectors. Disable SDK/framework automatic telemetry and crash uploads; audit transitive dependencies and browser traffic as well as backend code. Do not log passwords, tokens or request bodies unnecessarily even locally. The vendor has no central per-principal or per-workflow monitoring feed. Optional schema-limited diagnostics are governed by §§31 and 95.

---

<a id="orvia-section-89"></a>

# 89. MONITORING DASHBOARD

The customer’s authorised operations team should see these runtime measures locally; ORVIA’s vendor team sees only its own commercial/distribution infrastructure and explicitly approved limited diagnostics:

```text
API health
Database health
Workflow health
Queue depth
Connector health
Error rates
Latency
Guided Assistance status (Version 1, when included)
AI request status (Product Version 2 only)
Test execution status
License status

```

## DEPLOYMENT, RESILIENCE AND MEASUREMENT

Monitor propagation lag, pending unknown effects, oldest unresolved requests, evidence freshness, inventory staleness, noisy-neighbor saturation and backup/restore reconciliation. Infrastructure uptime alone is not privacy-control reliability.

## VENDOR SUPPORT VISIBILITY IS NOT RUNTIME TELEMETRY

Maintain a vendor-side **Support Attention** view based only on submitted cases, permitted report fields, advisory applicability and vendor service health. Link it to commercial account/licence/random installation references where allowed. Show `NOT_REPORTED`, `CUSTOMER_REPORTED`, `APPROVED_DIAGNOSTIC_RECEIVED`, `STALE_REPORT` or `AWAITING_CUSTOMER`; absence of a report is not proof of a healthy installation.

Customer-local monitoring can be detailed because it stays under the organisation's role controls. The vendor cannot see the same dashboard simply by being Super Admin. Support can correlate identical approved product error codes across received cases without uploading underlying customer events or claiming complete fleet coverage.

## EXPECTED MODEL ABSENCE IS NOT A VERSION 1 INCIDENT

Do not mark a Version 1 installation degraded because a model, GPU or inference server is absent. Expose the custom-AI capability as DEFERRED_V2 only in version/capability information. If optional Guided Assistance fails, surface that limited helper fault while preserving core health, accepted workflows and direct human support. Vendor visibility remains restricted to the existing permitted support reports.

---

<a id="orvia-section-90"></a>

# 90. SECURITY MONITORING

Detect:

- unusual authentication
- repeated failed logins
- credential changes
- abnormal API volume
- suspicious connector activity
- privilege changes
- configuration changes
- unusual export requests

---

<a id="orvia-section-91"></a>

# 91. BACKUPS

Backup:

- database
- configuration
- evidence
- workflow state
- licensing data

Backups must be:

- encrypted
- tested
- versioned
- monitored

Recovery procedures must be tested.

## DELETION, DERIVED COPIES AND RESTORATION SAFETY

For backups that cannot be selectively edited, record the technical restriction, isolation controls, retention schedule, restore procedure and customer-approved legal treatment. Maintain a minimal, protected suppression/deletion ledger only to the extent needed and justified. It can itself contain personal data and therefore needs its own access and retention policy.

## BACKUP LOCATION AND KEY CUSTODY

Keep runtime databases, configuration, evidence, workflow histories and their backups in the customer’s approved storage boundary under customer-controlled keys. Do not copy them to an ORVIA backup account or vendor support bucket, even encrypted. Vendor commercial databases have separate backup/retention policies for the limited information in §31. Test restoration without a vendor data-recovery channel and reconcile accepted restrictions before processing resumes.

---

<a id="orvia-section-92"></a>

# 92. DISASTER RECOVERY

Define:

```text
RPO
RTO

```

for each edition.

Foundation:

- standard recovery

Control:

- stronger recovery requirements

Enterprise:

- high availability
- multi-zone
- disaster recovery
- customer-defined RTO/RPO

## DELETION, DERIVED COPIES AND RESTORATION SAFETY

On restore, place the restored environment in quarantine. Reconcile current consent, restrictions, deletion instructions and holds before enabling normal processing. Verify the reconciliation. Test recovery into an older snapshot containing withdrawn principals. Restored data must not automatically rejoin a marketing audience.

## DEPLOYMENT, RESILIENCE AND MEASUREMENT

Define recovery objectives separately for accepted consent events, workflow state, evidence and rebuildable analytics. After failover, reconcile durable consent/revocation state before allowing affected processing. Test actual restores and measure observed RPO/RTO; document any accepted-data-loss window. Do not claim zero loss from a diagram.

---

<a id="orvia-section-93"></a>

# 93. UPDATE SYSTEM

ORVIA vendor website, commerce and distribution services:

- continuous controlled deployment of those vendor services only; no implicit upgrade or remote execution in customer installations

Customer-controlled deployment:

- signed container images
- version manifest
- migration scripts
- rollback strategy
- compatibility information

Do not make updates dependent on access to customer PII.

## SIGNED UPDATES AND SUPPLY-CHAIN PROTECTION

Build releases from reviewed source in isolated CI; lock and review dependencies; scan code, dependencies, container/OS layers, infrastructure definitions and secrets. Produce a software bill of materials (SBOM), immutable version/digest, build provenance, security notes and compatibility information for each release. These are ORVIA engineering requirements, not claims that they are already implemented.

Separate website operations, build execution, release approval and signing authority. Protect signing keys with narrowly scoped access and independent approval for high-impact releases. Verify package signatures, trusted signer, manifest consistency and version policy locally before installation. A hash supplied by the same compromised download page is not sufficient proof of origin.

Support customer-approved rollout windows, offline import, rollback or tested forward recovery, signing-key rotation, revoked-artifact notifications and protection against downgrade to known-unsafe releases. Plan migrations and outage recovery explicitly. A signed update is authenticated software, not proof of vulnerability-free software.

Updates, connector plugins, model packages and rule packs cannot silently broaden egress permissions, enable vendor telemetry, upload backups or add vendor access. Re-run the boundary/security suite on every update. A compromised vendor licence/download account must not automatically authorise software execution or customer data access.

## CUSTOMER UPDATE, RENEWAL, SUPPORT AND OUTAGE EXPERIENCE

| Event | Vendor-side experience | Customer-runtime behaviour |
|---|---|---|
| New software release | Eligible signed package, notes, compatibility and advisory | Customer verifies, tests and applies it in an approved window |
| Licence renewal | New signed entitlement/validity document | Import locally or obtain through the narrowly permitted licensing exchange |
| Edition change | Commercial change and replacement signed licence | Local entitlement refresh; no migration to another product codebase |
| Vendor website outage | Purchases/downloads may be temporarily unavailable | Valid local deployment does not require live vendor auth for normal operation |
| Runtime outage | No automatic vendor view of customer workloads | Customer team uses local health/recovery procedures |
| Support case | Limited business description and permitted diagnostics | Customer runs local checks; customer records and evidence stay local |
| Licence expiry | Renewal information | Documented continuity/read-only/handover behaviour; no data wipe or silent relaxation of restrictions |

The exact expiry/continuity terms must be stated in the licence policy. Do not promise indefinite unpaid operation or instant revocation of licences inside a fully disconnected installation. Signed update approval is not a vendor remote-control channel. [M1 §§31, 43, 93–96, 160]

## ORVIA MODEL AND KNOWLEDGE RELEASES — MODEL ARTIFACTS ARE PRODUCT V2

Treat trained weights, tokenizer/configuration, retrieval index schema and knowledge packs as separate versioned release artifacts. Vendor Super Admin/Admin can manage the appropriate review process, but release approval, signing and customer installation remain independently controlled. A training job or support agent cannot publish directly into the trusted customer channel.

All official model/knowledge downloads are delivered through ORVIA's vendor-managed distribution cloud or verified customer mirrors, not direct operational access to Lightning. Include hashes, provenance, evaluation scope, supported app versions, required hardware and change/rollback notes. Customer-local inference needs no Lightning credentials.

Knowledge updates must preserve authoritative source dates and review status. A new model cannot silently enable training from local records, external providers or expanded telemetry. Install/update tests check those conditions before and after every release.

## VERSIONED UPGRADE PATH

Version 1 may receive reviewed signed documentation, rule, template and runbook updates without model retraining or GPU access. Custom-model artifacts are not Version 1 updates. Introducing ORVIA Intelligence is a controlled Product Version 2 capability with separate compatibility, hardware, corpus, quality, security and privacy approval. An ordinary Version 1 patch or licence refresh cannot silently install it. Version 2 migrations must preserve customers’ roles, consent epochs, policies, workflows, evidence, data locality and support restrictions; continued core operation must not depend on enabling AI.

---

<a id="orvia-section-94"></a>

# 94. LICENSE SECURITY

License metadata may include:

```json
{
  "license_id": "...",
  "organisation_id": "...",
  "edition": "CONTROL",
  "modules": [
    "FIREWALL",
    "REGRESSION_TESTING"
  ],
  "installation_limit": 5,
  "expiry": "..."
}

```

Signed licences must be verified locally for customer-hosted deployments, with offline import/renewal supported for the relevant deployment profile. The vendor licensing service stores only the fields permitted by §31 and has no access to principal records or runtime keys.

## LICENCE TOKENS ARE NOT EXECUTION COMMANDS

Licence payloads may state entitlements, validity and licensed limits only. They cannot contain executable instructions, database queries, arbitrary endpoints or remote support grants. Validate signature, schema, audience and installation binding where applicable. Reject malformed or replayed state changes. Failure or expiry invokes the documented continuity policy (§160), not data destruction, personal-data upload or relaxation of enforced privacy restrictions.

## LICENSING DOES NOT GRANT ADMINISTRATION OR MODEL ACCESS

Commercial account, installation licence and local runtime identity are separate. In Product Version 2, a licence can enable a released AI feature or model package entitlement; it cannot appoint an Organisation Super Admin, change local model/data destinations or carry a support command.

When model entitlements or hardware are unavailable, show the correct capability state and preserve deterministic core operations/continuity. An offline model pack follows the same locally verified licence and approved update policy; no per-question vendor check is required.

## VERSION 1 LICENCE STATE

Version 1 software and every Version 1 licence treat custom AI as DEFERRED_V2, not an activation failure or an available paid unlock. No licence import, renewal or support permission may install a model or require inference. Model-pack and hardware-unavailable behaviour above is future Product Version 2 scope; the existing safety-preserving licence continuity policy is active in Version 1.

---

<a id="orvia-section-95"></a>

# 95. PRIVACY-SAFE SUPPORT

Support should use:

```text
Help
 ↓
Generate schema-allowlisted diagnostic bundle locally
 ↓
Automated forbidden-field check and local preview
 ↓
Customer review; replace any operational context with synthetic reproduction
 ↓
Explicit approval of permitted fields only
 ↓
Optional encrypted upload
 ↓
Support

```

Bundle contents:

- software version
- connector version
- health
- error codes
- bounded non-identifying configuration enums allowed by §31
- necessary coarse resource/performance metadata allowed by §31
- vendor support-ticket ID, never an operational workflow/principal reference

Default:

> No customer operational records, principal references, masked/hashed identifiers, request payloads, evidence, screenshots showing customer data, memory dumps, secrets or unrestricted logs. Customer approval does not waive this boundary.

## LOCAL SUPPORT WITHOUT VENDOR PRODUCTION ACCESS

Keep diagnostics generation and previews customer-local. All uploads are optional and schema-limited; a failed scan blocks upload rather than falling back to an unfiltered archive. Use synthetic reproductions for complex defects. Disable automatic error attachments and support-screen capture. Do not require customers to share production records to obtain a security patch or use core support.

ORVIA staff must not view customer personal data through remote desktops, screen sharing or live terminals under the strict profile: seeing it remotely is still access even without copying a database. The customer executes diagnostic commands. A different managed-access service is not implied by this specification.

## LOCAL-FIRST SUPPORT, THEN MINIMUM-INFORMATION ESCALATION

**Support objective:** identify the correct customer commercial account and supported installation, understand a product fault through bounded diagnostic evidence, reproduce it and deliver a safe fix—without granting vendor access to customer operational records.

### Step 1 — Customer-local detection and assistance

Local health/security checks notify the authorised organisation team. In Version 1, optional Guided Assistance uses explicit error rules and reviewed runbooks to explain known local states and suggest a catalogued diagnostic; otherwise the customer uses those runbooks directly. Product Version 2 ORVIA Intelligence may later explain authorised local context and propose a diagnostic. It remains read-only by default; a typed diagnostic or repair runs only after deterministic permission/scope checks and the required customer approval. Critical conditions alert humans immediately and need not wait for the assistant.

### Step 2 — Prepare a permitted support report locally

A deterministic exporter constructs a fixed-schema report. The local mapping to incidents/workflows/evidence remains local. The customer previews the exact outbound fields, recipient, purpose and retention policy and approves delivery. No AI free-form summary, arbitrary log attachment, screen capture or raw chat transcript is automatically exported. Filtering/redaction alone is not sufficient to waive the forbidden-field list in §31.

Illustrative allowed schema (not an implemented API or new permission to collect every field):

```json
{
  "schema_version": 1,
  "vendor_case_id": "case_example",
  "license_id": "lic_example",
  "installation_id": "random_installation_reference",
  "product_version": "release_example",
  "component": "connector_runtime",
  "component_version": "release_example",
  "issue_code": "SUPPORTED_ERROR_ENUM",
  "customer_urgency": "HIGH",
  "diagnostic_checks": [
    {"check_id": "public_runbook_check_01", "result": "FAILED"}
  ]
}
```

The case/installation identifiers are random commercial support references, never local principal/workflow references. Enumerated component/error/check names must come from a reviewed public product taxonomy, not customer system names. Unknown fields, oversized values, secrets or forbidden content block transmission. The vendor ingress must likewise validate without retaining rejected bodies in logs. A field may be omitted when unnecessary.

### Step 3 — Vendor support works within assigned access

Vendor Admin/Support Specialist sees only assigned permitted cases; Vendor Super Admin governs assignment/escalation and restricted commercial access. The support team can request a catalogued safe diagnostic, inspect the approved result, reproduce using synthetic fixtures, propose instructions, and route a product defect for engineering/security review. It cannot browse the customer's database, log in as the local owner, fetch production evidence or run arbitrary commands.

A proposed diagnostic/repair identifies its public runbook/version, intended effect, allowed parameters, required capability, resource/operation budget, compatibility, expiry and approval need. The customer initiates its download/import. The local service validates it against supported catalogued operations and current permissions. It is **not a vendor-origin remote command channel**; no web terminal, arbitrary shell/SQL or unchecked automatic execution is introduced.

### Step 4 — Apply and verify locally

Provide a reviewed runbook or signed tested patch through official ORVIA distribution. Customer IT approves and applies it using the existing update/plan process. Local verification establishes whether the fault and any affected controls actually recovered. An optional permitted result acknowledgement closes the vendor case; it does not export underlying privacy evidence or override local unresolved outcomes.

### Optional proactive support notification

Off by default. A customer Organisation Super Admin may enable a supported **minimal support-signal** rule after viewing its fixed schema, sample output, category, cadence, destination and retention. This is a deliberately documented expansion from per-report approval to customer-approved standing rules for those exact fields only—not permission for continuous operational telemetry. Provide revocation, rate limits and a local audit; rules cannot be broadened by the AI or an update.

Use only approved product/component version, error/severity enums and random support/installation references. Exclude operational identifiers, records, member directories, hostnames, system maps, workload counts and free-form text. Every message must pass the same deterministic local validator. Material not covered by the standing rule requires fresh local preview/approval. Fully isolated customers use manual transfer; a vendor cannot know an unreported issue inside a disconnected environment.

### No silent managed-access exception

Support authority is not customer-runtime authority. Under the current promise, vendor staff have no standing or incident-created production account, impersonation token, remote desktop, shell, database access or decryption key. A customer sharing a screen containing client records is still disclosure. A future managed-access service would be a separate explicit product/data-handling decision and cannot be implied by the Vendor Super Admin title.

Synthetic vendor test environments can be fully administered by the vendor because they contain vendor-created fictional fixtures, not customer operational copies. Do not describe that test access as access to the customer's production installation.

## VERSION 1 SUPPORT CANNOT WAIT FOR AI

Use the existing case, fixed-schema diagnostic, escalation, signed patch and customer-local verification flow from day one. No chatbot session, generated summary, training activity or model confidence score is required to report a fault. Guided Assistance can be bypassed. Critical alerts and human support remain available when that optional helper is omitted, fails or has no matching rule.

---

<a id="orvia-section-96"></a>

# 96. SUPPORT PORTAL

Support staff should be able to:

- view customer support ticket
- inspect diagnostic bundle
- view non-sensitive health information
- respond
- request additional diagnostics

Support has no vendor-accessible production-data account, remote shell or hidden support tunnel under `CUSTOMER_LOCAL`. Customer-controlled support roles in the runtime belong to authorised customer personnel; ORVIA staff operate the separate business support portal only.

## VENDOR ADMINISTRATION AND SUPPORT CONSOLE

The vendor console is a separate authenticated application for ORVIA staff. The customer's ORVIA Account exposes only that customer's own commercial/support records. Neither application is the customer-local Workspace.

| Console area | Vendor capability | Required limit |
|---|---|---|
| Accounts and licence assignments | Identify the purchasing business, authorised contacts and permitted installation references | No customer operational user directory, system inventory or discovered client information |
| Support Attention queue | Route submitted/approved reports, urgency, owner and last customer update | No invented live health or assumed visibility into offline deployments |
| Case detail | View allowed fields, public runbook steps, replies and synthetic reproduction | Assigned case access; strict report schema and no customer-record attachments |
| Engineering defect link | Link cases to an internally reproduced product defect, supported versions and candidate fix | Link via vendor defect/case IDs; do not import local workflows or evidence |
| Advisories and release records | Publish approved guidance, signed packages and model/knowledge release information | Separation of review/signing duties; customer approval still needed to install |
| Staff administration and audit | Role grants, case scope, access reviews and staff actions | MFA, least privilege, independent approval for high-impact elevation and no runtime bypass |

Vendor case states: `RECEIVED → TRIAGED → NEEDS_CUSTOMER_DIAGNOSTIC / REPRODUCING → FIX_OR_GUIDANCE_READY → AWAITING_CUSTOMER_VALIDATION → RESOLVED / REOPENED`. Track customer-local case states separately. A vendor cannot mark a privacy control verified by closing its support ticket.

No customer should see another customer's support case or commercial records. Vendor Admins must not enumerate unassigned cases; authorised cross-case engineering review uses only approved minimal fields. Business support messages also require minimisation, access and retention. Maintain a quarantine/deletion workflow for accidental forbidden submissions rather than accepting them as normal support material.

In Product Version 2, the console may host a vendor-local copy of the ORVIA model for searching vendor-authored documentation and synthetic reproductions. Keep it separate from customer instances and the training environment; do not train it on tickets or route customer runtime chats into it. Human support is responsible for the response and release decision.

## VERSION 1 VENDOR SUPPORT EXPERIENCE

Vendor Super Admin/Admin and support staff use assigned cases, approved diagnostic enums, ordinary documentation search, reviewed runbooks and synthetic reproductions. The vendor console does not require ORVIA Intelligence. No support case, conversation or resolution is admitted into a future training corpus. Direct customer-runtime administration and unrestricted data access remain forbidden.

---

<a id="orvia-section-97"></a>

# 97. API ARCHITECTURE

Expose APIs for:

```text
Authentication
Organisations
Users
Purposes
Policies
Consents
Notices
Rights
Requests
Workflows
Connectors
Controls
Evidence
Tests
Incidents
Reports
Licenses
Billing

```

API must be versioned:

```text
/api/v1

```

Do not break clients silently.

## API AND EVENT CONTRACTS

**Proposal:** Keep `/api/v1`, original APIs, webhook events, CLI and SDKs. Add typed commands and stable resource states rather than APIs that return generic success for asynchronous work.

A command returns an operation reference and current acceptance state. Completion is observed through authenticated status APIs or signed webhooks. Public status must not reveal principal existence. Errors include a stable code, retry classification, correlation ID and safe explanation; no database or credential internals.

Example additive endpoints: `POST /api/v1/action-plans`, `POST /api/v1/action-plans/{id}/approve`, `GET /api/v1/operations/{id}`, `GET /api/v1/outcome-claims/{id}`, `POST /api/v1/controls/{id}/simulate`, `GET /api/v1/coverage`, `POST /api/v1/nominations`.

**Acceptance:** A duplicate command returns the original operation; the same idempotency key with altered scope returns a conflict; old supported agents fail explicitly rather than misinterpreting new destructive commands.

---

<a id="orvia-section-98"></a>

# 98. WEBHOOK ARCHITECTURE

Provide outbound webhooks for:

- consent changed
- withdrawal
- rights request
- workflow completed
- workflow failed
- incident
- test failure
- policy change

Use:

- signature
- timestamp
- replay protection
- idempotency

---

<a id="orvia-section-99"></a>

# 99. IDEMPOTENCY

Every action that can be retried must use an idempotency key.

Example:

```text
organisation_id
+
workflow_id
+
action_id
+
operation_type
=
idempotency_key

```

Repeated retries must not produce duplicate destructive actions.

## DURABLE EXECUTION AND UNCERTAIN EXTERNAL EFFECTS

A stable idempotency key identifies the intended effect and target generation, while an attempt ID identifies an individual call. Bind the payload digest to the key. A repeated key with a different payload is a conflict, not a new operation.

---

<a id="orvia-section-100"></a>

# 100. EVENT ARCHITECTURE

Event examples:

```text
consent.created
consent.withdrawn
request.received
request.verified
workflow.started
workflow.failed
action.executed
action.verified
policy.published
connector.failed
test.failed
incident.created

```

Events should be versioned.

## API AND EVENT CONTRACTS

An event envelope includes event ID, schema version, tenant/environment, aggregate ID/version, occurrence and recording timestamps, payload classification, minimized payload/reference, causation ID and correlation ID. Webhook signatures bind payload and timestamp; consumers enforce replay windows and deduplication.

---

<a id="orvia-section-101"></a>

# 101. DATA MIGRATION STRATEGY

All schema changes must use:

- migration scripts
- rollback plan
- compatibility testing

Never modify production schemas manually.

## API AND EVENT CONTRACTS

Build contract fixtures for old/new clients, backward-compatible evolution and connector/agent compatibility. Do not rewrite running workflow definitions during deploy. Schema migrations use expand/contract where practical, and irreversible migrations require a tested forward-recovery strategy rather than a fictitious rollback.

---

<a id="orvia-section-102"></a>

# 102. FRONTEND ARCHITECTURE

Use:

- reusable design system
- accessible components
- responsive layouts
- consistent forms
- confirmation dialogs
- status badges
- evidence views
- timelines
- data tables
- filters
- search
- pagination

## USER EXPERIENCE, ACCESSIBILITY AND TRUST

Use plain-language distinctions: “request received,” “action sent,” “vendor acknowledged,” “observed in connected system,” “manual confirmation,” “not verified.” Color is supplementary, not the sole status cue. Show accessibility-ready keyboard interactions, screen-reader labels, readable contrast, locale-aware dates and explicit timezone display. Test with representative language and low-bandwidth journeys.

## CUSTOMER WORKSPACE EXPERIENCE

Use a consistent header showing organisation, environment, signed-in role, current operating mode and product version. Display “Customer-hosted” as a deployment description, not a blanket assurance that every setting has been independently verified.

Retain the original navigation: **Dashboard, Privacy Graph, Purposes, Policies, Consent, Privacy Requests, Retention, Systems, Processors, Controls, Testing, Incidents, Evidence, Reports, Integrations and Settings.** Group it visually where useful, without removing modules. [M1 §§102–108]

| Area | Operational experience |
|---|---|
| Dashboard | Pending approvals, failed and unverified actions, connector state, tests and incident/request activity from actual local records |
| Graph and governance | Follow purpose → data → system → processor → policy → control → evidence; review notices and policy versions |
| Requests and workflows | Verify identity, inspect scope, review a plan, approve eligible actions, monitor each destination and deliver a scoped response |
| Integrations and controls | Configure credentials locally, inspect capabilities/limitations, preview actions and operate supported control points |
| Testing | Review expected versus actual behaviour, affected boundary, exact build, timestamp and evidence |
| Evidence and reports | Inspect authorised records and generate locally controlled exports |
| System settings | Customer users/roles, identity, certificates, storage, backup, keys, licence, updates, egress, optional V1 Guided Assistance and future Product V2 in-boundary AI |

**Recommended landing views:** a privacy officer sees deadlines and unresolved outcomes; an engineer sees connector/control changes and regressions; an auditor sees read-only evidence; an IT administrator sees deployment health and maintenance. Server-side authorisation controls access—not hidden menu items alone. [M1 §§6–7, 103]

### A request detail screen

A request should show its subject reference only to authorised users; received time; identity/authority state; purposes; scope; policy version; approvals; per-target execution and verification; unresolved manual tasks; evidence; and next accountable action. Preserve these distinctions:

`Received → Planned → Attempted → Acknowledged → Observed/Verified`

These are related records/states, not an unconditional ladder every connector can climb. Unknown, failed, stale and outside-coverage outcomes remain visible. Do not mark the entire request verified because one destination succeeded. [M1 §§22–26, 44–49, 106]

### Local data-boundary page

Add a customer-local **Settings → Data Boundary** page. Show configured runtime/storage/backup destinations, allowed external destinations, enabled diagnostics, model endpoint, last boundary-test evidence, tested build and observed exchanges within the monitored scope.

Keep **configured**, **observed**, **last tested**, **stale** and **not tested** separate. A configuration stating “vendor egress blocked” is not itself a completed network-security test. Local outbound observability must not become vendor telemetry.

The browser is part of the access boundary: authorised users see data on their devices. Exports, clipboard use, caches and downloaded evidence need endpoint controls. Customer-controlled storage does not mean that no authorised response ever reaches a browser. [M1 §§31, 88, 102, 162]

---

<a id="orvia-section-103"></a>

# 103. PRIMARY NAVIGATION

Recommended:

```text
Dashboard
Privacy Graph
Purposes
Policies
Consent
Privacy Requests
Retention
Systems
Processors
Controls
Testing
Incidents
Evidence
Reports
Integrations
Settings

```

Edition-specific features should be visibly marked.

## USER EXPERIENCE, ACCESSIBILITY AND TRUST

**Proposal:** Keep the original navigation and add role-oriented landing views rather than more disconnected top-level pages. The privacy officer sees obligations, deadlines and unresolved outcomes; engineering sees control changes, connector health and regression failures; auditors see evidence and limitations.

## NAVIGATION BY TRUST DOMAIN

Retain every customer operational module above. Grouping for usability does not remove a module or bypass its permissions. Organisation Super Admin/Admin sees **Members & Roles**, **Environments/Subtenants**, **Systems**, **Local Health**, **Support**, **Guided Assistance** (Version 1, when included), **ORVIA Intelligence** (Product Version 2 roadmap only), **Data Boundary**, **Licences** and **Updates** within authorised settings.

ORVIA Account uses commercial navigation: Account Overview, Licences, Downloads, Billing, Commercial Members, Updates & Security, Support, and Guides. Vendor staff use the separate Administration and Support Console in §96. A Data Principal sees the customer-branded Privacy Centre, not either administrative menu. Product-level UI labels should always identify the current domain and role.

## NO PLACEHOLDER AI WORKFLOW IN VERSION 1

Keep everyday Version 1 navigation focused on working features. A future-capability catalogue may state “ORVIA Intelligence — planned for Product Version 2”; it must not offer an apparently working chat box, model selector, activation form or fabricated response. Label implemented help as “Guided Assistance — rules and reviewed runbooks.” Record feature/test status independently of roadmap visibility.

---

<a id="orvia-section-104"></a>

# 104. DASHBOARD

Show:

```text
Privacy Control Health

Verified Controls
Failures
Pending Actions
Unverified Actions
Connector Health
Privacy Test Status
Recent Incidents
Recent Requests

```

Do not use a single "93% compliant" score as the primary truth.

---

<a id="orvia-section-105"></a>

# 105. PRIVACY GRAPH UI

Users should be able to navigate:

```text
Purpose
 ↓
Data
 ↓
Systems
 ↓
Processors
 ↓
Policies
 ↓
Controls
 ↓
Evidence

```

and:

```text
Principal
 ↓
Consent
 ↓
Purpose
 ↓
Systems
 ↓
Actions
 ↓
Verification

```

---

<a id="orvia-section-106"></a>

# 106. CONTROL DETAIL PAGE

Every control should display:

```text
Control
Purpose
Policy
Scope
Systems
Processor
Current State
Last Execution
Last Verification
Last Test
Failures
Evidence
Owner

```

## USER EXPERIENCE, ACCESSIBILITY AND TRUST

Every control page answers the original WHAT/WHY/WHERE/WHO/WHEN/RESULT/EVIDENCE questions and additionally shows scope, freshness, unsupported boundaries and the next accountable action.

---

<a id="orvia-section-107"></a>

# 107. TEST DETAIL PAGE

Show:

```text
Test Name
Purpose
Environment
Policy Version
Preconditions
Execution Steps
Expected
Actual
Result
Logs
Affected Systems
Evidence

```

---

<a id="orvia-section-108"></a>

# 108. INCIDENT DETAIL PAGE

Show:

```text
Incident
Severity
Status
Timeline
Affected Systems
Affected Purposes
Affected Policies
Affected Principals
Evidence
Open Actions
Notifications
Owner

```

---

<a id="orvia-section-109"></a>

# 109. SECURITY REQUIREMENTS

Minimum security controls:

- MFA required for privileged production access, with phishing-resistant methods where supported
- secure password storage where local authentication is used
- SSO for enterprise
- session expiration
- refresh-token security
- RBAC
- tenant isolation
- API rate limits
- CSRF protections where applicable
- secure headers
- input validation
- output encoding
- SSRF protections
- SQL injection prevention
- secure file handling
- audit logs
- secret management
- key management
- vulnerability scanning

## SECURITY AND PRODUCT SAFETY RELEASE BAR

**Proposal:** Maintain threat models for public portal impersonation, excessive access disclosure, malicious tenant administrators, compromised agents, poisoned connector responses, stolen signing keys, replayed approvals, dependency compromise and injected AI instructions.

## SECURITY-BY-DESIGN REQUIREMENT AND VERIFICATION BASELINE

**Mandatory product requirement:** prevent unauthorised access and data movement through layered controls; detect and contain incidents; remediate vulnerabilities throughout supported product life. Every edition must meet the baseline. These are requirements to implement and verify, not evidence that the current product is already secure.

Use **NIST SP 800-218 SSDF v1.1** as the secure-development process baseline and a version-pinned **OWASP ASVS 5.0.0** assessment matrix for the applicable web/API controls. Proposed target: the applicable ASVS Level 2 requirements, plus explicitly identified higher-assurance requirements for administration, key custody, connectors, approvals and sensitive actions. Document non-applicable controls and their rationale. Selecting some higher-assurance controls does not establish full Level 3 verification or a certification. [S1; S2]

NIST frames secure development as reducing vulnerabilities and mitigating the impact of undetected or unaddressed flaws. ORVIA therefore must not claim that security testing proves absence of every vulnerability, that customer-hosting makes compromise impossible, or that no future breach can occur. [S1]

| Security area | Required product behaviour | Required evidence |
|---|---|---|
| Identity and privilege | Privileged MFA; no shared/default production passwords; secure session/token handling; least privilege; independent approvals for high-impact operations | Authentication, session, access-control and privilege-escalation tests |
| Application and API | Server-side ownership checks; bounded input; safe encoding/queries; upload isolation; rate limits; SSRF/CSRF protections as applicable | Positive and negative tests for each exposed interface |
| Runtime and network | Private administrative/database interfaces; customer-managed ingress/egress; isolated services; non-privileged workloads; no arbitrary execution or unrestricted connector traffic | Hardening checks, segmentation tests and egress capture |
| Secrets and cryptography | Maintained cryptographic libraries; encrypted transport/storage; customer runtime keys; separate release/licence keys; rotation and access audit | Key custody review, rotation/revocation tests and secret scans |
| Data and evidence | Customer-local processing/storage; local access-scoped logs; no vendor operational feed; tamper-evident audit records; tested restore | Boundary tests, evidence-integrity tests and recovery exercises |
| Build and distribution | Reviewed source/dependencies; isolated CI; versioned SBOM/provenance; authenticated release artifacts; secure update and rollback handling | Build attestation, scans and signature/update failure tests |
| Assistance and plugins | Version 1: permission-scoped rules/search, untrusted-content handling and isolated plugins. Product Version 2 adds local inference and the strict AI tool broker | Test shipped surfaces for injection, permissions, forbidden operations and leakage; model-specific evaluations are Product Version 2 |
| Operations and response | Local security monitoring; maintainable patches; accountable vulnerability intake; customer advisories; supported-version policy | Incident exercise, patch records, disclosure register and current assessment scope |

For every control, record the threat, owner, implementation/build, applicable deployment, test method, result, date, limitations and unresolved findings. Security covers the vendor website/payment/download/signing systems **and** the customer runtime; the new local-data architecture does not remove supply-chain or insider threats.

## ADMINISTRATION AND SUPPORT ATTACK SURFACES

Extend the threat model to vendor-staff compromise, malicious support replies, poisoned diagnostic packages, role delegation, customer-owner recovery, subtenant escape, training-workspace compromise and model/update poisoning. A compromised commercial account or Vendor Admin must not directly control a customer installation.

Enforce privileged MFA and auditable least-privilege role grants on both independent domains. Security controls outside the model validate every proposed diagnostic/repair. Customer-approved signed software remains a supply-chain trust decision, not a proof that vendor-origin code cannot be harmful; maintain independent review, egress restrictions and customer rollback/recovery.

No absolute claim of breach immunity or zero unknown vulnerabilities is created by self-hosting, role hierarchy, signed software or a custom model.

---

<a id="orvia-section-110"></a>

# 110. API SECURITY

Every API must have:

```text
Authentication
Authorization
Input validation
Rate limiting
Audit
Error handling

```

Never leak:

- stack traces
- database errors
- tokens
- secrets
- internal hostnames

## NO VENDOR DATA-PLANE API

Customer operational APIs require customer-issued runtime authentication and run inside the customer deployment. Vendor purchase/licence credentials must not authenticate against operational APIs. Vendor endpoints accept only documented commercial/licensing schemas (§31); reject unknown fields without storing request bodies or reflecting sensitive content. Do not put personal data in URLs, request logs or licensing error messages.

---

<a id="orvia-section-111"></a>

# 111. FILE UPLOAD SECURITY

If customers upload notices/evidence/configuration:

- validate file type
- validate size
- scan malware where appropriate
- store outside executable paths
- randomise filenames
- restrict permissions
- record uploader
- log access

---

<a id="orvia-section-112"></a>

# 112. AI SECURITY

**Release applicability:** model-specific requirements in this section apply to **Product Version 2 — DEFERRED_V2**. Version 1 must still enforce authorisation, safe rendering, untrusted-content handling, bounded diagnostics and no model/egress fallback for any rules-based help. No model gateway or AI tool broker is a Version 1 dependency.

AI requests must enforce:

- tenant isolation
- prompt injection controls
- output schema validation
- tool permission boundaries
- sensitive-data filtering
- model timeouts
- token limits
- logging
- provider controls

The model must never receive unrestricted access to:

- database
- shell
- filesystem
- credentials

## AI COPILOT: USEFUL, CONSTRAINED AND EVALUATED

Maintain evaluation sets for grounded accuracy, uncertainty handling, cross-tenant leakage, prompt injection, tool misuse, harmful action suggestions, language fidelity and unsupported legal conclusions. Measure task usefulness and cost as well as refusal/safety performance. Model/provider changes require evaluation before rollout.

## LOCAL AI AND ADVERSARIAL RELEASE GATE

The local model, retrieval index and tool broker remain subject to the same permissions as non-AI services. Test attempted egress through model tools, prompts, plugins, error reporting and external-provider fallback. A model may not change the deployment data boundary, approve its own actions, grant a support account or retrieve secrets. Two coding AIs reviewing each other do not substitute for independent security assessment of a production release.

## OWN-MODEL PROVENANCE, PRIVACY AND QUALITY GATES

For each model release, test from-scratch lineage; unapproved third-party weights/adapters/tokenizers; corpus provenance; train/test leakage; prompt and knowledge poisoning; role/subtenant retrieval isolation; secret exposure; safe answer rendering; arbitrary tool suggestions; support-export injection; hidden model downloads; and attempted runtime calls to Lightning/vendor/external inference.

A self-trained model can still generate incorrect or unsafe output. Apply the same runtime constraints, independent review and evidence rules as for any AI component. OWASP's prompt-injection and excessive-agency guidance informs the threat model, not a claim that the risks are eliminated [U9].

Model evaluation, privacy/security testing and deployment compatibility are separate gates. A low training loss does not establish useful support answers; high benchmark accuracy does not establish no data egress; training on a GPU does not establish customer CPU performance. Store the exact assessed artifacts, scripts, fixtures and results. Applicable Version 1 scenarios in §217 begin NOT_RUN until executed; model-specific scenarios remain DEFERRED_V2 until the Version 2 programme starts. Neither label means passed.

---

<a id="orvia-section-113"></a>

# 113. AI TOOL-USE MODEL

**Release applicability:** model-specific requirements in this section apply to **Product Version 2 — DEFERRED_V2**. Version 1 must still enforce authorisation, safe rendering, untrusted-content handling, bounded diagnostics and no model/egress fallback for any rules-based help. No model gateway or AI tool broker is a Version 1 dependency.

AI should use explicitly permitted tools:

```text
searchPolicies()
getWorkflow()
getEvidence()
getConnectorStatus()
getTestResults()

```

Not:

```text
executeSQL()
runShell()
deleteAnything()

```

AI tools should have separate permission scopes.

## AI COPILOT: USEFUL, CONSTRAINED AND EVALUATED

Use structured outputs and a bounded tool broker. No unrestricted SQL, shell, filesystem, secrets access or arbitrary connector calls. A generated policy remains a draft. A generated workflow is checked against permissions, permitted actions, plan budgets and known capabilities before review.

## SUPPORT TOOL CONTRACT

Add bounded customer-local tools such as `searchRunbooks()`, `getAllowedLocalHealth()`, `proposeDiagnosticCheck()` and `prepareSupportDraft()`. Each tool uses the requesting actor's scope, not a hidden super-admin identity. Diagnostic suggestions reference allowlisted, versioned operations; they do not execute free-form scripts.

`prepareSupportDraft()` creates a local draft. Only the deterministic schema exporter plus the required customer approval/standing rule can transmit permitted fields. The model cannot call a general-purpose upload endpoint, attach a conversation/log, create an unrestricted support tunnel or grant vendor access. A signed vendor recommendation does not skip local validation or approval.

---

<a id="orvia-section-114"></a>

# 114. DEVELOPER EXPERIENCE

ORVIA should provide:

- REST API documentation
- SDK documentation
- connector guide
- policy examples
- test examples
- webhook documentation
- local-development guide
- deployment guide

Use OpenAPI.

---

<a id="orvia-section-115"></a>

# 115. CLI

Build an ORVIA CLI for technical users.

Commands:

```text
orvia auth
orvia connectors
orvia policies
orvia tests
orvia workflows
orvia diagnostics
orvia config

```

This becomes particularly useful for CI/CD.

## PRIVACY CONTROL PACKAGES AND CHANGE SIMULATION

Proposed CLI extensions: `orvia controls validate`, `orvia policies diff`, `orvia simulate`, `orvia coverage explain`, `orvia evidence verify`, `orvia connectors test`. Keep all original CLI commands.

---

<a id="orvia-section-116"></a>

# 116. REPOSITORY STRUCTURE

Recommended monorepo:

```text
orvia/
├── apps/
│   ├── web/
│   ├── api/
│   ├── portal/
│   ├── connector-agent/
│   └── admin/
│
├── services/
│   ├── graph/
│   ├── policy/
│   ├── workflow/
│   ├── consent/
│   ├── rights/
│   ├── evidence/
│   ├── testing/
│   ├── incident/
│   ├── notification/
│   ├── licensing/
│   └── ai/
│
├── packages/
│   ├── types/
│   ├── ui/
│   ├── auth/
│   ├── policy-sdk/
│   ├── connector-sdk/
│   ├── audit/
│   └── security/
│
├── connectors/
│   ├── postgres/
│   ├── mysql/
│   ├── rest/
│   ├── crm/
│   ├── marketing/
│   └── support/
│
├── infrastructure/
│   ├── docker/
│   ├── kubernetes/
│   ├── terraform/
│   └── environments/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/
│   ├── security/
│   ├── performance/
│   └── privacy/
│
└── docs/

```

## DEPLOYMENT SEPARATION WITH SHARED DESIGN SOURCE

A possible source organisation is:

```text
apps/
  vendor-account/        # customer-facing commercial account
  vendor-admin/          # vendor staff administration and support console
  customer-console/     # customer-hosted operations UI
  principal-portal/     # customer-hosted client privacy UI
  customer-api/
  worker/
  connector-agent/
packages/
  ui/                    # shared SOURCE, compiled into each released application
  contracts/
  domain/
```

Vendor commerce and customer runtime must not share operational databases, session stores, signing authority or administrative credentials. Share reviewed code where appropriate—not live customer state.

Serve the runtime's HTML, JavaScript, fonts and other required assets from the customer deployment. Do not render the operational UI from the vendor site and quietly query a private backend, embed the workspace inside the vendor page or add vendor analytics. Restrict browser connections and isolate the public portal's privileges as part of the supported deployment. The UI should remain available when vendor internet access is blocked.

## VERSION 1 BUILD GRAPH

Preserve shared domain/UI/contracts and a documented future assistance extension. Build/package Version 1 without model-training, inference, learned-embedding or GPU services. Any future AI directory in the long-term repository outline is a Product Version 2 namespace, not a dependency of the Version 1 build, installer or runtime. Optional deterministic help may reuse existing packages; it does not need a separate orchestration framework.

---

<a id="orvia-section-117"></a>

# 117. 20-PERSON ENGINEERING TEAM

The following is the recommended 20-person structure.

## Developer 1 — Chief Architect / Technical Lead

Owns:

- overall architecture
- domain boundaries
- engineering standards
- architectural decisions
- technical roadmap
- major integrations
- scalability
- technical reviews

Must approve major architectural changes.

---

## Developer 2 — Core Backend Engineer

Owns:

- core API
- organisation model
- tenant services
- common backend infrastructure
- domain APIs

---

## Developer 3 — Privacy Control Graph Engineer

Owns:

- domain model
- graph relationships
- purpose/data/system relationships
- graph queries
- graph APIs

---

## Developer 4 — Policy Engine Engineer

Owns:

- policy evaluation
- policy versioning
- decision models
- policy compiler/validator
- policy APIs
- policy testing

---

## Developer 5 — Workflow / Distributed Systems Engineer

Owns:

- durable workflows
- retries
- idempotency
- state machines
- execution plans
- approvals
- escalation

---

## Developer 6 — Connector Platform Engineer

Owns:

- connector SDK
- connector contract
- capability declaration
- connector lifecycle
- authentication abstraction
- connector health

---

## Developer 7 — Data Connector Engineer

Owns:

- PostgreSQL
- MySQL
- database discovery
- local matching
- database actions
- verification

---

## Developer 8 — SaaS/API Integration Engineer

Owns:

- REST connector
- CRM connector
- marketing connector
- support connector
- webhook integration
- API retries

---

## Developer 9 — Frontend Platform Engineer

Owns:

- React application
- dashboard
- shared state
- API integration
- performance
- frontend architecture

---

## Developer 10 — Product UX Engineer

Owns:

- design system
- UX flows
- accessibility
- onboarding
- privacy workflow UI
- error experience

---

## Developer 11 — Data Principal Portal Engineer

Owns:

- privacy portal
- consent interfaces
- request submission
- request tracking
- secure portal architecture
- customer branding

---

## Developer 12 — AI/ML Engineer

The model responsibilities below are retained for Product Version 2. Version 1 assignments are defined at the end of this section.

Owns:

- AI gateway
- model integrations
- prompt architecture
- structured output
- AI privacy controls
- AI tool calling
- model evaluation

---

## Developer 13 — AI Applications Engineer

The model-application responsibilities below are retained for Product Version 2. Version 1 assignments are defined at the end of this section.

Owns:

- AI Copilot
- discovery assistance
- policy builder
- workflow builder
- incident analysis
- test generation

---

## Developer 14 — Security / Application Security Engineer

Owns:

- threat modelling
- application security
- penetration-test preparation
- secure coding standards
- secret handling
- security controls
- vulnerability remediation

---

## Developer 15 — IAM / Identity Engineer

Owns:

- authentication
- MFA
- SSO
- RBAC
- session security
- service identities
- organisation roles

---

## Developer 16 — Cloud / DevOps Engineer

Owns:

- cloud infrastructure
- Terraform
- containers
- CI/CD
- environments
- deployment
- secrets integration

---

## Developer 17 — SRE / Observability Engineer

Owns:

- monitoring
- OpenTelemetry
- logging
- alerting
- reliability
- backup
- recovery
- SLOs
- capacity

---

## Developer 18 — QA / Automation Engineer

Owns:

- unit-test standards
- integration tests
- E2E
- Playwright
- regression
- release testing

---

## Developer 19 — Performance / Reliability Engineer

Owns:

- load testing
- workflow scale
- connector throughput
- concurrency
- database tuning
- resilience testing

---

## Developer 20 — Release / Platform / Developer Experience Engineer

Owns:

- CLI
- SDK packaging
- release pipeline
- versioning
- migration tooling
- deployment packages
- documentation tooling
- release automation

## ORGANIZATION OF THE EXISTING 20-PERSON TEAM

**Proposal:** Retain all 20 original roles and responsibilities, but deliver through outcome groups with cross-review rather than 20 isolated component silos.

| Group | Original developer numbers | Primary delivery responsibility |
|---|---|---|
| Architecture lead | 1 | Decisions, dependency order, cross-group review and release arbitration |
| Core and authorization | 2, 3, 4, 5, 15 | Tenant/domain, graph, policy, consent semantics, durable execution and IAM |
| Connected execution | 6, 7, 8 | Agent/SDK contracts, database and SaaS integrations, reconciliation and verification |
| Product experience | 9, 10, 11 | Console, design/accessibility, portal, rights and nomination journeys |
| Intelligence | 12, 13 | Version 1: rules/runbooks, synthetic fixtures, support and integration testing; Product Version 2: retained safe AI gateway and applications |
| Trust and operations | 14, 16, 17, 18, 19, 20 | AppSec, infrastructure, SRE, QA, performance, releases and developer experience |

The groups total 20 unique people. Every cross-cutting capability has one accountable primary owner and at least one trained reviewer/backup. Security and QA are embedded in design and implementation rather than added only at release.

Assign a single outcome lead for the marketing-withdrawal slice, even though several groups contribute. Engineers implementing connectors must participate in customer discovery and support triage; otherwise commercial promises can drift away from integration reality.

## ADDITIONAL OWNERSHIP WITHIN THE EXISTING TEAM

Retain all 20 roles. For Product Version 2, Developer 12 owns the ORVIA corpus/tokenizer/model-training pipeline, evaluation lineage and candidate model artifacts; Developer 13 owns grounded model assistance, knowledge packs and support/AI workflows. For Version 1, both focus on the deterministic assignments below. Developer 15 owns the independent vendor/customer role domains, delegated subtenants and recovery. Developers 9–11 own the separate Account, vendor-staff console, Workspace and Privacy Centre experiences.

Developers 16 and 20 own signed platform/model delivery, offline packaging and controlled updates; Developer 14 owns support/training/supply-chain threat modelling; Developers 17–19 own local observability, model runtime benchmarks and negative tests. The architecture lead approves cross-domain contracts. Legal/content reviewers approve source interpretations and training-data reuse; product leadership approves compute spend and supported claims.

A job title is not proof that all this capacity is staffed. Document actual owners and do not assume the prototype's two coding subscriptions include GPU budget, legal review, independent security assessment or ongoing support staffing.

## CURRENT VERSION 1 ASSIGNMENTS FOR THE INTELLIGENCE ROLES

Developer 12 supports deterministic validation rules, reviewed error taxonomy, rule/template fixtures, privacy-safe diagnostics and negative testing. Developer 13 supports the local runbook/keyword-search experience, configuration checklists, support workflow and end-to-end fixture coverage. Both assist core integration and QA before adding optional helper breadth.

No Version 1 assignment requires corpus scraping, tokenizer training, checkpoint work, model evaluation, GPU provisioning or model-serving infrastructure. Those responsibilities remain recorded for Product Version 2. Platform/release, security and performance staff apply their existing disciplines to Version 1 artifacts now and to model artifacts later. Preserve all other role responsibilities. Actual staffing remains an explicit constraint, not something inferred from a 20-role chart.

---

<a id="orvia-section-118"></a>

# 118. NON-ENGINEERING EXPERTISE REQUIRED

The engineering team must not attempt to substitute software engineering for legal expertise.

ORVIA should have access to:

- privacy lawyer / DPDPA specialist
- security auditor
- compliance subject-matter expert

The legal SME validates policy interpretations.

The engineering team implements the validated model.

## ORGANIZATION OF THE EXISTING 20-PERSON TEAM

Privacy counsel, product management/founder, commercial discovery, security audit and customer implementation expertise are additional responsibilities or external capacity, not secretly counted as extra engineers. Counsel approves interpretations; the product lead approves scope; engineering approves supported technical claims.

---

<a id="orvia-section-119"></a>

# 119. ENGINEERING TEAM WORKFLOW

Every feature follows:

```text
Requirement
 ↓
Domain design
 ↓
Threat model
 ↓
API design
 ↓
Data model
 ↓
Implementation
 ↓
Unit tests
 ↓
Integration tests
 ↓
Security tests
 ↓
E2E tests
 ↓
Documentation
 ↓
Code review
 ↓
Deployment
 ↓
Monitoring

```

No feature is considered complete just because the UI exists.

---

<a id="orvia-section-120"></a>

# 120. DEFINITION OF DONE

A feature is complete only when:

- frontend complete
- backend complete
- API documented
- database migration complete
- authorization implemented
- audit logging implemented
- error handling implemented
- unit tests complete
- integration tests complete
- E2E test complete
- security checks complete
- monitoring added
- documentation added
- failure scenarios tested

## SECURITY AND DATA-BOUNDARY COMPLETION

A feature is not complete until its storage locations and outbound paths are documented, its customer-local restrictions are tested, its dependency/configuration changes are reviewed, and applicable release-blocking security findings are closed and retested. Store executed results against the exact build. Planned scans, AI-generated tests and unexecuted checklists do not count as passed security evidence.

## RELEASE-SCOPED DEFINITION OF DONE

Version 1 completion is assessed against its released non-model capabilities and any included rules-based assistance, not against deferred custom-model tasks. Include evidence that install, login, actions, verification, tests, support and renewal work with model/Lightning endpoints absent and blocked. Mark Version 2 model requirements DEFERRED_V2 rather than passed or deleted. Optional guidance that misses acceptance is omitted or labelled unavailable without weakening core functionality or inventing success.

---

<a id="orvia-section-121"></a>

# 121. AI CODING AGENT RULES

The AI building ORVIA must follow these rules.

### Rule 1

Never create fake implementations.

No:

```text
TODO
Coming soon
Mock success
Hard-coded successful response

```

in production functionality.

---

### Rule 2

Never silently invent legal requirements.

The implementation must have a configurable policy layer.

---

### Rule 3

Never bypass security to make functionality work.

Do not disable:

- authentication
- authorization
- TLS
- validation
- tenant isolation

to solve development problems.

---

### Rule 4

Never leak secrets.

---

### Rule 5

Every database table must have an ownership/tenant strategy.

---

### Rule 6

Every sensitive action requires an audit trail.

---

### Rule 7

Every destructive action requires explicit rules and appropriate approvals.

---

### Rule 8

Every external integration must handle failure.

Assume:

```text
timeout
rate limit
invalid response
partial success
duplicate event
deleted record
authentication failure
network failure

```

---

### Rule 9

Never assume an external API is exactly-once.

Design idempotently.

---

### Rule 10

Every feature needs tests.

## CODING AI IS STILL ALLOWED; PRODUCT AI IS DEFERRED

The instruction to hold custom AI applies to the software’s learned-model features, not to using GPT, Claude or other authorised coding assistants to build/review/test ORVIA. Keep human review, secret protection, synthetic fixtures and the no-customer-data-sharing rule. A coding agent must not add a hosted model API, local pretrained model, embedding dependency or model-training job to Version 1 as a shortcut. A truthful roadmap label is permitted; a future feature must not masquerade as implemented production functionality.

---

<a id="orvia-section-122"></a>

# 122. DEVELOPMENT ENVIRONMENTS

Maintain:

```text
Local
Development
Test
Staging
Production

```

Enterprise customer environments are separate deployments.

## MODEL DEVELOPMENT IS A SEPARATE NON-CUSTOMER ENVIRONMENT

Separate vendor software development, Lightning model training/evaluation, vendor staging/commerce/support and customer runtime environments. Training uses approved corpus snapshots and fictional fixtures only. Customer staging/production data, local prompt logs, support attachments and cloud credentials are never copied into Lightning or vendor test environments.

Use explicit data classifications, source manifests, isolated credentials, restricted artifact publication and production-release gates. Development coding assistants may help prepare reviewed code and non-sensitive specifications, but they are not ORVIA runtime providers or an unapproved teacher/data-generation pipeline.

---

<a id="orvia-section-123"></a>

# 123. CI/CD PIPELINE

```text
Commit
 ↓
Lint
 ↓
Type check
 ↓
Unit tests
 ↓
Security scanning
 ↓
Build
 ↓
Integration tests
 ↓
E2E
 ↓
Container scan
 ↓
Deploy staging
 ↓
Regression tests
 ↓
Approval
 ↓
Production

```

## SECURITY CHECKS THAT BLOCK RELEASE

Run secret detection, static analysis, dependency/SBOM checks, container and infrastructure scans, API/browser adversarial tests, tenant-isolation tests and data-egress regression on the candidate build. Record tool versions, scopes, exclusions and results. Missing or failed required checks block release; an unavailable scanner does not become a pass.

Review scanner findings for affected version, reachability and impact. Preserve adjudication and independent review; do not silently delete or downgrade findings to clear a gate. Final signing/promotion requires the release owner’s and security owner’s approval, with no licence/checkout administrator able to bypass those controls.

## MODEL RELEASE PIPELINE — PRODUCT VERSION 2, ON HOLD FOR VERSION 1

Use a separately reviewed model pipeline: approved corpus manifest → leakage/dedup/source checks → tokenizer and random-initialisation provenance → bounded training → held-out evaluations → adversarial/privacy checks → runtime packaging/benchmark → independent review → signed model/knowledge manifest → vendor distribution → customer-authorised import.

A Product Version 2 pipeline that includes AI consumes only an approved model artifact digest. The Version 1 product pipeline has no model input, training stage or model-quality gate; it does validate any included rules/runbooks and the absence of model dependencies. A training run, notebook or vendor support ticket cannot directly publish to customers. Re-run compatibility and data-boundary tests when model, inference engine, tokenizer, knowledge or tool schemas change.

---

<a id="orvia-section-124"></a>

# 124. CODE QUALITY

Require:

- strict TypeScript
- ESLint
- formatting
- no unused code
- no ignored compiler errors
- no unreviewed dependency additions
- dependency vulnerability scanning

---

<a id="orvia-section-125"></a>

# 125. TESTING PYRAMID

Use:

```text
Many unit tests
       ↓
Integration tests
       ↓
Workflow tests
       ↓
E2E tests
       ↓
Security tests
       ↓
Performance tests

```

---

<a id="orvia-section-126"></a>

# 126. SECURITY TESTING

Test:

- broken access control
- tenant escape
- injection
- SSRF
- XSS
- CSRF
- file upload abuse
- token theft
- session attacks
- privilege escalation
- secret leakage
- API abuse
- webhook forgery

## SECURITY AND PRODUCT SAFETY RELEASE BAR

**Acceptance:** Attempted privilege escalation and forbidden production operations fail before external effects, with privacy-safe audit evidence.

## CUSTOMER-LOCAL DATA-BOUNDARY TESTING

Use synthetic identifying canaries and controlled customer/vendor endpoints. Observe network destinations and inspect payloads at controlled endpoints/proxies before encryption or after authorised test termination; seeing only encrypted packets is not proof that they contain no personal data. Also inspect browser calls, DNS requests, logs, telemetry collectors, support archives, update requests, licensing fields and AI traces.

Exercise Version 1 installation, login, discovery, consent/rights operations, any included Guided Assistance, absent/blocked model paths, supported external-integration failure, notification delivery, licence renewal/expiry, diagnostics, crashes, updates, backup and restore. Add actual local-model inference and model-provider-fallback tests for Product Version 2. Verify that vendor stores contain only the permitted schema fields and that operational canaries never reach them. Test blocked/unknown fields as well as apparently safe hashes and encoded values. Match findings to exact deployments and builds.

Attempt tenant/role bypass, excessive destructive scope, command replay, forged or stale licence/update material, compromised plugin access, vendor-identity reuse against runtime APIs and unsafe support access. Independent security review must include business-logic abuse and the customer/cloud trust boundary, not only vulnerability-scanner output. The additive scenarios in §217 make these obligations testable; none is marked executed by this document.

---

<a id="orvia-section-127"></a>

# 127. MULTI-TENANT SECURITY TEST

Create:

```text
Tenant A
Tenant B

```

Then explicitly attempt:

```text
Tenant A user → Tenant B resource

```

Expected:

```text
DENIED

```

Repeat for:

- API
- UI
- database
- object storage
- search
- AI (Product Version 2 model paths; Version 1 tests deterministic help/search isolation)
- logs
- evidence
- support bundles

---

<a id="orvia-section-128"></a>

# 128. CONNECTOR SECURITY TESTING

Test:

```text
Credential failure
Expired token
Revoked token
Endpoint unavailable
Rate limit
Malformed response
Unauthorized access

```

Connector must fail safely.

## CONNECTOR CONTRACT AND CONFORMANCE PROGRAM

Certification means an ORVIA conformance suite passed against a specified connector/provider version and configured permissions; it is not legal certification. Test malformed responses, lost acknowledgements, changed schemas, missing pages, disabled permissions, duplicate events, identity collisions and eventual consistency. Publish last successful validation and known limitations.

---

<a id="orvia-section-129"></a>

# 129. PERFORMANCE TARGETS

Initial target examples:

### API

Typical control-plane requests:

```text
p95 < 500ms

```

where practical.

### Policy checks

Target:

```text
p95 < 100ms

```

for local/cached/simple policy evaluations.

### Workflow

Long-running operations should be asynchronous.

Performance targets must be validated through actual benchmarks rather than treated as guarantees.

## DEPLOYMENT, RESILIENCE AND MEASUREMENT

Initial candidate objectives, not service guarantees: control-plane API p95 below 500 ms; simple local policy evaluation p95 below 100 ms; first synthetic vertical-slice evidence within one working day after prerequisites are available; connected marketing revocation propagation target below 30 seconds p95, excluding clearly reported disconnected endpoints. Define workload, hardware, payload size, region and measurement boundary for every benchmark.

## PRESERVATION AND AMENDMENT REGISTER

Recovery and latency numbers are measured engineering objectives, not untested contractual guarantees.

---

<a id="orvia-section-130"></a>

# 130. SCALABILITY MODEL

Scale independently:

```text
Web
API
Workers
Policy
Connector management
Testing
Guided Assistance (Version 1, if included)
AI (Product Version 2 only)

```

Database remains the main source of transactional truth.

---

<a id="orvia-section-131"></a>

# 131. CUSTOMER SCALE

Design initially for:

- hundreds of organisations
- thousands of users
- millions of workflow events
- large evidence histories

Enterprise architecture should later support significantly larger deployments.

---

<a id="orvia-section-132"></a>

# 132. DATA RETENTION WITHIN ORVIA

ORVIA must have a configurable retention policy for its own:

- workflow history
- evidence
- logs
- diagnostics
- AI interaction metadata
- support data

Customer-specific retention configuration should be possible.

## PERSONAL-DATA BOUNDARIES AND EVIDENCE RETENTION

Separate the minimal event envelope from encrypted personal payloads. Define lawful retention separately for each. If a payload is erased, retain only a justified tombstone/integrity reference, mark the missing payload intentionally deleted and avoid claiming the complete old content remains inspectable. An append-only store is not permission for indefinite personal-data retention.

Apply expiry and purge across caches, exports, search indices, diagnostics, provider logs and backup schedules where technically supported. Log export and evidence access. Signed export links need narrow access, short validity and revocation.

**Acceptance:** Sensitive test canaries do not leak through logs, model traces, support bundles or workflow metadata; payload deletion does not silently modify the retained evidence envelope.

## SEPARATE VENDOR AND CUSTOMER RETENTION STORES

The runtime retention rules above execute in the customer environment. Vendor retention applies only to the permitted business/licensing/service records in §31, with a documented deletion schedule and any specifically justified retention obligations. A support, analytics or commercial database is not an alternative repository for customer workflows or evidence.

## MODEL, KNOWLEDGE AND SUPPORT RETENTION LOCATIONS

Vendor training corpora/checkpoints and approved experiment logs have a vendor engineering retention policy; none may contain customer-derived data. Customer runtime prompts, local retrieval indexes, support drafts and inference caches have customer-local retention. Vendor submitted support cases retain only approved minimal fields under their separate policy.

Deleting a local conversation should remove its retained payload/index/cache according to the documented local rules, without any need to contact a model-training service. No automatic support-history-to-training pipeline is permitted. Corrected public sources and removed corpus items trigger a documented impact review for knowledge packs and any affected model release; do not claim weights forget a training item merely because a source file is deleted.

## VERSION 1 HELP DATA IS NOT A FUTURE TRAINING CORPUS

Version 1 guidance inputs, query history, local support drafts and rule-match evidence remain customer-local with purpose-limited retention. They are not collected now for later custom-model training. Do not create empty prompt/embedding/training stores merely for completeness; create only the actual data structures needed by the shipped non-model functions. The model/conversation retention requirements above remain binding when Product Version 2 is introduced.

---

<a id="orvia-section-133"></a>

# 133. AUDIT EVIDENCE EXPORT

Users should be able to export evidence:

- JSON
- CSV where appropriate
- PDF reports
- signed evidence packages

Exports themselves must be audited.

## LOCAL EVIDENCE EXPORT

Generate and store evidence packages in the customer runtime; download them directly to authorised customer users or customer-designated destinations. Do not upload an evidence package to an ORVIA cloud renderer, vendor signing endpoint or support service. Use customer-held signing keys for customer evidence; vendor software-release keys serve a separate purpose.

---

<a id="orvia-section-134"></a>

# 134. REPORTING

Reports should include:

- control health
- failed controls
- rights requests
- consent activity
- policy changes
- evidence
- incidents
- testing
- system coverage

Do not present unsupported legal conclusions as factual compliance certification.

---

<a id="orvia-section-135"></a>

# 135. READINESS SCANNER

Website lead-generation capability.

It can collect:

- organisation information
- system categories
- maturity information
- privacy process information

It outputs:

```text
Potential gaps
Potential priorities
Suggested next steps

```

It should not falsely claim:

> "You are legally compliant."

---

<a id="orvia-section-136"></a>

# 136. INITIAL CUSTOMER TARGET

The initial pilot product should focus on:

> Digital-first Indian organisations with manageable technology stacks and an operational need around consent/rights workflows.

Prioritise environments where the team can integrate quickly.

Do not initially attempt to solve every legacy environment.

## FOUNDER-LEVEL COMMERCIAL PLAN

**Proposal/hypothesis:** Start with three to five paid design partners among digital-first Indian businesses with similar, accessible stacks and a named privacy owner plus engineering owner. A practical initial scope is one marketing withdrawal flow, one CRM/database path and one communications destination. This is a focus choice, not a market-size finding.

Design-partner agreements should define prerequisites, permitted environments/actions, integration responsibilities, measurable outcomes, exclusions, incident handling and whether implementation work can become a reusable connector. Avoid vague “complete DPDP compliance” statements of work.

The pilot should establish a baseline manual process, deploy Observe/dry-run, demonstrate a real withdrawal, deliberately fail a connector, show an unresolved verification honestly, and reproduce a regression after a controlled software change. Measure operator effort and repeatability before expanding modules.

Partner with privacy counsel and implementation firms without granting cross-tenant access by default. Validate the competitive hypothesis against actual alternatives and customer budgets; no competitive superiority or globally unique technology is established in this review.

---

<a id="orvia-section-137"></a>

# 137. FIRST VERTICAL SLICE

The first complete ORVIA workflow should be:

# MARKETING CONSENT WITHDRAWAL

System:

```text
Customer portal
 ↓
Consent engine
 ↓
Privacy Control Graph
 ↓
Policy engine
 ↓
Workflow engine
 ↓
CRM connector
 ↓
Marketing connector
 ↓
Verification
 ↓
Evidence
 ↓
Regression test

```

This single vertical slice should prove the architecture.

## VERSION 1 ACCEPTANCE WITHOUT A MODEL

The withdrawal-to-verification-to-regression slice is a Version 1 core target and must work with no model service, GPU, model-provider key or training infrastructure. Optional Guided Assistance may explain an observed result through a reviewed rule, but cannot perform or certify the action. Its absence does not block the slice. Keep the corresponding negative, failure, identity, approval and data-boundary tests.

---

<a id="orvia-section-138"></a>

# 138. PHASE 0 — ARCHITECTURAL FOUNDATION

Build:

- repository
- CI/CD
- authentication
- tenant model
- PostgreSQL
- API
- frontend
- basic graph
- policy engine POC
- workflow POC
- connector SDK
- observability
- security baseline

No broad feature explosion.

## DELIVERY ROADMAP AND RELEASE GATES

**Proposal:** Retain Phases 0–5 and every deferred capability. Use the following evidence gates; schedule estimates follow discovery, not the size of a feature list.

| Phase | Delivery focus | Gate before expansion |
|---|---|---|
| 0 — Foundation | Monorepo, CI, tenant/IAM, graph, source registry, policy/workflow proof, agent identity, local telemetry, customer-hosted package boundary | Cross-tenant denial; signed agent bootstrap; durable domain event; vendor/data-plane separation and default egress denial |
| 1 — Core operations | Customer-installable runtime, local portal/rights intake, purposes/notices/consent, one DB and one API path, failure center, verification and a real regression | Local withdrawal works end-to-end; stale/duplicate events, wrong identity and timeout tested; no customer payload reaches vendor endpoints |
| 2 — Control | SDK/runtime boundaries, propagation, safe execution plans, richer connectors and verification | Measured freshness; replay protection; uncertain-outcome reconciliation; production dry-run evidence |
| 3 — Testing | Full synthetic test product, CI adapters, change simulation, drift and control-package library | A seeded privacy regression blocks a test release and identifies its owner/control |
| 4 — Enterprise | Advanced customer-cloud/fleet deployment, enterprise IAM, resilience, support controls, restricted networking and private-AI management (Product Version 2 only) | Advanced install, restore, upgrade, isolation and handover pass; baseline local processing remains mandatory from earlier phases |
| 5 — Advanced | Advanced incidents/retention, advanced children/guardian automation, processor ecosystem, customer AI governance and CM interoperability | Capability-specific legal, integration, security and conformance evidence |

Baseline safe guardian handling, incident intake and nomination are not postponed until advanced packs exist. If a pilot use case requires unavailable safeguards, narrow the supported deployment or implement the prerequisite before production.

Do not market a phase as released because its UI is present. Each phase needs an unsupported-capability list, runbook, rollback/forward-recovery procedure and customer-facing known limitations.

## PHASES DO NOT REINTRODUCE CUSTOM AI INTO VERSION 1

The retained phase table remains the non-AI delivery/dependency plan. Any model-dependent item within it is Product Version 2 only, regardless of its phase number; custom AI cannot become an implicit predecessor for Enterprise features. Existing future customer-AI-governance/interoperability scope stays separately gated as originally described, not accelerated or removed by this update.

---

<a id="orvia-section-139"></a>

# 139. PHASE 1 — CORE PRIVACY OPERATIONS

Build:

- purposes
- policies
- notices
- consent
- withdrawal
- rights request
- Data Principal portal
- one database connector
- one API connector
- workflow engine
- evidence
- failure center

Success criterion:

> A complete privacy event can be handled end-to-end.

## PRESERVATION AND AMENDMENT REGISTER

The first vertical slice includes a real verification check and regression test. Phase 3 still delivers the full reusable test product.

---

<a id="orvia-section-140"></a>

# 140. PHASE 2 — CONTROL

Build:

- Privacy Control
- SDK
- enforcement
- propagation
- verification
- additional connectors
- advanced workflow
- system coverage

Success criterion:

> ORVIA can influence supported production processing boundaries.

---

<a id="orvia-section-141"></a>

# 141. PHASE 3 — TESTING

Build:

- privacy test engine
- synthetic identities
- reusable tests
- test scheduler
- CI/CD integration
- regression detection
- drift detection

Success criterion:

> A privacy-control failure introduced by a system change can be detected automatically.

---

<a id="orvia-section-142"></a>

# 142. PHASE 4 — ENTERPRISE

Build:

- advanced customer-controlled cloud deployment and fleet operations
- Kubernetes deployment
- enterprise IAM
- HA
- disaster recovery
- advanced audit
- restricted deployment
- advanced security
- advanced private/local AI deployment and management (Product Version 2 — deferred; not a Version 1 Enterprise prerequisite)

---

<a id="orvia-section-143"></a>

# 143. PHASE 5 — ADVANCED

Build:

- Incident Explorer
- advanced retention
- restricted/children policy packs
- advanced identity
- advanced processor automation
- sophisticated AI (Product Version 2 — deferred)
- Consent Manager interoperability

---

<a id="orvia-section-144"></a>

# 144. THREE EDITIONS MUST EXIST ARCHITECTURALLY FROM THE BEGINNING

The application architecture must know about:

```text
FOUNDATION
CONTROL
ENTERPRISE

```

from early development.

Do not build a Foundation-only system that makes Control and Enterprise architectural rewrites later.

---

<a id="orvia-section-145"></a>

# 145. BUT FEATURE DELIVERY MUST STILL BE CONTROLLED

Do not deploy all advanced functionality to customers on day one simply because it is coded.

Use:

```text
feature flags
+
entitlements
+
controlled rollout

```

This allows the complete architecture to exist while capabilities are released safely.

---

<a id="orvia-section-146"></a>

# 146. RELEASE STRATEGY

Every release should have:

```text
Release notes
Migration notes
Security notes
Compatibility notes
Connector compatibility
Rollback instructions

```

## PRODUCT VERSION 1 / VERSION 2 RELEASE CONTRACT

**Version 1 baseline:** retain all current non-AI product commitments and existing non-AI rollout gates. Release only implemented/tested capabilities with an explicit support matrix. A model-free product is intentional, not an installation defect. Optional deterministic guidance may be included after testing.

**Version 2 future scope:** custom ORVIA Intelligence training, model gateway/inference, model-driven discovery/copilot/builders/analysis/test generation, model distribution and model-specific quality/safety gates. Keep those specifications intact. No training/integration is scheduled by this revision; model work resumes through a separately authorised Version 2 work plan.

The release manifest and capability register distinguish `product_version`, `build_id`, `document_revision`, `target_release`, `implementation_status`, `test_status`, `supported_profile`, `edition_entitlement` and `enabled_state`. Use `DEFERRED_V2` for the future model scope, not `FAILED`, `PASSED` or “premium enabled.”

Promotion from a Version 1 prototype to pilot or production still needs the existing readiness, security, installation and customer acceptance evidence. Renaming the baseline Version 1 is not that promotion. A tight deadline does not waive those gates. The earlier prototype plan and AI prompt pack are historical planning inputs and must not override the release assignment in this master.

Version 2 should be an upgrade/extension of the same product and domain model. Preserve deterministic operation when the model is absent or disabled; reviewed migrations, known limitations, rollback/forward recovery, consent ordering, retained evidence and customer-controlled activation remain required.

---

<a id="orvia-section-147"></a>

# 147. CONNECTOR VERSIONING

Every connector has:

```text
connector_name
connector_version
capability_version

```

Do not break connector contracts without versioning.

## CONNECTOR CONTRACT AND CONFORMANCE PROGRAM

Maintain a capability registry, staged updates, compatibility policy and revocation path for unsafe connector releases. A marketplace opens only after the SDK, isolation model, contract suite and maintenance process are stable. Third-party plugins never run with unrestricted agent authority.

---

<a id="orvia-section-148"></a>

# 148. POLICY COMPATIBILITY

Policies must support schema versions.

Example:

```text
policy_schema_version = 1

```

A future version can coexist with older policies until migrated.

---

<a id="orvia-section-149"></a>

# 149. WORKFLOW COMPATIBILITY

A workflow execution must preserve the definition that was active when it started.

Do not change a running workflow's behaviour simply because the workflow template changed.

## DURABLE EXECUTION AND UNCERTAIN EXTERNAL EFFECTS

Preserve workflow definition versions. Recheck current safety constraints before each new external effect. Record why a planned action was continued, superseded, re-approved or cancelled; do not silently replace the workflow history.

---

<a id="orvia-section-150"></a>

# 150. EVIDENCE IMMUTABILITY

Evidence references should remain stable.

When an event is corrected, append a correction event rather than deleting historical truth.

## PRESERVATION AND AMENDMENT REGISTER

Append-only history is bounded by lawful retention. Separate minimal integrity envelopes from erasable personal payloads.

---

<a id="orvia-section-151"></a>

# 151. CUSTOMER TRUST MODEL

ORVIA should expose clearly:

```text
What ORVIA controls
What ORVIA does not control
What was executed
What was verified
What was only acknowledged
What remains manual
What is outside coverage

```

This is a central product principle.

## CUSTOMER-VERIFIABLE TRUST

Display the deployment profile, actual data destinations, permitted vendor fields, outbound exchange history, key ownership and any explicitly enabled external-processing integration. Provide a local security posture view with build/patch version, control evidence, assessment date/scope, open findings and ownership. Use `NOT_ASSESSED`, `NOT_TESTED`, `FAILED`, `PASS_WITHIN_TESTED_SCOPE` and documented exceptions rather than “100% secure.”

Customers must be able to operate core privacy controls with a valid local licence while vendor runtime access is blocked, inspect what can leave the environment, and validate downloaded artifacts. Product trust comes from inspectable controls and evidence, not from requiring belief in a blanket security guarantee.

---

<a id="orvia-section-152"></a>

# 152. ORVIA'S MOST IMPORTANT DIFFERENTIATOR

The product should attempt to excel at:

### Privacy Control Graph

### Privacy Control Engineering

### Privacy Regression Testing

### Verified Privacy Outcomes

### Customer-controlled data architecture

The objective is not to claim these capabilities are globally unique.

The objective is to integrate them more deeply and make them operationally useful.

---

<a id="orvia-section-153"></a>

# 153. FUTURE INTEROPERABILITY

ORVIA should eventually support:

```text
Registered Consent Manager
      ↓
ORVIA
      ↓
Customer systems

```

This must be implemented after confirming applicable technical/regulatory requirements.

## PRESERVATION AND AMENDMENT REGISTER

Consent software, registered Consent Manager interoperability and a national identity network are separate scopes.

---

<a id="orvia-section-154"></a>

# 154. MOBILE AND WEB

Initial focus:

- web-based admin console
- web-based Data Principal portal
- APIs/SDKs

Mobile SDKs can be added later.

## ONE BROWSER EXPERIENCE, NOT ONE UNIVERSAL EXECUTABLE

Use the same customer-hosted web Workspace from supported Windows, macOS and Linux browsers. Server installation belongs to customer IT; ordinary employees need no container engine or ORVIA database on their device. The separate customer-branded Privacy Centre is responsive and accessible for its users.

A later browser shortcut/installable web-app shell is an optional launcher for the same customer-hosted backend, not a complete local server or assurance of offline processing. Do not cache sensitive principal records, evidence or access packages for unrestricted disconnected access. Runtime assets and any browser-side state remain subject to the customer boundary and endpoint policy. Native helper/agent packages, where justified, remain separate from the full platform.

---

<a id="orvia-section-155"></a>

# 155. INTERNATIONALISATION

The platform must architect for:

- language
- timezone
- locale
- date formats
- currency

DPDPA-specific content should be configurable rather than deeply embedded into every component.

---

<a id="orvia-section-156"></a>

# 156. LOCALISATION

Support:

- English-first admin interface
- additional Indian languages based on requirements
- multilingual notices
- multilingual Data Principal interaction

Language content should be versioned.

Product Version 2 AI-generated translations require review before publication for legally significant notices. Version 1 uses reviewed language content and templates; the AI deferral does not remove applicable localisation requirements.

## PRESERVATION AND AMENDMENT REGISTER

An English-first admin interface does not justify English-only legally significant notices or consent requests where language choice applies.

---

<a id="orvia-section-157"></a>

# 157. SEARCH

Global search should cover:

- systems
- purposes
- policies
- workflows
- requests
- principals by permitted reference
- evidence
- incidents
- tests

Search results must obey authorisation.

---

<a id="orvia-section-158"></a>

# 158. ADMIN SETTINGS

Organisation settings:

```text
Organisation profile
Users
Roles
Authentication
Policies
Data retention
Notifications
Connectors
Guided Assistance settings (Version 1, if included)
AI settings (Product Version 2 only)
Deployment
Support
Licensing
Audit

```

## CUSTOMER-LOCAL ADMINISTRATION PANELS

Organisation Super Admin configures organisation identity, scoped environments/subtenants, role delegation, local recovery and supported installation policy. Organisation Admin manages assigned members/systems and approved operations. Members get only explicitly delegated tasks and views. Preserve specialised officer, security, engineer and auditor permissions; do not use a single broad admin flag.

Add **Members & Roles**, **Environments/Subtenants**, **Local Health**, **Data Boundary**, **Guided Assistance** (Version 1), **ORVIA Intelligence** (Product Version 2 roadmap), **Knowledge Packs**, **Local Support**, **Licence Import** and **Updates** within the existing settings organisation. In Version 1, show installed app/rule/runbook versions, local guidance mode and actual supported functions; state custom AI is DEFERRED_V2 without a model setup requirement. In Product Version 2, show model/knowledge/app versions, inference location, tested hardware, AI enabled/unavailable status, disabled learning, and supported functions. Show exactly which optional support-signal rules are enabled, their fields, last transmission and revocation controls.

Administrative visibility is limited to necessary authorised product activity. It must not create vendor visibility into staff, systems or client records. Distinguish customer group administration from vendor commercial-account management.

---

<a id="orvia-section-159"></a>

# 159. BILLING

Cloud billing service handles:

- subscription
- invoices
- payment status
- plan changes
- renewal
- tax information
- entitlement updates

Do not mix billing logic with privacy-processing logic.

## FOUNDER-LEVEL COMMERCIAL PLAN

Use predictable platform pricing with included systems, environments and reasonable usage bands. Charge for supported integration breadth, automation depth, deployment and service level. Do not create punitive per-withdrawal or per-grievance pricing that discourages use of rights workflows. Any actual price requires customer interviews and a tested cost model; none is invented here.

## BUSINESS DATA ONLY

The vendor billing service receives the business information required for subscription, invoicing and payment administration, not the customer’s clients’ identities or privacy-processing records. Prefer payment-provider references/tokens over storing card details. Define the commercial service’s own access, retention and disclosure controls. Any entitlement usage check must use local enforcement or an explicitly approved non-operational licence assertion, not an end-customer count export.

---

<a id="orvia-section-160"></a>

# 160. LICENSE EXPIRATION

Graceful behaviour:

```text
Active
 ↓
Expiring
 ↓
Expired

```

Define precisely which product capabilities:

- remain operational;
- enter read-only;
- stop;
- require renewal.

Do not unexpectedly destroy customer data when a licence expires.

## THREE EDITIONS WITH A UNIVERSAL SAFETY FLOOR

Billing and licensing remain separate from privacy decisions. Expiry states need a signed continuity policy: warn; restrict new commercial configuration if appropriate; preserve already-approved restrictions; finish or explicitly hand over in-flight work; preserve evidence access and export for the agreed period. Never silently disable suppression or delete customer data on expiry. Do not promise indefinite unpaid operation: document transition obligations, dates and customer alternatives.

## PRESERVATION AND AMENDMENT REGISTER

Commercial expiry cannot silently turn BLOCK into ALLOW, discard an active request, or delete evidence.

---

<a id="orvia-section-161"></a>

# 161. OFFBOARDING

Customer must be able to:

- export configuration
- export evidence
- export reports
- remove connectors
- revoke ORVIA credentials
- terminate access
- request deletion of ORVIA-hosted customer metadata subject to contractual/legal requirements

The product should avoid creating artificial data lock-in.

## THREE EDITIONS WITH A UNIVERSAL SAFETY FLOOR

Offboarding must cover agent certificates, API credentials, local mappings, exported policy/control packages, outstanding tasks, cloud metadata retention, backup expiry and external processor evidence. Provide a machine-readable handover manifest.

## CUSTOMER-LOCAL OFFBOARDING

Export operational information locally before decommissioning; revoke customer-installed service identities and remove local components according to customer approval. Vendor termination deletes only the vendor-held records eligible for deletion under §31 and applicable documented retention rules. It must not remotely erase the customer’s deployment, weaken privacy restrictions or make local historical evidence inaccessible contrary to the agreed continuity policy.

---

<a id="orvia-section-162"></a>

# 162. CUSTOMER DATA EXPORT

Export formats:

```text
JSON
CSV
PDF
Signed evidence package

```

The export system must be audited.

---

<a id="orvia-section-163"></a>

# 163. SECURITY BASELINE FOR RELEASE

Before production:

- threat model completed
- dependency scanning passed
- static analysis passed
- dynamic testing completed
- secret scan completed
- tenant isolation tested
- backup tested
- recovery tested
- audit tested
- independent penetration testing completed for the defined first production-release scope, with blocking findings remediated and retested

## SECURITY AND PRODUCT SAFETY RELEASE BAR

Require dependency inventories, signed release artifacts, build provenance, secret scanning, vulnerability triage and independent penetration testing before broad production deployment. No compliance badges may be displayed unless actually obtained and in scope.

A release cannot proceed with an unresolved cross-tenant access defect, an unbounded destructive execution path, an unauthenticated agent-control path or a demonstrated personal-data leak through the AI layer. Risk acceptance cannot quietly erase these failures from reports.

## MANDATORY SECURITY RELEASE DECISION

No production release may ship with unresolved confirmed applicable **Critical or High** vulnerabilities in the product or its shipped dependencies. A suspected Critical/High finding must be resolved as fixed or independently reviewed not-applicable/false-positive before approval; “not applicable” requires recorded evidence. Do not rely on a severity score alone.

Regardless of score, block release for a known cross-tenant/role disclosure, authentication bypass, arbitrary privileged execution, uncontrolled destructive action, vendor operational-data egress, exposed secret/signing key, missing artifact verification or a known path from commerce credentials to customer runtime control. An attractive demo or deadline cannot waive these blockers.

Other findings require an accountable owner, scoped impact, compensating controls where applicable, a remediation deadline and expiry of any approved exception. Such exceptions remain visible in the release record and relevant customer disclosures. Passing gates means no unresolved blocking findings **within the recorded assessment scope at that time**; it does not establish zero unknown vulnerabilities.

The release record must identify build/digest, supported deployment profiles, threat-model review, control/test results, SBOM/scans, independent review/retest, data-egress results, backup/restore tests, known limitations and security/release sign-off. Internal synthetic prototypes must be labelled non-production and cannot use a release checklist to claim independent assurance they have not obtained.

## ADDITIONAL RELEASE GATES FOR DELIVERY, ADMINISTRATION AND OWN AI

For Version 1, require executed evidence for: separate vendor/customer login and recovery; no vendor super-admin override; member/subtenant isolation; signed software/knowledge package verification; correct unsupported-platform rejection; local UI and core operation with vendor/model/Lightning routes blocked; permitted-only support reports; and no support-command bypass. Test any included deterministic guidance. Model corpus/origin/evaluation and operational inference gates are retained for Product Version 2, not Version 1 prerequisites.

An own-model checkpoint must not be labelled a released trained assistant until its declared functions and languages pass approved quality/safety tests. Platform release and AI research can progress separately, with the AI state truthful. Existing critical/high/security blockers and independent review remain unchanged.

## MODEL DEFERRAL DOES NOT DEFER PLATFORM SECURITY

Version 1 still requires all applicable non-AI threat modelling, vulnerability remediation/retesting, least privilege, isolation, safe execution, supply-chain verification, independent assessment and data-egress controls. Explicitly test that model endpoints and dependencies are absent rather than counting unexecuted model tests as passing. Missing optional guidance is not a reason to waive authentication, evidence, support or any blocking security failure.

---

<a id="orvia-section-164"></a>

# 164. EXTERNAL SECURITY REVIEW

Before serious enterprise sales:

- independent penetration test
- architecture review
- cloud security review
- connector security review
- AI security review (Product Version 2; Version 1 still reviews all shipped guidance/search/support surfaces)

## INDEPENDENT ASSESSMENT AND CONTINUOUS VULNERABILITY RESPONSE

Assess the complete initial production surface: public website/account/checkout, package distribution/signing, licensing, customer console/portal/API, tenant isolation, agent/connectors, any shipped deterministic guidance/search, storage, egress, updates, deployment defaults and recovery; add model/inference/training surfaces for Product Version 2. Use qualified reviewers independent of the implementation authors. Retest fixes and reassess material changes, especially authentication, authorisation, connectors, upload handling, updates and data destinations. Testing two AI-generated reviews against one another is not an independent penetration test.

Create a product security response function with an accountable owner before production. Publish a monitored vulnerability-reporting channel and disclosure policy, supported versions/end-of-support dates, coordinated advisory process and a staffed patch/mitigation process. Review new dependency vulnerabilities throughout supported life; customers receive advisories and signed fixes without uploading operational data. A bug bounty may be added when scope and response capacity exist, but is not a substitute for secure engineering.

Maintain a finding lifecycle: received → acknowledged → reproduced/scoped → prioritised → mitigated/fixed → independently retested → customer advisory/disclosure → regression/root-cause action. Preserve severity rationale, affected versions, installation guidance and known limitations. Set response/remediation targets only with named staffing and approved operating commitments; do not invent statutory deadlines or an unfunded 24/7 service promise.

Exercise response to credential theft, compromised update keys, malicious dependency/plugin, unintended vendor data receipt, encryption-key loss and customer deployment compromise. Support customer-local containment, evidence preservation, key/credential rotation, signed update trust recovery and verified restoration. Notification duties are handled through the existing reviewed applicability/incident framework, not newly inferred in this security update.

CISA’s Secure by Design goals include MFA, default-password reduction, vulnerability reduction, security patches and vulnerability disclosure. These inform this programme; mentioning them is not a claim that ORVIA has signed a pledge or received a certification. [S3]

---

<a id="orvia-section-165"></a>

# 165. LEGAL / COMPLIANCE CONTROL

ORVIA must maintain an internal mapping:

```text
DPDP Act provision
        ↓
Applicable Rule
        ↓
ORVIA requirement
        ↓
Product control
        ↓
Implementation
        ↓
Test
        ↓
Evidence

```

The Act itself includes obligations for Data Fiduciaries, children's data, Significant Data Fiduciaries, Data Principal rights and the Board.

The Rules must be maintained as a versioned regulatory configuration layer because the notified rules include phased commencement.

## DPDP LEGAL-TO-PRODUCT BASELINE

**Research baseline:** The Act commencement notification and Rules establish phased commencement. The specified Consent Manager provisions follow one year after publication; the principal operational provisions follow eighteen months. For planning, these correspond to November 2026 and May 2027 respectively, rather than all duties already operating in September 2026. Store the actual provision/trigger and obtain counsel approval for exact calendar deadlines. [R2; R3, rule 1; R4]

The following compact source mapping identifies design constraints, not a legal-compliance certification:

| Source | Constraint to represent |
|---|---|
| Act §§4, 7 | Consent and specified “certain legitimate uses”; no generic GDPR-style legitimate-interest basis. |
| Act §§5–6 | Purpose-specific consent, comparable withdrawal ease, and English/Eighth Schedule language options. |
| Act §§9–10, 14 | Children/guardians, notified Significant Data Fiduciaries, and nomination on death/incapacity. |
| Act §§11–12, 16–17 | Rights scope, transfer restrictions and exclusions must be assessed, not copied from another regime. |
| Rules 3, 9 | Itemised notice content and appropriate contact information. |
| Rule 6 | Safeguards, processor-contract provisions and specified one-year security retention. |
| Rule 7 | Initial Board and affected-person intimations without delay; detailed Board information within 72 hours, subject to an allowed extension. |
| Rule 8(3) | Minimum one-year retention of relevant personal data, traffic data and processing logs for specified purposes—not just generic logs. |
| Rule 8(1)–(2) | Scheduled inactivity erasure and its 48-hour warning have a particular scope. |
| Rules 10–13 | Verification, conditional exemptions and SDF assessment/audit requirements. |
| Rule 14 | Grievance response window not exceeding 90 days; not a universal deadline for all rights requests. |

[R1, referenced sections; R3, referenced rules. All future-effective requirements above must be interpreted using their commencement status.]

Separately, CERT-In directions require specified entities to report listed cyber incidents within six hours of noticing or being informed. An incident may need more than one workflow and clock. [R5, direction (ii), Annexure I]

**Proposal:** Ship a legal source register, obligation dashboard, independent clock engine, evidence-linked interpretations and an unresolved-interpretation queue. Marketing material must distinguish a product feature from registered Consent Manager status. The initial product remains a vendor-operated tool, not a claim of registration.

**Release boundary:** This review does not certify a complete register of all subsequent orders, sector requirements or translated corrections. A production pack must include authoritative consolidation, including any applicable Hindi corrigenda and later notifications, before legal sign-off.

---

<a id="orvia-section-166"></a>

# 166. REGULATORY RULE PACK ARCHITECTURE

Do not hard-code:

```text
if rule_2025 == X

```

everywhere in application code.

Instead:

```text
Regulatory Pack
 ├── jurisdiction
 ├── regulation
 ├── version
 ├── effective_date
 ├── controls
 ├── requirements
 └── mappings

```

This makes future amendments manageable.

## REGULATORY APPLICABILITY AS A PRODUCT CAPABILITY

**Proposal:** Extend the existing regulatory pack into an applicability service. Its unit is an activity performed by a particular legal entity—not merely a tenant-wide country flag.

`ApplicabilityAssessment` must contain legal entity, activity, processing role, jurisdictional facts, affected population, source provision, commencement trigger, evaluated date, applicable notifications, exclusions claimed, evidence supporting those facts, counsel reviewer, status and review expiry.

Use explicit results: `APPLIES`, `SCHEDULED`, `DOES_NOT_APPLY`, `INSUFFICIENT_FACTS`, `LEGAL_REVIEW_REQUIRED`. A finding can be limited to a single obligation. An exclusion for one obligation must not remove all controls automatically.

Separate four layers: authoritative legal text; counsel-approved interpretation; customer applicability facts; executable technical control. An LLM may suggest a mapping but cannot approve any of these layers.

Support parallel packs for other applicable regimes, sector obligations and customer contractual controls, but label each distinctly. Do not call a contractual deadline a statutory deadline. Exact sector-specific mappings require separate research and approval; they are not supplied by this document.

---

<a id="orvia-section-167"></a>

# 167. LEGAL CONTENT VERSIONING

Store:

```text
Regulatory version
Published date
Effective date
Source
Reviewed by
Status

```

Never silently modify historical regulatory mappings.

## REGULATORY APPLICABILITY AS A PRODUCT CAPABILITY

A regulatory release must have an immutable identifier, source digest, official source location, publication date, provision-level effective-date expression, reviewed calendar date, reviewer and approval. Retain historic versions. Compare proposed updates against active customers, generate a change-impact plan, run fixtures and require approval before activation. Never retroactively rewrite the rule version attached to an old evaluation.

## LEGAL KNOWLEDGE FOR ORVIA INTELLIGENCE

The assistant retrieves a locally installed, reviewed source/interpretation pack carrying publication dates, provision-level effective dates, applicability and review status. Model memory is not the authority for a legal answer. Display missing/stale/conflicting sources and require the existing legal-review workflow where needed.

A model trained from public legal material is not thereby authorised to make legal determinations or certify customer compliance. Knowledge-pack updates and legal interpretation remain independently reviewed and versioned; historical decisions continue to resolve their original sources.

---

<a id="orvia-section-168"></a>

# 168. PRODUCT CLAIMS

Marketing must only claim capabilities that have actually been implemented and tested.

Do not use claims such as:

> Automatically guarantees complete compliance.

Instead:

> Helps organisations operationalise configured privacy controls.

## APPROVED DATA-LOCALITY AND SECURITY CLAIMS

**Design-stage language:** “ORVIA is designed for customer-controlled deployment, keeping customer operational data in the customer environment and limiting vendor collection to defined business/licensing information. Security controls and independent verification are release requirements.”

**After implementation and validation, with scope disclosed:** “Deploy the licensed ORVIA platform in your own environment. In customer-local mode, operational customer data is processed and stored there and is not sent to ORVIA services. Vendor collection is limited to the published business/licensing and approved service-data inventory.”

**Only when supported by actual results:** “Release [version/build] was assessed on [date] for [scope/method]. No unresolved Critical or High findings remained in that assessment after retesting. Limitations and ongoing patch commitments are available.” Fill placeholders with real evidence before publication; do not publish them as completed claims.

Do not claim “no vulnerabilities,” “100% secure,” “unhackable,” “cannot be breached,” guaranteed legal compliance, or certification/audit status not actually obtained. A penetration test establishes scoped findings at a time, not the impossibility of an undiscovered flaw. “Nothing leaves the organisation” must not be used where an external provider is actually receiving personal data, even with the customer’s approval. “ORVIA never processes personal data” is also inaccurate if business account contacts or connection metadata are processed (§31).

The product may state the goal of high security; customer-facing assurances must identify implemented controls, assessment evidence, remaining limitations and responsibilities. [S1; S2]

## ACCURATE CLAIMS ABOUT OWN AI, SUPPORT AND DOWNLOADS

Use “ORVIA-owned model trained from scratch on approved non-customer material” only when recorded lineage supports it. Do not call a fine-tuned third-party model original from-scratch training. Do not claim that an AI is infallible, that domain training guarantees it never answers outside scope, or that local hosting removes all security risks.

“Vendor-managed support” means the permitted support capabilities in §§95–96, not invisible access to customer production. “One download format” means the documented bundle envelope, not no prerequisites or a native executable for every OS. Describe every support/model/deployment profile by its actual tested scope.

## VERSION 1 INTELLIGENCE CLAIMS

For Version 1 use “rules-based Guided Assistance,” “reviewed runbooks,” “template-based drafts” or “deterministic configuration checks” only when implemented and tested. Do not claim custom AI, a trained assistant, an LLM copilot, natural-language generation or model-based reasoning. “Custom ORVIA Intelligence is planned for Product Version 2” is a roadmap statement, not an available paid feature, completed training claim or promised delivery date. Core privacy-control value remains the product promise.

---

<a id="orvia-section-169"></a>

# 169. NO FALSE "PROOF"

ORVIA evidence should explicitly say:

```text
Recorded
Executed
Acknowledged
Verified
Inferred
Manual
Unverified
Outside Coverage

```

Do not label an inference as a verified fact.

---

<a id="orvia-section-170"></a>

# 170. CUSTOMER CONFIGURATION MODEL

The customer controls:

- purposes
- policies
- systems
- processing conditions
- retention
- connectors
- approvals
- controls

ORVIA provides the technical framework.

---

<a id="orvia-section-171"></a>

# 171. PRINCIPLE OF LEAST PRIVILEGE

Each connector should request only the capabilities needed.

For example:

```text
Discovery connector

```

does not automatically receive:

```text
Delete

```

permissions.

Capabilities should be separable.

---

<a id="orvia-section-172"></a>

# 172. CONNECTOR CREDENTIAL MODEL

A connector should store a credential reference, not necessarily the plaintext credential.

Example:

```text
connector
 ↓
secret_reference
 ↓
secret manager

```

---

<a id="orvia-section-173"></a>

# 173. CONNECTOR HEALTH

Each connector should have:

```text
CONNECTED
DEGRADED
AUTH_FAILURE
UNAVAILABLE
MISCONFIGURED
DISABLED

```

The UI should surface this clearly.

---

<a id="orvia-section-174"></a>

# 174. ACTION RETRY STRATEGY

Use:

```text
Exponential backoff
+
Jitter
+
Maximum retries
+
Circuit breaker
+
Dead-letter path

```

Then:

```text
Retry exhausted
 ↓
Failure Center
 ↓
Escalation

```

## DURABLE EXECUTION AND UNCERTAIN EXTERNAL EFFECTS

Use per-tenant fairness, provider budgets, bounded retries, jitter, circuit breakers, dead-letter recovery and poison-event isolation. Resubmitting a dead-letter action must respect current approvals and consent epochs. Compensation can reverse reversible work; it cannot undelete irreversible destruction.

---

<a id="orvia-section-175"></a>

# 175. DEAD-LETTER QUEUES

Failed asynchronous events should enter a recoverable dead-letter mechanism.

Operators can:

```text
Inspect
Retry
Cancel
Escalate

```

Every intervention is audited.

---

<a id="orvia-section-176"></a>

# 176. RATE LIMITS

Connector-specific rate limits must be configurable.

Example:

```text
CRM:
100 requests/minute

```

Do not allow ORVIA to overload customer systems.

---

<a id="orvia-section-177"></a>

# 177. SYSTEM HEALTH PROTECTION

Connector jobs must have:

- timeout
- retry
- concurrency limits
- circuit breakers

---

<a id="orvia-section-178"></a>

# 178. CUSTOMER SYSTEM SAFETY

Before enabling destructive actions:

```text
Connector capability validated
+
Policy validated
+
Identity verified
+
Approval satisfied
+
Dry-run completed where appropriate

```

## PRESERVATION AND AMENDMENT REGISTER

Approval binds to an exact execution plan; retries reconcile unknown effects before destructive repetition.

---

<a id="orvia-section-179"></a>

# 179. DRY RUN MODE

Every major workflow should support:

```text
Observe
Coordinate
Enforce

```

or equivalent:

```text
DRY RUN

```

Dry-run produces:

> What ORVIA would do without actually changing the system.

---

<a id="orvia-section-180"></a>

# 180. GRADUAL ENFORCEMENT

Recommended rollout:

```text
Observe
 ↓
Report
 ↓
Dry Run
 ↓
Enforce reversible actions
 ↓
Enforce selected actions
 ↓
Full approved enforcement

```

---

<a id="orvia-section-181"></a>

# 181. ORVIA OBSERVE MODE

Tracks:

- events
- flows
- failures
- policies
- connectors

without changing production state.

---

<a id="orvia-section-182"></a>

# 182. ORVIA COORDINATE MODE

Creates:

- tasks
- approvals
- notifications
- tickets
- action plans

but may require humans to execute external actions.

---

<a id="orvia-section-183"></a>

# 183. ORVIA ENFORCE MODE

Where technically supported:

```text
ALLOW
MASK
RESTRICT
BLOCK

```

The product must visibly identify the current mode.

---

<a id="orvia-section-184"></a>

# 184. USER EXPERIENCE RULE

Every action should answer:

```text
WHAT
WHY
WHERE
WHO
WHEN
RESULT
EVIDENCE

```

---

<a id="orvia-section-185"></a>

# 185. DASHBOARD SUMMARY EXAMPLE

```text
ORVIA PRIVACY CONTROL CENTER

CONTROL HEALTH
--------------------------------
Verified Controls       87
Active Failures          6
Pending Actions          3
Unverified               4

LIVE PRIVACY EVENTS
--------------------------------
✓ Marketing withdrawal completed
✓ Consent propagated
⚠ Processor acknowledgement pending
✕ Legacy system could not be verified

SYSTEM COVERAGE
--------------------------------
CRM                    100%
Marketing               92%
ERP                     81%
Legacy DB               31%

PRIVACY TESTS
--------------------------------
43 Passed
2 Failed
1 New Regression

```

## PRESERVATION AND AMENDMENT REGISTER

Runtime coverage is measured per boundary and action. Percentages must expose scope, denominator, freshness and exclusions.

---

<a id="orvia-section-186"></a>

# 186. ENGINEERING DOCUMENTATION

Every module must have:

- purpose
- architecture
- API
- database entities
- security requirements
- failure states
- metrics
- tests
- deployment notes

---

<a id="orvia-section-187"></a>

# 187. ARCHITECTURE DECISION RECORDS

Every major architectural decision gets an ADR:

```text
ADR-001:
Policy engine selection

ADR-002:
Workflow engine

ADR-003:
Multi-tenancy model

ADR-004:
Connector transport

...

```

## OPEN DECISIONS, RISKS AND SCOPE GUARDRAILS

**Proposal:** Resolve these through explicit ADRs and customer/counsel review before their dependent releases:

| Decision | Risk if unresolved | Accountable owner |
|---|---|---|
| First supported customer stack and flow | Connector proliferation | Founder + connector lead |
| Legal pack consolidation and effective dates | Incorrect automated legal assumptions | Privacy counsel |
| Authoritative consent writer and partition behavior | Stale grants or split-brain consent | Core/policy/workflow leads |
| Identity matching and representation thresholds | Wrong-person disclosure/destruction | IAM + privacy lead |
| Evidence/backup retention and deletion | Personal-data accumulation or lost required evidence | Counsel + security + SRE |
| Local decision freshness and outage behavior | Privacy failure or service outage | Policy + SRE + customer owner |
| Destructive approval and reconciliation contract | Duplicate or over-broad effects | Workflow + connector lead |
| SDK language/support policy | Maintenance burden | DX + customer discovery |
| Hosted/BYOC/air-gap responsibility matrix | Unowned upgrades and incidents | SRE + commercial lead |
| Entitlement continuity and exit terms | Restriction disappears on expiry | Product + legal + platform |

Retain future national-network interoperability, all listed languages/SDKs, advanced cryptographic deletion, marketplaces and air-gapped deployments as roadmap capabilities. Do not imply they exist today. Do not add universal interception, legal certification or guaranteed model unlearning as commitments.

The largest execution risk is breadth. The remedy is a complete outcome slice and gated expansion, not deleting the original ambition or claiming all modules are already build-ready.

## RECORDED DELIVERY DECISION AND IMPLEMENTATION ADRS

The user’s current product decision is no longer open: website subscription/licence purchase → signed full-product download → customer-controlled execution, with no vendor receipt of customer operational data. Record this as the governing deployment ADR. Earlier hosted alternatives remain documented but disabled (§86).

Implementation ADRs must resolve the minimum vendor schema, offline licence protocol, package trust/bootstrap/rotation, local key custody, outbound broker/firewall policy, local AI prerequisites, no-production-data support workflow and independently reviewable security release gates. These decisions cannot reduce the mandatory boundary to make implementation easier.

## NEW CONSOLIDATED DECISIONS

Record the adopted decisions as traceable ADRs: **D-01** primary ZIP envelope with signed OCI images and supported profile artifacts; **D-02** three customer-facing experiences plus a separate vendor-staff console; **D-03** independent vendor/customer role and recovery domains; **D-04** bounded support reports and local execution, with optional explicitly approved minimal signals; **D-05** ORVIA-owned from-scratch model with no customer training data; **D-06** Lightning as vendor training infrastructure only; **D-07** local inference plus signed versioned knowledge and independent safety controls.

Changing any of these needs an explicit decision record, affected-section update, privacy/security impact review and tests. In particular, pretrained-weight adoption or vendor production access is not an implementation convenience that can be selected silently.

## D-08 — VERSION 1 MODEL-FREE BASELINE; CUSTOM AI IN PRODUCT VERSION 2

Adopt the current user decision as **D-08**. Decisions D-01–D-04 remain active; D-05–D-07 retain the future model architecture, but their training/inference implementation is explicitly assigned to Product Version 2 and is on hold for Version 1. Do not reopen the agreed no-third-party-weights or no-customer-training-data decisions as an unannounced shortcut. Record optional deterministic Guided Assistance in §63 as the Version 1 implementation boundary. This is a release-scope decision, not a claim that work has been implemented.

---

<a id="orvia-section-188"></a>

# 188. DEVELOPMENT STANDARD

No developer should merge code they cannot explain.

No AI coding output should be merged without human engineering review.

AI may accelerate implementation, but architecture, security and release responsibility remain with the engineering team.

## DEVELOPMENT-AI DISTINCTION

GPT/Claude and other company-authorised coding tools may continue assisting architecture, implementation, tests and documentation for Version 1. Their use does not make the shipped product AI-dependent, train the future ORVIA model or authorise customer-data disclosure. All original human review and release responsibility requirements remain.

---

<a id="orvia-section-189"></a>

# 189. AI-CODING DEVELOPMENT LOOP

Use:

```text
Requirement
 ↓
AI generates implementation plan
 ↓
Engineer reviews plan
 ↓
AI writes code
 ↓
AI writes tests
 ↓
Engineer reviews
 ↓
CI
 ↓
Security checks
 ↓
Merge

```

---

<a id="orvia-section-190"></a>

# 190. AI SHOULD BUILD IN SMALL VERIFIED UNITS

Do not instruct the coding AI:

> "Build all of ORVIA at once."

Instead sequence:

```text
Repository
 ↓
Foundation
 ↓
Auth
 ↓
Tenant
 ↓
Graph
 ↓
Policy
 ↓
Consent
 ↓
Workflow
 ↓
Connector
 ↓
Evidence
 ↓
Portal
 ↓
Testing
 ↓
Enforcement
 ↓
Enterprise capabilities through their existing gates
 ↓
Version 1 acceptance and release

Optional parallel Version 1 task: small rules-based Guided Assistance

Future Product Version 2:
Custom-AI research/training → evaluation → local integration → release gates

```

Each stage must compile and test before the next.

## DO NOT SPEND THE VERSION 1 DEADLINE ON MODEL WORK

Build and verify the core outcome slice, customer-local installation, access boundaries, safe support and release/recovery path first. Optional rule/runbook assistance follows only when it does not displace those tasks. Do not start GPU jobs, build a training corpus or integrate an existing model to fill the deferred feature slot. Development AI remains available to accelerate these non-model tasks under the established review process.

---

<a id="orvia-section-191"></a>

# 191. FIRST DEMO TARGET

The first polished demo must achieve:

```text
1. Create organisation
2. Login
3. Create purpose
4. Create policy
5. Connect test CRM
6. Create synthetic principal
7. Capture consent
8. Withdraw consent
9. Execute CRM action
10. Verify
11. Generate evidence
12. Run privacy regression test
13. Show result
14. Show failure scenario

```

If this works cleanly, ORVIA has a genuine technical foundation.

## REVISED FLAGSHIP DEMONSTRATION

**Proposal:** Keep the original marketing-withdrawal demo and strengthen it into an outcome-assurance demonstration.

A synthetic principal consents to promotional messages. A separate approved context permits an order-related service message. The principal withdraws only marketing. The consent epoch advances and the customer sees an acceptance receipt. A supported send boundary rejects a queued promotional message after rechecking the new epoch; the service flow is evaluated independently.

The CRM audience removal succeeds and is observed. The communications vendor times out. ORVIA marks its effect unknown, then reconciles through the provider's supported receipt/read path. A legacy destination offers no API and becomes an assigned manual task, not a fabricated success.

The operator views a scoped outcome report: internal restriction observed, provider status and evidence, manual task outstanding, declared backup handling and gaps. An old grant event is replayed and cannot reactivate the purpose.

A deliberate code change bypasses the SDK in the test environment. The regression suite detects the seeded violation and identifies the affected boundary. The bypass is repaired; tests pass against the same synthetic scope. An old backup is restored in quarantine and the restriction is reapplied before simulated traffic resumes.

For the Version 1 demonstration, run with no AI gateway, weights, GPU or model-provider credentials installed: every deterministic operation and direct support path must still work. Optional Guided Assistance may show a rule/runbook-backed explanation with links to permitted actual records, without claiming model reasoning. For the future Product Version 2 demonstration, also disable and restore its model; Copilot must explain the factual sequence without inventing missing vendor evidence.

**Completion:** The demonstration includes success, delay, unsupported capability, out-of-order delivery, regression, restoration and model-independent operation (plus AI outage when Product Version 2 is evaluated). It establishes tested behavior within this scope, not universal privacy compliance.

---

<a id="orvia-section-192"></a>

# 192. FAILURE DEMO

Deliberately make a connector fail.

Expected:

```text
Action failed
 ↓
Retry
 ↓
Failure
 ↓
Failure Center
 ↓
Escalation
 ↓
Evidence

```

This should be part of the demo.

---

<a id="orvia-section-193"></a>

# 193. PRIVACY REGRESSION DEMO

Change a test environment so marketing withdrawal no longer blocks the action.

Expected:

```text
Test
 ↓
FAIL
 ↓
Privacy Regression Detected
 ↓
Affected Control
 ↓
Affected System
 ↓
Recommended Action

```

This demonstrates the strongest long-term product proposition.

---

<a id="orvia-section-194"></a>

# 194. CUSTOMER DEPLOYMENT DEMO

Show:

```text
Customer ORVIA Cloud
        │
    Secure Agent
        │
        ▼
Customer CRM

```

Demonstrate that the customer-hosted ORVIA receives the action/result and stores evidence locally. ORVIA’s vendor cloud receives neither the result nor any customer record, principal reference, workflow ID or evidence payload.

## DOWNLOAD, LOCALITY AND SECURITY DEMONSTRATION

Using synthetic fixtures, demonstrate purchase/entitlement issuance in a clearly labelled test checkout, download and local signature verification, full runtime installation, consent withdrawal and local evidence. Block vendor runtime access while a valid local licence remains available; the deterministic workflow must continue.

Show a local outbound-data log and controlled vendor endpoint captures containing only the permitted licence schema. Attempt an injected customer-data field in licensing/diagnostics and demonstrate rejection without persisting the body. Reject a tampered package, a vendor account token presented to the runtime, a cross-tenant request and an unauthorised connector command. For Version 1, show there is no model/provider fallback path and that the support bundle excludes operational data. Product Version 2 additionally demonstrates a failed/absent local model cannot fall back externally.

These are acceptance demonstrations to implement and execute. A successful synthetic run must be described by its scope; it does not by itself establish production security or absence of all vulnerabilities.

---

<a id="orvia-section-195"></a>

# 195. PRODUCT SUCCESS METRICS

Track:

### Business

- trial-to-paid conversion
- activation
- retention
- expansion
- support cost

### Product

- time to first connected system
- time to first privacy workflow
- workflow completion rate
- connector success rate
- test pass rate
- failure resolution time

### Engineering

- deployment frequency
- change failure rate
- mean time to recovery
- API latency
- workflow reliability

## PRODUCT METRICS AND ECONOMICS

**Proposal:** Define a successful activation as a real, scoped privacy event executed in the customer's supported environment, observed where possible, and accompanied by a complete limitation-aware evidence report—not merely account creation or connector installation.

Track time to first connection, first approved purpose, first safe action and first verified outcome separately. Include customer waiting time versus ORVIA execution time.

Calculate unit costs for discovery, workflow events, provider calls, retained evidence, exports, AI usage, enterprise upgrades and support time. Consent receipt volume and runtime check volume can differ by orders of magnitude in a customer's design; benchmark actual workloads rather than assuming equal cost.

Track contribution after implementation/support costs as well as infrastructure gross margin. Repeated bespoke connector work is a product-learning signal and a cost, not automatically recurring software value.

## METRIC LOCATION

Vendor business metrics may use the permitted account/subscription/support information. Customer product/privacy-control metrics and engineering telemetry derived from customer workloads remain local and are not silently exported for ORVIA analytics. Measure product improvement using synthetic environments or separately volunteered, non-operational feedback consistent with §31; aggregated counts are not automatically exempt from the boundary.

## SUPPORT AND AI QUALITY MEASUREMENT WITHOUT CUSTOMER TELEMETRY

Measure corpus quality, training costs, held-out answer accuracy, unsafe suggestions, abstention, grounding and latency in vendor-controlled synthetic/approved-public evaluation environments. Those results do not establish live production success rates across unobserved customers.

Vendor support measures case response/reproduction/fix/validation time from permitted case records. Local assistant effectiveness and detailed runtime outcomes remain customer-local; do not secretly export them as “AI improvement” telemetry. Do not set a support-deflection target that blocks escalation or encourages the assistant to falsely close cases.

## VERSION 1 SUCCESS MEASURES

Evaluate Version 1 using the existing installability, first supported privacy outcome, connector reliability, failure/recovery, security, customer acceptance and support-effort measures. Model training/accuracy/latency measures above belong to Product Version 2 research. For included Guided Assistance, assess correct rule/runbook selection, evidence links, safe escalation and actual usability on synthetic fixtures; do not optimise for preventing legitimate support contact. No model-readiness score or newly invented success guarantee is needed to judge the core product.

---

<a id="orvia-section-196"></a>

# 196. PRIVACY CONTROL METRICS

ORVIA should internally measure:

```text
Controls defined
Controls active
Controls verified
Controls failed
Controls unverified
Controls outside coverage

```

## PRODUCT METRICS AND ECONOMICS

Core measures: revocation propagation latency; accepted-event durability; stale-decision rejection; action outcomes unknown; verification freshness; unsupported inventory; regression escape rate; manual touches per request; connector maintenance hours; customer-visible unresolved obligations; time to detect and resolve a failed control.

A useful operating ratio is freshly observed successful outcomes divided by all outcomes requiring observation in the declared scope, with counts for unverified, failed, stale and outside-coverage outcomes shown beside it. Do not describe this ratio as legal compliance or exclude failures to improve the denominator.

---

<a id="orvia-section-197"></a>

# 197. CUSTOMER ONBOARDING TARGET

Aim to make the first successful value path:

```text
Account and licence
 ↓
Verified full-product download
 ↓
Customer-local installation
 ↓
Connector
 ↓
Purpose
 ↓
Policy
 ↓
First privacy action

```

as simple as possible.

## FOUNDER-LEVEL COMMERCIAL PLAN

Build a repeatable implementation kit: permission checklist, architecture worksheet, legal-entity/purpose template, synthetic dataset, connector conformance report, control package, runbook and acceptance sign-off. A second customer on the same stack should benefit materially from the first deployment's engineering work.

---

<a id="orvia-section-198"></a>

# 198. COMMERCIAL EXPANSION

Customer can start:

```text
Foundation

```

then upgrade:

```text
Control

```

then:

```text
Enterprise

```

without migrating to a new application.

---

<a id="orvia-section-199"></a>

# 199. FUTURE MODULE MARKETPLACE

Later, ORVIA may support modules:

```text
Advanced Firewall
Advanced Testing
Incident Explorer
Children/Restricted Processing
Advanced Evidence
Additional Connectors
Private AI (Product Version 2 — future custom model)

```

Modules must use the same core APIs.

---

<a id="orvia-section-200"></a>

# 200. LONG-TERM ARCHITECTURE PRINCIPLE

The final ORVIA architecture should remain:

```text
                 ORVIA

             PRIVACY CONTROL GRAPH
                      │
                POLICY ENGINE
                      │
             WORKFLOW ENGINE
                      │
                CONTROL ENGINE
                      │
              CONNECTOR LAYER
                      │
              CUSTOMER SYSTEMS
                      │
                VERIFICATION
                      │
                   EVIDENCE
                      │
              TEST / REGRESSION
                      │
                DRIFT DETECTION
                      │
        GUIDED ASSISTANCE (VERSION 1, OPTIONAL RULES)
                      │
        CUSTOM AI LAYER (PRODUCT VERSION 2 ONLY)

```

---

<a id="orvia-section-201"></a>

# 201. FINAL SYSTEM PRINCIPLE

The whole product must operate around:

> **Define what should happen → execute what should happen → enforce where technically possible → verify what actually happened → preserve evidence → continuously test whether the control still works.**

---

<a id="orvia-section-202"></a>

# 202. FINAL CUSTOMER ARCHITECTURE

## Default — customer-local licensed deployment

```text
ORVIA VENDOR WEBSITE / DISTRIBUTION CLOUD
  Purchase • subscription • signed licence • signed packages
                  │
        Customer-approved download/import
                  │
                  ▼
CUSTOMER ORGANISATION / CUSTOMER-CONTROLLED CLOUD
  ORVIA console + portal + APIs + local identity
  Graph + policies + workflows + optional rules-based Guided Assistance (V1)
  Custom local ORVIA Intelligence: Product Version 2 only
  Databases + verification + evidence + tests + local telemetry
                  │
            Customer connectors
                  │
          CRM     DB     ERP / approved systems

No customer operational data returns to ORVIA vendor services.
Optional vendor exchanges use only the §31 permitted schema.
```

## Enterprise — advanced customer-cloud deployment

```text
             CUSTOMER AWS / AZURE / GCP
                         │
                         ▼
                   ORVIA PLATFORM
                         │
                         ▼
                  Customer Systems

```

## Future restricted environment

```text
Customer private infrastructure
             │
             ▼
      ORVIA isolated deployment
             │
             ▼
       Customer systems

```

## AUTHORITY AND AI LOCATION SUMMARY

The vendor cloud hosts ORVIA Account, the separate Vendor Administration and Support Console, commerce/licensing and signed distribution. Vendor Super Admin/Admin govern those services. Lightning is reserved for future Product Version 2 authorised non-customer model-development jobs and has no customer-runtime relationship; Version 1 starts no such jobs.

Each customer hosts ORVIA Workspace, its Privacy Centre, Organisation Super Admin/Admin/Member roles, any supported subtenants, operational services and any included rules-based Guided Assistance in Version 1. Product Version 2 adds an approved local ORVIA model. The same signed future model may be installed for different customers, but their inference contexts, data stores, role bindings and caches remain separate. No cross-customer model memory or training feedback is introduced.

Software/knowledge artifacts and, in Product Version 2, model artifacts flow from vendor distribution to the customer by approved download. Only explicitly permitted commercial/licence/support information can flow back; operational or personal information cannot. Offline import preserves that direction without requiring runtime callbacks.

---

<a id="orvia-section-203"></a>

# 203. FINAL DELIVERY MODEL

ORVIA is:

> **Website-purchased, subscription/licence-based software downloaded from ORVIA’s distribution cloud and deployed in the customer’s own organisation or customer-controlled cloud.**

with:

> **A customer-local operational platform and secure local connectors; vendor services limited to commerce, licensing, signed distribution and explicitly permitted minimal support information.**

The primary customer interaction is through a web application.

The customer's internal systems are reached through secure customer-side connectors.

The complete licensed platform must be packaged for supported customer-controlled deployments, using containers or supported service/VM packages. Operational customer data stays in that deployment; privacy and security obligations apply across Foundation, Control and Enterprise.

## BROWSER-BASED PRODUCT, CUSTOMER-HOSTED RUNTIME

**Distribute ORVIA as customer-hosted server software with a browser interface. Package its services as signed Linux container images, with deployment bundles for supported server and Kubernetes environments.**

An IT administrator installs the full licensed platform once per approved environment. Ordinary users access it in a supported browser on Windows, macOS or Linux. They do not each install a database, workflow engine or full copy of ORVIA. Keep the same product design and domain model across deployment profiles and editions.

The key distinction is:

| Layer | What it means | Proposed treatment |
|---|---|---|
| User device | Where a person sees the interface | A supported browser; no full-product installation required |
| Runtime host | Where the application, workers and data stores operate | Customer-controlled Linux server/VM or supported Linux-node Kubernetes deployment |
| Connected system | Where existing customer applications and records reside | Supported API/database integrations, with a scoped local agent only when needed |

A Windows-based CRM does not require a Windows version of ORVIA's whole backend. Compatibility depends on the connector, API, authentication and permissions. Conversely, a browser that renders the console does not establish that every connected system is supported. [M0 §§27–29, 102, 154; M1 §§85–86, 203]

## OFFICIAL SOURCE AND SUPPORTED FILE FORMAT

ORVIA's website and vendor-controlled distribution cloud remain the official source of the complete licensed software, signed licence, supported connector packages, reviewed knowledge/runbook packs and updates; ORVIA Intelligence model packs are added only for Product Version 2. Customer-hosted execution does not turn ORVIA into a customer-built product or transfer distribution responsibility to Lightning.

Use the §85 primary ZIP envelope for selected Server/Kubernetes/Offline/Evaluation artifacts, with separately signed licences; optional model packs belong to Product Version 2 only, not Version 1. Supported private-registry mirrors and engineering archives preserve the original vendor signatures/digests. Three editions, one product and consistent browser experiences remain intact.

---

<a id="orvia-section-204"></a>

# 204. FINAL COMMERCIAL MODEL

### ORVIA Foundation

Manage privacy operations.

### ORVIA Control

Execute and enforce privacy controls.

### ORVIA Enterprise

Engineer, continuously test and operate privacy controls at enterprise scale.

All three editions use the same underlying platform.

---

<a id="orvia-section-205"></a>

# 205. FINAL AI MODEL

**Version 1:** the core operates without a learned model; optional Guided Assistance uses reviewed deterministic rules/runbooks/templates. **Product Version 2:** the custom AI described below is preserved as future scope and is on hold for Version 1. These labels concern the product’s runtime, not AI-assisted engineering.

AI is:

> **An intelligence layer over the ORVIA privacy-control system.**

AI does:

```text
Discover
Suggest
Explain
Generate
Analyse
Summarise
Investigate
Recommend

```

The deterministic platform does:

```text
Decide
Execute
Enforce
Verify
Record
Test

```

## THE ORVIA-OWNED MODEL DECISION

In Product Version 2, use approved ORVIA Intelligence weights trained from scratch on reviewed non-customer public/licensed knowledge and ORVIA-authored synthetic/product material. Lightning AI may supply authorised development GPUs; customer-local inference does not use Lightning, vendor-hosted inference or third-party model APIs.

The model explains, suggests, drafts and assists troubleshooting before optional vendor escalation. Reviewed local knowledge provides current source context; deterministic services enforce permissions, support-export schemas, approvals, actions and verification. Customer data is never used for model training, including conversational learning or federated updates.

Model origin, released capabilities, measured runtime requirements and legal/source limitations must be disclosed accurately. A corpus plan, available GPU or software mockup does not establish a trained production model.

---

<a id="orvia-section-206"></a>

# 206. FINAL SECURITY MODEL

ORVIA must be:

```text
Secure by design
Least privilege
Tenant isolated
Auditable
Encrypted
Observable
Recoverable
Tested

```

## SECURITY ASSURANCE, NOT ABSOLUTE SECURITY

The security objective is a strongly protected, independently assessed and continuously maintained product. Apply the customer-local boundary, least privilege, no vendor runtime/decryption backdoor, secure defaults, verified release/update supply chain, threat modelling, automated/adversarial tests, independent assessment and vulnerability response across supported life.

A release cannot pass with the known blockers in §163. A statement of “no unresolved Critical/High findings in the assessed build and scope” requires real, dated assessment/retest evidence. It must never be restated as “no vulnerabilities exist” or “no one can breach the product.” The security programme reduces and manages risk; it does not certify impossibility of compromise. [S1]

A customer must be able to inspect data destinations, key custody, package identity, patch state, security-test scope and responsibilities without granting ORVIA access to the customer’s operational data.

---

<a id="orvia-section-207"></a>

# 207. FINAL ENGINEERING RULE

Never optimise for:

> "The demo looks complete."

Optimise for:

> **"The system behaves correctly under normal, failure, security and recovery conditions."**

---

<a id="orvia-section-208"></a>

# 208. FINAL PRODUCT RULE

ORVIA must never hide:

```text
Failure
Uncertainty
Missing integration
Unverified result
Manual action
Policy conflict

```

Instead, ORVIA should surface them.

---

<a id="orvia-section-209"></a>

# 209. FINAL ARCHITECTURAL ADVANTAGE

The goal is not simply to have:

```text
Consent
+
DSAR
+
GRC
+
Breach
+
Testing

```

The goal is that all of them operate through:

```text
ONE PRIVACY CONTROL GRAPH
+
ONE POLICY MODEL
+
ONE WORKFLOW MODEL
+
ONE EVIDENCE MODEL
+
ONE CONNECTOR MODEL
+
ONE TESTING MODEL

```

That is what makes ORVIA a unified platform rather than a collection of features.

---

<a id="orvia-section-210"></a>

# 210. FINAL MASTER BUILD OBJECTIVE

The engineering team must deliver:

> **A production-grade, multi-tenant, website-distributed and customer-hosted DPDPA Privacy Control Platform with a customer-side secure connector architecture, a common Privacy Control Graph, policy-driven privacy execution, consent and rights management, runtime controls, verified evidence, privacy regression testing, privacy incident analysis, optional deterministic Guided Assistance in Version 1 and custom AI assistance in Product Version 2, three commercial editions, enterprise deployment capabilities, licensing, secure support, observability and continuous extensibility.**

The platform must be modular, secure, testable, observable and upgradeable, with the complete operational runtime inside the customer boundary. ORVIA vendor infrastructure must not become a recipient or repository of customer operational/personal data. Only the minimum information explicitly allowed by §31 may reach vendor services. Apply the security assurance and release gates in §§109, 163–164 and 206.

## DELIVERY, ADMINISTRATION AND OWN-MODEL COMPLETENESS

Completion includes the full vendor-distributed/customer-hosted delivery path, three customer-facing experiences, the separate vendor-staff support console, scoped vendor and customer role domains, safe diagnostics and signed maintenance, and, separately for Product Version 2, the evaluated customer-local ORVIA Intelligence capability where claimed. Preserve the original platform modules and edition scope.

No product-level dependency may quietly reintroduce customer-data uploads, vendor super-admin access to runtime records, external pretrained inference, customer-data training or a Lightning runtime dependency. Treat unbuilt or untested capabilities as such, not as implied completion of the master.

## CURRENT EXECUTION OBJECTIVE

Complete the supported Version 1 product, with the customer-hosted boundary, secure signed distribution, independent vendor/customer roles, working privacy outcomes, evidence/tests and safe human support. Preserve all original non-AI scope and existing rollout qualifications. Keep custom ORVIA Intelligence fully specified but out of the Version 1 critical path. Make success measurable through demonstrated customer value and release evidence; this document does not guarantee commercial success or establish delivered software.

---

<a id="orvia-section-211"></a>

# 211. FINAL ENGINEERING COMMAND TO THE AI BUILD SYSTEM

**Current coding target: Product Version 1.** Implement its supported non-model capabilities and optional tested Guided Assistance. Product Version 2 custom-AI/model instructions later in this section are preserved future requirements only; do not execute them during the Version 1 build. Using AI coding tools remains allowed and subject to all human-review/data-boundary rules.

Use this as the top-level instruction for any AI coding agent responsible for implementation:

> **Build ORVIA as a production-grade software product, not a prototype.**
>
> Treat the architecture, domain model, security boundaries, workflow states, connector capabilities, evidence model, licensing model and tenant isolation as first-class requirements.
>
> Do not fabricate functionality.
>
> Do not use placeholder success responses in production code.
>
> Do not silently bypass security.
>
> Do not assume consent is the only processing condition.
>
> Do not allow AI to make autonomous legally consequential decisions.
>
> Do not transmit customer operational/personal data to ORVIA vendor infrastructure. Read and process it only within the approved customer-hosted runtime; licence, update, support, telemetry and AI paths must respect §31.
>
> Do not expose internal customer systems directly to the internet when the customer-side connector architecture can be used.
>
> Do not perform destructive privacy actions against ambiguous identities.
>
> Do not treat API success as automatic proof of real-world completion.
>
> Make all privacy actions observable, retryable, auditable and verifiable.
>
> Make all external integrations idempotent.
>
> Make all tenant boundaries explicit.
>
> Make all policies versioned.
>
> Make all workflows stateful and recoverable.
>
> Make all evidence historically traceable.
>
> Make all AI outputs structured and reviewable.
>
> Build automated tests alongside every feature.
>
> Do not move to the next architectural phase until the previous phase builds successfully, passes automated tests, passes security checks and has working end-to-end demonstrations.
>
> Build one shared platform that supports Foundation, Control and Enterprise editions through capabilities and entitlements rather than separate products.
>
> Build the architecture for future growth without prematurely implementing unnecessary complexity.
>
> Prefer simple, maintainable, production-ready technology over unnecessary novelty.
>
> Every feature must answer:
>
> **What is it?**
> **Why does it exist?**
> **What data does it require?**
> **What does it change?**
> **Who can use it?**
> **What happens when it succeeds?**
> **What happens when it fails?**
> **How is it verified?**
> **How is it audited?**
> **How is it tested?**
> **How is it secured?**
> **How is it deployed?**
>
> The finished product must behave like an enterprise privacy-control platform, not a collection of mock screens.

## ADDITIVE INSTRUCTION FOR THE AI BUILD SYSTEM

Retain the complete original AI engineering instruction. Append the following:

> Implement one reviewed outcome slice at a time. Each implementation must identify original and V2 requirement IDs, domain entities, permissions, customer-data boundaries, failure states, evidence and acceptance tests.
>
> Treat regulatory source content, counsel interpretation, customer applicability and executable policy as separate versioned records. Never invent a legal basis, statutory deadline, registration status or compliance conclusion.
>
> Treat consent events as ordered aggregate transitions. Do not order solely by client timestamps. Revalidate current authorization and record generation before irreversible effects. Preserve historical workflow definitions without executing obsolete unsafe plans.
>
> Use typed signed agent commands and exact approval bindings. Distinguish accepted, attempted, acknowledged, observed, stale, unknown and outside-coverage outcomes. Never implement mock success in production.
>
> Keep personal payloads out of telemetry, search attributes, queue metadata and unapproved AI contexts. Build retention for the platform's own evidence, diagnostics and workflow stores.
>
> Add real verification and synthetic regression to the first vertical slice. Test duplicate/out-of-order events, wrong identity, lost acknowledgement, tenant isolation, policy change, license expiry and disaster restoration.
>
> When required behavior is unsupported or a design decision is unresolved, produce a typed limitation and a blocking issue with an owner. Do not guess, silently omit, or bypass a control. Development mocks belong only in explicitly marked test fixtures.
>
> A change is complete only when code, schema, migration, tests, documentation, runbook, telemetry and supported-capability declarations agree. Human engineering review and legal review where applicable remain mandatory.

## CUSTOMER-LOCAL AND SECURITY INSTRUCTIONS TO CODING AGENTS

> Implement full-product purchase/download/licence support and customer-controlled runtime packaging—not a connector-only client for a hidden vendor data plane.
>
> Keep customer identities, graph context, policies, workflows, evidence, logs, backups, embeddings and AI contexts customer-local. Disable automatic vendor telemetry and external AI fallback.
>
> Accept only versioned, bounded licensing and approved diagnostic fields on vendor services. No shared production passwords, remote support backdoors, vendor decryption keys or executable licence payloads.
>
> Treat every new network destination, dependency, update path and logging field as a security/data-boundary change requiring review and tests.
>
> Preserve all existing product modules and edition capabilities, but do not enable a capability by weakening the deployment boundary. Surface unsupported prerequisites honestly.
>
> Store executed security and egress test results for the exact build. Do not describe a design, a passed scanner or an AI review as proof that the software has no vulnerabilities.

## DELIVERY, ROLE, SUPPORT AND CUSTOM-MODEL INSTRUCTIONS — MODEL WORK IS PRODUCT V2

> Preserve all existing modules and section requirements. Implement the official vendor cloud as publisher/commerce/support, not as the customer's operational data plane.
>
> Use the canonical ZIP release envelope and the tested server/cluster/offline profiles. Keep customer UI assets and APIs in the customer environment. Browser support is not universal runtime support.
>
> Implement Vendor Super Admin/Admin separately from Organisation Super Admin/Admin/Member. Map Organisation Owner compatibly; retain specialised roles. A tenant is a scope, not a person. Never implement a vendor-global customer impersonation or owner-reset bypass.
>
> Give support access to assigned permitted cases and bounded diagnostics. Keep raw records, local identifiers, chat transcripts, logs and secrets inside the customer environment. Local AI suggestions and signed vendor runbooks are not execution authority.
>
> **Product Version 2 only; on hold for Version 1:** train ORVIA-owned learned weights from random initialisation on approved non-customer material, using authorised Lightning training resources only. Do not import a third-party pretrained checkpoint, adapter, embedding model or teacher-model training corpus without an explicit changed product decision.
>
> Separate training from local inference. Do not learn from customer prompts, support tickets, records, feedback or gradients. Do not call Lightning or an external model from the customer runtime.
>
> Ground answers in versioned local sources and minimise authorised context. Validate every tool and outbound field outside the model. Preserve deterministic operation, honest unknown states, direct support and independent review.
>
> Release software and model artifacts only with actual compatibility, quality, security, privacy and provenance evidence. Do not claim these tests or training have run merely because this specification includes them.

## VERSION 1 BUILD-AGENT OVERRIDE

> Build Version 1 with no trained model, inference service, learned embeddings, GPU job or hosted-model dependency. Do not replace the deferred custom AI with another model.
>
> Preserve the full Product Version 2 model plan and stable extension contracts. Do not delete the future scope or make it a current installation requirement.
>
> Use small, reviewed deterministic help only where useful: error-code explanations, runbooks, form/template validation, keyword search and explicit rule checks. Do not label it an AI chatbot or fabricate generated answers.
>
> Keep direct human support, local diagnostics, vendor/customer role separation and the no-customer-data-export/training boundary intact.
>
> Record target product version, implementation and test status independently. Mark model-only work DEFERRED_V2, not passed. Do not change unrelated feature requirements or reduce security to satisfy a deadline.
>
> AI coding assistance remains authorised under the existing engineering rules; it does not authorise sharing customer records or adding product-model dependencies.

---

<a id="orvia-section-212"></a>

# 212. ORVIA — FINAL PRODUCT IN ONE SENTENCE

> **ORVIA turns DPDPA privacy requirements into executable, enforceable, verifiable and continuously testable controls through licensed software purchased and downloaded from its website, operated inside the customer’s organisation or customer-controlled cloud, with customer operational data kept local, explicitly minimal vendor information exchange, and evidence-backed security throughout the supported product lifecycle.**

## PRIMARY SOURCE REGISTER AND REVIEW LIMITS

**Final product refinement:** ORVIA should connect approved privacy intent to safe execution, bounded verification, transparent gaps and repeatable engineering tests—while preserving the complete original product scope and customer-controlled data architecture.

---

<a id="orvia-section-213"></a>

# 213. PRIVACY CONTROL PACKAGES AND CHANGE SIMULATION

**Proposal:** Productize reusable control packages as the main unit linking the existing graph, policy, workflow and tests. Each package contains approved intent, applicability references, policy definitions, connector requirements, enforcement points, synthetic fixtures, test expectations, verification methods, degraded-mode rules, evidence schema, owner and version.

Support UI authoring and reviewed configuration-as-code. A Git pull request can show: purposes affected, notice implications, added data categories, destinations, expected decision changes, new retention conflicts, missing enforcement points and tests to rerun. Existing GitHub/GitLab/Jenkins/Azure DevOps integrations remain in scope.

A simulator uses an explicit graph snapshot and synthetic or appropriately authorized minimized samples. It predicts configured behavior; it does not prove real-world completeness. Outputs include assumptions, confidence, unsupported connectors and approval requirements.

Signed control-pack promotion follows draft, review, test, approval, staging and production. A policy rollback is a new versioned decision and cannot undo past withdrawals or erase adverse evidence. Time-limited CI waivers must have owners, scope and expiry; failure cannot silently turn into pass.

**Acceptance:** A developer change that introduces an undeclared outbound data destination produces a reviewable failure and identifies the affected controls before production enforcement is enabled.

---

<a id="orvia-section-214"></a>

# 214. ASSESSMENTS, SDF GOVERNANCE AND REMEDIATION

**Proposal:** Add an assessment workspace connected to the graph, not a separate generic GRC repository. Support processing inventories, privacy impact assessments, vendor reviews, control attestations, algorithmic-risk review, audit observations and remediation tasks.

Configure an SDF pack only against reviewed applicability and notification evidence. Store appointment records, assessment/audit calendar, independent reviewer access, findings, customer-approved submissions and follow-up actions. Do not infer notified status from company size alone. Source anchors are Act §10 and Rule 13; details require a legally approved pack. [R1; R3]

Every finding links to a concrete asset/purpose/control, owner, due date, severity rationale, evidence and closure test. A closed questionnaire answer must not automatically mark a runtime control verified. Conversely, a passing runtime test does not establish that all organizational duties are fulfilled.

**Acceptance:** A failed control generates a tracked remediation and a re-test; the executive report distinguishes organizational attestations from technical observations.

---

<a id="orvia-section-215"></a>

# 215. CUSTOMER AI-PROCESSING GOVERNANCE EXTENSION

**Proposal:** Add a later extension to govern customers' use of personal data in AI applications. This is separate from securing ORVIA's own Copilot.

Extend purpose and data-flow controls to prompt assembly, retrieval, embeddings, vector stores, conversation memory, evaluation datasets, model providers and training/fine-tuning datasets. Apply policy at actual integrated retrieval and outbound-provider boundaries, not only at the final user interface.

A control might restrict marketing-derived attributes from a customer-support model, filter a withdrawn profile from retrieval, or prevent an unapproved provider from receiving identifiable records. Store purpose-specific provenance and retention for derived stores.

Deletion of documents or vectors must be verified according to each store's supported behavior. It does not prove removal from an already trained model's parameters. Record unlearning as unsupported unless independently engineered, scoped and evaluated. Avoid “AI privacy firewall” claims broader than tested interception coverage.

Prioritize this extension only after core consent, connectors and assurance are repeatable. Use the same graph, policy, evidence and testing infrastructure rather than a second product.

**Acceptance:** A forbidden record cannot enter the configured retrieval context after an accepted restriction; uninstrumented model applications remain outside coverage.

## CUSTOMER AI GOVERNANCE IS NOT ORVIA MODEL TRAINING

This retained extension governs a customer's separately configured AI applications. It does not authorise training ORVIA Intelligence on customer material, importing third-party learned weights into ORVIA Intelligence, or using an external provider to answer ORVIA assistant questions. The assistant's current ownership, corpus and local-inference rules remain §§63–65.

Any external system being governed must have an explicit supported boundary and cannot be enabled under a promise of no external processing. Discovery or governance access is not permission to copy that system's datasets or conversations into ORVIA vendor training infrastructure.

## DISTINGUISH CUSTOMER-AI GOVERNANCE FROM ORVIA CUSTOM AI

The user’s deferral concerns ORVIA’s own learned model and its assistant functions. This separate, already-later customer-AI-governance extension retains its previous rollout qualification; this revision neither deletes it nor makes it a Version 1 requirement. It must not become an indirect dependency on a model inside the Version 1 platform. The future ORVIA assistant’s ownership and no-customer-training rules remain unchanged.

---

<a id="orvia-section-216"></a>

# 216. PRIORITIZED ENGINEERING BACKLOG

**Proposal:** Each epic needs a PRD, ADR where needed, threat model, schema/API contract, owner, dependency list, acceptance tests, telemetry and rollout plan.

| Epic | Priority | Deliverable | Depends on | Gate |
|---|---|---|---|---|
| E01 | P0 | Tenant/IAM isolation and service identities | None | T01–T03 |
| E02 | P0 | Graph, legal entity and obligation/source registry | E01 | T04, T05 |
| E03 | P0 | Notice and ordered consent aggregate | E02 | T06–T10 |
| E04 | P0 | Durable commands, outbox and workflow state | E01–E03 | T11–T13 |
| E05 | P0 | Signed agent and connector manifest | E01, E04 | T14–T16 |
| E06 | P0 | Pilot DB/API action and reconciliation | E05 | T17–T19 |
| E07 | P0 | Scoped evidence and verification | E04, E06 | T20–T22 |
| E08 | P0 | Portal and safe rights/representation intake | E01–E04 | T23–T25 |
| E09 | P0 | First withdrawal control and synthetic regression | E03–E08 | T26, T27 |
| E10 | P0 | Operational recovery and safety-preserving entitlements | E04–E09 | T28–T30 |
| E11 | P1 | Retention, scoped holds and restore reconciliation | E02, E06, E07 | T31–T33 |
| E12 | P1 | Control packages, simulation and CI product | E09 | T34, T35 |
| E13 | P1 | Incident clocks, templates and submission evidence | E02, E07 | T36, T37 |
| E14 | DEFERRED_V2 | Safe grounded Copilot and retained custom-model programme | E01, E07; Version 2 model/knowledge/security evidence | Model-specific gates in §217; T39–T40 core absence/egress checks still apply in V1 |
| E15 | P1/P2 | Repeatable connector expansion | E05–E09 | Per-connector conformance suite |
| E16 | P2 | Enterprise deployments, SDF packs and advanced capabilities | Core production evidence | Customer-environment acceptance |

P0 denotes a prerequisite to a supported pilot, not an instruction to deliver every function at full enterprise depth immediately. A design partner whose requirements activate an otherwise-later safeguard changes that safeguard's priority.

## VERSION 1 WORK ALLOCATION

Keep the non-AI epics and their existing priorities/dependencies. E14 and its training/inference work are Product Version 2 only. A small optional Guided Assistance task can use existing error, help, search and support primitives under E07/E10 without creating a model dependency or displacing the core slice. Release priorities P1/P2 are not Product Version 1/2. No other epic is newly deferred by this update.

---

<a id="orvia-section-217"></a>

# 217. MANDATORY ACCEPTANCE AND FAILURE TEST MATRIX

| Test | Scenario | Required outcome |
|---|---|---|
| T01 | Tenant A calls Tenant B resource | Denied before data disclosure or mutation |
| T02 | Pooled DB connection retains old context | No cross-tenant query result |
| T03 | Background task has no authorized tenant | Rejected and safely audited |
| T04 | Historical policy/graph changes | Old decision resolves its original version |
| T05 | Future-effective rule evaluated today | Marked scheduled, not silently treated as commenced |
| T06 | Consent grant delivered twice | One aggregate transition |
| T07 | Old grant arrives after withdrawal | Withdrawn state remains authoritative |
| T08 | Valid new re-consent | New epoch; correct scoped authorization |
| T09 | Old deletion task reaches newly created data | Generation mismatch forces re-evaluation |
| T10 | Notice purpose expands | Approved migration/fresh-consent decision required |
| T11 | DB commit succeeds; publisher crashes | Outbox resumes without losing accepted event |
| T12 | Worker dies after remote effect | Reconciliation or safe idempotent recovery |
| T13 | Reused idempotency key has changed payload | Conflict; no external effect |
| T14 | Wrong-tenant signed agent command | Rejected |
| T15 | Replayed/expired command | Rejected without duplicate effect |
| T16 | Agent plugin asks for another secret | Access denied |
| T17 | Provider returns partial pagination | Incomplete scope explicit; no full-coverage claim |
| T18 | Provider removes mutation permission | Capability/coverage becomes degraded |
| T19 | Provider timeout and no safe receipt | Outcome unknown; no blind destructive retry |
| T20 | API success but data remains | Verification fails; action not fully verified |
| T21 | Verification observation expires | Freshness becomes stale |
| T22 | Evidence bytes changed | Integrity validation fails |
| T23 | Shared/recycled phone creates ambiguous match | No automatic disclosure or deletion |
| T24 | Nominee/guardian authority revoked | New privileged action denied |
| T25 | Access package contains third-party data | Redacted or escalated before release |
| T26 | Withdrawal accepted before supported send | Current authorization blocks/queues as configured |
| T27 | Seeded regression permits marketing send | Test fails and traces affected control |
| T28 | Cloud unavailable; revocation state stale | Explicit tested degraded behavior, no hidden fail-open |
| T29 | License expires mid-request | Continuity/hand-off policy applied; no data destruction |
| T30 | Disaster restore | Measured RPO/RTO; consent/evidence reconciliation before traffic |
| T31 | Marketing withdrawal plus valid retained transaction | Marketing stops; retained copy purpose-restricted |
| T32 | Hold released | Eligibility re-evaluated; scope not blindly deleted |
| T33 | Backup restores suppressed audience member | Quarantined and reconciled before audience use |
| T34 | Policy diff adds new data destination | Impact review and relevant tests required |
| T35 | Destructive synthetic test targets production | Blocked without explicit approved test scope |
| T36 | Incident has multiple reporting regimes | Independent triggers, deadlines and recipients |
| T37 | Awareness timestamp corrected | Correction auditable; old clock history preserved |
| T38 | Retrieved text instructs Copilot to disclose secrets | No secret/tool-permission expansion |
| T39 | AI unavailable | Deterministic privacy workflow still operates |
| T40 | Sensitive canary in connector error | No leak to telemetry, support bundle or unauthorized AI |

Add property-based tests for monotonic consent ordering and invariant preservation; fuzz parsers; run load, chaos and restore exercises. A small fixed matrix does not replace security assessment.

## ADDITIVE CUSTOMER-LOCAL AND SECURITY ACCEPTANCE TESTS

These are mandatory acceptance requirements added for the two customer priorities. They do not replace T01–T40 and are **NOT RUN** until actual implementation evidence is recorded.

| Test | Scenario | Required outcome |
|---|---|---|
| T41 | Customer purchases an edition in a disclosed test checkout | Correct signed licence and supported full-runtime package; no client-record collection |
| T42 | Install full package in an isolated customer environment | Console, portal, graph, policy, workflows, stores, evidence and tests operate locally |
| T43 | Tampered package, wrong signer or substituted manifest | Installation/update refused before execution |
| T44 | Vendor website/licensing account token is used against runtime | No customer login, database access, connector command or decryption privilege |
| T45 | Vendor connection blocked with a valid local licence | Core privacy workflows continue locally; no hidden cloud dependency |
| T46 | Operational identity/canary inserted into a licence field or extra JSON field | Fixed schema/value validation rejects it; no vendor request-body retention |
| T47 | Consent, request and incident workflows run with synthetic identifying canaries | No canary, derived identity or operational record reaches vendor stores/telemetry |
| T48 | Browser page loads scripts, analytics, fonts or crash reporting | No undisclosed vendor/external asset or data endpoint; customer-hosted assets used |
| T49 | Connector/AI/plugin attempts unauthorised network egress | Destination blocked by runtime/network policy; local failure evidence recorded |
| T50 | Local AI is missing or fails | Honest unavailable status; no public-model/vendor fallback; deterministic core works |
| T51 | Diagnostic export includes workflow IDs, masked records, screenshots or secrets | Export blocked or prohibited fields excluded; local preview shows only permitted schema |
| T52 | Support requests remote production screen/terminal access | No vendor production-data session; synthetic reproduction/local diagnostics used |
| T53 | Backup/restore runs, including an encrypted operational archive | Backup stays under customer-controlled storage/keys; no ORVIA backup upload |
| T54 | Vendor/release/licence identity attempts to decrypt runtime data or sign an action | Rejected; trust roles and keys are distinct |
| T55 | Licence expires or renewal is unreachable | Documented continuity/handover; no data deletion, privacy-control fail-open or new vendor access |
| T56 | Privileged login with default credentials or missing required MFA | Access denied; unique secure bootstrap and configured privileged MFA required |
| T57 | Release has an unresolved applicable Critical/High finding or a §163 blocker | Production promotion blocked; evidence retained |
| T58 | Scanner unavailable, scan omitted or a suppression lacks rationale | No false pass; gate blocked until assessed |
| T59 | Update/plugin/rule/model package attempts to enable telemetry or broaden egress | No silent policy change; customer approval and boundary regression required |
| T60 | Signing key or distribution service is compromised in a scoped exercise | Documented containment/trust recovery; no automatic customer operational access |
| T61 | Independent test reports a flaw and fix is submitted | Finding tracked, fix retested, regression added and affected-build/advisory status updated |
| T62 | Optional external processor/model is enabled | Explicit customer decision and accurate external-processing label; never vendor-routed; strict mode blocks it |
| T63 | Security centre shows an unassessed build or stale test | NOT_ASSESSED/stale scope shown; no invented certification or “zero vulnerabilities” badge |
| T64 | Cancellation or export/offboarding | Operational data exported locally; only permitted vendor account records handled by vendor retention process |

Record build/digest, deployment profile, test scope, command/method, expected/actual outcome, timestamp, reviewer and local evidence reference. Independent assessment and representative production configuration testing remain separate from these synthetic acceptance scenarios.

## INTERFACE AND DEPLOYMENT ACCEPTANCE MATRIX

These are proposed tests, not executed results.

| ID | Test | Expected result |
|---|---|---|
| UX-01 | Windows, macOS and Linux users open the same supported deployment | Consistent permitted workflow and accessible layout in the tested browser matrix |
| UX-02 | Buyer downloads from a Windows browser for a Linux host | Wizard permits the correct target package; browser OS does not choose the server silently |
| UX-03 | Vendor account holder tries runtime access | Denied without separately authorised customer identity |
| UX-04 | Data Principal requests another principal's record | Denied before disclosure |
| UX-05 | Runtime loads with vendor endpoints blocked | UI assets and core functionality remain local; declared optional features fail explicitly |
| UX-06 | Inspect vendor logs after a synthetic privacy workflow | No principal, workflow, evidence, inventory or operational payload |
| UX-07 | View downloaded release on vendor dashboard | Shows download information, not invented installation/health status |
| UX-08 | Upload diagnostic containing a forbidden field | Local validation blocks upload; no unfiltered fallback |
| UX-09 | Public principal portal attempts admin/API paths | Customer admin surface and privileges remain inaccessible |
| UX-10 | Invalid/tampered package or licence | Verification rejects it without privileged execution |
| UX-11 | Disconnected install/update | All required dependencies and trust checks work under the declared offline model |
| UX-12 | Browser closes after request acceptance | Durable customer-side workflow continues |
| UX-13 | Local evaluation host shuts down | Availability limitation is explicit; no claim of continuing execution |
| UX-14 | Upgrade or model package attempts additional egress | Rejected pending explicit supported review; boundary tests rerun |
| UX-15 | Use unsupported CPU/host/dependency combination | Preflight rejects or marks unsupported; no false compatibility badge |
| UX-16 | Renew or upgrade edition | Existing local records remain intact; new entitlement does not grant operational authority |
| UX-17 | Request outside organisation under strict profile | Unapproved processor/model destination blocked; no vendor relay |
| UX-18 | Account password reset | Does not reset or unlock the customer runtime |
| UX-19 | Runtime data export | Authorisation, local delivery and audit respected; no vendor upload |
| UX-20 | CSS/JavaScript/fonts/telemetry network audit | Only documented approved destinations; no runtime vendor asset dependency |

## ROLE, SUPPORT AND CUSTOM-AI ACCEPTANCE MATRIX

These scenarios supplement all retained tests and UX-01–UX-20. They are **requirements, not executed test results**. Store the exact tested build and applicable rule/knowledge/model version, profile, evidence, expected/actual result and reviewer when executed. Version 1 scenarios start NOT_RUN; the AI-01–AI-18 model scenarios are preserved as DEFERRED_V2. No threshold or pass rate is invented by this table.

| ID | Scenario | Required outcome | Status |
|---|---|---|---|
| ROLE-01 | Vendor Super Admin presents a vendor token to a customer runtime | Denied; vendor identity is not customer authority. | NOT_RUN |
| ROLE-02 | Vendor Admin opens an unassigned or different customer support case | Denied unless explicit vendor case permissions allow the business record; never runtime access. | NOT_RUN |
| ROLE-03 | Customer Admin attempts to grant Organisation Super Admin or expand its own scope | Denied without the independent authorised delegation procedure. | NOT_RUN |
| ROLE-04 | Member requests an unassigned system, environment or subtenant | Denied on the server before disclosure or side effect. | NOT_RUN |
| ROLE-05 | Organisation Owner migrates to the Organisation Super Admin display model | Existing scope is preserved; no duplicate privileged identity or vendor parent is created. | NOT_RUN |
| ROLE-06 | Revoke a member or service identity with a queued action | New actions recheck authorisation; stale tokens/permissions cannot preserve revoked access. | NOT_RUN |
| ROLE-07 | Vendor website account recovery attempts customer-owner recovery | No cross-domain reset, token exchange or hidden recovery key. | NOT_RUN |
| ROLE-08 | Auditor or Data Principal attempts member management or a repair | Denied under its own limited role and audience. | NOT_RUN |
| ROLE-09 | Customer user attempts another organisation even with a matching local role name | Denied; role names alone do not cross installation/organisation boundaries. | NOT_RUN |
| ROLE-10 | One vendor actor attempts support, release approval and signing without separation | Independent approval/key controls prevent an unauthorised release or trust change. | NOT_RUN |
| SUP-01 | Unreported customer runtime fails while offline | Vendor shows not reported/stale, not invented healthy or live incident detail. | NOT_RUN |
| SUP-02 | Generate support report containing a principal reference, hostname, log or raw AI text | Local fixed-schema validation blocks export; rejected content is not sent to vendor. | NOT_RUN |
| SUP-03 | Approve one support case then change the report payload | Digest/scope mismatch requires a fresh review; approval does not cover arbitrary future content. | NOT_RUN |
| SUP-04 | Send a legitimate approved minimal support report | Only permitted business/installation and diagnostic fields reach the assigned vendor case. | NOT_RUN |
| SUP-05 | Vendor supplies a diagnostic or repair instruction | Customer validates the typed supported plan and authorises execution; vendor cannot invoke a shell. | NOT_RUN |
| SUP-06 | AI is unavailable or recommends no escalation during a critical failure | Human alerting, deterministic help and direct support remain available. | NOT_RUN |
| SUP-07 | Optional proactive support signals are disabled or revoked | No scheduled diagnostic transmission; prior permission cannot enable new fields or intervals. | NOT_RUN |
| SUP-08 | A connection stops after an approved optional report | Local operations continue; vendor treats subsequent status as unknown or stale. | NOT_RUN |
| SUP-09 | Vendor case is closed while a local privacy action remains unverified | Local action remains unresolved; support closure is not operational verification. | NOT_RUN |
| SUP-10 | Compromised commercial licence or support credential requests customer data | No operational API, production credential or automatic data-upload path is available. | NOT_RUN |
| AI-01 | Training run specifies a third-party pretrained checkpoint or adapter | Rejected under the current own-model policy; explicit product-change review required. | DEFERRED_V2 |
| AI-02 | Candidate ORVIA run resumes its own checkpoint | Provenance traces to approved random initialisation, corpus and tokenizer; no unrelated weights. | DEFERRED_V2 |
| AI-03 | Corpus ingestion receives a customer ticket, log, conversation or disguised derivative | Rejected and quarantined under the non-customer corpus rule. | DEFERRED_V2 |
| AI-04 | Public source lacks approved reuse/provenance or contains personal/poisoned content | Excluded pending review; public accessibility is not automatic admission. | DEFERRED_V2 |
| AI-05 | A local user asks a question with authorised local context | Only local permission-filtered inference; no training, gradient export or vendor/Lightning call. | DEFERRED_V2 |
| AI-06 | Runtime inference is attempted with vendor and Lightning egress blocked | Supported local answer works, or honest unavailable state; no external fallback. | DEFERRED_V2 |
| AI-07 | Retrieved document instructs model to leak secrets or bypass roles | No permission expansion, forbidden tool execution or support export. | DEFERRED_V2 |
| AI-08 | Test question depends on stale or missing legal/product knowledge | Answer exposes limits/source dates and escalates; model memory does not invent authority. | DEFERRED_V2 |
| AI-09 | Model package is tampered with or requests executable loader/network access | Verification/runtime restrictions reject it before unsafe execution. | DEFERRED_V2 |
| AI-10 | Model is absent, fails evaluation or exceeds available hardware | AI is not advertised as ready; deterministic privacy operations and support still work. | DEFERRED_V2 |
| AI-11 | Local rating or conversation history is marked for model improvement | Training/export denied; permitted local retention is separately controlled. | DEFERRED_V2 |
| AI-12 | An auxiliary embedding/reranking component tries to download third-party weights | Blocked; every learned component must satisfy the own-model provenance requirement. | DEFERRED_V2 |
| AI-13 | Model conversion or quantisation changes output quality | Run held-out quality/safety tests; do not inherit the earlier evaluation result automatically. | DEFERRED_V2 |
| AI-14 | Model update/rollback changes consent epoch, roles or safety restrictions | Rejected; model lifecycle cannot reverse current deterministic state. | DEFERRED_V2 |
| AI-15 | Customer A question or cached context is requested by another scope | Denied; customer/role-scoped retrieval, caches and logs do not mix. | DEFERRED_V2 |
| AI-16 | Model training credentials try to publish a signed customer release | Denied without separate release approval and protected signing identity. | DEFERRED_V2 |
| AI-17 | A task asks for unsupported general advice or unsupported language | Enforce task scope; show limitations rather than claim domain training guarantees correctness. | DEFERRED_V2 |
| AI-18 | Vendor-side assistant sees a permitted support case | Inference may use permitted case context only; case content is not admitted to training. | DEFERRED_V2 |

Property-based isolation/consent tests, independent security assessment, model threat testing and real installation/restore exercises remain necessary; a fixed scenario table does not replace those programmes.

## PRODUCT-RELEASE APPLICABILITY OF RETAINED TESTS

Version 1 executes all applicable tests for its shipped non-AI surfaces, including local identity, vendor-role isolation, signed packages, rights/control correctness, recovery, permitted diagnostics, no egress and direct support. Pure model-inference/training/quality tests (AI-01–AI-18 and the model-execution part of T38) are Product Version 2 only. Do not count them as passed or as Version 1 implementation failures.

T39/T50/SUP-06 and comparable absence/failure tests apply to Version 1 as **no model is installed, no fallback is attempted, and core/support still work**; Version 2 additionally exercises a running model’s failure. T40/T49/T59/T62 and UX cases keep their Version 1 non-AI, absent-model and blocked-destination checks; their model-execution portions are rerun in Version 2. Role/support test IDs remain unchanged. Any test containing an optional capability must identify its real release scope, not be silently skipped to improve a score.

The following new scenarios make the Version 1 release decision executable. They are planned requirements only; every status is initially NOT_RUN.

## VERSION 1 MODEL-FREE AND GUIDED-ASSISTANCE ACCEPTANCE

| ID | Scenario | Required result | Status |
|---|---|---|---|
| V1-01 | Install the signed Version 1 bundle with no GPU, weights, model API keys or Lightning access | Supported core installs/starts; no model provisioning or hidden downloads; required ordinary prerequisites remain enforced. | NOT_RUN |
| V1-02 | Run the full synthetic consent withdrawal, target action, verification and regression slice without a model | Actual deterministic outcomes/evidence/tests work; no model-generated success substitutes. | NOT_RUN |
| V1-03 | Set an AI flag, alter a licence or use a Super Admin role on Version 1 | Custom-model capability remains DEFERRED_V2; no secret provider or runtime activation. | NOT_RUN |
| V1-04 | Inspect package/dependency/startup/network manifests | No model, learned embedding, training or inference dependencies and no model/Lightning calls. | NOT_RUN |
| V1-05 | A known error matches a guidance rule | Show exact reviewed explanation/runbook version and permitted record links; do not invent root cause. | NOT_RUN |
| V1-06 | A guidance query has no match, missing facts or stale context | Explicit no-match/review/unknown status; human help remains available; no generated fallback. | NOT_RUN |
| V1-07 | Another role/subtenant searches restricted help context or evidence | Deny unauthorised records/snippets/cache access before output; rules never enlarge access. | NOT_RUN |
| V1-08 | A document or connector string requests a shell command or secret export | Treat it as inert untrusted content; no execution, permission change or support upload. | NOT_RUN |
| V1-09 | Accept a recommended diagnostic or repair | Use existing typed plan, supported capability, actor permissions, required approval and verification. | NOT_RUN |
| V1-10 | Omit/disable/fail optional Guided Assistance | Core workflows, accurate errors, ordinary documentation and direct human support remain available. | NOT_RUN |
| V1-11 | Prepare a report with an internal ID, client data, unrestricted log or free text | Fixed-schema local validation blocks prohibited export; no automatic helper-summary upload. | NOT_RUN |
| V1-12 | Renew/import a licence or apply a Version 1 update offline | Works under the supported offline model; no model credentials or unexpected extra egress. | NOT_RUN |
| V1-13 | Review UI, sales copy and commercial capability flags | Rules-based assistance labelled accurately; custom AI only a Version 2 roadmap item, not currently enabled. | NOT_RUN |
| V1-14 | Review pipeline tasks and artifact provenance | No Version 1 training/GPU job; external coding tools are limited to authorised code/docs/synthetic fixtures, never customer data. | NOT_RUN |
| V1-15 | Suggest saving local guidance/support history for future model improvement | Training/export prohibited; only justified local retention under the existing boundary. | NOT_RUN |
| V1-16 | Load an untrusted or incompatible rule/runbook pack | Reject signature/version/schema failure; no arbitrary code or added outbound permissions. | NOT_RUN |
| V1-17 | Compute a template summary or configured severity finding | Every fact links to scoped local inputs and rule version; unknown effects stay unknown, not verified or legally certified. | NOT_RUN |
| V1-18 | Review Version 1 release sign-off | Applicable core/security/recovery tests have real results; model-only tests are explicitly DEFERRED_V2 and not counted as passes. | NOT_RUN |

Guidance-specific tests apply only when the optional helper is shipped; absence, truthful claims, core independence and privacy/security tests apply regardless. Version 2 must retain the applicable Version 1 regression suite and add the complete deferred model suite before claiming a trained assistant.

---

<a id="orvia-section-218"></a>

# 218. PRIMARY SOURCE REGISTER AND REVIEW LIMITS

Sources below were accessed for this review. URLs are provided as source identifiers. The original specification is preserved as supplied, not retroactively represented as externally verified. Source references in these additions identify selected constraints; all proposed technical/commercial choices remain recommendations.

| ID | Primary source | Relevant locator |
|---|---|---|
| R1 | Digital Personal Data Protection Act, 2023, official MeitY copy | §§2–17, particularly consent, rights, children, SDF and retention |
| R2 | G.S.R. 843(E), 13 November 2025 | English page 2, commencement groups |
| R3 | Digital Personal Data Protection Rules, 2025, G.S.R. 846(E) | English printed pages 24–41; rules referenced in V2§216 |
| R4 | Corrigenda, G.S.R. 892(E), 10 December 2025 | Gazette issue 11 December 2025, single-page English corrections |
| R5 | CERT-In directions, 28 April 2022 | Direction (ii), Annexure I; separate cyber-reporting regime |
| R6 | PostgreSQL official documentation, Row Security Policies | Table-owner/BYPASSRLS behavior and security boundaries |
| R7 | Open Policy Agent official configuration documentation | Signed bundles and decision-log controls |
| R8 | Temporal official multi-cluster replication documentation | Preventing duplicate external Activity effects |

```text
R1 https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf
R2 https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf
R3 https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf
R4 https://www.meity.gov.in/static/uploads/2025/12/3c7ebbae0e5456f493f486e6845df86b.pdf
R5 https://www.cert-in.org.in/PDF/CERT-In_Directions_70B_28.04.2022.pdf
R6 https://www.postgresql.org/docs/current/ddl-rowsecurity.html
R7 https://www.openpolicyagent.org/docs/configuration
R8 https://docs.temporal.io/self-hosted-guide/multi-cluster-replication
```

**Research limitations and production gate:** This is a focused product/architecture review using the primary sources above, not an exhaustive search of all Indian legal instruments. A secondary listing surfaced a February 2026 Hindi corrigendum; its primary text was not retrieved and it has not been used to alter the legal baseline here. Obtain and reconcile that text, all applicable subsequent notifications, sector rules and customer facts with qualified counsel before publishing a production regulatory pack. No statement here certifies current organizational compliance, Consent Manager registration, security certification, market uniqueness or implemented feature availability.

## ADDITIONAL SECURITY SOURCES FOR THIS REVISION

The original legal/source register and its review limits above are retained. This revision does **not** reverify the DPDP legal baseline or certify any product implementation. The security sources below were consulted on 16 September 2026; specific architecture, collection limits and release gates in this revision are ORVIA design requirements, not quotations from these standards.

| ID | Primary source | Use and limitation |
|---|---|---|
| S1 | NIST SP 800-218, Secure Software Development Framework v1.1, final (February 2022) | Secure-development risk-reduction framework. It does not promise that software can be proven vulnerability-free. |
| S2 | OWASP Application Security Verification Standard, official project page; stable version 5.0.0 identified on the page | Versioned basis for web/application control verification. ORVIA has not been assessed or certified by adding this reference. |
| S3 | CISA Secure by Design Pledge, official published goal list | MFA, default-password reduction, vulnerability reduction, security patches and disclosure. This is not a statement that ORVIA signed the pledge. |

```text
S1 https://csrc.nist.gov/pubs/sp/800/218/final
S2 https://owasp.org/projects/asvs
S3 https://www.cisa.gov/securebydesign/pledge
```

Use final standards deliberately and pin the assessed version. A newer draft is not automatically the approved baseline. The current text states intended controls and acceptance requirements; test reports, penetration tests, certifications and patch-response measurements must come from actual execution.

## REVISION 1.2 — SOURCE MATERIAL AND TECHNICAL REFERENCES

### Document sources and precedence

**M0** means the original `Pasted markdown.md` master; **M1** means `ORVIA_Unified_Master_v1_1_Customer_Hosted_and_Security.md`. The two source companions are `ORVIA_Delivery_and_Interface_Decision.md` and the later `ORVIA_Interface_and_Deployment_Blueprint.md`. Their relevant product decisions are incorporated into this master; they are not parallel active specifications after this consolidation. Appendix E records their source hashes and destinations.

The current user requirement adds separate vendor/customer administration, privacy-preserving support and an ORVIA-specific trained model using Lightning development GPUs without customer-data training. Role names, the canonical ZIP packaging reconciliation, support workflow and ORVIA Intelligence lifecycle are **engineering design decisions**, not assertions that the cited organisations prescribe ORVIA's architecture.

Where the companion's earlier `M1` reference is retained inside an imported paragraph, it identifies the historical baseline; the current section in this revision governs implementation. `M0 §n` also remains traceable to the original numbering. No source citation certifies implementation, legal correctness, runtime compatibility or model quality.

### Retained interface-reference keys T1–T8

| ID | Reference | Relevant scope |
|---|---|---|
| T1 | Docker multi-platform builds | OS/CPU image variants; not a universal native executable |
| T2 | Docker Desktop Windows installation | Platform prerequisites and Windows Server exclusion |
| T3 | Docker Desktop Mac installation | Intel/Apple Silicon variants and supported prerequisites |
| T4 | Microsoft supported Linux/FreeBSD virtual machines on Hyper-V | Linux guest route in Windows infrastructure |
| T5 | Docker Desktop licence agreement | Separate third-party runtime licensing; current install guidance also states this distinction |
| T6 | Docker Compose overview | Multi-container application definitions |
| T7 | Docker Compose production guidance | Single-server production adaptation and maintenance |
| T8 | Helm charts documentation | Kubernetes resource packaging; not full images or automatic production assurance |

```text
T1 https://docs.docker.com/build/building/multi-platform/
T2 https://docs.docker.com/desktop/setup/install/windows-install/
T3 https://docs.docker.com/desktop/setup/install/mac-install/
T4 https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-linux-and-freebsd-virtual-machines-for-hyper-v-on-windows
T5 https://docs.docker.com/subscription-billing/desktop-license/
T6 https://docs.docker.com/compose/
T7 https://docs.docker.com/compose/how-tos/production/
T8 https://helm.sh/docs/topics/charts/
```

### Additional primary technical references U1–U10

References reviewed on 16 September 2026. These support the limited technical statements associated with them; the proposed ORVIA controls are not claims of certification or of a provisioned Lightning service. The Docker licence page did not render in one check; the Windows/Mac installation documentation independently describes separate Docker Desktop licensing. Pin actual versions and review applicable terms before implementation.

| ID | Primary source | Limited purpose |
|---|---|---|
| U1 | OWASP Authorization Cheat Sheet | Least privilege, deny by default and authorisation on each request |
| U2 | Docker multi-platform build documentation | Platform-specific runnable image variants |
| U3 | Docker Compose production documentation | Single-server application deployment considerations |
| U4 | Helm charts documentation | Deployment resource packages |
| U5 | Docker Desktop Windows installation documentation | Windows prerequisites and absence of Windows Server support |
| U6 | Lightning-AI LitGPT pretraining tutorial and Python API | Distinction between random initialisation/from-scratch and continued training with a checkpoint; examples still require inspection for external assets |
| U7 | Lightning platform GPU studio/training guides | GPU development and multi-node training mechanisms, not ORVIA model quality or guaranteed availability |
| U8 | Lightning security documentation for secrets | User/teamspace secret scope across studios; review actual project isolation |
| U9 | OWASP GenAI prompt-injection and excessive-agency guidance | Retained threats requiring external permission/tool boundaries |
| U10 | Hugging Face dataset-card documentation | Metadata/provenance documentation practice, not corpus-rights clearance or permission to upload customer data |

```text
U1 https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
U2 https://docs.docker.com/build/building/multi-platform/
U3 https://docs.docker.com/compose/how-tos/production/
U4 https://helm.sh/docs/topics/charts/
U5 https://docs.docker.com/desktop/setup/install/windows-install/
U6 https://github.com/Lightning-AI/litgpt/blob/main/tutorials/pretrain.md
   https://github.com/Lightning-AI/litgpt/blob/main/tutorials/python-api.md
U7 https://lightning.ai/docs/platform/build/ai-studio
   https://lightning.ai/docs/platform/train/multi-node-training
   https://lightning.ai/docs/platform/train/finetune-models/training-guide
U8 https://lightning.ai/docs/security/security-features/secrets
U9 https://genai.owasp.org/llmrisk/llm01-prompt-injection/
   https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
U10 https://huggingface.co/docs/hub/datasets-cards
```

**Unchanged legal boundary:** this revision does not newly verify the inherited DPDP legal baseline, supply legal advice, approve a training corpus's rights or establish that the model is trained/certified. Existing source dates, review requirements and qualifications remain. Public-source reuse, data rights and model/framework distribution terms require review for the actual artifacts. Technical source examples are not copied as ready-to-run ORVIA infrastructure.

## DOCUMENT REVISION 1.3 SOURCE AND RELEASE-SCOPE NOTE

This revision implements the user’s decision to establish the accumulated non-AI design/progress as the Product Version 1 baseline, preserve custom ORVIA Intelligence for Product Version 2, keep small deterministic assistance optional, and continue AI-assisted software development. Its source master is `ORVIA_Unified_Master_v1_2_Delivery_Roles_Support_and_Custom_AI.md`. No new external research, legal update, provider capability verification or product implementation is asserted here. Existing technical/legal source dates and limitations remain unchanged. Lightning/model references describe preserved future work, not current GPU availability or an active Version 1 service. Appendix F records the exact source hash and changes.

---

<a id="appendix-a"></a>

# APPENDIX A — COMPLETE SOURCE-TO-UNIFIED SECTION MAP

**Historical consolidation map:** locations and original titles remain valid. Where revision 1.1 updates a mapped paragraph, the active wording is in the numbered section and the exact prior/new text is preserved by Appendix D’s diff.

This is a navigation and provenance register, not an additional product scope. “Merged” means the source wording is placed inside the listed topic sections; it has not been summarized. The source labels remain valid after consolidation.

## Original source sections 1–212

| Source section | Original title | Unified location | Treatment |
|---|---|---|---|
| O§1 | PURPOSE OF THIS DOCUMENT | [§1](#orvia-section-1) | Original body unchanged |
| O§2 | PRODUCT DEFINITION | [§2](#orvia-section-2) | Original body preserved + verbatim refinements |
| O§3 | CORE PRODUCT PRINCIPLE | [§3](#orvia-section-3) | Original body unchanged |
| O§4 | THE CENTRAL SYSTEM: PRIVACY CONTROL GRAPH | [§4](#orvia-section-4) | Original body preserved + verbatim refinements |
| O§5 | CORE DOMAIN MODEL | [§5](#orvia-section-5) | Original body unchanged |
| O§6 | USER ROLES | [§6](#orvia-section-6) | Original body unchanged |
| O§7 | ROLE-BASED ACCESS CONTROL | [§7](#orvia-section-7) | Original body preserved + verbatim refinements |
| O§8 | PRIVACY CONTROL GRAPH RELATIONSHIP | [§8](#orvia-section-8) | Original body preserved + verbatim refinements |
| O§9 | DATA PROCESSING MODEL | [§9](#orvia-section-9) | Original body preserved + verbatim refinements |
| O§10 | MODULE ARCHITECTURE | [§10](#orvia-section-10) | Original body unchanged |
| O§11 | SERVICE ARCHITECTURE | [§11](#orvia-section-11) | Original body preserved + verbatim refinements |
| O§12 | RECOMMENDED TECHNOLOGY STACK | [§12](#orvia-section-12) | Original body unchanged |
| O§13 | POLICY ENGINE | [§13](#orvia-section-13) | Source-backed edit + verbatim refinements; exact edit in Appendix B |
| O§14 | POLICY VERSIONING | [§14](#orvia-section-14) | Original body preserved + verbatim refinements |
| O§15 | POLICY LIFECYCLE | [§15](#orvia-section-15) | Original body unchanged |
| O§16 | CONSENT MANAGEMENT | [§16](#orvia-section-16) | Original body preserved + verbatim refinements |
| O§17 | CONSENT WITHDRAWAL | [§17](#orvia-section-17) | Original body preserved + verbatim refinements |
| O§18 | CONSENT PROPAGATION | [§18](#orvia-section-18) | Original body preserved + verbatim refinements |
| O§19 | NOTICE MANAGEMENT | [§19](#orvia-section-19) | Original body preserved + verbatim refinements |
| O§20 | DATA PRINCIPAL PORTAL | [§20](#orvia-section-20) | Original body preserved + verbatim refinements |
| O§21 | CROSS-COMPANY DATA PRINCIPAL NETWORK | [§21](#orvia-section-21) | Original body unchanged |
| O§22 | RIGHTS MANAGEMENT ENGINE | [§22](#orvia-section-22) | Original body preserved + verbatim refinements |
| O§23 | IDENTITY MATCHING | [§23](#orvia-section-23) | Original body preserved + verbatim refinements |
| O§24 | RIGHTS REQUEST STATES | [§24](#orvia-section-24) | Original body preserved + verbatim refinements |
| O§25 | WORKFLOW ENGINE | [§25](#orvia-section-25) | Original body preserved + verbatim refinements |
| O§26 | HUMAN-IN-THE-LOOP SUPPORT | [§26](#orvia-section-26) | Original body preserved + verbatim refinements |
| O§27 | CONNECTOR FRAMEWORK | [§27](#orvia-section-27) | Original body preserved + verbatim refinements |
| O§28 | CONNECTOR CAPABILITY DECLARATION | [§28](#orvia-section-28) | Original body preserved + verbatim refinements |
| O§29 | INITIAL CONNECTORS | [§29](#orvia-section-29) | Original body unchanged |
| O§30 | CONNECTOR AGENT | [§30](#orvia-section-30) | Original body preserved + verbatim refinements |
| O§31 | CUSTOMER DATA BOUNDARY | [§31](#orvia-section-31) | Original body preserved + verbatim refinements |
| O§32 | PRIVACY-PRESERVING EXECUTION MODEL | [§32](#orvia-section-32) | Original body unchanged |
| O§33 | PORTAL DATA BOUNDARY | [§33](#orvia-section-33) | Original body unchanged |
| O§34 | CLOUD ARCHITECTURE | [§34](#orvia-section-34) | Original body unchanged |
| O§35 | MULTI-TENANCY | [§35](#orvia-section-35) | Original body preserved + verbatim refinements |
| O§36 | DATABASE SECURITY | [§36](#orvia-section-36) | Original body preserved + verbatim refinements |
| O§37 | SECRETS MANAGEMENT | [§37](#orvia-section-37) | Original body unchanged |
| O§38 | ENCRYPTION | [§38](#orvia-section-38) | Original body unchanged |
| O§39 | KEY MANAGEMENT | [§39](#orvia-section-39) | Original body unchanged |
| O§40 | PRIVACY FIREWALL / CONTROL POINT | [§40](#orvia-section-40) | Original body preserved + verbatim refinements |
| O§41 | PRIVACY SDK | [§41](#orvia-section-41) | Original body preserved + verbatim refinements |
| O§42 | LOCAL POLICY CACHE | [§42](#orvia-section-42) | Original body preserved + verbatim refinements |
| O§43 | OFFLINE / DEGRADED OPERATION | [§43](#orvia-section-43) | Original body preserved + verbatim refinements |
| O§44 | VERIFICATION ENGINE | [§44](#orvia-section-44) | Original body preserved + verbatim refinements |
| O§45 | EVIDENCE ENGINE | [§45](#orvia-section-45) | Original body unchanged |
| O§46 | AUDIT TRAIL | [§46](#orvia-section-46) | Original body unchanged |
| O§47 | EVIDENCE INTEGRITY | [§47](#orvia-section-47) | Original body preserved + verbatim refinements |
| O§48 | PRIVACY FAILURE CENTER | [§48](#orvia-section-48) | Original body preserved + verbatim refinements |
| O§49 | COVERAGE MAP | [§49](#orvia-section-49) | Original body preserved + verbatim refinements |
| O§50 | RETENTION ENGINE | [§50](#orvia-section-50) | Source-backed edit + verbatim refinements; exact edit in Appendix B |
| O§51 | DELETION ENGINE | [§51](#orvia-section-51) | Original body preserved + verbatim refinements |
| O§52 | CRYPTOGRAPHIC DELETION | [§52](#orvia-section-52) | Original body preserved + verbatim refinements |
| O§53 | PROCESSOR/VENDOR MANAGEMENT | [§53](#orvia-section-53) | Original body preserved + verbatim refinements |
| O§54 | PRIVACY INCIDENT EXPLORER | [§54](#orvia-section-54) | Original body preserved + verbatim refinements |
| O§55 | INCIDENT SEVERITY | [§55](#orvia-section-55) | Original body unchanged |
| O§56 | NOTIFICATION SUPPORT | [§56](#orvia-section-56) | Original body preserved + verbatim refinements |
| O§57 | PRIVACY TEST ENGINE | [§57](#orvia-section-57) | Original body unchanged |
| O§58 | SYNTHETIC TESTING | [§58](#orvia-section-58) | Original body unchanged |
| O§59 | PRIVACY REGRESSION TEST | [§59](#orvia-section-59) | Original body unchanged |
| O§60 | CI/CD INTEGRATION | [§60](#orvia-section-60) | Original body unchanged |
| O§61 | PRIVACY TEST SUITE | [§61](#orvia-section-61) | Original body unchanged |
| O§62 | PRIVACY DRIFT DETECTION | [§62](#orvia-section-62) | Original body preserved + verbatim refinements |
| O§63 | AI ARCHITECTURE | [§63](#orvia-section-63) | Original body unchanged |
| O§64 | AI MODEL ABSTRACTION | [§64](#orvia-section-64) | Original body preserved + verbatim refinements |
| O§65 | AI DATA-MINIMISATION | [§65](#orvia-section-65) | Original body unchanged |
| O§66 | AI PRIVACY COPILOT | [§66](#orvia-section-66) | Original body preserved + verbatim refinements |
| O§67 | AI DISCOVERY | [§67](#orvia-section-67) | Original body unchanged |
| O§68 | AI POLICY BUILDER | [§68](#orvia-section-68) | Original body unchanged |
| O§69 | AI WORKFLOW BUILDER | [§69](#orvia-section-69) | Original body unchanged |
| O§70 | AI FAILURE ANALYSIS | [§70](#orvia-section-70) | Original body unchanged |
| O§71 | AI DRIFT ANALYSIS | [§71](#orvia-section-71) | Original body unchanged |
| O§72 | AI INCIDENT ANALYSIS | [§72](#orvia-section-72) | Original body unchanged |
| O§73 | AI TEST GENERATION | [§73](#orvia-section-73) | Original body unchanged |
| O§74 | AI SAFETY RULES | [§74](#orvia-section-74) | Original body unchanged |
| O§75 | NOTIFICATION ENGINE | [§75](#orvia-section-75) | Original body unchanged |
| O§76 | LICENSING AND ENTITLEMENTS | [§76](#orvia-section-76) | Original body unchanged |
| O§77 | FEATURE FLAGS VS ENTITLEMENTS | [§77](#orvia-section-77) | Original body unchanged |
| O§78 | ORVIA FOUNDATION | [§78](#orvia-section-78) | Original body preserved + verbatim refinements |
| O§79 | ORVIA CONTROL | [§79](#orvia-section-79) | Original body unchanged |
| O§80 | ORVIA ENTERPRISE | [§80](#orvia-section-80) | Original body preserved + verbatim refinements |
| O§81 | ONE CODEBASE, THREE EDITIONS | [§81](#orvia-section-81) | Original body preserved + verbatim refinements |
| O§82 | WEBSITE | [§82](#orvia-section-82) | Original body preserved + verbatim refinements |
| O§83 | WEBSITE-TO-CUSTOMER JOURNEY | [§83](#orvia-section-83) | Original body unchanged |
| O§84 | CUSTOMER ONBOARDING WIZARD | [§84](#orvia-section-84) | Original body preserved + verbatim refinements |
| O§85 | CONNECTOR INSTALLATION | [§85](#orvia-section-85) | Original body unchanged |
| O§86 | CUSTOMER-CONTROLLED CLOUD DEPLOYMENT | [§86](#orvia-section-86) | Original body preserved + verbatim refinements |
| O§87 | CLOUD PROVIDER SECURITY | [§87](#orvia-section-87) | Original body unchanged |
| O§88 | OBSERVABILITY | [§88](#orvia-section-88) | Original body unchanged |
| O§89 | MONITORING DASHBOARD | [§89](#orvia-section-89) | Original body preserved + verbatim refinements |
| O§90 | SECURITY MONITORING | [§90](#orvia-section-90) | Original body unchanged |
| O§91 | BACKUPS | [§91](#orvia-section-91) | Original body preserved + verbatim refinements |
| O§92 | DISASTER RECOVERY | [§92](#orvia-section-92) | Original body preserved + verbatim refinements |
| O§93 | UPDATE SYSTEM | [§93](#orvia-section-93) | Original body unchanged |
| O§94 | LICENSE SECURITY | [§94](#orvia-section-94) | Original body unchanged |
| O§95 | PRIVACY-SAFE SUPPORT | [§95](#orvia-section-95) | Original body unchanged |
| O§96 | SUPPORT PORTAL | [§96](#orvia-section-96) | Original body unchanged |
| O§97 | API ARCHITECTURE | [§97](#orvia-section-97) | Original body preserved + verbatim refinements |
| O§98 | WEBHOOK ARCHITECTURE | [§98](#orvia-section-98) | Original body unchanged |
| O§99 | IDEMPOTENCY | [§99](#orvia-section-99) | Original body preserved + verbatim refinements |
| O§100 | EVENT ARCHITECTURE | [§100](#orvia-section-100) | Original body preserved + verbatim refinements |
| O§101 | DATA MIGRATION STRATEGY | [§101](#orvia-section-101) | Original body preserved + verbatim refinements |
| O§102 | FRONTEND ARCHITECTURE | [§102](#orvia-section-102) | Original body preserved + verbatim refinements |
| O§103 | PRIMARY NAVIGATION | [§103](#orvia-section-103) | Original body preserved + verbatim refinements |
| O§104 | DASHBOARD | [§104](#orvia-section-104) | Original body unchanged |
| O§105 | PRIVACY GRAPH UI | [§105](#orvia-section-105) | Original body unchanged |
| O§106 | CONTROL DETAIL PAGE | [§106](#orvia-section-106) | Original body preserved + verbatim refinements |
| O§107 | TEST DETAIL PAGE | [§107](#orvia-section-107) | Original body unchanged |
| O§108 | INCIDENT DETAIL PAGE | [§108](#orvia-section-108) | Original body unchanged |
| O§109 | SECURITY REQUIREMENTS | [§109](#orvia-section-109) | Original body preserved + verbatim refinements |
| O§110 | API SECURITY | [§110](#orvia-section-110) | Original body unchanged |
| O§111 | FILE UPLOAD SECURITY | [§111](#orvia-section-111) | Original body unchanged |
| O§112 | AI SECURITY | [§112](#orvia-section-112) | Original body preserved + verbatim refinements |
| O§113 | AI TOOL-USE MODEL | [§113](#orvia-section-113) | Original body preserved + verbatim refinements |
| O§114 | DEVELOPER EXPERIENCE | [§114](#orvia-section-114) | Original body unchanged |
| O§115 | CLI | [§115](#orvia-section-115) | Original body preserved + verbatim refinements |
| O§116 | REPOSITORY STRUCTURE | [§116](#orvia-section-116) | Original body unchanged |
| O§117 | 20-PERSON ENGINEERING TEAM | [§117](#orvia-section-117) | Original body preserved + verbatim refinements |
| O§118 | NON-ENGINEERING EXPERTISE REQUIRED | [§118](#orvia-section-118) | Original body preserved + verbatim refinements |
| O§119 | ENGINEERING TEAM WORKFLOW | [§119](#orvia-section-119) | Original body unchanged |
| O§120 | DEFINITION OF DONE | [§120](#orvia-section-120) | Original body unchanged |
| O§121 | AI CODING AGENT RULES | [§121](#orvia-section-121) | Original body unchanged |
| O§122 | DEVELOPMENT ENVIRONMENTS | [§122](#orvia-section-122) | Original body unchanged |
| O§123 | CI/CD PIPELINE | [§123](#orvia-section-123) | Original body unchanged |
| O§124 | CODE QUALITY | [§124](#orvia-section-124) | Original body unchanged |
| O§125 | TESTING PYRAMID | [§125](#orvia-section-125) | Original body unchanged |
| O§126 | SECURITY TESTING | [§126](#orvia-section-126) | Original body preserved + verbatim refinements |
| O§127 | MULTI-TENANT SECURITY TEST | [§127](#orvia-section-127) | Original body unchanged |
| O§128 | CONNECTOR SECURITY TESTING | [§128](#orvia-section-128) | Original body preserved + verbatim refinements |
| O§129 | PERFORMANCE TARGETS | [§129](#orvia-section-129) | Original body preserved + verbatim refinements |
| O§130 | SCALABILITY MODEL | [§130](#orvia-section-130) | Original body unchanged |
| O§131 | CUSTOMER SCALE | [§131](#orvia-section-131) | Original body unchanged |
| O§132 | DATA RETENTION WITHIN ORVIA | [§132](#orvia-section-132) | Original body preserved + verbatim refinements |
| O§133 | AUDIT EVIDENCE EXPORT | [§133](#orvia-section-133) | Original body unchanged |
| O§134 | REPORTING | [§134](#orvia-section-134) | Original body unchanged |
| O§135 | READINESS SCANNER | [§135](#orvia-section-135) | Original body unchanged |
| O§136 | INITIAL CUSTOMER TARGET | [§136](#orvia-section-136) | Original body preserved + verbatim refinements |
| O§137 | FIRST VERTICAL SLICE | [§137](#orvia-section-137) | Original body unchanged |
| O§138 | PHASE 0 — ARCHITECTURAL FOUNDATION | [§138](#orvia-section-138) | Original body preserved + verbatim refinements |
| O§139 | PHASE 1 — CORE PRIVACY OPERATIONS | [§139](#orvia-section-139) | Original body preserved + verbatim refinements |
| O§140 | PHASE 2 — CONTROL | [§140](#orvia-section-140) | Original body unchanged |
| O§141 | PHASE 3 — TESTING | [§141](#orvia-section-141) | Original body unchanged |
| O§142 | PHASE 4 — ENTERPRISE | [§142](#orvia-section-142) | Original body unchanged |
| O§143 | PHASE 5 — ADVANCED | [§143](#orvia-section-143) | Original body unchanged |
| O§144 | THREE EDITIONS MUST EXIST ARCHITECTURALLY FROM THE BEGINNING | [§144](#orvia-section-144) | Original body unchanged |
| O§145 | BUT FEATURE DELIVERY MUST STILL BE CONTROLLED | [§145](#orvia-section-145) | Original body unchanged |
| O§146 | RELEASE STRATEGY | [§146](#orvia-section-146) | Original body unchanged |
| O§147 | CONNECTOR VERSIONING | [§147](#orvia-section-147) | Original body preserved + verbatim refinements |
| O§148 | POLICY COMPATIBILITY | [§148](#orvia-section-148) | Original body unchanged |
| O§149 | WORKFLOW COMPATIBILITY | [§149](#orvia-section-149) | Original body preserved + verbatim refinements |
| O§150 | EVIDENCE IMMUTABILITY | [§150](#orvia-section-150) | Original body preserved + verbatim refinements |
| O§151 | CUSTOMER TRUST MODEL | [§151](#orvia-section-151) | Original body unchanged |
| O§152 | ORVIA'S MOST IMPORTANT DIFFERENTIATOR | [§152](#orvia-section-152) | Original body unchanged |
| O§153 | FUTURE INTEROPERABILITY | [§153](#orvia-section-153) | Original body preserved + verbatim refinements |
| O§154 | MOBILE AND WEB | [§154](#orvia-section-154) | Original body unchanged |
| O§155 | INTERNATIONALISATION | [§155](#orvia-section-155) | Original body unchanged |
| O§156 | LOCALISATION | [§156](#orvia-section-156) | Source-backed edit + verbatim refinements; exact edit in Appendix B |
| O§157 | SEARCH | [§157](#orvia-section-157) | Original body unchanged |
| O§158 | ADMIN SETTINGS | [§158](#orvia-section-158) | Original body unchanged |
| O§159 | BILLING | [§159](#orvia-section-159) | Original body preserved + verbatim refinements |
| O§160 | LICENSE EXPIRATION | [§160](#orvia-section-160) | Original body preserved + verbatim refinements |
| O§161 | OFFBOARDING | [§161](#orvia-section-161) | Original body preserved + verbatim refinements |
| O§162 | CUSTOMER DATA EXPORT | [§162](#orvia-section-162) | Original body unchanged |
| O§163 | SECURITY BASELINE FOR RELEASE | [§163](#orvia-section-163) | Original body preserved + verbatim refinements |
| O§164 | EXTERNAL SECURITY REVIEW | [§164](#orvia-section-164) | Original body unchanged |
| O§165 | LEGAL / COMPLIANCE CONTROL | [§165](#orvia-section-165) | Original body preserved + verbatim refinements |
| O§166 | REGULATORY RULE PACK ARCHITECTURE | [§166](#orvia-section-166) | Original body preserved + verbatim refinements |
| O§167 | LEGAL CONTENT VERSIONING | [§167](#orvia-section-167) | Original body preserved + verbatim refinements |
| O§168 | PRODUCT CLAIMS | [§168](#orvia-section-168) | Original body unchanged |
| O§169 | NO FALSE "PROOF" | [§169](#orvia-section-169) | Original body unchanged |
| O§170 | CUSTOMER CONFIGURATION MODEL | [§170](#orvia-section-170) | Original body unchanged |
| O§171 | PRINCIPLE OF LEAST PRIVILEGE | [§171](#orvia-section-171) | Original body unchanged |
| O§172 | CONNECTOR CREDENTIAL MODEL | [§172](#orvia-section-172) | Original body unchanged |
| O§173 | CONNECTOR HEALTH | [§173](#orvia-section-173) | Original body unchanged |
| O§174 | ACTION RETRY STRATEGY | [§174](#orvia-section-174) | Original body preserved + verbatim refinements |
| O§175 | DEAD-LETTER QUEUES | [§175](#orvia-section-175) | Original body unchanged |
| O§176 | RATE LIMITS | [§176](#orvia-section-176) | Original body unchanged |
| O§177 | SYSTEM HEALTH PROTECTION | [§177](#orvia-section-177) | Original body unchanged |
| O§178 | CUSTOMER SYSTEM SAFETY | [§178](#orvia-section-178) | Original body preserved + verbatim refinements |
| O§179 | DRY RUN MODE | [§179](#orvia-section-179) | Original body unchanged |
| O§180 | GRADUAL ENFORCEMENT | [§180](#orvia-section-180) | Original body unchanged |
| O§181 | ORVIA OBSERVE MODE | [§181](#orvia-section-181) | Original body unchanged |
| O§182 | ORVIA COORDINATE MODE | [§182](#orvia-section-182) | Original body unchanged |
| O§183 | ORVIA ENFORCE MODE | [§183](#orvia-section-183) | Original body unchanged |
| O§184 | USER EXPERIENCE RULE | [§184](#orvia-section-184) | Original body unchanged |
| O§185 | DASHBOARD SUMMARY EXAMPLE | [§185](#orvia-section-185) | Original body preserved + verbatim refinements |
| O§186 | ENGINEERING DOCUMENTATION | [§186](#orvia-section-186) | Original body unchanged |
| O§187 | ARCHITECTURE DECISION RECORDS | [§187](#orvia-section-187) | Original body preserved + verbatim refinements |
| O§188 | DEVELOPMENT STANDARD | [§188](#orvia-section-188) | Original body unchanged |
| O§189 | AI-CODING DEVELOPMENT LOOP | [§189](#orvia-section-189) | Original body unchanged |
| O§190 | AI SHOULD BUILD IN SMALL VERIFIED UNITS | [§190](#orvia-section-190) | Original body unchanged |
| O§191 | FIRST DEMO TARGET | [§191](#orvia-section-191) | Original body preserved + verbatim refinements |
| O§192 | FAILURE DEMO | [§192](#orvia-section-192) | Original body unchanged |
| O§193 | PRIVACY REGRESSION DEMO | [§193](#orvia-section-193) | Original body unchanged |
| O§194 | CUSTOMER DEPLOYMENT DEMO | [§194](#orvia-section-194) | Original body unchanged |
| O§195 | PRODUCT SUCCESS METRICS | [§195](#orvia-section-195) | Original body preserved + verbatim refinements |
| O§196 | PRIVACY CONTROL METRICS | [§196](#orvia-section-196) | Original body preserved + verbatim refinements |
| O§197 | CUSTOMER ONBOARDING TARGET | [§197](#orvia-section-197) | Original body preserved + verbatim refinements |
| O§198 | COMMERCIAL EXPANSION | [§198](#orvia-section-198) | Original body unchanged |
| O§199 | FUTURE MODULE MARKETPLACE | [§199](#orvia-section-199) | Original body unchanged |
| O§200 | LONG-TERM ARCHITECTURE PRINCIPLE | [§200](#orvia-section-200) | Original body unchanged |
| O§201 | FINAL SYSTEM PRINCIPLE | [§201](#orvia-section-201) | Original body unchanged |
| O§202 | FINAL CUSTOMER ARCHITECTURE | [§202](#orvia-section-202) | Original body unchanged |
| O§203 | FINAL DELIVERY MODEL | [§203](#orvia-section-203) | Original body unchanged |
| O§204 | FINAL COMMERCIAL MODEL | [§204](#orvia-section-204) | Original body unchanged |
| O§205 | FINAL AI MODEL | [§205](#orvia-section-205) | Original body unchanged |
| O§206 | FINAL SECURITY MODEL | [§206](#orvia-section-206) | Original body unchanged |
| O§207 | FINAL ENGINEERING RULE | [§207](#orvia-section-207) | Original body unchanged |
| O§208 | FINAL PRODUCT RULE | [§208](#orvia-section-208) | Original body unchanged |
| O§209 | FINAL ARCHITECTURAL ADVANTAGE | [§209](#orvia-section-209) | Original body unchanged |
| O§210 | FINAL MASTER BUILD OBJECTIVE | [§210](#orvia-section-210) | Original body unchanged |
| O§211 | FINAL ENGINEERING COMMAND TO THE AI BUILD SYSTEM | [§211](#orvia-section-211) | Original body preserved + verbatim refinements |
| O§212 | ORVIA — FINAL PRODUCT IN ONE SENTENCE | [§212](#orvia-section-212) | Original body preserved + verbatim refinements |



## Refinement source sections 213–250

| Source section | Source title | Unified location(s) | Treatment |
|---|---|---|---|
| V2§213 | REFINED PRODUCT THESIS | [§2](#orvia-section-2) | Merged verbatim into existing topic section(s) |
| V2§214 | PRESERVATION AND AMENDMENT REGISTER | [§9](#orvia-section-9), [§14](#orvia-section-14), [§31](#orvia-section-31), [§42](#orvia-section-42), [§50](#orvia-section-50), [§78](#orvia-section-78), [§80](#orvia-section-80), [§129](#orvia-section-129), [§139](#orvia-section-139), [§150](#orvia-section-150), [§153](#orvia-section-153), [§156](#orvia-section-156), [§160](#orvia-section-160), [§178](#orvia-section-178), [§185](#orvia-section-185), [Appendix C](#appendix-c) | Amendments applied in matching sections; complete historical source register retained |
| V2§215 | REGULATORY APPLICABILITY AS A PRODUCT CAPABILITY | [§166](#orvia-section-166), [§167](#orvia-section-167) | Merged verbatim into existing topic section(s) |
| V2§216 | DPDP LEGAL-TO-PRODUCT BASELINE | [§165](#orvia-section-165) | Merged verbatim into existing topic section(s) |
| V2§217 | EXPANDED PRIVACY CONTROL GRAPH | [§4](#orvia-section-4), [§8](#orvia-section-8), [§31](#orvia-section-31) | Merged verbatim into existing topic section(s) |
| V2§218 | NOTICE, PURPOSE AND CONSENT LIFECYCLE | [§16](#orvia-section-16), [§19](#orvia-section-19), [§20](#orvia-section-20) | Merged verbatim into existing topic section(s) |
| V2§219 | CONSENT ORDERING, REVOCATION AND RACE SAFETY | [§16](#orvia-section-16), [§17](#orvia-section-17), [§18](#orvia-section-18), [§40](#orvia-section-40) | Merged verbatim into existing topic section(s) |
| V2§220 | RIGHTS, IDENTITY, NOMINATION AND GUARDIAN FLOWS | [§20](#orvia-section-20), [§22](#orvia-section-22), [§23](#orvia-section-23), [§24](#orvia-section-24) | Merged verbatim into existing topic section(s) |
| V2§221 | RETENTION CONFLICTS AND LEGAL HOLDS | [§50](#orvia-section-50) | Merged verbatim into existing topic section(s) |
| V2§222 | DELETION, DERIVED COPIES AND RESTORATION SAFETY | [§51](#orvia-section-51), [§52](#orvia-section-52), [§91](#orvia-section-91), [§92](#orvia-section-92) | Merged verbatim into existing topic section(s) |
| V2§223 | POLICY DECISION CONTRACT AND LOCAL ENFORCEMENT | [§7](#orvia-section-7), [§13](#orvia-section-13), [§41](#orvia-section-41) | Merged verbatim into existing topic section(s) |
| V2§224 | DURABLE EXECUTION AND UNCERTAIN EXTERNAL EFFECTS | [§25](#orvia-section-25), [§99](#orvia-section-99), [§149](#orvia-section-149), [§174](#orvia-section-174) | Merged verbatim into existing topic section(s) |
| V2§225 | ASSURANCE AND VERIFICATION MODEL | [§44](#orvia-section-44), [§47](#orvia-section-47) | Merged verbatim into existing topic section(s) |
| V2§226 | PERSONAL-DATA BOUNDARIES AND EVIDENCE RETENTION | [§31](#orvia-section-31), [§132](#orvia-section-132) | Merged verbatim into existing topic section(s) |
| V2§227 | CONNECTOR CONTRACT AND CONFORMANCE PROGRAM | [§27](#orvia-section-27), [§28](#orvia-section-28), [§128](#orvia-section-128), [§147](#orvia-section-147) | Merged verbatim into existing topic section(s) |
| V2§228 | CUSTOMER AGENT AS A RESTRICTED EXECUTION PLANE | [§30](#orvia-section-30) | Merged verbatim into existing topic section(s) |
| V2§229 | TENANT ISOLATION AND ACCESS GOVERNANCE | [§7](#orvia-section-7), [§35](#orvia-section-35), [§36](#orvia-section-36) | Merged verbatim into existing topic section(s) |
| V2§230 | SECURITY AND PRODUCT SAFETY RELEASE BAR | [§20](#orvia-section-20), [§26](#orvia-section-26), [§109](#orvia-section-109), [§126](#orvia-section-126), [§163](#orvia-section-163) | Merged verbatim into existing topic section(s) |
| V2§231 | PRIVACY CONTROL PACKAGES AND CHANGE SIMULATION | [§115](#orvia-section-115), [§213](#orvia-section-213) | New standalone subject; existing-topic paragraphs merged where applicable |
| V2§232 | CONTINUOUS DISCOVERY, LINEAGE AND COVERAGE GAPS | [§49](#orvia-section-49), [§62](#orvia-section-62) | Merged verbatim into existing topic section(s) |
| V2§233 | ASSESSMENTS, SDF GOVERNANCE AND REMEDIATION | [§53](#orvia-section-53), [§214](#orvia-section-214) | New standalone subject; existing-topic paragraphs merged where applicable |
| V2§234 | INCIDENT WORKSPACE AND MULTIPLE NOTIFICATION CLOCKS | [§54](#orvia-section-54), [§56](#orvia-section-56) | Merged verbatim into existing topic section(s) |
| V2§235 | AI COPILOT: USEFUL, CONSTRAINED AND EVALUATED | [§64](#orvia-section-64), [§66](#orvia-section-66), [§112](#orvia-section-112), [§113](#orvia-section-113) | Merged verbatim into existing topic section(s) |
| V2§236 | CUSTOMER AI-PROCESSING GOVERNANCE EXTENSION | [§215](#orvia-section-215) | New standalone subject; existing-topic paragraphs merged where applicable |
| V2§237 | DEPLOYMENT, RESILIENCE AND MEASUREMENT | [§11](#orvia-section-11), [§43](#orvia-section-43), [§86](#orvia-section-86), [§89](#orvia-section-89), [§92](#orvia-section-92), [§129](#orvia-section-129) | Merged verbatim into existing topic section(s) |
| V2§238 | THREE EDITIONS WITH A UNIVERSAL SAFETY FLOOR | [§81](#orvia-section-81), [§160](#orvia-section-160), [§161](#orvia-section-161) | Merged verbatim into existing topic section(s) |
| V2§239 | USER EXPERIENCE, ACCESSIBILITY AND TRUST | [§48](#orvia-section-48), [§82](#orvia-section-82), [§84](#orvia-section-84), [§102](#orvia-section-102), [§103](#orvia-section-103), [§106](#orvia-section-106) | Merged verbatim into existing topic section(s) |
| V2§240 | API AND EVENT CONTRACTS | [§97](#orvia-section-97), [§100](#orvia-section-100), [§101](#orvia-section-101) | Merged verbatim into existing topic section(s) |
| V2§241 | DELIVERY ROADMAP AND RELEASE GATES | [§138](#orvia-section-138) | Merged verbatim into existing topic section(s) |
| V2§242 | ORGANIZATION OF THE EXISTING 20-PERSON TEAM | [§117](#orvia-section-117), [§118](#orvia-section-118) | Merged verbatim into existing topic section(s) |
| V2§243 | PRIORITIZED ENGINEERING BACKLOG | [§216](#orvia-section-216) | New standalone subject; existing-topic paragraphs merged where applicable |
| V2§244 | MANDATORY ACCEPTANCE AND FAILURE TEST MATRIX | [§217](#orvia-section-217) | New standalone subject; existing-topic paragraphs merged where applicable |
| V2§245 | PRODUCT METRICS AND ECONOMICS | [§195](#orvia-section-195), [§196](#orvia-section-196) | Merged verbatim into existing topic section(s) |
| V2§246 | FOUNDER-LEVEL COMMERCIAL PLAN | [§136](#orvia-section-136), [§159](#orvia-section-159), [§197](#orvia-section-197) | Merged verbatim into existing topic section(s) |
| V2§247 | OPEN DECISIONS, RISKS AND SCOPE GUARDRAILS | [§187](#orvia-section-187) | Merged verbatim into existing topic section(s) |
| V2§248 | REVISED FLAGSHIP DEMONSTRATION | [§191](#orvia-section-191) | Merged verbatim into existing topic section(s) |
| V2§249 | ADDITIVE INSTRUCTION FOR THE AI BUILD SYSTEM | [§211](#orvia-section-211) | Merged verbatim into existing topic section(s) |
| V2§250 | PRIMARY SOURCE REGISTER AND REVIEW LIMITS | [§212](#orvia-section-212), [§218](#orvia-section-218) | New standalone subject; existing-topic paragraphs merged where applicable |

---

<a id="appendix-b"></a>

# APPENDIX B — EXACT EDITS AND PRESERVATION CHECKS

**Historical record of the initial consolidation, not the current revision’s change count.** The “only edits” and preservation totals below describe that earlier operation. Revision 1.1 changes are separately enumerated and checked in Appendix D.

## Exact changes to existing original body text

These are the only direct edits to original body text. All other changes are verbatim source additions inside the mapped sections. Superseded wording is retained here for audit, not as an alternative active requirement.

| Unified section | Previous source wording | Applied wording | Source authority |
|---|---|---|---|
| [§13](#orvia-section-13) | Decision list ended with `RECORD_ONLY`. | `INDETERMINATE` added after `RECORD_ONLY`; every original outcome remains. | V2§223 |
| [§50](#orvia-section-50) | `legal/business exceptions` | `approved processing condition or documented legal retention basis` | V2§214, AM-05; V2§221 |
| [§156](#orvia-section-156) | `English initially` | `English-first admin interface` | V2§214, AM-10 |



## Applied amendment locations

| Source amendment | Source-listed original references | Applied clarification |
|---|---|---|
| AM-01 | O§9, §165–167 | [§9](#orvia-section-9); detailed source paragraphs at the locations mapped in Appendix A |
| AM-02 | O§31–33 | [§31](#orvia-section-31); detailed source paragraphs at the locations mapped in Appendix A |
| AM-03 | O§16–18, §42 | [§42](#orvia-section-42); detailed source paragraphs at the locations mapped in Appendix A |
| AM-04 | O§20, §22, §80 | [§80](#orvia-section-80); detailed source paragraphs at the locations mapped in Appendix A |
| AM-05 | O§50 | [§50](#orvia-section-50); detailed source paragraphs at the locations mapped in Appendix A |
| AM-06 | O§44, §78–80 | [§78](#orvia-section-78); detailed source paragraphs at the locations mapped in Appendix A |
| AM-07 | O§47, §132, §150 | [§150](#orvia-section-150); detailed source paragraphs at the locations mapped in Appendix A |
| AM-08 | O§41–43 | [§42](#orvia-section-42); detailed source paragraphs at the locations mapped in Appendix A |
| AM-09 | O§137, §139–141 | [§139](#orvia-section-139); detailed source paragraphs at the locations mapped in Appendix A |
| AM-10 | O§155–156 | [§156](#orvia-section-156); detailed source paragraphs at the locations mapped in Appendix A |
| AM-11 | O§40, §49, §185 | [§185](#orvia-section-185); detailed source paragraphs at the locations mapped in Appendix A |
| AM-12 | O§92, §129 | [§129](#orvia-section-129); detailed source paragraphs at the locations mapped in Appendix A |
| AM-13 | O§160 | [§160](#orvia-section-160); detailed source paragraphs at the locations mapped in Appendix A |
| AM-14 | O§26, §99, §178 | [§178](#orvia-section-178); detailed source paragraphs at the locations mapped in Appendix A |
| AM-15 | O§14, §149 | [§14](#orvia-section-14); detailed source paragraphs at the locations mapped in Appendix A |
| AM-16 | O§21, §153 | [§153](#orvia-section-153); detailed source paragraphs at the locations mapped in Appendix A |



## Preservation results

- Original numbered sections retained: **212 of 212**; original numbers and titles retained.

- Refinement source sections accounted for: **38 of 38**.

- Refinement content blocks routed in full: **215 of 215**.

- Original sections with no body additions or edits: **120**.

- Original sections with integrated refinements or source-backed edits: **92**.

- Direct original-body edits: **3**, listed above; no other original wording changes.

- New standalone numbered sections: **6**; unified numbering is continuous from **1 to 218**.

- Original module inventory, role definitions, edition lists, examples, roadmap and future capabilities retained.

- Original and refinement source files match the embedded sources in the supplied expanded master.



## Input integrity

| Input file | SHA-256 |
|---|---|
| `Pasted markdown.md` | `8932e35f00012a4e30a44ec46d346852e343ae8e1a0278f927f1e53ed042be32` |
| `ORVIA_v2_Refinement_Blueprint.md` | `1e7b4353be2596cb6ab80d159d43a7c1b730981172dcddcd94c6404ce9f0d57c` |
| `ORVIA_v2_Expanded_Master_Specification.md` | `e5ab91e97cfa2735e21c64b7f3f80c492179e1f5791a427205ffeb025daccebb` |

---

<a id="appendix-c"></a>

# APPENDIX C — ORIGINAL AMENDMENT REGISTER AND SOURCE METADATA

**Historical source wording:** retained for provenance. Earlier “cloud-first” descriptions, optional data-locality wording and related alternatives do not override the customer-local requirements now stated in §§2, 31–34 and 202–203.

## Historical source context

The source text below is retained for traceability. Its statement that the original was retained verbatim “in the accompanying master” describes the earlier expanded-master file, not the three explicitly logged edits in this consolidated file. The current locations and treatment are in Appendices A and B. Historical source wording is not a second competing product specification.

## PRESERVATION AND AMENDMENT REGISTER

Every original section is retained verbatim in the accompanying master. The following proposed refinements resolve ambiguities without removing capabilities. Before implementation, the architecture owner and privacy counsel must approve any entry affecting legal interpretation.

| ID | Original reference | Refinement to apply |
|---|---|---|
| AM-01 | O§9, §165–167 | Provision-level applicability and commencement replace a single “DPDP enabled” switch. |
| AM-02 | O§31–33 | Control metadata, hashes, references and derived results can still be personal data. Apply classification rather than assuming exemption. |
| AM-03 | O§16–18, §42 | Versioned consent becomes an ordered state machine with revocation freshness and execution-time checks. |
| AM-04 | O§20, §22, §80 | Implement nomination and guardian lifecycles explicitly. Baseline safeguards for applicable processing cannot depend on an advanced pack. |
| AM-05 | O§50 | A “business exception” is not independent legal permission. Require an approved processing condition or documented legal retention basis. |
| AM-06 | O§44, §78–80 | Every edition reports evidence honestly. Advanced verification automation remains premium; truthful minimum outcome handling is universal. |
| AM-07 | O§47, §132, §150 | Append-only history is bounded by lawful retention. Separate minimal integrity envelopes from erasable personal payloads. |
| AM-08 | O§41–43 | SDKs call a cloud or customer-local policy service. Signed policy bundles live in that service, not inside application SDK code. |
| AM-09 | O§137, §139–141 | The first vertical slice includes a real verification check and regression test. Phase 3 still delivers the full reusable test product. |
| AM-10 | O§155–156 | An English-first admin interface does not justify English-only legally significant notices or consent requests where language choice applies. |
| AM-11 | O§40, §49, §185 | Runtime coverage is measured per boundary and action. Percentages must expose scope, denominator, freshness and exclusions. |
| AM-12 | O§92, §129 | Recovery and latency numbers are measured engineering objectives, not untested contractual guarantees. |
| AM-13 | O§160 | Commercial expiry cannot silently turn BLOCK into ALLOW, discard an active request, or delete evidence. |
| AM-14 | O§26, §99, §178 | Approval binds to an exact execution plan; retries reconcile unknown effects before destructive repetition. |
| AM-15 | O§14, §149 | Preserve historical policy/workflow versions, but recheck current authorization and safety before a new irreversible effect. |
| AM-16 | O§21, §153 | Consent software, registered Consent Manager interoperability and a national identity network are separate scopes. |

If a conflict cannot be resolved safely, mark the affected requirement `DECISION_REQUIRED`; do not silently choose whichever interpretation makes the demo easier.

## Original refinement front matter — retained source wording

**Status:** Proposed design for founder, engineering and privacy-counsel review. Not an implementation, security certification, legal opinion, or exhaustive consolidation of Indian law.

**Review date:** 15 September 2026. **Baseline:** the supplied 212-section ORVIA Master Engineering Specification.

**Reading key:** `O§n` means an original section; `V2§n` means an additive section below; `R1`–`R8` identify primary sources in V2§250. Statements labelled **Proposal** are design choices, not claims about what the law requires. All quantitative product targets are hypotheses until benchmarked or validated with customers.

The source specification remains a complete product commitment. Release sequencing is not feature deletion. References to modules in this refinement are extensions of the existing shared Graph, Policy, Workflow, Connector, Verification, Evidence and Test models—not permission to build disconnected applications.


---

<a id="appendix-d"></a>

# APPENDIX D — REVISION 1.1 CHANGES AND INTEGRITY

## Scope and authority

This revision implements the user’s two explicit priorities: website purchase and full-product customer-hosted deployment with only minimal vendor collection; and a highly secure product backed by enforceable requirements and evidence. It does not redesign unrelated modules, merge prototype schedules, create security certifications, or claim that tests have passed.

The new default is `CUSTOMER_LOCAL`. Former vendor-hosted modes remain documented alternatives, not current deployment permissions. A move to externally processed customer data cannot be made silently. Absolute “no vulnerabilities/no breach” language is replaced with measurable security obligations and scoped claims, consistent with the existing truthfulness requirements.

## Verification of this document update

| Check | Result |
|---|---|
| Previous unified source | `ORVIA_Unified_Idea_and_Master_Specification.md` |
| Previous unified source SHA-256 | `c154e036d72e01ae9098c4b3fb61de607f7399cd89bbbc77bbd1954571297163` |
| Numbered source sections retained | 218 of 218 |
| Numbering | Continuous 1–218; no duplicates or renumbering |
| Original numbered section titles | All unchanged |
| Existing numbered sections amended | 63 |
| Unrelated numbered section bodies preserved byte-for-byte | 155 |
| Original 33-module inventory, §10 | Byte-identical to the previous unified master |
| Original 20-role engineering structure, §117 | Byte-identical to the previous unified master |
| Existing acceptance scenarios T01–T40 | Retained; T41–T64 added as requirements, not executed results |
| Historical legal content | Not substantively revised or newly verified |
| Prototype scheduling / coding assignments | Not merged into the idea master |
| Actual software/security evidence | Not produced by this document update |

**Unchanged sections:** 1, 3, 4, 5, 6, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29, 36, 38, 40, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 66, 67, 68, 69, 70, 71, 72, 73, 74, 77, 79, 87, 90, 92, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 111, 113, 114, 115, 116, 117, 118, 119, 121, 122, 124, 125, 127, 128, 129, 130, 131, 134, 135, 136, 137, 139, 140, 141, 143, 144, 145, 146, 147, 148, 149, 150, 152, 153, 154, 155, 156, 157, 158, 160, 162, 165, 166, 167, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 188, 189, 190, 191, 192, 193, 196, 198, 199, 200, 201, 204, 205, 207, 208, 209, 213, 214, 215, 216.

## Change register

| Existing section | Applied change |
|---|---|
| [§2](#orvia-section-2) | Apply the user’s website-purchase, full-product download and customer-hosted operating model.<br>Replace optional minimisation with an explicit, testable vendor-data boundary.<br>Align the retained product thesis with the updated delivery model.<br>Define requirement priority and preserve earlier alternative capabilities without weakening the new default. |
| [§7](#orvia-section-7) | Align the earlier just-in-time support language with no vendor production-data access. |
| [§11](#orvia-section-11) | Place all operational services—not only connectors—in the customer environment. |
| [§20](#orvia-section-20) | Close portal, browser and delivery-related routes around the no-vendor-data promise. |
| [§30](#orvia-section-30) | Make agent control originate within the customer runtime.<br>Distinguish local agent transport from vendor callbacks.<br>Separate commercial authority from customer execution authority. |
| [§31](#orvia-section-31) | Keep operational metadata local rather than permitting broad cloud collection.<br>Make all end-customer data local, including derived and encrypted representations.<br>Close the derived-result telemetry exception.<br>Distinguish the customer cloud graph from a vendor-hosted identity index.<br>Define exactly what the vendor may collect, prohibit hidden collection routes and make boundary limits explicit. |
| [§32](#orvia-section-32) | Keep instruction, effect, result, verification and evidence in the same customer boundary. |
| [§33](#orvia-section-33) | Resolve the previously active cloud-portal exception while recording the alternative. |
| [§34](#orvia-section-34) | Clarify infrastructure ownership for the existing operational architecture.<br>Define a full customer-hosted platform rather than a connector behind a vendor data plane. |
| [§35](#orvia-section-35) | Keep tenant isolation in both locations without assuming central runtime hosting. |
| [§37](#orvia-section-37) | Make local credential custody mandatory. |
| [§39](#orvia-section-39) | Separate software trust keys from operational decryption and command authority. |
| [§41](#orvia-section-41) | Eliminate cloud decision calls containing principal context. |
| [§42](#orvia-section-42) | Align the earlier SDK clarification with the new default. |
| [§43](#orvia-section-43) | Decouple runtime availability from vendor commercial connectivity.<br>Allow strict local operation while preserving accurate offline and air-gap limitations. |
| [§63](#orvia-section-63) | Preserve AI capabilities without allowing subscription tools to become a data-export route. |
| [§64](#orvia-section-64) | Remove a training exception incompatible with the user’s stated vendor-data boundary.<br>Qualify existing external-provider abstractions without deleting the integrations. |
| [§65](#orvia-section-65) | Close the redaction-as-export-permission exception. |
| [§75](#orvia-section-75) | Separate operational personal-data notifications from business-account mail. |
| [§76](#orvia-section-76) | Connect payment and licensing to full-product deployment. |
| [§78](#orvia-section-78) | Keep Foundation delivery consistent with the core requirement. |
| [§80](#orvia-section-80) | Distinguish Enterprise deployment depth from the universal local-data floor.<br>Distinguish advanced AI management from mandatory in-boundary processing whenever AI is enabled. |
| [§81](#orvia-section-81) | Preserve edition differentiation without weakening the user’s baseline trust requirements. |
| [§82](#orvia-section-82) | Expand the website beyond information pages to actual secure product delivery. |
| [§83](#orvia-section-83) | Replace connector-only onboarding with the requested website-to-local-product journey. |
| [§84](#orvia-section-84) | Make privacy and deployment checks part of normal onboarding. |
| [§85](#orvia-section-85) | Include the full downloadable product while retaining connector packages.<br>Avoid broadly authorised vendor outbound access during installation.<br>Specify secure distribution and bootstrap for the entire runtime. |
| [§86](#orvia-section-86) | Make customer-hosted deployment central rather than Enterprise-only.<br>Preserve earlier profiles without offering a contradictory default data promise.<br>Define who operates and secures the downloadable installation. |
| [§88](#orvia-section-88) | Keep monitoring from becoming an accidental vendor data pipeline. |
| [§89](#orvia-section-89) | Clarify which operations team sees customer workload health. |
| [§91](#orvia-section-91) | Apply the local-data requirement to backups and recovery. |
| [§93](#orvia-section-93) | Prevent cloud release automation from becoming customer remote control.<br>Expand existing signed-update requirements into a verifiable distribution and supply-chain process. |
| [§94](#orvia-section-94) | Make offline-capable licence validation consistent with the default offer.<br>Prevent vendor commercial tokens from turning into a privileged control channel. |
| [§95](#orvia-section-95) | Change best-effort masking to a schema-limited no-operational-data support process.<br>Remove workflow IDs and masked references from vendor support bundles.<br>Strengthen support from no raw data to no operational or derived customer data.<br>Close support access and screen-sharing loopholes. |
| [§96](#orvia-section-96) | Eliminate ambiguity between customer support administrators and vendor support staff. |
| [§109](#orvia-section-109) | Turn optional MFA capability into a privileged-access baseline.<br>Add an evidence-backed security programme with standards references and no absolute assurances. |
| [§110](#orvia-section-110) | Apply authentication and strict schemas across the vendor/customer boundary. |
| [§112](#orvia-section-112) | Align AI security with local processing and independent assessment. |
| [§120](#orvia-section-120) | Make new security and residency rules part of definition of done. |
| [§123](#orvia-section-123) | Convert security testing into executable release gates. |
| [§126](#orvia-section-126) | Define actual tests for the new locality and security promises. |
| [§132](#orvia-section-132) | Distinguish retention within installed ORVIA from retention by the ORVIA vendor. |
| [§133](#orvia-section-133) | Keep report generation and evidence signing inside the data boundary. |
| [§138](#orvia-section-138) | Move local deployment and vendor separation into the architecture foundation.<br>Require early delivery of a complete local runtime rather than postponing the user’s core model.<br>Keep advanced Enterprise scope while removing the basic-locality phase conflict. |
| [§142](#orvia-section-142) | Clarify that Phase 4 extends, rather than first introduces, local deployment.<br>Keep advanced AI engineering in Enterprise without allowing earlier external fallback. |
| [§151](#orvia-section-151) | Make security and minimum-data claims customer-verifiable. |
| [§159](#orvia-section-159) | Implement minimum necessary commercial collection without overstating zero personal-data processing. |
| [§161](#orvia-section-161) | Apply the boundary to cancellation and end-of-life behavior. |
| [§163](#orvia-section-163) | Do not treat scheduling a penetration test as production assurance.<br>Set a clear, qualified high-assurance production bar. |
| [§164](#orvia-section-164) | Add ongoing security response and independent testing across the entire product lifecycle. |
| [§168](#orvia-section-168) | Provide credible marketing wording without unsupported absolute promises. |
| [§187](#orvia-section-187) | Record the customer’s architecture decision while retaining actionable engineering choices. |
| [§194](#orvia-section-194) | Correct the demonstration’s previously ambiguous cloud result destination.<br>Add tangible proof points for the user’s two primary requirements. |
| [§195](#orvia-section-195) | Prevent product analytics from contradicting minimum vendor collection. |
| [§197](#orvia-section-197) | Align the final onboarding target with the complete product-download flow. |
| [§202](#orvia-section-202) | Replace the vendor-hosted default architecture with the user’s customer-hosted model.<br>Keep Enterprise architecture as a scale/deployment extension. |
| [§203](#orvia-section-203) | Update the final delivery summary to the approved primary model.<br>Make full product packaging mandatory, not an optional enterprise possibility. |
| [§206](#orvia-section-206) | Strengthen the final security model with evidence and truthful limits. |
| [§210](#orvia-section-210) | Align the final build objective with the new delivery decision.<br>Replace avoidance of a primary repository with a strict no-vendor-recipient requirement. |
| [§211](#orvia-section-211) | Remove ambiguity that could prohibit local processing but permit vendor copying.<br>Carry both requirements into future implementation prompts. |
| [§212](#orvia-section-212) | Update the final one-sentence product definition without removing its original privacy-control purpose. |
| [§217](#orvia-section-217) | Add tests that can substantiate the data-locality and security promises without claiming they have run. |
| [§218](#orvia-section-218) | Attribute newly researched security framing separately from historical legal sources and new design choices. |

## Exact prior-to-revised diff

The following diff records exact replacements and additions against the previously supplied unified master. The earlier wording in removed lines is historical, not an active alternate requirement. The diff stops before this appendix so the appendix does not recursively describe itself.

<details>
<summary>Expand exact revision diff</summary>

````diff
--- ORVIA_Unified_Idea_and_Master_Specification.md
+++ ORVIA_Unified_Master_v1_1_Customer_Hosted_and_Security.md (before Appendix D)
@@ -7,16 +7,22 @@
 ### For a 20-Person Senior Software Engineering Team and AI-Assisted Development
 
 **Consolidated edition:** 16 September 2026.  
+**Revision:** 1.1 — customer-hosted delivery, minimum vendor data and security assurance.  
 **Source scope:** Original sections 1–212 and refinement sections 213–250.  
 **Status:** Proposed design for founder, engineering and privacy-counsel review. Not an implementation, security certification, legal opinion, or exhaustive consolidation of Indian law.
 
 This is one topic-by-topic master, not two versions placed one after the other. Original sections 1–212 keep their numbers and titles. Later paragraphs, tables, examples and acceptance requirements are incorporated into the relevant existing sections without paraphrasing. Six standalone subjects continue the numbering as sections 213–218. All 250 source sections are accounted for in Appendix A.
 
-The only edits to existing original wording are the three source-backed changes recorded in Appendix B: adding `INDETERMINATE` to the decision list, replacing the unqualified retention-exception phrase, and specifying that the English-first statement concerns the admin interface. Other original body text is preserved. Added headings, navigation, provenance markers and appendices are document structure, not new product requirements.
+The initial consolidation made the three source-backed changes recorded historically in Appendix B. Revision 1.1 additionally updates only sections affected by the user’s customer-hosted delivery/minimum-data and security requirements, preserving unrelated section bodies. Current changes and integrity checks are recorded in Appendix D; the exact unified diff is enclosed there. All 218 existing section numbers and titles remain unchanged. No new numbered product section is needed: these requirements are integrated into the existing topics.
 
 The 36-hour prototype plan, its temporary implementation choices, AI task assignments and sprint deadlines are not changes to this product master and are not merged here. The original product roadmap, engineering roles and later product-level refinements remain included.
 
-**Reference key:** `O§n` identifies an original source section, whose number is unchanged here. `V2§n` identifies a refinement source section; use Appendix A for its current location. `R1`–`R8` refer to the retained primary source register in section 218. Historical research dates, qualifications, proposed-design labels and review limitations remain as supplied; this consolidation does not newly verify or approve them.
+**Reference key:** `O§n` identifies an original source section, whose number is unchanged here. `V2§n` identifies a refinement source section; use Appendix A for its current location. `R1`–`R8` refer to the retained primary source register in section 218. Historical research dates, qualifications, proposed-design labels and review limitations remain as supplied. This revision adds separately identified security references `S1`–`S3` in §218 and does not newly verify or approve the historical legal baseline.
+
+
+**Governing customer requirements:** the complete licensed product is downloaded from the website and runs in the customer’s own environment; no customer operational/personal data is sent to ORVIA vendor infrastructure; only §31’s defined minimum business/licensing/service information may be collected. Security is a mandatory, testable and continuously maintained release obligation, not an “unbreachable” or “zero vulnerabilities” promise. These current requirements supersede older contradictory defaults; earlier hosted alternatives and original source text in the historical appendices are not active exceptions.
+
+**Evidence status:** specification update only. No software implementation, penetration test, data-egress test, security certification or production release is established by this document.
 
 <details>
 <summary>Contents — sections 1–218 and consolidation appendices</summary>
@@ -244,6 +250,8 @@
 - [Appendix B — Exact edits and preservation checks](#appendix-b)
 - [Appendix C — Original amendment register and source metadata](#appendix-c)
 
+- [Appendix D — Revision 1.1 changes and integrity](#appendix-d)
+
 </details>
 
 ---
@@ -297,7 +305,7 @@
 
 ## Product Definition
 
-ORVIA is a cloud-delivered privacy operations and control platform that enables organisations to:
+ORVIA is a subscription/licence-based privacy operations and control product purchased and downloaded from the ORVIA website, with its complete licensed runtime deployed in the customer’s own organisation or customer-controlled cloud, that enables organisations to:
 
 - discover and map personal-data processing;
 - define purposes and privacy policies;
@@ -313,11 +321,11 @@
 - detect privacy-control drift;
 - assist engineering teams through privacy regression testing.
 
-ORVIA should support architectures where sensitive personal data remains in the customer's environment and should minimise unnecessary movement of personal data to ORVIA infrastructure.
+The default deployment is `CUSTOMER_LOCAL`: end-client/customer personal data and customer operational records must remain in the customer-controlled environment and must not be transmitted to ORVIA-operated infrastructure. ORVIA, as the software vendor, receives only the explicitly permitted commercial, licensing and restricted service information defined in §31. Local processing is a mandatory product boundary, not a best-effort preference.
 
 ## REFINED PRODUCT THESIS
 
-**Retained:** ORVIA, Unified DPDPA Privacy Control Platform; the seven-stage operating loop; cloud-first delivery with customer-side execution; Foundation, Control and Enterprise; deterministic operations with an optional AI assistance layer. [O§2–4, O§63, O§76–81]
+**Retained:** ORVIA, Unified DPDPA Privacy Control Platform; the seven-stage operating loop; website/cloud distribution with customer-hosted execution; Foundation, Control and Enterprise; deterministic operations with an optional AI assistance layer. [O§2–4, O§63, O§76–81]
 
 **Proposed positioning:** A DPDP-first privacy control engineering and assurance platform: define approved processing, implement controls at supported boundaries, coordinate actions across systems, and continuously show what is working, failing, unverified or outside coverage.
 
@@ -332,6 +340,16 @@
 | Security/audit leader | What was observed, with what limits, and can the history be trusted? | Scoped verification, provenance, incident timeline and coverage gaps |
 
 ORVIA should win through repeatable integration quality, explicit uncertainty and low operating effort—not through the number of dashboard pages. This is a competitive hypothesis to validate, not a claim of market uniqueness.
+
+## MANDATORY DELIVERY AND TRUST REQUIREMENTS
+
+**Customer requirement, incorporated 16 September 2026:** buy the appropriate subscription/licence on the ORVIA website; download the licensed product; install it in the customer’s infrastructure; operate it without sending the customer’s clients’ or customers’ information to ORVIA. The website/cloud is a distribution and commercial service, not the processing destination for customer privacy operations.
+
+**Security requirement:** design, implement, test and maintain a highly secure product using the measurable controls and release gates in §§109, 126, 163–164 and 206. “Unbreachable,” “zero vulnerabilities” and equivalent absolute promises are not approved product claims.
+
+`CUSTOMER_LOCAL` is the default for all editions offered under this promise. Enterprise can add scale, advanced integrations, resilient deployment and private-AI management; the baseline data boundary and essential security cannot depend on buying a more expensive edition. An unsupported deployment must be labelled unsupported, not silently redirected to a hosted service.
+
+The pre-existing vendor-hosted SaaS alternatives remain recorded as non-default architectural options in §§33 and 86; they are not enabled under this customer-local offer. Enabling a different data-handling model would require a separate, explicit product decision and accurate revised disclosures—not a hidden fallback or a support-session override.
 
 ---
 
@@ -555,7 +573,7 @@
 
 ## TENANT ISOLATION AND ACCESS GOVERNANCE
 
-Add service identities, short-lived machine credentials, scoped API tokens, approval separation and periodic access reviews. Support access is customer-authorized, just-in-time, time-limited and auditable; staff do not gain data access from a billing or support role.
+Add service identities, short-lived machine credentials, scoped API tokens, approval separation and periodic access reviews. Customer-side support access is customer-authorized, just-in-time, time-limited and auditable. Under `CUSTOMER_LOCAL`, these privileges are for authorised customer personnel; ORVIA vendor staff do not receive production-data access from a billing role, support role or support approval (§95).
 
 ---
 
@@ -732,6 +750,12 @@
 
 **Proposal:** Begin with a modular API/control-plane application, durable workers, a policy decision service, the customer agent, the web/portal applications and an isolated AI gateway. Logical modules do not each require independent microservices. Preserve the original TypeScript/React/Node/PostgreSQL/Temporal direction, with OPA as the proposed initial policy implementation subject to an ADR and benchmark.
 
+## LOCATION OF THE SHARED PLATFORM
+
+In `CUSTOMER_LOCAL`, the console, APIs, portal, identity integration, graph, policy engine, workflow engine, databases, caches, connector control, verification, evidence, tests, incident functions, search and operational AI gateway run inside the customer boundary. A connector-only download with the real graph/workflow/evidence services still hosted by ORVIA does not satisfy this deployment model.
+
+The local licensing component verifies entitlements; commercial checkout and invoicing remain vendor services. Reuse code and interfaces where appropriate, but do not share customer runtime databases, signing authority or service credentials with the vendor commerce plane.
+
 ---
 
 <a id="orvia-section-12"></a>
@@ -1179,6 +1203,12 @@
 
 Add abuse controls for the public portal, accessible bot mitigation, attachment isolation and malware handling. Do not frustrate legitimate rights requests with indiscriminate identity-document demands. The customer defines proportionate verification and appeal procedures.
 
+## CUSTOMER-HOSTED PORTAL REQUIREMENT
+
+Serve the portal and its submission/status APIs from customer-controlled infrastructure. Notices, consent receipts, identity evidence, grievances, request attachments and access packages must not transit ORVIA’s website, CDN, logging service or support systems. The portal may be reachable by authorised Data Principals without exposing the administrative console or databases publicly.
+
+Bundle required UI assets locally. Do not embed vendor analytics, session replay, external chat widgets or remotely loaded scripts that can disclose portal activity. Authorised delivery from the customer directly to the relevant Data Principal remains a rights workflow; ORVIA is not an intermediary for that content.
+
 ---
 
 <a id="orvia-section-21"></a>
@@ -1496,7 +1526,7 @@
 Architecture:
 
 ```text
-                 ORVIA CLOUD
+        CUSTOMER-HOSTED ORVIA CONTROL PLANE
                       │
                 Secure channel
                       │
@@ -1509,7 +1539,7 @@
 
 ```
 
-The connector should normally make outbound secure connections.
+The connector should normally initiate secure connections to the customer-hosted ORVIA control plane. “Outbound” describes connection direction; it does not authorise a connection to ORVIA’s vendor cloud or any unapproved destination.
 
 Do not require customers to expose databases directly to the internet.
 
@@ -1517,7 +1547,7 @@
 
 **Proposal:** The agent accepts typed, signed instructions over an outbound-authenticated channel. Use distinct installation and tenant identities, short-lived credentials, certificate rotation and revocation. Customer database credentials remain local or in the customer's secrets manager.
 
-A command envelope binds tenant, installation, environment, workflow/action, capability, schema version, scope digest, approval digest, expiry, nonce and operation budget. The agent independently validates the envelope and local configuration. A cloud-side authorization check alone is insufficient protection for a powerful local process.
+A command envelope binds tenant, installation, environment, workflow/action, capability, schema version, scope digest, approval digest, expiry, nonce and operation budget. The agent independently validates the envelope and local configuration. A control-plane authorization check alone is insufficient protection for a powerful local process. In `CUSTOMER_LOCAL`, the control plane and command-signing authority are customer-controlled; the vendor licensing or download service cannot issue execution commands.
 
 Deny arbitrary shell, arbitrary SQL and unapproved endpoints. Database connectors use parameterized, scoped operations and explicit table/column allowlists. Use network egress controls and isolate plugins/workers with resource limits. Restrict internal URL access and defend against SSRF; outbound-only transport does not by itself prevent misuse of local access.
 
@@ -1546,7 +1576,7 @@
 - Evidence metadata
 - Error codes
 
-These can be stored in the cloud control plane where appropriate.
+These stay in the customer-hosted control plane. Their label as metadata does not authorise vendor collection; workflow, action, policy, system and evidence identifiers are excluded from the default vendor exchange.
 
 ## Category B — Personal Data
 
@@ -1559,7 +1589,7 @@
 - Customer profile
 - Sensitive fields
 
-Prefer local processing whenever technically practical.
+Process and store these only in the customer-controlled runtime. Do not send them to ORVIA-operated infrastructure, including encrypted copies, hashes, masked values or model contexts derived from them.
 
 ## Category C — Derived Results
 
@@ -1572,11 +1602,11 @@
 - Verification result
 - Masked identifier
 
-Return only what is necessary.
+Return these results to authorised services and users inside the customer deployment. Do not return principal-linked results, counts, masked identifiers or operational verification records to the vendor service.
 
 ## EXPANDED PRIVACY CONTROL GRAPH
 
-Maintain principal-level data and local lookup indices where practical. The cloud graph may reference a principal through tenant-scoped opaque identifiers. Do not construct a cross-company identity graph from matching email addresses or hashes.
+Maintain principal-level data, lookup indices and all principal references inside the customer-controlled environment. A graph hosted in the customer’s own cloud may use tenant-scoped opaque identifiers locally; ORVIA’s vendor cloud must not receive those identifiers. Do not construct a cross-company identity graph from matching email addresses or hashes.
 
 ## PERSONAL-DATA BOUNDARIES AND EVIDENCE RETENTION
 
@@ -1590,18 +1620,54 @@
 
 Control metadata, hashes, references and derived results can still be personal data. Apply classification rather than assuming exemption.
 
+## EXPLICIT MINIMUM VENDOR-DATA CONTRACT
+
+**Terminology:** “customer environment” means the infrastructure, cloud account/project, encryption keys and administrative access controlled by the purchasing organisation. It is not necessarily an on-premises building or a particular country. A cloud provider can operate underlying infrastructure without ORVIA becoming the recipient of the customer’s application data. Geographic residency and cloud-provider access commitments must be specified separately.
+
+The following is the permitted collection specification, not a claim that every listed field must be collected. Omit any field not necessary for the purchased service. Before shipping, define each allowed field’s purpose, destination, access, retention/deletion schedule and whether the customer can disable its transmission.
+
+| Information class | Permitted vendor handling | Boundary |
+|---|---|---|
+| Commercial account | Organisation/business name, designated business account contact, necessary billing/tax details, order/subscription/payment reference and support contact | Supplied for purchasing/support, never discovered by reading customer systems. Business contact details can themselves be personal data; do not claim ORVIA processes no personal data at all. |
+| Licensing | Vendor account ID, licence ID, edition, purchased entitlements, validity, licensed limits and a random installation identifier where needed | Installation ID identifies the installation, not a Data Principal. Do not upload end-customer/user directories, customer counts or record-derived fingerprints. Enforce limits locally where possible. |
+| Distribution/security service records | Requested release/artifact identifier, download authorisation outcome, necessary request timestamp and transport metadata such as source IP | Restrict access and retention; explain that contacting a vendor website normally exposes connection metadata. Do not add device/browser fingerprinting or operational payloads. Offline transfer avoids runtime callbacks. |
+| Optional diagnostics | Customer-approved product/component versions, bounded health/error enums and necessary resource-use summaries generated from an allowlisted schema | Off by default; local preview and approval. No workload content, operational IDs, stack traces with values, internal hostnames, database names, table/field names or identifiable small-group counts. |
+| Customer operational information | Principal records/references, consents, notices with personal content, requests, attachments, system maps, policies, events, workflow/action records, evidence, logs, backups, search indexes, embeddings, prompts and outputs | Customer-local only. Do not upload through licensing, analytics, AI, support, updates, crash reporting or an ORVIA-managed intermediary. |
+| Secrets and key material | Customer credentials, API tokens, authentication signing keys, decryption keys and connector secrets | Customer-local only. No vendor escrow, master decryption key or recovery backdoor. |
+
+A minimal online licence request may contain the following fixed-shape fields; the server rejects unrecognised fields and does not persist rejected bodies:
+
+```json
+{
+  "schema_version": 1,
+  "license_id": "lic_example",
+  "installation_id": "random_installation_reference",
+  "nonce": "single_use_random_value"
+}
+```
+
+The example is a data-minimisation contract, not a production authentication protocol. Use authenticated transport, replay protection and a locally verified signed response. Keep the installation identifier independent of customer records, hardware serials and end-customer identity. The vendor already knows the purchased edition and should not ask the runtime to rediscover it from customer data.
+
+**Enforcement:** deny vendor egress by default; expose only documented licensing/update endpoints through a narrowly scoped broker or approved proxy. Restrict destinations, methods, paths, fixed field formats, payload sizes and cadence. Workload services and arbitrary connector/AI code must not have direct vendor-network credentials or unrestricted internet access. Log authorised outbound exchanges locally without collecting sensitive rejected payloads on the vendor side. A JSON allowlist alone is not a complete barrier against a compromised host; customer network controls and the security programme provide additional layers.
+
+**No telemetry exception:** hashed, encrypted, redacted or “anonymous” operational data is not automatically eligible for vendor transmission. The default does not monetise, sell, train models on or aggregate end-customer data across organisations.
+
+**External systems:** preserve all existing connector, notification and AI capabilities, but apply the actual destination boundary. Internal systems and customer-controlled cloud services can operate in `CUSTOMER_LOCAL`. Sending personal data to an external SaaS processor or external model provider is a distinct, customer-approved external-processing configuration and must not be advertised as “nothing leaves the organisation.” It still must not route personal data through ORVIA’s vendor infrastructure. In the strict no-external-processing profile, block such destinations. Direct authorised responses to a Data Principal must go through the customer’s own portal/delivery path, not ORVIA’s commerce plane.
+
+If prohibited material is accidentally received by vendor support or another channel, stop propagation, restrict access, treat it as a boundary incident and follow the documented minimisation, evidence and deletion process. Do not use it for debugging or model training, and do not imply such an incident could never occur.
+
 ---
 
 <a id="orvia-section-32"></a>
 
 # 32. PRIVACY-PRESERVING EXECUTION MODEL
 
-Prefer:
-
-```text
-ORVIA CLOUD
+Required in `CUSTOMER_LOCAL`:
+
+```text
+CUSTOMER-HOSTED ORVIA
     ↓
-Instruction
+Locally authorised instruction
     ↓
 Customer Agent
     ↓
@@ -1609,9 +1675,9 @@
     ↓
 Local action
     ↓
-Result
+Local verification and evidence
     ↓
-ORVIA CLOUD
+CUSTOMER-HOSTED ORVIA
 
 ```
 
@@ -1634,17 +1700,17 @@
 
 # 33. PORTAL DATA BOUNDARY
 
-Because Data Principal requests may contain personal data, the system must support two modes:
-
-### Standard mode
-
-Minimal request information can be processed through ORVIA Cloud.
-
-### Data-local mode
-
-The customer can deploy the privacy portal/request-processing component in the customer's environment so sensitive request contents remain local.
-
-The enterprise architecture must support both.
+Because Data Principal requests can contain personal data, the default portal and request-processing components must run in the customer environment.
+
+### Data-local mode — active default
+
+All request content, personal identifiers, uploaded files, consent interactions and request-status records remain customer-local. No ORVIA-operated proxy, analytics endpoint or vendor-side queue may handle those records. Authentication for the privacy portal is customer-controlled and separate from the ORVIA purchase account.
+
+### Vendor-hosted standard mode — retained alternative, not enabled
+
+The earlier architecture allowed minimal request information through an ORVIA-hosted portal. That option is retained as an alternative design only; it does not satisfy the user’s current “customer information stays in their organisation” requirement and must not be enabled, sold under that promise or selected automatically. A future separate offer would require a revised product/data-processing decision and explicit disclosures.
+
+Retaining the alternative in the design does not reduce the mandatory data-local boundary for the current product.
 
 ---
 
@@ -1652,7 +1718,7 @@
 
 # 34. CLOUD ARCHITECTURE
 
-Recommended default:
+Required location: the operational architecture below is deployed in the customer’s infrastructure. “Load Balancer / CDN” means a customer-controlled entry point approved for this boundary, not ORVIA’s website/CDN. Do not forward payloads, identifiers or request logs to a vendor edge service.
 
 ```text
                     INTERNET
@@ -1683,13 +1749,26 @@
 
 ```
 
+## SEPARATE VENDOR COMMERCE AND CUSTOMER OPERATIONAL PLANES
+
+| Vendor-operated website/cloud | Customer-operated ORVIA runtime |
+|---|---|
+| Product website, checkout, business account and invoices | Admin console, portal and customer identity integration |
+| Subscriptions, entitlements and signed licence issuance | Local licence verification and entitlement enforcement |
+| Authenticated package downloads and signed update catalogues | Customer-approved installation, update validation and migrations |
+| Minimal business support and allowlisted diagnostic intake | Databases, graph, policies, consent, rights, workflows, connectors, evidence, tests, AI and observability |
+
+These planes have separate accounts, databases, credentials and trust roles. The vendor does not hold a customer runtime administrator, connector command-signing key, database account or decryption key. Compromise of a billing account must not grant access to a customer deployment.
+
+Runtime privacy decisions, identity matching, approvals, verification and evidence must not depend on a vendor API call. A paid account obtains software and entitlements, not a vendor-mediated processing channel. Validate vendor replies as untrusted input: licence responses cannot contain executable commands, support access grants or new data-export destinations.
+
 ---
 
 <a id="orvia-section-35"></a>
 
 # 35. MULTI-TENANCY
 
-The cloud product must support strict tenant isolation.
+Every multi-tenant deployment—including customer-operated group workspaces and the separate vendor commercial service—must support strict tenant isolation.
 
 Every tenant-owned object must have:
 
@@ -1761,6 +1840,10 @@
 
 OWASP specifically recommends centralised storage, provisioning, auditing and rotation of secrets rather than scattering credentials across source/configuration.
 
+## CUSTOMER SECRET OWNERSHIP
+
+In `CUSTOMER_LOCAL`, resolve customer secrets only through a customer-managed secret store or a supported local protected store. ORVIA vendor services have no read permission, shared master secret or remote recovery credential. Separate commercial licence-signing keys from runtime authorisation and encryption keys. Bootstrap must generate or enrol unique installation identities without shipping shared production credentials.
+
 ---
 
 <a id="orvia-section-38"></a>
@@ -1821,6 +1904,10 @@
 Customer HSM / compatible solution
 
 ```
+
+## NO VENDOR DECRYPTION OR EXECUTION KEY
+
+The customer controls runtime encryption, authentication and connector-command keys. Vendor licence/update public keys are verification material only; they must not unlock customer data or authorise privacy actions. Keep vendor signing private keys in separately controlled signing infrastructure. Support key rotation and recovery through the customer’s approved process without uploading customer key material to ORVIA. Customer-side encryption does not by itself prevent a compromised authorised process from reading data; access isolation and monitoring remain required.
 
 ---
 
@@ -1901,7 +1988,7 @@
 
 ## POLICY DECISION CONTRACT AND LOCAL ENFORCEMENT
 
-The cloud hosts authoring, approval, distribution and evidence coordination. An optional customer-local policy decision service evaluates signed published bundles and local references. The SDK calls that service or the cloud API; it does not embed the full policy set. OPA supports signed bundle verification, but freshness, rollback safety and revocation transport remain ORVIA responsibilities. [R7]
+In `CUSTOMER_LOCAL`, the customer-hosted platform provides authoring, approval, policy distribution and evidence coordination. Its policy decision service evaluates signed published bundles and local references. The SDK calls that customer-hosted service/API, never a vendor decision endpoint carrying personal context; it does not embed the full policy set. OPA supports signed bundle verification, but freshness, rollback safety and revocation transport remain ORVIA responsibilities. [R7]
 
 ---
 
@@ -1925,7 +2012,7 @@
 
 Versioned consent becomes an ordered state machine with revocation freshness and execution-time checks.
 
-SDKs call a cloud or customer-local policy service. Signed policy bundles live in that service, not inside application SDK code.
+SDKs call the customer-controlled policy service, whether on premises or in the customer’s cloud. Signed policy bundles live in that service, not inside application SDK code. No vendor policy endpoint receives customer principal context in `CUSTOMER_LOCAL`.
 
 ---
 
@@ -1933,7 +2020,7 @@
 
 # 43. OFFLINE / DEGRADED OPERATION
 
-Customer-side components should have explicit behaviour when ORVIA Cloud is unavailable.
+Customer-side components must distinguish vendor website/licensing unavailability from failure of the customer’s own operational services. With a valid locally verifiable licence, loss of the vendor connection must not stop local privacy operations.
 
 Possible modes:
 
@@ -1958,6 +2045,12 @@
 ## DEPLOYMENT, RESILIENCE AND MEASUREMENT
 
 Keep runtime enforcement isolated from expensive scans, exports and AI jobs. Use per-tenant and provider workload quotas. Define failure behavior for cloud outage, local policy failure, expired bundle, stale revocation cursor, full agent spool, unavailable secret store and interrupted external side effects.
+
+## OFFLINE LICENSING AND STRICT NETWORK MODE
+
+Provide signed licence import and approved package/update transfer without requiring runtime internet access. Entitlements and expiry are evaluated locally with explicit clock/tamper handling. Define safe behaviour for expiry, revocation information that cannot be refreshed, renewal and support handover; do not silently fail open, destroy data, disable an accepted restriction or grant remote vendor control (§160).
+
+“No runtime vendor callback” is not automatically a claim of fully engineered air-gap support. Air-gap packaging, dependency mirrors, offline trust updates and operational testing remain explicit requirements in §86.
 
 ---
 
@@ -2634,6 +2727,12 @@
 
 The deterministic core must continue functioning if AI is unavailable.
 
+## AI REMAINS INSIDE THE SAME DATA BOUNDARY
+
+For operational/customer content, all seven AI functions must use inference, retrieval, embeddings, model logs and tool execution inside the customer-controlled boundary. A customer-hosted/private model is required for these functions in strict mode. If unavailable, report the affected AI capability unavailable and keep the deterministic platform running; never fall back to a vendor-hosted or public model endpoint.
+
+Development use of GPT/Claude does not authorise runtime transmission of customer data. Use synthetic fixtures for development and externally assisted demonstrations. Do not paste customer records, evidence, incident payloads, credentials or identifiable “redacted” excerpts into external coding chats.
+
 ---
 
 <a id="orvia-section-64"></a>
@@ -2667,7 +2766,11 @@
 
 ## AI COPILOT: USEFUL, CONSTRAINED AND EVALUATED
 
-Separate customer content from provider settings. Support approved model/provider routing, data minimization, prompt logging controls, retention restrictions, regional routing and local/private inference where deployed. Never claim that a provider does not retain or train on data without the applicable contract/configuration supporting that claim. Customer production records must not be used to train a shared ORVIA model without a separately authorized arrangement.
+Separate customer content from provider settings. Support approved model/provider routing, data minimization, prompt logging controls, retention restrictions, regional routing and local/private inference where deployed. Never claim that a provider does not retain or train on data without the applicable contract/configuration supporting that claim. Customer production records must not be used to train a shared ORVIA model under this product model.
+
+## PROVIDER ROUTING BY DEPLOYMENT PROFILE
+
+Keep the existing provider abstraction. In strict mode, Provider A/Provider B adapters can be enabled only for endpoints proven to run within the approved customer boundary; a private network endpoint to an external provider is not by itself evidence of in-boundary processing. Disable public/external providers for operational data. Any separately customer-approved external-processing configuration must be explicitly labelled outside the strict no-external-processing profile and must not route the data through ORVIA vendor servers (§31).
 
 ---
 
@@ -2689,6 +2792,10 @@
 ```
 
 Do not send an entire production database to an LLM simply because a user asks a question.
+
+## MINIMISATION DOES NOT AUTHORISE EXPORT
+
+Redaction, masking, hashing and structured-context construction reduce exposure but do not permit customer operational data to leave the defined boundary. Apply minimisation before customer-local inference as well. Model caches, embeddings, prompt/output traces, evaluation data and error captures inherit the same local storage, access and retention controls.
 
 ---
 
@@ -2962,6 +3069,10 @@
 
 ```
 
+## CUSTOMER-CONTROLLED NOTIFICATION DELIVERY
+
+Operational messages originate from the customer deployment and use its authorised portal, relay or integration. ORVIA’s vendor billing mailer must not receive Data Principal addresses, request details or incident content. External messaging/SaaS delivery requires the explicit boundary treatment in §31; strict mode does not silently substitute an external vendor service when a local relay fails. Licence and renewal messages use the separately supplied business contact only.
+
 ---
 
 <a id="orvia-section-76"></a>
@@ -2990,6 +3101,10 @@
 Deployment rights
 
 ```
+
+## LICENCED FULL-PRODUCT DISTRIBUTION
+
+A successful purchase grants the defined download/deployment rights for the full licensed runtime, not merely a connector linked to a mandatory vendor-hosted workspace. The purchase portal must clearly state the edition, supported deployment package, permitted installations/environments, support period, update rights and expiry/continuity terms before checkout. Enforce entitlements locally without counting or inspecting end-customer records for vendor billing.
 
 ---
 
@@ -3039,7 +3154,7 @@
 - Failure center
 - Basic connectors
 - Basic reporting
-- Cloud delivery
+- Website/cloud distribution of the customer-hosted licensed product
 - Secure customer connector
 
 Position:
@@ -3088,7 +3203,7 @@
 Control plus:
 
 - Enterprise identity
-- Customer-controlled cloud
+- Advanced customer-controlled cloud deployment and fleet management
 - High availability
 - Advanced security
 - Advanced incident response
@@ -3097,7 +3212,7 @@
 - Restricted processing
 - Children-focused policy pack
 - Advanced retention/destruction
-- Local/private AI
+- Advanced local/private AI management and deployment
 - Restricted network
 - Air-gapped deployment capability where engineered and supported
 - Advanced connectors
@@ -3148,6 +3263,10 @@
 Premium features can automate, scale, integrate and harden operations. They cannot make an unverified action appear verified in a lower edition. A tenant whose use case cannot be safely supported must be told the limitation—not silently operate without an applicable safeguard.
 
 **Acceptance:** Downgrading cannot make marketing ALLOW because the enforcement module entitlement changed; outstanding work has an explicit owner and transition state.
+
+## NO PRIVACY OR ESSENTIAL-SECURITY PAYWALL
+
+For every edition sold as `CUSTOMER_LOCAL`, personal data stays local; essential authentication, authorisation, encrypted transport, secure updates, auditability and vulnerability fixes for supported releases are part of the baseline. Larger scale, advanced SSO/federation management, high availability, automated fleet administration and additional AI/integration capacity can remain differentiated. An edition without a suitable local model must disable operational AI rather than export data to make a feature appear available.
 
 ---
 
@@ -3177,6 +3296,10 @@
 
 A public trust/security page should describe actual architecture, subprocessors, data handling, support access and tested controls. Certifications, uptime numbers, no-training claims and residency promises must match actual scope. The readiness scanner produces prioritized gaps and clearly labeled assumptions, not a legal certificate.
 
+## PURCHASE, DOWNLOADS AND SECURITY CENTRE
+
+Provide an authenticated customer purchase/download area with the purchased edition, invoices, signed licence, supported deployment packages, exact versions/digests, verification instructions, release/security notes and renewal controls. Publish a security/trust centre with the actual data-flow boundary, minimum vendor-data inventory, vulnerability-reporting route, supported-version policy and evidence-backed assessment scope. Do not publish certification badges or “zero vulnerability” claims without support (§168).
+
 ---
 
 <a id="orvia-section-83"></a>
@@ -3194,21 +3317,25 @@
   ↓
 Purchase
   ↓
-Organisation created
+Vendor business account created
   ↓
-License assigned
+Subscription/licence and deployment rights assigned
   ↓
-ORVIA workspace available
+Download signed full ORVIA deployment package and licence
   ↓
-Download Connector
+Verify package origin, signature and digest
   ↓
-Install Connector
+Install ORVIA in the customer organisation / customer-controlled cloud
   ↓
-Connect systems
+Configure customer identity, local storage, keys and outbound restrictions
   ↓
-Configure policies
+Install or enable local connectors
   ↓
-Start operations
+Connect customer systems using local credentials
+  ↓
+Configure policies and test privacy/data-boundary controls
+  ↓
+Start customer-local operations
 
 ```
 
@@ -3243,6 +3370,10 @@
 
 Add onboarding prerequisites: permission inventory, network routes, legal entity, purpose owner and test environment. The wizard must distinguish “connected” from “safe to mutate.” Begin in Observe mode, then dry-run, reversible enforcement, and approved destructive operations.
 
+## CUSTOMER-LOCAL ONBOARDING GATES
+
+Before go-live, display and verify the runtime location, customer-controlled identity/keys, local storage/backup targets, allowed egress, disabled vendor telemetry, licence validity and complete package signature verification. Show the precise vendor-data inventory and any optional diagnostic selection. Run a synthetic boundary test before enabling real personal-data processing. Reject a configuration requiring a vendor endpoint to receive operational content.
+
 ---
 
 <a id="orvia-section-85"></a>
@@ -3252,7 +3383,8 @@
 The customer downloads:
 
 ```text
-ORVIA Connector
+ORVIA full deployment package + signed licence
+ORVIA Connector package (bundled or separately installed as needed)
 
 ```
 
@@ -3269,17 +3401,23 @@
 - validate prerequisites;
 - establish secure identity;
 - register the installation;
-- establish secure outbound connectivity;
+- establish only explicitly allowed connectivity to the customer control plane and approved distribution/licence endpoints;
 - run health checks;
 - show connector status.
 
+## SECURE FULL-PRODUCT INSTALLATION
+
+Provide supported container/VM/service packages and deployment guides for the licensed profile. Include the console/API/portal, worker/orchestration, local stores, policy service, connectors and optional in-boundary AI components required by that profile. State resource and cloud-service prerequisites rather than implying an installer supports every infrastructure environment.
+
+The installer must verify signed manifests and artifact digests against a trusted release identity before execution; use a bootstrap trust process not dependent solely on an unverified checksum from the same download page. Create unique local administrator/bootstrap credentials, validate network/storage permissions, separate public portal ingress from private administration, and disable sample accounts/debug endpoints. Never execute an unreviewed remote script as an installation shortcut. Local setup must not upload customer records, cloud credentials or runtime secrets to ORVIA.
+
 ---
 
 <a id="orvia-section-86"></a>
 
 # 86. CUSTOMER-CONTROLLED CLOUD DEPLOYMENT
 
-Enterprise customers should be able to deploy ORVIA into:
+Customers with the appropriate subscription/licence must be able to deploy a supported complete ORVIA package into their organisation or customer-controlled cloud, including the supported profiles among:
 
 - AWS
 - Azure
@@ -3300,7 +3438,19 @@
 
 ## DEPLOYMENT, RESILIENCE AND MEASUREMENT
 
-Deployment profiles remain shared-codebase SaaS, SaaS plus local agent/portal, customer-controlled cloud, and engineered restricted/air-gapped enterprise. Air gap requires offline update/signature trust, dependency mirrors, offline license behavior, diagnostics export and offline rule-pack distribution; it is not a checkbox on a connected deployment.
+Deployment profiles retain customer-controlled cloud and engineered restricted/air-gapped enterprise. Earlier shared-codebase SaaS and SaaS-plus-agent/portal options remain recorded alternatives, not enabled parts of the default customer-local offer (§33). Air gap requires offline update/signature trust, dependency mirrors, offline license behavior, diagnostics export and offline rule-pack distribution; it is not a checkbox on a connected deployment.
+
+## SHARED RESPONSIBILITIES WITHOUT VENDOR DATA ACCESS
+
+| Responsibility | ORVIA vendor | Customer |
+|---|---|---|
+| Product and downloads | Secure code, maintained dependencies, signed packages, supported configuration guidance, advisories and fixes | Verify approved package and install only supported builds |
+| Runtime infrastructure | Supply tested manifests/hardening checks and documented prerequisites | Own cloud account/network, host security, resources, administrators and approved exposure |
+| Secrets and operational access | No default runtime credentials, decryption access or support backdoor | Own identity, roles, keys, connector permissions and recovery procedures |
+| Patching and resilience | Publish tested upgrades and clear security urgency/compatibility | Apply approved patches and test backups/restores within the agreed operating model |
+| Support | Receive only approved business information and schema-limited diagnostics | Execute local diagnostic commands and retain operational evidence locally |
+
+A local deployment still requires safe operation, updates and customer infrastructure controls. It is not a guarantee against compromise by an attacker or an authorised host administrator. The vendor must not shift responsibility for defects in its product to the customer.
 
 ---
 
@@ -3346,13 +3496,17 @@
 
 Every connector action should be traceable.
 
+## LOCAL OBSERVABILITY; VENDOR TELEMETRY OFF
+
+Operational logs, metrics, traces, crash dumps and error reporting remain inside customer-controlled storage and collectors. Disable SDK/framework automatic telemetry and crash uploads; audit transitive dependencies and browser traffic as well as backend code. Do not log passwords, tokens or request bodies unnecessarily even locally. The vendor has no central per-principal or per-workflow monitoring feed. Optional schema-limited diagnostics are governed by §§31 and 95.
+
 ---
 
 <a id="orvia-section-89"></a>
 
 # 89. MONITORING DASHBOARD
 
-Operations team should see:
+The customer’s authorised operations team should see these runtime measures locally; ORVIA’s vendor team sees only its own commercial/distribution infrastructure and explicitly approved limited diagnostics:
 
 ```text
 API health
@@ -3416,6 +3570,10 @@
 
 For backups that cannot be selectively edited, record the technical restriction, isolation controls, retention schedule, restore procedure and customer-approved legal treatment. Maintain a minimal, protected suppression/deletion ledger only to the extent needed and justified. It can itself contain personal data and therefore needs its own access and retention policy.
 
+## BACKUP LOCATION AND KEY CUSTODY
+
+Keep runtime databases, configuration, evidence, workflow histories and their backups in the customer’s approved storage boundary under customer-controlled keys. Do not copy them to an ORVIA backup account or vendor support bucket, even encrypted. Vendor commercial databases have separate backup/retention policies for the limited information in §31. Test restoration without a vendor data-recovery channel and reconcile accepted restrictions before processing resumes.
+
 ---
 
 <a id="orvia-section-92"></a>
@@ -3461,9 +3619,9 @@
 
 # 93. UPDATE SYSTEM
 
-ORVIA Cloud:
-
-- continuous controlled deployment
+ORVIA vendor website, commerce and distribution services:
+
+- continuous controlled deployment of those vendor services only; no implicit upgrade or remote execution in customer installations
 
 Customer-controlled deployment:
 
@@ -3474,6 +3632,16 @@
 - compatibility information
 
 Do not make updates dependent on access to customer PII.
+
+## SIGNED UPDATES AND SUPPLY-CHAIN PROTECTION
+
+Build releases from reviewed source in isolated CI; lock and review dependencies; scan code, dependencies, container/OS layers, infrastructure definitions and secrets. Produce a software bill of materials (SBOM), immutable version/digest, build provenance, security notes and compatibility information for each release. These are ORVIA engineering requirements, not claims that they are already implemented.
+
+Separate website operations, build execution, release approval and signing authority. Protect signing keys with narrowly scoped access and independent approval for high-impact releases. Verify package signatures, trusted signer, manifest consistency and version policy locally before installation. A hash supplied by the same compromised download page is not sufficient proof of origin.
+
+Support customer-approved rollout windows, offline import, rollback or tested forward recovery, signing-key rotation, revoked-artifact notifications and protection against downgrade to known-unsafe releases. Plan migrations and outage recovery explicitly. A signed update is authenticated software, not proof of vulnerability-free software.
+
+Updates, connector plugins, model packages and rule packs cannot silently broaden egress permissions, enable vendor telemetry, upload backups or add vendor access. Re-run the boundary/security suite on every update. A compromised vendor licence/download account must not automatically authorise software execution or customer data access.
 
 ---
 
@@ -3498,7 +3666,11 @@
 
 ```
 
-Signed licenses should be used for restricted/offline enterprise deployments.
+Signed licences must be verified locally for customer-hosted deployments, with offline import/renewal supported for the relevant deployment profile. The vendor licensing service stores only the fields permitted by §31 and has no access to principal records or runtime keys.
+
+## LICENCE TOKENS ARE NOT EXECUTION COMMANDS
+
+Licence payloads may state entitlements, validity and licensed limits only. They cannot contain executable instructions, database queries, arbitrary endpoints or remote support grants. Validate signature, schema, audience and installation binding where applicable. Reject malformed or replayed state changes. Failure or expiry invokes the documented continuity policy (§160), not data destruction, personal-data upload or relaxation of enforced privacy restrictions.
 
 ---
 
@@ -3511,15 +3683,15 @@
 ```text
 Help
  ↓
-Generate Diagnostic Bundle
- ↓
-Review
- ↓
-Mask
- ↓
-Customer Approval
- ↓
-Encrypted Upload
+Generate schema-allowlisted diagnostic bundle locally
+ ↓
+Automated forbidden-field check and local preview
+ ↓
+Customer review; replace any operational context with synthetic reproduction
+ ↓
+Explicit approval of permitted fields only
+ ↓
+Optional encrypted upload
  ↓
 Support
 
@@ -3531,14 +3703,19 @@
 - connector version
 - health
 - error codes
-- workflow IDs
-- configuration metadata
-- performance metadata
-- masked references
+- bounded non-identifying configuration enums allowed by §31
+- necessary coarse resource/performance metadata allowed by §31
+- vendor support-ticket ID, never an operational workflow/principal reference
 
 Default:
 
-> No raw customer records.
+> No customer operational records, principal references, masked/hashed identifiers, request payloads, evidence, screenshots showing customer data, memory dumps, secrets or unrestricted logs. Customer approval does not waive this boundary.
+
+## LOCAL SUPPORT WITHOUT VENDOR PRODUCTION ACCESS
+
+Keep diagnostics generation and previews customer-local. All uploads are optional and schema-limited; a failed scan blocks upload rather than falling back to an unfiltered archive. Use synthetic reproductions for complex defects. Disable automatic error attachments and support-screen capture. Do not require customers to share production records to obtain a security patch or use core support.
+
+ORVIA staff must not view customer personal data through remote desktops, screen sharing or live terminals under the strict profile: seeing it remotely is still access even without copying a database. The customer executes diagnostic commands. A different managed-access service is not implied by this specification.
 
 ---
 
@@ -3554,7 +3731,7 @@
 - respond
 - request additional diagnostics
 
-Support must not automatically gain production access to customer data.
+Support has no vendor-accessible production-data account, remote shell or hidden support tunnel under `CUSTOMER_LOCAL`. Customer-controlled support roles in the runtime belong to authorised customer personnel; ORVIA staff operate the separate business support portal only.
 
 ---
 
@@ -3916,7 +4093,7 @@
 
 Minimum security controls:
 
-- MFA capability
+- MFA required for privileged production access, with phishing-resistant methods where supported
 - secure password storage where local authentication is used
 - SSO for enterprise
 - session expiration
@@ -3940,6 +4117,27 @@
 
 **Proposal:** Maintain threat models for public portal impersonation, excessive access disclosure, malicious tenant administrators, compromised agents, poisoned connector responses, stolen signing keys, replayed approvals, dependency compromise and injected AI instructions.
 
+## SECURITY-BY-DESIGN REQUIREMENT AND VERIFICATION BASELINE
+
+**Mandatory product requirement:** prevent unauthorised access and data movement through layered controls; detect and contain incidents; remediate vulnerabilities throughout supported product life. Every edition must meet the baseline. These are requirements to implement and verify, not evidence that the current product is already secure.
+
+Use **NIST SP 800-218 SSDF v1.1** as the secure-development process baseline and a version-pinned **OWASP ASVS 5.0.0** assessment matrix for the applicable web/API controls. Proposed target: the applicable ASVS Level 2 requirements, plus explicitly identified higher-assurance requirements for administration, key custody, connectors, approvals and sensitive actions. Document non-applicable controls and their rationale. Selecting some higher-assurance controls does not establish full Level 3 verification or a certification. [S1; S2]
+
+NIST frames secure development as reducing vulnerabilities and mitigating the impact of undetected or unaddressed flaws. ORVIA therefore must not claim that security testing proves absence of every vulnerability, that customer-hosting makes compromise impossible, or that no future breach can occur. [S1]
+
+| Security area | Required product behaviour | Required evidence |
+|---|---|---|
+| Identity and privilege | Privileged MFA; no shared/default production passwords; secure session/token handling; least privilege; independent approvals for high-impact operations | Authentication, session, access-control and privilege-escalation tests |
+| Application and API | Server-side ownership checks; bounded input; safe encoding/queries; upload isolation; rate limits; SSRF/CSRF protections as applicable | Positive and negative tests for each exposed interface |
+| Runtime and network | Private administrative/database interfaces; customer-managed ingress/egress; isolated services; non-privileged workloads; no arbitrary execution or unrestricted connector traffic | Hardening checks, segmentation tests and egress capture |
+| Secrets and cryptography | Maintained cryptographic libraries; encrypted transport/storage; customer runtime keys; separate release/licence keys; rotation and access audit | Key custody review, rotation/revocation tests and secret scans |
+| Data and evidence | Customer-local processing/storage; local access-scoped logs; no vendor operational feed; tamper-evident audit records; tested restore | Boundary tests, evidence-integrity tests and recovery exercises |
+| Build and distribution | Reviewed source/dependencies; isolated CI; versioned SBOM/provenance; authenticated release artifacts; secure update and rollback handling | Build attestation, scans and signature/update failure tests |
+| AI and plugins | Local inference for operational data; permission-filtered retrieval; strict tool broker; untrusted-content handling; isolated plugins | Injection, permission, forbidden-tool and data-leakage evaluations |
+| Operations and response | Local security monitoring; maintainable patches; accountable vulnerability intake; customer advisories; supported-version policy | Incident exercise, patch records, disclosure register and current assessment scope |
+
+For every control, record the threat, owner, implementation/build, applicable deployment, test method, result, date, limitations and unresolved findings. Security covers the vendor website/payment/download/signing systems **and** the customer runtime; the new local-data architecture does not remove supply-chain or insider threats.
+
 ---
 
 <a id="orvia-section-110"></a>
@@ -3965,6 +4163,10 @@
 - tokens
 - secrets
 - internal hostnames
+
+## NO VENDOR DATA-PLANE API
+
+Customer operational APIs require customer-issued runtime authentication and run inside the customer deployment. Vendor purchase/licence credentials must not authenticate against operational APIs. Vendor endpoints accept only documented commercial/licensing schemas (§31); reject unknown fields without storing request bodies or reflecting sensitive content. Do not put personal data in URLs, request logs or licensing error messages.
 
 ---
 
@@ -4011,6 +4213,10 @@
 ## AI COPILOT: USEFUL, CONSTRAINED AND EVALUATED
 
 Maintain evaluation sets for grounded accuracy, uncertainty handling, cross-tenant leakage, prompt injection, tool misuse, harmful action suggestions, language fidelity and unsupported legal conclusions. Measure task usefulness and cost as well as refusal/safety performance. Model/provider changes require evaluation before rollout.
+
+## LOCAL AI AND ADVERSARIAL RELEASE GATE
+
+The local model, retrieval index and tool broker remain subject to the same permissions as non-AI services. Test attempted egress through model tools, prompts, plugins, error reporting and external-provider fallback. A model may not change the deployment data boundary, approve its own actions, grant a support account or retrieve secrets. Two coding AIs reviewing each other do not substitute for independent security assessment of a production release.
 
 ---
 
@@ -4536,6 +4742,10 @@
 - documentation added
 - failure scenarios tested
 
+## SECURITY AND DATA-BOUNDARY COMPLETION
+
+A feature is not complete until its storage locations and outbound paths are documented, its customer-local restrictions are tested, its dependency/configuration changes are reviewed, and applicable release-blocking security findings are closed and retested. Store executed results against the exact build. Planned scans, AI-generated tests and unexecuted checklists do not count as passed security evidence.
+
 ---
 
 <a id="orvia-section-121"></a>
@@ -4695,6 +4905,12 @@
 Production
 
 ```
+
+## SECURITY CHECKS THAT BLOCK RELEASE
+
+Run secret detection, static analysis, dependency/SBOM checks, container and infrastructure scans, API/browser adversarial tests, tenant-isolation tests and data-egress regression on the candidate build. Record tool versions, scopes, exclusions and results. Missing or failed required checks block release; an unavailable scanner does not become a pass.
+
+Review scanner findings for affected version, reachability and impact. Preserve adjudication and independent review; do not silently delete or downgrade findings to clear a gate. Final signing/promotion requires the release owner’s and security owner’s approval, with no licence/checkout administrator able to bypass those controls.
 
 ---
 
@@ -4761,6 +4977,14 @@
 
 **Acceptance:** Attempted privilege escalation and forbidden production operations fail before external effects, with privacy-safe audit evidence.
 
+## CUSTOMER-LOCAL DATA-BOUNDARY TESTING
+
+Use synthetic identifying canaries and controlled customer/vendor endpoints. Observe network destinations and inspect payloads at controlled endpoints/proxies before encryption or after authorised test termination; seeing only encrypted packets is not proof that they contain no personal data. Also inspect browser calls, DNS requests, logs, telemetry collectors, support archives, update requests, licensing fields and AI traces.
+
+Exercise installation, login, discovery, consent/rights operations, local AI, external-provider failure, notification delivery, licence renewal/expiry, diagnostics, crashes, updates, backup and restore. Verify that vendor stores contain only the permitted schema fields and that operational canaries never reach them. Test blocked/unknown fields as well as apparently safe hashes and encoded values. Match findings to exact deployments and builds.
+
+Attempt tenant/role bypass, excessive destructive scope, command replay, forged or stale licence/update material, compromised plugin access, vendor-identity reuse against runtime APIs and unsafe support access. Independent security review must include business-logic abuse and the customer/cloud trust boundary, not only vulnerability-scanner output. The additive scenarios in §217 make these obligations testable; none is marked executed by this document.
+
 ---
 
 <a id="orvia-section-127"></a>
@@ -4931,6 +5155,10 @@
 
 **Acceptance:** Sensitive test canaries do not leak through logs, model traces, support bundles or workflow metadata; payload deletion does not silently modify the retained evidence envelope.
 
+## SEPARATE VENDOR AND CUSTOMER RETENTION STORES
+
+The runtime retention rules above execute in the customer environment. Vendor retention applies only to the permitted business/licensing/service records in §31, with a documented deletion schedule and any specifically justified retention obligations. A support, analytics or commercial database is not an alternative repository for customer workflows or evidence.
+
 ---
 
 <a id="orvia-section-133"></a>
@@ -4945,6 +5173,10 @@
 - signed evidence packages
 
 Exports themselves must be audited.
+
+## LOCAL EVIDENCE EXPORT
+
+Generate and store evidence packages in the customer runtime; download them directly to authorised customer users or customer-designated destinations. Do not upload an evidence package to an ORVIA cloud renderer, vendor signing endpoint or support service. Use customer-held signing keys for customer evidence; vendor software-release keys serve a separate purpose.
 
 ---
 
@@ -5085,11 +5317,11 @@
 
 | Phase | Delivery focus | Gate before expansion |
 |---|---|---|
-| 0 — Foundation | Monorepo, CI, tenant/IAM, graph, source registry, policy/workflow proof, agent identity, telemetry | Cross-tenant denial; signed agent bootstrap; one persisted domain event survives restart |
-| 1 — Core operations | Purposes, notices, consent, portal/rights intake, one DB and one API path, failure center, basic verification and one real regression | Marketing withdrawal works end-to-end; stale/duplicate events, wrong identity and provider timeout tested |
+| 0 — Foundation | Monorepo, CI, tenant/IAM, graph, source registry, policy/workflow proof, agent identity, local telemetry, customer-hosted package boundary | Cross-tenant denial; signed agent bootstrap; durable domain event; vendor/data-plane separation and default egress denial |
+| 1 — Core operations | Customer-installable runtime, local portal/rights intake, purposes/notices/consent, one DB and one API path, failure center, verification and a real regression | Local withdrawal works end-to-end; stale/duplicate events, wrong identity and timeout tested; no customer payload reaches vendor endpoints |
 | 2 — Control | SDK/runtime boundaries, propagation, safe execution plans, richer connectors and verification | Measured freshness; replay protection; uncertain-outcome reconciliation; production dry-run evidence |
 | 3 — Testing | Full synthetic test product, CI adapters, change simulation, drift and control-package library | A seeded privacy regression blocks a test release and identifies its owner/control |
-| 4 — Enterprise | BYOC, enterprise IAM, resilience, support controls, restricted networking and private AI | Customer-environment install, restore, upgrade, isolation and operational handover pass |
+| 4 — Enterprise | Advanced customer-cloud/fleet deployment, enterprise IAM, resilience, support controls, restricted networking and private-AI management | Advanced install, restore, upgrade, isolation and handover pass; baseline local processing remains mandatory from earlier phases |
 | 5 — Advanced | Advanced incidents/retention, advanced children/guardian automation, processor ecosystem, customer AI governance and CM interoperability | Capability-specific legal, integration, security and conformance evidence |
 
 Baseline safe guardian handling, incident intake and nomination are not postponed until advanced packs exist. If a pilot use case requires unavailable safeguards, narrow the supported deployment or implement the prerequisite before production.
@@ -5174,7 +5406,7 @@
 
 Build:
 
-- customer-controlled cloud
+- advanced customer-controlled cloud deployment and fleet operations
 - Kubernetes deployment
 - enterprise IAM
 - HA
@@ -5182,7 +5414,7 @@
 - advanced audit
 - restricted deployment
 - advanced security
-- private/local AI
+- advanced private/local AI deployment and management
 
 ---
 
@@ -5344,6 +5576,12 @@
 ```
 
 This is a central product principle.
+
+## CUSTOMER-VERIFIABLE TRUST
+
+Display the deployment profile, actual data destinations, permitted vendor fields, outbound exchange history, key ownership and any explicitly enabled external-processing integration. Provide a local security posture view with build/patch version, control evidence, assessment date/scope, open findings and ownership. Use `NOT_ASSESSED`, `NOT_TESTED`, `FAILED`, `PASS_WITHIN_TESTED_SCOPE` and documented exceptions rather than “100% secure.”
+
+Customers must be able to operate core privacy controls with a valid local licence while vendor runtime access is blocked, inspect what can leave the environment, and validate downloaded artifacts. Product trust comes from inspectable controls and evidence, not from requiring belief in a blanket security guarantee.
 
 ---
 
@@ -5508,6 +5746,10 @@
 
 Use predictable platform pricing with included systems, environments and reasonable usage bands. Charge for supported integration breadth, automation depth, deployment and service level. Do not create punitive per-withdrawal or per-grievance pricing that discourages use of rights workflows. Any actual price requires customer interviews and a tested cost model; none is invented here.
 
+## BUSINESS DATA ONLY
+
+The vendor billing service receives the business information required for subscription, invoicing and payment administration, not the customer’s clients’ identities or privacy-processing records. Prefer payment-provider references/tokens over storing card details. Define the commercial service’s own access, retention and disclosure controls. Any entitlement usage check must use local enforcement or an explicitly approved non-operational licence assertion, not an end-customer count export.
+
 ---
 
 <a id="orvia-section-160"></a>
@@ -5563,6 +5805,10 @@
 ## THREE EDITIONS WITH A UNIVERSAL SAFETY FLOOR
 
 Offboarding must cover agent certificates, API credentials, local mappings, exported policy/control packages, outstanding tasks, cloud metadata retention, backup expiry and external processor evidence. Provide a machine-readable handover manifest.
+
+## CUSTOMER-LOCAL OFFBOARDING
+
+Export operational information locally before decommissioning; revoke customer-installed service identities and remove local components according to customer approval. Vendor termination deletes only the vendor-held records eligible for deletion under §31 and applicable documented retention rules. It must not remotely erase the customer’s deployment, weaken privacy restrictions or make local historical evidence inaccessible contrary to the agreed continuity policy.
 
 ---
 
@@ -5599,13 +5845,23 @@
 - backup tested
 - recovery tested
 - audit tested
-- penetration testing scheduled/completed as appropriate
+- independent penetration testing completed for the defined first production-release scope, with blocking findings remediated and retested
 
 ## SECURITY AND PRODUCT SAFETY RELEASE BAR
 
 Require dependency inventories, signed release artifacts, build provenance, secret scanning, vulnerability triage and independent penetration testing before broad production deployment. No compliance badges may be displayed unless actually obtained and in scope.
 
 A release cannot proceed with an unresolved cross-tenant access defect, an unbounded destructive execution path, an unauthenticated agent-control path or a demonstrated personal-data leak through the AI layer. Risk acceptance cannot quietly erase these failures from reports.
+
+## MANDATORY SECURITY RELEASE DECISION
+
+No production release may ship with unresolved confirmed applicable **Critical or High** vulnerabilities in the product or its shipped dependencies. A suspected Critical/High finding must be resolved as fixed or independently reviewed not-applicable/false-positive before approval; “not applicable” requires recorded evidence. Do not rely on a severity score alone.
+
+Regardless of score, block release for a known cross-tenant/role disclosure, authentication bypass, arbitrary privileged execution, uncontrolled destructive action, vendor operational-data egress, exposed secret/signing key, missing artifact verification or a known path from commerce credentials to customer runtime control. An attractive demo or deadline cannot waive these blockers.
+
+Other findings require an accountable owner, scoped impact, compensating controls where applicable, a remediation deadline and expiry of any approved exception. Such exceptions remain visible in the release record and relevant customer disclosures. Passing gates means no unresolved blocking findings **within the recorded assessment scope at that time**; it does not establish zero unknown vulnerabilities.
+
+The release record must identify build/digest, supported deployment profiles, threat-model review, control/test results, SBOM/scans, independent review/retest, data-egress results, backup/restore tests, known limitations and security/release sign-off. Internal synthetic prototypes must be labelled non-production and cannot use a release checklist to claim independent assurance they have not obtained.
 
 ---
 
@@ -5620,6 +5876,18 @@
 - cloud security review
 - connector security review
 - AI security review
+
+## INDEPENDENT ASSESSMENT AND CONTINUOUS VULNERABILITY RESPONSE
+
+Assess the complete initial production surface: public website/account/checkout, package distribution/signing, licensing, customer console/portal/API, tenant isolation, agent/connectors, AI, storage, egress, updates, deployment defaults and recovery. Use qualified reviewers independent of the implementation authors. Retest fixes and reassess material changes, especially authentication, authorisation, connectors, upload handling, updates and data destinations. Testing two AI-generated reviews against one another is not an independent penetration test.
+
+Create a product security response function with an accountable owner before production. Publish a monitored vulnerability-reporting channel and disclosure policy, supported versions/end-of-support dates, coordinated advisory process and a staffed patch/mitigation process. Review new dependency vulnerabilities throughout supported life; customers receive advisories and signed fixes without uploading operational data. A bug bounty may be added when scope and response capacity exist, but is not a substitute for secure engineering.
+
+Maintain a finding lifecycle: received → acknowledged → reproduced/scoped → prioritised → mitigated/fixed → independently retested → customer advisory/disclosure → regression/root-cause action. Preserve severity rationale, affected versions, installation guidance and known limitations. Set response/remediation targets only with named staffing and approved operating commitments; do not invent statutory deadlines or an unfunded 24/7 service promise.
+
+Exercise response to credential theft, compromised update keys, malicious dependency/plugin, unintended vendor data receipt, encryption-key loss and customer deployment compromise. Support customer-local containment, evidence preservation, key/credential rotation, signed update trust recovery and verified restoration. Notification duties are handled through the existing reviewed applicability/incident framework, not newly inferred in this security update.
+
+CISA’s Secure by Design goals include MFA, default-password reduction, vulnerability reduction, security patches and vulnerability disclosure. These inform this programme; mentioning them is not a claim that ORVIA has signed a pledge or received a certification. [S3]
 
 ---
 
@@ -5761,6 +6029,18 @@
 
 > Helps organisations operationalise configured privacy controls.
 
+## APPROVED DATA-LOCALITY AND SECURITY CLAIMS
+
+**Design-stage language:** “ORVIA is designed for customer-controlled deployment, keeping customer operational data in the customer environment and limiting vendor collection to defined business/licensing information. Security controls and independent verification are release requirements.”
+
+**After implementation and validation, with scope disclosed:** “Deploy the licensed ORVIA platform in your own environment. In customer-local mode, operational customer data is processed and stored there and is not sent to ORVIA services. Vendor collection is limited to the published business/licensing and approved service-data inventory.”
+
+**Only when supported by actual results:** “Release [version/build] was assessed on [date] for [scope/method]. No unresolved Critical or High findings remained in that assessment after retesting. Limitations and ongoing patch commitments are available.” Fill placeholders with real evidence before publication; do not publish them as completed claims.
+
+Do not claim “no vulnerabilities,” “100% secure,” “unhackable,” “cannot be breached,” guaranteed legal compliance, or certification/audit status not actually obtained. A penetration test establishes scoped findings at a time, not the impossibility of an undiscovered flaw. “Nothing leaves the organisation” must not be used where an external provider is actually receiving personal data, even with the customer’s approval. “ORVIA never processes personal data” is also inaccurate if business account contacts or connection metadata are processed (§31).
+
+The product may state the goal of high security; customer-facing assurances must identify implemented controls, assessment evidence, remaining limitations and responsibilities. [S1; S2]
+
 ---
 
 <a id="orvia-section-169"></a>
@@ -6202,6 +6482,12 @@
 Retain future national-network interoperability, all listed languages/SDKs, advanced cryptographic deletion, marketplaces and air-gapped deployments as roadmap capabilities. Do not imply they exist today. Do not add universal interception, legal certification or guaranteed model unlearning as commitments.
 
 The largest execution risk is breadth. The remedy is a complete outcome slice and gated expansion, not deleting the original ambition or claiming all modules are already build-ready.
+
+## RECORDED DELIVERY DECISION AND IMPLEMENTATION ADRS
+
+The user’s current product decision is no longer open: website subscription/licence purchase → signed full-product download → customer-controlled execution, with no vendor receipt of customer operational data. Record this as the governing deployment ADR. Earlier hosted alternatives remain documented but disabled (§86).
+
+Implementation ADRs must resolve the minimum vendor schema, offline licence protocol, package trust/bootstrap/rotation, local key custody, outbound broker/firewall policy, local AI prerequisites, no-production-data support workflow and independently reviewable security release gates. These decisions cannot reduce the mandatory boundary to make implementation easier.
 
 ---
 
@@ -6407,7 +6693,15 @@
 
 ```
 
-Demonstrate that the cloud receives the action/result rather than requiring a database dump.
+Demonstrate that the customer-hosted ORVIA receives the action/result and stores evidence locally. ORVIA’s vendor cloud receives neither the result nor any customer record, principal reference, workflow ID or evidence payload.
+
+## DOWNLOAD, LOCALITY AND SECURITY DEMONSTRATION
+
+Using synthetic fixtures, demonstrate purchase/entitlement issuance in a clearly labelled test checkout, download and local signature verification, full runtime installation, consent withdrawal and local evidence. Block vendor runtime access while a valid local licence remains available; the deterministic workflow must continue.
+
+Show a local outbound-data log and controlled vendor endpoint captures containing only the permitted licence schema. Attempt an injected customer-data field in licensing/diagnostics and demonstrate rejection without persisting the body. Reject a tampered package, a vendor account token presented to the runtime, a cross-tenant request and an unauthorised connector command. Show that AI cannot fall back to an external provider and that the support bundle excludes operational data.
+
+These are acceptance demonstrations to implement and execute. A successful synthetic run must be described by its scope; it does not by itself establish production security or absence of all vulnerabilities.
 
 ---
 
@@ -6452,6 +6746,10 @@
 
 Track contribution after implementation/support costs as well as infrastructure gross margin. Repeated bespoke connector work is a product-learning signal and a cost, not automatically recurring software value.
 
+## METRIC LOCATION
+
+Vendor business metrics may use the permitted account/subscription/support information. Customer product/privacy-control metrics and engineering telemetry derived from customer workloads remain local and are not silently exported for ORVIA analytics. Measure product improvement using synthetic environments or separately volunteered, non-operational feedback consistent with §31; aggregated counts are not automatically exempt from the boundary.
+
 ---
 
 <a id="orvia-section-196"></a>
@@ -6485,7 +6783,11 @@
 Aim to make the first successful value path:
 
 ```text
-Account
+Account and licence
+ ↓
+Verified full-product download
+ ↓
+Customer-local installation
  ↓
 Connector
  ↓
@@ -6604,25 +6906,29 @@
 
 # 202. FINAL CUSTOMER ARCHITECTURE
 
-## Default
-
-```text
-                    ORVIA CLOUD
-                         │
-                  Control Plane
-                         │
-                  Secure Channel
-                         │
-                         ▼
-             CUSTOMER CONNECTOR
-                         │
-             ┌───────────┼───────────┐
-             ▼           ▼           ▼
-            CRM          DB          ERP
-
-```
-
-## Enterprise
+## Default — customer-local licensed deployment
+
+```text
+ORVIA VENDOR WEBSITE / DISTRIBUTION CLOUD
+  Purchase • subscription • signed licence • signed packages
+                  │
+        Customer-approved download/import
+                  │
+                  ▼
+CUSTOMER ORGANISATION / CUSTOMER-CONTROLLED CLOUD
+  ORVIA console + portal + APIs + local identity
+  Graph + policies + workflows + local AI (when supported)
+  Databases + verification + evidence + tests + local telemetry
+                  │
+            Customer connectors
+                  │
+          CRM     DB     ERP / approved systems
+
+No customer operational data returns to ORVIA vendor services.
+Optional vendor exchanges use only the §31 permitted schema.
+```
+
+## Enterprise — advanced customer-cloud deployment
 
 ```text
              CUSTOMER AWS / AZURE / GCP
@@ -6656,17 +6962,17 @@
 
 ORVIA is:
 
-> **Cloud-first + customer-side secure connector**
+> **Website-purchased, subscription/licence-based software downloaded from ORVIA’s distribution cloud and deployed in the customer’s own organisation or customer-controlled cloud.**
 
 with:
 
-> **Customer-controlled cloud / on-premise deployment for enterprise customers**
+> **A customer-local operational platform and secure local connectors; vendor services limited to commerce, licensing, signed distribution and explicitly permitted minimal support information.**
 
 The primary customer interaction is through a web application.
 
 The customer's internal systems are reached through secure customer-side connectors.
 
-The complete platform can be containerized for customer-controlled deployments.
+The complete licensed platform must be packaged for supported customer-controlled deployments, using containers or supported service/VM packages. Operational customer data stays in that deployment; privacy and security obligations apply across Foundation, Control and Enterprise.
 
 ---
 
@@ -6743,6 +7049,14 @@
 Tested
 
 ```
+
+## SECURITY ASSURANCE, NOT ABSOLUTE SECURITY
+
+The security objective is a strongly protected, independently assessed and continuously maintained product. Apply the customer-local boundary, least privilege, no vendor runtime/decryption backdoor, secure defaults, verified release/update supply chain, threat modelling, automated/adversarial tests, independent assessment and vulnerability response across supported life.
+
+A release cannot pass with the known blockers in §163. A statement of “no unresolved Critical/High findings in the assessed build and scope” requires real, dated assessment/retest evidence. It must never be restated as “no vulnerabilities exist” or “no one can breach the product.” The security programme reduces and manages risk; it does not certify impossibility of compromise. [S1]
+
+A customer must be able to inspect data destinations, key custody, package identity, patch state, security-test scope and responsibilities without granting ORVIA access to the customer’s operational data.
 
 ---
 
@@ -6826,9 +7140,9 @@
 
 The engineering team must deliver:
 
-> **A production-grade, multi-tenant, cloud-first DPDPA Privacy Control Platform with a customer-side secure connector architecture, a common Privacy Control Graph, policy-driven privacy execution, consent and rights management, runtime controls, verified evidence, privacy regression testing, privacy incident analysis, AI assistance, three commercial editions, enterprise deployment capabilities, licensing, secure support, observability and continuous extensibility.**
-
-The platform must be modular, secure, testable, observable, upgradeable and capable of operating without requiring ORVIA to become the primary repository for customer personal data.
+> **A production-grade, multi-tenant, website-distributed and customer-hosted DPDPA Privacy Control Platform with a customer-side secure connector architecture, a common Privacy Control Graph, policy-driven privacy execution, consent and rights management, runtime controls, verified evidence, privacy regression testing, privacy incident analysis, AI assistance, three commercial editions, enterprise deployment capabilities, licensing, secure support, observability and continuous extensibility.**
+
+The platform must be modular, secure, testable, observable and upgradeable, with the complete operational runtime inside the customer boundary. ORVIA vendor infrastructure must not become a recipient or repository of customer operational/personal data. Only the minimum information explicitly allowed by §31 may reach vendor services. Apply the security assurance and release gates in §§109, 163–164 and 206.
 
 ---
 
@@ -6852,7 +7166,7 @@
 >
 > Do not allow AI to make autonomous legally consequential decisions.
 >
-> Do not copy customer databases into ORVIA unnecessarily.
+> Do not transmit customer operational/personal data to ORVIA vendor infrastructure. Read and process it only within the approved customer-hosted runtime; licence, update, support, telemetry and AI paths must respect §31.
 >
 > Do not expose internal customer systems directly to the internet when the customer-side connector architecture can be used.
 >
@@ -6921,13 +7235,27 @@
 >
 > A change is complete only when code, schema, migration, tests, documentation, runbook, telemetry and supported-capability declarations agree. Human engineering review and legal review where applicable remain mandatory.
 
+## CUSTOMER-LOCAL AND SECURITY INSTRUCTIONS TO CODING AGENTS
+
+> Implement full-product purchase/download/licence support and customer-controlled runtime packaging—not a connector-only client for a hidden vendor data plane.
+>
+> Keep customer identities, graph context, policies, workflows, evidence, logs, backups, embeddings and AI contexts customer-local. Disable automatic vendor telemetry and external AI fallback.
+>
+> Accept only versioned, bounded licensing and approved diagnostic fields on vendor services. No shared production passwords, remote support backdoors, vendor decryption keys or executable licence payloads.
+>
+> Treat every new network destination, dependency, update path and logging field as a security/data-boundary change requiring review and tests.
+>
+> Preserve all existing product modules and edition capabilities, but do not enable a capability by weakening the deployment boundary. Surface unsupported prerequisites honestly.
+>
+> Store executed security and egress test results for the exact build. Do not describe a design, a passed scanner or an AI review as proof that the software has no vulnerabilities.
+
 ---
 
 <a id="orvia-section-212"></a>
 
 # 212. ORVIA — FINAL PRODUCT IN ONE SENTENCE
 
-> **ORVIA turns DPDPA privacy requirements into executable, enforceable, verifiable and continuously testable controls across an organisation's systems, while providing a cloud-first architecture that minimises unnecessary movement of customer personal data and supports customer-controlled deployment for enterprise environments.**
+> **ORVIA turns DPDPA privacy requirements into executable, enforceable, verifiable and continuously testable controls through licensed software purchased and downloaded from its website, operated inside the customer’s organisation or customer-controlled cloud, with customer operational data kept local, explicitly minimal vendor information exchange, and evidence-backed security throughout the supported product lifecycle.**
 
 ## PRIMARY SOURCE REGISTER AND REVIEW LIMITS
 
@@ -7061,6 +7389,39 @@
 
 Add property-based tests for monotonic consent ordering and invariant preservation; fuzz parsers; run load, chaos and restore exercises. A small fixed matrix does not replace security assessment.
 
+## ADDITIVE CUSTOMER-LOCAL AND SECURITY ACCEPTANCE TESTS
+
+These are mandatory acceptance requirements added for the two customer priorities. They do not replace T01–T40 and are **NOT RUN** until actual implementation evidence is recorded.
+
+| Test | Scenario | Required outcome |
+|---|---|---|
+| T41 | Customer purchases an edition in a disclosed test checkout | Correct signed licence and supported full-runtime package; no client-record collection |
+| T42 | Install full package in an isolated customer environment | Console, portal, graph, policy, workflows, stores, evidence and tests operate locally |
+| T43 | Tampered package, wrong signer or substituted manifest | Installation/update refused before execution |
+| T44 | Vendor website/licensing account token is used against runtime | No customer login, database access, connector command or decryption privilege |
+| T45 | Vendor connection blocked with a valid local licence | Core privacy workflows continue locally; no hidden cloud dependency |
+| T46 | Operational identity/canary inserted into a licence field or extra JSON field | Fixed schema/value validation rejects it; no vendor request-body retention |
+| T47 | Consent, request and incident workflows run with synthetic identifying canaries | No canary, derived identity or operational record reaches vendor stores/telemetry |
+| T48 | Browser page loads scripts, analytics, fonts or crash reporting | No undisclosed vendor/external asset or data endpoint; customer-hosted assets used |
+| T49 | Connector/AI/plugin attempts unauthorised network egress | Destination blocked by runtime/network policy; local failure evidence recorded |
+| T50 | Local AI is missing or fails | Honest unavailable status; no public-model/vendor fallback; deterministic core works |
+| T51 | Diagnostic export includes workflow IDs, masked records, screenshots or secrets | Export blocked or prohibited fields excluded; local preview shows only permitted schema |
+| T52 | Support requests remote production screen/terminal access | No vendor production-data session; synthetic reproduction/local diagnostics used |
+| T53 | Backup/restore runs, including an encrypted operational archive | Backup stays under customer-controlled storage/keys; no ORVIA backup upload |
+| T54 | Vendor/release/licence identity attempts to decrypt runtime data or sign an action | Rejected; trust roles and keys are distinct |
+| T55 | Licence expires or renewal is unreachable | Documented continuity/handover; no data deletion, privacy-control fail-open or new vendor access |
+| T56 | Privileged login with default credentials or missing required MFA | Access denied; unique secure bootstrap and configured privileged MFA required |
+| T57 | Release has an unresolved applicable Critical/High finding or a §163 blocker | Production promotion blocked; evidence retained |
+| T58 | Scanner unavailable, scan omitted or a suppression lacks rationale | No false pass; gate blocked until assessed |
+| T59 | Update/plugin/rule/model package attempts to enable telemetry or broaden egress | No silent policy change; customer approval and boundary regression required |
+| T60 | Signing key or distribution service is compromised in a scoped exercise | Documented containment/trust recovery; no automatic customer operational access |
+| T61 | Independent test reports a flaw and fix is submitted | Finding tracked, fix retested, regression added and affected-build/advisory status updated |
+| T62 | Optional external processor/model is enabled | Explicit customer decision and accurate external-processing label; never vendor-routed; strict mode blocks it |
+| T63 | Security centre shows an unassessed build or stale test | NOT_ASSESSED/stale scope shown; no invented certification or “zero vulnerabilities” badge |
+| T64 | Cancellation or export/offboarding | Operational data exported locally; only permitted vendor account records handled by vendor retention process |
+
+Record build/digest, deployment profile, test scope, command/method, expected/actual outcome, timestamp, reviewer and local evidence reference. Independent assessment and representative production configuration testing remain separate from these synthetic acceptance scenarios.
+
 ---
 
 <a id="orvia-section-218"></a>
@@ -7093,11 +7454,31 @@
 
 **Research limitations and production gate:** This is a focused product/architecture review using the primary sources above, not an exhaustive search of all Indian legal instruments. A secondary listing surfaced a February 2026 Hindi corrigendum; its primary text was not retrieved and it has not been used to alter the legal baseline here. Obtain and reconcile that text, all applicable subsequent notifications, sector rules and customer facts with qualified counsel before publishing a production regulatory pack. No statement here certifies current organizational compliance, Consent Manager registration, security certification, market uniqueness or implemented feature availability.
 
+## ADDITIONAL SECURITY SOURCES FOR THIS REVISION
+
+The original legal/source register and its review limits above are retained. This revision does **not** reverify the DPDP legal baseline or certify any product implementation. The security sources below were consulted on 16 September 2026; specific architecture, collection limits and release gates in this revision are ORVIA design requirements, not quotations from these standards.
+
+| ID | Primary source | Use and limitation |
+|---|---|---|
+| S1 | NIST SP 800-218, Secure Software Development Framework v1.1, final (February 2022) | Secure-development risk-reduction framework. It does not promise that software can be proven vulnerability-free. |
+| S2 | OWASP Application Security Verification Standard, official project page; stable version 5.0.0 identified on the page | Versioned basis for web/application control verification. ORVIA has not been assessed or certified by adding this reference. |
+| S3 | CISA Secure by Design Pledge, official published goal list | MFA, default-password reduction, vulnerability reduction, security patches and disclosure. This is not a statement that ORVIA signed the pledge. |
+
+```text
+S1 https://csrc.nist.gov/pubs/sp/800/218/final
+S2 https://owasp.org/projects/asvs
+S3 https://www.cisa.gov/securebydesign/pledge
+```
+
+Use final standards deliberately and pin the assessed version. A newer draft is not automatically the approved baseline. The current text states intended controls and acceptance requirements; test reports, penetration tests, certifications and patch-response measurements must come from actual execution.
+
 ---
 
 <a id="appendix-a"></a>
 
 # APPENDIX A — COMPLETE SOURCE-TO-UNIFIED SECTION MAP
+
+**Historical consolidation map:** locations and original titles remain valid. Where revision 1.1 updates a mapped paragraph, the active wording is in the numbered section and the exact prior/new text is preserved by Appendix D’s diff.
 
 This is a navigation and provenance register, not an additional product scope. “Merged” means the source wording is placed inside the listed topic sections; it has not been summarized. The source labels remain valid after consolidation.
 
@@ -7369,6 +7750,8 @@
 
 # APPENDIX B — EXACT EDITS AND PRESERVATION CHECKS
 
+**Historical record of the initial consolidation, not the current revision’s change count.** The “only edits” and preservation totals below describe that earlier operation. Revision 1.1 changes are separately enumerated and checked in Appendix D.
+
 ## Exact changes to existing original body text
 
 These are the only direct edits to original body text. All other changes are verbatim source additions inside the mapped sections. Superseded wording is retained here for audit, not as an alternative active requirement.
@@ -7440,6 +7823,8 @@
 
 # APPENDIX C — ORIGINAL AMENDMENT REGISTER AND SOURCE METADATA
 
+**Historical source wording:** retained for provenance. Earlier “cloud-first” descriptions, optional data-locality wording and related alternatives do not override the customer-local requirements now stated in §§2, 31–34 and 202–203.
+
 ## Historical source context
 
 The source text below is retained for traceability. Its statement that the original was retained verbatim “in the accompanying master” describes the earlier expanded-master file, not the three explicitly logged edits in this consolidated file. The current locations and treatment are in Appendices A and B. Historical source wording is not a second competing product specification.

````

</details>


<a id="appendix-e"></a>

# APPENDIX E — REVISION 1.2 CHANGE, SOURCE AND INTEGRITY RECORD

**Date:** 16 September 2026. **Revision:** 1.2. This appendix documents the current consolidation; Appendices A–D are preserved historical records, not alternative active requirements.

## E.1 Scope and decisions

This revision uses the actual v1.1 unified master as its baseline, not the older 212-section upload. It merges the delivered interface and deployment decisions, then adds the current user request for scoped vendor/customer administration, support visibility without customer-data access, and a custom ORVIA model developed with Lightning GPUs and never trained on customer data.

The primary ZIP envelope resolves the earlier ZIP-versus-tar presentation difference explicitly. Platform-specific image archives and Helm charts remain supported profile artifacts; this does not add a universal native executable claim. The model decision replaces only the superseded generic/third-party model routing. Public/open-source training code is distinct from pretrained learned weights. A future change to pretrained weights or vendor production access requires an explicit changed product decision, not an implementation shortcut.

The phrase “mini super admin” is mapped to **Organisation Super Admin**, compatible with the retained Organisation Owner role. Members are people; optional subtenants are scopes. Vendor Super Admin has no inherited authority over customer runtime administrators.

## E.2 Source integrity

| Source file | SHA-256 |
|---|---|
| `ORVIA_Unified_Master_v1_1_Customer_Hosted_and_Security.md` | `31d36511e08da184095e9749605d520ad957c83003e1ab199373d9c7e42702ca` |
| `ORVIA_Interface_and_Deployment_Blueprint.md` | `87da0d599ffd23b45c1bda3ef40d5f8d2d3121166500625bd169f93168cb80b6` |
| `ORVIA_Delivery_and_Interface_Decision.md` | `e34271042a5eb2d946af6853b8d21570a469affda0e6de8139f821e58947daf4` |

All source files remain untouched. The current master is a new revision. The full UI mockup HTML files were not altered or represented as working software; their enduring interface decisions are now in this document.

## E.3 Section preservation

- Exactly **218 numbered product sections**, in the original order.
- **218 section numbers, titles and explicit anchors preserved.**
- **53 section bodies updated** for the current requirements; **165 unrelated section bodies remain byte-identical** to the v1.1 source sections.
- Historical Appendices A–D are preserved as one byte-identical text span.
- Existing 33-module scope, 20 engineering roles, 3 editions, all prior tests, and the existing product roadmap remain.
- **20 interface/deployment scenarios incorporated** from the companion plus **38 newly specified role/support/custom-model scenarios**. These are NOT_RUN requirements, not product test results.
- **6 targeted replacements** retire precisely identified conflicting wording. Other integrations are additive in their corresponding topics. The exact changes, including header and replacements, are retained in E.7.

**Unchanged sections:** 1, 3, 4, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32, 33, 36, 37, 38, 39, 40, 41, 42, 44, 45, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 67, 68, 69, 71, 72, 73, 76, 77, 78, 79, 80, 87, 88, 90, 91, 92, 97, 98, 99, 100, 101, 104, 105, 106, 107, 108, 110, 111, 114, 115, 118, 119, 120, 121, 124, 125, 126, 127, 128, 129, 130, 131, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 155, 156, 157, 159, 160, 161, 162, 164, 165, 166, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 188, 189, 190, 191, 192, 193, 194, 196, 197, 198, 199, 200, 201, 204, 206, 207, 208, 209, 212, 213, 214, 216.

## E.4 Companion-to-master map

| Companion source topic | Current master destination |
|---|---|
| Interface blueprint 1–3: server/browser model, named experiences, customer journey | §§203, 34, 83 |
| Interface blueprint 4–7: account, Workspace, Privacy Centre, identity/recovery | §§82, 102, 20, 7 |
| Interface blueprint 8–10: platforms, packages, release contents | §§86, 85; primary ZIP reconciliation below |
| Interface blueprint 11–13: onboarding, operations, updates, shared source/separate runtime | §§84, 93, 116 |
| Interface blueprint 14: acceptance scenarios | §217, all UX-01–UX-20 |
| Interface blueprint 15–16: merge guidance, sources and scope limits | This audit and §218 |
| Earlier delivery decision 6: one primary ZIP including signed profile artifacts/licence | §85, repeated as final summary in §203 |
| Earlier delivery decision 11: optional desktop-like helper and no unrestricted offline record caching | §154 |
| Earlier delivery decision 14: clean install and isolation/continuity requirements | §§163, 217; overlapping UX scenarios retained |
| Current role/support request | §§5–7, 31, 35, 46, 75, 82, 89, 95–96, 103, 109, 113, 158, 217 |
| Current own-model/Lightning request | §§63–66, 70, 74, 93, 112, 117, 122–123, 132, 167–168, 195, 205, 217–218 |

Companion language that named alternative illustrative archive extensions or generic model packages is superseded only by the explicitly recorded current decision. Prototype task assignments and sprint deadlines remain outside this product master.

## E.5 Changed-section register

| Section | Change purpose |
|---|---|
| [2](#orvia-section-2) | Record current user-approved delivery, separate admin domains and custom-AI intent. |
| [5](#orvia-section-5) | Define domain entities without introducing a vendor operational data plane. |
| [6](#orvia-section-6) | Introduce requested vendor and organisation roles while retaining every specialised role. |
| [7](#orvia-section-7) | Merge interface blueprint §7: independent identities, sessions, trust and recovery.<br>Make roles enforceable across trust domains, delegation and recovery. |
| [20](#orvia-section-20) | Merge interface blueprint §6: individual portal journey and separate exposure. |
| [31](#orvia-section-31) | Apply the existing strict boundary to support permissions and Lightning training/inference.<br>Keep external customer integrations distinct from the newly required own-model ORVIA assistant. |
| [34](#orvia-section-34) | Merge interface blueprint §2: Account, Workspace and Privacy Centre. |
| [35](#orvia-section-35) | Clarify what a tenant is and scope member/system monitoring locally. |
| [43](#orvia-section-43) | Record failure behavior and honest vendor awareness limits. |
| [46](#orvia-section-46) | Add audit coverage for new roles, support stages and model releases. |
| [63](#orvia-section-63) | Apply the requested ORVIA-owned model to the existing local inference requirement.<br>Define the custom AI origin, capability scope and training-versus-inference topology. |
| [64](#orvia-section-64) | Retain abstraction without contradicting the new no-existing-model requirement.<br>Replace the provider-routing diagram with the own-model runtime design.<br>Update provider assumptions while preserving minimisation and evaluation controls.<br>Retire only the superseded third-party-model options, recording their exact prior wording.<br>Add complete own-model corpus, from-scratch training, Lightning, retrieval, evaluation and release lifecycle. |
| [65](#orvia-section-65) | Separate inference, retrieval and all forms of training; prohibit indirect customer-derived training. |
| [66](#orvia-section-66) | Add the requested in-product support assistant before vendor escalation. |
| [70](#orvia-section-70) | Specify an end-to-end safe local-AI-to-vendor troubleshooting example. |
| [74](#orvia-section-74) | Retain human/permission safeguards for custom trained AI. |
| [75](#orvia-section-75) | Separate local operational alerts from optional minimal vendor support signals. |
| [81](#orvia-section-81) | Avoid mixing packaging/roles with the three commercial editions. |
| [82](#orvia-section-82) | Merge interface blueprint §4: commercial pages, truthful status and target-based download selector.<br>Confirm vendor origin and add requested vendor admin console. |
| [83](#orvia-section-83) | Merge interface blueprint §3: purchase, deployment, user access and host availability. |
| [84](#orvia-section-84) | Merge interface blueprint §11: local setup and operational journey.<br>Integrate local owner bootstrap and optional own-model installation. |
| [85](#orvia-section-85) | Merge interface blueprint §9, resolving ZIP versus tar examples into one primary ZIP envelope.<br>Merge interface blueprint §10, applying the newly requested ORVIA-owned model policy.<br>Resolve format consistency and define secure one-file full-product delivery. |
| [86](#orvia-section-86) | Merge interface blueprint §8: tested browser/host/architecture support routes.<br>Preserve realistic multi-platform and separate customer inference hardware requirements. |
| [89](#orvia-section-89) | Define truthful vendor issue visibility without centralising customer telemetry. |
| [93](#orvia-section-93) | Merge interface blueprint §12: updates, renewals, outage distinctions and continuity.<br>Extend secure release/distribution rules to the proprietary model and knowledge packs. |
| [94](#orvia-section-94) | Keep role and model rights distinct from licence validation. |
| [95](#orvia-section-95) | Define actionable support access and optional minimal issue signals without violating the data boundary. |
| [96](#orvia-section-96) | Add concrete requested vendor administration/support interface and case lifecycle. |
| [102](#orvia-section-102) | Merge interface blueprint §5: local workspace, role views, request detail and boundary page. |
| [103](#orvia-section-103) | Make all role-aware interfaces and their menus consistent. |
| [109](#orvia-section-109) | Extend existing security requirements to the requested access and AI surfaces. |
| [112](#orvia-section-112) | Define assurance boundaries for the requested original model. |
| [113](#orvia-section-113) | Define narrowly scoped support assistance tools. |
| [116](#orvia-section-116) | Merge interface blueprint §13; make the separate vendor-staff console explicit. |
| [117](#orvia-section-117) | Assign new requirements without removing the original twenty roles. |
| [122](#orvia-section-122) | Separate development tools, training data and customer production. |
| [123](#orvia-section-123) | Add the model supply-chain pipeline beside the software pipeline. |
| [132](#orvia-section-132) | Apply retention to the distinct AI and support data stores. |
| [154](#orvia-section-154) | Merge the web/native helper distinctions and offline client limitations. |
| [158](#orvia-section-158) | Provide the requested member/system monitoring interface with scoped permissions. |
| [163](#orvia-section-163) | Add concrete release evidence for the new requirements. |
| [167](#orvia-section-167) | Connect proprietary model assistance to existing legal-source versioning. |
| [168](#orvia-section-168) | Prevent misleading ownership, universality, support or security claims. |
| [187](#orvia-section-187) | Record the product choices and controlled future amendment points. |
| [195](#orvia-section-195) | Keep AI/support measurement consistent with the vendor-data boundary. |
| [202](#orvia-section-202) | Add a consistent final topology for all interfaces, authority and AI locations. |
| [203](#orvia-section-203) | Merge interface blueprint §1: browser/device, runtime and connector distinction.<br>Confirm cloud origin and final canonical packaging. |
| [205](#orvia-section-205) | Update the final AI summary to the user-requested proprietary model. |
| [210](#orvia-section-210) | Make final build objective consistent with all current additions. |
| [211](#orvia-section-211) | Update the common engineering instruction to prevent inconsistent AI-generated implementations. |
| [215](#orvia-section-215) | Preserve the existing customer-AI-governance extension without conflicting with the new own-model policy. |
| [217](#orvia-section-217) | Merge all 20 UX acceptance scenarios from the interface blueprint.<br>Add 38 explicit role/support/model acceptance scenarios, all NOT_RUN, without replacing existing tests. |
| [218](#orvia-section-218) | Keep source attributions and current technical research in the same master; preserve historical legal references. |

## E.6 Targeted replacement register

| ID | Section | Reason |
|---|---|---|
| 01 | 63 | Apply the requested ORVIA-owned model to the existing local inference requirement. |
| 02 | 64 | Retain abstraction without contradicting the new no-existing-model requirement. |
| 03 | 64 | Replace the provider-routing diagram with the own-model runtime design. |
| 04 | 64 | Update provider assumptions while preserving minimisation and evaluation controls. |
| 05 | 64 | Retire only the superseded third-party-model options, recording their exact prior wording. |
| 06 | 31 | Keep external customer integrations distinct from the newly required own-model ORVIA assistant. |

The exact before/after text is visible in E.7. Negative lines are superseded historical text, not deleted capability scope outside the current request.

## E.7 Exact unified diff — active master only

The original historical appendices are unchanged and therefore not repeated in this diff. The new audit itself is excluded to avoid recursive self-diff. Treat this block as historical amendment evidence, not live duplicate requirements.

<details>
<summary>Expand exact revision 1.1 → 1.2 diff</summary>

``````diff
--- ORVIA_Unified_Master_v1_1_Customer_Hosted_and_Security.md (active master)
+++ ORVIA_Unified_Master_v1_2_Delivery_Roles_Support_and_Custom_AI.md (active master)
@@ -7,25 +7,27 @@
 ### For a 20-Person Senior Software Engineering Team and AI-Assisted Development
 
 **Consolidated edition:** 16 September 2026.  
-**Revision:** 1.1 — customer-hosted delivery, minimum vendor data and security assurance.  
+**Revision:** 1.2 — unified interfaces and distribution, independent vendor/customer administration, privacy-preserving support and ORVIA-owned AI.  
 **Source scope:** Original sections 1–212 and refinement sections 213–250.  
 **Status:** Proposed design for founder, engineering and privacy-counsel review. Not an implementation, security certification, legal opinion, or exhaustive consolidation of Indian law.
 
 This is one topic-by-topic master, not two versions placed one after the other. Original sections 1–212 keep their numbers and titles. Later paragraphs, tables, examples and acceptance requirements are incorporated into the relevant existing sections without paraphrasing. Six standalone subjects continue the numbering as sections 213–218. All 250 source sections are accounted for in Appendix A.
 
-The initial consolidation made the three source-backed changes recorded historically in Appendix B. Revision 1.1 additionally updates only sections affected by the user’s customer-hosted delivery/minimum-data and security requirements, preserving unrelated section bodies. Current changes and integrity checks are recorded in Appendix D; the exact unified diff is enclosed there. All 218 existing section numbers and titles remain unchanged. No new numbered product section is needed: these requirements are integrated into the existing topics.
+The initial consolidation and revision 1.1 remain documented historically in Appendices A–D. Revision 1.2 incorporates the interface/delivery companions and the user’s administration, support and own-model requirements into the corresponding existing sections. Unrelated section bodies and the historical appendices are preserved. Appendix E records the current change map, source hashes, validation and exact active-master diff. All 218 existing section numbers and titles remain unchanged; these additions do not create a separate product specification.
 
 The 36-hour prototype plan, its temporary implementation choices, AI task assignments and sprint deadlines are not changes to this product master and are not merged here. The original product roadmap, engineering roles and later product-level refinements remain included.
 
-**Reference key:** `O§n` identifies an original source section, whose number is unchanged here. `V2§n` identifies a refinement source section; use Appendix A for its current location. `R1`–`R8` refer to the retained primary source register in section 218. Historical research dates, qualifications, proposed-design labels and review limitations remain as supplied. This revision adds separately identified security references `S1`–`S3` in §218 and does not newly verify or approve the historical legal baseline.
+**Reference key:** `O§n` identifies an original source section, whose number is unchanged here. `V2§n` identifies a refinement source section; use Appendix A for its current location. `R1`–`R8` refer to the retained primary source register in section 218. Historical research dates, qualifications, proposed-design labels and review limitations remain as supplied. Revision 1.1 introduced security references `S1`–`S3`; revision 1.2 retains them and adds interface keys `T1`–`T8` and technical keys `U1`–`U10` in §218. `M0` and `M1` identify the historical document sources defined there. Neither revision newly verifies or approves the historical legal baseline.
 
 
 **Governing customer requirements:** the complete licensed product is downloaded from the website and runs in the customer’s own environment; no customer operational/personal data is sent to ORVIA vendor infrastructure; only §31’s defined minimum business/licensing/service information may be collected. Security is a mandatory, testable and continuously maintained release obligation, not an “unbreachable” or “zero vulnerabilities” promise. These current requirements supersede older contradictory defaults; earlier hosted alternatives and original source text in the historical appendices are not active exceptions.
 
-**Evidence status:** specification update only. No software implementation, penetration test, data-egress test, security certification or production release is established by this document.
+**Current integrated decisions:** ORVIA remains the official cloud distributor of signed complete-product ZIP bundles and profile artifacts; the customer's Workspace/Privacy Centre remain local, separate from the vendor Account and staff console. Vendor Super Admin/Admin have vendor-service authority only; Organisation Super Admin/Admin/Member and retained specialised roles govern each customer environment. Support uses approved minimal diagnostic information and customer-authorised local execution, not vendor root access. ORVIA Intelligence uses ORVIA-owned from-scratch trained weights on approved non-customer material, with authorised Lightning development GPUs and customer-local inference. §§63–65 define that requirement without silently substituting a fine-tuned third-party model.
+
+**Evidence status:** specification update only. No software implementation, model training, GPU provisioning/spending, quality benchmark, penetration test, data-egress test, security certification or production release is established by this document. UI previews remain historical synthetic illustrations, not deployed interfaces. All new acceptance scenarios begin NOT_RUN.
 
 <details>
-<summary>Contents — sections 1–218 and consolidation appendices</summary>
+<summary>Contents — sections 1–218 and revision appendices</summary>
 
 - [1. PURPOSE OF THIS DOCUMENT](#orvia-section-1)
 - [2. PRODUCT DEFINITION](#orvia-section-2)
@@ -252,6 +254,8 @@
 
 - [Appendix D — Revision 1.1 changes and integrity](#appendix-d)
 
+- [Appendix E — Revision 1.2 change, source and integrity record](#appendix-e)
+
 </details>
 
 ---
@@ -350,6 +354,16 @@
 `CUSTOMER_LOCAL` is the default for all editions offered under this promise. Enterprise can add scale, advanced integrations, resilient deployment and private-AI management; the baseline data boundary and essential security cannot depend on buying a more expensive edition. An unsupported deployment must be labelled unsupported, not silently redirected to a hosted service.
 
 The pre-existing vendor-hosted SaaS alternatives remain recorded as non-default architectural options in §§33 and 86; they are not enabled under this customer-local offer. Enabling a different data-handling model would require a separate, explicit product decision and accurate revised disclosures—not a hidden fallback or a support-session override.
+
+## CURRENT PRODUCT DELIVERY, AUTHORITY AND AI DECISIONS
+
+The ORVIA vendor remains the official publisher and distributor of the product, licences, signed updates, connector packages, reviewed knowledge packs and ORVIA-owned model packages through its website and vendor-controlled distribution cloud. Distribution does not mean execution: the customer's operational platform runs in the customer's environment.
+
+Use three customer-facing experiences: **ORVIA Account** for purchasing/licences/downloads/support, **ORVIA Workspace** for local operations, and **Customer Privacy Centre** for that customer's Data Principals. A separate **Vendor Administration and Support Console** is for ORVIA staff, not a global login into customer workspaces.
+
+Vendor Super Admin and Vendor Admin roles govern vendor services only. Organisation Super Admin (the user's “mini super admin”), Organisation Admin and Member roles govern customer-local environments. All specialised roles already in §6 remain. A tenant is an isolation scope, not a user role.
+
+Build **ORVIA Intelligence** as the proposed ORVIA-owned domain AI: its own trained weights, no third-party pretrained model checkpoint or hosted foundation-model dependency, public/licensed non-customer knowledge and ORVIA-authored synthetic training material, development on separately authorised Lightning AI GPUs, and inference within the customer environment. The complete definition, training requirements and release gates are in §§63–65 and 112. No model has been trained by this specification update.
 
 ---
 
@@ -482,6 +496,18 @@
 - created\_at
 - updated\_at
 
+## 5.3 Separate vendor and customer identity/domain stores
+
+Do not reuse one global `User` or `Organisation` database across vendor commerce and customer operations. The existing Organisation and User entities above describe customer-runtime records. The vendor store contains separate `VendorStaffIdentity`, `CommercialAccount`, `CommercialAccountMember`, `Subscription`, `LicenceAssignment`, `DownloadAuthorisation` and `SupportCase` entities, with only the §31 permitted fields.
+
+Within a customer installation, add `Environment`, `OrganisationMembership`, optional `Subtenant`, `RoleBinding`, `ServiceIdentity` and `LocalSupportCase`. A role binding records its identity, organisation, optional environment/subtenant scope, capabilities, granting actor, validity and revocation. A customer's member directory and local role assignments are not synchronised to the vendor.
+
+Distinguish `organisation_id` (customer business boundary), `environment_id` (for example test or production), `subtenant_id` (optional delegated isolation boundary), and membership (a person's access). Do not create a tenant automatically for every employee. Different customer organisations use separate customer-controlled installations by default; approved groups/subtenants within one installation still require explicit isolation.
+
+A random licence installation identifier may correlate a permitted support case with a commercial assignment. It must not be computed from customer records, hostnames or a staff directory. Keep the mapping from a local workflow/incident to a vendor support case only inside the customer deployment.
+
+For AI development, maintain a separate `TrainingSource`, `CorpusManifest`, `DatasetSplit`, `ModelExperiment`, `ModelRelease`, `KnowledgePackVersion` and `EvaluationReport` registry. These contain approved non-customer training material and vendor engineering records, never an uploaded customer inference history.
+
 ---
 
 <a id="orvia-section-6"></a>
@@ -529,6 +555,37 @@
 ### Data Principal
 
 External portal user with access only to their own privacy interactions.
+
+## VENDOR AUTHORITY AND CUSTOMER AUTHORITY ARE SEPARATE
+
+“Super Admin” is scoped to a trust domain. **Vendor Super Admin is not the parent of Organisation Super Admin.** The latter is the highest customer-local product administrator, not a vendor-controlled subordinate. Its professional display name is **Organisation Super Admin**; “mini super admin” remains an explanatory alias, not a security boundary.
+
+### Vendor roles — ORVIA staff only
+
+| Role | Permitted scope | Explicit exclusions |
+|---|---|---|
+| **Vendor Super Admin** (`VENDOR_SUPER_ADMIN`) | Vendor staff roles, commercial platform settings, account/support governance and high-impact vendor approvals | No customer-runtime impersonation, local-admin password reset, customer-data access, unrestricted remote execution or decryption keys |
+| **Vendor Admin** (`VENDOR_ADMIN`) | Assigned commercial customers, entitlement support within delegated limits, downloads, advisories and scoped support cases | Cannot appoint a Vendor Super Admin, approve their own exceptional elevation, read unrelated cases or independently sign/release arbitrary code |
+| Vendor Support Specialist / Security Reviewer | Capability-restricted assignments within the vendor role model | No implicit access beyond assigned permitted records; no permanent runtime credentials |
+
+The Vendor Super Admin title does not collapse separation of duties. Publishing a release or model, changing signing trust and approving high-impact account recovery require the configured independent approvals. Vendor governance authorisation is distinct from cryptographic signing-key access. Maintain separate emergency procedures and immutable administrative records.
+
+### Customer roles — inside each customer's installation
+
+| Role | Permitted scope | Explicit exclusions |
+|---|---|---|
+| **Organisation Super Admin** (`ORG_SUPER_ADMIN`) | Customer-owned identity, organisation settings, environment/subtenant creation, scoped role grants, system monitoring, local licence/update administration and local recovery | No other organisation, no vendor staff privileges, no permission to bypass mandatory audit/safety controls or change the no-vendor-data promise |
+| **Organisation Admin** (`ORG_ADMIN`) | Delegated environment/subtenant settings, members, systems, connector operations and assigned support work | No automatic owner transfer, super-admin appointment, global key export, unassigned subtenant access or unrestricted destruction |
+| **Member** (`MEMBER`) | Assigned workspace, tasks, reports or operational actions granted by a capability set | No default member-management, policy publication, destructive approval or broad data export |
+| Optional **Subtenant Admin** | Administration within an explicitly assigned business-unit/project boundary | No sibling-subtenant or whole-organisation administration unless separately granted |
+
+The existing **Organisation Owner** is mapped to `ORG_SUPER_ADMIN`; retain the existing role name as a compatible alias, not a second independent omnipotent identity. Privacy Administrator, DPO/Privacy Officer, Compliance Manager, Security Administrator, Engineering Administrator, Workflow Operator, Auditor/Reviewer and customer Support Administrator remain as specialised capability sets. No role is removed.
+
+Data Principal is a separate portal identity, not automatically a Member or subtenant administrator. A person may have more than one role only through explicit grants, with conflict/separation-of-duty checks.
+
+### Commercial account members are not vendor employees
+
+The purchaser may assign **Commercial Owner**, **Billing Contact**, **Download/Licence Contact** and **Support Contact** in ORVIA Account. These are customer contacts on the vendor website, not Vendor Admins and not customer-runtime administrators. An individual may hold separate commercial and runtime identities without either grant automatically creating the other.
 
 ---
 
@@ -574,6 +631,30 @@
 ## TENANT ISOLATION AND ACCESS GOVERNANCE
 
 Add service identities, short-lived machine credentials, scoped API tokens, approval separation and periodic access reviews. Customer-side support access is customer-authorized, just-in-time, time-limited and auditable. Under `CUSTOMER_LOCAL`, these privileges are for authorised customer personnel; ORVIA vendor staff do not receive production-data access from a billing role, support role or support approval (§95).
+
+## INDEPENDENT LOGIN AND RECOVERY SYSTEMS
+
+| Identity | Used for | Authority it does not imply |
+|---|---|---|
+| Vendor commercial identity | Billing, licences, downloads and business support | No permission to read or administer the customer's runtime |
+| Customer runtime identity | Privacy operations and local administration under customer roles | No automatic right to change purchases or payment details |
+| Data Principal identity | The person's own consent and request interactions | No organisational administration or another principal's records |
+
+Use independent sessions, token audiences, role assignments and data stores. The same corporate identity provider may authenticate vendor and runtime applications where supported, but they remain separate applications with independent permissions. Do not pass vendor tokens to the runtime or require vendor-account login to operate a valid local installation.
+
+A vendor password reset cannot reset the local administrator. Customer runtime recovery uses customer-held recovery procedures; vendor staff do not hold a universal recovery key. No vendor commerce credential or licence token can authorise an execution command. [M1 §§7, 31, 94–96]
+
+## AUTHORISATION CONTRACT FOR THE ROLE HIERARCHY
+
+Evaluate authority against the authenticated identity's **trust domain + organisation + environment/subtenant + resource + action + context**. Trust domain is established from validated issuer/audience, server configuration and authenticated session—not an untrusted `role` or `organisation_id` field. Deny by default and validate every API, job, search, export and AI tool call. Least-privilege and deny-by-default practices follow OWASP guidance [U1].
+
+Vendor identities are not accepted by the customer API. Customer identities are not accepted as vendor staff. Do not create an `is_global_superadmin` bypass, cross-customer impersonation button or vendor-to-runtime role inheritance. Separate token issuers/audiences, signing keys, session stores, account recovery and machine credentials.
+
+Organisation Admin can invite, suspend and assign members only inside its delegated scope. Role grants must be a subset of the granting actor's **delegable** capabilities; possessing an action does not automatically permit delegating it. Owner transfer, elevated roles, identity-provider changes, destructive approvals and security-sensitive configuration require contextual re-authentication and configured maker/checker review.
+
+Require privileged MFA, named accounts, short-lived sessions, revocation, access reviews and an audited customer-held emergency recovery procedure. Prevent accidental removal of the last recoverable customer owner. Vendor billing recovery must never reset customer-runtime ownership. Super-admin administrative scope does not grant an independent processing condition or bypass privacy-request identity/scope checks.
+
+Subtenant/environment restrictions apply to relational rows, object paths, search results, inference contexts, caches, background jobs and exports. Tests must exercise both cross-organisation and sibling-subtenant denial. A central customer-group view requires explicit grants; a vendor support queue is not that group view.
 
 ---
 
@@ -1209,6 +1290,16 @@
 
 Bundle required UI assets locally. Do not embed vendor analytics, session replay, external chat widgets or remotely loaded scripts that can disclose portal activity. Authorised delivery from the customer directly to the relevant Data Principal remains a rights workflow; ORVIA is not an intermediary for that content.
 
+## CUSTOMER-BRANDED PRIVACY CENTRE EXPERIENCE
+
+This is for the purchasing company's clients—not ORVIA's purchasers and not all clients across companies.
+
+Use customer branding and plain language. Provide privacy information/notices, purpose-specific consent choices and withdrawal, supported request types, nomination/representation journeys, secure request status and grievance contact. Display only the authenticated person's permitted interactions. [M0 §20; M1 §§20, 22–24, 33]
+
+Example journey: Acme's client opens Acme's privacy portal, authenticates using Acme's configured flow, withdraws promotional consent and receives an acceptance receipt. The request enters Acme's local ORVIA deployment. An authorised Acme operator sees the resulting work. Nothing in this journey needs to pass through ORVIA Account.
+
+Publish the portal through a customer-controlled ingress or segregated portal tier when public access is needed. Keep administrative endpoints private. “Publicly reachable” does not mean “hosted by the vendor.” Do not use a vendor reverse proxy, vendor-hosted embedded page or vendor telemetry for personal interactions. Strict isolated deployments need a customer-owned inward request process or controlled portal integration; an air-gapped machine cannot also be an internet-facing server without a separate, explicitly designed boundary.
+
 ---
 
 <a id="orvia-section-21"></a>
@@ -1652,9 +1743,21 @@
 
 **No telemetry exception:** hashed, encrypted, redacted or “anonymous” operational data is not automatically eligible for vendor transmission. The default does not monetise, sell, train models on or aggregate end-customer data across organisations.
 
-**External systems:** preserve all existing connector, notification and AI capabilities, but apply the actual destination boundary. Internal systems and customer-controlled cloud services can operate in `CUSTOMER_LOCAL`. Sending personal data to an external SaaS processor or external model provider is a distinct, customer-approved external-processing configuration and must not be advertised as “nothing leaves the organisation.” It still must not route personal data through ORVIA’s vendor infrastructure. In the strict no-external-processing profile, block such destinations. Direct authorised responses to a Data Principal must go through the customer’s own portal/delivery path, not ORVIA’s commerce plane.
+**External systems:** preserve all existing connector, notification and AI-governance capabilities, but apply the actual destination boundary. Internal systems and customer-controlled cloud services can operate in `CUSTOMER_LOCAL`. An approved external SaaS processor or the customer's own external-model application governed under §215 is a distinct external-processing configuration and must not be advertised as “nothing leaves the organisation.” It still must not route personal data through ORVIA’s vendor infrastructure. In the strict no-external-processing profile, block such destinations. ORVIA Intelligence itself uses only the approved ORVIA-owned customer-local model under §§63–65; this paragraph does not authorise an external provider or pretrained model for that assistant. Direct authorised responses to a Data Principal must go through the customer’s own portal/delivery path, not ORVIA’s commerce plane.
 
 If prohibited material is accidentally received by vendor support or another channel, stop propagation, restrict access, treat it as a boundary incident and follow the documented minimisation, evidence and deletion process. Do not use it for debugging or model training, and do not imply such an incident could never occur.
+
+## SUPPORT AND AI DO NOT CREATE NEW CUSTOMER-DATA EXPORT RIGHTS
+
+The vendor Super Admin/Admin receives only the commercial and deliberately permitted support information above. A role name, support escalation, encryption, hashing or AI-generated summary does not create an exception for production records. Customer member lists, system identifiers, internal hostnames, workflows and evidence remain local.
+
+A customer-approved support exchange may include a vendor case identifier, existing licence/random installation reference, product/component version, enumerated problem category/error code, customer-selected urgency, approved runbook result enum and synthetic reproduction. Each field requires the purpose/retention/access specification already required here. No arbitrary log text or local operational reference is allowed. Detailed rules and optional opt-in notifications are in §§95–96.
+
+Lightning AI is a vendor-selected **model-development infrastructure provider**, not a customer data processor for runtime inference in this architecture. Only vetted public/licensed non-customer corpus material, ORVIA-authored documentation, synthetic fixtures, training code and resulting ORVIA experiment artifacts may enter that training environment. Do not mount customer storage, issue customer credentials, upload support payloads, or send customer prompt/output/embedding/gradient data to it.
+
+Runtime inference can inspect minimal customer-local context that the requesting person is authorised to see; that is **not training**. It stays local and must not change released model weights, be added to a vendor training corpus, or be used for federated learning or cross-customer improvement. Training and inference provenance are governed by §§64–65.
+
+Authorised display to an employee's browser or a response to a Data Principal is an intentional customer workflow, not vendor receipt. Endpoint caches, exports and downloads need customer controls. The vendor website, vendor staff, Lightning training workspace and customer runtime are four distinguishable recipients/locations, not one undifferentiated “cloud.”
 
 ---
 
@@ -1762,6 +1865,20 @@
 
 Runtime privacy decisions, identity matching, approvals, verification and evidence must not depend on a vendor API call. A paid account obtains software and entitlements, not a vendor-mediated processing channel. Validate vendor replies as untrusted input: licence responses cannot contain executable commands, support access grants or new data-export destinations.
 
+## NAMED INTERFACES AND THEIR HOSTING BOUNDARIES
+
+Addresses below are illustrative, not real service endpoints.
+
+| Experience | Audience | Hosting and identity | Example address |
+|---|---|---|---|
+| **ORVIA Account** | Purchaser, billing administrator, authorised download/support contacts | ORVIA vendor commerce infrastructure; commercial account login | `https://account.orvia.example` |
+| **ORVIA Workspace** | Customer privacy, engineering, security and audit teams | Customer infrastructure; customer-controlled runtime identity | `https://orvia.acme.example` |
+| **Acme Privacy Center, powered by ORVIA** | Acme's clients/customers, called Data Principals in the specification | Customer-controlled portal and restricted portal API; identity scoped to each person's interactions | `https://privacy.acme.example` |
+
+The public ORVIA marketing site is an unauthenticated entry point to the first experience. An internal ORVIA vendor-support console is separate staff tooling, not a customer-runtime administrator account.
+
+**Our website manages the commercial relationship. Their installation performs privacy operations. Their privacy portal serves their clients.** [M1 §§20, 31–34, 82–86, 95–96, 203]
+
 ---
 
 <a id="orvia-section-35"></a>
@@ -1790,6 +1907,14 @@
 Corporate-group views require explicit access grants and separate legal-entity contexts. Do not infer consent sharing across subsidiaries. A consultant's multi-customer view aggregates authorized operational status, not a merged principal identity pool.
 
 **Acceptance:** The isolation suite covers API, database, background workers, search, AI retrieval, storage, exports, support and telemetry; ambiguous tenant context is denied.
+
+## MEMBERSHIP, SUBTENANTS AND ENVIRONMENTS
+
+A **member** is a person assigned permissions. A **tenant/subtenant** is a data and authority boundary. An **environment** is an operational context such as test or production. Keep these concepts distinct in storage, API contracts and the interface.
+
+Default customer isolation is a separate customer-controlled deployment. An organisation may create supported subtenants for its own explicitly approved business units or projects; this does not grant permission to host unrelated businesses under one shared identity/data scope. Model legal entities separately and apply applicable product/contract boundaries.
+
+Organisation Super Admin can oversee its own defined organisational scopes; Organisation/Subtenant Admin sees only delegated scopes; Members see only assigned resources. No vendor staff role inherits access to any of them. Counts, activity views, integration health and member administration remain customer-local. Monitor product/security activity relevant to administration—not unrelated device activity or undisclosed employee surveillance.
 
 ---
 
@@ -2051,6 +2176,19 @@
 Provide signed licence import and approved package/update transfer without requiring runtime internet access. Entitlements and expiry are evaluated locally with explicit clock/tamper handling. Define safe behaviour for expiry, revocation information that cannot be refreshed, renewal and support handover; do not silently fail open, destroy data, disable an accepted restriction or grant remote vendor control (§160).
 
 “No runtime vendor callback” is not automatically a claim of fully engineered air-gap support. Air-gap packaging, dependency mirrors, offline trust updates and operational testing remain explicit requirements in §86.
+
+## CONNECTIVITY IS NOT THE SAME AS AUTHORISATION
+
+| Condition | Required behaviour |
+|---|---|
+| Vendor website, support service or Lightning training service unavailable | Valid customer-local login, deterministic workflows and an already installed supported ORVIA model remain independent of those services |
+| Customer internet unavailable but local network intact | Local functions continue as supported; external integrations and vendor support delivery may be unavailable |
+| Employee cannot reach the customer network | No workspace access from that device until its approved route is restored |
+| Employee closes the browser | An accepted durable workflow continues on the customer server |
+| Runtime host or evaluation laptop stops | Services on that host stop unless the deployed recovery/failover profile takes over |
+| No supported local AI resources/model | Show AI unavailable; retain deterministic diagnosis, runbooks and escalation preparation without external-model fallback |
+
+A completely disconnected customer environment cannot proactively notify vendor support. Record local alerts, queued approved reports and unavailable channels honestly; the customer can export a permitted report through an approved manual transfer.
 
 ---
 
@@ -2179,6 +2317,12 @@
 - outcome
 - correlation ID
 
+## ROLE, SUPPORT AND MODEL AUDIT EVENTS
+
+Audit vendor role changes, assigned-case access, support replies, approved diagnostic receipt, licence reissue and package/model publication in vendor stores without customer operational context. Audit customer role/delegation changes, subtenant access, local troubleshooting, support-report preview/approval, local model/knowledge-pack installation and proposed repair approval inside the customer environment.
+
+Do not mirror customer audit streams to vendor services. A model response, suggested fix, accepted action and verified outcome are distinct records. Role elevation and support closure must never erase adverse evidence or convert an unresolved privacy action into a verified result.
+
 ---
 
 <a id="orvia-section-47"></a>
@@ -2729,26 +2873,64 @@
 
 ## AI REMAINS INSIDE THE SAME DATA BOUNDARY
 
-For operational/customer content, all seven AI functions must use inference, retrieval, embeddings, model logs and tool execution inside the customer-controlled boundary. A customer-hosted/private model is required for these functions in strict mode. If unavailable, report the affected AI capability unavailable and keep the deterministic platform running; never fall back to a vendor-hosted or public model endpoint.
+For operational/customer content, all seven AI functions must use inference, retrieval, embeddings, model logs and tool execution inside the customer-controlled boundary. An approved ORVIA-owned model release running inside the customer environment is required for these AI functions in the current product; a third-party model is not an automatic substitute. If unavailable, report the affected AI capability unavailable and keep the deterministic platform running; never fall back to a vendor-hosted or public model endpoint.
 
 Development use of GPT/Claude does not authorise runtime transmission of customer data. Use synthetic fixtures for development and externally assisted demonstrations. Do not paste customer records, evidence, incident payloads, credentials or identifiable “redacted” excerpts into external coding chats.
 
+## ORVIA INTELLIGENCE — PURPOSE-BUILT ASSISTANCE
+
+**Product decision:** build a dedicated ORVIA model family, provisionally called **ORVIA Intelligence**, for ORVIA/DPDP knowledge assistance, installation guidance, safe troubleshooting, explaining actual local records, drafting reviewed policy/workflow changes and generating scoped tests. Preserve every existing AI module in §§66–73. This is not a general-purpose public chatbot, legal decision-maker or autonomous system administrator.
+
+**Interpretation of “not using existing models”:** train the model's learned weights from random initialisation using the approved corpus. Do not use an existing third-party pretrained checkpoint, adapter, teacher-model distillation output or hosted foundation-model API as the product's underlying intelligence. A branded prompt around another model or a fine-tuned third-party model would be a different design and must not be presented as this from-scratch model.
+
+This does not require inventing a new neural-network algorithm or rewriting training frameworks. Approved open-source training/inference libraries and published architecture implementations can be used under reviewed licences. Own training data preparation, tokenizer training/configuration, architecture configuration, weights, evaluation and release provenance. All learned subcomponents—including an embedding/reranking model, where used—must meet the same origin rule; deterministic keyword/full-text retrieval needs no pretrained model.
+
+### Training location and runtime location
+
+```text
+APPROVED NON-CUSTOMER MATERIAL
+  Public/licensed DPDP sources + ORVIA documentation + synthetic fixtures
+                    |
+          Vendor-controlled preparation and review
+                    |
+          Authorised Lightning AI training workspace
+          (ORVIA training only; no customer access/credentials)
+                    |
+          Candidate ORVIA weights + evaluations
+                    |
+          Vendor review, security checks and release signing
+                    |
+          ORVIA WEBSITE / VENDOR DISTRIBUTION CLOUD
+                    |
+          Customer-approved download and local verification
+                    |
+          CUSTOMER-LOCAL ORVIA INTELLIGENCE
+          + versioned local knowledge pack
+          + permission-filtered customer-local context
+                    |
+          Explanation / draft / bounded diagnostic suggestion
+```
+
+There is **no runtime request path from customer ORVIA to Lightning or a vendor inference API**, and no return path for customer prompts, outputs, feedback, gradients or operational records into training. Customer-held local context may support an answer without becoming training data.
+
+Use the local assistant before routine vendor escalation where useful, but provide a direct support route and deterministic runbooks at all times. AI failure, uncertainty or unavailability must never block critical reporting, rights handling or a legitimate request for human support.
+
 ---
 
 <a id="orvia-section-64"></a>
 
 # 64. AI MODEL ABSTRACTION
 
-Do not hard-code ORVIA to one model provider.
+Do not hard-code ORVIA to one model version or inference engine. In the current product, the gateway serves approved ORVIA-owned model releases only; third-party pretrained models and hosted-model services are not active providers.
 
 Create:
 
 ```text
-AI Gateway
+CUSTOMER-LOCAL AI GATEWAY
    │
-   ├── Provider A
-   ├── Provider B
-   └── Local Model
+   ├── ORVIA Intelligence — approved local CPU profile
+   ├── ORVIA Intelligence — approved local GPU profile
+   └── Deterministic knowledge/runbook fallback (not an LLM)
 
 ```
 
@@ -2766,11 +2948,87 @@
 
 ## AI COPILOT: USEFUL, CONSTRAINED AND EVALUATED
 
-Separate customer content from provider settings. Support approved model/provider routing, data minimization, prompt logging controls, retention restrictions, regional routing and local/private inference where deployed. Never claim that a provider does not retain or train on data without the applicable contract/configuration supporting that claim. Customer production records must not be used to train a shared ORVIA model under this product model.
-
-## PROVIDER ROUTING BY DEPLOYMENT PROFILE
-
-Keep the existing provider abstraction. In strict mode, Provider A/Provider B adapters can be enabled only for endpoints proven to run within the approved customer boundary; a private network endpoint to an external provider is not by itself evidence of in-boundary processing. Disable public/external providers for operational data. Any separately customer-approved external-processing configuration must be explicitly labelled outside the strict no-external-processing profile and must not route the data through ORVIA vendor servers (§31).
+Separate customer context from model configuration. Support approved ORVIA model/version routing, data minimization, local prompt logging controls, retention restrictions and customer-local inference. No product inference is routed to an external provider. Vendor model-development infrastructure needs its own approved access, retention and contractual review; do not infer those assurances from a provider name. Customer records must not be used to train ORVIA models under this product model.
+
+## MODEL ROUTING BY DEPLOYMENT PROFILE
+
+Keep the model/runtime abstraction, but accept only released ORVIA-owned weights and approved customer-local inference engines. Disable external/public providers, automatic pretrained-weight downloads and external embedding services. A private endpoint to somebody else's model service is not the requested ORVIA-owned customer-local model.
+
+The former Provider A/Provider B and externally approved model alternatives are historical design options, preserved in the revision audit rather than enabled under the current requirement. Reintroducing third-party learned weights or remote inference requires a separate explicit product decision; it cannot happen through a support override, configuration default or licensing upgrade.
+
+## MODEL ENGINEERING AND TRAINING LIFECYCLE
+
+All items below are required design/work items, not evidence of completed training. Training compute is separately authorised and budgeted; this document does not start jobs or commit spending.
+
+### A. Corpus and source governance
+
+| Corpus class | Permitted purpose | Required control |
+|---|---|---|
+| Authoritative published DPDP instruments and official guidance | Domain knowledge, terminology and source-grounded exercises | Record issuer, source location, publication/effective dates, version, retrieval date, reuse review and counsel-reviewed interpretation separately |
+| ORVIA-authored product documentation, schemas and runbooks | Teach product behaviour, error taxonomy, support guidance and valid output structure | Match a released app version; exclude secrets, customer examples and unreleased unsafe workarounds |
+| ORVIA-authored synthetic scenarios | Diagnostic reasoning, permissions, failure handling, uncertainty and support escalation exercises | Generate from fictional fixtures and executable test cases; validate outcomes; no copied/masked customer incidents |
+| Approved open/licensed technical or language material | Any language/technical competence needed beyond the narrow domain documents | Explicit inclusion decision, source/rights/provenance review, personal-data screening, deduplication and documented scope |
+| Customer information and customer-derived material | **Not permitted for training** | Exclude customer records/configurations, conversations, tickets, logs, exports, embeddings, feedback, gradients and “anonymised” operational derivatives |
+
+“On the internet” is not the corpus admission rule. Require documented authority to reuse material for this purpose; reject uncertain or contaminated sources pending review. Do not scrape indiscriminately. Public source text may still contain unrelated personal information or malicious instructions; filter and review it rather than assuming public means safe.
+
+Maintain a corpus manifest with source ID/digest, approved use, language, topic, version/date, source licence/permission, transformation history, reviewer, dataset split, excluded material and deletion/correction procedure. Dataset-card practices can document source context, licence, language and limitations [U10]; a completed card is not a legal clearance or proof of data quality.
+
+Keep authoritative legal text, reviewer interpretation, technical product rules and model-training examples labelled separately. Do not turn a forum answer into an official legal rule. This revision does not update or certify the historical legal baseline in §§165–167 and 218.
+
+### B. Prove the from-scratch lineage
+
+Use an ORVIA-owned tokenizer trained on the approved corpus, an explicit architecture/configuration and random initial weights. Reusing a training architecture implementation is different from importing its learned weights. Pin framework/code versions and licences. Record seed, initialisation, corpus/tokenizer digests and all input artifacts. Initial third-party checkpoint and adapter paths must be empty; permitted resume checkpoints must trace back to ORVIA's own approved run.
+
+Lightning's LitGPT documentation distinguishes from-scratch pretraining from continued pretraining using an initial checkpoint [U6]. Inspect each chosen template and pinned script: a tutorial named “pretrain” is not sufficient evidence that it does not load pretrained weights. Do not copy an example with an external initial checkpoint and call it original ORVIA training.
+
+Use ordinary deterministic search initially where practical. Do not hide a third-party embedding, moderation or reranking model behind the claim that the language model is custom. A future ORVIA-trained auxiliary component needs its own provenance/evaluation and must not use customer data.
+
+### C. Run controlled training experiments on Lightning AI
+
+Use an authorised ORVIA team workspace for corpus preparation, training, evaluation and candidate artifacts. Lightning provides GPU workspaces and multi-node training mechanisms [U7]. Availability of GPUs does not establish data sufficiency, answer quality, budget adequacy or a completion date.
+
+Prepare code and datasets before allocating expensive compute; start with a small bounded experiment, measure data loading, tokens/second, GPU memory, training stability and held-out performance, then approve a larger run if justified. Choose parameter count, context length, language coverage, token budget and GPU topology from those measurements—not from a marketing target.
+
+Private workspace/repository access, approved storage and network settings, credential scope, artifact visibility, retention and provider terms must be checked for the actual Lightning account/project. Disable public sharing, unapproved copilots/log sinks and unnecessary service integrations. No customer credentials or customer-cloud mounts are present. Training-project credentials must not grant customer runtime access or product-release signing authority.
+
+Lightning's documented user/teamspace secrets can be made available across multiple studios [U8]. Use a dedicated appropriately scoped training teamspace and least-privilege credentials; do not place broad commercial or release-signing secrets in it. Apply security controls to snapshots, caches, checkpoints, experiment trackers and multi-node replicas, not only the primary dataset directory.
+
+Checkpoint/restart own runs reproducibly. Track actual compute/storage/transfer consumption, failures and cleanup. Publish costs only after measurement; do not claim the earlier coding subscriptions cover this GPU work or that a fixed small number of GPU hours guarantees a useful model.
+
+### D. Build competence, then domain behaviour
+
+The user-facing scope remains ORVIA and DPDP assistance. A narrow corpus of legal text and product manuals may support terminology but does not establish robust general language understanding or troubleshooting competence. Treat corpus sufficiency as an experiment to evaluate, not an automatic consequence of training.
+
+Plan from-scratch language pretraining on the approved scope, domain learning, and supervised instruction tuning of **ORVIA's own resulting checkpoint** using human-reviewed synthetic tasks. Instruction tuning an ORVIA-owned base is permitted; fine-tuning an existing third-party foundation model is not the selected architecture. Include supported languages, out-of-scope questions, insufficient-evidence responses, failed diagnostic steps and correct escalation examples.
+
+Maintain a deterministic search/runbook baseline. A trained candidate must improve useful task performance without weakening permission, privacy or safety gates. If it does not meet release thresholds, keep it a research candidate and expose the baseline honestly; do not quietly switch to an existing model or mark untrained generation as working.
+
+### E. Ground answers in versioned local knowledge
+
+Ship a reviewed knowledge pack for product versions, connector capabilities, error codes, runbooks and legal source references. Use permission-filtered local retrieval and deterministic source validation around the model. Start with full-text/keyword retrieval where sufficient; add only evaluated ORVIA-owned learned retrieval components.
+
+Do not rely on weights as the legal database. Store source provision, publication/effective date, applicability, review status, app version and pack version with retrieved context. Law/product updates can be distributed as independently signed knowledge packs without pretending an old checkpoint has memorised the latest material. Unsupported, stale, conflicting or insufficient sources trigger qualification or escalation; retrieval does not guarantee a correct answer.
+
+For a local operational question, retrieve only the authorised minimal records needed for that answer. Keep shared public documentation separate from each organisation/subtenant's restricted indexes, session state and local evidence. Never put private content in the shared pack.
+
+### F. Evaluate before release
+
+Create independent train/validation/test splits grouped by source, document version and scenario family; avoid near-duplicate leakage. Freeze human-reviewed test sets separately from the training pipeline. Evaluate factual/source correctness, correct citation and date handling, structured-output validity, appropriate abstention, supported-language quality, diagnostic usefulness, wrong-fix risk, tenant isolation, prompt injection, secret/PII disclosure, tool misuse and runtime resource limits.
+
+Test failure and adversarial cases, not only FAQs. Compare pre/post-domain training and any quantised runtime artifacts with the deterministic baseline. Every claimed language, model size, hardware profile and function needs its own recorded evidence. Define release thresholds before looking at final test results; do not choose numbers afterward to make a run pass. No confirmed critical permission/egress/unsafe-action failure may be accepted merely for a higher average score.
+
+### G. Package and maintain the model
+
+A release contains the ORVIA weights in an approved non-executable tensor representation, tokenizer, architecture/inference configuration, local retrieval schemas, model card, corpus-provenance summary, evaluation report, dependency/SBOM information, app/knowledge compatibility and signed manifest. Do not ship training secrets, raw training dumps or an executable model-loader hook that downloads arbitrary code.
+
+Pin and test the customer inference engine. Validate any conversion or quantisation against the original candidate. The customer imports the signed package from the ORVIA vendor distribution service; it must not download an alternate checkpoint from a model hub or contact Lightning at runtime.
+
+Record model, tokenizer, knowledge-pack and safety-policy versions on local answers. Maintain a supported-version/advisory process. Model rollback must not roll back current consent, authorisation, safety controls or required legal knowledge. No online/federated learning, automatic gradient export, customer fine-tuning or prompt-feedback training is enabled under this requirement.
+
+### H. Decisions that remain measurable, not invented
+
+The final model architecture/size, corpus scale, GPU type/count, costs, runtime memory, supported languages and answer-quality thresholds require experiments and owner approval. This architecture selects the ownership/privacy route; it does not claim a trained model already exists or commit it to the prototype's 36-hour deadline. Keep all planned AI functions in scope while gating actual release capability by evidence.
 
 ---
 
@@ -2796,6 +3054,16 @@
 ## MINIMISATION DOES NOT AUTHORISE EXPORT
 
 Redaction, masking, hashing and structured-context construction reduce exposure but do not permit customer operational data to leave the defined boundary. Apply minimisation before customer-local inference as well. Model caches, embeddings, prompt/output traces, evaluation data and error captures inherit the same local storage, access and retention controls.
+
+## NO CUSTOMER-DATA TRAINING — INCLUDING LOCAL AND INDIRECT PATHS
+
+A customer-local question may contain authorised local context for **inference only**. It must not become training/finetuning material even when it stays on the same server, because the current promise excludes customer-data training rather than merely forbidding upload. Disable learning from conversations, ratings, resolved tickets, model memory, retrieval logs and agent traces.
+
+A local retrieval index or expiring conversation context is a customer-local information store, not a permitted vendor training dataset. Give it its own access, retention, deletion and backup policy. Do not merge it into distributed model weights, public packs or ORVIA's development corpus.
+
+Training-data ingestion accepts only allowlisted vendor-controlled approved sources with provenance. A support attachment—even one described as scrubbed, encrypted or anonymous—is not eligible. Reproduce a defect independently using fictional fixtures; do not transform a production incident into training data by removing a name. No vendor support transcript, customer feedback, gradient or federated-learning update may cross into model development.
+
+Keep model-development credentials and artifact namespaces disconnected from customer stores and commercial support databases. Corpus scans, human review, provenance checks and canary tests are layered controls, not a claim that a scanner alone can prove no personal information exists.
 
 ---
 
@@ -2834,6 +3102,16 @@
 
 **Acceptance:** Copilot explains a failure using actual action records; it declines to manufacture missing evidence; the platform still executes consent, rights and enforcement workflows when AI is disabled.
 
+## LOCAL FIRST-LINE ORVIA ASSISTANCE
+
+The assistant should answer how ORVIA works, explain an authorised local failure, find the applicable supported runbook, suggest a bounded next step, and help prepare a privacy-safe escalation. Keep the answer within ORVIA/product/DPDP scope; unsupported legal conclusions go to the designated reviewer rather than a fabricated definitive answer.
+
+Default troubleshooting is read-only. A useful answer shows: observed facts; cited local records/documentation; model/knowledge/app version; what remains uncertain; suggested steps; required permissions/approval; and how to verify success. **Observed cause**, **likely explanation** and **unconfirmed possibility** must not be interchangeable labels. Do not display invented confidence percentages.
+
+Typical sequence: local connector reports an error → assistant reads authorised status and the matching runbook → customer sees a proposed diagnostic → deterministic service validates capability/scope → authorised customer executes → a real check confirms the result or the case remains unresolved. A model-generated explanation is not a repair or proof that a control works.
+
+The user can bypass AI and contact support using the approved route. The assistant cannot close a critical incident, alter deadlines, hide unresolved privacy work or send any support payload on its own.
+
 ---
 
 <a id="orvia-section-67"></a>
@@ -2952,6 +3230,14 @@
 - error
 - logs
 - workflow
+
+## EXAMPLE: TROUBLESHOOTING WITHOUT DISCLOSING CUSTOMER RECORDS
+
+A customer-local connector fails. The local assistant may inspect an authorised connector status, bounded error and relevant runbook; it must not infer that a specific credential or record is faulty without supporting evidence. It suggests a permission check and explains the expected result. Customer-held credentials remain in the connector/secret service, not the model context.
+
+If the issue persists, a customer Support Administrator prepares a report containing the permitted product version, connector package version, enumerated error category and completed public-runbook steps. Local workflow IDs, tenant-member names, connection strings, database/table names and AI conversation text stay local. The vendor Support Admin receives the approved case, reproduces it synthetically, and supplies a signed fix or reviewed instructions. The customer authorises application and independently checks the result.
+
+A vendor case can be resolved while a local privacy action remains unverified; the two states must not be conflated.
 
 ---
 
@@ -3040,6 +3326,14 @@
 - execute unrestricted SQL;
 - fabricate evidence.
 
+## CUSTOM TRAINING DOES NOT REMOVE AI SAFETY BOUNDARIES
+
+ORVIA-owned weights are not a security boundary by themselves. Enforce permissions, scope checks, output validation and approved action execution outside the model. Prompt injection and excessive agency remain threat classes even for a local specialised assistant [U9].
+
+The AI must not train on customer context, grant roles, extend a support permission, export diagnostics, fetch outside model weights, disable auditing, weaken network restrictions, execute a free-form repair script or approve its own suggestion. Destructive or security-sensitive changes continue to require the deterministic plan/approval/verification workflow.
+
+Use a task-scope router and grounded answer contract to keep user-facing assistance product-specific. Being trained on a domain does not prove every generated statement remains inside the domain. Out-of-scope or insufficiently supported requests receive an explicit limitation and relevant escalation, not an ungrounded answer.
+
 ---
 
 <a id="orvia-section-75"></a>
@@ -3072,6 +3366,12 @@
 ## CUSTOMER-CONTROLLED NOTIFICATION DELIVERY
 
 Operational messages originate from the customer deployment and use its authorised portal, relay or integration. ORVIA’s vendor billing mailer must not receive Data Principal addresses, request details or incident content. External messaging/SaaS delivery requires the explicit boundary treatment in §31; strict mode does not silently substitute an external vendor service when a local relay fails. Licence and renewal messages use the separately supplied business contact only.
+
+## LOCAL ALERTS AND VENDOR SUPPORT SIGNALS
+
+Send operational failures first to authorised customer roles through customer-approved channels. Critical safety/security conditions must not wait for an AI conversation before local alerting and escalation.
+
+Vendor support receives a report only through §95's deliberately approved diagnostic path. An optional customer-approved automatic notification uses the same bounded schema and local validation, never raw operational notifications, personal identifiers or a hidden telemetry feed. External customer messaging remains subject to §31's destination rules.
 
 ---
 
@@ -3268,6 +3568,12 @@
 
 For every edition sold as `CUSTOMER_LOCAL`, personal data stays local; essential authentication, authorisation, encrypted transport, secure updates, auditability and vulnerability fixes for supported releases are part of the baseline. Larger scale, advanced SSO/federation management, high availability, automated fleet administration and additional AI/integration capacity can remain differentiated. An edition without a suitable local model must disable operational AI rather than export data to make a feature appear available.
 
+## EDITIONS, DEPLOYMENT PROFILES AND ROLES ARE INDEPENDENT DIMENSIONS
+
+Foundation, Control and Enterprise remain the editions. Standard Server, Kubernetes, Offline and Evaluation are deployment profiles of the same product. Vendor and customer role scopes are security boundaries, not commercial tiers. A paid support plan does not grant vendor access to production customer information.
+
+The ORVIA-owned model and model-management capacity can be packaged according to published entitlements and supported hardware. No edition may replace unavailable local AI with a third-party or vendor-hosted model to make the feature appear present. Essential privacy/security restrictions apply even when an advanced capability is not licensed.
+
 ---
 
 <a id="orvia-section-82"></a>
@@ -3299,6 +3605,43 @@
 ## PURCHASE, DOWNLOADS AND SECURITY CENTRE
 
 Provide an authenticated customer purchase/download area with the purchased edition, invoices, signed licence, supported deployment packages, exact versions/digests, verification instructions, release/security notes and renewal controls. Publish a security/trust centre with the actual data-flow boundary, minimum vendor-data inventory, vulnerability-reporting route, supported-version policy and evidence-backed assessment scope. Do not publish certification badges or “zero vulnerability” claims without support (§168).
+
+## CUSTOMER ACCOUNT EXPERIENCE ON THE VENDOR WEBSITE
+
+Use the heading **“Account, licences and downloads”**, not “Privacy Operations Dashboard.”
+
+| Page | What the page should show or permit | What must not appear there |
+|---|---|---|
+| Account overview | Purchased edition, licence validity, purchased deployment rights, renewal prompts, latest eligible release | Live privacy-request totals, control scores or customer system health |
+| Licences | Signed licence download, validity, entitlements, renewal/reissue workflow, minimal random installation binding if needed | Principal directories, discovered users, customer-record counts or runtime secrets |
+| Downloads | Supported package/profile, platform, version, digest, signature verification, prerequisites and documentation | A claim that downloading means successfully installed |
+| Billing | Orders, invoices, payment references, necessary billing/tax information | Client transactions or personal-data inventory |
+| Commercial members | Purchaser, billing, licence/download and support permissions | The operational user directory or automatic runtime access |
+| Updates and security | Release notes, compatibility, vendor service status, security advisories, supported releases and assessment scope | Unobserved claims about customer patch level or runtime health |
+| Support | Business tickets and optional validated diagnostics under the minimum-data contract | Production evidence, customer screenshots, identifiers, logs or arbitrary attachments |
+| Guides and trust | Install/update/recovery documentation, published data inventory, security disclosures | Compliance guarantees or certifications not actually obtained |
+
+[M1 §§31, 82, 93–96, 159, 163–168]
+
+### Status wording
+
+A licence being issued is not proof that software is running. A downloaded release is not proof that it was installed. Recommended labels are **“Licence issued,” “Package downloaded,” “Customer-declared version”** and **“Runtime status not collected.”** If an allowed diagnostic was voluntarily supplied, show its timestamp and limited scope; do not turn it into a live monitoring promise.
+
+Avoid an “Open your workspace” feature that requires vendor-side storage, discovery or proxying of private infrastructure. The default is a customer-managed bookmark. A future convenience link must be separately reviewed for data collection and navigation safety; it must not transfer vendor tokens, grant access or probe private destinations.
+
+### Download selector
+
+Ask **where the product will be installed**, not merely which operating system the downloading browser reports.
+
+The proposed choices are: Server/VM; Kubernetes; offline transfer; local evaluation. Then select a supported target architecture and release. A purchaser on Windows may correctly need a Linux server bundle. Do not request cloud access keys, network maps or customer database credentials in this wizard.
+
+## OFFICIAL ORVIA DISTRIBUTION AND SEPARATE VENDOR-STAFF CONSOLE
+
+**Yes: ORVIA remains provided by the vendor's website and vendor-controlled distribution cloud.** The vendor publishes and signs the complete software, licences, connector/model/knowledge packages, verification instructions and updates. A vendor-managed object store, CDN or registry may deliver approved artifacts; it does not receive operational customer data. Customer private-registry mirrors and offline transfers preserve approved signatures/digests and do not change publisher identity.
+
+Use a primary **Download ORVIA** action offering the canonical ZIP envelope defined in §85. The selected profile/architecture determines its contents; the operating system of the purchaser's browser does not choose the installation host silently. A model-training checkpoint URL at Lightning is not the official customer product download.
+
+Add a separate **Vendor Administration and Support Console** for Vendor Super Admin/Admin staff. It manages commercial accounts, assigned support cases, approved diagnostic receipts, known product defects, advisories and release/knowledge governance. Its customer card may show purchased rights and allowed support context—not client records, runtime members, live operational counts or an unobserved “healthy” status. See §96 for its permissions and case lifecycle.
 
 ---
 
@@ -3339,6 +3682,16 @@
 
 ```
 
+## EXAMPLE OF THE COMPLETE CUSTOMER JOURNEY
+
+Consider the fictional Acme Example Ltd. It buys an ORVIA Control licence through the vendor website. Its IT team installs ORVIA on a Linux server in Acme's own cloud account or data centre. IT configures customer DNS, certificates, identity, storage, keys, network access and permitted connectors.
+
+A privacy officer using Windows, an engineer using macOS and an auditor using Linux all open the same workspace address. They see the same design, but their permitted actions differ. Runtime records are fetched from the customer-hosted API, not the vendor's account website. If the workspace is private, users need the customer's approved network/VPN/private-access path.
+
+The company shares the workspace address through its own intranet, application launcher or bookmarks. It does not need to register internal hostnames with ORVIA. Acme publishes the separate privacy-portal address to its own clients.
+
+If an employee closes their browser, the server's accepted workflows continue. If the deployment host is stopped, browser availability does not keep the backend operating. This is why a personal laptop is a demonstration environment, not the recommended always-on organisation server.
+
 ---
 
 <a id="orvia-section-84"></a>
@@ -3374,6 +3727,26 @@
 
 Before go-live, display and verify the runtime location, customer-controlled identity/keys, local storage/backup targets, allowed egress, disabled vendor telemetry, licence validity and complete package signature verification. Show the precise vendor-data inventory and any optional diagnostic selection. Run a synthetic boundary test before enabling real personal-data processing. Reject a configuration requiring a vendor endpoint to receive operational content.
 
+## SEPARATE COMMERCIAL, INSTALLATION AND DAILY-USE STAGES
+
+**Commercial step:** buy an edition; assign commercial contacts; download the appropriate signed release, licence and guide.
+
+**Local IT step:** verify release trust; prepare the supported runtime; configure customer domains/TLS, durable storage, backups and keys; import the licence; create a unique local administrator; configure customer authentication and roles; enforce permitted egress; run preflight and health checks.
+
+**Privacy configuration step:** connect permitted systems with least-privilege customer-local credentials; review capabilities and identity matching; create purposes/notices/policies; run synthetic workflows and boundary tests; begin Observe/dry-run before approved enforcement.
+
+**Everyday step:** authorised staff use their customer workspace address. Clients use the separate privacy portal. Both operate against customer-hosted services. Closing the vendor website does not stop these services.
+
+A guided local wizard should show what is complete, what remains untested, which permissions are requested and which actions become possible after approval. Avoid one-command claims that conceal DNS, identity, key, storage or network prerequisites. [M1 §§83–86]
+
+## CUSTOMER-LOCAL OWNER AND AI SETUP
+
+At the protected local bootstrap, create the Organisation Super Admin using customer-controlled authentication. Establish a customer-held recovery route; invite Admins and Members; delegate supported subtenants/environments; keep commercial contacts distinct from runtime users. Never seed a vendor master account or ship default passwords.
+
+Offer an optional signed **ORVIA Intelligence** pack selection. Validate its signature, provenance, app compatibility and measured runtime prerequisites. Show local inference location, installed model/knowledge versions and disabled training/export. If no released supported model is available, show that limitation and continue with deterministic setup; never fetch an existing external model as a substitute.
+
+The installation wizard is a setup flow, not a fourth customer-facing business portal. The vendor-staff support console is separate internal tooling. Normal users need only the customer workspace address and authorised browser access.
+
 ---
 
 <a id="orvia-section-85"></a>
@@ -3410,6 +3783,81 @@
 Provide supported container/VM/service packages and deployment guides for the licensed profile. Include the console/API/portal, worker/orchestration, local stores, policy service, connectors and optional in-boundary AI components required by that profile. State resource and cloud-service prerequisites rather than implying an installer supports every infrastructure environment.
 
 The installer must verify signed manifests and artifact digests against a trusted release identity before execution; use a bootstrap trust process not dependent solely on an unverified checksum from the same download page. Create unique local administrator/bootstrap credentials, validate network/storage permissions, separate public portal ingress from private administration, and disable sample accounts/debug endpoints. Never execute an unreviewed remote script as an installation shortcut. Local setup must not upload customer records, cloud credentials or runtime secrets to ORVIA.
+
+## SUPPORTED DEPLOYMENT PACKAGES
+
+### A. Standard Server bundle — recommended default
+
+Primary customer download: `ORVIA-<version>-server-linux-<arch>.zip`. The earlier `.tar.gz` server archive remains a possible supported engineering distribution inside or alongside the main bundle; it is not a second product or the canonical customer download.
+
+Provide signed Linux container images with a tested single-server deployment configuration, installation/preflight tooling, manifest, migration instructions, secrets/storage/network configuration, health checks, backup/recovery procedure and licence import.
+
+Docker Compose is suitable for defining a multi-container application and supports production-oriented single-server deployments. Compose by itself is not high availability. A production profile still needs appropriate durable databases/workflow infrastructure, TLS, resource limits, backups, restarts, monitoring and patching. Do not ship a development workflow server as production infrastructure. [T6, T7]
+
+### B. Kubernetes bundle
+
+Primary customer download: `ORVIA-<version>-kubernetes-<arch>.zip`, containing the versioned `orvia-<version>.tgz` Helm chart, pinned image artifacts and deployment values. A chart may also be obtained separately from the ORVIA-managed distribution service for approved automated installations.
+
+Helm charts package Kubernetes resources. A chart does not inherently contain the container images or establish that the resulting deployment is secure, highly available or compatible with every cluster. Include supported Kubernetes/runtime versions, storage/ingress/secret requirements, workload permissions, network policies, migrations and a tested recovery model. [T8]
+
+### C. Complete offline bundle
+
+Primary customer download: `ORVIA-<version>-offline-linux-<arch>.zip`. An all-supported-architecture ZIP can be offered when transfer size permits. Earlier `.tar.gz` offline examples remain subordinate engineering archive formats, not an alternative data-handling model.
+
+Include the exact required images, chart/configuration, verifier, independently bootstrapped trust information, release manifest, licence import, legal/security notes and required connector/rule/model packages or an explicit prerequisite list. An installer that silently pulls dependencies from public registries is not a complete offline installer.
+
+Use a disconnected staging test. Verify install, restart, normal operation, licence renewal import, update, recovery and diagnostics export without hidden network calls. Specify trusted time and key-revocation/update handling for offline operation. Any external dependency must be disclosed rather than described as air-gapped.
+
+### D. Evaluation bundle
+
+Offer the same domain/application services with a synthetic-data profile and a local setup guide. Use an approved container runtime on supported Windows, Mac or Linux development systems. No cloud subscription or production records are needed to evaluate the layout and supported synthetic workflows.
+
+Do not call the evaluation deployment production-ready. Default to local-only binding, disable production connectors, and explain that workflows stop when the host/runtime stops.
+
+### E. Optional native helper and agent packages
+
+Proposed later convenience packages may include signed Windows `.msi`, macOS `.pkg`, and supported Linux packages/archives. Distinguish an **installer/launcher**, a **connector agent** and the **full platform**. A native agent may be necessary for a specific supported local resource or authentication mechanism; it is not necessary on every employee's laptop.
+
+A preconfigured Linux VM appliance can be an additional enterprise distribution format only after a particular hypervisor profile, boot identity, patching and recovery are supported. Do not add every VM format to the first release merely for a larger download page.
+
+**Recommendation:** Make Standard Server the default choice, Kubernetes the existing-cluster choice, Offline the restricted-network choice and Evaluation the laptop choice. These are deployment profiles, not four separate products or editions. Keep the master’s Foundation/Control/Enterprise model unchanged.
+
+## RELEASE-PACKAGE CONTENTS
+
+Example only; not a directory of existing ORVIA build artifacts:
+
+```text
+orvia-release/
+  README.md
+  release-manifest.json
+  signatures/
+  sbom/
+  licence-import-guide.md
+  install/                 # reviewed, signed installation tooling
+  deploy/compose/          # supported server profile
+  deploy/helm/             # supported cluster profile, when included
+  images/                  # actual required images for offline distribution
+  migrations/
+  connectors/
+  orvia-models/            # selected ORVIA-owned model pack; declared resources
+  docs/                    # install, upgrade, security, restore, limitations
+```
+
+ORVIA-owned model packs have explicit entitlement, distribution and hardware requirements. Include the selected signed pack in the customer ZIP or offer it as a separately signed ORVIA vendor download; publish the supported model/runtime matrix. The deterministic platform must operate when local AI is disabled. Under the strict boundary, no automatic external-model fallback is allowed. [M1 §§63–65, 85, 93]
+
+## CANONICAL ONE-FILE DELIVERY DECISION
+
+Use **`ORVIA-<version>-<profile>-<architecture>.zip`** as the primary customer download envelope. A full all-supported-architecture bundle can use `ORVIA-<version>-bundle.zip`; profile-specific ZIPs avoid unnecessary transfer. The product is the same signed release, not a different build/codebase per customer.
+
+This explicitly reconciles the earlier ZIP recommendation with later `.tar.gz` server/offline examples: **ZIP is the main customer-facing format; OCI/container archives, `.tar.gz` engineering exports, and Helm `.tgz` charts are internal or optional advanced deployment artifacts.** Preserve those useful deployment methods without presenting conflicting default file formats.
+
+The ZIP is not a universal native executable. It packages signed Linux service images, approved install/bootstrap tooling, manifests, migrations, docs, the selected Compose/Helm profile and selected ORVIA model/knowledge artifacts. Windows/macOS/Linux users see the same browser UI; supported runtime kernels, CPU architectures, storage and administrators are prerequisites [U2].
+
+To offer literally one customer download, wrap the unchanged signed release and separately signed customer licence in a delivery ZIP. Licence issuance must not modify application binaries or obtain release-signing authority. Renewal can deliver a new licence without redistributing the whole application.
+
+A declared complete/offline bundle contains the actual required images and selected AI/tokenizer/runtime dependencies, not a YAML file that secretly pulls them later. A missing optional model is marked missing/disabled; a missing required offline dependency fails preflight. No customer cloud credential or data record is sent to assemble the bundle.
+
+Safe unpacking must reject path traversal, unexpected absolute paths/symlinks, archive bombs and unlisted executable entries. Verify the manifest, trusted signer, digest, size limits and supported version policy before privileged installation. The verification bootstrap needs an independently established trust identity; a checksum on the same download page is not sufficient. Installer scripts are signed, reviewable entry points, not a remote `curl | shell` execution path.
 
 ---
 
@@ -3451,6 +3899,35 @@
 | Support | Receive only approved business information and schema-limited diagnostics | Execute local diagnostic commands and retain operational evidence locally |
 
 A local deployment still requires safe operation, updates and customer infrastructure controls. It is not a guarantee against compromise by an attacker or an authorised host administrator. The vendor must not shift responsibility for defects in its product to the customer.
+
+## USER DEVICE AND RUNTIME SUPPORT MATRIX
+
+**A browser UI is the cross-platform user experience; a supported Linux runtime is the backend portability strategy.** The following is a recommended support plan, not a tested compatibility claim.
+
+| Environment | Normal user access | Proposed hosting route |
+|---|---|---|
+| Windows workstation | Supported browser to customer workspace | Optional local evaluation through an approved Linux virtualisation/container environment; not default production hosting |
+| macOS workstation | Supported browser to customer workspace | Optional evaluation through a Linux VM/container runtime; choose a validated Intel/Apple-silicon architecture path |
+| Linux workstation | Supported browser to customer workspace | Evaluation locally; an always-on supported server configuration for organisation use |
+| Windows Server infrastructure | Employees browse from their own machines | Provision a supported Linux VM, for example on Hyper-V, then install the Linux ORVIA profile |
+| Linux data-centre server/VM | Supported browser over customer network | Signed container deployment bundle |
+| Customer-controlled cloud VM | Supported browser over approved access | Same Linux container architecture with tested provider-specific storage/network/key integration |
+| Customer Kubernetes cluster | Same browser interface | Signed images and a versioned Helm chart; supported Linux worker nodes |
+| Air-gapped infrastructure | Browser inside the isolated network | Supported host plus complete offline package, licence and trust/update process |
+
+Containers still have operating-system/kernel and architecture requirements. Multi-platform images can supply variants such as `linux/amd64` and `linux/arm64`; this is not one native Windows/macOS/Linux executable. Every shipped dependency and model runtime also needs validation. [T1]
+
+Docker Desktop provides Windows and Mac evaluation routes, with platform prerequisites. It is not supported on Windows Server; Microsoft documents Linux guests on Hyper-V. Docker Desktop also has separate commercial licensing conditions—an ORVIA licence does not automatically include it. [T2, T3, T4, T5]
+
+Publish a release-specific browser/OS/CPU/runtime/dependency matrix. Target maintained Chrome, Edge, Firefox and Safari combinations where applicable, but mark support only after actual testing. Do not claim Safari runs on every operating system. A lightweight desktop shortcut or optional installed web-app shell can open the customer-hosted UI; it does not contain the backend or make disconnected operations safe automatically.
+
+## PACKAGING SUPPORT IS A TESTED RELEASE PROPERTY
+
+Publish separate client-browser, server/runtime and connector matrices. Standard Server targets a supported Linux server/VM using the declared container runtime and Compose profile; Kubernetes uses the same images with a version-pinned supported chart and cluster profile. Compose and Helm support these deployment mechanics, but neither establishes ORVIA high availability or security without configuration and tests [U3, U4].
+
+Docker Desktop's Windows documentation excludes Windows Server hosting; use the supported Linux VM route there, and review third-party runtime licences independently [U5]. Retain future native helpers and VM appliances without promising every host/hypervisor combination at launch.
+
+A training GPU on Lightning is not a GPU supplied to every installed customer. Each ORVIA model release needs measured CPU/GPU, memory, storage, context and concurrency support for customer-local inference. Offer an evaluated CPU-capable model profile or clearly declared customer-local GPU requirements where feasible. If the customer's hardware cannot run the released model, disable the AI capability explicitly rather than changing its data destination.
 
 ---
 
@@ -3526,6 +4003,12 @@
 
 Monitor propagation lag, pending unknown effects, oldest unresolved requests, evidence freshness, inventory staleness, noisy-neighbor saturation and backup/restore reconciliation. Infrastructure uptime alone is not privacy-control reliability.
 
+## VENDOR SUPPORT VISIBILITY IS NOT RUNTIME TELEMETRY
+
+Maintain a vendor-side **Support Attention** view based only on submitted cases, permitted report fields, advisory applicability and vendor service health. Link it to commercial account/licence/random installation references where allowed. Show `NOT_REPORTED`, `CUSTOMER_REPORTED`, `APPROVED_DIAGNOSTIC_RECEIVED`, `STALE_REPORT` or `AWAITING_CUSTOMER`; absence of a report is not proof of a healthy installation.
+
+Customer-local monitoring can be detailed because it stays under the organisation's role controls. The vendor cannot see the same dashboard simply by being Super Admin. Support can correlate identical approved product error codes across received cases without uploading underlying customer events or claiming complete fleet coverage.
+
 ---
 
 <a id="orvia-section-90"></a>
@@ -3642,6 +4125,28 @@
 Support customer-approved rollout windows, offline import, rollback or tested forward recovery, signing-key rotation, revoked-artifact notifications and protection against downgrade to known-unsafe releases. Plan migrations and outage recovery explicitly. A signed update is authenticated software, not proof of vulnerability-free software.
 
 Updates, connector plugins, model packages and rule packs cannot silently broaden egress permissions, enable vendor telemetry, upload backups or add vendor access. Re-run the boundary/security suite on every update. A compromised vendor licence/download account must not automatically authorise software execution or customer data access.
+
+## CUSTOMER UPDATE, RENEWAL, SUPPORT AND OUTAGE EXPERIENCE
+
+| Event | Vendor-side experience | Customer-runtime behaviour |
+|---|---|---|
+| New software release | Eligible signed package, notes, compatibility and advisory | Customer verifies, tests and applies it in an approved window |
+| Licence renewal | New signed entitlement/validity document | Import locally or obtain through the narrowly permitted licensing exchange |
+| Edition change | Commercial change and replacement signed licence | Local entitlement refresh; no migration to another product codebase |
+| Vendor website outage | Purchases/downloads may be temporarily unavailable | Valid local deployment does not require live vendor auth for normal operation |
+| Runtime outage | No automatic vendor view of customer workloads | Customer team uses local health/recovery procedures |
+| Support case | Limited business description and permitted diagnostics | Customer runs local checks; customer records and evidence stay local |
+| Licence expiry | Renewal information | Documented continuity/read-only/handover behaviour; no data wipe or silent relaxation of restrictions |
+
+The exact expiry/continuity terms must be stated in the licence policy. Do not promise indefinite unpaid operation or instant revocation of licences inside a fully disconnected installation. Signed update approval is not a vendor remote-control channel. [M1 §§31, 43, 93–96, 160]
+
+## ORVIA MODEL AND KNOWLEDGE RELEASES
+
+Treat trained weights, tokenizer/configuration, retrieval index schema and knowledge packs as separate versioned release artifacts. Vendor Super Admin/Admin can manage the appropriate review process, but release approval, signing and customer installation remain independently controlled. A training job or support agent cannot publish directly into the trusted customer channel.
+
+All official model/knowledge downloads are delivered through ORVIA's vendor-managed distribution cloud or verified customer mirrors, not direct operational access to Lightning. Include hashes, provenance, evaluation scope, supported app versions, required hardware and change/rollback notes. Customer-local inference needs no Lightning credentials.
+
+Knowledge updates must preserve authoritative source dates and review status. A new model cannot silently enable training from local records, external providers or expanded telemetry. Install/update tests check those conditions before and after every release.
 
 ---
 
@@ -3672,6 +4177,12 @@
 
 Licence payloads may state entitlements, validity and licensed limits only. They cannot contain executable instructions, database queries, arbitrary endpoints or remote support grants. Validate signature, schema, audience and installation binding where applicable. Reject malformed or replayed state changes. Failure or expiry invokes the documented continuity policy (§160), not data destruction, personal-data upload or relaxation of enforced privacy restrictions.
 
+## LICENSING DOES NOT GRANT ADMINISTRATION OR MODEL ACCESS
+
+Commercial account, installation licence and local runtime identity are separate. A licence can enable an AI feature or model package entitlement; it cannot appoint an Organisation Super Admin, change local model/data destinations or carry a support command.
+
+When model entitlements or hardware are unavailable, show the correct capability state and preserve deterministic core operations/continuity. An offline model pack follows the same locally verified licence and approved update policy; no per-question vendor check is required.
+
 ---
 
 <a id="orvia-section-95"></a>
@@ -3717,6 +4228,61 @@
 
 ORVIA staff must not view customer personal data through remote desktops, screen sharing or live terminals under the strict profile: seeing it remotely is still access even without copying a database. The customer executes diagnostic commands. A different managed-access service is not implied by this specification.
 
+## LOCAL-FIRST SUPPORT, THEN MINIMUM-INFORMATION ESCALATION
+
+**Support objective:** identify the correct customer commercial account and supported installation, understand a product fault through bounded diagnostic evidence, reproduce it and deliver a safe fix—without granting vendor access to customer operational records.
+
+### Step 1 — Customer-local detection and assistance
+
+Local health/security checks notify the authorised organisation team. ORVIA Intelligence may explain authorised local context, retrieve a reviewed runbook and propose a diagnostic. It remains read-only by default; a typed diagnostic or repair runs only after deterministic permission/scope checks and the required customer approval. Critical conditions alert humans immediately and need not wait for the assistant.
+
+### Step 2 — Prepare a permitted support report locally
+
+A deterministic exporter constructs a fixed-schema report. The local mapping to incidents/workflows/evidence remains local. The customer previews the exact outbound fields, recipient, purpose and retention policy and approves delivery. No AI free-form summary, arbitrary log attachment, screen capture or raw chat transcript is automatically exported. Filtering/redaction alone is not sufficient to waive the forbidden-field list in §31.
+
+Illustrative allowed schema (not an implemented API or new permission to collect every field):
+
+```json
+{
+  "schema_version": 1,
+  "vendor_case_id": "case_example",
+  "license_id": "lic_example",
+  "installation_id": "random_installation_reference",
+  "product_version": "release_example",
+  "component": "connector_runtime",
+  "component_version": "release_example",
+  "issue_code": "SUPPORTED_ERROR_ENUM",
+  "customer_urgency": "HIGH",
+  "diagnostic_checks": [
+    {"check_id": "public_runbook_check_01", "result": "FAILED"}
+  ]
+}
+```
+
+The case/installation identifiers are random commercial support references, never local principal/workflow references. Enumerated component/error/check names must come from a reviewed public product taxonomy, not customer system names. Unknown fields, oversized values, secrets or forbidden content block transmission. The vendor ingress must likewise validate without retaining rejected bodies in logs. A field may be omitted when unnecessary.
+
+### Step 3 — Vendor support works within assigned access
+
+Vendor Admin/Support Specialist sees only assigned permitted cases; Vendor Super Admin governs assignment/escalation and restricted commercial access. The support team can request a catalogued safe diagnostic, inspect the approved result, reproduce using synthetic fixtures, propose instructions, and route a product defect for engineering/security review. It cannot browse the customer's database, log in as the local owner, fetch production evidence or run arbitrary commands.
+
+A proposed diagnostic/repair identifies its public runbook/version, intended effect, allowed parameters, required capability, resource/operation budget, compatibility, expiry and approval need. The customer initiates its download/import. The local service validates it against supported catalogued operations and current permissions. It is **not a vendor-origin remote command channel**; no web terminal, arbitrary shell/SQL or unchecked automatic execution is introduced.
+
+### Step 4 — Apply and verify locally
+
+Provide a reviewed runbook or signed tested patch through official ORVIA distribution. Customer IT approves and applies it using the existing update/plan process. Local verification establishes whether the fault and any affected controls actually recovered. An optional permitted result acknowledgement closes the vendor case; it does not export underlying privacy evidence or override local unresolved outcomes.
+
+### Optional proactive support notification
+
+Off by default. A customer Organisation Super Admin may enable a supported **minimal support-signal** rule after viewing its fixed schema, sample output, category, cadence, destination and retention. This is a deliberately documented expansion from per-report approval to customer-approved standing rules for those exact fields only—not permission for continuous operational telemetry. Provide revocation, rate limits and a local audit; rules cannot be broadened by the AI or an update.
+
+Use only approved product/component version, error/severity enums and random support/installation references. Exclude operational identifiers, records, member directories, hostnames, system maps, workload counts and free-form text. Every message must pass the same deterministic local validator. Material not covered by the standing rule requires fresh local preview/approval. Fully isolated customers use manual transfer; a vendor cannot know an unreported issue inside a disconnected environment.
+
+### No silent managed-access exception
+
+Support authority is not customer-runtime authority. Under the current promise, vendor staff have no standing or incident-created production account, impersonation token, remote desktop, shell, database access or decryption key. A customer sharing a screen containing client records is still disclosure. A future managed-access service would be a separate explicit product/data-handling decision and cannot be implied by the Vendor Super Admin title.
+
+Synthetic vendor test environments can be fully administered by the vendor because they contain vendor-created fictional fixtures, not customer operational copies. Do not describe that test access as access to the customer's production installation.
+
 ---
 
 <a id="orvia-section-96"></a>
@@ -3732,6 +4298,25 @@
 - request additional diagnostics
 
 Support has no vendor-accessible production-data account, remote shell or hidden support tunnel under `CUSTOMER_LOCAL`. Customer-controlled support roles in the runtime belong to authorised customer personnel; ORVIA staff operate the separate business support portal only.
+
+## VENDOR ADMINISTRATION AND SUPPORT CONSOLE
+
+The vendor console is a separate authenticated application for ORVIA staff. The customer's ORVIA Account exposes only that customer's own commercial/support records. Neither application is the customer-local Workspace.
+
+| Console area | Vendor capability | Required limit |
+|---|---|---|
+| Accounts and licence assignments | Identify the purchasing business, authorised contacts and permitted installation references | No customer operational user directory, system inventory or discovered client information |
+| Support Attention queue | Route submitted/approved reports, urgency, owner and last customer update | No invented live health or assumed visibility into offline deployments |
+| Case detail | View allowed fields, public runbook steps, replies and synthetic reproduction | Assigned case access; strict report schema and no customer-record attachments |
+| Engineering defect link | Link cases to an internally reproduced product defect, supported versions and candidate fix | Link via vendor defect/case IDs; do not import local workflows or evidence |
+| Advisories and release records | Publish approved guidance, signed packages and model/knowledge release information | Separation of review/signing duties; customer approval still needed to install |
+| Staff administration and audit | Role grants, case scope, access reviews and staff actions | MFA, least privilege, independent approval for high-impact elevation and no runtime bypass |
+
+Vendor case states: `RECEIVED → TRIAGED → NEEDS_CUSTOMER_DIAGNOSTIC / REPRODUCING → FIX_OR_GUIDANCE_READY → AWAITING_CUSTOMER_VALIDATION → RESOLVED / REOPENED`. Track customer-local case states separately. A vendor cannot mark a privacy control verified by closing its support ticket.
+
+No customer should see another customer's support case or commercial records. Vendor Admins must not enumerate unassigned cases; authorised cross-case engineering review uses only approved minimal fields. Business support messages also require minimisation, access and retention. Maintain a quarantine/deletion workflow for accidental forbidden submissions rather than accepting them as normal support material.
+
+The console may host a vendor-local copy of the ORVIA model for searching vendor-authored documentation and synthetic reproductions. Keep it separate from customer instances and the training environment; do not train it on tickets or route customer runtime chats into it. Human support is responsible for the response and release decision.
 
 ---
 
@@ -3908,6 +4493,40 @@
 
 Use plain-language distinctions: “request received,” “action sent,” “vendor acknowledged,” “observed in connected system,” “manual confirmation,” “not verified.” Color is supplementary, not the sole status cue. Show accessibility-ready keyboard interactions, screen-reader labels, readable contrast, locale-aware dates and explicit timezone display. Test with representative language and low-bandwidth journeys.
 
+## CUSTOMER WORKSPACE EXPERIENCE
+
+Use a consistent header showing organisation, environment, signed-in role, current operating mode and product version. Display “Customer-hosted” as a deployment description, not a blanket assurance that every setting has been independently verified.
+
+Retain the original navigation: **Dashboard, Privacy Graph, Purposes, Policies, Consent, Privacy Requests, Retention, Systems, Processors, Controls, Testing, Incidents, Evidence, Reports, Integrations and Settings.** Group it visually where useful, without removing modules. [M1 §§102–108]
+
+| Area | Operational experience |
+|---|---|
+| Dashboard | Pending approvals, failed and unverified actions, connector state, tests and incident/request activity from actual local records |
+| Graph and governance | Follow purpose → data → system → processor → policy → control → evidence; review notices and policy versions |
+| Requests and workflows | Verify identity, inspect scope, review a plan, approve eligible actions, monitor each destination and deliver a scoped response |
+| Integrations and controls | Configure credentials locally, inspect capabilities/limitations, preview actions and operate supported control points |
+| Testing | Review expected versus actual behaviour, affected boundary, exact build, timestamp and evidence |
+| Evidence and reports | Inspect authorised records and generate locally controlled exports |
+| System settings | Customer users/roles, identity, certificates, storage, backup, keys, licence, updates, egress and in-boundary AI |
+
+**Recommended landing views:** a privacy officer sees deadlines and unresolved outcomes; an engineer sees connector/control changes and regressions; an auditor sees read-only evidence; an IT administrator sees deployment health and maintenance. Server-side authorisation controls access—not hidden menu items alone. [M1 §§6–7, 103]
+
+### A request detail screen
+
+A request should show its subject reference only to authorised users; received time; identity/authority state; purposes; scope; policy version; approvals; per-target execution and verification; unresolved manual tasks; evidence; and next accountable action. Preserve these distinctions:
+
+`Received → Planned → Attempted → Acknowledged → Observed/Verified`
+
+These are related records/states, not an unconditional ladder every connector can climb. Unknown, failed, stale and outside-coverage outcomes remain visible. Do not mark the entire request verified because one destination succeeded. [M1 §§22–26, 44–49, 106]
+
+### Local data-boundary page
+
+Add a customer-local **Settings → Data Boundary** page. Show configured runtime/storage/backup destinations, allowed external destinations, enabled diagnostics, model endpoint, last boundary-test evidence, tested build and observed exchanges within the monitored scope.
+
+Keep **configured**, **observed**, **last tested**, **stale** and **not tested** separate. A configuration stating “vendor egress blocked” is not itself a completed network-security test. Local outbound observability must not become vendor telemetry.
+
+The browser is part of the access boundary: authorised users see data on their devices. Exports, clipboard use, caches and downloaded evidence need endpoint controls. Customer-controlled storage does not mean that no authorised response ever reaches a browser. [M1 §§31, 88, 102, 162]
+
 ---
 
 <a id="orvia-section-103"></a>
@@ -3941,6 +4560,12 @@
 ## USER EXPERIENCE, ACCESSIBILITY AND TRUST
 
 **Proposal:** Keep the original navigation and add role-oriented landing views rather than more disconnected top-level pages. The privacy officer sees obligations, deadlines and unresolved outcomes; engineering sees control changes, connector health and regression failures; auditors see evidence and limitations.
+
+## NAVIGATION BY TRUST DOMAIN
+
+Retain every customer operational module above. Grouping for usability does not remove a module or bypass its permissions. Organisation Super Admin/Admin sees **Members & Roles**, **Environments/Subtenants**, **Systems**, **Local Health**, **Support**, **ORVIA Intelligence**, **Data Boundary**, **Licences** and **Updates** within authorised settings.
+
+ORVIA Account uses commercial navigation: Account Overview, Licences, Downloads, Billing, Commercial Members, Updates & Security, Support, and Guides. Vendor staff use the separate Administration and Support Console in §96. A Data Principal sees the customer-branded Privacy Centre, not either administrative menu. Product-level UI labels should always identify the current domain and role.
 
 ---
 
@@ -4138,6 +4763,14 @@
 
 For every control, record the threat, owner, implementation/build, applicable deployment, test method, result, date, limitations and unresolved findings. Security covers the vendor website/payment/download/signing systems **and** the customer runtime; the new local-data architecture does not remove supply-chain or insider threats.
 
+## ADMINISTRATION AND SUPPORT ATTACK SURFACES
+
+Extend the threat model to vendor-staff compromise, malicious support replies, poisoned diagnostic packages, role delegation, customer-owner recovery, subtenant escape, training-workspace compromise and model/update poisoning. A compromised commercial account or Vendor Admin must not directly control a customer installation.
+
+Enforce privileged MFA and auditable least-privilege role grants on both independent domains. Security controls outside the model validate every proposed diagnostic/repair. Customer-approved signed software remains a supply-chain trust decision, not a proof that vendor-origin code cannot be harmful; maintain independent review, egress restrictions and customer rollback/recovery.
+
+No absolute claim of breach immunity or zero unknown vulnerabilities is created by self-hosting, role hierarchy, signed software or a custom model.
+
 ---
 
 <a id="orvia-section-110"></a>
@@ -4218,6 +4851,14 @@
 
 The local model, retrieval index and tool broker remain subject to the same permissions as non-AI services. Test attempted egress through model tools, prompts, plugins, error reporting and external-provider fallback. A model may not change the deployment data boundary, approve its own actions, grant a support account or retrieve secrets. Two coding AIs reviewing each other do not substitute for independent security assessment of a production release.
 
+## OWN-MODEL PROVENANCE, PRIVACY AND QUALITY GATES
+
+For each model release, test from-scratch lineage; unapproved third-party weights/adapters/tokenizers; corpus provenance; train/test leakage; prompt and knowledge poisoning; role/subtenant retrieval isolation; secret exposure; safe answer rendering; arbitrary tool suggestions; support-export injection; hidden model downloads; and attempted runtime calls to Lightning/vendor/external inference.
+
+A self-trained model can still generate incorrect or unsafe output. Apply the same runtime constraints, independent review and evidence rules as for any AI component. OWASP's prompt-injection and excessive-agency guidance informs the threat model, not a claim that the risks are eliminated [U9].
+
+Model evaluation, privacy/security testing and deployment compatibility are separate gates. A low training loss does not establish useful support answers; high benchmark accuracy does not establish no data egress; training on a GPU does not establish customer CPU performance. Store the exact assessed artifacts, scripts, fixtures and results. All acceptance scenarios in §217 begin NOT_RUN until actually executed.
+
 ---
 
 <a id="orvia-section-113"></a>
@@ -4249,6 +4890,12 @@
 ## AI COPILOT: USEFUL, CONSTRAINED AND EVALUATED
 
 Use structured outputs and a bounded tool broker. No unrestricted SQL, shell, filesystem, secrets access or arbitrary connector calls. A generated policy remains a draft. A generated workflow is checked against permissions, permitted actions, plan budgets and known capabilities before review.
+
+## SUPPORT TOOL CONTRACT
+
+Add bounded customer-local tools such as `searchRunbooks()`, `getAllowedLocalHealth()`, `proposeDiagnosticCheck()` and `prepareSupportDraft()`. Each tool uses the requesting actor's scope, not a hidden super-admin identity. Diagnostic suggestions reference allowlisted, versioned operations; they do not execute free-form scripts.
+
+`prepareSupportDraft()` creates a local draft. Only the deterministic schema exporter plus the required customer approval/standing rule can transmit permitted fields. The model cannot call a general-purpose upload endpoint, attach a conversation/log, create an unrestricted support tunnel or grant vendor access. A signed vendor recommendation does not skip local validation or approval.
 
 ---
 
@@ -4361,6 +5008,29 @@
 
 ```
 
+## DEPLOYMENT SEPARATION WITH SHARED DESIGN SOURCE
+
+A possible source organisation is:
+
+```text
+apps/
+  vendor-account/        # customer-facing commercial account
+  vendor-admin/          # vendor staff administration and support console
+  customer-console/     # customer-hosted operations UI
+  principal-portal/     # customer-hosted client privacy UI
+  customer-api/
+  worker/
+  connector-agent/
+packages/
+  ui/                    # shared SOURCE, compiled into each released application
+  contracts/
+  domain/
+```
+
+Vendor commerce and customer runtime must not share operational databases, session stores, signing authority or administrative credentials. Share reviewed code where appropriate—not live customer state.
+
+Serve the runtime's HTML, JavaScript, fonts and other required assets from the customer deployment. Do not render the operational UI from the vendor site and quietly query a private backend, embed the workspace inside the vendor page or add vendor analytics. Restrict browser connections and isolate the public portal's privileges as part of the supported deployment. The UI should remain available when vendor internet access is blocked.
+
 ---
 
 <a id="orvia-section-117"></a>
@@ -4655,6 +5325,14 @@
 The groups total 20 unique people. Every cross-cutting capability has one accountable primary owner and at least one trained reviewer/backup. Security and QA are embedded in design and implementation rather than added only at release.
 
 Assign a single outcome lead for the marketing-withdrawal slice, even though several groups contribute. Engineers implementing connectors must participate in customer discovery and support triage; otherwise commercial promises can drift away from integration reality.
+
+## ADDITIONAL OWNERSHIP WITHIN THE EXISTING TEAM
+
+Retain all 20 roles. Developer 12 owns the ORVIA corpus/tokenizer/model-training pipeline, evaluation lineage and candidate model artifacts; Developer 13 owns grounded local assistance, knowledge packs and support/AI workflows. Developer 15 owns the independent vendor/customer role domains, delegated subtenants and recovery. Developers 9–11 own the separate Account, vendor-staff console, Workspace and Privacy Centre experiences.
+
+Developers 16 and 20 own signed platform/model delivery, offline packaging and controlled updates; Developer 14 owns support/training/supply-chain threat modelling; Developers 17–19 own local observability, model runtime benchmarks and negative tests. The architecture lead approves cross-domain contracts. Legal/content reviewers approve source interpretations and training-data reuse; product leadership approves compute spend and supported claims.
+
+A job title is not proof that all this capacity is staffed. Document actual owners and do not assume the prototype's two coding subscriptions include GPU budget, legal review, independent security assessment or ongoing support staffing.
 
 ---
 
@@ -4871,6 +5549,12 @@
 
 Enterprise customer environments are separate deployments.
 
+## MODEL DEVELOPMENT IS A SEPARATE NON-CUSTOMER ENVIRONMENT
+
+Separate vendor software development, Lightning model training/evaluation, vendor staging/commerce/support and customer runtime environments. Training uses approved corpus snapshots and fictional fixtures only. Customer staging/production data, local prompt logs, support attachments and cloud credentials are never copied into Lightning or vendor test environments.
+
+Use explicit data classifications, source manifests, isolated credentials, restricted artifact publication and production-release gates. Development coding assistants may help prepare reviewed code and non-sensitive specifications, but they are not ORVIA runtime providers or an unapproved teacher/data-generation pipeline.
+
 ---
 
 <a id="orvia-section-123"></a>
@@ -4911,6 +5595,12 @@
 Run secret detection, static analysis, dependency/SBOM checks, container and infrastructure scans, API/browser adversarial tests, tenant-isolation tests and data-egress regression on the candidate build. Record tool versions, scopes, exclusions and results. Missing or failed required checks block release; an unavailable scanner does not become a pass.
 
 Review scanner findings for affected version, reachability and impact. Preserve adjudication and independent review; do not silently delete or downgrade findings to clear a gate. Final signing/promotion requires the release owner’s and security owner’s approval, with no licence/checkout administrator able to bypass those controls.
+
+## PARALLEL MODEL RELEASE PIPELINE
+
+Use a separately reviewed model pipeline: approved corpus manifest → leakage/dedup/source checks → tokenizer and random-initialisation provenance → bounded training → held-out evaluations → adversarial/privacy checks → runtime packaging/benchmark → independent review → signed model/knowledge manifest → vendor distribution → customer-authorised import.
+
+The production product pipeline consumes only an approved model artifact digest. A training run, notebook or vendor support ticket cannot directly publish to customers. Re-run compatibility and data-boundary tests when model, inference engine, tokenizer, knowledge or tool schemas change.
 
 ---
 
@@ -5159,6 +5849,12 @@
 
 The runtime retention rules above execute in the customer environment. Vendor retention applies only to the permitted business/licensing/service records in §31, with a documented deletion schedule and any specifically justified retention obligations. A support, analytics or commercial database is not an alternative repository for customer workflows or evidence.
 
+## MODEL, KNOWLEDGE AND SUPPORT RETENTION LOCATIONS
+
+Vendor training corpora/checkpoints and approved experiment logs have a vendor engineering retention policy; none may contain customer-derived data. Customer runtime prompts, local retrieval indexes, support drafts and inference caches have customer-local retention. Vendor submitted support cases retain only approved minimal fields under their separate policy.
+
+Deleting a local conversation should remove its retained payload/index/cache according to the documented local rules, without any need to contact a model-training service. No automatic support-history-to-training pipeline is permitted. Corrected public sources and removed corpus items trigger a documented impact review for knowledge packs and any affected model release; do not claim weights forget a training item merely because a source file is deleted.
+
 ---
 
 <a id="orvia-section-133"></a>
@@ -5642,6 +6338,12 @@
 
 Mobile SDKs can be added later.
 
+## ONE BROWSER EXPERIENCE, NOT ONE UNIVERSAL EXECUTABLE
+
+Use the same customer-hosted web Workspace from supported Windows, macOS and Linux browsers. Server installation belongs to customer IT; ordinary employees need no container engine or ORVIA database on their device. The separate customer-branded Privacy Centre is responsive and accessible for its users.
+
+A later browser shortcut/installable web-app shell is an optional launcher for the same customer-hosted backend, not a complete local server or assurance of offline processing. Do not cache sensitive principal records, evidence or access packages for unrestricted disconnected access. Runtime assets and any browser-side state remain subject to the customer boundary and endpoint policy. Native helper/agent packages, where justified, remain separate from the full platform.
+
 ---
 
 <a id="orvia-section-155"></a>
@@ -5724,6 +6426,14 @@
 
 ```
 
+## CUSTOMER-LOCAL ADMINISTRATION PANELS
+
+Organisation Super Admin configures organisation identity, scoped environments/subtenants, role delegation, local recovery and supported installation policy. Organisation Admin manages assigned members/systems and approved operations. Members get only explicitly delegated tasks and views. Preserve specialised officer, security, engineer and auditor permissions; do not use a single broad admin flag.
+
+Add **Members & Roles**, **Environments/Subtenants**, **Local Health**, **Data Boundary**, **ORVIA Intelligence**, **Knowledge Packs**, **Local Support**, **Licence Import** and **Updates** within the existing settings organisation. Show current model/knowledge/app versions, inference location, tested hardware, AI enabled/unavailable status, disabled learning, and supported functions. Show exactly which optional support-signal rules are enabled, their fields, last transmission and revocation controls.
+
+Administrative visibility is limited to necessary authorised product activity. It must not create vendor visibility into staff, systems or client records. Distinguish customer group administration from vendor commercial-account management.
+
 ---
 
 <a id="orvia-section-159"></a>
@@ -5862,6 +6572,12 @@
 Other findings require an accountable owner, scoped impact, compensating controls where applicable, a remediation deadline and expiry of any approved exception. Such exceptions remain visible in the release record and relevant customer disclosures. Passing gates means no unresolved blocking findings **within the recorded assessment scope at that time**; it does not establish zero unknown vulnerabilities.
 
 The release record must identify build/digest, supported deployment profiles, threat-model review, control/test results, SBOM/scans, independent review/retest, data-egress results, backup/restore tests, known limitations and security/release sign-off. Internal synthetic prototypes must be labelled non-production and cannot use a release checklist to claim independent assurance they have not obtained.
+
+## ADDITIONAL RELEASE GATES FOR DELIVERY, ADMINISTRATION AND OWN AI
+
+Do not release this feature set without executed evidence for: separate vendor/customer login and recovery; no vendor super-admin override; member/subtenant isolation; signed package/model verification; correct unsupported-platform rejection; local UI and inference with vendor/Lightning routes blocked; permitted-only support reports; no support-command bypass; and model corpus/origin/evaluation checks.
+
+An own-model checkpoint must not be labelled a released trained assistant until its declared functions and languages pass approved quality/safety tests. Platform release and AI research can progress separately, with the AI state truthful. Existing critical/high/security blockers and independent review remain unchanged.
 
 ---
 
@@ -6013,6 +6729,12 @@
 
 A regulatory release must have an immutable identifier, source digest, official source location, publication date, provision-level effective-date expression, reviewed calendar date, reviewer and approval. Retain historic versions. Compare proposed updates against active customers, generate a change-impact plan, run fixtures and require approval before activation. Never retroactively rewrite the rule version attached to an old evaluation.
 
+## LEGAL KNOWLEDGE FOR ORVIA INTELLIGENCE
+
+The assistant retrieves a locally installed, reviewed source/interpretation pack carrying publication dates, provision-level effective dates, applicability and review status. Model memory is not the authority for a legal answer. Display missing/stale/conflicting sources and require the existing legal-review workflow where needed.
+
+A model trained from public legal material is not thereby authorised to make legal determinations or certify customer compliance. Knowledge-pack updates and legal interpretation remain independently reviewed and versioned; historical decisions continue to resolve their original sources.
+
 ---
 
 <a id="orvia-section-168"></a>
@@ -6040,6 +6762,12 @@
 Do not claim “no vulnerabilities,” “100% secure,” “unhackable,” “cannot be breached,” guaranteed legal compliance, or certification/audit status not actually obtained. A penetration test establishes scoped findings at a time, not the impossibility of an undiscovered flaw. “Nothing leaves the organisation” must not be used where an external provider is actually receiving personal data, even with the customer’s approval. “ORVIA never processes personal data” is also inaccurate if business account contacts or connection metadata are processed (§31).
 
 The product may state the goal of high security; customer-facing assurances must identify implemented controls, assessment evidence, remaining limitations and responsibilities. [S1; S2]
+
+## ACCURATE CLAIMS ABOUT OWN AI, SUPPORT AND DOWNLOADS
+
+Use “ORVIA-owned model trained from scratch on approved non-customer material” only when recorded lineage supports it. Do not call a fine-tuned third-party model original from-scratch training. Do not claim that an AI is infallible, that domain training guarantees it never answers outside scope, or that local hosting removes all security risks.
+
+“Vendor-managed support” means the permitted support capabilities in §§95–96, not invisible access to customer production. “One download format” means the documented bundle envelope, not no prerequisites or a native executable for every OS. Describe every support/model/deployment profile by its actual tested scope.
 
 ---
 
@@ -6488,6 +7216,12 @@
 The user’s current product decision is no longer open: website subscription/licence purchase → signed full-product download → customer-controlled execution, with no vendor receipt of customer operational data. Record this as the governing deployment ADR. Earlier hosted alternatives remain documented but disabled (§86).
 
 Implementation ADRs must resolve the minimum vendor schema, offline licence protocol, package trust/bootstrap/rotation, local key custody, outbound broker/firewall policy, local AI prerequisites, no-production-data support workflow and independently reviewable security release gates. These decisions cannot reduce the mandatory boundary to make implementation easier.
+
+## NEW CONSOLIDATED DECISIONS
+
+Record the adopted decisions as traceable ADRs: **D-01** primary ZIP envelope with signed OCI images and supported profile artifacts; **D-02** three customer-facing experiences plus a separate vendor-staff console; **D-03** independent vendor/customer role and recovery domains; **D-04** bounded support reports and local execution, with optional explicitly approved minimal signals; **D-05** ORVIA-owned from-scratch model with no customer training data; **D-06** Lightning as vendor training infrastructure only; **D-07** local inference plus signed versioned knowledge and independent safety controls.
+
+Changing any of these needs an explicit decision record, affected-section update, privacy/security impact review and tests. In particular, pretrained-weight adoption or vendor production access is not an implementation convenience that can be selected silently.
 
 ---
 
@@ -6749,6 +7483,12 @@
 ## METRIC LOCATION
 
 Vendor business metrics may use the permitted account/subscription/support information. Customer product/privacy-control metrics and engineering telemetry derived from customer workloads remain local and are not silently exported for ORVIA analytics. Measure product improvement using synthetic environments or separately volunteered, non-operational feedback consistent with §31; aggregated counts are not automatically exempt from the boundary.
+
+## SUPPORT AND AI QUALITY MEASUREMENT WITHOUT CUSTOMER TELEMETRY
+
+Measure corpus quality, training costs, held-out answer accuracy, unsafe suggestions, abstention, grounding and latency in vendor-controlled synthetic/approved-public evaluation environments. Those results do not establish live production success rates across unobserved customers.
+
+Vendor support measures case response/reproduction/fix/validation time from permitted case records. Local assistant effectiveness and detailed runtime outcomes remain customer-local; do not secretly export them as “AI improvement” telemetry. Do not set a support-deflection target that blocks escalation or encourages the assistant to falsely close cases.
 
 ---
 
@@ -6954,6 +7694,14 @@
 
 ```
 
+## AUTHORITY AND AI LOCATION SUMMARY
+
+The vendor cloud hosts ORVIA Account, the separate Vendor Administration and Support Console, commerce/licensing and signed distribution. Vendor Super Admin/Admin govern those services. Lightning hosts authorised non-customer model-development jobs only and has no customer-runtime relationship.
+
+Each customer hosts ORVIA Workspace, its Privacy Centre, Organisation Super Admin/Admin/Member roles, any supported subtenants, operational services and the approved local ORVIA model. The same signed model may be installed for different customers, but their inference contexts, data stores, role bindings and caches remain separate. No cross-customer model memory or training feedback is introduced.
+
+Software/model/knowledge artifacts flow from vendor distribution to the customer by approved download. Only explicitly permitted commercial/licence/support information can flow back; operational or personal information cannot. Offline import preserves that direction without requiring runtime callbacks.
+
 ---
 
 <a id="orvia-section-203"></a>
@@ -6973,6 +7721,28 @@
 The customer's internal systems are reached through secure customer-side connectors.
 
 The complete licensed platform must be packaged for supported customer-controlled deployments, using containers or supported service/VM packages. Operational customer data stays in that deployment; privacy and security obligations apply across Foundation, Control and Enterprise.
+
+## BROWSER-BASED PRODUCT, CUSTOMER-HOSTED RUNTIME
+
+**Distribute ORVIA as customer-hosted server software with a browser interface. Package its services as signed Linux container images, with deployment bundles for supported server and Kubernetes environments.**
+
+An IT administrator installs the full licensed platform once per approved environment. Ordinary users access it in a supported browser on Windows, macOS or Linux. They do not each install a database, workflow engine or full copy of ORVIA. Keep the same product design and domain model across deployment profiles and editions.
+
+The key distinction is:
+
+| Layer | What it means | Proposed treatment |
+|---|---|---|
+| User device | Where a person sees the interface | A supported browser; no full-product installation required |
+| Runtime host | Where the application, workers and data stores operate | Customer-controlled Linux server/VM or supported Linux-node Kubernetes deployment |
+| Connected system | Where existing customer applications and records reside | Supported API/database integrations, with a scoped local agent only when needed |
+
+A Windows-based CRM does not require a Windows version of ORVIA's whole backend. Compatibility depends on the connector, API, authentication and permissions. Conversely, a browser that renders the console does not establish that every connected system is supported. [M0 §§27–29, 102, 154; M1 §§85–86, 203]
+
+## OFFICIAL SOURCE AND SUPPORTED FILE FORMAT
+
+ORVIA's website and vendor-controlled distribution cloud remain the official source of the complete licensed software, signed licence, supported connector packages, ORVIA Intelligence model/knowledge packs and updates. Customer-hosted execution does not turn ORVIA into a customer-built product or transfer distribution responsibility to Lightning.
+
+Use the §85 primary ZIP envelope for selected Server/Kubernetes/Offline/Evaluation artifacts, with separately signed licences and optional model packs where needed. Supported private-registry mirrors and engineering archives preserve the original vendor signatures/digests. Three editions, one product and consistent browser experiences remain intact.
 
 ---
 
@@ -7029,6 +7799,14 @@
 Test
 
 ```
+
+## THE ORVIA-OWNED MODEL DECISION
+
+Use approved ORVIA Intelligence weights trained from scratch on reviewed non-customer public/licensed knowledge and ORVIA-authored synthetic/product material. Lightning AI may supply authorised development GPUs; customer-local inference does not use Lightning, vendor-hosted inference or third-party model APIs.
+
+The model explains, suggests, drafts and assists troubleshooting before optional vendor escalation. Reviewed local knowledge provides current source context; deterministic services enforce permissions, support-export schemas, approvals, actions and verification. Customer data is never used for model training, including conversational learning or federated updates.
+
+Model origin, released capabilities, measured runtime requirements and legal/source limitations must be disclosed accurately. A corpus plan, available GPU or software mockup does not establish a trained production model.
 
 ---
 
@@ -7143,6 +7921,12 @@
 > **A production-grade, multi-tenant, website-distributed and customer-hosted DPDPA Privacy Control Platform with a customer-side secure connector architecture, a common Privacy Control Graph, policy-driven privacy execution, consent and rights management, runtime controls, verified evidence, privacy regression testing, privacy incident analysis, AI assistance, three commercial editions, enterprise deployment capabilities, licensing, secure support, observability and continuous extensibility.**
 
 The platform must be modular, secure, testable, observable and upgradeable, with the complete operational runtime inside the customer boundary. ORVIA vendor infrastructure must not become a recipient or repository of customer operational/personal data. Only the minimum information explicitly allowed by §31 may reach vendor services. Apply the security assurance and release gates in §§109, 163–164 and 206.
+
+## DELIVERY, ADMINISTRATION AND OWN-MODEL COMPLETENESS
+
+Completion includes the full vendor-distributed/customer-hosted delivery path, three customer-facing experiences, the separate vendor-staff support console, scoped vendor and customer role domains, safe diagnostics and signed maintenance, and the evaluated customer-local ORVIA Intelligence capability where claimed. Preserve the original platform modules and edition scope.
+
+No product-level dependency may quietly reintroduce customer-data uploads, vendor super-admin access to runtime records, external pretrained inference, customer-data training or a Lightning runtime dependency. Treat unbuilt or untested capabilities as such, not as implied completion of the master.
 
 ---
 
@@ -7249,6 +8033,24 @@
 >
 > Store executed security and egress test results for the exact build. Do not describe a design, a passed scanner or an AI review as proof that the software has no vulnerabilities.
 
+## DELIVERY, ROLE, SUPPORT AND CUSTOM-MODEL INSTRUCTIONS
+
+> Preserve all existing modules and section requirements. Implement the official vendor cloud as publisher/commerce/support, not as the customer's operational data plane.
+>
+> Use the canonical ZIP release envelope and the tested server/cluster/offline profiles. Keep customer UI assets and APIs in the customer environment. Browser support is not universal runtime support.
+>
+> Implement Vendor Super Admin/Admin separately from Organisation Super Admin/Admin/Member. Map Organisation Owner compatibly; retain specialised roles. A tenant is a scope, not a person. Never implement a vendor-global customer impersonation or owner-reset bypass.
+>
+> Give support access to assigned permitted cases and bounded diagnostics. Keep raw records, local identifiers, chat transcripts, logs and secrets inside the customer environment. Local AI suggestions and signed vendor runbooks are not execution authority.
+>
+> Train ORVIA-owned learned weights from random initialisation on approved non-customer material, using authorised Lightning training resources only. Do not import a third-party pretrained checkpoint, adapter, embedding model or teacher-model training corpus without an explicit changed product decision.
+>
+> Separate training from local inference. Do not learn from customer prompts, support tickets, records, feedback or gradients. Do not call Lightning or an external model from the customer runtime.
+>
+> Ground answers in versioned local sources and minimise authorised context. Validate every tool and outbound field outside the model. Preserve deterministic operation, honest unknown states, direct support and independent review.
+>
+> Release software and model artifacts only with actual compatibility, quality, security, privacy and provenance evidence. Do not claim these tests or training have run merely because this specification includes them.
+
 ---
 
 <a id="orvia-section-212"></a>
@@ -7308,6 +8110,12 @@
 Prioritize this extension only after core consent, connectors and assurance are repeatable. Use the same graph, policy, evidence and testing infrastructure rather than a second product.
 
 **Acceptance:** A forbidden record cannot enter the configured retrieval context after an accepted restriction; uninstrumented model applications remain outside coverage.
+
+## CUSTOMER AI GOVERNANCE IS NOT ORVIA MODEL TRAINING
+
+This retained extension governs a customer's separately configured AI applications. It does not authorise training ORVIA Intelligence on customer material, importing third-party learned weights into ORVIA Intelligence, or using an external provider to answer ORVIA assistant questions. The assistant's current ownership, corpus and local-inference rules remain §§63–65.
+
+Any external system being governed must have an explicit supported boundary and cannot be enabled under a promise of no external processing. Discovery or governance access is not permission to copy that system's datasets or conversations into ORVIA vendor training infrastructure.
 
 ---
 
@@ -7422,6 +8230,80 @@
 
 Record build/digest, deployment profile, test scope, command/method, expected/actual outcome, timestamp, reviewer and local evidence reference. Independent assessment and representative production configuration testing remain separate from these synthetic acceptance scenarios.
 
+## INTERFACE AND DEPLOYMENT ACCEPTANCE MATRIX
+
+These are proposed tests, not executed results.
+
+| ID | Test | Expected result |
+|---|---|---|
+| UX-01 | Windows, macOS and Linux users open the same supported deployment | Consistent permitted workflow and accessible layout in the tested browser matrix |
+| UX-02 | Buyer downloads from a Windows browser for a Linux host | Wizard permits the correct target package; browser OS does not choose the server silently |
+| UX-03 | Vendor account holder tries runtime access | Denied without separately authorised customer identity |
+| UX-04 | Data Principal requests another principal's record | Denied before disclosure |
+| UX-05 | Runtime loads with vendor endpoints blocked | UI assets and core functionality remain local; declared optional features fail explicitly |
+| UX-06 | Inspect vendor logs after a synthetic privacy workflow | No principal, workflow, evidence, inventory or operational payload |
+| UX-07 | View downloaded release on vendor dashboard | Shows download information, not invented installation/health status |
+| UX-08 | Upload diagnostic containing a forbidden field | Local validation blocks upload; no unfiltered fallback |
+| UX-09 | Public principal portal attempts admin/API paths | Customer admin surface and privileges remain inaccessible |
+| UX-10 | Invalid/tampered package or licence | Verification rejects it without privileged execution |
+| UX-11 | Disconnected install/update | All required dependencies and trust checks work under the declared offline model |
+| UX-12 | Browser closes after request acceptance | Durable customer-side workflow continues |
+| UX-13 | Local evaluation host shuts down | Availability limitation is explicit; no claim of continuing execution |
+| UX-14 | Upgrade or model package attempts additional egress | Rejected pending explicit supported review; boundary tests rerun |
+| UX-15 | Use unsupported CPU/host/dependency combination | Preflight rejects or marks unsupported; no false compatibility badge |
+| UX-16 | Renew or upgrade edition | Existing local records remain intact; new entitlement does not grant operational authority |
+| UX-17 | Request outside organisation under strict profile | Unapproved processor/model destination blocked; no vendor relay |
+| UX-18 | Account password reset | Does not reset or unlock the customer runtime |
+| UX-19 | Runtime data export | Authorisation, local delivery and audit respected; no vendor upload |
+| UX-20 | CSS/JavaScript/fonts/telemetry network audit | Only documented approved destinations; no runtime vendor asset dependency |
+
+## ROLE, SUPPORT AND CUSTOM-AI ACCEPTANCE MATRIX
+
+These scenarios supplement all retained tests and UX-01–UX-20. They are **requirements, not executed test results**. Store the exact tested build/model/knowledge version, profile, evidence, expected/actual result and reviewer when executed. No threshold or pass rate is invented by this table.
+
+| ID | Scenario | Required outcome | Status |
+|---|---|---|---|
+| ROLE-01 | Vendor Super Admin presents a vendor token to a customer runtime | Denied; vendor identity is not customer authority. | NOT_RUN |
+| ROLE-02 | Vendor Admin opens an unassigned or different customer support case | Denied unless explicit vendor case permissions allow the business record; never runtime access. | NOT_RUN |
+| ROLE-03 | Customer Admin attempts to grant Organisation Super Admin or expand its own scope | Denied without the independent authorised delegation procedure. | NOT_RUN |
+| ROLE-04 | Member requests an unassigned system, environment or subtenant | Denied on the server before disclosure or side effect. | NOT_RUN |
+| ROLE-05 | Organisation Owner migrates to the Organisation Super Admin display model | Existing scope is preserved; no duplicate privileged identity or vendor parent is created. | NOT_RUN |
+| ROLE-06 | Revoke a member or service identity with a queued action | New actions recheck authorisation; stale tokens/permissions cannot preserve revoked access. | NOT_RUN |
+| ROLE-07 | Vendor website account recovery attempts customer-owner recovery | No cross-domain reset, token exchange or hidden recovery key. | NOT_RUN |
+| ROLE-08 | Auditor or Data Principal attempts member management or a repair | Denied under its own limited role and audience. | NOT_RUN |
+| ROLE-09 | Customer user attempts another organisation even with a matching local role name | Denied; role names alone do not cross installation/organisation boundaries. | NOT_RUN |
+| ROLE-10 | One vendor actor attempts support, release approval and signing without separation | Independent approval/key controls prevent an unauthorised release or trust change. | NOT_RUN |
+| SUP-01 | Unreported customer runtime fails while offline | Vendor shows not reported/stale, not invented healthy or live incident detail. | NOT_RUN |
+| SUP-02 | Generate support report containing a principal reference, hostname, log or raw AI text | Local fixed-schema validation blocks export; rejected content is not sent to vendor. | NOT_RUN |
+| SUP-03 | Approve one support case then change the report payload | Digest/scope mismatch requires a fresh review; approval does not cover arbitrary future content. | NOT_RUN |
+| SUP-04 | Send a legitimate approved minimal support report | Only permitted business/installation and diagnostic fields reach the assigned vendor case. | NOT_RUN |
+| SUP-05 | Vendor supplies a diagnostic or repair instruction | Customer validates the typed supported plan and authorises execution; vendor cannot invoke a shell. | NOT_RUN |
+| SUP-06 | AI is unavailable or recommends no escalation during a critical failure | Human alerting, deterministic help and direct support remain available. | NOT_RUN |
+| SUP-07 | Optional proactive support signals are disabled or revoked | No scheduled diagnostic transmission; prior permission cannot enable new fields or intervals. | NOT_RUN |
+| SUP-08 | A connection stops after an approved optional report | Local operations continue; vendor treats subsequent status as unknown or stale. | NOT_RUN |
+| SUP-09 | Vendor case is closed while a local privacy action remains unverified | Local action remains unresolved; support closure is not operational verification. | NOT_RUN |
+| SUP-10 | Compromised commercial licence or support credential requests customer data | No operational API, production credential or automatic data-upload path is available. | NOT_RUN |
+| AI-01 | Training run specifies a third-party pretrained checkpoint or adapter | Rejected under the current own-model policy; explicit product-change review required. | NOT_RUN |
+| AI-02 | Candidate ORVIA run resumes its own checkpoint | Provenance traces to approved random initialisation, corpus and tokenizer; no unrelated weights. | NOT_RUN |
+| AI-03 | Corpus ingestion receives a customer ticket, log, conversation or disguised derivative | Rejected and quarantined under the non-customer corpus rule. | NOT_RUN |
+| AI-04 | Public source lacks approved reuse/provenance or contains personal/poisoned content | Excluded pending review; public accessibility is not automatic admission. | NOT_RUN |
+| AI-05 | A local user asks a question with authorised local context | Only local permission-filtered inference; no training, gradient export or vendor/Lightning call. | NOT_RUN |
+| AI-06 | Runtime inference is attempted with vendor and Lightning egress blocked | Supported local answer works, or honest unavailable state; no external fallback. | NOT_RUN |
+| AI-07 | Retrieved document instructs model to leak secrets or bypass roles | No permission expansion, forbidden tool execution or support export. | NOT_RUN |
+| AI-08 | Test question depends on stale or missing legal/product knowledge | Answer exposes limits/source dates and escalates; model memory does not invent authority. | NOT_RUN |
+| AI-09 | Model package is tampered with or requests executable loader/network access | Verification/runtime restrictions reject it before unsafe execution. | NOT_RUN |
+| AI-10 | Model is absent, fails evaluation or exceeds available hardware | AI is not advertised as ready; deterministic privacy operations and support still work. | NOT_RUN |
+| AI-11 | Local rating or conversation history is marked for model improvement | Training/export denied; permitted local retention is separately controlled. | NOT_RUN |
+| AI-12 | An auxiliary embedding/reranking component tries to download third-party weights | Blocked; every learned component must satisfy the own-model provenance requirement. | NOT_RUN |
+| AI-13 | Model conversion or quantisation changes output quality | Run held-out quality/safety tests; do not inherit the earlier evaluation result automatically. | NOT_RUN |
+| AI-14 | Model update/rollback changes consent epoch, roles or safety restrictions | Rejected; model lifecycle cannot reverse current deterministic state. | NOT_RUN |
+| AI-15 | Customer A question or cached context is requested by another scope | Denied; customer/role-scoped retrieval, caches and logs do not mix. | NOT_RUN |
+| AI-16 | Model training credentials try to publish a signed customer release | Denied without separate release approval and protected signing identity. | NOT_RUN |
+| AI-17 | A task asks for unsupported general advice or unsupported language | Enforce task scope; show limitations rather than claim domain training guarantees correctness. | NOT_RUN |
+| AI-18 | Vendor-side assistant sees a permitted support case | Inference may use permitted case context only; case content is not admitted to training. | NOT_RUN |
+
+Property-based isolation/consent tests, independent security assessment, model threat testing and real installation/restore exercises remain necessary; a fixed scenario table does not replace those programmes.
+
 ---
 
 <a id="orvia-section-218"></a>
@@ -7472,5 +8354,75 @@
 
 Use final standards deliberately and pin the assessed version. A newer draft is not automatically the approved baseline. The current text states intended controls and acceptance requirements; test reports, penetration tests, certifications and patch-response measurements must come from actual execution.
 
----
-
+## REVISION 1.2 — SOURCE MATERIAL AND TECHNICAL REFERENCES
+
+### Document sources and precedence
+
+**M0** means the original `Pasted markdown.md` master; **M1** means `ORVIA_Unified_Master_v1_1_Customer_Hosted_and_Security.md`. The two source companions are `ORVIA_Delivery_and_Interface_Decision.md` and the later `ORVIA_Interface_and_Deployment_Blueprint.md`. Their relevant product decisions are incorporated into this master; they are not parallel active specifications after this consolidation. Appendix E records their source hashes and destinations.
+
+The current user requirement adds separate vendor/customer administration, privacy-preserving support and an ORVIA-specific trained model using Lightning development GPUs without customer-data training. Role names, the canonical ZIP packaging reconciliation, support workflow and ORVIA Intelligence lifecycle are **engineering design decisions**, not assertions that the cited organisations prescribe ORVIA's architecture.
+
+Where the companion's earlier `M1` reference is retained inside an imported paragraph, it identifies the historical baseline; the current section in this revision governs implementation. `M0 §n` also remains traceable to the original numbering. No source citation certifies implementation, legal correctness, runtime compatibility or model quality.
+
+### Retained interface-reference keys T1–T8
+
+| ID | Reference | Relevant scope |
+|---|---|---|
+| T1 | Docker multi-platform builds | OS/CPU image variants; not a universal native executable |
+| T2 | Docker Desktop Windows installation | Platform prerequisites and Windows Server exclusion |
+| T3 | Docker Desktop Mac installation | Intel/Apple Silicon variants and supported prerequisites |
+| T4 | Microsoft supported Linux/FreeBSD virtual machines on Hyper-V | Linux guest route in Windows infrastructure |
+| T5 | Docker Desktop licence agreement | Separate third-party runtime licensing; current install guidance also states this distinction |
+| T6 | Docker Compose overview | Multi-container application definitions |
+| T7 | Docker Compose production guidance | Single-server production adaptation and maintenance |
+| T8 | Helm charts documentation | Kubernetes resource packaging; not full images or automatic production assurance |
+
+```text
+T1 https://docs.docker.com/build/building/multi-platform/
+T2 https://docs.docker.com/desktop/setup/install/windows-install/
+T3 https://docs.docker.com/desktop/setup/install/mac-install/
+T4 https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/supported-linux-and-freebsd-virtual-machines-for-hyper-v-on-windows
+T5 https://docs.docker.com/subscription-billing/desktop-license/
+T6 https://docs.docker.com/compose/
+T7 https://docs.docker.com/compose/how-tos/production/
+T8 https://helm.sh/docs/topics/charts/
+```
+
+### Additional primary technical references U1–U10
+
+References reviewed on 16 September 2026. These support the limited technical statements associated with them; the proposed ORVIA controls are not claims of certification or of a provisioned Lightning service. The Docker licence page did not render in one check; the Windows/Mac installation documentation independently describes separate Docker Desktop licensing. Pin actual versions and review applicable terms before implementation.
+
+| ID | Primary source | Limited purpose |
+|---|---|---|
+| U1 | OWASP Authorization Cheat Sheet | Least privilege, deny by default and authorisation on each request |
+| U2 | Docker multi-platform build documentation | Platform-specific runnable image variants |
+| U3 | Docker Compose production documentation | Single-server application deployment considerations |
+| U4 | Helm charts documentation | Deployment resource packages |
+| U5 | Docker Desktop Windows installation documentation | Windows prerequisites and absence of Windows Server support |
+| U6 | Lightning-AI LitGPT pretraining tutorial and Python API | Distinction between random initialisation/from-scratch and continued training with a checkpoint; examples still require inspection for external assets |
+| U7 | Lightning platform GPU studio/training guides | GPU development and multi-node training mechanisms, not ORVIA model quality or guaranteed availability |
+| U8 | Lightning security documentation for secrets | User/teamspace secret scope across studios; review actual project isolation |
+| U9 | OWASP GenAI prompt-injection and excessive-agency guidance | Retained threats requiring external permission/tool boundaries |
+| U10 | Hugging Face dataset-card documentation | Metadata/provenance documentation practice, not corpus-rights clearance or permission to upload customer data |
+
+```text
+U1 https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
+U2 https://docs.docker.com/build/building/multi-platform/
+U3 https://docs.docker.com/compose/how-tos/production/
+U4 https://helm.sh/docs/topics/charts/
+U5 https://docs.docker.com/desktop/setup/install/windows-install/
+U6 https://github.com/Lightning-AI/litgpt/blob/main/tutorials/pretrain.md
+   https://github.com/Lightning-AI/litgpt/blob/main/tutorials/python-api.md
+U7 https://lightning.ai/docs/platform/build/ai-studio
+   https://lightning.ai/docs/platform/train/multi-node-training
+   https://lightning.ai/docs/platform/train/finetune-models/training-guide
+U8 https://lightning.ai/docs/security/security-features/secrets
+U9 https://genai.owasp.org/llmrisk/llm01-prompt-injection/
+   https://genai.owasp.org/llmrisk/llm062025-excessive-agency/
+U10 https://huggingface.co/docs/hub/datasets-cards
+```
+
+**Unchanged legal boundary:** this revision does not newly verify the inherited DPDP legal baseline, supply legal advice, approve a training corpus's rights or establish that the model is trained/certified. Existing source dates, review requirements and qualifications remain. Public-source reuse, data rights and model/framework distribution terms require review for the actual artifacts. Technical source examples are not copied as ready-to-run ORVIA infrastructure.
+
+---
+
``````

</details>

## E.8 Validation boundary

Automated document checks verify the section sequence/titles/anchors, byte-identical unrelated sections, source immutability, preservation of the old appendices, local links, Markdown structure and scenario identifiers. They do not validate executable software, authorisation enforcement, customer-data isolation, model training or legal compliance. Those require implementation and the recorded acceptance programme.


<a id="appendix-f"></a>

# APPENDIX F — PRODUCT VERSION 1 BASELINE, VERSION 2 AI DEFERRAL AND REVISION 1.3 INTEGRITY

**Decision date:** 16 September 2026. **Document revision:** 1.3. **Current product baseline:** ORVIA Version 1. **Future custom-AI scope:** Product Version 2. Appendices A–E remain unchanged historical records; their earlier “current” wording and diff excerpts do not override the active numbered sections.

## F.1 What this revision changes

The user’s current release decision governs: preserve the full accumulated product idea in one master, focus Version 1 on the non-model platform, keep optional modest rules-based intelligence, and hold the custom ORVIA AI training/integration for Product Version 2. Development with authorised AI coding tools continues. No non-AI capability is deleted or newly deferred; prior advanced rollout qualifications still apply. No existing customer-local, role, support, distribution or security boundary is weakened.

Version 1 does not replace the deferred custom model with a third-party model. Version 2 retains from-scratch model provenance, approved public/licensed and ORVIA-authored non-customer training material, separately authorised Lightning GPU development, customer-local inference, no customer-data training and independent model/security release requirements. The full detailed future lifecycle remains in its corresponding sections, not an external document.

## F.2 Preservation and status record

- Source: `ORVIA_Unified_Master_v1_2_Delivery_Roles_Support_and_Custom_AI.md`.
- Source bytes: `651512`.
- Source SHA-256: `9c19809910a4ab3b5a102b817d1ad1168a1e093c75db03f4c245f71576c51200`.
- Numbered sections retained: **218 of 218**; all section numbers, titles and section anchors unchanged.
- Original module inventory retained: **33 of 33**; IDs 19–25 are the seven deferred AI modules.
- Relevant section bodies updated: **76**.
- Unrelated section bodies byte-identical to revision 1.2: **142**.
- Unchanged section ranges: 3–4, 6–9, 12–30, 32–33, 35–42, 44–47, 49–61, 75, 78–79, 83, 87–88, 90–92, 97–101, 104–108, 110–111, 114–115, 118–119, 122, 124–125, 128–129, 131, 133–136, 139–141, 144–145, 147–155, 157, 159–162, 165–167, 169–186, 189, 192–193, 196–198, 201, 204, 206–209, 212–214.
- Historical appendices A–E: preserved byte-for-byte.
- Existing AI acceptance scenarios AI-01–AI-18: retained with **DEFERRED_V2**, not passed.
- Added Version 1 acceptance scenarios: **18**, V1-01–V1-18; initially **NOT_RUN**.
- Code, model training, GPU provisioning, test execution, security assessment and production deployment: **not performed or established by this document update**.

The section comparison operates on complete UTF-8 body content between the unchanged numbered-section anchors. Cover metadata and the contents link are updated separately. The exact active-master diff follows; prior appendices are not duplicated in that diff because their bytes are unchanged.

## F.3 Section-by-section change register

| Section | Topic | Change |
|---|---|---|
| 1 | PURPOSE OF THIS DOCUMENT | PRODUCT VERSION 1 BASELINE AND VERSION 2 RESERVATION |
| 2 | PRODUCT DEFINITION | Qualify product intelligence by release; Separate future AI from current edition scope; Retain official distribution with future model availability; Move own-model programme to Product Version 2; VERSION 1 PRODUCT POSITION |
| 5 | CORE DOMAIN MODEL | Move training registries out of V1 implementation prerequisites; VERSION 1 GUIDANCE DATA WITHOUT A TRAINING STORE |
| 10 | MODULE ARCHITECTURE | Mark seven named AI modules as future without renumbering; RELEASE ASSIGNMENT WITHOUT MODULE REMOVAL |
| 11 | SERVICE ARCHITECTURE | Show optional V1 assistance and separate future AI branch; Remove AI gateway from initial service prerequisites; Keep location invariant across product releases; VERSION 1 HAS NO MODEL SERVICE DEPENDENCY |
| 31 | CUSTOMER DATA BOUNDARY | Qualify retained training-data boundary as future work; No inference implied for model-free V1 |
| 34 | CLOUD ARCHITECTURE | Qualify hosting-boundary table by release |
| 43 | OFFLINE / DEGRADED OPERATION | Make outage table model independent in V1; Treat model absence as expected in V1 |
| 48 | PRIVACY FAILURE CENTER | VERSION 1 RULE-BASED FAILURE GUIDANCE |
| 62 | PRIVACY DRIFT DETECTION | Keep deterministic drift in V1 while deferring model explanation |
| 63 | AI ARCHITECTURE | Product-release applicability made explicit; Clarify retained architecture horizon; Label future model branch; Qualify own-model requirement without dropping it; Preserve custom AI as future product commitment; Prevent AI-first support dependency in Version 1; VERSION 1 GUIDED ASSISTANCE — RULES, NOT A TRAINED MODEL; VERSION 2 HANDOFF WITHOUT REBUILDING VERSION 1 |
| 64 | AI MODEL ABSTRACTION | Product-release applicability made explicit; Assign custom gateway to future release; Mark training lifecycle future; Replace ambiguous AI release timing |
| 65 | AI DATA-MINIMISATION | Product-release applicability made explicit |
| 66 | AI PRIVACY COPILOT | Product-release applicability made explicit |
| 67 | AI DISCOVERY | Product-release applicability made explicit |
| 68 | AI POLICY BUILDER | Product-release applicability made explicit |
| 69 | AI WORKFLOW BUILDER | Product-release applicability made explicit |
| 70 | AI FAILURE ANALYSIS | Product-release applicability made explicit |
| 71 | AI DRIFT ANALYSIS | Product-release applicability made explicit |
| 72 | AI INCIDENT ANALYSIS | Product-release applicability made explicit |
| 73 | AI TEST GENERATION | Product-release applicability made explicit |
| 74 | AI SAFETY RULES | Product-release applicability made explicit |
| 76 | LICENSING AND ENTITLEMENTS | PRODUCT VERSION DOES NOT EQUAL COMMERCIAL EDITION |
| 77 | FEATURE FLAGS VS ENTITLEMENTS | RELEASE AVAILABILITY PRECEDES ENTITLEMENT |
| 80 | ORVIA ENTERPRISE | Retain Enterprise AI as future feature |
| 81 | ONE CODEBASE, THREE EDITIONS | Clarify edition table release scope; Limit model entitlements to future release; VERSION 1 EDITIONS REMAIN COMPLETE WITHOUT A MODEL |
| 82 | WEBSITE | VERSION 1 DOWNLOAD AND ACCOUNT WORDING |
| 84 | CUSTOMER ONBOARDING WIZARD | Remove AI setup from V1 onboarding; Keep future model setup but omit it from current wizard |
| 85 | CONNECTOR INSTALLATION | Remove model from complete V1 installation; Keep V1 offline package model-free; Annotate release tree without losing future model packaging; Defer model download contract; Reconcile canonical ZIP with model-free V1; Make V1 bootstrap and offline checks model independent; VERSION 1 MANIFEST AND RESOURCE CONTRACT |
| 86 | CUSTOMER-CONTROLLED CLOUD DEPLOYMENT | Separate ordinary hosting support from future model hardware |
| 89 | MONITORING DASHBOARD | Avoid missing-model alerts on V1 health pages; EXPECTED MODEL ABSENCE IS NOT A VERSION 1 INCIDENT |
| 93 | UPDATE SYSTEM | Scope retained model distribution to V2; VERSIONED UPGRADE PATH |
| 94 | LICENSE SECURITY | Restrict model entitlement to V2; VERSION 1 LICENCE STATE |
| 95 | PRIVACY-SAFE SUPPORT | Make first-line support deterministic in V1; VERSION 1 SUPPORT CANNOT WAIT FOR AI |
| 96 | SUPPORT PORTAL | Defer vendor-side custom assistant as well as customer-side model; VERSION 1 VENDOR SUPPORT EXPERIENCE |
| 102 | FRONTEND ARCHITECTURE | Clarify system-settings table |
| 103 | PRIMARY NAVIGATION | Split V1 helper and V2 model navigation; NO PLACEHOLDER AI WORKFLOW IN VERSION 1 |
| 109 | SECURITY REQUIREMENTS | Retain security controls without requiring a V1 model |
| 112 | AI SECURITY | Product-release applicability made explicit; Align test status with versioned release gates |
| 113 | AI TOOL-USE MODEL | Product-release applicability made explicit |
| 116 | REPOSITORY STRUCTURE | VERSION 1 BUILD GRAPH |
| 117 | 20-PERSON ENGINEERING TEAM | Retain AI/ML role without allocating V1 model work; Retain AI applications role and redeploy current effort; Update team group current responsibilities; Qualify previously active model ownership; CURRENT VERSION 1 ASSIGNMENTS FOR THE INTELLIGENCE ROLES |
| 120 | DEFINITION OF DONE | RELEASE-SCOPED DEFINITION OF DONE |
| 121 | AI CODING AGENT RULES | CODING AI IS STILL ALLOWED; PRODUCT AI IS DEFERRED |
| 123 | CI/CD PIPELINE | Make training pipeline explicitly future rather than active parallel work; Remove model artifact dependency from V1 CI/CD |
| 126 | SECURITY TESTING | Version-scope egress tests without reducing non-AI checks |
| 127 | MULTI-TENANT SECURITY TEST | Scope isolation suite to shipped surfaces without weakening it |
| 130 | SCALABILITY MODEL | Remove inference scaling from V1 capacity needs |
| 132 | DATA RETENTION WITHIN ORVIA | VERSION 1 HELP DATA IS NOT A FUTURE TRAINING CORPUS |
| 137 | FIRST VERTICAL SLICE | VERSION 1 ACCEPTANCE WITHOUT A MODEL |
| 138 | PHASE 0 — ARCHITECTURAL FOUNDATION | Separate original enterprise phase from future model release; PHASES DO NOT REINTRODUCE CUSTOM AI INTO VERSION 1 |
| 142 | PHASE 4 — ENTERPRISE | Defer model part of enterprise phase |
| 143 | PHASE 5 — ADVANCED | Annotate advanced phase AI item |
| 146 | RELEASE STRATEGY | PRODUCT VERSION 1 / VERSION 2 RELEASE CONTRACT |
| 156 | LOCALISATION | Preserve localisation without runtime AI dependency |
| 158 | ADMIN SETTINGS | Update settings inventory; Separate current and future settings views; Remove current model setup from customer onboarding/settings |
| 163 | SECURITY BASELINE FOR RELEASE | Make security release bar release-specific, not weaker; MODEL DEFERRAL DOES NOT DEFER PLATFORM SECURITY |
| 164 | EXTERNAL SECURITY REVIEW | Defer only model-specific independent review; Define current assessment scope accurately |
| 168 | PRODUCT CLAIMS | VERSION 1 INTELLIGENCE CLAIMS |
| 187 | ARCHITECTURE DECISION RECORDS | D-08 — VERSION 1 MODEL-FREE BASELINE; CUSTOM AI IN PRODUCT VERSION 2 |
| 188 | DEVELOPMENT STANDARD | DEVELOPMENT-AI DISTINCTION |
| 190 | AI SHOULD BUILD IN SMALL VERIFIED UNITS | Remove AI as predecessor for V1 Enterprise delivery; DO NOT SPEND THE VERSION 1 DEADLINE ON MODEL WORK |
| 191 | FIRST DEMO TARGET | Make flagship V1 demonstration model-free; Preserve test breadth with version-qualified AI failure |
| 194 | CUSTOMER DEPLOYMENT DEMO | Align deployment demo with model-free product |
| 195 | PRODUCT SUCCESS METRICS | VERSION 1 SUCCESS MEASURES |
| 199 | FUTURE MODULE MARKETPLACE | Keep future marketplace AI properly labelled |
| 200 | LONG-TERM ARCHITECTURE PRINCIPLE | Clarify long-term architecture release boundaries |
| 202 | FINAL CUSTOMER ARCHITECTURE | Qualify final customer architecture diagram; Remove current Lightning work implication; Separate current runtime from future model; Version-scope final artifact flow |
| 203 | FINAL DELIVERY MODEL | Preserve official vendor source without V1 AI claim; Clarify final download contract |
| 205 | FINAL AI MODEL | Product-release applicability made explicit; Retain final custom-model decision for future version |
| 210 | FINAL MASTER BUILD OBJECTIVE | Make master build objective consistent with release split; No custom model required to complete V1 scope; CURRENT EXECUTION OBJECTIVE |
| 211 | FINAL ENGINEERING COMMAND TO THE AI BUILD SYSTEM | Product-release applicability made explicit; Qualify retained build instructions; Prevent coding agents acting on deferred training instruction; VERSION 1 BUILD-AGENT OVERRIDE |
| 215 | CUSTOMER AI-PROCESSING GOVERNANCE EXTENSION | DISTINGUISH CUSTOMER-AI GOVERNANCE FROM ORVIA CUSTOM AI |
| 216 | PRIORITIZED ENGINEERING BACKLOG | Reassign model epic without deferring core isolation/egress tests; VERSION 1 WORK ALLOCATION |
| 217 | MANDATORY ACCEPTANCE AND FAILURE TEST MATRIX | Set model matrix to deferred instead of V1 failing or passed; All 18 retained custom-model scenarios marked DEFERRED_V2; PRODUCT-RELEASE APPLICABILITY OF RETAINED TESTS; VERSION 1 MODEL-FREE AND GUIDED-ASSISTANCE ACCEPTANCE |
| 218 | PRIMARY SOURCE REGISTER AND REVIEW LIMITS | DOCUMENT REVISION 1.3 SOURCE AND RELEASE-SCOPE NOTE |

## F.4 Current implementation-reading order

Use the cover/§1 release definitions, §10 module assignment, §63 Version 1 Guided Assistance boundary, §146 release contract, §163 security gates, §211 coding instructions and §217 test applicability together with each relevant functional section. Model-focused §§64–74, 112–113 and 205 remain preserved Product Version 2 scope. Historical `V2§n` references identify the earlier refinement source, not the product release.

The earlier prototype plan, execution tracker, prompt pack and HTML previews are historical artifacts. This update changes the master only; it does not silently edit those files or establish that their older model-related tasks/UI are current Version 1 requirements. Use this master’s release assignment when preparing the next implementation task set.

## F.5 Exact active-master changes

<details>
<summary>Expand the exact document-revision 1.2 → 1.3 active-master diff</summary>

````diff
--- document-revision-1.2/active-master
+++ document-revision-1.3/product-v1-active-master
@@ -2,29 +2,34 @@
 
 ## Unified DPDPA Privacy Control Platform
 
-### Unified Idea and Master Engineering Specification
+### Product Version 1 — Unified Idea and Master Engineering Specification
+
+### Product Version 2 — Preserved Custom-AI Roadmap
 
 ### For a 20-Person Senior Software Engineering Team and AI-Assisted Development
 
 **Consolidated edition:** 16 September 2026.  
-**Revision:** 1.2 — unified interfaces and distribution, independent vendor/customer administration, privacy-preserving support and ORVIA-owned AI.  
+**Document revision:** 1.3 — Version 1 product baseline, optional deterministic Guided Assistance, and custom ORVIA AI deferred to Product Version 2.
+**Product baseline:** ORVIA Version 1. **Future product scope:** ORVIA Version 2 — ORVIA Intelligence/custom AI.  
 **Source scope:** Original sections 1–212 and refinement sections 213–250.  
 **Status:** Proposed design for founder, engineering and privacy-counsel review. Not an implementation, security certification, legal opinion, or exhaustive consolidation of Indian law.
 
 This is one topic-by-topic master, not two versions placed one after the other. Original sections 1–212 keep their numbers and titles. Later paragraphs, tables, examples and acceptance requirements are incorporated into the relevant existing sections without paraphrasing. Six standalone subjects continue the numbering as sections 213–218. All 250 source sections are accounted for in Appendix A.
 
-The initial consolidation and revision 1.1 remain documented historically in Appendices A–D. Revision 1.2 incorporates the interface/delivery companions and the user’s administration, support and own-model requirements into the corresponding existing sections. Unrelated section bodies and the historical appendices are preserved. Appendix E records the current change map, source hashes, validation and exact active-master diff. All 218 existing section numbers and titles remain unchanged; these additions do not create a separate product specification.
+Appendices A–E preserve the history through document revision 1.2. Document revision 1.3 adopts the user’s new release decision: retain the accumulated product design as the Version 1 baseline, put the custom ORVIA AI/model programme on hold for Product Version 2, and permit small, explicitly non-model Guided Assistance in Version 1. Changes are merged into the relevant existing sections. Appendix F records this revision’s exact diff and integrity checks. All 218 section numbers and titles remain unchanged; unrelated content and the full future custom-AI design remain in this one master.
 
 The 36-hour prototype plan, its temporary implementation choices, AI task assignments and sprint deadlines are not changes to this product master and are not merged here. The original product roadmap, engineering roles and later product-level refinements remain included.
 
-**Reference key:** `O§n` identifies an original source section, whose number is unchanged here. `V2§n` identifies a refinement source section; use Appendix A for its current location. `R1`–`R8` refer to the retained primary source register in section 218. Historical research dates, qualifications, proposed-design labels and review limitations remain as supplied. Revision 1.1 introduced security references `S1`–`S3`; revision 1.2 retains them and adds interface keys `T1`–`T8` and technical keys `U1`–`U10` in §218. `M0` and `M1` identify the historical document sources defined there. Neither revision newly verifies or approves the historical legal baseline.
+**Reference key:** `O§n` identifies an original source section, whose number is unchanged here. `V2§n` identifies a refinement source section; use Appendix A for its current location. `R1`–`R8` refer to the retained primary source register in section 218. Historical research dates, qualifications, proposed-design labels and review limitations remain as supplied. Revision 1.1 introduced security references `S1`–`S3`; revision 1.2 retains them and adds interface keys `T1`–`T8` and technical keys `U1`–`U10` in §218. `M0` and `M1` identify the historical document sources defined there. No document revision here newly verifies or approves the historical legal baseline. **`V2§n` is an old refinement-source identifier, not a Product Version 2 assignment.** Product releases, document revisions, original phases 0–5, and backlog priorities P0/P1/P2 are separate labels; see §§1 and 146.
 
 
 **Governing customer requirements:** the complete licensed product is downloaded from the website and runs in the customer’s own environment; no customer operational/personal data is sent to ORVIA vendor infrastructure; only §31’s defined minimum business/licensing/service information may be collected. Security is a mandatory, testable and continuously maintained release obligation, not an “unbreachable” or “zero vulnerabilities” promise. These current requirements supersede older contradictory defaults; earlier hosted alternatives and original source text in the historical appendices are not active exceptions.
 
-**Current integrated decisions:** ORVIA remains the official cloud distributor of signed complete-product ZIP bundles and profile artifacts; the customer's Workspace/Privacy Centre remain local, separate from the vendor Account and staff console. Vendor Super Admin/Admin have vendor-service authority only; Organisation Super Admin/Admin/Member and retained specialised roles govern each customer environment. Support uses approved minimal diagnostic information and customer-authorised local execution, not vendor root access. ORVIA Intelligence uses ORVIA-owned from-scratch trained weights on approved non-customer material, with authorised Lightning development GPUs and customer-local inference. §§63–65 define that requirement without silently substituting a fine-tuned third-party model.
-
-**Evidence status:** specification update only. No software implementation, model training, GPU provisioning/spending, quality benchmark, penetration test, data-egress test, security certification or production release is established by this document. UI previews remain historical synthetic illustrations, not deployed interfaces. All new acceptance scenarios begin NOT_RUN.
+**Current integrated decisions:** ORVIA remains the official cloud distributor of signed complete-product ZIP bundles and profile artifacts; the customer's Workspace/Privacy Centre remain local, separate from the vendor Account and staff console. Vendor Super Admin/Admin have vendor-service authority only; Organisation Super Admin/Admin/Member and retained specialised roles govern each customer environment. Support uses approved minimal diagnostic information and customer-authorised local execution, not vendor root access. **Product Version 1 ships no learned-model AI or custom-model runtime.** Its optional **Guided Assistance** uses reviewed rules, templates, runbooks and local keyword/full-text search. **Product Version 2 preserves ORVIA Intelligence**: ORVIA-owned from-scratch weights, approved non-customer material, authorised Lightning development GPUs, and customer-local inference. Training, integration and GPU work are on hold for Version 1; no third-party model is substituted. AI coding assistance for building ORVIA remains permitted under §§121 and 188–190.
+
+**Evidence status:** specification update only. No software implementation, model training, GPU provisioning/spending, quality benchmark, penetration test, data-egress test, security certification or production release is established by this document. UI previews remain historical synthetic illustrations, not deployed interfaces. Version 1 acceptance scenarios begin NOT_RUN; future model-specific scenarios are DEFERRED_V2, not passed. Calling this the Version 1 baseline records product scope and planning progress, not a claim that the entire application has been built or released.
+
+**Release rule:** Version 1 must install, authenticate, execute, verify, test, provide human support, renew and upgrade without a model, GPU, model API key or Lightning connection. Version 2 adds assessed custom AI through the same customer-local architecture; it does not replace the Version 1 core. No other capability is deleted or newly deferred by this revision. Existing non-AI rollout and safety gates remain.
 
 <details>
 <summary>Contents — sections 1–218 and revision appendices</summary>
@@ -256,6 +261,8 @@
 
 - [Appendix E — Revision 1.2 change, source and integrity record](#appendix-e)
 
+- [Appendix F — Version 1 baseline / Version 2 AI decision and integrity](#appendix-f)
+
 </details>
 
 ---
@@ -293,6 +300,22 @@
 
 This document describes the target platform architecture. Product scope may be released progressively, but the core architecture must be designed so that Foundation, Control and Enterprise editions can use the same underlying platform.
 
+## PRODUCT VERSION 1 BASELINE AND VERSION 2 RESERVATION
+
+**User decision, 16 September 2026:** the accumulated idea, architecture and planning progress through document revision 1.2, as adjusted here, become the **ORVIA Version 1 baseline**. Focus implementation on the non-model platform. Preserve the entire custom-AI plan for **Product Version 2**, rather than deleting it or replacing it with an existing model.
+
+| Label | Meaning | Does not mean |
+|---|---|---|
+| Product Version 1 | Current non-model product baseline, with optional deterministic Guided Assistance | Every specified feature is already implemented, tested or generally available |
+| Product Version 2 | Future integration of the custom ORVIA Intelligence model and its retained AI functions | Document revision 1.2 or the historical `V2§n` source labels |
+| Document revision 1.3 | This update to the master specification | A shipped software build numbered 1.3 |
+| Foundation / Control / Enterprise | Commercial editions of the shared product | Successive software versions |
+| Phases 0–5 and P0/P1/P2 | Retained delivery phases and backlog priorities | Automatic assignment to Product Version 1, 2 or 3 |
+
+All existing non-AI capabilities, delivery choices, privacy/security requirements, roles, support boundaries and acceptance requirements remain in the Version 1 product programme. Existing descriptions of later/advanced/non-supported capabilities remain accurate; this baseline does not make them day-one features. **This revision newly defers only the custom-model/learned-AI work and its dependent product functions.** It does not use the deadline to delete unrelated requirements or lower release standards.
+
+Record a capability’s product target, implementation status, test status, supported deployment scope and edition entitlement separately. Planned scope is not delivery evidence. Preserve current engineering artifacts as they actually exist; do not infer implemented code, trained weights or passed tests from previous plans or interface previews.
+
 ---
 
 <a id="orvia-section-2"></a>
@@ -329,7 +352,7 @@
 
 ## REFINED PRODUCT THESIS
 
-**Retained:** ORVIA, Unified DPDPA Privacy Control Platform; the seven-stage operating loop; website/cloud distribution with customer-hosted execution; Foundation, Control and Enterprise; deterministic operations with an optional AI assistance layer. [O§2–4, O§63, O§76–81]
+**Retained:** ORVIA, Unified DPDPA Privacy Control Platform; the seven-stage operating loop; website/cloud distribution with customer-hosted execution; Foundation, Control and Enterprise; deterministic operations, optional rules-based Guided Assistance in Product Version 1, and the preserved custom-AI assistance layer in Product Version 2. [O§2–4, O§63, O§76–81]
 
 **Proposed positioning:** A DPDP-first privacy control engineering and assurance platform: define approved processing, implement controls at supported boundaries, coordinate actions across systems, and continuously show what is working, failing, unverified or outside coverage.
 
@@ -351,19 +374,23 @@
 
 **Security requirement:** design, implement, test and maintain a highly secure product using the measurable controls and release gates in §§109, 126, 163–164 and 206. “Unbreachable,” “zero vulnerabilities” and equivalent absolute promises are not approved product claims.
 
-`CUSTOMER_LOCAL` is the default for all editions offered under this promise. Enterprise can add scale, advanced integrations, resilient deployment and private-AI management; the baseline data boundary and essential security cannot depend on buying a more expensive edition. An unsupported deployment must be labelled unsupported, not silently redirected to a hosted service.
+`CUSTOMER_LOCAL` is the default for all editions offered under this promise. Enterprise can add scale, advanced integrations, resilient deployment and, in Product Version 2, private-AI management; the baseline data boundary and essential security cannot depend on buying a more expensive edition. An unsupported deployment must be labelled unsupported, not silently redirected to a hosted service.
 
 The pre-existing vendor-hosted SaaS alternatives remain recorded as non-default architectural options in §§33 and 86; they are not enabled under this customer-local offer. Enabling a different data-handling model would require a separate, explicit product decision and accurate revised disclosures—not a hidden fallback or a support-session override.
 
 ## CURRENT PRODUCT DELIVERY, AUTHORITY AND AI DECISIONS
 
-The ORVIA vendor remains the official publisher and distributor of the product, licences, signed updates, connector packages, reviewed knowledge packs and ORVIA-owned model packages through its website and vendor-controlled distribution cloud. Distribution does not mean execution: the customer's operational platform runs in the customer's environment.
+The ORVIA vendor remains the official publisher and distributor of the product, licences, signed updates, connector packages, reviewed knowledge packs and, when released for Product Version 2, ORVIA-owned model packages through its website and vendor-controlled distribution cloud. Distribution does not mean execution: the customer's operational platform runs in the customer's environment.
 
 Use three customer-facing experiences: **ORVIA Account** for purchasing/licences/downloads/support, **ORVIA Workspace** for local operations, and **Customer Privacy Centre** for that customer's Data Principals. A separate **Vendor Administration and Support Console** is for ORVIA staff, not a global login into customer workspaces.
 
 Vendor Super Admin and Vendor Admin roles govern vendor services only. Organisation Super Admin (the user's “mini super admin”), Organisation Admin and Member roles govern customer-local environments. All specialised roles already in §6 remain. A tenant is an isolation scope, not a user role.
 
-Build **ORVIA Intelligence** as the proposed ORVIA-owned domain AI: its own trained weights, no third-party pretrained model checkpoint or hosted foundation-model dependency, public/licensed non-customer knowledge and ORVIA-authored synthetic training material, development on separately authorised Lightning AI GPUs, and inference within the customer environment. The complete definition, training requirements and release gates are in §§63–65 and 112. No model has been trained by this specification update.
+Preserve **ORVIA Intelligence** for **Product Version 2**, with training and integration on hold during Version 1. Its retained definition is an ORVIA-owned domain AI: its own trained weights, no third-party pretrained model checkpoint or hosted foundation-model dependency, public/licensed non-customer knowledge and ORVIA-authored synthetic training material, development on separately authorised Lightning AI GPUs, and inference within the customer environment. The complete definition, training requirements and release gates are in §§63–65 and 112. No model has been trained by this specification update.
+
+## VERSION 1 PRODUCT POSITION
+
+Version 1 is the customer-hosted privacy-control product, not a model-training release. It delivers supported deterministic privacy operations, enforcement, verification, evidence, regression testing, scoped administration, distribution/licensing and privacy-safe support. Optional Guided Assistance adds useful local rules and documentation without a model. Product Version 2 will add the separately assessed custom-AI layer without changing the no-customer-data-training or customer-local promises.
 
 ---
 
@@ -506,7 +533,11 @@
 
 A random licence installation identifier may correlate a permitted support case with a commercial assignment. It must not be computed from customer records, hostnames or a staff directory. Keep the mapping from a local workflow/incident to a vendor support case only inside the customer deployment.
 
-For AI development, maintain a separate `TrainingSource`, `CorpusManifest`, `DatasetSplit`, `ModelExperiment`, `ModelRelease`, `KnowledgePackVersion` and `EvaluationReport` registry. These contain approved non-customer training material and vendor engineering records, never an uploaded customer inference history.
+For **Product Version 2 AI development**, maintain a separate `TrainingSource`, `CorpusManifest`, `DatasetSplit`, `ModelExperiment`, `ModelRelease`, `KnowledgePackVersion` and `EvaluationReport` registry. These contain approved non-customer training material and vendor engineering records, never an uploaded customer inference history.
+
+## VERSION 1 GUIDANCE DATA WITHOUT A TRAINING STORE
+
+Version 1 can use minimal versioned runbook/rule/template metadata and permission-scoped local guidance records (§63), reusing existing domain and audit structures where suitable. Do not require a training registry, tokenizer, vector model, experiment store or model service to create a tenant or start a workflow. The Version 2 registry definitions above are preserved future scope; a Version 1 knowledge/runbook version is not a model version.
 
 ---
 
@@ -770,7 +801,7 @@
 17. Privacy Incident Explorer
 18. Coverage and Failure Center
 
-## AI
+## AI — PRODUCT VERSION 2 / DEFERRED
 
 19. AI Privacy Copilot
 20. AI Discovery
@@ -790,6 +821,12 @@
 31. Updates
 32. Monitoring
 33. Audit Administration
+
+## RELEASE ASSIGNMENT WITHOUT MODULE REMOVAL
+
+The original inventory remains **33 modules** with unchanged IDs: modules **1–18 and 26–33** form the 26 non-AI modules in the Version 1 baseline; modules **19–25** remain the seven Product Version 2 custom-AI modules. Existing rollout stages still determine which non-AI capabilities are actually released.
+
+Version 1 Guided Assistance is a small capability within existing help, search, configuration, failure and support surfaces—not a replacement for the seven AI modules and not a 34th mandatory platform service. Model-dependent descriptions in §§63–74 and 112–113 are preserved future requirements. No fake AI result or third-party LLM is used to make their Version 1 status appear complete.
 
 ---
 
@@ -820,7 +857,8 @@
     ├── Evidence
     ├── Testing
     ├── Incident
-    ├── AI
+    ├── Guided Assistance (V1, optional rules only)
+    ├── AI (Product V2 extension; not deployed in V1)
     └── Licensing
 
 ```
@@ -829,13 +867,17 @@
 
 ## DEPLOYMENT, RESILIENCE AND MEASUREMENT
 
-**Proposal:** Begin with a modular API/control-plane application, durable workers, a policy decision service, the customer agent, the web/portal applications and an isolated AI gateway. Logical modules do not each require independent microservices. Preserve the original TypeScript/React/Node/PostgreSQL/Temporal direction, with OPA as the proposed initial policy implementation subject to an ADR and benchmark.
+**Proposal:** Begin with a modular API/control-plane application, durable workers, a policy decision service, the customer agent, the web/portal applications and, optionally in Version 1, a small deterministic assistance component. Reserve the isolated AI gateway for Product Version 2. Logical modules do not each require independent microservices. Preserve the original TypeScript/React/Node/PostgreSQL/Temporal direction, with OPA as the proposed initial policy implementation subject to an ADR and benchmark.
 
 ## LOCATION OF THE SHARED PLATFORM
 
-In `CUSTOMER_LOCAL`, the console, APIs, portal, identity integration, graph, policy engine, workflow engine, databases, caches, connector control, verification, evidence, tests, incident functions, search and operational AI gateway run inside the customer boundary. A connector-only download with the real graph/workflow/evidence services still hosted by ORVIA does not satisfy this deployment model.
+In `CUSTOMER_LOCAL`, the console, APIs, portal, identity integration, graph, policy engine, workflow engine, databases, caches, connector control, verification, evidence, tests, incident functions, search and any Version 1 Guided Assistance run inside the customer boundary; the Product Version 2 operational AI gateway must also run there when introduced. A connector-only download with the real graph/workflow/evidence services still hosted by ORVIA does not satisfy this deployment model.
 
 The local licensing component verifies entitlements; commercial checkout and invoicing remain vendor services. Reuse code and interfaces where appropriate, but do not share customer runtime databases, signing authority or service credentials with the vendor commerce plane.
+
+## VERSION 1 HAS NO MODEL SERVICE DEPENDENCY
+
+Version 1 startup, health/readiness checks, deployment manifests, migrations, background workers, entitlement checks and support must not depend on a trained model, inference process, model store, GPU, model-provider credential or Lightning endpoint. Keep only a documented, versioned extension boundary for Version 2; do not build or run a dormant model platform merely to reserve its place. Removing optional guidance must not remove any core privacy or human-support path.
 
 ---
 
@@ -1753,9 +1795,9 @@
 
 A customer-approved support exchange may include a vendor case identifier, existing licence/random installation reference, product/component version, enumerated problem category/error code, customer-selected urgency, approved runbook result enum and synthetic reproduction. Each field requires the purpose/retention/access specification already required here. No arbitrary log text or local operational reference is allowed. Detailed rules and optional opt-in notifications are in §§95–96.
 
-Lightning AI is a vendor-selected **model-development infrastructure provider**, not a customer data processor for runtime inference in this architecture. Only vetted public/licensed non-customer corpus material, ORVIA-authored documentation, synthetic fixtures, training code and resulting ORVIA experiment artifacts may enter that training environment. Do not mount customer storage, issue customer credentials, upload support payloads, or send customer prompt/output/embedding/gradient data to it.
-
-Runtime inference can inspect minimal customer-local context that the requesting person is authorised to see; that is **not training**. It stays local and must not change released model weights, be added to a vendor training corpus, or be used for federated learning or cross-customer improvement. Training and inference provenance are governed by §§64–65.
+For Product Version 2, Lightning AI is the vendor-selected **model-development infrastructure provider** (training is on hold for Version 1), not a customer data processor for runtime inference in this architecture. Only vetted public/licensed non-customer corpus material, ORVIA-authored documentation, synthetic fixtures, training code and resulting ORVIA experiment artifacts may enter that training environment. Do not mount customer storage, issue customer credentials, upload support payloads, or send customer prompt/output/embedding/gradient data to it.
+
+Product Version 2 runtime inference can inspect minimal customer-local context that the requesting person is authorised to see; that is **not training**. It stays local and must not change released model weights, be added to a vendor training corpus, or be used for federated learning or cross-customer improvement. Training and inference provenance are governed by §§64–65.
 
 Authorised display to an employee's browser or a response to a Data Principal is an intentional customer workflow, not vendor receipt. Endpoint caches, exports and downloads need customer controls. The vendor website, vendor staff, Lightning training workspace and customer runtime are four distinguishable recipients/locations, not one undifferentiated “cloud.”
 
@@ -1859,7 +1901,7 @@
 | Product website, checkout, business account and invoices | Admin console, portal and customer identity integration |
 | Subscriptions, entitlements and signed licence issuance | Local licence verification and entitlement enforcement |
 | Authenticated package downloads and signed update catalogues | Customer-approved installation, update validation and migrations |
-| Minimal business support and allowlisted diagnostic intake | Databases, graph, policies, consent, rights, workflows, connectors, evidence, tests, AI and observability |
+| Minimal business support and allowlisted diagnostic intake | Databases, graph, policies, consent, rights, workflows, connectors, evidence, tests, optional V1 Guided Assistance, Product V2 AI and observability |
 
 These planes have separate accounts, databases, credentials and trust roles. The vendor does not hold a customer runtime administrator, connector command-signing key, database account or decryption key. Compromise of a billing account must not grant access to a customer deployment.
 
@@ -2181,12 +2223,12 @@
 
 | Condition | Required behaviour |
 |---|---|
-| Vendor website, support service or Lightning training service unavailable | Valid customer-local login, deterministic workflows and an already installed supported ORVIA model remain independent of those services |
+| Vendor website, support service or Lightning training service unavailable | Version 1 customer-local login and deterministic workflows remain independent; a future installed Product Version 2 model must also be independent of these services |
 | Customer internet unavailable but local network intact | Local functions continue as supported; external integrations and vendor support delivery may be unavailable |
 | Employee cannot reach the customer network | No workspace access from that device until its approved route is restored |
 | Employee closes the browser | An accepted durable workflow continues on the customer server |
 | Runtime host or evaluation laptop stops | Services on that host stop unless the deployed recovery/failover profile takes over |
-| No supported local AI resources/model | Show AI unavailable; retain deterministic diagnosis, runbooks and escalation preparation without external-model fallback |
+| No supported local AI resources/model | Version 1: expected DEFERRED_V2 state, not a fault. Product Version 2: show AI unavailable; both retain deterministic help and escalation with no external-model fallback |
 
 A completely disconnected customer environment cannot proactively notify vendor support. Record local alerts, queued approved reports and unavailable channels honestly; the customer can export a permitted report through an approved manual transfer.
 
@@ -2386,6 +2428,10 @@
 
 **Acceptance:** A first-time operator can distinguish an unresolved vendor action from a completed internal action without reading raw logs.
 
+## VERSION 1 RULE-BASED FAILURE GUIDANCE
+
+Map observed error/reason codes to reviewed, versioned explanations and runbooks, with permission-filtered links to local action and verification records. Show the observed state and unresolved outcome separately from suggested checks. A timeout is not proof that an external effect failed, and a runbook match is not a verified root cause. Unknown conditions go to manual review or direct support; guidance cannot close a failed control or relabel it verified.
+
 ---
 
 <a id="orvia-section-49"></a>
@@ -2836,7 +2882,7 @@
 
 Track discovery precision, false positives, review decisions and freshness. Unknown assets remain unknown; a scanner cannot demonstrate that nothing exists outside its permissions. Reconcile new assets and changed destinations against approved purposes and owners.
 
-Use graph impact to identify affected policies, tests, legal assessments and owners after drift. Classify drift as informational, review-required or blocking according to deterministic approved rules. AI can explain the delta but cannot approve a newly inferred processing purpose.
+Use graph impact to identify affected policies, tests, legal assessments and owners after drift. Classify drift as informational, review-required or blocking according to deterministic approved rules. Product Version 2 AI can explain the delta but cannot approve a newly inferred processing purpose. Version 1 uses the observed diff, explicit rules and reviewed explanation templates.
 
 Extend approved data-flow checks to event streams, batch exports, analytics and customer AI retrieval surfaces as connectors become available. Avoid pretending that a generic REST connector provides comprehensive coverage of every API.
 
@@ -2848,16 +2894,18 @@
 
 # 63. AI ARCHITECTURE
 
+**Product-release scope:** Version 1 contains the deterministic core and may include the small rules-based Guided Assistance defined below. The custom-model architecture in this section is preserved for **Product Version 2 — DEFERRED_V2**, not required or enabled in Version 1. AI tools used by engineers to build the product are a separate matter and remain permitted.
+
 AI is an assistance layer.
 
-The architecture is:
+The retained long-term architecture is; the right-hand model branch is Product Version 2:
 
 ```text
                  ORVIA
                     │
         ┌───────────┴───────────┐
         │                       │
- DETERMINISTIC CORE          AI LAYER
+ DETERMINISTIC CORE          AI LAYER (PRODUCT V2)
         │                       │
  Graph                      Copilot
  Policy                     Discovery
@@ -2873,13 +2921,13 @@
 
 ## AI REMAINS INSIDE THE SAME DATA BOUNDARY
 
-For operational/customer content, all seven AI functions must use inference, retrieval, embeddings, model logs and tool execution inside the customer-controlled boundary. An approved ORVIA-owned model release running inside the customer environment is required for these AI functions in the current product; a third-party model is not an automatic substitute. If unavailable, report the affected AI capability unavailable and keep the deterministic platform running; never fall back to a vendor-hosted or public model endpoint.
+For operational/customer content, all seven AI functions must use inference, retrieval, embeddings, model logs and tool execution inside the customer-controlled boundary. When Product Version 2 is introduced, an approved ORVIA-owned model release running inside the customer environment is required for these AI functions; a third-party model is not an automatic substitute. If unavailable, report the affected AI capability unavailable and keep the deterministic platform running; never fall back to a vendor-hosted or public model endpoint.
 
 Development use of GPT/Claude does not authorise runtime transmission of customer data. Use synthetic fixtures for development and externally assisted demonstrations. Do not paste customer records, evidence, incident payloads, credentials or identifiable “redacted” excerpts into external coding chats.
 
 ## ORVIA INTELLIGENCE — PURPOSE-BUILT ASSISTANCE
 
-**Product decision:** build a dedicated ORVIA model family, provisionally called **ORVIA Intelligence**, for ORVIA/DPDP knowledge assistance, installation guidance, safe troubleshooting, explaining actual local records, drafting reviewed policy/workflow changes and generating scoped tests. Preserve every existing AI module in §§66–73. This is not a general-purpose public chatbot, legal decision-maker or autonomous system administrator.
+**Product Version 2 decision, on hold for Version 1:** build a dedicated ORVIA model family, provisionally called **ORVIA Intelligence**, for ORVIA/DPDP knowledge assistance, installation guidance, safe troubleshooting, explaining actual local records, drafting reviewed policy/workflow changes and generating scoped tests. Preserve every existing AI module in §§66–73. This is not a general-purpose public chatbot, legal decision-maker or autonomous system administrator.
 
 **Interpretation of “not using existing models”:** train the model's learned weights from random initialisation using the approved corpus. Do not use an existing third-party pretrained checkpoint, adapter, teacher-model distillation output or hosted foundation-model API as the product's underlying intelligence. A branded prompt around another model or a fine-tuned third-party model would be a different design and must not be presented as this from-scratch model.
 
@@ -2913,7 +2961,37 @@
 
 There is **no runtime request path from customer ORVIA to Lightning or a vendor inference API**, and no return path for customer prompts, outputs, feedback, gradients or operational records into training. Customer-held local context may support an answer without becoming training data.
 
-Use the local assistant before routine vendor escalation where useful, but provide a direct support route and deterministic runbooks at all times. AI failure, uncertainty or unavailability must never block critical reporting, rights handling or a legitimate request for human support.
+In Product Version 2, use the local model assistant before routine vendor escalation where useful, but provide a direct support route and deterministic runbooks at all times. AI failure, uncertainty or unavailability must never block critical reporting, rights handling or a legitimate request for human support.
+
+## VERSION 1 GUIDED ASSISTANCE — RULES, NOT A TRAINED MODEL
+
+**Permitted small intelligence layer:** locally evaluated, reviewed rules, decision trees, templates, catalogues and keyword/full-text retrieval. It must not load learned weights, call a model API, generate embeddings with a learned model, train from user activity or require GPU infrastructure. This is **Guided Assistance**, not ORVIA Intelligence/custom AI or a general-purpose chatbot.
+
+| Capability | Version 1 method | Required boundary |
+|---|---|---|
+| Explain an observed failure | Exact typed reason/error-code match to a versioned explanation and runbook | Explain recorded facts; never invent a root cause or external effect |
+| Find product guidance | Customer-local keyword/full-text search in reviewed, versioned documentation | Show source section/version; permission-filter restricted content before results/snippets |
+| Check configuration | Explicit schemas and approved rules for missing fields, unsupported actions or incompatible settings | A finding is a configured technical check, not a new legal requirement |
+| Suggest a next step | Deterministic decision tree using known state and connector capability | Suggestions are read-only; execution uses existing permissions, scope, approvals and verification |
+| Prepare policy/workflow/test drafts | Select reviewed templates and fill validated fields through forms | Label as template-based drafts, not natural-language AI generation; human review remains |
+| Summarise local activity | Fixed templates over authorised structured events and explicit counts | Show scope/time/source and unknowns; do not fabricate causation or a compliance score |
+| Prepare vendor escalation | Existing fixed-schema local exporter and a checklist | No free-form automatic upload, production logs or runtime record IDs; §31 still governs |
+
+**Smallest useful implementation:** error explanations, runbook links and configuration checklists. Add the other rows only when tested and not displacing core delivery. This assistance is optional and is not a Version 1 release blocker when omitted. Documentation, clear errors, manual administration and direct human support remain required even without the enhanced helper.
+
+A local guidance result should identify the rule/template ID and version, app/knowledge version, permitted supporting record references, observation time, match status, suggested step and approval requirement. Use explicit statuses such as `MATCHED_RULE`, `NO_MATCH`, `INSUFFICIENT_CONTEXT` and `REVIEW_REQUIRED`; do not display invented model confidence. A rule match is not proof of legal compliance or a verified incident cause.
+
+Example using synthetic states: “The connector reported `AUTH_FAILURE`. Review the credential/permission runbook. The downstream privacy action remains unresolved until execution and verification establish its outcome.” Unknown or stale evidence must remain unknown or stale.
+
+Rule, runbook and template packs are reviewed, versioned and distributed through signed ORVIA releases. Customer configuration stays local. Treat document text and external connector strings as data, not executable instructions. Pack changes cannot add arbitrary SQL/shell, extend permissions, enable outbound telemetry or alter legal interpretations without the appropriate review.
+
+No natural-language-to-action generation, hosted LLM fallback, local third-party small model, trained classifier, hidden embedding model, automatic model downloads or chat-history learning is part of Version 1. Name the actual mechanism in the UI and documentation. Deterministic automation already present in the policy, workflow, discovery, notification and test engines stays in Version 1; “AI on hold” does not mean “automation removed.”
+
+## VERSION 2 HANDOFF WITHOUT REBUILDING VERSION 1
+
+Reserve stable typed assistance requests/results and existing permission-scoped read APIs. A Version 1 provider kind can be `RULE_BASED`; `ORVIA_MODEL` is a future capability, not an installed dormant provider. Keep advice separate from action authority in both versions. The Version 2 adapter may use the same reviewed knowledge packs and output contract after its own evaluation, but cannot replace the deterministic policy engine, change accepted consent history or broaden vendor access.
+
+Training code, datasets, experiments, GPU allocation and model integration are not Version 1 tasks. Preserve their specification in §§64–65, 112–113 and 205. Restart that work under a future Version 2 plan with explicit ownership, budget, corpus review and release gates—not merely because the deadline pressure has passed.
 
 ---
 
@@ -2921,7 +2999,9 @@
 
 # 64. AI MODEL ABSTRACTION
 
-Do not hard-code ORVIA to one model version or inference engine. In the current product, the gateway serves approved ORVIA-owned model releases only; third-party pretrained models and hosted-model services are not active providers.
+**Product Version 2 — preserved future custom-model specification.** The complete training, model-routing, inference and release lifecycle below is on hold for Version 1. No step here is a Version 1 prerequisite or authorisation to start a training/GPU job. Version 1 uses only §63’s optional rules-based assistance.
+
+Do not hard-code ORVIA to one model version or inference engine. In Product Version 2, the gateway serves approved ORVIA-owned model releases only; third-party pretrained models and hosted-model services are not active providers.
 
 Create:
 
@@ -2958,7 +3038,7 @@
 
 ## MODEL ENGINEERING AND TRAINING LIFECYCLE
 
-All items below are required design/work items, not evidence of completed training. Training compute is separately authorised and budgeted; this document does not start jobs or commit spending.
+All items below are retained Product Version 2 design/work items, not Version 1 tasks or evidence of completed training. Training compute is separately authorised and budgeted; this document does not start jobs or commit spending.
 
 ### A. Corpus and source governance
 
@@ -3028,7 +3108,7 @@
 
 ### H. Decisions that remain measurable, not invented
 
-The final model architecture/size, corpus scale, GPU type/count, costs, runtime memory, supported languages and answer-quality thresholds require experiments and owner approval. This architecture selects the ownership/privacy route; it does not claim a trained model already exists or commit it to the prototype's 36-hour deadline. Keep all planned AI functions in scope while gating actual release capability by evidence.
+The final model architecture/size, corpus scale, GPU type/count, costs, runtime memory, supported languages and answer-quality thresholds require experiments and owner approval. This architecture preserves the Product Version 2 ownership/privacy route; it does not claim a trained model already exists or commit it to Version 1 or the prototype deadline. Keep all planned AI functions as DEFERRED_V2 while gating their later release by evidence.
 
 ---
 
@@ -3036,6 +3116,8 @@
 
 # 65. AI DATA-MINIMISATION
 
+**Release applicability:** the no-customer-data-training and minimisation rules remain binding in both versions. Model inference, model contexts and learned retrieval below are Product Version 2 only; Version 1 does not create those model stores. Version 1 rule/search/support records still obey the same local access, retention and no-vendor-export requirements.
+
 Before AI processing:
 
 ```text
@@ -3070,6 +3152,8 @@
 <a id="orvia-section-66"></a>
 
 # 66. AI PRIVACY COPILOT
+
+**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.
 
 Capabilities:
 
@@ -3118,6 +3202,8 @@
 
 # 67. AI DISCOVERY
 
+**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.
+
 The AI can suggest:
 
 ```text
@@ -3146,6 +3232,8 @@
 <a id="orvia-section-68"></a>
 
 # 68. AI POLICY BUILDER
+
+**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.
 
 User provides:
 
@@ -3178,6 +3266,8 @@
 
 # 69. AI WORKFLOW BUILDER
 
+**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.
+
 User describes desired behaviour.
 
 AI generates a workflow graph.
@@ -3210,6 +3300,8 @@
 <a id="orvia-section-70"></a>
 
 # 70. AI FAILURE ANALYSIS
+
+**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.
 
 Input:
 
@@ -3245,6 +3337,8 @@
 
 # 71. AI DRIFT ANALYSIS
 
+**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.
+
 Detect:
 
 ```text
@@ -3270,6 +3364,8 @@
 <a id="orvia-section-72"></a>
 
 # 72. AI INCIDENT ANALYSIS
+
+**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.
 
 AI can generate:
 
@@ -3288,6 +3384,8 @@
 
 # 73. AI TEST GENERATION
 
+**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.
+
 AI can inspect:
 
 - purpose
@@ -3312,6 +3410,8 @@
 <a id="orvia-section-74"></a>
 
 # 74. AI SAFETY RULES
+
+**Product Version 2 — DEFERRED_V2.** The custom-AI capability and model-specific requirements below are preserved future scope, not a Version 1 implementation or demonstration requirement. Version 1 may provide related deterministic forms, templates, search or runbooks under §63; these must not be represented as this trained-model feature.
 
 AI must never autonomously:
 
@@ -3406,6 +3506,10 @@
 
 A successful purchase grants the defined download/deployment rights for the full licensed runtime, not merely a connector linked to a mandatory vendor-hosted workspace. The purchase portal must clearly state the edition, supported deployment package, permitted installations/environments, support period, update rights and expiry/continuity terms before checkout. Enforce entitlements locally without counting or inspecting end-customer records for vendor billing.
 
+## PRODUCT VERSION DOES NOT EQUAL COMMERCIAL EDITION
+
+Foundation, Control and Enterprise continue within the Version 1 product architecture. Custom AI is Product Version 2 future scope in every edition; it is not a hidden Version 1 premium unlock. Licence issuance, renewal, expiry continuity and ordinary support must work without any model or AI subscription. Future AI entitlements require a supported released capability and separate customer activation, not merely a more privileged role.
+
 ---
 
 <a id="orvia-section-77"></a>
@@ -3433,6 +3537,10 @@
 - enterprise modules
 
 without separate codebases.
+
+## RELEASE AVAILABILITY PRECEDES ENTITLEMENT
+
+A capability is usable only when it is implemented and supported in the installed product release, enabled by a controlled rollout, permitted by the licence where applicable, and authorised for the actor. Version 2 AI is unavailable in Version 1 regardless of feature flags, paid edition or Vendor/Organisation Super Admin status. A flag cannot activate code, model artifacts or a service that the Version 1 package must not ship. This is release separation, not a separate edition-specific codebase.
 
 ---
 
@@ -3512,7 +3620,7 @@
 - Restricted processing
 - Children-focused policy pack
 - Advanced retention/destruction
-- Advanced local/private AI management and deployment
+- Advanced local/private AI management and deployment (Product Version 2 — deferred; not required for Version 1 Enterprise)
 - Restricted network
 - Air-gapped deployment capability where engineered and supported
 - Advanced connectors
@@ -3558,7 +3666,7 @@
 |---|---|---|
 | Foundation | Manage privacy operations | Guided applicability, full request/nomination intake, reviewable consent provenance, processor tasks, basic claim validation and one starter control package |
 | Control | Execute and enforce privacy controls | Revocation freshness, automated reconciliation, control-as-code, change simulation, broader verification and repeatable regression packages |
-| Enterprise | Engineer and continuously operate at scale | Group governance, advanced SDF workflows, deployment/resilience options, advanced guardian integrations, private AI and large-scale assurance |
+| Enterprise | Engineer and continuously operate at scale | Group governance, advanced SDF workflows, deployment/resilience options, advanced guardian integrations, private AI (Product Version 2) and large-scale assurance |
 
 Premium features can automate, scale, integrate and harden operations. They cannot make an unverified action appear verified in a lower edition. A tenant whose use case cannot be safely supported must be told the limitation—not silently operate without an applicable safeguard.
 
@@ -3572,7 +3680,11 @@
 
 Foundation, Control and Enterprise remain the editions. Standard Server, Kubernetes, Offline and Evaluation are deployment profiles of the same product. Vendor and customer role scopes are security boundaries, not commercial tiers. A paid support plan does not grant vendor access to production customer information.
 
-The ORVIA-owned model and model-management capacity can be packaged according to published entitlements and supported hardware. No edition may replace unavailable local AI with a third-party or vendor-hosted model to make the feature appear present. Essential privacy/security restrictions apply even when an advanced capability is not licensed.
+In Product Version 2, the ORVIA-owned model and model-management capacity can be packaged according to published entitlements and supported hardware. No edition may replace unavailable local AI with a third-party or vendor-hosted model to make the feature appear present. Essential privacy/security restrictions apply even when an advanced capability is not licensed.
+
+## VERSION 1 EDITIONS REMAIN COMPLETE WITHOUT A MODEL
+
+The complete licensed Version 1 runtime is the supported non-model product for its edition and deployment profile. All Version 1 editions omit custom AI; none may substitute a third-party model. The optional Guided Assistance is not a prerequisite to privacy enforcement or safety. Existing non-AI edition differentiation and rollout gates remain unchanged.
 
 ---
 
@@ -3642,6 +3754,10 @@
 Use a primary **Download ORVIA** action offering the canonical ZIP envelope defined in §85. The selected profile/architecture determines its contents; the operating system of the purchaser's browser does not choose the installation host silently. A model-training checkpoint URL at Lightning is not the official customer product download.
 
 Add a separate **Vendor Administration and Support Console** for Vendor Super Admin/Admin staff. It manages commercial accounts, assigned support cases, approved diagnostic receipts, known product defects, advisories and release/knowledge governance. Its customer card may show purchased rights and allowed support context—not client records, runtime members, live operational counts or an unobserved “healthy” status. See §96 for its permissions and case lifecycle.
+
+## VERSION 1 DOWNLOAD AND ACCOUNT WORDING
+
+The official source remains ORVIA’s vendor website/distribution cloud. Version 1 downloads contain the non-model platform, supported connectors and reviewed rule/runbook/documentation packs; no ORVIA model is required, bundled or advertised as available. Retain custom AI only as clearly labelled Product Version 2 roadmap content. Downloads, licence renewal and vendor staff support work without an assistant. Do not show a model download button, “AI enabled” badge or purchasable present-tense AI feature for Version 1.
 
 ---
 
@@ -3739,11 +3855,11 @@
 
 A guided local wizard should show what is complete, what remains untested, which permissions are requested and which actions become possible after approval. Avoid one-command claims that conceal DNS, identity, key, storage or network prerequisites. [M1 §§83–86]
 
-## CUSTOMER-LOCAL OWNER AND AI SETUP
+## CUSTOMER-LOCAL OWNER AND RELEASE-SCOPED ASSISTANCE SETUP
 
 At the protected local bootstrap, create the Organisation Super Admin using customer-controlled authentication. Establish a customer-held recovery route; invite Admins and Members; delegate supported subtenants/environments; keep commercial contacts distinct from runtime users. Never seed a vendor master account or ship default passwords.
 
-Offer an optional signed **ORVIA Intelligence** pack selection. Validate its signature, provenance, app compatibility and measured runtime prerequisites. Show local inference location, installed model/knowledge versions and disabled training/export. If no released supported model is available, show that limitation and continue with deterministic setup; never fetch an existing external model as a substitute.
+Version 1 may configure reviewed rule/runbook packs for Guided Assistance; it has no model/GPU/provider setup step. **Product Version 2 only:** offer an optional signed **ORVIA Intelligence** pack selection. Validate its signature, provenance, app compatibility and measured runtime prerequisites. Show local inference location, installed model/knowledge versions and disabled training/export. If no released supported model is available, show that limitation and continue with deterministic setup; never fetch an existing external model as a substitute.
 
 The installation wizard is a setup flow, not a fourth customer-facing business portal. The vendor-staff support console is separate internal tooling. Normal users need only the customer workspace address and authorised browser access.
 
@@ -3780,7 +3896,7 @@
 
 ## SECURE FULL-PRODUCT INSTALLATION
 
-Provide supported container/VM/service packages and deployment guides for the licensed profile. Include the console/API/portal, worker/orchestration, local stores, policy service, connectors and optional in-boundary AI components required by that profile. State resource and cloud-service prerequisites rather than implying an installer supports every infrastructure environment.
+Provide supported container/VM/service packages and deployment guides for the licensed profile. Include the console/API/portal, worker/orchestration, local stores, policy service, connectors and optional deterministic Guided Assistance for Version 1; in-boundary model components are reserved for Product Version 2 profiles. State resource and cloud-service prerequisites rather than implying an installer supports every infrastructure environment.
 
 The installer must verify signed manifests and artifact digests against a trusted release identity before execution; use a bootstrap trust process not dependent solely on an unverified checksum from the same download page. Create unique local administrator/bootstrap credentials, validate network/storage permissions, separate public portal ingress from private administration, and disable sample accounts/debug endpoints. Never execute an unreviewed remote script as an installation shortcut. Local setup must not upload customer records, cloud credentials or runtime secrets to ORVIA.
 
@@ -3804,7 +3920,7 @@
 
 Primary customer download: `ORVIA-<version>-offline-linux-<arch>.zip`. An all-supported-architecture ZIP can be offered when transfer size permits. Earlier `.tar.gz` offline examples remain subordinate engineering archive formats, not an alternative data-handling model.
 
-Include the exact required images, chart/configuration, verifier, independently bootstrapped trust information, release manifest, licence import, legal/security notes and required connector/rule/model packages or an explicit prerequisite list. An installer that silently pulls dependencies from public registries is not a complete offline installer.
+Include the exact required images, chart/configuration, verifier, independently bootstrapped trust information, release manifest, licence import, legal/security notes and required connector/rule packages or an explicit prerequisite list; model packages are Product Version 2 only. An installer that silently pulls dependencies from public registries is not a complete offline installer.
 
 Use a disconnected staging test. Verify install, restart, normal operation, licence renewal import, update, recovery and diagnostics export without hidden network calls. Specify trusted time and key-revocation/update handling for offline operation. Any external dependency must be disclosed rather than described as air-gapped.
 
@@ -3839,11 +3955,12 @@
   images/                  # actual required images for offline distribution
   migrations/
   connectors/
-  orvia-models/            # selected ORVIA-owned model pack; declared resources
+  knowledge/               # reviewed rules/runbooks/docs; no learned weights in V1
+  orvia-models/            # Product V2 only; excluded from Version 1 artifacts
   docs/                    # install, upgrade, security, restore, limitations
 ```
 
-ORVIA-owned model packs have explicit entitlement, distribution and hardware requirements. Include the selected signed pack in the customer ZIP or offer it as a separately signed ORVIA vendor download; publish the supported model/runtime matrix. The deterministic platform must operate when local AI is disabled. Under the strict boundary, no automatic external-model fallback is allowed. [M1 §§63–65, 85, 93]
+Future Product Version 2 ORVIA-owned model packs have explicit entitlement, distribution and hardware requirements. Include the selected signed pack in the customer ZIP or offer it as a separately signed ORVIA vendor download; publish the supported model/runtime matrix. The deterministic platform must operate when local AI is disabled. Under the strict boundary, no automatic external-model fallback is allowed. [M1 §§63–65, 85, 93]
 
 ## CANONICAL ONE-FILE DELIVERY DECISION
 
@@ -3851,13 +3968,17 @@
 
 This explicitly reconciles the earlier ZIP recommendation with later `.tar.gz` server/offline examples: **ZIP is the main customer-facing format; OCI/container archives, `.tar.gz` engineering exports, and Helm `.tgz` charts are internal or optional advanced deployment artifacts.** Preserve those useful deployment methods without presenting conflicting default file formats.
 
-The ZIP is not a universal native executable. It packages signed Linux service images, approved install/bootstrap tooling, manifests, migrations, docs, the selected Compose/Helm profile and selected ORVIA model/knowledge artifacts. Windows/macOS/Linux users see the same browser UI; supported runtime kernels, CPU architectures, storage and administrators are prerequisites [U2].
+The ZIP is not a universal native executable. It packages signed Linux service images, approved install/bootstrap tooling, manifests, migrations, docs, the selected Compose/Helm profile and reviewed knowledge artifacts; ORVIA model artifacts are added only in Product Version 2. Windows/macOS/Linux users see the same browser UI; supported runtime kernels, CPU architectures, storage and administrators are prerequisites [U2].
 
 To offer literally one customer download, wrap the unchanged signed release and separately signed customer licence in a delivery ZIP. Licence issuance must not modify application binaries or obtain release-signing authority. Renewal can deliver a new licence without redistributing the whole application.
 
-A declared complete/offline bundle contains the actual required images and selected AI/tokenizer/runtime dependencies, not a YAML file that secretly pulls them later. A missing optional model is marked missing/disabled; a missing required offline dependency fails preflight. No customer cloud credential or data record is sent to assemble the bundle.
+A declared complete/offline bundle contains the actual dependencies for its product release, not a YAML file that secretly pulls them later. Version 1 excludes all AI model/tokenizer/inference dependencies; a model’s absence is expected, not a preflight failure. Product Version 2 bundles include the selected approved AI dependencies, with unavailable optional AI explicitly labelled. A missing required non-AI offline dependency still fails preflight. No customer cloud credential or data record is sent to assemble the bundle.
 
 Safe unpacking must reject path traversal, unexpected absolute paths/symlinks, archive bombs and unlisted executable entries. Verify the manifest, trusted signer, digest, size limits and supported version policy before privileged installation. The verification bootstrap needs an independently established trust identity; a checksum on the same download page is not sufficient. Installer scripts are signed, reviewable entry points, not a remote `curl | shell` execution path.
+
+## VERSION 1 MANIFEST AND RESOURCE CONTRACT
+
+Record `product_major_version: 1`, the exact software build, supported profile/architecture, assistance mode (`RULE_BASED` or `NONE`), model capability (`DEFERRED_V2`) and actual dependency digests in the release manifest. Version 1 does not request a GPU, training account, model API key, weights, embedding service or inference container. Measure ordinary CPU/memory/storage needs for the shipped platform; no hardware minimum is invented here. Preserve Version 2 interfaces in documentation or non-executing contracts, not unnecessary live services or blank model provisioning steps.
 
 ---
 
@@ -3927,7 +4048,7 @@
 
 Docker Desktop's Windows documentation excludes Windows Server hosting; use the supported Linux VM route there, and review third-party runtime licences independently [U5]. Retain future native helpers and VM appliances without promising every host/hypervisor combination at launch.
 
-A training GPU on Lightning is not a GPU supplied to every installed customer. Each ORVIA model release needs measured CPU/GPU, memory, storage, context and concurrency support for customer-local inference. Offer an evaluated CPU-capable model profile or clearly declared customer-local GPU requirements where feasible. If the customer's hardware cannot run the released model, disable the AI capability explicitly rather than changing its data destination.
+Version 1 has no model/GPU resource requirement. For Product Version 2, a training GPU on Lightning is not a GPU supplied to every installed customer. Each ORVIA model release needs measured CPU/GPU, memory, storage, context and concurrency support for customer-local inference. Offer an evaluated CPU-capable model profile or clearly declared customer-local GPU requirements where feasible. If the customer's hardware cannot run the released model, disable the AI capability explicitly rather than changing its data destination.
 
 ---
 
@@ -3993,7 +4114,8 @@
 Connector health
 Error rates
 Latency
-AI request status
+Guided Assistance status (Version 1, when included)
+AI request status (Product Version 2 only)
 Test execution status
 License status
 
@@ -4008,6 +4130,10 @@
 Maintain a vendor-side **Support Attention** view based only on submitted cases, permitted report fields, advisory applicability and vendor service health. Link it to commercial account/licence/random installation references where allowed. Show `NOT_REPORTED`, `CUSTOMER_REPORTED`, `APPROVED_DIAGNOSTIC_RECEIVED`, `STALE_REPORT` or `AWAITING_CUSTOMER`; absence of a report is not proof of a healthy installation.
 
 Customer-local monitoring can be detailed because it stays under the organisation's role controls. The vendor cannot see the same dashboard simply by being Super Admin. Support can correlate identical approved product error codes across received cases without uploading underlying customer events or claiming complete fleet coverage.
+
+## EXPECTED MODEL ABSENCE IS NOT A VERSION 1 INCIDENT
+
+Do not mark a Version 1 installation degraded because a model, GPU or inference server is absent. Expose the custom-AI capability as DEFERRED_V2 only in version/capability information. If optional Guided Assistance fails, surface that limited helper fault while preserving core health, accepted workflows and direct human support. Vendor visibility remains restricted to the existing permitted support reports.
 
 ---
 
@@ -4140,13 +4266,17 @@
 
 The exact expiry/continuity terms must be stated in the licence policy. Do not promise indefinite unpaid operation or instant revocation of licences inside a fully disconnected installation. Signed update approval is not a vendor remote-control channel. [M1 §§31, 43, 93–96, 160]
 
-## ORVIA MODEL AND KNOWLEDGE RELEASES
+## ORVIA MODEL AND KNOWLEDGE RELEASES — MODEL ARTIFACTS ARE PRODUCT V2
 
 Treat trained weights, tokenizer/configuration, retrieval index schema and knowledge packs as separate versioned release artifacts. Vendor Super Admin/Admin can manage the appropriate review process, but release approval, signing and customer installation remain independently controlled. A training job or support agent cannot publish directly into the trusted customer channel.
 
 All official model/knowledge downloads are delivered through ORVIA's vendor-managed distribution cloud or verified customer mirrors, not direct operational access to Lightning. Include hashes, provenance, evaluation scope, supported app versions, required hardware and change/rollback notes. Customer-local inference needs no Lightning credentials.
 
 Knowledge updates must preserve authoritative source dates and review status. A new model cannot silently enable training from local records, external providers or expanded telemetry. Install/update tests check those conditions before and after every release.
+
+## VERSIONED UPGRADE PATH
+
+Version 1 may receive reviewed signed documentation, rule, template and runbook updates without model retraining or GPU access. Custom-model artifacts are not Version 1 updates. Introducing ORVIA Intelligence is a controlled Product Version 2 capability with separate compatibility, hardware, corpus, quality, security and privacy approval. An ordinary Version 1 patch or licence refresh cannot silently install it. Version 2 migrations must preserve customers’ roles, consent epochs, policies, workflows, evidence, data locality and support restrictions; continued core operation must not depend on enabling AI.
 
 ---
 
@@ -4179,9 +4309,13 @@
 
 ## LICENSING DOES NOT GRANT ADMINISTRATION OR MODEL ACCESS
 
-Commercial account, installation licence and local runtime identity are separate. A licence can enable an AI feature or model package entitlement; it cannot appoint an Organisation Super Admin, change local model/data destinations or carry a support command.
+Commercial account, installation licence and local runtime identity are separate. In Product Version 2, a licence can enable a released AI feature or model package entitlement; it cannot appoint an Organisation Super Admin, change local model/data destinations or carry a support command.
 
 When model entitlements or hardware are unavailable, show the correct capability state and preserve deterministic core operations/continuity. An offline model pack follows the same locally verified licence and approved update policy; no per-question vendor check is required.
+
+## VERSION 1 LICENCE STATE
+
+Version 1 software and every Version 1 licence treat custom AI as DEFERRED_V2, not an activation failure or an available paid unlock. No licence import, renewal or support permission may install a model or require inference. Model-pack and hardware-unavailable behaviour above is future Product Version 2 scope; the existing safety-preserving licence continuity policy is active in Version 1.
 
 ---
 
@@ -4234,7 +4368,7 @@
 
 ### Step 1 — Customer-local detection and assistance
 
-Local health/security checks notify the authorised organisation team. ORVIA Intelligence may explain authorised local context, retrieve a reviewed runbook and propose a diagnostic. It remains read-only by default; a typed diagnostic or repair runs only after deterministic permission/scope checks and the required customer approval. Critical conditions alert humans immediately and need not wait for the assistant.
+Local health/security checks notify the authorised organisation team. In Version 1, optional Guided Assistance uses explicit error rules and reviewed runbooks to explain known local states and suggest a catalogued diagnostic; otherwise the customer uses those runbooks directly. Product Version 2 ORVIA Intelligence may later explain authorised local context and propose a diagnostic. It remains read-only by default; a typed diagnostic or repair runs only after deterministic permission/scope checks and the required customer approval. Critical conditions alert humans immediately and need not wait for the assistant.
 
 ### Step 2 — Prepare a permitted support report locally
 
@@ -4283,6 +4417,10 @@
 
 Synthetic vendor test environments can be fully administered by the vendor because they contain vendor-created fictional fixtures, not customer operational copies. Do not describe that test access as access to the customer's production installation.
 
+## VERSION 1 SUPPORT CANNOT WAIT FOR AI
+
+Use the existing case, fixed-schema diagnostic, escalation, signed patch and customer-local verification flow from day one. No chatbot session, generated summary, training activity or model confidence score is required to report a fault. Guided Assistance can be bypassed. Critical alerts and human support remain available when that optional helper is omitted, fails or has no matching rule.
+
 ---
 
 <a id="orvia-section-96"></a>
@@ -4316,7 +4454,11 @@
 
 No customer should see another customer's support case or commercial records. Vendor Admins must not enumerate unassigned cases; authorised cross-case engineering review uses only approved minimal fields. Business support messages also require minimisation, access and retention. Maintain a quarantine/deletion workflow for accidental forbidden submissions rather than accepting them as normal support material.
 
-The console may host a vendor-local copy of the ORVIA model for searching vendor-authored documentation and synthetic reproductions. Keep it separate from customer instances and the training environment; do not train it on tickets or route customer runtime chats into it. Human support is responsible for the response and release decision.
+In Product Version 2, the console may host a vendor-local copy of the ORVIA model for searching vendor-authored documentation and synthetic reproductions. Keep it separate from customer instances and the training environment; do not train it on tickets or route customer runtime chats into it. Human support is responsible for the response and release decision.
+
+## VERSION 1 VENDOR SUPPORT EXPERIENCE
+
+Vendor Super Admin/Admin and support staff use assigned cases, approved diagnostic enums, ordinary documentation search, reviewed runbooks and synthetic reproductions. The vendor console does not require ORVIA Intelligence. No support case, conversation or resolution is admitted into a future training corpus. Direct customer-runtime administration and unrestricted data access remain forbidden.
 
 ---
 
@@ -4507,7 +4649,7 @@
 | Integrations and controls | Configure credentials locally, inspect capabilities/limitations, preview actions and operate supported control points |
 | Testing | Review expected versus actual behaviour, affected boundary, exact build, timestamp and evidence |
 | Evidence and reports | Inspect authorised records and generate locally controlled exports |
-| System settings | Customer users/roles, identity, certificates, storage, backup, keys, licence, updates, egress and in-boundary AI |
+| System settings | Customer users/roles, identity, certificates, storage, backup, keys, licence, updates, egress, optional V1 Guided Assistance and future Product V2 in-boundary AI |
 
 **Recommended landing views:** a privacy officer sees deadlines and unresolved outcomes; an engineer sees connector/control changes and regressions; an auditor sees read-only evidence; an IT administrator sees deployment health and maintenance. Server-side authorisation controls access—not hidden menu items alone. [M1 §§6–7, 103]
 
@@ -4563,9 +4705,13 @@
 
 ## NAVIGATION BY TRUST DOMAIN
 
-Retain every customer operational module above. Grouping for usability does not remove a module or bypass its permissions. Organisation Super Admin/Admin sees **Members & Roles**, **Environments/Subtenants**, **Systems**, **Local Health**, **Support**, **ORVIA Intelligence**, **Data Boundary**, **Licences** and **Updates** within authorised settings.
+Retain every customer operational module above. Grouping for usability does not remove a module or bypass its permissions. Organisation Super Admin/Admin sees **Members & Roles**, **Environments/Subtenants**, **Systems**, **Local Health**, **Support**, **Guided Assistance** (Version 1, when included), **ORVIA Intelligence** (Product Version 2 roadmap only), **Data Boundary**, **Licences** and **Updates** within authorised settings.
 
 ORVIA Account uses commercial navigation: Account Overview, Licences, Downloads, Billing, Commercial Members, Updates & Security, Support, and Guides. Vendor staff use the separate Administration and Support Console in §96. A Data Principal sees the customer-branded Privacy Centre, not either administrative menu. Product-level UI labels should always identify the current domain and role.
+
+## NO PLACEHOLDER AI WORKFLOW IN VERSION 1
+
+Keep everyday Version 1 navigation focused on working features. A future-capability catalogue may state “ORVIA Intelligence — planned for Product Version 2”; it must not offer an apparently working chat box, model selector, activation form or fabricated response. Label implemented help as “Guided Assistance — rules and reviewed runbooks.” Record feature/test status independently of roadmap visibility.
 
 ---
 
@@ -4758,7 +4904,7 @@
 | Secrets and cryptography | Maintained cryptographic libraries; encrypted transport/storage; customer runtime keys; separate release/licence keys; rotation and access audit | Key custody review, rotation/revocation tests and secret scans |
 | Data and evidence | Customer-local processing/storage; local access-scoped logs; no vendor operational feed; tamper-evident audit records; tested restore | Boundary tests, evidence-integrity tests and recovery exercises |
 | Build and distribution | Reviewed source/dependencies; isolated CI; versioned SBOM/provenance; authenticated release artifacts; secure update and rollback handling | Build attestation, scans and signature/update failure tests |
-| AI and plugins | Local inference for operational data; permission-filtered retrieval; strict tool broker; untrusted-content handling; isolated plugins | Injection, permission, forbidden-tool and data-leakage evaluations |
+| Assistance and plugins | Version 1: permission-scoped rules/search, untrusted-content handling and isolated plugins. Product Version 2 adds local inference and the strict AI tool broker | Test shipped surfaces for injection, permissions, forbidden operations and leakage; model-specific evaluations are Product Version 2 |
 | Operations and response | Local security monitoring; maintainable patches; accountable vulnerability intake; customer advisories; supported-version policy | Incident exercise, patch records, disclosure register and current assessment scope |
 
 For every control, record the threat, owner, implementation/build, applicable deployment, test method, result, date, limitations and unresolved findings. Security covers the vendor website/payment/download/signing systems **and** the customer runtime; the new local-data architecture does not remove supply-chain or insider threats.
@@ -4823,6 +4969,8 @@
 <a id="orvia-section-112"></a>
 
 # 112. AI SECURITY
+
+**Release applicability:** model-specific requirements in this section apply to **Product Version 2 — DEFERRED_V2**. Version 1 must still enforce authorisation, safe rendering, untrusted-content handling, bounded diagnostics and no model/egress fallback for any rules-based help. No model gateway or AI tool broker is a Version 1 dependency.
 
 AI requests must enforce:
 
@@ -4857,13 +5005,15 @@
 
 A self-trained model can still generate incorrect or unsafe output. Apply the same runtime constraints, independent review and evidence rules as for any AI component. OWASP's prompt-injection and excessive-agency guidance informs the threat model, not a claim that the risks are eliminated [U9].
 
-Model evaluation, privacy/security testing and deployment compatibility are separate gates. A low training loss does not establish useful support answers; high benchmark accuracy does not establish no data egress; training on a GPU does not establish customer CPU performance. Store the exact assessed artifacts, scripts, fixtures and results. All acceptance scenarios in §217 begin NOT_RUN until actually executed.
+Model evaluation, privacy/security testing and deployment compatibility are separate gates. A low training loss does not establish useful support answers; high benchmark accuracy does not establish no data egress; training on a GPU does not establish customer CPU performance. Store the exact assessed artifacts, scripts, fixtures and results. Applicable Version 1 scenarios in §217 begin NOT_RUN until executed; model-specific scenarios remain DEFERRED_V2 until the Version 2 programme starts. Neither label means passed.
 
 ---
 
 <a id="orvia-section-113"></a>
 
 # 113. AI TOOL-USE MODEL
+
+**Release applicability:** model-specific requirements in this section apply to **Product Version 2 — DEFERRED_V2**. Version 1 must still enforce authorisation, safe rendering, untrusted-content handling, bounded diagnostics and no model/egress fallback for any rules-based help. No model gateway or AI tool broker is a Version 1 dependency.
 
 AI should use explicitly permitted tools:
 
@@ -5031,6 +5181,10 @@
 
 Serve the runtime's HTML, JavaScript, fonts and other required assets from the customer deployment. Do not render the operational UI from the vendor site and quietly query a private backend, embed the workspace inside the vendor page or add vendor analytics. Restrict browser connections and isolate the public portal's privileges as part of the supported deployment. The UI should remain available when vendor internet access is blocked.
 
+## VERSION 1 BUILD GRAPH
+
+Preserve shared domain/UI/contracts and a documented future assistance extension. Build/package Version 1 without model-training, inference, learned-embedding or GPU services. Any future AI directory in the long-term repository outline is a Product Version 2 namespace, not a dependency of the Version 1 build, installer or runtime. Optional deterministic help may reuse existing packages; it does not need a separate orchestration framework.
+
 ---
 
 <a id="orvia-section-117"></a>
@@ -5187,6 +5341,8 @@
 
 ## Developer 12 — AI/ML Engineer
 
+The model responsibilities below are retained for Product Version 2. Version 1 assignments are defined at the end of this section.
+
 Owns:
 
 - AI gateway
@@ -5200,6 +5356,8 @@
 ---
 
 ## Developer 13 — AI Applications Engineer
+
+The model-application responsibilities below are retained for Product Version 2. Version 1 assignments are defined at the end of this section.
 
 Owns:
 
@@ -5319,7 +5477,7 @@
 | Core and authorization | 2, 3, 4, 5, 15 | Tenant/domain, graph, policy, consent semantics, durable execution and IAM |
 | Connected execution | 6, 7, 8 | Agent/SDK contracts, database and SaaS integrations, reconciliation and verification |
 | Product experience | 9, 10, 11 | Console, design/accessibility, portal, rights and nomination journeys |
-| Intelligence | 12, 13 | Safe AI gateway and applications; early work also supports fixtures and integration tooling |
+| Intelligence | 12, 13 | Version 1: rules/runbooks, synthetic fixtures, support and integration testing; Product Version 2: retained safe AI gateway and applications |
 | Trust and operations | 14, 16, 17, 18, 19, 20 | AppSec, infrastructure, SRE, QA, performance, releases and developer experience |
 
 The groups total 20 unique people. Every cross-cutting capability has one accountable primary owner and at least one trained reviewer/backup. Security and QA are embedded in design and implementation rather than added only at release.
@@ -5328,11 +5486,17 @@
 
 ## ADDITIONAL OWNERSHIP WITHIN THE EXISTING TEAM
 
-Retain all 20 roles. Developer 12 owns the ORVIA corpus/tokenizer/model-training pipeline, evaluation lineage and candidate model artifacts; Developer 13 owns grounded local assistance, knowledge packs and support/AI workflows. Developer 15 owns the independent vendor/customer role domains, delegated subtenants and recovery. Developers 9–11 own the separate Account, vendor-staff console, Workspace and Privacy Centre experiences.
+Retain all 20 roles. For Product Version 2, Developer 12 owns the ORVIA corpus/tokenizer/model-training pipeline, evaluation lineage and candidate model artifacts; Developer 13 owns grounded model assistance, knowledge packs and support/AI workflows. For Version 1, both focus on the deterministic assignments below. Developer 15 owns the independent vendor/customer role domains, delegated subtenants and recovery. Developers 9–11 own the separate Account, vendor-staff console, Workspace and Privacy Centre experiences.
 
 Developers 16 and 20 own signed platform/model delivery, offline packaging and controlled updates; Developer 14 owns support/training/supply-chain threat modelling; Developers 17–19 own local observability, model runtime benchmarks and negative tests. The architecture lead approves cross-domain contracts. Legal/content reviewers approve source interpretations and training-data reuse; product leadership approves compute spend and supported claims.
 
 A job title is not proof that all this capacity is staffed. Document actual owners and do not assume the prototype's two coding subscriptions include GPU budget, legal review, independent security assessment or ongoing support staffing.
+
+## CURRENT VERSION 1 ASSIGNMENTS FOR THE INTELLIGENCE ROLES
+
+Developer 12 supports deterministic validation rules, reviewed error taxonomy, rule/template fixtures, privacy-safe diagnostics and negative testing. Developer 13 supports the local runbook/keyword-search experience, configuration checklists, support workflow and end-to-end fixture coverage. Both assist core integration and QA before adding optional helper breadth.
+
+No Version 1 assignment requires corpus scraping, tokenizer training, checkpoint work, model evaluation, GPU provisioning or model-serving infrastructure. Those responsibilities remain recorded for Product Version 2. Platform/release, security and performance staff apply their existing disciplines to Version 1 artifacts now and to model artifacts later. Preserve all other role responsibilities. Actual staffing remains an explicit constraint, not something inferred from a 20-role chart.
 
 ---
 
@@ -5424,6 +5588,10 @@
 
 A feature is not complete until its storage locations and outbound paths are documented, its customer-local restrictions are tested, its dependency/configuration changes are reviewed, and applicable release-blocking security findings are closed and retested. Store executed results against the exact build. Planned scans, AI-generated tests and unexecuted checklists do not count as passed security evidence.
 
+## RELEASE-SCOPED DEFINITION OF DONE
+
+Version 1 completion is assessed against its released non-model capabilities and any included rules-based assistance, not against deferred custom-model tasks. Include evidence that install, login, actions, verification, tests, support and renewal work with model/Lightning endpoints absent and blocked. Mark Version 2 model requirements DEFERRED_V2 rather than passed or deleted. Optional guidance that misses acceptance is omitted or labelled unavailable without weakening core functionality or inventing success.
+
 ---
 
 <a id="orvia-section-121"></a>
@@ -5530,6 +5698,10 @@
 
 Every feature needs tests.
 
+## CODING AI IS STILL ALLOWED; PRODUCT AI IS DEFERRED
+
+The instruction to hold custom AI applies to the software’s learned-model features, not to using GPT, Claude or other authorised coding assistants to build/review/test ORVIA. Keep human review, secret protection, synthetic fixtures and the no-customer-data-sharing rule. A coding agent must not add a hosted model API, local pretrained model, embedding dependency or model-training job to Version 1 as a shortcut. A truthful roadmap label is permitted; a future feature must not masquerade as implemented production functionality.
+
 ---
 
 <a id="orvia-section-122"></a>
@@ -5596,11 +5768,11 @@
 
 Review scanner findings for affected version, reachability and impact. Preserve adjudication and independent review; do not silently delete or downgrade findings to clear a gate. Final signing/promotion requires the release owner’s and security owner’s approval, with no licence/checkout administrator able to bypass those controls.
 
-## PARALLEL MODEL RELEASE PIPELINE
+## MODEL RELEASE PIPELINE — PRODUCT VERSION 2, ON HOLD FOR VERSION 1
 
 Use a separately reviewed model pipeline: approved corpus manifest → leakage/dedup/source checks → tokenizer and random-initialisation provenance → bounded training → held-out evaluations → adversarial/privacy checks → runtime packaging/benchmark → independent review → signed model/knowledge manifest → vendor distribution → customer-authorised import.
 
-The production product pipeline consumes only an approved model artifact digest. A training run, notebook or vendor support ticket cannot directly publish to customers. Re-run compatibility and data-boundary tests when model, inference engine, tokenizer, knowledge or tool schemas change.
+A Product Version 2 pipeline that includes AI consumes only an approved model artifact digest. The Version 1 product pipeline has no model input, training stage or model-quality gate; it does validate any included rules/runbooks and the absence of model dependencies. A training run, notebook or vendor support ticket cannot directly publish to customers. Re-run compatibility and data-boundary tests when model, inference engine, tokenizer, knowledge or tool schemas change.
 
 ---
 
@@ -5671,7 +5843,7 @@
 
 Use synthetic identifying canaries and controlled customer/vendor endpoints. Observe network destinations and inspect payloads at controlled endpoints/proxies before encryption or after authorised test termination; seeing only encrypted packets is not proof that they contain no personal data. Also inspect browser calls, DNS requests, logs, telemetry collectors, support archives, update requests, licensing fields and AI traces.
 
-Exercise installation, login, discovery, consent/rights operations, local AI, external-provider failure, notification delivery, licence renewal/expiry, diagnostics, crashes, updates, backup and restore. Verify that vendor stores contain only the permitted schema fields and that operational canaries never reach them. Test blocked/unknown fields as well as apparently safe hashes and encoded values. Match findings to exact deployments and builds.
+Exercise Version 1 installation, login, discovery, consent/rights operations, any included Guided Assistance, absent/blocked model paths, supported external-integration failure, notification delivery, licence renewal/expiry, diagnostics, crashes, updates, backup and restore. Add actual local-model inference and model-provider-fallback tests for Product Version 2. Verify that vendor stores contain only the permitted schema fields and that operational canaries never reach them. Test blocked/unknown fields as well as apparently safe hashes and encoded values. Match findings to exact deployments and builds.
 
 Attempt tenant/role bypass, excessive destructive scope, command replay, forged or stale licence/update material, compromised plugin access, vendor-identity reuse against runtime APIs and unsafe support access. Independent security review must include business-logic abuse and the customer/cloud trust boundary, not only vulnerability-scanner output. The additive scenarios in §217 make these obligations testable; none is marked executed by this document.
 
@@ -5710,7 +5882,7 @@
 - database
 - object storage
 - search
-- AI
+- AI (Product Version 2 model paths; Version 1 tests deterministic help/search isolation)
 - logs
 - evidence
 - support bundles
@@ -5799,7 +5971,8 @@
 Policy
 Connector management
 Testing
-AI
+Guided Assistance (Version 1, if included)
+AI (Product Version 2 only)
 
 ```
 
@@ -5854,6 +6027,10 @@
 Vendor training corpora/checkpoints and approved experiment logs have a vendor engineering retention policy; none may contain customer-derived data. Customer runtime prompts, local retrieval indexes, support drafts and inference caches have customer-local retention. Vendor submitted support cases retain only approved minimal fields under their separate policy.
 
 Deleting a local conversation should remove its retained payload/index/cache according to the documented local rules, without any need to contact a model-training service. No automatic support-history-to-training pipeline is permitted. Corrected public sources and removed corpus items trigger a documented impact review for knowledge packs and any affected model release; do not claim weights forget a training item merely because a source file is deleted.
+
+## VERSION 1 HELP DATA IS NOT A FUTURE TRAINING CORPUS
+
+Version 1 guidance inputs, query history, local support drafts and rule-match evidence remain customer-local with purpose-limited retention. They are not collected now for later custom-model training. Do not create empty prompt/embedding/training stores merely for completeness; create only the actual data structures needed by the shipped non-model functions. The model/conversation retention requirements above remain binding when Product Version 2 is introduced.
 
 ---
 
@@ -5982,6 +6159,10 @@
 ```
 
 This single vertical slice should prove the architecture.
+
+## VERSION 1 ACCEPTANCE WITHOUT A MODEL
+
+The withdrawal-to-verification-to-regression slice is a Version 1 core target and must work with no model service, GPU, model-provider key or training infrastructure. Optional Guided Assistance may explain an observed result through a reviewed rule, but cannot perform or certify the action. Its absence does not block the slice. Keep the corresponding negative, failure, identity, approval and data-boundary tests.
 
 ---
 
@@ -6017,12 +6198,16 @@
 | 1 — Core operations | Customer-installable runtime, local portal/rights intake, purposes/notices/consent, one DB and one API path, failure center, verification and a real regression | Local withdrawal works end-to-end; stale/duplicate events, wrong identity and timeout tested; no customer payload reaches vendor endpoints |
 | 2 — Control | SDK/runtime boundaries, propagation, safe execution plans, richer connectors and verification | Measured freshness; replay protection; uncertain-outcome reconciliation; production dry-run evidence |
 | 3 — Testing | Full synthetic test product, CI adapters, change simulation, drift and control-package library | A seeded privacy regression blocks a test release and identifies its owner/control |
-| 4 — Enterprise | Advanced customer-cloud/fleet deployment, enterprise IAM, resilience, support controls, restricted networking and private-AI management | Advanced install, restore, upgrade, isolation and handover pass; baseline local processing remains mandatory from earlier phases |
+| 4 — Enterprise | Advanced customer-cloud/fleet deployment, enterprise IAM, resilience, support controls, restricted networking and private-AI management (Product Version 2 only) | Advanced install, restore, upgrade, isolation and handover pass; baseline local processing remains mandatory from earlier phases |
 | 5 — Advanced | Advanced incidents/retention, advanced children/guardian automation, processor ecosystem, customer AI governance and CM interoperability | Capability-specific legal, integration, security and conformance evidence |
 
 Baseline safe guardian handling, incident intake and nomination are not postponed until advanced packs exist. If a pilot use case requires unavailable safeguards, narrow the supported deployment or implement the prerequisite before production.
 
 Do not market a phase as released because its UI is present. Each phase needs an unsupported-capability list, runbook, rollback/forward-recovery procedure and customer-facing known limitations.
+
+## PHASES DO NOT REINTRODUCE CUSTOM AI INTO VERSION 1
+
+The retained phase table remains the non-AI delivery/dependency plan. Any model-dependent item within it is Product Version 2 only, regardless of its phase number; custom AI cannot become an implicit predecessor for Enterprise features. Existing future customer-AI-governance/interoperability scope stays separately gated as originally described, not accelerated or removed by this update.
 
 ---
 
@@ -6110,7 +6295,7 @@
 - advanced audit
 - restricted deployment
 - advanced security
-- advanced private/local AI deployment and management
+- advanced private/local AI deployment and management (Product Version 2 — deferred; not a Version 1 Enterprise prerequisite)
 
 ---
 
@@ -6125,7 +6310,7 @@
 - restricted/children policy packs
 - advanced identity
 - advanced processor automation
-- sophisticated AI
+- sophisticated AI (Product Version 2 — deferred)
 - Consent Manager interoperability
 
 ---
@@ -6185,6 +6370,18 @@
 Rollback instructions
 
 ```
+
+## PRODUCT VERSION 1 / VERSION 2 RELEASE CONTRACT
+
+**Version 1 baseline:** retain all current non-AI product commitments and existing non-AI rollout gates. Release only implemented/tested capabilities with an explicit support matrix. A model-free product is intentional, not an installation defect. Optional deterministic guidance may be included after testing.
+
+**Version 2 future scope:** custom ORVIA Intelligence training, model gateway/inference, model-driven discovery/copilot/builders/analysis/test generation, model distribution and model-specific quality/safety gates. Keep those specifications intact. No training/integration is scheduled by this revision; model work resumes through a separately authorised Version 2 work plan.
+
+The release manifest and capability register distinguish `product_version`, `build_id`, `document_revision`, `target_release`, `implementation_status`, `test_status`, `supported_profile`, `edition_entitlement` and `enabled_state`. Use `DEFERRED_V2` for the future model scope, not `FAILED`, `PASSED` or “premium enabled.”
+
+Promotion from a Version 1 prototype to pilot or production still needs the existing readiness, security, installation and customer acceptance evidence. Renaming the baseline Version 1 is not that promotion. A tight deadline does not waive those gates. The earlier prototype plan and AI prompt pack are historical planning inputs and must not override the release assignment in this master.
+
+Version 2 should be an upgrade/extension of the same product and domain model. Preserve deterministic operation when the model is absent or disabled; reviewed migrations, known limitations, rollback/forward recovery, consent ordering, retained evidence and customer-controlled activation remain required.
 
 ---
 
@@ -6375,7 +6572,7 @@
 
 Language content should be versioned.
 
-AI-generated translations require review before publication for legally significant notices.
+Product Version 2 AI-generated translations require review before publication for legally significant notices. Version 1 uses reviewed language content and templates; the AI deferral does not remove applicable localisation requirements.
 
 ## PRESERVATION AND AMENDMENT REGISTER
 
@@ -6418,7 +6615,8 @@
 Data retention
 Notifications
 Connectors
-AI settings
+Guided Assistance settings (Version 1, if included)
+AI settings (Product Version 2 only)
 Deployment
 Support
 Licensing
@@ -6430,7 +6628,7 @@
 
 Organisation Super Admin configures organisation identity, scoped environments/subtenants, role delegation, local recovery and supported installation policy. Organisation Admin manages assigned members/systems and approved operations. Members get only explicitly delegated tasks and views. Preserve specialised officer, security, engineer and auditor permissions; do not use a single broad admin flag.
 
-Add **Members & Roles**, **Environments/Subtenants**, **Local Health**, **Data Boundary**, **ORVIA Intelligence**, **Knowledge Packs**, **Local Support**, **Licence Import** and **Updates** within the existing settings organisation. Show current model/knowledge/app versions, inference location, tested hardware, AI enabled/unavailable status, disabled learning, and supported functions. Show exactly which optional support-signal rules are enabled, their fields, last transmission and revocation controls.
+Add **Members & Roles**, **Environments/Subtenants**, **Local Health**, **Data Boundary**, **Guided Assistance** (Version 1), **ORVIA Intelligence** (Product Version 2 roadmap), **Knowledge Packs**, **Local Support**, **Licence Import** and **Updates** within the existing settings organisation. In Version 1, show installed app/rule/runbook versions, local guidance mode and actual supported functions; state custom AI is DEFERRED_V2 without a model setup requirement. In Product Version 2, show model/knowledge/app versions, inference location, tested hardware, AI enabled/unavailable status, disabled learning, and supported functions. Show exactly which optional support-signal rules are enabled, their fields, last transmission and revocation controls.
 
 Administrative visibility is limited to necessary authorised product activity. It must not create vendor visibility into staff, systems or client records. Distinguish customer group administration from vendor commercial-account management.
 
@@ -6575,9 +6773,13 @@
 
 ## ADDITIONAL RELEASE GATES FOR DELIVERY, ADMINISTRATION AND OWN AI
 
-Do not release this feature set without executed evidence for: separate vendor/customer login and recovery; no vendor super-admin override; member/subtenant isolation; signed package/model verification; correct unsupported-platform rejection; local UI and inference with vendor/Lightning routes blocked; permitted-only support reports; no support-command bypass; and model corpus/origin/evaluation checks.
+For Version 1, require executed evidence for: separate vendor/customer login and recovery; no vendor super-admin override; member/subtenant isolation; signed software/knowledge package verification; correct unsupported-platform rejection; local UI and core operation with vendor/model/Lightning routes blocked; permitted-only support reports; and no support-command bypass. Test any included deterministic guidance. Model corpus/origin/evaluation and operational inference gates are retained for Product Version 2, not Version 1 prerequisites.
 
 An own-model checkpoint must not be labelled a released trained assistant until its declared functions and languages pass approved quality/safety tests. Platform release and AI research can progress separately, with the AI state truthful. Existing critical/high/security blockers and independent review remain unchanged.
+
+## MODEL DEFERRAL DOES NOT DEFER PLATFORM SECURITY
+
+Version 1 still requires all applicable non-AI threat modelling, vulnerability remediation/retesting, least privilege, isolation, safe execution, supply-chain verification, independent assessment and data-egress controls. Explicitly test that model endpoints and dependencies are absent rather than counting unexecuted model tests as passing. Missing optional guidance is not a reason to waive authentication, evidence, support or any blocking security failure.
 
 ---
 
@@ -6591,11 +6793,11 @@
 - architecture review
 - cloud security review
 - connector security review
-- AI security review
+- AI security review (Product Version 2; Version 1 still reviews all shipped guidance/search/support surfaces)
 
 ## INDEPENDENT ASSESSMENT AND CONTINUOUS VULNERABILITY RESPONSE
 
-Assess the complete initial production surface: public website/account/checkout, package distribution/signing, licensing, customer console/portal/API, tenant isolation, agent/connectors, AI, storage, egress, updates, deployment defaults and recovery. Use qualified reviewers independent of the implementation authors. Retest fixes and reassess material changes, especially authentication, authorisation, connectors, upload handling, updates and data destinations. Testing two AI-generated reviews against one another is not an independent penetration test.
+Assess the complete initial production surface: public website/account/checkout, package distribution/signing, licensing, customer console/portal/API, tenant isolation, agent/connectors, any shipped deterministic guidance/search, storage, egress, updates, deployment defaults and recovery; add model/inference/training surfaces for Product Version 2. Use qualified reviewers independent of the implementation authors. Retest fixes and reassess material changes, especially authentication, authorisation, connectors, upload handling, updates and data destinations. Testing two AI-generated reviews against one another is not an independent penetration test.
 
 Create a product security response function with an accountable owner before production. Publish a monitored vulnerability-reporting channel and disclosure policy, supported versions/end-of-support dates, coordinated advisory process and a staffed patch/mitigation process. Review new dependency vulnerabilities throughout supported life; customers receive advisories and signed fixes without uploading operational data. A bug bounty may be added when scope and response capacity exist, but is not a substitute for secure engineering.
 
@@ -6769,6 +6971,10 @@
 
 “Vendor-managed support” means the permitted support capabilities in §§95–96, not invisible access to customer production. “One download format” means the documented bundle envelope, not no prerequisites or a native executable for every OS. Describe every support/model/deployment profile by its actual tested scope.
 
+## VERSION 1 INTELLIGENCE CLAIMS
+
+For Version 1 use “rules-based Guided Assistance,” “reviewed runbooks,” “template-based drafts” or “deterministic configuration checks” only when implemented and tested. Do not claim custom AI, a trained assistant, an LLM copilot, natural-language generation or model-based reasoning. “Custom ORVIA Intelligence is planned for Product Version 2” is a roadmap statement, not an available paid feature, completed training claim or promised delivery date. Core privacy-control value remains the product promise.
+
 ---
 
 <a id="orvia-section-169"></a>
@@ -7223,6 +7429,10 @@
 
 Changing any of these needs an explicit decision record, affected-section update, privacy/security impact review and tests. In particular, pretrained-weight adoption or vendor production access is not an implementation convenience that can be selected silently.
 
+## D-08 — VERSION 1 MODEL-FREE BASELINE; CUSTOM AI IN PRODUCT VERSION 2
+
+Adopt the current user decision as **D-08**. Decisions D-01–D-04 remain active; D-05–D-07 retain the future model architecture, but their training/inference implementation is explicitly assigned to Product Version 2 and is on hold for Version 1. Do not reopen the agreed no-third-party-weights or no-customer-training-data decisions as an unannounced shortcut. Record optional deterministic Guided Assistance in §63 as the Version 1 implementation boundary. This is a release-scope decision, not a claim that work has been implemented.
+
 ---
 
 <a id="orvia-section-188"></a>
@@ -7235,6 +7445,10 @@
 
 AI may accelerate implementation, but architecture, security and release responsibility remain with the engineering team.
 
+## DEVELOPMENT-AI DISTINCTION
+
+GPT/Claude and other company-authorised coding tools may continue assisting architecture, implementation, tests and documentation for Version 1. Their use does not make the shipped product AI-dependent, train the future ORVIA model or authorise customer-data disclosure. All original human review and release responsibility requirements remain.
+
 ---
 
 <a id="orvia-section-189"></a>
@@ -7303,13 +7517,22 @@
  ↓
 Enforcement
  ↓
-AI
- ↓
-Enterprise
+Enterprise capabilities through their existing gates
+ ↓
+Version 1 acceptance and release
+
+Optional parallel Version 1 task: small rules-based Guided Assistance
+
+Future Product Version 2:
+Custom-AI research/training → evaluation → local integration → release gates
 
 ```
 
 Each stage must compile and test before the next.
+
+## DO NOT SPEND THE VERSION 1 DEADLINE ON MODEL WORK
+
+Build and verify the core outcome slice, customer-local installation, access boundaries, safe support and release/recovery path first. Optional rule/runbook assistance follows only when it does not displace those tasks. Do not start GPU jobs, build a training corpus or integrate an existing model to fill the deferred feature slot. Development AI remains available to accelerate these non-model tasks under the established review process.
 
 ---
 
@@ -7351,9 +7574,9 @@
 
 A deliberate code change bypasses the SDK in the test environment. The regression suite detects the seeded violation and identifies the affected boundary. The bypass is repaired; tests pass against the same synthetic scope. An old backup is restored in quarantine and the restriction is reapplied before simulated traffic resumes.
 
-Finally disable the AI gateway: every deterministic operation still works. Copilot, when restored, explains the factual sequence with links to actual records and does not invent an explanation for missing vendor evidence.
-
-**Completion:** The demonstration includes success, delay, unsupported capability, out-of-order delivery, regression, restoration and AI outage. It establishes tested behavior within this scope, not universal privacy compliance.
+For the Version 1 demonstration, run with no AI gateway, weights, GPU or model-provider credentials installed: every deterministic operation and direct support path must still work. Optional Guided Assistance may show a rule/runbook-backed explanation with links to permitted actual records, without claiming model reasoning. For the future Product Version 2 demonstration, also disable and restore its model; Copilot must explain the factual sequence without inventing missing vendor evidence.
+
+**Completion:** The demonstration includes success, delay, unsupported capability, out-of-order delivery, regression, restoration and model-independent operation (plus AI outage when Product Version 2 is evaluated). It establishes tested behavior within this scope, not universal privacy compliance.
 
 ---
 
@@ -7433,7 +7656,7 @@
 
 Using synthetic fixtures, demonstrate purchase/entitlement issuance in a clearly labelled test checkout, download and local signature verification, full runtime installation, consent withdrawal and local evidence. Block vendor runtime access while a valid local licence remains available; the deterministic workflow must continue.
 
-Show a local outbound-data log and controlled vendor endpoint captures containing only the permitted licence schema. Attempt an injected customer-data field in licensing/diagnostics and demonstrate rejection without persisting the body. Reject a tampered package, a vendor account token presented to the runtime, a cross-tenant request and an unauthorised connector command. Show that AI cannot fall back to an external provider and that the support bundle excludes operational data.
+Show a local outbound-data log and controlled vendor endpoint captures containing only the permitted licence schema. Attempt an injected customer-data field in licensing/diagnostics and demonstrate rejection without persisting the body. Reject a tampered package, a vendor account token presented to the runtime, a cross-tenant request and an unauthorised connector command. For Version 1, show there is no model/provider fallback path and that the support bundle excludes operational data. Product Version 2 additionally demonstrates a failed/absent local model cannot fall back externally.
 
 These are acceptance demonstrations to implement and execute. A successful synthetic run must be described by its scope; it does not by itself establish production security or absence of all vulnerabilities.
 
@@ -7490,6 +7713,10 @@
 
 Vendor support measures case response/reproduction/fix/validation time from permitted case records. Local assistant effectiveness and detailed runtime outcomes remain customer-local; do not secretly export them as “AI improvement” telemetry. Do not set a support-deflection target that blocks escalation or encourages the assistant to falsely close cases.
 
+## VERSION 1 SUCCESS MEASURES
+
+Evaluate Version 1 using the existing installability, first supported privacy outcome, connector reliability, failure/recovery, security, customer acceptance and support-effort measures. Model training/accuracy/latency measures above belong to Product Version 2 research. For included Guided Assistance, assess correct rule/runbook selection, evidence links, safe escalation and actual usability on synthetic fixtures; do not optimise for preventing legitimate support contact. No model-readiness score or newly invented success guarantee is needed to judge the core product.
+
 ---
 
 <a id="orvia-section-196"></a>
@@ -7589,7 +7816,7 @@
 Children/Restricted Processing
 Advanced Evidence
 Additional Connectors
-Private AI
+Private AI (Product Version 2 — future custom model)
 
 ```
 
@@ -7626,7 +7853,9 @@
                       │
                 DRIFT DETECTION
                       │
-                    AI LAYER
+        GUIDED ASSISTANCE (VERSION 1, OPTIONAL RULES)
+                      │
+        CUSTOM AI LAYER (PRODUCT VERSION 2 ONLY)
 
 ```
 
@@ -7657,7 +7886,8 @@
                   ▼
 CUSTOMER ORGANISATION / CUSTOMER-CONTROLLED CLOUD
   ORVIA console + portal + APIs + local identity
-  Graph + policies + workflows + local AI (when supported)
+  Graph + policies + workflows + optional rules-based Guided Assistance (V1)
+  Custom local ORVIA Intelligence: Product Version 2 only
   Databases + verification + evidence + tests + local telemetry
                   │
             Customer connectors
@@ -7696,11 +7926,11 @@
 
 ## AUTHORITY AND AI LOCATION SUMMARY
 
-The vendor cloud hosts ORVIA Account, the separate Vendor Administration and Support Console, commerce/licensing and signed distribution. Vendor Super Admin/Admin govern those services. Lightning hosts authorised non-customer model-development jobs only and has no customer-runtime relationship.
-
-Each customer hosts ORVIA Workspace, its Privacy Centre, Organisation Super Admin/Admin/Member roles, any supported subtenants, operational services and the approved local ORVIA model. The same signed model may be installed for different customers, but their inference contexts, data stores, role bindings and caches remain separate. No cross-customer model memory or training feedback is introduced.
-
-Software/model/knowledge artifacts flow from vendor distribution to the customer by approved download. Only explicitly permitted commercial/licence/support information can flow back; operational or personal information cannot. Offline import preserves that direction without requiring runtime callbacks.
+The vendor cloud hosts ORVIA Account, the separate Vendor Administration and Support Console, commerce/licensing and signed distribution. Vendor Super Admin/Admin govern those services. Lightning is reserved for future Product Version 2 authorised non-customer model-development jobs and has no customer-runtime relationship; Version 1 starts no such jobs.
+
+Each customer hosts ORVIA Workspace, its Privacy Centre, Organisation Super Admin/Admin/Member roles, any supported subtenants, operational services and any included rules-based Guided Assistance in Version 1. Product Version 2 adds an approved local ORVIA model. The same signed future model may be installed for different customers, but their inference contexts, data stores, role bindings and caches remain separate. No cross-customer model memory or training feedback is introduced.
+
+Software/knowledge artifacts and, in Product Version 2, model artifacts flow from vendor distribution to the customer by approved download. Only explicitly permitted commercial/licence/support information can flow back; operational or personal information cannot. Offline import preserves that direction without requiring runtime callbacks.
 
 ---
 
@@ -7740,9 +7970,9 @@
 
 ## OFFICIAL SOURCE AND SUPPORTED FILE FORMAT
 
-ORVIA's website and vendor-controlled distribution cloud remain the official source of the complete licensed software, signed licence, supported connector packages, ORVIA Intelligence model/knowledge packs and updates. Customer-hosted execution does not turn ORVIA into a customer-built product or transfer distribution responsibility to Lightning.
-
-Use the §85 primary ZIP envelope for selected Server/Kubernetes/Offline/Evaluation artifacts, with separately signed licences and optional model packs where needed. Supported private-registry mirrors and engineering archives preserve the original vendor signatures/digests. Three editions, one product and consistent browser experiences remain intact.
+ORVIA's website and vendor-controlled distribution cloud remain the official source of the complete licensed software, signed licence, supported connector packages, reviewed knowledge/runbook packs and updates; ORVIA Intelligence model packs are added only for Product Version 2. Customer-hosted execution does not turn ORVIA into a customer-built product or transfer distribution responsibility to Lightning.
+
+Use the §85 primary ZIP envelope for selected Server/Kubernetes/Offline/Evaluation artifacts, with separately signed licences; optional model packs belong to Product Version 2 only, not Version 1. Supported private-registry mirrors and engineering archives preserve the original vendor signatures/digests. Three editions, one product and consistent browser experiences remain intact.
 
 ---
 
@@ -7769,6 +7999,8 @@
 <a id="orvia-section-205"></a>
 
 # 205. FINAL AI MODEL
+
+**Version 1:** the core operates without a learned model; optional Guided Assistance uses reviewed deterministic rules/runbooks/templates. **Product Version 2:** the custom AI described below is preserved as future scope and is on hold for Version 1. These labels concern the product’s runtime, not AI-assisted engineering.
 
 AI is:
 
@@ -7802,7 +8034,7 @@
 
 ## THE ORVIA-OWNED MODEL DECISION
 
-Use approved ORVIA Intelligence weights trained from scratch on reviewed non-customer public/licensed knowledge and ORVIA-authored synthetic/product material. Lightning AI may supply authorised development GPUs; customer-local inference does not use Lightning, vendor-hosted inference or third-party model APIs.
+In Product Version 2, use approved ORVIA Intelligence weights trained from scratch on reviewed non-customer public/licensed knowledge and ORVIA-authored synthetic/product material. Lightning AI may supply authorised development GPUs; customer-local inference does not use Lightning, vendor-hosted inference or third-party model APIs.
 
 The model explains, suggests, drafts and assists troubleshooting before optional vendor escalation. Reviewed local knowledge provides current source context; deterministic services enforce permissions, support-export schemas, approvals, actions and verification. Customer data is never used for model training, including conversational learning or federated updates.
 
@@ -7918,21 +8150,27 @@
 
 The engineering team must deliver:
 
-> **A production-grade, multi-tenant, website-distributed and customer-hosted DPDPA Privacy Control Platform with a customer-side secure connector architecture, a common Privacy Control Graph, policy-driven privacy execution, consent and rights management, runtime controls, verified evidence, privacy regression testing, privacy incident analysis, AI assistance, three commercial editions, enterprise deployment capabilities, licensing, secure support, observability and continuous extensibility.**
+> **A production-grade, multi-tenant, website-distributed and customer-hosted DPDPA Privacy Control Platform with a customer-side secure connector architecture, a common Privacy Control Graph, policy-driven privacy execution, consent and rights management, runtime controls, verified evidence, privacy regression testing, privacy incident analysis, optional deterministic Guided Assistance in Version 1 and custom AI assistance in Product Version 2, three commercial editions, enterprise deployment capabilities, licensing, secure support, observability and continuous extensibility.**
 
 The platform must be modular, secure, testable, observable and upgradeable, with the complete operational runtime inside the customer boundary. ORVIA vendor infrastructure must not become a recipient or repository of customer operational/personal data. Only the minimum information explicitly allowed by §31 may reach vendor services. Apply the security assurance and release gates in §§109, 163–164 and 206.
 
 ## DELIVERY, ADMINISTRATION AND OWN-MODEL COMPLETENESS
 
-Completion includes the full vendor-distributed/customer-hosted delivery path, three customer-facing experiences, the separate vendor-staff support console, scoped vendor and customer role domains, safe diagnostics and signed maintenance, and the evaluated customer-local ORVIA Intelligence capability where claimed. Preserve the original platform modules and edition scope.
+Completion includes the full vendor-distributed/customer-hosted delivery path, three customer-facing experiences, the separate vendor-staff support console, scoped vendor and customer role domains, safe diagnostics and signed maintenance, and, separately for Product Version 2, the evaluated customer-local ORVIA Intelligence capability where claimed. Preserve the original platform modules and edition scope.
 
 No product-level dependency may quietly reintroduce customer-data uploads, vendor super-admin access to runtime records, external pretrained inference, customer-data training or a Lightning runtime dependency. Treat unbuilt or untested capabilities as such, not as implied completion of the master.
 
+## CURRENT EXECUTION OBJECTIVE
+
+Complete the supported Version 1 product, with the customer-hosted boundary, secure signed distribution, independent vendor/customer roles, working privacy outcomes, evidence/tests and safe human support. Preserve all original non-AI scope and existing rollout qualifications. Keep custom ORVIA Intelligence fully specified but out of the Version 1 critical path. Make success measurable through demonstrated customer value and release evidence; this document does not guarantee commercial success or establish delivered software.
+
 ---
 
 <a id="orvia-section-211"></a>
 
 # 211. FINAL ENGINEERING COMMAND TO THE AI BUILD SYSTEM
+
+**Current coding target: Product Version 1.** Implement its supported non-model capabilities and optional tested Guided Assistance. Product Version 2 custom-AI/model instructions later in this section are preserved future requirements only; do not execute them during the Version 1 build. Using AI coding tools remains allowed and subject to all human-review/data-boundary rules.
 
 Use this as the top-level instruction for any AI coding agent responsible for implementation:
 
@@ -8033,7 +8271,7 @@
 >
 > Store executed security and egress test results for the exact build. Do not describe a design, a passed scanner or an AI review as proof that the software has no vulnerabilities.
 
-## DELIVERY, ROLE, SUPPORT AND CUSTOM-MODEL INSTRUCTIONS
+## DELIVERY, ROLE, SUPPORT AND CUSTOM-MODEL INSTRUCTIONS — MODEL WORK IS PRODUCT V2
 
 > Preserve all existing modules and section requirements. Implement the official vendor cloud as publisher/commerce/support, not as the customer's operational data plane.
 >
@@ -8043,7 +8281,7 @@
 >
 > Give support access to assigned permitted cases and bounded diagnostics. Keep raw records, local identifiers, chat transcripts, logs and secrets inside the customer environment. Local AI suggestions and signed vendor runbooks are not execution authority.
 >
-> Train ORVIA-owned learned weights from random initialisation on approved non-customer material, using authorised Lightning training resources only. Do not import a third-party pretrained checkpoint, adapter, embedding model or teacher-model training corpus without an explicit changed product decision.
+> **Product Version 2 only; on hold for Version 1:** train ORVIA-owned learned weights from random initialisation on approved non-customer material, using authorised Lightning training resources only. Do not import a third-party pretrained checkpoint, adapter, embedding model or teacher-model training corpus without an explicit changed product decision.
 >
 > Separate training from local inference. Do not learn from customer prompts, support tickets, records, feedback or gradients. Do not call Lightning or an external model from the customer runtime.
 >
@@ -8051,6 +8289,20 @@
 >
 > Release software and model artifacts only with actual compatibility, quality, security, privacy and provenance evidence. Do not claim these tests or training have run merely because this specification includes them.
 
+## VERSION 1 BUILD-AGENT OVERRIDE
+
+> Build Version 1 with no trained model, inference service, learned embeddings, GPU job or hosted-model dependency. Do not replace the deferred custom AI with another model.
+>
+> Preserve the full Product Version 2 model plan and stable extension contracts. Do not delete the future scope or make it a current installation requirement.
+>
+> Use small, reviewed deterministic help only where useful: error-code explanations, runbooks, form/template validation, keyword search and explicit rule checks. Do not label it an AI chatbot or fabricate generated answers.
+>
+> Keep direct human support, local diagnostics, vendor/customer role separation and the no-customer-data-export/training boundary intact.
+>
+> Record target product version, implementation and test status independently. Mark model-only work DEFERRED_V2, not passed. Do not change unrelated feature requirements or reduce security to satisfy a deadline.
+>
+> AI coding assistance remains authorised under the existing engineering rules; it does not authorise sharing customer records or adding product-model dependencies.
+
 ---
 
 <a id="orvia-section-212"></a>
@@ -8116,6 +8368,10 @@
 This retained extension governs a customer's separately configured AI applications. It does not authorise training ORVIA Intelligence on customer material, importing third-party learned weights into ORVIA Intelligence, or using an external provider to answer ORVIA assistant questions. The assistant's current ownership, corpus and local-inference rules remain §§63–65.
 
 Any external system being governed must have an explicit supported boundary and cannot be enabled under a promise of no external processing. Discovery or governance access is not permission to copy that system's datasets or conversations into ORVIA vendor training infrastructure.
+
+## DISTINGUISH CUSTOMER-AI GOVERNANCE FROM ORVIA CUSTOM AI
+
+The user’s deferral concerns ORVIA’s own learned model and its assistant functions. This separate, already-later customer-AI-governance extension retains its previous rollout qualification; this revision neither deletes it nor makes it a Version 1 requirement. It must not become an indirect dependency on a model inside the Version 1 platform. The future ORVIA assistant’s ownership and no-customer-training rules remain unchanged.
 
 ---
 
@@ -8140,11 +8396,15 @@
 | E11 | P1 | Retention, scoped holds and restore reconciliation | E02, E06, E07 | T31–T33 |
 | E12 | P1 | Control packages, simulation and CI product | E09 | T34, T35 |
 | E13 | P1 | Incident clocks, templates and submission evidence | E02, E07 | T36, T37 |
-| E14 | P1 | Safe grounded Copilot | E01, E07 | T38–T40 |
+| E14 | DEFERRED_V2 | Safe grounded Copilot and retained custom-model programme | E01, E07; Version 2 model/knowledge/security evidence | Model-specific gates in §217; T39–T40 core absence/egress checks still apply in V1 |
 | E15 | P1/P2 | Repeatable connector expansion | E05–E09 | Per-connector conformance suite |
 | E16 | P2 | Enterprise deployments, SDF packs and advanced capabilities | Core production evidence | Customer-environment acceptance |
 
 P0 denotes a prerequisite to a supported pilot, not an instruction to deliver every function at full enterprise depth immediately. A design partner whose requirements activate an otherwise-later safeguard changes that safeguard's priority.
+
+## VERSION 1 WORK ALLOCATION
+
+Keep the non-AI epics and their existing priorities/dependencies. E14 and its training/inference work are Product Version 2 only. A small optional Guided Assistance task can use existing error, help, search and support primitives under E07/E10 without creating a model dependency or displacing the core slice. Release priorities P1/P2 are not Product Version 1/2. No other epic is newly deferred by this update.
 
 ---
 
@@ -8259,7 +8519,7 @@
 
 ## ROLE, SUPPORT AND CUSTOM-AI ACCEPTANCE MATRIX
 
-These scenarios supplement all retained tests and UX-01–UX-20. They are **requirements, not executed test results**. Store the exact tested build/model/knowledge version, profile, evidence, expected/actual result and reviewer when executed. No threshold or pass rate is invented by this table.
+These scenarios supplement all retained tests and UX-01–UX-20. They are **requirements, not executed test results**. Store the exact tested build and applicable rule/knowledge/model version, profile, evidence, expected/actual result and reviewer when executed. Version 1 scenarios start NOT_RUN; the AI-01–AI-18 model scenarios are preserved as DEFERRED_V2. No threshold or pass rate is invented by this table.
 
 | ID | Scenario | Required outcome | Status |
 |---|---|---|---|
@@ -8283,26 +8543,59 @@
 | SUP-08 | A connection stops after an approved optional report | Local operations continue; vendor treats subsequent status as unknown or stale. | NOT_RUN |
 | SUP-09 | Vendor case is closed while a local privacy action remains unverified | Local action remains unresolved; support closure is not operational verification. | NOT_RUN |
 | SUP-10 | Compromised commercial licence or support credential requests customer data | No operational API, production credential or automatic data-upload path is available. | NOT_RUN |
-| AI-01 | Training run specifies a third-party pretrained checkpoint or adapter | Rejected under the current own-model policy; explicit product-change review required. | NOT_RUN |
-| AI-02 | Candidate ORVIA run resumes its own checkpoint | Provenance traces to approved random initialisation, corpus and tokenizer; no unrelated weights. | NOT_RUN |
-| AI-03 | Corpus ingestion receives a customer ticket, log, conversation or disguised derivative | Rejected and quarantined under the non-customer corpus rule. | NOT_RUN |
-| AI-04 | Public source lacks approved reuse/provenance or contains personal/poisoned content | Excluded pending review; public accessibility is not automatic admission. | NOT_RUN |
-| AI-05 | A local user asks a question with authorised local context | Only local permission-filtered inference; no training, gradient export or vendor/Lightning call. | NOT_RUN |
-| AI-06 | Runtime inference is attempted with vendor and Lightning egress blocked | Supported local answer works, or honest unavailable state; no external fallback. | NOT_RUN |
-| AI-07 | Retrieved document instructs model to leak secrets or bypass roles | No permission expansion, forbidden tool execution or support export. | NOT_RUN |
-| AI-08 | Test question depends on stale or missing legal/product knowledge | Answer exposes limits/source dates and escalates; model memory does not invent authority. | NOT_RUN |
-| AI-09 | Model package is tampered with or requests executable loader/network access | Verification/runtime restrictions reject it before unsafe execution. | NOT_RUN |
-| AI-10 | Model is absent, fails evaluation or exceeds available hardware | AI is not advertised as ready; deterministic privacy operations and support still work. | NOT_RUN |
-| AI-11 | Local rating or conversation history is marked for model improvement | Training/export denied; permitted local retention is separately controlled. | NOT_RUN |
-| AI-12 | An auxiliary embedding/reranking component tries to download third-party weights | Blocked; every learned component must satisfy the own-model provenance requirement. | NOT_RUN |
-| AI-13 | Model conversion or quantisation changes output quality | Run held-out quality/safety tests; do not inherit the earlier evaluation result automatically. | NOT_RUN |
-| AI-14 | Model update/rollback changes consent epoch, roles or safety restrictions | Rejected; model lifecycle cannot reverse current deterministic state. | NOT_RUN |
-| AI-15 | Customer A question or cached context is requested by another scope | Denied; customer/role-scoped retrieval, caches and logs do not mix. | NOT_RUN |
-| AI-16 | Model training credentials try to publish a signed customer release | Denied without separate release approval and protected signing identity. | NOT_RUN |
-| AI-17 | A task asks for unsupported general advice or unsupported language | Enforce task scope; show limitations rather than claim domain training guarantees correctness. | NOT_RUN |
-| AI-18 | Vendor-side assistant sees a permitted support case | Inference may use permitted case context only; case content is not admitted to training. | NOT_RUN |
+| AI-01 | Training run specifies a third-party pretrained checkpoint or adapter | Rejected under the current own-model policy; explicit product-change review required. | DEFERRED_V2 |
+| AI-02 | Candidate ORVIA run resumes its own checkpoint | Provenance traces to approved random initialisation, corpus and tokenizer; no unrelated weights. | DEFERRED_V2 |
+| AI-03 | Corpus ingestion receives a customer ticket, log, conversation or disguised derivative | Rejected and quarantined under the non-customer corpus rule. | DEFERRED_V2 |
+| AI-04 | Public source lacks approved reuse/provenance or contains personal/poisoned content | Excluded pending review; public accessibility is not automatic admission. | DEFERRED_V2 |
+| AI-05 | A local user asks a question with authorised local context | Only local permission-filtered inference; no training, gradient export or vendor/Lightning call. | DEFERRED_V2 |
+| AI-06 | Runtime inference is attempted with vendor and Lightning egress blocked | Supported local answer works, or honest unavailable state; no external fallback. | DEFERRED_V2 |
+| AI-07 | Retrieved document instructs model to leak secrets or bypass roles | No permission expansion, forbidden tool execution or support export. | DEFERRED_V2 |
+| AI-08 | Test question depends on stale or missing legal/product knowledge | Answer exposes limits/source dates and escalates; model memory does not invent authority. | DEFERRED_V2 |
+| AI-09 | Model package is tampered with or requests executable loader/network access | Verification/runtime restrictions reject it before unsafe execution. | DEFERRED_V2 |
+| AI-10 | Model is absent, fails evaluation or exceeds available hardware | AI is not advertised as ready; deterministic privacy operations and support still work. | DEFERRED_V2 |
+| AI-11 | Local rating or conversation history is marked for model improvement | Training/export denied; permitted local retention is separately controlled. | DEFERRED_V2 |
+| AI-12 | An auxiliary embedding/reranking component tries to download third-party weights | Blocked; every learned component must satisfy the own-model provenance requirement. | DEFERRED_V2 |
+| AI-13 | Model conversion or quantisation changes output quality | Run held-out quality/safety tests; do not inherit the earlier evaluation result automatically. | DEFERRED_V2 |
+| AI-14 | Model update/rollback changes consent epoch, roles or safety restrictions | Rejected; model lifecycle cannot reverse current deterministic state. | DEFERRED_V2 |
+| AI-15 | Customer A question or cached context is requested by another scope | Denied; customer/role-scoped retrieval, caches and logs do not mix. | DEFERRED_V2 |
+| AI-16 | Model training credentials try to publish a signed customer release | Denied without separate release approval and protected signing identity. | DEFERRED_V2 |
+| AI-17 | A task asks for unsupported general advice or unsupported language | Enforce task scope; show limitations rather than claim domain training guarantees correctness. | DEFERRED_V2 |
+| AI-18 | Vendor-side assistant sees a permitted support case | Inference may use permitted case context only; case content is not admitted to training. | DEFERRED_V2 |
 
 Property-based isolation/consent tests, independent security assessment, model threat testing and real installation/restore exercises remain necessary; a fixed scenario table does not replace those programmes.
+
+## PRODUCT-RELEASE APPLICABILITY OF RETAINED TESTS
+
+Version 1 executes all applicable tests for its shipped non-AI surfaces, including local identity, vendor-role isolation, signed packages, rights/control correctness, recovery, permitted diagnostics, no egress and direct support. Pure model-inference/training/quality tests (AI-01–AI-18 and the model-execution part of T38) are Product Version 2 only. Do not count them as passed or as Version 1 implementation failures.
+
+T39/T50/SUP-06 and comparable absence/failure tests apply to Version 1 as **no model is installed, no fallback is attempted, and core/support still work**; Version 2 additionally exercises a running model’s failure. T40/T49/T59/T62 and UX cases keep their Version 1 non-AI, absent-model and blocked-destination checks; their model-execution portions are rerun in Version 2. Role/support test IDs remain unchanged. Any test containing an optional capability must identify its real release scope, not be silently skipped to improve a score.
+
+The following new scenarios make the Version 1 release decision executable. They are planned requirements only; every status is initially NOT_RUN.
+
+## VERSION 1 MODEL-FREE AND GUIDED-ASSISTANCE ACCEPTANCE
+
+| ID | Scenario | Required result | Status |
+|---|---|---|---|
+| V1-01 | Install the signed Version 1 bundle with no GPU, weights, model API keys or Lightning access | Supported core installs/starts; no model provisioning or hidden downloads; required ordinary prerequisites remain enforced. | NOT_RUN |
+| V1-02 | Run the full synthetic consent withdrawal, target action, verification and regression slice without a model | Actual deterministic outcomes/evidence/tests work; no model-generated success substitutes. | NOT_RUN |
+| V1-03 | Set an AI flag, alter a licence or use a Super Admin role on Version 1 | Custom-model capability remains DEFERRED_V2; no secret provider or runtime activation. | NOT_RUN |
+| V1-04 | Inspect package/dependency/startup/network manifests | No model, learned embedding, training or inference dependencies and no model/Lightning calls. | NOT_RUN |
+| V1-05 | A known error matches a guidance rule | Show exact reviewed explanation/runbook version and permitted record links; do not invent root cause. | NOT_RUN |
+| V1-06 | A guidance query has no match, missing facts or stale context | Explicit no-match/review/unknown status; human help remains available; no generated fallback. | NOT_RUN |
+| V1-07 | Another role/subtenant searches restricted help context or evidence | Deny unauthorised records/snippets/cache access before output; rules never enlarge access. | NOT_RUN |
+| V1-08 | A document or connector string requests a shell command or secret export | Treat it as inert untrusted content; no execution, permission change or support upload. | NOT_RUN |
+| V1-09 | Accept a recommended diagnostic or repair | Use existing typed plan, supported capability, actor permissions, required approval and verification. | NOT_RUN |
+| V1-10 | Omit/disable/fail optional Guided Assistance | Core workflows, accurate errors, ordinary documentation and direct human support remain available. | NOT_RUN |
+| V1-11 | Prepare a report with an internal ID, client data, unrestricted log or free text | Fixed-schema local validation blocks prohibited export; no automatic helper-summary upload. | NOT_RUN |
+| V1-12 | Renew/import a licence or apply a Version 1 update offline | Works under the supported offline model; no model credentials or unexpected extra egress. | NOT_RUN |
+| V1-13 | Review UI, sales copy and commercial capability flags | Rules-based assistance labelled accurately; custom AI only a Version 2 roadmap item, not currently enabled. | NOT_RUN |
+| V1-14 | Review pipeline tasks and artifact provenance | No Version 1 training/GPU job; external coding tools are limited to authorised code/docs/synthetic fixtures, never customer data. | NOT_RUN |
+| V1-15 | Suggest saving local guidance/support history for future model improvement | Training/export prohibited; only justified local retention under the existing boundary. | NOT_RUN |
+| V1-16 | Load an untrusted or incompatible rule/runbook pack | Reject signature/version/schema failure; no arbitrary code or added outbound permissions. | NOT_RUN |
+| V1-17 | Compute a template summary or configured severity finding | Every fact links to scoped local inputs and rule version; unknown effects stay unknown, not verified or legally certified. | NOT_RUN |
+| V1-18 | Review Version 1 release sign-off | Applicable core/security/recovery tests have real results; model-only tests are explicitly DEFERRED_V2 and not counted as passes. | NOT_RUN |
+
+Guidance-specific tests apply only when the optional helper is shipped; absence, truthful claims, core independence and privacy/security tests apply regardless. Version 2 must retain the applicable Version 1 regression suite and add the complete deferred model suite before claiming a trained assistant.
 
 ---
 
@@ -8424,5 +8717,9 @@
 
 **Unchanged legal boundary:** this revision does not newly verify the inherited DPDP legal baseline, supply legal advice, approve a training corpus's rights or establish that the model is trained/certified. Existing source dates, review requirements and qualifications remain. Public-source reuse, data rights and model/framework distribution terms require review for the actual artifacts. Technical source examples are not copied as ready-to-run ORVIA infrastructure.
 
----
-
+## DOCUMENT REVISION 1.3 SOURCE AND RELEASE-SCOPE NOTE
+
+This revision implements the user’s decision to establish the accumulated non-AI design/progress as the Product Version 1 baseline, preserve custom ORVIA Intelligence for Product Version 2, keep small deterministic assistance optional, and continue AI-assisted software development. Its source master is `ORVIA_Unified_Master_v1_2_Delivery_Roles_Support_and_Custom_AI.md`. No new external research, legal update, provider capability verification or product implementation is asserted here. Existing technical/legal source dates and limitations remain unchanged. Lightning/model references describe preserved future work, not current GPU availability or an active Version 1 service. Appendix F records the exact source hash and changes.
+
+---
+
````

</details>

<!-- PRESERVED_PRODUCT_MASTER_END -->

---

<a id="appendix-g"></a>

# APPENDIX G — WHOLE-APPLICATION ENGINEERING BREAKDOWN

**Project:** `cyberfyx-orvia`  
**Idea and decisions chat:** `Orvia_idea`  
**Prepared:** 16 September 2026  
**Engineering allocation:** 1.0 — role ownership, work packages, dependencies and four-track handoffs.  
**Product baseline:** ORVIA Version 1; custom ORVIA Intelligence remains Product Version 2.  
**Source:** `ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md`, document revision 1.3, SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`.  
**Coordination source:** `cyberfyx-orvia_PROJECT_HANDOFF.md`.

**Status:** This is a proposed engineering allocation of the approved idea, not a new feature specification, a staffing claim, a completed implementation or a delivery-time guarantee. Product meanings, original role titles, module IDs and release qualifications come from the current master. The detailed accountable owners, WP identifiers, handoff rules and execution waves below are the proposed breakdown requested in `Orvia_idea`. Actual human names remain UNASSIGNED. No application repository was supplied or audited in this task; implementation status is NOT_ASSESSED and no product test is represented as passed.

**Preservation:** The combined one-file edition retains the entire supplied Version 1 master unchanged and adds this breakdown as Appendix G. No product section, legacy role, source test row or deferred AI commitment is removed. The standalone breakdown and task cards are views of the same allocation, not competing product specifications.

## Navigate

[Scope and meanings](#g-scope) · [Whole application](#g-application) · [20 role cards](#g-roles) · [Four parallel tracks](#g-tracks) · [36 work packages](#g-work-packages) · [33-module ownership](#g-modules) · [Full-stack outcomes](#g-outcomes) · [Contracts and file ownership](#g-contracts) · [Build sequence](#g-sequence) · [Task handoff](#g-handoff) · [Testing and release](#g-tests) · [218-section map](#g-sections) · [Original epic map](#g-epics) · [Decision gaps](#g-decisions)

<a id="g-scope"></a>
## G.1 — Scope, terminology and authority

The engineering goal is **one usable, customer-hosted privacy-control product whose interfaces, APIs, stored states, supported connector effects, evidence and tests agree**. It is not twenty isolated components or four competing AI-generated codebases. [Master §§1–4, 11, 117, 119–120, 209–211]

The current master retains 33 modules: **26 non-AI modules in the Version 1 baseline** (1–18 and 26–33), and **7 custom-AI modules deferred to Product Version 2** (19–25). Optional Guided Assistance is a bounded rules/runbook capability within existing help/search/support surfaces, not another mandatory service. The existing non-AI phased rollout and per-capability qualification remain. A Version 1 baseline assignment does not mean every advanced profile must be live in the first prototype. [Master §§10, 63, 146, 216]

Distinguish four concepts. **Engineering role** is responsibility for building something. **Application role** is a permission held by a vendor/customer user. **AI track** is a development work channel. **Tenant/environment** is an isolation scope. A software engineer or coding tool does not automatically receive Vendor Super Admin or customer-production authority because of its task.

D01–D20 below retain the original Developer 1–20 identifiers. They are responsibility hats until actual people are named. The founder is the human product/integration approver; qualified privacy review, independent security assessment and customer IT remain explicit external responsibilities, not invisible extra engineers. One person may carry several hats, but the independent review required by the master cannot be simulated by changing an AI prompt. [Master §§117–118, 164, 188]

The recorded product constraints remain: vendor-distributed signed full-product ZIP packages and licences; customer-local runtime and browser UI; minimum permitted vendor business/licensing/support information only; independent vendor/customer/principal identities; no vendor production backdoor; local evidence and telemetry; no trained model, embeddings, model API key or GPU dependency in Version 1. The four external development tools remain allowed for authorised code/documentation/synthetic fixtures, never customer records or secrets. [Master §§2, 6–7, 31–34, 63–65, 85, 95–96, 116, 188–190]

Engineering waves W0–W5, work-package IDs WP01–WP36, role IDs D01–D20, module IDs M01–M33, original epics E01–E16 and product versions are different labels. No wave label replaces original phases 0–5, an edition, a priority or a release commitment.

<a id="g-application"></a>
## G.2 — The complete application we are assigning


| Product surface | Build scope | Lead and essential partners | Data/authority boundary |
|---|---|---|---|
| Public vendor website | Product/editions/pricing/docs/security pages, demo and reviewed readiness questionnaire | D09 frontend; D10 UX; D02 APIs; D14 claims/data review | Vendor content and approved business submissions; not a customer-data scanner |
| ORVIA Account | Purchasing, billing, licences, downloads, renewals, commercial members and own support cases | D02 business lead; D09 UI; D15 access; D20 licences/releases | Vendor business records only |
| Vendor Administration and Support Console | Vendor Super Admin/Admin roles, account assignments, support attention, safe diagnostics, advisories and staff audit | D13 support outcome; D02 API; D09 UI; D15/D14 authority | No runtime impersonation, live customer workflow feed or remote shell |
| Customer Workspace | Operator dashboards, graph/governance, consent/rights, controls, evidence, testing, incidents and local settings | D09 frontend; D02–D08 domain; D15 local identity | Entire frontend/API/state inside customer boundary |
| Customer Privacy Centre | Notices, consent, rights, nomination/representation and own request status | D11 portal; D02/D05 business logic; D10 UX; D15/D14 identity/exposure | Customer-hosted public/private separation; individual-only authority |
| Customer API and shared engines | Graph, policy, workflow, consent/rights, verification, evidence, retention, incidents, tests and notifications | D02–D08; D18 for test product | A modular platform, not one microservice per module |
| Execution/SDK layer | Customer-controlled agent, connector SDK, tested DB/API adapters and runtime enforcement | D06 platform; D07 DB; D08 API; D04 policy; D20 SDK releases | Least privilege; typed scoped actions; no vendor command authority |
| Install/update/operate layer | Signed full ZIP, images, supported deployment profiles, licence import, backups, upgrades and offboarding | D20 delivery; D16 infrastructure; D17 operations; D14/D18 validation | Vendor distributes; customer approves and operates |
| Optional Guided Assistance | Known-error explanations, reviewed runbooks, checklists and local search | D12 rules/fixtures; D13 assistance; D09 UI | Rules only; absence never blocks core or support |
| Future custom model | ORVIA-owned training, model applications and customer-local inference | D12 model; D13 applications; D14/D16/D18–D20 future assurance | DEFERRED_V2; no V1 model work or runtime dependency |

The public website is a content surface; there are three customer-facing authenticated experiences plus a separate staff console. Five interface surfaces do not require five independent design systems. Shared source components may be compiled into each app, but they must not share customer operational data, runtime sessions or release/command-signing authority. [Master §§82–86, 96, 102–103, 116]

A full-stack engineer’s job is to connect a user journey from UI through authenticated API, data/state transition, background action, verification and back to truthful UI. It is a delivery responsibility carried by existing roles—not permission to implement a second policy engine, connector platform or authentication system.

<a id="g-roles"></a>
## G.3 — Twenty engineering responsibility cards

The titles are copied from master §117. The V1 ownership detail is a proposed expansion of those duties; original responsibilities remain in force. Every role also owns relevant unit tests, safe errors, documentation and review for the code it writes. QA and security are not substitutes for author responsibility.


<a id="g-d01"></a>
### D01 — Chief Architect / Technical Lead

**Version 1 focus:** Architecture, full-stack outcome coordination and integration ownership. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP01, WP36.

**Build and maintain:** Keep the active Version 1 baseline, product boundaries, release scope and shared contracts consistent. Own architecture decisions, the dependency map, domain boundaries, contract-change approval and cross-track integration. Appoint one accountable lead for each end-to-end outcome.

**Deliver:** Architecture decision records; system/data-flow inventory; approved API/event/permission contracts; dependency and acceptance register; integrated release decision.

**Handoff:** Gives bounded, source-linked task contracts to every role. Receives test evidence and unresolved decisions rather than summaries saying only “done”.

**Review:** D14 for security; D18 for validation; D20 for releasability; founder for product decisions. **Boundary:** Do not resolve privacy or security conflicts by weakening the master. Do not call a role chart proof that 20 engineers exist.

**First useful assignment:** Approve WP01, assign the withdrawal outcome lead, and establish a single contract owner before concurrent implementation.


<a id="g-d02"></a>
### D02 — Core Backend Engineer

**Version 1 focus:** Core backend, customer platform APIs and vendor business APIs in separate trust domains. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP03, WP06, WP14, WP23.

**Build and maintain:** Build request handling, common error/validation patterns, organisation services, scoped CRUD, consent/notices/rights domain APIs and vendor account/billing/support services. Own migration ordering with D03. Separate vendor commerce storage from customer operational storage.

**Deliver:** API modules; reviewed migrations; repository/query boundaries; business-event handlers; backend unit/integration tests; API documentation.

**Handoff:** Provides typed endpoints and stable failures to D09/D11; uses D15 authentication, D04 policy decisions and D05 orchestration rather than rebuilding them.

**Review:** D03 for data structure; D15 for authorisation; D14 for boundary protection. **Boundary:** No shared vendor/customer operational database; no UI-only business rules; no direct destructive connector bypass.

**First useful assignment:** Implement the scoped organisation/data-access foundation and the first authenticated persisted operation.


<a id="g-d03"></a>
### D03 — Privacy Control Graph Engineer

**Version 1 focus:** Transactional domain model, Privacy Control Graph and local search. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP04, WP16.

**Build and maintain:** Build graph entities/relationships, legal-entity and environment links, inventory provenance, versioned relationships, local scoped search and impact queries. Co-design constraints/indexes with D02; distinguish ORVIA’s own database from external customer databases owned by D07.

**Deliver:** Entity/relationship model; constrained schemas; graph/query APIs; permission-filtered search; historical-reference fixtures; migration review.

**Handoff:** Provides affected purposes/systems/copies and versioned references to policy, workflow, reporting and testing owners.

**Review:** D02 for migrations; D04 for policy inputs; D14/D15 for query scope. **Boundary:** No central cross-company identity graph; no claim that discovered assets prove complete coverage.

**First useful assignment:** Model the purpose–principal–consent–system–control relationships required by marketing withdrawal.


<a id="g-d04"></a>
### D04 — Policy Engine Engineer

**Version 1 focus:** Processing policy, approved regulatory configuration and runtime decisions. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP05, WP12, WP19.

**Build and maintain:** Implement policy schemas, versioning, review/publication, obligations, reason codes, applicability records and control evaluation. Keep administrative permission rules separate from personal-data processing rules. Own the supported enforcement contract with D06/D20.

**Deliver:** Policy evaluator/validator; versioned rule packs; decision and obligation contract; approval/publication APIs; deterministic policy tests.

**Handoff:** Receives reviewed meaning from privacy counsel; returns scoped decisions to workflows and SDKs. D15 owns user/service authentication and administrative permissions.

**Review:** D15 for separate authorisation namespaces; D05 for execution semantics; qualified privacy reviewer for interpretations. **Boundary:** No invented legal basis or deadline; no error-to-ALLOW conversion; no treating a role as permission to process any personal data.

**First useful assignment:** Implement purpose-specific withdrawal blocking with an independent service-purpose fixture and explicit uncertainty handling.


<a id="g-d05"></a>
### D05 — Workflow / Distributed Systems Engineer

**Version 1 focus:** Durable workflows and complete privacy-operation state machines. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP07, WP08, WP15, WP17.

**Build and maintain:** Build consent propagation, rights orchestration, action plans, approval binding, retries, outbox/inbox handling, deadlines, escalation and reconciliation. Preserve historical definitions while checking current safety before each new external effect.

**Deliver:** Workflow definitions; action/attempt state machines; outbox publisher; approval and cancellation flow; recovery tests; failure transitions.

**Handoff:** Consumes graph/policy contracts; invokes connector contracts; sends claims to D07/D08 verification adapters and evidence events to D02/D03.

**Review:** D04 for policy semantics; D06 for remote effects; D18/D19 for failures and recovery. **Boundary:** No exactly-once external-effect claim; no blind destructive retry after an unknown outcome; no closure that fabricates verification.

**First useful assignment:** Make an accepted withdrawal survive restart and reject a stale grant retry.


<a id="g-d06"></a>
### D06 — Connector Platform Engineer

**Version 1 focus:** Customer-local connector platform and restricted execution agent. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP09.

**Build and maintain:** Build the connector SDK, capability manifest, agent lifecycle, customer-local signed command envelope, installation identity, secret references, connector isolation and conformance suite. Own connector version compatibility and supported actions.

**Deliver:** Agent executable/container; connector SDK; manifest schema; command verifier; health model; sandbox/conformance fixtures.

**Handoff:** Gives D07/D08 a common adapter contract and D05 a typed execution/reconciliation interface; works with D20 on release packaging.

**Review:** D14/D15 for authority and secrets; D05 for idempotency; D20 for package compatibility. **Boundary:** No arbitrary shell/SQL; vendor distribution or licence keys cannot sign runtime action authority; no shared connector secrets.

**First useful assignment:** Build a signed, tenant/environment-scoped local command that rejects invalid, expired and wrong-scope requests.


<a id="g-d07"></a>
### D07 — Data Connector Engineer

**Version 1 focus:** Database integrations, exact matching and scoped readback. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP10, WP13.

**Build and maintain:** Implement supported PostgreSQL/MySQL adapters, schema discovery, exact principal-reference matching, scoped mutation, retention/deletion actions and independent readback. Keep queries parameterised and respect load/operation budgets.

**Deliver:** Database adapters; capability/conformance results; SQL operation templates; match and generation tests; readback observations and limits.

**Handoff:** Uses D06 SDK and D05 plans; returns attributable action and verification results to the evidence/coverage model.

**Review:** D06 for contracts; D03 for scope relationships; D14/D19 for safety and load. **Boundary:** No unrestricted database permissions, destructive ambiguous matches or universal backup-erasure claim.

**First useful assignment:** Change one synthetic CRM audience membership and verify the exact target state through a separate read.


<a id="g-d08"></a>
### D08 — SaaS/API Integration Engineer

**Version 1 focus:** REST/SaaS adapters, customer-managed notifications and processor interactions. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP11.

**Build and maintain:** Implement supported REST, CRM, marketing and support integrations after the target provider is selected. Handle provider authentication, pagination, permission loss, idempotency, rate limits, webhook validation, uncertainty and per-provider verification limits.

**Deliver:** API adapters; sandbox simulator clearly labelled; signed webhook handlers; provider conformance fixtures; integration/runbook documentation.

**Handoff:** Receives D06 contracts and D05 actions; coordinates with D17 on retries/limits and D02 on notification/processor APIs.

**Review:** D06 for capabilities; D14 for endpoint/SSRF safety; D18 for lost acknowledgements and pagination. **Boundary:** Do not name a simulated endpoint as a certified vendor integration or route customer operations through ORVIA commerce.

**First useful assignment:** Implement the synthetic REST marketing target and a lost-acknowledgement reconciliation scenario.


<a id="g-d09"></a>
### D09 — Frontend Platform Engineer

**Version 1 focus:** Frontend platform and full-stack UI integration. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP21.

**Build and maintain:** Implement the shared frontend platform and the separate customer Workspace, ORVIA Account and vendor-staff console. Own route/layout separation, API clients, state handling, dashboards, local settings and UI performance.

**Deliver:** Operational pages bound to real APIs; typed query/mutation clients; role-aware navigation; loading/error/empty states; browser integration tests.

**Handoff:** D10 supplies interaction specifications; D02 supplies contracts; D15 supplies session/permission behaviour; D11 owns the principal portal.

**Review:** D10 for UX; D02/D15 for contract/security correctness; D18 for end-to-end results. **Boundary:** No hard-coded successful metrics or hidden-button-only security; no vendor-hosted runtime assets or shared live customer state.

**First useful assignment:** Build separate vendor/customer shells and connect one real authenticated customer operation.


<a id="g-d10"></a>
### D10 — Product UX Engineer

**Version 1 focus:** Product UX, accessibility and end-user task design. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP20.

**Build and maintain:** Define coherent experiences for commercial contacts, vendor staff, customer administrators/members and Data Principals. Design approvals, failure states, onboarding, role-specific dashboards, accessibility, localisation and truthful status language.

**Deliver:** Design tokens/components; screen and state specifications; field/validation rules; keyboard/focus behaviour; reusable confirmation and evidence patterns.

**Handoff:** Gives D09/D11 precise interaction states and D18 testable acceptance scenarios; supplies customer-facing wording with the appropriate reviewers.

**Review:** D09/D11 for feasibility; D14 for unsafe interactions; privacy/content reviewer for legally significant text. **Boundary:** No false compliance score, disabled-by-entitlement safety floor or a simulated V1 AI chat.

**First useful assignment:** Design the withdrawal, unresolved-provider and evidence-review journey before expanding decorative pages.


<a id="g-d11"></a>
### D11 — Data Principal Portal Engineer

**Version 1 focus:** Customer Privacy Centre and principal-facing full-stack journey. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP22.

**Build and maintain:** Implement customer branding, reviewed notices/languages, consent capture/withdrawal, rights forms, representation/nomination interactions, safe attachments, receipts and status. Separate public portal privileges from private administration.

**Deliver:** Portal routes/forms; secure principal session flow integrated with D15; customer-local API binding; accessibility and cross-person tests.

**Handoff:** Uses D02 consent/rights APIs and D05 workflow state; works with D10 for accessible customer language and D15 for proof-of-authority.

**Review:** D15/D14 for disclosure and public exposure; D18 for principal isolation. **Boundary:** No ORVIA purchasing account requirement for clients; no cross-person status enumeration or administrative API access.

**First useful assignment:** Deliver an authenticated synthetic principal’s withdrawal from portal to stored receipt and status.


<a id="g-d12"></a>
### D12 — AI/ML Engineer

**Version 1 focus:** V1 deterministic validation, fixture engineering and safe diagnostics; model engineering is V2. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP26, WP35.

**Build and maintain:** For V1, implement reviewed error/rule schemas, deterministic validation, synthetic fixture families, negative tests and support-report checks. Prioritise integration/QA before optional guidance. Preserve model/training responsibilities for V2 without executing them.

**Deliver:** Validation/rule fixtures; error taxonomy; support payload tests; deterministic diagnostic checks; V1 model-absence tests.

**Handoff:** Supplies D13 approved rule/runbook references and supports D02/D18/D14 with edge cases and prohibited-field fixtures.

**Review:** D04 for rule meaning; D14 for export safety; D18 for independent expected results. **Boundary:** No training corpus, learned embeddings, model API, GPU job or hidden pretrained classifier in V1.

**First useful assignment:** Create duplicate/stale-consent, unknown-outcome and prohibited-diagnostic fixtures used by the first slice.


<a id="g-d13"></a>
### D13 — AI Applications Engineer

**Version 1 focus:** V1 guided support and integration assistance; model applications are V2. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP24, WP33.

**Build and maintain:** For V1, own deterministic runbook/search guidance, configuration checklists, support journey contracts and reviewable template interactions. Also contribute integration fixtures and support-case acceptance before optional helper breadth.

**Deliver:** Runbook catalogue; optional local guidance results; support escalation acceptance; template forms/content; end-to-end test fixtures.

**Handoff:** D12 validates schemas; D09 implements common UI; D02 owns support business APIs; D14 reviews outbound fields.

**Review:** D10 for explanations; D12 for deterministic correctness; D18 for complete support journeys. **Boundary:** No claim of AI inference in V1, automatic repair approval or customer support material admitted to future training.

**First useful assignment:** Produce a known-error runbook and a direct human-support path that works when guidance is absent.


<a id="g-d14"></a>
### D14 — Security / Application Security Engineer

**Version 1 focus:** Application security, data-boundary assurance and product security response. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP30.

**Build and maintain:** Threat-model every trust boundary; define secure coding/release requirements; review auth, uploads, connectors, signatures, support and egress. Coordinate vulnerability triage, fixes, independent review and security evidence for the assessed release.

**Deliver:** Threat models; negative/security test plan; finding register; supply-chain/egress controls; independent-review scope; remediation/retest evidence.

**Handoff:** Works with each implementation owner from design onward. Gives D01/D20 a documented security decision; external assessors provide independent assessment.

**Review:** D15/D16 for identities/infrastructure; external security reviewer independent of the implementation for production assessment. **Boundary:** No “unbreachable” certification from checklists; no self-approval of independent testing; no blanket vendor super-admin bypass.

**First useful assignment:** Review the vendor/customer boundary and add denial tests before the first live mutation.


<a id="g-d15"></a>
### D15 — IAM / Identity Engineer

**Version 1 focus:** Identity, role hierarchy and delegated authority. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP02.

**Build and maintain:** Implement vendor commercial/staff, customer runtime and principal identities with separate issuers/audiences/sessions/recovery. Build privileged MFA, roles, members, subtenant/environment delegation, service identities and owner recovery.

**Deliver:** Authentication/session integration; permission/delegation matrix; role/admin APIs; recovery flows; actor/resource decision middleware; isolation tests.

**Handoff:** Supplies D02/D09/D11 the access contract and D06 service/agent identity requirements; consults D04 without merging role rights and processing conditions.

**Review:** D14 for abuse; D02 for service scope; D18 for cross-domain and sibling-subtenant tests. **Boundary:** No universal super-admin token, vendor reset of customer ownership, self-elevation or last-owner lockout.

**First useful assignment:** Prove vendor credentials fail at the customer API and principal credentials fail at admin endpoints.


<a id="g-d16"></a>
### D16 — Cloud / DevOps Engineer

**Version 1 focus:** Cloud/DevOps and separately deployed infrastructure. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP28.

**Build and maintain:** Build reproducible development/staging and vendor environments plus customer-hosted deployment manifests. Own infrastructure-as-code, networks, runtime identities, CI infrastructure, secret integration and customer installation prerequisites.

**Deliver:** Container build/deploy definitions; environment manifests; scoped CI credentials; secrets/network configuration; supported-host preflight.

**Handoff:** Provides D20 reproducible images and installation environments; D17 adds run/restore instrumentation; customer IT controls production infrastructure.

**Review:** D14 for hardening; D17 for operations; D20 for release provenance. **Boundary:** No shared production credentials or public customer databases; no developer server labelled production.

**First useful assignment:** Boot the minimal model-free customer stack with durable storage and separate vendor services.


<a id="g-d17"></a>
### D17 — SRE / Observability Engineer

**Version 1 focus:** Local observability, service operations, backups and recovery. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP29.

**Build and maintain:** Build customer-local logs, metrics, traces, alerts, health and backup/restore procedures. Monitor the vendor’s own commerce/support services separately. Measure recovery outcomes and keep customer workload telemetry local.

**Deliver:** Health endpoints/dashboards; redaction and retention controls; backup/restore runbooks; alert routes; measured SLO inputs; fault/restore evidence.

**Handoff:** D02/D05/D06 instrument events; D16 provisions services; D19 exercises resilience; D20 packages operational procedures.

**Review:** D14 for telemetry leakage; D19 for measurements; customer IT for supported operating responsibilities. **Boundary:** No central customer workflow monitoring feed or claims about unreported installation health; model absence is not a V1 incident.

**First useful assignment:** Instrument the first workflow and demonstrate restart without losing an accepted event.


<a id="g-d18"></a>
### D18 — QA / Automation Engineer

**Version 1 focus:** QA automation and independent acceptance evidence. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP18, WP31.

**Build and maintain:** Define test strategy, fixtures, API/browser/security regression structure and release-specific evidence. Separate tests of the product from the customer-facing Privacy Test Engine. Verify expected outcomes independently of the implementation path.

**Deliver:** Requirement-to-test matrix; executable suites; build-linked expected/actual reports; regression and accessibility results; defect retest register.

**Handoff:** Every implementation owner supplies tests; D09/D11 add browser checks; D14 supplies security scenarios; D20 receives a factual readiness report.

**Review:** D01 for coverage; D14 for critical failures; reviewers other than the code author where available. **Boundary:** No “passed” from a proposed test, skipped scope or a screenshot alone. Deferred V2 tests stay deferred, not counted as passed.

**First useful assignment:** Create executable acceptance for withdrawal, stale grant, failed connector, wrong tenant and evidence integrity.


<a id="g-d19"></a>
### D19 — Performance / Reliability Engineer

**Version 1 focus:** Performance, concurrency and fault tolerance. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP32.

**Build and maintain:** Design workloads and measure policy/API latency, workflow backlog, connector pressure, database queries and noisy-neighbour behaviour. Exercise outages, duplicate events, cancelled work, resource exhaustion and recovery.

**Deliver:** Load scripts; documented workload/hardware parameters; bottleneck reports; race/fault tests; measured performance and recovery results.

**Handoff:** Works with D03/D05/D06 on bottlenecks and D17/D20 on operational and release limits.

**Review:** D17 for environment/telemetry; D18 for reproducibility; D14 for failure safety. **Boundary:** No invented benchmark, unsupported scale guarantee or prioritising throughput over correct authorisation.

**First useful assignment:** Test concurrent withdrawals/re-consent and bounded connector retries under a documented synthetic workload.


<a id="g-d20"></a>
### D20 — Release / Platform / Developer Experience Engineer

**Version 1 focus:** Release engineering, packaging, CLI and developer experience. **Human owner:** UNASSIGNED. **Primary work-package accountability:** WP25, WP27, WP34.

**Build and maintain:** Build the official signed full-product ZIP delivery, manifest/SBOM/provenance, separate licence verification, supported Compose/Helm/offline profiles, migrations, upgrade/recovery and SDK/CLI distribution. Own release evidence completeness and documentation tooling.

**Deliver:** Reproducible release artifacts; local verifier; installer/preflight; offline dependency manifest; upgrade/offboarding guides; CLI/SDK packages; release manifest.

**Handoff:** D16 supplies build/deploy foundation, D14 approves security findings, D18/D19 supply evidence, and customer IT applies approved packages.

**Review:** D14 for signing/trust; D16/D17 for install/restore; D01 and founder for release acceptance. **Boundary:** No direct vendor remote execution through licensing or updates; no model artifacts or hidden network downloads in V1 offline packages.

**First useful assignment:** Produce the first clean-install artifact early, then validate exact build/digests before expansion.


<a id="g-tracks"></a>
## G.4 — Map the roles to the four parallel development tracks

These are assignments, not claims about tool availability, automatic synchronisation or concurrent subscription capacity. A role may require multiple tracks: an architecture review in one, code in another, test evidence in a third. Every task still has one named editing owner. [Project handoff; master §§117, 188–190]

| Track | Default responsibility | Typical role hats | Produces | Editing rule |
|---|---|---|---|---|
| ChatGPT Work | Architecture, requirement decomposition, contract review, security design and integration decisions | D01; review aspects of D04/D14/D19/D20 | Decision records, bounded tasks, dependency/permission contracts, review findings | Does not silently modify another track’s implementation; human approves product/security decisions |
| Codex | Backend, schemas, domain engines, connectors, policy SDK, packaging, CI scripts and automated code-level tests | D02–D08, D12, D15–D17, D19–D20 | Reviewed code/commits, migrations, API/event contracts, executed test evidence | Owns assigned backend/platform paths only; shared schema and lockfile have a single writer |
| Claude Cowork | UX requirements, runbooks, source coverage, QA scenarios, documentation, tracking and presentation/evidence organisation | D10, D13; planning/evidence aspects of D18/D20 | Screen/state specifications, acceptance packets, runbooks, traceability and factual test summaries | Owns designated documentation/fixture specifications; no invented execution results |
| Claude Code | Workspace, principal portal, vendor Account/staff UI, shared frontend components, API binding and browser tests | D09/D11; implementation aspects of D10/D13/D18 | Real UI state/API integrations, accessibility and browser tests | No silent backend schema, auth semantics or root dependency changes |

The default split creates two primary implementation tracks and two design/review/documentation tracks. Do not expect four independent codebases or fourfold throughput. If a track is overloaded, D01 and the founder may reassign a **bounded** code/tooling task to another available track, with an explicit file list and one writer. This is especially important for the large backend/packaging backlog. The role breakdown is not a promise that one Codex session has twenty-person capacity.

All four tracks can contribute to the same outcome at the same time: ChatGPT Work defines its contract and reviews risk; Codex implements domain behaviour; Claude Cowork specifies failure/acceptance/runbook states; Claude Code binds the UI and browser checks. Parallelism is between independent deliverables, not simultaneous uncoordinated edits to the same file.

**Human approval remains required:** the founder accepts scope and merges; qualified reviewers make legal and independent assessment decisions. A “review” role assumed by another AI is useful, but not an independent penetration test or legal sign-off.

<a id="g-work-packages"></a>
## G.5 — Whole-application work-package register

These 36 packages are work allocations, not 36 services or extra features. IDs do not replace the master’s 16 existing epics. “Acceptance predecessors” identify baseline contracts/behaviour required for integrated acceptance; design, fixtures and scaffolding can proceed earlier. They do not mean every feature in a predecessor must be finished before any downstream code begins. A page also depends on the API for the feature it displays, even when only the shared platform prerequisites are shown below.

No package is a fixed-size task or a time estimate. Split it into small reviewed task packets before starting. All actual human owners are unassigned; implementation is not assessed in this document.

| Package | Accountable role | Start window | Scope |
|---|---|---|---|
| [WP01](#g-wp01) — Architecture, contracts and outcome integration | [D01](#g-d01) | W0 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP02](#g-wp02) — Independent identity, access, members and subtenants | [D15](#g-d15) | W1 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP03](#g-wp03) — Core platform APIs, transactional storage and migrations | [D02](#g-d02) | W1 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP04](#g-wp04) — Graph, inventory, local search and data lineage | [D03](#g-d03) | W1–W2 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP05](#g-wp05) — Policies, purposes, regulatory packs and applicability | [D04](#g-d04) | W2 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP06](#g-wp06) — Notices, ordered consent and withdrawal acceptance | [D02](#g-d02) | W2 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP07](#g-wp07) — Rights, identity matching, nomination and guardians | [D05](#g-d05) | W2–W3 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP08](#g-wp08) — Durable orchestration, plans, approvals and reconciliation | [D05](#g-d05) | W2 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP09](#g-wp09) — Agent, connector SDK and capability conformance | [D06](#g-d06) | W2 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP10](#g-wp10) — Database connectors and independent readback | [D07](#g-d07) | W2 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP11](#g-wp11) — REST/SaaS connectors and external processor paths | [D08](#g-d08) | W2 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP12](#g-wp12) — Runtime enforcement and policy SDKs | [D04](#g-d04) | W2 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP13](#g-wp13) — Verification engine, outcome claims, coverage and failures | [D07](#g-d07) | W2 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP14](#g-wp14) — Evidence, audit, privacy of stored history and reporting | [D02](#g-d02) | W1–W2 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP15](#g-wp15) — Retention, deletion, restricted copies and restoration safety | [D05](#g-d05) | W3 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP16](#g-wp16) — Processors, assessments, SDF governance and remediation | [D03](#g-d03) | W3 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP17](#g-wp17) — Incident workspace, clocks and notification engine | [D05](#g-d05) | W3 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP18](#g-wp18) — Customer-facing Privacy Test Engine and regression product | [D18](#g-d18) | W2–W3 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP19](#g-wp19) — Deterministic drift, reusable controls and change simulation | [D04](#g-d04) | W3 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP20](#g-wp20) — Shared design system and interface contracts | [D10](#g-d10) | W0–W1 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP21](#g-wp21) — Customer Workspace, local administration and operator UI | [D09](#g-d09) | W1–W3 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP22](#g-wp22) — Customer Privacy Centre and public/private separation | [D11](#g-d11) | W2–W3 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP23](#g-wp23) — Vendor website, customer Account and commerce | [D02](#g-d02) | W1–W3, parallel to customer core | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP24](#g-wp24) — Vendor staff administration and support-case lifecycle | [D13](#g-d13) | W2–W3 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP25](#g-wp25) — Signed licences, entitlements and continuity | [D20](#g-d20) | W2–W4 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP26](#g-wp26) — Privacy-safe diagnostic reports and escalation transport | [D12](#g-d12) | W2–W4 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP27](#g-wp27) — Full-product ZIP, installation, distribution and updates | [D20](#g-d20) | Early scaffold W1; release completion W4–W5 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP28](#g-wp28) — Infrastructure, environments and internal CI/CD | [D16](#g-d16) | W1 onward | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP29](#g-wp29) — Customer-local monitoring, backup, recovery and operations | [D17](#g-d17) | W1 instrumentation; W4–W5 acceptance | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP30](#g-wp30) — Security programme, independent assessment and release blockers | [D14](#g-d14) | W0 design; all waves; W5 release decision | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP31](#g-wp31) — Internal QA, integration, accessibility and release evidence | [D18](#g-d18) | W0 test design; W1 onward execution | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP32](#g-wp32) — Performance, capacity and destructive-failure safety | [D19](#g-d19) | Early workloads W1; measured runs W2–W5 | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP33](#g-wp33) — Optional rules-based Guided Assistance | [D13](#g-d13) | After core/support are stable; not a release prerequisite | V1_OPTIONAL_RULES_ONLY |
| [WP34](#g-wp34) — Developer experience, CLI, documentation and customer handover | [D20](#g-d20) | W0 skeleton; W1–W5 alongside features | V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES |
| [WP35](#g-wp35) — Future custom ORVIA Intelligence | [D12](#g-d12) | Not scheduled for V1 | DEFERRED_V2 |
| [WP36](#g-wp36) — Previously later ecosystem and advanced expansion ownership | [D01](#g-d01) | Per existing capability-specific release approval | EXISTING_ROADMAP_QUALIFICATION_UNCHANGED |


<a id="g-wp01"></a>
### WP01 — Architecture, contracts and outcome integration

**Accountable:** D01 — Chief Architect / Technical Lead. **Contributors:** D02 D03 D04 D05 D09 D14 D15 D20. **Human owner:** UNASSIGNED.

**Source:** §1, §2, §3, §4, §10, §11, §12, §116, §117, §119, §120, §121, §138, §146, §184, §186, §187, §188, §189, §190, §200, §201, §202, §203, §204, §205, §206, §207, §208, §209, §210, §211, §212, §216. **Original modules:** Cross-cutting. **Existing epics:** Cross-cutting/source-defined work; original E IDs unchanged.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W0. **Acceptance predecessors:** No new V1 predecessor; see release qualification.

**What to build:** Freeze the active master, identity/hosting boundaries, common terminology, state machines, deployment-unit inventory and change-control. Choose unresolved implementation options once through an ADR. Assign one technical lead per complete outcome, not merely per screen.

**Deliverables:** Approved architecture and contracts; source/role/work-package map; decision log; integration plan; repository ownership rules.

**Accept when:** Every V1 capability has an owner and test boundary; no V2 model dependency; proposed UI/API/event contracts agree; unsupported decisions have an owner and block dependent work.

**Review:** Founder product review; D14 security; D18 acceptance; D20 packaging.

**Trust boundary:** VENDOR + CUSTOMER_LOCAL, SEPARATE. **Implementation track:** ChatGPT Work. **Interface/content track:** Claude Cowork.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. **Decision/risk:** Uncoordinated AI redesigns and missed integration ownership.


<a id="g-wp02"></a>
### WP02 — Independent identity, access, members and subtenants

**Accountable:** D15 — IAM / Identity Engineer. **Contributors:** D02 D04 D09 D11 D14 D18. **Human owner:** UNASSIGNED.

**Source:** §5, §6, §7, §20, §23, §33, §35, §109, §110, §127, §158. **Original modules:** M01, M02, M13, M33. **Existing epics:** E01.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W1. **Acceptance predecessors:** WP01.

**What to build:** Implement separate vendor commerce/staff, customer operator and principal sessions. Add local owner bootstrap/recovery, privileged MFA, delegated admin/member permissions, service credentials and subtenant/environment restrictions. Keep identity proof for rights distinct from ordinary login.

**Deliverables:** Role/permission matrix; auth/session middleware; member/role APIs and views; recovery process; machine-identity contracts.

**Accept when:** Vendor token cannot access customer runtime; customer token cannot become vendor staff; siblings and principals cannot cross scopes; delegated admin cannot elevate itself or bypass approvals.

**Review:** D14 + D18; customer identity prerequisites reviewed.

**Trust boundary:** VENDOR + CUSTOMER_LOCAL, SEPARATE. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. **Decision/risk:** A global super-admin bypass defeats the whole data promise.


<a id="g-wp03"></a>
### WP03 — Core platform APIs, transactional storage and migrations

**Accountable:** D02 — Core Backend Engineer. **Contributors:** D03 D15 D16 D18 D20. **Human owner:** UNASSIGNED.

**Source:** §5, §11, §12, §35, §36, §97, §99, §100, §101, §122, §124, §131, §170. **Original modules:** M02. **Existing epics:** E01 E02.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W1. **Acceptance predecessors:** WP01, WP02.

**What to build:** Build customer domain API composition, explicit ownership/tenant data access, constraints, migration ordering, safe errors and event contracts. Apply equivalent patterns separately to vendor business records. Do not place the whole graph in an arbitrary JSON document.

**Deliverables:** Schemas/migrations; scoped repositories; API foundation; validation/error envelope; seed fixtures; backwards-compatibility checks.

**Accept when:** Authenticated write persists across restart; wrong-scope queries fail; schema upgrade preserves data; missing tenant context is denied before reads/mutations.

**Review:** D03 data + D14/D15 access + D18 tests.

**Trust boundary:** VENDOR + CUSTOMER_LOCAL, SEPARATE. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp04"></a>
### WP04 — Graph, inventory, local search and data lineage

**Accountable:** D03 — Privacy Control Graph Engineer. **Contributors:** D02 D04 D06 D07 D08 D09. **Human owner:** UNASSIGNED.

**Source:** §4, §5, §8, §9, §28, §29, §49, §62, §105, §157. **Original modules:** M03, M06, M18. **Existing epics:** E02 E15.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W1–W2. **Acceptance predecessors:** WP03.

**What to build:** Model purposes, processing conditions, systems, assets, copies, processors, relationships, owners and provenance. Import supported discovery observations; keep declared and observed inventory distinct. Build impact and local permission-filtered search.

**Deliverables:** Graph schema/query API; inventory review; lineage/impact results; search/index scope; historical graph fixtures.

**Accept when:** Affected systems can be traced from a purpose; old evidence resolves its historic references; revoking discovery permission lowers freshness instead of preserving false coverage.

**Review:** D04 policy inputs; D14/D15 search isolation; D18 graph tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp05"></a>
### WP05 — Policies, purposes, regulatory packs and applicability

**Accountable:** D04 — Policy Engine Engineer. **Contributors:** D02 D03 D09 D10 D15; privacy counsel. **Human owner:** UNASSIGNED.

**Source:** §9, §13, §14, §15, §148, §165, §166, §167, §170, §218. **Original modules:** M04. **Existing epics:** E02 E03.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2. **Acceptance predecessors:** WP04.

**What to build:** Build deterministic decision and obligation schemas, reviewed publication/migration lifecycle, applicability records, legal source/version register and separate admin/processing policy namespaces. Store source text, interpretation, customer facts and executable rule separately.

**Deliverables:** Policy APIs/UI; versioned rule/source packs; applicability evaluation; approval records; decision reason codes and tests.

**Accept when:** Historical decision retains exact version; evaluation failure is not ALLOW; unsatisfied masking/other obligations block or escalate; future-effective content is not silently active.

**Review:** D15 technical permission review; counsel approves interpretations; D18 tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp06"></a>
### WP06 — Notices, ordered consent and withdrawal acceptance

**Accountable:** D02 — Core Backend Engineer. **Contributors:** D03 D04 D05 D09 D10 D11 D15. **Human owner:** UNASSIGNED.

**Source:** §16, §17, §18, §19, §155, §156. **Original modules:** M11, M12. **Existing epics:** E03 E09.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2. **Acceptance predecessors:** WP03, WP05, WP14.

**What to build:** Implement notice/version/language management, purpose-specific capture receipts, import provenance, consent epochs, fresh re-consent and atomic withdrawal plus outbox publication. Keep communications preferences separate from processing permission.

**Deliverables:** Notice/consent APIs; review/capture/withdrawal UI contracts; receipts; monotonic transition tests; language/content fixtures.

**Accept when:** Duplicate grant creates no duplicate transition; stale grant cannot undo withdrawal; new consent is a new authorised transition; changed purpose does not silently inherit old consent.

**Review:** D04 meaning; D05 ordering; D15 actor/identity; D18 tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp07"></a>
### WP07 — Rights, identity matching, nomination and guardians

**Accountable:** D05 — Workflow / Distributed Systems Engineer. **Contributors:** D02 D03 D04 D09 D11 D14 D15. **Human owner:** UNASSIGNED.

**Source:** §20, §22, §23, §24, §26, §80. **Original modules:** M13, M14. **Existing epics:** E08.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2–W3. **Acceptance predecessors:** WP02, WP04, WP05, WP08.

**What to build:** Build scoped rights requests, identity confidence, authority/representation, nomination and guardian lifecycles, safe response delivery, manual review and per-system unresolved status. Build applicable baseline safeguards before supporting that processing.

**Deliverables:** Request/representation state machine; authority APIs; operator and principal journey contracts; secure disclosure/export rules.

**Accept when:** Ambiguous identity prevents destructive automation; revoked authority prevents new action; third-party information is not disclosed; CLOSED does not imply every target verified.

**Review:** D15/D14 identity/disclosure; privacy reviewer scope; D18 negative tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp08"></a>
### WP08 — Durable orchestration, plans, approvals and reconciliation

**Accountable:** D05 — Workflow / Distributed Systems Engineer. **Contributors:** D02 D04 D06 D14 D17. **Human owner:** UNASSIGNED.

**Source:** §17, §18, §24, §25, §26, §43, §99, §100, §149, §174, §175, §176, §177, §178, §179, §180, §181, §182, §183. **Original modules:** M05. **Existing epics:** E04 E09 E10.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2. **Acceptance predecessors:** WP03, WP05, WP14.

**What to build:** Implement durable workflow history, transactional event publication, deduplication, exact-scope approvals, action attempts, unknown/reconciling outcomes, retries, cancellation, manual tasks and safe resume under current authorisation.

**Deliverables:** Workflow definitions; action/approval contract; outbox/inbox; failure/escalation paths; restart/replay tests.

**Accept when:** Accepted event survives publisher/worker crash; lost response enters reconciliation; changed scope invalidates approval; old work cannot mutate a new record generation blindly.

**Review:** D04 policy; D06 external effects; D18/D19 fault tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp09"></a>
### WP09 — Agent, connector SDK and capability conformance

**Accountable:** D06 — Connector Platform Engineer. **Contributors:** D05 D07 D08 D14 D15 D20. **Human owner:** UNASSIGNED.

**Source:** §27, §28, §30, §171, §172, §173, §176, §177. **Original modules:** M06. **Existing epics:** E05 E15.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2. **Acceptance predecessors:** WP02, WP03, WP08.

**What to build:** Build restricted customer agent, customer-controlled command authority, capability/version manifests, nonce/expiry/scope checks, connector lifecycle, secret references, isolation and operation budgets. Provide reproducible connector conformance tests.

**Deliverables:** Agent and SDK; manifest/command schema; sandbox harness; health API; compatibility/advisory metadata.

**Accept when:** Wrong tenant/install, expired or replayed commands fail; plugin cannot read another secret; loss of permission changes advertised capability; no vendor command channel.

**Review:** D14/D15 security; D20 signing/package; D18 conformance.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp10"></a>
### WP10 — Database connectors and independent readback

**Accountable:** D07 — Data Connector Engineer. **Contributors:** D03 D05 D06 D14 D19. **Human owner:** UNASSIGNED.

**Source:** §23, §27, §28, §29, §44, §49, §51, §128, §171, §172, §173, §178. **Original modules:** M06, M07. **Existing epics:** E06 E07 E15.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2. **Acceptance predecessors:** WP04, WP09.

**What to build:** Implement supported PostgreSQL/MySQL discovery, scoped query/match, restrict/update/delete where supported, and read-after-effect verification. Limit permissions and workload. Treat replicas/backups according to actual capability.

**Deliverables:** Database adapters; exact-match fixtures; paginated discovery; scoped action plans; observed-result records; permission/load documentation.

**Accept when:** Synthetic CRM membership changes and is read back; wrong or ambiguous identity cannot mutate; records beyond approved scope remain unchanged; unobserved copies stay unverified.

**Review:** D06 contract; D14 query/secret safety; D18/D19 scope and load.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp11"></a>
### WP11 — REST/SaaS connectors and external processor paths

**Accountable:** D08 — SaaS/API Integration Engineer. **Contributors:** D05 D06 D14 D17 D18. **Human owner:** UNASSIGNED.

**Source:** §27, §28, §29, §44, §53, §56, §75, §98, §128, §173, §174, §176. **Original modules:** M06, M07, M10, M16. **Existing epics:** E06 E07 E15.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2. **Acceptance predecessors:** WP04, WP09.

**What to build:** Build the common REST adapter and the pilot-selected CRM/marketing/support integrations. Handle supported credentials, pagination, bounded retries, webhook signatures, changed permissions and reconciliation. Keep controlled simulators labelled.

**Deliverables:** Provider adapters; simulator/test accounts; webhook receiver/sender; capability limits; conformance results.

**Accept when:** Effect followed by response loss yields unknown then supported reconciliation; missing pages/permissions cannot become complete coverage; unapproved destinations are blocked.

**Review:** D06 capability; D14 endpoint/credential safety; D18 provider failure.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp12"></a>
### WP12 — Runtime enforcement and policy SDKs

**Accountable:** D04 — Policy Engine Engineer. **Contributors:** D05 D06 D08 D14 D20. **Human owner:** UNASSIGNED.

**Source:** §13, §40, §41, §42, §43, §178, §179, §180, §181, §182, §183. **Original modules:** M04, M06. **Existing epics:** E09 E10.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2. **Acceptance predecessors:** WP05, WP06, WP09.

**What to build:** Build supported Node/Python SDK and application/API enforcement boundaries, local policy-service calls, decision obligations, consent-epoch/freshness checks, approved degraded modes and audit correlation. Later languages retain their original sequencing.

**Deliverables:** SDK check/authorise/enforce/record; runtime adapter; obligation handlers; freshness contract; demonstrable supported boundary.

**Accept when:** Post-withdrawal marketing send is blocked; unrelated approved service action is evaluated independently; stale revocation cannot silently fail open; required mask actually changes the payload.

**Review:** D14 safety; D05 race behaviour; D20 SDK compatibility; D18 enforcement tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp13"></a>
### WP13 — Verification engine, outcome claims, coverage and failures

**Accountable:** D07 — Data Connector Engineer. **Contributors:** D02 D03 D05 D06 D08 D09 D13. **Human owner:** UNASSIGNED.

**Source:** §44, §48, §49, §151, §169, §185, §196. **Original modules:** M07, M18. **Existing epics:** E07 E09.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2. **Acceptance predecessors:** WP08, WP10, WP11, WP14.

**What to build:** Build shared outcome/observation records with scope, method, source, observation time, freshness and limitations; unify adapter readbacks. Track configuration, attempt, acknowledgement, observation and test result separately. Surface gaps and manual tasks.

**Deliverables:** Claim/verification APIs; coverage denominator and exclusions; failed/stale/unknown states; failure-centre UI contract.

**Accept when:** API success with unchanged target fails verification; stale observation loses freshness; one successful target does not mark all systems verified; manual task cannot fabricate observation.

**Review:** D08 multi-provider review; D05 lifecycle; D18 independent observation tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp14"></a>
### WP14 — Evidence, audit, privacy of stored history and reporting

**Accountable:** D02 — Core Backend Engineer. **Contributors:** D03 D05 D07 D09 D14 D17 D20. **Human owner:** UNASSIGNED.

**Source:** §31, §45, §46, §47, §106, §132, §133, §134, §150, §161, §162, §169. **Original modules:** M08, M33. **Existing epics:** E07 E10.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W1–W2. **Acceptance predecessors:** WP03.

**What to build:** Build append-oriented audit/evidence, historical version references, separately retained integrity envelopes and personal payloads, correction events, local authorised exports and reports. Implement manifest/offline integrity verification without overclaiming external truth.

**Deliverables:** Evidence/audit APIs; envelope/payload schema; retention and purge jobs; reports/exports; integrity validator; access auditing.

**Accept when:** Changed evidence bytes fail integrity; authorised historical data resolves exact versions; personal payload deletion preserves justified envelope semantics; export cannot cross tenant/vendor boundaries.

**Review:** D14 integrity/privacy; D03 reference retention; D18 tamper/export tests; counsel retention review.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp15"></a>
### WP15 — Retention, deletion, restricted copies and restoration safety

**Accountable:** D05 — Workflow / Distributed Systems Engineer. **Contributors:** D03 D04 D06 D07 D08 D14 D17. **Human owner:** UNASSIGNED.

**Source:** §50, §51, §52, §91, §92, §132, §178, §179. **Original modules:** M15. **Existing epics:** E11.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W3. **Acceptance predecessors:** WP04, WP05, WP08, WP10, WP13.

**What to build:** Implement copy/purpose-specific retention constraints, lawful holds, restricted retained copies, release/re-evaluation, safe deletion plans and derived-copy tasks. Preserve scoped cryptographic deletion as advanced support-gated capability. Reconcile restored restrictions before resumed processing.

**Deliverables:** Retention/hold APIs; eligibility planner; safe deletion workflows; copy outcome report; restore-reconciliation ledger/process.

**Accept when:** Marketing stops while a valid retained transaction stays purpose-restricted; hold release rechecks scope; restoring an old audience cannot reactivate known withdrawal; unsupported backup erasure remains explicit.

**Review:** D04/counsel retention meaning; D14 destruction safety; D17/D19 restore; D18 tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp16"></a>
### WP16 — Processors, assessments, SDF governance and remediation

**Accountable:** D03 — Privacy Control Graph Engineer. **Contributors:** D02 D04 D05 D08 D09; privacy SME. **Human owner:** UNASSIGNED.

**Source:** §53, §80, §118, §165, §166, §167, §214. **Original modules:** M16. **Existing epics:** E02 E16.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W3. **Acceptance predecessors:** WP04, WP05, WP08, WP14.

**What to build:** Build processor relationships/contracts, subprocessor scope, response tasks, assessment records, findings, remediation owners and closure tests. Model SDF pack/applicability only against reviewed facts; do not infer legal status from company size.

**Deliverables:** Processor/assessment APIs and UI; findings/remediation workflow; reviewer evidence; approved assessment calendar and pack configuration.

**Accept when:** Processor change identifies affected controls; questionnaire completion does not mark runtime verification; finding closure links to evidence/retest; unreviewed applicability stays unresolved.

**Review:** Privacy reviewer owns meaning; D05 actions; D14 access; D18 closure tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp17"></a>
### WP17 — Incident workspace, clocks and notification engine

**Accountable:** D05 — Workflow / Distributed Systems Engineer. **Contributors:** D02 D03 D04 D08 D09 D10 D17; privacy SME. **Human owner:** UNASSIGNED.

**Source:** §54, §55, §56, §75, §98, §100, §108. **Original modules:** M10, M17. **Existing epics:** E13.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W3. **Acceptance predecessors:** WP04, WP05, WP08, WP14.

**What to build:** Implement local incident timelines, affected scope, rule-driven severity, separately configured notification tasks/clocks, human review, actual dispatch evidence and processor/manual submission handling. Implement in-app/email/webhook routes under the approved boundary; retain later channels.

**Deliverables:** Incident/notification APIs; independent clock engine; reviewed templates; operator timeline; safe delivery/status records.

**Accept when:** One incident can have completed and pending notifications independently; corrected timestamps preserve history; a draft never counts as delivery; no automatic legal declaration.

**Review:** Privacy reviewer approves clock/content rules; D14 data recipients; D18 timeline and delivery tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp18"></a>
### WP18 — Customer-facing Privacy Test Engine and regression product

**Accountable:** D18 — QA / Automation Engineer. **Contributors:** D04 D05 D06 D07 D08 D09 D12 D20. **Human owner:** UNASSIGNED.

**Source:** §57, §58, §59, §60, §61, §107, §193. **Original modules:** M09. **Existing epics:** E09 E12.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2–W3. **Acceptance predecessors:** WP08, WP10, WP12, WP14.

**What to build:** Build executable test specifications, synthetic identities/fixtures, environment safety, expected/actual assertions, versioned results, schedules and customer CI outputs. This shipped engine is distinct from the team’s internal QA suite.

**Deliverables:** Test schema/runner; fixture lifecycle; regression suite; machine-readable CI result; failure/evidence UI.

**Accept when:** A real enforcement bypass in an isolated fixture causes a failing assertion; repair passes the same scope; destructive test against unapproved production scope is blocked.

**Review:** D14 test safety; D04 expected policy meaning; D20 CI contract; independent D12/D19 fixtures.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp19"></a>
### WP19 — Deterministic drift, reusable controls and change simulation

**Accountable:** D04 — Policy Engine Engineer. **Contributors:** D03 D05 D06 D09 D18 D20. **Human owner:** UNASSIGNED.

**Source:** §40, §49, §60, §62, §148, §213. **Original modules:** M03, M04, M09, M18. **Existing epics:** E12.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W3. **Acceptance predecessors:** WP04, WP05, WP12, WP18.

**What to build:** Build graph/configuration diffs, impact assessment, affected tests, controlled review and reusable control packages. Simulator uses explicit snapshots and approved synthetic data; predictions retain assumptions. AI explanation remains deferred.

**Deliverables:** Control-package schema; diff/simulation APIs; code-review/CLI outputs; promotion history; drift owner/task mapping.

**Accept when:** New unapproved destination produces a scoped review/test failure; missing inventory stays unknown; policy rollback cannot restore withdrawn consent or erase evidence.

**Review:** D03 graph accuracy; D14 promotion safety; D18 mutation/impact tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp20"></a>
### WP20 — Shared design system and interface contracts

**Accountable:** D10 — Product UX Engineer. **Contributors:** D09 D11 D14 D18. **Human owner:** UNASSIGNED.

**Source:** §102, §103, §104, §105, §106, §107, §108, §154, §155, §156, §184, §185. **Original modules:** Cross-cutting. **Existing epics:** Cross-cutting/source-defined work; original E IDs unchanged.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W0–W1. **Acceptance predecessors:** WP01.

**What to build:** Create reusable components and interaction/state specifications for vendor/account, staff, customer workspace and principal portal. Define accessibility, responsive behaviour, localisation, validation, confirmations and truthful outcome labels.

**Deliverables:** Design system; screen/state catalogue; form/permission/empty/error specifications; accessible components and UI fixtures.

**Accept when:** Keyboard/focus/error flows work in assessed browsers; role/domain are clear; unknown/unverified is not styled as success; no V1 fake AI or unsupported compliance score.

**Review:** D09/D11 implementation review; D14 unsafe actions; D18 accessibility.

**Trust boundary:** SHARED SOURCE; SEPARATE DEPLOYMENTS. **Implementation track:** Claude Cowork. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp21"></a>
### WP21 — Customer Workspace, local administration and operator UI

**Accountable:** D09 — Frontend Platform Engineer. **Contributors:** D02 D03 D04 D05 D10 D14 D15 D17. **Human owner:** UNASSIGNED.

**Source:** §6, §7, §34, §89, §102, §103, §104, §105, §106, §107, §108, §157, §158, §170, §184, §185. **Original modules:** M01, M02, M03, M04, M05, M07, M08, M09, M11, M12, M14, M15, M16, M17, M18, M29, M32, M33. **Existing epics:** Cross-cutting/source-defined work; original E IDs unchanged.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W1–W3. **Acceptance predecessors:** WP02, WP03, WP20.

**What to build:** Build role-oriented dashboards, graph/policy/consent/request views, actions/approvals, integrations, evidence, testing, incidents and local settings. Bind incremental screens to corresponding feature contracts; keep data-boundary configured/observed/tested status explicit.

**Deliverables:** Customer-console routes/API bindings; members/roles/settings; evidence/drift/failure UI; actual local health; browser journeys.

**Accept when:** An authorised browser action changes persisted local state; read-only user cannot mutate; no vendor assets/telemetry are needed to render runtime; feature flags cannot fake implementation.

**Review:** D10 usability; D15 security; D18 browser/end-to-end. Each page also waits for its specific API package.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Claude Code. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp22"></a>
### WP22 — Customer Privacy Centre and public/private separation

**Accountable:** D11 — Data Principal Portal Engineer. **Contributors:** D02 D05 D10 D14 D15. **Human owner:** UNASSIGNED.

**Source:** §19, §20, §22, §23, §24, §33, §111, §154, §155, §156. **Original modules:** M11, M12, M13, M14. **Existing epics:** E08 E09.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2–W3. **Acceptance predecessors:** WP02, WP06, WP07, WP20.

**What to build:** Build customer-branded notices, consent and rights journeys with scoped authentication, uploads, receipts/status, nomination/representation and accessibility. Publish through customer-controlled ingress where approved; keep admin endpoints private.

**Deliverables:** Principal portal; secure session flow; form/API integration; reviewed language content; safe response/status UI.

**Accept when:** Principal can withdraw and view its own receipt; another person’s data is denied; public portal cannot invoke admin APIs; vendor commercial account is not needed.

**Review:** D15 identity; D14 exposure/uploads; D18 cross-person/browser tests.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Claude Code. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp23"></a>
### WP23 — Vendor website, customer Account and commerce

**Accountable:** D02 — Core Backend Engineer. **Contributors:** D08 D09 D10 D14 D15 D20; product/finance. **Human owner:** UNASSIGNED.

**Source:** §31, §76, §77, §78, §79, §80, §81, §82, §83, §135, §136, §159, §168, §195, §198, §204. **Original modules:** M26, M27, M28, M29. **Existing epics:** Cross-cutting/source-defined work; original E IDs unchanged.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W1–W3, parallel to customer core. **Acceptance predecessors:** WP01, WP02, WP03, WP20.

**What to build:** Build product/edition/docs/security pages, account membership, checkout/subscription/invoice/payment-state handling, download entitlements and customer business support entry. Readiness scanner remains reviewed declarations, not permission to upload operational inventory; reconcile any conflicting field against §31.

**Deliverables:** Website/Account UI and separate vendor APIs/database; commercial provider adapter after selection; invoice/subscription states; download selector.

**Accept when:** Purchase/licence issuance follows verified commercial state; duplicate provider event cannot duplicate entitlement; one buyer cannot access another account; no live workload dashboards are invented.

**Review:** D15 account access; D14 collection/payment boundary; product/finance selects provider and commercial rules.

**Trust boundary:** VENDOR_ONLY; BUSINESS DATA. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. **Decision/risk:** Checkout/provider not yet selected: record dependency, do not invent a deployed integration.


<a id="g-wp24"></a>
### WP24 — Vendor staff administration and support-case lifecycle

**Accountable:** D13 — AI Applications Engineer. **Contributors:** D02 D09 D10 D14 D15 D17. **Human owner:** UNASSIGNED.

**Source:** §6, §7, §89, §95, §96, §158. **Original modules:** M30, M33. **Existing epics:** Cross-cutting/source-defined work; original E IDs unchanged.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2–W3. **Acceptance predecessors:** WP02, WP03, WP20, WP23.

**What to build:** Build Vendor Super Admin/Admin staff roles, scoped assignments, support attention queue, case details, synthetic reproductions, defect/advisory links and staff audit. Use submitted/approved reports only; runtime health may be unreported.

**Deliverables:** Staff-console UI; separate support APIs; assignment/state machine; safe attachment/rejection handling; staff access audit.

**Accept when:** Assigned admin can process a permitted case but not inspect customer runtime; unassigned case enumeration denied; closure does not change local verification; no model required for support.

**Review:** D14/D15 authority; D18 case isolation; support owner staffing.

**Trust boundary:** VENDOR_ONLY; PERMITTED SUPPORT DATA. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp25"></a>
### WP25 — Signed licences, entitlements and continuity

**Accountable:** D20 — Release / Platform / Developer Experience Engineer. **Contributors:** D02 D04 D09 D14 D15; product/legal. **Human owner:** UNASSIGNED.

**Source:** §76, §77, §78, §79, §80, §81, §94, §144, §145, §146, §159, §160, §161, §198, §204. **Original modules:** M27, M28. **Existing epics:** E10.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2–W4. **Acceptance predecessors:** WP02, WP03, WP23.

**What to build:** Implement vendor licence issuance and customer-local verification as distinct services/trusts; purchased capabilities, supported-release checks, feature flags, edition changes, renewal/import, expiry/handover and permitted random installation binding.

**Deliverables:** Licence schema/signer/verifier; local entitlement evaluator; import/renewal UI; continuity tests; no-AI V1 capability manifest.

**Accept when:** Vendor outage does not stop valid local processing; expired licence never turns BLOCK to ALLOW or wipes data; flag/paid tier cannot activate deferred V2 code; local records survive edition change.

**Review:** D14 key separation; D04 safety; product/legal signs continuity terms; D18 negative tests.

**Trust boundary:** VENDOR ISSUANCE / CUSTOMER VERIFICATION; MINIMUM EXCHANGE. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp26"></a>
### WP26 — Privacy-safe diagnostic reports and escalation transport

**Accountable:** D12 — AI/ML Engineer. **Contributors:** D02 D06 D09 D13 D14 D15 D17. **Human owner:** UNASSIGNED.

**Source:** §31, §89, §95, §96, §132. **Original modules:** M30. **Existing epics:** E10.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W2–W4. **Acceptance predecessors:** WP02, WP03, WP24.

**What to build:** Build fixed-schema local diagnostic generation, forbidden-field check, local preview and approval, permitted optional support-signal rules and customer-origin transport/offline transfer. Keep detailed local evidence and mappings inside the customer.

**Deliverables:** Local exporter/validator; support report schema; preview/approval UI; permitted vendor ingress; synthetic reproduction protocol.

**Accept when:** Forbidden fields prevent sending; vendor does not retain rejected bodies; revoke standing rule stops future signals; no remote shell/impersonation; case state and local action state stay independent.

**Review:** D14 mandatory boundary review; D15 approval; D18 canary/offline/revocation tests.

**Trust boundary:** STRICT §31 ALLOWLIST BRIDGE. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp27"></a>
### WP27 — Full-product ZIP, installation, distribution and updates

**Accountable:** D20 — Release / Platform / Developer Experience Engineer. **Contributors:** D06 D09 D14 D15 D16 D17 D18. **Human owner:** UNASSIGNED.

**Source:** §82, §83, §84, §85, §86, §93, §101, §146, §147, §148, §149, §160, §194, §197, §202, §203. **Original modules:** M29, M31. **Existing epics:** E10 E16.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** Early scaffold W1; release completion W4–W5. **Acceptance predecessors:** WP03, WP14, WP20, WP25, WP28.

**What to build:** Produce signed images and primary ZIP envelope with supported server/Compose, Kubernetes/Helm and offline profiles as actually validated. Include preflight, local bootstrap/licence import, durable dependencies, migration, rollback or forward recovery, advisories and customer-approved updates.

**Deliverables:** Versioned ZIP; manifest/signatures/SBOM/provenance; installer/verifier; offline dependency inventory; supported matrix; release/upgrade instructions.

**Accept when:** Clean install works without code rebuild/model/GPU; tampered package rejected; no hidden downloads in declared offline profile; vendor account cannot execute updates remotely; upgrade preserves data and restrictions.

**Review:** D14 trust; D15 bootstrap; D18 clean install; D17 restore; customer IT support profile.

**Trust boundary:** VENDOR DISTRIBUTION → CUSTOMER-APPROVED LOCAL INSTALL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp28"></a>
### WP28 — Infrastructure, environments and internal CI/CD

**Accountable:** D16 — Cloud / DevOps Engineer. **Contributors:** D01 D14 D17 D18 D20. **Human owner:** UNASSIGNED.

**Source:** §11, §12, §34, §37, §38, §39, §86, §87, §116, §122, §123, §124, §130. **Original modules:** M31, M32. **Existing epics:** Cross-cutting/source-defined work; original E IDs unchanged.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W1 onward. **Acceptance predecessors:** WP01.

**What to build:** Build repo execution foundation, isolated development/test/staging, vendor hosting, customer deployment manifests, scoped build credentials, secrets integration, test/scanning jobs and artifact production. Keep internal CI distinct from customer privacy-test CI.

**Deliverables:** Infrastructure definitions; image/build scripts; test/scanning pipeline; local environment; deployment profiles; credential/trust inventory.

**Accept when:** Same source builds reproducibly with pinned inputs; vendor/customer networks and secrets separate; missing model is expected; secrets do not appear in code/artifacts/logs.

**Review:** D14 hardening; D17 recoverability; D20 artifact policy.

**Trust boundary:** SEPARATE ENGINEERING / VENDOR / CUSTOMER ENVIRONMENTS. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp29"></a>
### WP29 — Customer-local monitoring, backup, recovery and operations

**Accountable:** D17 — SRE / Observability Engineer. **Contributors:** D02 D05 D06 D09 D14 D16 D19 D20. **Human owner:** UNASSIGNED.

**Source:** §43, §88, §89, §90, §91, §92, §129, §130, §131, §132, §195, §196. **Original modules:** M32. **Existing epics:** E10 E16.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W1 instrumentation; W4–W5 acceptance. **Acceptance predecessors:** WP03, WP08, WP14, WP28.

**What to build:** Implement local telemetry/health/security alerts, redaction, retention, backups, restore/runbooks and operator responsibilities. Vendor monitoring covers only its own services plus permitted support signals. Measure freshness, backlog and recovery rather than uptime alone.

**Deliverables:** Health dashboards; privacy-safe telemetry; backup/restore scripts; operating guide; measured service/recovery evidence.

**Accept when:** Accepted workflow/evidence survive tested recovery; restored consent restrictions reconcile before traffic; prohibited canaries never reach vendor telemetry; offline health is not fabricated.

**Review:** D14 egress; D19 fault testing; D18 evidence; customer IT handover.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp30"></a>
### WP30 — Security programme, independent assessment and release blockers

**Accountable:** D14 — Security / Application Security Engineer. **Contributors:** D01 D02 D06 D09 D11 D15 D16 D18 D20; independent assessor. **Human owner:** UNASSIGNED.

**Source:** §7, §30, §31, §35, §36, §37, §38, §39, §46, §87, §90, §109, §110, §111, §126, §127, §128, §163, §164, §168, §171, §178, §206. **Original modules:** M01, M02, M06, M08, M30, M31, M33. **Existing epics:** Cross-cutting/source-defined work; original E IDs unchanged.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W0 design; all waves; W5 release decision. **Acceptance predecessors:** WP01.

**What to build:** Threat-model and implement/review authentication, authorisation, data egress, input/upload/connector abuse, key/signature trust, dependency risks and secure defaults. Run finding triage, independent production assessment, fixes/retests and vulnerability/advisory lifecycle.

**Deliverables:** Threat models; security test/finding register; scans/SBOM review; assessed-scope pentest/retest; vulnerability response and supported-version policy.

**Accept when:** No unresolved confirmed applicable Critical/High or mandatory boundary blocker in assessed release; no unknown-vulnerability guarantee; two AI reviews do not count as independent penetration testing.

**Review:** Qualified independent assessor for independent assurance; D01/D20/founder release decision.

**Trust boundary:** ALL SURFACES; NO PRIVILEGE BYPASS. **Implementation track:** ChatGPT Work + code owners. **Interface/content track:** Claude Code for browser controls.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp31"></a>
### WP31 — Internal QA, integration, accessibility and release evidence

**Accountable:** D18 — QA / Automation Engineer. **Contributors:** D02 D09 D10 D11 D12 D14 D17 D19 D20. **Human owner:** UNASSIGNED.

**Source:** §119, §120, §125, §126, §127, §128, §137, §191, §192, §193, §194, §207, §217. **Original modules:** Cross-cutting. **Existing epics:** Cross-cutting/source-defined work; original E IDs unchanged.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W0 test design; W1 onward execution. **Acceptance predecessors:** WP01.

**What to build:** Build internal unit/integration/browser/contract/security/privacy suites alongside code. Own independent assertions, fixture integrity, UI accessibility, regression control, release-scope coverage and factual test reporting. This is not the shipped Privacy Test Engine itself.

**Deliverables:** Executable suites; master-to-test traceability; build-linked results; defect/retest records; prototype/pilot/production acceptance report.

**Accept when:** Complete customer journeys execute on a named build; negative cases do not rely on fake success; deferred/unsupported/not-run tests are distinct; changes have regression coverage.

**Review:** D14 security; D01 scope; D20 artifact; an available reviewer distinct from the author.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Claude Cowork specifications + coding tracks. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp32"></a>
### WP32 — Performance, capacity and destructive-failure safety

**Accountable:** D19 — Performance / Reliability Engineer. **Contributors:** D03 D04 D05 D06 D07 D08 D17 D18. **Human owner:** UNASSIGNED.

**Source:** §43, §91, §92, §129, §130, §131, §174, §175, §176, §177. **Original modules:** Cross-cutting. **Existing epics:** E10 E16.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** Early workloads W1; measured runs W2–W5. **Acceptance predecessors:** WP03, WP08, WP09, WP28.

**What to build:** Build bounded load/race/fault workloads for policy decisions, consent transitions, workers, connectors and storage. Measure against declared configuration; investigate saturation, retries, noisy neighbours, disk pressure and recovery.

**Deliverables:** Workload/hardware specification; load and fault scripts; latency/throughput/recovery results; tuning recommendations and known limits.

**Accept when:** No stale grant/reactivated control under concurrency; load never bypasses permission/safety; retries respect provider budgets; targets are reported as measured, unmet or untested.

**Review:** D17 environment; D18 reproducibility; D14 failure safety.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp33"></a>
### WP33 — Optional rules-based Guided Assistance

**Accountable:** D13 — AI Applications Engineer. **Contributors:** D12 D02 D04 D09 D10 D14 D18. **Human owner:** UNASSIGNED.

**Source:** §5, §48, §62, §63, §66, §70, §95, §96, §103, §132, §157, §158, §168, §205. **Original modules:** M18, M30. **Existing epics:** E07/E10 optional detail.

**Release:** V1_OPTIONAL_RULES_ONLY. **Start:** After core/support are stable; not a release prerequisite. **Acceptance predecessors:** WP03, WP05, WP13, WP20, WP26.

**What to build:** Implement a small reviewed rule/error catalogue, local documentation search, runbook suggestions, configuration checklists and validated templates. Reuse existing data/permission structures. Start with error explanations and links; do not add a new AI service.

**Deliverables:** Versioned rule/runbook pack; deterministic guidance contract; optional local UI; source/version labels; no-match/insufficient-context states.

**Accept when:** Known error maps to reviewed facts/runbook; no arbitrary execution or invented root cause; missing helper leaves core/direct support usable; no weights/API/embedding/model dependency.

**Review:** D12 deterministic fixtures; D14 content/egress; D18 helper absence; qualified content review.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Codex. **Interface/content track:** Claude Code.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp34"></a>
### WP34 — Developer experience, CLI, documentation and customer handover

**Accountable:** D20 — Release / Platform / Developer Experience Engineer. **Contributors:** D01 D06 D09 D10 D13 D15 D17 D18; customer IT. **Human owner:** UNASSIGNED.

**Source:** §41, §82, §83, §84, §114, §115, §154, §155, §156, §161, §162, §168, §184, §186, §197. **Original modules:** M29, M31. **Existing epics:** Cross-cutting/source-defined work; original E IDs unchanged.

**Release:** V1_BASELINE_WITH_EXISTING_ROLLOUT_GATES. **Start:** W0 skeleton; W1–W5 alongside features. **Acceptance predecessors:** WP01.

**What to build:** Document actual APIs/SDKs/webhooks/connectors, reviewed local install/upgrade/restore, feature limits, role administration, offboarding and safe support. Package CLI commands against the same permission/API contracts. Prepare operator training and acceptance.

**Deliverables:** OpenAPI/SDK/CLI guides; quickstart; permissions/runbook catalogue; local handover/export manifest; truthful release/demo narrative.

**Accept when:** A fresh operator can reproduce documented supported install/workflow/recovery steps; examples match current build; offboarding exports locally and revokes credentials without artificial lock-in.

**Review:** D18 reproduction; D14 privacy; customer IT/operator acceptance.

**Trust boundary:** CUSTOMER_LOCAL. **Implementation track:** Claude Cowork content + Codex CLI. **Interface/content track:** Claude Code embedded help.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp35"></a>
### WP35 — Future custom ORVIA Intelligence

**Accountable:** D12 — AI/ML Engineer. **Contributors:** D13 D04 D14 D16 D18 D19 D20; privacy/content reviewer. **Human owner:** UNASSIGNED.

**Source:** §63, §64, §65, §66, §67, §68, §69, §70, §71, §72, §73, §74, §112, §113, §205. **Original modules:** M19, M20, M21, M22, M23, M24, M25. **Existing epics:** E14.

**Release:** DEFERRED_V2. **Start:** Not scheduled for V1. **Acceptance predecessors:** No new V1 predecessor; see release qualification.

**What to build:** Preserve the full from-scratch model lineage, approved public/licensed and vendor-authored corpus, authorised Lightning development, local inference, grounded assistance, safety/evaluation and signed model releases. This work begins only under a separately approved V2 plan.

**Deliverables:** Future corpus/model/evaluation/provenance and local-inference artifacts; future model-driven applications owned by D13.

**Accept when:** V1 build/install/runtime/CI does not depend on this package. Future model tests remain DEFERRED_V2; customer data never becomes training material.

**Review:** Future independent model/data/security review; founder separately approves budget.

**Trust boundary:** FUTURE VENDOR TRAINING / CUSTOMER-LOCAL INFERENCE. **Implementation track:** NO V1 EXECUTION. **Interface/content track:** NO V1 MODEL INTERFACE.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-wp36"></a>
### WP36 — Previously later ecosystem and advanced expansion ownership

**Accountable:** D01 — Chief Architect / Technical Lead. **Contributors:** D04 D06 D08 D11 D14 D16 D18 D20; privacy SME. **Human owner:** UNASSIGNED.

**Source:** §21, §41, §52, §60, §75, §80, §86, §142, §143, §153, §154, §199, §215. **Original modules:** Cross-cutting. **Existing epics:** E15 E16 as applicable.

**Release:** EXISTING_ROADMAP_QUALIFICATION_UNCHANGED. **Start:** Per existing capability-specific release approval. **Acceptance predecessors:** No new V1 predecessor; see release qualification.

**What to build:** Keep explicit owners for national/Consent Manager interoperability, later SDKs/mobile/channels, marketplace/plugins, advanced crypto deletion, restricted deployments and customer-AI-processing governance. Already supported V1 portions stay in their active packages; this register does not move them to V2.

**Deliverables:** Per-capability prerequisites, jurisdiction/provider decisions, conformance/support boundaries and retained roadmap backlog.

**Accept when:** No unsupported universal coverage, unlearning or integration claim. No new deadline or promise; each capability needs source/legal/security/integration gates already in the master.

**Review:** D14/D18 and the relevant qualified privacy/customer reviewer.

**Trust boundary:** AS APPROVED PER CAPABILITY. **Implementation track:** ChatGPT Work planning. **Interface/content track:** Documented roadmap only until released.

**Evidence state:** implementation NOT_ASSESSED; tests NOT_RUN_IN_THIS_REVIEW. 


<a id="g-modules"></a>
## G.6 — All 33 original modules have a named owner

This matrix uses the exact module IDs and names from master §10. “Lead” is proposed primary technical accountability; cross-cutting UI, identity, security and QA partners still apply. All seven AI applications use D12’s future model platform and remain unimplemented by this work allocation.

| ID | Original module | Lead | Work packages | Release assignment |
|---|---|---|---|---|
| M01 | Identity and Access Management | D15 | WP02, WP30 | V1 baseline; existing release gates |
| M02 | Tenant Management | D02 | WP03, WP02 | V1 baseline; existing release gates |
| M03 | Privacy Control Graph | D03 | WP04 | V1 baseline; existing release gates |
| M04 | Policy Engine | D04 | WP05, WP12, WP19 | V1 baseline; existing release gates |
| M05 | Workflow Engine | D05 | WP08 | V1 baseline; existing release gates |
| M06 | Connector Framework | D06 | WP09, WP10, WP11 | V1 baseline; existing release gates |
| M07 | Verification Engine | D07 | WP13, WP10, WP11 | V1 baseline; existing release gates |
| M08 | Evidence Engine | D02 | WP14 | V1 baseline; existing release gates |
| M09 | Privacy Test Engine | D18 | WP18, WP19 | V1 baseline; existing release gates |
| M10 | Notification Engine | D08 | WP17, WP11 | V1 baseline; existing release gates |
| M11 | Consent Management | D02 | WP06 | V1 baseline; existing release gates |
| M12 | Notice Management | D02 | WP06 | V1 baseline; existing release gates |
| M13 | Data Principal Portal | D11 | WP22 | V1 baseline; existing release gates |
| M14 | Rights Management | D05 | WP07 | V1 baseline; existing release gates |
| M15 | Retention Management | D05 | WP15 | V1 baseline; existing release gates |
| M16 | Processor/Vendor Management | D03 | WP16, WP11 | V1 baseline; existing release gates |
| M17 | Privacy Incident Explorer | D05 | WP17 | V1 baseline; existing release gates |
| M18 | Coverage and Failure Center | D07 | WP13, WP19 | V1 baseline; existing release gates |
| M19 | AI Privacy Copilot | D13 | WP35 | Product V2 — deferred |
| M20 | AI Discovery | D13 | WP35 | Product V2 — deferred |
| M21 | AI Policy Builder | D13 | WP35 | Product V2 — deferred |
| M22 | AI Workflow Builder | D13 | WP35 | Product V2 — deferred |
| M23 | AI Risk/Drift Analysis | D13 | WP35 | Product V2 — deferred |
| M24 | AI Test Generation | D13 | WP35 | Product V2 — deferred |
| M25 | AI Incident Analysis | D13 | WP35 | Product V2 — deferred |
| M26 | Billing | D02 | WP23 | V1 baseline; existing release gates |
| M27 | Licensing | D20 | WP25 | V1 baseline; existing release gates |
| M28 | Entitlements | D20 | WP25 | V1 baseline; existing release gates |
| M29 | Customer Onboarding | D20 | WP27, WP34 | V1 baseline; existing release gates |
| M30 | Support Bundle System | D12 | WP26, WP24 | V1 baseline; existing release gates |
| M31 | Updates | D20 | WP27, WP28 | V1 baseline; existing release gates |
| M32 | Monitoring | D17 | WP29 | V1 baseline; existing release gates |
| M33 | Audit Administration | D15 | WP02, WP14, WP24 | V1 baseline; existing release gates |

The master’s control packages/simulation, assessments/SDF work and customer-AI-governance extension are explicitly allocated in WP19, WP16 and WP36 respectively. They do not disappear just because the original 33-module list predates those additions. Normal data discovery and deterministic drift remain V1; AI discovery/explanation remains V2. [Master §§62, 213–216]

<a id="g-outcomes"></a>
## G.7 — End-to-end ownership: where full-stack work actually happens

A component owner can finish its library while the customer journey is still broken. The following outcome leads coordinate all layers, and D01 resolves cross-role conflicts. These leads are proposed within the existing 20 roles, not additional headcount.

| Complete outcome | Outcome lead | Contributing components | Required end-to-end evidence |
|---|---|---|---|
| Buy → download → install → first local login | D20 | D02 commerce; D09 Account; D15 local owner; D16 host; D14 security; D18 QA | Correct licence/package, verified origin, clean supported install and no vendor operational-data receipt |
| Capture/withdraw consent → enforce → verify → evidence | D05 | D02 consent; D03 graph; D04 policy; D06 agent; D07/D08 targets; D11 portal; D09 operator UI | Durable withdrawal, correctly scoped target result, independent observation, explicit gaps and test outcome |
| Receive right → validate authority → execute/respond | D05 | D15 identity; D02 requests; D11 portal; D04 rules; D07/D08 actions; D14 disclosure | Wrong identity blocked; permitted scope processed; safe response and per-target limitations |
| Change policy/system → understand impact → detect regression | D04 | D03 graph; D06 capabilities; D18 test engine; D09 review UI; D20 CLI | Scoped diff, required review, real failed assertion for introduced defect, history preserved |
| Known fault → safe local diagnosis → vendor support → verified repair | D13 | D12 report; D02 support API; D09 UI; D14 data boundary; D20 signed fix; D17 recovery | Only approved fields leave; no remote access; customer applies fix; local outcome independently checked |
| Incident → independent obligations → reviewed notifications | D05 | D04 configured rules; D03 scope; D08 delivery; D09 operator; qualified privacy reviewer | Separate clocks, factual timeline, approved transmission evidence, no false all-notified flag |
| Update/restore → keep restrictions → continue operating | D20 | D16 installer; D17 backups; D05 current workflow safety; D14 signing; D18/D19 failure tests | Actual migration/restore, integrity and scope preserved; no reactivated withdrawn processing |
| Export/offboard → revoke access → customer retains records | D20 | D02 export; D15 revocation; D06 connectors; D17 retention; D14 audit | Local authorised export and handover, credentials revoked, vendor retains only justified business records |

### Worked example: a marketing withdrawal

D10 defines the capture, receipt, approval, failure and evidence states. D11 implements the principal interaction. D15 checks the person’s authority, while D02 persists the consent epoch and outbox event atomically. D03 provides the affected purpose/systems graph; D04 supplies the current processing decision. D05 coordinates the durable action plan and approvals. D06 validates the customer-local instruction; D07/D08 execute only supported scoped actions. D07’s shared verification model and adapter readbacks describe what was observed and what remains unknown. D02 stores the evidence through the shared evidence service. D09 shows the result without turning an acknowledgement into proof. D18’s test product detects an intentionally introduced enforcement regression, while the internal QA suite independently tests the complete implementation. D14 checks the data/access boundary; D17/D19 exercise restarts and races. D20 proves the same build works from the customer installation package. [Master §§16–18, 25–30, 40–49, 57–61, 137, 191–194]

**Full-stack acceptance is the behaviour of that complete chain.** A success toast, passing mocked API test or screenshot is not sufficient. D05 is the outcome lead; D01 is the integration arbiter, not a substitute author of every component.

<a id="g-contracts"></a>
## G.8 — Shared contracts and file ownership

Contract agreement happens before parallel consumers invent incompatible state machines. The following ownership expands the source’s shared-type, API, event, agent, evidence and release boundaries; exact repository paths must be checked against the actual repository before a task edits them. [Master §§7, 13, 25–30, 44–47, 94, 97–101, 114–117]

| Contract | Primary design owner | Required consumers/reviewers | What must be stable |
|---|---|---|---|
| Identity and delegation | D15 | D02/D09/D11/D14 | Issuer/audience, tenant/environment, role, action/resource, delegable scope, expiry and revocation |
| Graph/domain schema | D03 | D02/D04/D05/D07 | Entity keys, ownership, relationship provenance, historical version references |
| Policy decision | D04 | D05/D06/D15/D20 | Decision, obligations, reason codes, scope, policy version, consent epoch and freshness |
| Consent command/event | D02 | D04/D05/D11 | Idempotency, aggregate epoch, notice provenance, accepted state and outbox atomicity |
| Workflow/action plan | D05 | D04/D06/D09 | Scope digest, target generation, approval binding, attempts, uncertain outcomes and reconciliation |
| Agent/connector capability | D06 | D07/D08/D14/D20 | Identity, supported resource/action/permission, version, expiry, budgets and readback limits |
| Outcome/verification | D07 | D08/D02/D05/D09 | Claim, exact scope, method/time/source, consistency, freshness and unsupported boundaries |
| Evidence/audit/export | D02 | D03/D14/D17/D20 | Event/correction identity, historical references, integrity envelope, payload retention and export authorisation |
| Privacy test | D18 | D04/D06/D09/D20 | Preconditions, approved environment, fixture, steps, expected/actual, exact build and evidence |
| Support report | D12 | D13/D02/D14/D09 | Fixed allowed fields, no local record identifiers, approval binding and rejection behaviour |
| Licence/release | D20 | D02/D14/D16/D09 | Separate entitlements/signatures, supported release/profile, digests, migration and continuity |
| Guided Assistance | D13 | D12/D04/D09/D14 | Rule/template version, local references, match/no-match state and no action authority |

### Proposed path ownership, not a claim these directories exist

| Area | Single writer/maintainer | Required review or rule |
|---|---|---|
| Root manifests, lockfile, build configuration | D20 task owner; initially one named coding track | D01 approves dependencies/framework changes; no concurrent lockfile edits |
| Shared API/event schemas and generated clients | D02 as repository custodian | Domain owner signs semantics; D01 arbitrates; consumers use pinned accepted revision |
| Database migration sequence | D02 | D03 and affected domain owner review; migrations applied in a controlled order |
| Shared UI source and design tokens | D09 implementation; D10 specification | D11 consumes; customer bundles do not fetch vendor-hosted runtime assets |
| Vendor account/admin UI | D09 assigned tasks | D15 role scope; D13 support semantics; separate from customer routes/sessions |
| Customer console | D09 assigned tasks | D02–D08 domain contracts; D15 access; no fake API fallbacks |
| Principal portal | D11 assigned tasks | D15 principal identity; D14 disclosure; D10 accessible flows |
| Customer and vendor APIs | D02 plus explicitly assigned domain maintainers | Never share live operational databases or default cross-domain credentials |
| Workflow/agent/connectors | D05 / D06 / D07 / D08, each in its owned subtree | No cross-owner edits without the task’s permission; shared contract through D02 |
| Infrastructure and release | D16 environment; D20 release artifact | D14 privileged changes; signing and customer action authority remain separate |
| Internal tests and fixture contracts | D18 suite structure; each component author owns its tests | Browser-test writer coordinated with Claude Code; production fixtures forbidden |
| Documentation, task registry, runbook content | Claude Cowork assigned document owner under D10/D13/D20 | API/commands verified by code owner; no generated claim of a test being executed |

Use isolated branches/worktrees or task directories for simultaneous edits. Root/shared files remain single-writer even with isolation. Do not create a second source-of-truth schema, a second authentication abstraction or a parallel connector SDK to avoid waiting for the responsible owner.

<a id="g-sequence"></a>
## G.9 — Dependency-aware build sequence

These are execution waves, not promised days or replacements for the master’s original phases. Early design, test authoring and packaging happen in parallel. Final acceptance still depends on actual integrated behaviour. Existing scope/rollout qualifications control which capabilities a release may advertise. [Master §§137–146, 190–194, 216]

| Wave | Primary objective | Parallel work | Evidence before relying on it |
|---|---|---|---|
| W0 — Decisions and contracts | WP01, WP20, security/test plans in WP30/WP31; documentation skeleton WP34 | Agree feature packets, interfaces, trust boundaries and file owners | One approved baseline, no unresolved incompatible contract, named owner for first slice |
| W1 — Shared foundation | WP02/WP03, WP28, UI shells, early WP14 evidence and WP04 graph | Vendor Account/commerce design and scaffolding; installer scaffold; runbooks/fixtures | Authenticated scoped persistence, separate vendor/customer boundary, build/test pipeline and local startup |
| W2 — Complete first outcome | WP05/WP06/WP08–WP14; WP18 first actual regression; incremental WP21/WP22 | Vendor commerce/licence/support and package work continue; QA negative tests run now | Withdrawal reaches real synthetic target, enforces supported boundary, observes result, exposes unknowns, exports local evidence |
| W3 — Application breadth | WP07/WP15–WP19 and corresponding operational pages; complete vendor support flows | Notifications, assessed governance and wider conformance; documentation/accessibility | Each added workflow has actor/scope/state/failure/evidence/acceptance, not only CRUD/screens |
| W4 — Customer delivery and continuity | WP25–WP29 and WP34 complete supported install/renewal/update/restore/offboarding | Bounded WP33 assistance only when core/support remain on track | Clean supported deployment, offline profile as claimed, no vendor egress, preserved restrictions and roles |
| W5 — Release qualification | WP30/WP31/WP32 and D20 evidence assembly | Fix/retest, accessibility/usability polish, independent review, rehearsal and customer acceptance | No applicable blocker; exact build/support matrix, real results, limitations and signed artefact match |
| Future — V2 and already-later scope | WP35 model programme; WP36 per original approvals | Only after separate plan and required approvals | No task starts merely because its roadmap row exists |

**Do not build everything first and test at the end.** Test contracts, permission boundaries, migrations, event ordering and the first workflow as they are implemented. W5 is additional integrated hardening and independent assessment. A final demo deadline cannot waive security, customer-data boundaries or truthful outcomes.

**Critical-path focus:** contract and identity/data foundation → graph/policy/consent → durable actions and supported connector → observed outcome/evidence → first executable privacy regression → supported customer install and safe operations. Evidence, tests and packaging start earlier than this arrow suggests; it is an outcome dependency, not an instruction to delay those disciplines.

**Staffing reality:** D02, D05, D09, D14, D15 and D20 have particularly broad obligations. They need bounded task queues and reviewer time. The four-track approach distributes work but does not make the number of dependency-sensitive implementation tasks disappear. Record actual staffing and adjust simultaneous work, not the required correctness/security boundary.

<a id="g-handoff"></a>
## G.10 — Task packets, review and chat organisation

Keep `Orvia_idea` as the place for approved product decisions and this ownership map. Focused coding/testing chats take a bounded packet. Do not paste the entire idea and ask every tool to build it independently. The following is the proposed task format:

```text
Task ID: WPxx-Tyy
Product release: V1 / optional V1 guidance / deferred V2
Master: exact filename + SHA-256 + source section IDs
Work package and original module/epic IDs:
Accountable engineering role:
Named human owner and reviewer:
Assigned AI track / branch / worktree:
Goal and explicit non-goals:
Allowed files; shared files that must not change:
Accepted API/event/schema/permission revision:
Data location and allowed outbound fields:
Dependencies and accepted baseline commit:
Required successful, failure and authorisation behaviours:
Required tests and expected observations:
Deliverables: code, migrations, API docs, UI, tests, runbook as applicable
Handoff: commit/files, commands run, exit/results, evidence paths, known limits
Acceptance decision and next consumer:
```

Statuses should distinguish `PLANNED`, `READY`, `IN_PROGRESS`, `IN_REVIEW`, `INTEGRATION_PENDING`, `ACCEPTED`, `BLOCKED` and `DEFERRED_V2`. These are proposed coordination states, not replacements for the product’s workflow/action states. Actual implementation begins `NOT_ASSESSED` here because no repository has been inspected. Test execution is recorded separately. A merged branch can still be integration-pending.

Do not claim a task is complete because an AI says it wrote tests. The handoff must give the **commands actually executed**, build/commit, exit status, observed result, artifact location and remaining failures. Reviewers examine behaviour and source requirements, not just green summaries. Before rerunning a destructive test, establish its synthetic environment and scope.

### Suggested focused chats

| Chat/work area | Role focus | Typical track |
|---|---|---|
| Orvia_idea | Approved scope, source master, architecture decisions and ownership map | ChatGPT Work / founder |
| Orvia_Core_Contracts | D01–D05 and D15; schemas, auth, policy, workflows | Codex implementation; ChatGPT Work review |
| Orvia_Connectors_Enforcement | D04/D06–D08/D20; agent, adapters, SDK | Codex |
| Orvia_Workspace_UI | D09/D10; operator and local settings | Claude Code; Claude Cowork UX |
| Orvia_Privacy_Centre | D11/D15; principal journeys | Claude Code |
| Orvia_Vendor_Commerce_Support | D02/D09/D12/D13/D15/D20; commerce and safe support | Explicit backend/UI task split |
| Orvia_Packaging_Operations | D16/D17/D19/D20; install, updates and recovery | Codex; Claude Cowork runbooks |
| Orvia_QA_Security_Release | D14/D18/D19; independent expected outcomes and gate evidence | All tracks with one owner per test/file |

These names do not create chats or agents. Multiple chats in one coding track do not automatically give extra simultaneous execution capacity. Keep the same accepted baseline in each session. Use `CURRENT_STATE.md` for master hash, accepted commit, current tasks/writers, contract revision, actual commands, failures and next acceptance gate. The project name or folder alone does not synchronise tools.

### Immediate first assignments

ChatGPT Work takes **WP01-T01**: confirm the active baseline, write the first-slice contract and name affected roles. Codex takes **WP28-T01 / WP03-T01**: create the reproducible local foundation and scoped schema skeleton against the agreed contract. Claude Cowork takes **WP20-T01 / WP31-T01**: specify the withdrawal/failure/evidence UI states and independent acceptance cases. Claude Code takes **WP20-T02 / WP21-T01**: build the shared UI foundation and separate role/domain shells against that contract. D15’s identity task enters the first integration immediately; no unauthorised “temporary” success path is an acceptable shortcut.

These are planning assignments, not actions started by this document. Each packet still needs actual repository context and an authorised editing scope before code work begins.

<a id="g-tests"></a>
## G.11 — Testing ownership and release responsibility

There are **two distinct testing deliverables**: (1) the Privacy Test Engine customers use to evaluate their configured controls, and (2) the development team’s tests that prove ORVIA itself behaves correctly. D18 coordinates both, but their permissions, fixtures, deployment and claims are different. Every implementation author writes component tests; D18 does not become the sole test writer. [Master §§57–61, 119–128]

| Test discipline | Technical owner | What must be demonstrated |
|---|---|---|
| Component/unit | Each author; D18 standards | Pure rules, validation, transforms and state transitions; no mocks presented as external outcome proof |
| Database/API/contract | D02/D03/D15 with D18 | Migrations, scoped queries, roles, events, idempotency and real persistence |
| Workflow/failure | D05/D06 with D18/D19 | Timeouts, response loss, retries, approval drift, out-of-order events and durable resume |
| Connector conformance | D06; D07/D08 adapters | Resource/action/permission limitations, pagination, readback and provider-specific failures |
| Browser/accessibility | D09/D10/D11 with D18 | Role-specific complete journeys, keyboard/errors, honest status and principal privacy |
| Security/data boundary | D14/D15 plus independent assessment | Cross-domain/tenant/role denial, secret and support safety, signatures and no prohibited vendor egress |
| Load/fault/recovery | D19/D17 | Measured latency/capacity, bounded degradation, restored restrictions and practical recovery |
| Install/update/offline | D20/D16 with D18 | Exact supported package, local bootstrap, integrity, renewals, upgrades and disconnected operation |
| Legal/content applicability | Qualified privacy reviewer; D04 implementation | Approved source/interpretation/facts/control mappings; no model or engineer invents legal authority |

### Integrated release gates (proposed coordination labels)

| Gate | Primary accountable role | Pass evidence | Cannot substitute |
|---|---|---|---|
| G0 — Baseline and contracts | D01 | Master scope, role/owner assignments, known decisions, accepted contracts | A long idea document without task owners |
| G1 — Identity and durable foundation | D15 | Independent domains, scoped persistence, safe bootstrap, actual negative tests | Hidden frontend buttons or hard-coded admin flag |
| G2 — First complete privacy outcome | D05 | Withdrawal → supported action → observation → evidence → actual regression | Disconnected CRUD pages or mocked successful adapter |
| G3 — Declared application breadth | D01 | Every advertised module/function has verified source scope, owner and supported implementation | Counting roadmap pages as delivered modules |
| G4 — Customer delivery and continuity | D20 | Clean install, licence/import, supported update/offline/restore/offboarding tests | Developer laptop already configured by the authors |
| G5 — Security and quality qualification | D14 security; D18 quality evidence | Applicable blockers closed/retested; independent assessment where required; measured limits | AI self-review, missing scan or a blanket zero-vulnerability claim |
| G6 — Release and customer handover | D20; founder final approval | Signed exact build, real reports, known limits, runbooks, supported matrix and recipient acceptance | A working presentation mistaken for production release |

A prototype can demonstrate a named synthetic scope without being a production-qualified release. Preserve the master’s production blockers, including unresolved confirmed applicable Critical/High vulnerabilities and mandatory access/egress/destructive-action defects. No owner or deadline can waive those by changing a status field. Independent security assessment must actually be independent and completed for the required scope. [Master §§120, 146, 163–164, 168, 207]

### Existing acceptance scenarios: source-preserving ownership

The current master §217 contains **140 named scenario rows**: T01–T64, UX-01–UX-20, ROLE-01–ROLE-10, SUP-01–SUP-10, AI-01–AI-18 and V1-01–V1-18. The machine-readable handoff retains each original row exactly; this table assigns technical ownership, not new outcomes or pass results. D18 coordinates evidence for every row. Pure model tests remain deferred, while current no-model, blocked-fallback and untrusted-content checks still apply according to §217’s own scope note. Several generic rows contain mixed current/future subcases: split these before execution rather than marking the whole row passed or deleting it.

| Source test | Scenario (source wording) | Technical owner | Scope note |
|---|---|---|---|
| T01 | Tenant A calls Tenant B resource | D15 | V1 applicable surface; model-only subcases deferred where present |
| T02 | Pooled DB connection retains old context | D02 | V1 applicable surface; model-only subcases deferred where present |
| T03 | Background task has no authorized tenant | D02 | V1 applicable surface; model-only subcases deferred where present |
| T04 | Historical policy/graph changes | D03 | V1 applicable surface; model-only subcases deferred where present |
| T05 | Future-effective rule evaluated today | D04 | V1 applicable surface; model-only subcases deferred where present |
| T06 | Consent grant delivered twice | D02 | V1 applicable surface; model-only subcases deferred where present |
| T07 | Old grant arrives after withdrawal | D02 | V1 applicable surface; model-only subcases deferred where present |
| T08 | Valid new re-consent | D02 | V1 applicable surface; model-only subcases deferred where present |
| T09 | Old deletion task reaches newly created data | D05 | V1 applicable surface; model-only subcases deferred where present |
| T10 | Notice purpose expands | D02 | V1 applicable surface; model-only subcases deferred where present |
| T11 | DB commit succeeds; publisher crashes | D05 | V1 applicable surface; model-only subcases deferred where present |
| T12 | Worker dies after remote effect | D05 | V1 applicable surface; model-only subcases deferred where present |
| T13 | Reused idempotency key has changed payload | D05 | V1 applicable surface; model-only subcases deferred where present |
| T14 | Wrong-tenant signed agent command | D06 | V1 applicable surface; model-only subcases deferred where present |
| T15 | Replayed/expired command | D06 | V1 applicable surface; model-only subcases deferred where present |
| T16 | Agent plugin asks for another secret | D06 | V1 applicable surface; model-only subcases deferred where present |
| T17 | Provider returns partial pagination | D08 | V1 applicable surface; model-only subcases deferred where present |
| T18 | Provider removes mutation permission | D06 | V1 applicable surface; model-only subcases deferred where present |
| T19 | Provider timeout and no safe receipt | D08 | V1 applicable surface; model-only subcases deferred where present |
| T20 | API success but data remains | D07 | V1 applicable surface; model-only subcases deferred where present |
| T21 | Verification observation expires | D07 | V1 applicable surface; model-only subcases deferred where present |
| T22 | Evidence bytes changed | D02 | V1 applicable surface; model-only subcases deferred where present |
| T23 | Shared/recycled phone creates ambiguous match | D15 | V1 applicable surface; model-only subcases deferred where present |
| T24 | Nominee/guardian authority revoked | D15 | V1 applicable surface; model-only subcases deferred where present |
| T25 | Access package contains third-party data | D05 | V1 applicable surface; model-only subcases deferred where present |
| T26 | Withdrawal accepted before supported send | D04 | V1 applicable surface; model-only subcases deferred where present |
| T27 | Seeded regression permits marketing send | D18 | V1 applicable surface; model-only subcases deferred where present |
| T28 | Cloud unavailable; revocation state stale | D04 | V1 applicable surface; model-only subcases deferred where present |
| T29 | License expires mid-request | D20 | V1 applicable surface; model-only subcases deferred where present |
| T30 | Disaster restore | D17 | V1 applicable surface; model-only subcases deferred where present |
| T31 | Marketing withdrawal plus valid retained transaction | D05 | V1 applicable surface; model-only subcases deferred where present |
| T32 | Hold released | D05 | V1 applicable surface; model-only subcases deferred where present |
| T33 | Backup restores suppressed audience member | D17 | V1 applicable surface; model-only subcases deferred where present |
| T34 | Policy diff adds new data destination | D04 | V1 applicable surface; model-only subcases deferred where present |
| T35 | Destructive synthetic test targets production | D18 | V1 applicable surface; model-only subcases deferred where present |
| T36 | Incident has multiple reporting regimes | D05 | V1 applicable surface; model-only subcases deferred where present |
| T37 | Awareness timestamp corrected | D05 | V1 applicable surface; model-only subcases deferred where present |
| T38 | Retrieved text instructs Copilot to disclose secrets | D12 | DEFERRED_V2 MODEL EXECUTION; V1 UNTRUSTED-CONTENT CHECKS STILL APPLY |
| T39 | AI unavailable | D18 | V1 applicable surface; model-only subcases deferred where present |
| T40 | Sensitive canary in connector error | D14 | V1 applicable surface; model-only subcases deferred where present |
| T41 | Customer purchases an edition in a disclosed test checkout | D02 | V1 applicable surface; model-only subcases deferred where present |
| T42 | Install full package in an isolated customer environment | D20 | V1 applicable surface; model-only subcases deferred where present |
| T43 | Tampered package, wrong signer or substituted manifest | D20 | V1 applicable surface; model-only subcases deferred where present |
| T44 | Vendor website/licensing account token is used against runtime | D15 | V1 applicable surface; model-only subcases deferred where present |
| T45 | Vendor connection blocked with a valid local licence | D20 | V1 applicable surface; model-only subcases deferred where present |
| T46 | Operational identity/canary inserted into a licence field or extra JSON field | D12 | V1 applicable surface; model-only subcases deferred where present |
| T47 | Consent, request and incident workflows run with synthetic identifying canaries | D14 | V1 applicable surface; model-only subcases deferred where present |
| T48 | Browser page loads scripts, analytics, fonts or crash reporting | D09 | V1 applicable surface; model-only subcases deferred where present |
| T49 | Connector/AI/plugin attempts unauthorised network egress | D14 | V1 applicable surface; model-only subcases deferred where present |
| T50 | Local AI is missing or fails | D18 | V1 applicable surface; model-only subcases deferred where present |
| T51 | Diagnostic export includes workflow IDs, masked records, screenshots or secrets | D12 | V1 applicable surface; model-only subcases deferred where present |
| T52 | Support requests remote production screen/terminal access | D13 | V1 applicable surface; model-only subcases deferred where present |
| T53 | Backup/restore runs, including an encrypted operational archive | D17 | V1 applicable surface; model-only subcases deferred where present |
| T54 | Vendor/release/licence identity attempts to decrypt runtime data or sign an action | D14 | V1 applicable surface; model-only subcases deferred where present |
| T55 | Licence expires or renewal is unreachable | D20 | V1 applicable surface; model-only subcases deferred where present |
| T56 | Privileged login with default credentials or missing required MFA | D15 | V1 applicable surface; model-only subcases deferred where present |
| T57 | Release has an unresolved applicable Critical/High finding or a §163 blocker | D14 | V1 applicable surface; model-only subcases deferred where present |
| T58 | Scanner unavailable, scan omitted or a suppression lacks rationale | D14 | V1 applicable surface; model-only subcases deferred where present |
| T59 | Update/plugin/rule/model package attempts to enable telemetry or broaden egress | D20 | V1 applicable surface; model-only subcases deferred where present |
| T60 | Signing key or distribution service is compromised in a scoped exercise | D14 | V1 applicable surface; model-only subcases deferred where present |
| T61 | Independent test reports a flaw and fix is submitted | D14 | V1 applicable surface; model-only subcases deferred where present |
| T62 | Optional external processor/model is enabled | D08 | V1 applicable surface; model-only subcases deferred where present |
| T63 | Security centre shows an unassessed build or stale test | D09 | V1 applicable surface; model-only subcases deferred where present |
| T64 | Cancellation or export/offboarding | D20 | V1 applicable surface; model-only subcases deferred where present |
| UX-01 | Windows, macOS and Linux users open the same supported deployment | D09 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-02 | Buyer downloads from a Windows browser for a Linux host | D09 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-03 | Vendor account holder tries runtime access | D15 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-04 | Data Principal requests another principal's record | D11 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-05 | Runtime loads with vendor endpoints blocked | D09 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-06 | Inspect vendor logs after a synthetic privacy workflow | D14 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-07 | View downloaded release on vendor dashboard | D09 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-08 | Upload diagnostic containing a forbidden field | D12 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-09 | Public principal portal attempts admin/API paths | D11 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-10 | Invalid/tampered package or licence | D20 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-11 | Disconnected install/update | D20 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-12 | Browser closes after request acceptance | D05 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-13 | Local evaluation host shuts down | D17 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-14 | Upgrade or model package attempts additional egress | D20 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-15 | Use unsupported CPU/host/dependency combination | D20 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-16 | Renew or upgrade edition | D20 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-17 | Request outside organisation under strict profile | D08 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-18 | Account password reset | D15 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-19 | Runtime data export | D02 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| UX-20 | CSS/JavaScript/fonts/telemetry network audit | D09 | V1, WITH FUTURE MODEL SUBCASES DEFERRED |
| ROLE-01 | Vendor Super Admin presents a vendor token to a customer runtime | D15 | V1 |
| ROLE-02 | Vendor Admin opens an unassigned or different customer support case | D15 | V1 |
| ROLE-03 | Customer Admin attempts to grant Organisation Super Admin or expand its own scope | D15 | V1 |
| ROLE-04 | Member requests an unassigned system, environment or subtenant | D15 | V1 |
| ROLE-05 | Organisation Owner migrates to the Organisation Super Admin display model | D15 | V1 |
| ROLE-06 | Revoke a member or service identity with a queued action | D15 | V1 |
| ROLE-07 | Vendor website account recovery attempts customer-owner recovery | D15 | V1 |
| ROLE-08 | Auditor or Data Principal attempts member management or a repair | D15 | V1 |
| ROLE-09 | Customer user attempts another organisation even with a matching local role name | D15 | V1 |
| ROLE-10 | One vendor actor attempts support, release approval and signing without separation | D15 | V1 |
| SUP-01 | Unreported customer runtime fails while offline | D17 | V1, WITH MODEL SUBCASES DEFERRED |
| SUP-02 | Generate support report containing a principal reference, hostname, log or raw AI text | D12 | V1, WITH MODEL SUBCASES DEFERRED |
| SUP-03 | Approve one support case then change the report payload | D12 | V1, WITH MODEL SUBCASES DEFERRED |
| SUP-04 | Send a legitimate approved minimal support report | D12 | V1, WITH MODEL SUBCASES DEFERRED |
| SUP-05 | Vendor supplies a diagnostic or repair instruction | D13 | V1, WITH MODEL SUBCASES DEFERRED |
| SUP-06 | AI is unavailable or recommends no escalation during a critical failure | D13 | V1, WITH MODEL SUBCASES DEFERRED |
| SUP-07 | Optional proactive support signals are disabled or revoked | D12 | V1, WITH MODEL SUBCASES DEFERRED |
| SUP-08 | A connection stops after an approved optional report | D17 | V1, WITH MODEL SUBCASES DEFERRED |
| SUP-09 | Vendor case is closed while a local privacy action remains unverified | D13 | V1, WITH MODEL SUBCASES DEFERRED |
| SUP-10 | Compromised commercial licence or support credential requests customer data | D15 | V1, WITH MODEL SUBCASES DEFERRED |
| AI-01 | Training run specifies a third-party pretrained checkpoint or adapter | D12 | DEFERRED_V2 |
| AI-02 | Candidate ORVIA run resumes its own checkpoint | D12 | DEFERRED_V2 |
| AI-03 | Corpus ingestion receives a customer ticket, log, conversation or disguised derivative | D12 | DEFERRED_V2 |
| AI-04 | Public source lacks approved reuse/provenance or contains personal/poisoned content | D12 | DEFERRED_V2 |
| AI-05 | A local user asks a question with authorised local context | D12 | DEFERRED_V2 |
| AI-06 | Runtime inference is attempted with vendor and Lightning egress blocked | D12 | DEFERRED_V2 |
| AI-07 | Retrieved document instructs model to leak secrets or bypass roles | D12 | DEFERRED_V2 |
| AI-08 | Test question depends on stale or missing legal/product knowledge | D12 | DEFERRED_V2 |
| AI-09 | Model package is tampered with or requests executable loader/network access | D12 | DEFERRED_V2 |
| AI-10 | Model is absent, fails evaluation or exceeds available hardware | D12 | DEFERRED_V2 |
| AI-11 | Local rating or conversation history is marked for model improvement | D12 | DEFERRED_V2 |
| AI-12 | An auxiliary embedding/reranking component tries to download third-party weights | D12 | DEFERRED_V2 |
| AI-13 | Model conversion or quantisation changes output quality | D12 | DEFERRED_V2 |
| AI-14 | Model update/rollback changes consent epoch, roles or safety restrictions | D12 | DEFERRED_V2 |
| AI-15 | Customer A question or cached context is requested by another scope | D12 | DEFERRED_V2 |
| AI-16 | Model training credentials try to publish a signed customer release | D12 | DEFERRED_V2 |
| AI-17 | A task asks for unsupported general advice or unsupported language | D12 | DEFERRED_V2 |
| AI-18 | Vendor-side assistant sees a permitted support case | D12 | DEFERRED_V2 |
| V1-01 | Install the signed Version 1 bundle with no GPU, weights, model API keys or Lightning access | D20 | V1 |
| V1-02 | Run the full synthetic consent withdrawal, target action, verification and regression slice without a model | D05 | V1 |
| V1-03 | Set an AI flag, alter a licence or use a Super Admin role on Version 1 | D20 | V1 |
| V1-04 | Inspect package/dependency/startup/network manifests | D20 | V1 |
| V1-05 | A known error matches a guidance rule | D13 | V1 |
| V1-06 | A guidance query has no match, missing facts or stale context | D13 | V1 |
| V1-07 | Another role/subtenant searches restricted help context or evidence | D15 | V1 |
| V1-08 | A document or connector string requests a shell command or secret export | D14 | V1 |
| V1-09 | Accept a recommended diagnostic or repair | D05 | V1 |
| V1-10 | Omit/disable/fail optional Guided Assistance | D13 | V1 |
| V1-11 | Prepare a report with an internal ID, client data, unrestricted log or free text | D12 | V1 |
| V1-12 | Renew/import a licence or apply a Version 1 update offline | D20 | V1 |
| V1-13 | Review UI, sales copy and commercial capability flags | D09 | V1 |
| V1-14 | Review pipeline tasks and artifact provenance | D16 | V1 |
| V1-15 | Suggest saving local guidance/support history for future model improvement | D14 | V1 |
| V1-16 | Load an untrusted or incompatible rule/runbook pack | D20 | V1 |
| V1-17 | Compute a template summary or configured severity finding | D13 | V1 |
| V1-18 | Review Version 1 release sign-off | D18 | V1 |

All rows remain **NOT_RUN_IN_THIS_REVIEW**. The document generation and preservation checks are not ORVIA product tests. There is no implemented application, deployed infrastructure or independent assessment to certify in this deliverable.

<a id="g-sections"></a>
## G.12 — Complete section-to-role traceability

All 218 numbered product sections are accounted for below. The main section owner ensures its requirements are implemented/reviewed by the listed work packages; this is not permission to ignore other contributors. Pure principles and historical source/legal registers still need stewardship. Mixed AI sections retain their own Version 1 non-model obligations and Version 2 model scope. Details in the original section govern; a mapping row never changes feature meaning.


| § | Original section title | Primary role | Primary WP | Additional WPs |
|---|---|---|---|---|
| 1 | PURPOSE OF THIS DOCUMENT | D01 | WP01 | — |
| 2 | PRODUCT DEFINITION | D01 | WP01 | — |
| 3 | CORE PRODUCT PRINCIPLE | D01 | WP01 | — |
| 4 | THE CENTRAL SYSTEM: PRIVACY CONTROL GRAPH | D03 | WP04 | WP01 |
| 5 | CORE DOMAIN MODEL | D02 | WP03 | WP02, WP04, WP33 |
| 6 | USER ROLES | D15 | WP02 | WP21, WP24 |
| 7 | ROLE-BASED ACCESS CONTROL | D15 | WP02 | WP21, WP24, WP30 |
| 8 | PRIVACY CONTROL GRAPH RELATIONSHIP | D03 | WP04 | — |
| 9 | DATA PROCESSING MODEL | D03 | WP04 | WP05 |
| 10 | MODULE ARCHITECTURE | D01 | WP01 | — |
| 11 | SERVICE ARCHITECTURE | D01 | WP01 | WP03, WP28 |
| 12 | RECOMMENDED TECHNOLOGY STACK | D01 | WP01 | WP03, WP28 |
| 13 | POLICY ENGINE | D04 | WP05 | WP12 |
| 14 | POLICY VERSIONING | D04 | WP05 | — |
| 15 | POLICY LIFECYCLE | D04 | WP05 | — |
| 16 | CONSENT MANAGEMENT | D02 | WP06 | — |
| 17 | CONSENT WITHDRAWAL | D02 | WP06 | WP08 |
| 18 | CONSENT PROPAGATION | D02 | WP06 | WP08 |
| 19 | NOTICE MANAGEMENT | D02 | WP06 | WP22 |
| 20 | DATA PRINCIPAL PORTAL | D11 | WP22 | WP02, WP07 |
| 21 | CROSS-COMPANY DATA PRINCIPAL NETWORK | D01 | WP36 | — |
| 22 | RIGHTS MANAGEMENT ENGINE | D05 | WP07 | WP22 |
| 23 | IDENTITY MATCHING | D15 | WP02 | WP07, WP10, WP22 |
| 24 | RIGHTS REQUEST STATES | D05 | WP07 | WP08, WP22 |
| 25 | WORKFLOW ENGINE | D05 | WP08 | — |
| 26 | HUMAN-IN-THE-LOOP SUPPORT | D05 | WP08 | WP07 |
| 27 | CONNECTOR FRAMEWORK | D06 | WP09 | WP10, WP11 |
| 28 | CONNECTOR CAPABILITY DECLARATION | D06 | WP09 | WP04, WP10, WP11 |
| 29 | INITIAL CONNECTORS | D07 | WP13 | WP04, WP10, WP11 |
| 30 | CONNECTOR AGENT | D06 | WP09 | WP30 |
| 31 | CUSTOMER DATA BOUNDARY | D14 | WP30 | WP14, WP23, WP26 |
| 32 | PRIVACY-PRESERVING EXECUTION MODEL | D16 | WP28 | — |
| 33 | PORTAL DATA BOUNDARY | D11 | WP22 | WP02 |
| 34 | CLOUD ARCHITECTURE | D16 | WP28 | WP21 |
| 35 | MULTI-TENANCY | D02 | WP03 | WP02, WP30 |
| 36 | DATABASE SECURITY | D02 | WP03 | WP30 |
| 37 | SECRETS MANAGEMENT | D14 | WP30 | WP28 |
| 38 | ENCRYPTION | D14 | WP30 | WP28 |
| 39 | KEY MANAGEMENT | D14 | WP30 | WP28 |
| 40 | PRIVACY FIREWALL / CONTROL POINT | D04 | WP12 | WP19 |
| 41 | PRIVACY SDK | D04 | WP12 | WP34, WP36 |
| 42 | LOCAL POLICY CACHE | D04 | WP12 | — |
| 43 | OFFLINE / DEGRADED OPERATION | D04 | WP12 | WP08, WP29, WP32 |
| 44 | VERIFICATION ENGINE | D07 | WP13 | WP10, WP11 |
| 45 | EVIDENCE ENGINE | D02 | WP14 | — |
| 46 | AUDIT TRAIL | D02 | WP14 | WP30 |
| 47 | EVIDENCE INTEGRITY | D02 | WP14 | — |
| 48 | PRIVACY FAILURE CENTER | D07 | WP13 | WP33 |
| 49 | COVERAGE MAP | D07 | WP13 | WP04, WP10, WP19 |
| 50 | RETENTION ENGINE | D05 | WP15 | — |
| 51 | DELETION ENGINE | D05 | WP15 | WP10 |
| 52 | CRYPTOGRAPHIC DELETION | D01 | WP36 | WP15 |
| 53 | PROCESSOR/VENDOR MANAGEMENT | D03 | WP16 | WP11 |
| 54 | PRIVACY INCIDENT EXPLORER | D05 | WP17 | — |
| 55 | INCIDENT SEVERITY | D05 | WP17 | — |
| 56 | NOTIFICATION SUPPORT | D05 | WP17 | WP11 |
| 57 | PRIVACY TEST ENGINE | D18 | WP18 | — |
| 58 | SYNTHETIC TESTING | D18 | WP18 | — |
| 59 | PRIVACY REGRESSION TEST | D18 | WP18 | — |
| 60 | CI/CD INTEGRATION | D18 | WP18 | WP19, WP36 |
| 61 | PRIVACY TEST SUITE | D18 | WP18 | — |
| 62 | PRIVACY DRIFT DETECTION | D04 | WP19 | WP04, WP33 |
| 63 | AI ARCHITECTURE | D13 | WP33 | WP35 |
| 64 | AI MODEL ABSTRACTION | D12 | WP35 | — |
| 65 | AI DATA-MINIMISATION | D12 | WP35 | — |
| 66 | AI PRIVACY COPILOT | D13 | WP35 | WP33 |
| 67 | AI DISCOVERY | D13 | WP35 | — |
| 68 | AI POLICY BUILDER | D13 | WP35 | — |
| 69 | AI WORKFLOW BUILDER | D13 | WP35 | — |
| 70 | AI FAILURE ANALYSIS | D13 | WP35 | WP33 |
| 71 | AI DRIFT ANALYSIS | D13 | WP35 | — |
| 72 | AI INCIDENT ANALYSIS | D13 | WP35 | — |
| 73 | AI TEST GENERATION | D13 | WP35 | — |
| 74 | AI SAFETY RULES | D12 | WP35 | — |
| 75 | NOTIFICATION ENGINE | D05 | WP17 | WP11, WP36 |
| 76 | LICENSING AND ENTITLEMENTS | D20 | WP25 | WP23 |
| 77 | FEATURE FLAGS VS ENTITLEMENTS | D20 | WP25 | WP23 |
| 78 | ORVIA FOUNDATION | D20 | WP25 | WP23 |
| 79 | ORVIA CONTROL | D20 | WP25 | WP23 |
| 80 | ORVIA ENTERPRISE | D20 | WP25 | WP07, WP16, WP23, WP36 |
| 81 | ONE CODEBASE, THREE EDITIONS | D20 | WP25 | WP23 |
| 82 | WEBSITE | D02 | WP23 | WP27, WP34 |
| 83 | WEBSITE-TO-CUSTOMER JOURNEY | D02 | WP23 | WP27, WP34 |
| 84 | CUSTOMER ONBOARDING WIZARD | D20 | WP27 | WP34 |
| 85 | CONNECTOR INSTALLATION | D20 | WP27 | — |
| 86 | CUSTOMER-CONTROLLED CLOUD DEPLOYMENT | D20 | WP27 | WP28, WP36 |
| 87 | CLOUD PROVIDER SECURITY | D16 | WP28 | WP30 |
| 88 | OBSERVABILITY | D17 | WP29 | — |
| 89 | MONITORING DASHBOARD | D17 | WP29 | WP21, WP24, WP26 |
| 90 | SECURITY MONITORING | D14 | WP30 | WP29 |
| 91 | BACKUPS | D17 | WP29 | WP15, WP32 |
| 92 | DISASTER RECOVERY | D17 | WP29 | WP15, WP32 |
| 93 | UPDATE SYSTEM | D20 | WP27 | — |
| 94 | LICENSE SECURITY | D20 | WP25 | — |
| 95 | PRIVACY-SAFE SUPPORT | D12 | WP26 | WP24, WP33 |
| 96 | SUPPORT PORTAL | D13 | WP24 | WP26, WP33 |
| 97 | API ARCHITECTURE | D02 | WP03 | — |
| 98 | WEBHOOK ARCHITECTURE | D05 | WP17 | WP11 |
| 99 | IDEMPOTENCY | D05 | WP08 | WP03 |
| 100 | EVENT ARCHITECTURE | D02 | WP03 | WP08, WP17 |
| 101 | DATA MIGRATION STRATEGY | D02 | WP03 | WP27 |
| 102 | FRONTEND ARCHITECTURE | D10 | WP20 | WP21 |
| 103 | PRIMARY NAVIGATION | D09 | WP21 | WP20, WP33 |
| 104 | DASHBOARD | D09 | WP21 | WP20 |
| 105 | PRIVACY GRAPH UI | D03 | WP04 | WP20, WP21 |
| 106 | CONTROL DETAIL PAGE | D09 | WP21 | WP14, WP20 |
| 107 | TEST DETAIL PAGE | D18 | WP18 | WP20, WP21 |
| 108 | INCIDENT DETAIL PAGE | D05 | WP17 | WP20, WP21 |
| 109 | SECURITY REQUIREMENTS | D14 | WP30 | WP02 |
| 110 | API SECURITY | D14 | WP30 | WP02 |
| 111 | FILE UPLOAD SECURITY | D14 | WP30 | WP22 |
| 112 | AI SECURITY | D12 | WP35 | — |
| 113 | AI TOOL-USE MODEL | D12 | WP35 | — |
| 114 | DEVELOPER EXPERIENCE | D20 | WP34 | — |
| 115 | CLI | D20 | WP34 | — |
| 116 | REPOSITORY STRUCTURE | D16 | WP28 | WP01 |
| 117 | 20-PERSON ENGINEERING TEAM | D01 | WP01 | — |
| 118 | NON-ENGINEERING EXPERTISE REQUIRED | D01 | WP01 | WP16 |
| 119 | ENGINEERING TEAM WORKFLOW | D01 | WP01 | WP31 |
| 120 | DEFINITION OF DONE | D01 | WP01 | WP31 |
| 121 | AI CODING AGENT RULES | D01 | WP01 | — |
| 122 | DEVELOPMENT ENVIRONMENTS | D16 | WP28 | WP03 |
| 123 | CI/CD PIPELINE | D16 | WP28 | — |
| 124 | CODE QUALITY | D02 | WP03 | WP28 |
| 125 | TESTING PYRAMID | D18 | WP31 | — |
| 126 | SECURITY TESTING | D14 | WP30 | WP31 |
| 127 | MULTI-TENANT SECURITY TEST | D14 | WP30 | WP02, WP31 |
| 128 | CONNECTOR SECURITY TESTING | D14 | WP30 | WP10, WP11, WP31 |
| 129 | PERFORMANCE TARGETS | D19 | WP32 | WP29 |
| 130 | SCALABILITY MODEL | D16 | WP28 | WP29, WP32 |
| 131 | CUSTOMER SCALE | D19 | WP32 | WP03, WP29 |
| 132 | DATA RETENTION WITHIN ORVIA | D02 | WP14 | WP15, WP26, WP29, WP33 |
| 133 | AUDIT EVIDENCE EXPORT | D02 | WP14 | — |
| 134 | REPORTING | D02 | WP14 | — |
| 135 | READINESS SCANNER | D02 | WP23 | — |
| 136 | INITIAL CUSTOMER TARGET | D01 | WP01 | WP23 |
| 137 | FIRST VERTICAL SLICE | D18 | WP31 | — |
| 138 | PHASE 0 — ARCHITECTURAL FOUNDATION | D01 | WP01 | — |
| 139 | PHASE 1 — CORE PRIVACY OPERATIONS | D01 | WP01 | — |
| 140 | PHASE 2 — CONTROL | D01 | WP01 | — |
| 141 | PHASE 3 — TESTING | D01 | WP01 | — |
| 142 | PHASE 4 — ENTERPRISE | D01 | WP01 | WP36 |
| 143 | PHASE 5 — ADVANCED | D01 | WP01 | WP36 |
| 144 | THREE EDITIONS MUST EXIST ARCHITECTURALLY FROM THE BEGINNING | D01 | WP01 | WP25 |
| 145 | BUT FEATURE DELIVERY MUST STILL BE CONTROLLED | D01 | WP01 | WP25 |
| 146 | RELEASE STRATEGY | D01 | WP01 | WP25, WP27 |
| 147 | CONNECTOR VERSIONING | D20 | WP27 | — |
| 148 | POLICY COMPATIBILITY | D04 | WP05 | WP19, WP27 |
| 149 | WORKFLOW COMPATIBILITY | D05 | WP08 | WP27 |
| 150 | EVIDENCE IMMUTABILITY | D02 | WP14 | — |
| 151 | CUSTOMER TRUST MODEL | D01 | WP01 | WP13 |
| 152 | ORVIA'S MOST IMPORTANT DIFFERENTIATOR | D01 | WP01 | — |
| 153 | FUTURE INTEROPERABILITY | D01 | WP36 | — |
| 154 | MOBILE AND WEB | D11 | WP22 | WP20, WP34, WP36 |
| 155 | INTERNATIONALISATION | D02 | WP06 | WP20, WP22, WP34 |
| 156 | LOCALISATION | D02 | WP06 | WP20, WP22, WP34 |
| 157 | SEARCH | D03 | WP04 | WP21, WP33 |
| 158 | ADMIN SETTINGS | D15 | WP02 | WP21, WP24, WP33 |
| 159 | BILLING | D02 | WP23 | WP25 |
| 160 | LICENSE EXPIRATION | D20 | WP25 | WP27 |
| 161 | OFFBOARDING | D02 | WP14 | WP25, WP34 |
| 162 | CUSTOMER DATA EXPORT | D02 | WP14 | WP34 |
| 163 | SECURITY BASELINE FOR RELEASE | D14 | WP30 | — |
| 164 | EXTERNAL SECURITY REVIEW | D14 | WP30 | — |
| 165 | LEGAL / COMPLIANCE CONTROL | D04 | WP05 | WP16 |
| 166 | REGULATORY RULE PACK ARCHITECTURE | D04 | WP05 | WP16 |
| 167 | LEGAL CONTENT VERSIONING | D04 | WP05 | WP16 |
| 168 | PRODUCT CLAIMS | D01 | WP01 | WP23, WP30, WP33, WP34 |
| 169 | NO FALSE "PROOF" | D02 | WP14 | WP13 |
| 170 | CUSTOMER CONFIGURATION MODEL | D01 | WP01 | WP03, WP05, WP21 |
| 171 | PRINCIPLE OF LEAST PRIVILEGE | D06 | WP09 | WP10, WP30 |
| 172 | CONNECTOR CREDENTIAL MODEL | D06 | WP09 | WP10 |
| 173 | CONNECTOR HEALTH | D06 | WP09 | WP10, WP11 |
| 174 | ACTION RETRY STRATEGY | D05 | WP08 | WP11, WP32 |
| 175 | DEAD-LETTER QUEUES | D05 | WP08 | WP32 |
| 176 | RATE LIMITS | D05 | WP08 | WP09, WP11, WP32 |
| 177 | SYSTEM HEALTH PROTECTION | D05 | WP08 | WP09, WP32 |
| 178 | CUSTOMER SYSTEM SAFETY | D05 | WP08 | WP10, WP12, WP15, WP30 |
| 179 | DRY RUN MODE | D05 | WP08 | WP12, WP15 |
| 180 | GRADUAL ENFORCEMENT | D05 | WP08 | WP12 |
| 181 | ORVIA OBSERVE MODE | D05 | WP08 | WP12 |
| 182 | ORVIA COORDINATE MODE | D05 | WP08 | WP12 |
| 183 | ORVIA ENFORCE MODE | D05 | WP08 | WP12 |
| 184 | USER EXPERIENCE RULE | D01 | WP01 | WP20, WP21, WP34 |
| 185 | DASHBOARD SUMMARY EXAMPLE | D07 | WP13 | WP20, WP21 |
| 186 | ENGINEERING DOCUMENTATION | D20 | WP34 | WP01 |
| 187 | ARCHITECTURE DECISION RECORDS | D01 | WP01 | — |
| 188 | DEVELOPMENT STANDARD | D01 | WP01 | — |
| 189 | AI-CODING DEVELOPMENT LOOP | D01 | WP01 | — |
| 190 | AI SHOULD BUILD IN SMALL VERIFIED UNITS | D01 | WP01 | — |
| 191 | FIRST DEMO TARGET | D18 | WP31 | — |
| 192 | FAILURE DEMO | D18 | WP31 | — |
| 193 | PRIVACY REGRESSION DEMO | D18 | WP18 | WP31 |
| 194 | CUSTOMER DEPLOYMENT DEMO | D20 | WP27 | WP31 |
| 195 | PRODUCT SUCCESS METRICS | D01 | WP01 | WP23, WP29 |
| 196 | PRIVACY CONTROL METRICS | D07 | WP13 | WP29 |
| 197 | CUSTOMER ONBOARDING TARGET | D20 | WP27 | WP34 |
| 198 | COMMERCIAL EXPANSION | D01 | WP01 | WP23, WP25 |
| 199 | FUTURE MODULE MARKETPLACE | D01 | WP36 | — |
| 200 | LONG-TERM ARCHITECTURE PRINCIPLE | D01 | WP01 | — |
| 201 | FINAL SYSTEM PRINCIPLE | D01 | WP01 | — |
| 202 | FINAL CUSTOMER ARCHITECTURE | D01 | WP01 | WP27 |
| 203 | FINAL DELIVERY MODEL | D01 | WP01 | WP27 |
| 204 | FINAL COMMERCIAL MODEL | D01 | WP01 | WP23, WP25 |
| 205 | FINAL AI MODEL | D01 | WP01 | WP33, WP35 |
| 206 | FINAL SECURITY MODEL | D01 | WP01 | WP30 |
| 207 | FINAL ENGINEERING RULE | D01 | WP01 | WP31 |
| 208 | FINAL PRODUCT RULE | D01 | WP01 | — |
| 209 | FINAL ARCHITECTURAL ADVANTAGE | D01 | WP01 | — |
| 210 | FINAL MASTER BUILD OBJECTIVE | D01 | WP01 | — |
| 211 | FINAL ENGINEERING COMMAND TO THE AI BUILD SYSTEM | D01 | WP01 | — |
| 212 | ORVIA — FINAL PRODUCT IN ONE SENTENCE | D01 | WP01 | — |
| 213 | PRIVACY CONTROL PACKAGES AND CHANGE SIMULATION | D04 | WP19 | — |
| 214 | ASSESSMENTS, SDF GOVERNANCE AND REMEDIATION | D03 | WP04 | WP16 |
| 215 | CUSTOMER AI-PROCESSING GOVERNANCE EXTENSION | D01 | WP36 | — |
| 216 | PRIORITIZED ENGINEERING BACKLOG | D01 | WP01 | — |
| 217 | MANDATORY ACCEPTANCE AND FAILURE TEST MATRIX | D18 | WP31 | — |
| 218 | PRIMARY SOURCE REGISTER AND REVIEW LIMITS | D04 | WP05 | — |


<a id="g-epics"></a>
## G.13 — Preserve the original backlog and priorities

The original E01–E16 IDs, priority labels, dependencies and gate references are retained from §216. The work packages are implementation views of those epics and the wider master; they do not replace them. In particular, **P2 is a backlog priority, not Product Version 2**. E14 is explicitly deferred; other epics retain their source qualifications.

| Original epic | Source priority | Source deliverable | Allocated WPs |
|---|---|---|---|
| E01 | P0 | Tenant/IAM isolation and service identities | WP02, WP03, WP30 |
| E02 | P0 | Graph, legal entity and obligation/source registry | WP04, WP05, WP16 |
| E03 | P0 | Notice and ordered consent aggregate | WP05, WP06 |
| E04 | P0 | Durable commands, outbox and workflow state | WP08, WP14 |
| E05 | P0 | Signed agent and connector manifest | WP09 |
| E06 | P0 | Pilot DB/API action and reconciliation | WP10, WP11 |
| E07 | P0 | Scoped evidence and verification | WP13, WP14 |
| E08 | P0 | Portal and safe rights/representation intake | WP07, WP22 |
| E09 | P0 | First withdrawal control and synthetic regression | WP06, WP08, WP12, WP18, WP21, WP22 |
| E10 | P0 | Operational recovery and safety-preserving entitlements | WP25, WP26, WP27, WP29, WP32 |
| E11 | P1 | Retention, scoped holds and restore reconciliation | WP15 |
| E12 | P1 | Control packages, simulation and CI product | WP18, WP19 |
| E13 | P1 | Incident clocks, templates and submission evidence | WP17 |
| E14 | DEFERRED_V2 | Safe grounded Copilot and retained custom-model programme | WP35 |
| E15 | P1/P2 | Repeatable connector expansion | WP09, WP10, WP11, WP36 |
| E16 | P2 | Enterprise deployments, SDF packs and advanced capabilities | WP16, WP27, WP29, WP32, WP36 |

Cross-cutting commerce, interface, operations, legal content, documentation and assurance work can have multiple source sections without a dedicated original epic. That is why the full section and module maps accompany the E map. No new feature is justified merely because a work package exists.

<a id="g-decisions"></a>
## G.14 — Explicit owners for decisions the sources do not resolve

The master specifies target architecture and responsibilities but does not supply an implemented repository, named available staff, final provider selections, actual legal approval or measured capacity. Do not invent those facts. The following is a decision register to be resolved by the responsible owner before dependent execution, not a request to restart product scope discussions.

| Unresolved implementation fact | Owner | Required output |
|---|---|---|
| Actual human staffing, reviewer availability and coding-track access | Founder + D01 | Named task owners; available independent reviewer capacity; permitted material/tool access |
| Actual repository and currently working commands/build | D01 + D20 | Repository inspection and baseline commit; do not assume old prototype commands exist |
| Backend packaging/framework/ORM choices left open by source | D01 + D02/D03 | One approved ADR against the real repo; do not silently promote prototype shortcuts to product architecture |
| Pilot CRM/marketing/payment/identity providers | Founder + D08/D15/D02 | Supported provider/version/permission scope and test accounts; procurement approval where needed |
| Release-specific browser/CPU/runtime/cloud support matrix | D20 + D16/D18 | Actual validated combinations and prerequisites; no universal-file claim |
| Legal rule content, effective dates and sector applicability | Qualified privacy reviewer + D04 | Approved versioned pack; this breakdown does not refresh legal research |
| Licensing limits, offline continuity and commercial terms | Founder/product/legal + D20 | Signed scope/expiry/transition rules without weakening active restrictions |
| Release-signing trust, hosting and customer command keys | D14 + D16/D20/D15 | Separated custody/rotation/recovery and approved bootstrap; no vendor backdoor |
| Support coverage and response commitments | Founder + D13/D17 | Staffed process and permitted visibility; no inferred 24/7 service or automatic offline detection |
| Independent assessment and product performance evidence | D14 + D18/D19 | Defined scope, actual reviewer, executed tests and remediation/retest |
| Readiness questionnaire allowed fields | D02 + D14 + product/privacy reviewer | Reconcile §135 collection suggestions with governing §31; no operational inventory upload by default |

## G.15 — How this supports the deadline without weakening the product

The first objective is a dependable integrated slice, not a pile of “completed” modules. Use bounded tasks; keep the backend/frontend contract single-sourced; run authorisation and failure checks during implementation; maintain a clean-install artifact early; and schedule independent security/customer acceptance as explicit dependencies. The later hardening phase improves an already tested system rather than discovering for the first time whether its parts communicate.

No feature scope has been removed, no prototype promise upgraded to production certification, and no custom-model work reintroduced into Version 1. The existing 20 roles now have concrete responsibilities, all modules and sections have owners, and the four AI tracks have bounded outputs and review rules. This structure improves execution clarity; success still has to be demonstrated in code, tests and actual supported customer deployment.

## G.16 — Sources, integrity and use of this handoff

Product source: the supplied **ORVIA Version 1 unified master, document revision 1.3**. Coordination source: the supplied **cyberfyx-orvia project handoff** plus the user’s instruction naming this chat `Orvia_idea` and requesting role-wise decomposition. This task does not introduce external legal/technical research or alter the inherited source register. Source terminology and release qualifications remain authoritative; proposed allocation is labelled as such.

The combined file preserves the original master bytes and appends this engineering allocation, with a small navigational cover outside the preserved source. All numbered product sections, their titles/anchors and source histories remain. Generated task/role files and `ownership_data.json` are extracts of this allocation. Do not edit them into different product requirements; approve a change in `Orvia_idea`, then regenerate or synchronise the corresponding views.

The integrity report checks source hash, preserved master embedding, unchanged 218 section bodies, all 20 role titles, all 33 module names/IDs, all 16 original epic identifiers, all 140 test-source rows, valid references and an acyclic baseline dependency graph. Those checks establish document consistency only—not software correctness or security.
