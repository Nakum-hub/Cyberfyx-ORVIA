/**
 * Routes for the regulatory core, the data & processing registry and the
 * operational workflows. index.ts merges these into the canonical route list;
 * the shape is RouteDefinition's, restated here because index.ts imports this file.
 */
type Route = { maximum_body_bytes?: number; id: string; method: 'get' | 'post'; path: string; authority: 'STAFF' | 'PRINCIPAL'; request?: string; response: string; status: 200 | 201 | 202; params?: string; query?: string; paginated?: boolean; idempotency?: boolean; capability: string };
const A = '/api/v1/admin';
const list = (id: string, path: string, response: string, capability: string, query?: string): Route => ({ id, method: 'get', path: A + path, authority: 'STAFF', response, status: 200, paginated: true, capability, ...query ? { query } : {} });
const read = (id: string, path: string, response: string, capability: string, query?: string): Route => ({ id, method: 'get', path: A + path, authority: 'STAFF', response, status: 200, capability, ...path.includes('{id}') ? { params: 'IdPath' } : {}, ...query ? { query } : {} });
const write = (id: string, path: string, request: string | undefined, response: string, capability: string, status: 200 | 201 = 201): Route => ({ id, method: 'post', path: A + path, authority: 'STAFF', ...request ? { request } : {}, response, status, idempotency: true, capability, ...['import_regulatory_package','append_bulk_job_rows'].includes(id) ? { maximum_body_bytes: 1048576 } : {}, ...path.includes('{id}') ? { params: 'IdPath' } : {} });

export const operationsRoutes: Route[] = [
  // Regulatory core
  list('list_regulatory_packages', '/regulatory/packages', 'RegulatoryPackageList', 'registry.read'),
  write('import_regulatory_package', '/regulatory/packages', 'RegulatoryPackageImport', 'RegulatoryPackage', 'regulatory.manage'),
  read('regulatory_package', '/regulatory/packages/{id}', 'RegulatoryPackageDetail', 'registry.read'),
  write('decide_regulatory_package', '/regulatory/packages/{id}/decision', 'RegulatoryPackageDecision', 'RegulatoryPackage', 'regulatory.manage', 200),
  read('active_regulatory_package', '/regulatory/active-package', 'ActivePackage', 'registry.read', 'ActivePackageQuery'),
  write('evaluate_applicability', '/regulatory/applicability', 'ApplicabilityEvaluate', 'ApplicabilityEvaluation', 'registry.write', 200),
  list('list_applicability_decisions', '/regulatory/applicability', 'ApplicabilityDecisionList', 'registry.read'),
  write('override_applicability', '/regulatory/applicability/overrides', 'ApplicabilityOverride', 'ApplicabilityDecision', 'regulatory.manage'),
  list('list_regulatory_impacts', '/regulatory/impacts', 'RegulatoryImpactList', 'registry.read', 'ImpactQuery'),
  write('review_regulatory_impact', '/regulatory/impacts/{id}/review', 'ImpactReview', 'RegulatoryImpact', 'registry.write', 200),
  // Organisation profile and SDF
  read('organisation_profile', '/organisation-profile', 'OrganisationProfileView', 'registry.read'),
  write('set_organisation_profile', '/organisation-profile', 'OrganisationProfileSet', 'OrganisationProfile', 'sdf.manage'),
  write('complete_sdf_obligation', '/sdf-obligations/{id}/completion', 'SdfObligationComplete', 'SdfObligation', 'sdf.manage', 200),
  // Registry: categories, principals, relationships, representatives
  list('list_principal_categories', '/data-principal-categories', 'PrincipalCategoryList', 'registry.read'),
  write('create_principal_category', '/data-principal-categories', 'PrincipalCategoryCreate', 'PrincipalCategory', 'registry.write'),
  list('list_data_categories', '/personal-data-categories', 'DataCategoryList', 'registry.read'),
  write('create_data_category', '/personal-data-categories', 'DataCategoryCreate', 'DataCategory', 'registry.write'),
  list('list_data_principals', '/data-principals', 'SubjectList', 'registry.read', 'SubjectQuery'),
  write('create_data_principal', '/data-principals', 'SubjectCreate', 'Subject', 'registry.write'),
  read('data_principal', '/data-principals/{id}', 'Subject', 'registry.read'),
  read('data_principal_processing', '/data-principals/{id}/processing', 'SubjectProcessing', 'registry.read'),
  write('add_data_principal_reference', '/data-principals/{id}/references', 'SubjectReferenceAdd', 'Subject', 'registry.write'),
  write('merge_data_principal', '/data-principals/{id}/merge', 'SubjectMerge', 'Subject', 'registry.write', 200),
  write('unmerge_data_principal', '/data-principals/{id}/unmerge', 'SubjectUnmerge', 'Subject', 'registry.write', 200),
  write('create_relationship_context', '/data-principal-relationships', 'RelationshipCreate', 'Relationship', 'registry.write'),
  write('end_relationship_context', '/data-principal-relationships/{id}/end', 'RelationshipEnd', 'Relationship', 'registry.write', 200),
  list('list_representatives', '/data-principal-representatives', 'RepresentativeList', 'registry.sensitive.read'),
  write('create_representative', '/data-principal-representatives', 'RepresentativeCreate', 'Representative', 'registry.sensitive.write'),
  write('verify_representative', '/data-principal-representatives/{id}/verification', 'RepresentativeVerify', 'Representative', 'registry.sensitive.write', 200),
  write('activate_nomination', '/data-principal-representatives/{id}/activation', 'NominationActivate', 'Representative', 'registry.sensitive.write', 200),
  write('record_child_status', '/child-status-records', 'ChildStatusRecord', 'ChildStatusView', 'registry.sensitive.write'),
  read('child_status', '/data-principals/{id}/child-status', 'ChildStatusView', 'registry.sensitive.read'),
  // Registry: purposes, conditions, safeguards, activities
  list('list_registry_purposes', '/registry-purposes', 'RegistryPurposeList', 'registry.read'),
  write('create_registry_purpose', '/registry-purposes', 'RegistryPurposeCreate', 'RegistryPurpose', 'registry.write'),
  write('revise_registry_purpose', '/registry-purposes/{id}/versions', 'RegistryPurposeRevise', 'RegistryPurpose', 'registry.write'),
  list('list_processing_conditions', '/processing-conditions', 'ConditionList', 'registry.read'),
  write('create_processing_condition', '/processing-conditions', 'ConditionCreate', 'Condition', 'registry.write'),
  list('list_security_safeguards', '/security-safeguards', 'SafeguardList', 'registry.read'),
  write('create_security_safeguard', '/security-safeguards', 'SafeguardCreate', 'Safeguard', 'registry.write'),
  list('list_registry_activities', '/registry-activities', 'ActivityList', 'registry.read', 'ActivityQuery'),
  write('create_registry_activity', '/registry-activities', 'ActivityCreate', 'Activity', 'registry.write'),
  read('registry_activity', '/registry-activities/{id}', 'Activity', 'registry.read'),
  write('revise_registry_activity', '/registry-activities/{id}/versions', 'ActivityRevise', 'Activity', 'registry.write'),
  write('link_registry_activity', '/registry-activities/{id}/links', 'ActivityLinkCreate', 'Activity', 'registry.write'),
  write('close_activity_link', '/registry-activity-links/{id}/close', 'LinkClose', 'ActivityLink', 'registry.write', 200),
  // Registry: notices and delivery evidence
  list('list_registry_notices', '/registry-notices', 'RegistryNoticeList', 'registry.read'),
  write('create_registry_notice', '/registry-notices', 'RegistryNoticeCreate', 'RegistryNotice', 'registry.write'),
  write('create_notice_version', '/registry-notices/{id}/versions', 'RegistryNoticeVersionCreate', 'RegistryNotice', 'registry.write'),
  write('publish_notice_version', '/registry-notice-versions/{id}/publication', 'NoticePublish', 'RegistryNotice', 'registry.write', 200),
  read('notice_at_time', '/registry-notices/{id}/at', 'NoticeAt', 'registry.read', 'NoticeAtQuery'),
  list('list_notice_deliveries', '/notice-delivery-evidence', 'NoticeDeliveryList', 'registry.read'),
  write('record_notice_delivery', '/notice-delivery-evidence', 'NoticeDeliveryRecord', 'NoticeDelivery', 'registry.write'),
  // Registry: consent
  list('list_consent_records', '/consent-records', 'ConsentRecordList', 'registry.read'),
  write('create_consent_record', '/consent-records', 'ConsentRecordCreate', 'ConsentRecord', 'registry.write'),
  read('consent_record', '/consent-records/{id}', 'ConsentRecord', 'registry.read'),
  write('record_consent_event', '/consent-records/{id}/events', 'ConsentEventRecord', 'ConsentRecord', 'operations.execute'),
  write('sync_portal_consent', '/consent-records/portal-sync', undefined, 'ConsentSync', 'operations.execute', 200),
  // Registry: processors and data sharing
  list('list_processor_engagements', '/processor-engagements', 'EngagementList', 'registry.read', 'EngagementQuery'),
  write('create_processor_engagement', '/processor-engagements', 'EngagementCreate', 'Engagement', 'registry.write'),
  write('terminate_processor_engagement', '/processor-engagements/{id}/termination', 'EngagementTerminate', 'Engagement', 'operations.execute', 200),
  write('record_engagement_disposition', '/processor-engagements/{id}/disposition', 'EngagementDisposition', 'Engagement', 'operations.execute', 200),
  list('list_data_sharing_links', '/data-sharing-links', 'SharingLinkList', 'registry.read', 'SharingQuery'),
  write('create_data_sharing_link', '/data-sharing-links', 'SharingLinkCreate', 'SharingLink', 'registry.write'),
  // Registry: retention and holds
  list('list_retention_rules', '/retention-rules', 'RetentionRuleList', 'registry.read'),
  write('create_retention_rule', '/retention-rules', 'RetentionRuleCreate', 'RetentionRule', 'registry.write'),
  write('revise_retention_rule', '/retention-rules/{id}/versions', 'RetentionRuleRevise', 'RetentionRule', 'registry.write'),
  list('list_retention_holds', '/retention-holds', 'RetentionHoldList', 'registry.read', 'RetentionHoldQuery'),
  write('create_retention_hold', '/retention-holds', 'RetentionHoldCreate', 'RetentionHold', 'registry.write'),
  write('release_retention_hold', '/retention-holds/{id}/release', 'RetentionHoldRelease', 'RetentionHold', 'operations.approve', 200),
  // Connectors
  list('list_connector_bindings', '/connector-bindings', 'ConnectorBindingList', 'registry.read'),
  write('bind_connector', '/connector-bindings', 'ConnectorBindingCreate', 'ConnectorBinding', 'registry.write'),
  // Workflow runs, actions, verification and evidence
  list('list_workflow_runs', '/workflow-runs', 'WorkflowRunList', 'registry.read', 'RunQuery'),
  read('workflow_run', '/workflow-runs/{id}', 'WorkflowRun', 'registry.read'),
  list('list_run_actions', '/workflow-runs/{id}/actions', 'DownstreamActionList', 'registry.read', 'ActionQuery'),
  write('create_rights_run', '/workflow-runs/rights', 'RightsRunCreate', 'WorkflowRun', 'operations.execute'),
  write('create_retention_run', '/workflow-runs/retention', 'RetentionRunCreate', 'WorkflowRun', 'operations.execute'),
  write('evaluate_run', '/workflow-runs/{id}/evaluation', 'RunEvaluate', 'WorkflowRun', 'operations.execute', 200),
  write('decide_run', '/workflow-runs/{id}/decision', 'RunDecision', 'WorkflowRun', 'operations.approve', 200),
  write('execute_run', '/workflow-runs/{id}/execution', 'RunExecute', 'WorkflowRun', 'operations.execute', 200),
  write('cancel_run', '/workflow-runs/{id}/cancellation', 'RunCancel', 'WorkflowRun', 'operations.execute', 200),
  read('run_evidence_package', '/workflow-runs/{id}/evidence-package', 'EvidencePackage', 'evidence.export'),
  list('list_evidence_records', '/evidence-records', 'EvidenceRecordList', 'registry.read', 'EvidenceQuery'),
  list('list_operational_events', '/operational-events', 'OperationalEventList', 'registry.read'),
  // Bulk estate import
  list('list_bulk_jobs', '/bulk-jobs', 'BulkJobList', 'registry.read'),
  write('create_bulk_job', '/bulk-jobs', 'BulkJobCreate', 'BulkJob', 'registry.write'),
  read('bulk_job', '/bulk-jobs/{id}', 'BulkJob', 'registry.read'),
  write('append_bulk_job_rows', '/bulk-jobs/{id}/rows', 'BulkJobAppend', 'BulkJob', 'registry.write', 200),
  write('process_bulk_job', '/bulk-jobs/{id}/processing', 'BulkJobProcess', 'BulkJob', 'registry.write', 200),
  write('replay_bulk_job_errors', '/bulk-jobs/{id}/replay', undefined, 'BulkJob', 'registry.write', 200),
  // Personal-data breach and rights case profiles
  list('list_breaches', '/personal-data-breaches', 'BreachList', 'incident.read'),
  write('register_breach', '/personal-data-breaches', 'BreachRegister', 'Breach', 'incident.write'),
  read('breach', '/personal-data-breaches/{id}', 'Breach', 'incident.read'),
  write('update_breach', '/personal-data-breaches/{id}/facts', 'BreachUpdate', 'Breach', 'incident.write', 200),
  write('complete_breach_task', '/breach-tasks/{id}/completion', 'BreachTaskComplete', 'Breach', 'incident.write', 200),
  list('list_case_profiles', '/rights-case-profiles', 'CaseProfileList', 'rights.read'),
  write('open_case_profile', '/rights-requests/{id}/case-profile', 'CaseProfileOpen', 'CaseProfile', 'rights.write'),
  read('case_profile', '/rights-requests/{id}/case-profile', 'CaseProfile', 'rights.read'),
  // Attention, coverage and notifications
  read('operations_attention', '/operations/attention', 'OperationsAttention', 'registry.read'),
  read('operations_coverage', '/operations/coverage', 'OperationsCoverage', 'registry.read'),
  write('operations_notification_sweep', '/operations/notification-sweep', undefined, 'NotificationSweep', 'notification.manage', 200),
  // Privacy Centre (Data Principal facing)
  { id: 'portal_notices', method: 'get', path: '/api/v1/portal/notices', authority: 'PRINCIPAL', capability: 'consent.own.read', response: 'PortalNoticeList', status: 200, paginated: true, query: 'PortalNoticeQuery' },
  { id: 'own_rights_request_history', method: 'get', path: '/api/v1/portal/me/rights-requests/{id}/history', authority: 'PRINCIPAL', capability: 'rights.own.read', params: 'IdPath', response: 'OwnRequestEventList', status: 200, paginated: true },
];
