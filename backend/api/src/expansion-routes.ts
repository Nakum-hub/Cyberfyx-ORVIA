import type { Context, Page } from '../../domain/src/shared/transaction.ts';
import type { OperationsEnv } from '../../domain/src/operations/shared.ts';
import type { RouteDefinition } from '../../../shared/contracts/src/index.ts';
import { createTemplate, publishTemplate, templateList, createAssessment, assessmentView, assessmentList, recordAnswers, submitAssessment, decideAssessment, reviseAssessment, createFinding, recordFindingEvent, escalationSweep } from '../../domain/src/assessments/impact.ts';
import { createAgreement, terminateAgreement, agreementList, setTier, standing, standingList, createSupplierLink, revokeSupplierLink, supplierLinkList } from '../../domain/src/third-party/third-party.ts';
import { createPolicy, decidePolicy, acknowledgePolicy, policyList, createIssue, readIssue, recordIssueEvent, issueList, importRegulatoryFramework, createControlTest, controlTestDetail, controlTestList, runControlTest, toggleControlTest, controlTestSweep, alertList, complianceReport } from '../../domain/src/grc/lifecycle.ts';
import { ropaEntries, ropaEntry, ropaSummary, ropaImpact, declareLocation, locationList, createRopaVersion, approveRopaVersion, ropaVersionList, ropaDiff } from '../../domain/src/mapping/ropa.ts';
import { createExport, advanceExport, stopExport, exportView, exportList, exportChunk } from '../../domain/src/exports/exports.ts';
import { preparePackage, reviewPackage, releasePackage, revokePackage, withdrawPackage, packageView, packageList, collectOwnPackage } from '../../domain/src/rights/response-packages.ts';

/**
 * Dispatch for the expanded V1 delivery families. Every route arrives already
 * authenticated, capability-checked, validated and inside the scoped business
 * transaction; returning undefined passes the route on.
 */
export async function expansionRoute(c: Context, route: RouteDefinition, id: string | undefined, input: unknown, page: Page, query: unknown, env: OperationsEnv): Promise<unknown | undefined> {
  switch (route.id) {
    case 'list_impact_templates': return templateList(c, page);
    case 'create_impact_template': return createTemplate(c, input);
    case 'publish_impact_template': return publishTemplate(c, id!, input);
    case 'list_impact_assessments': return assessmentList(c, page, query);
    case 'create_impact_assessment': return createAssessment(c, input);
    case 'impact_assessment': return assessmentView(c, id!);
    case 'answer_impact_assessment': return recordAnswers(c, id!, input);
    case 'submit_impact_assessment': return submitAssessment(c, id!);
    case 'decide_impact_assessment': return decideAssessment(c, id!, input);
    case 'revise_impact_assessment': return reviseAssessment(c, id!, input);
    case 'create_impact_finding': return createFinding(c, id!, input);
    case 'record_impact_finding_event': return recordFindingEvent(c, id!, input);
    case 'impact_escalation_sweep': return escalationSweep(c);
    case 'list_processor_agreements': return agreementList(c, page, query);
    case 'create_processor_agreement': return createAgreement(c, input);
    case 'terminate_processor_agreement': return terminateAgreement(c, id!, input);
    case 'set_processor_tier': return setTier(c, id!, input);
    case 'third_party_standing': return standing(c, id!);
    case 'list_third_party_standing': return standingList(c, page);
    case 'create_supplier_link': return createSupplierLink(c, input);
    case 'list_supplier_links': return supplierLinkList(c, page, query);
    case 'revoke_supplier_link': return revokeSupplierLink(c, id!, input);
    case 'list_grc_policies': return policyList(c, page);
    case 'create_grc_policy': return createPolicy(c, input);
    case 'decide_grc_policy': return decidePolicy(c, id!, input);
    case 'acknowledge_grc_policy': return acknowledgePolicy(c, id!);
    case 'list_grc_issues': return issueList(c, page, query);
    case 'create_grc_issue': return createIssue(c, input);
    case 'grc_issue': return readIssue(c, id!);
    case 'record_grc_issue_event': return recordIssueEvent(c, id!, input);
    case 'import_regulatory_framework': return importRegulatoryFramework(c, input);
    case 'list_control_tests': return controlTestList(c, page);
    case 'create_control_test': return createControlTest(c, input);
    case 'control_test': return controlTestDetail(c, id!);
    case 'run_control_test': return runControlTest(c, id!);
    case 'toggle_control_test': return toggleControlTest(c, id!, input);
    case 'control_test_sweep': return controlTestSweep(c);
    case 'list_compliance_alerts': return alertList(c, page);
    case 'compliance_report': return complianceReport(c);
    case 'list_system_locations': return locationList(c, id!, page);
    case 'declare_system_location': return declareLocation(c, id!, input);
    case 'list_ropa_entries': return ropaEntries(c, page);
    case 'ropa_entry': return ropaEntry(c, id!);
    case 'ropa_summary': return ropaSummary(c);
    case 'ropa_impact': return ropaImpact(c, query);
    case 'list_ropa_versions': return ropaVersionList(c, page);
    case 'create_ropa_version': return createRopaVersion(c, input);
    case 'approve_ropa_version': return approveRopaVersion(c, id!, input);
    case 'ropa_version_diff': return ropaDiff(c, id!, query);
    case 'list_data_exports': return exportList(c, page);
    case 'create_data_export': return createExport(c, input);
    case 'data_export': return exportView(c, id!);
    case 'advance_data_export': return advanceExport(c, id!);
    case 'stop_data_export': return stopExport(c, id!);
    case 'data_export_chunk': return exportChunk(c, id!, query);
    case 'list_response_packages': return packageList(c, id!, page);
    case 'prepare_response_package': return preparePackage(c, env, id!);
    case 'response_package': return packageView(c, id!);
    case 'review_response_package': return reviewPackage(c, id!, input);
    case 'release_response_package': return releasePackage(c, id!, input);
    case 'revoke_response_package': return revokePackage(c, id!, input);
    case 'withdraw_response_package': return withdrawPackage(c, id!);
    case 'own_response_package': return collectOwnPackage(c, id!);
    default: return undefined;
  }
}
