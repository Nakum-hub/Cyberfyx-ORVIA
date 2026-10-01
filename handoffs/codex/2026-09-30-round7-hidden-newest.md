# Round 7 hidden-newest audit

Baseline: a033035f5e126b9c39ffc591b78cf6ec4997119c. Query inventory includes staff endpoints, principal endpoints and one internal worker cursor; the latter two are explicitly excluded from staff corrections.

| Endpoint | Source function | Result | Timestamp |
|---|---|---|---|
| list_ai_systems /api/v1/admin/ai-systems | backend/domain/src/ai-governance/ai-governance.ts:42 aiSystemList | FIXED | recorded_at |
| list_audit_events /api/v1/admin/audit-events | backend/domain/src/audit/audit.ts:115 auditEventList | FIXED | created_at |
| list_cmp_sites /api/v1/admin/cmp-sites | backend/domain/src/cmp/cmp.ts:46 siteList | FIXED | created_at |
| list_cmp_configs /api/v1/admin/cmp-sites/{id}/configs | backend/domain/src/cmp/cmp.ts:82 configList | FIXED | authored_at |
| list_purposes /api/v1/admin/purposes<br>list_notices /api/v1/admin/notices<br>list_policies /api/v1/admin/policies<br>list_systems /api/v1/admin/systems | backend/domain/src/configuration/configuration.ts:28 configurationList | NEEDS_CREATION_TIMESTAMP | See schema/dependency notes |
| list_mappings /api/v1/admin/target-mappings | backend/domain/src/configuration/configuration.ts:107 mappingList | NEEDS_CREATION_TIMESTAMP | See schema/dependency notes |
| control_map /api/v1/admin/control-map | backend/domain/src/configuration/configuration.ts:111 controlMap | NEEDS_CREATION_TIMESTAMP | See schema/dependency notes |
| own_consents /api/v1/portal/me/consents | backend/domain/src/consent/consent.ts:8 ownChoices | PRINCIPAL_OUT_OF_SCOPE | See schema/dependency notes |
| own_history /api/v1/portal/me/consents/{purpose_id}/history | backend/domain/src/consent/consent.ts:90 ownHistory | PRINCIPAL_OUT_OF_SCOPE | See schema/dependency notes |
| list_gaps /api/v1/admin/gaps | backend/domain/src/coverage/coverage.ts:199 gapList | FIXED | detected_at |
| list_delivery_transports /api/v1/admin/delivery-transports | backend/domain/src/delivery/delivery.ts:81 transportList | FIXED | created_at |
| list_alert_routings /api/v1/admin/alert-routings | backend/domain/src/delivery/delivery.ts:121 routingList | FIXED | created_at |
| list_catalog_discovery_targets /api/v1/admin/catalog-discovery-targets | backend/domain/src/discovery/catalog.ts:28 catalogTargetList | FIXED | created_at |
| list_classification_quality /api/v1/admin/classification-runs/{id}/quality | backend/domain/src/discovery/classification.ts:141 qualityList | FIXED | recorded_at |
| list_exposure_findings /api/v1/admin/exposure-findings | backend/domain/src/discovery/classification.ts:148 exposureList | FIXED | requested_at |
| list_evidence_files /api/v1/admin/evidence-files | backend/domain/src/dpdpa-audit/exchange.ts:129 evidenceFileList | FIXED | uploaded_at |
| list_audit_engagements /api/v1/admin/audit-engagements | backend/domain/src/dpdpa-audit/exchange.ts:171 engagementList | FIXED | created_at |
| failures /api/v1/admin/failures | backend/domain/src/evidence/evidence.ts:58 failures | NEEDS_CREATION_TIMESTAMP | See schema/dependency notes |
| capabilities /api/v1/admin/capabilities | backend/domain/src/evidence/evidence.ts:88 capabilities | NEEDS_CREATION_TIMESTAMP | See schema/dependency notes |
| list_data_assets /api/v1/admin/data-assets | backend/domain/src/graph/graph.ts:102 dataAssetList | FIXED | recorded_at |
| list_activities /api/v1/admin/processing-activities | backend/domain/src/graph/graph.ts:147 activityList | FIXED | recorded_at |
| list_relationships /api/v1/admin/graph/relationships | backend/domain/src/graph/graph.ts:197 relationshipList | FIXED | recorded_at |
| list_grc_audits /api/v1/admin/grc/audits | backend/domain/src/grc/audits.ts:30 grcAuditList | FIXED | (document->>'recorded_at')::timestamptz |
| grc_audit_requests /api/v1/admin/grc/audits/{id}/requests | backend/domain/src/grc/audits.ts:41 grcAuditRequests | FIXED | (document->>'recorded_at')::timestamptz |
| list_grc_frameworks /api/v1/admin/grc/frameworks<br>list_grc_controls /api/v1/admin/grc/controls | backend/domain/src/grc/grc.ts:13 grcList | FIXED | (document->>'recorded_at')::timestamptz |
| list_grc_risks /api/v1/admin/grc/risks | backend/domain/src/grc/risks.ts:15 grcRiskList | FIXED | (document->>'recorded_at')::timestamptz |
| list_obligation_rules /api/v1/admin/obligation-rules | backend/domain/src/incidents/incidents.ts:38 obligationRuleList | FIXED | recorded_at |
| list_incidents /api/v1/admin/incidents | backend/domain/src/incidents/incidents.ts:96 incidentList | FIXED | recorded_at |
| list_system_locations /api/v1/admin/systems/{id}/locations | backend/domain/src/mapping/ropa.ts:229 locationList | FIXED | recorded_at |
| list_backup_snapshots /api/v1/admin/backup-snapshots | backend/domain/src/monitoring/restore.ts:80 snapshotList | FIXED | taken_at |
| list_restore_runs /api/v1/admin/restore-runs | backend/domain/src/monitoring/restore.ts:169 restoreList | FIXED | started_at |
| list_notice_revisions /api/v1/admin/notices/{id}/revisions | backend/domain/src/notices/languages.ts:138 noticeRevisionList | FIXED | recorded_at |
| list_templates /api/v1/admin/notification-templates | backend/domain/src/notifications/notifications.ts:48 templateList | FIXED | recorded_at |
| list_notification_tasks /api/v1/admin/notification-tasks | backend/domain/src/notifications/notifications.ts:123 notificationTaskList | FIXED | created_at |
| list_connections /api/v1/admin/connections | backend/domain/src/onboarding/connection.ts:125 connectionList | FIXED | started_at |
| list_imports /api/v1/admin/imports | backend/domain/src/onboarding/imports.ts:137 importList | FIXED | submitted_at |
| list_breaches /api/v1/admin/personal-data-breaches | backend/domain/src/operations/breach.ts:105 breachList | FIXED | recorded_at |
| list_case_profiles /api/v1/admin/rights-case-profiles | backend/domain/src/operations/cases.ts:55 caseProfileList | FIXED | recorded_at |
| list_evidence_records /api/v1/admin/evidence-records | backend/domain/src/operations/evidence.ts:20 evidenceList | FIXED | recorded_at |
| list_operational_events /api/v1/admin/operational-events | backend/domain/src/operations/evidence.ts:27 eventList | FIXED | occurred_at |
| evaluate_run /api/v1/admin/workflow-runs/{id}/evaluation | backend/domain/src/operations/runs.ts:270 evaluateRun | INTERNAL_WORKER_CURSOR | recorded_at |
| list_run_actions /api/v1/admin/workflow-runs/{id}/actions | backend/domain/src/operations/runs.ts:378 actionList | CLAUDE | created_at |
| list_workflow_runs /api/v1/admin/workflow-runs | backend/domain/src/operations/runs.ts:446 runList | CLAUDE | created_at |
| list_processors /api/v1/admin/processors | backend/domain/src/processors/processors.ts:38 processorList | FIXED | recorded_at |
| list_assessments /api/v1/admin/assessments | backend/domain/src/processors/processors.ts:131 assessmentList | FIXED | recorded_at |
| list_findings /api/v1/admin/findings | backend/domain/src/processors/processors.ts:170 findingList | FIXED | recorded_at |
| list_connector_bindings /api/v1/admin/connector-bindings | backend/domain/src/registry/connectors.ts:34 bindingList | CLAUDE | recorded_at |
| list_consent_records /api/v1/admin/consent-records | backend/domain/src/registry/consent.ts:139 consentRecordList | CLAUDE | recorded_at |
| list_consent_managers /api/v1/admin/consent-managers | backend/domain/src/registry/consent.ts:180 consentManagerList | CLAUDE | See schema/dependency notes |
| list_intake_clients /api/v1/admin/intake-clients | backend/domain/src/registry/intake.ts:39 intakeClientList | CLAUDE | See schema/dependency notes |
| list_registry_notices /api/v1/admin/registry-notices | backend/domain/src/registry/notices.ts:72 noticeList | CLAUDE | recorded_at |
| list_notice_deliveries /api/v1/admin/notice-delivery-evidence | backend/domain/src/registry/notices.ts:124 deliveryList | CLAUDE | recorded_at |
| portal_notices /api/v1/portal/notices | backend/domain/src/registry/notices.ts:132 portalNotices | PRINCIPAL_OUT_OF_SCOPE | recorded_at |
| list_principal_categories /api/v1/admin/data-principal-categories | backend/domain/src/registry/principals.ts:34 principalCategoryList | CLAUDE | recorded_at |
| list_data_categories /api/v1/admin/personal-data-categories | backend/domain/src/registry/principals.ts:49 dataCategoryList | CLAUDE | recorded_at |
| list_data_principals /api/v1/admin/data-principals | backend/domain/src/registry/principals.ts:102 subjectList | CLAUDE | recorded_at |
| list_representatives /api/v1/admin/data-principal-representatives | backend/domain/src/registry/principals.ts:214 representativeList | CLAUDE | recorded_at |
| list_registry_purposes /api/v1/admin/registry-purposes | backend/domain/src/registry/processing.ts:66 purposeList | CLAUDE | recorded_at |
| list_processing_conditions /api/v1/admin/processing-conditions | backend/domain/src/registry/processing.ts:100 conditionList | CLAUDE | recorded_at |
| list_security_safeguards /api/v1/admin/security-safeguards | backend/domain/src/registry/processing.ts:114 safeguardList | CLAUDE | recorded_at |
| list_registry_activities /api/v1/admin/registry-activities | backend/domain/src/registry/processing.ts:238 activityList | CLAUDE | recorded_at |
| list_processor_engagements /api/v1/admin/processor-engagements | backend/domain/src/registry/processors.ts:104 engagementList | CLAUDE | recorded_at |
| list_data_sharing_links /api/v1/admin/data-sharing-links | backend/domain/src/registry/processors.ts:139 sharingList | CLAUDE | recorded_at |
| list_retention_rules /api/v1/admin/retention-rules | backend/domain/src/registry/retention.ts:63 ruleList | CLAUDE | recorded_at |
| list_retention_holds /api/v1/admin/retention-holds | backend/domain/src/registry/retention.ts:104 holdList | CLAUDE | recorded_at |
| list_erasure_intimations /api/v1/admin/erasure-intimations | backend/domain/src/registry/retention.ts:148 intimationList | CLAUDE | recorded_at |
| list_applicability_decisions /api/v1/admin/regulatory/applicability | backend/domain/src/regulatory/applicability.ts:103 applicabilityList | FIXED | evaluated_at |
| list_regulatory_packages /api/v1/admin/regulatory/packages | backend/domain/src/regulatory/packages.ts:154 packageList | FIXED | imported_at |
| list_regulatory_impacts /api/v1/admin/regulatory/impacts | backend/domain/src/regulatory/packages.ts:183 impactList | FIXED | created_at |
| list_constraints /api/v1/admin/retention/constraints | backend/domain/src/retention/retention.ts:39 constraintList | FIXED | recorded_at |
| list_holds /api/v1/admin/retention/holds | backend/domain/src/retention/retention.ts:63 holdList | FIXED | recorded_at |
| list_retention_outcomes /api/v1/admin/retention/outcomes | backend/domain/src/retention/retention.ts:224 retentionOutcomeList | FIXED | recorded_at |
| list_response_packages /api/v1/admin/rights-requests/{id}/response-packages | backend/domain/src/rights/response-packages.ts:191 packageList | FIXED | prepared_at |
| list_mandates /api/v1/admin/mandates | backend/domain/src/rights/rights.ts:95 mandateList | FIXED | recorded_at |
| list_rights_requests /api/v1/admin/rights-requests | backend/domain/src/rights/rights.ts:149 requestList | FIXED | received_at |
| list_support_cases /api/v1/admin/support-cases | backend/domain/src/support/support.ts:62 supportCaseList | FIXED | opened_at |
| list_canaries /api/v1/admin/support-canaries | backend/domain/src/support/support.ts:142 canaryList | FIXED | registered_at |
| list_test_runs /api/v1/admin/test-runs | backend/domain/src/test-runs/test-runs.ts:20 listTests | FIXED | created_at |
| list_processor_agreements /api/v1/admin/processor-agreements | backend/domain/src/third-party/third-party.ts:69 agreementList | FIXED | recorded_at |
| list_supplier_links /api/v1/admin/supplier-links | backend/domain/src/third-party/third-party.ts:187 supplierLinkList | FIXED | created_at |
| list_releases /api/v1/admin/releases | backend/domain/src/updates/updates.ts:125 releaseList | FIXED | imported_at |
| list_update_plans /api/v1/admin/update-plans | backend/domain/src/updates/updates.ts:270 updatePlanList | NEEDS_CREATION_TIMESTAMP | See schema/dependency notes |
| installation_versions /api/v1/admin/installation-versions | backend/domain/src/updates/updates.ts:320 installationVersionList | FIXED | applied_at |
| workflows /api/v1/admin/workflows | backend/domain/src/workflow/workflow.ts:96 workflowList | FIXED | accepted_at |
| list_principals /api/v1/admin/principals | backend/api/src/admin-principals.ts:21 rows | NEEDS_CREATION_TIMESTAMP | See schema/dependency notes |
| list_erasure_intimations_due /api/v1/admin/erasure-intimations/due | backend/domain/src/registry/retention.ts:155 intimationsDue | CLAUDE — supplemental composite UUID cursor | subject_id:rule_id; review due-date ordering with owner |

## Schema dependencies

No timestamp was invented or backfilled. Configuration lists (purpose_versions, notice_versions, policy_versions, systems), target_mappings, obligations, principal_references and update_plans need an immutable insertion timestamp and matching scope/time/id index from the migration owner. Existing published/approved/checked times are nullable or describe a later event, so they are not used as creation times.

Existing immutable insertion/event times are used where available: recorded_at, authored_at, uploaded_at, submitted_at, started_at, detected_at, taken_at, applied_at, evaluated_at, occurred_at, imported_at, prepared_at, received_at, opened_at, registered_at, accepted_at. GRC documents carry immutable recorded_at. The cursor remains the last returned UUID and is resolved within scope (and within parent/filter where applicable). Exposure summaries order the latest completed run per target by requested_at with target_id ties. These are chronological records; no claim of a newly added created_at column is made.

Claude-owned registry, consent, intake and operations/runs files remain unchanged under the current and earlier lane exclusions. Internal worker enumeration is not changed. Existing timestamp-keyset lists were reviewed separately and left unchanged. Bounded internal scans without pagination are not staff list endpoints.

## Forms corrected

- Impact assessments: published-template selection and “New version of” now read all template pages; refresh both display and choices after writes.
- Applicability: activity scope choices and exemption decision choices now read all pages; both decision readers refresh after evaluate/override.
- Breach registration: exclude incidents already registered on any breach page, not just the visible page.
- CMP site detail/banner form: resolve the selected site and published banner across all pages, so older published versions still supply the form default.

The complete hook/reference inventory is R7V-form-query-inventory.json. After these fixes the only direct usePagedQuery.data reference is Classification’s latest-run display, whose endpoint already orders by requested_at descending. Other hook-based form selectors already use useCollection, including Claude’s processor-engagement fixes. Manual call/readOnce paths were audited separately: controls/attention.tsx follows workflow cursors; vendor lists do not expose cursor pagination.

### Claude-owned manual reader still truncates choices

`frontend/src/components/screens/expansion/dpdpa-audit.tsx:49` directly calls `list_evidence_files` and `list_audit_engagements` with limit 100, stores only `.items`, and never follows `next_cursor`. The evidence-file state feeds `EngagementDetail` and its “Evidence file” selector at line 161; files outside the first page cannot be selected. The engagement table/Open action likewise cannot reach engagements outside the first 100. This file remains explicitly assigned to Claude. Replace the manual list reads with useCollection (preserving independent error states) or complete canonical cursor iteration; retain a paginated display if desired. The backend list ordering is corrected in this branch, but that does not make these first-page-only readers complete.
