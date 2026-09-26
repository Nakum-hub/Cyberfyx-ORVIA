/**
 * Routes for the expanded V1 delivery families. index.ts merges these into the
 * canonical route list; the shape restates RouteDefinition because index.ts
 * imports this file.
 */
type Route = { maximum_body_bytes?: number; id: string; method: 'get' | 'post'; path: string; authority: 'STAFF' | 'PRINCIPAL' | 'SUPPLIER_LINK'; request?: string; response: string; status: 200 | 201 | 202; params?: string; query?: string; paginated?: boolean; idempotency?: boolean; capability: string };
const A = '/api/v1/admin';
const list = (id: string, path: string, response: string, capability: string, query?: string): Route => ({ id, method: 'get', path: A + path, authority: 'STAFF', response, status: 200, paginated: true, capability, ...path.includes('{id}') ? { params: 'IdPath' } : {}, ...query ? { query } : {} });
const read = (id: string, path: string, response: string, capability: string, query?: string): Route => ({ id, method: 'get', path: A + path, authority: 'STAFF', response, status: 200, capability, ...path.includes('{id}') ? { params: 'IdPath' } : {}, ...query ? { query } : {} });
const write = (id: string, path: string, request: string | undefined, response: string, capability: string, status: 200 | 201 = 201): Route => ({ id, method: 'post', path: A + path, authority: 'STAFF', ...request ? { request } : {}, response, status, idempotency: true, capability, ...path.includes('{id}') ? { params: 'IdPath' } : {} });

export const expansionRoutes: Route[] = [
  // EX06 general impact assessments
  list('list_impact_templates', '/impact-templates', 'ImpactTemplateList', 'grc.read'),
  write('create_impact_template', '/impact-templates', 'ImpactTemplateCreate', 'ImpactTemplate', 'grc.write'),
  write('publish_impact_template', '/impact-templates/{id}/publication', 'ImpactTemplatePublish', 'ImpactTemplate', 'grc.approve', 200),
  list('list_impact_assessments', '/impact-assessments', 'ImpactAssessmentList', 'grc.read', 'ImpactAssessmentQuery'),
  write('create_impact_assessment', '/impact-assessments', 'ImpactAssessmentCreate', 'ImpactAssessmentDetail', 'grc.write'),
  read('impact_assessment', '/impact-assessments/{id}', 'ImpactAssessmentDetail', 'grc.read'),
  write('answer_impact_assessment', '/impact-assessments/{id}/answers', 'ImpactAnswersRecord', 'ImpactAssessmentDetail', 'grc.write', 200),
  write('submit_impact_assessment', '/impact-assessments/{id}/submission', undefined, 'ImpactAssessmentDetail', 'grc.write', 200),
  write('decide_impact_assessment', '/impact-assessments/{id}/decision', 'ImpactDecision', 'ImpactAssessmentDetail', 'grc.approve', 200),
  write('revise_impact_assessment', '/impact-assessments/{id}/revision', 'ImpactRevise', 'ImpactAssessmentDetail', 'grc.write'),
  write('create_impact_finding', '/impact-assessments/{id}/findings', 'ImpactFindingCreate', 'ImpactAssessmentDetail', 'grc.write'),
  write('record_impact_finding_event', '/impact-findings/{id}/events', 'ImpactFindingEventRecord', 'ImpactFinding', 'grc.write'),
  write('impact_escalation_sweep', '/impact-findings/escalation-sweep', undefined, 'ImpactEscalationSweep', 'grc.write', 200),
  // EX08 third-party lifecycle
  list('list_processor_agreements', '/processor-agreements', 'AgreementList', 'processor.read', 'AgreementQuery'),
  write('create_processor_agreement', '/processor-agreements', 'AgreementCreate', 'Agreement', 'processor.write'),
  write('terminate_processor_agreement', '/processor-agreements/{id}/termination', 'AgreementTerminate', 'Agreement', 'processor.write', 200),
  write('set_processor_tier', '/processors/{id}/tier', 'TierSet', 'Tier', 'processor.write'),
  read('third_party_standing', '/processors/{id}/third-party-standing', 'ThirdPartyStanding', 'processor.read'),
  list('list_third_party_standing', '/third-party-standing', 'ThirdPartySummaryList', 'processor.read'),
  write('create_supplier_link', '/supplier-links', 'SupplierLinkCreate', 'SupplierLinkIssued', 'processor.write'),
  list('list_supplier_links', '/supplier-links', 'SupplierLinkList', 'processor.read', 'SupplierLinkQuery'),
  write('revoke_supplier_link', '/supplier-links/{id}/revocation', 'SupplierLinkRevoke', 'SupplierLink', 'processor.write', 200),
  // EX10 policies and issues
  list('list_grc_policies', '/grc/policies', 'GrcPolicyList', 'grc.read'),
  write('create_grc_policy', '/grc/policies', 'GrcPolicyCreate', 'GrcPolicy', 'grc.write'),
  write('decide_grc_policy', '/grc/policies/{id}/decision', 'GrcPolicyDecision', 'GrcPolicy', 'grc.approve', 200),
  write('acknowledge_grc_policy', '/grc/policies/{id}/acknowledgement', undefined, 'GrcPolicy', 'grc.read', 200),
  list('list_grc_issues', '/grc/issues', 'IssueList', 'grc.read', 'IssueQuery'),
  write('create_grc_issue', '/grc/issues', 'IssueCreate', 'Issue', 'grc.write'),
  read('grc_issue', '/grc/issues/{id}', 'Issue', 'grc.read'),
  write('record_grc_issue_event', '/grc/issues/{id}/events', 'IssueEventRecord', 'Issue', 'grc.write'),
  write('import_regulatory_framework', '/grc/regulatory-framework', 'RegulatoryFrameworkImport', 'GrcFramework', 'grc.write'),
  // EX11 continuous control tests
  list('list_control_tests', '/grc/control-tests', 'ControlTestList', 'grc.read'),
  write('create_control_test', '/grc/control-tests', 'ControlTestCreate', 'ControlTest', 'grc.write'),
  read('control_test', '/grc/control-tests/{id}', 'ControlTestDetail', 'grc.read'),
  write('run_control_test', '/grc/control-tests/{id}/runs', undefined, 'ControlTestDetail', 'grc.write', 200),
  write('toggle_control_test', '/grc/control-tests/{id}/enabled', 'ControlTestToggle', 'ControlTest', 'grc.write', 200),
  write('control_test_sweep', '/grc/control-tests/sweep', undefined, 'ControlTestSweep', 'grc.write', 200),
  list('list_compliance_alerts', '/grc/compliance-alerts', 'ComplianceAlertList', 'grc.read'),
  read('compliance_report', '/grc/compliance-report', 'ComplianceReport', 'grc.read'),
  // EX05 data mapping and records of processing
  list('list_system_locations', '/systems/{id}/locations', 'SystemLocationList', 'registry.read'),
  write('declare_system_location', '/systems/{id}/locations', 'SystemLocationCreate', 'SystemLocation', 'registry.write'),
  list('list_ropa_entries', '/ropa/entries', 'RopaEntryList', 'registry.read'),
  read('ropa_entry', '/ropa/entries/{id}', 'RopaEntry', 'registry.read'),
  read('ropa_summary', '/ropa/summary', 'RopaSummary', 'registry.read'),
  read('ropa_impact', '/ropa/impact', 'RopaImpact', 'registry.read', 'RopaImpactQuery'),
  list('list_ropa_versions', '/ropa/versions', 'RopaVersionList', 'registry.read'),
  write('create_ropa_version', '/ropa/versions', 'RopaVersionCreate', 'RopaVersion', 'registry.write'),
  write('approve_ropa_version', '/ropa/versions/{id}/approval', 'RopaVersionApprove', 'RopaVersion', 'operations.approve', 200),
  read('ropa_version_diff', '/ropa/versions/{id}/diff', 'RopaDiff', 'registry.read', 'RopaDiffQuery'),
  // Bounded, resumable exports under the requester's own authority
  list('list_data_exports', '/data-exports', 'DataExportList', 'evidence.export'),
  write('create_data_export', '/data-exports', 'DataExportCreate', 'DataExport', 'evidence.export'),
  read('data_export', '/data-exports/{id}', 'DataExport', 'evidence.export'),
  write('advance_data_export', '/data-exports/{id}/step', undefined, 'DataExport', 'evidence.export', 200),
  write('stop_data_export', '/data-exports/{id}/stop', undefined, 'DataExport', 'evidence.export', 200),
  read('data_export_chunk', '/data-exports/{id}/chunk', 'DataExportChunk', 'evidence.export', 'DataExportChunkQuery'),
  // EX03 rights response packages
  list('list_response_packages', '/rights-requests/{id}/response-packages', 'ResponsePackageList', 'rights.read'),
  write('prepare_response_package', '/rights-requests/{id}/response-packages', undefined, 'ResponsePackage', 'rights.write'),
  read('response_package', '/response-packages/{id}', 'ResponsePackage', 'rights.read'),
  write('review_response_package', '/response-packages/{id}/review', 'ResponsePackageReview', 'ResponsePackage', 'rights.release', 200),
  write('release_response_package', '/response-packages/{id}/release', 'ResponsePackageRelease', 'ResponsePackage', 'rights.release', 200),
  write('revoke_response_package', '/response-packages/{id}/revocation', 'ResponsePackageRevoke', 'ResponsePackage', 'rights.release', 200),
  write('withdraw_response_package', '/response-packages/{id}/withdrawal', undefined, 'ResponsePackage', 'rights.write', 200),
  // The authenticated principal collects their own released copy; each collection counts against its allowance.
  { id: 'own_response_package', method: 'post', path: '/api/v1/portal/me/rights-requests/{id}/response-package', authority: 'PRINCIPAL', params: 'IdPath', response: 'OwnResponsePackage', status: 200, idempotency: true, capability: 'rights.own.read' },
  // EX04 value classification and EX12 access exposure
  write('request_classification_run', '/catalog-discovery-targets/{id}/classification-runs', 'ClassificationRunRequest', 'ClassificationRun', 'connection.enable'),
  list('list_classification_runs', '/catalog-discovery-targets/{id}/classification-runs', 'ClassificationRunList', 'graph.read'),
  read('classification_run', '/classification-runs/{id}', 'ClassificationRun', 'graph.read'),
  write('label_classification', '/catalog-discovery-targets/{id}/classification-labels', 'ClassificationLabelsRecord', 'ClassificationLabelSet', 'graph.write'),
  read('classification_labels', '/catalog-discovery-targets/{id}/classification-labels', 'ClassificationLabelSet', 'graph.read'),
  write('measure_classification', '/classification-runs/{id}/quality', undefined, 'ClassificationQuality', 'graph.write'),
  list('list_classification_quality', '/classification-runs/{id}/quality', 'ClassificationQualityList', 'graph.read'),
  list('list_exposure_findings', '/exposure-findings', 'ExposureSummaryList', 'graph.read'),
  // EX09 customer-controlled delivery
  list('list_delivery_transports', '/delivery-transports', 'DeliveryTransportList', 'notification.read'),
  write('create_delivery_transport', '/delivery-transports', 'DeliveryTransportCreate', 'DeliveryTransport', 'notification.manage'),
  write('enable_delivery_transport', '/delivery-transports/{id}/enable', undefined, 'DeliveryTransport', 'connection.enable', 200),
  write('disable_delivery_transport', '/delivery-transports/{id}/disable', 'TransportDisable', 'DeliveryTransport', 'notification.manage', 200),
  write('reveal_transport_signing_secret', '/delivery-transports/{id}/signing-secret', undefined, 'SigningSecret', 'connection.enable', 200),
  list('list_alert_routings', '/alert-routings', 'AlertRoutingList', 'notification.read'),
  write('create_alert_routing', '/alert-routings', 'AlertRoutingCreate', 'AlertRouting', 'notification.manage'),
  write('decide_alert_routing', '/alert-routings/{id}/decision', 'RoutingDecision', 'AlertRouting', 'notification.manage', 200),
  list('list_outbound_messages', '/outbound-messages', 'OutboundMessageList', 'notification.read'),
  write('compose_outbound_message', '/outbound-messages', 'OutboundMessageCreate', 'OutboundMessage', 'notification.manage'),
  read('outbound_message', '/outbound-messages/{id}', 'OutboundMessage', 'notification.read'),
  write('review_outbound_message', '/outbound-messages/{id}/review', 'OutboundMessageReview', 'OutboundMessage', 'notification.manage', 200),
  write('withdraw_outbound_message', '/outbound-messages/{id}/withdrawal', undefined, 'OutboundMessage', 'notification.manage', 200),
  // Supplier-facing: a bearer link token scoped to one draft assessment; no ORVIA account.
  { id: 'supplier_questionnaire', method: 'get', path: '/api/v1/supplier/questionnaire', authority: 'SUPPLIER_LINK', response: 'SupplierQuestionnaire', status: 200, capability: 'supplier.respond' },
  { id: 'supplier_answer', method: 'post', path: '/api/v1/supplier/questionnaire/answers', authority: 'SUPPLIER_LINK', request: 'SupplierAnswers', response: 'SupplierQuestionnaire', status: 200, capability: 'supplier.respond', maximum_body_bytes: 262144 },
];
